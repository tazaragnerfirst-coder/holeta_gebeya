import React from 'react';
import ListingGrid from './ListingGrid.jsx';

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
    <ListingGrid
      items={Array.from({ length: count }, (_, i) => ({ id: i }))}
      renderItem={(item) => <ListingCardSkeleton key={item.id} />}
    />
  );
}

// Placeholder shaped like ChatList.jsx rows — shown while chats are
// still resolving, so the inbox never flashes an empty "no messages"
// state before real data (or the real empty state) arrives.
export function ChatListSkeleton({ count = 5 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div className="chat-list-item" key={i} style={{ pointerEvents: 'none' }}>
          <div className="chat-thumb avatar-circle skeleton-shimmer" />
          <div className="chat-info">
            <div className="top">
              <div className="skeleton-line skeleton-shimmer" style={{ width: '38%', height: 11 }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: 34, height: 9 }} />
            </div>
            <div className="skeleton-line skeleton-shimmer" style={{ width: '62%', height: 10, marginTop: 7 }} />
          </div>
        </div>
      ))}
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
