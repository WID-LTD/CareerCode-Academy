import fs from 'fs';
import path from 'path';
import { uploadFile } from './config/storage';
import { query } from './config/db';

const ASSETS_DIR = path.resolve(__dirname, '../../frontend/public');

interface AssetDef {
  filename: string;
  settingKey: string;
  description: string;
}

const assets: AssetDef[] = [
  { filename: 'stamp.png', settingKey: 'certificate_default_stamp_url', description: 'Default stamp image for certificates' },
  { filename: 'signature.png', settingKey: 'certificate_default_signature_url', description: 'Default signature image (Udokamma Emmanuel)' },
  { filename: 'wid-ltd-logo.png', settingKey: 'certificate_default_logo_url', description: 'WID Ltd logo for certificates' },
];

async function seed() {
  console.log('Seeding certificate assets...\n');

  for (const asset of assets) {
    const filePath = path.join(ASSETS_DIR, asset.filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠  ${asset.filename} not found at ${filePath}, skipping`);
      continue;
    }

    try {
      const buffer = fs.readFileSync(filePath);
      const url = await uploadFile(buffer, asset.filename, 'branding');

      if (url) {
        await query(
          `INSERT INTO system_settings (key, value, category, description)
           VALUES ($1, $2, 'branding', $3)
           ON CONFLICT (key) DO UPDATE SET value = $2, description = $3`,
          [asset.settingKey, url, asset.description]
        );
        console.log(`  ✓ ${asset.filename} → ${url}`);
      } else {
        console.warn(`  ⚠  ${asset.filename} — no S3 config, saved locally`);
      }
    } catch (err) {
      console.error(`  ✗ ${asset.filename} — ${err}`);
    }
  }

  console.log('\nDone. Certificate assets have been seeded.');
  process.exit(0);
}

seed();
