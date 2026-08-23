import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  collection, addDoc, doc, getDoc, setDoc, updateDoc,
  serverTimestamp, orderBy, query, onSnapshot, increment,
} from 'firebase/firestore';
import { auth, db, notifyNewMessage } from '../lib/firebase';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { getUnsafeUserPreview, getTelegramWebApp } from '../lib/telegram';
import { getMyProfile } from '../lib/profile';
import { getInitial, getAvatarColor } from '../lib/avatar';
import { SUPPORT_UID, SUPPORT_NAME } from '../lib/constants';
import { productLinkState } from '../lib/nav';
import Icon from '../components/Icon.jsx';
import { getCached, setCached } from '../lib/pageCache';

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

// Starter messages shown as tappable chips above the composer, so
// people aren't staring at a blank input. Tapping one fills the box
// (doesn't send immediately) so it can still be edited first. Buyer
// and seller get different sets since they're on opposite sides of
// the same question; support gets its own generic set.
const BUYER_QUICK_REPLIES = [
  'Is this still available?',
  "What's your best price?",
  'Can we meet today?',
  'Can you share more photos?',
];
const SELLER_QUICK_REPLIES = [
  'Yes, still available',
  'Price is negotiable',
  "I'm available today",
  "Sure, I'll send more photos",
];
const SUPPORT_QUICK_REPLIES = [
  'I need help with my account',
  'How do I post an ad?',
  'I want to report a problem',
];

export default function ChatThread() {
  const { id } = useParams();
  const location = useLocation();
  const isSupport = id.startsWith('support_');
  // Handed down from ProductDetail's "Chat with Seller" button — the
  // listing this conversation is about. Nothing is written to
  // Firestore from this yet; it's only used to render the header +
  // a pending listing card, and gets attached for real the moment
  // the buyer actually sends a first message (see send() below).
  const draftListing = location.state?.draftListing || null;

  const [messages, setMessages] = useState(() => getCached(`thread:${id}:messages`) || []);
  const [text, setText] = useState('');
  const [chatInfo, setChatInfo] = useState(() => getCached(`thread:${id}:info`) || null);
  // Listing context waiting to be attached on the next message sent —
  // either because the chat doesn't exist yet (brand-new draft), or
  // because an existing conversation is being reopened about a
  // different item than it last covered.
  const [pendingListing, setPendingListing] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const unsubChatRef = useRef(() => {});
  const unsubMsgsRef = useRef(() => {});
  const requireRegistered = useRequireRegistered();

  // Attaches (or re-attaches) the live chat-doc + messages listeners
  // and remembers how to tear them down. Called once we know the
  // chat doc actually exists — either right away (support / an
  // already-existing thread) or right after a brand-new thread's
  // first send() confirms it was just created.
  function subscribeLive() {
    unsubChatRef.current();
    unsubMsgsRef.current();
    unsubChatRef.current = onSnapshot(doc(db, 'chats', id), (snap) => {
      if (snap.exists()) {
        setChatInfo(snap.data());
        setCached(`thread:${id}:info`, snap.data());
      }
    });
    const q = query(collection(db, 'chats', id, 'messages'), orderBy('createdAt', 'asc'));
    unsubMsgsRef.current = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(data);
      setCached(`thread:${id}:messages`, data);
    });
  }

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
    setMessages(getCached(`thread:${id}:messages`) || []);
    setChatInfo(getCached(`thread:${id}:info`) || null);
    setPendingListing(null);
    setError('');
    let cancelled = false;
    unsubChatRef.current();
    unsubMsgsRef.current();
    unsubChatRef.current = () => {};
    unsubMsgsRef.current = () => {};

    requireRegistered().then(async (user) => {
      if (cancelled) return;

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
        if (cancelled) return;
        subscribeLive();
        return;
      }

      // Buyer↔seller thread. Check whether it already exists rather
      // than assuming — a buyer may be reopening a past conversation
      // (about the same or a different item) as much as starting a
      // brand-new one.
      const chatRef = doc(db, 'chats', id);
      const snap = await getDoc(chatRef);
      if (cancelled) return;

      if (snap.exists()) {
        const data = snap.data();
        setChatInfo(data);
        setCached(`thread:${id}:info`, data);
        // Reopening about a different item than the thread last
        // covered — queue it to attach with the next message, same
        // as a fresh draft, rather than writing it immediately.
        if (draftListing && data.listingId !== draftListing.listingId) {
          setPendingListing(draftListing);
        }
        subscribeLive();
      } else if (draftListing) {
        // Nothing in Firestore yet. Render entirely from local state
        // until the buyer actually sends something — no chat doc, no
        // listener (the security rules can't allow reading messages
        // for a chat that doesn't exist yet, and there's nothing to
        // read anyway).
        setPendingListing(draftListing);
        setChatInfo({
          sellerId: draftListing.sellerId,
          sellerName: draftListing.sellerName,
          sellerPhoto: draftListing.sellerPhoto,
          buyerId: user.uid,
          listingId: draftListing.listingId,
          listingTitle: draftListing.listingTitle,
          listingPhoto: draftListing.listingPhoto,
        });
        setMessages([]);
      } else {
        setError("This conversation hasn't started yet — message a seller from a product page first.");
      }
    }).catch((err) => { if (!cancelled) setError(err.message || "Couldn't open this chat."); });

    return () => { cancelled = true; unsubChatRef.current(); unsubMsgsRef.current(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isSupport]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  // Marks this thread read for the current user the moment its
  // messages are showing — clears both the unread dot (lastReadAt)
  // and the numeric badge (unreadCount) shown on the chat list / nav.
  useEffect(() => {
    if (!messages.length || !auth.currentUser) return;
    updateDoc(doc(db, 'chats', id), {
      [`lastReadAt.${auth.currentUser.uid}`]: serverTimestamp(),
      [`unreadCount.${auth.currentUser.uid}`]: 0,
    }).catch(() => {});
  }, [messages.length, id]);

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
      const chatRef = doc(db, 'chats', id);
      const listingToAttach = pendingListing;
      const isBrandNew = !chatInfo?.createdAt && listingToAttach && listingToAttach.sellerId;
      // Whoever is on the other side of this thread — used to bump
      // their unread badge below and to notify them via the bot.
      const recipientUid = chatInfo?.buyerId === user.uid ? chatInfo?.sellerId : chatInfo?.buyerId;

      if (isBrandNew) {
        // First message on a brand-new thread — this is the moment
        // the chat actually comes into existence. Buyer's name/photo
        // come from their own verified profile; the seller's were
        // captured on the listing at post time from theirs.
        const myProfile = await getMyProfile(user.uid);
        await setDoc(chatRef, {
          listingId: listingToAttach.listingId,
          listingTitle: listingToAttach.listingTitle,
          listingPhoto: listingToAttach.listingPhoto,
          sellerId: listingToAttach.sellerId,
          sellerName: listingToAttach.sellerName,
          sellerPhoto: listingToAttach.sellerPhoto || '',
          buyerId: user.uid,
          buyerName: myProfile.name,
          buyerPhoto: myProfile.photo,
          participants: [listingToAttach.sellerId, user.uid],
          lastMessage: '',
          lastSenderId: '',
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
        });
      } else if (listingToAttach) {
        // Existing thread, but reopened about a different item —
        // refresh which listing the conversation card points to.
        await updateDoc(chatRef, {
          listingId: listingToAttach.listingId,
          listingTitle: listingToAttach.listingTitle,
          listingPhoto: listingToAttach.listingPhoto,
        });
      }

      if (listingToAttach) {
        await addDoc(collection(db, 'chats', id, 'messages'), {
          senderId: user.uid,
          type: 'listing',
          listingId: listingToAttach.listingId,
          listingTitle: listingToAttach.listingTitle,
          listingPhoto: listingToAttach.listingPhoto,
          listingPrice: listingToAttach.listingPrice,
          createdAt: serverTimestamp(),
        });
      }

      await addDoc(collection(db, 'chats', id, 'messages'), {
        senderId: user.uid,
        text: outgoing,
        createdAt: serverTimestamp(),
      });
      await updateDoc(chatRef, {
        lastMessage: outgoing,
        lastSenderId: user.uid,
        lastMessageAt: serverTimestamp(),
        [`lastReadAt.${user.uid}`]: serverTimestamp(),
        [`unreadCount.${user.uid}`]: 0,
        ...(recipientUid ? { [`unreadCount.${recipientUid}`]: increment(1) } : {}),
      });

      const priorChatInfo = chatInfo;
      setText('');
      setPendingListing(null);

      // The chat doc is now guaranteed to exist — start listening
      // live from here on (covers this message and every future one,
      // including the other side's replies).
      if (isBrandNew) {
        subscribeLive();
      }

      if (priorChatInfo) {
        notifyNewMessage({
          recipientUid,
          senderName: getUnsafeUserPreview()?.first_name || 'Someone',
          listingTitle: listingToAttach?.listingTitle || priorChatInfo.listingTitle,
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

  function useQuickReply(msg) {
    setText(msg);
    textareaRef.current?.focus();
  }

  const myUid = auth.currentUser?.uid;
  const amBuyer = chatInfo?.buyerId === myUid;
  const otherName = chatInfo?.isSupport
    ? SUPPORT_NAME
    : (amBuyer ? (chatInfo?.sellerName || 'Seller') : (chatInfo?.buyerName || 'Buyer'));
  const otherPhoto = chatInfo?.isSupport ? '' : (amBuyer ? chatInfo?.sellerPhoto : chatInfo?.buyerPhoto);

  const quickReplies = chatInfo?.isSupport
    ? SUPPORT_QUICK_REPLIES
    : (amBuyer ? BUYER_QUICK_REPLIES : SELLER_QUICK_REPLIES);
  // Only nudge with starter chips before the conversation has really
  // gotten going — once there's back-and-forth, canned openers just
  // clutter the composer.
  const showQuickReplies = messages.filter((m) => m.type !== 'listing').length < 2;

  // Every distinct item raised in this conversation, in a pinned
  // strip that never scrolls out of view — so which products have
  // come up stays visible no matter how long the conversation gets,
  // instead of only living in a listing card buried in the scrollback.
  const topics = [];
  const seenTopics = new Set();
  for (const m of messages) {
    if (m.type === 'listing' && !seenTopics.has(m.listingId)) {
      seenTopics.add(m.listingId);
      topics.push(m);
    }
  }

  return (
    <div className="page thread-page">
      <div className="chat-context">
        <Link to="/chat" className="chat-back" aria-label="Back to messages">
          <Icon name="chevronLeft" size={19} />
        </Link>
        {chatInfo?.isSupport ? (
          <div className="thumb-mini support-thumb"><Icon name="helpCircle" size={16} /></div>
        ) : otherPhoto ? (
          <div className="thumb-mini" style={{ backgroundImage: `url(${otherPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        ) : (
          <div className="thumb-mini" style={{ background: getAvatarColor(otherName), color: '#fff' }}>
            {getInitial(otherName)}
          </div>
        )}
        <div className="info">
          <div className="n">{otherName}</div>
          {!chatInfo?.isSupport && chatInfo?.listingTitle && <div className="t">{chatInfo.listingTitle}</div>}
        </div>
        {chatInfo?.listingId && (
          <Link to={`/product/${chatInfo.listingId}`} state={productLinkState(location)} className="p" style={{ textDecoration: 'none' }}>View</Link>
        )}
      </div>

      {topics.length > 1 && (
        <div className="chat-topics-strip">
          {topics.map((t) => (
            <Link to={`/product/${t.listingId}`} state={productLinkState(location)} className="chat-topic-chip" key={t.listingId}>
              <span
                className="chat-topic-thumb"
                style={t.listingPhoto ? { backgroundImage: `url(${t.listingPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              />
              <span>{t.listingTitle}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="thread-scroll">
        {!chatInfo?.isSupport && (
          <div className="safety-banner">
            <Icon name="shield" size={16} />
            <span>Meet the seller in person and inspect the item before you pay. Never send money in advance.</span>
          </div>
        )}

        <div className="thread">
          {/* Pending listing card for a brand-new / not-yet-attached
              draft — shown locally so the buyer sees what they're
              messaging about, before it's ever written to Firestore. */}
          {pendingListing && !messages.some((m) => m.type === 'listing' && m.listingId === pendingListing.listingId) && (
            <Link to={`/product/${pendingListing.listingId}`} state={productLinkState(location)} className="thread-listing-card">
              <div
                className="thread-listing-thumb"
                style={pendingListing.listingPhoto ? { backgroundImage: `url(${pendingListing.listingPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                {!pendingListing.listingPhoto && <Icon name="image" size={16} />}
              </div>
              <div className="thread-listing-info">
                <div className="t">{pendingListing.listingTitle}</div>
                <div className="p">{pendingListing.listingPrice} ETB</div>
              </div>
            </Link>
          )}

          {messages.map((m, i) => {
            if (m.type === 'listing') {
              return (
                <Link to={`/product/${m.listingId}`} state={productLinkState(location)} className="thread-listing-card" key={m.id}>
                  <div
                    className="thread-listing-thumb"
                    style={m.listingPhoto ? { backgroundImage: `url(${m.listingPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    {!m.listingPhoto && <Icon name="image" size={16} />}
                  </div>
                  <div className="thread-listing-info">
                    <div className="t">{m.listingTitle}</div>
                    <div className="p">{m.listingPrice} ETB</div>
                  </div>
                </Link>
              );
            }
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || dayKey(m.createdAt) !== dayKey(prev.createdAt);
            const firstInGroup = newDay || !prev || prev.senderId !== m.senderId || prev.type === 'listing';
            const lastInGroup = !next || next.senderId !== m.senderId || next.type === 'listing' || dayKey(next.createdAt) !== dayKey(m.createdAt);
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
      </div>

      {error && (
        <div className="error-banner">
          <Icon name="x" size={14} />
          <span>{error}</span>
        </div>
      )}

      {showQuickReplies && (
        <div className="quick-replies">
          {quickReplies.map((qr) => (
            <button type="button" className="quick-reply-chip" key={qr} onClick={() => useQuickReply(qr)}>
              {qr}
            </button>
          ))}
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
          placeholder="Message"
        />
        <button className="send-btn" onClick={send} disabled={sending || !text.trim()}>
          <Icon name="send" size={17} />
        </button>
      </div>
    </div>
  );
}
