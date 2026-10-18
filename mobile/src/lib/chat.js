import {
  addDoc, collection, doc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp,
  setDoc, updateDoc, where,
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

// Deterministic one-thread-per-buyer/seller-pair id (same as the web app).
export function chatIdFor(sellerId, buyerId) {
  return [sellerId, buyerId].sort().join('_');
}

// Returns the existing chat doc (with id) or null if it hasn't been created yet.
export async function getChat(chatId) {
  const snap = await getDoc(doc(db, 'chats', chatId));
  return snap.exists() ? { id: chatId, ...snap.data() } : null;
}

// Sends a text message. For a draft (brand-new thread opened from a
// listing) the chat doc is created first, with the listing attached,
// the same way the web ChatThread does on the first send.
export async function sendChatMessage({ chatId, chat, uid, text, senderName, buyerProfile }) {
  const outgoing = text.trim();
  if (!outgoing) return;
  const chatRef = doc(db, 'chats', chatId);
  const recipientUid = chat.buyerId === uid ? chat.sellerId : chat.buyerId;

  if (chat.draft) {
    const d = chat.draft;
    await setDoc(chatRef, {
      listingId: d.listingId,
      listingTitle: d.listingTitle,
      listingPhoto: d.listingPhoto || '',
      sellerId: d.sellerId,
      sellerName: d.sellerName,
      sellerPhoto: d.sellerPhoto || '',
      buyerId: uid,
      buyerName: buyerProfile?.name || 'Buyer',
      buyerPhoto: buyerProfile?.photo || '',
      participants: [d.sellerId, uid],
      lastMessage: '',
      lastSenderId: '',
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: uid,
      type: 'listing',
      listingId: d.listingId,
      listingTitle: d.listingTitle,
      listingPhoto: d.listingPhoto || '',
      listingPrice: d.listingPrice ?? null,
      listingPriceType: d.listingPriceType || 'fixed',
      createdAt: serverTimestamp(),
    });
  }

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
        listingTitle: chat.listingTitle || chat.draft?.listingTitle,
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
