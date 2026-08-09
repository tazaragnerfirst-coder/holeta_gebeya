import React, { useRef } from 'react';

const MAX_IMAGES = 8;

/**
 * Lets the user pick up to MAX_IMAGES photos before posting.
 * Keeps raw File objects in state (parent) — actual upload to
 * Firebase Storage happens on submit, after login, in PostAd.jsx.
 */
export default function ImageUploader({ files, onChange }) {
  const inputRef = useRef(null);

  function addFiles(fileList) {
    const picked = Array.from(fileList).slice(0, MAX_IMAGES - files.length);
    onChange([...files, ...picked]);
  }
  function removeAt(i) {
    onChange(files.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="upload-grid">
        {files.map((f, i) => (
          <div className="upload-slot filled" key={i} style={{ backgroundImage: `url(${URL.createObjectURL(f)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <span className="x" onClick={() => removeAt(i)}>×</span>
          </div>
        ))}
        {files.length < MAX_IMAGES && (
          <div className="upload-slot" onClick={() => inputRef.current?.click()}>+</div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
      />
      <p className="helper-text">{files.length}/{MAX_IMAGES} photos</p>
    </div>
  );
}
