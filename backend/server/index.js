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
