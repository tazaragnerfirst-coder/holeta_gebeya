import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, addDoc, doc, serverTimestamp, orderBy, query, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db, ensureLoggedIn } from '../lib/firebase';
import Icon from '../components/Icon.jsx';

export default function ChatThread() {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    ensureLoggedIn().then(() => {
      const q = query(collection(db, 'chats', id, 'messages'), orderBy('createdAt', 'asc'));
      return onSnapshot(q, (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    }).catch((err) => console.error(err));
  }, [id]);

  async function send() {
    if (!text.trim()) return;
    try {
      const user = await ensureLoggedIn();
      await addDoc(collection(db, 'chats', id, 'messages'), {
        senderId: user.uid,
        text,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'chats', id), { lastMessage: text, lastMessageAt: serverTimestamp() });
      setText('');
    } catch (err) {
      alert(`Couldn't send: ${err.message || err}`);
    }
  }

  return (
    <div className="page thread-page">
      <div className="safety-banner">
        <Icon name="shield" size={16} />
        <span>Meet the seller in person and inspect the item before you pay. Never send money in advance.</span>
      </div>
      <div className="thread">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.senderId === auth.currentUser?.uid ? 'me' : 'them'}`}>{m.text}</div>
        ))}
      </div>
      <div className="chat-input-row">
        <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className="send-btn" onClick={send}><Icon name="send" size={17} /></button>
      </div>
    </div>
  );
}
