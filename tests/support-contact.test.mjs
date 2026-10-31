import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const preserved = new URL('../preserved/full-site/', import.meta.url).pathname;
const STUBS = ['downloads/index.html', 'guide/index.html', 'releases/index.html', '404.html'].map((p) => join(dist, p));
const LIVE_PRIVACY = join(dist, 'privacy/index.html');
const WEBSITE_NOTICE = join(dist, 'privacy/website/index.html');
const SUPPORT = 'support@timeheld.app';
const files = (dir = dist) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});
const htmlFiles = files().filter((file) => file.endsWith('.html'));
const textFiles = [...files(), ...files(preserved)].filter((file) => ['.html', '.js', '.mjs', '.css', '.txt', '.webmanifest', '.svg', '.json', '.xml'].includes(extname(file)));

test('every page footer links to the support mailto', () => {
  assert.ok(htmlFiles.length >= 6);
  // The placeholder at /, the redirect stubs, the live privacy policy and the website privacy notice
  // have no site-footer (tests/placeholder.test.mjs, tests/redirect-stubs.test.mjs,
  // tests/privacy-policy.test.mjs and tests/website-privacy-notice.test.mjs cover them); the
  // preserved full-site pages keep theirs.
  const pages = [...htmlFiles.filter((path) => path !== join(dist, 'index.html') && path !== LIVE_PRIVACY && path !== WEBSITE_NOTICE && !STUBS.includes(path)),
    ...files(preserved).filter((file) => file.endsWith('.html') && file !== join(preserved, 'index.html'))];
  assert.equal(pages.length, 5);
  for (const file of pages) {
    const footer = readFileSync(file, 'utf8').match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0];
    assert.ok(footer, `${file} has a footer`);
    assert.match(footer, new RegExp(`<a href="mailto:${SUPPORT}">${SUPPORT}</a>`), file);
  }
});

test('preserved privacy page keeps its contact line with the support mailto', () => {
  const html = readFileSync(join(preserved, 'privacy/index.html'), 'utf8');
  assert.match(html, new RegExp(`<h2 id="contact">Contact</h2><p>Questions or support: <a href="mailto:${SUPPORT}">${SUPPORT}</a></p>`));
});

test('live privacy policy links the support mailto', () => {
  assert.match(readFileSync(LIVE_PRIVACY, 'utf8'), new RegExp(`<a href="mailto:${SUPPORT}">${SUPPORT}</a>`));
});

test('website privacy notice links the support mailto', () => {
  assert.match(readFileSync(WEBSITE_NOTICE, 'utf8'), new RegExp(`<a href="mailto:${SUPPORT}">${SUPPORT}</a>`));
});

test('no email address other than the approved support contact appears', () => {
  const pattern = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
  for (const file of textFiles) {
    for (const email of readFileSync(file, 'utf8').match(pattern) ?? []) {
      assert.equal(email.toLowerCase(), SUPPORT, `${file} contains ${email}`);
    }
    for (const href of readFileSync(file, 'utf8').match(/mailto:[^"'\s>]*/gi) ?? []) {
      assert.equal(href, `mailto:${SUPPORT}`, `${file} has ${href}`);
    }
  }
});
