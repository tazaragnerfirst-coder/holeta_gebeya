import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, BACKEND_URL } from '../lib/firebase';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { getMyProfile } from '../lib/profile';
import { fileToCompressedBase64 } from '../lib/imageCompress';
import { computeExpiresAt } from '../lib/adStatus';
import { CATEGORIES, getSubcategory, sortByPopular, buildSuggestedTitle, DESCRIPTION_MIN_WORDS, DESCRIPTION_HINTS } from '../data/categories';
import DynamicAttributeForm from '../components/DynamicAttributeForm.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import ChipSelect from '../components/ChipSelect.jsx';
import { ErrorBanner } from '../components/Banner.jsx';

export default function PostAd() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = !!editId;
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
  const [titleTouched, setTitleTouched] = useState(false);
  // Only relevant in edit mode: blocks the form until the existing
  // listing's fields have loaded, since category/subcategory pickers
  // need to be pre-selected before rendering makes sense.
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'listings', editId));
        if (cancelled) return;
        if (!snap.exists()) {
          setLoadError('This ad no longer exists.');
          return;
        }
        const a = snap.data();
        setCategoryId(a.category || '');
        setSubcategoryId(a.subcategory || '');
        setAttrs(a.attributes || {});
        setTitle(a.title || '');
        setTitleTouched(true); // don't let the auto-suggest effect overwrite the loaded title
        setPrice(a.price != null ? String(a.price) : '');
        setDescription(a.description || '');
        setLocation(a.location || 'Holeta');
        setImages(a.images || []); // existing images stay as data-URL strings until re-saved
      } catch (err) {
        console.error(err);
        if (!cancelled) setLoadError("Couldn't load this ad. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEdit, editId]);

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const subcategory = category && subcategoryId ? getSubcategory(categoryId, subcategoryId) : null;
  const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;

  function onCategoryChange(id) {
    setCategoryId(id);
    setSubcategoryId('');
    setAttrs({});
    setTitleTouched(false);
    setTitle('');
    setErrors((e) => ({ ...e, categoryId: undefined, subcategoryId: undefined }));
  }
  function onSubcategoryChange(id) {
    setSubcategoryId(id);
    setAttrs({});
    setTitleTouched(false);
    setErrors((e) => ({ ...e, subcategoryId: undefined }));
  }

  // Keep the title in sync with brand/model/etc as the person fills
  // in the form — but stop the moment they type into the Title field
  // themselves, so their edit is never silently overwritten.
  useEffect(() => {
    if (titleTouched) return;
    const suggested = buildSuggestedTitle(category, subcategory, attrs);
    if (suggested) setTitle(suggested);
  }, [category, subcategory, attrs, titleTouched]);

  function addHintToDescription(hint) {
    setDescription((d) => (d.trim() ? `${d.trim()}\n${hint}: ` : `${hint}: `));
  }

  // Validates every required field and returns a map of field key ->
  // human-readable message explaining what's missing and how to fix
  // it. Dynamic attribute errors are nested under `attrs`.
  function validate() {
    const errs = {};
    if (images.length === 0) errs.photos = 'Add at least 1 photo — listings without photos get far fewer replies.';
    if (!categoryId) errs.categoryId = 'Select a category to continue.';
    if (categoryId && !subcategoryId) errs.subcategoryId = 'Select a subcategory to continue.';
    if (!title.trim()) errs.title = 'Title is required — give buyers a short, clear name for the item.';
    if (!price || Number(price) <= 0) errs.price = 'Enter a valid price greater than 0.';
    if (wordCount > 0 && wordCount < DESCRIPTION_MIN_WORDS) errs.description = `Add a bit more detail — at least ${DESCRIPTION_MIN_WORDS} words helps buyers trust the listing.`;
    else if (wordCount === 0) errs.description = `Description is required — at least ${DESCRIPTION_MIN_WORDS} words about condition, accessories, etc.`;

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
      // In edit mode, images already saved from before arrive here as
      // plain data-URL strings (from the loaded doc) and are kept
      // as-is; only newly-picked File objects need compressing.
      let compressedImages = [];
      if (images.length > 0) {
        setStatusMsg(`Processing photos (0/${images.length})...`);
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          compressedImages.push(typeof img === 'string' ? img : await fileToCompressedBase64(img));
          setStatusMsg(`Processing photos (${i + 1}/${images.length})...`);
        }
      }

      setStatusMsg(isEdit ? 'Saving...' : 'Publishing...');
      // Display name + avatar come from the seller's own verified
      // profile (users/{uid}.fullName / photoUrl, set at signup and
      // from Telegram) — not just the unsafe client-side preview —
      // so buyers see who they'd actually be chatting with.
      const myProfile = await getMyProfile(user.uid);
      const sellerName = myProfile.name;
      const sellerPhoto = myProfile.photo;

      const payload = {
        sellerId: user.uid,
        sellerName,
        sellerPhoto,
        title,
        price: Number(price),
        description,
        location,
        category: categoryId,
        subcategory: subcategoryId,
        attributes: attrs,
        condition: attrs.condition || '',
        images: compressedImages,
      };

      if (isEdit) {
        // Edits don't touch createdAt/views/expiresAt/status — those
        // are owned by the post flow and the Renew action respectively.
        await updateDoc(doc(db, 'listings', editId), payload);
        navigate(`/product/${editId}`);
      } else {
        const ref2 = await addDoc(collection(db, 'listings'), {
          ...payload,
          createdAt: serverTimestamp(),
          expiresAt: computeExpiresAt(),
          boostedUntil: null,
          views: 0,
          status: 'active',
        });
        // Records lastPostAt on the user's profile so the 2-minute
        // cooldown (enforced in firestore.rules) applies to the next
        // post attempt. Best-effort — the post above already
        // succeeded, so a failure here shouldn't block navigation.
        try {
          const idToken = await auth.currentUser.getIdToken();
          fetch(`${BACKEND_URL}/recordPost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          }).catch(() => {});
        } catch {}
        navigate(`/product/${ref2.id}`);
      }
    } catch (err) {
      console.error(err);
      const isColdStart = /fetch|network|failed/i.test(err.message || '');
      const isCooldown = err.code === 'permission-denied' && !isEdit;
      setErrors({
        submit: isCooldown
          ? "You're posting a bit too quickly — please wait a couple of minutes and try again."
          : `Couldn't ${isEdit ? 'save' : 'post'} your ad: ${err.message || err}.${isColdStart ? ' If this is the first request in a while, the server may still be waking up — please try again in 30 seconds.' : ''}`,
      });
    } finally {
      setSubmitting(false);
      setStatusMsg('');
    }
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="page">
        <h2 className="page-title">Edit Ad</h2>
        <p className="helper-text">Loading...</p>
      </div>
    );
  }
  if (isEdit && loadError) {
    return (
      <div className="page">
        <h2 className="page-title">Edit Ad</h2>
        <p className="helper-text error-text">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h2 className="page-title">{isEdit ? 'Edit Ad' : 'Post an Ad'}</h2>

      <div className="form-block">
        <div className={`field-group ${errors.photos ? 'has-error' : ''}`}>
          <label className="field-label">Photos<span className="req">*</span></label>
          <ImageUploader files={images} onChange={setImages} maxImages={5} />
          {errors.photos && <p className="field-error">{errors.photos}</p>}
        </div>

        <div className={`field-group ${errors.categoryId ? 'has-error' : ''}`}>
          <label className="field-label">Category<span className="req">*</span></label>
          <ChipSelect
            options={sortByPopular(CATEGORIES).map((c) => ({ label: c.name, value: c.id }))}
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

        {subcategory && (
          <>
            <div className={`field-group ${errors.title ? 'has-error' : ''}`}>
              <label className="field-label">Title<span className="req">*</span></label>
              <input
                className="field"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }}
                placeholder="e.g. Samsung Galaxy A54, 128GB"
              />
              {!errors.title && <p className="helper-text">Filled in automatically from your selections above — edit it if you'd like.</p>}
              {errors.title && <p className="field-error">{errors.title}</p>}
            </div>
            <div className={`field-group ${errors.price ? 'has-error' : ''}`}>
              <label className="field-label">Price (ETB)<span className="req">*</span></label>
              <input className="field" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              {errors.price && <p className="field-error">{errors.price}</p>}
            </div>
            <div className={`field-group ${errors.description ? 'has-error' : ''}`}>
              <label className="field-label">Description<span className="req">*</span></label>
              <textarea className="field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Condition, reason for selling, accessories included..." />
              <p className={`word-count ${wordCount >= DESCRIPTION_MIN_WORDS ? 'ok' : ''}`}>{wordCount} / {DESCRIPTION_MIN_WORDS} words minimum</p>
              <div className="desc-hint-row">
                {DESCRIPTION_HINTS.map((h) => (
                  <button type="button" key={h} className="desc-hint-chip" onClick={() => addHintToDescription(h)}>+ {h}</button>
                ))}
              </div>
              {errors.description && <p className="field-error">{errors.description}</p>}
            </div>
            <div className="field-group">
              <label className="field-label">Location</label>
              <select className="field" value={location} onChange={(e) => setLocation(e.target.value)}>
                {['Holeta', 'Addis Ababa', 'Bahir Dar', 'Hawassa', 'Dire Dawa', 'Gondar', 'Mekelle'].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          </>
        )}

        {errors.submit && <ErrorBanner text={errors.submit} />}

        <button className="btn btn-primary" disabled={submitting} onClick={submit}>
          {submitting ? (statusMsg || (isEdit ? 'Saving...' : 'Posting...')) : (isEdit ? 'Save Changes' : 'Continue')}
        </button>
        {submitting && <p className="helper-text" style={{ textAlign: 'center' }}>First post after a while can take up to 30s while the server wakes up.</p>}
      </div>
    </div>
  );
}
