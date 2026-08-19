import React, { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { fileToCompressedBase64 } from '../lib/imageCompress';

function isHeic(file) {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

// iPhones save camera photos as HEIC/HEIF by default. Browsers can't
// decode that format into an <img>/canvas at all, so it needs
// converting to JPEG before anything else can read it. heic2any is
// ~350KB gzipped, so it's only fetched on demand (dynamic import)
// when a HEIC file actually shows up — everyone else never pays for it.
async function toBrowserReadable(file) {
  if (!isHeic(file)) return file;
  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' });
}

// Resolves straight to a compressed base64 data URL — never a raw
// File/blob URL. Full-resolution camera photos (often 5-15MB) were
// shown via a live blob URL before, which some Android WebViews
// (Telegram's included) fail to render for large content://-backed
// files with no visible error, leaving the slot silently blank —
// exactly the "screenshot works, camera doesn't" symptom. Doing the
// resize/compress here, at selection time, means every slot only
// ever displays a small, guaranteed-decodable data URL, and a photo
// that can't be processed shows a real error instead of nothing.
async function toDataUrl(file) {
  const readable = await toBrowserReadable(file);
  return fileToCompressedBase64(readable);
}

export default function ImageUploader({ files, onChange, maxImages = 8 }) {
  const inputRef = useRef(null);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');

  async function addFiles(fileList) {
    const picked = Array.from(fileList).slice(0, maxImages - files.length);
    if (picked.length === 0) return;
    setConvertError('');
    setConverting(true);
    try {
      const results = await Promise.allSettled(picked.map(toDataUrl));
      const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
      const failCount = results.length - ok.length;
      if (ok.length > 0) onChange([...files, ...ok]);
      if (failCount > 0) {
        setConvertError(
          failCount === 1
            ? "One photo couldn't be processed — try picking it again or use a different photo."
            : `${failCount} photos couldn't be processed — try picking them again or use different photos.`
        );
      }
    } finally {
      setConverting(false);
    }
  }
  function removeAt(i) {
    onChange(files.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="upload-grid">
        {files.map((f, i) => (
          <div className="upload-slot filled" key={i} style={{ backgroundImage: `url(${f})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <span className="x" onClick={() => removeAt(i)}><Icon name="x" size={12} /></span>
          </div>
        ))}
        {files.length < maxImages && (
          <div className="upload-slot" onClick={() => !converting && inputRef.current?.click()}>
            {converting ? <span className="spinner" /> : <Icon name="camera" size={20} />}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
      />
      <p className="helper-text">{converting ? 'Processing photo...' : `${files.length}/${maxImages} photos`}</p>
      {convertError && <p className="helper-text error-text">{convertError}</p>}
    </div>
  );
}
