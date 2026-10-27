// Source-level guard for audit finding S1 (Author over-privilege). Live RLS tests on Staging are still required.
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const m=read('../backend/migrations/20261027_s1_author_resource_ownership.sql');
const client=read('../assets/backend.js');
const admin=read('../assets/page-admin.js');
const errors=[];
for(const [re,msg] of [
  [/drop policy if exists "resource managers insert resources"/,'old insert policy not dropped'],
  [/drop policy if exists "resource managers update resources"/,'old update policy not dropped'],
  [/created_by=\(select auth\.uid\(\)\)/,'ownership check missing'],
  [/status in \('draft','archived'\)/,'authors must be limited to draft/archived'],
  [/like 'authors\/'\|\|\(select auth\.uid\(\)\)::text\|\|'\/%'/,'storage path scope missing'],
  [/"resource files delete own or staff"/,'scoped delete policy missing'],
]) if(!re.test(m))errors.push('migration: '+msg);
if(/can_manage_resources\(\)\)\s*\)\s*;/.test(m)&&/for delete[^;]*using\(\s*bucket_id='resource-files' and private\.can_manage_resources/.test(m))errors.push('migration: unscoped author delete');
if(!/authors\/\$\{user\.id\}\//.test(client))errors.push('client: author uploads must use authors/<uid>/ prefix');
if(!/authorOnly\)form\.elements\.status[^;]*published/.test(admin))errors.push('admin: Published must be hidden for authors');
const app=read('../assets/app.js');
if(!/created_by\|\|''/.test(client))errors.push('client: created_by must be mapped to createdBy');
if(!/createdBy:x\.createdBy/.test(app))errors.push('normalizeResource must keep createdBy');
if(!/authorOnly\?r\.createdBy===myId/.test(admin))errors.push('admin: authors must only list their own resources');
if(/created_by:/.test(client.slice(client.indexOf('function contentRows'),client.indexOf('const changedRows'))))errors.push('client must never send created_by');
console.log(`S1 author QA: ${errors.length} error(s)`);errors.forEach(e=>console.error('ERROR:',e));process.exit(errors.length?1:0);
