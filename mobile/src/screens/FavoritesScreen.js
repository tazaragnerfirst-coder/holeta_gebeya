import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeFavorites } from '../lib/favorites';
import { formatListingPrice } from '../lib/listings';

// Saved listings. Tapping one opens its detail view.
export default function FavoritesScreen({ onBack, onOpen }) {
  const uid = auth.currentUser?.uid;
  const [favorites, setFavorites] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeFavorites(uid, setFavorites);
  }, [uid]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Saved listings</Text>
      </View>

      {favorites === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F7052" />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>You haven't saved any listings yet.</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
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
                <Text style={styles.name} numberOfLines={2}>{item.title || 'Untitled'}</Text>
                <Text style={styles.price}>{formatListingPrice(item)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F7052',
  },
  title: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1F1F',
  },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F4F5F7',
  },
  noPhoto: {
    backgroundColor: '#E0E0E0',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
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
