import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { fetchMoreListings, subscribeListings } from '../lib/listings';
import { subscribeFavorites } from '../lib/favorites';
import { rotate, shuffle } from '../lib/sessionFeedRotation';
import {
  ALL_CHIP_ID, JOB_CHIP_ID, clearRecentSearches, getRecentSearches, pushRecentSearch,
  searchListings, subscribeCategories,
} from '../lib/search';
import { homeCache } from '../lib/homeCache';
import { SearchBar, FilterModal } from '../components/SearchBar';
import ListingCard from '../components/ListingCard';
import PromoBannerCarousel from '../components/PromoBannerCarousel';
import { ListingGridSkeleton } from '../components/Skeleton';
import { getCachedHomeBanners, getHomeBanners } from '../lib/banners';
import Icon from '../components/Icon';
import { colors, font, radius } from '../theme';

const EMPTY_FILTERS = { minPrice: null, maxPrice: null, conditions: [] };

function isBoosted(item) {
  const until = item.boostedUntil;
  const ms = until && typeof until.toMillis === 'function' ? until.toMillis() : null;
  return !!ms && ms > Date.now();
}

const notJob = (l) => l.categoryType !== 'job';

// Web ListingGrid: job posts break out into one full-width row; everything
// else sits two per row. A lone trailing card keeps a normal half width
// (the row gets an empty spacer cell) instead of stretching across the row.
function buildRows(items) {
  const rows = [];
  let pair = [];
  const flush = () => {
    if (pair.length) rows.push({ key: pair.map((i) => i.id).join('|'), items: pair });
    pair = [];
  };
  for (const item of items) {
    if (item.categoryType === 'job') {
      flush();
      rows.push({ key: `job-${item.id}`, items: [item], full: true });
    } else {
      pair.push(item);
      if (pair.length === 2) flush();
    }
  }
  flush();
  return rows;
}

// Public listing feed with search, category chips and filters.
// Browsing needs no login. Mirrors frontend/src/pages/Home.jsx.
export default function HomeScreen({ onOpen }) {
  const uid = auth.currentUser?.uid;
  const [listings, setListings] = useState(homeCache.listings); // null = still loading
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [categories, setCategories] = useState(homeCache.categories);
  const [favorites, setFavorites] = useState([]);
  const [banners, setBanners] = useState(() => getCachedHomeBanners());

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(null); // null, a category id, or JOB_CHIP_ID
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState(null);

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recent, setRecent] = useState([]);

  // Pagination (web appData.jsx loadMoreListings: startAfter cursor).
  const lastDocRef = useRef(homeCache.lastDoc);
  const [hasMore, setHasMore] = useState(homeCache.hasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  // Feed order: shuffled once per screen visit, then frozen (web Home.jsx),
  // so scrolling doesn't reshuffle under the finger. Items that arrive later
  // (live posts, next pages) are shuffled among themselves and appended.
  const shuffledRef = useRef(homeCache.listings !== null);
  const [order, setOrder] = useState(() => (
    homeCache.listings ? shuffle(homeCache.listings.filter(notJob)).map((l) => l.id) : []
  )); // array of listing ids, display order

  const term = search.trim().toLowerCase();
  const filtering = Boolean(term || category || filters.minPrice != null || filters.maxPrice != null || filters.conditions.length > 0);
  const filterCount = (filters.minPrice != null ? 1 : 0) + (filters.maxPrice != null ? 1 : 0) + (filters.conditions.length > 0 ? 1 : 0);

  useEffect(() => {
    const unsub = subscribeListings((items, page) => {
      setListings((prev) => {
        // Merge by id (stable) instead of raw-replacing, so a first-page
        // onSnapshot update doesn't reshuffle already-rendered cards.
        let next;
        if (!prev) {
          next = items;
        } else {
          const byId = new Map(prev.map((l) => [l.id, l]));
          for (const it of items) byId.set(it.id, it);
          next = Array.from(byId.values());
        }
        homeCache.listings = next;
        return next;
      });
      if (page) {
        lastDocRef.current = page.lastDoc;
        homeCache.lastDoc = page.lastDoc;
        homeCache.hasMore = page.hasMore;
        setHasMore(page.hasMore);
      }
      setError(false);
    }, () => setError(true));
    return unsub;
  }, [reloadKey]);

  useEffect(() => {
    const unsub = subscribeCategories((data) => {
      homeCache.categories = data;
      setCategories(data);
    }, () => {});
    return unsub;
  }, []);

  useEffect(() => { getRecentSearches().then(setRecent); }, []);
  useEffect(() => { getHomeBanners().then(setBanners); }, []);

  useEffect(() => {
    if (!uid) { setFavorites([]); return undefined; }
    return subscribeFavorites(uid, setFavorites);
  }, [uid]);

  // First arrival is shuffled once; anything new after that is shuffled
  // among itself and appended after what's already showing.
  useEffect(() => {
    if (!listings) return;
    const nonJob = listings.filter(notJob);
    if (!shuffledRef.current) {
      shuffledRef.current = true;
      setOrder(shuffle(nonJob).map((l) => l.id));
      return;
    }
    setOrder((prev) => {
      const seen = new Set(prev);
      const fresh = nonJob.filter((l) => !seen.has(l.id));
      return fresh.length ? [...prev, ...shuffle(fresh).map((l) => l.id)] : prev;
    });
  }, [listings]);

  async function loadMore() {
    if (loadingMore || !hasMore || !lastDocRef.current || filtering) return;
    setLoadingMore(true);
    try {
      const page = await fetchMoreListings(lastDocRef.current);
      lastDocRef.current = page.lastDoc;
      homeCache.lastDoc = page.lastDoc;
      homeCache.hasMore = page.hasMore;
      setHasMore(page.hasMore);
      setListings((prev) => {
        const byId = new Map((prev || []).map((l) => [l.id, l]));
        for (const it of page.items) byId.set(it.id, it);
        const next = Array.from(byId.values());
        homeCache.listings = next;
        return next;
      });
    } catch {
      // Silent — next scroll attempt retries.
    } finally {
      setLoadingMore(false);
    }
  }

  // Server-side search (text debounced; chips and filters run right away).
  useEffect(() => {
    if (!filtering) { setSearchLoading(false); return undefined; }
    let cancelled = false;
    const t = setTimeout(() => {
      setSearchLoading(true);
      searchListings({
        term,
        categoryId: term ? null : (category === JOB_CHIP_ID ? null : category),
        categoryType: term ? null : (category === JOB_CHIP_ID ? 'job' : null),
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        conditions: filters.conditions,
      })
        .then((res) => { if (!cancelled) setSearchResults(res); })
        .catch(() => { if (!cancelled) setSearchResults([]); })
        .finally(() => { if (!cancelled) setSearchLoading(false); });
    }, term ? 300 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [filtering, term, category, filters]);

  const byId = useMemo(() => new Map((listings || []).map((l) => [l.id, l])), [listings]);
  const boosted = useMemo(() => (listings || []).filter(isBoosted), [listings]);
  const boostedIds = useMemo(() => new Set(boosted.map((b) => b.id)), [boosted]);

  const feed = useMemo(() => {
    const ordered = order.map((id) => byId.get(id)).filter(Boolean);
    return rotate(ordered, boostedIds);
  }, [order, byId, boostedIds]);

  const displayed = filtering ? searchResults : feed;
  const rows = useMemo(() => buildRows(displayed), [displayed]);

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
    for (const l of [...boosted, ...(listings || [])]) {
      const title = l.title?.trim();
      if (title && !seen.has(title)) {
        seen.add(title);
        out.push(title);
      }
      if (out.length >= 6) break;
    }
    return out;
  }, [listings, boosted]);

  const chips = useMemo(() => [
    { id: ALL_CHIP_ID, name: 'All', icon: 'grid' },
    { id: JOB_CHIP_ID, name: 'Job', icon: 'briefcase' },
    ...categories,
  ], [categories]);

  async function commitSearch(t) {
    setSearch(t);
    setRecent(await pushRecentSearch(t));
  }

  async function handleClearRecent() {
    await clearRecentSearches();
    setRecent([]);
  }

  function clearAll() {
    setSearch('');
    setCategory(null);
    setFilters(EMPTY_FILTERS);
  }

  function pickChip(id) {
    if (id === ALL_CHIP_ID) setCategory(null);
    else setCategory(category === id ? null : id);
  }

  function handleToggleFavorite() {
    // subscribeFavorites keeps `favorites` live; nothing else to do here.
  }

  function refresh() {
    setError(false);
    setReloadKey((k) => k + 1);
  }

  // Listings exist but the feed order hasn't been computed yet (one render
  // after the first snapshot) — still loading, not "No listings yet".
  const feedPending = !filtering && listings !== null && listings.some(notJob) && order.length === 0;
  const initialLoading = (listings === null && !error) || feedPending;
  const feedFailed = !filtering && error && displayed.length === 0;

  function renderCard(item) {
    return (
      <ListingCard
        item={item}
        onPress={() => onOpen && onOpen(item)}
        boosted={boostedIds.has(item.id)}
        favorited={favorites.some((f) => f.listingId === item.id)}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  }

  function renderRow(row) {
    if (row.full) return <View style={styles.rowFull}>{renderCard(row.items[0])}</View>;
    return (
      <View style={styles.row}>
        {row.items.map((it) => <View key={it.id} style={styles.cell}>{renderCard(it)}</View>)}
        {row.items.length === 1 ? <View style={styles.cell} /> : null}
      </View>
    );
  }

  const header = (
    <View>
      <SearchBar
        value={search}
        onChange={setSearch}
        onSubmit={commitSearch}
        suggestions={suggestions}
        recent={recent}
        popularTags={popularTags}
        onClearRecent={handleClearRecent}
        filterCount={filterCount}
        onOpenFilters={(top) => { setFilterAnchor(top ?? null); setFilterOpen(true); }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {chips.map((c) => {
          const active = c.id === ALL_CHIP_ID ? !category : category === c.id;
          return (
            <Pressable key={c.id} onPress={() => pickChip(c.id)} style={[styles.chip, active && styles.chipActive]}>
              {c.icon ? <Icon name={c.icon} size={14} color={active ? colors.tgActiveInk : colors.inkSoft} /> : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {filtering && searchLoading ? <ActivityIndicator style={styles.inlineLoad} color={colors.primary} /> : null}
      {feedFailed ? (
        <View style={styles.stateBox}>
          <View style={styles.stateIcon}>
            <Icon name="wifiOff" size={30} color={colors.inkFaint} />
          </View>
          <Text style={styles.stateTitle}>Couldn't load listings</Text>
          <Text style={styles.stateSub}>Check your connection and try again.</Text>
          <Pressable onPress={refresh}>
            <Text style={styles.link}>Refresh</Text>
          </Pressable>
        </View>
      ) : null}
      {!filtering && banners.length > 0 ? <PromoBannerCarousel banners={banners} /> : null}
      {!filtering && boosted.length > 0 ? (
        <>
          <View style={styles.sectionTitle}>
            <Icon name="trendingUp" size={16} color={colors.ink} />
            <Text style={styles.sectionTitleText}>Featured</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boostScroll}>
            {boosted.map((item) => (
              <View key={item.id} style={styles.boostCard}>
                <ListingCard
                  item={item}
                  boosted
                  onPress={() => onOpen && onOpen(item)}
                  favorited={favorites.some((f) => f.listingId === item.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}
      {!filtering ? (
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Recent Listings</Text>
        </View>
      ) : filtering && displayed.length > 0 ? (
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Results</Text>
        </View>
      ) : null}
    </View>
  );

  // Web #hog012: a dead-end zero-result screen still leaves other listings to
  // browse — reuses the already-loaded feed, no extra query.
  const alsoLike = buildRows(feed.slice(0, 8));

  const emptyState = initialLoading ? <ListingGridSkeleton /> : filtering && searchLoading ? null : filtering ? (
    <View>
      <View style={styles.emptyBox}>
        <View style={styles.stateIcon}>
          <Icon name="frown" size={30} color={colors.inkFaint} />
        </View>
        <Text style={styles.stateTitle}>No items found</Text>
        <Text style={styles.stateSub}>
          {term ? `Nothing matched "${term}". Try a different keyword.` : 'Try adjusting your filters.'}
        </Text>
        {popularTags.length > 0 ? (
          <View style={styles.emptyTags}>
            {popularTags.slice(0, 4).map((s) => (
              <Pressable key={s} onPress={() => setSearch(s)} style={styles.tagAccent}>
                <Icon name="trendingUp" size={12} color={colors.accentDark} />
                <Text style={styles.tagAccentText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable onPress={clearAll}>
          <Text style={styles.link}>Clear search & filters</Text>
        </Pressable>
      </View>
      {alsoLike.length > 0 ? (
        <>
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>You might also like</Text>
          </View>
          {alsoLike.map((row) => <View key={row.key}>{renderRow(row)}</View>)}
        </>
      ) : null}
    </View>
  ) : !error ? (
    <View style={styles.emptyBox}>
      <Text style={styles.muted}>No listings yet.</Text>
    </View>
  ) : null;

  return (
    <View style={styles.flex}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.6}
        onEndReached={loadMore}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator style={styles.inlineLoad} color={colors.primary} />
        ) : null}
        ListEmptyComponent={emptyState}
        renderItem={({ item: row }) => renderRow(row)}
      />
      <FilterModal
        visible={filterOpen}
        anchorTop={filterAnchor}
        filters={filters}
        onApply={setFilters}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  muted: { fontFamily: font.family, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
  emptyBox: { paddingTop: 44, paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center' },
  emptyTags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
  tagAccent: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: radius.pill, backgroundColor: colors.accentTint,
  },
  tagAccentText: { fontFamily: font.familySemiBold, fontSize: 12.5, color: colors.accentDark },
  inlineLoad: { marginVertical: 12 },
  stateBox: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  stateIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceSunken,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  stateTitle: { fontFamily: font.familyExtraBold, fontSize: 15, color: colors.ink },
  stateSub: {
    marginTop: 5, fontFamily: font.family, fontSize: 12.5, color: colors.inkFaint,
    textAlign: 'center', lineHeight: 19, maxWidth: 260,
  },
  link: { marginTop: 14, fontFamily: font.familyBold, fontSize: 12, color: colors.primary },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 10, marginHorizontal: 16 },
  sectionTitleText: { fontFamily: font.familyBold, fontSize: 15, color: colors.ink },
  boostScroll: { gap: 11, paddingBottom: 4, paddingHorizontal: 16 },
  boostCard: { width: 152 },
  // One segmented pill (web .cat-chip-row): tgBar track, active = tgActive.
  chipScroll: { flexGrow: 0, marginTop: 14, marginHorizontal: 16, backgroundColor: colors.tgBar, borderRadius: radius.pill },
  chipRow: { gap: 2, padding: 5, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill },
  chipActive: { backgroundColor: colors.tgActive },
  chipText: { fontFamily: font.familyBold, fontSize: 13.5, color: colors.inkSoft },
  chipTextActive: { color: colors.tgActiveInk },
  // Web .listing-grid: 6px edge margin, 6px gap both ways. `cell` is flex:1
  // so two fill the row and a lone card keeps half width via a spacer cell;
  // `rowFull` is the web .listing-grid-full job row.
  list: { paddingHorizontal: 0, paddingTop: 14, paddingBottom: 100 },
  row: { flexDirection: 'row', gap: 6, paddingHorizontal: 6, marginBottom: 6 },
  rowFull: { paddingHorizontal: 6, marginBottom: 6 },
  cell: { flex: 1 },
});
