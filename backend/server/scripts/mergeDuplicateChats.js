/**
 * One-off migration: merge duplicate chat threads for the same
 * buyer<->seller pair into a single canonical thread.
 *
 * Background: chats used to be created with a per-listing id, so
 * two people who messaged about more than one item could end up
 * with several separate chat docs. The app now always uses a
 * deterministic id ([sellerId, buyerId].sort().join('_')) so new
 * chats never duplicate — this script cleans up chats left over
 * from before that change.
 *
 * For every buyer<->seller pair with more than one chat doc:
 *  - keeps the chat with the most messages as canonical (ties broken
 *    by earliest createdAt, i.e. the original conversation)
 *  - copies every message from the other chat(s) into the canonical
 *    chat's messages subcollection, preserving original createdAt
 *    so the merged history stays in chronological order
 *  - recomputes lastMessage/lastSenderId/lastMessageAt and merges
 *    lastReadAt from the merged message set
 *  - deletes the duplicate chat doc(s) and their messages
 *
 * Support chats (isSupport: true) are left untouched — they are
 * already one per user.
 *
 * Usage (run from backend/server, same Cloud Shell flow as deploy):
 *   npm install                # if not already installed
 *   node scripts/mergeDuplicateChats.js            # dry run, no writes
 *   node scripts/mergeDuplicateChats.js --apply    # actually merge
 */

require('dotenv').config();
const admin = require('firebase-admin');

const APPLY = process.argv.includes('--apply');

const serviceAccountJson = Buffer
  .from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '', 'base64')
  .toString('utf8');

if (!serviceAccountJson) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64 env var.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
});
const db = admin.firestore();

function pairKey(chat) {
  const a = chat.buyerId;
  const b = chat.sellerId;
  if (!a || !b) return null;
  return [a, b].sort().join('_');
}

async function loadMessages(chatId) {
  const snap = await db.collection('chats').doc(chatId).collection('messages')
    .orderBy('createdAt', 'asc').get();
  return snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
}

async function main() {
  console.log(APPLY ? 'Running in APPLY mode — this will write/delete data.' : 'Running in DRY RUN mode — no changes will be made. Pass --apply to actually merge.');

  const chatsSnap = await db.collection('chats').get();
  const groups = new Map(); // pairKey -> [{id, ref, data}]

  chatsSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.isSupport || doc.id.startsWith('support_')) return;
    const key = pairKey(data);
    if (!key) {
      console.warn(`Skipping chat ${doc.id} — missing buyerId/sellerId.`);
      return;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id: doc.id, ref: doc.ref, data });
  });

  const duplicateGroups = [...groups.entries()].filter(([, chats]) => chats.length > 1);

  if (duplicateGroups.length === 0) {
    console.log('No duplicate buyer-seller chats found. Nothing to do.');
    return;
  }

  console.log(`Found ${duplicateGroups.length} buyer-seller pair(s) with duplicate chats.\n`);

  for (const [key, chats] of duplicateGroups) {
    console.log(`Pair ${key}: ${chats.length} chats -> ${chats.map((c) => c.id).join(', ')}`);

    const withMessages = await Promise.all(
      chats.map(async (c) => ({ ...c, messages: await loadMessages(c.id) }))
    );

    withMessages.sort((a, b) => {
      if (b.messages.length !== a.messages.length) return b.messages.length - a.messages.length;
      const aCreated = a.data.createdAt?.toMillis?.() ?? Infinity;
      const bCreated = b.data.createdAt?.toMillis?.() ?? Infinity;
      return aCreated - bCreated;
    });

    const canonical = withMessages[0];
    const duplicates = withMessages.slice(1);

    console.log(`  Canonical: ${canonical.id} (${canonical.messages.length} messages)`);
    duplicates.forEach((d) => console.log(`  Merging in: ${d.id} (${d.messages.length} messages)`));

    const allMessages = [...canonical.messages, ...duplicates.flatMap((d) => d.messages)]
      .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));

    const lastTextMessage = [...allMessages].reverse().find((m) => m.type !== 'listing' && m.text);

    const mergedLastReadAt = { ...(canonical.data.lastReadAt || {}) };
    for (const d of duplicates) {
      for (const [uid, ts] of Object.entries(d.data.lastReadAt || {})) {
        const existing = mergedLastReadAt[uid];
        if (!existing || (ts?.toMillis?.() ?? 0) > (existing.toMillis?.() ?? 0)) {
          mergedLastReadAt[uid] = ts;
        }
      }
    }

    if (!APPLY) {
      console.log(`  [dry run] Would copy ${duplicates.reduce((n, d) => n + d.messages.length, 0)} message(s) into ${canonical.id}, update lastMessage/lastReadAt, then delete ${duplicates.map((d) => d.id).join(', ')}.\n`);
      continue;
    }

    for (const d of duplicates) {
      const batchWrites = d.messages.map((m) => {
        const { id, ref, ...msgData } = m;
        return canonical.ref.collection('messages').add(msgData);
      });
      await Promise.all(batchWrites);
    }

    await canonical.ref.update({
      lastMessage: lastTextMessage?.text || canonical.data.lastMessage || '',
      lastSenderId: lastTextMessage?.senderId || canonical.data.lastSenderId || '',
      lastMessageAt: lastTextMessage?.createdAt || canonical.data.lastMessageAt || admin.firestore.FieldValue.serverTimestamp(),
      lastReadAt: mergedLastReadAt,
    });

    for (const d of duplicates) {
      const msgsSnap = await d.ref.collection('messages').get();
      await Promise.all(msgsSnap.docs.map((m) => m.ref.delete()));
      await d.ref.delete();
    }

    console.log(`  Done.\n`);
  }

  console.log(APPLY ? 'Merge complete.' : 'Dry run complete — re-run with --apply to make these changes.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
