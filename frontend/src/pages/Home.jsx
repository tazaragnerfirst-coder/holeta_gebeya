import React, { useMemo, useState, useRef, useEffect } from 'react';
import { CATEGORIES } from '../data/categories';
import Icon from '../components/Icon.jsx';
import SearchHeader from '../components/SearchHeader.jsx';
import FilterSheet from '../components/FilterSheet.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ListingCard from '../components/ListingCard.jsx';
import { ListingGridSkeleton } from '../components/Skeletons.jsx';
import PromoBannerCarousel from '../components/PromoBannerCarousel.jsx';
import { useAppData } from '../lib/appData';
import { getHomeBanners, getCachedHomeBanners } from '../lib/homeBanners';

const EMPTY_FILTERS = { minPrice: null, maxPrice: null, conditions: [] };

export default function Home() {
  const { listings, listingsReady } = useAppData();
  const loading = !listingsReady;
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const headerWrapRef = useRef(null);
  const [filterAnchorTop, setFilterAnchorTop] = useState(null);
  const [banners, setBanners] = useState(() => getCachedHomeBanners());

  useEffect(() => { getHomeBanners().then(setBanners); }, []);

  // Measures the real, rendered bottom edge of the search bar at the
  // moment it's tapped, so the dropdown lands exactly under it —
  // no guessed pixel offset that could drift and overlap other
  // content depending on screen size / notch / status bar height.
  function openFilters() {
    const bar = headerWrapRef.current?.querySelector('.search-bar');
    if (bar) setFilterAnchorTop(Math.round(bar.getBoundingClientRect().bottom + 8));
    setFilterSheetOpen(true);
  }

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
      <div ref={headerWrapRef}>
        <SearchHeader
          value={search}
          onChange={setSearch}
          onSubmit={() => {}}
          suggestions={suggestions}
          popularTags={popularTags}
          categories={CATEGORIES}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onOpenFilters={openFilters}
          activeFilterCount={activeFilterCount}
          onSearchFocus={() => setFilterSheetOpen(false)}
        />
      </div>

      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filters={filters}
        onApply={setFilters}
        anchorTop={filterAnchorTop}
      />

      {!filtering && banners.length > 0 && <PromoBannerCarousel banners={banners} />}

      {!filtering && boosted.length > 0 && (
        <>
          <h3 className="section-title"><Icon name="trendingUp" size={16} /> Featured</h3>
          <div className="boost-scroll">
            {boosted.map((item) => <ListingCard key={item.id} item={item} boosted />)}
          </div>
        </>
      )}

      <h3 className="section-title">{filtering ? 'Results' : 'Recent Listings'}</h3>

      {loading && <ListingGridSkeleton />}

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

      {!loading && filtered.length > 0 && (
        <div className="listing-grid">
          {filtered.map((item) => <ListingCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
