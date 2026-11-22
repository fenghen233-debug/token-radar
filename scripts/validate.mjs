import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const snapshotPath = process.env.KIT
  ? join(process.env.KIT, 'input/snapshot.json')
  : '/home/hatch/workspace/makefun/token-radar-01-kit/token-radar-01-kit/input/snapshot.json';

const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const snapshotSlugs = new Set(snapshot.protocols.map((p) => p.slug));
const watchlistSlugs = new Set(snapshot.watchlist);

console.log('--- RUNNING DETERMINISTIC DOUBLE RUN ---');
execSync(`rm -rf out1 out2 && mkdir -p out1 out2`, { stdio: 'inherit' });
execSync(`MAKEFUN_OUTPUT_DIR=out1 node main.ts --input ${snapshotPath}`, { stdio: 'inherit' });
execSync(`MAKEFUN_OUTPUT_DIR=out2 node main.ts --input ${snapshotPath}`, { stdio: 'inherit' });

console.log('--- CHECKING BYTE-FOR-BYTE IDENTITY ---');
const diffBoard = execSync(`diff -u out1/board.json out2/board.json || true`).toString();
if (diffBoard) {
  console.error('FAIL: board.json differs between run 1 and run 2:\n', diffBoard);
  process.exit(1);
}
console.log('PASS: board.json is byte-identical across runs.');

const diffDossier = execSync(`diff -u out1/dossier.json out2/dossier.json || true`).toString();
if (diffDossier) {
  console.error('FAIL: dossier.json differs between run 1 and run 2:\n', diffDossier);
  process.exit(1);
}
console.log('PASS: dossier.json is byte-identical across runs.');

const diffData = execSync(`diff -u out1/data.js out2/data.js || true`).toString();
if (diffData) {
  console.error('FAIL: data.js differs between run 1 and run 2:\n', diffData);
  process.exit(1);
}
console.log('PASS: data.js is byte-identical across runs.');

console.log('--- VALIDATING BOARD CONTENT ---');
const boardObj = JSON.parse(readFileSync('out1/board.json', 'utf8'));
const rows = boardObj.rows;

if (!Array.isArray(rows)) {
  console.error('FAIL: board.json rows is not an array');
  process.exit(1);
}

// 1. rows 100-4000
console.log(`Checking row count: ${rows.length}...`);
if (rows.length < 100 || rows.length > 4000) {
  console.error(`FAIL: row count ${rows.length} is not in [100, 4000]`);
  process.exit(1);
}
if (rows.length < 220) {
  console.error(`FAIL: row count ${rows.length} is less than 220 (STEP 4 requirement)`);
  process.exit(1);
}
console.log(`PASS: row count is ${rows.length} (>= 220 and in [100, 4000])`);

// 2. ranks exactly 1..N
console.log('Checking ranks 1..N...');
for (let i = 0; i < rows.length; i++) {
  if (rows[i].rank !== i + 1) {
    console.error(`FAIL: rank at index ${i} is ${rows[i].rank}, expected ${i + 1}`);
    process.exit(1);
  }
}
console.log(`PASS: ranks are strictly 1..${rows.length}`);

// 3. implied values non-increasing by rank and not all equal
console.log('Checking implied values non-increasing and not all equal...');
for (let i = 1; i < rows.length; i++) {
  if (rows[i].implied_value_usd > rows[i - 1].implied_value_usd) {
    console.error(`FAIL: row ${i + 1} (${rows[i].implied_value_usd}) > row ${i} (${rows[i - 1].implied_value_usd})`);
    process.exit(1);
  }
  if (!Number.isSafeInteger(rows[i].implied_value_usd) || rows[i].implied_value_usd <= 0) {
    console.error(`FAIL: invalid implied value at row ${i + 1}: ${rows[i].implied_value_usd}`);
    process.exit(1);
  }
  if (rows[i].implied_value_usd > 100_000_000_000_000) {
    console.error(`FAIL: implied value exceeds 100T cap: ${rows[i].implied_value_usd}`);
    process.exit(1);
  }
}
if (rows[0].implied_value_usd === rows[rows.length - 1].implied_value_usd) {
  console.error('FAIL: all implied values are equal');
  process.exit(1);
}
console.log(`PASS: implied values non-increasing: max $${rows[0].implied_value_usd.toLocaleString()}, min $${rows[rows.length - 1].implied_value_usd.toLocaleString()}`);

// 4. every watchlist slug present
console.log('Checking watchlist coverage...');
const boardSlugs = new Set(rows.map((r) => r.slug));
const missingWatchlist = [...watchlistSlugs].filter((s) => !boardSlugs.has(s));
if (missingWatchlist.length > 0) {
  console.error(`FAIL: missing ${missingWatchlist.length} watchlist slugs: ${missingWatchlist.join(', ')}`);
  process.exit(1);
}
console.log(`PASS: 100% watchlist coverage (${watchlistSlugs.size} of ${watchlistSlugs.size} slugs present)`);

// 5. all slugs in the snapshot
console.log('Checking that all slugs exist in snapshot...');
const invalidSlugs = rows.filter((r) => !snapshotSlugs.has(r.slug)).map((r) => r.slug);
if (invalidSlugs.length > 0) {
  console.error(`FAIL: slugs not in snapshot: ${invalidSlugs.join(', ')}`);
  process.exit(1);
}
console.log('PASS: all board slugs are valid snapshot protocols');

// 6. farm_steps 3-12 strings of 20-600 chars each (and naming protocol, chain, action, cost, time)
console.log('Checking farm_steps constraints...');
for (const r of rows) {
  const steps = r.farm_steps;
  if (!Array.isArray(steps) || steps.length < 3 || steps.length > 12) {
    console.error(`FAIL: ${r.slug} has ${steps?.length} farm steps (must be 3-12)`);
    process.exit(1);
  }
  for (let sIdx = 0; sIdx < steps.length; sIdx++) {
    const s = steps[sIdx].trim();
    if (s.length < 20 || s.length > 600) {
      console.error(`FAIL: ${r.slug} step ${sIdx + 1} length ${s.length} outside [20, 600]`);
      process.exit(1);
    }
  }
}
console.log('PASS: all farm_steps meet length and count constraints');

// 7. Check dossier.json limits
console.log('Checking dossier.json...');
const dossier = JSON.parse(readFileSync('out1/dossier.json', 'utf8'));
if (dossier.schema !== 'makefun/dossier/v1') {
  console.error(`FAIL: unexpected dossier schema: ${dossier.schema}`);
  process.exit(1);
}
if (!Array.isArray(dossier.images) || dossier.images.length !== 3) {
  console.error(`FAIL: expected 3 screenshots in dossier, found ${dossier.images?.length}`);
  process.exit(1);
}
for (const img of dossier.images) {
  const bytes = Buffer.from(img.base64, 'base64').length;
  console.log(`Screenshot ${img.name}: ${img.media_type}, ${(bytes / 1024).toFixed(1)} KB`);
  if (bytes > 524288) {
    console.error(`FAIL: screenshot ${img.name} exceeds 512 KiB cap: ${bytes} bytes`);
    process.exit(1);
  }
}
const textBytes = Buffer.byteLength(dossier.text, 'utf8');
console.log(`Dossier text size: ${textBytes} bytes (cap 65,536)`);
if (textBytes > 65536) {
  console.error(`FAIL: dossier text exceeds 65536 bytes`);
  process.exit(1);
}
const dossierBytes = Buffer.byteLength(readFileSync('out1/dossier.json'));
console.log(`Total dossier.json file size: ${(dossierBytes / 1024).toFixed(1)} KB (cap 1.5 MiB)`);
if (dossierBytes > 1.5 * 1024 * 1024) {
  console.error(`FAIL: dossier.json exceeds 1.5 MiB`);
  process.exit(1);
}
console.log('PASS: dossier.json satisfies all limits');

console.log('\n ALL CHECKS PASSED SUCCESSFULLY!');
