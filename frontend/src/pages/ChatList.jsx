import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { SUPPORT_NAME } from '../lib/constants';
import Icon from '../components/Icon.jsx';

function formatTime(ts) {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function isUnread(chat, uid) {
  if (!chat.lastMessageAt || chat.lastSenderId === uid) return false;
  const readAt = chat.lastReadAt?.[uid];
  if (!readAt) return true;
  return readAt.toMillis?.() < chat.lastMessageAt.toMillis?.();
}

export default function ChatList() {
  const [chats, setChats] = useState([]);
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState(null);
  const requireRegistered = useRequireRegistered();

  useEffect(() => {
    requireRegistered().then((user) => {
      setUid(user.uid);
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageAt', 'desc')
      );
      const unsub = onSnapshot(q, (snap) => {
        setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setReady(true);
      });
      return unsub;
    }).catch((err) => { console.error(err); setReady(true); });
  }, []);

  const supportChatId = uid ? `support_${uid}` : null;
  const supportChat = chats.find((c) => c.id === supportChatId);
  const otherChats = chats.filter((c) => c.id !== supportChatId);

  return (
    <div className="page">
      <h2 className="page-title">Messages</h2>

      {uid && (
        <Link to={`/chat/${supportChatId}`} className="chat-list-item support-pin">
          <div className="chat-thumb support-thumb"><Icon name="helpCircle" size={20} /></div>
          <div className="chat-info">
            <div className="top">
              <span className="name">{SUPPORT_NAME}</span>
              {supportChat && <span className="time">{formatTime(supportChat.lastMessageAt)}</span>}
            </div>
            <div className="msg">
              {supportChat?.lastMessage || "Need help? We're here for you."}
            </div>
          </div>
          {supportChat && isUnread(supportChat, uid) && <span className="unread-dot" />}
        </Link>
      )}

      {!ready && <p className="helper-text">Loading conversations...</p>}
      {ready && otherChats.length === 0 && (
        <p className="helper-text">No conversations yet. Message a seller from a product page to start one.</p>
      )}
      {otherChats.map((c) => {
        const amBuyer = c.buyerId === uid;
        const otherName = amBuyer ? (c.sellerName || 'Seller') : (c.buyerName || 'Buyer');
        const lastIsMine = c.lastSenderId === uid;
        return (
          <Link to={`/chat/${c.id}`} className="chat-list-item" key={c.id}>
            <div
              className="chat-thumb"
              style={c.listingPhoto ? { backgroundImage: `url(${c.listingPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {!c.listingPhoto && <Icon name="image" size={18} />}
            </div>
            <div className="chat-info">
              <div className="top">
                <span className="name">{otherName}</span>
                <span className="time">{formatTime(c.lastMessageAt)}</span>
              </div>
              <div className="msg">
                {lastIsMine && c.lastMessage ? 'You: ' : ''}{c.lastMessage || c.listingTitle || 'No messages yet'}
              </div>
            </div>
            {isUnread(c, uid) && <span className="unread-dot" />}
          </Link>
        );
      })}
    </div>
  );
}
