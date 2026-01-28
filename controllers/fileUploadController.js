import crypto from 'crypto';
import fs from 'fs/promises'; // ← use promises version (async/await friendly)
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import AppError from '../utils/appError.js';

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true); // accept
  } else {
    cb(
      new AppError('Only image files are allowed – invalid file type', 400),
      false,
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // optional but recommended
});

export const uploadImage = upload.single('image');

export const resizeImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const filename = `${Date.now()}-${crypto.randomUUID()}.jpg`;

    req.file.filename = filename;

    const uploadDir = path.join('public', 'image', `user-${req.user._id}`);

    await fs.mkdir(uploadDir, { recursive: true });

    const outputPath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .resize(500, 500, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    req.file.path = `/image/user-${req.user._id}/${filename}`;

    next();
  } catch (err) {
    return next(new AppError(`Image processing failed: ${err.message}`, 500));
  }
};
