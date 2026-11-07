import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { useAppData } from '../lib/appData';
import { formatChatTime } from '../lib/chat';
import { SUPPORT_NAME } from '../lib/constants';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { Shimmer } from '../components/Skeleton';
import { colors, font } from '../theme';

// Conversations list. Mirrors frontend/src/pages/ChatList.jsx: "Messages"
// title, pinned Support row, skeleton while loading, photo avatars.
export default function ChatListScreen({ onOpen, onOpenSupport }) {
  const uid = auth.currentUser?.uid;
  // Conversations come from the shared data layer (null = still loading).
  const { chats, chatsError } = useAppData();
  const ready = chats !== null;

  // Web useLoadTimeout(ready, 45000): stop showing the skeleton after 45s.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (ready) { setTimedOut(false); return undefined; }
    const t = setTimeout(() => setTimedOut(true), 45000);
    return () => clearTimeout(t);
  }, [ready]);

  const supportChatId = uid ? `support_${uid}` : null;
  const all = chats || [];
  const supportChat = all.find((c) => c.id === supportChatId);
  const otherChats = all.filter((c) => c.id !== supportChatId);
  const supportUnread = supportChat?.unreadCount?.[uid] || 0;

  const header = (
    <View>
      <Text style={styles.header}>Messages</Text>
      {uid ? (
        <Pressable
          style={styles.row}
          onPress={() => (supportChat ? onOpen(supportChat) : onOpenSupport && onOpenSupport())}
          accessibilityRole="button"
        >
          <Avatar support size={50} iconSize={20} />
          <View style={styles.info}>
            <View style={styles.top}>
              <Text style={[styles.name, supportUnread > 0 && styles.bold]} numberOfLines={1}>{SUPPORT_NAME}</Text>
              {supportChat ? (
                <Text style={[styles.time, supportUnread > 0 && styles.timeUnread]}>{formatChatTime(supportChat.lastMessageAt)}</Text>
              ) : null}
            </View>
            <Text style={[styles.preview, supportUnread > 0 && styles.bold]} numberOfLines={1}>
              {supportChat?.lastMessage || "Need help? We're here for you."}
            </Text>
          </View>
          {supportUnread > 0 ? <Badge count={supportUnread} /> : null}
        </Pressable>
      ) : null}
    </View>
  );

  let empty = null;
  if (!ready && !timedOut && !chatsError) {
    empty = <ChatListSkeleton />;
  } else if (!ready) {
    empty = <Text style={styles.errorText}>Couldn't load your conversations. Check your connection and try again.</Text>;
  } else if (otherChats.length === 0) {
    empty = (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Icon name="chat" size={26} color={colors.inkFaint} />
        </View>
        <Text style={styles.emptyTitle}>No conversations yet</Text>
        <Text style={styles.muted}>Message a seller from a product page to start one.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={ready ? otherChats : []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <ChatRow chat={item} uid={uid} onPress={() => onOpen(item)} />}
    />
  );
}

function Badge({ count }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

function ChatListSkeleton({ count = 5 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.row}>
          <Shimmer style={styles.skelAvatar} />
          <View style={styles.info}>
            <View style={styles.top}>
              <Shimmer style={{ width: '38%', height: 11, borderRadius: 6 }} />
              <Shimmer style={{ width: 34, height: 9, borderRadius: 6 }} />
            </View>
            <Shimmer style={{ width: '62%', height: 10, borderRadius: 6, marginTop: 7 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ChatRow({ chat, uid, onPress }) {
  const amBuyer = chat.buyerId === uid;
  const otherName = amBuyer ? chat.sellerName || 'Seller' : chat.buyerName || 'Buyer';
  const otherPhoto = amBuyer ? chat.sellerPhoto : chat.buyerPhoto;
  const lastIsMine = chat.lastSenderId === uid;
  const unread = chat.unreadCount?.[uid] || 0;
  const preview = `${lastIsMine && chat.lastMessage ? 'You: ' : ''}${chat.lastMessage || chat.listingTitle || 'No messages yet'}`;

  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <Avatar name={otherName} photo={otherPhoto} size={50} fontSize={17} />
      <View style={styles.info}>
        <View style={styles.top}>
          <Text style={[styles.name, unread > 0 && styles.bold]} numberOfLines={1}>{otherName}</Text>
          <Text style={[styles.time, unread > 0 && styles.timeUnread]}>{formatChatTime(chat.lastMessageAt)}</Text>
        </View>
        <Text style={[styles.preview, unread > 0 && styles.bold]} numberOfLines={1}>{preview}</Text>
      </View>
      {unread > 0 ? <Badge count={unread} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 48, paddingBottom: 16,
    fontFamily: font.familyExtraBold, fontSize: 20, color: colors.ink,
  },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  skelAvatar: { width: 50, height: 50, borderRadius: 25 },
  info: { flex: 1, minWidth: 0 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontFamily: font.familyBold, fontSize: 13.5, color: colors.ink },
  time: { fontFamily: font.family, fontSize: 10.5, color: colors.inkFaint },
  timeUnread: { fontFamily: font.familyBold, color: colors.primary },
  preview: { marginTop: 3, fontFamily: font.family, fontSize: 12, color: colors.inkSoft },
  bold: { fontFamily: font.familySemiBold, color: colors.ink },
  badge: {
    minWidth: 19, height: 19, borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: colors.white, fontFamily: font.familyExtraBold, fontSize: 10.5 },
  errorText: { marginTop: 14, fontFamily: font.family, fontSize: 12.5, color: colors.safety, lineHeight: 19 },
  emptyState: { alignItems: 'center', paddingTop: 44, paddingHorizontal: 20, paddingBottom: 24 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceSunken,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontFamily: font.familyExtraBold, fontSize: 15, color: colors.ink },
  muted: { marginTop: 5, fontFamily: font.family, fontSize: 12.5, color: colors.inkFaint, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
});
