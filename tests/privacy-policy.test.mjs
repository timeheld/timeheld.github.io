import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// /privacy/ is live: the Timeheld Beta Privacy Policy v1.2 (effective October 28, 2026), approved by
// JK for publication with the wording exactly as written. Only the markdown structure was converted.
const html = readFileSync(new URL('../dist/privacy/index.html', import.meta.url), 'utf8');
const article = html.match(/<article>([\s\S]*)<\/article>/)?.[1] ?? '';
const policyText = article
  .replace(/<\/?(strong|a)\b[^>]*>/g, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

test('privacy page is a live, indexable page, not a redirect', () => {
  for (const bad of ['noindex', 'http-equiv="refresh"', 'location.replace', '<script', '<iframe', '<form', 'http://']) {
    assert.ok(!html.includes(bad), bad);
  }
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /<title>Timeheld Beta Privacy Policy — Timeheld<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/timeheld\.app\/privacy\/">/);
});

test('privacy page uses the placeholder look: black, Inter, green accents, logo at top', () => {
  assert.match(html, /background: #000;/);
  assert.match(html, /font-family: "Inter", -apple-system/);
  assert.match(html, /url\("\/assets\/fonts\/inter-latin-basic\.woff2"\)/);
  assert.match(html, /#1ed760/);
  assert.match(html, /max-width: 720px/);
  assert.match(html, /<main id="main" class="policy">\s*<a class="policy-logo" href="\/"><img src="\/assets\/wordmark-light\.svg"[^>]* alt="Timeheld"><\/a>/);
  // No external requests: the only absolute URL is the canonical link.
  assert.deepEqual([...html.matchAll(/(?:src|href)="(https?:[^"]*)"/g)].map((m) => m[1]), ['https://timeheld.app/privacy/']);
});

test('privacy page carries the v1.2 policy, all ten sections, and no draft label', () => {
  assert.ok(!/draft/i.test(html), 'no Draft label');
  assert.match(html, /<h1>Timeheld Beta Privacy Policy<\/h1>/);
  assert.match(policyText, /^Timeheld Beta Privacy Policy Version 1\.2 Effective date October 28, 2026 Covers The Timeheld private beta distributed through Apple TestFlight only 1\. Who we are /);
  const sections = [...article.matchAll(/<h2 id="section-(\d+)">([^<]+)<\/h2>/g)].map((m) => m[2]);
  assert.deepEqual(sections, ['1. Who we are', '2. What this policy covers', '3. What Apple collects through TestFlight',
    '4. What the beta app uses, and where it goes', '5. Why we use it and our legal basis', '6. Who we share it with',
    '7. International transfers', '8. How long we keep it', '9. Your rights', '10. Security, changes and contact']);
  assert.match(policyText, / Questions: support@timeheld\.app\.$/);
});

test('privacy policy wording is pinned exactly as approved', () => {
  // sha256 of the whitespace-normalized article text. Any wording change must be re-approved.
  assert.equal(createHash('sha256').update(policyText).digest('hex'), '1470d0600c65fc265a658a10ec22fe8d9a6c33ac8daac523724c33c2781be7ac');
});
