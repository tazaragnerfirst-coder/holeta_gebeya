import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUnsafeUserPreview } from '../lib/telegram';
import { getMyProfile } from '../lib/profile';
import { useAppData } from '../lib/appData';
import { useRequireRegistered } from '../lib/authGate.jsx';
import { auth, BACKEND_URL } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { SUPPORT_UID } from '../lib/constants';
import Icon from '../components/Icon.jsx';
import EditProfileSheet from '../components/EditProfileSheet.jsx';

export default function Profile() {
  const navigate = useNavigate();
  const requireRegistered = useRequireRegistered();
  const { registeredUid, clearRegistered, ads, favorites } = useAppData();
  const [profile, setProfile] = useState(null);

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

  async function handleEditSubmit({ fullName, phone, photoUrl }) {
    setEditBusy(true);
    setEditError('');
    try {
      const idToken = await auth.currentUser.getIdToken();
      const r = await fetch(`${BACKEND_URL}/updateProfile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, fullName, phone, photoUrl }),
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

  const menu = [
    { icon: 'edit', t: 'Edit Profile', onClick: openEdit },
    { icon: 'briefcase', t: 'My Ads', sub: registeredUid ? `${ads.length} listing${ads.length === 1 ? '' : 's'}` : null, onClick: goMyAds },
    { icon: 'heart', t: 'Favorites', sub: registeredUid ? `${favorites.length} saved` : null, onClick: goFavorites },
    { icon: 'helpCircle', t: 'Help & Support', onClick: goSupport },
  ];

  return (
    <div className="page">
      <div className="profile-head">
        <div
          className="avatar-lg"
          style={photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          {!photo && initial}
        </div>
        <h2>{name}</h2>
        {profile?.phone && <div className="tg"><Icon name="phone" size={12} /> {profile.phone}</div>}
        {!profile?.phone && preview?.username && <div className="tg"><Icon name="send" size={13} /> @{preview.username}</div>}
      </div>

      <div className="menu-list">
        {menu.map((m) => (
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

      <EditProfileSheet
        open={editOpen}
        busy={editBusy}
        error={editError}
        initialName={profile?.name && profile.name !== 'User' ? profile.name : ''}
        initialPhone={profile?.phone || ''}
        initialPhoto={profile?.photo || ''}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
