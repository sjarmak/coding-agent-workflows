// Modified for portable workflow distribution; see ../NOTICE.md.













import fs from 'node:fs';
import path from 'node:path';
import { isGeneratedFile } from './is-generated.mjs';

const EXTENSIONS = ['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'];

export async function wrapCli() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: impeccable wrap [options]

Find an element in source and wrap it in a variant container.

Required:
  --id ID            Session ID for the variant wrapper
  --count N          Number of expected variants (1-8)

Element identification (at least one required):
  --element-id ID    HTML id attribute of the element
  --classes A,B,C    Comma-separated CSS class names
  --tag TAG          Tag name (div, section, etc.)
  --query TEXT       Fallback: raw text to search for

Optional:
  --file PATH        Source file to search in (skips auto-detection)
  --text TEXT        Picked element's textContent. Used to disambiguate when
                     classes/tag match multiple sibling elements (e.g. a list
                     of <Card>s with the same className). Pass the first ~80
                     chars of event.element.textContent.
  --help             Show this help message

Output (JSON):
  { file, startLine, endLine, insertLine, commentSyntax }

The agent should insert variant HTML at insertLine.`);
    process.exit(0);
  }

  const id = argVal(args, '--id');
  const count = parseInt(argVal(args, '--count') || '3');
  const elementId = argVal(args, '--element-id');
  const classes = argVal(args, '--classes');
  const tag = argVal(args, '--tag');
  const query = argVal(args, '--query');
  const filePath = argVal(args, '--file');
  const text = argVal(args, '--text');

  if (!id) { console.error('Missing --id'); process.exit(1); }
  if (!elementId && !classes && !query) {
    console.error('Need at least one of: --element-id, --classes, --query');
    process.exit(1);
  }


  const queries = buildSearchQueries(elementId, classes, tag, query);

  const genOpts = { cwd: process.cwd() };



  let targetFile = filePath;
  let matchedQuery = null;
  if (!targetFile) {
    for (const q of queries) {
      targetFile = findFileWithQuery(q, process.cwd(), genOpts);
      if (targetFile) { matchedQuery = q; break; }
    }
    if (!targetFile) {



      let generatedHit = null;
      for (const q of queries) {
        generatedHit = findFileWithQuery(q, process.cwd(), { ...genOpts, includeGenerated: true });
        if (generatedHit) break;
      }
      if (generatedHit) {
        console.error(JSON.stringify({
          error: 'element_not_in_source',
          fallback: 'agent-driven',
          generatedMatch: path.relative(process.cwd(), generatedHit),
          hint: 'Element found only in a generated file. See "Handle fallback" in live.md.',
        }));
      } else {
        console.error(JSON.stringify({
          error: 'element_not_found',
          fallback: 'agent-driven',
          hint: 'Element not found in any project file. It may be runtime-injected (JS component, etc.). See "Handle fallback" in live.md.',
        }));
      }
      process.exit(1);
    }
  } else {
    if (isGeneratedFile(targetFile, genOpts)) {
      console.error(JSON.stringify({
        error: 'file_is_generated',
        fallback: 'agent-driven',
        file: path.relative(process.cwd(), path.resolve(process.cwd(), targetFile)),
        hint: 'Explicit --file points at a generated file. Writing here gets wiped by the next build. See "Handle fallback" in live.md.',
      }));
      process.exit(1);
    }
    matchedQuery = queries[0];
  }

  const content = fs.readFileSync(targetFile, 'utf-8');
  const lines = content.split('\n');





  let match = null;
  if (text) {
    const candidates = [];
    for (const q of queries) {
      const all = findAllElements(lines, q, tag);
      for (const c of all) {
        if (!candidates.some((x) => x.startLine === c.startLine)) {
          candidates.push(c);
        }
      }



      if (candidates.length === 1) break;
    }
    if (candidates.length === 0) {
      console.error(JSON.stringify({ error: 'Found file but could not locate element in ' + targetFile + '. Searched for: ' + queries.join(', ') }));
      process.exit(1);
    }
    if (candidates.length === 1) {
      match = candidates[0];
    } else {
      const filtered = filterByText(candidates, lines, text);
      if (filtered.length === 1) {
        match = filtered[0];
      } else if (filtered.length === 0) {




        match = candidates[0];
      } else {



        console.error(JSON.stringify({
          error: 'element_ambiguous',
          fallback: 'agent-driven',
          file: path.relative(process.cwd(), targetFile),
          candidates: filtered.map((c) => ({
            startLine: c.startLine + 1,
            endLine: c.endLine + 1,
          })),
          hint: 'Multiple source elements match both classes/tag and textContent. Pass --element-id, a more specific --text, or write the wrapper manually. See "Handle fallback" in live.md.',
        }));
        process.exit(1);
      }
    }
  } else {
    for (const q of queries) {
      match = findElement(lines, q, tag);
      if (match) break;
    }
    if (!match) {
      console.error(JSON.stringify({ error: 'Found file but could not locate element in ' + targetFile + '. Searched for: ' + queries.join(', ') }));
      process.exit(1);
    }
  }

  const { startLine, endLine } = match;
  const commentSyntax = detectCommentSyntax(targetFile);
  const styleMode = detectStyleMode(targetFile);
  const isJsx = commentSyntax.open === '{/*';
  const indent = lines[startLine].match(/^(\s*)/)[1];








  const originalLines = lines.slice(startLine, endLine + 1);
  const originalBaseIndent = minLeadingSpaces(originalLines);
  const reindentOriginal = (extra) => originalLines
    .map((l) => (l.trim() === '' ? '' : indent + extra + l.slice(originalBaseIndent)))
    .join('\n');
  const originalIndented = reindentOriginal('    ');




  const styleContents = isJsx ? 'style={{ display: "contents" }}' : 'style="display: contents"';













  const wrapperLines = isJsx ? [
    indent + '<div data-impeccable-variants="' + id + '" data-impeccable-variant-count="' + count + '" ' + styleContents + '>',
    indent + '  ' + commentSyntax.open + ' impeccable-variants-start ' + id + ' ' + commentSyntax.close,
    indent + '  ' + commentSyntax.open + ' Original ' + commentSyntax.close,
    indent + '  <div data-impeccable-variant="original">',
    reindentOriginal('    '),
    indent + '  </div>',
    indent + '  ' + commentSyntax.open + ' Variants: insert below this line ' + commentSyntax.close,
    indent + '  ' + commentSyntax.open + ' impeccable-variants-end ' + id + ' ' + commentSyntax.close,
    indent + '</div>',
  ] : [
    indent + commentSyntax.open + ' impeccable-variants-start ' + id + ' ' + commentSyntax.close,
    indent + '<div data-impeccable-variants="' + id + '" data-impeccable-variant-count="' + count + '" ' + styleContents + '>',
    indent + '  ' + commentSyntax.open + ' Original ' + commentSyntax.close,
    indent + '  <div data-impeccable-variant="original">',
    originalIndented,
    indent + '  </div>',
    indent + '  ' + commentSyntax.open + ' Variants: insert below this line ' + commentSyntax.close,
    indent + '</div>',
    indent + commentSyntax.open + ' impeccable-variants-end ' + id + ' ' + commentSyntax.close,
  ];


  const newLines = [
    ...lines.slice(0, startLine),
    ...wrapperLines,
    ...lines.slice(endLine + 1),
  ];
  fs.writeFileSync(targetFile, newLines.join('\n'), 'utf-8');








  const insertLine = startLine + 6 + (originalLines.length - 1);

  console.log(JSON.stringify({
    file: path.relative(process.cwd(), targetFile),
    startLine: startLine + 1,





    endLine: startLine + wrapperLines.length + (originalLines.length - 1),
    insertLine: insertLine + 1,
    commentSyntax: commentSyntax,
    styleMode: styleMode.mode,
    styleTag: styleMode.styleTag,
    cssSelectorPrefixExamples: buildCssSelectorPrefixExamples(styleMode.mode, count),
    cssAuthoring: buildCssAuthoring(styleMode, count),
    originalLineCount: originalLines.length,
  }));
}





function argVal(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}





function buildSearchQueries(elementId, classes, tag, query) {
  const queries = [];


  if (elementId) {
    queries.push('id="' + elementId + '"');
  }




  if (classes) {
    const classList = classes.split(',').map(c => c.trim()).filter(Boolean);
    if (classList.length > 1) {
      const joined = classList.join(' ');
      const sorted = [...classList].sort((a, b) => b.length - a.length);
      queries.push('class="' + joined + '"');
      queries.push('className="' + joined + '"');
      queries.push(sorted[0]);
    } else if (classList.length === 1) {
      queries.push(classList[0]);
    }
  }



  if (tag && classes) {
    const firstClass = classes.split(',')[0].trim();
    queries.push('<' + tag + ' class="' + firstClass);
    queries.push('<' + tag + ' className="' + firstClass);
  }


  if (query) {
    queries.push(query);
  }

  return queries;
}

function detectCommentSyntax(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jsx' || ext === '.tsx') {
    return { open: '{/*', close: '*/}' };
  }

  return { open: '<!--', close: '-->' };
}

function detectStyleMode(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.astro') {
    return {
      mode: 'astro-global-prefixed',
      styleTag: '<style is:inline data-impeccable-css="SESSION_ID">',
    };
  }
  return {
    mode: 'scoped',
    styleTag: '<style data-impeccable-css="SESSION_ID">',
  };
}

function buildCssSelectorPrefixExamples(styleMode, count) {
  if (styleMode !== 'astro-global-prefixed') return [];
  return Array.from({ length: count }, (_, i) => `[data-impeccable-variant="${i + 1}"]`);
}

function buildCssAuthoring(styleMode, count) {
  const variantNumbers = Array.from({ length: count }, (_, i) => i + 1);
  if (styleMode.mode === 'astro-global-prefixed') {
    return {
      mode: styleMode.mode,
      styleTag: styleMode.styleTag,
      strategy: 'global-prefixed',
      rulePattern: '[data-impeccable-variant="N"] > .variant-class { ... }',
      selectorExamples: variantNumbers.map((n) => `[data-impeccable-variant="${n}"] > .variant-class`),
      requirements: [
        'Use the styleTag exactly; the is:inline attribute is required for this file.',
        'Prefix every preview selector with the matching [data-impeccable-variant="N"] selector.',
        'Keep selectors anchored to the generated variant wrapper; do not rely on component CSS scoping for preview rules.',
      ],
      forbidden: [
        'Do not use @scope for this styleMode.',
      ],
    };
  }
  return {
    mode: styleMode.mode,
    styleTag: styleMode.styleTag,
    strategy: 'scope-rule',
    rulePattern: '@scope ([data-impeccable-variant="N"]) { :scope > .variant-class { ... } }',
    selectorExamples: variantNumbers.map((n) => `@scope ([data-impeccable-variant="${n}"]) { :scope > .variant-class { ... } }`),
    requirements: [
      'Use @scope blocks keyed to each [data-impeccable-variant="N"] wrapper.',
      'Inside each @scope block, make :scope rules step into the replacement element with a descendant combinator.',
      'Use the styleTag exactly; do not add framework-specific style attributes unless this object says to.',
    ],
    forbidden: [
      'Do not use global [data-impeccable-variant="N"] selector prefixes for this styleMode.',
      'Do not add is:inline to the style tag for this styleMode.',
    ],
  };
}





function findFileWithQuery(query, cwd, genOpts = {}) {
  const searchDirs = ['src', 'app', 'pages', 'components', 'public', 'views', 'templates', '.'];
  const seen = new Set();

  for (const dir of searchDirs) {
    const absDir = path.join(cwd, dir);
    if (!fs.existsSync(absDir)) continue;
    const result = searchDir(absDir, query, seen, 0, genOpts);
    if (result) return result;
  }
  return null;
}

function searchDir(dir, query, seen, depth, genOpts) {
  if (depth > 5) return null;
  const realDir = fs.realpathSync(dir);
  if (seen.has(realDir)) return null;
  seen.add(realDir);

  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return null; }


  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!EXTENSIONS.includes(ext)) continue;

    const filePath = path.join(dir, entry.name);
    if (!genOpts.includeGenerated && isGeneratedFile(filePath, genOpts)) continue;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes(query)) return filePath;
    } catch {                             }
  }





  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const result = searchDir(path.join(dir, entry.name), query, seen, depth + 1, genOpts);
    if (result) return result;
  }

  return null;
}






const OPENER_RE = /<([A-Za-z][A-Za-z0-9]*)(?=[\s/>]|$)/;

















function minLeadingSpaces(lines) {
  let min = Infinity;
  for (const l of lines) {
    if (l.trim() === '') continue;
    const m = l.match(/^(\s*)/);
    if (m && m[1].length < min) min = m[1].length;
  }
  return min === Infinity ? 0 : min;
}

function findElement(lines, query, tag = null) {

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(query)) continue;

    const stripped = lines[i].trim();
    if (stripped.startsWith('<!--') || stripped.startsWith('{/*') || stripped.startsWith('//')) continue;

    if (lines[i].includes('data-impeccable-variant')) continue;

    const openerLine = findOpenerLine(lines, i, tag);
    if (openerLine === -1) continue;

    const endLine = findClosingLine(lines, openerLine);
    return { startLine: openerLine, endLine };
  }

  return null;
}








function findAllElements(lines, query, tag = null) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(query)) continue;
    const stripped = lines[i].trim();
    if (stripped.startsWith('<!--') || stripped.startsWith('{/*') || stripped.startsWith('//')) continue;
    if (lines[i].includes('data-impeccable-variant')) continue;
    const openerLine = findOpenerLine(lines, i, tag);
    if (openerLine === -1) continue;
    if (seen.has(openerLine)) continue;
    seen.add(openerLine);
    const endLine = findClosingLine(lines, openerLine);
    out.push({ startLine: openerLine, endLine });
  }
  return out;
}
















function filterByText(candidates, lines, text) {
  const trimmed = text.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 80);





  if (trimmed.length < 8) return [];
  const targetSpaced = trimmed;
  const targetCompact = trimmed.replace(/\s+/g, '');

  return candidates.filter((c) => {
    const body = lines.slice(c.startLine, c.endLine + 1).join(' ');
    const inner = body
      .replace(/<[^>]*>/g, ' ')
      .replace(/\{[^}]*\}/g, ' ')
      .toLowerCase();
    const sourceSpaced = inner.replace(/\s+/g, ' ').trim();
    const sourceCompact = inner.replace(/\s+/g, '');
    return sourceSpaced.includes(targetSpaced) || sourceCompact.includes(targetCompact);
  });
}










function findOpenerLine(lines, matchLine, tag) {
  const self = lines[matchLine].match(OPENER_RE);
  if (self) {
    if (!tag || self[1] === tag) return matchLine;
    return -1;
  }
  const MAX_BACKWALK = 10;
  for (let i = matchLine - 1; i >= Math.max(0, matchLine - MAX_BACKWALK); i--) {
    const opener = lines[i].match(OPENER_RE);
    if (!opener) continue;
    if (!tag || opener[1] === tag) return i;

    return -1;
  }
  return -1;
}





function findClosingLine(lines, start) {
  const openMatch = lines[start].match(OPENER_RE);
  if (!openMatch) return start;

  const tagName = openMatch[1];
  let depth = 0;
  const openRe = new RegExp('<' + tagName + '(?=[\\s/>]|$)', 'g');
  const selfCloseRe = new RegExp('<' + tagName + '[^>]*/>', 'g');
  const closeRe = new RegExp('</' + tagName + '\\s*>', 'g');

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(openRe) || []).length;
    const selfCloses = (line.match(selfCloseRe) || []).length;
    const closes = (line.match(closeRe) || []).length;

    depth += opens - selfCloses - closes;

    if (depth <= 0) return i;
  }


  return Math.min(start + 50, lines.length - 1);
}


const _running = process.argv[1];
if (_running?.endsWith('live-wrap.mjs') || _running?.endsWith('live-wrap.mjs/')) {
  wrapCli();
}


export { buildSearchQueries, findElement, findClosingLine, detectCommentSyntax };
