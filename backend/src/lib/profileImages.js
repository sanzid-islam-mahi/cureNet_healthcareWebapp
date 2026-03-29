import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { getUploadsDir } from '../config/appPaths.js';

export async function optimizeProfileImage(file, { prefix = 'profile' } = {}) {
  if (!file?.filename) {
    throw new Error('No uploaded file provided');
  }

  const uploadsDir = getUploadsDir();
  const inputPath = file.path || path.join(uploadsDir, file.filename);
  const outputFileName = `${prefix}-${Date.now()}-optimized.webp`;
  const outputPath = path.join(uploadsDir, outputFileName);

  await sharp(inputPath)
    .rotate()
    .resize(512, 512, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(outputPath);

  if (outputPath !== inputPath) {
    await fs.unlink(inputPath).catch(() => {});
  }

  return {
    fileName: outputFileName,
    imageUrl: `/uploads/${outputFileName}`,
  };
}
