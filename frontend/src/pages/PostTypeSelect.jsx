import React from 'react';
import { useNavigate } from 'react-router-dom';

// Landing screen for /post (#hog013). Its own route — not step 1 of
// PostAd's internal state — so /post always opens here first, every
// time, regardless of any in-progress draft (see postDraft.js).
// Picking a type navigates to /post/:type, PostAd's own route for
// that type's form.
const POST_TYPES = [
  { key: 'product', label: 'Product' },
  { key: 'service', label: 'Service' },
  { key: 'job', label: 'Job' },
  { key: 'rent', label: 'Rent' },
];

export default function PostTypeSelect() {
  const navigate = useNavigate();
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
                onClick={() => navigate(`/post/${t.key}`)}
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
