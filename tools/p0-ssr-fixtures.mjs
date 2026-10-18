// Produces mock HTML for browser-only layout QA: no database and no live requests.
import articleHandler from '../api/article.js';
import articlesHandler from '../api/articles.js';
process.env.SUPABASE_URL='https://fixture.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_fixture';
process.env.SITE_URL='https://german-library.test';
const a={id:'fixture',slug:'grammatik-a1',title:'Deutsch Grammatik A1',excerpt:'Ein kurzer praktischer Einstieg für Lernende auf Niveau A1.',body_html:'<p>Willkommen bei German Library.</p><h2>Dein Lernweg</h2><p>Die nächste Übung ist leicht zu finden.</p>',category:'Grammatik',locale:'de',levels:['A1'],skills:['Grammatik'],related_resource_ids:[],author_name:'Test Author',seo_title:'Deutsch Grammatik A1',meta_description:'Deutsch lernen für Anfänger',canonical_url:'',og_image_url:'',cover_url:'',mobile_cover_url:'',cover_alt:'',featured:false,published_at:'2026-10-13T12:00:00Z',updated_at:'2026-10-13T12:00:00Z'};
globalThis.fetch=async()=>new Response(JSON.stringify([a]),{status:200});
const res=()=>({statusCode:0,headers:{},body:'',setHeader(k,v){this.headers[k]=v},end(x=''){this.body=String(x)},status(n){this.statusCode=n;return this},send(x=''){this.body=String(x);return this}});
const index=res();await articlesHandler({url:'/api/articles'},index);
const article=res();await articleHandler({url:'/api/article?slug=grammatik-a1'},article);
if(index.statusCode!==200||article.statusCode!==200)throw Error('Fixture renderer failed');
console.log(JSON.stringify({index:index.body,article:article.body}));
