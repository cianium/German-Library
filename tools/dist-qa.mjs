import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const dist=path.join(root,'dist');
const required=['index.html','level.html','course.html','resource.html','resources.html','books.html','levels.html','roadmap.html','media.html','special.html','admin.html','login.html','article-studio.html','article-preview.html','404.html','site.webmanifest','assets/app.js','assets/backend.js','assets/article-studio.js','assets/article-preview.js','assets/runtime-config.js','assets/styles.css','data/content.js'];
const forbiddenExt=new Set(['.sql','.md','.bak']);
const errors=[];
if(!fs.existsSync(dist)) errors.push('dist/ does not exist');
for(const rel of required) if(!fs.existsSync(path.join(dist,rel))) errors.push(`Missing dist/${rel}`);
function walk(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
}
for(const file of walk(dist)) if(forbiddenExt.has(path.extname(file))) errors.push(`Dev/private file leaked into dist: ${path.relative(dist,file)}`);
const cfg=fs.existsSync(path.join(dist,'assets/runtime-config.js'))?fs.readFileSync(path.join(dist,'assets/runtime-config.js'),'utf8'):'';
if(!/supabasePublishableKey:"sb_publishable_/.test(cfg)) errors.push('Production publishable key was not injected');
if(/supabasePublishableKey:\s*"(?:sb_secret_|service[_-]?role)/i.test(cfg)||/supabaseAnonKey:\s*"(?:sb_secret_|service[_-]?role)/i.test(cfg)) errors.push('Secret/service-role material detected in public config');
if(/allowDemoAdmin:true/.test(cfg)) errors.push('Demo Admin is enabled in production config');
const html=required.filter(x=>x.endsWith('.html')&&x!=='404.html');
for(const rel of html){const s=fs.readFileSync(path.join(dist,rel),'utf8');if(!s.includes('@supabase/supabase-js@2.117.2'))errors.push(`${rel}: Supabase SDK is not pinned`)}
console.log(`Dist QA: ${errors.length} error(s)`);
for(const e of errors)console.error('ERROR:',e);
process.exit(errors.length?1:0);
