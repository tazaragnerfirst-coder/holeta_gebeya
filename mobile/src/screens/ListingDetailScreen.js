import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatListingPrice } from '../lib/listings';

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
export default function ListingDetailScreen({ item, onBack }) {
  const [descExpanded, setDescExpanded] = useState(false);
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
  moreText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#4F7052',
  },
});
