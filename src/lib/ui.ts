/** lib/ui.ts — UI/theme/navigation */

function setTheme(name){
  _currentTheme=name;
  document.documentElement.dataset.theme=(name==='dark'?'':name);
  localStorage.setItem('karutaTheme',name);
  Object.keys(THEMES).forEach(k=>{
    const el=document.getElementById('theme-'+k);
    if(el)el.classList.toggle('active',k===name);
  });
  closeAllDropdowns();
}

function setLang(lang){
  _currentLang=lang;
  localStorage.setItem('karutaLang',lang);
  ['es','en','ja'].forEach(l=>{
    const el=document.getElementById('lang-'+l);
    if(el)el.classList.toggle('active',l===lang);
  });
  closeAllDropdowns();
  if(ALL.length)buildAll();
}

function toggleDropdown(id){
  const dd=document.getElementById(id);if(!dd)return;
  const isOpen=dd.classList.contains('open');
  closeAllDropdowns();
  if(!isOpen)dd.classList.add('open');
}

function closeAllDropdowns(){
  document.querySelectorAll('.nav-dropdown.open').forEach(d=>d.classList.remove('open'));
}

function openGSearch(){
  document.getElementById('gsearchOverlay').classList.remove('hidden');
  const inp=document.getElementById('gsearchInput');
  inp.value='';
  _gsResults=[];_gsIdx=-1;
  document.getElementById('gsearchResults').innerHTML='<div class="gsearch-empty">Escribe para buscar en tu colección</div>';
  requestAnimationFrame(()=>inp.focus());
}

function closeGSearch(){
  document.getElementById('gsearchOverlay').classList.add('hidden');
  _gsResults=[];_gsIdx=-1;
}

function runGSearch(q){
  const sq=(q||'').toLowerCase().trim();
  if(!sq){
    document.getElementById('gsearchResults').innerHTML='<div class="gsearch-empty">Escribe para buscar en tu colección</div>';
    _gsResults=[];return;
  }

  // Search in ALL by name, series, code, tag
  const byCode=ALL.filter(c=>c.code&&c.code.toLowerCase()===sq);
  const byName=ALL.filter(c=>{
    const inName=c.character.toLowerCase().includes(sq);
    const inSeries=(c.series||'').toLowerCase().includes(sq);
    const inTag=(c.tag||'').toLowerCase().includes(sq);
    const inCode=c.code&&c.code.toLowerCase().includes(sq);
    return (inName||inSeries||inTag||inCode) && !byCode.includes(c);
  });

  _gsResults=[...byCode,...byName].slice(0,50);
  _gsIdx=-1;

  if(!_gsResults.length){
    document.getElementById('gsearchResults').innerHTML='<div class="gsearch-empty">Sin resultados para "<strong>'+esc(q)+'</strong>"</div>';
    return;
  }

  const QC={'0':'#555c78','1':'#60b8f0','2':'#41d9b0','3':'#a593ff','4':'#f06080'};

  let html='';
  if(byCode.length){
    html+=`<div class="gsearch-section"><div class="gsearch-section-label">Código exacto</div>`;
    html+=byCode.slice(0,5).map((c,i)=>_gsItem(c,i,QC)).join('');
    html+=`</div>`;
  }
  if(byName.length){
    html+=`<div class="gsearch-section"><div class="gsearch-section-label">Resultados (${Math.min(byName.length,45)}${byName.length>45?'+':''})</div>`;
    html+=byName.slice(0,45).map((c,i)=>_gsItem(c,byCode.length+i,QC)).join('');
    html+=`</div>`;
  }

  document.getElementById('gsearchResults').innerHTML=html;
}

function _gsItem(c,idx,QC){
  const imgUrl=CDN+toSlug(c.character)+'-'+(c.edition||'1')+'.jpg';
  const tag=c.tag?`<span class="gsearch-item-badge" style="background:rgba(124,106,247,0.15);color:var(--accent2)">#${esc(c.tag)}</span>`:'';
  const q4=c.quality==='4'?`<span class="gsearch-item-badge" style="background:rgba(240,96,128,0.15);color:#f06080">★★★★</span>`:'';
  return `<div class="gsearch-item" data-idx="${idx}" onclick="_gsOpen(${idx})">
    <img class="gsearch-item-img" src="${esc(imgUrl)}" alt="" onerror="this.style.opacity='.3'">
    <div class="gsearch-item-info">
      <div class="gsearch-item-name">${esc(c.character)}</div>
      <div class="gsearch-item-sub">${esc(c.series||'—')} · Ed.${c.edition||'?'} · #${c.number||'?'}${c.code?' · '+esc(c.code):''}</div>
    </div>
    ${q4}${tag}
  </div>`;
}

function _gsNavKey(e){
  const overlay=document.getElementById('gsearchOverlay');
  if(!overlay||overlay.classList.contains('hidden')) return false;
  const items=document.querySelectorAll('.gsearch-item');
  if(e.key==='ArrowDown'){e.preventDefault();_gsIdx=Math.min(_gsIdx+1,items.length-1);}
  else if(e.key==='ArrowUp'){e.preventDefault();_gsIdx=Math.max(_gsIdx-1,0);}
  else if(e.key==='Enter'){e.preventDefault();if(_gsIdx>=0)_gsOpen(_gsIdx);else if(_gsResults.length)_gsOpen(0);return true;}
  else if(e.key==='Escape'){closeGSearch();return true;}
  else return false;
  items.forEach((el,i)=>el.classList.toggle('active',i===_gsIdx));
  items[_gsIdx]?.scrollIntoView({block:'nearest'});
  return true;
}

function t(key){return(I18N[_currentLang]||I18N.es)[key]||key;}

function buildTabBadges(){
  const bd={
    personajes:ALL.length,
    albumes:albumBooks.length,
    series:new Set(ALL.map(c=>c.series)).size,
    marcos:new Set(ALL.map(c=>c.frame).filter(Boolean)).size,
    workers:ALL.length,
    tags:new Set(ALL.map(c=>c.tag||'')).size,
    dyes:ALL.filter(c=>c['dye.name']&&c['dye.name'].trim()).length,
    stats:'—'
  };
  document.querySelectorAll('#tabsBar .tab-btn').forEach(btn=>{
    const tab=btn.dataset.tab,n=bd[tab];
    if(n!==undefined){
      btn.innerHTML=btn.innerHTML.replace(/<span.*<\/span>/,'');
      btn.innerHTML+=` <span class="badge">${n}</span>`;
    }
  });
}

function _showDashboard(){
  document.getElementById('upload-screen').style.display='none';
  document.getElementById('dashboard').style.display='block';
  _loadTagOverrides();
  loadAlbum();
  // Defer buildAll to next tick so all functions are guaranteed to be in scope
  setTimeout(()=>{
    buildAll();
    populateSuggestions();
  },0);
}

function charSelectionToggle(){
  _charSelMode = !_charSelMode;
  const btn = document.getElementById('charSelectToggle');
  const bar = document.getElementById('charSelBar');
  if(_charSelMode){
    btn.textContent = '✕ Cancelar selección';
    btn.style.borderColor = 'var(--rose)';
    btn.style.color = 'var(--rose)';
    bar.classList.remove('hidden');
  } else {
    _charSelSet.clear();
    btn.textContent = '☑ Seleccionar';
    btn.style.borderColor = '';
    btn.style.color = '';
    bar.classList.add('hidden');
  }
  // Re-render grid to apply/remove sel-mode class
  _applySelectionToGrid();
  _updateSelBar();
}

function charSelClear(){
  _charSelSet.clear();
  _applySelectionToGrid();
  _updateSelBar();
}

function charSelAll(){
  // Select all currently visible cards
  document.querySelectorAll('#charGrid .char-card').forEach(card=>{
    const code = card.dataset.code;
    if(code) _charSelSet.add(code);
  });
  _applySelectionToGrid();
  _updateSelBar();
}

function charSelToggleCard(code, cardEl){
  if(!_charSelMode) return false;
  if(_charSelSet.has(code)){
    _charSelSet.delete(code);
    cardEl.classList.remove('selected');
  } else {
    _charSelSet.add(code);
    cardEl.classList.add('selected');
  }
  _updateSelBar();
  return true; // consumed the click
}

async function charSelCopy(){
  if(!_charSelSet.size) return;
  const ids = [..._charSelSet].join(', ');
  try{
    await navigator.clipboard.writeText(ids);
  } catch(e){
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = ids; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
  }
  // Visual feedback
  const btn = document.getElementById('charSelCopyBtn');
  btn.textContent = `✅ ${_charSelSet.size} copiados`;
  setTimeout(()=>{
    btn.textContent = '📋 Copiar IDs';
    // Exit selection mode
    charSelectionToggle();
  }, 1200);
}

function _updateSelBar(){
  const n = _charSelSet.size;
  document.getElementById('charSelCount').textContent =
    n === 0 ? 'Sin selección' :
    n === 1 ? '1 carta seleccionada' :
    `${n} cartas seleccionadas`;
  document.getElementById('charSelCopyBtn').disabled = n === 0;
}

function _applySelectionToGrid(){
  document.querySelectorAll('#charGrid .char-card').forEach(card=>{
    const code = card.dataset.code;
    card.classList.toggle('sel-mode', _charSelMode);
    card.classList.toggle('selected', _charSelMode && _charSelSet.has(code));
  });
}
