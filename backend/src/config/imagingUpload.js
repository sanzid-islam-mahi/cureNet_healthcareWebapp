import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAllowedMedicalImagingFile } from '../lib/medicalImaging.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
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
