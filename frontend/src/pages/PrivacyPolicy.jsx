import React from 'react';
import Icon from '../components/Icon.jsx';

// Full policy text to be added later — placeholder so the menu item
// and route exist now.
export default function PrivacyPolicy() {
  return (
    <div className="page">
      <h2 className="page-title">Privacy Policy</h2>
      <div className="empty-state">
        <div className="empty-state-icon"><Icon name="shieldLock" size={26} /></div>
        <div className="empty-state-title">Coming soon</div>
        <div className="empty-state-sub">Our full privacy policy will be published here.</div>
      </div>
    </div>
  );
}
