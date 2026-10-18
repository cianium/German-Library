GL.boot(()=>{
  const c=GL.getContent(),search=document.getElementById('bookSearch'),level=document.getElementById('bookLevel'),type=document.getElementById('bookType'),list=document.getElementById('booksGrid'),count=document.getElementById('bookCount'),featured=document.getElementById('featuredBooks'),shelf=document.getElementById('booksShelves');
  const types=GL.BOOK_CATEGORIES;
  type.innerHTML='<option value="">همه دسته‌ها</option>'+types.map(t=>`<option value="${t}">${GL.BOOK_CATEGORY_LABELS[t]}</option>`).join('');
  function render(){const q=search.value.trim().toLocaleLowerCase('fa');const rows=GL.getBooks(c).filter(b=>(!level.value||b.level===level.value)&&(!type.value||b.bookType===type.value)&&(!q||`${b.title} ${b.description} ${b.provider}`.toLocaleLowerCase('fa').includes(q)));
    count.textContent=`${rows.length} کتاب`;list.innerHTML=rows.length?rows.map(b=>GL.courseCard(b,c)).join(''):'<div class="neo-card empty-state full-width"><h3>کتابی یافت نشد</h3><p>فیلتر را تغییر بده.</p></div>';
    const picks=rows.filter(b=>b.featured).slice(0,8);featured.parentElement.hidden=!picks.length;featured.innerHTML=picks.map(b=>GL.courseCard(b,c)).join('');
    const sections=types.map(t=>({t,rows:rows.filter(b=>b.bookType===t)})).filter(x=>x.rows.length);
    shelf.innerHTML=sections.map(s=>`<section class="book-shelf"><div class="section-head"><h2 class="section-title">${GL.BOOK_CATEGORY_LABELS[s.t]}</h2><span class="section-subtitle">${s.rows.length} کتاب</span></div><div class="gl-horizontal-grid">${s.rows.map(b=>GL.courseCard(b,c)).join('')}</div></section>`).join('');
    GL.hydrateCovers();
  }
  search.addEventListener('input',render);level.addEventListener('change',render);type.addEventListener('change',render);render();
});
