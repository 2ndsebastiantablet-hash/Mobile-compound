// Builds a standalone, offline, single-file copy of every version into dist/:
//   dist/mobile/overtime-mobile.html
//   dist/pc/overtime-pc.html
// A version is any folder in versions/ that has an index.html.
// Usage: node tools/build.mjs            (needs internet once to fetch esbuild via npx)
//        node tools/build.mjs pc         (build only one version)
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
const only = process.argv[2];
const versions = readdirSync('versions').filter((v) => existsSync(join('versions', v, 'index.html')) && (!only || v === only));

for (const v of versions) {
  const dir = join('versions', v);
  let html = readFileSync(join(dir, 'index.html'), 'utf8');
  // inline every local stylesheet
  html = html.replace(/<link rel="stylesheet" href="(?!https?:)([^"]+)">/g, (_, href) => `<style>${readFileSync(join(dir, href), 'utf8')}</style>`);
  html = html.replace(/<link rel="manifest"[^>]*>\n?/, '');
  // bundle the module entry point into one inline script
  html = html.replace(/<script type="module" src="([^"]+)"><\/script>/, (_, src) => {
    const tmp = join(tmpdir(), `overtime-${v}-${process.pid}.js`);
    execSync(`npx -y esbuild@0.24.0 "${join(dir, src)}" --bundle --format=iife --minify --log-level=warning --outfile="${tmp}"`, { stdio: 'inherit' });
    const js = readFileSync(tmp, 'utf8').replaceAll('</script', '<\\/script');
    rmSync(tmp);
    return `<script>${js}</script>`;
  });
  mkdirSync(join('dist', v), { recursive: true });
  const out = join('dist', v, `overtime-${v}.html`);
  writeFileSync(out, html);
  console.log(`built ${out} (${Math.round(html.length / 1024)} KB)`);
}
