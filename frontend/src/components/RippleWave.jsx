import React from 'react';
import { createPortal } from 'react-dom';

// Water-ripple effect that expands from (x, y), like a drop landing —
// used on the Save/bookmark action. Three thin rings expand outward with a
// staggered delay and thin out as they grow (real ripples fade at the
// edge, they don't stay a solid filled disc), instead of one flat-colored
// filled circle. Portaled straight to <body>: rendered inline it would sit
// inside cards that apply a `transform` on `:active` (e.g.
// .listing-card:active), which makes a `position:fixed` descendant resolve
// against that transformed ancestor instead of the viewport — and get
// clipped by any `overflow:hidden` in between (e.g. .thumb). Portaling
// sidesteps both, wherever it's used.
export default function RippleWave({ x, y, onDone }) {
  return createPortal(
    <div className="ripple-wave" style={{ left: x, top: y }}>
      <span className="ripple-ring" />
      <span className="ripple-ring" />
      <span className="ripple-ring" onAnimationEnd={onDone} />
    </div>,
    document.body
  );
}
