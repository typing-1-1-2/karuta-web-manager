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
        <button class="series-view-btn" onclick="event.stopPropagation();toggleSeriesRow(${i})" title="Ver cartas de esta serie">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Ver cartas
        </button>
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
  if(opening)filterSeriesCards(i);
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
  if(countEl)countEl.textContent=cards.length+' '+t('cards');
  if(cards.length){
    const frag=document.createDocumentFragment();
    const tmp=document.createElement('div');
    tmp.innerHTML=cards.map(c=>mkCard(c)).join('');
    while(tmp.firstChild)frag.appendChild(tmp.firstChild);
    grid.replaceChildren(frag);
  } else {
    grid.innerHTML=`<div class="empty" style="padding:1.5rem">${t('noResults')}</div>`;
  }
  wireImgs();
  if(_charSelMode) _updateSelBar();
}

function moreSeries(){
seriesPage+=50;renderSeries();}