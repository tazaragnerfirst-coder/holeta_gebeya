import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeChats, formatChatTime } from '../lib/chat';

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
        <ActivityIndicator size="large" color="#4F7052" />
      </View>
    );
  }
  if (chats.length === 0) {
    return (
      <View style={styles.center}>
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
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 22,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1F1F',
    marginBottom: 6,
  },
  muted: {
    fontSize: 14,
    color: '#5F6368',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F7052',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: 15,
    color: '#1F1F1F',
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#5F6368',
  },
  preview: {
    marginTop: 2,
    fontSize: 13,
    color: '#5F6368',
  },
  bold: {
    fontWeight: '700',
    color: '#1F1F1F',
  },
  badge: {
    marginLeft: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4F7052',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
