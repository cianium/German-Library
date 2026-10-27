(function(){
  const CONTENT_KEY='gl_content_v7';
  const LEGACY_CONTENT_KEYS=['gl_content_v6','gl_content_v5','gl_content_v4','gl_content_v3','gl_content_v2'];
  const LEVELS=['A1','A2','B1','B2','C1','C2'];
  const SKILLS=['Hören','Lesen','Grammatik','Wortschatz','Sprechen','Schreiben','Aussprache','Prüfung','Extra Practice'];
  const COLLECTIONS=['level','special','library','media'];
  const MEDIA_TYPES=['Film','Series','Podcast','Article'];
  const BOOK_TYPES=['Kursbuch','Arbeitsbuch','Book'];
  const BOOK_CATEGORIES=['Lehrwerk','Arbeitsbuch','Grammatik','Wortschatz','Sprechen','Hören','Lesen','Schreiben','Aussprache','Prüfung','Sonstige'];
  const BOOK_CATEGORY_LABELS={Lehrwerk:'کتاب درسی',Arbeitsbuch:'کتاب کار',Grammatik:'دستور زبان',Wortschatz:'واژگان',Sprechen:'مکالمه',Hören:'شنیداری',Lesen:'خواندن',Schreiben:'نوشتن',Aussprache:'تلفظ',Prüfung:'آمادگی آزمون',Sonstige:'سایر کتاب‌ها'};

  const clone=o=>JSON.parse(JSON.stringify(o));
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const num=(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f};
  const byOrder=(a,b)=>num(a.order)-num(b.order)||String(a.title||'').localeCompare(String(b.title||''),'de');
  const slug=s=>String(s||'item').toLowerCase().trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\u0600-\u06ff-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,72)||('item-'+Date.now());
  const qs=name=>new URLSearchParams(location.search).get(name);
  const safeLevel=v=>LEVELS.includes(v)?v:'A2';
  const published=x=>x&&x.status==='published';

  function normalizeCourse(x,i=0){
    x=Object.assign({},x||{});
    const collection=COLLECTIONS.includes(x.collection)?x.collection:'level';
    const level=collection!=='special'&&LEVELS.includes(x.level)?x.level:'';
    return {
      id:String(x.id||`course-${i+1}`),title:String(x.title||'').trim(),collection,level,
      description:String(x.description||'').trim(),order:num(x.order,i+1),
      bookType:BOOK_CATEGORIES.includes(x.bookType)?x.bookType:(x.collection==='level'?'Lehrwerk':x.collection==='special'?'Grammatik':'Sonstige'),
      skills:(Array.isArray(x.skills)?x.skills:[x.skill||'']).filter(v=>SKILLS.includes(v)),
      coverUrl:String(x.coverUrl||'').trim(),coverStoragePath:String(x.coverStoragePath||'').trim(),
      url:String(x.url||'').trim(),storagePath:String(x.storagePath||'').trim(),provider:String(x.provider||'').trim(),
      status:['draft','published','archived'].includes(x.status)?x.status:'published',
      featured:Boolean(x.featured ?? (collection==='special'))
    };
  }

  function normalizeResource(r,i=0){
    const x=Object.assign({},r||{}),legacyLearningScoped=Boolean(x.lessonId||x.unitId||x.scope==='lesson');
    const collection=COLLECTIONS.includes(x.collection)?x.collection:'level';
    const level=collection!=='special'&&LEVELS.includes(x.level)?x.level:'';
    return {
      id:String(x.id||`resource-${i+1}`),title:String(x.title||'').trim(),description:String(x.description||'').trim(),
      collection,level,courseId:String(x.courseId||''),type:String(x.type||'Website'),skill:String(x.skill||'Extra Practice'),
      priority:['essential','recommended','extra'].includes(x.priority)?x.priority:'recommended',provider:String(x.provider||'').trim(),
      url:String(x.url||x.mediaUrl||'').trim(),storagePath:String(x.storagePath||x.mediaStoragePath||'').trim(),pricing:['free','paid','unknown'].includes(x.pricing)?x.pricing:'unknown',
      featured:Boolean(x.featured),status:legacyLearningScoped?'archived':(['draft','published','archived'].includes(x.status)?x.status:'published'),order:num(x.order,i+1),
      durationMinutes:Math.max(0,num(x.durationMinutes,x.duration||0)),linkStatus:['unknown','ok','broken'].includes(x.linkStatus)?x.linkStatus:'unknown',
      verifiedAt:x.verifiedAt?String(x.verifiedAt):'',createdBy:x.createdBy?String(x.createdBy):''
    };
  }

  function normalizeContent(raw){
    const c=clone(raw||window.GERMAN_LIBRARY_CONTENT||{});
    c.meta=c.meta||{};c.meta.version=7;c.levels=c.levels||{};
    LEVELS.forEach((code,i)=>{c.levels[code]=Object.assign({code,titleFa:'',titleEn:'',description:'',coreCourseId:null,order:i+1},c.levels[code]||{})});
    c.courses=(Array.isArray(c.courses)?c.courses:[]).map(normalizeCourse);
    c.resources=(Array.isArray(c.resources)?c.resources:[]).map(normalizeResource);
    // v6 migration: infer special collection from a special course, otherwise keep level collection.
    const courseMap=new Map(c.courses.map(x=>[x.id,x]));
    c.resources=c.resources.map(r=>{
      const course=courseMap.get(r.courseId);
      if(course)return {...r,collection:course.collection,level:course.level||''};
      return r;
    });
    delete c.units;delete c.lessons;
    return c;
  }

  let cloudContent=null;
  const cloudConfigured=()=>Boolean(window.GL_CONFIG?.supabaseUrl);
  function clearCloudContent(){cloudContent=null}
  function getContent(){
    if(cloudConfigured())return normalizeContent(cloudContent||window.GERMAN_LIBRARY_CONTENT);
    try{
      const saved=localStorage.getItem(CONTENT_KEY);if(saved)return normalizeContent(JSON.parse(saved));
      for(const key of LEGACY_CONTENT_KEYS){const legacy=localStorage.getItem(key);if(legacy){const migrated=normalizeContent(JSON.parse(legacy));localStorage.setItem(CONTENT_KEY,JSON.stringify(migrated));return migrated}}
    }catch(e){console.warn('Lexipfad content cache ignored:',e)}
    return normalizeContent(window.GERMAN_LIBRARY_CONTENT);
  }
  function saveContent(content,options={}){const n=normalizeContent(content);if(cloudConfigured())cloudContent=n;else{try{localStorage.setItem(CONTENT_KEY,JSON.stringify(n))}catch(e){toast('ذخیره محلی ممکن نشد؛ پیش از بستن صفحه JSON را Export کن.')}}if(options.sync!==false)window.GLBackend?.scheduleContentSync?.(n);return n}
  function resetContent(){try{localStorage.removeItem(CONTENT_KEY);LEGACY_CONTENT_KEYS.forEach(k=>localStorage.removeItem(k))}catch(e){}}

  function getCourse(c,id){return c.courses.find(x=>x.id===id)}
  function getResource(c,id){return c.resources.find(x=>x.id===id)}
  function getCoreCourse(c,level){const id=c.levels[level]?.coreCourseId;const course=id?getCourse(c,id):null;return course&&['level','library'].includes(course.collection)&&course.level===level&&published(course)?course:null}
  function getLevelCourses(c,level,{includeCore=true}={}){const coreId=c.levels[level]?.coreCourseId;return c.courses.filter(x=>published(x)&&x.level===level&&['level','library'].includes(x.collection)&&(includeCore||x.id!==coreId)).sort(byOrder)}
  function getSpecialCourses(c){return c.courses.filter(x=>published(x)&&x.featured).sort(byOrder)}
  function getBooks(c){return c.courses.filter(published).sort(byOrder)}
  function isPublicResource(c,r){return published(r)&&(!r.courseId||published(getCourse(c,r.courseId)))}
  function getPublishedResources(c,collection){return c.resources.filter(r=>isPublicResource(c,r)&&(!collection||r.collection===collection)).sort(byOrder)}
  function getLevelResources(c,level){return getPublishedResources(c).filter(r=>r.level===level)}
  function getLibraryResources(c){return getPublishedResources(c,'level').filter(r=>!r.courseId)}
  function getMedia(c){return getPublishedResources(c,'media').filter(r=>!r.courseId&&MEDIA_TYPES.includes(r.type))}
  function getFeatured(c){return {courses:getSpecialCourses(c),resources:getPublishedResources(c).filter(r=>r.featured)}}
  function getCourseResources(c,courseId,{publishedOnly=true}={}){const rows=c.resources.filter(r=>r.courseId===courseId&&(publishedOnly?isPublicResource(c,r):r.status!=='archived'));return rows.sort(byOrder)}
  function getSupplementary(c,level){return getLibraryResources(c).filter(r=>r.level===level).sort(byOrder)}
  function skillCount(c,level,skill){return getSupplementary(c,level).filter(r=>r.skill===skill).length}
  function activeSkills(c,level){return SKILLS.map(skill=>({skill,count:skillCount(c,level,skill)})).filter(x=>x.count>0)}

  function safeExternalUrl(value){
    const s=String(value||'').trim();if(!s)return '';
    try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:''}catch(e){return ''}
  }
  const resourceHref=r=>`resource.html?id=${encodeURIComponent(r?.id||'')}`;
  const courseHref=c=>`course.html?id=${encodeURIComponent(c?.id||'')}`;
  const priorityLabel=p=>({essential:'ضروری',recommended:'پیشنهادی',extra:'اختیاری'})[p]||'منبع';
  const pricingLabel=p=>({free:'رایگان',paid:'پولی',unknown:'نامشخص'})[p]||'نامشخص';
  const collectionLabel=c=>({special:'کتاب چندسطحی',library:'کتابخانه',media:'رسانه',level:'سطح CEFR'})[c]||c;
  const typeIcon=type=>{
    const map={
      Kursbuch:'<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path></svg>',
      Arbeitsbuch:'<svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>',
      Book:'<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path></svg>',
      Audio:'<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
      Film:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="m10 9 5 3-5 3Z"></path></svg>',
      Series:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="m10 9 5 3-5 3Z"></path></svg>',
      Article:'<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"></path></svg>',
      Podcast:'<svg viewBox="0 0 24 24"><circle cx="12" cy="11" r="3"></circle><path d="M5.4 17.6a9 9 0 1 1 13.2 0"></path><path d="M8.8 15.2a5 5 0 1 1 6.4 0"></path><path d="M12 14v8"></path></svg>',
      Video:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m10 9 5 3-5 3Z"></path></svg>',
      'Audio Transcript':'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8M8 17h5"></path></svg>',
      'Video Transcript':'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8M8 17h5"></path></svg>',
      'Podcast Transcript':'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8M8 17h5"></path></svg>',
      Transcript:'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h5"></path></svg>',
      Website:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a15 15 0 0 1 0 18"></path><path d="M12 3a15 15 0 0 0 0 18"></path></svg>',
      Link:'<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'
    };return map[type]||map.Link
  };
  function toast(msg){const e=document.createElement('div');e.className='toast';e.setAttribute('role','status');e.textContent=msg;document.body.appendChild(e);setTimeout(()=>e.remove(),2600)}
  function resourceCard(r,{compact=false,preview=false,content=null}={}){
    const detailHref=resourceHref(r)+(preview?'&preview=1':''),external=!r.storagePath?safeExternalUrl(r.url):'',available=Boolean(r.storagePath||external);
    const course=content&&r.courseId?getCourse(content,r.courseId):null;
    const context=r.level?`<span class="meta-pill">${esc(r.level)}</span>`:'';
    const packageContext=course?`<span class="meta-pill">بسته: ${esc(course.title)}</span>`:'';
    const skillLabel=r.skill==='Course'?'منابع کتاب':esc(r.skill);
    let actions=`<a class="soft-btn" href="${detailHref}">جزئیات</a>`;
    if(external)actions+=`<a class="primary-btn" href="${esc(external)}" target="_blank" rel="noopener noreferrer">باز کردن منبع</a>`;
    else if(r.storagePath)actions=`<a class="primary-btn" href="${detailHref}">دسترسی به فایل</a>`;
    else actions+=`<span class="soft-btn btn-disabled" aria-disabled="true">دسترسی ثبت نشده</span>`;
    return `<article class="neo-card resource-card priority-${esc(r.priority)}${compact?' compact':''}"><span class="resource-icon">${typeIcon(r.type)}</span><div class="resource-main"><h3 class="ltr">${esc(r.title)}</h3><p>${esc(r.description||'')}</p><div class="resource-tags"><span class="meta-pill">${skillLabel}</span><span class="meta-pill">${esc(r.type)}</span><span class="priority-badge">${priorityLabel(r.priority)}</span>${context}${preview&&r.status!=='published'?`<span class="status-badge">${esc(r.status)}</span>`:''}</div><div class="resource-provider">${esc(r.provider)} · ${pricingLabel(r.pricing)}${course?` · <a href="${courseHref(course)}">${esc(course.title)}</a>`:''}</div></div><div class="resource-actions">${actions}</div></article>`;
  }
  function coverMarkup(course){
    const external=safeExternalUrl(course.coverUrl);
    const src=external||'';
    return `<span class="gl-book-cover">${src?`<img loading="lazy" alt="جلد ${esc(course.title)}" src="${esc(src)}">`:course.coverStoragePath?`<img loading="lazy" alt="جلد ${esc(course.title)}" data-gl-cover="${esc(course.coverStoragePath)}">`:`<span aria-hidden="true">${typeIcon('Book')}</span>`}</span>`;
  }
  async function hydrateCovers(root=document){
    const nodes=[...root.querySelectorAll('img[data-gl-cover]')];
    await Promise.all(nodes.map(async img=>{try{if(window.GLBackend?.isCloudMode?.()){const url=await window.GLBackend.signedUrl(img.dataset.glCover);if(url)img.src=url;}}catch(e){img.removeAttribute('src')}}));
  }
  function courseCard(course,content,{core=false}={}){
    const count=getCourseResources(content,course.id).length;
    const eyebrow=core?'کتاب اصلی':course.featured?'انتخاب ویژه':(BOOK_CATEGORY_LABELS[course.bookType]||'کتاب');
    const meta=course.level||'بدون سطح';
    return `<article class="neo-card mini-course-card gl-book-card">${coverMarkup(course)}<div class="mini-course-copy"><div class="eyebrow"><span class="eyebrow-dot"></span> ${eyebrow}</div><h3 dir="auto">${esc(course.title)}</h3><p>${esc(course.description||'')}</p><div class="meta-row"><span class="meta-pill">${meta}</span><span class="meta-pill">${esc(BOOK_CATEGORY_LABELS[course.bookType]||'سایر')}</span>${count?`<span class="meta-pill">${count} فایل مرتبط</span>`:''}</div></div><a class="primary-btn" href="${courseHref(course)}">مشاهده کتاب</a></article>`;
  }

  function getRoadmap(c,level){
    const core=getCoreCourse(c,level),assets=core?getCourseResources(c,core.id):[],practice=getSupplementary(c,level),steps=[];
    const add=(label,rows)=>{if(rows.length)steps.push({label,href:resourceHref(rows[0]),title:rows[0].title})};
    add('Kursbuch',assets.filter(r=>r.type==='Kursbuch'));
    add('Audio / Video',assets.filter(r=>['Audio','Video'].includes(r.type)));
    add('Arbeitsbuch',assets.filter(r=>r.type==='Arbeitsbuch'));
    add('Wortschatz / Grammatik',practice.filter(r=>['Wortschatz','Grammatik'].includes(r.skill)));
    add('تمرین مهارت',practice.filter(r=>!['Wortschatz','Grammatik','Prüfung'].includes(r.skill)));
    add('Prüfung',practice.filter(r=>r.skill==='Prüfung'));
    return steps;
  }

  function validateContent(content){
    const c=normalizeContent(content),errors=[],warnings=[];
    const resourceIds=new Set(),courseIds=new Set();
    for(const cse of c.courses){
      if(courseIds.has(cse.id))errors.push(`Course ID تکراری: ${cse.id}`);courseIds.add(cse.id);
      if(!cse.title)errors.push(`Course بدون عنوان: ${cse.id}`);
      if(cse.collection==='level'&&!LEVELS.includes(cse.level))errors.push(`${cse.title||cse.id}: Level معتبر ندارد`);
      if(cse.coverUrl&&!safeExternalUrl(cse.coverUrl))errors.push(`${cse.id}: Cover URL معتبر نیست`);
      if(cse.url&&!safeExternalUrl(cse.url))errors.push(`${cse.id}: Book URL معتبر نیست`);
      if(cse.status==='published'&&!cse.url&&!cse.storagePath&&!c.resources.some(r=>r.courseId===cse.id&&r.status==='published'))warnings.push(`${cse.id}: کتاب Published بدون لینک یا فایل قابل دسترس است`);
      if(cse.collection==='media')errors.push(`${cse.id}: Book نمی‌تواند Media collection باشد`);
      if(cse.collection==='special'&&cse.level)errors.push(`${cse.title||cse.id}: کتاب ویژه قدیمی نباید Level داشته باشد`);
      const publishedAssets=c.resources.filter(r=>r.courseId===cse.id&&r.status==='published');
      if(cse.status==='published'&&!publishedAssets.length&&!cse.url&&!cse.storagePath)warnings.push(`${cse.title||cse.id}: Published ولی منبع Published ندارد`);
    }
    for(const r of c.resources){
      if(resourceIds.has(r.id))errors.push(`Resource ID تکراری: ${r.id}`);resourceIds.add(r.id);
      if(!r.title)errors.push(`Resource بدون عنوان: ${r.id}`);
      if(r.status==='published'&&!r.courseId&&BOOK_TYPES.includes(r.type))errors.push(`${r.title||r.id}: فایل کتاب باید به Book Package متصل باشد`);
      if(r.collection==='media'&&!MEDIA_TYPES.includes(r.type))errors.push(`${r.id}: رسانه باید Film، Series، Podcast یا Article باشد`);
      const course=r.courseId?getCourse(c,r.courseId):null;
      if(r.courseId&&!course)errors.push(`${r.title||r.id}: Course نامعتبر`);
      if(course){
        if(course.collection!==r.collection)errors.push(`${r.title||r.id}: Collection با Course هماهنگ نیست`);
        if(course.level!==r.level)errors.push(`${r.title||r.id}: Level با Course هماهنگ نیست`);
        if(course.collection==='special'&&r.level)errors.push(`${r.title||r.id}: Resource کتاب ویژه نباید Level داشته باشد`);
        if(r.status==='published'&&course.status!=='published')errors.push(`${r.title||r.id}: منبع Published به کتاب غیرمنتشرشده وصل است`);
      }
      if(r.collection==='level'&&!LEVELS.includes(r.level))errors.push(`${r.title||r.id}: Level معتبر ندارد`);
      if(['special','library'].includes(r.collection)&&!r.courseId)errors.push(`${r.title||r.id}: فایل کتاب باید به کتاب وصل باشد`);
      if(r.collection==='media'&&r.courseId)errors.push(`${r.id}: رسانه مستقل نباید به کتاب متصل باشد`);
      if(r.url&&!safeExternalUrl(r.url))errors.push(`${r.title||r.id}: URL باید http/https معتبر باشد`);
      if(r.status==='published'&&!r.storagePath&&!safeExternalUrl(r.url))errors.push(`${r.title||r.id}: Published ولی لینک/فایل معتبر ندارد`);
      if(r.linkStatus==='broken')warnings.push(`${r.title||r.id}: لینک Broken علامت خورده`);
    }
    for(const code of LEVELS){
      const core=c.levels[code]?.coreCourseId;
      if(core){const cc=getCourse(c,core);if(!cc)errors.push(`${code}: Core Course وجود ندارد`);else if(!['level','library'].includes(cc.collection)||cc.level!==code)errors.push(`${code}: Core Course متعلق به این Level نیست`);else if(cc.status!=='published')errors.push(`${code}: Core Book باید Published باشد`)}
    }
    return {errors,warnings,ok:errors.length===0};
  }

  async function boot(cb){try{if(window.GLBackend?.hydrate)await window.GLBackend.hydrate()}catch(e){console.warn('Backend fallback:',e)}if(window.GLBackend?.getStatus().status==='error'){const main=document.querySelector('main');if(main){const notice=document.createElement('div');notice.className='backend-notice';notice.setAttribute('role','status');notice.textContent='اتصال به کتابخانه برقرار نشد؛ فهرست پایه نمایش داده می‌شود و ممکن است به‌روز نباشد. برای تلاش دوباره صفحه را تازه کن.';main.prepend(notice)}}if(typeof cb==='function')return cb()}
  function closeMobileMenus(){document.querySelectorAll('.mobile-menu[open]').forEach(x=>x.removeAttribute('open'))}
  document.addEventListener('click',e=>{if(e.target.closest('.mobile-menu-panel a'))closeMobileMenus()});

  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=document.querySelector('.mobile-menu[open]');if(menu){closeMobileMenus();menu.querySelector('summary')?.focus()}}});
  document.addEventListener('click',e=>{if(!e.target.closest('.mobile-menu'))closeMobileMenus()});
  window.GL={BOOK_CATEGORIES,BOOK_CATEGORY_LABELS,coverMarkup,hydrateCovers,clearCloudContent,isPublicResource,getRoadmap,CONTENT_KEY,LEVELS,SKILLS,COLLECTIONS,MEDIA_TYPES,BOOK_TYPES,getBooks,getMedia,getFeatured,clone,esc,num,byOrder,slug,qs,safeLevel,normalizeContent,getContent,saveContent,resetContent,getCourse,getResource,getCoreCourse,getLevelCourses,getSpecialCourses,getPublishedResources,getLevelResources,getLibraryResources,getCourseResources,getSupplementary,skillCount,activeSkills,safeExternalUrl,resourceHref,courseHref,priorityLabel,pricingLabel,collectionLabel,typeIcon,toast,resourceCard,courseCard,validateContent,boot};
})();
