import React, { useState } from 'react';
import Icon from '../components/Icon.jsx';
import Switch from '../components/Switch.jsx';
import { getVibrant, setVibrant } from '../lib/vibrant';

// Display and Change Language are tagged Premium for when
// subscriptions launch — nothing is actually gated yet, so tapping
// them just surfaces a short note instead of a real settings screen.
export default function Settings() {
  const [openNote, setOpenNote] = useState(null); // 'display' | 'language' | null
  const [vibrant, setVibrantState] = useState(getVibrant());

  function toggleVibrant(on) {
    setVibrantState(on);
    setVibrant(on);
  }

  return (
    <div className="page">
      <h2 className="page-title">Settings</h2>

      <div className="menu-list">
        <div className="menu-item" onClick={() => setOpenNote(openNote === 'display' ? null : 'display')}>
          <div className="menu-icon"><Icon name="sliders" size={17} /></div>
          <div className="t">Display <span className="premium-tag"><Icon name="crown" size={9} /> Premium</span></div>
          <div className="chev"><Icon name="chevronLeft" size={16} /></div>
        </div>
        <div className="menu-item" onClick={() => setOpenNote(openNote === 'language' ? null : 'language')}>
          <div className="menu-icon"><Icon name="globe" size={17} /></div>
          <div className="t">Change Language <span className="premium-tag"><Icon name="crown" size={9} /> Premium</span></div>
          <div className="chev"><Icon name="chevronLeft" size={16} /></div>
        </div>
        <div className="menu-item" onClick={() => toggleVibrant(!vibrant)} style={{ cursor: 'default' }}>
          <div className="menu-icon"><Icon name="sliders2" size={17} /></div>
          <div className="t">Vibrant</div>
          <Switch checked={vibrant} onChange={toggleVibrant} />
        </div>
      </div>

      {openNote === 'display' && <div className="coming-soon-note">Display options are part of Subscription — coming soon.</div>}
      {openNote === 'language' && <div className="coming-soon-note">More languages are part of Subscription — coming soon.</div>}
    </div>
  );
}
