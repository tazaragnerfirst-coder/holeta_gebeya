import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeFavorites } from '../lib/favorites';
import { formatListingPrice } from '../lib/listings';
import ScreenShell from '../components/ScreenShell';
import { colors, font, radius } from '../theme';

// Saved listings. Tapping one opens its detail view.
export default function FavoritesScreen({ onBack, onOpen }) {
  const uid = auth.currentUser?.uid;
  const [favorites, setFavorites] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeFavorites(uid, setFavorites);
  }, [uid]);

  return (
    <ScreenShell title="Saved listings" onBack={onBack} scroll={false}>
      {favorites === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>You haven't saved any listings yet.</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => onOpen({
                id: item.listingId,
                title: item.title,
                price: item.price,
                priceType: item.priceType,
                images: item.photo ? [item.photo] : [],
                location: item.location,
                condition: item.condition,
              })}
              accessibilityRole="button"
            >
              {item.photo ? (
                <Image source={{ uri: item.photo }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.noPhoto]} />
              )}
              <View style={styles.info}>
                <Text style={styles.price}>{formatListingPrice(item)}</Text>
                <Text style={styles.name} numberOfLines={2}>{item.title || 'Untitled'}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  muted: { fontFamily: font.family, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 8, marginBottom: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md,
  },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken },
  noPhoto: { backgroundColor: colors.line },
  info: { flex: 1, marginLeft: 12 },
  price: { fontFamily: font.familyExtraBold, fontSize: 14.5, color: colors.primary },
  name: { marginTop: 2, fontFamily: font.familyMedium, fontSize: 13, color: colors.ink },
});
