// Builds the array of lowercase word-prefixes stored on a listing as
// `searchTokens`, so #hog002's server-side search can find it via a
// Firestore `array-contains` query — e.g. "iPhone 13" produces
// "i","ip","iph",...,"iphone","1","13", so a live-typed "ipho" query
// matches directly (the typed string is itself one of the stored
// prefixes). Keeps Ethiopic (Ge'ez) letters as well as Latin, since
// listing titles may be written in either.
const MAX_WORD_LEN = 20; // longer words only index prefixes up to this length
const MAX_WORDS = 12;    // title + brand + model rarely exceed this
const MAX_TOKENS = 150;  // hard cap so one long listing can't bloat the doc

export function buildSearchTokens(title, attributes = {}) {
  const words = [title, attributes.brand, attributes.model]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\u1200-\u137f\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_WORDS);

  const tokens = new Set();
  for (const word of words) {
    const w = word.slice(0, MAX_WORD_LEN);
    for (let i = 1; i <= w.length; i++) tokens.add(w.slice(0, i));
  }
  return Array.from(tokens).slice(0, MAX_TOKENS);
}
