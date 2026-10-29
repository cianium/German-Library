#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import re, sys, json, subprocess, tempfile

ROOT=Path(__file__).resolve().parents[1]
errors=[]; warnings=[]
vercel=json.loads((ROOT/'vercel.json').read_text(encoding='utf-8'))
rewritten={x.get('source') for x in vercel.get('rewrites',[])}

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.links=[]; self.has_viewport=False; self.lang=''; self.dir=''; self.manifest=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html': self.lang=a.get('lang',''); self.dir=a.get('dir','')
        if tag=='meta' and a.get('name')=='viewport': self.has_viewport=True
        if tag=='link' and a.get('rel')=='manifest': self.manifest=True
        if 'id' in a: self.ids.append(a['id'])
        for attr in ('href','src'):
            if attr in a: self.links.append((tag,attr,a[attr],a))

for f in sorted(ROOT.glob('*.html')):
    text=f.read_text(encoding='utf-8')
    p=Parser(); p.feed(text)
    if not p.has_viewport: errors.append(f'{f.name}: missing viewport meta')
    if p.lang!='fa' or p.dir!='rtl': errors.append(f'{f.name}: expected html lang=fa dir=rtl')
    if not p.manifest: errors.append(f'{f.name}: missing web manifest')
    dup={x for x in p.ids if p.ids.count(x)>1}
    if dup: errors.append(f'{f.name}: duplicate IDs: {sorted(dup)}')
    for tag,attr,val,a in p.links:
        if not val or val.startswith(('#','mailto:','tel:','data:','javascript:')): continue
        u=urlparse(val)
        if u.scheme in ('http','https'):
            if a.get('target')=='_blank':
                rel=set((a.get('rel') or '').split())
                if 'noopener' not in rel: errors.append(f'{f.name}: target=_blank missing noopener: {val}')
            continue
        target=(f.parent / u.path).resolve()
        try: target.relative_to(ROOT.resolve())
        except ValueError:
            errors.append(f'{f.name}: local path escapes project: {val}'); continue
        if u.path and not target.exists() and ('/'+u.path.lstrip('/')) not in rewritten: errors.append(f'{f.name}: missing local target: {val}')
    if '@supabase/supabase-js@2"></script>' in text or '@supabase/supabase-js@2\'' in text:
        errors.append(f'{f.name}: Supabase SDK is not pinned to an exact version')
    if re.search(r'<script(?:\s[^>]*)?>\s*[^<\s]',text,re.I): errors.append(f'{f.name}: inline script violates CSP')
    # Parse-check inline JavaScript blocks. Skip external script tags.
    inline_scripts=re.findall(r'<script(?![^>]*\bsrc=)(?:[^>]*)>([\s\S]*?)</script>',text,re.I)
    for i,script in enumerate(inline_scripts,1):
        if not script.strip(): continue
        with tempfile.NamedTemporaryFile('w',suffix='.js',encoding='utf-8',delete=False) as tmp:
            tmp.write(script); tmp_path=tmp.name
        try:
            q=subprocess.run(['node','--check',tmp_path],capture_output=True,text=True)
            if q.returncode:
                detail=q.stderr.strip().splitlines()[-1] if q.stderr.strip() else 'unknown'
                errors.append(f'{f.name}: inline script {i} syntax error: {detail}')
        finally:
            Path(tmp_path).unlink(missing_ok=True)
    if 'assets/backend.js' in text and 'assets/vendor/supabase-js-2.117.2.js' not in text:
        errors.append(f'{f.name}: expected self-hosted exact Supabase SDK 2.117.2')
    if 'cdn.jsdelivr.net' in text:
        errors.append(f'{f.name}: production HTML must not execute CDN JavaScript')

for js in sorted(list((ROOT/'assets').glob('*.js'))+list((ROOT/'scripts').glob('*.mjs'))+list((ROOT/'tools').glob('*.mjs'))):
    q=subprocess.run(['node','--check',str(js)],capture_output=True,text=True)
    if q.returncode: errors.append(f'{js.relative_to(ROOT)}: JavaScript syntax error')

css=(ROOT/'assets/styles.css').read_text(encoding='utf-8')
if css.count('{')!=css.count('}'): errors.append('assets/styles.css: unbalanced braces')
if ':focus-visible' not in css: errors.append('assets/styles.css: visible keyboard focus rule missing')
if 'prefers-reduced-motion' not in css: warnings.append('assets/styles.css: reduced-motion rule missing')

cfg=(ROOT/'assets/runtime-config.js').read_text(encoding='utf-8')
if re.search(r'(service[_-]?role|sb_secret_)[A-Za-z0-9._-]{8,}',cfg,re.I): errors.append('assets/runtime-config.js: secret/service-role key appears to be present')
if 'supabasePublishableKey' not in cfg: errors.append('assets/runtime-config.js: modern publishable-key field missing')

manifest=json.loads((ROOT/'site.webmanifest').read_text(encoding='utf-8'))
if manifest.get('display')!='standalone': warnings.append('site.webmanifest: display is not standalone')

for required in ['README.md','.env.example','backend/supabase-schema.sql','backend/seed.sql','backend/migrations/20261027_s1_author_resource_ownership.sql','backend/validation/s1_author_ownership_check.sql','backend/migrations/20261028_v33_production_hardening.sql','backend/validation/v33_production_hardening_check.sql','backend/migrations/20261029_v34_public_article_snapshots.sql','backend/validation/v34_public_article_snapshots_check.sql','backend/migrations/20261029_v34_admin_rpc_invoker.sql','backend/migrations/20261029_v34_admin_role_guard.sql','backend/validation/v34_admin_rpc_invoker_check.sql','docs/SUPABASE_SETUP.md','vercel.json','_headers','assets/vendor/supabase-js-2.117.2.js','package-lock.json']:
    if not (ROOT/required).exists(): errors.append(f'missing release file: {required}')

print(f'Static QA: {len(errors)} error(s), {len(warnings)} warning(s)')
for x in errors: print('ERROR:',x)
for x in warnings: print('WARN :',x)
sys.exit(1 if errors else 0)
