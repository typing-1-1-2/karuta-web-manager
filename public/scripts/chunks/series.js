// chunk: series.js

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
            <option value="">${t('allQualitiesSeries')}</option>
            <option value="4">★★★★</option><option value="3">★★★</option><option value="2">★★</option><option value="1">★</option><option value="0">—</option>
          </select>
          <select onchange="filterSeriesCards(${i})">
            <option value="">${t('allPrintsSeries')}</option>
            <option value="sp">SP (1–9)</option>
            <option value="lp">LP (10–99)</option>
            <option value="mp">MP (100–999)</option>
            <option value="hp">HP (1000+)</option>
          </select>
          <select onchange="filterSeriesCards(${i})">
            <option value="date">${t('recentSort')}</option><option value="alpha">${t('nameAZSort')}</option>
            <option value="edition">Edición</option><option value="print_asc">Print ↑</option>
            <option value="print_desc">Print ↓</option><option value="burn">Burn</option>
            <option value="wishlists">Wishlists</option><option value="effort">Effort</option>
          </select>
          <span class="s-count" id="sc-${i}">${d.count} cartas</span>
        </div>
        <div class="series-cards-grid" id="src-${i}"></div>
      </div>
    </div>`).join('')||`<div class="empty">${t('noResults')}</div>`;
  document.getElementById('btnMoreSeries').style.display=entries.length>seriesPage?'inline-block':'none';
  window._seriesEntries=entries;
}

function toggleSeriesRow(i){

  const row=document.getElementById('sr-'+i),inner=document.getElementById('si-'+i);
  if(!row||!inner)return;
  const opening=inner.style.display==='none';
  inner.style.display=opening?'block':'none';
  row.classList.toggle('open',opening);
  if(opening){
    filterSeriesCards(i);
    // Wire click delegation for series cards (avoids inline onclick escaping issues)
    const grid=document.getElementById('src-'+i);
    if(grid && !grid._seriesDelegated){
      grid._seriesDelegated=true;
      grid.addEventListener('click', e=>{
        const card=e.target.closest('.char-card[data-series-row]');
        if(!card) return;
        e.stopImmediatePropagation();
        const rowIdx=+card.dataset.seriesRow;
        const code=card.dataset.seriesCode;
        if(code) showModalFromSeries(code, rowIdx);
      }, true); // capture phase — fires before mkCard's inline onclick
    }
  }
}

function filterSeriesCards(i){

  const inner=document.getElementById('si-'+i),grid=document.getElementById('src-'+i),countEl=document.getElementById('sc-'+i);
  if(!inner||!grid)return;
  const inputs=inner.querySelectorAll('input,select');
  const search=(inputs[0]?.value||'').toLowerCase();
  const qual=inputs[1]?.value||'';
  const print=inputs[2]?.value||'';
  const sort=inputs[3]?.value||'date';
  const entries=window._seriesEntries||[];
  let cards=(entries[i]?.[1]?.cards)||[];
  if(search) cards=cards.filter(c=>c.character.toLowerCase().includes(search));
  if(qual)   cards=cards.filter(c=>c.quality===qual);
  if(print){
    cards=cards.filter(c=>{
      const n=+c.number||0;
      if(print==='sp') return n>=1&&n<=9;
      if(print==='lp') return n>=10&&n<=99;
      if(print==='mp') return n>=100&&n<=999;
      if(print==='hp') return n>=1000;
      return true;
    });
  }
  const sf={date:(a,b)=>(+b.obtainedTimestamp||0)-(+a.obtainedTimestamp||0),alpha:(a,b)=>(a.character||'').localeCompare(b.character||''),edition:(a,b)=>(+a.edition||0)-(+b.edition||0),print_asc:(a,b)=>(+a.number||0)-(+b.number||0),print_desc:(a,b)=>(+b.number||0)-(+a.number||0),burn:(a,b)=>(+b.burnValue||0)-(+a.burnValue||0),wishlists:(a,b)=>(+b.wishlists||0)-(+a.wishlists||0),effort:(a,b)=>(+b['worker.effort']||0)-(+a['worker.effort']||0)};
  cards=[...cards].sort(sf[sort]||sf.date);
  // Store filtered+sorted list for this series row so modal can navigate it
  window._seriesCardList = window._seriesCardList || {};
  window._seriesCardList[i] = cards;
  if(countEl)countEl.textContent=cards.length+' '+t('cards');
  if(cards.length){
    const frag=document.createDocumentFragment();
    const tmp=document.createElement('div');
    // Use data-series-row attribute instead of inline onclick to avoid quote escaping issues
    tmp.innerHTML=cards.map(c=>mkCard(c)).join('');
    // Patch onclick via data attribute after parsing
    tmp.querySelectorAll('.char-card').forEach((el,idx)=>{
      const c=cards[idx]; if(!c) return;
      el.dataset.seriesRow=i;
      el.dataset.seriesCode=c.code||c.character;
    });
    while(tmp.firstChild)frag.appendChild(tmp.firstChild);
    grid.replaceChildren(frag);
  } else {
    grid.innerHTML=`<div class="empty" style="padding:1.5rem">${t('noResults')}</div>`;
  }
  wireImgs();
  if(_charSelMode) _updateSelBar();
}

// Open modal with navigation list scoped to a specific series row
function showModalFromSeries(key, rowIdx){
  const c=ALL.find(x=>x.code===key||x.character===key);
  if(!c){ console.warn('[KWM] showModalFromSeries: card not found for key',key); return; }
  const list=(window._seriesCardList||{})[rowIdx]||[c];
  _modalCard=c;
  _modalEd=c.edition||'1';
  _modalFrameOn=false;
  _modalCustomImg=null;
  _modalEditMode=false;
  _modalList=list;
  _modalIdx=list.findIndex(x=>(x.code&&x.code===c.code)||(x.character===c.character&&x.edition===c.edition));
  if(_modalIdx<0) _modalIdx=0;
  const imgKey=c.code||(c.character+'|'+_modalEd);
  _loadCustomImgAsync(imgKey).then(img=>{
    _modalCustomImg=img;
    _renderModal();
    _updateSwipeBtns();
  });
  openModal();
}

function moreSeries(){
seriesPage+=50;renderSeries();}