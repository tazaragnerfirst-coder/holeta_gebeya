import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { formatListingPrice } from '../lib/listings';
import { chatIdFor, getChat } from '../lib/chat';
import { setFavorite, subscribeFavorites } from '../lib/favorites';

const DESC_LIMIT = 180;

// Converts a Firestore Timestamp (or a millis number) into "5m ago" style text.
function timeAgo(ts) {
  if (!ts) return '';
  const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : ts;
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return `${Math.floor(day / 30)}mo ago`;
}

// Public listing detail. Layout only for now: chat, call and favorite
// actions are added in later steps.
export default function ListingDetailScreen({ item: initialItem, onBack, onOpenChat }) {
  const uid = auth.currentUser?.uid;
  // Items opened from Saved listings carry only a snapshot; load the full listing (seller, description).
  const [item, setItem] = useState(initialItem);
  useEffect(() => {
    if (initialItem.sellerId && initialItem.description !== undefined) return;
    getDoc(doc(db, 'listings', initialItem.id))
      .then((snap) => { if (snap.exists()) setItem({ id: snap.id, ...snap.data() }); })
      .catch(() => {});
  }, [initialItem.id]);
  const [descExpanded, setDescExpanded] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [favBusy, setFavBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const isMine = !!uid && item.sellerId === uid;
  const isFavorited = favorites.some((f) => f.listingId === item.id);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeFavorites(uid, setFavorites);
  }, [uid]);

  async function toggleFavorite() {
    if (!uid || favBusy) return;
    setFavBusy(true);
    try {
      await setFavorite(uid, item, isFavorited);
    } catch (err) {
      Alert.alert("Couldn't update favorites", err.message || 'Please try again.');
    } finally {
      setFavBusy(false);
    }
  }

  // Opens the existing thread with this seller, or a draft one that is created on the first message.
  async function startChat() {
    if (!uid || chatBusy || !onOpenChat) return;
    setChatBusy(true);
    try {
      const chatId = chatIdFor(item.sellerId, uid);
      const existing = await getChat(chatId);
      if (existing) {
        onOpenChat(existing);
      } else {
        onOpenChat({
          id: chatId,
          buyerId: uid,
          sellerId: item.sellerId,
          sellerName: item.sellerName || 'Seller',
          listingTitle: item.title,
          draft: {
            listingId: item.id,
            listingTitle: item.title,
            listingPhoto: item.images?.[0] || '',
            listingPrice: item.price,
            listingPriceType: item.priceType || 'fixed',
            sellerId: item.sellerId,
            sellerName: item.sellerName || 'Seller',
            sellerPhoto: item.sellerPhoto || '',
          },
        });
      }
    } catch (err) {
      Alert.alert("Couldn't open chat", err.message || 'Please try again.');
    } finally {
      setChatBusy(false);
    }
  }
  const photo = item.images?.[0] || item.photo;
  const description = item.description || '';
  const isLong = description.length > DESC_LIMIT;
  const shownDescription =
    isLong && !descExpanded ? `${description.slice(0, DESC_LIMIT)}…` : description;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.noPhoto]} />
        )}

        <View style={styles.section}>
          <Text style={styles.price}>{formatListingPrice(item)}</Text>
          <Text style={styles.title}>{item.title || 'Untitled'}</Text>

          <View style={styles.metaRow}>
            {item.condition ? <Text style={styles.badge}>{item.condition}</Text> : null}
            {item.location ? <Text style={styles.meta}>📍 {item.location}</Text> : null}
            {item.createdAt ? <Text style={styles.meta}>🕒 {timeAgo(item.createdAt)}</Text> : null}
          </View>

          {item.category ? (
            <Text style={styles.meta}>
              {item.category}
              {item.subcategory ? ` / ${item.subcategory}` : ''}
            </Text>
          ) : null}
        </View>

        {description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{shownDescription}</Text>
            {isLong ? (
              <Pressable onPress={() => setDescExpanded((v) => !v)} accessibilityRole="button">
                <Text style={styles.moreText}>{descExpanded ? 'Show less' : 'Show more'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {!isMine && uid && item.sellerId ? (
        <View style={styles.actionBar}>
          <Pressable
            onPress={toggleFavorite}
            disabled={favBusy}
            accessibilityRole="button"
            style={[styles.secondaryButton, favBusy && styles.disabled]}
          >
            <Text style={styles.secondaryText}>{isFavorited ? '★ Saved' : '☆ Save'}</Text>
          </Pressable>
          <Pressable
            onPress={startChat}
            disabled={chatBusy}
            accessibilityRole="button"
            style={[styles.primaryButton, chatBusy && styles.disabled]}
          >
            <Text style={styles.primaryText}>Chat with seller</Text>
          </Pressable>
        </View>
      ) : null}
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
    paddingBottom: 8,
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
  content: {
    paddingBottom: 32,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F4F5F7',
  },
  noPhoto: {
    backgroundColor: '#E0E0E0',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4F7052',
  },
  title: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F1F1F',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F1F1F',
    backgroundColor: '#EEF3EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  meta: {
    fontSize: 13,
    color: '#5F6368',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333333',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingBottom: 24,
  },
  primaryButton: {
    flex: 2,
    backgroundColor: '#4F7052',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#4F7052',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#4F7052',
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  moreText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#4F7052',
  },
});
