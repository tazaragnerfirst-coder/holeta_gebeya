import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, ensureLoggedIn } from '../lib/firebase';

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
    const user = await ensureLoggedIn();
    const chatRef = await addDoc(collection(db, 'chats'), {
      listingId: id,
      sellerId: item.sellerId,
      buyerId: user.uid,
      participants: [item.sellerId, user.uid],
      createdAt: serverTimestamp(),
    });
    navigate(`/chat/${chatRef.id}`);
  }

  if (!item) return <div className="page"><p className="helper-text">Loading...</p></div>;

  return (
    <div className="page">
      <div className="carousel" style={item.images?.[0] ? { backgroundImage: `url(${item.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: item.color || '#8FA998' }} />
      <div className="pd-body">
        <div className="pd-price-row">
          <div className="pd-price">{item.price} ETB</div>
          <div className="cond-badge">{item.condition}</div>
        </div>
        <div className="pd-title">{item.title}</div>
        <div className="pd-meta-row">{item.location} · {item.category} / {item.subcategory}</div>

        {item.attributes && (
          <div className="attr-list">
            {Object.entries(item.attributes).map(([k, v]) => (
              v !== '' && v !== undefined && <div className="attr-row" key={k}><span>{k}</span><span>{String(v)}</span></div>
            ))}
          </div>
        )}

        <div className="pd-desc">
          <h4>Description</h4>
          <p>{item.description}</p>
        </div>

        <div className="safety-banner">
          Meet the seller in person and inspect the item before you pay. Never send money in advance.
        </div>
      </div>
      <div className="sticky-actions">
        <button className="btn btn-outline-primary" onClick={() => ensureLoggedIn().then(() => alert('Calling — number revealed after login.'))}>Call</button>
        <button className="btn btn-primary" onClick={startChat}>Chat with Seller</button>
      </div>
    </div>
  );
}
