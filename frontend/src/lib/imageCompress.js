/**
 * Resizes and compresses an image File in the browser, returning a
 * base64 data URL small enough to store directly as a Firestore
 * field (Firestore documents cap out at ~1MiB total).
 *
 * Why base64-in-Firestore instead of Firebase Storage: Storage now
 * requires the paid Blaze plan to even provision a bucket. This
 * keeps everything on the free Spark plan.
 */
export async function fileToCompressedBase64(file, { maxDim = 1000, startQuality = 0.7, maxBytes = 160000 } = {}) {
  const canvas = await drawToCanvas(file, maxDim);

  let quality = startQuality;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  // Base64 is ~33% larger than raw bytes — approximate and back off quality until it fits.
  while (dataUrl.length * 0.75 > maxBytes && quality > 0.3) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
}

function scaledSize(sourceWidth, sourceHeight, maxDim) {
  let width = sourceWidth;
  let height = sourceHeight;
  if (width > maxDim || height > maxDim) {
    if (width >= height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
    else { width = Math.round(width * (maxDim / height)); height = maxDim; }
  }
  return { width, height };
}

// Decodes the file straight into a canvas via a blob URL + <img>
// element. Deliberately NOT using FileReader.readAsDataURL (loads
// the entire raw file into memory as base64 before decoding — what
// crashed on large camera photos) and NOT using createImageBitmap
// (has a known bug on some Android/Chromium hardware-decode paths
// where it silently produces a black canvas for certain photos).
// URL.createObjectURL is a cheap in-place reference to the blob, no
// full-file memory copy, while <img> decoding is the most broadly
// reliable path across devices.
async function drawToCanvas(file, maxDim) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Could not decode image.'));
    });
    // decode() (where available) waits for the image to be fully
    // ready for drawImage, avoiding a partially-decoded/black frame
    // on some devices even after onload has fired.
    if (img.decode) {
      try { await img.decode(); } catch { /* onload already confirmed it's usable */ }
    }
    const { width, height } = scaledSize(img.naturalWidth || img.width, img.naturalHeight || img.height, maxDim);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const bytesOf = (dataUrl) => dataUrl.length * 0.75; // base64 is ~33% larger than raw bytes
const totalBytes = (dataUrls) => dataUrls.reduce((sum, u) => sum + (u ? bytesOf(u) : 0), 0);
const encodeAll = (canvases, quality) => canvases.map((c) => (c ? c.toDataURL('image/jpeg', quality) : null));

/**
 * Compresses a batch of image Files to fit a single shared byte
 * budget, splitting that budget across however many photos are in
 * the batch — the same total budget produces higher per-photo
 * quality for 2 photos than for 5, and recomputing the whole batch
 * whenever the set changes (add/remove) means nothing ever gets
 * double-compressed from an already-lossy copy.
 *
 * Quality is reduced uniformly across all photos together (not
 * per-photo independently) so the result doesn't depend on which
 * photo happened to be picked first, and it's driven by the true
 * measured output size rather than guessing from the original
 * file's size (which mostly reflects resolution/megapixels, not how
 * well a given photo will actually compress).
 *
 * Returns { dataUrls, errors, overBudget } — dataUrls[i]/errors[i]
 * line up with the input files array (one or the other is set per
 * index, never both), so one bad photo never blocks the rest of the
 * batch. overBudget is true if the budget still couldn't be met even
 * at the lowest quality/resolution step tried.
 */
export async function compressImagesToBudget(files, { totalBudget = 850000, startQuality = 0.75, minQuality = 0.3 } = {}) {
  if (files.length === 0) return { dataUrls: [], errors: [], overBudget: false };

  const dimSteps = [1000, 700, 500];
  let canvases = [];
  let errors = new Array(files.length).fill(null);

  for (let step = 0; step < dimSteps.length; step++) {
    const settled = await Promise.allSettled(
      files.map((f, i) => (errors[i] ? Promise.reject(errors[i]) : drawToCanvas(f, dimSteps[step])))
    );
    canvases = settled.map((s, i) => {
      if (s.status === 'fulfilled') return s.value;
      errors[i] = errors[i] || s.reason;
      return null;
    });

    let quality = startQuality;
    let dataUrls = encodeAll(canvases, quality);
    while (totalBytes(dataUrls) > totalBudget && quality > minQuality) {
      quality -= 0.05;
      dataUrls = encodeAll(canvases, quality);
    }

    const fits = totalBytes(dataUrls) <= totalBudget;
    const isLastStep = step === dimSteps.length - 1;
    if (fits || isLastStep) {
      return { dataUrls, errors, overBudget: !fits };
    }
    // Didn't fit even at minQuality — shrink resolution and try again.
  }
}


