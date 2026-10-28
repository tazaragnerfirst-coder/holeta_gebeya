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
import { SearchBar, FilterModal } from '../components/SearchBar';
import ListingCard from '../components/ListingCard';
import Icon from '../components/Icon';
import { colors, font, radius } from '../theme';

const EMPTY_FILTERS = { minPrice: null, maxPrice: null, conditions: [] };

function isBoosted(item) {
  const until = item.boostedUntil;
  const ms = until && typeof until.toMillis === 'function' ? until.toMillis() : null;
  return !!ms && ms > Date.now();
}

// Public listing feed with search, category chips and filters.
// Browsing needs no login. Mirrors frontend/src/pages/Home.jsx.
export default function HomeScreen({ onOpen }) {
  const uid = auth.currentUser?.uid;
  const [listings, setListings] = useState(null); // null = still loading
  const [error, setError] = useState(false);
  const [categories, setCategories] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(null); // null, a category id, or JOB_CHIP_ID
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recent, setRecent] = useState([]);

  // Pagination (web appData.jsx loadMoreListings: startAfter cursor).
  const lastDocRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Feed order: shuffled once on first load, then frozen for this screen
  // session (web Home.jsx), so scrolling doesn't reshuffle under the finger.
  const shuffledRef = useRef(false);
  const [order, setOrder] = useState([]); // array of listing ids, display order

  const term = search.trim().toLowerCase();
  const filtering = Boolean(term || category || filters.minPrice != null || filters.maxPrice != null || filters.conditions.length > 0);
  const filterCount = (filters.minPrice != null ? 1 : 0) + (filters.maxPrice != null ? 1 : 0) + (filters.conditions.length > 0 ? 1 : 0);

  useEffect(() => {
    const unsub = subscribeListings((items, page) => {
      setListings((prev) => {
        // Merge by id (stable) instead of raw-replacing, so a first-page
        // onSnapshot update doesn't reshuffle already-rendered cards.
        if (!prev) return items;
        const byId = new Map(prev.map((l) => [l.id, l]));
        for (const it of items) byId.set(it.id, it);
        return Array.from(byId.values());
      });
      if (page) {
        lastDocRef.current = page.lastDoc;
        setHasMore(page.hasMore);
      }
    }, () => setError(true));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeCategories(setCategories, () => {});
    return unsub;
  }, []);

  useEffect(() => { getRecentSearches().then(setRecent); }, []);

  useEffect(() => {
    if (!uid) { setFavorites([]); return undefined; }
    return subscribeFavorites(uid, setFavorites);
  }, [uid]);

  // Shuffle once per screen session, as soon as listings first arrive.
  useEffect(() => {
    if (!listings || shuffledRef.current) return;
    shuffledRef.current = true;
    setOrder(shuffle(listings.filter((l) => l.categoryType !== 'job')).map((l) => l.id));
  }, [listings]);

  async function loadMore() {
    if (loadingMore || !hasMore || !lastDocRef.current || filtering) return;
    setLoadingMore(true);
    try {
      const page = await fetchMoreListings(lastDocRef.current);
      lastDocRef.current = page.lastDoc;
      setHasMore(page.hasMore);
      setListings((prev) => {
        const byId = new Map((prev || []).map((l) => [l.id, l]));
        for (const it of page.items) byId.set(it.id, it);
        return Array.from(byId.values());
      });
      setOrder((prev) => [...prev, ...page.items.filter((i) => i.categoryType !== 'job').map((i) => i.id)]);
    } catch {
      // Silent — next scroll attempt retries.
    } finally {
      setLoadingMore(false);
    }
  }

  // Server-side search (text debounced; chips and filters run right away).
  useEffect(() => {
    if (!filtering) return;
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

  if (listings === null && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        onOpenFilters={() => setFilterOpen(true)}
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
      {!filtering && error ? (
        <View style={styles.stateBox}>
          <View style={styles.stateIcon}>
            <Icon name="wifiOff" size={30} color={colors.inkFaint} />
          </View>
          <Text style={styles.stateTitle}>Couldn't load listings</Text>
          <Text style={styles.stateSub}>Check your connection and try again.</Text>
          <Pressable onPress={() => setError(false)}>
            <Text style={styles.link}>Refresh</Text>
          </Pressable>
        </View>
      ) : null}
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

  const emptyState = filtering && searchLoading ? null : filtering ? (
    <View style={styles.emptyBox}>
      <View style={styles.stateIcon}>
        <Icon name="frown" size={30} color={colors.inkFaint} />
      </View>
      <Text style={styles.stateTitle}>No items found</Text>
      <Text style={styles.stateSub}>
        {term ? `Nothing matched "${term}". Try a different keyword.` : 'Try adjusting your filters.'}
      </Text>
      <Pressable onPress={clearAll}>
        <Text style={styles.link}>Clear search & filters</Text>
      </Pressable>
    </View>
  ) : !error ? (
    <View style={styles.emptyBox}>
      <Text style={styles.muted}>No listings yet.</Text>
    </View>
  ) : null;

  return (
    <View style={styles.flex}>
      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.6}
        onEndReached={loadMore}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator style={styles.inlineLoad} color={colors.primary} />
        ) : null}
        ListEmptyComponent={emptyState}
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            onPress={() => onOpen && onOpen(item)}
            boosted={boostedIds.has(item.id)}
            favorited={favorites.some((f) => f.listingId === item.id)}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      />
      <FilterModal
        visible={filterOpen}
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
  emptyBox: { padding: 24, alignItems: 'center' },
  inlineLoad: { marginVertical: 12 },
  stateBox: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  stateIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceSunken,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  stateTitle: { fontFamily: font.familyExtraBold, fontSize: 15, color: colors.ink },
  stateSub: {
    marginTop: 6, fontFamily: font.family, fontSize: 12.5, color: colors.inkFaint,
    textAlign: 'center', lineHeight: 19, maxWidth: 260,
  },
  link: { marginTop: 10, fontFamily: font.familyBold, fontSize: 12, color: colors.primary },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 10, marginHorizontal: 6 },
  sectionTitleText: { fontFamily: font.familyBold, fontSize: 15, color: colors.ink },
  boostScroll: { gap: 11, paddingBottom: 4, paddingHorizontal: 6 },
  boostCard: { width: 152 },
  // One segmented pill (web .cat-chip-row): tgBar track, active = tgActive.
  chipScroll: { flexGrow: 0, marginTop: 14, marginHorizontal: 16 },
  chipRow: {
    gap: 2, padding: 5, backgroundColor: colors.tgBar, borderRadius: radius.pill, alignItems: 'center',
  },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill },
  chipActive: { backgroundColor: colors.tgActive },
  chipText: { fontFamily: font.familyBold, fontSize: 13.5, color: colors.inkSoft },
  chipTextActive: { color: colors.tgActiveInk },
  // Web .listing-grid: 6px edge margin, 6px gap both ways.
  list: { paddingHorizontal: 0, paddingTop: 14, paddingBottom: 100 },
  row: { gap: 6, paddingHorizontal: 6 },
});
