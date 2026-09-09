// Virtual participant ID for the always-available support chat.
// Not a real Firebase Auth user — just a fixed string used in the
// `participants` array so firestore.rules (which checks
// `request.auth.uid in participants`) still lets the real user in.
export const SUPPORT_UID = 'support';
export const SUPPORT_NAME = 'Holeta Gebeya Support';

// Premium subscription — manual receipt-review model (same approach
// as the equb_bot product): no payment gateway, user sends money to
// one of these accounts then uploads a screenshot for admin review.
// Price/period are placeholders (Taza hasn't finalized pricing yet)
// — change the two constants below when a real price is set.
// Account numbers are placeholders (000000) until Taza gives the
// real ones, same "placeholder now, swap later" pattern equb_bot used.
export const SUBSCRIPTION_PRICE_ETB = 99;
export const SUBSCRIPTION_PERIOD_DAYS = 30;
export const PAYMENT_ACCOUNTS = [
  { method: 'CBE', label: 'Commercial Bank of Ethiopia (CBE)', account: '000000' },
  { method: 'Telebirr', label: 'Telebirr', account: '000000' },
];

// Wallet: internal spendable balance funding both Subscription and
// Boost purchases. Topped up the same manual receipt-review way as
// the old subscription-only flow — see lib/wallet.js and
// backend/server/index.js's /spendWallet. Keep these mirrored with
// the matching constants in backend/server/index.js (a plain
// CommonJS server, can't share this ES module).
export const MIN_WALLET_TOPUP_ETB = 50;
export const BOOST_PRICE_ETB = 99;
export const BOOST_DURATION_DAYS = 7;
