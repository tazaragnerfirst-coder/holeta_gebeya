import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatListingPrice, subscribeListings } from '../lib/listings';

// Public listing feed (read-only for now). Browsing needs no login.
export default function HomeScreen({ onOpen }) {
  const [listings, setListings] = useState(null); // null = still loading
  const [error, setError] = useState(false);

  useEffect(() => {
    const unsub = subscribeListings(setListings, () => setError(true));
    return unsub;
  }, []);

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

  if (listings.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No listings yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={listings}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.list}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => <ListingCard item={item} onPress={() => onOpen && onOpen(item)} />}
    />
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
