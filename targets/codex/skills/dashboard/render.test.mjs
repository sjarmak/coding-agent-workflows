#!/usr/bin/env node
// Regression tests for the dashboard renderer. Zero dependencies: node + assert.
// Run: node source/skills/dashboard/render.test.mjs
//
// The renderer is the deterministic half of the skill, so it is the half that
// can be pinned down: escaping, staleness arithmetic, severity ordering, and
// rejection of malformed payloads. Every timestamp is supplied by the payload,
// never read from the clock, which is what makes these assertions stable.

import assert from 'node:assert/strict';

import { esc, fmtAge, renderPage, renderPanel, validatePayload, PANEL_KINDS } from './render.mjs';

const results = [];
function test(name, fn) {
  try { fn(); results.push([true, name]); }
  catch (err) { results.push([false, name, err]); }
}

const GEN = '2026-07-25T13:42:00Z';
const GEN_MS = Date.parse(GEN);
const minutesBefore = n => new Date(GEN_MS - n * 60000).toISOString();

const payload = (over = {}) => ({
  schema: 1,
  project: 'spoon-knife',
  generated_at: GEN,
  question: "what's blocking the release",
  answer: 'Two beads block the milestone.\n\nNothing is in flight against either.',
  attention: [
    { text: 'branch 11 behind main', severity: 'medium', ref: 'feat/auth' },
    { text: 'bd-142 blocked 6 days', severity: 'high', ref: 'bd-142' },
    { text: 'stale worktree from April', severity: 'low' },
  ],
  panels: [{
    id: 'git', title: 'Git', kind: 'stat', source: 'git status --porcelain',
    collected_at: minutesBefore(4),
    data: { items: [{ label: 'unpushed', value: 3, state: 'warn', hint: 'vs origin/main' }] },
  }],
  ...over,
});

// --- escaping ----------------------------------------------------------------
test('escapes the five HTML-significant characters', () => {
  assert.equal(esc(`<b>&"'`), '&lt;b&gt;&amp;&quot;&#39;');
});

test('escapes model-supplied text in every text-bearing field', () => {
  const xss = '<script>alert(7)</script>';
  const html = renderPage(payload({
    project: `proj${xss}`,
    question: `q${xss}`,
    answer: `a${xss}`,
    attention: [{ text: `attn${xss}`, severity: 'high', ref: `ref${xss}` }],
    panels: [
      { title: `t${xss}`, kind: 'list', source: `src${xss}`, note: `note${xss}`,
        data: { items: [{ text: `item${xss}`, meta: `meta${xss}` }] } },
      { title: 'Table', kind: 'table',
        data: { columns: [`col${xss}`], rows: [[`cell${xss}`]] } },
      { title: 'Timeline', kind: 'timeline',
        data: { events: [{ when: `w${xss}`, text: `e${xss}`, meta: `m${xss}` }] } },
      { title: 'Log', kind: 'log', data: { lines: [`log${xss}`] } },
      { title: 'Diff', kind: 'diff', data: { lines: [`+add${xss}`] } },
    ],
  }));
  assert.ok(!html.includes('<script>alert(7)</script>'), 'no unescaped script tag survives');
  // 18 injection sites, counted from the payload above: project renders twice
  // (document title + header), question, answer, attention text + ref, then
  // list(title, source, note, item.text, item.meta), table(column, cell),
  // timeline(when, text, meta), log(line), diff(line). Escaped, never dropped.
  assert.equal(html.match(/&lt;script&gt;alert\(7\)&lt;\/script&gt;/g).length, 18,
    'every injected occurrence is escaped, none dropped');
});

test('escapes a quote-breaking timestamp in the age tooltip attribute', () => {
  const html = renderPage(payload({
    panels: [{ title: 'Git', kind: 'log', collected_at: minutesBefore(5), data: { lines: ['x'] } }],
  }));
  assert.ok(html.includes(`title="${minutesBefore(5)}"`), 'tooltip carries the raw timestamp');
});

// --- age arithmetic ----------------------------------------------------------
test('formats ages across every unit boundary', () => {
  assert.equal(fmtAge(-5000), 'just now');
  assert.equal(fmtAge(0), 'just now');
  assert.equal(fmtAge(59_000), 'just now');
  assert.equal(fmtAge(60_000), '1m ago');
  assert.equal(fmtAge(23 * 60_000), '23m ago');
  assert.equal(fmtAge(59 * 60_000), '59m ago');
  assert.equal(fmtAge(60 * 60_000), '1h ago');
  assert.equal(fmtAge(23 * 3_600_000), '23h ago');
  assert.equal(fmtAge(24 * 3_600_000), '1d ago');
  assert.equal(fmtAge(9 * 86_400_000), '9d ago');
});

test('marks a panel stale only past its threshold', () => {
  const panelAt = (mins, over = {}) => renderPanel(
    { title: 'CI', kind: 'log', collected_at: minutesBefore(mins), data: { lines: ['ok'] }, ...over },
    GEN_MS,
  );
  assert.ok(panelAt(12).includes('class="age"'), '12m is fresh under the 30m default');
  assert.ok(panelAt(12).includes('12m ago'));
  assert.ok(panelAt(90).includes('class="age stale"'), '90m is stale under the 30m default');
  assert.ok(panelAt(90).includes('1h ago'));
  assert.ok(panelAt(90, { stale_after_minutes: 120 }).includes('class="age"'),
    'a raised threshold keeps 90m fresh');
  assert.ok(panelAt(31, { stale_after_minutes: 30 }).includes('class="age stale"'),
    'one minute past the threshold is stale');
});

test('omits the age badge entirely when a panel reports no collection time', () => {
  const html = renderPanel({ title: 'Notes', kind: 'log', data: { lines: ['a'] } }, GEN_MS);
  assert.ok(!html.includes('class="age'), 'no badge rather than a fabricated age');
});

// --- panel kinds -------------------------------------------------------------
test('renders every declared panel kind', () => {
  const byKind = {
    stat: { items: [{ label: 'ahead', value: 4, state: 'ok' }] },
    list: { items: [{ text: 'bd-142', meta: '6 days', state: 'bad' }] },
    table: { columns: ['Branch', 'Behind'], rows: [['main', '0'], ['feat/auth', '11']], row_states: ['ok', 'warn'] },
    timeline: { events: [{ when: '2h ago', text: 'merged #4471', meta: 'abc1234' }] },
    log: { lines: ['line one', 'line two'] },
    diff: { lines: ['+added', '-removed', ' context'] },
  };
  assert.deepEqual(Object.keys(byKind).sort(), [...PANEL_KINDS].sort(), 'coverage matches the kind list');
  for (const [kind, data] of Object.entries(byKind)) {
    const html = renderPanel({ title: `panel-${kind}`, kind, data }, GEN_MS);
    assert.ok(html.includes(`panel-${kind}`), `${kind}: renders its title`);
    assert.ok(html.length > 60, `${kind}: renders a body`);
  }
});

test('colors diff lines by their leading character', () => {
  const html = renderPanel(
    { title: 'Diff', kind: 'diff', data: { lines: ['+new line', '-old line', ' unchanged'] } },
    GEN_MS,
  );
  assert.ok(html.includes('<span class="add">+new line</span>'));
  assert.ok(html.includes('<span class="del">-old line</span>'));
  assert.ok(html.includes('<span class="ctx"> unchanged</span>'));
});

test('applies a row state to its own row only', () => {
  const html = renderPanel({
    title: 'Branches', kind: 'table',
    data: { columns: ['Branch', 'Behind'], rows: [['main', '0'], ['feat/auth', '11']], row_states: ['ok', 'bad'] },
  }, GEN_MS);
  assert.ok(html.includes('<tr class="s-ok"><td>main</td><td>0</td></tr>'));
  assert.ok(html.includes('<tr class="s-bad"><td>feat/auth</td><td>11</td></tr>'));
});

test('falls back to the neutral state for an unrecognized state name', () => {
  const html = renderPanel(
    { title: 'S', kind: 'stat', data: { items: [{ label: 'x', value: 9, state: 'catastrophic' }] } },
    GEN_MS,
  );
  assert.ok(html.includes('stat s-neutral'), 'unknown state never becomes a class name');
  assert.ok(!html.includes('catastrophic'));
});

// --- lede --------------------------------------------------------------------
test('orders needs-attention by severity, stably within a severity', () => {
  const html = renderPage(payload({
    attention: [
      { text: 'low-first', severity: 'low' },
      { text: 'high-one', severity: 'high' },
      { text: 'medium-one', severity: 'medium' },
      { text: 'high-two', severity: 'high' },
      { text: 'unranked', severity: 'catastrophic' },
    ],
  }));
  const order = [...html.matchAll(/<span>([a-z-]+)<\/span>/g)].map(m => m[1]);
  assert.deepEqual(order, ['high-one', 'high-two', 'medium-one', 'low-first', 'unranked']);
});

test('splits the written answer on blank lines into paragraphs', () => {
  const html = renderPage(payload({ answer: 'First para.\n\nSecond para.' }));
  assert.ok(html.includes('<p>First para.</p><p>Second para.</p>'));
});

test('omits the lede and attention blocks when the model supplies neither', () => {
  const html = renderPage(payload({ answer: undefined, attention: undefined, question: undefined }));
  assert.ok(!html.includes('class="lede"'));
  assert.ok(!html.includes('Needs attention'));
  assert.ok(html.includes('Project status'), 'falls back to a neutral heading with no question');
});

// --- rollup ------------------------------------------------------------------
test('renders one collapsible section per repo in rollup mode', () => {
  const html = renderPage({
    schema: 1, project: 'fleet', generated_at: GEN, question: 'what needs me',
    repos: [
      { name: 'gascity', path: '/src/gascity', answer: 'Two PRs waiting.',
        attention: [{ text: 'PR 118 has conflicts', severity: 'high' }],
        panels: [{ title: 'Git', kind: 'stat', data: { items: [{ label: 'unpushed', value: 2 }] } }] },
      { name: 'spoon-knife', panels: [{ title: 'Git', kind: 'log', data: { lines: ['clean'] } }] },
    ],
  });
  assert.equal(html.match(/<details class="repo"/g).length, 2, 'one section per repo');
  assert.ok(html.includes('>gascity<'));
  assert.ok(html.includes('>spoon-knife<'));
  assert.ok(html.includes('1 needing attention'), 'repo with findings is counted');
  assert.ok(html.includes('>clear<'), 'repo with no findings reads clear');
  assert.ok(html.includes('dot sev-high'), 'worst severity drives the repo dot');
  assert.ok(html.includes('dot sev-none'), 'a clear repo gets the clear dot');
});

// --- validation --------------------------------------------------------------
test('rejects malformed payloads with a message naming the defect', () => {
  const cases = [
    [{}, /must be an object|schema/],
    [payload({ schema: 2 }), /unsupported schema "2"/],
    [payload({ project: '  ' }), /non-empty 'project'/],
    [payload({ generated_at: 'last tuesday' }), /not a parseable timestamp/],
    [payload({ panels: undefined }), /needs 'panels' \(status\), 'repos' \(rollup\), or 'catalog' \(atlas\)/],
    [payload({ panels: [{ title: 'X', kind: 'sparkline', data: {} }] }), /kind "sparkline" is not one of/],
    [payload({ panels: [{ kind: 'log', data: { lines: [] } }] }), /non-empty 'title'/],
    [payload({ panels: [{ title: 'X', kind: 'log' }] }), /needs a 'data' object/],
    [payload({ panels: [{ title: 'X', kind: 'list', data: { items: 'nope' } }] }), /'data.items' as an array/],
    [payload({ panels: [{ title: 'X', kind: 'table', data: { columns: ['a', 'b'], rows: [['only-one']] } }] }),
      /row 0 has 1 cells, expected 2/],
    [payload({ panels: [{ title: 'X', kind: 'table', data: { columns: ['a'], rows: [['1'], ['2']], row_states: ['ok'] } }] }),
      /'row_states' must align 1:1/],
    [payload({ panels: [{ title: 'X', kind: 'log', collected_at: 'yesterday', data: { lines: ['a'] } }] }),
      /not a parseable timestamp/],
    [{ schema: 1, project: 'p', generated_at: GEN, repos: [{ name: 'r' }] }, /needs a 'panels' array/],
  ];
  for (const [bad, pattern] of cases) {
    assert.throws(() => validatePayload(bad), pattern, `should reject: ${JSON.stringify(bad).slice(0, 80)}`);
  }
});

test('accepts the well-formed reference payload', () => {
  assert.doesNotThrow(() => validatePayload(payload()));
});

// --- determinism -------------------------------------------------------------
test('renders byte-identical output for an identical payload', () => {
  assert.equal(renderPage(payload()), renderPage(payload()));
});

test('emits a complete standalone document with no external references', () => {
  const html = renderPage(payload());
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('<style>'), 'CSS is inlined');
  assert.ok(!/<link\b/i.test(html), 'no external stylesheets');
  assert.ok(!/https?:\/\//.test(html), 'no network references');
  assert.ok(html.includes('prefers-color-scheme:dark'), 'styles both themes');
});

test('a status page carries no script at all', () => {
  assert.ok(!/<script\b/i.test(renderPage(payload())), 'status shape stays script-free');
  assert.ok(!/<script\b/i.test(renderPage(payload({ answer: undefined }))));
});

// --- atlas shape -------------------------------------------------------------
const catalog = (over = {}) => ({
  schema: 1,
  project: 'agentic-coding-practices',
  generated_at: GEN,
  question: 'what is in this project',
  catalog: {
    facets: [
      { key: 'scope', label: 'Scope', values: ['universal', 'claude'] },
      { key: 'type', label: 'Type', values: ['skill', 'agent'] },
    ],
    groups: [
      { name: 'Skills', note: 'invoked by name', items: [
        { name: 'grill-me', summary: 'Interview until no forks remain',
          facets: { scope: 'universal', type: 'skill' }, badges: ['universal'],
          path: 'source/skills/grill-me/SKILL.md',
          relations: [{ label: 'invoked by', targets: ['research', 'decompose'] }] },
        { name: 'review', summary: 'Multi-model review',
          facets: { scope: 'claude', type: 'skill' }, badges: ['claude'] },
      ] },
      { name: 'Agents', items: [
        { name: 'code-reviewer', summary: 'Quality review',
          facets: { scope: 'universal', type: 'agent' }, badges: ['universal'] },
      ] },
    ],
    ...over,
  },
});

test('renders every catalog group and entry with its counts', () => {
  const html = renderPage(catalog());
  assert.equal(html.match(/<details class="group"/g).length, 2, 'one section per group');
  assert.equal(html.match(/<details class="item"/g).length, 3, 'one row per entry');
  assert.ok(html.includes('>Skills</span><span class="group-c" data-total="2">2</span>'));
  assert.ok(html.includes('>grill-me<') && html.includes('>review<') && html.includes('>code-reviewer<'));
  assert.ok(html.includes('Interview until no forks remain'));
});

test('builds a lowercased search index from name, summary, and badges', () => {
  const html = renderPage(catalog());
  assert.ok(html.includes('data-search="grill-me interview until no forks remain universal"'),
    'search text is folded to lowercase and spans all three fields');
});

test('emits declared facets as filter controls and per-row attributes', () => {
  const html = renderPage(catalog());
  assert.ok(html.includes('<div class="facet" data-facet="scope">'));
  assert.ok(html.includes('<button type="button" class="chip on" data-value="">all</button>'),
    'each facet opens on its all-chip');
  assert.ok(html.includes('data-f-scope="universal" data-f-type="skill"'));
  assert.ok(html.includes('data-f-scope="claude"'));
});

test('renders relations and paths inside the collapsed detail', () => {
  const html = renderPage(catalog());
  assert.ok(html.includes('<span class="rel-l">invoked by</span>'));
  assert.ok(html.includes('<span class="rel-t">research</span><span class="rel-t">decompose</span>'));
  assert.ok(html.includes('<code class="path">source/skills/grill-me/SKILL.md</code>'));
});

test('escapes model text throughout the catalog', () => {
  const xss = '<img src=x onerror=alert(1)>';
  const html = renderPage({
    schema: 1, project: 'p', generated_at: GEN,
    catalog: {
      facets: [{ key: 'scope', label: `L${xss}`, values: [`v${xss}`] }],
      groups: [{ name: `g${xss}`, note: `n${xss}`, items: [{
        name: `i${xss}`, summary: `s${xss}`, badges: [`b${xss}`], detail: `d${xss}`,
        path: `p${xss}`, facets: { scope: `v${xss}` },
        relations: [{ label: `rl${xss}`, targets: [`rt${xss}`] }],
      }] }],
    },
  });
  // The escaped form legitimately contains the substring " onerror=" as text, so
  // the invariant worth testing is that neither bracket survives raw: without an
  // unescaped < to open the tag or > to close it, the payload is inert wherever
  // it lands, and quotes are escaped so it cannot break out of an attribute.
  assert.ok(!html.includes('<img src=x'), 'the injected tag never opens as real markup');
  assert.ok(!/onerror=alert\(1\)>/.test(html), 'the injected tag never closes as real markup');
  assert.ok(!/=""[^>]*onerror/.test(html), 'no injected text breaks out of an attribute value');
  // 16 sites: facet label(1) + facet value as chip attribute and chip text(2) +
  // group name(1) + note(1) + item name in the row and in data-search(2) +
  // summary likewise(2) + badge likewise(2) + facet value as the row's
  // data-f-scope(1) + detail(1) + path(1) + relation label(1) + target(1).
  assert.equal(html.match(/&lt;img src=x onerror=alert\(1\)&gt;/g).length, 16,
    'every injection site is escaped, including the search index and facet attributes');
});

test('rejects malformed catalogs with a message naming the defect', () => {
  const bad = over => ({ schema: 1, project: 'p', generated_at: GEN, catalog: over });
  const cases = [
    [bad({}), /needs a non-empty 'groups' array/],
    [bad({ groups: [] }), /needs a non-empty 'groups' array/],
    [bad({ groups: [{ items: [{ name: 'x' }] }] }), /needs a non-empty 'name'/],
    [bad({ groups: [{ name: 'G', items: [] }] }), /needs a non-empty 'items' array/],
    [bad({ groups: [{ name: 'G', items: [{ summary: 'no name' }] }] }), /needs a non-empty 'name'/],
    [bad({ facets: [{ key: 'scope' }], groups: [{ name: 'G', items: [{ name: 'x' }] }] }),
      /needs a non-empty 'values' array/],
    [bad({ facets: [{ key: 'data-x"onload="evil', values: ['a'] }], groups: [{ name: 'G', items: [{ name: 'x' }] }] }),
      /must be alphanumeric/],
    [bad({ facets: [{ key: 'scope', values: ['a'] }, { key: 'scope', values: ['b'] }],
      groups: [{ name: 'G', items: [{ name: 'x' }] }] }), /duplicate key "scope"/],
    [bad({ facets: [{ key: 'scope', values: ['universal'] }],
      groups: [{ name: 'G', items: [{ name: 'x', facets: { tier: 'a' } }] }] }),
      /facet "tier" is not declared/],
    [bad({ facets: [{ key: 'scope', values: ['universal'] }],
      groups: [{ name: 'G', items: [{ name: 'x', facets: { scope: 'codex' } }] }] }),
      /scope="codex" is not among that facet's declared values/],
    [bad({ groups: [{ name: 'G', items: [{ name: 'x', relations: [{ label: 'a' }] }] }] }),
      /needs a 'targets' array/],
  ];
  for (const [payloadIn, pattern] of cases) {
    assert.throws(() => validatePayload(payloadIn), pattern,
      `should reject: ${JSON.stringify(payloadIn.catalog).slice(0, 90)}`);
  }
});

test('ships exactly one inline script, with no inline handlers and no network', () => {
  const html = renderPage(catalog());
  assert.equal(html.match(/<script>/g).length, 1, 'one inline script');
  assert.ok(!/<script[^>]+src=/i.test(html), 'never loads a remote script');
  assert.ok(!/\son(click|load|error|input)=/i.test(html), 'handlers are attached in code, not markup');
  assert.ok(!/https?:\/\//.test(html), 'no network references');
  assert.ok(html.includes("addEventListener('input'"), 'search is wired');
});

test('renders every catalog entry up front so the page survives scripting being off', () => {
  const html = renderPage(catalog());
  assert.ok(!/<details class="item"[^>]*\shidden/.test(html), 'no entry ships pre-hidden');
  assert.ok(!/<details class="group"[^>]*\shidden/.test(html), 'no group ships pre-hidden');
  assert.equal(html.match(/<p class="empty" id="empty" hidden>/g).length, 1,
    'the empty-state notice is the only thing hidden at rest');
  const scriptless = html.slice(0, html.indexOf('<script>'));
  for (const name of ['grill-me', 'review', 'code-reviewer']) {
    assert.ok(scriptless.includes(`>${name}<`), `${name} is present before any script runs`);
  }
});

let failed = 0;
for (const [ok, name, err] of results) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) { failed++; console.error(`     ${err.message}`); }
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
