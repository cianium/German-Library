import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const win={},storage={};const context={window:win,document:{addEventListener:()=>{}},location:{search:''},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]},URLSearchParams,URL,console};
vm.runInNewContext(read('data/content.js'),context);vm.runInNewContext(read('assets/app.js'),context);const GL=win.GL,c=GL.getContent();
assert.equal(GL.getBooks(c).length,4,'All published books in library');
assert.equal(GL.getLibraryResources(c).length,25,'level practice separate from books');
assert.equal(GL.getCourseResources(c,'startenwir-a1').length,4);
assert.equal(GL.getFeatured(c).courses.length,2,'legacy special books preserved');
assert(GL.getFeatured(c).resources.some(r=>r.id==='sw-a1-kursbuch'),'Featured book assets selectable');
let n=GL.clone(c);n.courses.push({id:'free-book',title:'Test free book',collection:'library',level:'',status:'published',featured:true});
n.resources.push({id:'free-book-file',title:'Book file',collection:'library',level:'',courseId:'free-book',type:'Kursbuch',status:'published',url:'https://example.org/file'});
n.resources.push({id:'media-film',title:'Movie',collection:'media',level:'B1',type:'Film',skill:'Hören',status:'published',featured:true,url:'https://example.org/media'});
n=GL.normalizeContent(n);assert.equal(GL.validateContent(n).errors.length,0,GL.validateContent(n).errors.join('; '));
assert(GL.getBooks(n).some(x=>x.id==='free-book'));assert(GL.getMedia(n).some(x=>x.id==='media-film'));
assert(GL.getLevelResources(n,'B1').some(x=>x.id==='media-film'));
assert(GL.getFeatured(n).resources.some(x=>x.id==='media-film'));
assert(GL.getFeatured(n).courses.some(x=>x.id==='free-book'));
assert(!GL.getLibraryResources(n).some(x=>x.id==='media-film'));
assert(!GL.getLibraryResources(n).some(x=>x.id==='free-book-file'));
const broken=GL.clone(n);broken.resources.push({id:'bad',title:'bad',collection:'media',level:'',type:'Kursbuch',status:'draft'});assert(GL.validateContent(broken).errors.length>0);
for(const page of ['index','level','course','resource','books','media','resources','special','login','admin']){
 const html=read(page+'.html');assert(html.includes('assets/site-ui.js'),`${page}: shared nav missing`);assert(html.includes('assets/theme-init.js'),`${page}: theme init missing`)
}
for(const id of ['mediaPanel','levelsPanel','mediaAdminList','levelsAdminList','addMedia'])assert(read('admin.html').includes(`id="${id}"`),`missing ${id}`);
for(const page of ['page-media.js','page-books.js','page-special.js'])assert(read('assets/'+page).includes('GL.boot'),`missing page controller ${page}`);
assert(read('backend/migrations/20261014_v74_books_media.sql').includes('begin;'));
assert(read('assets/page-admin.js').includes("if(action==='edit-level')"));
console.log('V7.4 QA: library books, media collections, optional CEFR, featured picks, level editing, validation and navigation passed');
