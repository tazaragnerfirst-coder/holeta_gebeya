import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, ensureLoggedIn } from '../lib/firebase';
import { CATEGORIES, getSubcategory } from '../data/categories';
import DynamicAttributeForm from '../components/DynamicAttributeForm.jsx';

export default function PostAd() {
  const navigate = useNavigate();
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [attrs, setAttrs] = useState({});
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Holeta');
  const [submitting, setSubmitting] = useState(false);

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
    try {
      // Login is only requested at the moment of posting — browsing
      // and viewing never require it.
      const user = await ensureLoggedIn();
      const ref = await addDoc(collection(db, 'listings'), {
        sellerId: user.uid,
        title,
        price: Number(price),
        description,
        location,
        category: categoryId,
        subcategory: subcategoryId,
        attributes: attrs,
        condition: attrs.condition || '',
        createdAt: serverTimestamp(),
        boostedUntil: null,
        views: 0,
        status: 'active',
      });
      navigate(`/product/${ref.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">Post an Ad</h2>

      <div className="form-block">
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
          {submitting ? 'Posting...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
