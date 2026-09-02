import React, { useMemo, useState, useRef, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import SearchHeader from '../components/SearchHeader.jsx';
import FilterSheet from '../components/FilterSheet.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ListingCard from '../components/ListingCard.jsx';
import ListingGrid from '../components/ListingGrid.jsx';
import { ListingGridSkeleton } from '../components/Skeletons.jsx';
import PromoBannerCarousel from '../components/PromoBannerCarousel.jsx';
import { useAppData } from '../lib/appData';
import { getHomeBanners, getCachedHomeBanners } from '../lib/homeBanners';
import { recordImpressions, rotate, shuffle } from '../lib/sessionFeedRotation';

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
  // #hog011: distinguishes a genuinely empty feed from a connection
  // drop, so the empty state can say the right thing instead of
  // always defaulting to "nothing posted yet".
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => { getHomeBanners().then(setBanners); }, []);

  useEffect(() => {
    function goOnline() { setIsOnline(true); }
    function goOffline() { setIsOnline(false); }
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

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

  // #hog003 (extended): feed order is session-random, not fixed —
  // Taza wants a different mix each time the app opens (TikTok-style
  // discovery), not the same documentId() order every time. Shuffled
  // once per page view (frozen after, so scrolling never jitters —
  // see the stability notes above), and again for each newly-loaded
  // batch (live arrivals or loadMoreListings pages) so pagination
  // keeps feeling freshly discovered rather than DB-order predictable.
  // Boosted listings are exempt from the overexposure sink below
  // (see sessionFeedRotation.js) but not from the shuffle itself.
  const boostedIds = useMemo(() => new Set(boosted.map((l) => l.id)), [boosted]);
  const rotationDone = useRef(false);
  const [rotatedListings, setRotatedListings] = useState([]);
  useEffect(() => {
    if (filtering) return;
    const nonJob = listings.filter((l) => l.categoryType !== 'job');
    if (!rotationDone.current) {
      if (!listingsReady) return;
      rotationDone.current = true;
      setRotatedListings(rotate(shuffle(nonJob), boostedIds));
      return;
    }
    setRotatedListings((prev) => {
      const byId = new Map(nonJob.map((l) => [l.id, l]));
      const prevIds = new Set(prev.map((l) => l.id));
      const merged = prev.map((item) => byId.get(item.id) || item);
      const newOnes = nonJob.filter((item) => !prevIds.has(item.id));
      merged.push(...shuffle(newOnes));
      return merged;
    });
  }, [listings, filtering, listingsReady, boostedIds]);

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
          <>
            <EmptyState
              term={search.trim()}
              suggestions={popularTags.slice(0, 4)}
              onSuggestionClick={(s) => setSearch(s)}
              onClear={clearAll}
            />
            {/* #hog012: a dead-end zero-result screen still leaves
                other listings to browse — surface some instead of
                just tag suggestions. Reuses the already-loaded feed,
                no extra query. */}
            {rotatedListings.length > 0 && (
              <>
                <h3 className="section-title" style={{ marginTop: 18 }}>You might also like</h3>
                <ListingGrid items={rotatedListings.slice(0, 8)} renderItem={(item) => <ListingCard key={item.id} item={item} />} />
              </>
            )}
          </>
        ) : !isOnline ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Icon name="wifiOff" size={30} /></div>
            <div className="empty-state-title">You're offline</div>
            <div className="empty-state-sub">Check your connection and try again.</div>
            <button type="button" className="link-btn" style={{ marginTop: 14 }} onClick={() => window.location.reload()}>Refresh</button>
          </div>
        ) : (
          <p className="helper-text">No listings yet — be the first to post one.</p>
        )
      )}

      {!loading && displayed.length > 0 && (
        <ListingGrid items={displayed} renderItem={(item) => <ListingCard key={item.id} item={item} />} />
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
