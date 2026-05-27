// Lightweight image compression utility using browser-image-compression
// Usage: compressImage(file, maxSizeMB) => Promise<File>

async function compressImage(file, maxSizeMB = 2) {
  if (!file || !/^image\//.test(file.type)) return file;
  if (file.size / 1024 / 1024 <= maxSizeMB) return file;
  if (!window.imageCompression) {
    throw new Error('browser-image-compression library not loaded');
  }
  return await window.imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });
}

window.compressImage = compressImage;
