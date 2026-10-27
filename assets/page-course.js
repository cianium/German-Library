GL.boot(async()=>{const c=GL.getContent(),course=GL.getCourse(c,GL.qs('id')),header=document.getElementById('courseHeader'),grid=document.getElementById('assetGrid'),preview=GL.qs('preview')==='1';let staffPreview=false;if(course&&course.status!=='published'&&preview){const access=await GLBackend.requireStaff();staffPreview=access.allowed}if(!course||(course.status!=='published'&&!staffPreview)){header.innerHTML='<div class="empty-state"><h3>کتاب پیدا نشد</h3><p>ممکن است منتشر نشده باشد یا آدرس اشتباه باشد.</p><a class="soft-btn" href="index.html">بازگشت</a></div>';return}document.title=`${course.title} · Lexipfad`;const special=course.collection==='special',contextHref=course.level?`level.html?level=${course.level}`:'books.html',contextText=course.level?`سطح ${course.level}`:'کتابخانه';['contextLink','mobileContextLink','bottomContext'].forEach(id=>{const a=document.getElementById(id);if(a){a.href=contextHref;a.textContent=contextText}});document.getElementById('crumbs').innerHTML=`<a href="index.html">خانه</a><span>←</span><a href="${contextHref}">${contextText}</a><span>←</span><span class="ltr">${GL.esc(course.title)}</span>`;const assets=staffPreview?GL.getCourseResources(c,course.id,{publishedOnly:false}):GL.getCourseResources(c,course.id);const label=c.levels[course.level]?.coreCourseId===course.id?'کتاب اصلی':'کتاب کتابخانه';header.innerHTML=`<div class="eyebrow"><span class="eyebrow-dot"></span> ${staffPreview?'PREVIEW · '+course.status.toUpperCase()+' · ':''}${label}${course.level?` · ${course.level}`:''}</div><h1 class="ltr">${GL.esc(course.title)}</h1><p class="hero-desc">${GL.esc(course.description)}</p><div class="meta-row"><span class="meta-pill">${assets.length} فایل یا منبع کتاب</span><span class="meta-pill">${course.level||'بدون سطح مشخص'}</span></div>`;const external=GL.safeExternalUrl(course.url);const bookFile=course.storagePath;const bookActions=[];
if(external)bookActions.push(`<a class="primary-btn" href="${GL.esc(external)}" target="_blank" rel="noopener noreferrer">دریافت کتاب از منبع خارجی ↗</a>`);
if(bookFile)bookActions.push(`<a class="soft-btn" id="downloadBookFile" href="#">باز کردن فایل کتاب</a>`);
if(bookActions.length)header.insertAdjacentHTML('beforeend',`<div class="hero-actions">${bookActions.join('')}</div>`);
if(bookFile){const a=document.getElementById('downloadBookFile');a.addEventListener('click',async ev=>{ev.preventDefault();try{const url=await GLBackend.signedUrl(bookFile);if(url)window.location.assign(url);else GL.toast('دسترسی به فایل برقرار نیست.')}catch(e){GL.toast('باز کردن فایل ناموفق بود')}})}
if(course.coverUrl||course.coverStoragePath){header.insertAdjacentHTML('afterbegin',GL.coverMarkup(course));GL.hydrateCovers(header)}
const groups=[
  {title:'کتاب درس · Kursbuch',types:['Kursbuch']},
  {title:'کتاب کار · Arbeitsbuch',types:['Arbeitsbuch']},
  {title:'فایل‌های صوتی و پادکست',types:['Audio','Podcast']},
  {title:'ویدیوهای کتاب',types:['Video']},
  {title:'متن فایل‌های صوتی · Audio Transcripts',types:['Audio Transcript']},
  {title:'متن پادکست‌ها · Podcast Transcripts',types:['Podcast Transcript']},
  {title:'متن ویدیوها · Video Transcripts',types:['Video Transcript']},
  {title:'سایر متن‌ها · Transcripts',types:['Transcript']},
  {title:'فایل‌ها و لینک‌های دیگر',types:['Book','Website','Link']}
];
const used=new Set();
const sections=groups.map(group=>{
  const rows=assets.filter(r=>group.types.includes(r.type));rows.forEach(r=>used.add(r.id));
  return rows.length?`<section class="course-asset-section"><div class="section-head"><h3 class="course-asset-title">${group.title}</h3><span class="asset-group-count">${rows.length} مورد</span></div><div class="resource-grid">${rows.map(r=>GL.resourceCard(r,{preview:staffPreview,content:c})).join('')}</div></section>`:'';
}).filter(Boolean);
const other=assets.filter(r=>!used.has(r.id));
if(other.length)sections.push(`<section class="course-asset-section"><h3 class="course-asset-title">سایر فایل‌های کتاب</h3><div class="resource-grid">${other.map(r=>GL.resourceCard(r,{preview:staffPreview,content:c})).join('')}</div></section>`);
grid.innerHTML=sections.length?sections.join(''):'<div class="neo-card empty-state full-width"><h3>هنوز فایلی ثبت نشده</h3><p>مدیر سایت می‌تواند فایل‌های این کتاب را اضافه کند.</p></div>'});
