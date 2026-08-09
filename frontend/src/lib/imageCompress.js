/**
 * Resizes and compresses an image File in the browser, returning a
 * base64 data URL small enough to store directly as a Firestore
 * field (Firestore documents cap out at ~1MiB total).
 *
 * Why base64-in-Firestore instead of Firebase Storage: Storage now
 * requires the paid Blaze plan to even provision a bucket. This
 * keeps everything on the free Spark plan.
 */
export function fileToCompressedBase64(file, { maxDim = 1000, startQuality = 0.7, maxBytes = 160000 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else { width = Math.round(width * (maxDim / height)); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        let quality = startQuality;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        // Base64 is ~33% larger than raw bytes — approximate and back off quality until it fits.
        while (dataUrl.length * 0.75 > maxBytes && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
