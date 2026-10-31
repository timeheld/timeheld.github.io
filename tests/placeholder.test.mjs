import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const home = read('dist/index.html');
const body = home.match(/<body>([\s\S]*)<\/body>/)[1];
const INSTAGRAM_URL = 'https://www.instagram.com/timeheld.app/';
const INSTAGRAM_LINK = `<a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer">`;

test('placeholder shows only the logo, then "Coming soon", the support mailto and the Instagram follow line', () => {
  const main = body.match(/^\s*<main[^>]*>([\s\S]*)<\/main>\s*<footer class="site-legal"><a href="\/privacy\/website\/">Website privacy<\/a><\/footer>\s*$/);
  assert.ok(main, 'body contains only <main> and the Website privacy footer');
  const elements = [...main[1].matchAll(/<(img|h1|p|a)\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(elements.length, 6);
  assert.match(elements[0], /^<img class="placeholder-logo" src="\/assets\/wordmark-light\.svg"[^>]* alt="Timeheld">$/);
  assert.equal(elements[1], '<h1>');
  assert.equal(elements[2], '<p class="placeholder-contact">');
  assert.equal(elements[3], '<a href="mailto:support@timeheld.app">');
  assert.equal(elements[4], '<p class="placeholder-social">');
  assert.equal(elements[5], INSTAGRAM_LINK);
  const text = main[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.equal(text, 'Coming soon support@timeheld.app Follow @timeheld.app on Instagram for announcements');
});

test('placeholder has no nav, scripts, other links or external requests; its only footer is the Website privacy link', () => {
  assert.equal((home.match(/<footer\b/g) ?? []).length, 1);
  for (const tag of ['<nav', '<header', '<script', '<iframe', '<form', 'http://']) {
    assert.ok(!home.includes(tag), tag);
  }
  assert.deepEqual([...home.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map((m) => m[1]), ['mailto:support@timeheld.app', INSTAGRAM_URL, '/privacy/website/']);
  assert.deepEqual(home.match(/https?:\/\/[^"\s<>]*/g), [INSTAGRAM_URL], 'the Instagram profile is the only external URL');
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

test('full homepage is preserved byte-for-byte for restore', () => {
  const sha = createHash('sha256').update(readFileSync(new URL('preserved/full-site/index.html', root))).digest('hex');
  assert.equal(sha, 'e7ebff1fb21e2781b5bb3307fbe3ce7c84095fce777e0d76f5ced9bf11c337f0');
});

test('shared full-site assets remain in dist for restore', () => {
  for (const path of ['dist/site.js', 'dist/styles.css', 'dist/demo-clock.mjs', 'dist/assets/wordmark-dark.svg', 'dist/assets/analytics-preview.png', 'dist/assets/mark.svg']) {
    assert.ok(existsSync(new URL(path, root)), path);
  }
});

test('Instagram follow line opens the profile in a new tab with noopener noreferrer and loads nothing external', () => {
  const links = [...home.matchAll(/<a\s([^>]*)>([\s\S]*?)<\/a>/g)].filter((m) => m[1].includes('instagram.com'));
  assert.equal(links.length, 1);
  const attrs = Object.fromEntries([...links[0][1].matchAll(/([a-z-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(attrs, { href: INSTAGRAM_URL, target: '_blank', rel: 'noopener noreferrer' });
  assert.equal(links[0][2].replace(/<[^>]+>/g, '').trim(), 'Follow @timeheld.app on Instagram for announcements');
  // Glyph is inline SVG only: decorative, no external image, script, font or tracker.
  assert.match(links[0][2], /^<svg viewBox="0 0 24 24"[^>]* aria-hidden="true" focusable="false">/);
  assert.ok(!/<(script|img|image|use|iframe|object|embed|link)\b/i.test(links[0][2]));
  assert.ok(!/<script\b/i.test(home), 'no script on the placeholder');
  assert.ok(!/<link\s[^>]*rel="stylesheet"/i.test(home), 'no external stylesheet');
  for (const m of home.matchAll(/(?:src|href)="([^"]*)"/g)) {
    assert.ok(m[1].startsWith('/') || m[1].startsWith('mailto:') || m[1] === INSTAGRAM_URL, m[1]);
  }
  assert.ok(!/url\(\s*["']?https?:/i.test(home), 'no external CSS resources');
});
