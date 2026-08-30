// Same logic as frontend/src/lib/searchTokens.js — duplicated here
// because the admin panel is plain script tags with no shared build
// step with the frontend. Keep the two in sync if this changes.
const SEARCH_TOKENS_MAX_WORD_LEN = 20;
const SEARCH_TOKENS_MAX_WORDS = 12;
const SEARCH_TOKENS_MAX_TOKENS = 150;

function buildSearchTokens(title, attributes) {
  attributes = attributes || {};
  const words = [title, attributes.brand, attributes.model]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\u1200-\u137f\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, SEARCH_TOKENS_MAX_WORDS);

  const tokens = new Set();
  words.forEach((word) => {
    const w = word.slice(0, SEARCH_TOKENS_MAX_WORD_LEN);
    for (let i = 1; i <= w.length; i++) tokens.add(w.slice(0, i));
  });
  return Array.from(tokens).slice(0, SEARCH_TOKENS_MAX_TOKENS);
}
