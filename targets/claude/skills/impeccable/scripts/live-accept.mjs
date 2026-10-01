// Modified for portable workflow distribution; see ../NOTICE.md.















import fs from 'node:fs';
import path from 'node:path';
import { isGeneratedFile } from './is-generated.mjs';

const EXTENSIONS = ['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'];





export async function acceptCli() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: node live-accept.mjs [options]

Deterministic accept/discard for live variant sessions.

Modes:
  --discard          Remove variants, restore original
  --variant N        Accept variant N, discard the rest

Required:
  --id SESSION_ID    Session ID of the variant wrapper

Output (JSON):
  { handled, file, carbonize }`);
    process.exit(0);
  }

  const id = argVal(args, '--id');
  const variantNum = argVal(args, '--variant');
  const paramValuesRaw = argVal(args, '--param-values');
  const isDiscard = args.includes('--discard');

  if (!id) { console.error('Missing --id'); process.exit(1); }
  if (!isDiscard && !variantNum) { console.error('Need --discard or --variant N'); process.exit(1); }

  let paramValues = null;
  if (paramValuesRaw) {
    try { paramValues = JSON.parse(paramValuesRaw); }
    catch { paramValues = null; }
  }


  const found = findSessionFile(id, process.cwd());
  if (!found) {
    console.log(JSON.stringify({ handled: false, error: 'Session markers not found for id: ' + id }));
    process.exit(0);
  }

  const { file: targetFile, content, lines } = found;
  const relFile = path.relative(process.cwd(), targetFile);





  if (isGeneratedFile(targetFile, { cwd: process.cwd() })) {
    console.log(JSON.stringify({
      handled: false,
      mode: 'fallback',
      file: relFile,
      hint: 'Session is in a generated file. Persist the accepted variant in source; do not rely on this script.',
    }));
    process.exit(0);
  }

  if (isDiscard) {
    const result = handleDiscard(id, lines, targetFile);
    console.log(JSON.stringify({ handled: true, file: relFile, carbonize: false, ...result }));
  } else {
    const result = handleAccept(id, variantNum, lines, targetFile, paramValues);



    if (result.carbonize) {
      result.todo = 'REQUIRED before next poll: carbonize cleanup in ' + relFile + '. See reference/live.md "Required after accept".';
    }
    console.log(JSON.stringify({ handled: true, file: relFile, ...result }));
  }
}





function handleDiscard(id, lines, targetFile) {
  const block = findMarkerBlock(id, lines);
  if (!block) return { handled: false, error: 'Markers not found' };

  const original = extractOriginal(lines, block);
  const isJsx = detectCommentSyntax(targetFile).open === '{/*';
  const replaceRange = expandReplaceRange(block, lines, isJsx);







  const indent = lines[replaceRange.start].match(/^(\s*)/)[1];
  const restored = deindentContent(original, indent);

  const newLines = [
    ...lines.slice(0, replaceRange.start),
    ...restored,
    ...lines.slice(replaceRange.end + 1),
  ];
  fs.writeFileSync(targetFile, newLines.join('\n'), 'utf-8');
  return {};
}





function handleAccept(id, variantNum, lines, targetFile, paramValues) {
  const block = findMarkerBlock(id, lines);
  if (!block) return { handled: false, error: 'Markers not found' };

  const commentSyntax = detectCommentSyntax(targetFile);
  const isJsx = commentSyntax.open === '{/*';




  const replaceRange = expandReplaceRange(block, lines, isJsx);
  const indent = lines[replaceRange.start].match(/^(\s*)/)[1];


  const variantContent = extractVariant(lines, block, variantNum);
  if (!variantContent) return { handled: false, error: 'Variant ' + variantNum + ' not found' };


  const cssContent = extractCss(lines, block, id);




  const variantText = variantContent.join('\n');
  const hasHelperAttrs = variantText.includes('data-impeccable-variant');
  const needsCarbonize = !!(cssContent || hasHelperAttrs);


  const restored = deindentContent(variantContent, indent);
  const replacement = [];

  if (cssContent) {
    replacement.push(indent + commentSyntax.open + ' impeccable-carbonize-start ' + id + ' ' + commentSyntax.close);


    replacement.push(indent + '<style data-impeccable-css="' + id + '">' + (isJsx ? '{`' : ''));

    for (const cssLine of cssContent) {
      replacement.push(indent + cssLine.trimStart());
    }
    replacement.push(indent + (isJsx ? '`}</style>' : '</style>'));
    if (paramValues && Object.keys(paramValues).length > 0) {


      replacement.push(indent + commentSyntax.open + ' impeccable-param-values ' + id + ': ' + JSON.stringify(paramValues) + ' ' + commentSyntax.close);
    }
    replacement.push(indent + commentSyntax.open + ' impeccable-carbonize-end ' + id + ' ' + commentSyntax.close);
  }










  if (cssContent) {
    const styleAttr = isJsx ? "style={{ display: 'contents' }}" : 'style="display: contents"';
    replacement.push(indent + '<div data-impeccable-variant="' + variantNum + '" ' + styleAttr + '>');
    replacement.push(...restored);
    replacement.push(indent + '</div>');
  } else {
    replacement.push(...restored);
  }

  const newLines = [
    ...lines.slice(0, replaceRange.start),
    ...replacement,
    ...lines.slice(replaceRange.end + 1),
  ];
  fs.writeFileSync(targetFile, newLines.join('\n'), 'utf-8');

  return { carbonize: needsCarbonize };
}









function findMarkerBlock(id, lines) {
  let start = -1;
  let end = -1;
  const startPattern = 'impeccable-variants-start ' + id;
  const endPattern = 'impeccable-variants-end ' + id;

  for (let i = 0; i < lines.length; i++) {
    if (start === -1 && lines[i].includes(startPattern)) start = i;
    if (lines[i].includes(endPattern)) { end = i; break; }
  }

  return (start !== -1 && end !== -1) ? { start, end } : null;
}

















function expandReplaceRange(block, lines, isJsx) {
  if (!isJsx) return { start: block.start, end: block.end };

  let { start, end } = block;




  for (let i = start - 1; i >= Math.max(0, start - 12); i--) {
    if (/data-impeccable-variants=/.test(lines[i])) {
      let opener = i;
      while (opener > 0 && !/<div\b/.test(lines[opener])) opener--;
      start = opener;
      break;
    }
  }









  const joined = lines.slice(start).join('\n');


  const tagRe = /<div\b[^>]*?(\/?)>|<\/div\s*>/g;
  let depth = 0;
  let m;
  while ((m = tagRe.exec(joined)) !== null) {
    const isClose = m[0].startsWith('</');
    const isSelfClose = !isClose && m[1] === '/';
    if (isClose) depth--;
    else if (!isSelfClose) depth++;
    if (depth <= 0) {

      const linesBefore = joined.slice(0, m.index + m[0].length).split('\n').length - 1;
      const candidateEnd = start + linesBefore;
      if (candidateEnd >= end) {
        end = candidateEnd;
        break;
      }
    }
  }

  return { start, end };
}










function stripStyleAndJoin(lines, block) {
  const out = [];
  let inStyle = false;
  for (let i = block.start; i <= block.end; i++) {
    let line = lines[i];

    if (!inStyle) {


      line = line
        .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/g, '')
        .replace(/<style\b[^>]*\/\s*>/g, '');



      const openerIdx = line.search(/<style\b/);
      if (openerIdx !== -1) {
        line = line.slice(0, openerIdx);
        inStyle = true;
      }
      out.push(line);
    } else {

      const closeIdx = line.search(/<\/style\s*>/);
      if (closeIdx !== -1) {
        inStyle = false;
        out.push(line.slice(closeIdx).replace(/<\/style\s*>/, ''));
      }

    }
  }
  return out.join('\n');
}







function extractInnerByAttr(text, attrMatch) {
  const openerRe = new RegExp('<([A-Za-z][A-Za-z0-9]*)\\b[^>]*' + attrMatch + '[^>]*>');
  const openMatch = text.match(openerRe);
  if (!openMatch) return null;

  const tagName = openMatch[1];
  const innerStart = openMatch.index + openMatch[0].length;



  const tagRe = new RegExp('<(?:/)?' + tagName + '\\b[^>]*>', 'g');
  tagRe.lastIndex = innerStart;

  let depth = 1;
  let m;
  while ((m = tagRe.exec(text))) {
    const isClose = m[0].startsWith('</');
    const isSelfClose = !isClose && /\/\s*>$/.test(m[0]);
    if (isClose) {
      depth--;
      if (depth === 0) return text.slice(innerStart, m.index);
    } else if (!isSelfClose) {
      depth++;
    }
  }
  return null;
}





function extractOriginal(lines, block) {
  const text = stripStyleAndJoin(lines, block);
  const inner = extractInnerByAttr(text, 'data-impeccable-variant="original"');
  if (inner === null) return [];
  return inner.split('\n');
}





function extractVariant(lines, block, variantNum) {
  const text = stripStyleAndJoin(lines, block);
  const inner = extractInnerByAttr(text, 'data-impeccable-variant="' + variantNum + '"');
  if (inner === null) return null;
  const result = inner.split('\n');

  while (result.length > 1 && result[0].trim() === '') result.shift();
  while (result.length > 1 && result[result.length - 1].trim() === '') result.pop();
  return result.length > 0 ? result : null;
}











function extractCss(lines, block, id) {
  const styleAttr = 'data-impeccable-css="' + id + '"';
  let inStyle = false;
  const content = [];

  for (let i = block.start; i <= block.end; i++) {
    const line = lines[i];

    if (!inStyle && line.includes(styleAttr)) {

      if (/<style\b[^>]*\/\s*>/.test(line)) return null;

      const sameLine = line.match(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/);
      if (sameLine) {
        const inner = stripJsxTemplateWrap(sameLine[1]);
        return inner.length > 0 ? inner.split('\n') : null;
      }
      inStyle = true;
      continue;
    }

    if (inStyle) {



      const closeIdx = line.indexOf('</style>');
      if (closeIdx !== -1) break;
      content.push(line);
    }
  }

  if (content.length === 0) return null;
  return stripJsxTemplateLines(content);
}












function stripJsxTemplateLines(content) {
  const out = content.slice();



  while (out.length > 0 && out[0].trim() === '') out.shift();
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
  if (out.length === 0) return null;


  const firstTrim = out[0].trimStart();
  if (firstTrim === '{`') {
    out.shift();
  } else if (firstTrim.startsWith('{`')) {
    const idx = out[0].indexOf('{`');
    out[0] = out[0].slice(0, idx) + out[0].slice(idx + 2);
    if (out[0].trim() === '') out.shift();
  }
  if (out.length === 0) return null;


  const lastIdx = out.length - 1;
  const lastTrim = out[lastIdx].trimEnd();
  if (lastTrim === '`}') {
    out.pop();
  } else if (lastTrim.endsWith('`}')) {
    const text = out[lastIdx];
    const idx = text.lastIndexOf('`}');
    out[lastIdx] = text.slice(0, idx) + text.slice(idx + 2);
    if (out[lastIdx].trim() === '') out.pop();
  }

  return out.length > 0 ? out : null;
}

function stripJsxTemplateWrap(text) {
  const lines = text.split('\n');
  const stripped = stripJsxTemplateLines(lines);
  return stripped ? stripped.join('\n') : '';
}






function deindentContent(contentLines, baseIndent) {

  let minIndent = Infinity;
  for (const line of contentLines) {
    if (line.trim() === '') continue;
    const leadingSpaces = line.match(/^(\s*)/)[1].length;
    minIndent = Math.min(minIndent, leadingSpaces);
  }
  if (minIndent === Infinity) minIndent = 0;


  return contentLines.map(line => {
    if (line.trim() === '') return '';
    return baseIndent + line.slice(minIndent);
  });
}

function detectCommentSyntax(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jsx' || ext === '.tsx') {
    return { open: '{/*', close: '*/}' };
  }
  return { open: '<!--', close: '-->' };
}





function findSessionFile(id, cwd) {
  const marker = 'impeccable-variants-start ' + id;
  const searchDirs = ['src', 'app', 'pages', 'components', 'public', 'views', 'templates', '.'];
  const seen = new Set();

  for (const dir of searchDirs) {
    const absDir = path.join(cwd, dir);
    if (!fs.existsSync(absDir)) continue;
    const result = searchDir(absDir, marker, seen, 0);
    if (result) {
      const content = fs.readFileSync(result, 'utf-8');
      return { file: result, content, lines: content.split('\n') };
    }
  }
  return null;
}

function searchDir(dir, query, seen, depth) {
  if (depth > 5) return null;
  let realDir;
  try { realDir = fs.realpathSync(dir); } catch { return null; }
  if (seen.has(realDir)) return null;
  seen.add(realDir);

  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return null; }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) continue;
    const filePath = path.join(dir, entry.name);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes(query)) return filePath;
    } catch {            }
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
    const result = searchDir(path.join(dir, entry.name), query, seen, depth + 1);
    if (result) return result;
  }

  return null;
}





function argVal(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}


const _running = process.argv[1];
if (_running?.endsWith('live-accept.mjs') || _running?.endsWith('live-accept.mjs/')) {
  acceptCli();
}

export { findMarkerBlock, extractOriginal, extractVariant, extractCss, deindentContent, detectCommentSyntax };
