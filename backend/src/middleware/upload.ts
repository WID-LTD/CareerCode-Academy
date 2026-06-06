import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadFile } from '../config/storage';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: jpg, png, gif, webp, pdf, mp4, mov'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } });

// Middleware that uploads to Supabase after multer saves locally
export function uploadToCloud(fieldName: string, folder: string = 'uploads') {
  return [
    upload.single(fieldName),
    async (req: any, _res: any, next: any) => {
      if (req.file) {
        try {
          const buffer = fs.readFileSync(req.file.path);
          const publicUrl = await uploadFile(buffer, req.file.originalname, folder);
          // Replace local path with cloud URL
          req.file.filename = publicUrl;
          req.file.path = publicUrl;
          // Clean up local file
          fs.unlinkSync(req.file.path);
          // Actually we need to be careful here - let's just set req.body[fieldName] to the URL
          req.body[fieldName] = publicUrl;
        } catch (error) {
          console.error('Cloud upload failed, using local file:', error);
        }
      }
      next();
    },
  ];
}

export const uploadSingle = (fieldName: string) => upload.single(fieldName);
export const uploadMultiple = (fieldName: string, maxCount: number = 5) =>
  upload.array(fieldName, maxCount);
export const uploadFields = (fields: multer.Field[]) => upload.fields(fields);
