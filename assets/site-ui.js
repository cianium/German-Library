/* V7.3: shared presentation; content ownership remains in the existing catalog. */
(()=>{
  const key='gl_theme_v73';
  const icons={
    home:'<path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/>',
    levels:'<path d="M4 4h16v16H4zM4 10h16M10 4v16"/>',
    library:'<path d="M4 5v14M9 5v14M14 5v14M19 5v14M2 20h20"/>',
    media:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>',
    articles:'<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 1 5 17.5z"/><path d="M5 6H3v14h14M9 7h7m-7 4h7m-7 4h5"/>',
    special:'<path d="m12 2 2.8 6.2L22 9l-5.2 4.7 1.5 7.3L12 17.4 5.7 21l1.5-7.3L2 9l7.2-.8z"/>',
    dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    tools:'<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.2 2.2m8.4 8.4 2.2 2.2m0-12.8-2.2 2.2m-8.4 8.4-2.2 2.2"/><circle cx="12" cy="12" r="4"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8.1 8.1 0 1 0 20 14.5Z"/>'
  };
  const svg=name=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.home}</svg>`;
  function applyTheme(next){document.documentElement.dataset.theme=next;try{localStorage.setItem(key,next)}catch(e){};document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.innerHTML=svg(next==='dark'?'sun':'moon');b.setAttribute('aria-label',next==='dark'?'فعال کردن حالت روشن':'فعال کردن حالت تیره');b.title=b.getAttribute('aria-label')});document.querySelector('meta[name=theme-color]')?.setAttribute('content',next==='dark'?'#1d241f':'#f8f5ee')}
  const stored=(()=>{try{return localStorage.getItem(key)}catch(e){return null}})();
  applyTheme(stored==='dark'?'dark':'light');
  document.querySelectorAll('.header-actions').forEach(box=>{if(box.querySelector('[data-theme-toggle]'))return;const b=document.createElement('button');b.type='button';b.className='icon-btn theme-toggle';b.dataset.themeToggle='';box.prepend(b);b.addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'))});
  applyTheme(document.documentElement.dataset.theme);
  const navItems=[['index.html','home','خانه'],['levels.html','levels','سطوح'],['books.html','library','کتابخانه'],['media.html','media','رسانه'],['articles','articles','مقالات']];
  const current=location.pathname.split('/').pop()||'index.html';
  const workspacePages=new Set(['admin.html','article-studio.html','article-preview.html','login.html','signup.html','author-request.html']);
  const isWorkspace=workspacePages.has(current);
  const activeKey=['levels.html','level.html','resources.html','resource.html','roadmap.html'].includes(current)?'levels':current==='media.html'?'media':current==='books.html'||current==='course.html'||current==='special.html'?'library':current==='articles'||current==='article.html'||location.pathname.startsWith('/articles')?'articles':'home';
  if(!isWorkspace){
    document.body.classList.add('public-page');
    document.querySelectorAll('.header-actions').forEach(box=>{
      let search=box.querySelector('a[href^="resources.html"]');
      if(!search){search=document.createElement('a');search.href='resources.html';search.className='icon-btn public-search-link';box.insertBefore(search,box.querySelector('.mobile-menu')||null)}
      search.innerHTML=svg('search');search.setAttribute('aria-label','جست‌وجوی منابع');search.title='جست‌وجوی منابع';
      if(!box.querySelector('[data-account-link]')){const account=document.createElement('a');account.className='icon-btn public-account-link';account.dataset.accountLink='';account.innerHTML=svg('user');box.insertBefore(account,box.querySelector('.mobile-menu')||null)}
    });
    const updateAccount=()=>{const role=window.GLBackend?.currentRole?.()||'guest',staff=['admin','editor','author'].includes(role);document.querySelectorAll('[data-account-link]').forEach(a=>{a.href=staff?(role==='author'?'article-studio.html':'admin.html'):'login.html';a.setAttribute('aria-label',staff?'ورود به فضای کاری':'ورود به حساب');a.title=a.getAttribute('aria-label')})};
    updateAccount();document.addEventListener('gl:auth-changed',updateAccount);
    if(window.visualViewport){const syncKeyboard=()=>document.body.classList.toggle('keyboard-open',window.visualViewport.height<window.innerHeight*.72);window.visualViewport.addEventListener('resize',syncKeyboard);window.visualViewport.addEventListener('scroll',syncKeyboard);syncKeyboard()}
  }
  document.querySelectorAll('.mobile-bottom-nav:not(.admin-mobile-nav)').forEach(nav=>{
    nav.classList.add('floating-glass-nav');
    nav.innerHTML=navItems.map(([href,icon,label])=>`<a href="${href}" ${activeKey===icon?'class="active" aria-current="page"':''}>${svg(icon)}<span>${label}</span></a>`).join('');
  });
  document.querySelectorAll('.desktop-nav').forEach(nav=>{if(nav.closest('.admin-page'))return;nav.innerHTML=navItems.map(([href,icon,label])=>`<a href="${href}" ${activeKey===icon?'class="active" aria-current="page"':''}>${label}</a>`).join('')});
  document.querySelectorAll('.mobile-menu-panel').forEach(nav=>{nav.innerHTML=navItems.map(([href,icon,label])=>`<a href="${href}" ${activeKey===icon?'class="active" aria-current="page"':''}>${label}</a>`).join('')+'<a href="special.html">منتخب‌های ویژه</a>'});
  // Public identity links are deliberately explicit; unspecified social accounts are not invented.
  document.querySelectorAll('footer.footer').forEach(footer=>{
    footer.innerHTML=`<div class="footer-grid"><div class="footer-intro"><a class="footer-brand" href="index.html"><span class="brand-mark">GL</span><strong>German Library</strong></a><p>کتاب‌ها در کتابخانه، تمرین‌ها در هر سطح و رسانه‌ها در بخش جدا؛ یادگیری بدون سردرگمی.</p></div><nav class="footer-links" aria-label="پیوندهای فوتر"><a href="levels.html">سطوح A1–C2</a><a href="books.html">کتابخانه کتاب‌ها</a><a href="resources.html">تمرین مهارت‌ها</a><a href="media.html">رسانه و مطالعه</a><a href="articles">مقالات آموزشی</a><a href="signup.html">همکاری به‌عنوان نویسنده</a><a href="special.html">منتخب‌های ویژه</a></nav><div class="footer-social"><strong>ارتباط با سازنده</strong><a href="https://github.com/cianium" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="https://kiankhayat.me" target="_blank" rel="noopener noreferrer">Website ↗</a></div></div><div class="footer-bottom"><span>German Library · v3</span><span>Designed & built by <strong class="footer-signature">Kian</strong></span></div>`;
  });
})();
