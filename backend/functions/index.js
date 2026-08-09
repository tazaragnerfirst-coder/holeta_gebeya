const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

// Set with: firebase functions:secrets:set TELEGRAM_BOT_TOKEN
// (or functions:config:set telegram.bot_token="..." on the classic config API)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || functions.config().telegram?.bot_token;

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
  if (Date.now() - authDate > 24 * 60 * 60 * 1000) return null; // reject stale sessions (24h)

  const userJson = params.get('user');
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Callable function — front-end calls this only when the user takes
 * an action that requires an account (post an ad, message a seller).
 * Verifies initData server-side, upserts the user doc, and returns a
 * Firebase custom token the client signs in with.
 */
exports.telegramAuth = functions.https.onCall(async (data) => {
  if (!BOT_TOKEN) {
    throw new functions.https.HttpsError('failed-precondition', 'Bot token not configured on the server.');
  }
  const tgUser = verifyInitData(data.initData || '', BOT_TOKEN);
  if (!tgUser) {
    throw new functions.https.HttpsError('unauthenticated', 'Invalid or expired Telegram session.');
  }

  const uid = `tg_${tgUser.id}`;
  await db.collection('users').doc(uid).set({
    telegramId: tgUser.id,
    firstName: tgUser.first_name || '',
    lastName: tgUser.last_name || '',
    username: tgUser.username || '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  const token = await admin.auth().createCustomToken(uid);
  return { token };
});

/**
 * Increment a listing's view counter. Public (no auth) — matches the
 * "browsing needs no account" requirement.
 */
exports.incrementListingView = functions.https.onCall(async (data) => {
  const id = data.listingId;
  if (!id) throw new functions.https.HttpsError('invalid-argument', 'listingId is required.');
  await db.collection('listings').doc(id).update({
    views: admin.firestore.FieldValue.increment(1),
  });
  return { ok: true };
});
