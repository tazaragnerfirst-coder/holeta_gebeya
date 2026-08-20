import React, { useEffect, useState } from 'react';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import { getMyProfile } from '../lib/profile';
import Icon from '../components/Icon.jsx';

// Purchasing isn't built yet — this reads `subscriptionActive` off
// the user's profile doc (always false today, no write path exists)
// so the UI is already shaped correctly for whenever billing lands;
// only the CTA is a stand-in "coming soon" note for now.
const PERKS = [
  { icon: 'store', t: 'Open your own Store', d: 'A dedicated storefront for all your listings' },
  { icon: 'globe', t: 'Multiple languages', d: 'Browse and post in more than English' },
  { icon: 'trendingUp', t: 'Discounted boosts', d: 'Lower price every time you boost an ad' },
  { icon: 'star', t: 'Priority placement', d: 'Your ads stand out in search & category pages' },
];

export default function SubscriptionStatus() {
  const requireRegistered = useRequireRegistered();
  const { registeredUid } = useAppData();
  const [profile, setProfile] = useState(null);
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    if (!registeredUid) { requireRegistered().catch(() => {}); return; }
    getMyProfile(registeredUid).then(setProfile);
  }, [registeredUid]);

  const active = !!profile?.subscriptionActive;

  return (
    <div className="page">
      <h2 className="page-title">My Subscription</h2>

      <div className="plan-card">
        <div className="top"><Icon name="crown" size={14} /> {active ? 'Premium Plan' : 'Free Plan'}</div>
        <h3>{active ? "You're subscribed" : 'Not subscribed yet'}</h3>
        <div className="exp">
          <Icon name={active ? 'checkCircle' : 'clock'} size={13} />
          {active ? 'Renews automatically' : 'Upgrade to unlock Store, Settings & more'}
        </div>
      </div>

      <div className="section-title">What's included</div>
      <div className="feature-list">
        {PERKS.map((p) => (
          <div className="feature-row" key={p.t}>
            <div className="fi"><Icon name={p.icon} size={15} /></div>
            <div>
              {p.t}
              <div style={{ fontWeight: 500, fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 1 }}>{p.d}</div>
            </div>
          </div>
        ))}
      </div>

      {!active && (
        <>
          <button type="button" className="boost-cta" style={{ background: 'var(--primary)', border: 'none', marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={() => setShowNote(true)} disabled={showNote}>
            <Icon name="crown" size={13} /> Upgrade to Premium
          </button>
          {showNote && <div className="coming-soon-note">Subscriptions are coming soon — we'll let you know the moment you can upgrade.</div>}
        </>
      )}
    </div>
  );
}
