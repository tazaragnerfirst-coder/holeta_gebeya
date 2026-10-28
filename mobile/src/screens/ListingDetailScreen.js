import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Dimensions, Image, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View,
} from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, BACKEND_URL, db } from '../lib/firebase';
import { formatPriceParts } from '../lib/listings';
import { chatIdFor, getChat } from '../lib/chat';
import { setFavorite, subscribeFavorites } from '../lib/favorites';
import {
  bumpListingViews, conditionTone, fetchSimilar, isSellerVerified, logContactClick, logListingView,
  notifyAdmin, requestSellerPhone, submitListingReport, timeAgo,
} from '../lib/listingActions';
import { fetchListingReviews, getSellerRating, saveReview } from '../lib/reviews';
import ListingCard from '../components/ListingCard';
import CallSheet from '../components/CallSheet';
import ReviewSheet from '../components/ReviewSheet';
import ReportSheet from '../components/ReportSheet';
import StarRow from '../components/StarRow';
import Icon from '../components/Icon';
import { colors, font, radius } from '../theme';

const DESC_LIMIT = 180;
const { width: SCREEN_W } = Dimensions.get('window');

// Public listing detail. Mirrors frontend/src/pages/ProductDetail.jsx.
export default function ListingDetailScreen({ item: initialItem, onBack, onOpen, onOpenChat, onOpenStore }) {
  const uid = auth.currentUser?.uid;
  const [item, setItem] = useState(initialItem);
  const [notFound, setNotFound] = useState(false);

  // Live listing doc (views, boost, edits) — same as web's onSnapshot.
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'listings', initialItem.id),
      (snap) => {
        if (snap.exists()) setItem({ id: snap.id, ...snap.data() });
        else setNotFound(true);
      },
      () => {},
    );
    return unsub;
  }, [initialItem.id]);

  // 1.5s dwell before counting a view, same as web.
  useEffect(() => {
    const t = setTimeout(() => {
      bumpListingViews(item.id);
      logListingView(item.sellerId, item.id);
    }, 1500);
    return () => clearTimeout(t);
  }, [item.id]);

  const [descExpanded, setDescExpanded] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [favBusy, setFavBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [callBusy, setCallBusy] = useState(false);
  const [callSheet, setCallSheet] = useState(null); // { phone }
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportDone, setReportDone] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [sellerRating, setSellerRating] = useState({ avg: 0, count: 0 });
  const [similar, setSimilar] = useState([]);
  const [lightbox, setLightbox] = useState(null); // index or null
  const [activeSlide, setActiveSlide] = useState(0);

  const isMine = !!uid && item.sellerId === uid;
  const isFavorited = favorites.some((f) => f.listingId === item.id);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeFavorites(uid, setFavorites);
  }, [uid]);

  useEffect(() => {
    fetchListingReviews(item.id).then(setReviews).catch(() => {});
    if (item.sellerId) getSellerRating(item.sellerId).then(setSellerRating).catch(() => {});
    fetchSimilar(item).then(setSimilar).catch(() => {});
  }, [item.id, item.sellerId]);

  async function toggleFavorite() {
    if (!uid || favBusy) return;
    const willFavorite = !isFavorited;
    setFavBusy(true);
    try {
      await setFavorite(uid, item, isFavorited);
    } catch (err) {
      Alert.alert("Couldn't update favorites", err.message || 'Please try again.');
    } finally {
      setFavBusy(false);
    }
  }

  // Opens the existing thread with this seller, or a draft one created on
  // the first message — always carries this listing, even into an
  // existing thread (same as web ProductDetail, which always passes
  // draftListing and lets ChatThread attach it).
  async function startChat() {
    if (!uid || chatBusy || !onOpenChat) return;
    setChatBusy(true);
    try {
      logContactClick(item.sellerId, item.id);
      const chatId = chatIdFor(item.sellerId, uid);
      const existing = await getChat(chatId);
      if (existing) {
        // Reopening an existing thread about a possibly-different listing:
        // ChatThreadScreen doesn't yet re-attach a new listing to a live
        // chat (web's pendingListing flow — see #app004), so just open it
        // as-is rather than risk overwriting the chat doc.
        onOpenChat(existing);
      } else {
        onOpenChat({
          id: chatId, buyerId: uid, sellerId: item.sellerId,
          sellerName: item.sellerName || 'Seller', listingTitle: item.title,
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

  async function startCall() {
    if (!uid || callBusy) return;
    setCallBusy(true);
    try {
      const phone = await requestSellerPhone(item.sellerId);
      logContactClick(item.sellerId, item.id);
      setCallSheet({ phone });
    } catch (err) {
      Alert.alert("Couldn't get the seller's number", err.message || 'Please try again.');
    } finally {
      setCallBusy(false);
    }
  }

  async function submitReview({ rating, comment }) {
    setReviewBusy(true);
    setReviewError('');
    try {
      const fresh = await saveReview(item, { rating, comment });
      setReviews(fresh);
      if (item.sellerId) getSellerRating(item.sellerId).then(setSellerRating).catch(() => {});
      setReviewOpen(false);
    } catch (err) {
      setReviewError(err.message || "Couldn't submit your review.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function submitReport({ reason, note }) {
    setReportBusy(true);
    setReportError('');
    try {
      await submitListingReport(item, { reason, note });
      setReportOpen(false);
      setReportDone(true);
    } catch (err) {
      setReportError(err.message || "Couldn't submit your report.");
    } finally {
      setReportBusy(false);
    }
  }

  async function share() {
    try {
      await Share.share({ message: `${BACKEND_URL}/share/${item.id}` });
    } catch {}
  }

  const photos = useMemo(() => (item.images?.length ? item.images : (item.photo ? [item.photo] : [])), [item.images, item.photo]);
  const price = formatPriceParts(item);
  const description = item.description || '';
  const isLong = description.length > DESC_LIMIT;
  const shownDescription = isLong && !descExpanded ? `${description.slice(0, DESC_LIMIT)}…` : description;
  const posted = timeAgo(item.createdAt);
  const boosted = item.boostedUntil && (typeof item.boostedUntil.toMillis === 'function' ? item.boostedUntil.toMillis() : item.boostedUntil) > Date.now();
  const tone = conditionTone(item.condition);
  const sellerInitial = (item.sellerName || 'S').charAt(0).toUpperCase();

  if (notFound) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={onBack} accessibilityRole="button" hitSlop={8} style={styles.backButton}>
            <Icon name="chevronLeft" size={20} color={colors.ink} />
          </Pressable>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>This listing couldn't be found — it may have been removed.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} accessibilityRole="button" hitSlop={8} style={styles.backButton}>
          <Icon name="chevronLeft" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.carouselWrap}>
          {photos.length ? (
            <>
              <ScrollView
                horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setActiveSlide(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
              >
                {photos.map((p, i) => (
                  <Pressable key={i} onPress={() => setLightbox(i)} style={styles.slide}>
                    <Image source={{ uri: p }} style={styles.slideImg} resizeMode="cover" />
                  </Pressable>
                ))}
              </ScrollView>
              {photos.length > 1 ? (
                <View style={styles.countBadge}>
                  <Icon name="camera" size={11} color="#fff" />
                  <Text style={styles.countBadgeText}>{activeSlide + 1}/{photos.length}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={[styles.slide, styles.noPhoto]}>
              <Icon name="image" size={40} color={colors.inkFaint} />
            </View>
          )}

          {boosted ? (
            <View style={styles.badgeBoost}><Icon name="trendingUp" size={13} color={colors.accent} /></View>
          ) : item.condition ? (
            <View style={[styles.conditionBadge, toneStyle(tone)]}>
              <Text style={[styles.conditionText, toneTextStyle(tone)]}>{item.condition}</Text>
            </View>
          ) : null}

          <Pressable onPress={share} style={[styles.roundBtn, styles.shareBtn]} accessibilityRole="button" accessibilityLabel="Share">
            <Icon name="share" size={15} color={colors.inkFaint} />
          </Pressable>
          {uid ? (
            <Pressable
              onPress={toggleFavorite} disabled={favBusy}
              style={[styles.roundBtn, styles.saveBtn, isFavorited && styles.saveBtnActive]}
              accessibilityRole="button" accessibilityLabel={isFavorited ? 'Remove from saved' : 'Save this listing'}
            >
              <Icon name="bookmark" size={15} weight={isFavorited ? 'fill' : 'regular'} color={isFavorited ? '#fff' : colors.inkFaint} />
            </Pressable>
          ) : null}
        </View>

        {photos.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbStrip} contentContainerStyle={{ gap: 6, paddingHorizontal: 14 }}>
            {photos.map((p, i) => (
              <Pressable key={i} onPress={() => setLightbox(i)} style={[styles.thumb, i === activeSlide && styles.thumbActive]}>
                <Image source={{ uri: p }} style={styles.thumbImg} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.title}>{item.title || 'Untitled'}</Text>
          <Text style={styles.price}>
            {price.text}{price.currency ? <Text style={styles.priceEtb}> ETB</Text> : null}
          </Text>
          <View style={styles.metaRow}>
            {item.location ? (
              <View style={styles.metaItem}>
                <Icon name="mapPin" size={13} color={colors.inkFaint} />
                <Text style={styles.meta}>{item.location}</Text>
              </View>
            ) : null}
            {item.category ? (
              <View style={styles.metaItem}>
                <Icon name="grid" size={13} color={colors.inkFaint} />
                <Text style={styles.meta}>{item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}</Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <Icon name="eye" size={13} color={colors.inkFaint} />
              <Text style={styles.meta}>{item.views || 0}</Text>
            </View>
            {posted ? (
              <View style={styles.metaItem}>
                <Icon name="clock" size={13} color={colors.inkFaint} />
                <Text style={styles.meta}>{posted}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {!isMine && item.sellerId ? (
          <View style={styles.sellerRow}>
            <View style={styles.sellerAvatar}>
              {item.sellerPhoto ? (
                <Image source={{ uri: item.sellerPhoto }} style={styles.sellerAvatarImg} />
              ) : (
                <Text style={styles.sellerAvatarText}>{sellerInitial}</Text>
              )}
            </View>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName} numberOfLines={1}>{item.sellerName || 'Seller'}</Text>
                {isSellerVerified(item) ? <Icon name="shieldLock" size={13} weight="fill" color={colors.primary} /> : null}
              </View>
              <View style={styles.sellerMeta}>
                {sellerRating.count > 0 ? (
                  <>
                    <StarRow value={sellerRating.avg} size={12} />
                    <Text style={styles.sellerMetaText}>{sellerRating.avg.toFixed(1)} ({sellerRating.count})</Text>
                  </>
                ) : (
                  <Text style={styles.sellerMetaText}>No ratings yet</Text>
                )}
              </View>
              {onOpenStore ? (
                <Pressable onPress={() => onOpenStore(item.sellerId)} accessibilityRole="button">
                  <Text style={styles.visitStore}>Visit Store ›</Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable onPress={() => setReportOpen(true)} style={styles.reportLink} accessibilityRole="button">
              <Icon name="flag" size={13} color={colors.inkFaint} />
              <Text style={styles.reportText}>Report</Text>
            </Pressable>
          </View>
        ) : null}

        {item.attributes && Object.keys(item.attributes).length > 0 ? (
          <View style={styles.attrList}>
            {Object.entries(item.attributes).map(([k, v], i, arr) => (
              <View key={k} style={[styles.attrRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.attrKey}>{k}</Text>
                <Text style={styles.attrValue}>{String(v)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{description ? shownDescription : 'No description provided.'}</Text>
          {isLong ? (
            <Pressable onPress={() => setDescExpanded((v) => !v)} accessibilityRole="button">
              <Text style={styles.moreText}>{descExpanded ? 'Read less' : 'Read more'}</Text>
            </Pressable>
          ) : null}
        </View>

        {reportDone ? (
          <View style={styles.okBanner}>
            <Icon name="check" size={14} color={colors.primary} />
            <Text style={styles.okBannerText}>Thanks — our team will review this listing.</Text>
          </View>
        ) : null}

        <View style={[styles.section, styles.reviewsSection]}>
          <View style={styles.reviewsHead}>
            <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
            {!isMine && uid ? (
              <Pressable onPress={() => setReviewOpen(true)} accessibilityRole="button">
                <Text style={styles.link}>Leave a review</Text>
              </Pressable>
            ) : null}
          </View>
          {reviews.length === 0 ? (
            <Text style={styles.noReviews}>No reviews yet — be the first to rate this seller.</Text>
          ) : reviews.slice(0, 3).map((r) => (
            <View key={r.id} style={styles.reviewItem}>
              <View style={styles.reviewTop}>
                <Text style={styles.reviewName}>{r.buyerName || 'Buyer'}</Text>
                <Text style={styles.reviewDate}>{timeAgo(r.createdAt)}</Text>
              </View>
              <StarRow value={r.rating} size={12} />
              <Text style={styles.reviewComment}>{r.comment}</Text>
            </View>
          ))}
        </View>

        {similar.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>You might also like</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 11, paddingTop: 10 }}>
              {similar.map((s) => (
                <View key={s.id} style={{ width: 152 }}>
                  <ListingCard item={s} onPress={() => onOpen && onOpen(s)} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {!isMine && uid && item.sellerId ? (
        <View style={styles.actionBar}>
          <Pressable onPress={startCall} disabled={callBusy} accessibilityRole="button" style={[styles.outlineButton, callBusy && styles.disabled]}>
            <Icon name="phone" size={16} color={colors.ink} />
            <Text style={styles.outlineText}>{callBusy ? 'Loading…' : 'Call'}</Text>
          </Pressable>
          <Pressable onPress={startChat} disabled={chatBusy} accessibilityRole="button" style={[styles.primaryButton, chatBusy && styles.disabled]}>
            <Icon name="chat" size={16} color={colors.white} weight="fill" />
            <Text style={styles.primaryText}>{chatBusy ? 'Opening…' : 'Chat with Seller'}</Text>
          </Pressable>
        </View>
      ) : null}

      <CallSheet open={!!callSheet} phone={callSheet?.phone} sellerName={item.sellerName} onClose={() => setCallSheet(null)} />
      <ReviewSheet open={reviewOpen} busy={reviewBusy} error={reviewError} onClose={() => setReviewOpen(false)} onSubmit={submitReview} />
      <ReportSheet open={reportOpen} busy={reportBusy} error={reportError} onClose={() => setReportOpen(false)} onSubmit={submitReport} />

      <Modal visible={lightbox !== null} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <View style={styles.lightbox}>
          <Pressable onPress={() => setLightbox(null)} style={styles.lightboxClose} accessibilityRole="button">
            <Icon name="x" size={20} color="#fff" />
          </Pressable>
          {lightbox !== null ? (
            <>
              <Image source={{ uri: photos[lightbox] }} style={styles.lightboxImg} resizeMode="contain" />
              <View style={styles.lightboxNav}>
                <Pressable onPress={() => setLightbox((i) => (i - 1 + photos.length) % photos.length)} style={styles.lightboxNavBtn} disabled={photos.length < 2}>
                  <Icon name="chevronLeft" size={20} color="#fff" />
                </Pressable>
                <Text style={styles.lightboxCount}>{lightbox + 1} / {photos.length}</Text>
                <Pressable onPress={() => setLightbox((i) => (i + 1) % photos.length)} style={styles.lightboxNavBtn} disabled={photos.length < 2}>
                  <Icon name="chevronRight" size={20} color="#fff" />
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function toneStyle(tone) {
  if (tone === 'new') return { backgroundColor: colors.primary };
  if (tone === 'used') return { backgroundColor: '#D9A24A' };
  if (tone === 'repair') return { backgroundColor: '#C86A4A' };
  return { backgroundColor: 'rgba(255,255,255,.85)' };
}
function toneTextStyle(tone) {
  if (tone === 'used') return { color: '#3D2C0B' };
  if (tone === 'default') return { color: colors.ink };
  return { color: '#fff' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, paddingTop: Platform.OS === 'ios' ? 56 : 48, paddingHorizontal: 16, paddingBottom: 10 },
  backButton: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingBottom: 110 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notFoundText: { fontFamily: font.familyMedium, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
  carouselWrap: { position: 'relative' },
  slide: { width: SCREEN_W, aspectRatio: 1, backgroundColor: colors.surfaceSunken },
  slideImg: { width: '100%', height: '100%' },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  countBadge: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 48, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(20,22,18,.55)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100,
  },
  countBadgeText: { color: '#fff', fontFamily: font.familyBold, fontSize: 11 },
  badgeBoost: {
    position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(20,22,18,.38)', alignItems: 'center', justifyContent: 'center',
  },
  conditionBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 100 },
  conditionText: { fontFamily: font.familyExtraBold, fontSize: 9 },
  roundBtn: {
    position: 'absolute', top: 14, width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center',
  },
  shareBtn: { right: 54 },
  saveBtn: { right: 14 },
  saveBtnActive: { backgroundColor: colors.accentDark },
  thumbStrip: { marginTop: 8 },
  thumb: { width: 34, height: 34, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', opacity: 0.65 },
  thumbActive: { borderColor: colors.primary, opacity: 1 },
  thumbImg: { width: '100%', height: '100%' },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  title: { fontFamily: font.familySemiBold, fontSize: 16, color: colors.ink, lineHeight: 22 },
  price: { marginTop: 4, fontFamily: font.familyExtraBold, fontSize: 20, letterSpacing: -0.2, color: colors.primary },
  priceEtb: { fontFamily: font.familyBold, fontSize: 11, color: colors.primary, opacity: 0.7 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 9 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontFamily: font.family, fontSize: 11.5, color: colors.inkFaint },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  sellerAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  sellerAvatarImg: { width: '100%', height: '100%' },
  sellerAvatarText: { fontFamily: font.familyExtraBold, fontSize: 14, color: colors.primary },
  sellerInfo: { flex: 1, minWidth: 0 },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerName: { fontFamily: font.familyBold, fontSize: 13, color: colors.ink },
  sellerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  sellerMetaText: { fontFamily: font.family, fontSize: 11, color: colors.inkFaint },
  visitStore: { marginTop: 4, fontFamily: font.familyBold, fontSize: 11.5, color: colors.primary },
  reportLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportText: { fontFamily: font.familyBold, fontSize: 11.5, color: colors.inkFaint },
  attrList: { marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' },
  attrRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  attrKey: { fontFamily: font.family, fontSize: 12.5, color: colors.inkFaint, textTransform: 'capitalize' },
  attrValue: { fontFamily: font.familyMedium, fontSize: 12.5, color: colors.ink },
  sectionTitle: { fontFamily: font.familyBold, fontSize: 13.5, color: colors.ink, marginBottom: 7 },
  description: { fontFamily: font.family, fontSize: 13, lineHeight: 22, color: colors.inkSoft },
  moreText: { marginTop: 6, fontFamily: font.familySemiBold, fontSize: 12, color: colors.primary },
  okBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.primaryTint,
    marginHorizontal: 16, marginTop: 14, borderRadius: radius.md, padding: 11,
  },
  okBannerText: { fontFamily: font.familySemiBold, fontSize: 12, color: colors.primary, flex: 1 },
  reviewsSection: { marginTop: 4 },
  reviewsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontFamily: font.familyBold, fontSize: 12, color: colors.primary },
  noReviews: { fontFamily: font.family, fontSize: 12.5, color: colors.inkFaint, marginTop: 6 },
  reviewItem: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewName: { fontFamily: font.familyBold, fontSize: 12.5, color: colors.ink },
  reviewDate: { fontFamily: font.family, fontSize: 11, color: colors.inkFaint },
  reviewComment: { marginTop: 5, fontFamily: font.family, fontSize: 12.5, lineHeight: 19, color: colors.inkSoft },
  actionBar: {
    flexDirection: 'row', gap: 10, padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bgApp,
  },
  primaryButton: {
    flex: 2, flexDirection: 'row', gap: 7, backgroundColor: colors.primary,
    paddingVertical: 13, borderRadius: 100, alignItems: 'center', justifyContent: 'center',
  },
  primaryText: { color: colors.white, fontFamily: font.familyBold, fontSize: 14 },
  outlineButton: {
    flex: 1, flexDirection: 'row', gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    paddingVertical: 13, borderRadius: 100, alignItems: 'center', justifyContent: 'center',
  },
  outlineText: { color: colors.ink, fontFamily: font.familyBold, fontSize: 14 },
  disabled: { opacity: 0.6 },
  lightbox: { flex: 1, backgroundColor: 'rgba(10,12,9,.94)', alignItems: 'center', justifyContent: 'center' },
  lightboxClose: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 24, right: 16, width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center',
  },
  lightboxImg: { width: SCREEN_W, height: '70%' },
  lightboxNav: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 18 },
  lightboxNavBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  lightboxCount: { color: 'rgba(255,255,255,.85)', fontFamily: font.familySemiBold, fontSize: 13 },
});
