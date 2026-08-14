import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  collection, addDoc, doc, getDoc, setDoc, updateDoc,
  serverTimestamp, orderBy, query, onSnapshot,
} from 'firebase/firestore';
import { auth, db, notifyNewMessage } from '../lib/firebase';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { getUnsafeUserPreview, getTelegramWebApp } from '../lib/telegram';
import { SUPPORT_UID, SUPPORT_NAME } from '../lib/constants';
import Icon from '../components/Icon.jsx';

function formatClock(ts) {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function dayKey(ts) {
  if (!ts?.toDate) return '';
  return ts.toDate().toDateString();
}
function formatDaySeparator(ts) {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function ChatThread() {
  const { id } = useParams();
  const isSupport = id.startsWith('support_');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [chatInfo, setChatInfo] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const requireRegistered = useRequireRegistered();

  // Keep the input row aligned with the on-screen keyboard inside the
  // Telegram WebView (and as a fallback in a regular mobile browser),
  // by tracking the live viewport height in a CSS variable.
  useEffect(() => {
    const tg = getTelegramWebApp();
    function updateViewport() {
      const h = tg?.viewportStableHeight || window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--app-vh', `${h}px`);
    }
    updateViewport();
    tg?.onEvent?.('viewportChanged', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    return () => {
      tg?.offEvent?.('viewportChanged', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
    };
  }, []);

  useEffect(() => {
    let unsubChat = () => {};
    let unsubMsgs = () => {};
    requireRegistered().then(async (user) => {
      // The support thread has a deterministic ID and is created
      // lazily the first time the user opens it.
      if (isSupport) {
        const chatRef = doc(db, 'chats', id);
        const snap = await getDoc(chatRef);
        if (!snap.exists()) {
          await setDoc(chatRef, {
            participants: [SUPPORT_UID, user.uid],
            buyerId: user.uid,
            buyerName: getUnsafeUserPreview()?.first_name || 'You',
            sellerId: SUPPORT_UID,
            sellerName: SUPPORT_NAME,
            isSupport: true,
            listingTitle: '',
            listingPhoto: '',
            lastMessage: '',
            lastSenderId: '',
            createdAt: serverTimestamp(),
            lastMessageAt: serverTimestamp(),
          });
        }
      }

      unsubChat = onSnapshot(doc(db, 'chats', id), (snap) => {
        if (snap.exists()) setChatInfo(snap.data());
      });
      const q = query(collection(db, 'chats', id, 'messages'), orderBy('createdAt', 'asc'));
      unsubMsgs = onSnapshot(q, (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    }).catch((err) => setError(err.message || "Couldn't open this chat."));
    return () => { unsubChat(); unsubMsgs(); };
  }, [id, isSupport]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  // Mark the thread as read while it's open.
  useEffect(() => {
    if (!messages.length || !auth.currentUser) return;
    updateDoc(doc(db, 'chats', id), { [`lastReadAt.${auth.currentUser.uid}`]: serverTimestamp() }).catch(() => {});
  }, [messages.length, id]);

  // Auto-grow the textarea up to a max height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  }, [text]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError('');
    const outgoing = text.trim();
    try {
      const user = await requireRegistered();
      await addDoc(collection(db, 'chats', id, 'messages'), {
        senderId: user.uid,
        text: outgoing,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'chats', id), {
        lastMessage: outgoing,
        lastSenderId: user.uid,
        lastMessageAt: serverTimestamp(),
        [`lastReadAt.${user.uid}`]: serverTimestamp(),
      });
      setText('');

      if (chatInfo) {
        const recipientUid = chatInfo.buyerId === user.uid ? chatInfo.sellerId : chatInfo.buyerId;
        notifyNewMessage({
          recipientUid,
          senderName: getUnsafeUserPreview()?.first_name || 'Someone',
          listingTitle: chatInfo.listingTitle,
          text: outgoing,
          chatId: id,
        });
      }
    } catch (err) {
      setError(err.message || "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const myUid = auth.currentUser?.uid;
  const amBuyer = chatInfo?.buyerId === myUid;
  const otherName = chatInfo?.isSupport
    ? SUPPORT_NAME
    : (amBuyer ? (chatInfo?.sellerName || 'Seller') : (chatInfo?.buyerName || 'Buyer'));

  return (
    <div className="page thread-page">
      <div className="chat-context">
        <Link to="/chat" className="chat-back" aria-label="Back to messages">
          <Icon name="chevronLeft" size={19} />
        </Link>
        <div className={`thumb-mini ${chatInfo?.isSupport ? 'support-thumb' : ''}`}>
          {chatInfo?.isSupport && <Icon name="helpCircle" size={16} />}
        </div>
        <div className="info">
          <div className="n">{otherName}</div>
          {!chatInfo?.isSupport && chatInfo?.listingTitle && <div className="t">{chatInfo.listingTitle}</div>}
        </div>
        {chatInfo?.listingId && (
          <Link to={`/product/${chatInfo.listingId}`} className="p" style={{ textDecoration: 'none' }}>View</Link>
        )}
      </div>

      {!chatInfo?.isSupport && (
        <div className="safety-banner">
          <Icon name="shield" size={16} />
          <span>Meet the seller in person and inspect the item before you pay. Never send money in advance.</span>
        </div>
      )}

      <div className="thread">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const newDay = !prev || dayKey(m.createdAt) !== dayKey(prev.createdAt);
          const firstInGroup = newDay || !prev || prev.senderId !== m.senderId;
          const lastInGroup = !next || next.senderId !== m.senderId || dayKey(next.createdAt) !== dayKey(m.createdAt);
          const mine = m.senderId === myUid;
          return (
            <React.Fragment key={m.id}>
              {newDay && <div className="date-sep"><span>{formatDaySeparator(m.createdAt)}</span></div>}
              <div className={`bubble ${mine ? 'me' : 'them'} ${firstInGroup ? 'first' : 'grouped'}`}>
                {m.text}
              </div>
              {lastInGroup && <div className={`bubble-time ${mine ? 'me' : 'them'}`}>{formatClock(m.createdAt)}</div>}
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="error-banner">
          <Icon name="x" size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="chat-input-row">
        <textarea
          ref={textareaRef}
          className="field"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
        />
        <button className="send-btn" onClick={send} disabled={sending || !text.trim()}>
          <Icon name="send" size={17} />
        </button>
      </div>
    </div>
  );
}
