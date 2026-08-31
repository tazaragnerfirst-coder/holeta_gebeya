export function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return price;
  return n.toLocaleString('en-US');
}

// Renders a listing's price the way the price field on the post form
// actually captures it (#hog004): fixed/legacy listings show a plain
// amount, negotiable shows the asking amount (if the seller gave
// one) or just "Negotiable", free/contact show no amount at all.
// `currency` tells the caller whether to append the "ETB" suffix.
export function formatListingPrice(item) {
  const type = item.priceType || 'fixed'; // listings from before #hog004 have no priceType — treat as fixed
  if (type === 'free') return { text: 'Free', currency: false };
  if (type === 'contact') return { text: 'Contact seller', currency: false };
  if (type === 'negotiable') {
    return item.price != null
      ? { text: `${formatPrice(item.price)} (negotiable)`, currency: true }
      : { text: 'Negotiable', currency: false };
  }
  return { text: formatPrice(item.price), currency: true };
}

export function conditionTone(condition) {
  if (!condition) return 'default';
  const c = condition.toLowerCase();
  if (c === 'new') return 'new';
  if (c.includes('repair')) return 'repair';
  return 'used';
}
