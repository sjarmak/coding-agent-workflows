// Modified for portable workflow distribution; see ../NOTICE.md.
































import fs from 'node:fs';
import path from 'node:path';

const PRODUCT_NAMES = ['PRODUCT.md', 'Product.md', 'product.md'];
const DESIGN_NAMES = ['DESIGN.md', 'Design.md', 'design.md'];
const LEGACY_NAMES = ['.impeccable.md'];
const FALLBACK_DIRS = ['.agents/context', 'docs'];






export function resolveContextDir(cwd = process.cwd()) {

  const envDir = process.env.IMPECCABLE_CONTEXT_DIR;
  if (envDir && envDir.trim()) {
    const trimmed = envDir.trim();
    return path.isAbsolute(trimmed) ? trimmed : path.resolve(cwd, trimmed);
  }



  if (firstExisting(cwd, [...PRODUCT_NAMES, ...DESIGN_NAMES, ...LEGACY_NAMES])) {
    return cwd;
  }



  for (const rel of FALLBACK_DIRS) {
    const candidate = path.resolve(cwd, rel);
    if (firstExisting(candidate, [...PRODUCT_NAMES, ...DESIGN_NAMES])) {
      return candidate;
    }
  }



  return cwd;
}

export function loadContext(cwd = process.cwd()) {
  let migrated = false;
  const contextDir = resolveContextDir(cwd);


  let productPath = firstExisting(contextDir, PRODUCT_NAMES);




  if (!productPath && contextDir === cwd) {
    const legacyPath = firstExisting(cwd, LEGACY_NAMES);
    if (legacyPath) {
      const newPath = path.join(cwd, 'PRODUCT.md');
      try {
        fs.renameSync(legacyPath, newPath);
        productPath = newPath;
        migrated = true;
      } catch {

        productPath = legacyPath;
      }
    }
  }


  const designPath = firstExisting(contextDir, DESIGN_NAMES);

  const product = productPath ? safeRead(productPath) : null;
  const design = designPath ? safeRead(designPath) : null;

  return {
    hasProduct: !!product,
    product,
    productPath: productPath ? path.relative(cwd, productPath) : null,
    hasDesign: !!design,
    design,
    designPath: designPath ? path.relative(cwd, designPath) : null,
    migrated,
    contextDir,
  };
}

function firstExisting(dir, names) {
  for (const name of names) {
    const abs = path.join(dir, name);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function safeRead(p) {
  try { return fs.readFileSync(p, 'utf-8'); } catch { return null; }
}





function cli() {
  const result = loadContext(process.cwd());
  console.log(JSON.stringify(result, null, 2));
}

const _running = process.argv[1];
if (_running?.endsWith('load-context.mjs') || _running?.endsWith('load-context.mjs/')) {
  cli();
}
