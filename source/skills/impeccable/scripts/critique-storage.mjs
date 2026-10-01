#!/usr/bin/env node
// Modified for portable workflow distribution; see ../NOTICE.md.


























import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getCritiqueDir } from './impeccable-paths.mjs';

const SLUG_MAX = 50;









export function slugFromTarget(resolved, { cwd = process.cwd() } = {}) {
  if (!resolved || typeof resolved !== 'string') return null;
  const trimmed = resolved.trim();
  if (!trimmed) return null;


  if (/^https?:\/\//i.test(trimmed)) {
    let url;
    try { url = new URL(trimmed); } catch { return null; }
    const hostPath = `${url.hostname}${url.pathname}`;
    return kebab(hostPath);
  }



  const abs = path.isAbsolute(trimmed) ? trimmed : path.resolve(cwd, trimmed);
  let rel = path.relative(cwd, abs);



  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    rel = path.basename(abs);
  }
  if (!rel || rel === '.' || rel === '') return null;
  return kebab(rel);
}

function kebab(s) {
  const slug = s
    .toLowerCase()
    .replace(/[/\\.]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) return null;


  return slug.length <= SLUG_MAX ? slug : slug.slice(slug.length - SLUG_MAX).replace(/^-/, '');
}





export function nowFilenameStamp(date = new Date()) {
  const iso = date.toISOString();
  return iso.replace(/[:.]/g, '-').replace(/-\d+Z$/, 'Z');
}








export function writeSnapshot({ slug, meta, body, cwd = process.cwd(), now = new Date() }) {
  if (!slug) throw new Error('writeSnapshot requires a slug');
  const dir = getCritiqueDir(cwd);
  fs.mkdirSync(dir, { recursive: true });
  const timestamp = nowFilenameStamp(now);
  const filePath = path.join(dir, `${timestamp}__${slug}.md`);




  const front = serializeFrontmatter({ ...meta, timestamp, slug });
  fs.writeFileSync(filePath, `${front}\n${body.trim()}\n`, 'utf-8');
  return filePath;
}

function serializeFrontmatter(obj) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const str = typeof value === 'string' ? value : String(value);

    const needsQuotes = typeof value === 'string' && /[:#]/.test(str);
    lines.push(`${key}: ${needsQuotes ? JSON.stringify(str) : str}`);
  }
  lines.push('---');
  return lines.join('\n');
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const out = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (/^".*"$/.test(value)) {
      try { value = JSON.parse(value); } catch {                   }
    } else if (/^-?\d+$/.test(value)) {
      value = Number(value);
    }
    out[key] = value;
  }
  return out;
}




function listSnapshotsForSlug(slug, cwd) {
  const dir = getCritiqueDir(cwd);
  if (!fs.existsSync(dir)) return [];
  const suffix = `__${slug}.md`;
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(suffix))
    .sort()
    .map((f) => path.join(dir, f));
}





export function readLatestSnapshot(slug, { cwd = process.cwd() } = {}) {
  const all = listSnapshotsForSlug(slug, cwd);
  if (!all.length) return null;
  const latest = all[all.length - 1];
  const body = fs.readFileSync(latest, 'utf-8');
  return { path: latest, body, meta: parseFrontmatter(body) };
}





export function readTrend(slug, { limit = 5, cwd = process.cwd() } = {}) {
  const all = listSnapshotsForSlug(slug, cwd);
  const slice = all.slice(-limit);
  return slice.map((file) => parseFrontmatter(fs.readFileSync(file, 'utf-8')));
}



function main(argv) {
  const [cmd, ...args] = argv;
  switch (cmd) {
    case 'slug': {
      const slug = slugFromTarget(args[0]);
      if (!slug) { process.stderr.write('no stable slug for input\n'); process.exit(1); }
      process.stdout.write(`${slug}\n`);
      return;
    }
    case 'write': {
      const [slug, bodyFile] = args;
      if (!slug || !bodyFile) { process.stderr.write('usage: write <slug> <body-file>\n'); process.exit(1); }
      const raw = fs.readFileSync(bodyFile, 'utf-8');



      let meta = {};
      const metaArg = process.env.IMPECCABLE_CRITIQUE_META;
      if (metaArg) {
        try { meta = JSON.parse(metaArg); } catch {              }
      }
      const out = writeSnapshot({ slug, meta, body: raw });
      process.stdout.write(`${out}\n`);
      return;
    }
    case 'latest': {
      const latest = readLatestSnapshot(args[0]);
      if (!latest) { process.exit(2); }
      process.stdout.write(latest.body);
      return;
    }
    case 'trend': {
      const rows = readTrend(args[0], { limit: args[1] ? Number(args[1]) : 5 });
      process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
      return;
    }
    default:
      process.stderr.write('usage: critique-storage.mjs <slug|write|latest|trend> [args]\n');
      process.exit(1);
  }
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]);
  } catch {


    return import.meta.url === pathToFileURL(process.argv[1]).href;
  }
}





if (isMainModule()) {
  main(process.argv.slice(2));
}
