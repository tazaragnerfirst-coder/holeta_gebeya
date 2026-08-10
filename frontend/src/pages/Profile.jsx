import React, { useEffect, useState } from 'react';
import { getUnsafeUserPreview } from '../lib/telegram';
import Icon from '../components/Icon.jsx';

export default function Profile() {
  const [preview, setPreview] = useState(null);

  useEffect(() => { setPreview(getUnsafeUserPreview()); }, []);

  const name = preview ? `${preview.first_name || ''} ${preview.last_name || ''}`.trim() : 'Guest';
  const initial = name ? name[0].toUpperCase() : '?';

  const menu = [
    { icon: 'heart', t: 'Favorites' },
    { icon: 'checkCircle', t: 'Notifications' },
    { icon: 'helpCircle', t: 'Help & Support' },
  ];

  return (
    <div className="page">
      <div className="profile-head">
        <div className="avatar-lg">{initial}</div>
        <h2>{name}</h2>
        {preview?.username && <div className="tg"><Icon name="send" size={13} /> @{preview.username}</div>}
      </div>
      <div className="menu-list">
        {menu.map((m) => (
          <div className="menu-item" key={m.t}>
            <div className="menu-icon"><Icon name={m.icon} size={17} /></div>
            <div className="t">{m.t}</div>
            <div className="chev"><Icon name="chevronLeft" size={16} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
