import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import { spendWallet } from '../lib/wallet';
import { BOOST_PRICE_ETB, BOOST_DURATION_DAYS } from '../lib/constants';

// Reused on the Dashboard (aggregate, across all ads), the general
// Boost promo page, and the per-ad detail page. Only the per-ad case
// (adId passed, from ViewAdDetail — the one place a specific ad is
// in scope) can actually complete a wallet-funded purchase; the other
// two just route to Dashboard's ad list, where "see why & boost"
// leads into that per-ad page — same reasoning /spendWallet's backend
// enforces (a boost has to name one specific ad).
export default function BoostCard({ title = 'Boost your reach', description, compare, ctaLabel = 'Boost an ad', adId, onBoosted }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const max = compare && compare.length > 0 ? Math.max(...compare.map((c) => c.value), 0.1) : 0;

  async function handleClick() {
    if (!adId) { navigate('/dashboard/ads'); return; }
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await spendWallet({ type: 'boost', listingId: adId });
      onBoosted?.();
      // The ad's own boostedUntil updates live via appData's ads
      // listener once the backend write lands — no manual refetch.
    } catch (err) {
      if (err.insufficient) navigate('/wallet');
      else setError(err.message || "Couldn't complete the boost.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="boost-card">
      <div className="top"><Icon name="trendingUp" size={13} /> Boost</div>
      <p style={{ marginTop: 4, marginBottom: compare ? 10 : 12, fontWeight: 700, fontSize: 14, color: '#fff' }}>{title}</p>
      {description && <p style={{ marginTop: -6 }}>{description}</p>}

      {compare && compare.length > 0 && (
        <div className="boost-compare">
          {compare.map((c) => (
            <div className="boost-compare-item" key={c.label}>
              <div className="n">{c.value}</div>
              <div className="l">{c.label}</div>
              <div className="boost-compare-track">
                <div className="boost-compare-fill" style={{ width: `${Math.max((c.value / max) * 100, 4)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {adId && <p style={{ marginTop: -6, marginBottom: 12 }}>{BOOST_PRICE_ETB} ETB / {BOOST_DURATION_DAYS} days, from your wallet balance.</p>}

      <button type="button" className="boost-cta" onClick={handleClick} disabled={busy}>
        {busy ? <span className="spinner" /> : <Icon name="star" size={13} />} {ctaLabel}
      </button>
      {error && <div className="boost-note">{error}</div>}
    </div>
  );
}
