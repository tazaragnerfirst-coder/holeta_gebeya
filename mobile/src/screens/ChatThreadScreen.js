import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeMessages, markChatRead, sendChatMessage } from '../lib/chat';
import { getMyProfile } from '../lib/profile';
import { formatListingPrice } from '../lib/listings';
import Icon from '../components/Icon';
import { colors, font, radius } from '../theme';

// One conversation: live messages plus a composer (same behavior as the web ChatThread for existing chats).
export default function ChatThreadScreen({ chat: initialChat, onBack }) {
  const uid = auth.currentUser?.uid;
  // A draft has no chat doc yet (opened from a listing); it becomes live after the first send.
  const [chat, setChat] = useState(initialChat);
  const isDraft = !!chat.draft;
  const [messages, setMessages] = useState(isDraft ? [] : null); // null = still loading
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  const amBuyer = chat.buyerId === uid;
  const otherName = amBuyer ? chat.sellerName || 'Seller' : chat.buyerName || 'Buyer';

  useEffect(() => {
    if (!uid || isDraft) return undefined;
    markChatRead(chat.id, uid);
    return subscribeMessages(chat.id, (data) => {
      setMessages(data);
      markChatRead(chat.id, uid);
    }, () => setError("Couldn't load messages."));
  }, [chat.id, uid, isDraft]);

  async function send() {
    const outgoing = text.trim();
    if (!outgoing || sending || !uid) return;
    setSending(true);
    setError('');
    try {
      setText('');
      const buyerProfile = isDraft ? await getMyProfile(uid) : null;
      await sendChatMessage({
        chatId: chat.id,
        chat,
        uid,
        text: outgoing,
        senderName: buyerProfile?.name || auth.currentUser?.displayName,
        buyerProfile,
      });
      if (isDraft) {
        // The chat doc now exists: switch to the live view with the real chat fields.
        setChat({ id: chat.id, buyerId: uid, sellerId: chat.sellerId, sellerName: chat.sellerName, listingTitle: chat.draft.listingTitle });
      }
    } catch (err) {
      setText(outgoing);
      setError(err.message || "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  const canSend = !!text.trim() && !sending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <Pressable onPress={onBack} accessibilityRole="button" hitSlop={8} style={styles.backButton}>
          <Icon name="chevronLeft" size={20} color={colors.ink} />
        </Pressable>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{otherName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
      </View>

      {messages === null && !isDraft ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => <Bubble message={item} mine={item.senderId === uid} />}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Write a message…"
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
          <Icon name="send" size={18} color={colors.white} weight="fill" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message, mine }) {
  if (message.type === 'listing') {
    const price = formatListingPrice({ price: message.listingPrice, priceType: message.listingPriceType });
    return (
      <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, styles.listingCard]}>
          <Text style={styles.listingPrice}>{price}</Text>
          <Text style={styles.listingTitle}>{message.listingTitle}</Text>
        </View>
      </View>
    );
  }
  if (!message.text) return null;
  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingTop: Platform.OS === 'ios' ? 56 : 48, paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  backButton: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: colors.primary, fontFamily: font.familyExtraBold, fontSize: 14 },
  headerName: { flex: 1, fontFamily: font.familyExtraBold, fontSize: 16, color: colors.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleTheirs: { backgroundColor: colors.surface },
  bubbleText: { fontFamily: font.family, fontSize: 14.5, color: colors.ink },
  bubbleTextMine: { fontFamily: font.family, fontSize: 14.5, color: colors.white },
  listingCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, minWidth: 180,
  },
  listingPrice: { fontFamily: font.familyExtraBold, fontSize: 14, color: colors.primary },
  listingTitle: { marginTop: 2, fontFamily: font.familyMedium, fontSize: 13, color: colors.ink },
  error: { paddingHorizontal: 16, paddingVertical: 6, fontFamily: font.familyMedium, fontSize: 13, color: colors.safety },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10,
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  input: {
    flex: 1, maxHeight: 110, backgroundColor: colors.tgSearch, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontFamily: font.family, fontSize: 14.5, color: colors.ink,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tgAccent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
});
