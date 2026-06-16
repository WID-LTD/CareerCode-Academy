import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { query } from './config/db';
import { uploadVideo, getStreamingUrl, isCloudinaryConfigured } from './config/cloudinary';

const OUT_DIR = path.join(process.cwd(), 'generated-videos');
const TMP_DIR = path.join(OUT_DIR, '_tmp');
const W = 1280;
const H = 720;
const DEFAULT_DUR = 25; // seconds per lesson
const BG_COLORS = ['1a1a2e', '16213e', '0f3460', '1b1b2f', '2d1b69', '0c0c1d', '1a0a2e', '191970'];
const FONT_DST = path.join(TMP_DIR, 'font.ttf');

// Ensure temp dir and font
function ensureFont() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  if (!fs.existsSync(FONT_DST)) {
    try { fs.copyFileSync('C:/Windows/Fonts/arial.ttf', FONT_DST); } catch {}
  }
}

function sanitize(text: string): string {
  return text.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
}

function videoPath(lesson: any, courseTitle: string): string {
  return path.join(OUT_DIR, `${sanitize(courseTitle)}_${sanitize(lesson.title)}.mp4`);
}

function bt(start: number, end: number): string {
  return `between(t\\,${start}\\,${end})`;
}

async function generateVideo(lesson: any, courseTitle: string, outPath: string, colorIdx: number): Promise<void> {
  const title = lesson.title || 'Untitled Lesson';
  const desc = lesson.description || 'Learn the fundamentals of this topic.';
  const dur = Math.max(DEFAULT_DUR, Math.round((lesson.duration || 15) * 1.5));
  const bg = BG_COLORS[colorIdx % BG_COLORS.length];

  ensureFont();

  const rel = (name: string) => `generated-videos/_tmp/${name}`;
  const FONT_REL = 'generated-videos/_tmp/font.ttf';

  // Write text files for drawtext (avoids shell escaping)
  fs.writeFileSync(path.join(TMP_DIR, 'course.txt'), courseTitle, 'utf8');
  fs.writeFileSync(path.join(TMP_DIR, 'title.txt'), title, 'utf8');
  fs.writeFileSync(path.join(TMP_DIR, 'desc.txt'), desc, 'utf8');
  fs.writeFileSync(path.join(TMP_DIR, 'brand.txt'), 'CareerCode Academy', 'utf8');

  const filter =
    `color=c=0x${bg}:s=${W}x${H}:d=${dur}[bg];` +
    `color=c=0x1e40af:s=${W}x4:d=${dur}[tb];` +
    `[bg][tb]overlay=0:30[base];` +
    `color=c=0x1e40af:s=${W}x4:d=${dur}[bb];` +
    `[base][bb]overlay=0:H-34[base2];` +
    `[base2]drawtext=textfile=${rel('course.txt')}:fontfile=${FONT_REL}:fontsize=18:fontcolor=0x888888:x=(w-text_w)/2:y=45:enable=${bt(0,dur)}[t1];` +
    `[t1]drawtext=textfile=${rel('title.txt')}:fontfile=${FONT_REL}:fontsize=42:fontcolor=0xFFFFFF:x=(w-text_w)/2:y=(h-text_h)/2-50:enable=${bt(1,dur-1.5)}[t2];` +
    `[t2]drawtext=textfile=${rel('desc.txt')}:fontfile=${FONT_REL}:fontsize=18:fontcolor=0xCCCCCC:x=(w-text_w)/2:y=(h-text_h)/2+30:enable=${bt(1.5,dur-2)}[t3];` +
    `[t3]drawtext=textfile=${rel('brand.txt')}:fontfile=${FONT_REL}:fontsize=13:fontcolor=0x555555:x=(w-text_w)/2:y=H-24[out]`;

  const filterPath = path.join(TMP_DIR, 'filter.txt');
  fs.writeFileSync(filterPath, filter, 'utf8');

  return new Promise((resolve, reject) => {
    const batContent = `@echo off
ffmpeg -y -f lavfi -i "color=c=0x${bg}:s=${W}x${H}:d=${dur}" -filter_complex_script "${filterPath}" -map [out] -c:v libx264 -preset fast -crf 24 -pix_fmt yuv420p -movflags +faststart "${outPath}"
`;
    const batPath = path.join(TMP_DIR, 'render.bat');
    fs.writeFileSync(batPath, batContent, 'utf8');

    exec(`"${batPath}"`, { maxBuffer: 200 * 1024 * 1024, shell: true, cwd: process.cwd() }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve();
    });
  });
}

async function main() {
  console.log('=== CareerCode Academy — Lesson Video Generator ===\n');

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  ensureFont();

  try {
    const { rows: courses } = await query(`
      SELECT c.id, c.title, c.slug,
        COALESCE(
          json_agg(
            json_build_object(
              'id', l.id,
              'title', l.title,
              'description', l.description,
              'duration', l.duration,
              'video_url', l.video_url
            ) ORDER BY l.order_index
          ) FILTER (WHERE l.id IS NOT NULL),
          '[]'::json
        ) as lessons
      FROM courses c
      LEFT JOIN lessons l ON l.course_id = c.id
      GROUP BY c.id, c.title, c.slug
      ORDER BY c.title
    `);

    console.log(`Found ${courses.length} courses\n`);

    let gen = 0;
    let errors = 0;
    let colorIdx = 0;

    for (const course of courses) {
      const lessons: any[] = course.lessons || [];
      const need = lessons.filter((l: any) => !l.video_url);
      const have = lessons.filter((l: any) => l.video_url);

      if (need.length === 0) {
        console.log(`[${course.title}] all ${have.length} lessons have video, skipping`);
        continue;
      }

      console.log(`[${course.title}] generating ${need.length} videos (${have.length} already have)`);

      for (const lesson of need) {
        const out = videoPath(lesson, course.title);
        process.stdout.write(`  ${lesson.title.substring(0, 50)}... `);

        try {
          await generateVideo(lesson, course.title, out, colorIdx++);

          if (fs.existsSync(out)) {
            const size = fs.statSync(out).size;
            process.stdout.write(`✓ ${(size / 1024 / 1024).toFixed(1)}MB`);

            // Upload to Cloudinary
            if (isCloudinaryConfigured()) {
              try {
                const buffer = fs.readFileSync(out);
                const publicId = `careercode/videos/lesson-${lesson.id}-${Date.now()}`;
                const uploadResult = await uploadVideo(buffer, publicId);
                let videoUrl = uploadResult.secure_url;
                try {
                  const streamingUrl = await getStreamingUrl(publicId);
                  if (streamingUrl) videoUrl = streamingUrl;
                } catch (_) {}
                await query(
                  `UPDATE lessons SET video_url = $1, video_thumbnail = $2 WHERE id = $3`,
                  [videoUrl, uploadResult.eager?.[0]?.secure_url || null, lesson.id]
                );
                process.stdout.write(', ☁ uploaded');
              } catch (ce) {
                const localUrl = `/generated-videos/${path.basename(out)}`;
                await query(`UPDATE lessons SET video_url = $1 WHERE id = $2`, [localUrl, lesson.id]);
                process.stdout.write(', 💾 local');
              }
            } else {
              const localUrl = `/generated-videos/${path.basename(out)}`;
              await query(`UPDATE lessons SET video_url = $1 WHERE id = $2`, [localUrl, lesson.id]);
              process.stdout.write(', 💾 local');
            }
            gen++;
          }
        } catch (err) {
          process.stdout.write(`✗ ${(err as Error).message.substring(0, 80)}`);
          errors++;
        }
        process.stdout.write('\n');

        // Small pause between generations
        await new Promise(r => setTimeout(r, 150));
      }
      console.log('');

      // Cleanup per-course temp files
      if (fs.existsSync(TMP_DIR)) {
        for (const f of ['course.txt', 'title.txt', 'desc.txt', 'brand.txt', 'filter.txt', 'render.bat']) {
          const fp = path.join(TMP_DIR, f);
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
      }
    }

    console.log(`\n=== COMPLETE ===`);
    console.log(`   Generated: ${gen}`);
    console.log(`   Errors: ${errors}`);

  } catch (error) {
    console.error('Fatal:', error);
  }

  process.exit(0);
}

main();
