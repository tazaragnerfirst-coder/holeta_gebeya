import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, ensureLoggedIn } from '../lib/firebase';
import Icon from '../components/Icon.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);

  useEffect(() => {
    getDoc(doc(db, 'listings', id)).then((snap) => {
      if (snap.exists()) setItem({ id: snap.id, ...snap.data() });
    });
  }, [id]);

  // Auth is only requested HERE — the moment the user wants to act
  // (message the seller), never before this point.
  async function startChat() {
    try {
      const user = await ensureLoggedIn();
      const chatRef = await addDoc(collection(db, 'chats'), {
        listingId: id,
        listingTitle: item.title,
        sellerId: item.sellerId,
        buyerId: user.uid,
        participants: [item.sellerId, user.uid],
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });
      navigate(`/chat/${chatRef.id}`);
    } catch (err) {
      alert(`Couldn't start chat: ${err.message || err}`);
    }
  }

  if (!item) return <div className="page"><p className="helper-text">Loading...</p></div>;

  return (
    <div className="page" style={{ padding: 0 }}>
      <div className="carousel" style={item.images?.[0] ? { backgroundImage: `url(${item.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: '#8FA998' }}>
        {!item.images?.[0] && <div className="thumb-placeholder"><Icon name="image" size={30} /></div>}
      </div>
      <div className="pd-body px">
        <div className="pd-price-row">
          <div className="pd-price">{item.price} ETB</div>
          <div className="cond-badge">{item.condition}</div>
        </div>
        <div className="pd-title">{item.title}</div>
        <div className="pd-meta-row">
          <span><Icon name="mapPin" size={13} /> {item.location}</span>
          <span><Icon name="grid" size={13} /> {item.category} / {item.subcategory}</span>
        </div>

        {item.attributes && Object.values(item.attributes).some((v) => v !== '' && v !== undefined) && (
          <div className="attr-list">
            {Object.entries(item.attributes).map(([k, v]) => (
              v !== '' && v !== undefined && <div className="attr-row" key={k}><span>{k}</span><span>{String(v)}</span></div>
            ))}
          </div>
        )}

        <div className="pd-desc">
          <h4>Description</h4>
          <p>{item.description || 'No description provided.'}</p>
        </div>

        <div className="safety-banner">
          <Icon name="shield" size={16} />
          <span>Meet the seller in person and inspect the item before you pay. Never send money in advance.</span>
        </div>
      </div>
      <div className="sticky-actions">
        <button className="btn btn-outline-primary" onClick={() => ensureLoggedIn().then(() => alert('Calling — number revealed after login.')).catch((e) => alert(e.message))}>
          <Icon name="phone" size={16} /> Call
        </button>
        <button className="btn btn-primary" onClick={startChat}>
          <Icon name="chat" size={16} /> Chat with Seller
        </button>
      </div>
    </div>
  );
}
