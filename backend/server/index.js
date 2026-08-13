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
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    const token = await admin.auth().createCustomToken(uid);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Holeta Gebeya backend listening on ${PORT}`));
