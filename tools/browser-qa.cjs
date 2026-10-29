// Optional browser QA: install Playwright separately; production has no npm dependencies.
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const csp=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).headers[0].headers.find(h=>h.key==='Content-Security-Policy').value.replace('; upgrade-insecure-requests','');
 const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));try{res.setHeader('Content-Security-Policy',csp);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end('Not found')}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const context=await browser.newContext();
  // The local UI suite isolates rendering from the CDN and a real Supabase project.
  await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:'/* Local UI suite: SDK unavailable */',contentType:'application/javascript'}));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/Content Security Policy|Refused to/i.test(m.text()))errors.push(m.text())});
  const base=`http://127.0.0.1:${server.address().port}`;
  const pages=['index.html',...['A1','A2','B1','B2','C1','C2'].map(l=>`level.html?level=${l}`),'resources.html','special.html','course.html?id=startenwir-a2','resource.html?id=sw-a2-audio','admin.html','login.html','404.html'];
  let screens=0;
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   for(const route of pages){await page.goto(base+'/'+route);await page.waitForFunction(()=>!!window.GL||location.pathname.endsWith('404.html'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow: ${route} at ${width}`);screens++}
  }
  await page.goto(base+'/index.html');assert.equal(await page.locator('footer .footer-links a').count(),6,'Footer has two columns of three links');assert.equal(await page.locator('footer .footer-social-link').count(),2,'Footer exposes Instagram and Telegram controls');assert.equal(await page.locator('footer a[href="https://instagram.com/lexipfad"]').count(),1,'Official Instagram link is active');assert.equal(await page.locator('footer a[href="https://t.me/lexipfad"]').count(),1,'Official Telegram link is active');
  await page.goto(base+'/level.html?level=B2');assert.equal(await page.locator('#core').isVisible(),false);assert.equal(await page.locator('#otherCourses').isVisible(),false);assert(!await page.locator('#roadmapSteps').textContent().then(t=>t.includes('Kursbuch')));
  await page.goto(base+'/resources.html?level=A2&skill=Hören');
  const expectedFiltered=await page.evaluate(()=>GL.getLibraryResources(GL.getContent()).filter(r=>r.level==='A2'&&r.skill==='Hören').length);
  assert(expectedFiltered>0,'A2 listening library fixture exists');
  assert.equal(await page.locator('.resource-card').count(),expectedFiltered);
  await page.locator('#q').fill('nothingmatchesxyz');assert.equal(await page.locator('.resource-card').count(),0);
  await page.locator('#clearFilters').click();
  const expectedLibrary=await page.evaluate(()=>GL.getLibraryResources(GL.getContent()).length);
  assert.equal(await page.locator('.resource-card').count(),expectedLibrary);assert.equal(new URL(page.url()).search,'');
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/admin.html');await page.locator('[data-tab="resources"]:visible').click();await page.locator('#addResource').click();
  assert.equal(await page.locator('#resourceForm input:not([type=hidden]),#resourceForm select,#resourceForm textarea').evaluateAll(inputs=>inputs.every(i=>i.labels.length>0)),true,'unlabelled admin field');
  await page.locator('#editorClose').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'cancelEdit');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'editorClose');
  await page.locator('[name=id]').fill('test-resource');await page.locator('[name=title]').fill('منبع آزمایشی');await page.locator('[name=url]').fill('https://example.com');await page.locator('[name=status]').selectOption('published');await page.locator('button[type=submit]').click();assert.equal(await page.locator('#editorBackdrop').isVisible(),false);assert.equal(await page.evaluate(()=>GL.getContent().resources.find(r=>r.id==='test-resource').status),'published');
  // Imported IDs are immutable, even if they are not slug-shaped.
  await page.evaluate(()=>{const c=GL.getContent(),standalone=c.resources.find(r=>r.collection==='level'&&!r.courseId);c.resources.push({...standalone,id:'Legacy_ID.1',title:'Legacy'});GL.saveContent(c)});await page.reload();await page.locator('[data-tab="resources"]:visible').click();await page.locator('[data-action="edit-resource"][data-id="Legacy_ID.1"]').click();await page.locator('[name=title]').fill('Legacy edited');await page.locator('button[type=submit]').click();assert.equal(await page.evaluate(()=>GL.getContent().resources.find(r=>r.id==='Legacy_ID.1').title),'Legacy edited');
  await page.locator('[data-tab="courses"]:visible').click();await page.locator('#addCourse').click();await page.locator('[name=id]').fill('moving-core');await page.locator('[name=title]').fill('Test core');await page.locator('[name=level]').selectOption('B1');await page.locator('[name=status]').selectOption('published');await page.locator('[name=core]').selectOption('true');await page.locator('button[type=submit]').click();await page.locator('[data-action="edit-course"][data-id="moving-core"]').click();await page.locator('[name=level]').selectOption('B2');await page.locator('button[type=submit]').click();assert.equal(await page.evaluate(()=>GL.getContent().levels.B1.coreCourseId),null);assert.equal(await page.evaluate(()=>GL.getContent().levels.B2.coreCourseId),'moving-core');
  await page.evaluate(()=>GL.resetContent());await page.goto(base+'/level.html?level=A2');
  if(process.env.QA_SCREENSHOT_DIR){fs.mkdirSync(process.env.QA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR,'a2-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/index.html');await page.screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR,'home-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.goto(base+'/admin.html');await page.locator('[data-tab="resources"]').click();await page.locator('#addResource').click();await page.screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR,'admin-mobile.png'),fullPage:false})}
  assert.deepEqual(errors,[]);console.log(`Browser QA: ${screens} page/viewport checks; search/reset, labels, focus trap, CRUD, legacy IDs, core move, CSP passed. Supabase is mocked/omitted; no live backend claim.`);
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
