GL.boot(()=>{
  const KEY='gl_roadmap_v1',c=GL.getContent(),$=id=>document.getElementById(id);
  const LABELS={'Kursbuch':['کتاب درسی','Kursbuch'],'Audio / Video':['صوت و ویدیوی کتاب','Audio / Video'],'Arbeitsbuch':['کتاب کار','Arbeitsbuch'],'Wortschatz / Grammatik':['واژگان و دستور','Wortschatz / Grammatik'],'تمرین مهارت':['تمرین مهارت‌ها','Extra Practice'],'Prüfung':['آمادگی آزمون','Prüfung']};
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return v&&typeof v==='object'?v:{}}catch(e){return{}}};
  const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){GL.toast('ذخیرهٔ پیشرفت در این مرورگر ممکن نیست.')}};
  let level=GL.safeLevel(GL.qs('level')||'A1');
  function render(){
    document.title=`مسیر ${level} · Lexipfad`;
    $('levelSwitcher').innerHTML=GL.LEVELS.map(code=>`<a class="level-chip ${code===level?'active':''}" href="roadmap.html?level=${code}" data-level="${code}" ${code===level?'aria-current="page"':''}>${code}</a>`).join('');
    $('pathLevel').textContent=level;
    const steps=GL.getRoadmap(c,level),done=new Set((read()[level]||[]).map(String));
    $('rmEmpty').classList.toggle('hidden',steps.length>0);$('rmPath').hidden=!steps.length;$('resetProgress').hidden=!steps.length;document.querySelector('.rm-progress').hidden=!steps.length;
    const first=steps.findIndex(s=>!done.has(s.label));
    $('rmPath').innerHTML=steps.map((s,i)=>{const [fa,de]=LABELS[s.label]||[s.label,''],isDone=done.has(s.label),next=i===first;
      return `<li class="rm-step${isDone?' is-done':''}${next?' is-next':''}"><span class="rm-dot" aria-hidden="true">${isDone?'✓':i+1}</span><div class="rm-card"><div class="rm-head"><strong>${GL.esc(fa)}</strong>${de?`<small class="ltr">${GL.esc(de)}</small>`:''}${next?'<span class="priority-badge">قدم بعدی</span>':''}</div><a class="rm-link ltr" href="${GL.esc(s.href)}">${GL.esc(s.title)}</a><label class="rm-check"><input type="checkbox" data-step="${GL.esc(s.label)}" ${isDone?'checked':''}><span>انجام شد</span></label></div></li>`}).join('');
    const pct=steps.length?Math.round(100*steps.filter(s=>done.has(s.label)).length/steps.length):0;
    $('rmBar').value=pct;$('rmLabel').textContent=steps.length?`${pct}٪ از مسیر ${level} (${steps.filter(s=>done.has(s.label)).length} از ${steps.length} قدم)`:'';
    $('pathSummary').textContent=steps.length?(first<0?'همهٔ قدم‌ها را رفته‌ای. به سطح بعد برو یا مرور کن.':'قدم‌ها به ترتیب پیشنهادی‌اند؛ راهنما هستند، نه قفل.'):'';
  }
  $('rmPath').addEventListener('change',e=>{const b=e.target.closest('[data-step]');if(!b)return;const all=read(),set=new Set((all[level]||[]).map(String));b.checked?set.add(b.dataset.step):set.delete(b.dataset.step);all[level]=[...set];write(all);render();$('rmPath').querySelector(`[data-step="${CSS.escape(b.dataset.step)}"]`)?.focus()});
  $('resetProgress').addEventListener('click',()=>{if(!confirm('پیشرفت این سطح پاک شود؟'))return;const all=read();delete all[level];write(all);render()});
  $('levelSwitcher').addEventListener('click',e=>{const a=e.target.closest('[data-level]');if(!a)return;e.preventDefault();level=a.dataset.level;history.replaceState(null,'',`roadmap.html?level=${level}`);render()});
  render();
});
