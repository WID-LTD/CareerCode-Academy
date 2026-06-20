import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const s3Endpoint = process.env.S3_ENDPOINT;
const s3Bucket = process.env.S3_BUCKET;
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const s3Region = process.env.S3_REGION || 'auto';
const s3PublicUrl = process.env.S3_PUBLIC_URL;

let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (!s3Client && s3Endpoint && s3AccessKeyId && s3SecretAccessKey) {
    try {
      s3Client = new S3Client({
        endpoint: s3Endpoint,
        region: s3Region,
        credentials: {
          accessKeyId: s3AccessKeyId,
          secretAccessKey: s3SecretAccessKey,
        },
        forcePathStyle: true,
      });
      console.log('S3 storage client initialized');
    } catch (error) {
      console.error('Failed to initialize S3 client:', error);
    }
  }
  return s3Client;
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  folder: string = 'uploads'
): Promise<string> {
  const client = getS3Client();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${folder}/${Date.now()}-${safeName}`;

  if (client && s3Bucket) {
    let contentType = 'application/octet-stream';
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.mov') contentType = 'video/quicktime';
    else if (ext === '.webm') contentType = 'video/webm';

    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: filePath,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);

    if (s3PublicUrl) {
      const baseUrl = s3PublicUrl.endsWith('/') ? s3PublicUrl.slice(0, -1) : s3PublicUrl;
      return `${baseUrl}/${filePath}`;
    }

    return `${s3Endpoint}/${s3Bucket}/${filePath}`;
  }

  // Fallback: save to local disk
  const uploadDir = path.join(process.cwd(), 'uploads', folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const localPath = path.join(uploadDir, `${Date.now()}-${safeName}`);
  fs.writeFileSync(localPath, buffer);

  return `/uploads/${folder}/${path.basename(localPath)}`;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  const client = getS3Client();
  if (client && s3Bucket) {
    let key = '';
    if (s3PublicUrl && fileUrl.startsWith(s3PublicUrl)) {
      key = fileUrl.replace(s3PublicUrl, '').replace(/^\//, '');
    } else if (s3Endpoint && fileUrl.startsWith(s3Endpoint)) {
      const prefix = `${s3Endpoint}/${s3Bucket}/`;
      if (fileUrl.startsWith(prefix)) {
        key = fileUrl.replace(prefix, '');
      }
    } else {
      const urlParts = fileUrl.split('/');
      const bucketIndex = urlParts.indexOf(s3Bucket);
      if (bucketIndex !== -1) {
        key = urlParts.slice(bucketIndex + 1).join('/');
      } else {
        const match = fileUrl.match(/^https?:\/\/[^\/]+\/(.+)$/);
        if (match) {
          key = match[1];
        }
      }
    }

    if (key) {
      const command = new DeleteObjectCommand({
        Bucket: s3Bucket,
        Key: key,
      });
      await client.send(command);
    }
    return;
  }

  // Fallback: delete local file
  const localPath = path.join(process.cwd(), fileUrl.replace(/^\//, ''));
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
  }
}