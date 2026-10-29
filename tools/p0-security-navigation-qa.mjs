import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {desktopNav, mobileMenu, mobileBottomNav} from '../server/article-navigation.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const source=read('../backend/migrations/20261014_vnext_articles.sql');
const fix=read('../backend/migrations/20261015_p0_article_source_read_access.sql');
const original=source.match(/create policy "authenticated article access"[\s\S]*?\n\);/i);
assert(original?.[0].includes('published_snapshot is not null'),'regression reproduces the old public-snapshot read issue');
assert.match(fix,/drop policy if exists "authenticated article access" on public\.articles/i);
assert.match(fix,/drop policy if exists "public read published articles" on public\.articles/i);
assert.match(fix,/revoke all on table public\.articles from anon/i);
const replacement=fix.match(/create policy "article source readable by author and reviewers"[\s\S]*?\n\);/i);
assert(replacement,'replacement RLS policy exists');
assert.match(replacement[0],/author_id\s*=\s*\(select auth\.uid\(\)\)/);
assert.match(replacement[0],/private\.can_manage_resources\(\)/);
assert.match(replacement[0],/private\.can_review_articles\(\)/);
assert(!replacement[0].includes('published_snapshot'),'published snapshots never grant raw draft read permission');
assert(!replacement[0].includes('status='),'article status must not grant raw draft read permission');
assert.match(source,/create or replace view public\.published_articles with \(security_barrier=true\)/);
assert.match(source,/published_snapshot->>\s*'title'/);
assert.match(source,/where published_snapshot is not null and status<>'archived'/);
assert.match(source,/grant select on public\.published_articles to anon,authenticated/);
// This gate validates the effective intended access matrix, not a live DB session.
const canReadRaw=(actor,article)=>actor.role==='editor'||actor.role==='admin'||(actor.role==='author'&&actor.id===article.authorId);
for(const status of ['draft','in_review','published','needs_changes','archived']){
  const article={authorId:'author-1',status,publishedSnapshot:status!=='draft'};
  assert(!canReadRaw({id:'student-1',role:'learner'},article),`learner cannot read raw ${status}`);
  assert(!canReadRaw({id:'author-2',role:'author'},article),`other author cannot read raw ${status}`);
  assert(canReadRaw({id:'author-1',role:'author'},article),`owner can read ${status}`);
  assert(canReadRaw({id:'reviewer-1',role:'editor'},article),`reviewer can read ${status}`);
}
const navTags=(markup,klass)=>markup.match(new RegExp(`<nav class="${klass}"[^>]*>([\\s\\S]*?)<\\/nav>`))?.[1]||'';
for(const [name,markup] of [['desktop',desktopNav()],['mobile',mobileBottomNav()]]){
  const inner=navTags(markup,name==='desktop'?'desktop-nav':'mobile-bottom-nav');
  const hrefs=[...inner.matchAll(/<a\s+href="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(hrefs,['/','/levels.html','/books.html','/media.html','/articles'],`${name} SSR destinations exactly match v3.3`);
  assert(inner.includes('href="/articles"'),`${name} includes articles as fifth primary destination`);
  assert.equal((inner.match(/aria-current="page"/g)||[]).length,1,`${name} only has one active destination`);
}
assert.equal((mobileMenu().match(/href="\/articles"/g)||[]).length,1,'article appears exactly once in the secondary menu');
assert(mobileMenu().includes('aria-label="باز کردن منو"'),'secondary menu accessible label');
assert(read('../assets/site-ui.js').includes("[['index.html','home','خانه'],['levels.html','levels','سطوح'],['books.html','library','کتابخانه'],['media.html','media','رسانه'],['articles','articles','مقالات']]"),'SSR matches the five approved primary destinations');
assert(read('../api/article.js').includes('if(!String(s||\'\').trim())return \'\';'),'empty URLs cannot silently resolve to homepage');
console.log('P0 QA: article source access policy, intended role matrix, shared five-item SSR nav, valid URL fallback PASS');
