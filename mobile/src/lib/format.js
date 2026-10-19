// Short date for ledger rows (Firestore Timestamp -> "5 Oct").
export function formatTxDate(ts) {
  const ms = ts?.toMillis ? ts.toMillis() : null;
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
