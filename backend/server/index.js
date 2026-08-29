require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const admin = require('firebase-admin');

// Service account JSON is stored on Render as a base64 string
// (env var FIREBASE_SERVICE_ACCOUNT_BASE64) to avoid multi-line env
// var issues. Decode it here.
const serviceAccountJson = Buffer
  .from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '', 'base64')
  .toString('utf8');

if (!serviceAccountJson) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64 env var.');
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
});
const db = admin.firestore();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Verifies Telegram Mini App initData per:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) return null;

  const authDate = Number(params.get('auth_date')) * 1000;
  if (Date.now() - authDate > 24 * 60 * 60 * 1000) return null; // reject sessions older than 24h

  const userJson = params.get('user');
  return userJson ? JSON.parse(userJson) : null;
}

const app = express();
app.use(cors()); // Telegram webview + your Firebase Hosting domain call this
app.use(express.json());

app.get('/health', (req, res) => res.send('ok'));

// Called only when the user takes an action that needs an account
// (post an ad, message a seller) — never on plain browsing.
app.post('/telegramAuth', async (req, res) => {
  try {
    if (!BOT_TOKEN) return res.status(500).json({ error: 'Bot token not configured on the server.' });

    const tgUser = verifyInitData(req.body.initData || '', BOT_TOKEN);
    if (!tgUser) return res.status(401).json({ error: 'Invalid or expired Telegram session.' });

    const uid = `tg_${tgUser.id}`;
    await db.collection('users').doc(uid).set({
      telegramId: tgUser.id,
      firstName: tgUser.first_name || '',
      lastName: tgUser.last_name || '',
      username: tgUser.username || '',
      // Telegram only includes this in initData when the user has a
      // public profile photo. Stored here (not just read from the
      // unsafe client-side preview) so it can be trusted and reused
      // anywhere a verified profile picture is needed — e.g. as the
      // seller's avatar on a listing, or a chat participant's avatar.
      photoUrl: tgUser.photo_url || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    const token = await admin.auth().createCustomToken(uid);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Called from the signup sheet the first time a user takes an
// account-required action (post, chat, call) and has no phone number
// on file yet. Verifies the Firebase ID token (not just a client-
// supplied uid) before writing, since users/{uid} is admin-write-only.
app.post('/completeProfile', async (req, res) => {
  try {
    const { idToken, phone, fullName } = req.body || {};
    if (!idToken) return res.status(401).json({ error: 'Missing session token — please try again.' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'Phone number is required.' });
    if (!fullName || !fullName.trim()) return res.status(400).json({ error: 'Full name is required.' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    await db.collection('users').doc(decoded.uid).set({
      phone: phone.trim(),
      fullName: fullName.trim(),
      profileCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ ok: true });
  } catch (err) {
    console.error('completeProfile failed:', err);
    res.status(401).json({ error: 'Could not verify your session. Please reopen the app and try again.' });
  }
});

// Called from the Edit Profile sheet, any time after signup, to
// change name/phone/photo. Separate from /completeProfile (which is
// the one-time signup flow) so the two can't interfere with each
// other. photoUrl, if sent, is stored as `customPhotoUrl` — a
// distinct field from `photoUrl` (which /telegramAuth re-derives
// from Telegram's own profile photo on every login) so a
// custom-uploaded picture here never gets silently overwritten by
// the next Telegram sign-in.
app.post('/updateProfile', async (req, res) => {
  try {
    const { idToken, phone, fullName, photoUrl, location } = req.body || {};
    if (!idToken) return res.status(401).json({ error: 'Missing session token — please try again.' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'Phone number is required.' });
    if (!fullName || !fullName.trim()) return res.status(400).json({ error: 'Full name is required.' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const update = {
      phone: phone.trim(),
      fullName: fullName.trim(),
    };
    if (typeof photoUrl === 'string' && photoUrl.startsWith('data:image')) {
      update.customPhotoUrl = photoUrl;
    }
    // Optional free-text location (e.g. "Holeta, Oromia") — shown on
    // the profile / future store page. Empty string clears it.
    if (typeof location === 'string') {
      update.location = location.trim();
    }
    await db.collection('users').doc(decoded.uid).set(update, { merge: true });

    res.json({ ok: true });
  } catch (err) {
    console.error('updateProfile failed:', err);
    res.status(401).json({ error: 'Could not verify your session. Please reopen the app and try again.' });
  }
});

// Called by the client right after a chat message is written to
// Firestore. Looks up the recipient's Telegram ID (stored on their
// users/{uid} doc) and pings them via the Bot API — the client SDK
// can't call Telegram directly (no bot token there), and we don't
// have Cloud Functions/Firestore triggers on the free Spark plan.
app.post('/notifyNewMessage', async (req, res) => {
  try {
    if (!BOT_TOKEN) return res.status(500).json({ error: 'Bot token not configured on the server.' });
    const { recipientUid, senderName, listingTitle, text, chatId } = req.body || {};
    if (!recipientUid || !text) return res.status(400).json({ error: 'recipientUid and text are required.' });

    // "support" is a virtual participant (no Firebase Auth user, no
    // Telegram ID to notify) — nothing to send.
    if (recipientUid === 'support') return res.json({ ok: true, skipped: 'support' });

    const userSnap = await db.collection('users').doc(recipientUid).get();
    const telegramId = userSnap.exists ? userSnap.data().telegramId : null;
    if (!telegramId) return res.json({ ok: true, skipped: 'no telegramId on file' });

    const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
    const messageText = `💬 New message from ${senderName || 'someone'}`
      + (listingTitle ? `\nAbout: "${listingTitle}"` : '')
      + `\n\n${preview}`;

    const webAppUrl = process.env.MINI_APP_URL
      ? `${process.env.MINI_APP_URL}#/chat/${chatId}`
      : undefined;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: messageText,
        ...(webAppUrl && chatId ? {
          reply_markup: {
            inline_keyboard: [[{ text: 'Open chat', web_app: { url: webAppUrl } }]],
          },
        } : {}),
      }),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('notifyNewMessage failed:', err);
    // Never fail the chat send over a notification hiccup.
    res.json({ ok: false });
  }
});

// Called by the main app's client (never by the admin panel itself)
// right after something an admin should look at happens — a new
// report filed, etc. Sends a plain Telegram message to the one fixed
// ADMIN_TELEGRAM_ID (there's a single admin, so no per-recipient
// lookup like /notifyNewMessage does for regular users).
app.post('/notifyAdmin', async (req, res) => {
  try {
    if (!BOT_TOKEN) return res.status(500).json({ error: 'Bot token not configured on the server.' });
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    if (!adminId) return res.json({ ok: true, skipped: 'ADMIN_TELEGRAM_ID not configured' });

    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text is required.' });

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: adminId, text }),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('notifyAdmin failed:', err);
    // Never fail the caller's action over a notification hiccup.
    res.json({ ok: false });
  }
});

// Called by the client right after a listing is successfully
// created, so the next post attempt's cooldown (enforced in
// firestore.rules against users/{uid}.lastPostAt) has something to
// check against. users/{uid} is admin-write-only, so this has to
// happen from the backend rather than the client SDK.
app.post('/recordPost', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(401).json({ error: 'Missing session token — please try again.' });
    const decoded = await admin.auth().verifyIdToken(idToken);
    await db.collection('users').doc(decoded.uid).set({
      lastPostAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    res.json({ ok: true });
  } catch (err) {
    console.error('recordPost failed:', err);
    // Never block the person on this — the post itself already
    // succeeded by the time this is called.
    res.json({ ok: false });
  }
});

// Writes a system message from Support into the caller's own
// support chat (id `support_{uid}`, creating it if needed) — used
// when a background action (posting/saving an ad) keeps failing
// after a few silent retries, so the person finds out without the
// app having blocked them on the page while it retried. senderId
// 'support' and the isSupport chat shape must match what
// ChatThread.jsx creates on the client (see frontend/src/lib/
// constants.js) — only this trusted backend, via the Admin SDK, can
// post *as* Support; firestore.rules only lets a regular signed-in
// user post with senderId == their own uid.
app.post('/notifySupportMessage', async (req, res) => {
  try {
    const { idToken, text } = req.body || {};
    if (!idToken || !text) return res.status(400).json({ error: 'Missing idToken or text.' });
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const chatRef = db.collection('chats').doc(`support_${uid}`);
    const snap = await chatRef.get();
    if (!snap.exists) {
      await chatRef.set({
        participants: ['support', uid],
        buyerId: uid,
        buyerName: 'You',
        sellerId: 'support',
        sellerName: 'Holeta Gebeya Support',
        isSupport: true,
        listingTitle: '',
        listingPhoto: '',
        lastMessage: '',
        lastSenderId: '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await chatRef.collection('messages').add({
      senderId: 'support',
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await chatRef.update({
      lastMessage: text,
      lastSenderId: 'support',
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      [`unreadCount.${uid}`]: admin.firestore.FieldValue.increment(1),
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('notifySupportMessage failed:', err);
    res.json({ ok: false });
  }
});

app.post('/incrementListingView', async (req, res) => {
  try {
    const id = req.body.listingId;
    if (!id) return res.status(400).json({ error: 'listingId is required.' });
    await db.collection('listings').doc(id).update({
      views: admin.firestore.FieldValue.increment(1),
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Recomputes a seller's aggregate rating (avg + count across every
// review left on any of their listings) and denormalizes it onto
// users/{sellerId} plus every one of that seller's own listing docs,
// so ListingCard can show it with zero extra client-side reads.
// Firestore rules only let a listing's owning seller update it —
// a reviewer is a buyer, not the seller — so this has to happen
// server-side via the Admin SDK, same as lastPostAt above. Called
// right after a review is submitted; failure here never blocks the
// review itself, which has already succeeded by that point.
app.post('/syncSellerRating', async (req, res) => {
  try {
    const { idToken, sellerId } = req.body || {};
    if (!idToken) return res.status(401).json({ error: 'Missing session token — please try again.' });
    if (!sellerId) return res.status(400).json({ error: 'sellerId is required.' });
    await admin.auth().verifyIdToken(idToken);

    const reviewsSnap = await db.collection('reviews').where('sellerId', '==', sellerId).get();
    const ratings = reviewsSnap.docs.map((d) => d.data().rating).filter((r) => typeof r === 'number');
    const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    const reviewCount = ratings.length;

    const batch = db.batch();
    batch.set(db.collection('users').doc(sellerId), { avgRating, reviewCount }, { merge: true });
    const listingsSnap = await db.collection('listings').where('sellerId', '==', sellerId).get();
    listingsSnap.docs.forEach((d) => batch.update(d.ref, { avgRating, reviewCount }));
    await batch.commit();

    res.json({ ok: true, avgRating, reviewCount });
  } catch (err) {
    console.error('syncSellerRating failed:', err);
    res.json({ ok: false });
  }
});

// Reveals a seller's phone number to a verified, registered caller.
// Phone numbers are never exposed via Firestore rules (users/{uid}
// is read-restricted to its own owner) — this endpoint is the only
// legitimate way a buyer's client learns a seller's number, and it
// checks the CALLER's own registration status server-side (never
// trusting the client's requireRegistered() check alone).
app.post('/getSellerPhone', async (req, res) => {
  try {
    const { idToken, sellerId } = req.body || {};
    if (!idToken) return res.status(401).json({ error: 'Missing session token — please try again.' });
    if (!sellerId) return res.status(400).json({ error: 'sellerId is required.' });

    const decoded = await admin.auth().verifyIdToken(idToken);

    const callerSnap = await db.collection('users').doc(decoded.uid).get();
    if (!callerSnap.exists || !callerSnap.data().phone) {
      return res.status(403).json({ error: 'Please complete your profile first.' });
    }

    const sellerSnap = await db.collection('users').doc(sellerId).get();
    if (!sellerSnap.exists || !sellerSnap.data().phone) {
      return res.status(404).json({ error: "This seller hasn't added a phone number yet." });
    }

    res.json({ phone: sellerSnap.data().phone, fullName: sellerSnap.data().fullName || '' });
  } catch (err) {
    console.error('getSellerPhone failed:', err);
    res.status(401).json({ error: 'Could not verify your session. Please reopen the app and try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Holeta Gebeya backend listening on ${PORT}`));
