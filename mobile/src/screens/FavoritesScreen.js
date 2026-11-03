import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAppData } from '../lib/appData';
import ScreenShell from '../components/ScreenShell';
import ListingCard from '../components/ListingCard';
import Icon from '../components/Icon';
import { ListingGridSkeleton } from '../components/Skeleton';
import { colors, font } from '../theme';

// Saved listings as the same card grid as Home (web Favorites.jsx).
// Tapping a card opens its detail view.
export default function FavoritesScreen({ onBack, onOpen }) {
  const { favorites } = useAppData(); // null = still loading

  function toListing(f) {
    return {
      id: f.listingId,
      title: f.title,
      price: f.price,
      priceType: f.priceType,
      images: f.photo ? [f.photo] : [],
      location: f.location,
      condition: f.condition,
    };
  }

  return (
    <ScreenShell title="Favorites" onBack={onBack} scroll={false}>
      {favorites === null ? (
        <ListingGridSkeleton />
      ) : favorites.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="bookmark" size={26} color={colors.inkFaint} />
          </View>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySub}>Tap the bookmark on any listing to save it here.</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(f) => f.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          renderItem={({ item: f }) => {
            const listing = toListing(f);
            return (
              <ListingCard
                item={listing}
                onPress={() => onOpen(listing)}
                favorited
                onToggleFavorite={() => {}}
              />
            );
          }}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceSunken,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontFamily: font.familyExtraBold, fontSize: 15, color: colors.ink },
  emptySub: {
    marginTop: 6, fontFamily: font.family, fontSize: 12.5, color: colors.inkFaint,
    textAlign: 'center', lineHeight: 19, maxWidth: 260,
  },
  list: { paddingTop: 4, paddingBottom: 100 },
  row: { gap: 6, paddingHorizontal: 6 },
});
