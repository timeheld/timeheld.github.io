import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const home = read('dist/index.html');
const body = home.match(/<body>([\s\S]*)<\/body>/)[1];

test('placeholder shows only the logo, then "Coming soon", then the support mailto', () => {
  const main = body.match(/^\s*<main[^>]*>([\s\S]*)<\/main>\s*$/);
  assert.ok(main, 'body contains only <main>');
  const elements = [...main[1].matchAll(/<(img|h1|p|a)\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(elements.length, 4);
  assert.match(elements[0], /^<img class="placeholder-logo" src="\/assets\/wordmark-light\.svg"[^>]* alt="Timeheld">$/);
  assert.equal(elements[1], '<h1>');
  assert.equal(elements[2], '<p class="placeholder-contact">');
  assert.equal(elements[3], '<a href="mailto:support@timeheld.app">');
  const text = main[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.equal(text, 'Coming soon support@timeheld.app');
});

test('placeholder has no nav, footer, scripts, other links or external requests', () => {
  for (const tag of ['<nav', '<header', '<footer', '<script', '<iframe', '<form', 'http://', 'https://']) {
    assert.ok(!home.includes(tag), tag);
  }
  assert.deepEqual([...home.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map((m) => m[1]), ['mailto:support@timeheld.app']);
  assert.match(home, /<title>Timeheld — Coming soon<\/title>/);
  assert.match(home, /<meta name="description" content="[^"]+">/);
  assert.match(home, /<link rel="icon" type="image\/png" href="\/assets\/favicon\.png">/);
  assert.match(home, /background: #000;/);
});

test('placeholder assets exist and the logo is the final light lockup for dark backgrounds', () => {
  for (const path of ['dist/assets/wordmark-light.svg', 'dist/assets/favicon.png', 'dist/assets/fonts/inter-latin-basic.woff2', 'dist/assets/fonts/Inter-LICENSE.txt']) {
    assert.ok(existsSync(new URL(path, root)), path);
  }
  assert.match(read('dist/assets/wordmark-light.svg'), /fill="#F3F4F6"[\s\S]*fill="#1ED760"/);
});

test('privacy page stays live with its contact section', () => {
  const privacy = read('dist/privacy/index.html');
  assert.match(privacy, /<title>Timeheld privacy<\/title>/);
  assert.match(privacy, /<h2 id="contact">Contact<\/h2>/);
});

test('full homepage is preserved byte-for-byte for restore', () => {
  const sha = createHash('sha256').update(readFileSync(new URL('preserved/full-site/index.html', root))).digest('hex');
  assert.equal(sha, 'e7ebff1fb21e2781b5bb3307fbe3ce7c84095fce777e0d76f5ced9bf11c337f0');
});

test('parked full-site pages remain in dist', () => {
  for (const path of ['dist/downloads/index.html', 'dist/guide/index.html', 'dist/releases/index.html', 'dist/404.html', 'dist/site.js', 'dist/styles.css', 'dist/demo-clock.mjs']) {
    assert.ok(existsSync(new URL(path, root)), path);
  }
});
