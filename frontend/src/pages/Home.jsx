import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  const {
    categories, listings, listingsReady, hasMoreListings, loadingMoreListings, loadMoreListings,
    searchResults, searchLoading, searchListings,
  } = useAppData();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const headerWrapRef = useRef(null);
  const [filterAnchorTop, setFilterAnchorTop] = useState(null);
  const [banners, setBanners] = useState(() => getCachedHomeBanners());

  useEffect(() => { getHomeBanners().then(setBanners); }, []);

  const boosted = listings.filter((l) => l.boostedUntil && l.boostedUntil.toDate?.() > new Date());
  const term = search.trim().toLowerCase();
  const filtering = Boolean(term || activeCategory || filters.minPrice != null || filters.maxPrice != null || filters.conditions.length > 0);

  // Fires loadMoreListings() while the sentinel is still well below
  // the screen (rootMargin) — before the person has actually
  // scrolled to the bottom — so the next page has usually already
  // landed by the time they get there instead of them hitting a
  // visible wait. Only runs for the default (unfiltered) feed —
  // while filtering, results come from the one-off server-side
  // search below instead (#hog002), which isn't paginated the same way.
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!hasMoreListings || filtering) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreListings(); },
      { rootMargin: '800px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreListings, loadMoreListings, filtering]);

  // Measures the real, rendered bottom edge of the search bar at the
  // moment it's tapped, so the dropdown lands exactly under it —
  // no guessed pixel offset that could drift and overlap other
  // content depending on screen size / notch / status bar height.
  function openFilters() {
    const bar = headerWrapRef.current?.querySelector('.search-bar');
    if (bar) setFilterAnchorTop(Math.round(bar.getBoundingClientRect().bottom + 8));
    setFilterSheetOpen(true);
  }

  // Server-side search/filter (#hog002) over the FULL listings
  // collection, not just whichever pages have been scrolled into
  // above. Only the text term needs debouncing (fires on every
  // keystroke); category/price/condition come from a deliberate
  // discrete action (tapping a chip, applying the filter sheet) and
  // can re-query right away.
  useEffect(() => {
    if (!filtering) return;
    const t = setTimeout(() => {
      searchListings({
        term,
        categoryId: activeCategory,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        conditions: filters.conditions,
      });
    }, term ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtering, term, activeCategory, filters]);

  const displayed = filtering ? searchResults : listings;
  const loading = filtering ? (searchLoading && searchResults.length === 0) : !listingsReady;

  // While a term's typed, suggestions come from the same full-
  // collection search results above (accurate beyond just the
  // currently-loaded page) rather than a separate lookup.
  const suggestions = useMemo(() => {
    if (!term) return [];
    const seen = new Set();
    const out = [];
    for (const l of searchResults) {
      const title = l.title?.trim();
      if (title && title.toLowerCase().includes(term) && !seen.has(title)) {
        seen.add(title);
        out.push(title);
      }
    }
    return out;
  }, [searchResults, term]);

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
          categories={categories}
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

      {!loading && displayed.length === 0 && (
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

      {!loading && displayed.length > 0 && (
        <div className="listing-grid">
          {displayed.map((item) => <ListingCard key={item.id} item={item} />)}
        </div>
      )}

      {/* Invisible trigger for the prefetch-ahead described above —
          rootMargin means loadMoreListings() fires while this is
          still hundreds of px offscreen, not once it's actually
          visible. Hidden while filtering — that's a self-contained
          server-side search result set, not a paginated feed. */}
      {!loading && !filtering && hasMoreListings && <div ref={sentinelRef} style={{ height: 1 }} />}
      {!filtering && loadingMoreListings && <p className="helper-text" style={{ textAlign: 'center' }}>Loading more…</p>}
    </div>
  );
}
