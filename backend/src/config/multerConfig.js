import multer from 'multer';
import path from 'path';
import { getUploadsDir } from './appPaths.js';

const storage = multer.diskStorage({
    destination: getUploadsDir(),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        const prefix = req.user?.role || 'profile';
        cb(null, `${prefix}-${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname);
        if (allowed) cb(null, true);
        else cb(new Error('Only JPG, PNG, GIF, WEBP allowed'));
    },
});

export default upload;
