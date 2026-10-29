GL.boot(async()=>{
 const notice=document.getElementById('studioNotice'),listPanel=document.getElementById('articleListPanel'),editPanel=document.getElementById('articleEditorPanel'),form=document.getElementById('articleForm'),list=document.getElementById('studioArticles'),$=id=>document.getElementById(id);let client,role='learner',user,rows=[],current=null,baseRevision=0,dirty=false,saving=false,timer=0,seoTimer=0,linkCandidates=[],articlesLoaded=false;
 const say=(message,error=false)=>{notice.hidden=!message;notice.textContent=message;notice.classList.toggle('error',error)};
 const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 try{const auth=await GLBackend.refreshAuth();user=auth.user;role=auth.role;const gate=await GLBackend.requireStaff();if(!gate.allowed)throw Error(gate.reason==='login'?'برای ورود به استودیو وارد حساب شو.':'این حساب به استودیوی مقاله دسترسی ندارد.');client=GLBackend.getClient();const [books,resources]=await Promise.all([client.from('courses').select('id,title,level_code,status').eq('status','published').order('title'),client.from('resources').select('id,title,level_code,status').eq('status','published').order('title')]);if(!books.error&&!resources.error){linkCandidates=[...books.data.map(x=>({type:'کتاب',title:x.title,url:new URL(`course.html?id=${encodeURIComponent(x.id)}`,location.origin).href})),...resources.data.map(x=>({type:'منبع',title:x.title,url:new URL(`resource.html?id=${encodeURIComponent(x.id)}`,location.origin).href}))];$('articleRelations').innerHTML='<optgroup label="کتاب‌ها">'+books.data.map(x=>`<option value="course:${escape(x.id)}">${escape(x.title)}${x.level_code?` · ${escape(x.level_code)}`:''}</option>`).join('')+'</optgroup><optgroup label="منابع">'+resources.data.map(x=>`<option value="resource:${escape(x.id)}">${escape(x.title)}${x.level_code?` · ${escape(x.level_code)}`:''}</option>`).join('')+'</optgroup>'}}catch(e){say(e.message||'دسترسی بررسی نشد؛ اتصال یا ورود را بررسی کن.',true);$('newArticle').disabled=true;return}
 const reviewer=['admin','editor'].includes(role);
 const studioNav=$('studioMobileNav');
 function setEditorMode(open){document.body.classList.toggle('studio-editor-open',open);studioNav.hidden=open}
 function showList(){setEditorMode(false);editPanel.classList.add('hidden');listPanel.classList.remove('hidden');loadList().catch(e=>say(e.message,true));scrollTo({top:0,behavior:'smooth'})}
 // Keep the full editorial workflow on desktop, but expose one meaningful section per mobile view.
 function setStudioTab(name,focus=false){
   for(const button of document.querySelectorAll('[data-studio-tab]')){
     const selected=button.dataset.studioTab===name;
     button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
     if(focus&&selected)button.focus();
   }
   for(const section of document.querySelectorAll('[data-studio-section]'))section.classList.toggle('is-active',section.dataset.studioSection===name);
 }
 document.querySelectorAll('[data-studio-tab]').forEach((button,index,buttons)=>{
   button.addEventListener('click',()=>setStudioTab(button.dataset.studioTab));
   button.addEventListener('keydown',e=>{
     if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
     e.preventDefault();let next=index;
     if(e.key==='ArrowLeft')next=(index+1)%buttons.length;
     if(e.key==='ArrowRight')next=(index+buttons.length-1)%buttons.length;
     if(e.key==='Home')next=0;
     if(e.key==='End')next=buttons.length-1;
     setStudioTab(buttons[next].dataset.studioTab,true);
   });
 });function values(){const f=new FormData(form);return{id:f.get('id')||undefined,revision:Number(f.get('revision'))||baseRevision,slug:String(f.get('slug')||'').trim(),title:String(f.get('title')||'').trim(),excerpt:String(f.get('excerpt')||'').trim(),body_html:sanitize($('articleBody').innerHTML),category:String(f.get('category')||'General').trim()||'General',tags:String(f.get('tags')||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,5),locale:String(f.get('locale')||'de'),levels:[...$('articleLevels').selectedOptions].map(x=>x.value),skills:String(f.get('skills')||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,8),related_resource_ids:[...$('articleRelations').selectedOptions].map(x=>x.value).slice(0,8),author_name:String(f.get('author_name')||'').trim(),seo_title:String(f.get('seo_title')||'').trim(),focus_query:String(f.get('focus_query')||'').trim(),meta_description:String(f.get('meta_description')||'').trim(),canonical_url:String(f.get('canonical_url')||'').trim(),og_image_url:String(f.get('og_image_url')||'').trim(),cover_url:String(f.get('cover_url')||'').trim(),mobile_cover_url:String(f.get('mobile_cover_url')||'').trim(),cover_alt:String(f.get('cover_alt')||'').trim(),reviewer_feedback:String(f.get('reviewer_feedback')||''),status:current?.status||'draft',featured:Boolean($('articleFeatured').checked),author_id:current?.author_id||user.id}}
 function sanitize(source){const doc=new DOMParser().parseFromString(`<body>${source}</body>`,'text/html'),allowed=new Set(['P','H2','H3','H4','STRONG','B','EM','I','U','UL','OL','LI','BLOCKQUOTE','A','BR','HR','FIGURE','FIGCAPTION','IMG','TABLE','THEAD','TBODY','TR','TH','TD','CODE','PRE']);function clean(node){let out='';for(const child of node.childNodes){if(child.nodeType===Node.TEXT_NODE){out+=child.textContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');continue}if(child.nodeType!==Node.ELEMENT_NODE)continue;const el=child;if(!allowed.has(el.tagName)){out+=clean(el);continue}const tag=el.tagName.toLowerCase();if(tag==='img'){const src=safeUrl(el.getAttribute('src'));if(src)out+=`<img src="${escape(src)}" alt="${escape(el.getAttribute('alt')||'')}" loading="lazy">`;continue}let attrs='';if(tag==='a'){const href=safeUrl(el.getAttribute('href'));if(href)attrs=` href="${escape(href)}" rel="noopener noreferrer"`}if(tag==='td'||tag==='th'){const span=Number(el.getAttribute('colspan'));if(span>1&&span<=8)attrs=` colspan="${span}"`}out+=`<${tag}${attrs}>${['BR','HR'].includes(el.tagName)?'':clean(el)+`</${tag}>`}` }return out}return clean(doc.body)}
 function safeUrl(v){try{const u=new URL(String(v).trim());return ['https:'].includes(u.protocol)?u.href:''}catch{return''}}
 function seo(){clearTimeout(seoTimer);seoTimer=setTimeout(()=>{const v=values(),html=v.body_html,doc=new DOMParser().parseFromString(html,'text/html'),checks=[];const add=(group,text,ok,field='')=>checks.push({group,text,ok,field});add('ضروری برای انتشار','عنوان روشن و حداقل ۸ نویسه',v.title.length>=8,'articleTitle');add('ضروری برای انتشار','Slug یکتا و فقط با حروف کوچک لاتین، عدد و خط تیره',/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug),'articleSlug');add('ضروری برای انتشار','خلاصهٔ متا (حداکثر ۱۸۰ نویسه)',v.meta_description.length>=70&&v.meta_description.length<=180,'metaDescription');add('ضروری برای انتشار','نام نویسنده ثبت شده باشد',v.author_name.length>=2,'authorName');const seoTitle=v.seo_title||v.title;add('انجام شد','H1 صفحه فقط از عنوان ساخته می‌شود؛ داخل متن H1 نگذار',doc.querySelectorAll('h1').length===0,'articleBody');const emptyHead=[...doc.querySelectorAll('h2,h3,h4')].some(h=>!h.textContent.trim());add('بهبود پیشنهادی','عنوان‌بخش خالی نداشته باشد',!emptyHead,'articleBody');const levelsInBody=[...doc.querySelectorAll('h2,h3,h4')].map(h=>Number(h.tagName.slice(1)));const badHierarchy=levelsInBody.some((n,i)=>i===0?n>2:n>levelsInBody[i-1]+1);add('بهبود پیشنهادی','ساختار عنوان‌ها منظم باشد',!badHierarchy,'articleBody');const longParagraph=[...doc.querySelectorAll('p')].some(p=>p.textContent.length>420);add('بهبود پیشنهادی','پاراگراف‌ها کوتاه و خوانا باشند',!longParagraph,'articleBody');if(v.focus_query){const q=v.focus_query.toLocaleLowerCase(),text=(v.title+' '+doc.body.textContent).toLocaleLowerCase(),count=text.split(q).length-1;add('بهبود پیشنهادی','عبارت جست‌وجو به‌شکل طبیعی در عنوان و متن آمده باشد',v.title.toLocaleLowerCase().includes(q)&&count>=2,'focusQuery');const headings=[...doc.querySelectorAll('h2,h3')].some(h=>h.textContent.toLocaleLowerCase().includes(q));
 const intro=(doc.querySelector('p')?.textContent||'').toLocaleLowerCase();
 add('بهبود پیشنهادی','عبارت هدف در یکی از عنوان‌بخش‌ها آمده باشد (در صورت ارتباط)',headings,'articleBody');
 add('بهبود پیشنهادی','مقدمه موضوع اصلی جست‌وجو را روشن بیان کند',intro.includes(q),'articleBody');
 add('بهبود پیشنهادی','توضیح متا با موضوع جست‌وجو هم‌راستا باشد',v.meta_description.toLocaleLowerCase().includes(q),'metaDescription');add('بهبود پیشنهادی','از تکرار بی‌دلیل عبارت هدف بپرهیز؛ متن باید طبیعی باشد',true,'focusQuery')}add('بهبود پیشنهادی',`عنوان SEO ${seoTitle.length} نویسه دارد (پیشنهاد: ۳۰ تا ۶۰)`,seoTitle.length>=30&&seoTitle.length<=60,'seoTitle');add('بهبود پیشنهادی','متن مقاله دست‌کم یک H2 دارد',doc.querySelectorAll('h2').length>0,'articleBody');add('بهبود پیشنهادی','کاور مقاله با پیوند HTTPS اضافه شده است',Boolean(safeUrl(v.cover_url)),'coverUrl');let canonicalOk=true;try{if(v.canonical_url)canonicalOk=new URL(v.canonical_url,location.origin).origin===location.origin}catch{canonicalOk=false}add('بهبود پیشنهادی','Canonical در همین دامنه باشد',canonicalOk,'canonicalUrl');add('بهبود پیشنهادی','تصاویر متن Alt دارند',[...doc.querySelectorAll('img')].every(i=>Boolean(i.getAttribute('alt')?.trim())),'articleBody');add('بهبود پیشنهادی','متن دارای پیوند داخلی مرتبط است',[...doc.querySelectorAll('a')].some(a=>a.getAttribute('href')?.startsWith(location.origin)),'articleBody');add('انجام شد',`مقاله ${doc.body.textContent.trim().split(/\s+/).filter(Boolean).length} واژه دارد`,doc.body.textContent.trim().split(/\s+/).filter(Boolean).length>=300);const cleanWords=(doc.body.textContent||'').trim().split(/\s+/).filter(Boolean);
 const summaryWords=cleanWords.length;
 $('writingInsights').textContent=`${summaryWords.toLocaleString('fa-IR')} کلمه · حدود ${Math.ceil(summaryWords/200).toLocaleString('fa-IR')} دقیقه مطالعه`;
 $('seoSnippetTitle').textContent=seoTitle||'عنوان مقاله';
 $('seoSnippetUrl').textContent=`${location.origin}/articles/${v.slug||'article-slug'}`;
 $('seoSnippetDescription').textContent=v.meta_description||v.excerpt||'توضیح متا هنوز ثبت نشده است.';
 const checksOk=checks.filter(x=>x.ok).length;
 $('seoOverview').textContent=`${checksOk.toLocaleString('fa-IR')} مورد از ${checks.length.toLocaleString('fa-IR')} بررسی تحریریه انجام شده است. این چک‌لیست تضمین رتبهٔ جست‌وجو نیست.`;
 $('seoChecks').innerHTML=['ضروری برای انتشار','بهبود پیشنهادی','انجام شد'].map(group=>{const items=checks.filter(x=>x.group===group);return `<section class="seo-check-group"><h3>${group}</h3>${items.map(x=>`<button class="seo-check ${x.ok?'is-ok':'is-pending'}" type="button" ${x.field?`data-focus="${x.field}"`:''}><span aria-hidden="true">${x.ok?'✓':'○'}</span><span>${escape(x.text)}</span></button>`).join('')}</section>`}).join('');$('seoChecks').querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>{if(matchMedia('(max-width:899px)').matches&&b.dataset.focus==='articleBody')setStudioTab('write');$(b.dataset.focus).focus()});},180)}
 const watched=[...form.querySelectorAll('input,textarea,select')];watched.forEach(el=>el.addEventListener('input',()=>{dirty=true;$('saveState').textContent='تغییرات ذخیره‌نشده';if(el.id==='articleTitle'&&!current){$('articleSlug').value=slugify(el.value)}seo();scheduleAutosave()}));$('articleBody').addEventListener('input',()=>{dirty=true;$('saveState').textContent='تغییرات ذخیره‌نشده';seo();scheduleAutosave()});
 function slugify(x){return x.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)}
 function scheduleAutosave(){clearTimeout(timer);timer=setTimeout(()=>{if(current||values().title.length>=8)save(current?.status||'draft',true)},1800)}
 async function save(status,automatic=false){if(saving)return false;const v=values(),savedVersion=JSON.stringify(v);if(v.title.length<8){if(!automatic)say('عنوان مقاله باید حداقل ۸ نویسه داشته باشد.',true);return false}if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug)){if(!automatic)say('Slug را به شکل خوانا و با خط تیره بنویس.',true);return false}if(!v.author_name){if(!automatic)say('نام نمایشی نویسنده را وارد کن.',true);return false}if(status==='published'&&(!v.excerpt||!v.meta_description||v.body_html.length<100)){say('برای انتشار، خلاصه و متن مقاله را کامل کن.',true);return false}saving=true;$('saveState').textContent=automatic?'در حال ذخیرهٔ خودکار…':'در حال ذخیره…';const payload={slug:v.slug,title:v.title,excerpt:v.excerpt,body_html:v.body_html,category:v.category,tags:v.tags,locale:v.locale,levels:v.levels,skills:v.skills,related_resource_ids:v.related_resource_ids,author_name:v.author_name,seo_title:v.seo_title,focus_query:v.focus_query,meta_description:v.meta_description,canonical_url:v.canonical_url,og_image_url:v.og_image_url,cover_url:v.cover_url,mobile_cover_url:v.mobile_cover_url,cover_alt:v.cover_alt,reviewer_feedback:v.reviewer_feedback,status,author_id:v.author_id};if(reviewer)payload.featured=v.featured;try{let result;if(current){let q=client.from('articles').update(payload).eq('id',current.id).eq('revision',baseRevision).select('*').maybeSingle();const {data,error}=await q;if(error)throw error;if(!data)throw Error('این مقاله در دستگاه دیگری تغییر کرده است. نسخهٔ تازه را بارگیری کن تا نوشته‌ای بازنویسی نشود.');result=data}else{const {data,error}=await client.from('articles').insert({...payload,featured:false}).select('*').single();if(error)throw error;result=data;current=result}baseRevision=result.revision;$('articleForm').elements.id.value=result.id;$('articleForm').elements.revision.value=result.revision;$('revisionHistory').disabled=false;$('previewArticle').disabled=false;current={...result};const afterSave=values();afterSave.status=v.status;afterSave.revision=v.revision;afterSave.id=v.id;dirty=JSON.stringify(afterSave)!==savedVersion;$('submitForReview').hidden=!(reviewer||result.author_id===user.id)||result.status==='in_review';$('saveState').textContent=dirty?`نسخهٔ ${result.revision} ذخیره شد؛ تغییرات تازه مانده‌اند`:`ذخیره شد · نسخهٔ ${result.revision}`;if(dirty)scheduleAutosave();say(status==='in_review'?'مقاله برای بررسی ارسال شد.':status==='published'?'مقاله منتشر شد.':'پیش‌نویس ذخیره شد.');await loadList();return true}catch(e){$('saveState').textContent='ذخیره ناموفق';say(e.message||'ذخیره انجام نشد؛ اتصال و مجوز را بررسی کن.',true);return false}finally{saving=false}}
 function openEditor(row){current=row?{...row}:null;baseRevision=row?.revision||0;form.reset();form.elements.id.value=row?.id||'';form.elements.revision.value=row?.revision||'';for(const [key,id] of Object.entries({title:'articleTitle',excerpt:'articleExcerpt',slug:'articleSlug',category:'articleCategory',tags:'articleTags',locale:'articleLocale',skills:'articleSkills',author_name:'authorName',seo_title:'seoTitle',focus_query:'focusQuery',meta_description:'metaDescription',canonical_url:'canonicalUrl',og_image_url:'ogImageUrl',cover_url:'coverUrl',mobile_cover_url:'mobileCoverUrl',cover_alt:'coverAlt',reviewer_feedback:'reviewerFeedback'}))$(id).value=row?.[key]|| (key==='author_name'?(user.user_metadata?.full_name||user.email?.split('@')[0]||''):key==='category'?'Grammatik':'');for(const o of $('articleLevels').options)o.selected=(row?.levels||[]).includes(o.value);for(const o of $('articleRelations').options)o.selected=(row?.related_resource_ids||[]).includes(o.value);$('articleBody').innerHTML=row?.body_html||'';selectionRange=null;activeImage=null;activeLink=null;$('editArticleImage').hidden=true;$('articleFeatured').checked=Boolean(row?.featured);$('featuredControl').classList.toggle('hidden',!reviewer);const canEdit=reviewer||!row||row?.author_id===user.id;form.querySelectorAll('input,textarea,select,[contenteditable]').forEach(x=>{if(x.id!=='reviewerFeedback')x.disabled=!canEdit});$('articleBody').contentEditable=String(canEdit);document.querySelectorAll('.rich-toolbar button').forEach(b=>b.disabled=!canEdit);setStudioTab('write');$('publishArticle').classList.toggle('hidden',!reviewer);$('requestChanges').classList.toggle('hidden',!reviewer||!row);$('archiveArticle').classList.toggle('hidden',!reviewer||!row);$('submitForReview').hidden=!canEdit||row?.status==='in_review';$('saveArticle').disabled=!canEdit;$('revisionHistory').disabled=!row;$('previewArticle').disabled=!row;listPanel.classList.add('hidden');editPanel.classList.remove('hidden');setEditorMode(true);dirty=false;$('saveState').textContent=row?`وضعیت: ${row.status} · نسخهٔ ${row.revision}`:'مقالهٔ جدید';seo();scrollTo({top:0,behavior:'smooth'})}
 function statusFa(s){return({draft:'پیش‌نویس',needs_changes:'نیازمند اصلاح',in_review:'در حال بررسی',published:'منتشرشده',archived:'بایگانی'})[s]||s}
 async function loadList(){const {data,error}=await client.from('articles').select('id,slug,title,excerpt,author_id,author_name,status,revision,updated_at,published_at,reviewer_feedback,featured,levels,skills,locale,category,tags,related_resource_ids,body_html,seo_title,focus_query,meta_description,canonical_url,og_image_url,cover_url,mobile_cover_url,cover_alt').order('updated_at',{ascending:false}).limit(100);if(error)throw error;rows=data||[];renderList()}
 function renderList(){const q=$('studioSearch').value.trim().toLowerCase(),st=$('studioStatus').value;const items=rows.filter(a=>(!st||a.status===st)&&(!q||`${a.title} ${a.status} ${a.author_name}`.toLowerCase().includes(q)));list.innerHTML=items.length?items.map(a=>`<article class="neo-card studio-article-row"><div><p class="article-card-meta">${escape(statusFa(a.status))} · نسخه ${a.revision} · ${escape(a.author_name)}</p><h2>${escape(a.title)}</h2><p>${escape(a.excerpt)}</p><small>${escape(new Date(a.updated_at).toLocaleString())}</small></div><div class="admin-actions"><button class="small-btn" data-edit-id="${escape(a.id)}">${a.author_id===user.id||reviewer?'باز کردن':'مشاهده'}</button>${a.status==='published'&&a.published_at?`<a class="small-btn" href="/articles/${encodeURIComponent(a.slug)}" target="_blank" rel="noopener">صفحهٔ عمومی</a>`:''}</div>${a.reviewer_feedback?`<p class="review-feedback">بازخورد: ${escape(a.reviewer_feedback)}</p>`:''}</article>`).join(''):'<div class="neo-card empty-state"><h2>مقاله‌ای نیست</h2><p>یک پیش‌نویس تازه بساز یا فیلترها را تغییر بده.</p></div>';list.querySelectorAll('[data-edit-id]').forEach(b=>b.onclick=()=>openEditor(rows.find(r=>r.id===b.dataset.editId)))}
 const startArticle=()=>openEditor(null);$('newArticle').onclick=startArticle;document.querySelector('[data-studio-new]').onclick=startArticle;document.querySelector('[data-studio-list]').onclick=()=>{if(dirty&&!confirm('تغییرات ذخیره‌نشده از دست می‌روند. ادامه می‌دهی؟'))return;showList()};$('backToList').onclick=()=>{if(dirty&&!confirm('تغییرات ذخیره‌نشده از دست می‌روند. ادامه می‌دهی؟'))return;showList()};$('studioSearch').addEventListener('input',renderList);$('studioStatus').addEventListener('change',renderList);form.addEventListener('submit',e=>{e.preventDefault();save(current?.status||'draft')});$('submitForReview').onclick=async()=>{if(await save('draft'))await save('in_review')};$('publishArticle').onclick=async()=>{const feedback=prompt('یادداشت ویراستار (اختیاری):',current?.reviewer_feedback||'');if(feedback===null)return;form.elements.reviewer_feedback.value=feedback;if(current?.status==='published'){if(!await save('in_review'))return}await save('published')};$('archiveArticle').onclick=async()=>{if(!current||!confirm('این مقاله بایگانی شود؟'))return;if(await save('archived'))showList()};
 // Mobile-first article interactions; all inserted content passes through the existing allow-list on save.
 let selectionRange=null,mediaMode='link',activeImage=null,activeLink=null,linkMode='external';
 const editor=$('articleBody'),toolbar=document.querySelector('.rich-toolbar'),dialog=$('editorMediaDialog'),tableDialog=$('editorTableDialog');
 const rememberSelection=()=>{
   const selection=window.getSelection();
   if(selection?.rangeCount&&editor.contains(selection.anchorNode))selectionRange=selection.getRangeAt(0).cloneRange();
 };
 document.addEventListener('selectionchange',rememberSelection);
 toolbar.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault()});
 function restoreSelection(){
   editor.focus();
   if(selectionRange&&document.contains(selectionRange.startContainer)&&editor.contains(selectionRange.startContainer)){
     const selection=window.getSelection();selection.removeAllRanges();selection.addRange(selectionRange);
   }
 }
 function markEdited(){dirty=true;$('saveState').textContent='تغییرات ذخیره‌نشده';rememberSelection();seo();scheduleAutosave()}
 toolbar.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b||b.disabled||(!b.dataset.command&&!b.dataset.block))return;
   restoreSelection();
   if(b.dataset.block)document.execCommand('formatBlock',false,b.dataset.block);
   else document.execCommand(b.dataset.command,false,b.dataset.value||null);
   markEdited();
 });
 $('insertDivider').onclick=()=>{restoreSelection();document.execCommand('insertHTML',false,'<hr>');markEdited()};
 // The publishing renderer already accepts semantic tables; keep input bounds modest for mobile.
 $('addArticleTable').onclick=()=>{if(editor.contentEditable!=='true')return;rememberSelection();tableDialog.showModal()};
 $('tableCancel').onclick=()=>tableDialog.close();
 $('editorTableForm').addEventListener('submit',e=>{
   e.preventDefault();const cols=Math.min(4,Math.max(2,Number($('tableColumns').value)||2)),rows=Math.min(6,Math.max(2,Number($('tableRows').value)||2));
   const head='<thead><tr>'+Array(cols).fill('<th>عنوان ستون</th>').join('')+'</tr></thead>';
   const body='<tbody>'+Array(rows).fill('<tr>'+Array(cols).fill('<td>متن</td>').join('')+'</tr>').join('')+'</tbody>';
   tableDialog.close();restoreSelection();document.execCommand('insertHTML',false,`<table>${head}${body}</table><p><br></p>`);markEdited();
 });
 // Explicitly clean pasted HTML before it enters the live editable DOM.
 editor.addEventListener('paste',e=>{
   const html=e.clipboardData?.getData('text/html');if(!html)return;
   e.preventDefault();document.execCommand('insertHTML',false,sanitize(html));markEdited();
 });
 editor.addEventListener('click',e=>{
   const node=e.target.closest('img,a');
   activeImage=node?.tagName==='IMG'?node:null;
   activeLink=node?.tagName==='A'?node:null;
   $('editArticleImage').hidden=!activeImage;
   rememberSelection();
 });
 function chooseLinkMode(value){
   linkMode=value;
   $('linkInternal').setAttribute('aria-pressed',String(value==='internal'));
   $('linkExternal').setAttribute('aria-pressed',String(value==='external'));
   $('internalSearchWrap').hidden=value!=='internal';$('internalResults').hidden=value!=='internal';
   if(value==='internal')renderLinkChoices();
 }
 function renderLinkChoices(){
   const query=$('internalSearch').value.trim().toLocaleLowerCase(),container=$('internalResults');
   const items=linkCandidates.filter(x=>!query||x.title.toLocaleLowerCase().includes(query)).slice(0,15);
   container.replaceChildren();
   if(!items.length){const p=document.createElement('p');p.className='muted';p.textContent='مورد منتشرشده‌ای با این عنوان پیدا نشد.';container.append(p);return}
   for(const item of items){const b=document.createElement('button');b.type='button';b.setAttribute('role','option');b.className='link-search-option';
     const name=document.createElement('strong');name.textContent=item.title;
     const type=document.createElement('small');type.textContent=item.type;b.append(name,type);
     b.addEventListener('click',()=>{$('mediaUrl').value=item.url;if(!$('mediaText').value.trim())$('mediaText').value=item.title;container.querySelectorAll('button').forEach(x=>x.setAttribute('aria-selected','false'));b.setAttribute('aria-selected','true')});
     container.append(b);
   }
 }
 async function loadPublishedLinkChoices(){
   if(articlesLoaded)return;articlesLoaded=true;
   const {data,error}=await client.from('published_articles').select('slug,title').limit(100);
   if(error){articlesLoaded=false;return}
   linkCandidates.push(...(data||[]).filter(a=>a.slug&&a.title).map(a=>({type:'مقاله',title:a.title,url:new URL(`/articles/${encodeURIComponent(a.slug)}`,location.origin).href})));
   if(dialog.open&&mediaMode==='link')renderLinkChoices();
 }
 $('linkInternal').addEventListener('click',()=>chooseLinkMode('internal'));
 $('linkExternal').addEventListener('click',()=>chooseLinkMode('external'));
 $('internalSearch').addEventListener('input',renderLinkChoices);
 function openMedia(mode,editImage=false){
   if(editor.contentEditable!=='true')return;
   rememberSelection();mediaMode=mode;
   if(!editImage&&mode==='image')activeImage=null;
   const editing=mode==='image'?Boolean(activeImage):Boolean(activeLink);
   $('mediaDialogTitle').textContent=mode==='image'?(editing?'ویرایش تصویر':'افزودن تصویر'):(editing?'ویرایش پیوند':'افزودن پیوند');
   $('mediaUrlLabel').textContent=mode==='image'?'آدرس عمومی تصویر (HTTPS)':'نشانی HTTPS';
   $('mediaTextLabel').textContent=mode==='image'?'توضیح تصویر (Alt Text)':'متن پیوند';
   $('mediaUrl').value=(mode==='image'&&activeImage?activeImage.getAttribute('src'):mode==='link'&&activeLink?activeLink.getAttribute('href'):'')||'';
   $('mediaText').value=(mode==='image'&&activeImage?activeImage.getAttribute('alt'):mode==='link'&&activeLink?activeLink.textContent:window.getSelection()?.toString().slice(0,240))||'';
   $('mediaText').required=mode==='image';
   $('imageCaptionWrap').hidden=mode!=='image';
   $('imageCaption').value=activeImage?.closest('figure')?.querySelector('figcaption')?.textContent||'';
   $('linkPicker').hidden=mode!=='link';$('mediaRemoveLink').hidden=mode!=='link'||!activeLink;
   $('mediaDialogHelp').textContent=mode==='image'?'برای تصویر آموزشی Alt معنی‌دار بنویس. تصویر باید در نشانی عمومی پایدار HTTPS قرار داشته باشد.':'متن پیوند توصیفی باشد. برای محتوای داخل کتابخانه از جست‌وجوی داخلی استفاده کن.';
   $('mediaApply').textContent=editing?'ثبت تغییرات':'درج در متن';
   $('internalSearch').value='';chooseLinkMode('external');
   dialog.showModal();$('mediaUrl').focus();
   if(mode==='link')loadPublishedLinkChoices().catch(()=>{});
 }
 $('addArticleLink').onclick=()=>openMedia('link');
 $('addArticleImage').onclick=()=>openMedia('image');
 $('editArticleImage').onclick=()=>openMedia('image',true);
 $('mediaCancel').onclick=()=>dialog.close();
 $('mediaRemoveLink').onclick=()=>{
   if(!activeLink)return;const node=activeLink;
   node.replaceWith(document.createTextNode(node.textContent||''));activeLink=null;dialog.close();markEdited();
 };
 $('editorMediaForm').addEventListener('submit',e=>{
   e.preventDefault();const url=safeUrl($('mediaUrl').value.trim()),label=$('mediaText').value.trim();
   if(!url){$('mediaUrl').setCustomValidity('آدرس HTTPS معتبر لازم است');$('mediaUrl').reportValidity();return}
   $('mediaUrl').setCustomValidity('');if(mediaMode==='image'&&!label){$('mediaText').setCustomValidity('Alt Text لازم است');$('mediaText').reportValidity();return}
   $('mediaText').setCustomValidity('');dialog.close();
   if(mediaMode==='image'){
     const caption=$('imageCaption').value.trim();
     if(activeImage){activeImage.src=url;activeImage.alt=label;
       let fig=activeImage.closest('figure'),fc=fig?.querySelector('figcaption');
       if(!fig){fig=document.createElement('figure');activeImage.replaceWith(fig);fig.append(activeImage)}
       if(caption){if(!fc){fc=document.createElement('figcaption');fig.append(fc)}fc.textContent=caption}else fc?.remove();
     }else{restoreSelection();const markup=`<figure><img src="${escape(url)}" alt="${escape(label)}" loading="lazy">${caption?`<figcaption>${escape(caption)}</figcaption>`:''}</figure><p><br></p>`;
       document.execCommand('insertHTML',false,markup)}
   }else if(activeLink){activeLink.href=url;activeLink.textContent=label||activeLink.textContent||url;
   }else{restoreSelection();const selected=window.getSelection()?.toString().trim();document.execCommand('insertHTML',false,`<a href="${escape(url)}" rel="noopener noreferrer">${escape(label||selected||url)}</a>`)}
   markEdited();
 });
 $('mediaUrl').addEventListener('input',()=>{$('mediaUrl').setCustomValidity('')});
 $('mediaText').addEventListener('input',()=>{$('mediaText').setCustomValidity('')});
 $('requestChanges').onclick=async()=>{const feedback=prompt('اصلاحات لازم را مشخص کن:');if(feedback===null||!feedback.trim())return;form.elements.reviewer_feedback.value=feedback.trim();await save('needs_changes')};$('previewArticle').onclick=async()=>{if(!current)return;const preview=window.open('about:blank','_blank');if(!preview)return;preview.opener=null;if(dirty&&!await save(current.status||'draft')){preview.close();return}preview.location.href=`article-preview.html?id=${encodeURIComponent(current.id)}`};$('revisionHistory').onclick=async()=>{if(!current)return;const panel=$('revisionPanel');panel.classList.remove('hidden');panel.innerHTML='<p>در حال بارگیری نسخه‌ها…</p>';const {data,error}=await client.from('article_revisions').select('revision,edited_by,created_at,snapshot').eq('article_id',current.id).order('revision',{ascending:false}).limit(20);if(error){panel.innerHTML=`<p>${escape(error.message)}</p>`;return}panel.innerHTML=data?.length?data.map(r=>`<div class="revision-row"><span>نسخهٔ ${r.revision} · ${escape(new Date(r.created_at).toLocaleString())}</span><button type="button" class="small-btn" data-restore-revision="${r.revision}">بازیابی</button></div>`).join(''):'<p>نسخه‌ای ثبت نشده است.</p>';panel.querySelectorAll('[data-restore-revision]').forEach(b=>b.onclick=()=>{const snap=data.find(x=>x.revision===Number(b.dataset.restoreRevision))?.snapshot;if(!snap)return;for(const [k,id] of Object.entries({title:'articleTitle',excerpt:'articleExcerpt',slug:'articleSlug',category:'articleCategory',tags:'articleTags',locale:'articleLocale',author_name:'authorName',seo_title:'seoTitle',focus_query:'focusQuery',meta_description:'metaDescription',canonical_url:'canonicalUrl',og_image_url:'ogImageUrl',cover_url:'coverUrl',mobile_cover_url:'mobileCoverUrl',cover_alt:'coverAlt'}))if(snap[k]!=null)$(id).value=snap[k];$('articleSkills').value=(snap.skills||[]).join(', ');$('articleTags').value=(snap.tags||[]).join(', ');for(const o of $('articleLevels').options)o.selected=(snap.levels||[]).includes(o.value);for(const o of $('articleRelations').options)o.selected=(snap.related_resource_ids||[]).includes(o.value);$('articleBody').innerHTML=snap.body_html||'';dirty=true;$('saveState').textContent=`نسخهٔ ${snap.revision||b.dataset.restoreRevision} بازیابی شد؛ ذخیره لازم است.`;seo()})};
 if(window.visualViewport){const syncViewport=()=>{const inset=Math.max(0,window.innerHeight-window.visualViewport.height-window.visualViewport.offsetTop);document.documentElement.style.setProperty('--studio-keyboard-inset',`${Math.round(inset)}px`);document.body.classList.toggle('studio-keyboard-open',inset>120)};window.visualViewport.addEventListener('resize',syncViewport);window.visualViewport.addEventListener('scroll',syncViewport);syncViewport()}
 setEditorMode(false);window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});try{await loadList()}catch(e){say(e.message||'فهرست بارگیری نشد.',true)}
});
