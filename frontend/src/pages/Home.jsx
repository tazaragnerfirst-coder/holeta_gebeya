import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES } from '../data/categories';

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
        <input placeholder="Search — e.g. iPhone, sofa, Vitz..." />
      </div>

      <h3 className="section-title">Categories</h3>
      <div className="cat-grid">
        {CATEGORIES.map((c) => (
          <div className="cat-item" key={c.id}>{c.name}</div>
        ))}
      </div>

      {boosted.length > 0 && (
        <>
          <h3 className="section-title">Featured</h3>
          <div className="boost-scroll">
            {boosted.map((item) => <ListingCard key={item.id} item={item} />)}
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

function ListingCard({ item }) {
  const photo = item.images && item.images[0];
  return (
    <Link to={`/product/${item.id}`} className="listing-card">
      <div className="thumb" style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: item.color || '#8FA998' }} />
      <div className="card-body">
        <div className="card-price">{item.price} ETB</div>
        <div className="card-title">{item.title}</div>
        <div className="card-meta">{item.location} · {item.condition}</div>
      </div>
    </Link>
  );
}
