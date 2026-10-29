import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'dist');
const required=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY'];
for(const name of required){
  if(!String(process.env[name]||'').trim()){
    console.error(`Missing required production environment variable: ${name}`);
    process.exit(1);
  }
}
const supabaseUrl=String(process.env.SUPABASE_URL).trim().replace(/\/+$/,'');
const publishableKey=String(process.env.SUPABASE_PUBLISHABLE_KEY).trim();
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)){
  console.error('SUPABASE_URL must be an https://<project-ref>.supabase.co URL.');
  process.exit(1);
}
if(!publishableKey.startsWith('sb_publishable_')){
  console.error('SUPABASE_PUBLISHABLE_KEY must use a modern sb_publishable_ key for production.');
  process.exit(1);
}
const rawSite=String(process.env.SITE_URL||process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL||'').trim();
const normalizeSiteUrl=value=>{
  if(!value)return '';
  const candidate=/^https?:\/\//i.test(value)?value:`https://${value}`;
  try{const u=new URL(candidate);return `${u.protocol}//${u.host}`;}catch{return ''}
};
const siteUrl=normalizeSiteUrl(rawSite);

fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const file of ['index.html','level.html','course.html','resource.html','resources.html','books.html','levels.html','roadmap.html','media.html','special.html','admin.html','login.html','reset-password.html','signup.html','author-request.html','article-studio.html','article-preview.html','404.html','site.webmanifest','robots.txt','_headers']){
  fs.copyFileSync(path.join(root,file),path.join(out,file));
}
for(const dir of ['assets','data']) fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true});

// Ship only published catalog entries. Draft metadata must not enter public fallback JS.
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'data/content.js'),'utf8'),sandbox);
const catalog=sandbox.window.GERMAN_LIBRARY_CONTENT;
catalog.courses=catalog.courses.filter(c=>c.status==='published');
const publishedCourseIds=new Set(catalog.courses.map(c=>c.id));
catalog.resources=catalog.resources.filter(r=>r.status==='published'&&(!r.courseId||publishedCourseIds.has(r.courseId)));
for(const level of Object.values(catalog.levels))if(!publishedCourseIds.has(level.coreCourseId))level.coreCourseId=null;
fs.writeFileSync(path.join(out,'data/content.js'),'window.GERMAN_LIBRARY_CONTENT='+JSON.stringify(catalog)+';\n');

const config=`/* Generated production runtime config. Never place a Supabase secret/service_role key here. */\nwindow.GL_CONFIG={\n  allowDemoAdmin:false,\n  supabaseUrl:${JSON.stringify(supabaseUrl)},\n  supabasePublishableKey:${JSON.stringify(publishableKey)},\n  supabaseAnonKey:"",\n  syncDebounceMs:350,\n  maxUploadBytes:262144000\n};\n`;
fs.writeFileSync(path.join(out,'assets/runtime-config.js'),config);

if(siteUrl){
  const robots=`User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /login.html\nDisallow: /reset-password.html\nDisallow: /article-studio.html\nDisallow: /article-preview.html\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  fs.writeFileSync(path.join(out,'robots.txt'),robots);
}else{
  console.warn('SITE_URL/VERCEL_URL is unavailable; sitemap.xml was not generated for this build.');
}
console.log(`Production bundle created: ${out}`);
console.log(siteUrl?`Canonical site base for sitemap: ${siteUrl}`:'Sitemap skipped (site URL unknown).');
