// Approximate hex values for color names used in categories.js
// attribute options. Used to render small color swatches instead of
// free-text input. Unknown names fall back to a neutral gray dot
// with the name still shown as a label/tooltip.

export const COLOR_HEX = {
  Black: '#1a1a1a',
  White: '#f5f5f0',
  Silver: '#c7c9cb',
  Gold: '#e6c79c',
  Blue: '#3b6ea5',
  Green: '#5a8f69',
  Purple: '#7d6b9e',
  Red: '#b23b3b',
  Yellow: '#e0c34a',
  Pink: '#e3a9b8',
  Gray: '#8b8d8f',
  Grey: '#8b8d8f',

  'Phantom Black': '#1c1c1e',
  'Phantom White': '#f2f2ef',
  Cream: '#efe6d0',
  Lavender: '#c9c2e0',
  'Pink Gold': '#e6c3b8',

  'Awesome Black': '#1c1c1e',
  'Awesome White': '#f2f2ef',
  'Awesome Violet': '#8a7ab5',
  'Awesome Lime': '#c9d96a',
  'Awesome Silver': '#c7c9cb',

  'Light Green': '#a9d1a0',
  'Dark Red': '#7a2e2e',

  'Mystic Bronze': '#8a6a4a',
  'Mystic Gray': '#8b8d8f',
  'Mystic Green': '#5f7d6a',

  Mint: '#a9d9c8',
  Graphite: '#4a4a4a',

  'Titanium Black': '#3a3a3a',
  'Titanium Gray': '#7d7d7d',
  'Titanium Violet': '#9d8fae',
  'Titanium Yellow': '#e0d19a',

  'Black Titanium': '#3a3a3a',
  'White Titanium': '#e8e6df',
  'Blue Titanium': '#5a6f85',
  'Natural Titanium': '#a89f92',

  Midnight: '#1b1b23',
  Starlight: '#f0ece1',
  '(PRODUCT)RED': '#b3151a',

  'Space Gray': '#5c5e60',
};

export function colorHex(name) {
  return COLOR_HEX[name] || '#B9B9B9';
}
