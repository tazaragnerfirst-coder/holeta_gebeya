import React, { useState } from 'react';
import Icon from '../components/Icon.jsx';
import Switch from '../components/Switch.jsx';
import { getVibration, setVibration } from '../lib/vibration';
import { getTheme, setTheme } from '../lib/theme';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
];

// Change Language is still tagged Premium for when subscriptions
// launch — nothing is gated behind it yet, so tapping it just
// surfaces a short note instead of a real settings screen. Display
// is a real, working control (light/dark/system theme).
export default function Settings() {
  const [displayOpen, setDisplayOpen] = useState(false);
  const [languageNoteOpen, setLanguageNoteOpen] = useState(false);
  const [vibration, setVibrationState] = useState(getVibration());
  const [theme, setThemeState] = useState(getTheme());

  function toggleVibration(on) {
    setVibrationState(on);
    setVibration(on);
  }

  function chooseTheme(value) {
    setThemeState(value);
    setTheme(value);
  }

  return (
    <div className="page">
      <h2 className="page-title">Settings</h2>

      <div className="menu-list">
        <div className="menu-item" onClick={() => setDisplayOpen((v) => !v)}>
          <div className="menu-icon"><Icon name="sliders" size={17} /></div>
          <div className="t">Display</div>
          <div className="chev"><Icon name={displayOpen ? 'chevronDown' : 'chevronLeft'} size={16} /></div>
        </div>
        <div className="menu-item" onClick={() => setLanguageNoteOpen((v) => !v)}>
          <div className="menu-icon"><Icon name="globe" size={17} /></div>
          <div className="t">Change Language <span className="premium-tag"><Icon name="crown" size={9} /> Premium</span></div>
          <div className="chev"><Icon name="chevronLeft" size={16} /></div>
        </div>
        <div className="menu-item" onClick={() => toggleVibration(!vibration)} style={{ cursor: 'default' }}>
          <div className="menu-icon"><Icon name="vibrate" size={17} /></div>
          <div className="t">Vibration</div>
          <Switch checked={vibration} onChange={toggleVibration} />
        </div>
      </div>

      {displayOpen && (
        <div className="theme-picker">
          {THEME_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`theme-option ${theme === opt.value ? 'active' : ''}`}
              onClick={() => chooseTheme(opt.value)}
            >
              <Icon name={opt.icon} size={18} />
              <span>{opt.label}</span>
              {theme === opt.value && <Icon name="check" size={14} className="theme-option-check" />}
            </button>
          ))}
        </div>
      )}

      {languageNoteOpen && <div className="coming-soon-note">More languages are part of Subscription — coming soon.</div>}
    </div>
  );
}
