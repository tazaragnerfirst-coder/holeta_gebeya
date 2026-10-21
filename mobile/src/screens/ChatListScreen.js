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
          <Icon name="chat" size={26} color={colors.primary} />
        </View>
        <Text style={styles.title}>No conversations yet</Text>
        <Text style={styles.muted}>Message a seller from a listing to start one.</Text>
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
          <Text style={styles.time}>{formatChatTime(chat.lastMessageAt)}</Text>
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
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontFamily: font.familyBold, fontSize: 16, color: colors.ink, marginBottom: 6 },
  muted: { fontFamily: font.family, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontFamily: font.familyExtraBold, fontSize: 17 },
  info: { flex: 1, marginLeft: 12, minWidth: 0 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { flex: 1, fontFamily: font.familySemiBold, fontSize: 14.5, color: colors.ink, marginRight: 8 },
  time: { fontFamily: font.family, fontSize: 11.5, color: colors.inkFaint },
  preview: { marginTop: 2, fontFamily: font.family, fontSize: 13, color: colors.inkSoft },
  bold: { fontFamily: font.familyBold, color: colors.ink },
  badge: {
    marginLeft: 8, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.tgAccent,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: colors.white, fontFamily: font.familyBold, fontSize: 11.5 },
});
