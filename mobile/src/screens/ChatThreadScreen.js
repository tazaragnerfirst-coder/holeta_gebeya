import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { auth } from '../lib/firebase';
import { subscribeMessages, markChatRead, sendChatMessage } from '../lib/chat';

// One conversation: live messages plus a composer (same behavior as the web ChatThread for existing chats).
export default function ChatThreadScreen({ chat, onBack }) {
  const uid = auth.currentUser?.uid;
  const [messages, setMessages] = useState(null); // null = still loading
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  const amBuyer = chat.buyerId === uid;
  const otherName = amBuyer ? chat.sellerName || 'Seller' : chat.buyerName || 'Buyer';

  useEffect(() => {
    if (!uid) return undefined;
    markChatRead(chat.id, uid);
    return subscribeMessages(chat.id, (data) => {
      setMessages(data);
      markChatRead(chat.id, uid);
    }, () => setError("Couldn't load messages."));
  }, [chat.id, uid]);

  async function send() {
    const outgoing = text.trim();
    if (!outgoing || sending || !uid) return;
    setSending(true);
    setError('');
    try {
      setText('');
      await sendChatMessage({
        chatId: chat.id,
        chat,
        uid,
        text: outgoing,
        senderName: auth.currentUser?.displayName,
      });
    } catch (err) {
      setText(outgoing);
      setError(err.message || "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
      </View>

      {messages === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F7052" />
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
          multiline
        />
        <Pressable
          onPress={send}
          disabled={!text.trim() || sending}
          accessibilityRole="button"
          style={[styles.sendButton, (!text.trim() || sending) && styles.sendDisabled]}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message, mine }) {
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F7052',
  },
  headerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleMine: {
    backgroundColor: '#4F7052',
  },
  bubbleTheirs: {
    backgroundColor: '#F1F3F4',
  },
  bubbleText: {
    fontSize: 15,
    color: '#1F1F1F',
  },
  bubbleTextMine: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  error: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    fontSize: 13,
    color: '#B3261E',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  input: {
    flex: 1,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: '#D0D4D8',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    color: '#1F1F1F',
  },
  sendButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#4F7052',
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
