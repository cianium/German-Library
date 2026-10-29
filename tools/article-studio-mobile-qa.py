"""Offline mocked UI browser checks. Does not validate Supabase RLS or live uploads."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
import shutil

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/'screenshots'
OUT.mkdir(parents=True,exist_ok=True)

def html(name):
    doc=(ROOT/name).read_text()
    doc=re.sub(r'<script src="[^"]+"></script>','',doc)
    doc=doc.replace('<link rel="stylesheet" href="assets/styles.css">','<style>'+ (ROOT/'assets/styles.css').read_text()+'</style>')
    return doc

errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':844});page.set_default_timeout(3500)
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content(html('article-studio.html'),wait_until='domcontentloaded')
    page.add_script_tag(content="const NativeURL=window.URL;window.URL=class extends NativeURL{constructor(input,base){super(input,base==='null'?'https://local.example/':base)}}")
    page.add_script_tag(content='''
window.GL={boot:fn=>Promise.resolve().then(fn)};
window.GLBackend={refreshAuth:async()=>({user:{id:'writer-1',email:'writer@demo.example',user_metadata:{full_name:'آزمایشگر'}},role:'author'}),requireStaff:async()=>({allowed:true}),getClient:()=>({from:(table)=>({select(){return this},eq(){return this},order(){return this},limit(){return this},then(resolve){let data=table==='courses'?[{id:'b1-demo',title:'Netzwerk B1',level_code:'B1',status:'published'}]:table==='resources'?[{id:'grammar-demo',title:'Grammatik B1',level_code:'B1',status:'published'}]:table==='published_articles'?[{slug:'b1-guide',title:'Wortstellung B1'}]:[];return Promise.resolve({data,error:null}).then(resolve)}})})};
''')
    page.add_script_tag(content=(ROOT/'assets/article-studio.js').read_text())
    page.locator('#newArticle').click()
    assert page.locator('body').evaluate("el=>el.classList.contains('studio-editor-open')")
    assert page.locator('#studioMobileNav').is_hidden()
    page.locator('#articleTitle').fill('Deutsche Grammatik B1 für Lernende')
    body=page.locator('#articleBody')
    body.fill('Ein Einführungstext zur deutschen Grammatik.')
    page.locator('#addArticleTable').click()
    assert page.locator('#editorTableDialog').is_visible()
    page.locator('#tableColumns').select_option('3')
    page.locator('#tableRows').select_option('2')
    page.locator('#editorTableForm button[type=submit]').click()
    assert body.locator('table').count()==1
    assert body.locator('th').count()==3
    assert body.locator('td').count()==6
    page.locator('#addArticleImage').click()
    page.locator('#mediaUrl').fill('https://example.org/grammatik.webp')
    page.locator('#mediaText').fill('Deutsch Grammatik B1 Tabelle')
    page.locator('#imageCaption').fill('Abbildung 1 – Grammatik B1')
    page.locator('#mediaApply').click()
    assert body.locator('figure img').count()==1
    assert body.locator('figure figcaption').inner_text()=='Abbildung 1 – Grammatik B1'
    body.locator('img').click()
    assert page.locator('#editArticleImage').is_visible()
    page.locator('#editArticleImage').click()
    page.locator('#mediaText').fill('Infografik zur deutschen Grammatik B1')
    page.locator('#imageCaption').fill('Überarbeitet')
    page.locator('#mediaApply').click()
    assert body.locator('img').get_attribute('alt')=='Infografik zur deutschen Grammatik B1'
    assert body.locator('figcaption').inner_text()=='Überarbeitet'
    page.locator('#addArticleLink').click()
    page.locator('#linkInternal').click()
    page.locator('#internalSearch').fill('Netzwerk')
    assert page.locator('.link-search-option').count()==1
    page.locator('.link-search-option').click()
    assert 'course.html?id=b1-demo' in page.locator('#mediaUrl').input_value()
    page.locator('#mediaApply').click()
    assert body.locator('a[href*=course]').count()==1
    body.locator('a[href*=course]').click()
    page.locator('#addArticleLink').click()
    assert page.locator('#mediaRemoveLink').is_visible()
    page.locator('#mediaRemoveLink').click()
    assert body.locator('a[href*=course]').count()==0
    page.locator('#studioTabSeo').click()
    page.locator('#focusQuery').fill('Grammatik B1')
    page.wait_for_timeout(300)
    assert 'کلمه' in page.locator('#writingInsights').inner_text()
    assert page.locator('#seoChecks').locator('section').count()>=2
    for width in (320,390,768,1024):
        page.set_viewport_size({'width':width,'height':844})
        page.wait_for_timeout(50)
        
        if page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'):
            print('OVERFLOW',width, page.evaluate('document.documentElement.scrollWidth'), page.evaluate('''[...document.querySelectorAll('body *')].filter(x=>x.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(x=>[x.tagName,x.className,x.getBoundingClientRect().right])'''),flush=True)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),f'horizontal overflow in editor at {width}'
    page.set_viewport_size({'width':390,'height':844})
    page.locator('#studioTabWrite').click()
    assert page.locator('.studio-top-actions').is_visible()
    page.screenshot(path=str(OUT/'GL-vnext-article-studio.png'),full_page=True)
    browser.close()
assert not errors,errors
print('Article Studio mobile QA PASS: 3-column table, image caption + edit, internal link + unlink, SEO, 320/390/768/1024 viewport, no JavaScript errors')
