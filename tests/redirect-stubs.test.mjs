import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');
const sha = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
// /privacy/ is live (Timeheld Beta Privacy Policy v1.6); tests/privacy-policy.test.mjs covers it.
// /privacy/website/ is live (Timeheld Website Privacy Notice v1.0); tests/website-privacy-notice.test.mjs covers it.
const STUBS = ['downloads/index.html', 'guide/index.html', 'releases/index.html', '404.html'];
// sha256 of each page on main 0e955a6 (tag full-site-before-placeholder), before it became a stub.
const ORIGINALS = {
  'index.html': 'e7ebff1fb21e2781b5bb3307fbe3ce7c84095fce777e0d76f5ced9bf11c337f0',
  'downloads/index.html': '323b8119b868bd732cb23286ccc83e196d69d6f7c07bd9fecc504c62f4e3b7ff',
  'guide/index.html': '3c9b59da8ecbb5c8b3a3bae6d72cab2aaec7e5b1194bb362e35f37e0ec242209',
  'releases/index.html': '822d30594740f72d44a709e45a18072311ed51aaa17535ac31ac6effb8f9083a',
  '404.html': '88a037c23ea2a0af3ea5c49e7c7053c235f9902207e956471d4b56f80e55b67e',
  'privacy/index.html': '0d7beec1e43bfb4247c0f4770baa59e978cf1395bf47e512202fc37a26957604',
};
const htmlFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return htmlFiles(path);
  return name.endsWith('.html') ? [path] : [];
});

for (const page of STUBS) {
  test(`dist/${page} is a noindex redirect stub to /`, () => {
    const html = read(`dist/${page}`);
    assert.match(html, /<meta name="robots" content="noindex">/);
    assert.match(html, /<meta http-equiv="refresh" content="0; url=\/">/);
    assert.match(html, /<script>location\.replace\('\/'\);<\/script>/);
    assert.match(html, /<link rel="canonical" href="https:\/\/timeheld\.app\/">/);
    assert.match(html, /<a href="\/">Continue to Timeheld<\/a>/);
    // No external resources and no links anywhere except / and the canonical URL.
    assert.deepEqual([...html.matchAll(/(?:src|href)="([^"]*)"/g)].map((m) => m[1]).sort(), ['/', 'https://timeheld.app/']);
    for (const tag of ['<img', '<iframe', '<form', '<nav', '<footer', 'stylesheet', 'mailto:']) assert.ok(!html.includes(tag), tag);
  });
}

test('only /, /privacy/ and /privacy/website/ are real public pages; everything else is a redirect stub', () => {
  const pages = htmlFiles(join(root, 'dist')).map((file) => relative(join(root, 'dist'), file)).sort();
  assert.deepEqual(pages, ['index.html', 'privacy/index.html', 'privacy/website/index.html', ...STUBS].sort());
});

test('every hidden page and the homepage are preserved byte-for-byte for restore', () => {
  for (const [page, hash] of Object.entries(ORIGINALS)) {
    assert.ok(existsSync(join(root, 'preserved/full-site', page)), page);
    assert.equal(sha(`preserved/full-site/${page}`), hash, page);
  }
});

test('preserved privacy original keeps its title and contact section', () => {
  const html = read('preserved/full-site/privacy/index.html');
  assert.match(html, /<title>Timeheld privacy<\/title>/);
  assert.match(html, /<h2 id="contact">Contact<\/h2>/);
});
