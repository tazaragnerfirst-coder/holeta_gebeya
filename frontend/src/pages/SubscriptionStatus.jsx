import React, { useEffect, useState } from 'react';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import { isSubscriptionActive, formatExpiry } from '../lib/subscription';
import { submitSubscriptionPayment, getPendingSubscriptionPayment } from '../lib/subscriptionPayment';
import { SUBSCRIPTION_PRICE_ETB, SUBSCRIPTION_PERIOD_DAYS, PAYMENT_ACCOUNTS } from '../lib/constants';
import Icon from '../components/Icon.jsx';
import ChipSelect from '../components/ChipSelect.jsx';
import ImageUploader from '../components/ImageUploader.jsx';

// Manual receipt-review model (same approach as equb_bot, no payment
// gateway): user sends money to one of PAYMENT_ACCOUNTS, uploads a
// screenshot here, an admin approves/rejects it from the admin panel.
// Price/accounts are placeholders — see lib/constants.js.
const PERKS = [
  { icon: 'shieldLock', t: 'Verified Premium badge', d: 'Shown on your profile and listings' },
  { icon: 'trendingUp', t: 'Discounted boosts', d: 'Lower price every time you boost an ad' },
  { icon: 'star', t: 'Priority placement', d: 'Your ads stand out in search & category pages' },
  { icon: 'camera', t: 'More photos per listing', d: 'Higher photo limit than the free plan' },
  { icon: 'globe', t: 'Multiple languages', d: 'Coming with the Amharic UI update' },
];

export default function SubscriptionStatus() {
  const requireRegistered = useRequireRegistered();
  const { registeredUid, profile } = useAppData();
  const [pending, setPending] = useState(undefined); // undefined = loading, null = none
  const [showForm, setShowForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [receiptImages, setReceiptImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!registeredUid) { requireRegistered().catch(() => {}); return; }
    getPendingSubscriptionPayment(registeredUid).then(setPending).catch(() => setPending(null));
  }, [registeredUid]);

  const active = isSubscriptionActive(profile);

  async function handleSubmit() {
    if (!paymentMethod || receiptImages.length === 0 || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await submitSubscriptionPayment(registeredUid, {
        name: profile?.name,
        phone: profile?.phone,
        paymentMethod,
        receiptImage: receiptImages[0],
      });
      setPending({ paymentMethod, status: 'pending' });
      setShowForm(false);
    } catch {
      setError("Couldn't submit your payment — check your connection and try again.");
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

      {!active && pending === null && !showForm && (
        <button type="button" className="boost-cta" style={{ background: 'var(--primary)', border: 'none', marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={() => setShowForm(true)}>
          <Icon name="crown" size={13} /> Upgrade to Premium
        </button>
      )}

      {!active && pending && (
        <div className="coming-soon-note">
          <Icon name="clock" size={13} /> Your payment is under review — this usually doesn't take long.
        </div>
      )}

      {!active && showForm && (
        <div className="plan-card" style={{ marginTop: 16 }}>
          <div className="top"><Icon name="coin" size={14} /> Send payment</div>
          <p className="helper-text" style={{ marginTop: 2 }}>
            Send {SUBSCRIPTION_PRICE_ETB} ETB to one of the accounts below, then upload a screenshot of the receipt.
          </p>

          <ChipSelect
            options={PAYMENT_ACCOUNTS.map((a) => ({ label: a.label, value: a.method }))}
            value={paymentMethod}
            onChange={setPaymentMethod}
            placeholder="Select payment method"
          />

          {paymentMethod && (
            <div className="coming-soon-note" style={{ marginTop: 8 }}>
              Send to: <strong>{PAYMENT_ACCOUNTS.find((a) => a.method === paymentMethod)?.account}</strong> ({paymentMethod})
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <ImageUploader files={receiptImages} onChange={setReceiptImages} maxImages={1} compact />
          </div>

          {error && <p className="helper-text error-text">{error}</p>}

          <button
            type="button"
            className="boost-cta"
            style={{ background: 'var(--primary)', border: 'none', marginTop: 12, width: '100%', justifyContent: 'center' }}
            onClick={handleSubmit}
            disabled={!paymentMethod || receiptImages.length === 0 || submitting}
          >
            {submitting ? <span className="spinner" /> : <Icon name="send" size={13} />} Submit for review
          </button>
        </div>
      )}
    </div>
  );
}
