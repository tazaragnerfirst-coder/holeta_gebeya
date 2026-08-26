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
