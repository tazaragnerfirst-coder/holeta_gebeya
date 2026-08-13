import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES } from '../data/categories';
import Icon from '../components/Icon.jsx';
import SearchHeader from '../components/SearchHeader.jsx';
import FilterSheet from '../components/FilterSheet.jsx';
import EmptyState from '../components/EmptyState.jsx';

const SWATCHES = ['#8FA998', '#C9A15A', '#A9876B', '#8A9BAE', '#B0836D', '#7E9E8C', '#B79A6B', '#93A0AE'];
function colorFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % SWATCHES.length;
  return SWATCHES[h];
}

const EMPTY_FILTERS = { minPrice: null, maxPrice: null, conditions: [] };

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(30));
    getDocs(q)
      .then((snap) => setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false));
  }, []);

  const boosted = listings.filter((l) => l.boostedUntil && l.boostedUntil.toDate?.() > new Date());

  const term = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const matchesTerm = !term || l.title?.toLowerCase().includes(term);
      const matchesCategory = !activeCategory || l.category === activeCategory;
      const matchesMin = filters.minPrice == null || (l.price || 0) >= filters.minPrice;
      const matchesMax = filters.maxPrice == null || (l.price || 0) <= filters.maxPrice;
      const matchesCondition = filters.conditions.length === 0 || filters.conditions.includes(l.condition);
      return matchesTerm && matchesCategory && matchesMin && matchesMax && matchesCondition;
    });
  }, [listings, term, activeCategory, filters]);

  const suggestions = useMemo(() => {
    if (!term) return [];
    const seen = new Set();
    const out = [];
    for (const l of listings) {
      const title = l.title?.trim();
      if (title && title.toLowerCase().includes(term) && !seen.has(title)) {
        seen.add(title);
        out.push(title);
      }
    }
    return out;
  }, [listings, term]);

  const popularTags = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const l of [...boosted, ...listings]) {
      const title = l.title?.trim();
      if (title && !seen.has(title)) {
        seen.add(title);
        out.push(title);
      }
      if (out.length >= 6) break;
    }
    return out;
  }, [listings, boosted]);

  const filtering = Boolean(term || activeCategory || filters.minPrice != null || filters.maxPrice != null || filters.conditions.length > 0);
  const activeFilterCount = (filters.minPrice != null ? 1 : 0) + (filters.maxPrice != null ? 1 : 0) + (filters.conditions.length > 0 ? 1 : 0);

  function clearAll() {
    setSearch('');
    setActiveCategory(null);
    setFilters(EMPTY_FILTERS);
  }

  return (
    <div className="page">
      <SearchHeader
        value={search}
        onChange={setSearch}
        onSubmit={() => {}}
        suggestions={suggestions}
        popularTags={popularTags}
        categories={CATEGORIES}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onOpenFilters={() => setFilterSheetOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filters={filters}
        onApply={setFilters}
      />

      {!filtering && boosted.length > 0 && (
        <>
          <h3 className="section-title"><Icon name="trendingUp" size={16} /> Featured</h3>
          <div className="boost-scroll">
            {boosted.map((item) => <ListingCard key={item.id} item={item} boosted />)}
          </div>
        </>
      )}

      <h3 className="section-title">{filtering ? 'Results' : 'Recent Listings'}</h3>
      {loading && <p className="helper-text">Loading...</p>}

      {!loading && filtered.length === 0 && (
        filtering ? (
          <EmptyState
            term={search.trim()}
            suggestions={popularTags.slice(0, 4)}
            onSuggestionClick={(s) => setSearch(s)}
            onClear={clearAll}
          />
        ) : (
          <p className="helper-text">No listings yet — be the first to post one.</p>
        )
      )}

      <div className="listing-grid">
        {filtered.map((item) => <ListingCard key={item.id} item={item} />)}
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
