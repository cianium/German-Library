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
const hardening=read('backend/migrations/20261028_v33_production_hardening.sql');
const hardeningValidation=read('backend/validation/v33_production_hardening_check.sql');
const invokerRpc=read('backend/migrations/20261029_v34_admin_rpc_invoker.sql');
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
assert.match(hardening,/allowed_mime_types=array\[/i);
assert.match(hardening,/article_assets_article_id_idx/i);
assert.match(validation,/new resource policies installed/i);
assert.match(hardeningValidation,/resource-files/i);
assert.match(backend,/role==='author'\?`authors\/\$\{user\.id\}\/`:''/);
assert.match(backend,/if\(file\.type&&file\.type!==contentType/);

for(const required of [
  'security invoker',
  'profile updates by owner or admin',
  'profiles_role_guard',
  'guard_profile_role_update',
  'admins review author requests',
  'admins write role audit',
  'grant update(role)',
  'grant update(status,reviewed_at,reviewed_by,review_note)',
  'grant insert(actor_id,subject_id,old_role,new_role)'
])assert(invokerRpc.toLowerCase().includes(required),`admin RPC hardening includes ${required}`);
for(const name of ['admin_set_author','admin_review_author_request'])assert(new RegExp(`function public\\.${name}[\\s\\S]{0,220}security invoker`,'i').test(invokerRpc),`${name} remains a public SECURITY INVOKER RPC`);

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
