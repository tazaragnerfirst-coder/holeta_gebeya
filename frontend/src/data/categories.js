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
