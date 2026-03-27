import multer from 'multer';
import path from 'path';
import { isAllowedMedicalImagingFile } from '../lib/medicalImaging.js';
import { getUploadsDir } from './appPaths.js';

const storage = multer.diskStorage({
  destination: getUploadsDir(),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `imaging-${Date.now()}${ext}`);
  },
});

const imagingUpload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedMedicalImagingFile(file)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only PDF, JPG, PNG, WEBP, GIF, TIFF, and BMP files are allowed'));
  },
});

export default imagingUpload;
