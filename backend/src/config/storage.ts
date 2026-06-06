import fs from 'fs';
import path from 'path';

let supabase: any = null;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

async function getSupabase() {
  if (!supabase && supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('Supabase storage client initialized');
    } catch {
      console.log('Failed to initialize Supabase — falling back to local disk storage');
    }
  }
  return supabase;
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  folder: string = 'uploads'
): Promise<string> {
  const client = await getSupabase();
  if (client) {
    const filePath = `${folder}/${Date.now()}-${fileName}`;
    const { error } = await client.storage
      .from('careercode')
      .upload(filePath, buffer, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const { data: urlData } = client.storage
      .from('careercode')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  // Fallback: save to local disk
  const uploadDir = path.join(process.cwd(), 'uploads', folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const localPath = path.join(uploadDir, `${Date.now()}-${safeName}`);
  fs.writeFileSync(localPath, buffer);

  return `/uploads/${folder}/${path.basename(localPath)}`;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  const client = await getSupabase();
  if (client) {
    // Extract path from URL
    const urlParts = fileUrl.split('/');
    const bucketIndex = urlParts.indexOf('careercode');
    if (bucketIndex !== -1) {
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      await client.storage.from('careercode').remove([filePath]);
    }
    return;
  }

  // Fallback: delete local file
  const localPath = path.join(process.cwd(), fileUrl.replace(/^\//, ''));
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
  }
}