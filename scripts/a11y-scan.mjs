/*
 * a11y-scan.mjs — automated contrast + overflow gate for Chaos Command.
 *
 * Walks the matrix: THEMES × ROUTES × VIEWPORTS, and for each cell runs:
 *   1. axe-core color-contrast  (catches "light-on-light / dark-on-dark / faint text")
 *   2. a horizontal-overflow check (catches "this is off the screen now", esp. at big text)
 *
 * This is the regression gate so we stop discovering "the one screen I missed in the one
 * theme I didn't check, two builds later." The machine grinds the grid; humans fuzz the chaos.
 *
 * USAGE (serves the static build in ./out, so build first):
 *   pnpm build            # produces ./out
 *   node scripts/a11y-scan.mjs                 # all themes × key routes × desktop+mobile
 *   node scripts/a11y-scan.mjs --all-routes    # every route (slow, the full sweep)
 *   node scripts/a11y-scan.mjs --themes=theme-accessibility,theme-colorblind   # just these
 *   node scripts/a11y-scan.mjs --scale=2.0     # simulate the text-size slider at 200%
 *
 * Built by Ace, 2026-05-24 (CHA — the contrast/overflow gate). Co-built with Ren.
 */
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const PORT = 4178;
const BASE = `http://127.0.0.1:${PORT}`;

// ---- config ---------------------------------------------------------------
const ALL_THEMES = [
  'theme-calm', 'theme-phosphor', 'theme-amber', 'theme-segfault', 'theme-lavender',
  'theme-chaos', 'theme-caelan', 'theme-light', 'theme-colorblind', 'theme-glitter',
  'theme-accessibility', 'theme-ace', 'theme-grok', 'theme-luka-penguin', 'theme-taupe',
];
// Curated high-value routes (the ones with real density + the known-risky ones).
const KEY_ROUTES = [
  '/', '/crisis-support', '/pain', '/seizure', '/reproductive-health', '/medications',
  '/lab-results', '/work-disability', '/timeline', '/routines', '/settings', '/customize',
  '/energy', '/dysautonomia', '/journal',
];

const args = process.argv.slice(2);
const argVal = (k) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : null; };
const themes = argVal('themes') ? argVal('themes').split(',') : ALL_THEMES;
const scale = argVal('scale') ? parseFloat(argVal('scale')) : 1.0;
let routes = KEY_ROUTES;
if (args.includes('--all-routes')) {
  routes = ['/', ...fs.readdirSync(path.join(ROOT, 'app'), { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(ROOT, 'app', d.name, 'page.tsx')))
    .map(d => '/' + d.name)];
}
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

// ---- tiny static server for the export (clean-URL → /route/index.html) ----
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
  const send = (res, fp) => {
    fs.readFile(fp, (e, buf) => {
      if (e) { res.writeHead(404); res.end('404'); return; }
      res.writeHead(200, { 'content-type': types[path.extname(fp)] || 'application/octet-stream' });
      res.end(buf);
    });
  };
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let fp = path.join(OUT, p);
    if (p === '/' || p.endsWith('/')) fp = path.join(OUT, p, 'index.html');
    else if (!path.extname(p)) {
      // clean route → /route/index.html (fallback to /route.html)
      if (fs.existsSync(path.join(OUT, p, 'index.html'))) fp = path.join(OUT, p, 'index.html');
      else if (fs.existsSync(path.join(OUT, p + '.html'))) fp = path.join(OUT, p + '.html');
    }
    if (!fs.existsSync(fp)) fp = path.join(OUT, '404.html');
    send(res, fp);
  }).listen(PORT);
}

// ---- overflow check (runs in page) ----------------------------------------
const OVERFLOW_FN = () => {
  const vw = window.innerWidth;
  const docOverflow = document.documentElement.scrollWidth > vw + 2;
  const bad = [];
  if (docOverflow) {
    // find the visible elements that actually extend past the right edge
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed') continue;
      if (r.right > vw + 2 && r.left < vw) {
        const tag = el.tagName.toLowerCase();
        const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
        const txt = (el.textContent || '').trim().slice(0, 30);
        bad.push(`${tag}${cls} (right=${Math.round(r.right)}>${vw}) "${txt}"`);
        if (bad.length >= 6) break;
      }
    }
  }
  return { docOverflow, offenders: [...new Set(bad)] };
};

// ---- main -----------------------------------------------------------------
(async () => {
  if (!fs.existsSync(OUT)) { console.error('❌ No ./out — run `pnpm build` first.'); process.exit(1); }
  const server = serve();
  const browser = await chromium.launch();
  const findings = [];
  let cells = 0;

  try {
    // Seed the demo once in a context, then reuse the storage state (logged in as 1111).
    const seedCtx = await browser.newContext();
    const seedPage = await seedCtx.newPage();
    await seedPage.goto(BASE + '/', { waitUntil: 'networkidle' });
    // Click "See the demo" to seed PIN 1111 + log in.
    const demoBtn = seedPage.locator('button', { hasText: /see the demo/i }).first();
    if (await demoBtn.count()) {
      await demoBtn.click();
      await seedPage.waitForTimeout(2500); // let resetDemo() seed IndexedDB + navigate
    }
    const storage = await seedCtx.storageState();
    await seedCtx.close();

    for (const theme of themes) {
      for (const vp of VIEWPORTS) {
        const ctx = await browser.newContext({
          storageState: storage,
          viewport: { width: vp.width, height: vp.height },
        });
        // set theme + (simulated) text scale before any page script runs
        await ctx.addInitScript(([t, s]) => {
          localStorage.setItem('chaos-theme', t);
          localStorage.setItem('chaos-user-pin', '1111');
          if (s && s !== 1) document.documentElement.style.fontSize = (16 * s) + 'px';
        }, [theme, scale]);
        const page = await ctx.newPage();

        for (const route of routes) {
          cells++;
          try {
            await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
            await page.waitForTimeout(700); // theme CSS + render settle
            // contrast
            const axe = await new AxeBuilder({ page }).options({ runOnly: ['color-contrast'] }).analyze();
            const contrast = [];
            for (const v of axe.violations) for (const n of v.nodes) {
              contrast.push((n.target?.[0] || '?') + ' — ' + (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 120));
            }
            // overflow
            const ov = await page.evaluate(OVERFLOW_FN);
            if (contrast.length || ov.docOverflow) {
              findings.push({ theme, viewport: vp.name, route, contrast, overflow: ov });
              process.stdout.write('✗');
            } else process.stdout.write('.');
          } catch (e) {
            findings.push({ theme, viewport: vp.name, route, error: String(e).split('\n')[0] });
            process.stdout.write('E');
          }
        }
        await ctx.close();
      }
      process.stdout.write(` ${theme}\n`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  // ---- report ----
  const lines = [`# a11y scan — contrast + overflow`, ``,
    `scale=${scale} · themes=${themes.length} · routes=${routes.length} · cells=${cells} · findings=${findings.length}`, ``];
  const byTheme = {};
  for (const f of findings) (byTheme[f.theme] ??= []).push(f);
  for (const [theme, fs_] of Object.entries(byTheme)) {
    lines.push(`## ${theme}`);
    for (const f of fs_) {
      lines.push(`- **${f.route}** [${f.viewport}]`);
      if (f.error) lines.push(`  - ⚠️ ERROR: ${f.error}`);
      if (f.overflow?.docOverflow) lines.push(`  - ↔️ OVERFLOW: ${f.overflow.offenders.join(' · ') || '(page wider than viewport)'}`);
      for (const c of (f.contrast || [])) lines.push(`  - 🎨 ${c}`);
    }
    lines.push('');
  }
  const report = lines.join('\n');
  fs.writeFileSync(path.join(ROOT, 'a11y-report.md'), report);
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`Scanned ${cells} cells · ${findings.length} with findings.`);
  console.log(`Report → a11y-report.md`);
  // brief console summary
  for (const [theme, fs_] of Object.entries(byTheme)) {
    const cN = fs_.reduce((a, f) => a + (f.contrast?.length || 0), 0);
    const oN = fs_.filter(f => f.overflow?.docOverflow).length;
    const eN = fs_.filter(f => f.error).length;
    console.log(`  ${theme.padEnd(22)} contrast:${cN}  overflow:${oN}  errors:${eN}`);
  }
  process.exit(0);
})();
