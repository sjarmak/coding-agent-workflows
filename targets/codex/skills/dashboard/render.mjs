#!/usr/bin/env node
// render.mjs — the dashboard's deterministic renderer (mechanism only).
//
// Takes a JSON payload the model produced and emits one self-contained HTML
// page. The model never writes markup: it decides which panels exist, which
// panel KIND fits each collector's output, and what the written answer says.
// Everything below that line — layout, CSS, escaping, staleness badges,
// severity ordering, light/dark — lives here, so the page looks the same in
// every project and every run, and so it can be tested.
//
// Payload shape (schema 1). Single repo:
//   { schema: 1, project, generated_at, question?, answer?, attention?, panels: [...] }
// Rollup across repos:
//   { schema: 1, project, generated_at, question?, answer?, attention?,
//     repos: [ { name, path?, answer?, attention?, panels: [...] } ] }
//
// Panel: { id, title, kind, data, source?, collected_at?, stale_after_minutes?, note? }
// Kinds: stat | list | table | timeline | log | diff
//
// Input is validated structurally and REJECTED with a specific message on any
// mismatch. A malformed payload is a bug in the caller, not something to paper
// over with a default — a silently-dropped panel is worse than a failed render.
//
// CLI:  node render.mjs <payload.json> <out.html>
//       node render.mjs - <out.html>       (payload on stdin)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PANEL_KINDS = ['stat', 'list', 'table', 'timeline', 'log', 'diff'];
const STATES = new Set(['ok', 'warn', 'bad', 'neutral']);
const SEVERITIES = ['high', 'medium', 'low'];
const DEFAULT_STALE_AFTER_MIN = 30;

// --- escaping ----------------------------------------------------------------
// Every model-supplied string passes through here. Class names and other
// attribute values are chosen from fixed sets above, never interpolated.
export const esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const state = s => (STATES.has(s) ? s : 'neutral');

// --- time --------------------------------------------------------------------
export function fmtAge(ms) {
  if (ms < 0) return 'just now';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function parseTime(value, where) {
  const t = Date.parse(value);
  if (Number.isNaN(t)) throw new Error(`${where}: "${value}" is not a parseable timestamp`);
  return t;
}

// --- validation (structural only) --------------------------------------------
const isStr = v => typeof v === 'string';
const isArr = Array.isArray;

function checkPanel(panel, where) {
  if (!panel || typeof panel !== 'object') throw new Error(`${where}: panel must be an object`);
  if (!isStr(panel.title) || !panel.title.trim()) throw new Error(`${where}: panel needs a non-empty 'title'`);
  if (!PANEL_KINDS.includes(panel.kind)) {
    throw new Error(`${where} ("${panel.title}"): kind "${panel.kind}" is not one of ${PANEL_KINDS.join(', ')}`);
  }
  const d = panel.data;
  if (!d || typeof d !== 'object') throw new Error(`${where} ("${panel.title}"): panel needs a 'data' object`);

  const needArray = (key) => {
    if (!isArr(d[key])) throw new Error(`${where} ("${panel.title}"): ${panel.kind} panel needs 'data.${key}' as an array`);
  };
  if (panel.kind === 'stat' || panel.kind === 'list') needArray('items');
  if (panel.kind === 'timeline') needArray('events');
  if (panel.kind === 'log' || panel.kind === 'diff') needArray('lines');
  if (panel.kind === 'table') {
    needArray('columns');
    needArray('rows');
    d.rows.forEach((row, i) => {
      if (!isArr(row)) throw new Error(`${where} ("${panel.title}"): row ${i} is not an array`);
      if (row.length !== d.columns.length) {
        throw new Error(`${where} ("${panel.title}"): row ${i} has ${row.length} cells, expected ${d.columns.length}`);
      }
    });
    if (d.row_states !== undefined) {
      if (!isArr(d.row_states) || d.row_states.length !== d.rows.length) {
        throw new Error(`${where} ("${panel.title}"): 'row_states' must align 1:1 with rows`);
      }
    }
  }
  if (panel.collected_at !== undefined) parseTime(panel.collected_at, `${where} ("${panel.title}").collected_at`);
}

// The atlas shape: a browsable catalog of what a project contains, rather than a
// readout of its state. Facets are declared once at the top so the renderer can
// build the filter controls; an item may only use a declared key and value, which
// is what keeps a filter chip from ever matching nothing.
function checkCatalog(c) {
  if (!c || typeof c !== 'object') throw new Error('catalog: must be an object');
  if (!isArr(c.groups) || !c.groups.length) throw new Error("catalog: needs a non-empty 'groups' array");

  const declared = new Map();
  if (c.facets !== undefined) {
    if (!isArr(c.facets)) throw new Error("catalog: 'facets' must be an array");
    c.facets.forEach((f, i) => {
      if (!isStr(f?.key) || !f.key.trim()) throw new Error(`catalog.facets[${i}]: needs a non-empty 'key'`);
      // A facet key becomes part of an attribute NAME (data-f-<key>), where
      // escaping does not apply. Constrain the character set instead.
      if (!/^[a-z][a-z0-9_-]*$/i.test(f.key)) {
        throw new Error(`catalog.facets[${i}]: key "${f.key}" must be alphanumeric with dashes or underscores`);
      }
      if (!isArr(f.values) || !f.values.length) throw new Error(`catalog.facets[${i}] ("${f.key}"): needs a non-empty 'values' array`);
      if (declared.has(f.key)) throw new Error(`catalog.facets: duplicate key "${f.key}"`);
      declared.set(f.key, new Set(f.values.map(String)));
    });
  }

  c.groups.forEach((g, i) => {
    if (!g || typeof g !== 'object') throw new Error(`catalog.groups[${i}]: must be an object`);
    if (!isStr(g.name) || !g.name.trim()) throw new Error(`catalog.groups[${i}]: needs a non-empty 'name'`);
    if (!isArr(g.items) || !g.items.length) throw new Error(`catalog.groups[${i}] ("${g.name}"): needs a non-empty 'items' array`);
    g.items.forEach((item, j) => {
      const where = `catalog.groups[${i}] ("${g.name}").items[${j}]`;
      if (!item || typeof item !== 'object') throw new Error(`${where}: must be an object`);
      if (!isStr(item.name) || !item.name.trim()) throw new Error(`${where}: needs a non-empty 'name'`);
      if (item.badges !== undefined && !isArr(item.badges)) throw new Error(`${where} ("${item.name}"): 'badges' must be an array`);
      if (item.relations !== undefined) {
        if (!isArr(item.relations)) throw new Error(`${where} ("${item.name}"): 'relations' must be an array`);
        item.relations.forEach((rel, k) => {
          if (!isStr(rel?.label)) throw new Error(`${where} ("${item.name}").relations[${k}]: needs a 'label'`);
          if (!isArr(rel.targets)) throw new Error(`${where} ("${item.name}").relations[${k}]: needs a 'targets' array`);
        });
      }
      if (item.facets !== undefined) {
        if (typeof item.facets !== 'object') throw new Error(`${where} ("${item.name}"): 'facets' must be an object`);
        for (const [key, value] of Object.entries(item.facets)) {
          if (!declared.has(key)) throw new Error(`${where} ("${item.name}"): facet "${key}" is not declared in catalog.facets`);
          if (!declared.get(key).has(String(value))) {
            throw new Error(`${where} ("${item.name}"): facet ${key}="${value}" is not among that facet's declared values`);
          }
        }
      }
    });
  });
}

export function validatePayload(p) {
  if (!p || typeof p !== 'object') throw new Error('payload must be an object');
  if (p.schema !== 1) throw new Error(`unsupported schema "${p.schema}" (this renderer speaks schema 1)`);
  if (!isStr(p.project) || !p.project.trim()) throw new Error("payload needs a non-empty 'project'");
  parseTime(p.generated_at, 'payload.generated_at');

  const hasPanels = isArr(p.panels);
  const hasRepos = isArr(p.repos);
  const hasCatalog = p.catalog !== undefined;
  if (!hasPanels && !hasRepos && !hasCatalog) {
    throw new Error("payload needs 'panels' (status), 'repos' (rollup), or 'catalog' (atlas)");
  }
  if (hasCatalog) checkCatalog(p.catalog);

  if (hasPanels) p.panels.forEach((panel, i) => checkPanel(panel, `panels[${i}]`));
  if (hasRepos) {
    p.repos.forEach((repo, i) => {
      if (!repo || typeof repo !== 'object') throw new Error(`repos[${i}]: must be an object`);
      if (!isStr(repo.name) || !repo.name.trim()) throw new Error(`repos[${i}]: needs a non-empty 'name'`);
      if (!isArr(repo.panels)) throw new Error(`repos[${i}] ("${repo.name}"): needs a 'panels' array`);
      repo.panels.forEach((panel, j) => checkPanel(panel, `repos[${i}].panels[${j}]`));
    });
  }
  return p;
}

// --- panel bodies ------------------------------------------------------------
const renderStat = d => `<div class="stats">` + d.items.map(it =>
  `<div class="stat s-${state(it.state)}">` +
    `<div class="stat-v">${esc(it.value ?? '')}</div>` +
    `<div class="stat-l">${esc(it.label ?? '')}</div>` +
    (it.hint ? `<div class="stat-h">${esc(it.hint)}</div>` : '') +
  `</div>`).join('') + `</div>`;

const renderList = d => `<ul class="list">` + d.items.map(it =>
  `<li class="s-${state(it.state)}">` +
    `<span class="li-t">${esc(it.text ?? '')}</span>` +
    (it.meta ? `<span class="li-m">${esc(it.meta)}</span>` : '') +
  `</li>`).join('') + `</ul>`;

const renderTable = d => {
  const head = d.columns.map(c => `<th>${esc(c)}</th>`).join('');
  const body = d.rows.map((row, i) => {
    const cls = d.row_states ? ` class="s-${state(d.row_states[i])}"` : '';
    return `<tr${cls}>` + row.map(cell => `<td>${esc(cell)}</td>`).join('') + `</tr>`;
  }).join('');
  return `<div class="scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
};

const renderTimeline = d => `<ol class="timeline">` + d.events.map(ev =>
  `<li>` +
    `<span class="tl-w">${esc(ev.when ?? '')}</span>` +
    `<span class="tl-t">${esc(ev.text ?? '')}</span>` +
    (ev.meta ? `<span class="tl-m">${esc(ev.meta)}</span>` : '') +
  `</li>`).join('') + `</ol>`;

const renderLog = d => `<pre class="log">` + d.lines.map(l => esc(l)).join('\n') + `</pre>`;

const renderDiff = d => `<pre class="diff">` + d.lines.map(l => {
  const line = String(l);
  const cls = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : 'ctx';
  return `<span class="${cls}">${esc(line)}</span>`;
}).join('\n') + `</pre>`;

const BODIES = {
  stat: renderStat,
  list: renderList,
  table: renderTable,
  timeline: renderTimeline,
  log: renderLog,
  diff: renderDiff,
};

// --- panel frame -------------------------------------------------------------
export function renderPanel(panel, generatedAtMs) {
  let badge = '';
  if (panel.collected_at) {
    const age = generatedAtMs - parseTime(panel.collected_at, 'collected_at');
    const limit = (panel.stale_after_minutes ?? DEFAULT_STALE_AFTER_MIN) * 60000;
    const stale = age > limit;
    badge = `<span class="age${stale ? ' stale' : ''}" title="${esc(panel.collected_at)}">${esc(fmtAge(age))}</span>`;
  }
  const note = panel.note ? `<div class="note">${esc(panel.note)}</div>` : '';
  const src = panel.source ? `<footer class="src"><code>${esc(panel.source)}</code></footer>` : '';
  return `<section class="panel">` +
    `<header><h2>${esc(panel.title)}</h2>${badge}</header>` +
    note +
    BODIES[panel.kind](panel.data) +
    src +
  `</section>`;
}

// --- lede (answer + needs attention) -----------------------------------------
function renderAttention(items) {
  if (!isArr(items) || !items.length) return '';
  const ordered = items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const rank = x => {
        const idx = SEVERITIES.indexOf(x.item.severity);
        return idx === -1 ? SEVERITIES.length : idx;
      };
      return rank(a) - rank(b) || a.i - b.i;
    })
    .map(({ item }) => {
      const sev = SEVERITIES.includes(item.severity) ? item.severity : 'low';
      return `<li class="sev-${sev}">` +
        (item.ref ? `<span class="ref">${esc(item.ref)}</span>` : '') +
        `<span>${esc(item.text ?? '')}</span></li>`;
    });
  return `<div class="attn"><h2>Needs attention</h2><ol>${ordered.join('')}</ol></div>`;
}

const renderAnswer = answer => {
  if (!isStr(answer) || !answer.trim()) return '';
  return answer.trim().split(/\n\s*\n/)
    .map(para => `<p>${esc(para.trim())}</p>`)
    .join('');
};

// --- catalog (the atlas shape) -----------------------------------------------
// Every row is rendered here, in HTML, with the same escaping path as everything
// else. The inline script only hides and shows rows that already exist, so the
// page degrades to a complete static catalog with scripting disabled and the
// model's text never reaches a JavaScript string literal.
export function renderCatalog(catalog) {
  const facets = isArr(catalog.facets) ? catalog.facets : [];

  const controls = `<div class="controls">` +
    `<input type="search" id="q" class="q" placeholder="Search ${esc(String(catalog.search_placeholder || 'by name or description'))}" autocomplete="off">` +
    facets.map(f => `<div class="facet" data-facet="${esc(f.key)}">` +
      `<span class="facet-l">${esc(f.label || f.key)}</span>` +
      `<button type="button" class="chip on" data-value="">all</button>` +
      f.values.map(v => `<button type="button" class="chip" data-value="${esc(v)}">${esc(v)}</button>`).join('') +
    `</div>`).join('') +
    `<span class="count" id="count"></span>` +
  `</div>`;

  const groups = catalog.groups.map(g => {
    const rows = g.items.map(item => {
      const haystack = [item.name, item.summary, ...(item.badges || [])]
        .filter(Boolean).map(String).join(' ').toLowerCase();
      const facetAttrs = Object.entries(item.facets || {})
        .map(([k, v]) => ` data-f-${esc(k)}="${esc(v)}"`).join('');
      const badges = (item.badges || [])
        .map(b => `<span class="badge">${esc(b)}</span>`).join('');
      const relations = (item.relations || []).map(rel =>
        `<div class="rel"><span class="rel-l">${esc(rel.label)}</span>` +
        rel.targets.map(t => `<span class="rel-t">${esc(t)}</span>`).join('') +
        `</div>`).join('');
      const detail = item.detail || relations || item.path
        ? `<div class="detail">` +
            (item.detail ? `<p>${esc(item.detail)}</p>` : '') +
            relations +
            (item.path ? `<code class="path">${esc(item.path)}</code>` : '') +
          `</div>`
        : '';
      return `<details class="item"${facetAttrs} data-search="${esc(haystack)}">` +
        `<summary>` +
          `<span class="item-n">${esc(item.name)}</span>` +
          `<span class="item-s">${esc(item.summary || '')}</span>` +
          `<span class="badges">${badges}</span>` +
        `</summary>` +
        detail +
      `</details>`;
    }).join('');
    return `<details class="group" open>` +
      `<summary><span class="group-n">${esc(g.name)}</span>` +
      `<span class="group-c" data-total="${g.items.length}">${g.items.length}</span></summary>` +
      (g.note ? `<div class="note">${esc(g.note)}</div>` : '') +
      `<div class="items">${rows}</div>` +
    `</details>`;
  }).join('');

  return controls + `<div class="catalog">${groups}</div>` +
    `<p class="empty" id="empty" hidden>Nothing matches that search and filter combination.</p>`;
}

// Filtering only. No markup is produced here, no model text is interpolated into
// it, and every handler is attached programmatically rather than inline.
const CATALOG_SCRIPT = `
(function(){
  var q=document.getElementById('q'), count=document.getElementById('count'),
      empty=document.getElementById('empty'),
      items=[].slice.call(document.querySelectorAll('.item')),
      groups=[].slice.call(document.querySelectorAll('.group')),
      active={};
  function apply(){
    var term=(q.value||'').trim().toLowerCase(), shown=0;
    items.forEach(function(el){
      var ok=!term||el.getAttribute('data-search').indexOf(term)!==-1;
      for(var k in active){ if(active[k] && el.getAttribute('data-f-'+k)!==active[k]) ok=false; }
      el.hidden=!ok; if(ok) shown++;
    });
    groups.forEach(function(g){
      var vis=g.querySelectorAll('.item:not([hidden])').length;
      g.hidden=vis===0;
      var c=g.querySelector('.group-c');
      c.textContent=vis===+c.getAttribute('data-total')?c.getAttribute('data-total'):vis+' of '+c.getAttribute('data-total');
    });
    count.textContent=shown+' shown';
    empty.hidden=shown!==0;
  }
  q.addEventListener('input',apply);
  [].slice.call(document.querySelectorAll('.facet')).forEach(function(f){
    var key=f.getAttribute('data-facet');
    [].slice.call(f.querySelectorAll('.chip')).forEach(function(btn){
      btn.addEventListener('click',function(){
        [].slice.call(f.querySelectorAll('.chip')).forEach(function(b){b.classList.remove('on');});
        btn.classList.add('on');
        active[key]=btn.getAttribute('data-value');
        apply();
      });
    });
  });
  apply();
})();
`;

// --- page --------------------------------------------------------------------
export function renderPage(payload) {
  validatePayload(payload);
  const generatedAtMs = parseTime(payload.generated_at, 'payload.generated_at');
  const heading = payload.question?.trim() ? esc(payload.question.trim()) : 'Project status';

  let main;
  if (payload.catalog) {
    main = renderCatalog(payload.catalog);
  } else if (isArr(payload.repos)) {
    main = payload.repos.map(repo => {
      const count = isArr(repo.attention) ? repo.attention.length : 0;
      const worst = isArr(repo.attention) && repo.attention.length
        ? SEVERITIES.find(s => repo.attention.some(a => a.severity === s)) || 'low'
        : 'none';
      return `<details class="repo" open>` +
        `<summary>` +
          `<span class="dot sev-${worst}"></span>` +
          `<span class="repo-n">${esc(repo.name)}</span>` +
          (repo.path ? `<span class="repo-p">${esc(repo.path)}</span>` : '') +
          `<span class="repo-c">${count ? `${count} needing attention` : 'clear'}</span>` +
        `</summary>` +
        `<div class="repo-body">` +
          (renderAnswer(repo.answer) ? `<div class="lede">${renderAnswer(repo.answer)}</div>` : '') +
          renderAttention(repo.attention) +
          `<div class="grid">${repo.panels.map(p => renderPanel(p, generatedAtMs)).join('')}</div>` +
        `</div>` +
      `</details>`;
    }).join('');
  } else {
    main = `<div class="grid">${payload.panels.map(p => renderPanel(p, generatedAtMs)).join('')}</div>`;
  }

  const lede = renderAnswer(payload.answer);
  const isAtlas = Boolean(payload.catalog);
  const foot = isAtlas
    ? 'Catalog built from this project&#39;s own files. Search and filters run in the page; with scripting off, every entry is still listed.'
    : 'Read-only snapshot. Panel ages are measured against the generation time above.';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(payload.project)} — dashboard</title>
<style>${CSS}</style>
</head>
<body>
<header class="head">
  <div class="crumb"><span class="proj">${esc(payload.project)}</span><span class="gen">generated ${esc(payload.generated_at)}</span></div>
  <h1>${heading}</h1>
</header>
${lede ? `<div class="lede">${lede}</div>` : ''}
${renderAttention(payload.attention)}
<main>${main}</main>
<footer class="foot">${foot}</footer>
${isAtlas ? `<script>${CATALOG_SCRIPT}</script>` : ''}
</body>
</html>
`;
}

// --- style -------------------------------------------------------------------
const CSS = `
:root{--bg:#fbfbfa;--fg:#1c1c1a;--mut:#6b6b66;--card:#fff;--line:#e4e4e0;
--ok:#16a34a;--warn:#c2740a;--bad:#dc2626;--acc:#4f46e5}
@media(prefers-color-scheme:dark){:root{--bg:#131315;--fg:#e8e8e6;--mut:#9a9a95;
--card:#1c1c1f;--line:#2e2e33;--ok:#4ade80;--warn:#fbbf24;--bad:#f87171;--acc:#a5b4fc}}
*{box-sizing:border-box}
body{margin:0;padding:2rem 1.5rem 4rem;background:var(--bg);color:var(--fg);
font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
max-width:1180px;margin-inline:auto}
h1{font-size:1.45rem;margin:.2rem 0 0;font-weight:620;letter-spacing:-.01em}
h2{font-size:.82rem;margin:0;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--mut)}
.crumb{display:flex;gap:.6rem;align-items:baseline;font-size:.78rem;color:var(--mut)}
.proj{font-weight:600;color:var(--fg)}
.head{border-bottom:1px solid var(--line);padding-bottom:1rem;margin-bottom:1.25rem}
.lede p{margin:0 0 .6rem;max-width:68ch}
.attn{margin:1rem 0 1.5rem}
.attn ol{margin:.5rem 0 0;padding:0;list-style:none;counter-reset:a}
.attn li{counter-increment:a;display:flex;gap:.55rem;align-items:baseline;padding:.4rem 0;
border-bottom:1px solid var(--line)}
.attn li::before{content:counter(a);color:var(--mut);font-variant-numeric:tabular-nums;min-width:1.1rem}
.attn li.sev-high{border-left:3px solid var(--bad);padding-left:.6rem}
.attn li.sev-medium{border-left:3px solid var(--warn);padding-left:.6rem}
.attn li.sev-low{border-left:3px solid var(--line);padding-left:.6rem}
.ref{font:.8rem ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--acc)}
.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(310px,1fr))}
.panel{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:.9rem 1rem 1rem}
.panel>header{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.7rem}
.age{font-size:.72rem;color:var(--mut);white-space:nowrap}
.age.stale{color:var(--warn);font-weight:600}
.note{font-size:.82rem;color:var(--mut);margin:-.35rem 0 .6rem}
.src{margin-top:.8rem;padding-top:.5rem;border-top:1px solid var(--line);font-size:.72rem;color:var(--mut);overflow-x:auto}
.src code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.stats{display:flex;flex-wrap:wrap;gap:1.1rem}
.stat-v{font-size:1.5rem;font-weight:640;line-height:1.1;font-variant-numeric:tabular-nums}
.stat-l{font-size:.78rem;color:var(--mut)}
.stat-h{font-size:.72rem;color:var(--mut);opacity:.8}
.stat.s-ok .stat-v{color:var(--ok)}.stat.s-warn .stat-v{color:var(--warn)}.stat.s-bad .stat-v{color:var(--bad)}
.list{list-style:none;margin:0;padding:0}
.list li{display:flex;justify-content:space-between;gap:.75rem;padding:.35rem 0;border-bottom:1px solid var(--line)}
.list li:last-child{border-bottom:0}
.list li.s-ok .li-t{color:var(--ok)}.list li.s-warn .li-t{color:var(--warn)}.list li.s-bad .li-t{color:var(--bad)}
.li-m{color:var(--mut);font-size:.78rem;white-space:nowrap}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:.86rem}
th{text-align:left;font-weight:600;color:var(--mut);font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;
padding:.3rem .6rem .3rem 0;border-bottom:1px solid var(--line)}
td{padding:.32rem .6rem .32rem 0;border-bottom:1px solid var(--line);white-space:nowrap}
tr.s-ok td:first-child{color:var(--ok)}tr.s-warn td:first-child{color:var(--warn)}tr.s-bad td:first-child{color:var(--bad)}
.timeline{list-style:none;margin:0;padding:0}
.timeline li{display:grid;grid-template-columns:5.5rem 1fr auto;gap:.6rem;padding:.3rem 0;align-items:baseline}
.tl-w{color:var(--mut);font-size:.78rem}
.tl-m{color:var(--mut);font-size:.74rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.log,.diff{margin:0;max-height:19rem;overflow:auto;font:.78rem/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:.6rem}
.diff .add{color:var(--ok);display:block}.diff .del{color:var(--bad);display:block}.diff .ctx{display:block}
.repo{background:var(--card);border:1px solid var(--line);border-radius:10px;margin-bottom:1rem;padding:.5rem .9rem}
.repo summary{cursor:pointer;display:flex;gap:.6rem;align-items:center;padding:.35rem 0;font-weight:600}
.repo-p{color:var(--mut);font-weight:400;font-size:.78rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.repo-c{margin-left:auto;color:var(--mut);font-weight:400;font-size:.78rem}
.repo-body{padding:.6rem 0 .4rem}
.dot{width:.55rem;height:.55rem;border-radius:50%;background:var(--line);flex:none}
.dot.sev-high{background:var(--bad)}.dot.sev-medium{background:var(--warn)}.dot.sev-low{background:var(--mut)}
.dot.sev-none{background:var(--ok)}
.foot{margin-top:2rem;padding-top:.8rem;border-top:1px solid var(--line);font-size:.75rem;color:var(--mut)}
.controls{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;margin:0 0 1.25rem;
padding:.75rem;background:var(--card);border:1px solid var(--line);border-radius:10px;position:sticky;top:0;z-index:2}
.q{flex:1 1 15rem;min-width:0;padding:.42rem .65rem;border:1px solid var(--line);border-radius:7px;
background:var(--bg);color:var(--fg);font:inherit;font-size:.88rem}
.q:focus{outline:2px solid var(--acc);outline-offset:1px}
.facet{display:flex;gap:.25rem;align-items:center;flex-wrap:wrap}
.facet-l{font-size:.72rem;color:var(--mut);text-transform:uppercase;letter-spacing:.05em;margin-right:.15rem}
.chip{font:inherit;font-size:.76rem;padding:.2rem .55rem;border:1px solid var(--line);border-radius:99px;
background:transparent;color:var(--mut);cursor:pointer}
.chip:hover{color:var(--fg);border-color:var(--mut)}
.chip.on{background:var(--acc);border-color:var(--acc);color:#fff;font-weight:600}
.count{margin-left:auto;font-size:.76rem;color:var(--mut);font-variant-numeric:tabular-nums}
.catalog{display:flex;flex-direction:column;gap:.75rem}
.group{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:.55rem .9rem}
.group>summary{cursor:pointer;display:flex;gap:.6rem;align-items:baseline;padding:.3rem 0}
.group-n{font-weight:640;font-size:.95rem}
.group-c{color:var(--mut);font-size:.76rem;font-variant-numeric:tabular-nums}
.items{padding:.35rem 0 .2rem}
.item{border-bottom:1px solid var(--line)}
.item:last-child{border-bottom:0}
.item>summary{cursor:pointer;display:grid;grid-template-columns:minmax(8rem,14rem) 1fr auto;gap:.75rem;
align-items:baseline;padding:.42rem 0}
.item-n{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.84rem;color:var(--acc);font-weight:600}
.item-s{color:var(--mut);font-size:.85rem}
.badges{display:flex;gap:.3rem;flex-wrap:wrap;justify-content:flex-end}
.badge{font-size:.68rem;padding:.08rem .42rem;border:1px solid var(--line);border-radius:99px;color:var(--mut);white-space:nowrap}
.detail{padding:.1rem 0 .7rem;margin-left:.2rem;border-left:2px solid var(--line);padding-left:.9rem}
.detail p{margin:.1rem 0 .5rem;max-width:70ch;font-size:.88rem}
.rel{display:flex;gap:.35rem;flex-wrap:wrap;align-items:baseline;margin-bottom:.3rem}
.rel-l{font-size:.72rem;color:var(--mut);text-transform:uppercase;letter-spacing:.05em}
.rel-t{font:.76rem ui-monospace,SFMono-Regular,Menlo,monospace;padding:.05rem .4rem;
background:var(--bg);border:1px solid var(--line);border-radius:5px}
.path{font-size:.72rem;color:var(--mut);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.empty{color:var(--mut);font-size:.88rem;padding:1.5rem 0}
@media(max-width:620px){.item>summary{grid-template-columns:1fr;gap:.15rem}.badges{justify-content:flex-start}}
`;

// --- CLI ---------------------------------------------------------------------
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const [input, out] = process.argv.slice(2);
  if (!input || !out) {
    console.error('usage: node render.mjs <payload.json|-> <out.html>');
    process.exit(2);
  }
  const raw = input === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(input, 'utf8');
  const payload = JSON.parse(raw);
  const html = renderPage(payload);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, html);
  const kb = Math.round(html.length / 1024);
  if (payload.catalog) {
    const groups = payload.catalog.groups.length;
    const items = payload.catalog.groups.reduce((n, g) => n + g.items.length, 0);
    console.log(`wrote ${out}  (${items} entries in ${groups} group${groups === 1 ? '' : 's'}, ${kb} KB)`);
  } else {
    const panels = payload.repos
      ? payload.repos.reduce((n, r) => n + r.panels.length, 0)
      : payload.panels.length;
    console.log(`wrote ${out}  (${panels} panel${panels === 1 ? '' : 's'}, ${kb} KB)`);
  }
}
