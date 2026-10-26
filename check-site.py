from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re
root=Path(__file__).parent/'dist'
errors=[]
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
for file in root.rglob('*.html'):
 text=file.read_text(); parsed=Page();parsed.feed(text)
 if parsed.main!=1 or parsed.title!=1:errors.append(f'{file}: missing/duplicate landmarks or title')
 if len(parsed.ids)!=len(set(parsed.ids)):errors.append(f'{file}: duplicate IDs')
 for link in parsed.links:
  u=urlsplit(link)
  if u.scheme or u.netloc:continue
  target=root/unquote(u.path.lstrip('/')) if u.path.startswith('/') else file.parent/unquote(u.path)
  if not u.path:target=file
  if target.is_dir():target=target/'index.html'
  if not target.exists():errors.append(f'{file}: broken local link {link}')
  elif u.fragment and target.suffix=='.html':
   p=Page();p.feed(target.read_text())
   if u.fragment not in p.ids:errors.append(f'{file}: missing anchor {link}')
 if re.search(r'href=[\"\'][^\"\']*\.(zip|dmg|pkg)([\"\'?#])',text):errors.append(f'{file}: forbidden app-download link')
ALLOWED_EMAILS={'support@timeheld.app'}
for file in root.rglob('*'):
 if file.is_file() and file.suffix.lower() in ['.html','.js','.mjs','.css','.txt','.webmanifest','.svg','.json','.xml']:
  for email in set(re.findall(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}',file.read_text(errors='ignore'))):
   if email.lower() not in ALLOWED_EMAILS:errors.append(f'{file}: unapproved email address {email}')
for file in root.rglob('*'):
 if file.is_file() and file.suffix.lower() in ['.zip','.dmg','.pkg','.mobileprovision','.provisionprofile','.p8','.p12','.pem']:
  errors.append(f'Forbidden distributable or sensitive file: {file}')
assert not errors, '\n'.join(errors)
print(f'Passed: {len(list(root.rglob("*.html")))} pages, all local links/anchors, landmarks, alt text; no app binary downloads, sensitive files or unapproved email addresses.')
