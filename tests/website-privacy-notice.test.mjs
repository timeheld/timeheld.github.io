import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// /privacy/website/ is live: the Timeheld Website Privacy Notice v1.0 (effective October 31, 2026),
// approved by JK for publication with the wording exactly as written. Only the markdown structure was converted.
const html = readFileSync(new URL('../dist/privacy/website/index.html', import.meta.url), 'utf8');
const article = html.match(/<article>([\s\S]*)<\/article>/)?.[1] ?? '';
const noticeText = article
  .replace(/<\/?(strong|a)\b[^>]*>/g, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

test('website notice is a live, indexable page with its own canonical URL', () => {
  for (const bad of ['noindex', 'http-equiv="refresh"', 'location.replace', '<script', '<iframe', '<form', 'http://']) {
    assert.ok(!html.includes(bad), bad);
  }
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /<title>Timeheld Website Privacy Notice<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/timeheld\.app\/privacy\/website\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/timeheld\.app\/privacy\/website\/">/);
});

test('website notice uses the /privacy/ look and makes no external requests', () => {
  assert.match(html, /background: #000;/);
  assert.match(html, /font-family: "Inter", -apple-system/);
  assert.match(html, /url\("\/assets\/fonts\/inter-latin-basic\.woff2"\)/);
  assert.match(html, /max-width: 720px/);
  assert.match(html, /<main id="main" class="policy">\s*<a class="policy-logo" href="\/"><img src="\/assets\/wordmark-light\.svg"[^>]* alt="Timeheld"><\/a>/);
  assert.deepEqual([...html.matchAll(/(?:src|href)="(https?:[^"]*)"/g)].map((m) => m[1]), ['https://timeheld.app/privacy/website/']);
  assert.ok(!/url\(\s*["']?https?:/i.test(html), 'no external CSS resources');
});

test('website notice carries v1.0, all seven sections, and no draft label', () => {
  assert.ok(!/draft/i.test(html), 'no Draft label');
  assert.match(html, /<h1>Timeheld Website Privacy Notice<\/h1>/);
  assert.match(noticeText, /^Timeheld Website Privacy Notice Version 1\.0 Effective date October 31, 2026 Covers Visits to the timeheld\.app website and emails sent to support@timeheld\.app 1\. Who we are /);
  const sections = [...article.matchAll(/<h2 id="section-(\d+)">([^<]+)<\/h2>/g)].map((m) => m[2]);
  assert.deepEqual(sections, ['1. Who we are', '2. What happens when you visit', '3. When you email us', '4. Our legal basis (EU)',
    '5. Who we share it with and where it goes', '6. Your rights', '7. Changes and contact']);
  assert.match(noticeText, / Questions: support@timeheld\.app\.$/);
});

test('website notice wording is pinned exactly as approved', () => {
  // sha256 of the whitespace-normalized article text. Any wording change must be re-approved.
  assert.equal(createHash('sha256').update(noticeText).digest('hex'), 'eb0be9c961d76af85d4ba4beddc937dbbd47dce5e46e21ac9fae8613e80b3f68');
});
