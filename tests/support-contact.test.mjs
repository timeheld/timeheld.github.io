import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const SUPPORT = 'support@timeheld.app';
const files = (dir = dist) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});
const htmlFiles = files().filter((file) => file.endsWith('.html'));
const textFiles = files().filter((file) => ['.html', '.js', '.mjs', '.css', '.txt', '.webmanifest', '.svg', '.json', '.xml'].includes(extname(file)));

test('every page footer links to the support mailto', () => {
  assert.ok(htmlFiles.length >= 6);
  // The coming-soon placeholder at / has no footer; tests/placeholder.test.mjs covers its mailto.
  for (const file of htmlFiles.filter((path) => path !== join(dist, 'index.html'))) {
    const footer = readFileSync(file, 'utf8').match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0];
    assert.ok(footer, `${file} has a footer`);
    assert.match(footer, new RegExp(`<a href="mailto:${SUPPORT}">${SUPPORT}</a>`), file);
  }
});

test('privacy page has a contact line with the support mailto', () => {
  const html = readFileSync(join(dist, 'privacy/index.html'), 'utf8');
  assert.match(html, new RegExp(`<h2 id="contact">Contact</h2><p>Questions or support: <a href="mailto:${SUPPORT}">${SUPPORT}</a></p>`));
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
