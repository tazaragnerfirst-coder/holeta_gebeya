import React from 'react';

// Placeholder shaped like ListingCard (Home.jsx) — shown while the
// listings query is in flight so the grid never looks empty/blank.
export function ListingCardSkeleton() {
  return (
    <div className="listing-card skeleton-card">
      <div className="thumb skeleton-shimmer" />
      <div className="card-body">
        <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: 13 }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '80%', height: 12, marginTop: 8 }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '55%', height: 10, marginTop: 8 }} />
      </div>
    </div>
  );
}

export function ListingGridSkeleton({ count = 6 }) {
  return (
    <div className="listing-grid">
      {Array.from({ length: count }).map((_, i) => <ListingCardSkeleton key={i} />)}
    </div>
  );
}

// Placeholder shaped like ProductDetail.jsx — shown while the single
// listing doc is being fetched.
export function ProductDetailSkeleton() {
  return (
    <div className="pd-page">
      <div className="carousel-wrap">
        <div className="carousel-slide skeleton-shimmer" style={{ height: 300 }} />
      </div>
      <div className="pd-body">
        <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: 22 }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '70%', height: 16, marginTop: 12 }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '45%', height: 12, marginTop: 12 }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: 60, marginTop: 20, borderRadius: 12 }} />
      </div>
    </div>
  );
}
