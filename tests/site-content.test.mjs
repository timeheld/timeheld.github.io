import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const read = (path) => readFileSync(join(dist, path), 'utf8');
const htmlFiles = (dir = dist) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return htmlFiles(path);
  return name.endsWith('.html') ? [path] : [];
});
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('public pages contain no unpacked, temporary or developer-mode install steps', () => {
  const forbidden = [/chrome:\/\/extensions/i, /edge:\/\/extensions/i, /about:debugging/i, /load unpacked/i, /load temporary add-on/i, /developer mode/i, /build\/(chrome|edge|firefox)/i, /invited (mac )?testers/i, /testing preview/i, /preview setup/i];
  for (const file of htmlFiles()) {
    const html = readFileSync(file, 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(html, pattern, `${file} matches ${pattern}`);
  }
});

test('downloads page lists Chrome, Edge and Firefox as under development and Safari as bundled', () => {
  const page = text(read('downloads/index.html'));
  for (const browser of ['Google Chrome', 'Microsoft Edge', 'Mozilla Firefox']) {
    assert.match(page, new RegExp(`${browser} Under development`), browser);
  }
  assert.match(page, /Safari Supported · bundled with the app/);
  assert.match(read('downloads/index.html'), /<button class="button button-unavailable" type="button" disabled>/);
});

test('homepage browser cards show Under development for Chrome, Edge and Firefox', () => {
  const html = read('index.html');
  for (const browser of ['Chrome', 'Edge', 'Firefox']) {
    assert.match(html, new RegExp(`<h3>${browser}</h3><span class="availability development">Under development</span>`), browser);
  }
  assert.match(html, /<h3>Safari<\/h3><span class="availability ready">Included with the Mac app<\/span>/);
});

test('guide keeps browser anchors and marks each browser under development', () => {
  const html = read('guide/index.html');
  for (const id of ['browser-previews', 'chrome', 'edge', 'firefox', 'safari']) assert.match(html, new RegExp(`id="${id}"`), id);
  for (const id of ['chrome', 'edge', 'firefox']) {
    assert.match(html, new RegExp(`<article id="${id}" class="browser-preview-guide"><span class="availability development">UNDER DEVELOPMENT</span>`), id);
  }
});

test('no browser store listing URLs are published', () => {
  const stores = [/chromewebstore\.google\.com/i, /chrome\.google\.com\/webstore/i, /microsoftedge\.microsoft\.com\/addons/i, /addons\.mozilla\.org/i];
  for (const file of htmlFiles()) {
    const html = readFileSync(file, 'utf8');
    for (const pattern of stores) assert.doesNotMatch(html, pattern, `${file} matches ${pattern}`);
  }
});
