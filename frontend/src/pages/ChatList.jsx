import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, ensureLoggedIn } from '../lib/firebase';
import Icon from '../components/Icon.jsx';

export default function ChatList() {
  const [chats, setChats] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureLoggedIn().then((user) => {
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

  return (
    <div className="page">
      <h2 className="page-title">Messages</h2>
      {!ready && <p className="helper-text">Loading conversations...</p>}
      {ready && chats.length === 0 && <p className="helper-text">No conversations yet. Message a seller from a product page to start one.</p>}
      {chats.map((c) => (
        <Link to={`/chat/${c.id}`} className="chat-list-item" key={c.id}>
          <div className="chat-thumb"><Icon name="image" size={18} /></div>
          <div className="chat-info">
            <div className="top"><span className="name">{c.listingTitle || 'Listing'}</span></div>
            <div className="msg">{c.lastMessage || 'No messages yet'}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
