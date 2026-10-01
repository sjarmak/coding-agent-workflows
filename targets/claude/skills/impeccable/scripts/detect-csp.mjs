// Modified for portable workflow distribution; see ../NOTICE.md.



























import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  '.svelte-kit',
  '.nuxt',
  '.astro',
  'dist',
  'build',
  'out',
  '.vercel',
]);

const SCAN_EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.tsx', '.jsx']);
const LAYOUT_EXTS = new Set(['.tsx', '.jsx', '.astro', '.vue', '.svelte', '.html']);
const MAX_DEPTH = 6;
const MAX_READ_BYTES = 64 * 1024;


const MONOREPO_HELPER_SIGNALS = [
  /\bbuildCSPConfig\b/,
  /\bbuildSecurityHeaders\b/,
  /\badditionalScriptSrc\b/,
  /\badditionalConnectSrc\b/,
  /\bcreateBaseNextConfig\b/,
];
const SVELTEKIT_CSP_SIGNALS = [
  /\bkit\s*:/,
  /\bcsp\s*:/,
  /\bdirectives\s*:/,
];
const NUXT_SECURITY_SIGNALS = [
  /['"]nuxt-security['"]/,
  /\bcontentSecurityPolicy\b/,
];


const INLINE_HEADER_SIGNALS = [
  /["']Content-Security-Policy["']/i,
  /\bscript-src\b/,
  /\bconnect-src\b/,
];
const NUXT_ROUTE_RULES_SIGNALS = [
  /\brouteRules\b/,
  /Content-Security-Policy/i,
  /\bscript-src\b/,
];

const MIDDLEWARE_HINT = /headers\.set\(\s*["']Content-Security-Policy["']/i;
const META_TAG_HINT = /http-equiv\s*=\s*["']Content-Security-Policy["']/i;





export function detectCsp(cwd = process.cwd()) {
  const hits = { appendArrays: [], appendString: [], middleware: [], metaTag: [] };

  walk(cwd, cwd, 0, (absPath, relPath, body) => {
    const ext = path.extname(absPath);
    const base = path.basename(absPath).toLowerCase();
    const isConfig = (name) =>
      new RegExp('(^|/)' + name + '\\.config\\.').test(relPath);




    if (SCAN_EXTS.has(ext) &&
        /packages\/[^/]+\/src\/.*(config|next-config|security)/.test(relPath) &&
        MONOREPO_HELPER_SIGNALS.some((re) => re.test(body))) {
      hits.appendArrays.push(relPath);
      return;
    }


    if (SCAN_EXTS.has(ext) && isConfig('svelte') &&
        SVELTEKIT_CSP_SIGNALS.every((re) => re.test(body))) {
      hits.appendArrays.push(relPath);
      return;
    }


    if (SCAN_EXTS.has(ext) && isConfig('nuxt') &&
        NUXT_SECURITY_SIGNALS.every((re) => re.test(body))) {
      hits.appendArrays.push(relPath);
      return;
    }




    if (SCAN_EXTS.has(ext) &&
        /(^|\/)(next|nuxt|vite|astro|svelte)\.config\./.test(relPath) &&
        INLINE_HEADER_SIGNALS.every((re) => re.test(body))) {




      hits.appendString.push(relPath);
      return;
    }



    if ((base === 'middleware.ts' || base === 'middleware.js' || base === 'middleware.mjs') &&
        MIDDLEWARE_HINT.test(body)) {
      hits.middleware.push(relPath);
    }

    if (LAYOUT_EXTS.has(ext) && META_TAG_HINT.test(body)) {
      hits.metaTag.push(relPath);
    }
  });




  if (hits.appendArrays.length > 0) {
    return { shape: 'append-arrays', signals: hits.appendArrays };
  }
  if (hits.appendString.length > 0) {
    return { shape: 'append-string', signals: hits.appendString };
  }
  if (hits.middleware.length > 0) {
    return { shape: 'middleware', signals: hits.middleware };
  }
  if (hits.metaTag.length > 0) {
    return { shape: 'meta-tag', signals: hits.metaTag };
  }
  return { shape: null, signals: [] };
}

function walk(root, dir, depth, visit) {
  if (depth > MAX_DEPTH) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(root, abs, depth + 1, visit);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!SCAN_EXTS.has(ext) && !LAYOUT_EXTS.has(ext)) continue;
    let body;
    try {
      const fd = fs.openSync(abs, 'r');
      try {
        const buf = Buffer.alloc(MAX_READ_BYTES);
        const n = fs.readSync(fd, buf, 0, MAX_READ_BYTES, 0);
        body = buf.slice(0, n).toString('utf-8');
      } finally { fs.closeSync(fd); }
    } catch { continue; }
    visit(abs, path.relative(root, abs), body);
  }
}


const _running = process.argv[1];
if (_running?.endsWith('detect-csp.mjs') || _running?.endsWith('detect-csp.mjs/')) {
  const result = detectCsp(process.cwd());
  console.log(JSON.stringify(result, null, 2));
}
