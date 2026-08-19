import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

const SWATCHES = ['#8FA998', '#C9A15A', '#A9876B', '#8A9BAE', '#B0836D', '#7E9E8C', '#B79A6B', '#93A0AE'];
function colorFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % SWATCHES.length;
  return SWATCHES[h];
}

export default function ListingCard({ item, boosted }) {
  const photo = item.images ? item.images[0] : item.photo;
  const bg = photo
    ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: colorFor(item.id) };
  return (
    <Link to={`/product/${item.id}`} className={boosted ? 'listing-card boost-card' : 'listing-card'}>
      <div className="thumb" style={bg}>
        {!photo && <div className="thumb-placeholder"><Icon name="image" size={22} /></div>}
        {boosted && <div className="badge-boost"><Icon name="trendingUp" size={12} /> Featured</div>}
      </div>
      <div className="card-body">
        <div className="card-price">{item.price} ETB</div>
        <div className="card-title">{item.title}</div>
        <div className="card-meta"><Icon name="mapPin" size={12} /> {item.location} · {item.condition}</div>
      </div>
    </Link>
  );
}
