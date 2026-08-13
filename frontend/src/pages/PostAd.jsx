import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, ensureLoggedIn } from '../lib/firebase';
import { getUnsafeUserPreview } from '../lib/telegram';
import { fileToCompressedBase64 } from '../lib/imageCompress';
import { CATEGORIES, getSubcategory } from '../data/categories';
import DynamicAttributeForm from '../components/DynamicAttributeForm.jsx';
import ImageUploader from '../components/ImageUploader.jsx';

export default function PostAd() {
  const navigate = useNavigate();
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [attrs, setAttrs] = useState({});
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Holeta');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const subcategory = category && subcategoryId ? getSubcategory(categoryId, subcategoryId) : null;

  function onCategoryChange(id) {
    setCategoryId(id);
    setSubcategoryId('');
    setAttrs({});
  }
  function onSubcategoryChange(id) {
    setSubcategoryId(id);
    setAttrs({});
  }

  async function submit() {
    if (!title || !price || !categoryId || !subcategoryId) {
      alert('Please fill in title, price and category.');
      return;
    }
    setSubmitting(true);
    setStatusMsg('Signing in...');
    try {
      // Login is only requested at the moment of posting — browsing
      // and viewing never require it. The backend can take ~30s to
      // wake up on its first request after being idle (free tier).
      const user = await ensureLoggedIn();

      // Photos are resized + compressed client-side and stored as
      // base64 strings directly on the listing document — no
      // Firebase Storage (which needs the paid Blaze plan) involved.
      let compressedImages = [];
      if (images.length > 0) {
        setStatusMsg(`Processing photos (0/${images.length})...`);
        for (let i = 0; i < images.length; i++) {
          const dataUrl = await fileToCompressedBase64(images[i]);
          compressedImages.push(dataUrl);
          setStatusMsg(`Processing photos (${i + 1}/${images.length})...`);
        }
      }

      setStatusMsg('Publishing...');
      // Display name is taken from Telegram's own client-side preview
      // (not a Firestore read of another user's doc — that's blocked
      // by firestore.rules) and stored on the listing so buyers can
      // see who they'd be chatting with without any extra reads.
      const sellerName = getUnsafeUserPreview()?.first_name || 'Seller';

      const ref2 = await addDoc(collection(db, 'listings'), {
        sellerId: user.uid,
        sellerName,
        title,
        price: Number(price),
        description,
        location,
        category: categoryId,
        subcategory: subcategoryId,
        attributes: attrs,
        condition: attrs.condition || '',
        images: compressedImages,
        createdAt: serverTimestamp(),
        boostedUntil: null,
        views: 0,
        status: 'active',
      });
      navigate(`/product/${ref2.id}`);
    } catch (err) {
      console.error(err);
      alert(`Couldn't post your ad: ${err.message || err}\n\nIf this is the first request in a while, the server may still be waking up — please try again in 30 seconds.`);
    } finally {
      setSubmitting(false);
      setStatusMsg('');
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">Post an Ad</h2>

      <div className="form-block">
        <div className="field-group">
          <label className="field-label">Photos</label>
          <ImageUploader files={images} onChange={setImages} maxImages={5} />
        </div>

        <div className="field-group">
          <label className="field-label">Category</label>
          <select className="field" value={categoryId} onChange={(e) => onCategoryChange(e.target.value)}>
            <option value="">Select category...</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {category && (
          <div className="field-group">
            <label className="field-label">Subcategory</label>
            <select className="field" value={subcategoryId} onChange={(e) => onSubcategoryChange(e.target.value)}>
              <option value="">Select subcategory...</option>
              {category.subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {/* This is where Jiji-style specs appear: brand → popular
            models → RAM/storage/screen size/etc, driven entirely by
            src/data/categories.js — add a subcategory there and its
            form appears here automatically. */}
        {subcategory && (
          <DynamicAttributeForm attributes={subcategory.attributes} values={attrs} onChange={setAttrs} />
        )}

        <div className="field-group">
          <label className="field-label">Title</label>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Samsung Galaxy A54, 128GB" />
        </div>
        <div className="field-group">
          <label className="field-label">Price (ETB)</label>
          <input className="field" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Description</label>
          <textarea className="field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Extra details about the item..." />
        </div>
        <div className="field-group">
          <label className="field-label">Location</label>
          <select className="field" value={location} onChange={(e) => setLocation(e.target.value)}>
            {['Holeta', 'Addis Ababa', 'Bahir Dar', 'Hawassa', 'Dire Dawa', 'Gondar', 'Mekelle'].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        <button className="btn btn-primary" disabled={submitting} onClick={submit}>
          {submitting ? (statusMsg || 'Posting...') : 'Continue'}
        </button>
        {submitting && <p className="helper-text" style={{ textAlign: 'center' }}>First post after a while can take up to 30s while the server wakes up.</p>}
      </div>
    </div>
  );
}
