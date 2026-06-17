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

// Helper to resolve S3 vs Local URL
export function getFileUrl(file: any): string | null {
  if (!file) return null;
  if (file.filename && (file.filename.startsWith('http://') || file.filename.startsWith('https://'))) {
    return file.filename;
  }
  return `/uploads/${file.filename || file.name}`;
}

// Transparent upload to Cloud (S3/R2) middleware if configured
export function uploadSingle(fieldName: string, folder: string = 'uploads') {
  return [
    upload.single(fieldName),
    async (req: any, _res: any, next: any) => {
      if (req.file) {
        try {
          if (process.env.S3_ENDPOINT && process.env.S3_BUCKET) {
            const localPath = req.file.path;
            const buffer = fs.readFileSync(localPath);
            const publicUrl = await uploadFile(buffer, req.file.filename, folder);
            
            try {
              fs.unlinkSync(localPath);
            } catch (unlinkError) {
              console.error('Failed to clean up local upload file:', unlinkError);
            }

            req.file.filename = publicUrl;
            req.file.path = publicUrl;
          }
        } catch (error) {
          console.error('Cloud upload failed, using local file:', error);
        }
      }
      next();
    },
  ];
}

export function uploadMultiple(fieldName: string, maxCount: number = 5, folder: string = 'uploads') {
  return [
    upload.array(fieldName, maxCount),
    async (req: any, _res: any, next: any) => {
      if (req.files && Array.isArray(req.files)) {
        try {
          if (process.env.S3_ENDPOINT && process.env.S3_BUCKET) {
            for (const file of req.files) {
              const localPath = file.path;
              const buffer = fs.readFileSync(localPath);
              const publicUrl = await uploadFile(buffer, file.filename, folder);
              
              try {
                fs.unlinkSync(localPath);
              } catch (unlinkError) {
                console.error('Failed to clean up local upload file:', unlinkError);
              }

              file.filename = publicUrl;
              file.path = publicUrl;
            }
          }
        } catch (error) {
          console.error('Cloud upload failed, using local file:', error);
        }
      }
      next();
    },
  ];
}

export function uploadFields(fields: multer.Field[], folder: string = 'uploads') {
  return [
    upload.fields(fields),
    async (req: any, _res: any, next: any) => {
      if (req.files) {
        try {
          if (process.env.S3_ENDPOINT && process.env.S3_BUCKET) {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            for (const fieldname of Object.keys(files)) {
              for (const file of files[fieldname]) {
                const localPath = file.path;
                const buffer = fs.readFileSync(localPath);
                const publicUrl = await uploadFile(buffer, file.filename, folder);
                
                try {
                  fs.unlinkSync(localPath);
                } catch (unlinkError) {
                  console.error('Failed to clean up local upload file:', unlinkError);
                }

                file.filename = publicUrl;
                file.path = publicUrl;
              }
            }
          }
        } catch (error) {
          console.error('Cloud upload failed, using local file:', error);
        }
      }
      next();
    },
  ];
}

