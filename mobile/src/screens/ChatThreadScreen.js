import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { auth } from '../lib/firebase';
import {
  getChat, markChatRead, patchChat, sendChatMessage, subscribeChat, subscribeMessages,
} from '../lib/chat';
import { getMyProfile } from '../lib/profile';
import { formatPriceParts } from '../lib/listings';
import { SUPPORT_NAME } from '../lib/constants';
import { getCached, setCached } from '../lib/pageCache';
import { useAppData } from '../lib/appData';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { colors, font, radius } from '../theme';

function formatClock(ts) {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function dayKey(ts) {
  if (!ts?.toDate) return '';
  return ts.toDate().toDateString();
}
function formatDaySeparator(ts) {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

// Same starter chips as web ChatThread.jsx (tap fills the box, doesn't send).
const BUYER_QUICK_REPLIES = ['Is this still available?', "What's your best price?", 'Can we meet today?', 'Can you share more photos?'];
const SELLER_QUICK_REPLIES = ['Yes, still available', 'Price is negotiable', "I'm available today", "Sure, I'll send more photos"];
const SUPPORT_QUICK_REPLIES = ['I need help with my account', 'How do I post an ad?', 'I want to report a problem'];

// One conversation. Mirrors frontend/src/pages/ChatThread.jsx.
// `chat.draft`          = brand-new thread opened from a listing (no chat doc yet).
// `chat.pendingListing` = existing thread reopened from a listing; attached on the next send.
export default function ChatThreadScreen({ chat: initialChat, onBack, onOpenListing }) {
  const uid = auth.currentUser?.uid;
  const id = initialChat.id;
  const { profile } = useAppData();
  const draftListing = initialChat.draft || initialChat.pendingListing || null;

  const [chat, setChat] = useState(() => ({
    ...(initialChat.draft ? {} : (getCached(`thread:${id}:info`) || {})),
    ...initialChat,
  }));
  const isDraft = !!chat.draft;
  const [messages, setMessages] = useState(() => (initialChat.draft ? [] : (getCached(`thread:${id}:messages`) || [])));
  // Listing waiting to be attached with the next message: a brand-new draft, or
  // an existing thread being reopened about a different item.
  const [pendingListing, setPendingListing] = useState(() => {
    if (!draftListing) return null;
    if (initialChat.draft) return draftListing;
    return draftListing.listingId !== initialChat.listingId ? draftListing : null;
  });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const isSupport = id.startsWith('support_') || !!chat.isSupport;
  const amBuyer = chat.buyerId === uid;
  const otherName = isSupport ? SUPPORT_NAME : (amBuyer ? chat.sellerName || 'Seller' : chat.buyerName || 'Buyer');
  const otherPhoto = isSupport ? '' : (amBuyer ? chat.sellerPhoto : chat.buyerPhoto);

  // A draft's params can be stale (e.g. coming back from the listing after the
  // first message was sent): if the chat doc exists by now, treat it as existing.
  useEffect(() => {
    if (!initialChat.draft) return undefined;
    let cancelled = false;
    getChat(id).then((existing) => {
      if (cancelled || !existing) return;
      const d = initialChat.draft;
      setChat(existing);
      setPendingListing(d.listingId !== existing.listingId ? d : null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live messages + live chat doc (names/photos/current listing).
  useEffect(() => {
    if (!uid || isDraft) return undefined;
    markChatRead(id, uid);
    const unsubMsgs = subscribeMessages(id, (data) => {
      setMessages(data);
      setCached(`thread:${id}:messages`, data);
      markChatRead(id, uid);
    }, () => setError("Couldn't load messages."));
    const unsubChat = subscribeChat(id, (data) => {
      setChat((prev) => ({ ...prev, ...data, id }));
      setCached(`thread:${id}:info`, data);
    });
    return () => { unsubMsgs(); unsubChat(); };
  }, [id, uid, isDraft]);

  // Self-heal a stale name/photo on this chat doc (web does the same): each side
  // only ever writes its own fields.
  useEffect(() => {
    if (!chat.createdAt || !uid || isDraft) return undefined;
    const iAmBuyer = chat.buyerId === uid;
    const iAmSeller = !iAmBuyer && chat.sellerId === uid;
    if (!iAmBuyer && !iAmSeller) return undefined;
    const nameField = iAmBuyer ? 'buyerName' : 'sellerName';
    const photoField = iAmBuyer ? 'buyerPhoto' : 'sellerPhoto';
    let cancelled = false;
    getMyProfile(uid).then((p) => {
      if (cancelled) return;
      const patch = {};
      if (p.name && p.name !== chat[nameField]) patch[nameField] = p.name;
      if ((p.photo || '') !== (chat[photoField] || '')) patch[photoField] = p.photo || '';
      if (Object.keys(patch).length) patchChat(id, patch);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [id, chat.createdAt, chat.buyerId, chat.sellerId, chat.buyerName, chat.sellerName, chat.buyerPhoto, chat.sellerPhoto]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    const outgoing = text.trim();
    if (!outgoing || sending || !uid) return;
    setSending(true);
    setError('');
    try {
      setText('');
      const buyerProfile = isDraft ? await getMyProfile(uid) : null;
      await sendChatMessage({
        chatId: id,
        chat,
        uid,
        text: outgoing,
        senderName: buyerProfile?.name || profile?.name || auth.currentUser?.displayName,
        buyerProfile,
        pendingListing: isDraft ? null : pendingListing,
      });
      setPendingListing(null);
      if (isDraft) {
        // The chat doc now exists: switch to the live view with the real chat fields.
        const d = chat.draft;
        setChat({
          id, buyerId: uid, sellerId: chat.sellerId, sellerName: chat.sellerName, sellerPhoto: d.sellerPhoto || '',
          listingId: d.listingId, listingTitle: d.listingTitle, listingPhoto: d.listingPhoto || '',
        });
      }
    } catch (err) {
      setText(outgoing);
      setError(err.message || "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  function useQuickReply(msg) {
    setText(msg);
    inputRef.current?.focus();
  }

  function openListing(l) {
    if (!onOpenListing || !l.listingId) return;
    onOpenListing({
      id: l.listingId,
      title: l.listingTitle,
      images: l.listingPhoto ? [l.listingPhoto] : [],
      price: l.listingPrice,
      priceType: l.listingPriceType || 'fixed',
      sellerId: chat.sellerId,
      sellerName: chat.sellerName,
      sellerPhoto: chat.sellerPhoto,
    });
  }

  const quickReplies = isSupport ? SUPPORT_QUICK_REPLIES : (amBuyer ? BUYER_QUICK_REPLIES : SELLER_QUICK_REPLIES);
  // Only nudge before the conversation has really gotten going.
  const showQuickReplies = messages.filter((m) => m.type !== 'listing').length < 2;
  const canSend = !!text.trim() && !sending;

  // Day separators, bubble grouping and per-group timestamps (web's firstInGroup / lastInGroup).
  const rows = useMemo(() => messages.map((m, i) => {
    if (m.type === 'listing') return { key: m.id, kind: 'listing', m };
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const newDay = !prev || dayKey(m.createdAt) !== dayKey(prev.createdAt);
    const firstInGroup = newDay || !prev || prev.senderId !== m.senderId || prev.type === 'listing';
    const lastInGroup = !next || next.senderId !== m.senderId || next.type === 'listing' || dayKey(next.createdAt) !== dayKey(m.createdAt);
    return { key: m.id, kind: 'msg', m, newDay, firstInGroup, lastInGroup };
  }), [messages]);

  const showPendingCard = pendingListing && !messages.some((m) => m.type === 'listing' && m.listingId === pendingListing.listingId);

  const listHeader = (
    <View>
      {!isSupport ? (
        <View style={styles.safetyBanner}>
          <Icon name="shield" size={16} color={colors.safety} />
          <Text style={styles.safetyText}>Meet the seller in person and inspect the item before you pay. Never send money in advance.</Text>
        </View>
      ) : null}
      {showPendingCard ? (
        <ListingCard
          listingId={pendingListing.listingId}
          title={pendingListing.listingTitle}
          photo={pendingListing.listingPhoto}
          price={pendingListing.listingPrice}
          priceType={pendingListing.listingPriceType}
          onPress={() => openListing(pendingListing)}
        />
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to messages" hitSlop={8} style={styles.backButton}>
          <Icon name="chevronLeft" size={19} color={colors.inkSoft} />
        </Pressable>
        <Avatar name={otherName} photo={otherPhoto} support={isSupport} size={36} fontSize={14} iconSize={16} />
        <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={listHeader}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item: r }) => {
          if (r.kind === 'listing') {
            return (
              <ListingCard
                listingId={r.m.listingId}
                title={r.m.listingTitle}
                photo={r.m.listingPhoto}
                price={r.m.listingPrice}
                priceType={r.m.listingPriceType}
                onPress={() => openListing(r.m)}
              />
            );
          }
          const mine = r.m.senderId === uid;
          if (!r.m.text) return null;
          return (
            <Fragment>
              {r.newDay ? (
                <View style={styles.dateSep}>
                  <Text style={styles.dateSepText}>{formatDaySeparator(r.m.createdAt)}</Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.bubble,
                  mine ? styles.bubbleMine : styles.bubbleTheirs,
                  r.firstInGroup ? styles.first : styles.grouped,
                  !r.firstInGroup && (mine ? styles.groupedMine : styles.groupedTheirs),
                ]}
              >
                <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{r.m.text}</Text>
              </View>
              {r.lastInGroup ? (
                <Text style={[styles.bubbleTime, mine ? styles.timeMine : styles.timeTheirs]}>{formatClock(r.m.createdAt)}</Text>
              ) : null}
            </Fragment>
          );
        }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showQuickReplies ? (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          style={styles.quickScroll} contentContainerStyle={styles.quickRow}
        >
          {quickReplies.map((qr) => (
            <Pressable key={qr} onPress={() => useQuickReply(qr)} style={styles.quickChip} accessibilityRole="button">
              <Text style={styles.quickChipText}>{qr}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor={colors.inkFaint}
          multiline
        />
        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={[styles.sendButton, !canSend && styles.sendDisabled]}
        >
          <Icon name="send" size={17} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// Web .thread-listing-card: thumb + title + price, tap opens the listing.
function ListingCard({ title, photo, price, priceType, onPress }) {
  const p = formatPriceParts({ price, priceType });
  return (
    <Pressable onPress={onPress} style={styles.listingCard} accessibilityRole="button">
      <View style={styles.listingThumb}>
        {photo ? <Image source={{ uri: photo }} style={styles.listingThumbImg} /> : <Icon name="image" size={16} color={colors.inkFaint} />}
      </View>
      <View style={styles.listingInfo}>
        <Text style={styles.listingTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.listingPrice}>{p.text}{p.currency ? ' ETB' : ''}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  // Web .chat-context: sunken bar, plain back chevron, 36px avatar, name.
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceSunken,
    paddingTop: (Platform.OS === 'ios' ? 56 : 48) + 9, paddingHorizontal: 16, paddingBottom: 9,
  },
  backButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  headerName: { flex: 1, fontFamily: font.familyBold, fontSize: 12.5, color: colors.ink },
  list: { paddingHorizontal: 16, paddingVertical: 6 },
  safetyBanner: {
    flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: colors.safetyTint,
    borderWidth: 1, borderColor: '#F0C7B6', borderRadius: radius.md,
    paddingVertical: 12, paddingHorizontal: 13, marginTop: 14, marginBottom: 4,
  },
  safetyText: { flex: 1, fontFamily: font.familyMedium, fontSize: 12, lineHeight: 18, color: '#7A331B' },
  dateSep: { alignItems: 'center', marginTop: 14, marginBottom: 8 },
  dateSepText: {
    fontFamily: font.familySemiBold, fontSize: 11, color: colors.inkFaint, backgroundColor: colors.surfaceSunken,
    paddingVertical: 4, paddingHorizontal: 11, borderRadius: 20, overflow: 'hidden',
  },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  first: { marginTop: 8 },
  grouped: { marginTop: 2 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 5 },
  groupedMine: { borderTopRightRadius: 5 },
  groupedTheirs: { borderTopLeftRadius: 5 },
  bubbleText: { fontFamily: font.family, fontSize: 13, lineHeight: 19.5, color: colors.ink },
  bubbleTextMine: { fontFamily: font.family, fontSize: 13, lineHeight: 19.5, color: colors.white },
  bubbleTime: { fontFamily: font.family, fontSize: 10, color: colors.inkFaint, marginTop: 2, marginHorizontal: 2, marginBottom: 6 },
  timeMine: { alignSelf: 'flex-end' },
  timeTheirs: { alignSelf: 'flex-start' },
  listingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: 11, marginVertical: 8,
  },
  listingThumb: {
    width: 42, height: 42, borderRadius: 9, backgroundColor: colors.surfaceSunken, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  listingThumbImg: { width: '100%', height: '100%' },
  listingInfo: { flex: 1, minWidth: 0 },
  listingTitle: { fontFamily: font.familyBold, fontSize: 12.5, color: colors.ink },
  listingPrice: { marginTop: 2, fontFamily: font.familyExtraBold, fontSize: 12.5, color: colors.primary },
  error: {
    marginHorizontal: 16, marginVertical: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: colors.safetyTint, fontFamily: font.familyMedium, fontSize: 12, color: colors.safety,
  },
  quickScroll: { flexGrow: 0 },
  quickRow: { gap: 7, paddingHorizontal: 16, paddingBottom: 8 },
  quickChip: {
    backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.line, borderRadius: 100,
    paddingVertical: 7, paddingHorizontal: 13,
  },
  quickChipText: { fontFamily: font.familySemiBold, fontSize: 12, color: colors.inkSoft },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingVertical: 10, paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bgApp,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 110, backgroundColor: colors.surfaceSunken, borderRadius: 21,
    borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: 17, paddingVertical: 11, fontFamily: font.family, fontSize: 14, color: colors.ink,
  },
  sendButton: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
});
