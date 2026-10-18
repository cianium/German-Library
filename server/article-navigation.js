// SSR articles share the same four primary destinations as assets/site-ui.js.
// Article discovery stays available in the secondary menu and article pages.
const destinations=[
  {href:'/levels.html',label:'سطح',desktopLabel:'سطح',icon:'<path d="M4 4h16v16H4zM4 10h16M10 4v16"/>'},
  {href:'/media.html',label:'مکمل',desktopLabel:'مکمل',icon:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>'},
  {href:'/',label:'خانه',desktopLabel:'خانه',icon:'<path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/>'},
  {href:'/books.html',label:'کتابخانه',desktopLabel:'کتابخانه',icon:'<path d="M4 5v14M9 5v14M14 5v14M19 5v14M2 20h20"/>'}
];
const active=a=>a.href==='/media.html'?' class="active" aria-current="page"':'';
const svg=content=>`<svg viewBox="0 0 24 24" aria-hidden="true">${content}</svg>`;
export function desktopNav(){return `<nav class="desktop-nav" aria-label="ناوبری اصلی">${destinations.map(d=>`<a href="${d.href}"${active(d)}>${d.desktopLabel}</a>`).join('')}</nav>`}
export function mobileMenu(){return `<details class="mobile-menu"><summary class="menu-btn" aria-label="باز کردن منو">☰</summary><nav class="mobile-menu-panel" aria-label="منوی موبایل">${destinations.map(d=>`<a href="${d.href}">${d.label}</a>`).join('')}<a href="/articles">مقالات</a><a href="/special.html">منتخب‌های ویژه</a></nav></details>`}
export function mobileBottomNav(){return `<nav class="mobile-bottom-nav" aria-label="ناوبری اصلی موبایل">${destinations.map(d=>`<a href="${d.href}"${active(d)}>${svg(d.icon)}<span>${d.label}</span></a>`).join('')}</nav>`}
