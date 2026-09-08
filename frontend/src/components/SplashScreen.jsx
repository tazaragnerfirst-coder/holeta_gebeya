import React from 'react';

// Shown over the very first paint of a cold app-open, covering Home
// while categories + the first listings page load (#hog054). No
// logo yet, so a plain text wordmark in the app's primary color.
// Reuses the same spinner arc styling as ConnectingIndicator/
// PostProgressRing (.ci-track/.ci-arc in theme.css) for visual
// consistency instead of introducing a new spinner style.
export default function SplashScreen({ fadingOut }) {
  return (
    <div className={`splash-screen${fadingOut ? ' is-fading' : ''}`} aria-hidden={fadingOut}>
      <span className="splash-wordmark">Holeta Gebeya</span>
      <svg viewBox="0 0 24 24" width="22" height="22" className="splash-spinner">
        <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" className="ci-track" />
        <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" className="ci-arc" />
      </svg>
    </div>
  );
}
