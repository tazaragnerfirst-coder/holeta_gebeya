import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatListingPrice, subscribeListings } from '../lib/listings';
import {
  ALL_CHIP_ID, JOB_CHIP_ID, clearRecentSearches, getRecentSearches, pushRecentSearch,
  searchListings, subscribeCategories,
} from '../lib/search';
import { SearchBar, FilterModal } from '../components/SearchBar';
import { colors, font, radius } from '../theme';

const EMPTY_FILTERS = { minPrice: null, maxPrice: null, conditions: [] };

// Public listing feed with search, category chips and filters.
// Browsing needs no login. Mirrors frontend/src/pages/Home.jsx.
export default function HomeScreen({ onOpen }) {
  const [listings, setListings] = useState(null); // null = still loading
  const [error, setError] = useState(false);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(null); // null, a category id, or JOB_CHIP_ID
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recent, setRecent] = useState([]);

  const term = search.trim().toLowerCase();
  const filtering = Boolean(term || category || filters.minPrice != null || filters.maxPrice != null || filters.conditions.length > 0);
  const filterCount = (filters.minPrice != null ? 1 : 0) + (filters.maxPrice != null ? 1 : 0) + (filters.conditions.length > 0 ? 1 : 0);

  useEffect(() => {
    const unsub = subscribeListings(setListings, () => setError(true));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeCategories(setCategories, () => {});
    return unsub;
  }, []);

  useEffect(() => { getRecentSearches().then(setRecent); }, []);

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

  const feed = useMemo(() => (listings || []).filter((l) => l.categoryType !== 'job'), [listings]);
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
    for (const l of listings || []) {
      const title = l.title?.trim();
      if (title && !seen.has(title)) {
        seen.add(title);
        out.push(title);
      }
      if (out.length >= 6) break;
    }
    return out;
  }, [listings]);

  const chips = useMemo(() => [
    { id: ALL_CHIP_ID, name: 'All' },
    { id: JOB_CHIP_ID, name: 'Job' },
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

  function pickChip(id) {
    if (id === ALL_CHIP_ID) setCategory(null);
    else setCategory(category === id ? null : id);
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Couldn't load listings. Check your connection and reopen the app.</Text>
      </View>
    );
  }

  if (listings === null) {
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
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {filtering && searchLoading ? <ActivityIndicator style={styles.inlineLoad} color={colors.primary} /> : null}
    </View>
  );

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
        ListEmptyComponent={
          filtering && searchLoading ? null : (
            <View style={styles.emptyBox}>
              <Text style={styles.muted}>{filtering ? 'No listings match your search.' : 'No listings yet.'}</Text>
            </View>
          )
        }
        renderItem={({ item }) => <ListingCard item={item} onPress={() => onOpen && onOpen(item)} />}
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

function ListingCard({ item, onPress }) {
  const photo = item.images?.[0] || item.photo;
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={[styles.photo, styles.noPhoto]} />
      )}
      <View style={styles.body}>
        <Text style={styles.price}>{formatListingPrice(item)}</Text>
        <Text style={styles.title} numberOfLines={2}>{item.title || 'Untitled'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgApp },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  muted: { fontFamily: font.family, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
  emptyBox: { padding: 24, alignItems: 'center' },
  inlineLoad: { marginVertical: 12 },
  // One segmented pill (web .cat-chip-row): tgBar track, active = tgActive.
  chipScroll: { flexGrow: 0, marginTop: 10, marginHorizontal: 16 },
  chipRow: {
    gap: 2, padding: 5, backgroundColor: colors.tgBar, borderRadius: radius.pill, alignItems: 'center',
  },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill },
  chipActive: { backgroundColor: colors.tgActive },
  chipText: { fontFamily: font.familyBold, fontSize: 13.5, color: colors.inkSoft },
  chipTextActive: { color: colors.tgActiveInk },
  list: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 100 },
  row: { gap: 6 },
  // Web .listing-card: flat, borderless, price-first, 1:1 rounded thumb.
  card: { flex: 1, marginBottom: 12 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  noPhoto: { backgroundColor: colors.line },
  body: { paddingTop: 7, paddingHorizontal: 2 },
  price: { fontFamily: font.familyExtraBold, fontSize: 14.5, color: colors.primary },
  title: { marginTop: 2, fontFamily: font.familyMedium, fontSize: 13, color: colors.ink, lineHeight: 17 },
});
