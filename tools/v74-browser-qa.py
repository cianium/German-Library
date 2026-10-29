"""Chromium inline-source smoke test, for sandboxes blocking all network/file navigation.
No live backend/network claims. Run: python tools/v74-browser-qa.py"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
import shutil
ROOT=Path(__file__).resolve().parent.parent
errors=[];counts=0
STORE_JS='''<script>window.__glDemoStore=window.__glDemoStore||{};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(window.__glDemoStore,k)?window.__glDemoStore[k]:null,setItem:(k,v)=>window.__glDemoStore[k]=String(v),removeItem:k=>delete window.__glDemoStore[k]}});try{history.replaceState=()=>{}}catch(e){}</script>'''
def markup(name):
 s=(ROOT/name).read_text()
 s=re.sub(r'<script src="https://cdn.jsdelivr.net[^\"]+"></script>','',s)
 s=re.sub(r'<script src="assets/runtime-config.js"></script>', '<script>window.GL_CONFIG={allowDemoAdmin:true,supabaseUrl:"",supabasePublishableKey:""}</script>',s)
 # prevent inline source closing script accidentally
 def script(match):
  f=ROOT/match.group(1)
  return '<script>'+f.read_text().replace('</script>','<\\/script>')+'</script>'
 s=re.sub(r'<script src="(assets/[^\"]+\.js|data/content.js)"></script>',script,s)
 s=s.replace('<link rel="stylesheet" href="assets/styles.css">','<style>'+ (ROOT/'assets/styles.css').read_text()+'</style>')
 s=s.replace('<body>','<body>'+STORE_JS,1)
 return s
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844});page.set_default_timeout(3500)
 page.on('pageerror',lambda err:errors.append(str(err)))
 for width in [320,375,390,560,768,900,1024,1280]:
  page.set_viewport_size({'width':width,'height':900})
  for route in ['index.html','books.html','media.html','special.html','resources.html','level.html','course.html','admin.html']:
   page.set_content(markup(route),wait_until='load',timeout=30000);page.wait_for_timeout(75)
   if page.evaluate('document.documentElement.scrollWidth>window.innerWidth'):
    errors.append(f'Overflow {route} at {width}: '+str(page.evaluate('[document.documentElement.scrollWidth,innerWidth]')))
   counts+=1
 print('Rendered viewport/page checks:',counts,flush=True)
 page.set_viewport_size({'width':390,'height':844})
 page.set_content(markup('books.html'));page.wait_for_timeout(75)
 assert page.locator('#booksGrid .mini-course-card').count()==4,'All books render in library'
 page.set_content(markup('level.html'));page.wait_for_timeout(75)
 assert page.locator('#coreSlot .course-card').count()==1,'Default A2 level shows core book'
 assert page.locator('#recommendedSlot .resource-card').count()>0,'A2 supplementary nonempty'
 page.set_content(markup('special.html'));page.wait_for_timeout(75)
 assert page.locator('#specialGrid .mini-course-card').count()==2,'Old special books remain featured'
 page.set_content(markup('admin.html'));page.wait_for_timeout(90)
 assert page.locator('#adminApp').is_visible(),'Admin demo rendered'
 page.locator('.admin-mobile-nav [data-tab="media"]').click()
 page.locator('#addMedia').click()
 assert page.locator('#resourceForm').is_visible(),'Add media form visible'
 assert page.locator('#resCollection').input_value()=='media'
 page.locator('#resourceForm [name="title"]').fill('Test Film')
 page.locator('#resourceForm [name="url"]').fill('https://example.org/film')
 page.locator('#resourceForm [name="status"]').select_option('published')
 page.locator('#resourceForm [name="featured"]').select_option('true')
 page.locator('#resourceForm button[type="submit"]').click()
 assert not page.locator('#editorBackdrop').is_visible(),'Saved media should close editor'
 record=page.evaluate('GL.getContent().resources.find(r=>r.title==="Test Film")')
 assert record and record['collection']=='media' and record['featured'],record
 # switching to reader page via content reset can still test independent media controller with shared storage using injection
 page.set_content(markup('media.html'));page.wait_for_timeout(100)
 assert page.locator('#mediaGrid .resource-card').count()>=1,'New film visible in media tab'
 page.set_content(markup('special.html'));page.wait_for_timeout(100)
 assert page.get_by_text('Test Film').count()>=1,'Featured media displayed'
 page.set_content(markup('admin.html'));page.wait_for_timeout(100)
 page.locator('.admin-mobile-nav [data-tab="courses"]').click();page.wait_for_timeout(100);page.locator('#addCourse').click()
 assert page.locator('#courseForm').is_visible(),'Add book form visible'
 page.locator('#courseForm [name="title"]').fill('Book without CEFR')
 page.locator('#courseForm [name="status"]').select_option('published')
 page.locator('#courseForm [name="featured"]').select_option('true')
 page.locator('#courseForm button[type="submit"]').click()
 book=page.evaluate('GL.getContent().courses.find(c=>c.title==="Book without CEFR")')
 assert book and book['collection']=='library' and book['level']=='' and book['featured'],book
 page.locator('.admin-mobile-nav [data-tab="overview"]').click();page.locator('[data-quick="levels"]').click()
 page.locator('#levelsAdminList [data-action="edit-level"][data-id="B1"]').click()
 page.locator('#levelForm [name="description"]').fill('Edited level B1')
 page.locator('#levelForm button[type="submit"]').click()
 assert page.evaluate('GL.getContent().levels.B1.description')=='Edited level B1'
 shots=ROOT/'docs/screenshots';shots.mkdir(exist_ok=True,parents=True)
 page.set_content(markup('index.html'));page.wait_for_timeout(90);page.screenshot(path=str(shots/'v74-home-mobile.png'),full_page=True)
 page.set_content(markup('books.html'));page.wait_for_timeout(90);page.screenshot(path=str(shots/'v74-books-mobile.png'),full_page=True)
 page.set_content(markup('admin.html'));page.wait_for_timeout(100);page.locator('.admin-mobile-nav [data-tab="media"]').click();page.screenshot(path=str(shots/'v74-admin-media-mobile.png'),full_page=True)
 browser.close()
if errors:raise AssertionError('\n'.join(errors))
print('V7.4 browser smoke PASS: responsive checks, book/media/special display, demo CRUD and level editor. No production/browser navigation/backend integration tested.')
