/** lib/cards.ts — Card rendering and character list */

function mkCard(c, onclick=''){
  const q=c.quality||'0';
  const bv=+c.burnValue||0;
  const wl=+c.wishlists||0;
  const pills=[
    c.tag?`<span class="pill pill-tag">#${esc(c.tag)}</span>`:'',
    c.frame?`<span class="pill pill-frame">🖼</span>`:'',
    c.morphed==='Yes'?`<span class="pill pill-morph">✨</span>`:'',
    c.trimmed==='Yes'?`<span class="pill pill-morph">✂</span>`:'',
  ].filter(Boolean).join('');
  const safeCode=esc(c.code||c.character);
  const _isSel=_charSelMode&&_charSelSet.has(c.code||c.character);
  return `<div class="char-card${_charSelMode?' sel-mode':''}${_isSel?' selected':''}" data-code="${safeCode}" onclick="if(!charSelToggleCard('${safeCode}',this)){${onclick||`openCardModal('${safeCode}')`}}">
    <div class="card-quality-bar" style="background:${QS[q]}"></div>
    <div class="card-img-wrap loading">
      ${cardImgEl(c.character, c.edition||'1', c.code)}
      <div class="card-no-img" style="display:none">
        <span class="ni-icon">🎴</span>
        <span>Sin imagen</span>
      </div>
      <span class="card-q-badge ${QB[q]||'bq0'}">${QL[q]||q}</span>
    </div>
    <div class="card-info">
      <div class="card-name">${esc(c.character)}</div>
      <div class="card-series">${esc(c.series||'—')}</div>
      <div class="card-row">
        <span class="pill pill-ed">Ed.${c.edition||'?'} #${c.number||'?'}</span>
        ${pills}
        ${wl>0?`<span class="card-wl">♥${wl}</span>`:''}
        <span class="card-burn"><b>${bv.toLocaleString()}</b>🔥</span>
      </div>
    </div>
  </div>`;
}

function cardImgEl(character, edition, code){
  _initLazy();
  const slug=toSlug(character);
  const ed=String(edition||'1');
  const primary=CDN+slug+'-'+ed+'.jpg';
  const fallback=CDN+slug+'-1.jpg';
  const uid='ci'+(++_imgUid);

  // Check sync (localStorage fallback) first for speed
  const customSync=code?_loadCustomImg(code):null;
  if(customSync){
    return '<img class="card-img loaded" id="'+uid+'"'
      +' src="'+customSync+'" alt=""'
      +' onload="this.classList.add(\'loaded\');this.closest(\'.card-img-wrap\')?.classList.remove(\'loading\')">';
  }

  // If code exists, async-check IDB (may have image not in localStorage)
  if(code){
    _loadCustomImgAsync(code).then(img=>{
      if(!img) return;
      const el=document.getElementById(uid);
      if(!el) return;
      el.src=img;
      el.classList.add('loaded');
      el.closest('.card-img-wrap')?.classList.remove('loading');
    });
  }

  return '<img class="card-img" id="'+uid+'"'
    +' src="" data-src="'+primary+'"'
    +' data-fallback="'+fallback+'" data-primary="'+primary+'"'
    +' alt=""'
    +' onload="this.classList.add(\'loaded\');this.closest(\'.card-img-wrap\')?.classList.remove(\'loading\')"'
    +' onerror="_imgError(this)">';
}

function wireImgs(){
  _initLazy();
  document.querySelectorAll('.card-img[data-src]').forEach(img=>{
    if(!img.dataset.observed){
      img.dataset.observed='1';
      _lazyObs.observe(img);
    }
  });
  // Catch already-visible imgs whose observer fired before src was set
  requestAnimationFrame(()=>{
    document.querySelectorAll('.card-img[data-src]').forEach(img=>{
      if(img.getBoundingClientRect().top < window.innerHeight + 300){
        img.src=img.dataset.src;
        delete img.dataset.src;
        _lazyObs.unobserve(img);
      }
    });
    // Catch already-errored
    document.querySelectorAll('.card-img:not([data-src])').forEach(img=>{
      if(img.complete && img.naturalWidth===0 && img.src && !img.src.startsWith('data:') && !img.dataset.loaded)
        _imgError(img);
    });
  });
}

function wireFrameImgs(){
  document.querySelectorAll('.frame-img').forEach(img=>{
    img.onerror=function(){this.style.display='none';if(this.parentElement)this.parentElement.innerHTML='<div class="frame-no-img">🖼️</div>';};
  });
}

function _imgError(img){
  const fb=img.dataset.fallback;
  if(fb && img.src!==fb && (img.dataset.primary||'')!==fb){
    img.onerror=()=>_showNoImg(img);
    delete img.dataset.fallback;
    img.src=fb;
  } else {
    _showNoImg(img);
  }
}

function _showNoImg(img){
  img.style.display='none';
  let s=img.nextElementSibling;
  while(s){if(s.classList&&s.classList.contains('card-no-img')){s.style.display='flex';return;}s=s.nextElementSibling;}
}

function _initLazy(){
  if(_lazyObs) return;
  _lazyObs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting) return;
      const img=e.target;
      if(img.dataset.src){ img.src=img.dataset.src; delete img.dataset.src; }
      _lazyObs.unobserve(img);
    });
  },{rootMargin:'250px'});
}

function _refreshCardInGrid(character,edition,code){
  const slug=toSlug(character);
  const ed=String(edition||'1');
  const primary=CDN+slug+'-'+ed+'.jpg';

  function _applyToImgs(src, isCustom){
    document.querySelectorAll('.card-img').forEach(img=>{
      // Match by data-primary URL (set when card was rendered)
      if(img.dataset.primary!==primary) return;
      img.src=src;
      img.classList.toggle('loaded', !!src);
      const wrap=img.closest('.card-img-wrap');
      if(wrap) wrap.classList.remove('loading');
      if(!src){
        // No image — show placeholder
        const ni=wrap?.querySelector('.card-no-img');
        if(ni) ni.style.display='flex';
      }
    });
  }

  if(!code){ _applyToImgs(primary, false); return; }

  // Try IDB first (async), show immediately if found
  _loadCustomImgAsync(code).then(custom=>{
    if(custom){
      _applyToImgs(custom, true);
    } else {
      _applyToImgs(primary, false);
    }
  });
}

function renderChars(){
  charsPage=40;
  const list=_buildCharList();
  _modalList=list;
  document.getElementById('charCount').textContent=`${list.length.toLocaleString('es')} cartas`;
  const _cg=document.getElementById('charGrid');
  _cg.style.opacity='0.3';
  _cg.innerHTML=list.slice(0,charsPage).map(c=>mkCard(c)).join('')||'<div class="empty">No se encontraron cartas.</div>';
  wireImgs();
  _charsHasMore=list.length>charsPage;
  _initCharsScroll();
  requestAnimationFrame(()=>{_cg.style.transition='opacity .15s';_cg.style.opacity='1';});
}

function _buildCharList(){
  const q=(document.getElementById('searchChar')?.value||'').toLowerCase().trim();
  const qual=(document.getElementById('filterQual')?.value||'');
  const ed=(document.getElementById('filterEdition')?.value||'');
  const morphed=(document.getElementById('filterMorphed')?.value||'');
  const frame=(document.getElementById('filterFrame')?.value||'');
  const tag=(document.getElementById('filterTag')?.value||'');
  const grabbed=(document.getElementById('filterGrabbed')?.value||'');
  const sort=(document.getElementById('sortChar')?.value||'date');

  // Populate tag filter dropdown dynamically
  _populateTagFilter();

  const userId=_getUserId();

  let list=ALL.filter(c=>{
    // Search: name, series, code, tag
    if(q){
      const mName=c.character.toLowerCase().includes(q);
      const mSeries=(c.series||'').toLowerCase().includes(q);
      const mCode=c.code&&c.code.toLowerCase().includes(q);
      const mTag=(c.tag||'').toLowerCase().includes(q);
      if(!mName&&!mSeries&&!mCode&&!mTag) return false;
    }
    if(qual && c.quality!==qual) return false;
    if(ed && c.edition!==ed) return false;
    if(morphed==='yes' && c.morphed!=='Yes') return false;
    if(morphed==='no' && c.morphed==='Yes') return false;
    if(frame==='yes' && !(c.frame&&c.frame.trim())) return false;
    if(frame==='no' && c.frame&&c.frame.trim()) return false;
    if(tag && (c.tag||'').trim()!==tag) return false;
    if(grabbed==='own' && userId && c.grabber!==userId) return false;
    if(grabbed==='other' && userId && c.grabber===userId) return false;
    return true;
  });

  const fns={
    date:(a,b)=>(+b.obtainedTimestamp||0)-(+a.obtainedTimestamp||0),
    burn:(a,b)=>(+b.burnValue||0)-(+a.burnValue||0),
    wishlists:(a,b)=>(+b.wishlists||0)-(+a.wishlists||0),
    alpha:(a,b)=>(a.character||'').localeCompare(b.character||''),
    edition:(a,b)=>(+a.edition||0)-(+b.edition||0),
    print_asc:(a,b)=>(+a.number||0)-(+b.number||0),
    print_desc:(a,b)=>(+b.number||0)-(+a.number||0),
    effort:(a,b)=>(+b['worker.effort']||0)-(+a['worker.effort']||0),
  };
  list.sort(fns[sort]||fns.date);

  // Show clear button if any filter is active
  const anyFilter=q||qual||ed||morphed||frame||tag||grabbed;
  const btn=document.getElementById('btnClearFilters');
  if(btn) btn.style.opacity=anyFilter?'1':'0.4';

  return list;
}

function _appendChars(){
  const list=_buildCharList();
  const _cg=document.getElementById('charGrid');
  const newCards=list.slice(charsPage-40,charsPage);
  if(!newCards.length){ _charsHasMore=false; return; }
  const frag=document.createElement('div');
  frag.innerHTML=newCards.map(c=>mkCard(c)).join('');
  while(frag.firstChild) _cg.appendChild(frag.firstChild);
  wireImgs();
  _charsHasMore=list.length>charsPage;
}

function moreChars(){charsPage+=40;renderChars();}

function getFilteredChars(){
  // Reset page when called fresh (not from _appendChars)
  const list=_buildCharList();
  return list;
}

function clearCharFilters(){
  ['searchChar','filterQual','filterEdition','filterMorphed','filterFrame','filterTag','filterGrabbed'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  document.getElementById('sortChar').value='date';
  renderChars();
}

function renderSeries(){
  const entries=_buildSeriesData();
  const maxC=entries[0]?.[1]?.count||1;
  const list=document.getElementById('seriesList');
  list.innerHTML=entries.slice(0,seriesPage).map(([s,d],i)=>`
    <div class="series-row" id="sr-${i}">
      <div class="series-row-header" onclick="toggleSeriesRow(${i})">
        <span class="series-rank">#${i+1}</span>
        <span class="series-name">${esc(s)}</span>
        <div class="series-bar-bg" style="flex:1;max-width:100px"><div class="series-bar-fill" style="width:${Math.round(d.count/maxC*100)}%"></div></div>
        <span class="series-count">${d.count} 🃏</span>
        <span class="series-burn">🔥${d.burn.toLocaleString()}</span>
        <span class="series-chevron">▼</span>
      </div>
      <div class="series-inner" id="si-${i}" style="display:none">
        <div class="series-toolbar">
          <input type="text" placeholder="Buscar personaje…" oninput="filterSeriesCards(${i})">
          <select onchange="filterSeriesCards(${i})">
            <option value="">Todas las calidades</option>
            <option value="4">★★★★</option><option value="3">★★★</option><option value="2">★★</option><option value="1">★</option><option value="0">—</option>
          </select>
          <select onchange="filterSeriesCards(${i})">
            <option value="date">Recientes</option><option value="alpha">Nombre A–Z</option>
            <option value="edition">Edición</option><option value="print_asc">Print ↑</option>
            <option value="print_desc">Print ↓</option><option value="burn">Burn</option>
            <option value="wishlists">Wishlists</option><option value="effort">Effort</option>
          </select>
          <span class="s-count" id="sc-${i}">${d.count} cartas</span>
        </div>
        <div class="series-cards-grid" id="src-${i}"></div>
      </div>
    </div>`).join('')||'<div class="empty">No se encontraron series.</div>';
  document.getElementById('btnMoreSeries').style.display=entries.length>seriesPage?'inline-block':'none';
  window._seriesEntries=entries;
}

function filterSeriesCards(i){
  const inner=document.getElementById('si-'+i),grid=document.getElementById('src-'+i),countEl=document.getElementById('sc-'+i);
  if(!inner||!grid)return;
  const inputs=inner.querySelectorAll('input,select');
  const search=(inputs[0]?.value||'').toLowerCase(),qual=inputs[1]?.value||'',sort=inputs[2]?.value||'date';
  const entries=window._seriesEntries||[];
  let cards=(entries[i]?.[1]?.cards)||[];
  if(search)cards=cards.filter(c=>c.character.toLowerCase().includes(search));
  if(qual)cards=cards.filter(c=>c.quality===qual);
  const sf={date:(a,b)=>(+b.obtainedTimestamp||0)-(+a.obtainedTimestamp||0),alpha:(a,b)=>(a.character||'').localeCompare(b.character||''),edition:(a,b)=>(+a.edition||0)-(+b.edition||0),print_asc:(a,b)=>(+a.number||0)-(+b.number||0),print_desc:(a,b)=>(+b.number||0)-(+a.number||0),burn:(a,b)=>(+b.burnValue||0)-(+a.burnValue||0),wishlists:(a,b)=>(+b.wishlists||0)-(+a.wishlists||0),effort:(a,b)=>(+b['worker.effort']||0)-(+a['worker.effort']||0)};
  cards=[...cards].sort(sf[sort]||sf.date);
  if(countEl)countEl.textContent=cards.length+' carta'+(cards.length!==1?'s':'');
  grid.innerHTML=cards.length?cards.map(c=>mkCard(c)).join(''):'<div class="empty" style="padding:1.5rem">Sin resultados.</div>';
  wireImgs();
  if(_charSelMode) _updateSelBar();
}

function toggleSeriesRow(i){
  const row=document.getElementById('sr-'+i),inner=document.getElementById('si-'+i);
  if(!row||!inner)return;
  const opening=inner.style.display==='none';
  inner.style.display=opening?'block':'none';
  row.classList.toggle('open',opening);
  if(opening)filterSeriesCards(i);
}

function moreSeries(){seriesPage+=50;renderSeries();}

function renderWorkers(){
  const q=(document.getElementById('searchWorker')?.value||'').toLowerCase();
  const ef=document.getElementById('filterEffort')?.value||'';
  const sort=document.getElementById('sortWorker')?.value||'effort';
  let list=ALL.filter(c=>{
    const mQ=!q||(c.character||'').toLowerCase().includes(q)||(c.series||'').toLowerCase().includes(q);
    const efN=+c['worker.effort']||0;
    const mEf=!ef||(ef==='hi'&&efN>=80)||(ef==='mid'&&efN>=40&&efN<80)||(ef==='lo'&&efN<40);
    return mQ&&mEf;
  });
  const GRADE_O={S:0,A:1,B:2,C:3,D:4,F:5};
  const fns={effort:(a,b)=>(+b['worker.effort']||0)-(+a['worker.effort']||0),purity:(a,b)=>(GRADE_O[a['worker.purity']]||5)-(GRADE_O[b['worker.purity']]||5),quick:(a,b)=>(GRADE_O[a['worker.quickness']]||5)-(GRADE_O[b['worker.quickness']]||5),alpha:(a,b)=>(a.character||'').localeCompare(b.character||'')};
  list.sort(fns[sort]||fns.effort);
  const fields=[['worker.style','Style'],['worker.purity','Purity'],['worker.grabber','Grabber'],['worker.dropper','Dropper'],['worker.quickness','Quick'],['worker.toughness','Tough'],['worker.vanity','Vanity']];
  document.getElementById('workerGrid').innerHTML=list.slice(0,workersPage).map(c=>`
    <div class="worker-card" onclick="openCardModal('${esc(c.code||c.character)}')">
      <div class="worker-char">${esc(c.character)}</div>
      <div class="worker-series">${esc(c.series||'—')}</div>
      <div class="worker-effort-row"><span class="effort-label">Esfuerzo acumulado</span><span class="effort-val">${+c['worker.effort']||0}</span></div>
      <div class="stats-grid-sm">${fields.map(([k,l])=>{const v=c[k]||'?';return`<div class="stat-row"><span class="stat-name">${l}</span><span class="grade g${v}">${v}</span></div>`;}).join('')}</div>
    </div>`).join('')||'<div class="empty">No se encontraron workers.</div>';
  document.getElementById('btnMoreWorkers').style.display=list.length>workersPage?'inline-block':'none';
}

function moreWorkers(){workersPage+=40;renderWorkers();}

function renderFrames(){
  const map={};
  ALL.forEach(c=>{const f=(c.frame&&c.frame.trim())?c.frame.trim():'(sin marco)';map[f]=(map[f]||0)+1;});
  const entries=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  let html='';
  for(const[f,n]of entries){
    const imgUrl=f!=='(sin marco)'?frameImgEl(f):null;
    const displayName=FRAME_NAME[f]||f;
    html+=`<div class="frame-card"><div class="frame-img-wrap">${imgUrl||'<div class="frame-no-img">🚫</div>'}</div><div class="frame-info"><span class="frame-name">${esc(displayName)}</span><span class="frame-cnt">${n}</span></div></div>`;
  }
  document.getElementById('framesGrid').innerHTML=html;
  wireFrameImgs();
}

function frameImgEl(key){
  const url=frameImgUrl(key);
  if(!url)return'<div class="frame-no-img">🖼️</div>';
  const uid='fi'+(++_imgUid);
  return '<img class="frame-img" id="'+uid+'" src="'+url+'" alt="">';
}

function frameImgUrl(key){ const s=FRAME_SLUG[key]; return s?(FRAME_CDN+s+'.jpg'):null; }

function _initCharsScroll(){
  if(_charsScrollObs) _charsScrollObs.disconnect();
  const sentinel=document.getElementById('charsSentinel');
  if(!sentinel) return;
  _charsScrollObs=new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting&&_charsHasMore){
      charsPage+=40;
      _appendChars();
    }
  },{rootMargin:'400px'});
  _charsScrollObs.observe(sentinel);
}

function populateSuggestions(){}