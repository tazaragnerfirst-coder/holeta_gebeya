import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUnsafeUserPreview } from '../lib/telegram';
import { getMyProfile } from '../lib/profile';
import { useAppData } from '../lib/appData';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { auth, BACKEND_URL } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { SUPPORT_UID } from '../lib/constants';
import { getAppBannerUrl, getCachedAppBannerUrl } from '../lib/appBanner';
import { getSellerRating } from '../lib/rating';
import Icon from '../components/Icon.jsx';
import StarRow from '../components/StarRow.jsx';
import EditProfileSheet from '../components/EditProfileSheet.jsx';

export default function Profile() {
  const navigate = useNavigate();
  const requireRegistered = useRequireRegistered();
  const { registeredUid, clearRegistered, ads } = useAppData();
  const [profile, setProfile] = useState(null);
  const [bannerUrl, setBannerUrl] = useState(() => getCachedAppBannerUrl());
  const [rating, setRating] = useState({ avg: 0, count: 0 });

  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  const preview = getUnsafeUserPreview();

  async function loadProfile() {
    if (registeredUid) {
      const p = await getMyProfile(registeredUid);
      setProfile(p);
    } else {
      setProfile(null);
    }
  }

  useEffect(() => { loadProfile(); }, [registeredUid]);
  useEffect(() => { getAppBannerUrl().then(setBannerUrl); }, []);
  useEffect(() => {
    if (registeredUid) getSellerRating(registeredUid).then(setRating);
    else setRating({ avg: 0, count: 0 });
  }, [registeredUid]);

  const name = profile?.name || [preview?.first_name, preview?.last_name].filter(Boolean).join(' ') || 'Guest';
  const photo = profile?.photo || preview?.photo_url || '';
  const initial = name ? name[0].toUpperCase() : '?';

  async function openEdit() {
    try {
      await requireRegistered();
      setEditError('');
      setEditOpen(true);
    } catch {
      // requireRegistered() already surfaces its own signup sheet on cancel/failure.
    }
  }

  async function handleEditSubmit({ fullName, phone, photoUrl, location }) {
    setEditBusy(true);
    setEditError('');
    try {
      const idToken = await auth.currentUser.getIdToken();
      const r = await fetch(`${BACKEND_URL}/updateProfile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, fullName, phone, photoUrl, location }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Couldn't save your details.");
      setEditOpen(false);
      await loadProfile();
    } catch (err) {
      setEditError(err.message || "Couldn't save your details. Please try again.");
    } finally {
      setEditBusy(false);
    }
  }

  async function goFavorites() {
    await requireRegistered().catch(() => {});
    navigate('/favorites');
  }

  async function goMyAds() {
    await requireRegistered().catch(() => {});
    navigate('/dashboard/ads');
  }

  async function goSupport() {
    const user = await requireRegistered().catch(() => null);
    if (user) navigate(`/chat/${SUPPORT_UID}_${user.uid}`);
  }

  async function handleLogout() {
    const uid = registeredUid;
    try { await signOut(auth); } catch {}
    if (uid) clearRegistered(uid);
    setProfile(null);
    navigate('/');
  }

  async function goSubscription() {
    await requireRegistered().catch(() => {});
    navigate('/subscription');
  }

  async function goBoost() {
    await requireRegistered().catch(() => {});
    navigate('/boost');
  }

  async function goMyStore() {
    await requireRegistered().catch(() => {});
    navigate('/my-store');
  }

  const quickActions = [
    { icon: 'edit', t: 'Edit Info', onClick: openEdit },
    { icon: 'heart', t: 'Favorites', onClick: goFavorites },
    { icon: 'sliders', t: 'Settings', onClick: () => navigate('/settings') },
  ];

  const box1 = [
    { icon: 'crown', t: 'Subscription', onClick: goSubscription },
    { icon: 'trendingUp', t: 'Boost', onClick: goBoost },
    { icon: 'coin', t: 'Holeta Coin', sub: 'Soon', onClick: () => navigate('/holeta-coin') },
  ];

  const box2 = [
    { icon: 'briefcase', t: 'My Ads', sub: registeredUid ? `${ads.length} listing${ads.length === 1 ? '' : 's'}` : null, onClick: goMyAds },
    { icon: 'store', t: 'My Store', onClick: goMyStore },
    { icon: 'shieldLock', t: 'Privacy Policy', onClick: () => navigate('/privacy-policy') },
    { icon: 'helpCircle', t: 'Help & Support', onClick: goSupport },
  ];

  return (
    <div className="page px">
      <div className="profile-hero-card">
        {bannerUrl
          ? <img className="profile-hero-img" src={bannerUrl} alt="" />
          : <div className="profile-hero-fallback" />}
        <div className="profile-hero-shade" />
        <div className="profile-pill">
          <div
            className="avatar-lg"
            style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          >
            {!photo && initial}
          </div>
          <div className="info">
            <h2>{name}</h2>
            <div className="stars">
              <StarRow value={rating.avg} size={14} />
              {rating.count > 0 && <span className="rating-count">{rating.avg.toFixed(1)} ({rating.count})</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="px16">
        <div className="quick-row">
          {quickActions.map((q) => (
            <div className="quick-card" key={q.t} onClick={q.onClick}>
              <div className="qi"><Icon name={q.icon} size={18} /></div>
              <span>{q.t}</span>
            </div>
          ))}
        </div>

        <div className="menu-list" style={{ marginTop: 14 }}>
          {box1.map((m) => (
            <div className="menu-item" key={m.t} onClick={m.onClick}>
              <div className="menu-icon"><Icon name={m.icon} size={17} /></div>
              <div className="t">
                {m.t}
                {m.sub && <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--ink-faint)', marginTop: 1 }}>{m.sub}</span>}
              </div>
              <div className="chev"><Icon name="chevronLeft" size={16} /></div>
            </div>
          ))}
        </div>

        <div className="menu-list" style={{ marginTop: 12 }}>
          {box2.map((m) => (
            <div className="menu-item" key={m.t} onClick={m.onClick}>
              <div className="menu-icon"><Icon name={m.icon} size={17} /></div>
              <div className="t">
                {m.t}
                {m.sub && <span style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--ink-faint)', marginTop: 1 }}>{m.sub}</span>}
              </div>
              <div className="chev"><Icon name="chevronLeft" size={16} /></div>
            </div>
          ))}
        </div>

        {registeredUid && (
          <div className="menu-list" style={{ marginTop: 12 }}>
            <div className="menu-item" onClick={handleLogout}>
              <div className="menu-icon" style={{ color: 'var(--safety)' }}><Icon name="logOut" size={17} /></div>
              <div className="t" style={{ color: 'var(--safety)' }}>Logout</div>
            </div>
          </div>
        )}
      </div>

      <EditProfileSheet
        open={editOpen}
        busy={editBusy}
        error={editError}
        initialName={profile?.name && profile.name !== 'User' ? profile.name : ''}
        initialPhone={profile?.phone || ''}
        initialPhoto={profile?.photo || ''}
        initialLocation={profile?.location || ''}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
