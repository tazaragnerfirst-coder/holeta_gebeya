/**
 * One-off: grant (or revoke) the `isAdmin` custom claim on a Firebase
 * Auth user. Run this once after creating the admin's Email/Password
 * account in Firebase Console → Authentication → Users.
 *
 * The admin panel (admin/) checks this claim client-side to decide
 * whether to show the dashboard, and firestore.rules' isAdmin()
 * helper checks it server-side to allow writes to config/reports/
 * listings — the claim is what actually grants access, not just the
 * ability to log in with a password.
 *
 * Usage (run from backend/server, same Cloud Shell flow as deploy):
 *   npm install                                    # if not already installed
 *   node scripts/setAdminClaim.js you@example.com          # grant
 *   node scripts/setAdminClaim.js you@example.com --revoke # revoke
 */

require('dotenv').config();
const admin = require('firebase-admin');

const email = process.argv[2];
const revoke = process.argv.includes('--revoke');

if (!email) {
  console.error('Usage: node scripts/setAdminClaim.js <email> [--revoke]');
  process.exit(1);
}

const serviceAccountJson = Buffer
  .from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '', 'base64')
  .toString('utf8');

if (!serviceAccountJson) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64 env var (same one backend/server/index.js uses).');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
});

async function main() {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, revoke ? {} : { isAdmin: true });
  console.log(`${revoke ? 'Revoked' : 'Granted'} isAdmin for ${email} (uid: ${user.uid}).`);
  console.log('The user must sign out and back in (or refresh their ID token) in the admin panel for this to take effect.');
}

main().catch((err) => {
  console.error('setAdminClaim failed:', err);
  process.exit(1);
});
