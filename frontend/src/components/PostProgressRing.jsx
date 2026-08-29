import React from 'react';
import { usePostProgress } from '../lib/postProgress';

// Sits at the top of every screen, invisible until a post/save is
// retrying in the background (e.g. the server was cold-starting) —
// so that wait never has to block the page it started on.
export default function PostProgressRing() {
  const { active, failed } = usePostProgress();
  if (!active && !failed) return null;
  return (
    <div className={`post-progress-ring ${failed ? 'is-failed' : ''}`} role="status" aria-live="polite">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" className="ppr-track" />
        <circle cx="12" cy="12" r="9" fill="none" strokeWidth="3" className="ppr-arc" />
      </svg>
    </div>
  );
}
