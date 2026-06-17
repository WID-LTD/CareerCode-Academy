import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { query } from './config/db';
import { uploadFile } from './config/storage';

async function migrate() {
  console.log('=== CareerCode Academy Local to Cloudflare R2 Migration ===');
  
  const s3Endpoint = process.env.S3_ENDPOINT;
  const s3Bucket = process.env.S3_BUCKET;
  if (!s3Endpoint || !s3Bucket) {
    console.error('S3 Storage is not configured in .env. Please configure S3/Cloudflare R2 first.');
    process.exit(1);
  }

  console.log(`Target S3 Bucket: ${s3Bucket}`);
  console.log(`Target S3 Endpoint: ${s3Endpoint}`);

  // Get all tables and columns
  const colsRes = await query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('character varying', 'text', 'jsonb', 'json')
  `);

  console.log(`Scanning ${colsRes.rows.length} columns in public schema...`);

  // Map to cache already uploaded files so we don't upload the same file multiple times
  const uploadCache = new Map<string, string>();

  const uploadLocalFile = async (cleanPath: string): Promise<string | null> => {
    if (uploadCache.has(cleanPath)) {
      return uploadCache.get(cleanPath)!;
    }

    const localFilePath = path.join(process.cwd(), cleanPath);
    if (!fs.existsSync(localFilePath)) {
      console.warn(`  [Warning] Local file not found: ${localFilePath}`);
      return null;
    }

    console.log(`  [Migrating] Uploading ${cleanPath} to S3...`);
    const buffer = fs.readFileSync(localFilePath);
    const filename = path.basename(cleanPath);
    
    let folder = 'uploads';
    const parts = cleanPath.split('/');
    if (parts.length > 2) {
      folder = parts[parts.length - 2];
    } else if (parts[0] === 'generated-videos') {
      folder = 'videos';
    }

    try {
      const publicUrl = await uploadFile(buffer, filename, folder);
      console.log(`  [Success] Uploaded to S3: ${publicUrl}`);
      uploadCache.set(cleanPath, publicUrl);
      return publicUrl;
    } catch (err) {
      console.error(`  [Error] Failed to upload ${cleanPath}:`, err);
      return null;
    }
  };

  const processJson = async (val: any): Promise<{ modified: boolean; newValue: any }> => {
    let modified = false;
    if (typeof val === 'string') {
      if ((val.includes('uploads/') || val.includes('generated-videos/')) && !val.startsWith('http')) {
        const regex = /(\/?uploads\/[^\s"']+|\/?generated-videos\/[^\s"']+)/g;
        const matches = val.match(regex);
        if (matches) {
          let newVal = val;
          for (const match of matches) {
            const cleanPath = match.replace(/^\//, '');
            const cloudUrl = await uploadLocalFile(cleanPath);
            if (cloudUrl) {
              newVal = newVal.replace(match, cloudUrl);
              modified = true;
            }
          }
          return { modified, newValue: newVal };
        }
      }
    } else if (Array.isArray(val)) {
      const newArr = [];
      for (const item of val) {
        const res = await processJson(item);
        if (res.modified) modified = true;
        newArr.push(res.newValue);
      }
      return { modified, newValue: newArr };
    } else if (val !== null && typeof val === 'object') {
      const newObj: any = {};
      for (const k of Object.keys(val)) {
        const res = await processJson(val[k]);
        if (res.modified) modified = true;
        newObj[k] = res.newValue;
      }
      return { modified, newValue: newObj };
    }
    return { modified, newValue: val };
  };

  for (const col of colsRes.rows) {
    const tableName = col.table_name;
    const columnName = col.column_name;
    const dataType = col.data_type;

    try {
      if (dataType === 'jsonb' || dataType === 'json') {
        const rowsRes = await query(`SELECT id, ${columnName} FROM ${tableName} WHERE ${columnName} IS NOT NULL`);
        for (const row of rowsRes.rows) {
          const res = await processJson(row[columnName]);
          if (res.modified) {
            console.log(`Updating JSON column ${columnName} in table ${tableName} (row ID: ${row.id})`);
            await query(
              `UPDATE ${tableName} SET ${columnName} = $1 WHERE id = $2`,
              [JSON.stringify(res.newValue), row.id]
            );
          }
        }
      } else {
        const queryStr = `
          SELECT DISTINCT ${columnName} 
          FROM ${tableName} 
          WHERE ${columnName} LIKE '%uploads/%' OR ${columnName} LIKE '%generated-videos/%'
        `;
        const rowsRes = await query(queryStr);
        for (const row of rowsRes.rows) {
          const val = row[columnName];
          if (val && !val.startsWith('http')) {
            const cleanPath = val.replace(/^\//, '');
            const cloudUrl = await uploadLocalFile(cleanPath);
            if (cloudUrl) {
              console.log(`Updating text column ${columnName} in table ${tableName} value: ${val} -> ${cloudUrl}`);
              await query(
                `UPDATE ${tableName} SET ${columnName} = $1 WHERE ${columnName} = $2`,
                [cloudUrl, val]
              );
            }
          }
        }
      }
    } catch (colErr) {
      console.error(`Error processing column ${columnName} in table ${tableName}:`, colErr);
    }
  }

  console.log('\n=== MIGRATION COMPLETE ===');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
