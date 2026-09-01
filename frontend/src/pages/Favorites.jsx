import React from 'react';
import Icon from '../components/Icon.jsx';
import ListingCard from '../components/ListingCard.jsx';
import ListingGrid from '../components/ListingGrid.jsx';
import { useAppData } from '../lib/appData';

export default function Favorites() {
  const { favorites, favoritesReady } = useAppData();

  return (
    <div className="page">
      <h2 className="page-title">Favorites</h2>

      {!favoritesReady && <p className="helper-text">Loading...</p>}

      {favoritesReady && favorites.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="bookmark" size={26} /></div>
          <div className="empty-state-title">No favorites yet</div>
          <div className="empty-state-sub">Tap the bookmark on any listing to save it here.</div>
        </div>
      )}

      {favorites.length > 0 && (
        <ListingGrid
          items={favorites}
          renderItem={(f) => (
            <ListingCard key={f.id} item={{ id: f.listingId, title: f.title, price: f.price, priceType: f.priceType, photo: f.photo, location: f.location, condition: f.condition }} />
          )}
        />
      )}
    </div>
  );
}
