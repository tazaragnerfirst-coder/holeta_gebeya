import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { setFavorite } from '../lib/favorites';
import { formatPriceParts, timeAgo } from '../lib/listings';
import Icon from './Icon';
import { colors, font, radius } from '../theme';

// Same 8-color hash as frontend/src/components/ListingCard.jsx's SWATCHES/colorFor.
const SWATCHES = ['#8FA998', '#C9A15A', '#A9876B', '#8A9BAE', '#B0836D', '#7E9E8C', '#B79A6B', '#93A0AE'];
function colorFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % SWATCHES.length;
  return SWATCHES[h];
}

// Mirrors frontend/src/components/ListingCard.jsx: eyebrow, title, rating,
// price (+ETB suffix), meta row, bookmark, boost badge, job full-width row.
// `favorited`/`onToggleFavorite` are controlled by the caller (shared
// `favorites` state via useAppData-equivalent) so every card on screen
// stays in sync; pass neither to hide the bookmark button.
export default function ListingCard({ item, onPress, boosted, favorited, onToggleFavorite }) {
  const photos = item.images?.length ? item.images : (item.photo ? [item.photo] : []);
  const photo = photos[0];
  const isJob = item.categoryType === 'job';
  const posted = timeAgo(item.createdAt);
  const price = formatPriceParts(item);
  const [busy, setBusy] = useState(false);
  const [optimistic, setOptimistic] = useState(null);
  const isFavorited = optimistic !== null ? optimistic : !!favorited;

  useEffect(() => {
    if (optimistic !== null && !!favorited === optimistic) setOptimistic(null);
  }, [favorited]);

  async function toggleFavorite() {
    if (busy || !onToggleFavorite) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const willFavorite = !isFavorited;
    setOptimistic(willFavorite);
    setBusy(true);
    try {
      await setFavorite(uid, item, isFavorited);
      onToggleFavorite(item.id, willFavorite);
    } catch {
      setOptimistic(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable style={[styles.card, isJob && styles.cardJob]} onPress={onPress} accessibilityRole="button">
      <View style={[styles.thumb, isJob && styles.thumbJob]}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.thumbImg} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbImg, styles.placeholder, { backgroundColor: colorFor(item.id) }]}>
            <Icon name={isJob ? 'briefcase' : 'image'} size={22} color="#fff" />
          </View>
        )}
        {boosted ? (
          <View style={styles.badgeBoost}>
            <Icon name="trendingUp" size={13} color={colors.accent} />
          </View>
        ) : null}
        {onToggleFavorite ? (
          <Pressable
            onPress={toggleFavorite}
            disabled={busy}
            hitSlop={6}
            style={[styles.favBtn, isFavorited && styles.favBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={isFavorited ? 'Remove from saved' : 'Save this listing'}
          >
            <Icon name="bookmark" size={13} weight={isFavorited ? 'fill' : 'regular'} color="#fff" />
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.footer, isJob && styles.footerJob]}>
        {item.category ? <Text style={styles.eyebrow} numberOfLines={1}>{item.category}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>{item.title || 'Untitled'}</Text>
        {item.avgRating && item.reviewCount > 5 ? (
          <View style={styles.ratingRow}>
            <Icon name="star" size={11} weight="fill" color={colors.accent} />
            <Text style={styles.ratingValue}>{item.avgRating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({item.reviewCount})</Text>
          </View>
        ) : null}
        {!isJob ? (
          <Text style={styles.price}>
            {price.text}{price.currency ? <Text style={styles.priceEtb}> ETB</Text> : null}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {posted ? (
            <View style={styles.metaItem}>
              <Icon name="clock" size={11} color={colors.inkFaint} />
              <Text style={styles.metaText}>{posted}</Text>
            </View>
          ) : null}
          {photos.length > 1 ? (
            <View style={styles.metaItem}>
              <Icon name="camera" size={11} color={colors.inkFaint} />
              <Text style={styles.metaText}>{photos.length}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  cardJob: { flexDirection: 'row', gap: 9, backgroundColor: colors.cardSurface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 7 },
  thumb: { position: 'relative', aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceSunken },
  thumbJob: { flex: 0, width: '30%', maxWidth: 110 },
  thumbImg: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  badgeBoost: {
    position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(20,22,18,.38)', alignItems: 'center', justifyContent: 'center',
  },
  favBtn: {
    position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(20,22,18,.38)', alignItems: 'center', justifyContent: 'center',
  },
  favBtnActive: { backgroundColor: colors.accentDark },
  footer: { paddingTop: 7, paddingHorizontal: 2 },
  footerJob: { flex: 1, paddingTop: 1, paddingLeft: 0 },
  eyebrow: { fontFamily: font.familyBold, fontSize: 8.5, color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  title: { fontFamily: font.familySemiBold, fontSize: 12.5, color: colors.ink, lineHeight: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  ratingValue: { fontFamily: font.familyBold, fontSize: 10.5, color: colors.inkSoft },
  ratingCount: { fontFamily: font.family, fontSize: 10.5, color: colors.inkFaint },
  price: { marginTop: 4, fontFamily: font.familyExtraBold, fontSize: 15, letterSpacing: -0.15, color: colors.primary },
  priceEtb: { fontFamily: font.familyBold, fontSize: 10, color: colors.primary, opacity: 0.7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontFamily: font.family, fontSize: 9.5, color: colors.inkFaint },
});
