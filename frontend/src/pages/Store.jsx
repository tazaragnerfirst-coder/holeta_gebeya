import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import { isSubscriptionActive, isSellerVerified } from '../lib/subscription';
import { getStoreProfile, saveStoreProfile } from '../lib/storeProfile';
import { getSellerRating } from '../lib/rating';
import { getSellerAnalytics, logStoreVisit, buildDailySeries } from '../lib/analytics';
import { isActiveAd } from '../lib/adStatus';
import Icon from '../components/Icon.jsx';
import StarRow from '../components/StarRow.jsx';
import Sparkline from '../components/Sparkline.jsx';
import ListingCard from '../components/ListingCard.jsx';
import ListingGrid from '../components/ListingGrid.jsx';
import EditStoreSheet from '../components/EditStoreSheet.jsx';

// Public storefront (#hog023/#hog046) — one page shared by the owner
// (extra Edit affordance + private visits chart) and any buyer who
// taps "Visit Store" from a listing's seller card. Reachable without
// login, same as ProductDetail — only the Edit action requires it.
const SOCIAL = [
  { key: 'tiktok', icon: 'tiktok', label: 'TikTok' },
  { key: 'instagram', icon: 'instagram', label: 'Instagram' },
  { key: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp' },
  { key: 'website', icon: 'globe', label: 'Website' },
];

function socialHref(key, value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (key === 'whatsapp') {
    const digits = value.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : '';
  }
  if (key === 'tiktok') return `https://tiktok.com/@${value.replace(/^@/, '')}`;
  if (key === 'instagram') return `https://instagram.com/${value.replace(/^@/, '')}`;
  return `https://${value}`;
}

export default function Store() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const requireRegistered = useRequireRegistered();
  const { registeredUid, profile, categories } = useAppData();
  const isOwner = !!registeredUid && registeredUid === sellerId;

  const [listings, setListings] = useState([]);
  const [listingsReady, setListingsReady] = useState(false);
  const [storeProfile, setStoreProfile] = useState(null);
  const [rating, setRating] = useState({ avg: 0, count: 0 });
  const [trend, setTrend] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;

    getDocs(query(collection(db, 'listings'), where('sellerId', '==', sellerId), orderBy('createdAt', 'desc')))
      .then((snap) => {
        if (cancelled) return;
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setListings(all.filter(isActiveAd));
        setListingsReady(true);
      })
      .catch(() => setListingsReady(true));

    getStoreProfile(sellerId).then((p) => { if (!cancelled) setStoreProfile(p); });
    getSellerRating(sellerId).then((r) => { if (!cancelled) setRating(r); });

    const isSelfView = registeredUid && registeredUid === sellerId;
    if (!isSelfView) {
      logStoreVisit(sellerId);
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, registeredUid]);

  useEffect(() => {
    if (!isOwner) return;
    getSellerAnalytics(sellerId, 7).then((data) => setTrend(buildDailySeries(data, 'storeVisits', 7))).catch(() => setTrend([0, 0, 0, 0, 0, 0, 0]));
  }, [isOwner, sellerId]);

  async function openEdit() {
    try {
      await requireRegistered();
      setEditError('');
      setEditOpen(true);
    } catch {
      // requireRegistered() already surfaces its own signup sheet.
    }
  }

  async function handleEditSubmit(payload) {
    setEditBusy(true);
    setEditError('');
    try {
      await saveStoreProfile(sellerId, payload);
      setStoreProfile((prev) => ({ ...prev, ...payload }));
      setEditOpen(false);
    } catch {
      setEditError("Couldn't save your store — check your connection and try again.");
    } finally {
      setEditBusy(false);
    }
  }

  const displayName = (isOwner && profile?.name) || listings[0]?.sellerName || 'Seller';
  const displayPhoto = (isOwner && profile?.photo) || listings[0]?.sellerPhoto || '';
  const initial = displayName ? displayName[0].toUpperCase() : '?';
  const verified = isOwner ? isSubscriptionActive(profile) : isSellerVerified(listings[0]);

  // Group active listings by category (in the admin's category
  // order), plus a separate "Jobs" bucket for categoryType:'job'
  // posts, which carry no category id (see PostAd.jsx).
  const jobs = listings.filter((l) => l.categoryType === 'job');
  const byCategory = (categories || [])
    .map((c) => ({ cat: c, items: listings.filter((l) => l.category === c.id) }))
    .filter((g) => g.items.length > 0);

  const socialLinks = storeProfile?.socialLinks || {};
  const hasAnySocial = SOCIAL.some((s) => socialLinks[s.key]);

  return (
    <div className="page">
      <h2 className="page-title">Store</h2>

      <div className="plan-card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          className="avatar-lg"
          style={displayPhoto ? { backgroundImage: `url(${displayPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 } : { flexShrink: 0 }}
        >
          {!displayPhoto && initial}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {displayName}
            {verified && <Icon name="shieldLock" size={14} />}
          </h3>
          <div className="stars">
            <StarRow value={rating.avg} size={13} />
            {rating.count > 0 && <span className="rating-count">{rating.avg.toFixed(1)} ({rating.count})</span>}
          </div>
          {storeProfile?.address && (
            <div className="exp" style={{ marginTop: 4 }}><Icon name="mapPin" size={12} /> {storeProfile.address}</div>
          )}
        </div>
        {isOwner && (
          <button type="button" className="icon-btn" onClick={openEdit} aria-label="Edit store"><Icon name="edit" size={16} /></button>
        )}
      </div>

      {storeProfile?.bio && <p className="helper-text" style={{ marginTop: 10 }}>{storeProfile.bio}</p>}

      {hasAnySocial && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {SOCIAL.filter((s) => socialLinks[s.key]).map((s) => (
            <a key={s.key} href={socialHref(s.key, socialLinks[s.key])} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 12.5 }}>
              <Icon name={s.icon} size={13} /> {s.label}
            </a>
          ))}
        </div>
      )}

      <div className="section-title" style={{ marginTop: 16 }}>Store condition</div>
      <div className="stat-row">
        <div className="stat-card">
          <div className="val">{listings.length}</div><div className="lbl">Listed Items</div>
        </div>
        <div className="stat-card">
          <div className="val">{rating.count > 0 ? rating.avg.toFixed(1) : '—'}</div>
          <div className="lbl">{rating.count > 0 ? `Store Rating (${rating.count})` : 'Store Rating'}</div>
        </div>
      </div>

      {isOwner && (
        <div className="chart-card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>Store visits (last 7 days)</span>
          </div>
          {trend ? <Sparkline data={trend} width={260} height={54} /> : <div className="chart-empty" style={{ height: 54 }} />}
        </div>
      )}

      {listingsReady && listings.length === 0 && (
        <p className="helper-text" style={{ marginTop: 16 }}>
          {isOwner ? "You don't have any active listings yet — post one to fill your store." : 'No active listings from this seller right now.'}
        </p>
      )}

      {jobs.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 18 }}>Jobs</div>
          <ListingGrid items={jobs} renderItem={(item) => <ListingCard key={item.id} item={item} />} />
        </>
      )}

      {byCategory.map(({ cat, items }) => (
        <React.Fragment key={cat.id}>
          <div className="section-title" style={{ marginTop: 18 }}>{cat.name}</div>
          <ListingGrid items={items} renderItem={(item) => <ListingCard key={item.id} item={item} />} />
        </React.Fragment>
      ))}

      <EditStoreSheet
        open={editOpen}
        busy={editBusy}
        error={editError}
        initialBio={storeProfile?.bio}
        initialAddress={storeProfile?.address}
        initialSocial={storeProfile?.socialLinks}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
