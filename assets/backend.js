(function(){
  const cfg=window.GL_CONFIG||{};
  const BUCKET='resource-files';
  const PENDING_KEY='gl_pending_sync_v7';
  const apiKey=String(cfg.supabasePublishableKey||cfg.supabaseAnonKey||'').trim();
  let client=null,user=null,role='guest',hydrated=false,hydrateFailed=false,status='local',lastError='',syncTimer=null,lastCloudContent=null;
  const signedCache=new Map();
  let syncFlight=null;
  const pendingKey=()=>`${PENDING_KEY}:${cfg.supabaseUrl}:${user?.id||'guest'}`;

  const configured=()=>Boolean(cfg.supabaseUrl&&apiKey&&!/YOUR_|example/i.test(String(cfg.supabaseUrl)+apiKey));
  const cloudAvailable=()=>configured()&&window.supabase&&typeof window.supabase.createClient==='function';
  const demoAllowed=()=>cfg.allowDemoAdmin===true||location.protocol==='file:'||['localhost','127.0.0.1','::1'].includes(location.hostname);
  const isCloudMode=()=>Boolean(client&&configured());
  const currentUser=()=>user;
  const currentRole=()=>role;
  const isStaff=()=>['admin','editor','author'].includes(role);
  const emit=(name,detail={})=>document.dispatchEvent(new CustomEvent(name,{detail}));

  function normalizeTouched(raw={}){
    const uniq=v=>[...new Set(Array.isArray(v)?v.map(String):[])];
    return{levels:uniq(raw.levels),courses:uniq(raw.courses),resources:uniq(raw.resources),coreLevels:uniq(raw.coreLevels)};
  }
  function mergeTouched(a={},b={}){
    const aa=normalizeTouched(a),bb=normalizeTouched(b),merge=(x,y)=>[...new Set([...x,...y])];
    return{levels:merge(aa.levels,bb.levels),courses:merge(aa.courses,bb.courses),resources:merge(aa.resources,bb.resources),coreLevels:merge(aa.coreLevels,bb.coreLevels)};
  }
  function hasTouched(t={}){const n=normalizeTouched(t);return n.levels.length+n.courses.length+n.resources.length+n.coreLevels.length>0}
  function loadPending(){
    try{
      const raw=localStorage.getItem(pendingKey());if(!raw)return null;
      const p=JSON.parse(raw);if(!p||!p.content)return null;
      return{revision:p.revision,at:Number(p.at)||0,touched:normalizeTouched(p.touched),content:window.GL.normalizeContent(p.content)};
    }catch(e){console.warn('Pending sync cache ignored:',e);return null}
  }
  function persistPending(content,touched){
    const t=normalizeTouched(touched);if(!hasTouched(t))return clearPending();
    try{localStorage.setItem(pendingKey(),JSON.stringify({version:2,revision:crypto.randomUUID(),at:Date.now(),touched:t,content:window.GL.normalizeContent(content)}))}catch(e){setStatus('error','ذخیره محلی تغییرات ممکن نشد؛ پیش از بستن صفحه JSON را Export کن.');throw e}
  }
  function clearPending(){try{localStorage.removeItem(pendingKey())}catch(e){}}
  function pendingExists(){return Boolean(loadPending())}

  const setStatus=(s,msg='')=>{status=s;if(msg)lastError=msg;emit('gl:backend-status',{status:s,message:msg,cloud:isCloudMode(),user,role,pending:pendingExists()})};
  const getStatus=()=>({status,lastError,cloud:isCloudMode(),configured:configured(),user,role,pending:pendingExists()});

  function ensureClient(){
    if(client)return client;if(!cloudAvailable())return null;
    client=window.supabase.createClient(cfg.supabaseUrl,apiKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  async function refreshAuth(){
    const c=ensureClient();if(!c){user=null;role='guest';return{user,role}}
    const {data,error}=await c.auth.getSession();if(error)throw error;user=data.session?.user||null;role='guest';
    if(user){const q=await c.from('profiles').select('role').eq('id',user.id).maybeSingle();if(q.error)throw q.error;role=q.data?.role||'learner'}
    return{user,role};
  }
  function rowsToContent(rows){
    const levels={};(rows.levels||[]).forEach(l=>levels[l.code]={code:l.code,titleFa:l.title_fa||'',titleEn:l.title_en||'',description:l.description||'',coreCourseId:null,order:l.sort_order||1});
    const courses=(rows.courses||[]).map(c=>({id:c.id,title:c.title,collection:c.collection||'level',level:c.level_code||'',description:c.description||'',order:c.order_index||1,status:c.status||'published',featured:Boolean(c.featured ?? (c.collection==='special')),bookType:c.book_type||'Sonstige',skills:c.skills||[],coverUrl:c.cover_url||'',coverStoragePath:c.cover_storage_path||'',url:c.book_url||'',storagePath:c.book_storage_path||'',provider:c.provider||''}));
    (rows.courses||[]).forEach(c=>{if(c.is_core&&c.level_code&&levels[c.level_code])levels[c.level_code].coreCourseId=c.id});
    const resources=(rows.resources||[]).map(r=>({id:r.id,title:r.title,description:r.description||'',collection:r.collection||'level',level:r.level_code||'',courseId:r.course_id||'',type:r.type||'Website',skill:r.skill||'Extra Practice',priority:r.priority||'recommended',provider:r.provider||'',url:r.source_url||r.media_url||'',storagePath:r.source_storage_path||r.media_storage_path||'',pricing:r.pricing||'unknown',featured:Boolean(r.featured),status:r.status||'published',order:r.order_index||1,durationMinutes:Number(r.duration_minutes)||0,linkStatus:r.link_status||'unknown',verifiedAt:r.verified_at||'',createdBy:r.created_by||''}));
    return window.GL.normalizeContent({meta:{version:7,source:'supabase'},levels,courses,resources});
  }
  async function fetchContent(){
    const c=ensureClient();if(!c)return null;
    const [levels,courses,resources]=await Promise.all([
      c.from('levels').select('*').order('sort_order'),
      c.from('courses').select('*').order('collection').order('level_code',{nullsFirst:false}).order('order_index'),
      c.from('resources').select('*').order('collection').order('level_code',{nullsFirst:false}).order('order_index')
    ]);
    const failed=[levels,courses,resources].find(x=>x.error);if(failed)throw failed.error;
    return rowsToContent({levels:levels.data,courses:courses.data,resources:resources.data});
  }

  function contentRows(content){
    const levels=Object.values(content.levels).map((l,i)=>({code:l.code,title_fa:l.titleFa||'',title_en:l.titleEn||'',description:l.description||'',sort_order:l.order||i+1}));
    const courses=content.courses.map(x=>({id:x.id,collection:x.collection,level_code:x.level||null,title:x.title,description:x.description||'',featured:Boolean(x.featured),is_core:['level','library'].includes(x.collection)&&content.levels[x.level]?.coreCourseId===x.id,order_index:x.order||1,status:x.status||'published',book_type:x.bookType||'Sonstige',skills:x.skills||[],cover_url:x.coverUrl||'',cover_storage_path:x.coverStoragePath||'',book_url:x.url||'',book_storage_path:x.storagePath||'',provider:x.provider||''}));
    const resources=content.resources.map(r=>({id:r.id,collection:r.collection,level_code:r.level||null,course_id:r.courseId||null,title:r.title,description:r.description||'',type:r.type,skill:r.skill,priority:r.priority,provider:r.provider||'',source_url:r.url||'',source_storage_path:r.storagePath||'',pricing:r.pricing||'unknown',featured:Boolean(r.featured),duration_minutes:Number(r.durationMinutes)||0,link_status:r.linkStatus||'unknown',verified_at:r.verifiedAt||null,order_index:r.order||1,status:r.status||'published'}));
    return{levels,courses,resources};
  }
  const changedRows=(next,prev,key)=>{const old=new Map((prev||[]).map(row=>[row[key],JSON.stringify(row)]));return next.filter(row=>old.get(row[key])!==JSON.stringify(row))};
  function touchedFromDiff(content,base){
    const next=contentRows(content),prev=base?contentRows(base):{levels:[],courses:[],resources:[]};
    const levels=changedRows(next.levels,prev.levels,'code').map(x=>x.code);
    const courses=changedRows(next.courses,prev.courses,'id').map(x=>x.id);
    const resources=changedRows(next.resources,prev.resources,'id').map(x=>x.id);
    const coreLevels=Object.keys(content.levels).filter(level=>!base||content.levels[level]?.coreCourseId!==base.levels?.[level]?.coreCourseId);
    return{levels,courses,resources,coreLevels};
  }
  function mergePendingIntoRemote(remote,pending){
    const merged=window.GL.clone(remote),local=window.GL.normalizeContent(pending.content),t=normalizeTouched(pending.touched);
    for(const code of t.levels){if(local.levels[code])merged.levels[code]=window.GL.clone(local.levels[code])}
    const mergeEntities=(key,ids)=>{
      const idSet=new Set(ids),remoteRows=merged[key].filter(x=>!idSet.has(x.id)),localMap=new Map(local[key].map(x=>[x.id,x]));
      for(const id of ids){const row=localMap.get(id);if(row)remoteRows.push(window.GL.clone(row))}
      merged[key]=remoteRows;
    };
    mergeEntities('courses',t.courses);mergeEntities('resources',t.resources);
    for(const code of t.coreLevels){if(merged.levels[code]&&local.levels[code])merged.levels[code].coreCourseId=local.levels[code].coreCourseId||null}
    return window.GL.normalizeContent(merged);
  }

  async function hydrate(){
    if(hydrated)return getStatus();
    if(!configured()){hydrated=true;setStatus('local');return getStatus()}
    if(!cloudAvailable()){hydrated=true;setStatus('error','Supabase SDK بارگذاری نشد؛ داده محلی استفاده می‌شود.');return getStatus()}
    try{
      setStatus('loading');hydrateFailed=false;await refreshAuth();const remote=await fetchContent();
      if(remote&&Object.keys(remote.levels).length){
        lastCloudContent=window.GL.clone(remote);
        const pending=loadPending();
        if(pending&&user&&isStaff()){
          const merged=mergePendingIntoRemote(remote,pending);window.GL.saveContent(merged,{sync:false});hydrated=true;setStatus('dirty','تغییرات Sync‌نشده محلی بازیابی شد.');
          if(navigator.onLine!==false)setTimeout(()=>retryPendingSync().catch(e=>setStatus('error',e?.message||String(e))),0);
          return getStatus();
        }
        window.GL.saveContent(remote,{sync:false});
      }
      hydrated=true;setStatus('ready');return getStatus();
    }catch(e){hydrated=true;hydrateFailed=true;setStatus('error',e?.message||String(e));return getStatus()}
  }
  async function signIn(email,password){
    const c=ensureClient();if(!c)throw new Error('Supabase تنظیم نشده است.');
    const q=await c.auth.signInWithPassword({email,password});if(q.error)throw q.error;user=q.data.user;await refreshAuth();hydrated=false;await hydrate();return{user,role};
  }
  async function signUp(email,password,displayName=''){
    const c=ensureClient();if(!c)throw new Error('Supabase تنظیم نشده است.');
    const q=await c.auth.signUp({email,password,options:{data:{full_name:String(displayName||'').trim()}}});if(q.error)throw q.error;
    if(q.data.session){user=q.data.user;await refreshAuth()}
    return q.data;
  }
  async function requestPasswordReset(email,redirectTo){
    const c=ensureClient();if(!c)throw new Error('Supabase تنظیم نشده است.');
    const q=await c.auth.resetPasswordForEmail(String(email||'').trim(),{redirectTo});if(q.error)throw q.error;return true;
  }
  async function updatePassword(password){
    const c=ensureClient();if(!c)throw new Error('Supabase تنظیم نشده است.');
    const q=await c.auth.updateUser({password});if(q.error)throw q.error;return q.data;
  }
  async function signOut(){
    const c=ensureClient();if(c){const q=await c.auth.signOut();if(q.error)throw q.error}
    clearTimeout(syncTimer);signedCache.clear();window.GL.clearCloudContent?.();user=null;role='guest';hydrated=false;lastCloudContent=null;setStatus('ready');
  }
  async function requireStaff(){
    await refreshAuth();if(!isCloudMode())return !configured()&&demoAllowed()?{allowed:true,demo:true,role:'demo'}:{allowed:false,reason:'config',role:'guest'};
    if(!user)return{allowed:false,reason:'login',role:'guest'};if(!isStaff())return{allowed:false,reason:'role',role};return{allowed:true,demo:false,role,canManageRoles:role==='admin',canReviewArticles:['admin','editor'].includes(role),canManageResources:true};
  }

  async function syncContentSnapshot(raw,options={}){
    const c=ensureClient();if(!c)return;if(!isStaff())throw new Error('این حساب اجازه ویرایش محتوا ندارد.');
    const content=window.GL.normalizeContent(raw),validation=window.GL.validateContent(content);if(!validation.ok)throw new Error('Content validation failed: '+validation.errors[0]);
    const requested=normalizeTouched(options.touched||touchedFromDiff(content,lastCloudContent));
    if(!hasTouched(requested)){clearPending();lastCloudContent=window.GL.clone(content);setStatus('synced');return getStatus()}
    setStatus('syncing');
    const next=contentRows(content),prev=lastCloudContent?contentRows(lastCloudContent):{levels:[],courses:[],resources:[]};
    const levelSet=new Set(requested.levels),courseSet=new Set(requested.courses),resourceSet=new Set(requested.resources);
    const levelRows=next.levels.filter(x=>levelSet.has(x.code));
    const courseRows=next.courses.filter(x=>courseSet.has(x.id));
    const resourceRows=next.resources.filter(x=>resourceSet.has(x.id));
    const prevCourses=new Map(prev.courses.map(x=>[x.id,x])),prevResources=new Map(prev.resources.map(x=>[x.id,x]));
    const downgradeCourseIds=new Set(courseRows.filter(x=>prevCourses.get(x.id)?.status==='published'&&x.status!=='published').map(x=>x.id));
    const courseBefore=courseRows.filter(x=>!downgradeCourseIds.has(x.id)),courseAfter=courseRows.filter(x=>downgradeCourseIds.has(x.id));
    const earlyResources=resourceRows.filter(x=>prevResources.get(x.id)?.status==='published'&&x.status!=='published');
    const earlyIds=new Set(earlyResources.map(x=>x.id)),lateResources=resourceRows.filter(x=>!earlyIds.has(x.id));
    let q;
    if(levelRows.length){q=await c.from('levels').upsert(levelRows,{onConflict:'code'});if(q.error)throw q.error}
    for(const level of requested.coreLevels){const clear=await c.from('courses').update({is_core:false}).eq('level_code',level).eq('is_core',true);if(clear.error)throw clear.error}
    if(courseBefore.length){q=await c.from('courses').upsert(courseBefore,{onConflict:'id'});if(q.error)throw q.error}
    if(earlyResources.length){q=await c.from('resources').upsert(earlyResources,{onConflict:'id'});if(q.error)throw q.error}
    if(courseAfter.length){q=await c.from('courses').upsert(courseAfter,{onConflict:'id'});if(q.error)throw q.error}
    if(lateResources.length){q=await c.from('resources').upsert(lateResources,{onConflict:'id'});if(q.error)throw q.error}
    if(!options.pendingRevision||loadPending()?.revision===options.pendingRevision)clearPending();lastCloudContent=window.GL.clone(content);setStatus(pendingExists()?'dirty':'synced');emit('gl:content-synced',{at:Date.now(),changed:{levels:levelRows.length,courses:courseRows.length,resources:resourceRows.length}});return getStatus();
  }
  function recordPending(content){
    const normalized=window.GL.normalizeContent(content),existing=loadPending(),delta=touchedFromDiff(normalized,lastCloudContent),touched=mergeTouched(existing?.touched,delta);
    persistPending(normalized,touched);return{content:normalized,touched};
  }
  function scheduleContentSync(content){
    if(!isCloudMode()||!isStaff())return;if(hydrateFailed){setStatus('error','بارگیری اولیه از Cloud ناموفق بود؛ برای جلوگیری از بازنویسی داده‌ها، صفحه را تازه کن.');window.GL.toast?.('بارگیری Cloud ناموفق بود؛ ذخیره متوقف شد. صفحه را تازه کن.');return}let pending;try{pending=recordPending(content)}catch(e){window.GL.toast?.('تغییرات در حافظه است؛ ذخیره محلی ناموفق بود. پیش از خروج Export بگیر.');return}clearTimeout(syncTimer);setStatus('dirty');
    syncTimer=setTimeout(()=>syncPendingState(pending).catch(e=>setStatus('error',e?.message||String(e))),Number(cfg.syncDebounceMs)||1000);
  }
  async function syncPendingState(){
    if(!isCloudMode()||!isStaff())return getStatus();
    if(syncFlight)return syncFlight;
    syncFlight=(async()=>{
      while(loadPending()){
        const remote=await fetchContent();
        // Read the newest edit after the fetch: typing may have continued meanwhile.
        const pending=loadPending();if(!pending||!isStaff())break;
        lastCloudContent=window.GL.clone(remote);
        const merged=mergePendingIntoRemote(remote,pending);
        window.GL.saveContent(merged,{sync:false});
        await syncContentSnapshot(merged,{touched:pending.touched,pendingRevision:pending.revision});
      }
      return getStatus();
    })();
    try{return await syncFlight}finally{syncFlight=null}
  }
  async function retryPendingSync(){return syncPendingState()}

  function safeFileName(name){return String(name||'file').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(-120)||'file'}
  function validateUpload(file){
    if(!file)throw new Error('فایلی انتخاب نشده است.');
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    const types={pdf:'application/pdf',epub:'application/epub+zip',mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',ogg:'audio/ogg',mp4:'video/mp4',webm:'video/webm',txt:'text/plain',vtt:'text/vtt',srt:'application/x-subrip',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
    const contentType=types[ext];if(!contentType)throw new Error('نوع این فایل مجاز نیست.');
    const configuredMax=Number(cfg.maxUploadBytes)||262144000;
    const categoryMax=['jpg','jpeg','png','webp'].includes(ext)?10485760:['txt','vtt','srt'].includes(ext)?5242880:['pdf','epub'].includes(ext)?104857600:['mp3','m4a','wav','ogg'].includes(ext)?157286400:262144000;
    if(file.size>Math.min(configuredMax,categoryMax))throw new Error('حجم فایل برای این نوع بیشتر از حد مجاز است.');
    if(file.type&&file.type!==contentType&&!(['m4a','wav'].includes(ext)&&['audio/x-m4a','audio/x-wav'].includes(file.type)))throw new Error('پسوند و نوع واقعی فایل با هم سازگار نیستند.');
    return contentType;
  }
  async function uploadResourceFile(resourceId,file){
    const c=ensureClient();if(!c)throw new Error('Cloud Mode فعال نیست.');if(!user||!isStaff())throw new Error('این حساب اجازه بارگذاری فایل ندارد.');const contentType=validateUpload(file);
    const rid=String(resourceId||'resource').replace(/[^a-zA-Z0-9_-]+/g,'-'),path=`${role==='author'?`authors/${user.id}/`:''}resources/${rid}/${Date.now()}-${safeFileName(file.name)}`;setStatus('syncing');
    const q=await c.storage.from(BUCKET).upload(path,file,{upsert:false,cacheControl:'3600',contentType});if(q.error){setStatus('error',q.error.message);throw q.error}setStatus(pendingExists()?'dirty':'synced');return path;
  }
  async function deleteStorageObject(path){const c=ensureClient();if(!c||!path)return;if(!isStaff())throw new Error('اجازه حذف فایل را نداری.');if(role==='author'&&!String(path).startsWith(`authors/${user.id}/`))throw new Error('نویسنده فقط می‌تواند فایل‌های پوشه خودش را حذف کند.');const q=await c.storage.from(BUCKET).remove([path]);if(q.error)throw q.error;signedCache.delete(path)}
  async function signedUrl(path,expiresIn=900){
    const c=ensureClient();if(!c||!path)return'';const now=Date.now(),cached=signedCache.get(path);if(cached&&cached.expiresAt>now+30000)return cached.url;
    const q=await c.storage.from(BUCKET).createSignedUrl(path,expiresIn);if(q.error)throw q.error;const url=q.data?.signedUrl||'';signedCache.set(path,{url,expiresAt:now+expiresIn*1000});return url;
  }
  async function resolveResourceUrl(resource){if(!resource)return'';if(resource.storagePath&&isCloudMode()){try{return await signedUrl(resource.storagePath)}catch(e){setStatus('error',e?.message||String(e));return''}}return window.GL.safeExternalUrl(resource.url)}
  async function forceSync(){if(!isCloudMode())return getStatus();if(hydrateFailed)throw new Error('بارگیری اولیه از Cloud ناموفق بود؛ صفحه را تازه کن.');if(!isStaff())throw new Error('دسترسی مدیریت لازم است.');recordPending(window.GL.getContent());return syncPendingState()}

  if(cloudAvailable()){
    const c=ensureClient();c.auth.onAuthStateChange((event)=>{
      hydrated=false;
      if(event==='SIGNED_OUT'){clearTimeout(syncTimer);signedCache.clear();window.GL.clearCloudContent?.();user=null;role='guest';lastCloudContent=null}
      // Supabase auth callbacks run under an auth lock. Re-enter only after it releases.
      setTimeout(()=>refreshAuth().then(()=>emit('gl:auth-changed',{user,role})).catch(e=>setStatus('error',e?.message||String(e))),0);
    });
    window.addEventListener('online',()=>{if(isStaff()&&pendingExists())retryPendingSync().catch(e=>setStatus('error',e?.message||String(e)))});
  }
  window.GLBackend={BUCKET,configured,demoAllowed,isCloudMode,currentUser,currentRole,isStaff,getClient:ensureClient,getStatus,hydrate,refreshAuth,requireStaff,signIn,signUp,requestPasswordReset,updatePassword,signOut,scheduleContentSync,syncContentSnapshot,forceSync,retryPendingSync,uploadResourceFile,deleteStorageObject,resolveResourceUrl,signedUrl};
})();
