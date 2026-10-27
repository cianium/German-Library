GL.boot(()=>{
  const c=GL.getContent(),level=GL.safeLevel(GL.qs('level')),L=c.levels[level];document.title=`${level} · Lexipfad`;document.getElementById('crumbLevel').textContent=level;document.getElementById('levelTitle').innerHTML=`Deutsch <span class="ltr">${level}</span> · ${GL.esc(L.titleFa)}`;document.getElementById('levelDesc').textContent=L.description;
  const all=`resources.html?level=${encodeURIComponent(level)}`;['allNav','mobileAll','allResourcesLink','searchLink','bottomSearch'].forEach(id=>(document.getElementById(id)||{}).href=all);
  document.getElementById('levelSwitcher').innerHTML=GL.LEVELS.map(code=>`<a class="level-chip ${code===level?'active':''}" href="level.html?level=${code}" ${code===level?'aria-current="page"':''}>${code}</a>`).join('');
  const core=GL.getCoreCourse(c,level),coreSlot=document.getElementById('coreSlot');
  if(core){const assets=GL.getCourseResources(c,core.id);coreSlot.innerHTML=`<article class="neo-card course-card"><div class="course-card-top">${GL.coverMarkup(core)}<div class="course-copy"><div class="eyebrow"><span class="eyebrow-dot"></span> ضروری</div><h3 class="ltr">${GL.esc(core.title)}</h3><p>${GL.esc(core.description)}</p><div class="meta-row"><span class="meta-pill">${assets.length} منبع</span><span class="meta-pill">بسته کتاب</span></div></div></div><div class="course-assets-preview">${assets.slice(0,6).map(r=>`<a class="asset-line" href="${GL.resourceHref(r)}"><span class="asset-icon">${GL.typeIcon(r.type)}</span><div><strong class="ltr">${GL.esc(r.title)}</strong><small>${GL.esc(r.type)} · ${GL.pricingLabel(r.pricing)}</small></div><span class="asset-arrow">←</span></a>`).join('')||'<div class="empty-state"><p>هنوز منابع این کتاب ثبت نشده‌اند.</p></div>'}</div><div class="hero-actions"><a class="primary-btn" href="${GL.courseHref(core)}">باز کردن کتاب اصلی</a></div></article>`}
  else document.getElementById('core').hidden=true;
  const others=GL.getLevelCourses(c,level,{includeCore:false});
  document.getElementById('otherCourses').hidden=!others.length;
  document.getElementById('otherCourseSlot').innerHTML=others.map(x=>GL.courseCard(x,c)).join('');
  const steps=GL.getRoadmap(c,level);
  document.getElementById('roadmap').hidden=!steps.length;
  document.getElementById('roadmapSteps').innerHTML=steps.map((step,i)=>`<li><a href="${step.href}"><span class="step-number">${i+1}</span><div><strong>${GL.esc(step.label)}</strong><small dir="auto">${GL.esc(step.title)}</small></div></a></li>`).join('');
  document.querySelectorAll('a[href="#core"]').forEach(a=>{if(!core){if(others.length){a.href='#otherCourses';a.textContent='کتاب‌ها'}else{a.hidden=true}}});
  const skillDescriptions={Hören:'شنیدار و درک مکالمه',Lesen:'خواندن و درک متن',Grammatik:'قواعد و ساختار',Wortschatz:'واژگان کاربردی',Sprechen:'مکالمه',Schreiben:'نوشتن',Aussprache:'تلفظ',Prüfung:'آمادگی آزمون','Extra Practice':'تمرین بیشتر'};
  const active=GL.activeSkills(c,level),skillGrid=document.getElementById('skillGrid');skillGrid.innerHTML=active.length?active.map(x=>`<a class="neo-card skill-card" href="resources.html?level=${level}&skill=${encodeURIComponent(x.skill)}"><span class="resource-icon">${GL.typeIcon(x.skill==='Hören'?'Audio':x.skill==='Lesen'?'Transcript':'Link')}</span><h3>${GL.esc(x.skill)}</h3><p>${GL.esc(skillDescriptions[x.skill]||'منابع تکمیلی')}</p><span class="skill-count">${x.count} منبع</span></a>`).join(''):'<div class="neo-card empty-state full-width"><h3>منبع تکمیلی ثبت نشده</h3></div>';
  document.getElementById('skills').hidden=!active.length;
  document.querySelectorAll('a[href="#skills"]').forEach(a=>a.hidden=!active.length);
  const media=GL.getMedia(c).filter(r=>r.level===level);document.getElementById('levelMedia').hidden=!media.length;document.getElementById('levelMediaGrid').innerHTML=media.map(r=>GL.resourceCard(r,{content:c})).join('');document.getElementById('levelMediaLink').href=`media.html?level=${level}`;
  const supplementary=GL.getSupplementary(c,level);
  const rec=supplementary.filter(r=>r.priority!=='extra').sort((a,b)=>Number(b.priority==='essential')-Number(a.priority==='essential')||Number(b.featured)-Number(a.featured)||GL.byOrder(a,b)).slice(0,6);
  document.getElementById('recommended').hidden=!rec.length;
  document.getElementById('recommendedSlot').innerHTML=rec.map(r=>GL.resourceCard(r,{content:c})).join('');
  const optional=supplementary.filter(r=>r.priority==='extra');
  document.getElementById('optional').hidden=!optional.length;
  document.getElementById('optionalSlot').innerHTML=optional.map(r=>GL.resourceCard(r,{content:c})).join('');

  GL.hydrateCovers();
});
