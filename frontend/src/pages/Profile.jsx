import React, { useEffect, useState } from 'react';
import { getUnsafeUserPreview } from '../lib/telegram';

export default function Profile() {
  const [preview, setPreview] = useState(null);

  useEffect(() => { setPreview(getUnsafeUserPreview()); }, []);

  return (
    <div className="page">
      <div className="profile-head">
        <h2>{preview ? `${preview.first_name || ''} ${preview.last_name || ''}`.trim() : 'Guest'}</h2>
        {preview?.username && <div className="tg">@{preview.username}</div>}
      </div>
      <div className="menu-list">
        <div className="menu-item">Favorites</div>
        <div className="menu-item">Notifications</div>
        <div className="menu-item">Help & Support</div>
      </div>
    </div>
  );
}
