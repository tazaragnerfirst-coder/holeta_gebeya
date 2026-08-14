import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { getUnsafeUserPreview } from '../lib/telegram';
import { fileToCompressedBase64 } from '../lib/imageCompress';
import { CATEGORIES, getSubcategory } from '../data/categories';
import DynamicAttributeForm from '../components/DynamicAttributeForm.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import ChipSelect from '../components/ChipSelect.jsx';

export default function PostAd() {
  const navigate = useNavigate();
  const requireRegistered = useRequireRegistered();
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
  const [errors, setErrors] = useState({});

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const subcategory = category && subcategoryId ? getSubcategory(categoryId, subcategoryId) : null;

  function onCategoryChange(id) {
    setCategoryId(id);
    setSubcategoryId('');
    setAttrs({});
    setErrors((e) => ({ ...e, categoryId: undefined, subcategoryId: undefined }));
  }
  function onSubcategoryChange(id) {
    setSubcategoryId(id);
    setAttrs({});
    setErrors((e) => ({ ...e, subcategoryId: undefined }));
  }

  // Validates every required field and returns a map of field key ->
  // human-readable message explaining what's missing and how to fix
  // it. Dynamic attribute errors are nested under `attrs`.
  function validate() {
    const errs = {};
    if (!categoryId) errs.categoryId = 'Select a category to continue.';
    if (categoryId && !subcategoryId) errs.subcategoryId = 'Select a subcategory to continue.';
    if (!title.trim()) errs.title = 'Title is required — give buyers a short, clear name for the item.';
    if (!price || Number(price) <= 0) errs.price = 'Enter a valid price greater than 0.';

    const attrErrs = {};
    if (subcategory) {
      for (const attr of subcategory.attributes) {
        if (attr.required && !attrs[attr.key]) {
          attrErrs[attr.key] = `${attr.label} is required — select it above.`;
        }
      }
    }
    if (Object.keys(attrErrs).length > 0) errs.attrs = attrErrs;
    return errs;
  }

  async function submit() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Scroll the first invalid field into view so the person isn't
      // left guessing which one needs attention.
      document.querySelector('.field-group.has-error, .has-error .field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    setStatusMsg('Signing in...');
    try {
      // Registration (Telegram sign-in + phone/full name) is only
      // requested at the moment of posting — browsing never requires it.
      const user = await requireRegistered();

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
      const isColdStart = /fetch|network|failed/i.test(err.message || '');
      setErrors({ submit: `Couldn't post your ad: ${err.message || err}.${isColdStart ? ' If this is the first request in a while, the server may still be waking up — please try again in 30 seconds.' : ''}` });
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

        <div className={`field-group ${errors.categoryId ? 'has-error' : ''}`}>
          <label className="field-label">Category<span className="req">*</span></label>
          <ChipSelect
            options={CATEGORIES.map((c) => ({ label: c.name, value: c.id }))}
            value={categoryId}
            onChange={onCategoryChange}
          />
          {errors.categoryId && <p className="field-error">{errors.categoryId}</p>}
        </div>

        {category && (
          <div className={`field-group ${errors.subcategoryId ? 'has-error' : ''}`}>
            <label className="field-label">Subcategory<span className="req">*</span></label>
            <ChipSelect
              options={category.subcategories.map((s) => ({ label: s.name, value: s.id }))}
              value={subcategoryId}
              onChange={onSubcategoryChange}
            />
            {errors.subcategoryId && <p className="field-error">{errors.subcategoryId}</p>}
          </div>
        )}

        {/* This is where Jiji-style specs appear: brand → popular
            models → RAM/storage/screen size/etc, driven entirely by
            src/data/categories.js — add a subcategory there and its
            form appears here automatically. */}
        {subcategory && (
          <DynamicAttributeForm attributes={subcategory.attributes} values={attrs} onChange={setAttrs} errors={errors.attrs || {}} />
        )}

        <div className={`field-group ${errors.title ? 'has-error' : ''}`}>
          <label className="field-label">Title<span className="req">*</span></label>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Samsung Galaxy A54, 128GB" />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>
        <div className={`field-group ${errors.price ? 'has-error' : ''}`}>
          <label className="field-label">Price (ETB)<span className="req">*</span></label>
          <input className="field" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          {errors.price && <p className="field-error">{errors.price}</p>}
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

        {errors.submit && (
          <div className="error-banner">
            <span>{errors.submit}</span>
          </div>
        )}

        <button className="btn btn-primary" disabled={submitting} onClick={submit}>
          {submitting ? (statusMsg || 'Posting...') : 'Continue'}
        </button>
        {submitting && <p className="helper-text" style={{ textAlign: 'center' }}>First post after a while can take up to 30s while the server wakes up.</p>}
      </div>
    </div>
  );
}
