import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  doc, onSnapshot, collection, addDoc, setDoc, updateDoc, increment,
  query, where, limit, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db, BACKEND_URL } from '../lib/firebase';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { getUnsafeUserPreview } from '../lib/telegram';
import Icon from '../components/Icon.jsx';
import ImageCarousel from '../components/ImageCarousel.jsx';
import StarRow from '../components/StarRow.jsx';
import ReviewSheet from '../components/ReviewSheet.jsx';
import ReportSheet from '../components/ReportSheet.jsx';
import CallSheet from '../components/CallSheet.jsx';
import { ProductDetailSkeleton } from '../components/Skeletons.jsx';
import { getCached, setCached } from '../lib/pageCache';

function timeAgo(ts) {
  if (!ts?.toDate) return '';
  const min = Math.floor((Date.now() - ts.toDate().getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const requireRegistered = useRequireRegistered();
  const [item, setItem] = useState(() => getCached(`product:${id}`) || null);
  const [notFound, setNotFound] = useState(false);
  const [chatError, setChatError] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  const [callSheetOpen, setCallSheetOpen] = useState(false);
  const [callBusy, setCallBusy] = useState(false);
  const [sellerPhone, setSellerPhone] = useState('');

  const [similar, setSimilar] = useState([]);

  const [reviews, setReviews] = useState([]);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    setItem(getCached(`product:${id}`) || null);
    setNotFound(false);
    const unsub = onSnapshot(doc(db, 'listings', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setItem(data);
        setCached(`product:${id}`, data);
      } else {
        setNotFound(true);
      }
    }, () => setNotFound(true));
    return unsub;
  }, [id]);

  // Count a view once per visit, after a couple seconds of real
  // dwell time (skips people who bounce straight back). Anyone can
  // bump this counter — it's a public, low-stakes stat, so it isn't
  // gated behind an account (browsing stays account-free).
  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => {
      updateDoc(doc(db, 'listings', id), { views: increment(1) }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [id]);

  // Other listings in the same category, for the "You might also
  // like" row. No composite index needed: filter by category only,
  // sort client-side.
  useEffect(() => {
    if (!item?.category) return;
    getDocs(query(collection(db, 'listings'), where('category', '==', item.category), limit(12)))
      .then((snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => l.id !== item.id)
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
          .slice(0, 6);
        setSimilar(data);
      })
      .catch(() => {});
  }, [item?.category, item?.id]);

  // Seller's reviews, for the rating summary + review list.
  useEffect(() => {
    if (!item?.sellerId) return;
    getDocs(query(collection(db, 'reviews'), where('sellerId', '==', item.sellerId)))
      .then((snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setReviews(data);
      })
      .catch(() => {});
  }, [item?.sellerId]);

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

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

      // Auto-attach a small listing reference as the first item in
      // the thread, so the seller immediately knows which item this
      // conversation is about instead of a bare "hi" with no context.
      await addDoc(collection(db, 'chats', chatRef.id, 'messages'), {
        senderId: user.uid,
        type: 'listing',
        listingId: id,
        listingTitle: item.title,
        listingPhoto: item.images?.[0] || '',
        listingPrice: item.price,
        createdAt: serverTimestamp(),
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
    setCallBusy(true);
    try {
      const user = await requireRegistered();
      const idToken = await user.getIdToken();
      const r = await fetch(`${BACKEND_URL}/getSellerPhone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, sellerId: item.sellerId }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Couldn't get the seller's number.");
      setSellerPhone(data.phone);
      setCallSheetOpen(true);
    } catch (err) {
      setChatError(err.message || "Couldn't verify your account. Please try again.");
    } finally {
      setCallBusy(false);
    }
  }

  async function submitReview({ rating, comment }) {
    setReviewBusy(true);
    setReviewError('');
    try {
      const user = await requireRegistered();
      const reviewId = `${item.id}_${user.uid}`;
      await setDoc(doc(db, 'reviews', reviewId), {
        listingId: item.id,
        sellerId: item.sellerId,
        buyerId: user.uid,
        buyerName: getUnsafeUserPreview()?.first_name || 'Buyer',
        rating,
        comment,
        createdAt: serverTimestamp(),
      }, { merge: true });
      setReviewSheetOpen(false);
      const snap = await getDocs(query(collection(db, 'reviews'), where('sellerId', '==', item.sellerId)));
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    } catch (err) {
      setReviewError(err.message || "Couldn't submit your review. Please try again.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function submitReport({ reason, note }) {
    setReportBusy(true);
    setReportError('');
    try {
      const user = await requireRegistered();
      await addDoc(collection(db, 'reports'), {
        listingId: item.id,
        reporterId: user.uid,
        reason,
        note,
        createdAt: serverTimestamp(),
      });
      setReportSheetOpen(false);
      setReportDone(true);
    } catch (err) {
      setReportError(err.message || "Couldn't submit your report. Please try again.");
    } finally {
      setReportBusy(false);
    }
  }

  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
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

  const hasAttrs = item.attributes && Object.values(item.attributes).some((v) => v !== '' && v !== undefined);
  const sellerInitial = (item.sellerName || 'S')[0].toUpperCase();

  return (
    <div className="pd-page">
      <ImageCarousel
        images={item.images || []}
        left={<button type="button" className="pd-hero-btn" onClick={goBack} aria-label="Back"><Icon name="chevronLeft" size={20} /></button>}
        right={<button type="button" className="pd-hero-btn" onClick={() => setReportSheetOpen(true)} aria-label="Report"><Icon name="flag" size={17} /></button>}
      />

      <div className="pd-body">
        <div className="pd-price-row">
          <div className="pd-price">{item.price} ETB</div>
          <div className="cond-badge">{item.condition}</div>
        </div>
        <div className="pd-title">{item.title}</div>
        <div className="pd-meta-row">
          <span><Icon name="mapPin" size={13} /> {item.location}</span>
          <span><Icon name="grid" size={13} /> {item.category} / {item.subcategory}</span>
        </div>
        <div className="pd-stats-row">
          <span><Icon name="eye" size={13} /> {item.views || 0} views</span>
          {item.createdAt && <span><Icon name="clock" size={13} /> Posted {timeAgo(item.createdAt)}</span>}
        </div>

        <div className="seller-card">
          <div className="seller-avatar">{sellerInitial}</div>
          <div className="seller-info">
            <div className="seller-name">{item.sellerName || 'Seller'}</div>
            <div className="seller-meta">
              <StarRow value={avgRating} size={12} />
              <span>{reviews.length ? `${avgRating.toFixed(1)} (${reviews.length})` : 'No ratings yet'}</span>
            </div>
          </div>
        </div>

        {hasAttrs && (
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

        <div className="pd-reviews">
          <div className="pd-reviews-head">
            <h4>Ratings & Reviews</h4>
            <button type="button" className="link-btn" onClick={() => setReviewSheetOpen(true)}>Leave a review</button>
          </div>
          {reviews.length === 0 && <p className="no-reviews">No reviews yet — be the first to rate this seller.</p>}
          {reviews.slice(0, 3).map((r) => (
            <div className="review-item" key={r.id}>
              <div className="review-top">
                <span className="review-name">{r.buyerName}</span>
                <span className="review-date">{timeAgo(r.createdAt)}</span>
              </div>
              <StarRow value={r.rating} size={12} />
              {r.comment && <p className="review-comment">{r.comment}</p>}
            </div>
          ))}
        </div>

        {similar.length > 0 && (
          <>
            <h3 className="section-title">You might also like</h3>
            <div className="boost-scroll">
              {similar.map((s) => (
                <Link to={`/product/${s.id}`} className="listing-card boost-card" key={s.id}>
                  <div
                    className="thumb"
                    style={s.images?.[0] ? { backgroundImage: `url(${s.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    {!s.images?.[0] && <div className="thumb-placeholder"><Icon name="image" size={22} /></div>}
                  </div>
                  <div className="card-body">
                    <div className="card-price">{s.price} ETB</div>
                    <div className="card-title">{s.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {reportDone && (
          <div className="ok-banner">
            <Icon name="checkCircle" size={14} />
            <span>Thanks — our team will review this listing.</span>
          </div>
        )}
        {chatError && (
          <div className="error-banner">
            <Icon name="x" size={14} />
            <span>{chatError}</span>
          </div>
        )}
      </div>

      <div className="pd-float-actions">
        <button className="btn btn-outline-primary" onClick={call} disabled={callBusy}>
          <Icon name="phone" size={16} /> {callBusy ? 'Loading…' : 'Call'}
        </button>
        <button className="btn btn-primary" onClick={startChat} disabled={startingChat}>
          <Icon name="chat" size={16} /> {startingChat ? 'Opening…' : 'Chat with Seller'}
        </button>
      </div>

      <ReviewSheet
        open={reviewSheetOpen}
        busy={reviewBusy}
        error={reviewError}
        onClose={() => setReviewSheetOpen(false)}
        onSubmit={submitReview}
      />
      <ReportSheet
        open={reportSheetOpen}
        busy={reportBusy}
        error={reportError}
        onClose={() => setReportSheetOpen(false)}
        onSubmit={submitReport}
      />
      <CallSheet
        open={callSheetOpen}
        phone={sellerPhone}
        sellerName={item.sellerName}
        onClose={() => setCallSheetOpen(false)}
      />
    </div>
  );
}
