from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re
root=Path(__file__).parent/'dist'
errors=[]
preserved=Path(__file__).parent/'preserved'/'full-site'
preserved_home=preserved/'index.html'
# Pages hidden behind redirect stubs while the coming-soon placeholder is live.
STUBS=['downloads/index.html','guide/index.html','releases/index.html','404.html']
# /privacy/ is live: the approved Timeheld Beta Privacy Policy v1.4 (indexable, no redirect).
LIVE_PRIVACY='privacy/index.html'
# Every page whose pre-placeholder original is preserved in preserved/full-site/.
PRESERVED_PAGES=STUBS+[LIVE_PRIVACY]
class Page(HTMLParser):
 def __init__(self): super().__init__(); self.links=[]; self.ids=[]; self.main=0; self.title=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag=='main':self.main+=1
  if tag=='title':self.title+=1
  for k in ['href','src']:
   if k in a:self.links.append(a[k])
  if tag=='img' and 'alt' not in a:errors.append('Image missing alt')
def restored(target):
 # In the restored site, a preserved page replaces its dist/ stub or placeholder.
 try:rel=target.relative_to(root)
 except ValueError:return target
 alt=preserved/rel
 return alt if alt.exists() and (rel.as_posix()=='index.html' or rel.as_posix() in PRESERVED_PAGES) else target
for file in list(root.rglob('*.html'))+list(preserved.rglob('*.html')):
 in_preserved=preserved in file.parents
 text=file.read_text(); parsed=Page();parsed.feed(text)
 if parsed.main!=1 or parsed.title!=1:errors.append(f'{file}: missing/duplicate landmarks or title')
 if len(parsed.ids)!=len(set(parsed.ids)):errors.append(f'{file}: duplicate IDs')
 for link in parsed.links:
  u=urlsplit(link)
  if u.scheme or u.netloc:continue
  target=root/unquote(u.path.lstrip('/')) if u.path.startswith('/') else file.parent/unquote(u.path)
  if in_preserved and not u.path.startswith('/'):target=root/file.relative_to(preserved).parent/unquote(u.path)
  if not u.path:target=file
  if target.is_dir():target=target/'index.html'
  if not target.exists():errors.append(f'{file}: broken local link {link}')
  elif u.fragment and target.suffix=='.html':
   # While the coming-soon placeholder is served at /, parked pages keep their
   # links into the full homepage; validate those anchors against the preserved copy.
   if (target==root/'index.html' or in_preserved) and target.exists():target=restored(target)
   p=Page();p.feed(target.read_text())
   if u.fragment not in p.ids:errors.append(f'{file}: missing anchor {link}')
 if re.search(r'href=[\"\'][^\"\']*\.(zip|dmg|pkg)([\"\'?#])',text):errors.append(f'{file}: forbidden app-download link')
# Coming-soon placeholder at /: logo, "Coming soon" and the support mailto only.
home=(root/'index.html').read_text()
if not preserved_home.exists():errors.append('Preserved full homepage missing: preserved/full-site/index.html')
preserved_privacy=preserved/'privacy'/'index.html'
if not preserved_privacy.exists() or '<h2 id="contact">Contact</h2>' not in preserved_privacy.read_text():errors.append('Preserved privacy page missing or lost its contact section')
# Hidden pages: redirect stubs to / with noindex; originals preserved for restore.
for rel in STUBS:
 stub=(root/rel).read_text() if (root/rel).exists() else ''
 for need in ['<meta name="robots" content="noindex">','<meta http-equiv="refresh" content="0; url=/">',"location.replace('/')",'<link rel="canonical" href="https://timeheld.app/">','<a href="/">']:
  if need not in stub:errors.append(f'dist/{rel}: redirect stub missing {need}')
 if re.search(r'(?:src|href)="(?!/"|https://timeheld\.app/")[^"]*"',stub):errors.append(f'dist/{rel}: redirect stub must not load resources or link elsewhere')
 if not (preserved/rel).exists():errors.append(f'Preserved original missing: preserved/full-site/{rel}')
# Live privacy policy: indexable, canonical, no redirect, no scripts or external requests.
priv=(root/LIVE_PRIVACY).read_text() if (root/LIVE_PRIVACY).exists() else ''
for need in ['<title>Timeheld Beta Privacy Policy — Timeheld</title>','<link rel="canonical" href="https://timeheld.app/privacy/">','<meta name="description" content="','<h1>Timeheld Beta Privacy Policy</h1>','<dd>1.4</dd>','src="/assets/wordmark-light.svg"']:
 if need not in priv:errors.append(f'dist/{LIVE_PRIVACY}: live policy page missing {need}')
for bad in ['noindex','http-equiv="refresh"','location.replace','<script','<iframe','<form','http://','Draft','DRAFT']:
 if bad in priv:errors.append(f'dist/{LIVE_PRIVACY}: live policy page must not contain {bad}')
if re.findall(r'(?:src|href)="(https?://[^"]*)"',priv)!=['https://timeheld.app/privacy/']:errors.append(f'dist/{LIVE_PRIVACY}: only the canonical URL may be absolute')
if not (preserved/LIVE_PRIVACY).exists():errors.append(f'Preserved original missing: preserved/full-site/{LIVE_PRIVACY}')
for rel in [p.relative_to(root).as_posix() for p in root.rglob('*.html')]:
 if rel not in STUBS+['index.html',LIVE_PRIVACY]:errors.append(f'dist/{rel}: unexpected public page; add it to STUBS or allow it explicitly')
# The one approved external link: the Instagram follow line (new tab, no opener/referrer).
INSTAGRAM='<a href="https://www.instagram.com/timeheld.app/" target="_blank" rel="noopener noreferrer">'
if re.findall(r'<a\s[^>]*href="([^"]*)"',home)!=['mailto:support@timeheld.app','https://www.instagram.com/timeheld.app/']:errors.append('Placeholder must link only to mailto:support@timeheld.app and the Instagram profile')
if home.count(INSTAGRAM)!=1:errors.append('Placeholder Instagram link must be exactly '+INSTAGRAM)
if re.findall(r'https?://[^"\s<>]*',home)!=['https://www.instagram.com/timeheld.app/']:errors.append('Placeholder may reference only the Instagram profile URL externally')
for tag in ['<nav','<footer','<header','<script','<iframe','<form','http://','<link rel="stylesheet"']:
 if tag in home:errors.append(f'Placeholder must not contain {tag}')
ALLOWED_EMAILS={'support@timeheld.app'}
for file in list(root.rglob('*'))+list(preserved.rglob('*')):
 if file.is_file() and file.suffix.lower() in ['.html','.js','.mjs','.css','.txt','.webmanifest','.svg','.json','.xml']:
  for email in set(re.findall(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}',file.read_text(errors='ignore'))):
   if email.lower() not in ALLOWED_EMAILS:errors.append(f'{file}: unapproved email address {email}')
for file in root.rglob('*'):
 if file.is_file() and file.suffix.lower() in ['.zip','.dmg','.pkg','.mobileprovision','.provisionprofile','.p8','.p12','.pem']:
  errors.append(f'Forbidden distributable or sensitive file: {file}')
assert not errors, '\n'.join(errors)
print(f'Passed: {len(list(root.rglob("*.html")))} public pages (placeholder, live privacy policy v1.4, {len(STUBS)} redirect stubs) + {len(list(preserved.rglob("*.html")))} preserved pages, all local links/anchors, landmarks, alt text; no app binary downloads, sensitive files or unapproved email addresses.')
