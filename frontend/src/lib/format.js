export function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return price;
  return n.toLocaleString('en-US');
}

export function conditionTone(condition) {
  if (!condition) return 'default';
  const c = condition.toLowerCase();
  if (c === 'new') return 'new';
  if (c.includes('repair')) return 'repair';
  return 'used';
}
