// SSR articles share the same five primary destinations as assets/site-ui.js.
const destinations=[
  {href:'/',label:'خانه',icon:'<path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/>'},
  {href:'/levels.html',label:'سطوح',icon:'<path d="M4 4h16v16H4zM4 10h16M10 4v16"/>'},
  {href:'/books.html',label:'کتابخانه',icon:'<path d="M4 5v14M9 5v14M14 5v14M19 5v14M2 20h20"/>'},
  {href:'/media.html',label:'رسانه',icon:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>'},
  {href:'/articles',label:'مقالات',icon:'<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 1 5 17.5z"/><path d="M9 7h7m-7 4h7m-7 4h5"/>'}
];
const active=a=>a.href==='/articles'?' class="active" aria-current="page"':'';
const svg=content=>`<svg viewBox="0 0 24 24" aria-hidden="true">${content}</svg>`;
export function desktopNav(){return `<nav class="desktop-nav" aria-label="ناوبری اصلی">${destinations.map(d=>`<a href="${d.href}"${active(d)}>${d.label}</a>`).join('')}</nav>`}
export function mobileMenu(){return `<details class="mobile-menu"><summary class="menu-btn" aria-label="باز کردن منو">☰</summary><nav class="mobile-menu-panel" aria-label="منوی موبایل">${destinations.map(d=>`<a href="${d.href}"${active(d)}>${d.label}</a>`).join('')}<a href="/special.html">منتخب‌های ویژه</a></nav></details>`}
export function mobileBottomNav(){return `<nav class="mobile-bottom-nav" aria-label="ناوبری اصلی موبایل">${destinations.map(d=>`<a href="${d.href}"${active(d)}>${svg(d.icon)}<span>${d.label}</span></a>`).join('')}</nav>`}
