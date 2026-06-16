import { CloudinaryImage } from '@cloudinary/url-gen';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';

export function isCloudinaryUrl(url: string): boolean {
  return url?.includes('res.cloudinary.com');
}

export function getCloudinaryImage(publicId: string): CloudinaryImage {
  return new CloudinaryImage(publicId, { cloudName: CLOUD_NAME });
}

export function optimizeImageUrl(url: string, width = 400, height = 250): string {
  if (!url) return '';
  if (isCloudinaryUrl(url)) {
    return url.replace('/upload/', `/upload/c_fill,w_${width},h_${height},f_auto,q_auto/`);
  }
  // Use Cloudinary fetch for external URLs
  if (CLOUD_NAME) {
    const encodedUrl = encodeURIComponent(url);
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/c_fill,w_${width},h_${height},f_auto,q_auto/${encodedUrl}`;
  }
  return url;
}

export function optimizeVideoThumbnail(url: string, width = 640, height = 360): string {
  if (!url) return '';
  if (isCloudinaryUrl(url)) {
    // For Cloudinary videos, generate a thumbnail
    const videoId = url.split('/upload/')[1]?.split('.')[0] || url;
    return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill,f_jpg/`);
  }
  if (CLOUD_NAME) {
    const encodedUrl = encodeURIComponent(url);
    return `https://res.cloudinary.com/${CLOUD_NAME}/video/fetch/c_fill,w_${width},h_${height},f_jpg/${encodedUrl}`;
  }
  return url;
}

