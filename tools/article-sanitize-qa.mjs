// Regression guard: SSR sanitizer must not double-escape entities stored by the studio sanitizer.
import assert from 'node:assert/strict';
import {sanitize} from '../api/article.js';
const out=sanitize('<p>Tom &amp; Jerry&nbsp;&lt;b&gt; 5 &gt; 3</p><a href="https://e.example/?a=1&amp;b=2">x</a><img src="https://e.example/i.png" alt="a &amp; b">');
assert.ok(out.includes('Tom &amp; Jerry'),'ampersand must render once-escaped');
assert.ok(!out.includes('&amp;amp;'),'double escaping detected');
assert.ok(out.includes('&lt;b&gt;'),'escaped markup must stay inert text');
assert.ok(out.includes('?a=1&amp;b=2'),'query string must survive');
assert.ok(out.includes('alt="a &amp; b"'),'alt must be decoded once');
const evil=sanitize('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="https://e.example/x.png" onerror="alert(1)">&#60;img src=x&#62;');
assert.ok(!/<script|onerror|javascript:/i.test(evil),'unsafe markup leaked: '+evil);
assert.equal((evil.match(/<img/g)||[]).length,1,'decoded entities must never become real tags: '+evil);
console.log('Article sanitize QA: 0 error(s)');
