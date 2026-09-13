import React from 'react';

// Golden ripple that expands from (x, y) to cover the screen, then fades —
// used on the Save/bookmark action to mirror Telegram's star-reaction wave.
export default function RippleWave({ x, y, onDone }) {
  return (
    <div
      className="ripple-wave"
      style={{ left: x, top: y }}
      onAnimationEnd={onDone}
    />
  );
}
