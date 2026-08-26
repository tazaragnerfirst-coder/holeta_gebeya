// Resizes an image file down to maxWidth and re-encodes it as a
// JPEG data URL at the given quality, so banner images stay small
// enough to store directly as a Firestore field (same approach the
// main app uses for listing photos — see
// frontend/src/lib/imageCompress.js — kept intentionally simpler
// here since this is a single admin-controlled image, not
// user-uploaded photos needing HEIC/camera-resolution handling).
function compressImageToDataUrl(file, { maxWidth = 1280, quality = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.onload = () => {
      img.onerror = () => reject(new Error('That file could not be read as an image.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
