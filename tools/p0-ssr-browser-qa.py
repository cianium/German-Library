"""Chromium layout smoke test for SSR articles with mocked REST output; no live Supabase."""
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
output=subprocess.check_output(['node','tools/p0-ssr-fixtures.mjs'],cwd=ROOT,text=True)
fixtures=json.loads(output)
css=(ROOT/'assets/styles.css').read_text()
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':844})
    page.on('pageerror',lambda err:errors.append(str(err)))
    for name,html in fixtures.items():
        html=html.replace('<link rel="stylesheet" href="/assets/styles.css">',f'<style>{css}</style>')
        html=html.replace('<script src="/assets/theme-init.js"></script>','')
        page.set_content(html,wait_until='domcontentloaded')
        assert page.locator('h1').count()==1,f'{name}: one h1'
        for nav_class in ('desktop-nav','mobile-bottom-nav'):
            assert page.locator(f'nav.{nav_class} > a').count()==4,f'{name}: {nav_class} must have four links'
        assert page.locator('nav.mobile-menu-panel a[href="/articles"]').count()==1,f'{name}: articles discoverable in menu'
        assert page.locator('nav.mobile-bottom-nav a.active').count()==1,f'{name}: active tab unique'
        for width in (320,390,768,1024):
            page.set_viewport_size({'width':width,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),f'{name}: overflow at {width}'
            nav=page.locator('nav.mobile-bottom-nav')
            if nav.is_visible():
                height=nav.bounding_box()['height']
                assert height<100,f'{name}: bottom nav wrapped at {width} with height {height}'
        page.set_viewport_size({'width':390,'height':844})
        page.locator('details.mobile-menu summary').click()
        assert page.locator('nav.mobile-menu-panel').is_visible(),f'{name}: mobile menu opens'
        page.locator('details.mobile-menu summary').click()
    browser.close()
assert not errors,errors
print('P0 SSR Chromium QA PASS: article index/detail, primary nav 4, secondary link, 320/390/768/1024, no overflow/menu interaction')
