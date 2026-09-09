import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import { isSubscriptionActive, formatExpiry } from '../lib/subscription';
import { spendWallet } from '../lib/wallet';
import { SUBSCRIPTION_PRICE_ETB, SUBSCRIPTION_PERIOD_DAYS } from '../lib/constants';
import Icon from '../components/Icon.jsx';

// Wallet-funded, so subscribing is instant — no receipt/admin-review
// wait anymore (that manual-review step now happens once, up front,
// on the Wallet top-up itself — see Wallet.jsx). spendWallet() is
// server-verified (Admin SDK), so the balance check can't be spoofed
// client-side — see backend/server/index.js's /spendWallet.
const PERKS = [
  { icon: 'shieldLock', t: 'Verified Premium badge', d: 'Shown on your profile and listings' },
  { icon: 'trendingUp', t: 'Discounted boosts', d: 'Lower price every time you boost an ad' },
  { icon: 'star', t: 'Priority placement', d: 'Your ads stand out in search & category pages' },
  { icon: 'camera', t: 'More photos per listing', d: 'Higher photo limit than the free plan' },
  { icon: 'globe', t: 'Multiple languages', d: 'Coming with the Amharic UI update' },
];

export default function SubscriptionStatus() {
  const navigate = useNavigate();
  const requireRegistered = useRequireRegistered();
  const { registeredUid, profile, walletBalance, walletBalanceReady } = useAppData();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const active = isSubscriptionActive(profile);
  const insufficientBalance = walletBalanceReady && walletBalance < SUBSCRIPTION_PRICE_ETB;

  async function handleSubscribe() {
    if (submitting) return;
    try {
      await requireRegistered();
    } catch {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await spendWallet({ type: 'subscription' });
      // profile.subscriptionActive updates live via appData's onSnapshot
      // once the backend write lands — no manual refetch needed here.
    } catch (err) {
      setError(err.insufficient ? `Not enough balance — you need ${SUBSCRIPTION_PRICE_ETB} ETB.` : (err.message || "Couldn't complete the purchase."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">My Subscription</h2>

      <div className="plan-card">
        <div className="top"><Icon name="crown" size={14} /> {active ? 'Premium Plan' : 'Free Plan'}</div>
        <h3>{active ? "You're subscribed" : 'Not subscribed yet'}</h3>
        <div className="exp">
          <Icon name={active ? 'checkCircle' : 'clock'} size={13} />
          {active
            ? (profile?.subscriptionExpiresAt ? `Valid until ${formatExpiry(profile.subscriptionExpiresAt)}` : 'Active')
            : `${SUBSCRIPTION_PRICE_ETB} ETB / ${SUBSCRIPTION_PERIOD_DAYS} days`}
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
          <div className="coming-soon-note" style={{ marginTop: 16 }}>
            <Icon name="wallet" size={13} /> Wallet balance: {walletBalanceReady ? `${walletBalance.toLocaleString('en-US')} ETB` : '···'}
          </div>

          {error && <p className="helper-text error-text">{error}</p>}

          {insufficientBalance ? (
            <button
              type="button"
              className="boost-cta"
              style={{ background: 'var(--primary)', border: 'none', marginTop: 12, width: '100%', justifyContent: 'center' }}
              onClick={() => navigate('/wallet')}
            >
              <Icon name="wallet" size={13} /> Top up wallet
            </button>
          ) : (
            <button
              type="button"
              className="boost-cta"
              style={{ background: 'var(--primary)', border: 'none', marginTop: 12, width: '100%', justifyContent: 'center' }}
              onClick={handleSubscribe}
              disabled={submitting || !registeredUid}
            >
              {submitting ? <span className="spinner" /> : <Icon name="crown" size={13} />} Subscribe — {SUBSCRIPTION_PRICE_ETB} ETB
            </button>
          )}
        </>
      )}
    </div>
  );
}
