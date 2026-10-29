GL.boot(()=>{
  const c=GL.getContent(),type=document.getElementById('mediaType'),lev=document.getElementById('mediaLevel'),q=document.getElementById('mediaSearch'),shelves=document.getElementById('mediaShelves'),count=document.getElementById('mediaCount');
  const groups=[['Film','فیلم‌ها'],['Series','سریال‌ها'],['Podcast','پادکست‌ها'],['Article','مقاله‌های منتخب']];
  lev.value=GL.LEVELS.includes(GL.qs('level'))?GL.qs('level'):'';
  function syncTabs(){document.querySelectorAll('[data-media-type]').forEach(x=>{const active=x.dataset.mediaType===type.value;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))})}
  function render(){
    const term=q.value.trim().toLocaleLowerCase('fa');
    const rows=GL.getMedia(c).filter(r=>(!type.value||r.type===type.value)&&(!lev.value||r.level===lev.value)&&(!term||`${r.title} ${r.description} ${r.provider}`.toLocaleLowerCase('fa').includes(term)));
    count.textContent=`${rows.length} مورد`;
    const visible=groups.map(([key,label])=>[key,label,rows.filter(r=>r.type===key)]).filter(([, ,items])=>items.length);
    shelves.innerHTML=visible.length?visible.map(([key,label,items])=>`<section class="media-shelf" aria-labelledby="media-${key}"><div class="section-head"><div><h2 class="section-title" id="media-${key}">${label}</h2><p class="section-subtitle">${items.length} انتخاب</p></div></div><div class="media-horizontal-grid">${items.map(r=>GL.resourceCard(r,{content:c})).join('')}</div></section>`).join(''):'<div class="neo-card empty-state full-width"><h3>محتوایی برای این فیلتر ثبت نشده</h3><p>مدیر می‌تواند فیلم، سریال، پادکست و مقاله اضافه کند.</p></div>';
  }
  document.querySelectorAll('[data-media-type]').forEach(b=>b.addEventListener('click',()=>{type.value=b.dataset.mediaType;syncTabs();render()}));
  type.addEventListener('change',()=>{syncTabs();render()});lev.addEventListener('change',render);q.addEventListener('input',render);syncTabs();render();
});
