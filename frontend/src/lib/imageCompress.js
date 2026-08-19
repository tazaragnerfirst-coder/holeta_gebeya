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

// Decodes the file straight into a canvas. Prefers createImageBitmap,
// which decodes a Blob directly — no full-file base64 string ever
// held in memory, which is what was crashing on large (10-25MB)
// full-resolution camera photos inside Telegram's WebView. Falls
// back to the FileReader+<img> approach for older browsers that
// lack createImageBitmap.
async function drawToCanvas(file, maxDim) {
  if (typeof createImageBitmap === 'function') {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error('Could not decode image.');
    }
    const { width, height } = scaledSize(bitmap.width, bitmap.height, maxDim);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    return { canvas, width, height };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image.'));
      img.onload = () => {
        const { width, height } = scaledSize(img.width, img.height, maxDim);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve({ canvas, width, height });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
