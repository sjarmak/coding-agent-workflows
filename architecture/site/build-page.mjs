// Model-driven landing-page generator for LikeC4 architecture sites.
// Reads a model JSON (`likec4 export json`) + the exported figures dir, and
// emits a static index.html styled by styles.css (the sjarmak.ai design system).
//
// Usage:
//   node build-page.mjs --model model.json --figures _site/figures \
//        --out _site/index.html --repo <slug> [--explore ./explore/]
//
// Fully generic: no per-repo copy. Captions come from each view's own title +
// description, falling back to the description of the element the view is "of".

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

const modelPath = args.model;
const figuresDir = args.figures;
const outPath = args.out;
const repo = args.repo || "architecture";
const explore = args.explore || "./explore/";
// GitHub link target. Defaults to the public sjarmak/<repo>; pass --github <url>
// to override (e.g. point a private project's links at its public arch repo),
// or --github none to omit GitHub links entirely.
const github = args.github !== undefined ? args.github : `https://github.com/sjarmak/${repo}`;
const showGithub = github && github !== "none";

const model = JSON.parse(readFileSync(modelPath, "utf8"));
const views = Object.values(model.views || {});
const elements = model.elements || {};

const txt = (d) => (d && typeof d === "object" ? d.txt : typeof d === "string" ? d : "") || "";
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const figureExists = (id) => existsSync(join(figuresDir, `${id}.png`));

// Caption description: view's own description, else the described element it is "of".
function describe(v) {
  const own = txt(v.description);
  if (own) return own;
  if (v.viewOf && elements[v.viewOf]) return txt(elements[v.viewOf].description);
  return "";
}

// Hero: the primary `system` element (fallback: first element, then repo slug).
const systemEl =
  Object.values(elements).find((e) => e.kind === "system") ||
  Object.values(elements).find((e) => !String(e.id || "").includes(".")) ||
  null;
const brand = (systemEl && systemEl.title) || repo;
const heroLead =
  (systemEl && txt(systemEl.description)) ||
  (views.find((v) => v.id === "index") && views.find((v) => v.id === "index").title) ||
  `Architecture-as-code model of ${repo}.`;

// Group views.
const isLandscape = (v) => v._type === "element" && (!v.viewOf || (systemEl && v.viewOf === systemEl.id));
const elementViews = views.filter((v) => v._type === "element");
const landscapeViews = elementViews.filter(isLandscape);
const structureViews = elementViews.filter((v) => !isLandscape(v));
const dynamicViews = views.filter((v) => v._type === "dynamic");
const deploymentViews = views.filter((v) => v._type === "deployment");

function figure(v, { wide = false } = {}) {
  if (!figureExists(v.id)) return "";
  const desc = describe(v);
  return `        <figure class="diagram${wide ? " wide" : ""}">
          <a class="frame" href="./figures/${esc(v.id)}.png" aria-label="Open full-resolution diagram">
            <img src="./figures/${esc(v.id)}.png" alt="${esc(v.title || v.id)}" loading="lazy" />
          </a>
          <figcaption>
            <div class="fig-title"><h3>${esc(v.title || v.id)}</h3><span class="fig-id">${esc(v.id)}</span></div>
            ${desc ? `<p>${esc(desc)}</p>` : ""}
          </figcaption>
        </figure>`;
}

function section(id, kicker, heading, blurb, figs) {
  const cards = figs.filter(Boolean).join("\n");
  if (!cards.trim()) return "";
  return `      <section class="section" id="${id}">
        <div class="container">
          <div class="section__head">
            <p class="kicker">${esc(kicker)}</p>
            <h2>${esc(heading)}</h2>
            ${blurb ? `<p class="muted">${esc(blurb)}</p>` : ""}
          </div>
          <div class="auto-grid">
${cards}
          </div>
        </div>
      </section>`;
}

const sections = [
  section(
    "landscape",
    "The whole picture",
    "System landscape",
    "The system in context, then opened up into its containers.",
    landscapeViews.map((v) => figure(v, { wide: true })),
  ),
  section(
    "structure",
    "Inside each box",
    "Containers & components",
    "Each part decomposed into the components that implement it. Every box links to its source in the interactive explorer.",
    structureViews.map((v) => figure(v)),
  ),
  section(
    "flows",
    "How it runs",
    "Walkthrough flows",
    "Dynamic views — the narrative spine of the system, step by step.",
    dynamicViews.map((v) => figure(v)),
  ),
  section(
    "deployment",
    "Where it runs",
    "Deployment",
    "What runs where, and the process & data boundaries between the pieces.",
    deploymentViews.map((v) => figure(v, { wide: true })),
  ),
].filter(Boolean);

const html = `<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(brand)} — Architecture</title>
    <meta name="description" content="Architecture-as-code model of ${esc(brand)}, rendered with LikeC4." />
    <link rel="icon" href="./favicon.svg" type="image/svg+xml" />
    <link rel="preload" href="./fonts/literata-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="./fonts/hanken-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="./styles.css" />
    <script>
      (function () {
        try {
          var saved = localStorage.getItem("c4-theme");
          var theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
          document.documentElement.setAttribute("data-theme", theme);
        } catch (e) {}
      })();
    </script>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="container site-header__inner">
        <a class="site-header__brand" href="#top">${esc(brand)}</a>
        <nav class="site-header__nav" aria-label="Primary">
          <a class="nav-extra" href="https://sjarmak.ai">sjarmak.ai</a>
          <a href="${esc(explore)}">Explorer</a>
          ${showGithub ? `<a class="nav-extra" href="${esc(github)}">GitHub</a>` : ""}
          <button class="theme-toggle" type="button" aria-label="Toggle color theme" data-theme-toggle>
            <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></svg>
          </button>
        </nav>
      </div>
    </header>
    <main id="main">
      <span id="top"></span>
      <section class="hero">
        <div class="container">
          <p class="kicker">Architecture · LikeC4</p>
          <h1>${esc(brand)}</h1>
          <p class="lead">${esc(heroLead)}</p>
          <div class="cluster">
            <a class="btn" href="${esc(explore)}">Open the interactive explorer →</a>
            ${showGithub ? `<a class="btn btn--ghost" href="${esc(github)}">View on GitHub</a>` : ""}
          </div>
          <div class="legend" aria-label="Delivery-state legend">
            <span><i class="swatch" style="background: var(--tag-built)"></i> built</span>
            <span><i class="swatch" style="background: var(--tag-evolving)"></i> evolving</span>
            <span><i class="swatch" style="background: var(--tag-planned)"></i> planned</span>
            <span><i class="swatch" style="background: var(--tag-research)"></i> research</span>
            <span><i class="swatch" style="background: var(--tag-risk)"></i> risk</span>
          </div>
        </div>
      </section>
${sections.join("\n")}
      <section class="section" id="explore">
        <div class="container" style="text-align: center">
          <h2>Explore it live</h2>
          <p class="lead" style="margin: var(--space-s) auto var(--space-l)">
            The figures above are static exports. The interactive explorer lets you pan, zoom, follow
            relationships, and jump from any box to the source.
          </p>
          <div class="cluster" style="justify-content: center">
            <a class="btn" href="${esc(explore)}">Open the interactive explorer →</a>
          </div>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <nav class="container" aria-label="Elsewhere">
        <ul>
          <li><a href="https://sjarmak.ai">sjarmak.ai</a></li>
          ${showGithub ? `<li><a href="${esc(github)}">Repository</a></li>` : ""}
          <li><a href="${esc(explore)}">Interactive explorer</a></li>
          <li><a href="https://likec4.dev">Built with LikeC4</a></li>
        </ul>
      </nav>
    </footer>
    <script>
      document.querySelector("[data-theme-toggle]").addEventListener("click", function () {
        var root = document.documentElement;
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("c4-theme", next); } catch (e) {}
      });
    </script>
  </body>
</html>
`;

writeFileSync(outPath, html);
const used = views.filter((v) => figureExists(v.id)).length;
console.log(`build-page: ${brand} → ${outPath} (${used}/${views.length} views with figures, ${sections.length} sections)`);
