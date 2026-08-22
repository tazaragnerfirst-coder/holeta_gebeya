export function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return price;
  return n.toLocaleString('en-US');
}
