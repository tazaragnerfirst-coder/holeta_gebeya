import React from 'react';
import { createPortal } from 'react-dom';

// Golden ripple that expands from (x, y) to cover the screen, then fades —
// used on the Save/bookmark action to mirror Telegram's star-reaction wave.
// Portaled straight to <body>: rendered inline it would sit inside cards
// that apply a `transform` on `:active` (e.g. .listing-card:active), which
// makes THIS element's `position:fixed` resolve against that transformed
// ancestor instead of the viewport — and get clipped by any `overflow:hidden`
// in between (e.g. .thumb). Portaling sidesteps both, wherever it's used.
export default function RippleWave({ x, y, onDone }) {
  return createPortal(
    <div
      className="ripple-wave"
      style={{ left: x, top: y }}
      onAnimationEnd={onDone}
    />,
    document.body
  );
}
