import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import { getListingAnalytics } from '../lib/analytics';
import { isActiveAd, daysSincePosted, isCurrentlyBoosted } from '../lib/adStatus';
import Icon from '../components/Icon.jsx';
import DailyViewsChart from '../components/DailyViewsChart.jsx';
import ContactFunnelChart from '../components/ContactFunnelChart.jsx';
import RankedBarChart from '../components/RankedBarChart.jsx';
import BoostCard from '../components/BoostCard.jsx';
import StarRow from '../components/StarRow.jsx';
import StateMessage from '../components/StateMessage.jsx';
import { formatListingPrice } from '../lib/format';

const RANGE_OPTIONS = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: Infinity },
];

function timeAgo(ts) {
  if (!ts) return '';
  const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : new Date(ts).getTime();
  const diff = Math.max(0, Date.now() - ms);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}


export default function ViewAdDetail() {
  const { id } = useParams();
  const { ads, adsReady, registeredUid } = useAppData();
  const ad = ads.find((a) => a.id === id);
  const requireRegistered = useRequireRegistered();

  useEffect(() => {
    if (registeredUid) return;
    requireRegistered().catch((err) => console.error(err));
  }, [registeredUid]);

  const [rangeKey, setRangeKey] = useState('30');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [analytics, setAnalytics] = useState([]);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);

  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) || RANGE_OPTIONS[1];

  function loadAnalytics() {
    if (!id || !ad?.sellerId) return;
    setAnalyticsReady(false);
    setAnalyticsError(false);
    getListingAnalytics(id, ad.sellerId, range.days)
      .then((data) => { setAnalytics(data); setAnalyticsReady(true); })
      .catch(() => { setAnalyticsReady(true); setAnalyticsError(true); });
  }
  useEffect(loadAnalytics, [id, ad?.sellerId, range.days]);

  // Buyer-left ratings/reviews for this specific listing — publicly
  // readable (same query ProductDetail uses), so no sellerId gating
  // needed here, unlike the analytics reads above.
  const [reviews, setReviews] = useState([]);
  const [reviewsReady, setReviewsReady] = useState(false);
  const [reviewsError, setReviewsError] = useState(false);

  function loadReviews() {
    if (!id) return;
    setReviewsReady(false);
    setReviewsError(false);
    getDocs(query(collection(db, 'reviews'), where('listingId', '==', id)))
      .then((snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setReviews(data);
        setReviewsReady(true);
      })
      .catch(() => { setReviewsReady(true); setReviewsError(true); });
  }
  useEffect(loadReviews, [id]);
  const avgReviewRating = reviews.length ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;

  const rangeViews = useMemo(() => analytics.reduce((s, a) => s + (a.views || 0), 0), [analytics]);
  const rangeContacts = useMemo(() => analytics.reduce((s, a) => s + (a.contacts || 0), 0), [analytics]);

  // "vs your other ads" comparisons — scoped to this seller's own
  // listings, not the whole marketplace (that data isn't available
  // here), so the copy below says so explicitly.
  const categoryPeers = ads.filter((a) => a.id !== id && a.category === ad?.category);
  const categoryAvg = categoryPeers.length > 0
    ? Math.round(categoryPeers.reduce((s, a) => s + (a.views || 0), 0) / categoryPeers.length)
    : null;

  const isBoosted = isCurrentlyBoosted(ad);
  const thisRate = ad ? (ad.views || 0) / (daysSincePosted(ad) || 1) : 0;
  const boostedPeers = ads.filter((a) => a.id !== id && isCurrentlyBoosted(a));
  const regularPeers = ads.filter((a) => a.id !== id && !isCurrentlyBoosted(a));
  const otherGroup = isBoosted ? regularPeers : boostedPeers;
  const otherGroupAvgRate = otherGroup.length > 0
    ? otherGroup.reduce((s, a) => s + (a.views || 0) / (daysSincePosted(a) || 1), 0) / otherGroup.length
    : null;
  const showBoostCompare = otherGroupAvgRate != null;

  const conversionRate = rangeViews > 0 ? Math.round((rangeContacts / rangeViews) * 100) : null;
  let tip = null;
  if (analyticsReady && rangeViews >= 10 && conversionRate != null && conversionRate < 5) {
    tip = "Views are coming in but few people are reaching out — try a lower price, sharper photos, or a clearer description.";
  } else if (analyticsReady && rangeViews < 5 && ad && daysSincePosted(ad) > 3) {
    tip = 'Not many views yet — boosting this ad or posting in a more specific category can help it get seen.';
  }

  if (!adsReady && !ad) {
    return <div className="page"><p className="helper-text">Loading...</p></div>;
  }
  if (adsReady && !ad) {
    return (
      <div className="page">
        <StateMessage text="Ad not found." actionLabel="Back to Views" actionTo="/dashboard/views" />
      </div>
    );
  }

  const photo = ad.images && ad.images[0];
  const priceDisplay = formatListingPrice(ad);

  return (
    <div className="page">
      <h2 className="page-title">Ad performance</h2>

      <div className="view-ad-detail-head">
        <div className="ad-thumb" style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
          {!photo && <Icon name="image" size={16} />}
        </div>
        <div className="info">
          <div className="t">{ad.title}</div>
          <div className="p">{priceDisplay.text}{priceDisplay.currency ? ' ETB' : ''}</div>
        </div>
        <div className={`status-pill ${ad.status}`}>{isActiveAd(ad) ? 'active' : ad.status}</div>
      </div>

      <div className="dash-head" style={{ marginTop: 16 }}>
        <h3 className="section-title" style={{ margin: 0 }}>Trend</h3>
        <div className="range-picker">
          <button type="button" className="range-btn" onClick={() => setRangeOpen((v) => !v)}>
            {range.label} <Icon name="chevronDown" size={14} />
          </button>
          {rangeOpen && (
            <div className="range-menu">
              {RANGE_OPTIONS.map((r) => (
                <button
                  type="button"
                  key={r.key}
                  className={`range-option ${r.key === rangeKey ? 'active' : ''}`}
                  onClick={() => { setRangeKey(r.key); setRangeOpen(false); }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="chart-card">
        {analyticsReady
          ? <DailyViewsChart data={analytics.map((a) => ({ date: a.date, views: a.views || 0 }))} />
          : <div className="chart-empty" style={{ height: 140 }}>Loading…</div>}
        {analyticsReady && analyticsError && (
          <StateMessage tone="error" icon="alertTriangle" text="Couldn't load this chart." actionLabel="Retry" onAction={loadAnalytics} />
        )}
      </div>

      <h3 className="section-title"><Icon name="chat" size={16} /> Views → Contact</h3>
      <div className="chart-card">
        {analyticsReady && !analyticsError
          ? <ContactFunnelChart views={rangeViews} contacts={rangeContacts} />
          : <div className="chart-empty" style={{ height: 80 }}>{analyticsError ? '—' : 'Loading…'}</div>}
      </div>

      {categoryAvg != null && (
        <>
          <h3 className="section-title"><Icon name="grid" size={16} /> Vs. your other {ad.category} ads</h3>
          <div className="chart-card">
            <RankedBarChart
              items={[
                { label: 'This ad', value: ad.views || 0 },
                { label: 'Your avg', value: categoryAvg },
              ]}
              limit={2}
            />
          </div>
        </>
      )}

      <h3 className="section-title"><Icon name="chat" size={16} /> Ratings & Reviews</h3>
      <div className="chart-card">
        {!reviewsReady && <div className="chart-empty" style={{ height: 60 }}>Loading…</div>}
        {reviewsReady && reviewsError && (
          <StateMessage tone="error" icon="alertTriangle" text="Couldn't load reviews." actionLabel="Retry" onAction={loadReviews} />
        )}
        {reviewsReady && !reviewsError && reviews.length === 0 && (
          <p className="no-reviews">No reviews yet on this ad.</p>
        )}
        {reviewsReady && !reviewsError && reviews.length > 0 && (
          <>
            <div className="review-summary" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <StarRow value={avgReviewRating} size={14} />
              <span>{avgReviewRating.toFixed(1)} ({reviews.length})</span>
            </div>
            {reviews.map((r) => (
              <div className="review-item" key={r.id}>
                <div className="review-top">
                  <span className="review-name">{r.buyerName || 'Buyer'}</span>
                  <span className="review-date">{timeAgo(r.createdAt)}</span>
                </div>
                <StarRow value={r.rating || 0} size={12} />
                {r.comment && <p className="review-comment">{r.comment}</p>}
              </div>
            ))}
          </>
        )}
      </div>

      <h3 className="section-title"><Icon name="trendingUp" size={16} /> Boost</h3>
      {isBoosted ? (
        <div className="state-box"><Icon name="star" size={16} /><span>This ad is currently boosted and featured on the home screen.</span></div>
      ) : (
        <BoostCard
          title="Get more eyes on this ad"
          description={showBoostCompare ? undefined : 'Boosted ads are shown as Featured on the home screen.'}
          compare={showBoostCompare ? [
            { label: 'This ad', value: Math.round(thisRate * 10) / 10 },
            { label: 'Your boosted ads', value: Math.round(otherGroupAvgRate * 10) / 10 },
          ] : null}
          ctaLabel="Boost this ad"
        />
      )}

      {tip && (
        <div className="chart-card" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="star" size={16} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{tip}</span>
        </div>
      )}
    </div>
  );
}
