import React, { useRef } from 'react';

export default function ImageUploader({ files, onChange, maxImages = 8 }) {
  const inputRef = useRef(null);

  function addFiles(fileList) {
    const picked = Array.from(fileList).slice(0, maxImages - files.length);
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
        {files.length < maxImages && (
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
      <p className="helper-text">{files.length}/{maxImages} photos</p>
    </div>
  );
}
