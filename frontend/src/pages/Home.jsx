import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES } from '../data/categories';
import Icon from '../components/Icon.jsx';

const SWATCHES = ['#8FA998', '#C9A15A', '#A9876B', '#8A9BAE', '#B0836D', '#7E9E8C', '#B79A6B', '#93A0AE'];
function colorFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % SWATCHES.length;
  return SWATCHES[h];
}

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Public read — no auth required. See firestore.rules.
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(30));
    getDocs(q)
      .then((snap) => setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false));
  }, []);

  const boosted = listings.filter((l) => l.boostedUntil && l.boostedUntil.toDate?.() > new Date());

  return (
    <div className="page">
      <div className="search-bar">
        <Icon name="search" size={17} style={{ color: 'var(--ink-faint)' }} />
        <input placeholder="Search — e.g. iPhone, sofa, Vitz..." />
      </div>

      <div className="chip-row">
        <div className="chip active"><Icon name="mapPin" size={14} /> Holeta</div>
        <div className="chip">All prices</div>
        <div className="chip">Newest</div>
      </div>

      <h3 className="section-title">Categories</h3>
      <div className="cat-grid">
        {CATEGORIES.map((c) => (
          <div className="cat-item" key={c.id}>
            <div className="cat-icon"><Icon name={c.icon || 'grid'} size={19} /></div>
            <span>{c.name}</span>
          </div>
        ))}
      </div>

      {boosted.length > 0 && (
        <>
          <h3 className="section-title"><Icon name="trendingUp" size={16} /> Featured</h3>
          <div className="boost-scroll">
            {boosted.map((item) => <ListingCard key={item.id} item={item} boosted />)}
          </div>
        </>
      )}

      <h3 className="section-title">Recent Listings</h3>
      {loading && <p className="helper-text">Loading...</p>}
      {!loading && listings.length === 0 && (
        <p className="helper-text">No listings yet — be the first to post one.</p>
      )}
      <div className="listing-grid">
        {listings.map((item) => <ListingCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}

function ListingCard({ item, boosted }) {
  const photo = item.images && item.images[0];
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
