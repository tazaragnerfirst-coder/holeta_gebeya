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
import { recordImpressions, rotate } from '../lib/sessionFeedRotation';

const EMPTY_FILTERS = { minPrice: null, maxPrice: null, conditions: [] };
// Not a real category doc — a synthetic chip id for filtering to job
// posts specifically (they have no real category, see #hog009), kept
// distinct from any real Firestore category id.
const JOB_CHIP_ID = '__job__';

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
        categoryId: activeCategory === JOB_CHIP_ID ? null : activeCategory,
        categoryType: activeCategory === JOB_CHIP_ID ? 'job' : null,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        conditions: filters.conditions,
      });
    }, term ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtering, term, activeCategory, filters]);

  // #hog003: light session-only rotation so the same un-boosted
  // listings don't sit at the front on every refresh. Boosted
  // listings are exempt (see sessionFeedRotation.js). No extra
  // Firestore reads — this only reorders what's already loaded.
  // Job posts are excluded from the default feed entirely — they
  // only show up when the Job chip is tapped (see categoryChips
  // below) — since they don't belong to a browsable category the
  // way product/service listings do.
  const boostedIds = useMemo(() => new Set(boosted.map((l) => l.id)), [boosted]);
  const rotatedListings = useMemo(
    () => (filtering ? listings : rotate(listings.filter((l) => l.categoryType !== 'job'), boostedIds)),
    [listings, filtering, boostedIds]
  );

  const displayed = filtering ? searchResults : rotatedListings;
  const loading = filtering ? (searchLoading && searchResults.length === 0) : !listingsReady;

  // Records an impression for whichever listings are currently at the
  // front of the feed, but only after they've actually been on screen
  // for a moment — skips a fast flick-through, matches the same dwell
  // pattern ProductDetail.jsx uses for view counting. Session-only,
  // never persisted (see sessionFeedRotation.js).
  useEffect(() => {
    if (filtering || rotatedListings.length === 0) return;
    const ids = rotatedListings.slice(0, 12).map((l) => l.id);
    const t = setTimeout(() => recordImpressions(ids), 2000);
    return () => clearTimeout(t);
  }, [rotatedListings, filtering]);

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
  // The Job chip sits alongside real categories but isn't one — job
  // posts have no category of their own (#hog009), so this is the
  // only way to filter to them from Home.
  const categoryChips = useMemo(() => [{ id: JOB_CHIP_ID, name: 'Job', icon: 'briefcase' }, ...categories], [categories]);

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
          categories={categoryChips}
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
