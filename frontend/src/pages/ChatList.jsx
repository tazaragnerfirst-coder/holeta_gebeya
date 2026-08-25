import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { useAppData } from '../lib/appData';
import { useLoadTimeout } from '../lib/useLoadTimeout';
import { SUPPORT_NAME } from '../lib/constants';
import Icon from '../components/Icon.jsx';
import { ChatListSkeleton } from '../components/Skeletons.jsx';
import { getInitial, getAvatarColor } from '../lib/avatar';

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

// Number of messages the given user hasn't read yet in this chat —
// kept server-side on the chat doc (chats/{id}.unreadCount.{uid}) so
// the list can show an actual count, like Telegram, instead of just
// an unread/read dot.
function unreadCount(chat, uid) {
  return chat.unreadCount?.[uid] || 0;
}

export default function ChatList() {
  const { chats, chatsReady, registeredUid } = useAppData();
  const requireRegistered = useRequireRegistered();

  // Data itself now comes from the app-wide store (already warming
  // up in the background, and seeded from last-known cache on cold
  // start) — this call only handles prompting signup if the visitor
  // isn't registered yet. Skipped once registeredUid is already trusted.
  useEffect(() => {
    if (registeredUid) return;
    requireRegistered().catch((err) => console.error(err));
  }, [registeredUid]);

  const uid = registeredUid;
  // chatsReady alone: cached chats from a previous session render
  // immediately instead of waiting on registeredUid to re-resolve.
  const ready = chatsReady;
  const timedOut = useLoadTimeout(ready, 45000);
  const supportChatId = uid ? `support_${uid}` : null;
  const supportChat = chats.find((c) => c.id === supportChatId);
  const otherChats = chats.filter((c) => c.id !== supportChatId);
  const supportUnread = supportChat ? unreadCount(supportChat, uid) : 0;

  return (
    <div className="page">
      <h2 className="page-title">Messages</h2>

      {uid && (
        <Link to={`/chat/${supportChatId}`} className={`chat-list-item support-pin${supportUnread ? ' is-unread' : ''}`}>
          <div className="chat-thumb avatar-circle support-thumb"><Icon name="helpCircle" size={20} /></div>
          <div className="chat-info">
            <div className="top">
              <span className="name">{SUPPORT_NAME}</span>
              {supportChat && <span className="time">{formatTime(supportChat.lastMessageAt)}</span>}
            </div>
            <div className="msg">
              {supportChat?.lastMessage || "Need help? We're here for you."}
            </div>
          </div>
          {supportUnread > 0 && <span className="unread-badge">{supportUnread > 99 ? '99+' : supportUnread}</span>}
        </Link>
      )}

      {!ready && !timedOut && <ChatListSkeleton />}
      {!ready && timedOut && (
        <p className="helper-text error-text">
          Couldn't load your conversations. Check your connection and{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>try again</a>.
        </p>
      )}
      {ready && otherChats.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Icon name="chat" size={26} /></div>
          <div className="empty-state-title">No conversations yet</div>
          <div className="empty-state-sub">Message a seller from a product page to start one.</div>
        </div>
      )}
      {otherChats.map((c) => {
        const amBuyer = c.buyerId === uid;
        const otherName = amBuyer ? (c.sellerName || 'Seller') : (c.buyerName || 'Buyer');
        const otherPhoto = amBuyer ? c.sellerPhoto : c.buyerPhoto;
        const lastIsMine = c.lastSenderId === uid;
        const unread = unreadCount(c, uid);
        return (
          <Link to={`/chat/${c.id}`} className={`chat-list-item${unread ? ' is-unread' : ''}`} key={c.id}>
            {c.listingPhoto ? (
              <div
                className="chat-thumb"
                style={{ backgroundImage: `url(${c.listingPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
            ) : otherPhoto ? (
              <div
                className="chat-thumb avatar-circle"
                style={{ backgroundImage: `url(${otherPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
            ) : (
              <div className="chat-thumb avatar-circle" style={{ background: getAvatarColor(otherName) }}>
                {getInitial(otherName)}
              </div>
            )}
            <div className="chat-info">
              <div className="top">
                <span className="name">{otherName}</span>
                <span className="time">{formatTime(c.lastMessageAt)}</span>
              </div>
              <div className="msg">
                {lastIsMine && c.lastMessage ? 'You: ' : ''}{c.lastMessage || c.listingTitle || 'No messages yet'}
              </div>
            </div>
            {unread > 0 && <span className="unread-badge">{unread > 99 ? '99+' : unread}</span>}
          </Link>
        );
      })}
    </div>
  );
}
