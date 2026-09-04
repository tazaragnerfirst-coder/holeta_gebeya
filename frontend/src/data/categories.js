// Pure helper functions over the categories/subcategories/attribute
// schema. The data itself used to live here as a static CATEGORIES
// array; it's now Firestore-backed (see lib/appData.jsx, which loads
// the `categories` collection and exposes it via useAppData()) so it
// can be edited from the admin panel without a redeploy — see #hog001
// in memory. Callers pass the loaded categories array in explicitly.

export function getSubcategory(categories, categoryId, subcategoryId) {
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return null;
  return cat.subcategories.find((s) => s.id === subcategoryId) || null;
}

// Categories flagged `popular: true` are shown first (Jiji-style),
// with the rest following in their existing order.
export function sortByPopular(categories) {
  return [...categories].sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
}

// Numeric-aware string compare, e.g. "A13" sorts before "A21" (plain
// string compare would put "A13" after "A21", the same way it puts
// "A" after "A2"). For plain accumulated name lists that have no
// deliberate order of their own — subcategories, brand/model names,
// storage/RAM/color option lists (see #hog018) — NOT for a `select`
// attribute's admin-typed `options` list, where the order can be
// intentional (e.g. sizes S/M/L/XL, which alphabetizing would break).
export function naturalCompare(a, b) {
  const chunk = (s) => String(s).match(/\d+|\D+/g) || [];
  const ca = chunk(a), cb = chunk(b);
  for (let i = 0; i < Math.max(ca.length, cb.length); i++) {
    const x = ca[i] || '', y = cb[i] || '';
    const nx = Number(x), ny = Number(y);
    if (!Number.isNaN(nx) && !Number.isNaN(ny) && x !== '' && y !== '') {
      if (nx !== ny) return nx - ny;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

export function sortNatural(items, keyFn = (x) => x) {
  return [...items].sort((a, b) => naturalCompare(keyFn(a), keyFn(b)));
}

// Builds a sensible default title from whatever's been picked so far
// — brand + model when present (phones/laptops/cars), else item type
// + brand, else just the subcategory name. The person can always
// edit it afterwards; this only fills the field automatically.
export function buildSuggestedTitle(category, subcategory, attrs) {
  if (!subcategory) return '';
  const parts = [];
  if (attrs.brand && attrs.brand !== 'Other') parts.push(attrs.brand);
  if (attrs.model && attrs.model !== 'Other') parts.push(attrs.model);
  if (attrs.itemType) parts.push(attrs.itemType);
  if (attrs.storage) parts.push(attrs.storage);
  if (parts.length === 0) return subcategory.name;
  return parts.join(' ');
}

export const DESCRIPTION_MIN_WORDS = 10;
export const DESCRIPTION_HINTS = [
  'Condition & any defects', 'Reason for selling', 'Accessories included',
  'Purchase date / warranty', 'Reason for the price', 'Usage history',
];

// Rent (#hog014) gets its own hint set instead of reusing
// DESCRIPTION_HINTS — sale-oriented hints (condition, reason for
// selling) don't fit a rental listing. Based on what Ethiopian rental
// listings (Jiji, Ethiopia Property Centre) consistently lead with.
export const RENT_DESCRIPTION_HINTS = [
  'Furnished or unfurnished', 'Utilities included?', 'Parking / generator / water tank',
  'Floor / building info', 'Move-in date', 'Lease terms',
];
