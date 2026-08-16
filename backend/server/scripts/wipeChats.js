/**
 * Deletes every chat document (and its messages subcollection) from
 * Firestore. Use this instead of merging when the app is still in
 * testing and it's simpler to just start the chat system fresh.
 *
 * Usage (from backend/server):
 *   node scripts/wipeChats.js            # dry run, just counts
 *   node scripts/wipeChats.js --apply    # actually deletes everything
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

async function main() {
  console.log(APPLY ? 'Running in APPLY mode — this will delete ALL chats.' : 'Running in DRY RUN mode — no changes will be made. Pass --apply to actually delete.');

  const chatsSnap = await db.collection('chats').get();
  console.log(`Found ${chatsSnap.size} chat(s).`);

  if (!APPLY) {
    console.log('Dry run complete — re-run with --apply to delete everything.');
    return;
  }

  for (const chatDoc of chatsSnap.docs) {
    const msgsSnap = await chatDoc.ref.collection('messages').get();
    await Promise.all(msgsSnap.docs.map((m) => m.ref.delete()));
    await chatDoc.ref.delete();
    console.log(`Deleted chat ${chatDoc.id} (${msgsSnap.size} messages).`);
  }

  console.log('All chats deleted.');
}

main().catch((err) => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
