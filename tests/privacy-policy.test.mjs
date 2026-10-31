import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// /privacy/ is live: the Timeheld Beta Privacy Policy v1.6 (effective October 31, 2026), approved by
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

test('privacy page carries the v1.6 policy, all ten sections, and no draft label', () => {
  assert.ok(!/draft/i.test(html), 'no Draft label');
  assert.match(html, /<h1>Timeheld Beta Privacy Policy<\/h1>/);
  assert.match(policyText, /^Timeheld Beta Privacy Policy Version 1\.6 Effective date October 31, 2026 Covers The Timeheld private beta distributed through Apple TestFlight only 1\. Who we are /);
  const sections = [...article.matchAll(/<h2 id="section-(\d+)">([^<]+)<\/h2>/g)].map((m) => m[2]);
  assert.deepEqual(sections, ['1. Who we are', '2. What this policy covers', '3. What Apple collects through TestFlight',
    '4. What the beta app uses, and where it goes', '5. Why we use it and our legal basis', '6. Who we share it with',
    '7. International transfers', '8. How long we keep it', '9. Your rights', '10. Security, changes and contact']);
  assert.match(policyText, / Questions: support@timeheld\.app\. Changes from version 1\.5: we added what is stored for background updates \(section 4\) and updated how to delete your account during the beta \(sections 4 and 8\)\.$/);
  assert.match(policyText, / Background updates: in newer versions of the beta, the account service stores a push token for your device /);
  assert.match(policyText, / Account service data: while your account exists\. During the beta, ask for deletion by email at support@timeheld\.app, /);
  for (const word of ['Live Activit', 'relay', 'broadcast', 'channel']) {
    assert.ok(!html.toLowerCase().includes(word.toLowerCase()), `no ${word} wording anywhere on the page`);
  }
  assert.match(policyText, / and Cloudflare \(email forwarding for support@timeheld\.app and hosting of the timeheld\.app website\), plus authorities /);
  assert.match(policyText, /our providers \(Apple, Supabase, Google and Cloudflare\) may process/);
  assert.ok(!policyText.includes('any earlier project'), 'v1.2 Other records wording removed');
  assert.ok(!policyText.includes('section 5.2 of the agreement'), 'v1.2 retention wording removed');
  assert.ok(!policyText.includes('Live Activit'), 'v1.3 Notifications and Live Activities bullet removed');
  assert.ok(!html.includes('Live Activit'), 'no Live Activit text anywhere on the page');
  assert.ok(!policyText.includes('Notifications and Live Activities'), 'v1.3 section 4 bullet removed');
  assert.ok(!policyText.includes('Changes from version 1.2'), 'v1.3 closing note replaced');
  assert.ok(!policyText.includes('Changes from version 1.3'), 'v1.4 closing note replaced');
  assert.ok(!policyText.includes('Changes from version 1.4'), 'v1.5 closing note replaced');
  assert.ok(!policyText.includes('meanwhile your account is paused'), 'v1.5 deletion pause wording replaced');
  assert.ok(!policyText.includes('Namecheap (email forwarding'), 'v1.4 Namecheap provider entry replaced');
  assert.ok(!policyText.includes('Google and Namecheap'), 'v1.4 Namecheap transfer mention replaced');
  assert.ok(!policyText.includes('Namecheap'), 'Namecheap no longer named');
});

test('privacy policy wording is pinned exactly as approved', () => {
  // sha256 of the whitespace-normalized article text. Any wording change must be re-approved.
  assert.equal(createHash('sha256').update(policyText).digest('hex'), '3b7d658dae5cdc49d9abbcb65e852150aea2006c4ea4431f64be00ca34e80208');
});

test('privacy page footer links to the website privacy notice', () => {
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  assert.match(body, /<\/main>\s*<footer class="site-legal"><a href="\/privacy\/website\/">Website privacy<\/a><\/footer>\s*$/);
  assert.equal((html.match(/<footer\b/g) ?? []).length, 1);
  assert.match(html, /\.site-legal a:focus-visible \{ outline: 2px solid #1ed760;/);
});
