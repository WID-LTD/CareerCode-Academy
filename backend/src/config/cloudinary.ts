import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from 'cloudinary';
// @ts-ignore
import streamifier from 'streamifier';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

export function isCloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export async function uploadVideo(buffer: Buffer, publicId: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const options: UploadApiOptions = {
      public_id: publicId,
      resource_type: 'video',
      folder: 'careercode/videos',
      eager: [
        { width: 300, height: 200, crop: 'pad', audio_codec: 'none', format: 'jpg' },
      ],
      eager_async: true,
    };

    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result!);
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

export async function generateThumbnail(publicId: string): Promise<string> {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    width: 640,
    height: 360,
    crop: 'fill',
    secure: true,
  });
}

export async function getStreamingUrl(publicId: string): Promise<string> {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'm3u8',
    secure: true,
  });
}

export async function deleteVideo(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
}

export default cloudinary;
