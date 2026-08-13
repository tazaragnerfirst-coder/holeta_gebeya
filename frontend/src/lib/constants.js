// Virtual participant ID for the always-available support chat.
// Not a real Firebase Auth user — just a fixed string used in the
// `participants` array so firestore.rules (which checks
// `request.auth.uid in participants`) still lets the real user in.
export const SUPPORT_UID = 'support';
export const SUPPORT_NAME = 'Holeta Gebeya Support';
