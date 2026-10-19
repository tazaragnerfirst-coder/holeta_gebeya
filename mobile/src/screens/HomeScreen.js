import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatListingPrice, subscribeListings } from '../lib/listings';
import {
  ALL_CHIP_ID, JOB_CHIP_ID, clearRecentSearches, getRecentSearches, pushRecentSearch,
  searchListings, subscribeCategories,
} from '../lib/search';
import { SearchBar, FilterModal } from '../components/SearchBar';

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
        <ActivityIndicator size="large" color="#4F7052" />
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
      {filtering && searchLoading ? <ActivityIndicator style={styles.inlineLoad} color="#4F7052" /> : null}
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
        <Text style={styles.title} numberOfLines={2}>{item.title || 'Untitled'}</Text>
        <Text style={styles.price}>{formatListingPrice(item)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  muted: {
    fontSize: 14,
    color: '#5F6368',
    textAlign: 'center',
  },
  emptyBox: { padding: 24, alignItems: 'center' },
  inlineLoad: { marginVertical: 12 },
  chipScroll: { flexGrow: 0, marginTop: 4 },
  chipRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1, borderColor: '#D0D4D8', backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#4F7052', borderColor: '#4F7052' },
  chipText: { fontSize: 13, color: '#1F1F1F' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  list: {
    padding: 12,
  },
  row: {
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    marginBottom: 12,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F4F5F7',
  },
  noPhoto: {
    backgroundColor: '#E0E0E0',
  },
  body: {
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1F1F',
  },
  price: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#4F7052',
  },
});
