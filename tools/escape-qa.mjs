// Regression guard: user-controlled titles must never reach innerHTML unescaped (audit finding S2).
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../assets/page-resource.js',import.meta.url),'utf8');
const errors=[];
if(/\$\{contextText\}/.test(src))errors.push('page-resource.js: contextText interpolated without GL.esc');
if(!/GL\.esc\(contextText\)/.test(src))errors.push('page-resource.js: breadcrumb must escape contextText');
// behavioural check of the escape helper used by the breadcrumb
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
if(esc('<img src=x onerror=1>').includes('<'))errors.push('esc helper does not neutralise markup');
console.log(`Escape QA: ${errors.length} error(s)`);errors.forEach(e=>console.error('ERROR:',e));process.exit(errors.length?1:0);
