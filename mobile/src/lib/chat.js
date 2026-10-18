import {
  addDoc, collection, doc, increment, onSnapshot, orderBy, query, serverTimestamp,
  updateDoc, where,
} from 'firebase/firestore';
import { db, BACKEND_URL } from './firebase';

// Live list of the current user's conversations, newest first.
// Same participants query the web app uses (appData.jsx).
export function subscribeChats(uid, onData, onError) {
  const q = query(collection(db, 'chats'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.lastMessageAt?.toMillis?.() || 0) - (a.lastMessageAt?.toMillis?.() || 0));
      onData(data);
    },
    (err) => onError && onError(err),
  );
}

// Live messages for one conversation, oldest first.
export function subscribeMessages(chatId, onData, onError) {
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err),
  );
}

// Clears this user's unread state for the chat (same as ChatThread.jsx).
export function markChatRead(chatId, uid) {
  return updateDoc(doc(db, 'chats', chatId), {
    [`lastReadAt.${uid}`]: serverTimestamp(),
    [`unreadCount.${uid}`]: 0,
  }).catch(() => {});
}

// Sends a text message in an existing conversation, updates the chat doc
// and pings the other side. Mirrors ChatThread.jsx send() for existing threads.
export async function sendChatMessage({ chatId, chat, uid, text, senderName }) {
  const outgoing = text.trim();
  if (!outgoing) return;
  const recipientUid = chat.buyerId === uid ? chat.sellerId : chat.buyerId;
  const chatRef = doc(db, 'chats', chatId);

  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId: uid,
    text: outgoing,
    createdAt: serverTimestamp(),
  });
  await updateDoc(chatRef, {
    lastMessage: outgoing,
    lastSenderId: uid,
    lastMessageAt: serverTimestamp(),
    [`lastReadAt.${uid}`]: serverTimestamp(),
    [`unreadCount.${uid}`]: 0,
    ...(recipientUid ? { [`unreadCount.${recipientUid}`]: increment(1) } : {}),
  });

  if (recipientUid) {
    fetch(`${BACKEND_URL}/notifyNewMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientUid,
        senderName: senderName || 'Someone',
        listingTitle: chat.listingTitle,
        text: outgoing,
        chatId,
      }),
    }).catch(() => {});
  }
}

export function formatChatTime(ts) {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
