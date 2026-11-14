import api from './axios';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Single upload entry point. Keeps multipart handling, progress/error shape,
 * and URL resolution in one place so every feature behaves the same way.
 */
export async function uploadFile(
  file: File | Blob,
  filename?: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const form = new FormData();
  const name = filename || (file as File).name || `upload-${Date.now()}`;
  form.append('file', file, name);
  const { data } = await api.post('/upload', form, {
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  const result = data?.data || {};
  if (!result.url) throw new Error(data?.message || 'Upload failed');
  return { url: result.url, path: result.path || result.url };
}
