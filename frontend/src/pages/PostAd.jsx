import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, BACKEND_URL } from '../lib/firebase';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { getMyProfile } from '../lib/profile';
import { fileToCompressedBase64 } from '../lib/imageCompress';
import { computeExpiresAt } from '../lib/adStatus';
import { buildSearchTokens } from '../lib/searchTokens';
import { getSubcategory, sortByPopular, sortNatural, resolveOtherAttrs, buildSuggestedTitle, DESCRIPTION_MIN_WORDS, DESCRIPTION_HINTS, RENT_DESCRIPTION_HINTS } from '../data/categories';
import { getBrandList, getBrandModels } from '../lib/referenceData';
import { useAppData } from '../lib/appData';
import DynamicAttributeForm from '../components/DynamicAttributeForm.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import ChipSelect from '../components/ChipSelect.jsx';
import { ErrorBanner } from '../components/Banner.jsx';
import { runInBackground, isTransientError, withMinDuration } from '../lib/postProgress';
import { loadDraft, saveDraft, clearDraft } from '../lib/postDraft';
import { registerPostAdSubmit, unregisterPostAdSubmit } from '../lib/postAdFab';

// Chosen on the type-selection screen shown before the form (#hog013).
// Each type renders its own separate form block below — not one
// shared form with type-gated fields threaded through it.
// Product: subcategory/attributes, required photos, simple required
// price. Service: subcategory/attributes, optional photos, flexible
// priceType (fixed/negotiable/free/contact) — the #hog004 behavior,
// scoped to Service only. Job: no subcategory/attributes/price at
// all — just title + description + optional photo (see #hog009).
// Rent (#hog014): subcategory/attributes + required photos, own
// category tree (type:'rent' in the admin, same schema/mechanism as
// Product/Service/Job — see #hog001 — but never shares Product's
// entries, since a rental's relevant fields, e.g. bedrooms/furnished/
// deposit, are genuinely different from a sale listing's condition/
// warranty). Its own visually distinct layout (see the isRent render
// block) instead of Product's flat field list — standing principle
// per Taza: each post type gets its own structure, not shared just
// because it's convenient.
const POST_TYPES = [
  { key: 'product', label: 'Product' },
  { key: 'service', label: 'Service' },
  { key: 'job', label: 'Job' },
  { key: 'rent', label: 'Rent' },
];

export default function PostAd() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = !!editId;
  const requireRegistered = useRequireRegistered();
  const { categories: CATEGORIES, colorHexOverrides } = useAppData();
  // Options fetched from referenceData for attributes that point at a
  // refCollection instead of embedding options inline (see #hog001) —
  // keyed by attribute key. Populated lazily: the root attribute's
  // (e.g. brand) option list loads once the subcategory is picked;
  // the dependent attributes (model/storage/ram/color) fill in once
  // a value for their parent is chosen.
  const [refOptions, setRefOptions] = useState({});
  // null = not yet chosen. New-post mode opens on a type-selection
  // screen (see the early return near the bottom) instead of
  // defaulting to 'product' with a switchable chip row — #hog013.
  // Edit mode always resolves this from the loaded listing before
  // the form (gated by loadingExisting) ever renders, so it's never
  // null there in practice.
  const [postType, setPostType] = useState(null);
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [attrs, setAttrs] = useState({});
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState('fixed');
  // Rent-only (#hog014): rentUnit is Fixed/Negotiable-style but for
  // the billing period instead of price flexibility; deposit and
  // minTerm are both optional.
  const [rentUnit, setRentUnit] = useState('month');
  const [deposit, setDeposit] = useState('');
  const [minTerm, setMinTerm] = useState('');
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
  // Ready immediately in edit mode (drafts are never used there);
  // in new-post mode this flips true right after the one-time draft
  // restore below, so the autosave effect can't fire on the initial
  // empty render and overwrite a real draft with blank fields.
  const [draftReady, setDraftReady] = useState(isEdit);

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
        setPostType(a.categoryType === 'job' ? 'job' : (a.categoryType === 'rent' ? 'rent' : (CATEGORIES.find((c) => c.id === a.category)?.type || 'product')));
        setSubcategoryId(a.subcategory || '');
        setAttrs(a.attributes || {});
        setTitle(a.title || '');
        setTitleTouched(true); // don't let the auto-suggest effect overwrite the loaded title
        setPrice(a.price != null ? String(a.price) : '');
        setPriceType(a.priceType || 'fixed');
        setRentUnit(a.rentUnit || 'month');
        setDeposit(a.deposit != null ? String(a.deposit) : '');
        setMinTerm(a.minTerm || '');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, editId]);

  // One-time restore of an in-progress draft (new-post mode only) —
  // e.g. after an accidental back-navigation or app close mid-form.
  useEffect(() => {
    if (isEdit) return;
    const draft = loadDraft();
    if (draft) {
      setCategoryId(draft.categoryId || '');
      // A saved draft always has postType recorded (saveDraft below
      // has stored it since #hog007) — restoring it means a person
      // resuming an in-progress post skips the type-selection screen
      // and lands straight back in their form.
      setPostType(draft.postType || null);
      setSubcategoryId(draft.subcategoryId || '');
      setAttrs(draft.attrs || {});
      setTitle(draft.title || '');
      if (draft.title) setTitleTouched(true); // don't let the auto-suggest effect overwrite the restored title
      setPrice(draft.price || '');
      setPriceType(draft.priceType || 'fixed');
      setRentUnit(draft.rentUnit || 'month');
      setDeposit(draft.deposit || '');
      setMinTerm(draft.minTerm || '');
      setDescription(draft.description || '');
      setLocation(draft.location || 'Holeta');
    }
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps the draft in sync with every field change so the restore
  // above always has something recent to work with. Gated on
  // draftReady so this can't fire before the restore runs and wipe
  // out a real draft with the form's blank initial state.
  useEffect(() => {
    if (isEdit || !draftReady) return;
    saveDraft({ postType, categoryId, subcategoryId, attrs, title, price, priceType, rentUnit, deposit, minTerm, description, location });
  }, [isEdit, draftReady, postType, categoryId, subcategoryId, attrs, title, price, priceType, rentUnit, deposit, minTerm, description, location]);

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const isProduct = postType === 'product';
  const isService = postType === 'service';
  const isJob = postType === 'job';
  const isRent = postType === 'rent';
  // Only categories matching the top-of-page type selector show in
  // the Category picker below it. Rent has its own tree (type:'rent')
  // rather than borrowing Product's — see #hog014 note above.
  const filteredCategories = sortByPopular(CATEGORIES).filter((c) => (c.type || 'product') === postType);
  const subcategory = category && subcategoryId ? getSubcategory(CATEGORIES, categoryId, subcategoryId) : null;
  const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;

  // Attributes as DynamicAttributeForm actually renders: refCollection
  // attributes get their `options` (root, e.g. brand) or
  // `optionsByParent` (dependent, e.g. model/storage/ram/color)
  // filled in from whatever's landed in refOptions so far — everything
  // else passes through unchanged. DynamicAttributeForm itself stays
  // Firestore-unaware.
  const effectiveAttributes = subcategory
    ? subcategory.attributes.map((attr) => {
        if (!attr.refCollection) return attr;
        const loaded = refOptions[attr.key];
        // Always provide the shape DynamicAttributeForm expects, even
        // before the fetch above resolves — an empty list/map, never
        // undefined, so a select-dependent attribute never reads
        // `.optionsByParent[x]` off undefined mid-load.
        return attr.dependsOn
          ? { ...attr, optionsByParent: loaded?.optionsByParent || {} }
          : { ...attr, options: loaded?.options || [] };
      })
    : [];

  // Root refCollection attribute (e.g. brand) — its option list only
  // depends on the subcategory, so load it once when the subcategory
  // is picked.
  useEffect(() => {
    if (!subcategory) return;
    const rootAttr = subcategory.attributes.find((a) => a.refCollection && !a.dependsOn);
    if (!rootAttr) return;
    let cancelled = false;
    getBrandList(rootAttr.refCollection).then((brands) => {
      if (!cancelled) setRefOptions((o) => ({ ...o, [rootAttr.key]: { options: brands } }));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcategory?.id]);

  // Dependent refCollection attributes (model/storage/ram/color) —
  // fetch the chosen brand's full model list once, then fan its
  // per-model fields out to whichever attribute keys match them
  // (e.g. a model object's `storage` field feeds the `storage`
  // attribute's optionsByParent, keyed by model name).
  useEffect(() => {
    if (!subcategory) return;
    const rootAttr = subcategory.attributes.find((a) => a.refCollection && !a.dependsOn);
    const brand = rootAttr && attrs[rootAttr.key];
    if (!rootAttr || !brand) return;
    let cancelled = false;
    getBrandModels(rootAttr.refCollection, brand).then((models) => {
      if (cancelled) return;
      setRefOptions((o) => {
        const next = { ...o };
        for (const attr of subcategory.attributes) {
          if (!attr.refCollection || attr.dependsOn !== rootAttr.key) continue;
          // e.g. the `model` attribute: dependsOn brand, one option per model
          next[attr.key] = { optionsByParent: { ...(o[attr.key]?.optionsByParent), [brand]: models.map((m) => m.model) } };
        }
        for (const attr of subcategory.attributes) {
          if (!attr.refCollection || attr.dependsOn !== 'model') continue;
          // e.g. storage/ram/color: dependsOn model, options come from
          // that model's own field of the same name
          const byModel = { ...(o[attr.key]?.optionsByParent) };
          for (const m of models) byModel[m.model] = m[attr.key] || [];
          next[attr.key] = { optionsByParent: byModel };
        }
        return next;
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcategory?.id, attrs.brand]);

  function onPostTypeChange(type) {
    setPostType(type);
    setCategoryId('');
    setSubcategoryId('');
    setAttrs({});
    setTitleTouched(false);
    setTitle('');
    setPrice('');
    setPriceType('fixed');
    setRentUnit('month');
    setDeposit('');
    setMinTerm('');
    setDescription('');
    setImages([]);
    setErrors({});
  }
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
    const suggested = buildSuggestedTitle(category, subcategory, resolveOtherAttrs(attrs));
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
    if ((isProduct || isRent) && images.length === 0) errs.photos = 'Add at least 1 photo — listings without photos get far fewer replies.';
    if (!isJob && !categoryId) errs.categoryId = 'Select a category to continue.';
    if (categoryId && !isJob && !subcategoryId) errs.subcategoryId = 'Select a subcategory to continue.';
    if (!title.trim()) errs.title = 'Title is required — give buyers a short, clear name for the item.';
    if (isProduct && (!price || Number(price) <= 0)) errs.price = 'Enter a valid price greater than 0.';
    if (isRent && (!price || Number(price) <= 0)) errs.price = 'Enter a valid rent amount greater than 0.';
    if (isRent && deposit && Number(deposit) < 0) errs.deposit = 'Deposit can\'t be negative.';
    if (isService && priceType === 'fixed' && (!price || Number(price) <= 0)) errs.price = 'Enter a valid price greater than 0.';
    if (isService && priceType === 'negotiable' && price && Number(price) <= 0) errs.price = 'Enter a valid asking price, or leave it blank.';
    if (wordCount > 0 && wordCount < DESCRIPTION_MIN_WORDS) errs.description = `Add a bit more detail — at least ${DESCRIPTION_MIN_WORDS} words helps buyers trust the listing.`;
    else if (wordCount === 0) errs.description = `Description is required — at least ${DESCRIPTION_MIN_WORDS} words about condition, accessories, etc.`;

    const attrErrs = {};
    if (subcategory) {
      for (const attr of subcategory.attributes) {
        if (!attr.required) continue;
        const val = attrs[attr.key];
        if (!val) {
          attrErrs[attr.key] = `${attr.label} is required — select it above.`;
        } else if (val === 'Other' && !attrs[`${attr.key}__other`]?.trim()) {
          attrErrs[attr.key] = `Please specify ${attr.label.toLowerCase()} in the box below "Other".`;
        }
      }
    }
    if (Object.keys(attrErrs).length > 0) errs.attrs = attrErrs;
    return errs;
  }

  // Does the actual sign-in + photo compression + Firestore write.
  // Safe to call more than once (each call re-checks auth/profile),
  // which is what lets the background retry in submit() below just
  // call this again rather than needing its own separate logic.
  async function publish() {
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
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        compressedImages.push(typeof img === 'string' ? img : await fileToCompressedBase64(img));
      }
    }

    // Display name + avatar come from the seller's own verified
    // profile (users/{uid}.fullName / photoUrl, set at signup and
    // from Telegram) — not just the unsafe client-side preview —
    // so buyers see who they'd actually be chatting with.
    const myProfile = await getMyProfile(user.uid);

    // Product: simple required price, always 'fixed' — no priceType
    // flexibility (Taza's call: that's Service-only for now, can
    // extend to Product later if actually needed). Service: full
    // priceType flexibility (#hog004). Job: no price at all.
    let numericPrice;
    let priceTypeToSave;
    if (isJob) {
      numericPrice = null;
      priceTypeToSave = 'contact';
    } else if (isProduct || isRent) {
      numericPrice = price ? Number(price) : null;
      priceTypeToSave = 'fixed';
    } else {
      numericPrice = priceType === 'free' ? 0 : (priceType === 'contact' ? null : (price ? Number(price) : null));
      priceTypeToSave = priceType;
    }

    const resolvedAttrs = resolveOtherAttrs(attrs);
    const payload = {
      sellerId: user.uid,
      sellerName: myProfile.name,
      sellerPhoto: myProfile.photo,
      title,
      price: numericPrice,
      priceType: priceTypeToSave,
      // Rent-only (#hog014); left off the payload entirely for other
      // types rather than saved as null/empty, same spirit as price
      // being skipped for Job.
      ...(isRent ? {
        rentUnit,
        deposit: deposit ? Number(deposit) : null,
        minTerm: minTerm.trim() || null,
      } : {}),
      description,
      location,
      category: isJob ? '' : categoryId,
      // Denormalized like priceType/condition below — lets ListingCard
      // and Home render job posts differently (full-width row card,
      // no price/condition) without a categories lookup on every card.
      // Job has no category doc at all, so this comes straight from
      // postType rather than category?.type. Rent has its own tree
      // (type:'rent') so category?.type would already read 'rent' —
      // the isRent fallback here just guards the moment before that
      // category doc has resolved.
      categoryType: isJob ? 'job' : (isRent ? 'rent' : (category?.type || postType)),
      subcategory: subcategoryId,
      // resolveOtherAttrs (#hog019) swaps a picked "Other" for its
      // typed specify-box value (and drops the scratch `__other`
      // companion keys) so nothing saved ever shows a bare, unsearchable
      // "Other" — the person's actual typed brand/model, etc.
      attributes: resolvedAttrs,
      condition: resolvedAttrs.condition || '',
      images: compressedImages,
      searchTokens: buildSearchTokens(title, resolvedAttrs),
    };

    if (isEdit) {
      // Edits don't touch createdAt/views/expiresAt/status — those
      // are owned by the post flow and the Renew action respectively.
      await updateDoc(doc(db, 'listings', editId), payload);
      return { path: `/product/${editId}` };
    }

    const ref2 = await addDoc(collection(db, 'listings'), {
      ...payload,
      createdAt: serverTimestamp(),
      expiresAt: computeExpiresAt(),
      boostedUntil: null,
      views: 0,
      status: 'active',
    });
    return { path: `/product/${ref2.id}` };
  }

  // Tells the person's Support chat what happened, once, when a
  // background retry runs out of attempts — best-effort, since if
  // the backend never woke up this call may also fail silently.
  async function notifySupportOfFailure() {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;
      fetch(`${BACKEND_URL}/notifySupportMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          text: isEdit
            ? "Your ad edit didn't save after a few tries — the server may have been slow to respond. Please open the ad and try Save again."
            : "Your ad didn't post after a few tries — the server may have been slow to respond. Please try posting again from the + button.",
        }),
      }).catch(() => {});
    } catch {}
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
    setStatusMsg(isEdit ? 'Saving...' : 'Publishing...');
    try {
      // First attempt happens right here, same as before — but even
      // when it finishes almost instantly (server already warm),
      // withMinDuration keeps the top ring showing briefly so
      // posting never feels like it skipped doing any real work.
      const { path } = await withMinDuration(publish);
      clearDraft();
      setSubmitting(false);
      setStatusMsg('');
      navigate(path);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
      setStatusMsg('');
      const isSuspended = err.code === 'permission-denied' && !isEdit;
      if (isSuspended) {
        setErrors({ submit: "Your account can't post right now — please contact support." });
        return;
      }
      if (isTransientError(err)) {
        // Looks like a cold-start/network hiccup, not a real
        // rejection — free the page immediately (the person can
        // navigate away) and keep retrying quietly in the
        // background. The small ring at the top of every screen
        // shows it's still working; Support chat gets a message
        // only if every retry fails.
        runInBackground(publish, { onFail: notifySupportOfFailure }).then((result) => {
          if (result) clearDraft();
        });
        return;
      }
      setErrors({ submit: `Couldn't ${isEdit ? 'save' : 'post'} your ad: ${err.message || err}.` });
    }
  }

  // Lets the bottom-nav fab (rendered in App.jsx, outside this
  // component tree) call submit() while this page is mounted — the
  // ref always points at the current submit closure so the bridge
  // never calls a stale one.
  const submitRef = useRef();
  submitRef.current = submit;
  useEffect(() => {
    registerPostAdSubmit(() => submitRef.current());
    return () => unregisterPostAdSubmit();
  }, []);


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

  // New-post mode, no type chosen yet: show only the type-selection
  // screen. Picking one moves straight into that type's own form
  // below (#hog013) — there's no in-app way back to this screen;
  // the phone's own back button is enough to leave the flow.
  if (!isEdit && postType === null) {
    return (
      <div className="page">
        <h2 className="page-title">Post an Ad</h2>
        <div className="form-block">
          <div className="field-group">
            <label className="field-label">What are you posting?</label>
            <div className="post-type-select">
              {POST_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  className="post-type-card"
                  onClick={() => onPostTypeChange(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h2 className="page-title">{isEdit ? 'Edit Ad' : 'Post an Ad'}</h2>

      <div className="form-block">
        {isProduct && (
          <>
            <div className={`field-group ${errors.photos ? 'has-error' : ''}`}>
              <label className="field-label">Photos<span className="req">*</span></label>
              <ImageUploader files={images} onChange={setImages} maxImages={5} />
              {errors.photos && <p className="field-error">{errors.photos}</p>}
            </div>

            <div className={`field-group ${errors.categoryId ? 'has-error' : ''}`}>
              <label className="field-label">Category<span className="req">*</span></label>
              <ChipSelect
                options={filteredCategories.map((c) => ({ label: c.name, value: c.id }))}
                value={categoryId}
                onChange={onCategoryChange}
                placeholder={filteredCategories.length === 0 ? 'No categories of this type yet.' : ''}
              />
              {errors.categoryId && <p className="field-error">{errors.categoryId}</p>}
            </div>

            {category && (
              <div className={`field-group ${errors.subcategoryId ? 'has-error' : ''}`}>
                <label className="field-label">Subcategory<span className="req">*</span></label>
                <ChipSelect
                  options={sortNatural(category.subcategories, (s) => s.name).map((s) => ({ label: s.name, value: s.id }))}
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
              <DynamicAttributeForm attributes={effectiveAttributes} values={attrs} onChange={setAttrs} errors={errors.attrs || {}} colorHexOverrides={colorHexOverrides} />
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
                  <input className="field" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price (ETB)" />
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
          </>
        )}

        {isService && (
          <>
            <div className={`field-group ${errors.photos ? 'has-error' : ''}`}>
              <label className="field-label">Photos</label>
              <ImageUploader files={images} onChange={setImages} maxImages={5} />
              {!errors.photos && <p className="helper-text">Optional for services — add photos if they help buyers, e.g. past work.</p>}
              {errors.photos && <p className="field-error">{errors.photos}</p>}
            </div>

            <div className={`field-group ${errors.categoryId ? 'has-error' : ''}`}>
              <label className="field-label">Category<span className="req">*</span></label>
              <ChipSelect
                options={filteredCategories.map((c) => ({ label: c.name, value: c.id }))}
                value={categoryId}
                onChange={onCategoryChange}
                placeholder={filteredCategories.length === 0 ? 'No categories of this type yet.' : ''}
              />
              {errors.categoryId && <p className="field-error">{errors.categoryId}</p>}
            </div>

            {category && (
              <div className={`field-group ${errors.subcategoryId ? 'has-error' : ''}`}>
                <label className="field-label">Subcategory<span className="req">*</span></label>
                <ChipSelect
                  options={sortNatural(category.subcategories, (s) => s.name).map((s) => ({ label: s.name, value: s.id }))}
                  value={subcategoryId}
                  onChange={onSubcategoryChange}
                />
                {errors.subcategoryId && <p className="field-error">{errors.subcategoryId}</p>}
              </div>
            )}

            {subcategory && (
              <DynamicAttributeForm attributes={effectiveAttributes} values={attrs} onChange={setAttrs} errors={errors.attrs || {}} colorHexOverrides={colorHexOverrides} />
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
                  <label className="field-label">Price<span className="req">*</span></label>
                  <ChipSelect
                    options={[
                      { label: 'Fixed price', value: 'fixed' },
                      { label: 'Negotiable', value: 'negotiable' },
                      { label: 'Free', value: 'free' },
                      { label: 'Contact seller', value: 'contact' },
                    ]}
                    value={priceType}
                    onChange={(v) => setPriceType(v)}
                  />
                  {(priceType === 'fixed' || priceType === 'negotiable') && (
                    <input
                      className="field" type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                      placeholder={priceType === 'negotiable' ? 'Asking price (ETB) — optional' : 'Price (ETB)'}
                      style={{ marginTop: 8 }}
                    />
                  )}
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
          </>
        )}

        {isRent && (
          <>
            <div className="rent-section">
              <h3 className="rent-section-title">What's for rent</h3>
              <div className={`field-group ${errors.photos ? 'has-error' : ''}`}>
                <label className="field-label">Photos<span className="req">*</span></label>
                <ImageUploader files={images} onChange={setImages} maxImages={5} />
                {errors.photos && <p className="field-error">{errors.photos}</p>}
              </div>

              <div className={`field-group ${errors.categoryId ? 'has-error' : ''}`}>
                <label className="field-label">Category<span className="req">*</span></label>
                <ChipSelect
                  options={filteredCategories.map((c) => ({ label: c.name, value: c.id }))}
                  value={categoryId}
                  onChange={onCategoryChange}
                  placeholder={filteredCategories.length === 0 ? 'No rental categories yet — add some from the admin panel.' : ''}
                />
                {errors.categoryId && <p className="field-error">{errors.categoryId}</p>}
              </div>

              {category && (
                <div className={`field-group ${errors.subcategoryId ? 'has-error' : ''}`}>
                  <label className="field-label">Subcategory<span className="req">*</span></label>
                  <ChipSelect
                    options={sortNatural(category.subcategories, (s) => s.name).map((s) => ({ label: s.name, value: s.id }))}
                    value={subcategoryId}
                    onChange={onSubcategoryChange}
                  />
                  {errors.subcategoryId && <p className="field-error">{errors.subcategoryId}</p>}
                </div>
              )}

              {subcategory && (
                <DynamicAttributeForm attributes={effectiveAttributes} values={attrs} onChange={setAttrs} errors={errors.attrs || {}} colorHexOverrides={colorHexOverrides} />
              )}

              {subcategory && (
                <div className={`field-group ${errors.title ? 'has-error' : ''}`}>
                  <label className="field-label">Title<span className="req">*</span></label>
                  <input
                    className="field"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }}
                    placeholder="e.g. 2-bedroom house, Holeta"
                  />
                  {!errors.title && <p className="helper-text">Filled in automatically from your selections above — edit it if you'd like.</p>}
                  {errors.title && <p className="field-error">{errors.title}</p>}
                </div>
              )}
            </div>

            {subcategory && (
              <div className="rent-terms-card">
                <h3 className="rent-section-title">Rent terms</h3>
                <div className={`field-group ${errors.price ? 'has-error' : ''}`}>
                  <label className="field-label">Rent amount<span className="req">*</span></label>
                  <ChipSelect
                    options={[
                      { label: 'Per month', value: 'month' },
                      { label: 'Per day', value: 'day' },
                    ]}
                    value={rentUnit}
                    onChange={(v) => setRentUnit(v)}
                  />
                  <input
                    className="field" type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                    placeholder="Amount (ETB)"
                    style={{ marginTop: 8 }}
                  />
                  {errors.price && <p className="field-error">{errors.price}</p>}
                </div>
                <div className="rent-terms-row">
                  <div className={`field-group ${errors.deposit ? 'has-error' : ''}`}>
                    <label className="field-label">Deposit (ETB)</label>
                    <input
                      className="field" type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)}
                      placeholder="Optional"
                    />
                    {errors.deposit && <p className="field-error">{errors.deposit}</p>}
                  </div>
                  <div className="field-group">
                    <label className="field-label">Minimum term</label>
                    <input
                      className="field" value={minTerm} onChange={(e) => setMinTerm(e.target.value)}
                      placeholder="e.g. 6 months"
                    />
                  </div>
                </div>
              </div>
            )}

            {subcategory && (
              <div className="rent-section">
                <div className={`field-group ${errors.description ? 'has-error' : ''}`}>
                  <label className="field-label">Description<span className="req">*</span></label>
                  <textarea className="field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Furnishing, utilities, terms, what's included..." />
                  <p className={`word-count ${wordCount >= DESCRIPTION_MIN_WORDS ? 'ok' : ''}`}>{wordCount} / {DESCRIPTION_MIN_WORDS} words minimum</p>
                  <div className="desc-hint-row">
                    {RENT_DESCRIPTION_HINTS.map((h) => (
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
              </div>
            )}
          </>
        )}

        {isJob && (
          <>
            <div className={`field-group ${errors.photos ? 'has-error' : ''}`}>
              <label className="field-label">Photo</label>
              <ImageUploader files={images} onChange={setImages} maxImages={3} compact />
              {!errors.photos && <p className="helper-text">Optional — add a photo if you have one.</p>}
              {errors.photos && <p className="field-error">{errors.photos}</p>}
            </div>

            <div className="job-note-block">
              <div className={`field-group ${errors.title ? 'has-error' : ''}`}>
                <label className="field-label">Title<span className="req">*</span></label>
                <input
                  className="field job-note-title"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }}
                  placeholder="e.g. Shop attendant needed"
                />
                {errors.title && <p className="field-error">{errors.title}</p>}
              </div>
              <div className={`field-group ${errors.description ? 'has-error' : ''}`}>
                <label className="field-label">Description<span className="req">*</span></label>
                <textarea
                  className="field job-note-body"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Role, responsibilities, requirements, how to apply..."
                />
                <p className={`word-count ${wordCount >= DESCRIPTION_MIN_WORDS ? 'ok' : ''}`}>{wordCount} / {DESCRIPTION_MIN_WORDS} words minimum</p>
                {errors.description && <p className="field-error">{errors.description}</p>}
              </div>
              <div className="field-group">
                <label className="field-label">Location</label>
                <select className="field" value={location} onChange={(e) => setLocation(e.target.value)}>
                  {['Holeta', 'Addis Ababa', 'Bahir Dar', 'Hawassa', 'Dire Dawa', 'Gondar', 'Mekelle'].map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
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
