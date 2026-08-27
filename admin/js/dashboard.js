// --- Auth guard -------------------------------------------------
// Every read/write below also has to pass firestore.rules' isAdmin()
// check server-side — this client-side check is just so a
// non-admin (or signed-out visitor) sees a redirect instead of a
// blank/broken page.
auth.onAuthStateChanged(async (user) => {
  if (!user) return window.location.replace('index.html');
  const token = await user.getIdTokenResult();
  if (!token.claims.isAdmin) {
    await auth.signOut();
    return window.location.replace('index.html');
  }
  initBanner();
  initCarousel();
  initReports();
  initUsers();
  initListings();
  initAnalytics();
});

document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());

// --- Tabs ---------------------------------------------------------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

function showFieldError(el, msg) {
  el.textContent = msg;
  el.hidden = false;
}
function hideFieldError(el) {
  el.hidden = true;
}

// --- Profile header banner (config/appBanner) ----------------------
let pendingBannerDataUrl = null;

function initBanner() {
  const fileInput = document.getElementById('banner-file');
  const preview = document.getElementById('banner-preview');
  const empty = document.getElementById('banner-empty');
  const errorBox = document.getElementById('banner-error');
  const saveBtn = document.getElementById('banner-save-btn');
  const removeBtn = document.getElementById('banner-remove-btn');

  db.collection('config').doc('appBanner').get().then((snap) => {
    const url = snap.exists ? snap.data().imageUrl : null;
    if (url) {
      preview.src = url;
      preview.hidden = false;
      empty.hidden = true;
    }
  });

  fileInput.addEventListener('change', async () => {
    hideFieldError(errorBox);
    const file = fileInput.files[0];
    if (!file) return;
    try {
      pendingBannerDataUrl = await compressImageToDataUrl(file, { maxWidth: 1280, quality: 0.75 });
      preview.src = pendingBannerDataUrl;
      preview.hidden = false;
      empty.hidden = true;
      saveBtn.disabled = false;
    } catch (err) {
      showFieldError(errorBox, err.message);
    }
  });

  saveBtn.addEventListener('click', async () => {
    if (!pendingBannerDataUrl) return;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      await db.collection('config').doc('appBanner').set({ imageUrl: pendingBannerDataUrl }, { merge: true });
      saveBtn.textContent = 'Saved ✓';
      setTimeout(() => { saveBtn.textContent = 'Save image'; }, 1500);
    } catch (err) {
      showFieldError(errorBox, describeFirestoreError(err));
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save image';
    }
  });

  removeBtn.addEventListener('click', async () => {
    if (!confirm('Remove the profile header image for everyone?')) return;
    try {
      await db.collection('config').doc('appBanner').set({ imageUrl: null }, { merge: true });
      preview.hidden = true;
      empty.hidden = false;
      pendingBannerDataUrl = null;
      saveBtn.disabled = true;
      fileInput.value = '';
    } catch (err) {
      showFieldError(errorBox, describeFirestoreError(err));
    }
  });
}

// --- Search-bar promo carousel (config/homeBanners) -----------------
// All slides live together in a single Firestore doc, and Firestore
// caps any one document at 1MB — so unlike the profile banner (its
// own doc, effectively one image), the carousel needs a running
// size check across all its slides combined, not just per-image
// compression.
const FIRESTORE_DOC_LIMIT = 1048576; // 1MB, Firestore's hard per-document cap
const CAROUSEL_SAFE_BUDGET = 900000; // leave ~150KB headroom under the cap
const MAX_SLIDES = 8;

let pendingCarouselDataUrl = null;
let carouselBanners = [];

function carouselDocSize() {
  return JSON.stringify({ banners: carouselBanners }).length;
}

function renderCarouselSizeIndicator() {
  const el = document.getElementById('carousel-size');
  const usedKb = Math.round(carouselDocSize() / 1024);
  const limitKb = Math.round(CAROUSEL_SAFE_BUDGET / 1024);
  el.textContent = `${carouselBanners.length}/${MAX_SLIDES} slides · ~${usedKb}KB / ${limitKb}KB`;
  el.classList.toggle('size-warning', carouselDocSize() > CAROUSEL_SAFE_BUDGET * 0.8);
}

function renderCarouselList() {
  const listEl = document.getElementById('carousel-list');
  listEl.innerHTML = '';
  carouselBanners.forEach((b, i) => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <img src="${b.imageUrl}" alt="" class="thumb" />
      <div class="list-row-info">
        <div class="muted">${b.linkUrl || 'No link'}</div>
      </div>
      <div class="row-actions">
        <button type="button" class="icon-btn" data-act="up" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="icon-btn" data-act="down" data-i="${i}" ${i === carouselBanners.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="icon-btn danger" data-act="remove" data-i="${i}">✕</button>
      </div>
    `;
    listEl.appendChild(row);
  });

  listEl.querySelectorAll('button[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => handleCarouselAction(btn.dataset.act, Number(btn.dataset.i)));
  });
  renderCarouselSizeIndicator();
}

async function saveCarousel() {
  await db.collection('config').doc('homeBanners').set({ banners: carouselBanners }, { merge: true });
}

async function handleCarouselAction(act, i) {
  const before = carouselBanners.slice();
  if (act === 'remove') {
    if (!confirm('Remove this slide?')) return;
    carouselBanners.splice(i, 1);
  } else if (act === 'up' && i > 0) {
    [carouselBanners[i - 1], carouselBanners[i]] = [carouselBanners[i], carouselBanners[i - 1]];
  } else if (act === 'down' && i < carouselBanners.length - 1) {
    [carouselBanners[i + 1], carouselBanners[i]] = [carouselBanners[i], carouselBanners[i + 1]];
  }
  renderCarouselList();
  try {
    await saveCarousel();
  } catch (err) {
    carouselBanners = before; // roll back — the save didn't actually land
    renderCarouselList();
    document.getElementById('carousel-error').hidden = false;
    document.getElementById('carousel-error').textContent = describeFirestoreError(err);
  }
}

function initCarousel() {
  const fileInput = document.getElementById('carousel-file');
  const linkInput = document.getElementById('carousel-link');
  const errorBox = document.getElementById('carousel-error');
  const addBtn = document.getElementById('carousel-add-btn');

  db.collection('config').doc('homeBanners').get().then((snap) => {
    carouselBanners = snap.exists ? (snap.data().banners || []) : [];
    renderCarouselList();
  });

  fileInput.addEventListener('change', async () => {
    hideFieldError(errorBox);
    const file = fileInput.files[0];
    if (!file) return;
    if (carouselBanners.length >= MAX_SLIDES) {
      showFieldError(errorBox, `Limit reached: ${MAX_SLIDES} slides max (all slides share one Firestore document, capped at 1MB). Remove one first.`);
      fileInput.value = '';
      return;
    }
    try {
      pendingCarouselDataUrl = await compressImageToDataUrl(file, { maxWidth: 1000, quality: 0.7 });
      const wouldBeSize = carouselDocSize() + pendingCarouselDataUrl.length + 60; // ~60B overhead for id/linkUrl/quotes
      if (wouldBeSize > CAROUSEL_SAFE_BUDGET) {
        showFieldError(errorBox, `That image would push this document too close to Firestore's 1MB limit. Try a smaller image, or remove an existing slide first.`);
        pendingCarouselDataUrl = null;
        fileInput.value = '';
        return;
      }
      addBtn.disabled = false;
    } catch (err) {
      showFieldError(errorBox, err.message);
    }
  });

  addBtn.addEventListener('click', async () => {
    if (!pendingCarouselDataUrl) return;
    addBtn.disabled = true;
    addBtn.textContent = 'Adding…';
    try {
      carouselBanners.push({
        id: `b_${Date.now()}`,
        imageUrl: pendingCarouselDataUrl,
        linkUrl: linkInput.value.trim() || null,
      });
      await saveCarousel();
      renderCarouselList();
      pendingCarouselDataUrl = null;
      fileInput.value = '';
      linkInput.value = '';
    } catch (err) {
      carouselBanners.pop(); // undo the optimistic push — the save didn't actually land
      showFieldError(errorBox, describeFirestoreError(err));
    } finally {
      addBtn.disabled = true;
      addBtn.textContent = 'Add slide';
    }
  });
}

// Firestore's raw error messages ("Missing or insufficient
// permissions.", "resource-exhausted", etc.) don't tell an admin what
// to actually do — translate the ones worth explaining.
function describeFirestoreError(err) {
  const code = err && err.code;
  if (code === 'permission-denied') {
    return "Permission denied — if you were just granted admin access, sign out and back in so your login picks up the new permissions.";
  }
  if (code === 'resource-exhausted' || /longer than.*1048576|exceeds.*maximum/i.test(err?.message || '')) {
    return 'This would exceed Firestore\'s 1MB document limit. Remove a slide or use a smaller image.';
  }
  return err?.message || 'Could not save. Please try again.';
}

// --- Reports queue --------------------------------------------------
function initReports() {
  db.collection('reports').orderBy('createdAt', 'desc').limit(50).get().then((snap) => {
    const listEl = document.getElementById('reports-list');
    const emptyEl = document.getElementById('reports-empty');
    const badge = document.getElementById('reports-badge');

    if (snap.empty) {
      emptyEl.hidden = false;
      return;
    }
    badge.textContent = snap.size;
    badge.hidden = false;

    snap.docs.forEach((docSnap) => {
      const r = docSnap.data();
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML = `
        <div class="list-row-info">
          <div><strong>${r.reason || 'No reason given'}</strong></div>
          <div class="muted">Listing: ${r.listingId || '—'}</div>
          ${r.note ? `<div class="muted">"${r.note}"</div>` : ''}
        </div>
        <div class="row-actions">
          <button type="button" class="btn-ghost" data-id="${docSnap.id}">Dismiss</button>
        </div>
      `;
      row.querySelector('button').addEventListener('click', async (e) => {
        await db.collection('reports').doc(e.target.dataset.id).delete();
        row.remove();
        const remaining = Number(badge.textContent) - 1;
        badge.textContent = remaining;
        if (remaining <= 0) { badge.hidden = true; emptyEl.hidden = false; }
      });
      listEl.appendChild(row);
    });
  });
}

// --- User management (users collection) ------------------------------
// Docs are id `tg_{telegramId}` with fields telegramId/firstName/
// lastName/username/photoUrl/updatedAt (+ phone/fullName/location once
// the user completes their profile). Paginated 30-at-a-time by
// updatedAt desc; search filters client-side over the loaded page(s)
// only (not a live server-side query — fine at this scale).
const USERS_PAGE_SIZE = 30;
let usersLoaded = [];
let usersLastDoc = null;
let usersAllLoaded = false;

function displayName(u) {
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return u.fullName || full || u.username || `Telegram ${u.telegramId || ''}`.trim();
}

function userMatchesSearch(u, q) {
  if (!q) return true;
  const haystack = [u.fullName, u.firstName, u.lastName, u.username, u.phone, u.telegramId]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q.toLowerCase());
}

function renderUsersList() {
  const listEl = document.getElementById('users-list');
  const emptyEl = document.getElementById('users-empty');
  const q = document.getElementById('users-search').value.trim();
  const filtered = usersLoaded.filter((u) => userMatchesSearch(u, q));

  listEl.innerHTML = '';
  emptyEl.hidden = filtered.length > 0;

  filtered.forEach((u) => {
    const row = document.createElement('div');
    row.className = 'list-row';
    const initial = (displayName(u)[0] || '?').toUpperCase();
    row.innerHTML = `
      ${u.photoUrl
        ? `<img src="${u.photoUrl}" alt="" class="avatar" />`
        : `<div class="avatar-placeholder">${initial}</div>`}
      <div class="list-row-info">
        <div><strong>${displayName(u)}</strong> ${u.suspended ? '<span class="tag-suspended">Suspended</span>' : ''}</div>
        <div class="muted">${u.phone || '—'} · @${u.username || '—'} · ${u.telegramId || '—'}</div>
      </div>
      <div class="row-actions">
        <button type="button" class="btn-ghost ${u.suspended ? '' : 'danger-text'}" data-id="${u.id}">${u.suspended ? 'Unsuspend' : 'Suspend'}</button>
      </div>
    `;
    row.querySelector('button').addEventListener('click', async (e) => {
      const btn = e.target;
      const willSuspend = !u.suspended;
      if (willSuspend && !confirm(`Suspend ${displayName(u)}? They won't be able to post new listings.`)) return;
      btn.disabled = true;
      try {
        await db.collection('users').doc(u.id).update({ suspended: willSuspend });
        u.suspended = willSuspend;
        renderUsersList();
      } catch (err) {
        alert(describeFirestoreError(err));
        btn.disabled = false;
      }
    });
    listEl.appendChild(row);
  });
}

async function loadUsersPage() {
  const loadMoreBtn = document.getElementById('users-load-more');
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = 'Loading…';
  try {
    let query = db.collection('users').orderBy('updatedAt', 'desc').limit(USERS_PAGE_SIZE);
    if (usersLastDoc) query = query.startAfter(usersLastDoc);
    const snap = await query.get();
    if (snap.empty || snap.size < USERS_PAGE_SIZE) usersAllLoaded = true;
    if (!snap.empty) usersLastDoc = snap.docs[snap.docs.length - 1];
    snap.docs.forEach((docSnap) => usersLoaded.push({ id: docSnap.id, ...docSnap.data() }));
    renderUsersList();
  } catch (err) {
    document.getElementById('users-empty').hidden = false;
    document.getElementById('users-empty').textContent = describeFirestoreError(err);
  } finally {
    loadMoreBtn.textContent = 'Load more';
    loadMoreBtn.hidden = usersAllLoaded;
    loadMoreBtn.disabled = false;
  }
}

function initUsers() {
  document.getElementById('users-search').addEventListener('input', renderUsersList);
  document.getElementById('users-load-more').addEventListener('click', loadUsersPage);
  loadUsersPage();
}

// --- Listings moderation (listings collection) -----------------------
// Doc fields (from PostAd.jsx): sellerId, sellerName, sellerPhoto,
// title, price, description, location, category, subcategory,
// attributes, condition, images[], createdAt, expiresAt, boostedUntil,
// views, status ('active' | 'paused'). isAdmin() already has update
// and delete rights on any listing (firestore.rules), so no rules
// change was needed for this tab. Same paginate-30 + client-search
// pattern as the Users tab.
const LISTINGS_PAGE_SIZE = 30;
const MAIN_APP_URL = 'https://holeta-c22fc.web.app';
let listingsLoaded = [];
let listingsLastDoc = null;
let listingsAllLoaded = false;

function listingIsExpired(l) {
  if (!l.expiresAt) return false;
  const ms = typeof l.expiresAt.toMillis === 'function' ? l.expiresAt.toMillis() : l.expiresAt;
  return ms < Date.now();
}

function listingStatusLabel(l) {
  if (listingIsExpired(l)) return 'expired';
  return l.status === 'paused' ? 'paused' : 'active';
}

function listingMatchesFilters(l, q, statusFilter) {
  if (statusFilter !== 'all' && listingStatusLabel(l) !== statusFilter) return false;
  if (!q) return true;
  const haystack = [l.title, l.sellerName, l.category, l.subcategory].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q.toLowerCase());
}

function formatListingPrice(l) {
  const n = Number(l.price);
  return Number.isFinite(n) ? `${n.toLocaleString()} ETB` : '—';
}

function renderListingsList() {
  const listEl = document.getElementById('listings-list');
  const emptyEl = document.getElementById('listings-empty');
  const q = document.getElementById('listings-search').value.trim();
  const statusFilter = document.getElementById('listings-status-filter').value;
  const filtered = listingsLoaded.filter((l) => listingMatchesFilters(l, q, statusFilter));

  listEl.innerHTML = '';
  emptyEl.hidden = filtered.length > 0;

  filtered.forEach((l) => {
    const status = listingStatusLabel(l);
    const thumb = l.images && l.images[0];
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      ${thumb ? `<img src="${thumb}" alt="" class="thumb" />` : `<div class="thumb thumb-empty"></div>`}
      <div class="list-row-info">
        <div><strong>${l.title || 'Untitled'}</strong> <span class="tag-status tag-status-${status}">${status}</span></div>
        <div class="muted">${formatListingPrice(l)} · ${l.sellerName || 'Unknown seller'} · ${l.category || '—'}</div>
      </div>
      <div class="row-actions">
        <button type="button" class="btn-ghost" data-act="view" data-id="${l.id}">View</button>
        <button type="button" class="btn-ghost" data-act="pause" data-id="${l.id}">${l.status === 'paused' ? 'Resume' : 'Pause'}</button>
        <button type="button" class="btn-ghost danger-text" data-act="delete" data-id="${l.id}">Delete</button>
      </div>
    `;
    row.querySelector('[data-act="view"]').addEventListener('click', () => {
      window.open(`${MAIN_APP_URL}/product/${l.id}`, '_blank');
    });
    row.querySelector('[data-act="pause"]').addEventListener('click', async (e) => {
      const btn = e.target;
      const willPause = l.status !== 'paused';
      btn.disabled = true;
      try {
        await db.collection('listings').doc(l.id).update({ status: willPause ? 'paused' : 'active' });
        l.status = willPause ? 'paused' : 'active';
        renderListingsList();
      } catch (err) {
        alert(describeFirestoreError(err));
        btn.disabled = false;
      }
    });
    row.querySelector('[data-act="delete"]').addEventListener('click', async (e) => {
      if (!confirm(`Permanently delete "${l.title || 'this listing'}"? This can't be undone.`)) return;
      const btn = e.target;
      btn.disabled = true;
      try {
        await db.collection('listings').doc(l.id).delete();
        listingsLoaded = listingsLoaded.filter((x) => x.id !== l.id);
        renderListingsList();
      } catch (err) {
        alert(describeFirestoreError(err));
        btn.disabled = false;
      }
    });
    listEl.appendChild(row);
  });
}

async function loadListingsPage() {
  const loadMoreBtn = document.getElementById('listings-load-more');
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = 'Loading…';
  try {
    let query = db.collection('listings').orderBy('createdAt', 'desc').limit(LISTINGS_PAGE_SIZE);
    if (listingsLastDoc) query = query.startAfter(listingsLastDoc);
    const snap = await query.get();
    if (snap.empty || snap.size < LISTINGS_PAGE_SIZE) listingsAllLoaded = true;
    if (!snap.empty) listingsLastDoc = snap.docs[snap.docs.length - 1];
    snap.docs.forEach((docSnap) => listingsLoaded.push({ id: docSnap.id, ...docSnap.data() }));
    renderListingsList();
  } catch (err) {
    document.getElementById('listings-empty').hidden = false;
    document.getElementById('listings-empty').textContent = describeFirestoreError(err);
  } finally {
    loadMoreBtn.textContent = 'Load more';
    loadMoreBtn.hidden = listingsAllLoaded;
    loadMoreBtn.disabled = false;
  }
}

function initListings() {
  document.getElementById('listings-search').addEventListener('input', renderListingsList);
  document.getElementById('listings-status-filter').addEventListener('change', renderListingsList);
  document.getElementById('listings-load-more').addEventListener('click', loadListingsPage);
  loadListingsPage();
}

// --- Platform analytics overview --------------------------------------
// Uses Firestore's count() aggregation queries so this never downloads
// full listing documents (which carry base64 images and would be a
// heavy read at this dataset's size) — just server-computed counts.
// Users have no createdAt field (only updatedAt, bumped on every
// login), so "new users" isn't derivable; "active" is reported
// instead, which is what the field actually means.
function daysAgoTimestamp(days) {
  return firebase.firestore.Timestamp.fromDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

async function countOf(query) {
  const snap = await query.count().get();
  return snap.data().count;
}

async function initAnalytics() {
  const errorBox = document.getElementById('analytics-error');
  try {
    const listingsRef = db.collection('listings');
    const usersRef = db.collection('users');
    const [
      totalListings,
      activeListings,
      pausedListings,
      totalUsers,
      newListings7d,
      newListings30d,
      activeUsers7d,
    ] = await Promise.all([
      countOf(listingsRef),
      countOf(listingsRef.where('status', '==', 'active')),
      countOf(listingsRef.where('status', '==', 'paused')),
      countOf(usersRef),
      countOf(listingsRef.where('createdAt', '>=', daysAgoTimestamp(7))),
      countOf(listingsRef.where('createdAt', '>=', daysAgoTimestamp(30))),
      countOf(usersRef.where('updatedAt', '>=', daysAgoTimestamp(7))),
    ]);
    document.getElementById('stat-total-listings').textContent = totalListings;
    document.getElementById('stat-active-listings').textContent = activeListings;
    document.getElementById('stat-paused-listings').textContent = pausedListings;
    document.getElementById('stat-total-users').textContent = totalUsers;
    document.getElementById('stat-new-listings-7d').textContent = newListings7d;
    document.getElementById('stat-new-listings-30d').textContent = newListings30d;
    document.getElementById('stat-active-users-7d').textContent = activeUsers7d;
  } catch (err) {
    errorBox.hidden = false;
    errorBox.textContent = describeFirestoreError(err);
  }
}
