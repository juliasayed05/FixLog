import multer from 'multer';
import { HttpError } from '../utils/httpError.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) return callback(new HttpError(422, 'Choose a JPG, PNG, WebP, or GIF image.'));
    callback(null, true);
  },
});
