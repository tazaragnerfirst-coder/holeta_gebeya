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
  initCategories();
  initReports();
  initUsers();
  initListings();
  initAnalytics();
  initSupport();
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

// --- Support inbox (chats where isSupport == true) --------------------
// Chat doc shape (frontend/src/pages/ChatThread.jsx): participants
// [SUPPORT_UID, buyerUid], buyerId, buyerName, isSupport: true,
// lastMessage, lastSenderId, lastMessageAt, unreadCount.{uid},
// lastReadAt.{uid}. Messages: {senderId, text, createdAt} (plain
// text) or {senderId, type:'listing', ...} (a shared-listing card —
// rare in support threads, rendered as a fallback line here).
// firestore.rules extends admin access to ONLY chats with
// isSupport==true — regular buyer/seller threads stay untouchable.
const SUPPORT_PAGE_SIZE = 30;
let supportChatsLoaded = [];
let supportLastDoc = null;
let supportAllLoaded = false;
let supportUnsubMessages = null;
let supportActiveChatId = null;

function renderSupportList() {
  const listEl = document.getElementById('support-list');
  const emptyEl = document.getElementById('support-empty');
  listEl.innerHTML = '';
  emptyEl.hidden = supportChatsLoaded.length > 0;

  supportChatsLoaded.forEach((c) => {
    const row = document.createElement('div');
    row.className = 'list-row list-row-clickable';
    const when = c.lastMessageAt && c.lastMessageAt.toDate ? c.lastMessageAt.toDate().toLocaleString() : '';
    row.innerHTML = `
      <div class="avatar-placeholder">${(c.buyerName || '?')[0].toUpperCase()}</div>
      <div class="list-row-info">
        <div><strong>${c.buyerName || 'User'}</strong></div>
        <div class="muted">${c.lastMessage || 'No messages yet'} · ${when}</div>
      </div>
    `;
    row.addEventListener('click', () => openSupportThread(c.id, c.buyerName || 'User'));
    listEl.appendChild(row);
  });
}

async function loadSupportPage() {
  const loadMoreBtn = document.getElementById('support-load-more');
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = 'Loading…';
  try {
    let query = db.collection('chats').where('isSupport', '==', true).orderBy('lastMessageAt', 'desc').limit(SUPPORT_PAGE_SIZE);
    if (supportLastDoc) query = query.startAfter(supportLastDoc);
    const snap = await query.get();
    if (snap.empty || snap.size < SUPPORT_PAGE_SIZE) supportAllLoaded = true;
    if (!snap.empty) supportLastDoc = snap.docs[snap.docs.length - 1];
    snap.docs.forEach((docSnap) => supportChatsLoaded.push({ id: docSnap.id, ...docSnap.data() }));
    renderSupportList();
  } catch (err) {
    document.getElementById('support-empty').hidden = false;
    document.getElementById('support-empty').textContent = describeFirestoreError(err);
  } finally {
    loadMoreBtn.textContent = 'Load more';
    loadMoreBtn.hidden = supportAllLoaded;
    loadMoreBtn.disabled = false;
  }
}

function renderSupportMessages(msgs) {
  const box = document.getElementById('support-thread-messages');
  const adminUid = auth.currentUser && auth.currentUser.uid;
  box.innerHTML = '';
  msgs.forEach((m) => {
    const mine = m.senderId === adminUid;
    const bubble = document.createElement('div');
    bubble.className = `thread-bubble ${mine ? 'mine' : 'theirs'}`;
    bubble.textContent = m.text || (m.type === 'listing' ? `[Shared listing: ${m.listingTitle || ''}]` : '');
    box.appendChild(bubble);
  });
  box.scrollTop = box.scrollHeight;
}

function openSupportThread(chatId, buyerName) {
  supportActiveChatId = chatId;
  document.getElementById('support-list-view').hidden = true;
  document.getElementById('support-thread-view').hidden = false;
  document.getElementById('support-thread-name').textContent = buyerName;
  document.getElementById('support-reply-text').value = '';
  document.getElementById('support-reply-error').hidden = true;

  if (supportUnsubMessages) supportUnsubMessages();
  supportUnsubMessages = db.collection('chats').doc(chatId).collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot((snap) => {
      renderSupportMessages(snap.docs.map((d) => d.data()));
    }, (err) => {
      document.getElementById('support-reply-error').hidden = false;
      document.getElementById('support-reply-error').textContent = describeFirestoreError(err);
    });
}

function closeSupportThread() {
  if (supportUnsubMessages) { supportUnsubMessages(); supportUnsubMessages = null; }
  supportActiveChatId = null;
  document.getElementById('support-thread-view').hidden = true;
  document.getElementById('support-list-view').hidden = false;
}

async function sendSupportReply() {
  const textEl = document.getElementById('support-reply-text');
  const text = textEl.value.trim();
  if (!text || !supportActiveChatId) return;
  const sendBtn = document.getElementById('support-reply-send');
  const errorBox = document.getElementById('support-reply-error');
  const adminUid = auth.currentUser.uid;
  const chatId = supportActiveChatId;
  sendBtn.disabled = true;
  errorBox.hidden = true;
  try {
    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    const buyerId = chatSnap.data().buyerId;
    await chatRef.collection('messages').add({
      senderId: adminUid,
      text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await chatRef.update({
      lastMessage: text,
      lastSenderId: adminUid,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      ...(buyerId ? { [`unreadCount.${buyerId}`]: firebase.firestore.FieldValue.increment(1) } : {}),
    });
    textEl.value = '';
    // Keep the inbox list's preview in sync without a full reload.
    const cached = supportChatsLoaded.find((c) => c.id === chatId);
    if (cached) { cached.lastMessage = text; }
  } catch (err) {
    errorBox.hidden = false;
    errorBox.textContent = describeFirestoreError(err);
  } finally {
    sendBtn.disabled = false;
  }
}

function initSupport() {
  document.getElementById('support-load-more').addEventListener('click', loadSupportPage);
  document.getElementById('support-back').addEventListener('click', closeSupportThread);
  document.getElementById('support-reply-send').addEventListener('click', sendSupportReply);
  document.getElementById('support-reply-text').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendSupportReply(); }
  });
  loadSupportPage();
}

// --- Categories / attribute schema (categories collection) +
// reference data (referenceData collection) — see #hog001 in memory.
// Category name/icon/popular/order get proper fields; the deeper
// nested pieces (a subcategory's attribute definitions, a brand's
// model list) are edited as JSON blocks rather than a full per-field
// form-builder UI — still no-code/no-redeploy, just less UI to build
// and maintain for something edited far less often than, say, the
// carousel images.
let categoriesData = [];
let refDataBrands = [];

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `item-${Date.now()}`;
}
function uniqueId(base, existingIds) {
  let id = base, n = 2;
  while (existingIds.includes(id)) { id = `${base}-${n}`; n++; }
  return id;
}

function initCategories() {
  document.getElementById('cat-subtab-categories').addEventListener('click', () => switchCatSubtab('categories'));
  document.getElementById('cat-subtab-refdata').addEventListener('click', () => switchCatSubtab('refdata'));
  document.getElementById('cat-add-btn').addEventListener('click', addCategory);
  document.getElementById('cat-import-btn').addEventListener('click', importStarterCategories);
  document.getElementById('refdata-add-btn').addEventListener('click', addBrand);
  document.getElementById('refdata-refid').addEventListener('change', loadRefDataBrands);

  loadCategories();
  loadRefDataBrands();
}

function switchCatSubtab(which) {
  document.getElementById('cat-subtab-categories').classList.toggle('active', which === 'categories');
  document.getElementById('cat-subtab-refdata').classList.toggle('active', which === 'refdata');
  document.getElementById('cat-view-categories').hidden = which !== 'categories';
  document.getElementById('cat-view-refdata').hidden = which !== 'refdata';
}

// --- Categories sub-view ---------------------------------------------
async function loadCategories() {
  const snap = await db.collection('categories').orderBy('order').get();
  categoriesData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  document.getElementById('cat-import-wrap').hidden = categoriesData.length > 0;
  renderCategoriesList();
}

function renderCategoriesList() {
  const listEl = document.getElementById('categories-list');
  const emptyEl = document.getElementById('categories-empty');
  listEl.innerHTML = '';
  emptyEl.hidden = categoriesData.length > 0;
  categoriesData.forEach((cat) => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <div class="list-row-info">
        <div><strong>${cat.name}</strong>${cat.popular ? ' · popular' : ''}</div>
        <div class="muted">icon: ${cat.icon || '—'} · order: ${cat.order} · ${cat.subcategories.length} subcategor${cat.subcategories.length === 1 ? 'y' : 'ies'}</div>
      </div>
      <div class="row-actions">
        <button type="button" class="icon-btn" data-act="edit" data-id="${cat.id}">✎</button>
        <button type="button" class="icon-btn danger" data-act="delete" data-id="${cat.id}">✕</button>
      </div>
    `;
    listEl.appendChild(row);
    const holder = document.createElement('div');
    holder.id = `cat-editor-${cat.id}`;
    listEl.appendChild(holder);
  });
  listEl.querySelectorAll('button[data-act="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => toggleCategoryEditor(btn.dataset.id));
  });
  listEl.querySelectorAll('button[data-act="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => deleteCategory(btn.dataset.id));
  });
}

function toggleCategoryEditor(id) {
  const holder = document.getElementById(`cat-editor-${id}`);
  if (holder.childElementCount > 0) { holder.innerHTML = ''; return; }
  const cat = categoriesData.find((c) => c.id === id);
  holder.innerHTML = `
    <div class="card">
      <label class="field-label">Name</label>
      <input class="field" type="text" id="edit-name-${id}" value="${cat.name}" />
      <label class="field-label">Icon</label>
      <input class="field" type="text" id="edit-icon-${id}" value="${cat.icon || ''}" />
      <label class="field-label">Order</label>
      <input class="field" type="number" id="edit-order-${id}" value="${cat.order}" />
      <label class="field-label"><input type="checkbox" id="edit-popular-${id}" ${cat.popular ? 'checked' : ''}/> Popular (shown first)</label>
      <label class="field-label">Subcategories (JSON) — array of { id, name, attributes: [...] }. Use an existing category as a template for the attribute shape (key/label/type/required/options, or dependsOn + refCollection for phone-style dependent chains).</label>
      <textarea class="field" id="edit-subs-${id}" rows="14" style="font-family:monospace;font-size:12px;">${JSON.stringify(cat.subcategories, null, 2)}</textarea>
      <div id="edit-error-${id}" class="error-banner" hidden></div>
      <div class="row">
        <button type="button" class="btn-primary" id="edit-save-${id}">Save</button>
        <button type="button" class="btn-ghost" id="edit-cancel-${id}">Cancel</button>
      </div>
    </div>
  `;
  document.getElementById(`edit-cancel-${id}`).addEventListener('click', () => { holder.innerHTML = ''; });
  document.getElementById(`edit-save-${id}`).addEventListener('click', () => saveCategory(id));
}

async function saveCategory(id) {
  const errorBox = document.getElementById(`edit-error-${id}`);
  hideFieldError(errorBox);
  const name = document.getElementById(`edit-name-${id}`).value.trim();
  const icon = document.getElementById(`edit-icon-${id}`).value.trim();
  const order = Number(document.getElementById(`edit-order-${id}`).value) || 0;
  const popular = document.getElementById(`edit-popular-${id}`).checked;
  let subcategories;
  try {
    subcategories = JSON.parse(document.getElementById(`edit-subs-${id}`).value);
    if (!Array.isArray(subcategories)) throw new Error('Subcategories must be a JSON array.');
  } catch (err) {
    showFieldError(errorBox, `Invalid subcategories JSON: ${err.message}`);
    return;
  }
  if (!name) { showFieldError(errorBox, 'Name is required.'); return; }
  const saveBtn = document.getElementById(`edit-save-${id}`);
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  try {
    await db.collection('categories').doc(id).set({ name, icon, order, popular, subcategories });
    await loadCategories();
  } catch (err) {
    showFieldError(errorBox, describeFirestoreError(err));
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

async function deleteCategory(id) {
  const cat = categoriesData.find((c) => c.id === id);
  if (!confirm(`Delete category "${cat.name}"? This removes it (and its subcategories) from Home and Post Ad immediately.`)) return;
  try {
    await db.collection('categories').doc(id).delete();
    await loadCategories();
  } catch (err) {
    alert(describeFirestoreError(err));
  }
}

async function addCategory() {
  const nameInput = document.getElementById('cat-add-name');
  const iconInput = document.getElementById('cat-add-icon');
  const popularInput = document.getElementById('cat-add-popular');
  const errorBox = document.getElementById('cat-add-error');
  hideFieldError(errorBox);
  const name = nameInput.value.trim();
  if (!name) { showFieldError(errorBox, 'Name is required.'); return; }
  const id = uniqueId(slugify(name), categoriesData.map((c) => c.id));
  const order = categoriesData.length ? Math.max(...categoriesData.map((c) => c.order || 0)) + 1 : 0;
  const addBtn = document.getElementById('cat-add-btn');
  addBtn.disabled = true;
  try {
    await db.collection('categories').doc(id).set({
      name, icon: iconInput.value.trim(), popular: popularInput.checked, order, subcategories: [],
    });
    nameInput.value = ''; iconInput.value = ''; popularInput.checked = false;
    await loadCategories();
  } catch (err) {
    showFieldError(errorBox, describeFirestoreError(err));
  } finally {
    addBtn.disabled = false;
  }
}

async function importStarterCategories() {
  const errorBox = document.getElementById('cat-import-error');
  hideFieldError(errorBox);
  const btn = document.getElementById('cat-import-btn');
  btn.disabled = true;
  btn.textContent = 'Importing…';
  try {
    const batch = db.batch();
    CATEGORY_SEED.forEach((cat) => {
      batch.set(db.collection('categories').doc(cat.id), cat);
    });
    await batch.commit();

    // Also seed the matching reference data (e.g. phoneModels) the
    // imported categories point at, if it isn't there already.
    for (const refId of Object.keys(REFERENCE_SEED)) {
      const brandNames = Object.keys(REFERENCE_SEED[refId]);
      const refBatch = db.batch();
      refBatch.set(db.collection('referenceData').doc(refId), { brands: brandNames }, { merge: true });
      brandNames.forEach((brand) => {
        const brandRef = db.collection('referenceData').doc(refId).collection('brands').doc(slugify(brand));
        refBatch.set(brandRef, { brand, models: REFERENCE_SEED[refId][brand] });
      });
      await refBatch.commit();
    }

    await loadCategories();
    await loadRefDataBrands();
  } catch (err) {
    showFieldError(errorBox, describeFirestoreError(err));
    btn.disabled = false;
    btn.textContent = 'Import starter categories';
  }
}

// --- Reference data sub-view ------------------------------------------
async function loadRefDataBrands() {
  const refId = document.getElementById('refdata-refid').value.trim() || 'phoneModels';
  const snap = await db.collection('referenceData').doc(refId).get();
  refDataBrands = snap.exists ? (snap.data().brands || []) : [];
  renderRefDataList();
}

function renderRefDataList() {
  const listEl = document.getElementById('refdata-list');
  const emptyEl = document.getElementById('refdata-empty');
  listEl.innerHTML = '';
  emptyEl.hidden = refDataBrands.length > 0;
  refDataBrands.forEach((brand) => {
    const id = slugify(brand);
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <div class="list-row-info"><div><strong>${brand}</strong></div></div>
      <div class="row-actions">
        <button type="button" class="icon-btn" data-act="edit" data-brand="${brand}">✎</button>
        <button type="button" class="icon-btn danger" data-act="delete" data-brand="${brand}">✕</button>
      </div>
    `;
    listEl.appendChild(row);
    const holder = document.createElement('div');
    holder.id = `refdata-editor-${id}`;
    listEl.appendChild(holder);
  });
  listEl.querySelectorAll('button[data-act="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => toggleBrandEditor(btn.dataset.brand));
  });
  listEl.querySelectorAll('button[data-act="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => deleteBrand(btn.dataset.brand));
  });
}

async function toggleBrandEditor(brand) {
  const id = slugify(brand);
  const holder = document.getElementById(`refdata-editor-${id}`);
  if (holder.childElementCount > 0) { holder.innerHTML = ''; return; }
  holder.innerHTML = `<div class="card"><p class="muted">Loading…</p></div>`;
  const refId = document.getElementById('refdata-refid').value.trim() || 'phoneModels';
  const snap = await db.collection('referenceData').doc(refId).collection('brands').doc(id).get();
  const models = snap.exists ? (snap.data().models || []) : [];
  holder.innerHTML = `
    <div class="card">
      <label class="field-label">Models (JSON) — one entry per model: {"model": "...", "storage": [], "ram": [], "color": []}</label>
      <textarea class="field" id="refdata-models-${id}" rows="14" style="font-family:monospace;font-size:12px;">${JSON.stringify(models, null, 2)}</textarea>
      <div id="refdata-edit-error-${id}" class="error-banner" hidden></div>
      <div class="row">
        <button type="button" class="btn-primary" id="refdata-save-${id}">Save</button>
        <button type="button" class="btn-ghost" id="refdata-cancel-${id}">Cancel</button>
      </div>
    </div>
  `;
  document.getElementById(`refdata-cancel-${id}`).addEventListener('click', () => { holder.innerHTML = ''; });
  document.getElementById(`refdata-save-${id}`).addEventListener('click', () => saveBrand(brand));
}

async function saveBrand(brand) {
  const id = slugify(brand);
  const errorBox = document.getElementById(`refdata-edit-error-${id}`);
  hideFieldError(errorBox);
  let models;
  try {
    models = JSON.parse(document.getElementById(`refdata-models-${id}`).value);
    if (!Array.isArray(models)) throw new Error('Models must be a JSON array.');
  } catch (err) {
    showFieldError(errorBox, `Invalid models JSON: ${err.message}`);
    return;
  }
  const refId = document.getElementById('refdata-refid').value.trim() || 'phoneModels';
  const saveBtn = document.getElementById(`refdata-save-${id}`);
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  try {
    await db.collection('referenceData').doc(refId).collection('brands').doc(id).set({ brand, models });
    document.getElementById(`refdata-editor-${id}`).innerHTML = '';
  } catch (err) {
    showFieldError(errorBox, describeFirestoreError(err));
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

async function deleteBrand(brand) {
  if (!confirm(`Delete brand "${brand}"? This removes all its models.`)) return;
  const refId = document.getElementById('refdata-refid').value.trim() || 'phoneModels';
  const id = slugify(brand);
  try {
    await db.collection('referenceData').doc(refId).collection('brands').doc(id).delete();
    refDataBrands = refDataBrands.filter((b) => b !== brand);
    await db.collection('referenceData').doc(refId).set({ brands: refDataBrands }, { merge: true });
    renderRefDataList();
  } catch (err) {
    alert(describeFirestoreError(err));
  }
}

async function addBrand() {
  const nameInput = document.getElementById('refdata-add-brand');
  const errorBox = document.getElementById('refdata-add-error');
  hideFieldError(errorBox);
  const brand = nameInput.value.trim();
  if (!brand) { showFieldError(errorBox, 'Brand name is required.'); return; }
  const refId = document.getElementById('refdata-refid').value.trim() || 'phoneModels';
  const id = slugify(brand);
  const addBtn = document.getElementById('refdata-add-btn');
  addBtn.disabled = true;
  try {
    await db.collection('referenceData').doc(refId).collection('brands').doc(id).set({ brand, models: [] });
    const newBrands = refDataBrands.includes(brand) ? refDataBrands : [...refDataBrands, brand];
    await db.collection('referenceData').doc(refId).set({ brands: newBrands }, { merge: true });
    nameInput.value = '';
    await loadRefDataBrands();
  } catch (err) {
    showFieldError(errorBox, describeFirestoreError(err));
  } finally {
    addBtn.disabled = false;
  }
}
