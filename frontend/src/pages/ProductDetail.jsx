import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { getUnsafeUserPreview } from '../lib/telegram';
import Icon from '../components/Icon.jsx';
import { ProductDetailSkeleton } from '../components/Skeletons.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const requireRegistered = useRequireRegistered();
  const [item, setItem] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [chatError, setChatError] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'listings', id)).then((snap) => {
      if (snap.exists()) setItem({ id: snap.id, ...snap.data() });
      else setNotFound(true);
    }).catch(() => setNotFound(true));
  }, [id]);

  // Registration is only requested HERE — the moment the user wants
  // to act (message the seller), never before this point.
  async function startChat() {
    if (startingChat) return;
    setChatError('');
    setStartingChat(true);
    try {
      const user = await requireRegistered();

      // Reuse an existing thread for this listing+buyer instead of
      // creating a duplicate every time "Chat with Seller" is tapped.
      const existing = await getDocs(query(
        collection(db, 'chats'),
        where('listingId', '==', id),
        where('buyerId', '==', user.uid),
        limit(1)
      ));
      if (!existing.empty) {
        navigate(`/chat/${existing.docs[0].id}`);
        return;
      }

      const buyerName = getUnsafeUserPreview()?.first_name || 'Buyer';
      const chatRef = await addDoc(collection(db, 'chats'), {
        listingId: id,
        listingTitle: item.title,
        listingPhoto: item.images?.[0] || '',
        sellerId: item.sellerId,
        sellerName: item.sellerName || 'Seller',
        buyerId: user.uid,
        buyerName,
        participants: [item.sellerId, user.uid],
        lastMessage: '',
        lastSenderId: '',
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });
      navigate(`/chat/${chatRef.id}`);
    } catch (err) {
      setChatError(err.message || "Couldn't start chat. Please try again.");
    } finally {
      setStartingChat(false);
    }
  }

  async function call() {
    setChatError('');
    try {
      await requireRegistered();
      alert('Calling — number revealed after login.');
    } catch (err) {
      setChatError(err.message || "Couldn't verify your account. Please try again.");
    }
  }

  if (notFound) {
    return (
      <div className="page">
        <div className="error-banner">
          <Icon name="x" size={14} />
          <span>This listing couldn't be found — it may have been removed.</span>
        </div>
      </div>
    );
  }
  if (!item) return <ProductDetailSkeleton />;

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

        {chatError && (
          <div className="error-banner">
            <Icon name="x" size={14} />
            <span>{chatError}</span>
          </div>
        )}
      </div>
      <div className="sticky-actions">
        <button className="btn btn-outline-primary" onClick={call}>
          <Icon name="phone" size={16} /> Call
        </button>
        <button className="btn btn-primary" onClick={startChat} disabled={startingChat}>
          <Icon name="chat" size={16} /> {startingChat ? 'Opening…' : 'Chat with Seller'}
        </button>
      </div>
    </div>
  );
}
