import React from 'react';

// Shown while requireRegistered() is waiting on ensureLoggedIn() — the
// Render free-tier cold start can take up to ~30s on first login, and
// with nothing visible during that wait the tapped action (post/chat/
// call) can look frozen/broken (#hog037). Sits at the top of the
// screen, same fixed-position language as PostProgressRing, but with
// a label since here the wait is blocking the action the user just
// took (unlike PostProgressRing's silent background retry).
export default function ConnectingIndicator({ active }) {
  if (!active) return null;
  return (
    <div className="connecting-indicator" role="status" aria-live="polite">
      <svg viewBox="0 0 24 24" width="14" height="14" className="ci-spinner">
        <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" className="ci-track" />
        <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" className="ci-arc" />
      </svg>
      <span>Connecting… first login can take up to 30s</span>
    </div>
  );
}
