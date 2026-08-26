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
      showFieldError(errorBox, err.message || 'Could not save. Please try again.');
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
      showFieldError(errorBox, err.message || 'Could not remove. Please try again.');
    }
  });
}

// --- Search-bar promo carousel (config/homeBanners) -----------------
let pendingCarouselDataUrl = null;
let carouselBanners = [];

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
}

async function saveCarousel() {
  await db.collection('config').doc('homeBanners').set({ banners: carouselBanners }, { merge: true });
}

async function handleCarouselAction(act, i) {
  if (act === 'remove') {
    if (!confirm('Remove this slide?')) return;
    carouselBanners.splice(i, 1);
  } else if (act === 'up' && i > 0) {
    [carouselBanners[i - 1], carouselBanners[i]] = [carouselBanners[i], carouselBanners[i - 1]];
  } else if (act === 'down' && i < carouselBanners.length - 1) {
    [carouselBanners[i + 1], carouselBanners[i]] = [carouselBanners[i], carouselBanners[i + 1]];
  }
  renderCarouselList();
  await saveCarousel();
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
    try {
      pendingCarouselDataUrl = await compressImageToDataUrl(file, { maxWidth: 1000, quality: 0.7 });
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
      showFieldError(errorBox, err.message || 'Could not add slide. Please try again.');
    } finally {
      addBtn.disabled = true;
      addBtn.textContent = 'Add slide';
    }
  });
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
