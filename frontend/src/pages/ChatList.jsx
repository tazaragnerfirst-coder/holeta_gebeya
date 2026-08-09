import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db, ensureLoggedIn } from '../lib/firebase';

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
    });
  }, []);

  if (!ready) return <div className="page"><p className="helper-text">Loading conversations...</p></div>;
  if (chats.length === 0) return <div className="page"><p className="helper-text">No conversations yet. Message a seller from a product page to start one.</p></div>;

  return (
    <div className="page">
      <h2 className="page-title">Messages</h2>
      {chats.map((c) => (
        <Link to={`/chat/${c.id}`} className="chat-list-item" key={c.id}>
          <div className="chat-info">
            <div className="top"><span className="name">{c.listingTitle || 'Listing'}</span></div>
            <div className="msg">{c.lastMessage || 'No messages yet'}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
