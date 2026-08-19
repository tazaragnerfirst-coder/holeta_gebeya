import React, { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { compressImagesToBudget } from '../lib/imageCompress';

// Total bytes all photos on a listing may share, once base64-encoded
// — kept under Firestore's ~1MiB document cap with headroom for the
// other fields (title, description, seller info, etc).
const TOTAL_IMAGE_BUDGET = 850000;
// Floor so a large batch doesn't get squeezed into unusable mush.
const MIN_BUDGET_PER_PHOTO = 60000;

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

let keySeq = 0;

export default function ImageUploader({ files, onChange, maxImages = 8 }) {
  const inputRef = useRef(null);
  // entries: { key, kind: 'existing' (edit-mode preload, fixed) |
  // 'new' (freshly picked, its File kept so it can be recompressed
  // as the batch changes), file, dataUrl }
  const [entries, setEntries] = useState(() => files.map((f) => ({
    key: `e${keySeq++}`,
    kind: 'existing',
    file: null,
    dataUrl: f,
  })));
  const [converting, setConverting] = useState(false);
  const [warning, setWarning] = useState('');

  // Recompresses every 'new' entry together against the budget left
  // over after 'existing' entries' fixed byte cost, then reports the
  // merged data-URL list to the parent. Re-running this for the
  // whole batch (not just the newly added photos) on every add/remove
  // is what lets removing a photo hand its freed budget to the ones
  // that remain, and keeps quality independent of pick order.
  async function recompute(nextEntries) {
    const newOnes = nextEntries.filter((e) => e.kind === 'new');
    if (newOnes.length === 0) {
      setEntries(nextEntries);
      onChange(nextEntries.map((e) => e.dataUrl));
      return;
    }

    setConverting(true);
    setWarning('');
    try {
      const existingBytes = nextEntries
        .filter((e) => e.kind === 'existing')
        .reduce((sum, e) => sum + (e.dataUrl ? e.dataUrl.length * 0.75 : 0), 0);
      const budget = Math.max(TOTAL_IMAGE_BUDGET - existingBytes, MIN_BUDGET_PER_PHOTO * newOnes.length);

      const { dataUrls, errors, overBudget } = await compressImagesToBudget(newOnes.map((e) => e.file), { totalBudget: budget });

      let ni = 0;
      const merged = nextEntries
        .map((e) => {
          if (e.kind !== 'new') return e;
          const result = { ...e, dataUrl: dataUrls[ni], failed: !!errors[ni] };
          ni++;
          return result;
        })
        .filter((e) => !e.failed);

      const failedCount = newOnes.length - merged.filter((e) => e.kind === 'new').length;
      setEntries(merged);
      onChange(merged.map((e) => e.dataUrl));

      if (failedCount > 0) {
        setWarning(
          failedCount === 1
            ? "One photo couldn't be processed — try picking it again or use a different photo."
            : `${failedCount} photos couldn't be processed — try picking them again or use different photos.`
        );
      } else if (overBudget) {
        setWarning('These photos are quite detailed, so quality was reduced to fit — remove one for sharper results.');
      }
    } finally {
      setConverting(false);
    }
  }

  async function addFiles(fileList) {
    const picked = Array.from(fileList).slice(0, maxImages - entries.length);
    if (picked.length === 0) return;
    setConverting(true);
    setWarning('');
    let readable;
    try {
      readable = await Promise.all(picked.map(toBrowserReadable));
    } catch {
      setConverting(false);
      setWarning("Couldn't process one of those photos — try a different one.");
      return;
    }
    const newEntries = readable.map((file) => ({ key: `n${keySeq++}`, kind: 'new', file, dataUrl: null }));
    await recompute([...entries, ...newEntries]);
  }

  function removeAt(i) {
    recompute(entries.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="upload-grid">
        {entries.map((e, i) => (
          <div className="upload-slot filled" key={e.key} style={{ backgroundImage: `url(${e.dataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <span className="x" onClick={() => removeAt(i)}><Icon name="x" size={12} /></span>
          </div>
        ))}
        {entries.length < maxImages && (
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
      <p className="helper-text">{converting ? 'Processing photos...' : `${entries.length}/${maxImages} photos`}</p>
      {warning && <p className="helper-text error-text">{warning}</p>}
    </div>
  );
}
