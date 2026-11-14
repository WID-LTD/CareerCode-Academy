#!/usr/bin/env node
/**
 * User-facing copy guard. Flags common acronyms in JSX text and string props.
 * Code identifiers and technical course content can be allowlisted.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../frontend/src', import.meta.url).pathname;
const ACRONYMS = /\b(AI|API|UI|UX|XP|PDF|FAQ|CRM|2FA|OTP|URL|ID|LMS|CTA|KPI|SEO)\b/g;
const ALLOW = [/className/, /import /, /from ['"]/, /type /, /interface /, /const [A-Z_]+/, /\/\//, /aria-label="[^"]*"/];
const hits = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (/\.(tsx|jsx)$/.test(entry)) scan(path);
  }
}

function scan(path) {
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (ALLOW.some((re) => re.test(line))) return;
    const match = line.match(ACRONYMS);
    if (match) hits.push({ path: path.replace(ROOT, 'src'), line: index + 1, text: line.trim().slice(0, 160), terms: [...new Set(match)] });
  });
}

walk(ROOT);
if (hits.length) {
  console.log(`Found ${hits.length} user-facing acronym line(s):`);
  for (const hit of hits) console.log(`${hit.path}:${hit.line} [${hit.terms.join(', ')}] ${hit.text}`);
  process.exitCode = 1;
} else {
  console.log('No user-facing acronyms found.');
}
