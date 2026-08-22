import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

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
  const photos = item.images && item.images.length ? item.images : (item.photo ? [item.photo] : []);
  const photo = photos[0];
  const posted = timeAgo(item.createdAt);

  return (
    <Link to={`/product/${item.id}`} className={boosted ? 'listing-card boost-card' : 'listing-card'}>
      <div className="thumb">
        {photo ? (
          <>
            <div className="thumb-backdrop" style={{ backgroundImage: `url(${photo})` }} />
            <img className="thumb-img" src={photo} alt={item.title} loading="lazy" />
          </>
        ) : (
          <div className="thumb-placeholder" style={{ background: colorFor(item.id) }}>
            <Icon name="image" size={22} />
          </div>
        )}
        {boosted && <div className="badge-boost"><Icon name="trendingUp" size={12} /> Featured</div>}
        {photos.length > 1 && (
          <div className="badge-count"><Icon name="camera" size={11} /> {photos.length}</div>
        )}
      </div>
      <div className="card-body">
        <div className="card-price-row">
          <div className="card-price">{item.price}<span>ETB</span></div>
          {item.condition && <div className="card-condition">{item.condition}</div>}
        </div>
        <div className="card-title">{item.title}</div>
        <div className="card-meta">
          {item.location && <span><Icon name="mapPin" size={11} /> {item.location}</span>}
          {posted && <span><Icon name="clock" size={11} /> {posted}</span>}
        </div>
      </div>
    </Link>
  );
}
