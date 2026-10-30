// Cloudflare's build entry point. Only dist/ is ever published.
// No account credentials belong here; Cloudflare supplies build authentication.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

for (const [command, args] of [
  [process.execPath, ['--check', 'dist/site.js']],
  [process.execPath, ['--test', ...readdirSync('tests').filter(name => name.endsWith('.test.mjs')).sort().map(name => `tests/${name}`)]],
  ['python3', ['check-site.py']],
]) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const hashes = { script: new Set(), style: new Set() };
let files = 0;
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing a symlink in public assets: ${file}`);
    if (/^(?:\.git|\.env(?:\..*)?|\.dev\.vars(?:\..*)?|node_modules|wrangler\..*|package(?:-lock)?\.json)$/.test(entry.name) || /\.(?:p8|p12|pem|key|mobileprovision|provisionprofile|sqlite|db|ipa|pkg|dmg|zip)$/i.test(entry.name)) {
      throw new Error(`Refusing a development, credential, or app file in public assets: ${file}`);
    }
    if (entry.isDirectory()) { inspect(file); continue; }
    if (!entry.isFile()) throw new Error(`Unsupported public asset: ${file}`);
    files++;
    if (/\.(?:html|css|js|mjs|json|txt|svg|xml|webmanifest)$/.test(entry.name) || entry.name.startsWith('_')) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of [/-----BEGIN (?:EC |RSA )?PRIVATE KEY-----/, /\bsb_secret_[A-Za-z0-9_-]+/, /(?:SUPABASE_SERVICE_ROLE_KEY|APNS_PRODUCTION_PRIVATE_KEY|APPLE_PRIVATE_KEY)\s*[:=]\s*["'][^"']+["']/]) {
        if (pattern.test(text)) throw new Error(`Possible private credential in public assets: ${file}`);
      }
      for (const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
        try {
          if (JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).role === 'service_role') {
            throw new Error(`Server-only token in public assets: ${file}`);
          }
        } catch (error) {
          if (error.message.startsWith('Server-only token')) throw error;
        }
      }
      if (entry.name.endsWith('.html')) {
        for (const type of ['script', 'style']) {
          for (const match of text.matchAll(new RegExp(`<${type}\\b([^>]*)>([\\s\\S]*?)<\\/${type}>`, 'gi'))) {
            if (type === 'script' && /\bsrc\s*=/.test(match[1])) continue;
            hashes[type].add(`'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`);
          }
        }
      }
    }
  }
}
inspect('dist');

// Recompute hashes on every GitHub build so legitimate CSS or redirect edits
// do not leave the deployed Content Security Policy out of date.
const csp = [
  "default-src 'self'", `script-src 'self' ${[...hashes.script].sort().join(' ')}`.trim(),
  `style-src 'self' ${[...hashes.style].sort().join(' ')}`.trim(), "img-src 'self' data:",
  "font-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'none'",
  "frame-ancestors 'none'", "form-action 'none'", 'upgrade-insecure-requests',
].join('; ');
const headers = `/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: ${csp}\n`;
if (headers.split('\n').some(line => line.length >= 2000)) throw new Error('A Cloudflare header exceeds its line limit.');
writeFileSync('dist/_headers', headers);
writeFileSync('wrangler.generated.json', JSON.stringify({
  name: 'timeheld-website', compatibility_date: '2026-10-30', workers_dev: true, preview_urls: false,
  assets: { directory: './dist', html_handling: 'auto-trailing-slash', not_found_handling: '404-page' },
}, null, 2) + '\n');
console.log(`Cloudflare build ready: ${files} public assets checked; static website only.`);
