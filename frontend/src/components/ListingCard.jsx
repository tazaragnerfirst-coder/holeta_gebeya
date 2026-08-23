import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useAppData } from '../lib/appData';
import { useRequireRegistered } from '../lib/authGate';
import { setFavorite } from '../lib/favorites';
import { formatPrice } from '../lib/format';

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

function conditionTone(condition) {
  if (!condition) return 'default';
  const c = condition.toLowerCase();
  if (c === 'new') return 'new';
  if (c.includes('repair')) return 'repair';
  return 'used';
}

export default function ListingCard({ item, boosted }) {
  const { registeredUid, favorites } = useAppData();
  const requireRegistered = useRequireRegistered();
  const [favBusy, setFavBusy] = useState(false);

  const photos = item.images && item.images.length ? item.images : (item.photo ? [item.photo] : []);
  const photo = photos[0];
  const posted = timeAgo(item.createdAt);
  const isFavorited = registeredUid ? favorites.some((f) => f.listingId === item.id) : false;

  async function toggleFavorite(e) {
    e.preventDefault();
    e.stopPropagation();
    if (favBusy) return;
    setFavBusy(true);
    try {
      const user = await requireRegistered();
      await setFavorite(user.uid, item, isFavorited);
    } catch {
      // Saving is a light-weight, retryable action from a card — if it
      // fails (offline, cancelled signup), the heart just stays as-is
      // rather than interrupting browsing with an error banner here.
    } finally {
      setFavBusy(false);
    }
  }

  return (
    <Link to={`/product/${item.id}`} className={boosted ? 'listing-card boost-card' : 'listing-card'}>
      <div className="thumb">
        {photo ? (
          <img className="thumb-img" src={photo} alt={item.title} loading="lazy" />
        ) : (
          <div className="thumb-placeholder" style={{ background: colorFor(item.id) }}>
            <Icon name="image" size={22} />
          </div>
        )}
        {boosted ? (
          <div className="badge-boost"><Icon name="trendingUp" size={12} /> Featured</div>
        ) : item.condition ? (
          <div className={`badge-condition tone-${conditionTone(item.condition)}`}>{item.condition}</div>
        ) : null}
      </div>
      <div className="card-footer">
        <button
          type="button"
          className={isFavorited ? 'footer-fav is-fav' : 'footer-fav'}
          onClick={toggleFavorite}
          disabled={favBusy}
          aria-label={isFavorited ? 'Remove from saved' : 'Save this listing'}
        >
          <Icon name="bookmark" size={15} {...(isFavorited ? { fill: 'currentColor' } : {})} />
        </button>
        {item.category && <div className="card-eyebrow">{item.category}</div>}
        <div className="card-price">{formatPrice(item.price)}<span>ETB</span></div>
        <div className="card-title">{item.title}</div>
        <div className="card-meta">
          {item.location && <span><Icon name="mapPin" size={11} /> {item.location}</span>}
          {posted && <span><Icon name="clock" size={11} /> {posted}</span>}
          {photos.length > 1 && <span><Icon name="camera" size={11} /> {photos.length}</span>}
        </div>
      </div>
    </Link>
  );
}
