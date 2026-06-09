/** lib/core.ts — CSV loading and core app state */

function parseCSV(raw){
  const lines=raw.split('\n').filter(l=>l.trim());
  if(lines.length<2)return[];
  const headers=splitLine(lines[0]).map(h=>h.replace(/^"|"$/g,'').trim());
  return lines.slice(1).map(l=>{
    const vals=splitLine(l);
    const o={};
    headers.forEach((h,i)=>o[h]=(vals[i]||'').replace(/^"|"$/g,''));
    return o;
  }).filter(r=>r.character);
}

function buildAll(){
  charsPage=40;seriesPage=50;workersPage=40;
  buildMetrics();buildTabBadges();
  _populateTagFilter();
  renderChars();renderSeries();renderFrames();renderWorkers();renderTags();renderAlbum();
  setTimeout(buildCharts,200);
}

function _getUserId(){
  const counts={};
  ALL.forEach(c=>{ if(c.grabber) counts[c.grabber]=(counts[c.grabber]||0)+1; });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
}

function loadFile(file){
  const r=new FileReader();
  r.onload=e=>{
    const raw=e.target.result;
    ALL=parseCSV(raw);
    if(!ALL.length){alert('No se encontraron cartas.');return}
    // Persist CSV in localStorage
    try{localStorage.setItem('karutaCSV',raw);}catch(ex){}
    _showDashboard();
  };
  r.readAsText(file,'UTF-8');
}

function _tryRestoreCSV(){
  try{
    const raw=localStorage.getItem('karutaCSV');
    if(!raw) return false;
    ALL=parseCSV(raw);
    if(!ALL.length){ localStorage.removeItem('karutaCSV'); return false; }
    return true;
  }catch(e){ return false; }
}

function resetApp(){
  if(!confirm('¿Borrar todos los datos guardados? Tendrás que subir el CSV de nuevo.')) return;
  destroyCharts(); ALL=[];
  try{ localStorage.removeItem('karutaCSV'); }catch(e){}
  document.getElementById('upload-screen').style.display='flex';
  document.getElementById('dashboard').style.display='none';
  document.getElementById('csvInput').value='';
  charsPage=40; seriesPage=50; workersPage=40;
}

function previewSlug(){}

function splitLine(line){
  const res=[];let cur='',inQ=false;
  for(let i=0;i<line.length;i++){
    if(line[i]==='"'){inQ=!inQ}
    else if(line[i]===','&&!inQ){res.push(cur);cur=''}
    else cur+=line[i];
  }
  res.push(cur);return res;
}

function toSlug(name){
  return name.toLowerCase()
    .replace(/['\u2019`]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

/* ══════════════════════════════════════════
   FILE INPUT
══════════════════════════════════════════ */
const dropZone=document.getElementById('dropZone');
const csvInput=document.getElementById('csvInput');
dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('drag-over')});
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('drag-over');if(e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0])});
dropZone.addEventListener('click',()=>csvInput.click());
csvInput.addEventListener('change',()=>{if(csvInput.files[0])loadFile(csvInput.files[0])});

function loadFile(file){
  const r=new FileReader();
  r.onload=e=>{
    const raw=e.target.result;
    ALL=parseCSV(raw);
    if(!ALL.length){alert('No se encontraron cartas.');return}
    // Persist CSV in localStorage
    try{localStorage.setItem('karutaCSV',raw);}catch(ex){}
    _showDashboard();
  };
  r.readAsText(file,'UTF-8');
}


function _tryRestoreCSV(){
  try{
    const raw=localStorage.getItem('karutaCSV');
    if(!raw) return false;
    ALL=parseCSV(raw);
    if(!ALL.length){ localStorage.removeItem('karutaCSV'); return false; }
    return true;
  }catch(e){ return false; }
}

/* ══════════════════════════════════════════
   CSV PARSER
══════════════════════════════════════════ */
function parseCSV(raw){
  const lines=raw.split('\n').filter(l=>l.trim());
  if(lines.length<2)return[];
  const headers=splitLine(lines[0]).map(h=>h.replace(/^"|"$/g,'').trim());
  return lines.slice(1).map(l=>{
    const vals=splitLine(l);
    const o={};
    headers.forEach((h,i)=>o[h]=(vals[i]||'').replace(/^"|"$/g,''));
    return o;
  }).filter(r=>r.character);
}
function splitLine(line){
  const res=[];let cur='',inQ=false;
  for(let i=0;i<line.length;i++){
    if(line[i]==='"'){inQ=!inQ}
    else if(line[i]===','&&!inQ){res.push(cur);cur=''}
    else cur+=line[i];
  }
  res.push(cur);return res;
}

/* ══════════════════════════════════════════
   BUILD DASHBOARD
══════════════════════════════════════════ */
function buildAll(){
  charsPage=40;seriesPage=50;workersPage=40;
  buildMetrics();buildTabBadges();
  _populateTagFilter();
  renderChars();renderSeries();renderFrames();renderWorkers();renderTags();renderAlbum();
  setTimeout(buildCharts,200);
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

function buildMetrics(){
  const t=ALL.length;
  const burn=ALL.reduce((s,c)=>s+(+c.burnValue||0),0);
  const series=new Set(ALL.map(c=>c.series)).size;
  const q4=ALL.filter(c=>c.quality==='4').length;
  const q3=ALL.filter(c=>c.quality==='3').length;
  const morphed=ALL.filter(c=>c.morphed==='Yes').length;
  const withFrame=ALL.filter(c=>c.frame&&c.frame.trim()).length;
  const mx=[
    {l:'Total cartas',v:t,s:'en colección',c:'var(--accent)'},
    {l:'Series',v:series,s:'álbumes distintos',c:'var(--teal)'},
    {l:'Burn total',v:burn.toLocaleString('es'),s:'tokens totales',c:'var(--gold)'},
    {l:'Calidad ★★★★',v:q4,s:`${t?Math.round(q4/t*100):0}% del total`,c:'var(--rose)'},
    {l:'Calidad ★★★',v:q3,s:`${t?Math.round(q3/t*100):0}% del total`,c:'var(--r3)'},
    {l:'Morphed',v:morphed,s:'cartas morpheadas',c:'var(--accent2)'},
    {l:'Con marco',v:withFrame,s:'de '+t,c:'var(--teal)'},
  ];
  document.getElementById('metricsGrid').innerHTML=mx.map(m=>`
    <div class="metric" style="--accent:${m.c}">
      <div class="metric-label">${m.l}</div>
      <div class="metric-value">${m.v}</div>
      <div class="metric-sub">${m.s}</div>
    </div>`).join('');
}

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

/* ══════════════════════════════════════════
   TABS
══════════════════════════════════════════ */
document.querySelectorAll('#tabsBar .tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const tab=btn.dataset.tab;
    const prevPanel=document.querySelector('.tab-panel.active');
    const nextPanel=document.getElementById('panel-'+tab);
    if(!nextPanel||prevPanel===nextPanel) return;

    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');

    // Fade out current, fade in next
    if(prevPanel){
      prevPanel.style.opacity='0';
      prevPanel.style.transition='opacity .1s ease';
      setTimeout(()=>{
        prevPanel.classList.remove('active');
        prevPanel.style.opacity='';
        prevPanel.style.transition='';
        nextPanel.classList.add('active');
        // Stats needs chart build
        if(tab==='stats') setTimeout(buildCharts,50);
      }, 100);
    } else {
      nextPanel.classList.add('active');
      if(tab==='stats') setTimeout(buildCharts,50);
    }
  });
});

/* ══════════════════════════════════════════
   CARD HTML (with CDN image)
══════════════════════════════════════════ */
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

/* ══════════════════════════════════════════
   PERSONAJES
══════════════════════════════════════════ */
function getFilteredChars(){
  // Reset page when called fresh (not from _appendChars)
  const list=_buildCharList();
  return list;
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
let _charsHasMore=false;
let _charsScrollObs=null;

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

/* ══════════════════════════════════════════
   ÁLBUMES
══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   ÁLBUMES (2×4 grid system)
══════════════════════════════════════════ */
// albumBooks = [{id, name, bg, bgUrl, icon, open, activePage, pages:[{slots:[8 x code|null]}, ...]}, ...]
let albumBooks = [];

const ALB_BG_PRESETS = [
  {c:'#0d0f14',l:'⬛'},
  {c:'linear-gradient(135deg,#1a0a2e,#0d1b4b)',l:'🌌'},
  {c:'linear-gradient(135deg,#0a1f0a,#0d2e1a)',l:'🌿'},
  {c:'linear-gradient(135deg,#2e0a1a,#1a0a0a)',l:'🌹'},
  {c:'linear-gradient(135deg,#0a1a2e,#0a2a3e)',l:'🌊'},
  {c:'linear-gradient(135deg,#1a1a0a,#2e2a0a)',l:'🌅'},
  {c:'linear-gradient(135deg,#2a0a2e,#1a0a2a)',l:'💜'},
  {c:'linear-gradient(135deg,#0a2a2a,#0a1a2e)',l:'🧊'},
];

function _albSave(){
  try{ localStorage.setItem('karutaAlbumBooks2', JSON.stringify(albumBooks)); }catch(e){}
  buildTabBadges();
}
function _albLoad(){
  try{ albumBooks = JSON.parse(localStorage.getItem('karutaAlbumBooks2')||'[]'); }
  catch(e){ albumBooks = []; }
}

const _albBgCache = new Map(); // albumId → dataUrl (in-memory cache for IDB bg images)

// Tab badge count = total slots filled
function albFilledCount(){
  return albumBooks.reduce((s,b)=>s+(b.pages||[]).reduce((s2,p)=>s2+p.slots.filter(Boolean).length,0),0);
}

function loadAlbum(){ _albLoad(); }
function saveAlbum(){ _albSave(); }

function renderAlbum(){
  const list = document.getElementById('albList');
  if(!list) return;
  if(!albumBooks.length){
    list.innerHTML = '<div style="text-align:center;padding:4rem;color:var(--text3)"><div style="font-size:48px;margin-bottom:1rem">🖼</div><p>No tienes álbumes. Pulsa <strong>+ Nuevo álbum</strong> para crear uno.</p></div>';
    return;
  }
  // Pre-warm IDB bg cache before rendering so images are ready immediately
  const bgPromises = albumBooks
    .filter(b=>b.bgUrl?.startsWith('idb:bg:')&&!_albBgCache.has(b.id))
    .map(b=>_loadAlbumBg(b.id));
  if(bgPromises.length){
    Promise.all(bgPromises).then(()=>{
      list.innerHTML = albumBooks.map((b,bi)=>_renderAlbumGroup(b,bi)).join('');
      wireImgs(); _applyCustomImgsToAlbum();
    });
  } else {
    list.innerHTML = albumBooks.map((b,bi) => _renderAlbumGroup(b, bi)).join('');
    wireImgs();
    _applyCustomImgsToAlbum();
  }
}

// Apply custom images to a specific DOM element (not full re-render)
async function _applyCustomImgsToAlbumEl(el){
  const imgs=el.querySelectorAll('.alb-slot-img[data-code]');
  for(const img of imgs){
    const code=img.dataset.code;
    if(!code) continue;
    const custom=await _loadCustomImgAsync(code);
    if(custom) img.src=custom;
  }
}

async function _applyCustomImgsToAlbum(){
  for(const b of albumBooks){
    for(const row of (b.pages||[])){
      for(const code of (row.slots||[])){
        if(!code) continue;
        const custom = await _loadCustomImgAsync(code);
        if(!custom) continue;
        document.querySelectorAll(`.alb-slot-img[data-code="${CSS.escape(code)}"]`).forEach(img=>{
          img.src = custom;
          const slot=img.closest('.alb-slot');
          if(slot){ slot.classList.add('img-loaded'); slot.classList.add('has-custom'); }
        });
      }
    }
  }
}

function _renderAlbumGroup(b, bi){
  // Migrate old rows format to pages
  if(b.rows && !b.pages){
    const allSlots = b.rows.flatMap(r=>r.slots);
    b.pages = [];
    for(let i=0;i<allSlots.length;i+=8){
      b.pages.push({slots: allSlots.slice(i,i+8).concat(Array(8).fill(null)).slice(0,8)});
    }
    if(!b.pages.length) b.pages=[{slots:Array(8).fill(null)}];
    delete b.rows;
    b.activePage = 0;
  }
  const ap = b.activePage||0;
  const page = b.pages[ap] || b.pages[0];
  const filled = b.pages.reduce((s,p)=>s+p.slots.filter(Boolean).length,0);
  const total = b.pages.length*8;

  const pageTabs = b.pages.map((p,pi)=>{
    const pFilled = p.slots.filter(Boolean).length;
    const isActive = pi===ap;
    return `<div class="alb-page-tab-wrap"
        draggable="true"
        ondragstart="albPageDragStart(event,${bi},${pi})"
        ondragover="event.preventDefault();this.classList.add('drag-over')"
        ondragleave="this.classList.remove('drag-over')"
        ondrop="event.preventDefault();this.classList.remove('drag-over');albPageDrop(event,${bi},${pi})">
      <button class="alb-page-tab${isActive?' active':''}" onclick="albSetPage(${bi},${pi})">
        Pág.${pi+1}<span style="font-size:10px;opacity:.7"> ${pFilled}/8</span>
      </button>
      <span class="alb-page-move">
        ${pi>0?`<button class="alb-page-mv-btn" onclick="albMovePage(${bi},${pi},${pi-1})" title="Mover izquierda">‹</button>`:''}
        ${pi<b.pages.length-1?`<button class="alb-page-mv-btn" onclick="albMovePage(${bi},${pi},${pi+1})" title="Mover derecha">›</button>`:''}
      </span>
      <button class="alb-page-tab del-page" onclick="albDelPage(${bi},${pi})" title="Eliminar página">✕</button>
    </div>`;
  }).join('');

  return `<div class="alb-group${b.open?' open':''}" id="alb-${b.id}">
    <div class="alb-group-header" onclick="albToggle('${b.id}')">
      <span style="font-size:18px">${b.icon||'🖼'}</span>
      <span class="alb-group-title">${esc(b.name)}</span>
      <span class="alb-group-meta">${filled}/${total} cartas · ${b.pages.length} pág. <span class="alb-group-chevron">▼</span></span>
      <div class="alb-group-actions" onclick="event.stopPropagation()">
        <button class="alb-icon-btn" onclick="albExport('${b.id}')" title="Exportar página a imagen">📷</button>
        <button class="alb-icon-btn" onclick="albRename(${bi})" title="Renombrar">✏️</button>
        <button class="alb-icon-btn del" onclick="albDelete(${bi})" title="Eliminar álbum">🗑</button>
      </div>
    </div>
    <div class="alb-body">
      ${_renderAlbumBgBar(b, bi)}
      ${_renderAlbumPage(b, bi, page, ap)}
      <div class="alb-page-tabs">
        ${pageTabs}
        <button class="alb-page-tab add-page" onclick="albAddPage(${bi})">＋ Nueva página</button>
      </div>
    </div>
  </div>`;
}

function _renderAlbumBgBar(b, bi){
  const swatches = ALB_BG_PRESETS.map((p)=>
    `<div class="alb-bg-swatch${b.bg===p.c&&!b.bgUrl?' active':''}" style="background:${p.c}" title="${p.l}" onclick="albSetBg(${bi},'${p.c}')"></div>`
  ).join('');
  const hasImg = !!b.bgUrl;
  return `<div class="alb-bg-bar" id="alb-bg-bar-${bi}">
    <span class="alb-bg-label">Fondo:</span>
    <div class="alb-bg-swatches">${swatches}</div>
    <div class="alb-bg-drop-zone${hasImg?' has-img':''}"
      id="alb-bg-drop-${bi}"
      onclick="document.getElementById('alb-bg-file-${bi}').click()"
      ondragenter="event.preventDefault();event.stopPropagation();this.classList.add('drag-over')"
      ondragover="event.preventDefault();event.stopPropagation()"
      ondragleave="event.stopPropagation();this.classList.remove('drag-over')"
      ondrop="event.preventDefault();event.stopPropagation();this.classList.remove('drag-over');albHandleBgDrop(${bi},event.dataTransfer.files[0]||null,event.dataTransfer.getData('text'))">
      <input type="file" id="alb-bg-file-${bi}" accept="image/*" style="display:none"
        onchange="albHandleBgFile(${bi},this.files[0]);this.value=''">
      ${hasImg ? '🖼 Cambiar' : '🖼 Soltar imagen'}
    </div>
    <input class="alb-bg-url-input" placeholder="o pegar URL…" value=""
      onkeydown="if(event.key==='Enter')albSetBgFromUrl(${bi},this.value)"
      onblur="if(this.value.trim())albSetBgFromUrl(${bi},this.value)">
    ${hasImg?`<button class="alb-bg-clear-btn" onclick="albClearBgImg(${bi})" title="Quitar imagen">✕</button>`:''}
  </div>`;
}

function _renderSlot(b, bi, pi, si, code){
  if(!code){
    return `<div class="alb-slot" onclick="openCardPicker(${bi},${pi},${si})" title="Añadir carta">
      <span class="alb-slot-empty-icon">＋</span>
    </div>`;
  }
  const c = ALL.find(x=>x.code===code) || null;
  const imgUrl = c ? (CDN+toSlug(c.character)+'-'+(c.edition||'1')+'.jpg') : '';
  const name = c ? c.character : code;
  const q = c ? (c.quality||'0') : '0';
  const imgId = 'asi-'+code.replace(/[^a-z0-9]/gi,'_');
  if(c){
    _loadCustomImgAsync(c.code).then(custom=>{
      if(!custom) return;
      const el=document.getElementById(imgId);
      if(el){
        el.src=custom;
        el.closest('.alb-slot')?.classList.add('has-custom');
      }
    });
  }
  return `<div class="alb-slot filled" title="${esc(name)}">
    <div class="alb-quality-bar" style="background:${QS[q]}"></div>
    ${imgUrl?`<div class="alb-slot-loading" id="spin-${imgId}"><div class="kp-spinner kp-spinner-sm"></div></div>
    <img id="${imgId}" class="alb-slot-img" src="${imgUrl}" alt="${esc(name)}" data-code="${esc(code)}"
      onerror="this.src='';this.style.display='none';document.getElementById('spin-${imgId}')?.remove()"
      onload="this.closest('.alb-slot')?.classList.add('img-loaded');document.getElementById('spin-${imgId}')?.remove()">`:''}
    <div class="alb-slot-overlay-top"></div>
    <div class="alb-slot-overlay-bot"></div>
    <div class="alb-slot-top-info">
      <div class="alb-slot-char">${esc(name)}</div>
      ${c?`<div class="alb-slot-series">${esc(c.series||'')}</div>`:''}
    </div>
    <div class="alb-slot-bot-info">
      ${c?`<div class="alb-slot-meta">Ed.${c.edition||'?'} · #${c.number||'?'}</div>
      <div class="alb-slot-meta" style="opacity:.75;font-size:7px">${esc(c.code||'')}</div>`:''}
    </div>
    <div class="alb-slot-btns">
      ${c?`<button class="alb-slot-action" onclick="event.stopPropagation();openCardModal('${esc(c.code||c.character)}')" title="Ver carta / cambiar imagen">🔍</button>`:''}
      <button class="alb-slot-action swap" onclick="event.stopPropagation();openCardPicker(${bi},${pi},${si})" title="Cambiar carta">⇄</button>
      <button class="alb-slot-action del" onclick="event.stopPropagation();albClearSlot(${bi},${pi},${si})" title="Quitar">✕</button>
    </div>
  </div>`;
}

function _renderAlbumPage(b, bi, page, pi){
  // If bg is in cache, use it directly in the style (no async needed)
  const cachedBg = b.bgUrl?.startsWith('idb:bg:') ? _albBgCache.get(b.id) : null;
  const bgStyle = cachedBg
    ? `background-image:url('${cachedBg}');background-size:cover;background-position:center`
    : b.bgUrl?.startsWith('idb:bg:')
      ? `background:${b.bg||'var(--bg3)'}` // placeholder, updated async
      : b.bgUrl
        ? `background-image:url('${esc(b.bgUrl)}');background-size:cover;background-position:center`
        : `background:${b.bg||'var(--bg3)'}`;

  const slots=(page.slots||Array(8).fill(null)).map((code,si)=>_renderSlot(b,bi,pi,si,code)).join('');
  const html=`<div class="alb-page" style="${bgStyle}" id="albrow-${b.id}-${pi}">${slots}</div>`;

  // Only need async load if not in cache yet
  if(b.bgUrl?.startsWith('idb:bg:') && !cachedBg){
    _loadAlbumBg(b.id).then(dataUrl=>{
      if(!dataUrl) return;
      function applyBg(attempts){
        const el=document.getElementById('albrow-'+b.id+'-'+pi);
        if(el){
          el.style.backgroundImage=`url('${dataUrl}')`;
          el.style.backgroundSize='cover';
          el.style.backgroundPosition='center';
        } else if(attempts>0){
          setTimeout(()=>applyBg(attempts-1), 80);
        }
      }
      requestAnimationFrame(()=>applyBg(5));
    });
  }
  return html;
}


// ── Controls ──
function albToggle(id){
  const b = albumBooks.find(x=>x.id===id);
  if(!b) return;
  b.open = !b.open;
  _albSave();
  renderAlbum();
}

function albCreateNew(){
  const name = prompt('Nombre del álbum:','Mi álbum');
  if(!name) return;
  albumBooks.push({
    id: 'alb'+Date.now(),
    name,
    icon: '🖼',
    bg: ALB_BG_PRESETS[0].c,
    bgUrl: '',
    open: true,
    activePage: 0,
    pages: [{ slots: Array(8).fill(null) }]
  });
  _albSave();
  renderAlbum();
}

function albRename(bi){
  const b = albumBooks[bi];
  if(!b) return;
  const name = prompt('Nuevo nombre:', b.name);
  if(!name) return;
  b.name = name;
  _albSave();
  renderAlbum();
}

function albDelete(bi){
  if(!confirm('¿Eliminar este álbum?')) return;
  albumBooks.splice(bi, 1);
  _albSave();
  renderAlbum();
}

function albSetPage(bi, pi){
  const b=albumBooks[bi]; if(!b) return;
  b.activePage=pi;
  _albSave();

  // Surgical update: only swap the page content, no full re-render
  const groupEl=document.getElementById('alb-'+b.id);
  if(!groupEl){ renderAlbum(); return; }

  // Fade out current page
  const oldPage=groupEl.querySelector('.alb-page');
  if(oldPage){
    oldPage.classList.add('fading');
    setTimeout(()=>{
      // Swap page HTML
      const page=b.pages[pi]||b.pages[0];
      const newPageHtml=_renderAlbumPage(b,bi,page,pi);
      oldPage.outerHTML=newPageHtml;
      // Re-wire images in the new page
      const newPage=groupEl.querySelector('.alb-page');
      if(newPage){
        newPage.querySelectorAll('img[data-src]').forEach(img=>{
          if(_lazyObs) _lazyObs.observe(img);
        });
        _applyCustomImgsToAlbumEl(newPage);
      }
    }, 120);
  }

  // Update tab active states
  groupEl.querySelectorAll('.alb-page-tab:not(.del-page):not(.add-page)').forEach((tab,i)=>{
    tab.classList.toggle('active', i===pi);
  });
}

function albAddPage(bi){
  const b = albumBooks[bi];
  if(!b) return;
  b.pages.push({slots: Array(8).fill(null)});
  b.activePage = b.pages.length-1;
  _albSave();
  renderAlbum();
}

function albDelPage(bi, pi){
  const b = albumBooks[bi];
  if(!b||b.pages.length<=1){ alert('El álbum debe tener al menos una página.'); return; }
  const filled = b.pages[pi].slots.filter(Boolean).length;
  if(filled && !confirm(`¿Eliminar página ${pi+1}? Tiene ${filled} carta${filled!==1?'s':''}.`)) return;
  b.pages.splice(pi,1);
  b.activePage = Math.min(b.activePage||0, b.pages.length-1);
  _albSave();
  renderAlbum();
}


function albSetBg(bi, bg){
  const b=albumBooks[bi]; if(!b) return;
  b.bg=bg; b.bgUrl='';
  _saveAlbumBg(b.id, null);
  _albSave();
  renderAlbum();
}

function albSetBgUrl(bi, url){ /* legacy no-op */ }

function albHandleBgFile(bi, file){
  if(!file) return;
  const b=albumBooks[bi]; if(!b) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const dataUrl=e.target.result;
    b.bgUrl='idb:bg:'+b.id;
    _albSave();
    // Save to IDB + cache, then render once it's ready
    _saveAlbumBg(b.id, dataUrl).then(()=>renderAlbum());
  };
  reader.readAsDataURL(file);
}

function albHandleBgDrop(bi, file, text){
  if(file && file.type?.startsWith('image/')) { albHandleBgFile(bi, file); return; }
  const url=(text||'').trim();
  if(url && (url.startsWith('http')||url.startsWith('data:'))) albSetBgFromUrl(bi, url);
}

function albSetBgFromUrl(bi, url){
  url=(url||'').trim();
  if(!url) return;
  const b=albumBooks[bi]; if(!b) return;
  // Store URL directly in bgUrl (legacy path — canvas will fetch it)
  b.bgUrl=url;
  _albSave();
  renderAlbum();
}

function albClearBgImg(bi){
  const b=albumBooks[bi]; if(!b) return;
  _saveAlbumBg(b.id, null);
  b.bgUrl='';
  _albSave();
  renderAlbum();
}

function _saveAlbumBg(albumId, dataUrl){
  if(dataUrl) _albBgCache.set(albumId, dataUrl);
  else _albBgCache.delete(albumId);
  return _openIdb().then(db=>{
    const tx=db.transaction(_idbStore,'readwrite');
    const store=tx.objectStore(_idbStore);
    const key='albg:'+albumId;
    if(dataUrl) store.put(dataUrl, key);
    else store.delete(key);
    return new Promise(r=>{ tx.oncomplete=r; tx.onerror=r; });
  }).catch(()=>{});
}

function _loadAlbumBg(albumId){
  if(_albBgCache.has(albumId)) return Promise.resolve(_albBgCache.get(albumId));
  return _openIdb().then(db=>{
    const tx=db.transaction(_idbStore,'readonly');
    return new Promise(r=>{
      const req=tx.objectStore(_idbStore).get('albg:'+albumId);
      req.onsuccess=()=>{
        const v=req.result||null;
        if(v) _albBgCache.set(albumId, v);
        r(v);
      };
      req.onerror=()=>r(null);
    });
  }).catch(()=>null);
}

function albClearSlot(bi, pi, si){
  const b = albumBooks[bi];
  if(!b) return;
  b.pages[pi].slots[si] = null;
  _albSave();
  renderAlbum();
}

// ── Card Picker ──
let _cpTarget = null; // {bi, ri, si}

function openCardPicker(bi, pi, si){
  _cpTarget = {bi, pi, si};
  document.getElementById('cardPickerOverlay').classList.remove('hidden');
  const inp = document.getElementById('cpSearch');
  inp.value = '';
  renderCardPicker('');
  requestAnimationFrame(()=>inp.focus());
}

function closeCardPicker(){
  document.getElementById('cardPickerOverlay').classList.add('hidden');
  _cpTarget = null;
}

function renderCardPicker(q){
  const list = document.getElementById('cpList');
  const sq = (q||'').toLowerCase().trim();

  // Filter ALL cards by name or code
  let cards = sq
    ? ALL.filter(c =>
        c.character.toLowerCase().includes(sq) ||
        (c.code||'').toLowerCase().includes(sq) ||
        (c.series||'').toLowerCase().includes(sq))
    : ALL.slice(0, 80); // show first 80 if no query

  if(!cards.length){
    list.innerHTML = '<div class="card-picker-empty">Sin resultados</div>';
    return;
  }

  // Group by name to detect duplicates
  const nameCounts = {};
  cards.forEach(c => { nameCounts[c.character] = (nameCounts[c.character]||0)+1; });

  list.innerHTML = cards.slice(0,120).map(c=>{
    const isDup = nameCounts[c.character] > 1;
    const thumb = CDN + toSlug(c.character) + '-' + (c.edition||'1') + '.jpg';
    const detail = isDup
      ? `Ed.${c.edition||'?'} · ${QL[c.quality]||c.quality+'★'} · Print #${c.number||'?'} · ${esc(c.series||'—')}`
      : `Ed.${c.edition||'?'} · ${QL[c.quality]||c.quality+'★'} · ${esc(c.series||'—')}`;
    return `<div class="card-picker-item" onclick="albPickCard('${esc(c.code||'')}')">
      <img class="card-picker-thumb" src="${thumb}" alt="" onerror="this.style.opacity='.3'">
      <div class="card-picker-info">
        <div class="card-picker-name">${esc(c.character)}</div>
        <div class="card-picker-detail">${detail}</div>
        ${isDup?`<span class="card-picker-code">${esc(c.code)}</span>`:''}
      </div>
    </div>`;
  }).join('');
}

function albPickCard(code){
  if(!_cpTarget||!code) return;
  const {bi,pi,si} = _cpTarget;
  const b = albumBooks[bi];
  if(!b) return;
  b.pages[pi].slots[si] = code;
  _albSave();
  closeCardPicker();
  renderAlbum();
}

// Keyboard search in picker
document.addEventListener('keydown', e=>{
  if(!document.getElementById('cardPickerOverlay')?.classList.contains('hidden')) return;
  if(e.key==='Escape') closeCardPicker();
});

// Legacy stubs (keep buildTabBadges working)
function importAllToAlbum(){}
function clearAlbum(){}
function addAlbumCard(){}
function populateSuggestions(){}
function previewSlug(){}
function delAlbum(){}
function openAlbumModal(){ /* legacy stub */ }

/* ══════════════════════════════════════════
   ALBUM EXPORT
══════════════════════════════════════════ */
let _exportCanvas = null;
let _exportFilename = '';

async function albExport(id){
  const b = albumBooks.find(x=>x.id===id);
  if(!b) return;

  const ap = b.activePage||0;
  const page = b.pages[ap] || b.pages[0];

  // Show overlay with loading state
  document.getElementById('albPreviewTitle').textContent = (b.icon||'🖼')+' '+b.name+' — Pág.'+(ap+1);
  document.getElementById('albPreviewSub').textContent = 'Generando previsualización…';
  document.getElementById('albPreviewOverlay').classList.remove('hidden');
  document.getElementById('albPreviewCanvas').style.opacity = '0.3';

  _exportFilename = (b.name||'album').replace(/[^a-z0-9]/gi,'_')+'_pag'+(ap+1)+'.png';

  try {
    const canvas = await _buildAlbumCanvas(b, page, ap);
    _exportCanvas = canvas;
    // Show in preview
    const preview = document.getElementById('albPreviewCanvas');
    preview.width  = canvas.width;
    preview.height = canvas.height;
    preview.getContext('2d').drawImage(canvas, 0, 0);
    preview.style.opacity = '1';
    document.getElementById('albPreviewSub').textContent = canvas.width/2+'×'+canvas.height/2+' px';
  } catch(e) {
    document.getElementById('albPreviewSub').textContent = '❌ Error: '+e.message;
  }
}

function albPreviewCancel(){
  document.getElementById('albPreviewOverlay').classList.add('hidden');
  _exportCanvas = null;
}

function albPreviewConfirm(){
  if(!_exportCanvas) return;
  const link = document.createElement('a');
  link.download = _exportFilename;
  link.href = _exportCanvas.toDataURL('image/png');
  link.click();
  albPreviewCancel();
}

// Close on backdrop click
document.addEventListener('click', e=>{
  if(e.target.id==='albPreviewOverlay') albPreviewCancel();
});

async function _buildAlbumCanvas(b, page, ap){
  const COLS=4, ROWS=2, GAP=12, INNER_PAD=16;
  const SLOT_W=160, SLOT_H=Math.round(SLOT_W*1.5); // 160×240
  const GRID_W=COLS*SLOT_W+(COLS-1)*GAP;            // 676
  const GRID_H=ROWS*SLOT_H+(ROWS-1)*GAP;            // 492
  const W=GRID_W+INNER_PAD*2;                       // 708
  const H=GRID_H+INNER_PAD*2;                       // 524
  const SCALE=2;

  const canvas=document.createElement('canvas');
  canvas.width=W*SCALE; canvas.height=H*SCALE;
  const ctx=canvas.getContext('2d');
  ctx.scale(SCALE,SCALE);

  // Load image to bitmap — handles data: URLs, CDN URLs
  async function loadBmp(url){
    if(!url) return null;
    // For data: URLs use Image element (no fetch needed, avoids blob overhead)
    if(url.startsWith('data:')){
      return new Promise(resolve=>{
        const img=new Image();
        img.onload=()=>{ try{ resolve(createImageBitmap(img)); }catch(e){ resolve(null); } };
        img.onerror=()=>resolve(null);
        img.src=url;
      }).then(r=>r||null).catch(()=>null);
    }
    // For external URLs try direct then corsproxy
    for(const src of [url,'https://corsproxy.io/?'+encodeURIComponent(url)]){
      try{
        const res=await fetch(src,{mode:'cors'});
        if(!res.ok) continue;
        return await createImageBitmap(await res.blob());
      }catch(e){ continue; }
    }
    return null;
  }

  // Pre-load images + check which have custom imgs
  const imgMap={}, isCustom={};
  for(const code of page.slots){
    if(!code||imgMap[code]) continue;
    const c=ALL.find(x=>x.code===code);
    if(!c) continue;
    const custom=await _loadCustomImgAsync(code);
    if(custom){
      imgMap[code]=await loadBmp(custom);
      if(imgMap[code]){ isCustom[code]=true; continue; }
    }
    imgMap[code]=await loadBmp(CDN+toSlug(c.character)+'-'+(c.edition||'1')+'.jpg')
              || await loadBmp(CDN+toSlug(c.character)+'-1.jpg');
  }

  // Panel background — supports both solid colors AND CSS gradients
  let bgDrawn = false;
  if(b.bgUrl?.startsWith('idb:bg:')){
    const bgDataUrl = await _loadAlbumBg(b.id);
    if(bgDataUrl){
      const bgBmp = await loadBmp(bgDataUrl);
      if(bgBmp){
        ctx.save(); _rrect(ctx,0,0,W,H,10); ctx.clip();
        ctx.drawImage(bgBmp,0,0,W,H);
        ctx.restore(); bgBmp.close();
        bgDrawn = true;
      }
    }
  } else if(b.bgUrl && b.bgUrl.length > 0){
    const bgBmp = await loadBmp(b.bgUrl);
    if(bgBmp){
      ctx.save(); _rrect(ctx,0,0,W,H,10); ctx.clip();
      ctx.drawImage(bgBmp,0,0,W,H);
      ctx.restore(); bgBmp.close();
      bgDrawn = true;
    }
  }

  if(!bgDrawn){
    const bgVal = b.bg || '#0d0f14';
    if(bgVal.startsWith('linear-gradient') || bgVal.startsWith('radial-gradient')){
      // Render CSS gradient via a DOM element snapshot
      const tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      const tmpCtx = tmp.getContext('2d');
      // Parse gradient stops manually for the known presets
      // Fallback: use the first color extracted from gradient
      const colors = [...bgVal.matchAll(/#[0-9a-f]{3,6}/gi)].map(m=>m[0]);
      if(colors.length >= 2){
        const grad = tmpCtx.createLinearGradient(0,0,W,H); // 135deg ≈ diagonal
        colors.forEach((c,i)=>grad.addColorStop(i/(colors.length-1),c));
        tmpCtx.fillStyle = grad;
      } else {
        tmpCtx.fillStyle = colors[0] || '#0d0f14';
      }
      tmpCtx.fillRect(0,0,W,H);
      ctx.save(); _rrect(ctx,0,0,W,H,10); ctx.clip();
      ctx.drawImage(tmp,0,0,W,H);
      ctx.restore();
    } else {
      _rfill(ctx,0,0,W,H,10,bgVal);
    }
  }

  // Slots
  for(let si=0;si<COLS*ROWS;si++){
    const code=page.slots[si]||null;
    const col=si%COLS, row=Math.floor(si/COLS);
    const sx=INNER_PAD+col*(SLOT_W+GAP);
    const sy=INNER_PAD+row*(SLOT_H+GAP);
    const bmp=code?imgMap[code]:null;
    const hasCustom=code?!!isCustom[code]:false;

    if(bmp){
      ctx.save(); _rrect(ctx,sx,sy,SLOT_W,SLOT_H,8); ctx.clip();
      ctx.drawImage(bmp,sx,sy,SLOT_W,SLOT_H);
      ctx.restore();

      const c=ALL.find(x=>x.code===code);
      if(c && !hasCustom){
        const qc={0:'#555c78',1:'#60b8f0',2:'#41d9b0',3:'#a593ff',4:'#f06080'};
        ctx.fillStyle=qc[c.quality||'0']||'#555';
        ctx.fillRect(sx,sy,SLOT_W,3);
        const tg=ctx.createLinearGradient(0,sy,0,sy+SLOT_H*.48);
        tg.addColorStop(0,'rgba(0,0,0,0.82)'); tg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=tg; ctx.fillRect(sx,sy,SLOT_W,SLOT_H*.48);
        const bg2=ctx.createLinearGradient(0,sy+SLOT_H*.52,0,sy+SLOT_H);
        bg2.addColorStop(0,'rgba(0,0,0,0)'); bg2.addColorStop(1,'rgba(0,0,0,0.88)');
        ctx.fillStyle=bg2; ctx.fillRect(sx,sy+SLOT_H*.52,SLOT_W,SLOT_H*.48);
        ctx.shadowColor='rgba(0,0,0,1)'; ctx.shadowBlur=5;
        ctx.font='bold 9.5px Outfit,sans-serif'; ctx.fillStyle='#fff'; ctx.textAlign='left';
        ctx.fillText(c.character,sx+6,sy+16,SLOT_W-12);
        ctx.font='7.5px Outfit,sans-serif'; ctx.fillStyle='rgba(255,255,255,0.78)';
        ctx.fillText(c.series||'',sx+6,sy+27,SLOT_W-12);
        ctx.textAlign='right';
        ctx.font='bold 8px "Space Mono",monospace'; ctx.fillStyle='rgba(255,255,255,0.92)';
        ctx.fillText('Ed.'+(c.edition||'?')+' · #'+(c.number||'?'),sx+SLOT_W-6,sy+SLOT_H-14,SLOT_W-10);
        ctx.font='6.5px "Space Mono",monospace'; ctx.fillStyle='rgba(255,255,255,0.5)';
        ctx.fillText(c.code||'',sx+SLOT_W-6,sy+SLOT_H-5,SLOT_W-10);
        ctx.textAlign='left'; ctx.shadowBlur=0;
      }
    } else {
      _rfill(ctx,sx,sy,SLOT_W,SLOT_H,8,'rgba(255,255,255,0.05)');
      ctx.strokeStyle='rgba(255,255,255,0.12)';
      ctx.lineWidth=1.5; ctx.setLineDash([4,4]);
      _rrect(ctx,sx+1,sy+1,SLOT_W-2,SLOT_H-2,7); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  Object.values(imgMap).forEach(bmp=>{ try{if(bmp)bmp.close();}catch(e){} });
  return canvas;
}
function _rrect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
function _rfill(ctx,x,y,w,h,r,color){ ctx.fillStyle=color; _rrect(ctx,x,y,w,h,r); ctx.fill(); }
// Keep old names as aliases for anything that may call them
function _roundRect(ctx,x,y,w,h,r){ _rrect(ctx,x,y,w,h,r); }
function _roundFill(ctx,x,y,w,h,r){ ctx.fillStyle=ctx.fillStyle; _rrect(ctx,x,y,w,h,r); ctx.fill(); }


/* ── SERIES ── */
function _buildSeriesData(){
  const q=(document.getElementById('searchSeries')?.value||'').toLowerCase();
  const sort=document.getElementById('sortSeries')?.value||'count';
  const map={};
  ALL.forEach(c=>{const s=c.series||'Desconocida';if(!map[s])map[s]={count:0,burn:0,cards:[]};map[s].count++;map[s].burn+=(+c.burnValue||0);map[s].cards.push(c);});
  let entries=Object.entries(map).filter(([s])=>!q||s.toLowerCase().includes(q));
  const fns={count:(a,b)=>b[1].count-a[1].count,burn:(a,b)=>b[1].burn-a[1].burn,alpha:(a,b)=>a[0].localeCompare(b[0])};
  entries.sort(fns[sort]||fns.count);
  return entries;
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
function moreSeries(){seriesPage+=50;renderSeries();}

/* ── FRAMES ── */
function frameImgEl(key){
  const url=frameImgUrl(key);
  if(!url)return'<div class="frame-no-img">🖼️</div>';
  const uid='fi'+(++_imgUid);
  return '<img class="frame-img" id="'+uid+'" src="'+url+'" alt="">';
}
function wireFrameImgs(){
  document.querySelectorAll('.frame-img').forEach(img=>{
    img.onerror=function(){this.style.display='none';if(this.parentElement)this.parentElement.innerHTML='<div class="frame-no-img">🖼️</div>';};
  });
}
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

/* ── WORKERS ── */
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

/* ── TAGS ── */
let _tagSelectMode=false;
const _tagSelected=new Set();
function _tagCardKey(c){return c.code||(c.character+'|'+c.edition);}
function toggleTagSelect(){
  _tagSelectMode=!_tagSelectMode;_tagSelected.clear();
  const btn=document.getElementById('btnToggleSelect'),bar=document.getElementById('tagSelectBar'),hint=document.getElementById('tagMgrHint');
  btn?.classList.toggle('active',_tagSelectMode);
  if(btn)btn.textContent=_tagSelectMode?'✕ Cancelar selección':'✦ Seleccionar cartas';
  bar?.classList.toggle('visible',_tagSelectMode);
  if(hint)hint.textContent=_tagSelectMode?'Haz clic en las cartas para seleccionarlas.':'Cartas agrupadas por tag. Activa la selección para gestionar tags.';
  renderTags();
}
function toggleCardSelect(code){
  if(_tagSelected.has(code))_tagSelected.delete(code);else _tagSelected.add(code);
  const sel=_tagSelected.has(code);
  document.querySelectorAll('.char-card[data-code="'+CSS.escape(code)+'"]').forEach(el=>{
    el.classList.toggle('selected',sel);
    const check=el.querySelector('.card-select-check');if(check)check.textContent=sel?'✓':'';
  });
  const el=document.getElementById('tagSelCount');if(el)el.textContent=_tagSelected.size+' seleccionada'+(_tagSelected.size!==1?'s':'');
}
function selectAllVisible(){
  document.querySelectorAll('#tagsSection .char-card.selectable').forEach(el=>{
    const code=el.dataset.code;if(!code)return;
    _tagSelected.add(code);el.classList.add('selected');
    const check=el.querySelector('.card-select-check');if(check)check.textContent='✓';
  });
  const el=document.getElementById('tagSelCount');if(el)el.textContent=_tagSelected.size+' seleccionada'+(_tagSelected.size!==1?'s':'');
}
function clearSelection(){
  _tagSelected.clear();
  document.querySelectorAll('.char-card.selected').forEach(el=>{el.classList.remove('selected');const c=el.querySelector('.card-select-check');if(c)c.textContent='';});
  const el=document.getElementById('tagSelCount');if(el)el.textContent='0 seleccionadas';
}
function copyTagCommand(){
  const tag=(document.getElementById('tagInput')?.value||'').trim();
  if(!tag){alert('Escribe un tag primero.');return;}
  if(!_tagSelected.size){alert('Selecciona al menos una carta.');return;}
  const codes=[...ALL.filter(c=>_tagSelected.has(_tagCardKey(c))).map(c=>c.code)].filter(Boolean);
  if(!codes.length){alert('Las cartas seleccionadas no tienen código.');return;}
  const cmd='k!tag '+tag+' '+codes.join(' ');
  navigator.clipboard.writeText(cmd).then(()=>{
    const msg=document.getElementById('tagCopiedMsg');if(msg){msg.textContent='✅ Copiado: '+cmd.slice(0,60)+(cmd.length>60?'…':'');msg.style.display='inline';setTimeout(()=>msg.style.display='none',3000);}
  }).catch(()=>{prompt('Copia el comando:',cmd);});
}
function applyTagLocally(){
  const tag=(document.getElementById('tagInput')?.value||'').trim();
  if(!tag){alert('Escribe un tag primero.');return;}
  if(!_tagSelected.size){alert('Selecciona al menos una carta.');return;}
  const keys=new Set(_tagSelected);
  ALL.forEach(c=>{if(keys.has(_tagCardKey(c)))c.tag=tag;});
  _persistTagChanges();
  const msg=document.getElementById('tagCopiedMsg');if(msg){msg.textContent='✅ Tag "'+tag+'" aplicado a '+keys.size+' carta'+(keys.size!==1?'s':'');msg.style.display='inline';setTimeout(()=>msg.style.display='none',3000);}
  renderTags();buildTabBadges();
}
function clearSelTagLocally(){
  if(!_tagSelected.size){alert('Selecciona al menos una carta.');return;}
  if(!confirm('¿Quitar el tag de '+_tagSelected.size+' carta'+(_tagSelected.size!==1?'s':'')+'?'))return;
  const keys=new Set(_tagSelected);
  ALL.forEach(c=>{if(keys.has(_tagCardKey(c)))c.tag='';});
  _persistTagChanges();renderTags();buildTabBadges();
}
function mkTagCard(c){
  const code=_tagCardKey(c),isSelected=_tagSelected.has(code),q=c.quality||'0';
  const safeCode=code.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const bv=+c.burnValue||0,wl=+c.wishlists||0;
  const img=cardImgEl(c.character,c.edition||'1',c.code);
  const pills=[c.tag?`<span class="pill pill-tag">#${esc(c.tag)}</span>`:'',c.frame?`<span class="pill pill-frame">🖼</span>`:'',c.morphed==='Yes'?`<span class="pill pill-morph">✨</span>`:'',c.trimmed==='Yes'?`<span class="pill pill-morph">✂</span>`:''].filter(Boolean).join('');
  const onclick=_tagSelectMode?`toggleCardSelect('${safeCode}')`:`openCardModal('${safeCode}')`;
  const selectCheck=_tagSelectMode?`<div class="card-select-check">${isSelected?'✓':''}</div>`:'';
  return `<div class="char-card${_tagSelectMode?' selectable':''}${isSelected?' selected':''}" data-code="${esc(code)}" onclick="${onclick}">
    <div class="card-quality-bar" style="background:${QS[q]}"></div>${selectCheck}
    <div class="card-img-wrap loading">${img}<div class="card-no-img" style="display:none"><span class="ni-icon">🎴</span><span>Sin imagen</span></div><span class="card-q-badge ${QB[q]||'bq0'}">${QL[q]||q}</span></div>
    <div class="card-info"><div class="card-name">${esc(c.character)}</div><div class="card-series">${esc(c.series||'—')}</div>
    <div class="card-row"><span class="pill pill-ed">Ed.${c.edition||'?'}</span>${pills}${wl>0?`<span class="card-wl">♥${wl}</span>`:''}<span class="card-burn"><b>${bv.toLocaleString()}</b>🔥</span></div></div>
  </div>`;
}
function renderTags(){
  const search=(document.getElementById('tagSearchChar')?.value||'').toLowerCase();
  const qual=document.getElementById('tagFilterQual')?.value||'';
  const tagFilter=document.getElementById('tagFilterTag')?.value||'';
  const filtered=ALL.filter(c=>{
    const mS=!search||c.character.toLowerCase().includes(search)||(c.series||'').toLowerCase().includes(search);
    return mS&&(!qual||c.quality===qual);
  });
  const map={};filtered.forEach(c=>{const t=(c.tag&&c.tag.trim())?c.tag.trim():'';if(!map[t])map[t]=[];map[t].push(c);});
  const tagSel=document.getElementById('tagFilterTag');
  if(tagSel){
    const allTags=[...new Set(ALL.map(c=>(c.tag||'').trim()).filter(Boolean))].sort();
    const cur=tagSel.value;
    tagSel.innerHTML='<option value="">Todos los tags</option>'+allTags.map(t=>`<option value="${esc(t)}"${t===cur?' selected':''}>${esc(t)}</option>`).join('');
  }
  let entries=Object.entries(map).sort((a,b)=>b[1].length-a[1].length);
  if(tagFilter)entries=entries.filter(([t])=>t===tagFilter);
  if(!entries.length){document.getElementById('tagsSection').innerHTML='<div class="empty">No se encontraron cartas.</div>';return;}
  document.getElementById('tagsSection').innerHTML=entries.map(([tag,cards])=>{
    const openClass=_tagSelectMode?' open':'';
    return `<div class="tag-group${openClass}" data-tag="${esc(tag)}">
      <div class="tag-group-header" onclick="tagGroupHeaderClick(this)">
        <span class="tag-name"><span>${TAG_IC[tag]||'🏷️'}</span>${esc(tag||'(sin tag)')}</span>
        <div class="tag-meta"><span class="tag-count-badge">${cards.length}</span><span class="tag-chevron">▼</span></div>
      </div>
      <div class="tag-cards-grid">${cards.map(c=>mkTagCard(c)).join('')}</div>
    </div>`;
  }).join('');
  wireImgs();
}
function tagGroupHeaderClick(header){header.closest('.tag-group').classList.toggle('open');}
function moreChars(){charsPage+=40;renderChars();}

/* ── MODAL ── */
let _modalCard=null,_modalEd='1',_modalFrameOn=false,_modalCustomImg=null;
let _modalList=[],_modalIdx=0;
function _buildModalList(){
  const q=(document.getElementById('searchChar')?.value||'').toLowerCase();
  const qual=document.getElementById('filterQual')?.value||'';
  let list=ALL.filter(c=>{const mQ=!q||c.character.toLowerCase().includes(q)||(c.series||'').toLowerCase().includes(q);return mQ&&(!qual||c.quality===qual);});
  const sort=document.getElementById('sortChar')?.value||'date';
  const fns={date:(a,b)=>(+b.obtainedTimestamp||0)-(+a.obtainedTimestamp||0),burn:(a,b)=>(+b.burnValue||0)-(+a.burnValue||0),wishlists:(a,b)=>(+b.wishlists||0)-(+a.wishlists||0),alpha:(a,b)=>(a.character||'').localeCompare(b.character||''),edition:(a,b)=>(+a.edition||0)-(+b.edition||0),print_asc:(a,b)=>(+a.number||0)-(+b.number||0),print_desc:(a,b)=>(+b.number||0)-(+a.number||0)};
  list.sort(fns[sort]||fns.date);return list;
}
function openCardModal(key){const c=ALL.find(x=>x.code===key||x.character===key);if(c)showModal(c);}
function showModal(c){
  _modalCard=c;_modalEd=c.edition||'1';_modalFrameOn=false;_modalCustomImg=null;
  _modalList=_buildModalList();_modalIdx=_modalList.findIndex(x=>x.code===c.code&&x.edition===c.edition);
  if(_modalIdx<0)_modalIdx=0;
  const key=c.code||(c.character+'|'+_modalEd);
  _loadCustomImgAsync(key).then(img=>{_modalCustomImg=img;_renderModal();_updateSwipeBtns();});
  openModal();
}
function openModal(){
  const ov=document.getElementById('modalOverlay');ov.style.display='flex';
  requestAnimationFrame(()=>requestAnimationFrame(()=>ov.classList.remove('hidden')));
}
function closeModal(){
  const ov=document.getElementById('modalOverlay');ov.classList.add('hidden');
  clearTimeout(ov._hideTimer);ov._hideTimer=setTimeout(()=>{if(ov.classList.contains('hidden'))ov.style.display='none';},220);
}
function maybeCloseModal(e){if(e.target===document.getElementById('modalOverlay'))closeModal();}
function modalSetEd(n){
  _modalEd=String(n);
  const key=_modalCard.code||(_modalCard.character+'|'+String(n));
  _loadCustomImgAsync(key).then(img=>{_modalCustomImg=img;_renderModal();});
}
function modalToggleFrame(){_modalFrameOn=!_modalFrameOn;_renderModal();}
function modalSetCustomImg(){
  const val=(document.getElementById('mcCustomUrl')?.value||'').trim();
  if(!val)return;_modalCustomImg=val;_renderModal();
}
function modalClearCustomImg(){
  const key=_modalCard.code||(_modalCard.character+'|'+_modalEd);
  _clearCustomImg(key);_modalCustomImg=null;_renderModal();
  _refreshCardInGrid(_modalCard.character,_modalEd,_modalCard.code);
  if(_modalCard.code){
    const cdnUrl=CDN+toSlug(_modalCard.character)+'-'+(_modalCard.edition||'1')+'.jpg';
    document.querySelectorAll(`.alb-slot-img[data-code="${CSS.escape(_modalCard.code)}"]`).forEach(img=>{
      img.src=cdnUrl;
      const slot=img.closest('.alb-slot');
      if(slot) slot.classList.remove('has-custom');
    });
  }
}
function handleModalFile(file){
  if(!file||!file.type.startsWith('image/'))return;
  const reader=new FileReader();
  reader.onload=e=>{
    const key=_modalCard.code||(_modalCard.character+'|'+_modalEd);
    const dataUrl=e.target.result;
    _saveCustomImg(key,dataUrl);
    _modalCustomImg=dataUrl;
    _renderModal();
    // Directly apply to all matching card imgs — no IDB round-trip needed
    const slug=toSlug(_modalCard.character);
    const ed=String(_modalEd||'1');
    const primary=CDN+slug+'-'+ed+'.jpg';
    document.querySelectorAll('.card-img').forEach(img=>{
      if(img.dataset.primary!==primary) return;
      img.src=dataUrl;
      img.classList.add('loaded');
      img.closest('.card-img-wrap')?.classList.remove('loading');
      img.closest('.card-no-img')?.style.setProperty('display','none');
    });
    // Also update album slots
    if(_modalCard.code){
      document.querySelectorAll(`.alb-slot-img[data-code="${CSS.escape(_modalCard.code)}"]`).forEach(img=>{
        img.src=dataUrl;
        const slot=img.closest('.alb-slot');
        if(slot){ slot.classList.add('img-loaded'); slot.classList.add('has-custom'); }
      });
    }
  };
  reader.readAsDataURL(file);
}
function handleModalDrop(e){
  e.preventDefault();document.getElementById('mcDropZone')?.classList.remove('drag-over');
  const file=e.dataTransfer.files?.[0];if(file)handleModalFile(file);
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
function _renderModal(){
  const c=_modalCard,q=c.quality||'0';
  const slug=toSlug(c.character),ed=_modalEd;
  const hasFrame=!!(c.frame&&c.frame.trim());
  const frameOverlay=hasFrame&&_modalFrameOn?frameOverlayUrl(c.frame):null;
  const imgUrl=_modalCustomImg||(CDN+slug+'-'+ed+'.jpg');
  const imgFb=_modalCustomImg?null:(CDN+slug+'-1.jpg');
  const edBtns=Array.from({length:7},(_,i)=>i+1).map(n=>'<button class="modal-ed-btn'+(String(n)===String(ed)&&!_modalCustomImg?' active':'')+'" onclick="modalSetEd('+n+')">'+ n+'</button>').join('');
  document.getElementById('modalCardSide').innerHTML=
    '<div class="modal-card-viewer">'+
      '<div class="modal-card-img-wrap" id="mci">'+
        '<div class="modal-card-bg" id="mcbg" style="background-image:url(\''+imgUrl+'\')"></div>'+
        (frameOverlay?'<img class="modal-card-frame-canvas" id="mcframe" src="'+frameOverlay+'" alt="" onerror="this.style.display=\'none\'">':'')+
        '<div class="modal-card-placeholder" id="mcph" style="display:none">🎴</div>'+
      '</div>'+
    '</div>'+
    '<div class="modal-ed-btns">'+edBtns+'</div>'+
    (hasFrame?'<button class="modal-frame-toggle'+(_modalFrameOn?' on':'')+'" onclick="modalToggleFrame()">'+(_modalFrameOn?'🖼 Marco: ON':'🖼 Marco: OFF')+'</button>':'')+
    '<div class="modal-drop-zone" id="mcDropZone" onclick="document.getElementById(&quot;mcFileIn&quot;).click()" ondragover="event.preventDefault();this.classList.add(&quot;drag-over&quot;)" ondragleave="this.classList.remove(&quot;drag-over&quot;)" ondrop="handleModalDrop(event)">'+
      '<input type="file" id="mcFileIn" accept="image/*" style="display:none" onchange="handleModalFile(this.files[0])">'+
      '<span class="dz-icon">🖼️</span>Arrastra una imagen o pega del portapapeles<small>Click para abrir archivos</small>'+
    '</div>'+
    (_modalCustomImg?'<button onclick="modalClearCustomImg()" style="font-size:11px;color:var(--text3);background:none;border:none;cursor:pointer;text-decoration:underline;margin-top:4px">↩ Restablecer imagen CDN</button>':'')+
    '<div class="modal-swipe-btns"><button class="modal-swipe-btn" id="msPrev" onclick="modalSwipe(-1)">◀</button><span style="font-size:11px;color:var(--text3);align-self:center" id="msPos"></span><button class="modal-swipe-btn" id="msNext" onclick="modalSwipe(1)">▶</button></div>'+
    '<a href="'+imgUrl+'" target="_blank" class="btn-ghost" style="font-size:11px;width:100%;justify-content:center;text-decoration:none;margin-top:4px">🔗 Imagen original</a>';
  setTimeout(()=>{
    const bg=document.getElementById('mcbg');
    if(bg){const t=new Image();t.onerror=()=>{const fb=_modalCustomImg?null:(CDN+slug+'-1.jpg');if(fb&&imgUrl!==fb){bg.style.backgroundImage="url('"+fb+"')";}else{bg.style.display='none';const ph=document.getElementById('mcph');if(ph)ph.style.display='flex';}};t.src=imgUrl;}
  },50);
  const rows=[['Calidad',QL[q]||q+'★'],['Edición','Ed.'+(c.edition||'?')],['Print #',c.number||'—'],['Burn value','🔥 '+(+c.burnValue||0).toLocaleString()],['Wishlists',c.wishlists||'0'],['Marco',c.frame||(c.frame?FRAME_NAME[c.frame]:'')||'(sin marco)'],['Morphed',c.morphed==='Yes'?'✨ Sí':'No'],['Trimmed',c.trimmed==='Yes'?'✂ Sí':'No'],['Tag',c.tag||'—'],['Worker effort',c['worker.effort']||'—'],['Código',c.code||'—']].map(([k,v])=>`<div class="modal-stat-row"><span class="modal-stat-key">${k}</span><span class="modal-stat-val">${esc(String(v))}</span></div>`).join('');
  document.getElementById('modalInfoSide').innerHTML=`<button class="modal-close" onclick="closeModal()">✕</button><div style="font-size:11px;color:var(--text3);letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">${esc(c.series||'—')}</div><div class="modal-char-name">${esc(c.character)}</div><div style="margin-bottom:1.25rem"><span class="card-q-badge ${QB[q]||'bq0'}" style="position:static;display:inline-block">${QL[q]||q+'★'}</span></div><div class="modal-stats">${rows}</div>`;
}
function modalSwipe(dir){
  const newIdx=_modalIdx+dir;if(newIdx<0||newIdx>=_modalList.length)return;
  _modalIdx=newIdx;const c=_modalList[_modalIdx];
  _modalCard=c;_modalEd=c.edition||'1';_modalFrameOn=false;
  const key=c.code||(c.character+'|'+_modalEd);
  const box=document.getElementById('modalBox');
  if(box){box.style.transition='none';box.style.transform=dir>0?'translateX(40px)':'translateX(-40px)';box.style.opacity='0';requestAnimationFrame(()=>{box.style.transition='transform .18s ease,opacity .18s';box.style.transform='translateX(0)';box.style.opacity='1';});}
  _loadCustomImgAsync(key).then(img=>{_modalCustomImg=img;_renderModal();_updateSwipeBtns();});
}
function _updateSwipeBtns(){
  const prev=document.getElementById('msPrev'),next=document.getElementById('msNext'),pos=document.getElementById('msPos');
  if(prev)prev.disabled=_modalIdx<=0;if(next)next.disabled=_modalIdx>=_modalList.length-1;
  if(pos)pos.textContent=_modalList.length?(_modalIdx+1)+'/'+_modalList.length:'';
}
document.addEventListener('keydown',e=>{
  const ov=document.getElementById('modalOverlay');if(!ov||ov.classList.contains('hidden'))return;
  if(e.key==='ArrowRight'||e.key==='ArrowDown')modalSwipe(1);
  else if(e.key==='ArrowLeft'||e.key==='ArrowUp')modalSwipe(-1);
  else if(e.key==='Escape')closeModal();
});
document.addEventListener('touchstart',e=>{if(e.target.closest('#modalBox'))window._touchStartX=e.touches[0].clientX;},{passive:true});
document.addEventListener('touchend',e=>{if(!e.target.closest('#modalBox'))return;const dx=e.changedTouches[0].clientX-(window._touchStartX||0);if(Math.abs(dx)>50)modalSwipe(dx<0?1:-1);},{passive:true});
document.addEventListener('paste',e=>{if(!document.getElementById('modalOverlay')||document.getElementById('modalOverlay').classList.contains('hidden'))return;const item=[...e.clipboardData.items].find(i=>i.type.startsWith('image/'));if(item)handleModalFile(item.getAsFile());});

/* ── CUSTOM IMAGE STORAGE (IndexedDB) ── */
const _idbName='karutaImgs', _idbStore='imgs', _idbVer=1;
let _idb=null;

function _openIdb(){
  return new Promise((res,rej)=>{
    if(_idb){res(_idb);return;}
    const req=indexedDB.open(_idbName,_idbVer);
    req.onupgradeneeded=e=>e.target.result.createObjectStore(_idbStore);
    req.onsuccess=e=>{_idb=e.target.result;res(_idb);}
    req.onerror=()=>rej(req.error);
  });
}

function _saveCustomImg(key,dataUrl){
  _openIdb().then(db=>{
    db.transaction(_idbStore,'readwrite').objectStore(_idbStore).put(dataUrl,key);
  }).catch(()=>{
    try{
      const store=JSON.parse(localStorage.getItem('karutaCustomImgs')||'{}');
      store[key]=dataUrl;
      localStorage.setItem('karutaCustomImgs',JSON.stringify(store));
    }catch(e){ alert('No hay espacio para guardar la imagen.'); }
  });
}

function _loadCustomImg(key){
  try{
    const store=JSON.parse(localStorage.getItem('karutaCustomImgs')||'{}');
    if(store[key]) return store[key];
  }catch(e){}
  return null;
}

async function _loadCustomImgAsync(key){
  try{
    const db=await _openIdb();
    return await new Promise((res,rej)=>{
      const req=db.transaction(_idbStore,'readonly').objectStore(_idbStore).get(key);
      req.onsuccess=()=>res(req.result||null);
      req.onerror=()=>res(null);
    });
  }catch(e){ return _loadCustomImg(key); }
}

function _clearCustomImg(key){
  _openIdb().then(db=>{
    db.transaction(_idbStore,'readwrite').objectStore(_idbStore).delete(key);
  }).catch(()=>{});
  try{
    const store=JSON.parse(localStorage.getItem('karutaCustomImgs')||'{}');
    delete store[key];
    localStorage.setItem('karutaCustomImgs',JSON.stringify(store));
  }catch(e){}
}

async function _migrateToIdb(){
  try{
    const old=JSON.parse(localStorage.getItem('karutaCustomImgs')||'{}');
    const keys=Object.keys(old);
    if(!keys.length) return;
    const db=await _openIdb();
    const tx=db.transaction(_idbStore,'readwrite');
    keys.forEach(k=>tx.objectStore(_idbStore).put(old[k],k));
    tx.oncomplete=()=>localStorage.removeItem('karutaCustomImgs');
  }catch(e){}
}

/* ── UTILITIES ── */
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function resetApp(){
  if(!confirm('¿Borrar todos los datos guardados? Tendrás que subir el CSV de nuevo.')) return;
  destroyCharts(); ALL=[];
  try{ localStorage.removeItem('karutaCSV'); }catch(e){}
  document.getElementById('upload-screen').style.display='flex';
  document.getElementById('dashboard').style.display='none';
  document.getElementById('csvInput').value='';
  charsPage=40; seriesPage=50; workersPage=40;
}

/* ── CHARTS ── */
function destroyCharts(){Object.values(charts).forEach(c=>{try{c.destroy()}catch(e){}});charts={};}

function buildCharts(){
  destroyCharts();
  _buildStatKpis();
  _buildLuckyScore();

  const C=Chart, gc='rgba(255,255,255,0.05)', tc='#555c78', font={family:"'Outfit',sans-serif",size:12};
  const base={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
    scales:{x:{grid:{color:gc},ticks:{color:tc,font}},y:{grid:{color:gc},ticks:{color:tc,font}}}};

  const userId=_getUserId();
  const GRABBED=userId?ALL.filter(c=>c.grabber===userId):ALL;
  const QC={'0':'#555c78','1':'#60b8f0','2':'#41d9b0','3':'#a593ff','4':'#f06080'};

  const qMeds=[0,1,2,3,4].map(q=>{
    const ps=GRABBED.filter(c=>c.quality===String(q)&&+c.number>0).map(c=>+c.number).sort((a,b)=>a-b);
    return ps.length?ps[Math.floor(ps.length/2)]:0;
  });
  charts.pq=new C(document.getElementById('cPrintByQuality'),{type:'bar',data:{
    labels:['Sin ★','★','★★','★★★','★★★★'],
    datasets:[{data:qMeds,backgroundColor:['#555c78','#60b8f0','#41d9b0','#a593ff','#f06080'],borderRadius:6,borderSkipped:false}]
  },options:{...base,plugins:{...base.plugins,tooltip:{callbacks:{label:ctx=>`Mediana: #${ctx.parsed.y.toLocaleString()}`}}}}});

  // ── 2. WL bucket → avg print (correlación WL vs suerte de print) ──
  const wlBuckets=[{l:'WL 0',lo:0,hi:0},{l:'WL 1–9',lo:1,hi:9},{l:'WL 10–49',lo:10,hi:49},
    {l:'WL 50–99',lo:50,hi:99},{l:'WL 100–499',lo:100,hi:499},{l:'WL 500+',lo:500,hi:99999}];
  const wlPrintData=wlBuckets.map(b=>{
    const cards=GRABBED.filter(c=>+c.wishlists>=b.lo&&+c.wishlists<=b.hi&&+c.number>0);
    return cards.length?Math.round(cards.reduce((s,c)=>s+(+c.number),0)/cards.length):null;
  });
  charts.wvp=new C(document.getElementById('cWlVsPrint'),{type:'line',data:{
    labels:wlBuckets.map(b=>b.l),
    datasets:[{data:wlPrintData,borderColor:'rgba(240,192,96,0.9)',backgroundColor:'rgba(240,192,96,0.08)',
      fill:true,tension:0.35,pointRadius:5,pointBackgroundColor:'rgba(240,192,96,0.9)',pointBorderColor:'#0d0f14',pointBorderWidth:2}]
  },options:{...base,plugins:{...base.plugins,tooltip:{callbacks:{label:ctx=>`Avg print: #${(ctx.parsed.y||0).toLocaleString()}`}}}}});

  // ── 3. Tasa Q4 mensual + total grabs (dual axis) ──
  const mGrabs={},mQ4={};
  GRABBED.forEach(c=>{
    const ts=+c.obtainedTimestamp;if(!ts)return;
    const m=new Date(ts).toISOString().slice(0,7);
    mGrabs[m]=(mGrabs[m]||0)+1;
    if(c.quality==='4')mQ4[m]=(mQ4[m]||0)+1;
  });
  const mKeys=Object.keys(mGrabs).sort();
  const mLabels=mKeys.map(k=>{const[y,mo]=k.split('-');return['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][+mo-1]+'\''+y.slice(2);}