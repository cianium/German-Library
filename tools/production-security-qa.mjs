import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const vercel=JSON.parse(read('vercel.json'));
const packageJson=JSON.parse(read('package.json'));
const lock=JSON.parse(read('package-lock.json'));
const migration=read('backend/migrations/20261027_s1_author_resource_ownership.sql');
const validation=read('backend/validation/s1_author_ownership_check.sql');
const backend=read('assets/backend.js');
const vendor=fs.readFileSync(new URL('assets/vendor/supabase-js-2.117.2.js',root));

assert.equal(crypto.createHash('sha256').update(vendor).digest('hex'),'59d39487c3589843b410322d8a3d562ce022aba1e5ccb16898ef3fb2a0da2ecd','vendored Supabase SDK hash');
assert.equal(packageJson.dependencies['@supabase/supabase-js'],'2.117.2','Supabase dependency is exact');
assert.equal(lock.packages['node_modules/@supabase/supabase-js'].version,'2.117.2','lockfile resolves exact Supabase SDK');
assert.equal(packageJson.engines.node,'>=22','supported production Node baseline');

const globalHeaders=vercel.headers.find(x=>x.source==='/(.*)')?.headers||[];
const csp=globalHeaders.find(x=>x.key==='Content-Security-Policy')?.value||'';
assert(csp.includes("script-src 'self'"),'CSP restricts scripts to same origin');
assert(!csp.includes('cdn.jsdelivr'),'CSP does not trust the previous CDN');
const htmlFiles=fs.readdirSync(root).filter(x=>x.endsWith('.html'));
assert(!htmlFiles.map(read).some(x=>x.includes('cdn.jsdelivr.net')),'HTML has no executable CDN dependency');

assert.match(migration,/created_by uuid references auth\.users\(id\)[\s\S]*default auth\.uid\(\)/i);
assert.match(migration,/security definer[\s\S]*set search_path=''/i);
assert.match(migration,/status in \('draft','archived'\)/i);
assert.match(migration,/name like 'authors\/'\|\|\(select auth\.uid\(\)\)::text\|\|'\/%'/i);
assert.match(migration,/allowed_mime_types=array\[/i);
assert.match(validation,/resources update staff or own draft/i);
assert.match(backend,/role==='author'\?`authors\/\$\{user\.id\}`:'resources'/);
assert.match(backend,/if\(file\.type&&file\.type!==contentType/);

for(const path of ['api/article.js','api/articles.js','api/sitemap.js','api/health.js']){
  const source=read(path);
  assert(source.includes('allowReadOnly'),`${path} rejects mutation methods`);
  assert(source.includes('prepareRequest'),`${path} returns a request ID`);
}

const makeResponse=()=>({headers:{},statusCode:0,body:'',setHeader(k,v){this.headers[k]=v},end(v=''){this.body=v},status(code){this.statusCode=code;return this},send(v=''){this.body=v;return this}});
for(const path of ['api/article.js','api/articles.js','api/sitemap.js','api/health.js']){
  const {default:handler}=await import(new URL(path,root));
  const response=makeResponse();
  await handler({method:'POST',url:'/',headers:{}},response);
  assert.equal(response.statusCode,405,`${path} POST returns 405`);
  assert.equal(response.headers.Allow,'GET, HEAD',`${path} advertises safe methods`);
  assert(response.headers['X-Request-ID'],`${path} includes request ID`);
}

console.log('Production security QA PASS: supply chain, CSP, API methods/request IDs, ownership RLS and upload policy');
