import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useAppData } from '../lib/appData';
import { useRequireRegistered } from '../lib/authGate';
import { setFavorite } from '../lib/favorites';
import { formatListingPrice } from '../lib/format';
import { productLinkState } from '../lib/nav';
import { hapticImpact } from '../lib/telegram';
import { setCached } from '../lib/pageCache';

const SWATCHES = ['#8FA998', '#C9A15A', '#A9876B', '#8A9BAE', '#B0836D', '#7E9E8C', '#B79A6B', '#93A0AE'];
function colorFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % SWATCHES.length;
  return SWATCHES[h];
}

function timeAgo(ts) {
  if (!ts?.toDate) return '';
  const min = Math.floor((Date.now() - ts.toDate().getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export default function ListingCard({ item, boosted }) {
  const { registeredUid, favorites } = useAppData();
  const requireRegistered = useRequireRegistered();
  const [favBusy, setFavBusy] = useState(false);
  // null = no override, trust `favorites` (live data). Set right when
  // tapped so the icon flips instantly instead of waiting for the
  // setFavorite() write + onSnapshot round-trip; cleared once live data
  // confirms it (see effect below) or reverted on a failed write.
  const [optimisticFavorited, setOptimisticFavorited] = useState(null);
  const location = useLocation();

  const photos = item.images && item.images.length ? item.images : (item.photo ? [item.photo] : []);
  const photo = photos[0];
  const posted = timeAgo(item.createdAt);
  const isJob = item.categoryType === 'job';
  const priceDisplay = formatListingPrice(item);
  const realFavorited = registeredUid ? favorites.some((f) => f.listingId === item.id) : false;
  const isFavorited = optimisticFavorited !== null ? optimisticFavorited : realFavorited;

  // Seeds ProductDetail's pageCache with this item's full doc data (the
  // feed query already fetches full listings, no field-select) the moment
  // its card is on screen — not on tap. So by the time the card is tapped,
  // ProductDetail's initial useState read already finds a warm cache and
  // paints instantly, no skeleton wait; its own onSnapshot still refreshes
  // in the background as before.
  useEffect(() => {
    setCached(`product:${item.id}`, item);
  }, [item.id]);

  // Drops the optimistic override once live data confirms it, so a
  // later real update (e.g. unfavorited from another device) can take
  // over normally instead of being stuck behind a stale override.
  useEffect(() => {
    if (optimisticFavorited !== null && realFavorited === optimisticFavorited) {
      setOptimisticFavorited(null);
    }
  }, [realFavorited]);

  async function toggleFavorite(e) {
    e.preventDefault();
    e.stopPropagation();
    if (favBusy) return;
    const willFavorite = !isFavorited;
    setOptimisticFavorited(willFavorite);
    if (willFavorite) hapticImpact('light');
    setFavBusy(true);
    try {
      const user = await requireRegistered();
      await setFavorite(user.uid, item, isFavorited);
    } catch {
      // Saving is a light-weight, retryable action from a card — if it
      // fails (offline, cancelled signup), just revert the optimistic
      // flip back to the real state rather than interrupting browsing
      // with an error banner here.
      setOptimisticFavorited(null);
    } finally {
      setFavBusy(false);
    }
  }

  return (
    <Link to={`/product/${item.id}`} state={productLinkState(location)} className={`listing-card ${isJob ? 'card-job' : ''}`}>
      <div className="thumb">
        {photo ? (
          <img className="thumb-img" src={photo} alt={item.title} loading="lazy" />
        ) : isJob ? (
          <div className="thumb-placeholder" style={{ background: colorFor(item.id) }}>
            <Icon name="briefcase" size={22} />
          </div>
        ) : (
          <div className="thumb-placeholder" style={{ background: colorFor(item.id) }}>
            <Icon name="image" size={22} />
          </div>
        )}
        {boosted ? (
          <div className="badge-boost"><Icon name="trendingUp" size={13} /> </div>
        ) : null}
        <button
          type="button"
          className={isFavorited ? 'footer-fav is-fav' : 'footer-fav'}
          onClick={toggleFavorite}
          disabled={favBusy}
          aria-label={isFavorited ? 'Remove from saved' : 'Save this listing'}
        >
          <Icon name="bookmark" size={13} {...(isFavorited ? { weight: 'fill' } : {})} />
        </button>
      </div>
      <div className="card-footer">
        {item.category && <div className="card-eyebrow">{item.category}</div>}
        <div className="card-title">{item.title}</div>
        {item.avgRating && item.reviewCount > 5 ? (
          <div className="card-rating">
            <Icon name="star" size={11} fill="currentColor" />
            {item.avgRating.toFixed(1)}
            <span>({item.reviewCount})</span>
          </div>
        ) : null}
        {!isJob && <div className="card-price">{priceDisplay.text}{priceDisplay.currency && <span>ETB</span>}</div>}
        <div className="card-meta">
          {posted && <span><Icon name="clock" size={11} /> {posted}</span>}
          {photos.length > 1 && <span><Icon name="camera" size={11} /> {photos.length}</span>}
        </div>
      </div>
    </Link>
  );
}
