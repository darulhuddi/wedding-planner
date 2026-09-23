/**
 * Client-Side Image Optimizer
 *
 * Resizes and compresses local image files in browser memory BEFORE uploading to Supabase.
 * - Maximum resolution: 1600 x 1600
 * - Output format: image/webp
 * - Compression quality: 0.82
 */

export interface OptimizationOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: string;
}

export async function optimizeImageBeforeUpload(
  file: File,
  options: OptimizationOptions = {}
): Promise<File> {
  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.82;
  const mimeType = options.mimeType ?? 'image/webp';

  // If file is not an image or is very small (under 200KB WebP), return original
  if (!file || !file.type.startsWith('image/') || (file.type === 'image/webp' && file.size < 200 * 1024)) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    let targetWidth = width;
    let targetHeight = height;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        targetWidth = maxDimension;
        targetHeight = Math.round((height * maxDimension) / width);
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.round((width * maxDimension) / height);
      }
    }

    // Draw to canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeType, quality);
    });

    if (!blob) {
      return file;
    }

    // Replace extension with .webp
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || 'optimized_image';
    const newFileName = `${baseName}.webp`;

    return new File([blob], newFileName, {
      type: mimeType,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('[ImageOptimizer] Client-side canvas compression fallback to original file:', error);
    return file;
  }
}
