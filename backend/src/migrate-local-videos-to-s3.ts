import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { query } from './config/db';
import { uploadFile } from './config/storage';

function sanitize(text: string): string {
  return text.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
}

async function migrateVideos() {
  console.log('=== CareerCode Academy - Lesson Videos S3 Migration ===\n');

  const s3Endpoint = process.env.S3_ENDPOINT;
  const s3Bucket = process.env.S3_BUCKET;
  if (!s3Endpoint || !s3Bucket) {
    console.error('S3 Storage is not configured in .env. Please configure S3/Cloudflare R2 first.');
    process.exit(1);
  }

  const OUT_DIR = path.join(process.cwd(), 'generated-videos');
  if (!fs.existsSync(OUT_DIR)) {
    console.error(`Local directory for generated videos does not exist: ${OUT_DIR}`);
    process.exit(1);
  }

  // Fetch all lessons from database with their course title
  const { rows: lessons } = await query(`
    SELECT l.id AS lesson_id, l.title AS lesson_title, c.title AS course_title
    FROM lessons l
    JOIN courses c ON l.course_id = c.id
  `);

  console.log(`Found ${lessons.length} lessons in database. Matching with files on disk...`);

  // Get all files currently in generated-videos directory
  const filesOnDisk = fs.readdirSync(OUT_DIR).filter(f => fs.statSync(path.join(OUT_DIR, f)).isFile());
  const unmatchedFiles = new Set(filesOnDisk);

  let successCount = 0;

  for (const lesson of lessons) {
    const cleanCourse = sanitize(lesson.course_title);
    const cleanLesson = sanitize(lesson.lesson_title);
    const expectedVideoName = `${cleanCourse}_${cleanLesson}.mp4`;
    const expectedThumbName = `${cleanCourse}_${cleanLesson}.jpg`;

    const videoPathOnDisk = path.join(OUT_DIR, expectedVideoName);
    const thumbPathOnDisk = path.join(OUT_DIR, expectedThumbName);

    if (fs.existsSync(videoPathOnDisk)) {
      console.log(`Matching: "${lesson.lesson_title}" of course "${lesson.course_title}" -> ${expectedVideoName}`);
      
      try {
        // Upload video to S3
        const videoBuffer = fs.readFileSync(videoPathOnDisk);
        const videoUrl = await uploadFile(videoBuffer, expectedVideoName, 'videos');
        unmatchedFiles.delete(expectedVideoName);

        // Upload thumbnail if exists
        let thumbnailUrl: string | null = null;
        if (fs.existsSync(thumbPathOnDisk)) {
          const thumbBuffer = fs.readFileSync(thumbPathOnDisk);
          thumbnailUrl = await uploadFile(thumbBuffer, expectedThumbName, 'thumbnails');
          unmatchedFiles.delete(expectedThumbName);
        }

        // Update database record
        if (thumbnailUrl) {
          await query(
            `UPDATE lessons SET video_url = $1, video_thumbnail = $2 WHERE id = $3`,
            [videoUrl, thumbnailUrl, lesson.lesson_id]
          );
          console.log(`  ✓ Linked Video: ${videoUrl}`);
          console.log(`  ✓ Linked Thumbnail: ${thumbnailUrl}`);
        } else {
          await query(
            `UPDATE lessons SET video_url = $1 WHERE id = $2`,
            [videoUrl, lesson.lesson_id]
          );
          console.log(`  ✓ Linked Video (No Thumbnail): ${videoUrl}`);
        }

        // Remove local files
        try {
          fs.unlinkSync(videoPathOnDisk);
          if (thumbnailUrl && fs.existsSync(thumbPathOnDisk)) {
            fs.unlinkSync(thumbPathOnDisk);
          }
          console.log(`  ✓ Cleaned up local files.`);
        } catch (unlinkErr) {
          console.error(`  [Warning] Failed to delete local files:`, unlinkErr);
        }

        successCount++;
      } catch (err) {
        console.error(`  [Error] Failed to process lesson "${lesson.lesson_title}":`, err);
      }
      console.log('');
    }
  }

  // Upload unmatched files (like module/explainer videos)
  if (unmatchedFiles.size > 0) {
    console.log(`\n=== Processing Unmatched Explainer/Module Videos (${unmatchedFiles.size} files) ===`);
    for (const filename of unmatchedFiles) {
      if (filename.startsWith('_tmp') || filename === 'test.mp4' || filename === 'test_single_lesson.mp4') {
        continue; // skip test/temporary files
      }

      const filePath = path.join(OUT_DIR, filename);
      const ext = path.extname(filename).toLowerCase();
      
      if (ext === '.mp4' || ext === '.jpg' || ext === '.png') {
        console.log(`Uploading unmatched file: ${filename}`);
        try {
          const buffer = fs.readFileSync(filePath);
          const folder = ext === '.mp4' ? 'videos' : 'thumbnails';
          const publicUrl = await uploadFile(buffer, filename, folder);
          console.log(`  ✓ Uploaded to S3: ${publicUrl}`);
          
          // Remove local file
          fs.unlinkSync(filePath);
          console.log(`  ✓ Cleaned up local file.`);
        } catch (err) {
          console.error(`  [Error] Failed to upload unmatched file ${filename}:`, err);
        }
        console.log('');
      }
    }
  }

  console.log(`=== Video S3 Migration Complete ===`);
  console.log(`Successfully migrated and database-linked ${successCount} lesson videos.`);
  process.exit(0);
}

migrateVideos().catch(err => {
  console.error('Fatal error during video S3 migration:', err);
  process.exit(1);
});
