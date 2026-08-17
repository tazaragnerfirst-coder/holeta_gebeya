import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

// Consistent look for "couldn't load" and "nothing here yet" states:
// an icon, a short message, and — when there's somewhere useful to
// go — a small action. `tone="error"` uses the accent (amber) tint
// instead of red, so a failed load reads as "try again", not alarm.
export default function StateMessage({ icon = 'helpCircle', tone = 'default', text, actionLabel, actionTo, onAction }) {
  return (
    <div className={`state-box ${tone === 'error' ? 'state-error' : ''}`}>
      <Icon name={icon} size={16} />
      <span>{text}</span>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="state-action">{actionLabel}</Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button type="button" className="state-action" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
