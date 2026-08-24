import React, { useEffect } from 'react';
import Icon from './Icon.jsx';
import { hapticError, hapticSuccess } from '../lib/telegram';

// Same error-banner/ok-banner markup every call site already used —
// this just centralizes it and fires a haptic buzz the moment the
// message appears, so every error/success in the app feels the same.
export function ErrorBanner({ text, icon = 'x', style }) {
  useEffect(() => { hapticError(); }, []);
  return (
    <div className="error-banner" style={style}>
      <Icon name={icon} size={14} />
      <span>{text}</span>
    </div>
  );
}

export function SuccessBanner({ text, icon = 'checkCircle', style }) {
  useEffect(() => { hapticSuccess(); }, []);
  return (
    <div className="ok-banner" style={style}>
      <Icon name={icon} size={14} />
      <span>{text}</span>
    </div>
  );
}
