import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeChats, formatChatTime } from '../lib/chat';
import Icon from '../components/Icon';
import { colors, font } from '../theme';

// Conversations list (same data and unread badge as the web Messages page).
export default function ChatListScreen({ onOpen }) {
  const uid = auth.currentUser?.uid;
  const [chats, setChats] = useState(null); // null = still loading
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeChats(uid, setChats, () => setError(true));
  }, [uid]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Couldn't load your conversations. Check your connection.</Text>
      </View>
    );
  }
  if (chats === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (chats.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIcon}>
          <Icon name="chat" size={30} color={colors.inkFaint} />
        </View>
        <Text style={styles.title}>No conversations yet</Text>
        <Text style={styles.muted}>Message a seller from a product page to start one.</Text>
      </View>
    );
  }

  return (
    <>
      <Text style={styles.header}>Messages</Text>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ChatRow chat={item} uid={uid} onPress={() => onOpen(item)} />}
      />
    </>
  );
}

function ChatRow({ chat, uid, onPress }) {
  const amBuyer = chat.buyerId === uid;
  const otherName = amBuyer ? chat.sellerName || 'Seller' : chat.buyerName || 'Buyer';
  const lastIsMine = chat.lastSenderId === uid;
  const unread = chat.unreadCount?.[uid] || 0;
  const preview = `${lastIsMine && chat.lastMessage ? 'You: ' : ''}${chat.lastMessage || chat.listingTitle || 'No messages yet'}`;

  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{otherName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.top}>
          <Text style={[styles.name, unread > 0 && styles.bold]} numberOfLines={1}>{otherName}</Text>
          <Text style={[styles.time, unread > 0 && styles.timeUnread]}>{formatChatTime(chat.lastMessageAt)}</Text>
        </View>
        <Text style={[styles.preview, unread > 0 && styles.bold]} numberOfLines={1}>{preview}</Text>
      </View>
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12,
    fontFamily: font.familyExtraBold, fontSize: 20, color: colors.ink,
  },
  list: { paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: colors.bgApp },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceSunken,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontFamily: font.familyExtraBold, fontSize: 15, color: colors.ink, marginBottom: 6 },
  muted: { fontFamily: font.family, fontSize: 12.5, color: colors.inkFaint, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontFamily: font.familyExtraBold, fontSize: 17 },
  info: { flex: 1, marginLeft: 11, minWidth: 0 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { flex: 1, fontFamily: font.familyBold, fontSize: 13.5, color: colors.ink, marginRight: 8 },
  time: { fontFamily: font.family, fontSize: 10.5, color: colors.inkFaint },
  timeUnread: { fontFamily: font.familyBold, color: colors.primary },
  preview: { marginTop: 3, fontFamily: font.family, fontSize: 12, color: colors.inkSoft },
  bold: { fontFamily: font.familySemiBold, color: colors.ink },
  badge: {
    marginLeft: 11, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: colors.white, fontFamily: font.familyExtraBold, fontSize: 10.5 },
});
