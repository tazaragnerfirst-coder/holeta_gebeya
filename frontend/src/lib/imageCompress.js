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
  const { canvas, width, height } = await drawToCanvas(file, maxDim);
  canvas.width = width;
  canvas.height = height;

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
    return { canvas, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
