import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const OUT_DIR = path.join(process.cwd(), 'generated-videos');
const TMP_DIR = path.join(OUT_DIR, '_tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// Copy font locally to avoid path colon issues
const FONT_SRC = 'C:/Windows/Fonts/arial.ttf';
const FONT_DST = path.join(TMP_DIR, 'font.ttf');
if (!fs.existsSync(FONT_DST)) {
  fs.copyFileSync(FONT_SRC, FONT_DST);
  console.log('Font copied');
}

const dur = 8;
const bg = '1a1a2e';

// Write text files
fs.writeFileSync(path.join(TMP_DIR, 'course.txt'), 'Test Course Title', 'utf8');
fs.writeFileSync(path.join(TMP_DIR, 'title.txt'), 'Introduction to Testing', 'utf8');
fs.writeFileSync(path.join(TMP_DIR, 'desc.txt'), 'Learn how to write and run effective tests for your applications.', 'utf8');
fs.writeFileSync(path.join(TMP_DIR, 'brand.txt'), 'CareerCode Academy', 'utf8');

const rel = (name: string) => `generated-videos/_tmp/${name}`;
const FONT_REL = 'generated-videos/_tmp/font.ttf';

// Escape commas in between() for ffmpeg filter syntax (commas separate filters in a chain)
const bt = (start: number, end: number) => `between(t\\,${start}\\,${end})`;

const filter = `color=c=0x${bg}:s=1280x720:d=${dur}[bg];` +
  `color=c=0x1e40af:s=1280x4:d=${dur}[tb];` +
  `[bg][tb]overlay=0:30[base];` +
  `color=c=0x1e40af:s=1280x4:d=${dur}[bb];` +
  `[base][bb]overlay=0:H-34[base2];` +
  `[base2]drawtext=textfile=${rel('course.txt')}:fontfile=${FONT_REL}:fontsize=18:fontcolor=0x888888:x=(w-text_w)/2:y=45:enable=${bt(0,dur)}[t1];` +
  `[t1]drawtext=textfile=${rel('title.txt')}:fontfile=${FONT_REL}:fontsize=42:fontcolor=0xFFFFFF:x=(w-text_w)/2:y=(h-text_h)/2-50:enable=${bt(1,dur-1.5)}[t2];` +
  `[t2]drawtext=textfile=${rel('desc.txt')}:fontfile=${FONT_REL}:fontsize=18:fontcolor=0xCCCCCC:x=(w-text_w)/2:y=(h-text_h)/2+30:enable=${bt(1.5,dur-2)}[t3];` +
  `[t3]drawtext=textfile=${rel('brand.txt')}:fontfile=${FONT_REL}:fontsize=13:fontcolor=0x555555:x=(w-text_w)/2:y=H-24[out]`;

const outPath = path.join(OUT_DIR, 'test_single_lesson.mp4');

// Write the filter to a file (avoids all shell escaping issues)
const filterPath = path.join(TMP_DIR, 'filter.txt');
fs.writeFileSync(filterPath, filter, 'utf8');

// Use -filter_complex_script instead of inline -filter_complex
const batContent = `@echo off
ffmpeg -y -f lavfi -i "color=c=0x${bg}:s=1280x720:d=${dur}" -filter_complex_script "${filterPath}" -map [out] -c:v libx264 -preset fast -crf 24 -pix_fmt yuv420p -movflags +faststart "${outPath}"
`;
const batPath = path.join(TMP_DIR, 'render.bat');
fs.writeFileSync(batPath, batContent, 'utf8');

console.log('Running ffmpeg...');

exec(`"${batPath}"`, { maxBuffer: 200 * 1024 * 1024, cwd: process.cwd() }, (err: any, stdout: string, stderr: string) => {
  if (err) {
    console.error('ERROR:', stderr || err.message);
    process.exit(1);
  }
  const size = fs.statSync(outPath).size;
  console.log(`SUCCESS: ${(size / 1024 / 1024).toFixed(1)} MB`);
  process.exit(0);
});
