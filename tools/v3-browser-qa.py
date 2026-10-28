"""v3 browser smoke test using inlined local sources (network navigation may be blocked in sandbox)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
import shutil
ROOT=Path(__file__).resolve().parent.parent
STORE_JS='''<script>window.__glDemoStore=window.__glDemoStore||{};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(window.__glDemoStore,k)?window.__glDemoStore[k]:null,setItem:(k,v)=>window.__glDemoStore[k]=String(v),removeItem:k=>delete window.__glDemoStore[k]}});try{history.replaceState=()=>{}}catch(e){}</script>'''
def markup(name):
 s=(ROOT/name).read_text()
 s=re.sub(r'<script src="https://cdn.jsdelivr.net[^\"]+"></script>','',s)
 s=s.replace('<script src="assets/runtime-config.js"></script>','<script>window.GL_CONFIG={allowDemoAdmin:true,supabaseUrl:"",supabasePublishableKey:""}</script>')
 def script(match):return '<script>'+ (ROOT/match.group(1)).read_text().replace('</script>','<\\/script>')+'</script>'
 s=re.sub(r'<script src="(assets/[^\"]+\.js|data/content.js)"></script>',script,s)
 s=s.replace('<link rel="stylesheet" href="assets/styles.css">','<style>'+ (ROOT/'assets/styles.css').read_text()+'</style>')
 return s.replace('<body>','<body>'+STORE_JS,1)
errors=[];bad=[];count=0
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844});page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_default_timeout(5000)
 for width in [320,390,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':850})
  for name in ['index.html','levels.html','level.html','books.html','media.html','special.html','course.html','resources.html','admin.html','reset-password.html']:
   page.set_content(markup(name),wait_until='domcontentloaded');page.wait_for_timeout(75)
   if page.evaluate('document.documentElement.scrollWidth>window.innerWidth+1'):bad.append((width,name,page.evaluate('[document.documentElement.scrollWidth,innerWidth]')))
   count+=1
 page.set_viewport_size({'width':390,'height':844})
 page.set_content(markup('books.html'));page.wait_for_timeout(120)
 assert page.locator('#booksShelves .gl-book-card').count()==4
 assert page.locator('#featuredBooks .gl-book-card').count()==2
 assert page.locator('.mobile-bottom-nav a').all_text_contents()==['خانه','سطوح','کتابخانه','رسانه','مقالات']
 page.set_content(markup('levels.html'));page.wait_for_timeout(110)
 assert page.locator('#levelsPageGrid .level-card').count()==6
 page.set_content(markup('reset-password.html'));page.wait_for_timeout(75)
 assert page.locator('#resetRequestForm').is_visible()
 page.set_content(markup('level.html'));page.wait_for_timeout(120)
 assert page.locator('#recommendedSlot .resource-card').count()>0
 page.set_content(markup('admin.html'));page.wait_for_timeout(200)
 assert page.locator('#adminApp').is_visible()
 page.locator('.admin-mobile-nav [data-tab="courses"]').click();page.locator('#addCourse').click()
 assert page.locator('#courseForm').is_visible()
 form=page.locator('#courseForm')
 form.locator('[name=title]').fill('B1 test book')
 form.locator('[name=bookType]').select_option('Hören')
 form.locator('[name=level]').select_option('B1')
 form.locator('[name=coverUrl]').fill('https://example.org/cover.jpg')
 form.locator('[name=url]').fill('https://example.org/book.pdf')
 form.locator('[name=featured]').select_option('true')
 form.locator('[name=status]').select_option('published')
 form.locator('button[type=submit]').click()
 assert page.locator('#courseForm').count()==0
 book=page.evaluate("GL.getContent().courses.find(c=>c.title==='B1 test book')")
 assert book and book['level']=='B1' and book['bookType']=='Hören' and book['featured'],book
 assert page.evaluate("GL.getLevelCourses(GL.getContent(),'B1').some(b=>b.title==='B1 test book')")
 page.set_content(markup('books.html'));page.wait_for_timeout(140)
 assert page.get_by_text('B1 test book').count()>0
 shots=ROOT/'docs/screenshots';shots.mkdir(exist_ok=True,parents=True)
 page.evaluate('GL.resetContent()');page.set_content(markup('books.html'));page.wait_for_timeout(120)
 page.screenshot(path=str(shots/'v3-books-mobile.png'),full_page=True)
 browser.close()
print('v3 browser smoke:',count,'responsive page checks; admin book CRUD, features and catalog integration passed')
print('horizontal overflow:',bad,'page errors:',errors[:10])
assert not bad and not errors
