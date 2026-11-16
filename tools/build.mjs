// Builds the two single-file, offline-playable versions of the game:
//   dist/overtime.html     mobile (portrait, touch)
//   dist/overtime-pc.html  PC (landscape, mouse + keyboard)
// Usage: node tools/build.mjs   (needs network once to fetch esbuild via npx)
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = join(tmpdir(), `overtime-bundle-${process.pid}.js`);
execSync(`npx -y esbuild@0.24.0 src/main.js --bundle --format=iife --minify --outfile=${tmp}`, { stdio: 'inherit' });
const js = readFileSync(tmp, 'utf8').replaceAll('</script', '<\\/script');
rmSync(tmp);
const css = readFileSync('style.css', 'utf8');
const base = readFileSync('index.html', 'utf8')
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>${css}</style>`)
  .replace('<link rel="manifest" href="manifest.webmanifest">\n', '');

const page = (pc) => base
  .replace('<title>Overtime</title>', pc ? '<title>Overtime (PC)</title>' : '<title>Overtime</title>')
  .replace('<script type="module" src="src/main.js"></script>', () => `${pc ? '<script>window.OVERTIME_PC = true;</script>\n' : ''}<script>${js}</script>`);

mkdirSync('dist', { recursive: true });
writeFileSync('dist/overtime.html', page(false));
writeFileSync('dist/overtime-pc.html', page(true));
console.log('built dist/overtime.html and dist/overtime-pc.html');
