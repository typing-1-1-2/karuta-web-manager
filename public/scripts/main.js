
// ── SIDEBAR NAVIGATION ───────────────────────────────────────
const _tabTitles = {
  home:'Inicio', personajes:'Personajes', albumes:'Álbumes', series:'Series',
  marcos:'Marcos', workers:'Workers', tags:'Tags', stats:'Stats',
  sketches:'Sketches', rescaler:'Rescalador'
};


// ── PAGE ROUTING HELPERS ─────────────────────────────────────
// Mark active sidebar link based on current page
function _updateSidebarThemeLang(){
  const theme = localStorage.getItem('karutaTheme') || 'dark';
  const lang  = localStorage.getItem('karutaLang')  || 'es';
  // Mark active theme/lang in dropdowns
  document.querySelectorAll('[id^="theme-"]').forEach(el=>{
    el.classList.toggle('active', el.id === 'theme-'+theme);
  });
  document.querySelectorAll('[id^="lang-"]').forEach(el=>{
    el.classList.toggle('active', el.id === 'lang-'+lang);
  });
}

function toggleSidebar(){
  const sidebar = document.getElementById('sidebar');
  const layout  = document.querySelector('.app-layout');
  sidebar.classList.toggle('collapsed');
  layout?.classList.toggle('sidebar-collapsed');
  try{ localStorage.setItem('karutaSidebarCollapsed', sidebar.classList.contains('collapsed')); }catch(e){}
}

function openSidebarMobile(){
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('sidebarOverlay').classList.add('mobile-open');
}

function closeSidebarMobile(){
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarOverlay').classList.remove('mobile-open');
}

// Update topbar title when switching tabs
function _setTopbarTitle(tab){
  const el = document.getElementById('topbarTitle');
  if(el) el.textContent = _tabTitles[tab] || tab;
}

// Update sidebar card count
function _updateSidebarStats(){
  const el = document.getElementById('sidebarCardCount');
  if(el) el.textContent = ALL.length.toLocaleString('es') + ' cartas';
}

// Restore sidebar collapse state
(function(){
  try{
    if(localStorage.getItem('karutaSidebarCollapsed') === 'true'){
      const s = document.getElementById('sidebar');
      if(s) s.classList.add('collapsed');
      document.querySelector('.app-layout')?.classList.add('sidebar-collapsed');
    }
  }catch(e){}
})();

const _idbName='karutaImgs', _idbStore='imgs', _idbVer=1;
let _idb=null;
let _charSelMode = false;
let albumBooks = [];

const _charSelSet = new Set();

/* ══════════════════════════════════════════
   CONSTANTS & STATE
══════════════════════════════════════════ */
let ALL=[], charsPage=40, seriesPage=50, workersPage=40;
let charts={};

const CDN='https://d2l56h9h5tj8ue.cloudfront.net/images/cards/';

const QL={0:'Sin ★',1:'★',2:'★★',3:'★★★',4:'★★★★'};
const QC={0:'#555c78',1:'#60b8f0',2:'#41d9b0',3:'#a593ff',4:'#f06080'};
const QS={'0':'var(--r0)','1':'var(--r1)','2':'var(--r2)','3':'var(--r3)','4':'var(--r4)'};
const QB={0:'bq0',1:'bq1',2:'bq2',3:'bq3',4:'bq4'};
const GRADE_O={S:0,A:1,B:2,C:3,D:4,F:5};
const FRAME_CDN='https://wintertide.bz/assets/';
// CSV key -> wintertide slug (used for image URL)
const FRAME_SLUG={
  blossom:'blossom',
  borealsparkles:'boreal_sparkles',
  chocodrizzle:'choco_drizzle',
  crystallinelocket:'crystal_locket',
  djinnlamp:'djinn_lamp',
  elvenblossom:'elven_blossom',
  festivuspark:'festivus_park',
  flowerbuds:'flower_buds',
  glinted:'glinted',
  holidaytreats:'holiday_treats',
  icecube:'ice_cube',
  karutaanniversary2022:'karuta_anniversary_2022',
  karutaboy:'karuta_boy',
  karutavice:'karuta_vice',
  kominka:'kominka',
  labpunk:'lab_punk',
  magiclibrary:'magic_library',
  musicalnotes:'musical_notes',
  nightooze:'night_ooze',
  popidol:'pop_idol',
  sanguinewisps:'sanguine_wisps',
  solisfairsip:'solisfair_sip',
  springbreeze:'spring_breeze',
  tetromino:'tetromino',
  textingbuddy:'texting_buddy',
  undine:'undine',
  warmmantle:'warm_mantle',
  winenebula:'wine_nebula',
  winnerspodium:'winners_podium',
  yearoftheox:'year_of_the_ox',
  yearoftherabbit:'year_of_the_rabbit',
  yearoftherat:'year_of_the_rat',
  yearofthetiger:'year_of_the_tiger',
};
// Human-readable display names for each frame
const FRAME_NAME={
  blossom:'Blossom',borealsparkles:'Boreal Sparkles',chocodrizzle:'Choco Drizzle',
  crystallinelocket:'Crystalline Locket',djinnlamp:'Djinn Lamp',elvenblossom:'Elven Blossom',
  festivuspark:'Festivus Park',flowerbuds:'Flower Buds',glinted:'Glinted',
  holidaytreats:'Holiday Treats',icecube:'Ice Cube',
  karutaanniversary2022:'Karuta Anniversary 2022',karutaboy:'Karuta Boy',karutavice:'Karuta Vice',
  kominka:'Kominka',labpunk:'Lab Punk',magiclibrary:'Magic Library',musicalnotes:'Musical Notes',
  nightooze:'Night Ooze',popidol:'Pop Idol',sanguinewisps:'Sanguine Wisps',
  solisfairsip:'Solisfair Sip',springbreeze:'Spring Breeze',tetromino:'Tetromino',
  textingbuddy:'Texting Buddy',undine:'Undine',warmmantle:'Warm Mantle',
  winenebula:'Wine Nebula',winnerspodium:'Winners Podium',
  yearoftheox:'Year of the Ox',yearoftherabbit:'Year of the Rabbit',
  yearoftherat:'Year of the Rat',yearofthetiger:'Year of the Tiger',
};
function frameImgUrl(key){ const s=FRAME_SLUG[key]; return s?(FRAME_CDN+s+'.jpg'):null; }
const TAG_IC={b:'📦','1t':'⭐','3t':'🌟',favs:'💜',keep:'🔒',trade:'🔄',fs:'💸',pokemon:'🎮',worker:'⚙️',frame:'🖼️',res:'🎯',style:'✨',cat:'🐱',dog:'🐶',aranara:'🌿',up:'⬆️','':'🃏'};


// Prebuilt cache placeholder (reserved for future use)
const _imgCache={};
// ── IMAGE SYSTEM: IntersectionObserver lazy load + fallback chain ──────────────
let _imgUid=0, _lazyObs=null;

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
function _modalImgError(img){
  const fb=img.dataset.fallback;
  if(fb && fb!==img.dataset.primary && img.src!==fb){
    img.onerror=function(){
      this.style.display='none';
      const ph=document.getElementById('mcph');if(ph)ph.style.display='flex';
    };
    img.removeAttribute('data-fallback');
    img.src=fb;
  } else {
    img.style.display='none';
    const ph=document.getElementById('mcph');if(ph)ph.style.display='flex';
  }
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
if(dropZone){
  dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('drag-over')});
  dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('drag-over');if(e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0])});
  dropZone.addEventListener('click',()=>csvInput?.click());
}
if(csvInput) csvInput.addEventListener('change',()=>{if(csvInput.files[0])loadFile(csvInput.files[0])});

function loadFile(file){
  const r=new FileReader();
  r.onload=async e=>{
    const raw=e.target.result;
    ALL=parseCSV(raw);
    if(!ALL.length){await dlgAlert('No se encontraron cartas en el CSV.',{icon:'📂',title:'Sin cartas'});return}
    // Persist CSV in localStorage
    try{localStorage.setItem('karutaCSV',raw);}catch(ex){}
    // Navigate to home after loading CSV
    window.location.href='/';
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
async function buildAll(){
  charsPage=40;seriesPage=50;workersPage=40;
  buildMetrics();buildTabBadges(); _updateSidebarStats();
  _populateTagFilter();
  renderChars();renderSeries();renderFrames();renderWorkers();renderTags();renderAlbum();
  setTimeout(buildCharts,200);
}

function _showDashboard(){
  document.getElementById('upload-screen').style.display='none';
  document.getElementById('dashboard').style.display='block';
  // Activate the panel for this page
  const tab = window.__ACTIVE_TAB__ || 'home';
  const panel = document.getElementById('panel-' + tab);
  if(panel){
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    panel.classList.add('active');
  }
  setTimeout(()=>{
    _updateSidebarStats();
    _updateSidebarThemeLang();
    if(tab==='stats')   buildCharts();
    if(tab==='albums') renderAlbum();
    if(tab==='home')    buildHomePanel();
  }, 50);
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
  // CountUp: animate numbers on metrics load
function _countUp(el, target, duration=400){
  if(typeof target !== 'number' || isNaN(target)) return;
  const start = performance.now();
  const update = t => {
    const p = Math.min((t-start)/duration, 1);
    const ease = 1-Math.pow(1-p, 3); // ease-out-cubic
    el.textContent = Math.round(ease * target).toLocaleString('es');
    if(p < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

document.getElementById('metricsGrid').innerHTML=mx.map(m=>`
    <div class="metric" style="--accent:${m.c}">
      <div class="metric-label">${m.l}</div>
      <div class="metric-value" data-num="${typeof m.v==='number'?m.v:''}">${m.v}</div>
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
// Tab navigation is now handled by <a href> links

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

// ── RENDER CACHE: avoid rebuilding DOM when filters haven't changed ──
let _lastFilterKey = '';
let _lastCharHTML  = '';

function _buildCharList(){
  const q=(document.getElementById('searchChar')?.value||'').toLowerCase().trim();
  const qual=(document.getElementById('filterQual')?.value||'');
  const ed=(document.getElementById('filterEdition')?.value||'');
  const morphed=(document.getElementById('filterMorphed')?.value||'');
  const frame=(document.getElementById('filterFrame')?.value||'');
  const tag=(document.getElementById('filterTag')?.value||'');
  const grabbed=(document.getElementById('filterGrabbed')?.value||'');
  const print=(document.getElementById('filterPrint')?.value||'');
  const sort=(document.getElementById('sortChar')?.value||'date');

  // Populate tag filter dropdown dynamically
  _populateTagFilter();

  const userId=_getUserId();

  const _matchPrint=(c,pf)=>{
    if(!pf) return true;
    const n=+c.number||0;
    if(pf==='sp') return n>=1&&n<=9;
    if(pf==='lp') return n>=10&&n<=99;
    if(pf==='mp') return n>=100&&n<=999;
    if(pf==='hp') return n>=1000;
    return true;
  };

  let list=ALL.filter(c=>{
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
    if(!_matchPrint(c,print)) return false;
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

async function albCreateNew(){
  const name = await dlgPrompt('Nombre del álbum','Mi álbum',{icon:'🖼',title:'Nuevo álbum',placeholder:'Ej: Mis favoritas',okText:'Crear'});
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

async function albRename(bi){
  const b = albumBooks[bi];
  if(!b) return;
  const name = await dlgPrompt('Nuevo nombre',b.name,{icon:'✏️',title:'Renombrar álbum',okText:'Guardar'});
  if(!name) return;
  b.name = name;
  _albSave();
  renderAlbum();
}

async function albDelete(bi){
  if(!await dlgConfirm('¿Eliminar el álbum <strong>'+esc(b.name)+'</strong>? Esta acción no se puede deshacer.',{icon:'🗑',title:'Eliminar álbum',type:'danger',okText:'Eliminar',cancelText:'Cancelar'})) return;
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

async function albDelPage(bi, pi){
  const b = albumBooks[bi];
  if(!b||b.pages.length<=1){ await dlgAlert('El álbum debe tener al menos una página.',{icon:'⚠️',title:'No se puede eliminar'}); return; }
  const filled = b.pages[pi].slots.filter(Boolean).length;
  if(filled && !await dlgConfirm(`¿Eliminar la página ${pi+1}? Tiene <strong>${filled} carta${filled!==1?'s':''}</strong> asignada${filled!==1?'s':''}.`,{icon:'📄',title:'Eliminar página',type:'danger',okText:'Eliminar',cancelText:'Cancelar'})) return;
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
            <option value="">Todos los prints</option>
            <option value="sp">SP (1–9)</option>
            <option value="lp">LP (10–99)</option>
            <option value="mp">MP (100–999)</option>
            <option value="hp">HP (1000+)</option>
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
  if(countEl)countEl.textContent=cards.length+' carta'+(cards.length!==1?'s':'');
  if(cards.length){
    const frag=document.createDocumentFragment();
    const tmp=document.createElement('div');
    tmp.innerHTML=cards.map(c=>mkCard(c)).join('');
    while(tmp.firstChild)frag.appendChild(tmp.firstChild);
    grid.replaceChildren(frag);
  } else {
    grid.innerHTML='<div class="empty" style="padding:1.5rem">Sin resultados.</div>';
  }
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
async function copyTagCommand(){
  const tag=(document.getElementById('tagInput')?.value||'').trim();
  if(!tag){await dlgAlert('Escribe un tag primero.',{icon:'🏷️',title:'Tag requerido'});return;}
  if(!_tagSelected.size){await dlgAlert('Selecciona al menos una carta.',{icon:'🎴',title:'Sin selección'});return;}
  const codes=[...ALL.filter(c=>_tagSelected.has(_tagCardKey(c))).map(c=>c.code)].filter(Boolean);
  if(!codes.length){await dlgAlert('Las cartas seleccionadas no tienen código.',{icon:'⚠️',title:'Sin código'});return;}
  const cmd='k!tag '+tag+' '+codes.join(' ');
  navigator.clipboard.writeText(cmd).then(()=>{
    const msg=document.getElementById('tagCopiedMsg');if(msg){msg.textContent='✅ Copiado: '+cmd.slice(0,60)+(cmd.length>60?'…':'');msg.style.display='inline';setTimeout(()=>msg.style.display='none',3000);}
  }).catch(()=>{prompt('Copia el comando:',cmd);});
}
async function applyTagLocally(){
  const tag=(document.getElementById('tagInput')?.value||'').trim();
  if(!tag){alert('Escribe un tag primero.');return;}
  if(!_tagSelected.size){alert('Selecciona al menos una carta.');return;}
  const keys=new Set(_tagSelected);
  ALL.forEach(c=>{if(keys.has(_tagCardKey(c)))c.tag=tag;});
  _persistTagChanges();
  const msg=document.getElementById('tagCopiedMsg');if(msg){msg.textContent='✅ Tag "'+tag+'" aplicado a '+keys.size+' carta'+(keys.size!==1?'s':'');msg.style.display='inline';setTimeout(()=>msg.style.display='none',3000);}
  renderTags();buildTabBadges();
}
async function clearSelTagLocally(){
  if(!_tagSelected.size){alert('Selecciona al menos una carta.');return;}
  if(!await dlgConfirm('¿Quitar el tag de <strong>'+_tagSelected.size+' carta'+(_tagSelected.size!==1?'s':'')+'</strong>?',{icon:'🏷️',title:'Quitar tag',type:'danger',okText:'Quitar',cancelText:'Cancelar'}))return;
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
  }).catch(async ()=>{
    try{
      const store=JSON.parse(localStorage.getItem('karutaCustomImgs')||'{}');
      store[key]=dataUrl;
      localStorage.setItem('karutaCustomImgs',JSON.stringify(store));
    }catch(e){ await dlgAlert('No hay espacio para guardar la imagen. Libera espacio en el dispositivo.',{icon:'💾',title:'Sin espacio'}); }
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

// ── DATA MANAGEMENT ─────────────────────────────────────
// Keys that belong to CARD DATA only — safe to wipe without losing app config
const _CARD_KEYS = ['karutaCSV', 'karutaTagOverrides'];

// Keys that are app config/content — preserved on card reset
const _PRESERVE_KEYS = ['karutaAlbumBooks2','karutaTheme','karutaLang','karutaCustomImgs'];

async function resetCardData(){
  if(!await dlgConfirm('Se mantienen álbumes, imágenes, tags y ajustes.',{icon:'🗑',title:'¿Borrar cartas del CSV?',type:'danger',okText:'Borrar cartas',cancelText:'Cancelar'})) return;
  destroyCharts();
  ALL = [];
  charsPage = 40; seriesPage = 50; workersPage = 40;
  _CARD_KEYS.forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
  document.getElementById('upload-screen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('csvInput').value = '';
}

async function resetAllData(){
  if(!await dlgConfirm('Se eliminarán <strong>cartas, álbumes, imágenes, sketches y tags</strong>.<br>Solo se conservará el tema elegido.',{icon:'💣',title:'¿Borrar todo?',type:'danger',okText:'Borrar todo',cancelText:'Cancelar'})) return;
  const theme = localStorage.getItem('karutaTheme') || 'dark';
  const lang  = localStorage.getItem('karutaLang')  || 'es';

  // Clear localStorage completely then restore theme+lang
  localStorage.clear();
  localStorage.setItem('karutaTheme', theme);
  localStorage.setItem('karutaLang',  lang);

  // Clear IndexedDB stores
  _openIdb().then(db => {
    ['imgs','karutaImgs'].forEach(store => {
      try {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
      } catch(e) {}
    });
  }).catch(() => {});

  // Clear sketch IDB
  try {
    const req = indexedDB.open('karutaSketches', 1);
    req.onsuccess = e => {
      const db = e.target.result;
      try {
        db.transaction('karutaSketches', 'readwrite').objectStore('karutaSketches').clear();
      } catch(e) {}
    };
  } catch(e) {}

  // Reset app state
  destroyCharts();
  ALL = []; albumBooks = [];
  _albBgCache.clear();
  charsPage = 40; seriesPage = 50; workersPage = 40;

  document.getElementById('upload-screen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('csvInput').value = '';
}

// Keep resetApp as alias for backward compat
function resetApp(){ resetCardData(); }

// ── DATA EXPORT / IMPORT ─────────────────────────────────


async function exportAppData(){
  try{
    const backup = { version: 2, exportedAt: new Date().toISOString(), localStorage: {}, idbImgs: {}, idbSketches: [] };

    // 1. All karuta* localStorage keys
    for(let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if(k?.startsWith('karuta')) backup.localStorage[k] = localStorage.getItem(k);
    }

    // 2. IDB images (custom card images + album backgrounds)
    try{
      const db = await _openIdb();
      const [keys, vals] = await Promise.all([
        new Promise((res,rej)=>{ const r=db.transaction(_idbStore,'readonly').objectStore(_idbStore).getAllKeys(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }),
        new Promise((res,rej)=>{ const r=db.transaction(_idbStore,'readonly').objectStore(_idbStore).getAll();    r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }),
      ]);
      keys.forEach((k,i)=>{ backup.idbImgs[k]=vals[i]; });
    }catch(e){}

    // 3. Sketches IDB
    try{
      const db2 = await new Promise((res,rej)=>{ const r=indexedDB.open('karutaSketches',1); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
      backup.idbSketches = await new Promise((res,rej)=>{ const r=db2.transaction('karutaSketches','readonly').objectStore('karutaSketches').getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
    }catch(e){}

    const blob = new Blob([JSON.stringify(backup)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `karuta-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    const lsKeys = Object.keys(backup.localStorage).length;
    const imgKeys = Object.keys(backup.idbImgs).length;
    const sketches = backup.idbSketches.length;
    await dlgAlert(
      `Backup generado correctamente.<br><br>` +
      `<span style="font-size:12px;color:var(--text3)">` +
      `📦 ${lsKeys} clave${lsKeys!==1?'s':''} de configuración · ` +
      `🖼 ${imgKeys} imagen${imgKeys!==1?'es':''} · ` +
      `✏️ ${sketches} sketch${sketches!==1?'es':''}</span>`,
      {icon:'✅', title:'Exportación completada'}
    );
  }catch(e){
    await dlgAlert('Error al exportar: '+e.message, {icon:'❌', title:'Error'});
  }
}

async function importAppData(file){
  if(!file) return;
  const confirmed = await dlgConfirm(
    'Se <strong>sobreescribirán</strong> los datos actuales con los del backup. La página se recargará al terminar.',
    {icon:'📥', title:'Importar backup', type:'danger', okText:'Importar', cancelText:'Cancelar'}
  );
  if(!confirmed) return;

  try{
    const text = await file.text();
    let backup;
    try{ backup = JSON.parse(text); }
    catch(e){ throw new Error('El archivo no es un JSON válido.'); }

    // Support v1 (backup.data.*) and v2 (backup.*)
    const ls       = backup.localStorage            || backup.data?.localStorage || {};
    const idbImgs  = backup.idbImgs                 || backup.data?.idb?.imgs    || {};
    const sketches = backup.idbSketches             || backup.data?.idb?.sketches || [];

    if(!Object.keys(ls).length) throw new Error('El backup no contiene datos de localStorage.');

    // 1. Restore localStorage
    Object.entries(ls).forEach(([k,v])=>{
      try{ localStorage.setItem(k, v); }catch(e){}
    });

    // 2. Restore IDB images — clear first, then put all in new transaction
    const imgEntries = Object.entries(idbImgs).filter(([,v])=>v);
    if(imgEntries.length){
      const db = await _openIdb();

      // Clear in its own transaction first
      await new Promise((res, rej)=>{
        const tx = db.transaction(_idbStore,'readwrite');
        tx.objectStore(_idbStore).clear();
        tx.oncomplete = res;
        tx.onerror = ()=>rej(tx.error);
      });

      // Then write all entries in a new transaction
      await new Promise((res, rej)=>{
        const tx = db.transaction(_idbStore,'readwrite');
        const store = tx.objectStore(_idbStore);
        imgEntries.forEach(([k,v])=>{ store.put(v, k); });
        tx.oncomplete = res;
        tx.onerror = ()=>rej(tx.error);
      });

      _albBgCache.clear();
    }

    // 3. Restore sketches
    if(sketches.length){
      await new Promise((res,rej)=>{
        const r = indexedDB.open('karutaSketches',1);
        r.onupgradeneeded = e => e.target.result.createObjectStore('karutaSketches',{keyPath:'id',autoIncrement:true});
        r.onerror = ()=>rej(r.error);
        r.onsuccess = ()=>{
          const db2 = r.result;
          const tx = db2.transaction('karutaSketches','readwrite');
          const store = tx.objectStore('karutaSketches');
          store.clear();
          sketches.forEach(s=>{ const s2={...s}; delete s2.id; store.put(s2); });
          tx.oncomplete = res;
          tx.onerror = ()=>rej(tx.error);
        };
      });
    }

    const lsCount  = Object.keys(ls).length;
    const imgCount = imgEntries.length;
    await dlgAlert(
      `Importación completada.<br><br>` +
      `<span style="font-size:12px;color:var(--text3)">` +
      `📦 ${lsCount} clave${lsCount!==1?'s':''} · ` +
      `🖼 ${imgCount} imagen${imgCount!==1?'es':''} · ` +
      `✏️ ${sketches.length} sketch${sketches.length!==1?'es':''}</span><br><br>` +
      `La página se recargará ahora.`,
      {icon:'✅', title:'Importación completada'}
    );
    location.reload();

  }catch(e){
    await dlgAlert('Error al importar: ' + e.message, {icon:'❌', title:'Error de importación'});
  }
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
  const mLabels=mKeys.map(k=>{const[y,mo]=k.split('-');return['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][+mo-1]+'\''+y.slice(2);});
  const mRates=mKeys.map(k=>mGrabs[k]?+((mQ4[k]||0)/mGrabs[k]*100).toFixed(1):0);
  charts.q4r=new C(document.getElementById('cQ4Rate'),{data:{
    labels:mLabels,
    datasets:[
      {type:'bar',label:'Grabs',data:mKeys.map(k=>mGrabs[k]),backgroundColor:'rgba(96,184,240,0.3)',borderRadius:4,yAxisID:'y'},
      {type:'line',label:'% ★★★★',data:mRates,borderColor:'rgba(240,96,128,0.9)',backgroundColor:'transparent',tension:0.35,pointRadius:4,pointBackgroundColor:'rgba(240,96,128,0.9)',yAxisID:'y2',borderWidth:2}
    ]
  },options:{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:true,labels:{color:'#8890a8',font,boxWidth:10}}},
    scales:{x:{grid:{color:gc},ticks:{color:tc,font,maxRotation:30}},
      y:{grid:{color:gc},ticks:{color:tc,font},position:'left'},
      y2:{grid:{color:'transparent'},ticks:{color:'rgba(240,96,128,0.7)',font,callback:v=>v+'%'},position:'right'}}}});

  // ── 4. Grabs por día de semana (total + Q4) ──
  const wdCount=new Array(7).fill(0),wdQ4=new Array(7).fill(0);
  GRABBED.forEach(c=>{const ts=+c.obtainedTimestamp;if(!ts)return;const d=new Date(ts).getDay();wdCount[d]++;if(c.quality==='4')wdQ4[d]++;});
  charts.wd=new C(document.getElementById('cWeekday'),{type:'bar',data:{
    labels:['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
    datasets:[
      {label:'Grabs',data:wdCount,backgroundColor:'rgba(165,147,255,0.55)',borderRadius:5,borderSkipped:false},
      {label:'★★★★',data:wdQ4,backgroundColor:'rgba(240,96,128,0.7)',borderRadius:5,borderSkipped:false}
    ]
  },options:{...base,plugins:{legend:{display:true,labels:{color:'#8890a8',font,boxWidth:10}}}}});

  // ── 5. Hora del día (por turno) ──
  const hm=new Array(24).fill(0);
  GRABBED.forEach(c=>{const ts=+c.obtainedTimestamp;if(!ts)return;hm[new Date(ts).getHours()]++;});
  charts.hr=new C(document.getElementById('cHours'),{type:'bar',data:{
    labels:Array.from({length:24},(_,i)=>i+'h'),
    datasets:[{data:hm,backgroundColor:hm.map((_,i)=>i>=22||i<6?'rgba(165,147,255,0.7)':i<12?'rgba(240,192,96,0.6)':i<18?'rgba(65,217,176,0.6)':'rgba(96,184,240,0.6)'),borderRadius:4,borderSkipped:false}]
  },options:{...base,scales:{x:{...base.scales.x,ticks:{...base.scales.x.ticks,maxRotation:0,autoSkip:false,font:{...font,size:10}}},y:base.scales.y}}});

  // ── 6. Series con mejor print mediana (min 5 grabs) ──
  const sMap={};
  GRABBED.forEach(c=>{if(!sMap[c.series])sMap[c.series]=[];if(+c.number>0)sMap[c.series].push(+c.number);});
  const sMed=Object.entries(sMap)
    .filter(([,ps])=>ps.length>=5)
    .map(([s,ps])=>{ps.sort((a,b)=>a-b);return{s,med:ps[Math.floor(ps.length/2)],n:ps.length};})
    .sort((a,b)=>a.med-b.med).slice(0,15);
  const sH=Math.max(sMed.length*32+60,300);
  document.getElementById('topSeriesWrap').style.height=sH+'px';
  charts.s=new C(document.getElementById('cSeries'),{type:'bar',data:{
    labels:sMed.map(x=>`${x.s} (${x.n})`),
    datasets:[{data:sMed.map(x=>x.med),
      backgroundColor:sMed.map(x=>x.med<1000?'rgba(65,217,176,0.75)':x.med<10000?'rgba(165,147,255,0.6)':'rgba(85,92,120,0.5)'),
      borderRadius:5,borderSkipped:false,indexAxis:'y'}]
  },options:{...base,indexAxis:'y',
    plugins:{...base.plugins,tooltip:{callbacks:{label:ctx=>`Print mediana: #${ctx.parsed.x.toLocaleString()}`}}},
    scales:{x:{...base.scales.x,ticks:{...base.scales.x.ticks,callback:v=>'#'+v.toLocaleString()}},
      y:{...base.scales.y,ticks:{color:tc,font:{family:"'Outfit'",size:11}}}}}});

  // ── 7. Calidad donut ──
  const qm={};ALL.forEach(c=>{const q=c.quality||'0';qm[q]=(qm[q]||0)+1;});
  const qk=Object.keys(qm).sort();
  charts.q=new C(document.getElementById('cQuality'),{type:'doughnut',data:{
    labels:qk.map(k=>QL[k]||k+'★'),
    datasets:[{data:qk.map(k=>qm[k]),backgroundColor:qk.map(k=>QC[k]||'#888'),borderWidth:0,hoverOffset:8}]
  },options:{responsive:true,maintainAspectRatio:false,cutout:'62%',
    plugins:{legend:{display:true,position:'right',labels:{color:'#8890a8',font,padding:14,boxWidth:12}},
      tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.parsed}`}}}}});

  // ── 8. Edición ──
  const em={};ALL.forEach(c=>{const e=c.edition||'?';em[e]=(em[e]||0)+1;});
  const ek=Object.keys(em).sort((a,b)=>(+a||99)-(+b||99));
  charts.e=new C(document.getElementById('cEdition'),{type:'bar',data:{
    labels:ek.map(k=>'Ed.'+k),
    datasets:[{data:ek.map(k=>em[k]),backgroundColor:'rgba(165,147,255,0.7)',borderRadius:6,borderSkipped:false}]
  },options:{...base,scales:{x:{...base.scales.x,ticks:{...base.scales.x.ticks,autoSkip:false,maxRotation:0}},y:base.scales.y}}});

  // ── 9. Print buckets (grabbed) ──
  const pb=[{l:'#1',max:1},{l:'2–3',max:3},{l:'4–10',max:10},{l:'11–50',max:50},{l:'51–100',max:100},{l:'101–500',max:500},{l:'501–1k',max:1000},{l:'1k–5k',max:5000},{l:'5k–10k',max:10000},{l:'>10k',max:Infinity}];
  const pc=new Array(pb.length).fill(0);
  GRABBED.forEach(c=>{const n=+c.number||0;const idx=pb.findIndex(b=>n<=b.max);if(idx>=0)pc[idx]++;});
  charts.pr=new C(document.getElementById('cPrints'),{type:'bar',data:{
    labels:pb.map(b=>b.l),
    datasets:[{data:pc,backgroundColor:['#f06080','#f06080','#a593ff','#a593ff','#41d9b0','#41d9b0','#60b8f0','#60b8f0','#555c78','#555c78'],borderRadius:5,borderSkipped:false}]
  },options:{...base}});

  // ── 10. Purity grades ──
  const grades=['S','A','B','C','D','F'];
  const gcol={S:'rgba(65,217,176,0.7)',A:'rgba(96,184,240,0.7)',B:'rgba(165,147,255,0.7)',C:'rgba(240,192,96,0.7)',D:'rgba(240,96,128,0.7)',F:'rgba(85,92,120,0.5)'};
  const pur={};ALL.forEach(c=>{const g=c['worker.purity']||'F';pur[g]=(pur[g]||0)+1;});
  charts.pu=new C(document.getElementById('cPurity'),{type:'bar',data:{
    labels:grades,
    datasets:[{data:grades.map(g=>pur[g]||0),backgroundColor:grades.map(g=>gcol[g]),borderRadius:6,borderSkipped:false}]
  },options:{...base}});

  // ── 11. Actividad mensual ──
  charts.mo=new C(document.getElementById('cMonths'),{type:'bar',data:{
    labels:mLabels,
    datasets:[{data:mKeys.map(k=>mGrabs[k]),backgroundColor:'rgba(96,184,240,0.65)',borderRadius:5,borderSkipped:false}]
  },options:{...base,scales:{x:{...base.scales.x,ticks:{color:tc,font,maxRotation:30}},y:base.scales.y}}});

  // ── 12. Curva acumulada de grabs ──
  const sortedTs=GRABBED.map(c=>+c.obtainedTimestamp).filter(t=>t>0).sort((a,b)=>a-b);
  const step=Math.max(1,Math.floor(sortedTs.length/60));
  const cumLabels=[],cumData=[];
  sortedTs.forEach((ts,i)=>{if(i%step===0||i===sortedTs.length-1){cumLabels.push(new Date(ts).toLocaleDateString('es',{month:'short',year:'2-digit'}));cumData.push(i+1);}});
  charts.cum=new C(document.getElementById('cCumulative'),{type:'line',data:{
    labels:cumLabels,
    datasets:[{data:cumData,borderColor:'rgba(65,217,176,0.8)',backgroundColor:'rgba(65,217,176,0.06)',fill:true,tension:0.2,pointRadius:0,borderWidth:2}]
  },options:{...base,scales:{x:{...base.scales.x,ticks:{color:tc,font,maxRotation:30,autoSkip:true,maxTicksLimit:10}},y:base.scales.y}}});

  // ── 13. Effort por tag ──
  const et={};ALL.forEach(c=>{const t=(c.tag&&c.tag.trim())||'(sin tag)';if(!et[t])et[t]=[];et[t].push(+c['worker.effort']||0);});
  const ef=Object.entries(et).map(([t,v])=>[t,Math.round(v.reduce((s,x)=>s+x,0)/v.length)]).sort((a,b)=>b[1]-a[1]).slice(0,12);
  charts.ef=new C(document.getElementById('cEffort'),{type:'bar',data:{
    labels:ef.map(([t])=>t),
    datasets:[{data:ef.map(([,v])=>v),backgroundColor:'rgba(240,192,96,0.65)',borderRadius:6,borderSkipped:false}]
  },options:{...base,scales:{x:{...base.scales.x,ticks:{color:tc,font,maxRotation:35}},y:base.scales.y}}});

  // ── 14. Q4 por edición (grabbed) ──
  const q4ed={1:0,2:0,3:0,4:0,5:0,6:0,7:0};
  GRABBED.filter(c=>c.quality==='4').forEach(c=>{const e=+c.edition;if(q4ed[e]!==undefined)q4ed[e]++;});
  charts.q4e=new C(document.getElementById('cQ4ByEd'),{type:'bar',data:{
    labels:Object.keys(q4ed).map(e=>'Ed.'+e),
    datasets:[{data:Object.values(q4ed),backgroundColor:'rgba(240,96,128,0.7)',borderRadius:6,borderSkipped:false}]
  },options:{...base}});
}


function _getUserId(){
  const counts={};
  ALL.forEach(c=>{ if(c.grabber) counts[c.grabber]=(counts[c.grabber]||0)+1; });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
}

function _buildStatKpis(){
  const total=ALL.length; if(!total) return;
  const userId=_getUserId();
  // Luck-relevant stats: only cards grabbed by the user themselves
  const GRABBED = userId ? ALL.filter(c=>c.grabber===userId) : ALL;
  const gTotal = GRABBED.length;

  const prints=GRABBED.map(c=>+c.number||0).filter(n=>n>0).sort((a,b)=>a-b);
  const wls=GRABBED.map(c=>+c.wishlists||0);
  const q4=GRABBED.filter(c=>c.quality==='4').length;
  const q3=GRABBED.filter(c=>c.quality==='3').length;
  const p1s=prints.filter(p=>p===1).length;
  const top10=prints.filter(p=>p<=10).length;
  const top100=prints.filter(p=>p<=100).length;
  const printMed=prints.length?prints[Math.floor(prints.length/2)]:0;
  const wlTotal=wls.reduce((s,w)=>s+w,0);
  const wlMax=Math.max(0,...wls);
  const wlOver100=wls.filter(w=>w>=100).length;
  const wlOver500=wls.filter(w=>w>=500).length;

  // Time analysis (grabbed)
  const gts=GRABBED.map(c=>+c.obtainedTimestamp).filter(t=>t>0).sort((a,b)=>a-b);
  const gDays=gts.length?(gts[gts.length-1]-gts[0])/86400000:0;
  const grabsPerDay=gDays>0?(gTotal/gDays).toFixed(1):gTotal;

  // Best single day
  const dayCounts={};
  gts.forEach(ts=>{const d=new Date(ts).toISOString().slice(0,10);dayCounts[d]=(dayCounts[d]||0)+1;});
  const bestDay=Object.values(dayCounts).length?Math.max(...Object.values(dayCounts)):0;

  // Streak: longest consecutive days grabbing
  const activeDays=Object.keys(dayCounts).sort();
  let maxStreak=1,cur=1;
  for(let i=1;i<activeDays.length;i++){
    const prev=new Date(activeDays[i-1]),curr=new Date(activeDays[i]);
    const diff=(curr-prev)/86400000;
    cur=diff===1?cur+1:1;
    if(cur>maxStreak)maxStreak=cur;
  }

  // Q4 rate last 30 days
  const now=Date.now();
  const recent30=GRABBED.filter(c=>+c.obtainedTimestamp>now-30*86400000);
  const q4Rate30=recent30.length?((recent30.filter(c=>c.quality==='4').length/recent30.length)*100).toFixed(1):0;

  // Series diversity
  const uniqSeries=new Set(ALL.map(c=>c.series)).size;
  const uniqChars=new Set(ALL.map(c=>c.character)).size;

  // Best quality series (most Q4 grabs)
  const seriesQ4={};
  GRABBED.filter(c=>c.quality==='4').forEach(c=>{seriesQ4[c.series]=(seriesQ4[c.series]||0)+1;});
  const topSeriesQ4=Object.entries(seriesQ4).sort((a,b)=>b[1]-a[1])[0];

  // Wl efficiency: avg WL per Q4 grab
  const q4wls=GRABBED.filter(c=>c.quality==='4').map(c=>+c.wishlists||0);
  const avgQ4Wl=q4wls.length?Math.round(q4wls.reduce((s,w)=>s+w,0)/q4wls.length):0;

  // Collection-wide
  const efforts=ALL.map(c=>+c['worker.effort']||0);
  const totalEffort=efforts.reduce((s,e)=>s+e,0);
  const morphed=ALL.filter(c=>c.morphed==='Yes').length;
  const trimmed=ALL.filter(c=>c.trimmed==='Yes').length;
  const withFrame=ALL.filter(c=>c.frame&&c.frame.trim()).length;

  const kpis=[
    {l:'Grabs propios',v:gTotal,s:`de ${total} en colección`,c:'var(--accent2)'},
    {l:'Print mediana',v:'#'+printMed.toLocaleString(),s:`de tus ${gTotal} grabs`,c:'var(--rose)'},
    {l:'Mejor print',v:'#'+(prints.length?Math.min(...prints).toLocaleString():'?'),s:'print más bajo grabado',c:'var(--gold)'},
    {l:'Print #1',v:p1s,s:`carta${p1s!==1?'s':''} únicas`,c:'var(--teal)'},
    {l:'Prints ≤10',v:top10,s:`${gTotal?((top10/gTotal)*100).toFixed(1):0}% de tus grabs`,c:'var(--accent2)'},
    {l:'Prints ≤100',v:top100,s:`${gTotal?((top100/gTotal)*100).toFixed(1):0}% de tus grabs`,c:'var(--sky)'},
    {l:'★★★★ grabadas',v:q4,s:`${gTotal?((q4/gTotal)*100).toFixed(1):0}% tasa Q4`,c:'var(--r4)'},
    {l:'★★★ grabadas',v:q3,s:`${gTotal?((q3/gTotal)*100).toFixed(1):0}% tasa Q3`,c:'var(--r3)'},
    {l:'Q4 últimos 30d',v:q4Rate30+'%',s:`de ${recent30.length} grabs recientes`,c:'var(--rose)'},
    {l:'WL media (Q4)',v:avgQ4Wl.toLocaleString(),s:'wishlists por ★★★★ grabada',c:'var(--gold)'},
    {l:'Grabs ≥100 WL',v:wlOver100,s:`${gTotal?((wlOver100/gTotal)*100).toFixed(1):0}% cartas demand.`,c:'var(--accent2)'},
    {l:'Grabs ≥500 WL',v:wlOver500,s:'cartas muy demandadas',c:'var(--rose)'},
    {l:'Grabs/día',v:grabsPerDay,s:`en ${Math.round(gDays)} días activos`,c:'var(--sky)'},
    {l:'Mejor día',v:bestDay+' grabs',s:'en un solo día',c:'var(--gold)'},
    {l:'Racha más larga',v:maxStreak+' días',s:'seguidos grabando',c:'var(--teal)'},
    {l:'Series distintas',v:uniqSeries,s:`${uniqChars} personajes únicos`,c:'var(--accent2)'},
    {l:'Con marco',v:withFrame,s:`${total?((withFrame/total)*100).toFixed(1):0}% colección`,c:'var(--sky)'},
    {l:'Morphed',v:morphed,s:`${total?((morphed/total)*100).toFixed(1):0}% / Trimmed: ${trimmed}`,c:'var(--accent2)'},
    {l:'Effort total',v:totalEffort.toLocaleString(),s:'workers acumulados',c:'var(--gold)'},
    {l:'Serie top Q4',v:topSeriesQ4?topSeriesQ4[1]+'×':0,s:topSeriesQ4?topSeriesQ4[0].slice(0,22):'—',c:'var(--r4)'},
  ];
  document.getElementById('statKpiGrid').innerHTML=kpis.map(k=>`
    <div class="stat-kpi" style="--kc:${k.c}">
      <div class="stat-kpi-label">${k.l}</div>
      <div class="stat-kpi-val">${k.v}</div>
      <div class="stat-kpi-sub">${k.s}</div>
    </div>`).join('');
}

function _buildLuckyScore(){
  const total=ALL.length; if(!total){document.getElementById('statLucky').innerHTML='';return;}
  const userId=_getUserId();
  // Only grabbed-by-user cards count for luck
  const GRABBED = userId ? ALL.filter(c=>c.grabber===userId) : ALL;
  const gTotal = GRABBED.length;
  if(!gTotal){document.getElementById('statLucky').innerHTML='<div style="color:var(--text3);padding:1rem">No se detectaron cartas grabadas por ti.</div>';return;}

  const prints=GRABBED.map(c=>+c.number||0).filter(n=>n>0).sort((a,b)=>a-b);
  const wls=GRABBED.map(c=>+c.wishlists||0);
  const q4=GRABBED.filter(c=>c.quality==='4').length;
  const q3=GRABBED.filter(c=>c.quality==='3').length;

  // Score calculation based on grabbed cards only
  const printMed=prints.length?prints[Math.floor(prints.length/2)]:99999;
  const printScore=Math.max(0,Math.min(100,100-Math.log10(printMed+1)*20));
  const top10=prints.filter(p=>p<=10).length;
  const topPrintBonus=Math.min(40,top10*8);
  const wlAvg=wls.reduce((s,w)=>s+w,0)/wls.length;
  const wlScore=Math.min(100,wlAvg/5);
  const qualScore=((q4/gTotal)*100*1.5+(q3/gTotal)*100*0.8);
  const raw=(printScore*0.35+topPrintBonus*0.5+wlScore*0.2+Math.min(100,qualScore)*0.25);
  const score=Math.round(Math.min(100,raw));

  const grade=score>=90?{g:'S',col:'var(--teal)',txt:'¡Suerte legendaria!'}
    :score>=75?{g:'A',col:'var(--sky)',txt:'Muy buena suerte'}
    :score>=55?{g:'B',col:'var(--accent2)',txt:'Buena suerte'}
    :score>=35?{g:'C',col:'var(--gold)',txt:'Suerte normal'}
    :score>=20?{g:'D',col:'var(--rose)',txt:'Algo de mala suerte'}
    :{g:'F',col:'var(--text3)',txt:'Las cartas no te favorecen'};

  const p1s=prints.filter(p=>p===1).length;
  const wlMax=Math.max(0,...wls);
  const wlOver500=wls.filter(w=>w>=500).length;
  const printMin=prints.length?Math.min(...prints):0;
  const ts=GRABBED.map(c=>+c.obtainedTimestamp).filter(t=>t>0);
  const firstDate=ts.length?new Date(Math.min(...ts)).toLocaleDateString('es',{year:'numeric',month:'long',day:'numeric'}):'—';
  const totalDays=ts.length?Math.round((Math.max(...ts)-Math.min(...ts))/86400000):0;
  // Rate: only grabbed cards over time
  const grabsPerDay=totalDays>0?(gTotal/totalDays).toFixed(1):gTotal;

  const facts=[
    ['Grabbing desde',firstDate],
    ['Total grabs propios',gTotal+' de '+total],
    ['Grabs/día',grabsPerDay],
    ['Mejor print grabado','#'+printMin],
    ['Prints #1 grabados',p1s+' carta'+(p1s!==1?'s':'')],
    ['WL más alta grabada',wlMax.toLocaleString()+' wishlists'],
    ['Grabs ≥500 WL',wlOver500+' carta'+(wlOver500!==1?'s':'')],
    ['★★★★ grabadas',q4+' ('+(( q4/gTotal)*100).toFixed(1)+'%)'],
    ['★★★ grabadas',q3+' ('+((q3/gTotal)*100).toFixed(1)+'%)'],
  ];

  document.getElementById('statLucky').innerHTML=`
    <div class="lucky-score-wrap">
      <div class="lucky-score-num">${score}</div>
      <div class="lucky-score-label">Luck Score</div>
      <div class="lucky-score-grade" style="background:${grade.col}22;color:${grade.col};border:1px solid ${grade.col}55">${grade.g} — ${grade.txt}</div>
    </div>
    <div class="lucky-facts">
      ${facts.map(([k,v])=>`<div class="lucky-fact"><span>${k}</span><span>${v}</span></div>`).join('')}
    </div>`;
}

/* ══════════════════════════════════════════
   GLOBAL SEARCH (Ctrl+K)
══════════════════════════════════════════ */
let _gsIdx=-1, _gsResults=[];

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

function _gsOpen(idx){
  const c=_gsResults[idx];
  if(!c) return;
  closeGSearch();
  // Switch to personajes tab if needed
  const tab=document.querySelector('[data-tab="characters"]');
  if(tab&&!document.getElementById('panel-characters').classList.contains('active')){
    tab.click();
  }
  setTimeout(()=>showModal(c),50);
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

// Wire Ctrl+K globally
document.addEventListener('keydown',e=>{
  if(_gsNavKey(e)) return;
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){
    e.preventDefault();
    const overlay=document.getElementById('gsearchOverlay');
    if(overlay.classList.contains('hidden')) openGSearch();
    else closeGSearch();
  }
});

/* ── UPDATE _buildCharList TO HANDLE NEW FILTERS ── */
/* ══════════════════════════════════════════
   SKETCH CONVERTER
══════════════════════════════════════════ */
const SKETCH_PALETTE=['#000000','#131313','#1b1b1b','#272727','#3d3d3d','#5d5d5d','#858585','#b4b4b4','#ffffff','#c7cfdd','#92a1b9','#657392','#424c6e','#2a2f4e','#1a1932','#0e071b','#1c121c','#391f21','#5d2c28','#8a4836','#bf6f4a','#e69c69','#f6ca9f','#f9e6cf','#edab50','#e07438','#c64524','#8e251d','#ff5000','#ed7614','#ffa214','#ffc825','#ffeb57','#d3fc7e','#99e65f','#5ac54f','#33984b','#1e6f50','#134c4c','#0c2e44','#00396d','#0069aa','#0098dc','#00cdf9','#0cf1ff','#94fdff','#fdd2ed','#f389f5','#db3ffd','#7a09fa','#3003d9','#0c0293'];
const SKETCH_PAL_RGB=SKETCH_PALETTE.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
let _sketchSrc=null,_sketchResult=null,_sketchFilename='sketch';

// Sketch gallery: stored in IDB
const _SKETCH_IDB='karutaSketches',_SKETCH_STORE='sketches';
let _sketchIdb=null;

function _openSketchIdb(){
  return new Promise((res,rej)=>{
    if(_sketchIdb){res(_sketchIdb);return;}
    const req=indexedDB.open(_SKETCH_IDB,1);
    req.onupgradeneeded=e=>e.target.result.createObjectStore(_SKETCH_STORE,{keyPath:'id'});
    req.onsuccess=e=>{_sketchIdb=e.target.result;res(_sketchIdb);}
    req.onerror=()=>rej(req.error);
  });
}
async function _saveSketch(name,dataUrl){
  const db=await _openSketchIdb();
  const item={id:Date.now(),name,dataUrl,date:new Date().toLocaleDateString('es')};
  db.transaction(_SKETCH_STORE,'readwrite').objectStore(_SKETCH_STORE).put(item);
  return item;
}
async function _loadSketches(){
  const db=await _openSketchIdb();
  return new Promise((res,rej)=>{
    const req=db.transaction(_SKETCH_STORE,'readonly').objectStore(_SKETCH_STORE).getAll();
    req.onsuccess=()=>res(req.result.sort((a,b)=>b.id-a.id));
    req.onerror=()=>res([]);
  });
}
async function _deleteSketch(id){
  const db=await _openSketchIdb();
  db.transaction(_SKETCH_STORE,'readwrite').objectStore(_SKETCH_STORE).delete(id);
}

function sketchHandleDrop(e){e.preventDefault();document.getElementById('sketchDrop').classList.remove('drag-over');const f=e.dataTransfer.files?.[0];if(f)sketchLoadFile(f);}

function sketchLoadFile(file){
  if(!file||!file.type.startsWith('image/'))return;
  _sketchFilename=file.name.replace(/\.[^.]+$/,'')+'_sketch';
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const oc=document.createElement('canvas');
      oc.width=img.width;oc.height=img.height;
      oc.getContext('2d').drawImage(img,0,0);
      _sketchSrc=oc;
      document.getElementById('sketchDrop').innerHTML=
        `<span style="font-size:22px">✅</span><span style="font-size:13px">${esc(file.name)}</span>`+
        `<span style="font-size:11px;color:var(--text3)">${img.width}×${img.height}px · haz clic para cambiar</span>`+
        `<input type="file" id="sketchFileIn" accept="image/*" style="display:none" onchange="sketchLoadFile(this.files[0])">`;
      document.getElementById('sketchGenBtn').disabled=false;
      sketchUpdateInkInfo();
      sketchPreviewSource();
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

function sketchPreviewSource(){
  if(!_sketchSrc)return;
  const W=+document.getElementById('sketchW').value||400;
  const H=+document.getElementById('sketchH').value||560;
  const c=document.getElementById('sketchCanvas');
  c.width=W;c.height=H;
  c.getContext('2d').drawImage(_sketchSrc,0,0,W,H);
  c.style.display='block';
  document.getElementById('sketchEmpty').style.display='none';
  document.getElementById('sketchPreviewLabel').textContent=`Original ${_sketchSrc.width}×${_sketchSrc.height} → ${W}×${H}`;
}

async function sketchDetectSize(){
  if(!_sketchSrc){await dlgAlert('Carga una imagen primero.',{icon:'🖼️',title:'Sin imagen'});return;}
  document.getElementById('sketchW').value=_sketchSrc.width;
  document.getElementById('sketchH').value=_sketchSrc.height;
  sketchUpdateInkInfo();sketchPreviewSource();
}

function sketchUpdateInkInfo(){
  const ink=+document.getElementById('sketchInk').value||0;
  const W=+document.getElementById('sketchW').value||400;
  const H=+document.getElementById('sketchH').value||560;
  const pct=Math.min(100,((ink/(W*H))*100)).toFixed(1);
  const el=document.getElementById('sketchInkInfo');
  if(el)el.textContent=`≈${pct}% del canvas (${W}×${H})`;
}

function sketchToggleOrig(show){
  const ov=document.getElementById('sketchOrigCanvas');
  if(!ov)return;
  ov.style.display=show?'block':'none';
}

function _closestPalColor(r,g,b,pal){
  let best=0,bestD=Infinity;
  for(let i=0;i<pal.length;i++){
    const[pr,pg,pb]=pal[i];
    // Perceptual weighted distance
    const dr=r-pr,dg=g-pg,db=b-pb;
    const rm=(r+pr)/2;
    const d=(2+rm/256)*dr*dr+4*dg*dg+(2+(255-rm)/256)*db*db;
    if(d<bestD){bestD=d;best=i;}
  }
  return best;
}

// ── PALETTE LUT (built once per generate) ────────────
// 32^3 lookup: index = (r>>3)*1024 + (g>>3)*32 + (b>>3)
// Maps every 8-bit RGB bucket center → nearest palette index
// Uses perceptual RGB weighted distance (fast, works well for anime palette)
let _palLUT = null;

function _buildPalLUT(pal){
  const lut=new Uint8Array(32*32*32);
  for(let ri=0;ri<32;ri++){
    const r=ri*8+4;
    for(let gi=0;gi<32;gi++){
      const g=gi*8+4;
      for(let bi=0;bi<32;bi++){
        const b=bi*8+4;
        let best=0,bestD=Infinity;
        for(let j=0;j<pal.length;j++){
          const [pr,pg,pb]=pal[j];
          const dr=r-pr,dg=g-pg,db=b-pb;
          const rm=(r+pr)*0.5;
          const d=(2+rm/256)*dr*dr+4*dg*dg+(2+(255-rm)/256)*db*db;
          if(d<bestD){bestD=d;best=j;}
        }
        lut[ri*1024+gi*32+bi]=best;
      }
    }
  }
  return lut;
}

function _palLookup(lut,r,g,b){
  return lut[(r>>3)*1024+(g>>3)*32+(b>>3)];
}

// ── VIBRANCE BOOST (professional sketch color engine) ────
// Amplifies already-saturated colors while leaving neutrals/skin tones intact.
// Unlike plain saturation boost, vibrance is self-regulating:
// - Neutral gray (sat=0) → no change
// - Slightly saturated (sat=0.2) → ×1.6 boost
// - Fully saturated (sat=1.0) → ×4.0 boost
// Result: deep vivid hair/eye colors without clipping skin or whites
function _vibranceBoost(data, w, h, factor){
  for(let i=0;i<w*h*4;i+=4){
    const r=data[i], g=data[i+1], b=data[i+2];
    const mx=Math.max(r,g,b);
    const mn=Math.min(r,g,b);
    const sat=(mx-mn)/(mx+1); // 0-1
    const lum=(r+g+b)/3;
    // boost = 1 + sat * factor  (saturated → amplify, neutral → identity)
    const boost=1+sat*factor;
    data[i  ]=Math.max(0,Math.min(255,lum+(r-lum)*boost));
    data[i+1]=Math.max(0,Math.min(255,lum+(g-lum)*boost));
    data[i+2]=Math.max(0,Math.min(255,lum+(b-lum)*boost));
  }
}


// Reduces color noise before quantization — keeps edges, removes speckles
function _medianFilter(data, w, h){
  const out = new Uint8ClampedArray(data.length);
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      // 2×2 neighborhood: (x,y),(x+1,y),(x,y+1),(x+1,y+1)
      const xs=[x,Math.min(x+1,w-1)], ys=[y,Math.min(y+1,h-1)];
      for(let c=0;c<3;c++){
        const vals=[];
        for(const ny of ys) for(const nx of xs) vals.push(data[(ny*w+nx)*4+c]);
        vals.sort((a,b)=>a-b);
        out[i+c]=vals[1]; // median of 4 = avg of 2 middle values
      }
      out[i+3]=255;
    }
  }
  for(let i=0;i<data.length;i++) data[i]=out[i];
}

// ── POST-QUANTIZE CLEANUP (remove isolated colored pixels) ──
// pixels with 0 colored neighbors are noise — remove them
function _removeIsolatedPixels(compD, W, H){
  const WHITE=250;
  // First pass: mark isolated
  const remove=new Uint8Array(W*H);
  for(let y=1;y<H-1;y++){
    for(let x=1;x<W-1;x++){
      const i=(y*W+x)*4;
      if(compD[i]>=WHITE&&compD[i+1]>=WHITE&&compD[i+2]>=WHITE) continue; // white
      let coloredNeighbors=0;
      for(const [dy,dx] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const ni=((y+dy)*W+(x+dx))*4;
        if(compD[ni]<WHITE||compD[ni+1]<WHITE||compD[ni+2]<WHITE) coloredNeighbors++;
      }
      if(coloredNeighbors===0) remove[y*W+x]=1;
    }
  }
  // Second pass: clear them
  let removed=0;
  for(let i=0;i<W*H;i++){
    if(remove[i]){ compD[i*4]=255;compD[i*4+1]=255;compD[i*4+2]=255;compD[i*4+3]=255; removed++; }
  }
  return removed;
}

function _sharpenImageData(data, w, h, amount){
  const src=new Float32Array(data.length);
  for(let i=0;i<data.length;i++) src[i]=data[i];
  const out=new Float32Array(data.length);
  const k=[1/16,2/16,1/16,2/16,4/16,2/16,1/16,2/16,1/16];
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      let r=0,g=0,b=0;
      for(let ky=0;ky<3;ky++){
        for(let kx=0;kx<3;kx++){
          const nx=Math.min(w-1,Math.max(0,x+kx-1));
          const ny=Math.min(h-1,Math.max(0,y+ky-1));
          const ni=(ny*w+nx)*4;
          const wk=k[ky*3+kx];
          r+=src[ni]*wk;g+=src[ni+1]*wk;b+=src[ni+2]*wk;
        }
      }
      out[i]=Math.max(0,Math.min(255,src[i]+amount*(src[i]-r)));
      out[i+1]=Math.max(0,Math.min(255,src[i+1]+amount*(src[i+1]-g)));
      out[i+2]=Math.max(0,Math.min(255,src[i+2]+amount*(src[i+2]-b)));
      out[i+3]=255;
    }
  }
  for(let i=0;i<data.length;i++) data[i]=out[i];
}

function _enhanceImageData(data, contrast, saturation){
  for(let i=0;i<data.length;i+=4){
    let r=data[i],g=data[i+1],b=data[i+2];
    r=Math.max(0,Math.min(255,((r/255-.5)*contrast+.5)*255));
    g=Math.max(0,Math.min(255,((g/255-.5)*contrast+.5)*255));
    b=Math.max(0,Math.min(255,((b/255-.5)*contrast+.5)*255));
    const lum=0.2126*r+0.7152*g+0.0722*b;
    data[i]=Math.max(0,Math.min(255,lum+(r-lum)*saturation));
    data[i+1]=Math.max(0,Math.min(255,lum+(g-lum)*saturation));
    data[i+2]=Math.max(0,Math.min(255,lum+(b-lum)*saturation));
  }
}

const _PAL_DARK  = new Set([0,1,2,3,4,5,10,11,12,13]);
const _PAL_LIGHT = new Set([6,7,8,9,19]);

// ── SEMANTIC LAYER MAP ──
// Each index = palette color 0-51, value = layer (1=fondo 2=pelo 3=piel 4=ropa 5=contorno)
// Contorno: ONLY truly dark colors (idx 0-3)
// Pelo: blues, blue-purples, teal including purple hair tones
// Piel: warm skin tones
// Ropa: grays, warm darks, muted colors
// Fondo: pinks, magentas, greens, cyans, light blue-grays (sparkles/bg elements)
const _PAL_LAYER_MAP = new Uint8Array([
//  0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15
    5,   5,   5,   5,   4,   4,   4,   4,   4,   2,   2,   2,   5,   5,   2,   3,
// 16   17   18   19   20   21   22   23   24   25   26   27   28   29   30   31
    3,   3,   3,   3,   3,   3,   3,   3,   1,   1,   1,   1,   1,   1,   1,   1,
// 32   33   34   35   36   37   38   39   40   41   42   43   44   45   46   47
    2,   2,   2,   2,   2,   1,   1,   1,   1,   2,   2,   1,   1,   1,   1,   4,
// 48   49   50   51
    4,   4,   4,   4,
]);

const SKETCH_LAYERS_DEF = [
  { id:'fondo',    name:'Fondo',    icon:'🌸', order:1, color:'#f389f5', desc:'Entorno y fondo — pintar primero' },
  { id:'pelo',     name:'Pelo',     icon:'💙', order:2, color:'#0098dc', desc:'Cabello' },
  { id:'piel',     name:'Piel',     icon:'🍑', order:3, color:'#f5ca9f', desc:'Cara y piel' },
  { id:'ropa',     name:'Ropa',     icon:'👕', order:4, color:'#858585', desc:'Ropa y accesorios' },
  { id:'contorno', name:'Contorno', icon:'✏️', order:5, color:'#131313', desc:'Líneas negras — pintar último' },
];

function _sobelEdge(data,w,h){
  const gray=new Uint16Array(w*h);
  for(let i=0;i<w*h;i++) gray[i]=(data[i*4]*77+data[i*4+1]*150+data[i*4+2]*29)>>8;
  const edge=new Uint8Array(w*h);
  for(let y=1;y<h-1;y++){
    for(let x=1;x<w-1;x++){
      const i=y*w+x;
      const gx=-gray[i-w-1]+gray[i-w+1]-2*gray[i-1]+2*gray[i+1]-gray[i+w-1]+gray[i+w+1];
      const gy=-gray[i-w-1]-2*gray[i-w]-gray[i-w+1]+gray[i+w-1]+2*gray[i+w]+gray[i+w+1];
      const mag=(Math.sqrt(gx*gx+gy*gy)*0.5)|0;
      edge[i]=mag>255?255:mag;
    }
  }
  return edge;
}


// ── CUSTOM DIALOG SYSTEM ─────────────────────────────────
function _kpDialog({icon='ℹ️',title,msg='',type='info',inputVal='',inputPlaceholder='',okText='Aceptar',cancelText='Cancelar',showCancel=false,showInput=false}){
  return new Promise(resolve=>{
    const ov=document.createElement('div');
    ov.className='kp-dialog-overlay';
    const okCls=type==='danger'?'kp-dialog-btn kp-dialog-btn-danger':'kp-dialog-btn kp-dialog-btn-ok';
    ov.innerHTML=`
      <div class="kp-dialog" role="dialog" aria-modal="true">
        <div class="kp-dialog-header">
          <span class="kp-dialog-icon">${icon}</span>
          <div class="kp-dialog-titles"><span class="kp-dialog-title">${title||''}</span></div>
        </div>
        ${msg?`<div class="kp-dialog-msg">${msg}</div>`:''}
        ${showInput?`<div class="kp-dialog-input-wrap">
          <input class="kp-dialog-input" id="_kpDlgInput" value="${esc(inputVal)}" placeholder="${esc(inputPlaceholder)}" autocomplete="off">
        </div>`:''}
        <div class="kp-dialog-actions">
          ${showCancel?`<button class="kp-dialog-btn kp-dialog-btn-cancel" id="_kpDlgCancel">${cancelText}</button>`:''}
          <button class="${okCls}" id="_kpDlgOk">${okText}</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const inp=ov.querySelector('#_kpDlgInput');
    const okBtn=ov.querySelector('#_kpDlgOk');
    const cancelBtn=ov.querySelector('#_kpDlgCancel');
    if(inp){setTimeout(()=>{inp.focus();inp.select();},50);}
    else{setTimeout(()=>okBtn?.focus(),50);}
    const ok_=()=>{ov.remove();resolve(showInput?(inp?.value??null):true);};
    const no_=()=>{ov.remove();resolve(showInput?null:false);};
    okBtn?.addEventListener('click',ok_);
    cancelBtn?.addEventListener('click',no_);
    inp?.addEventListener('keydown',e=>{if(e.key==='Enter')ok_();if(e.key==='Escape')no_();});
    ov.addEventListener('keydown',e=>{if(e.key==='Escape')no_();});
  });
}
function dlgAlert(msg,{icon='ℹ️',title='Aviso'}={}){return _kpDialog({icon,title,msg,okText:'Aceptar'});}
function dlgConfirm(msg,{icon='❓',title='Confirmar',type='info',okText='Confirmar',cancelText='Cancelar'}={}){return _kpDialog({icon,title,msg,type,okText,cancelText,showCancel:true});}
function dlgPrompt(msg,defaultVal='',{icon='✏️',title='',placeholder='',okText='Aceptar',cancelText='Cancelar'}={}){return _kpDialog({icon,title:title||msg,msg:title?msg:'',inputVal:defaultVal,inputPlaceholder:placeholder,okText,cancelText,showInput:true,showCancel:true});}

// ── PAGE REORDER ──────────────────────────────────────
let _albDragPage = null;

function albPageDragStart(e, bi, pi){
  _albDragPage = {bi, pi};
  e.dataTransfer.effectAllowed = 'move';
}

function albPageDrop(e, bi, pi){
  if(!_albDragPage || _albDragPage.bi !== bi || _albDragPage.pi === pi) return;
  albMovePage(bi, _albDragPage.pi, pi);
  _albDragPage = null;
}

function albMovePage(bi, fromPi, toPi){
  const b = albumBooks[bi];
  if(!b || fromPi === toPi) return;
  const pages = b.pages;
  if(fromPi < 0 || fromPi >= pages.length || toPi < 0 || toPi >= pages.length) return;
  // Swap
  const [moved] = pages.splice(fromPi, 1);
  pages.splice(toPi, 0, moved);
  // Keep activePage pointing to same page
  if(b.activePage === fromPi) b.activePage = toPi;
  else if(fromPi < toPi && b.activePage > fromPi && b.activePage <= toPi) b.activePage--;
  else if(fromPi > toPi && b.activePage >= toPi && b.activePage < fromPi) b.activePage++;
  _albSave();
  renderAlbum();
}


async function sketchGenerate(){
  if(!_sketchSrc){alert('Carga una imagen primero.');return;}
  const btn=document.getElementById('sketchGenBtn');
  btn.disabled=true; btn.textContent='⏳ Preparando…';
  await new Promise(r=>setTimeout(r,20));

  const ink=+document.getElementById('sketchInk').value||23935;
  const targetW=+document.getElementById('sketchW').value||400;
  const targetH=+document.getElementById('sketchH').value||560;
  const mode=document.getElementById('sketchMode').value;
  const useLayers=document.getElementById('sketchLayerMode').value==='layers';
  const cleanup=document.getElementById('sketchCleanup').value;

  let pal=SKETCH_PAL_RGB;
  const isPro = mode==='pro';
  if(mode==='gray')    pal=SKETCH_PAL_RGB.filter(([r,g,b])=>Math.abs(r-g)<20&&Math.abs(g-b)<20);
  if(mode==='limited') pal=SKETCH_PAL_RGB.filter((_,i)=>i%3===0||i<7);

  // LUT + flat palette
  btn.textContent='⏳ Paleta…'; await new Promise(r=>setTimeout(r,0));
  const lut=_buildPalLUT(pal);
  const palFlat=new Uint8Array(pal.length*3);
  for(let j=0;j<pal.length;j++){palFlat[j*3]=pal[j][0];palFlat[j*3+1]=pal[j][1];palFlat[j*3+2]=pal[j][2];}

  // WHITE threshold — pro mode keeps very dark pixels (no dark skip)
  const WHITE=245, DARK=isPro?0:22;

  // ── Hi-res enhance ──
  btn.textContent='⏳ Mejorando…'; await new Promise(r=>setTimeout(r,0));
  const hiW=Math.min(_sketchSrc.width,targetW*4);
  const hiH=Math.min(_sketchSrc.height,targetH*4);
  const hiC=document.createElement('canvas'); hiC.width=hiW; hiC.height=hiH;
  const hiCtx=hiC.getContext('2d');
  hiCtx.fillStyle='#fff'; hiCtx.fillRect(0,0,hiW,hiH);
  hiCtx.drawImage(_sketchSrc,0,0,hiW,hiH);
  const hiD=hiCtx.getImageData(0,0,hiW,hiH);
  if(isPro){
    // Professional: strong sharpness + contrast + vibrance boost
    // Vibrance amplifies saturated colors (hair, eyes, clothes) without
    // blowing out neutrals/skin — gives vivid card-art color quality
    _sharpenImageData(hiD.data,hiW,hiH,2.5);
    _enhanceImageData(hiD.data,1.4,1.2);
    _vibranceBoost(hiD.data,hiW,hiH,3.0);
    _medianFilter(hiD.data,hiW,hiH); // always clean in pro mode
  } else {
    _sharpenImageData(hiD.data,hiW,hiH,1.5);
    _enhanceImageData(hiD.data,1.1,1.15);
  }
  hiCtx.putImageData(hiD,0,0);

  // Estimate paintable pixels
  const estC=document.createElement('canvas');
  estC.width=targetW; estC.height=targetH;
  const eCtx=estC.getContext('2d');
  eCtx.fillStyle='#fff'; eCtx.fillRect(0,0,targetW,targetH);
  eCtx.imageSmoothingQuality='high';
  eCtx.drawImage(hiC,0,0,targetW,targetH);
  const eD=eCtx.getImageData(0,0,targetW,targetH).data;
  let nw=0;
  for(let i=0;i<eD.length;i+=4){
    const r=eD[i],g=eD[i+1],b=eD[i+2];
    if(r>=WHITE&&g>=WHITE&&b>=WHITE) continue; // only skip pure white
    if(!isPro && r<=DARK&&g<=DARK&&b<=DARK) continue; // skip dark only in normal mode
    nw++;
  }
  let W=targetW, H=targetH;
  if(nw>ink){const s=Math.sqrt(ink/nw); W=Math.max(20,Math.round(targetW*s)); H=Math.max(10,Math.round(targetH*s));}

  // Final downscale
  btn.textContent='⏳ Escalando…'; await new Promise(r=>setTimeout(r,0));
  const sc=document.createElement('canvas'); sc.width=W; sc.height=H;
  const sCtx=sc.getContext('2d');
  sCtx.imageSmoothingEnabled=true; sCtx.imageSmoothingQuality='high';
  sCtx.fillStyle='#fff'; sCtx.fillRect(0,0,W,H);
  sCtx.drawImage(hiC,0,0,W,H);

  // Pre-quantize median filter — skip if already done in pro mode
  if(!isPro && (cleanup==='median'||cleanup==='median+clean')){
    const medD=sCtx.getImageData(0,0,W,H);
    _medianFilter(medD.data,W,H);
    sCtx.putImageData(medD,0,0);
  }
  const src=sCtx.getImageData(0,0,W,H).data;
  const N=W*H;

  // Quantize via LUT, skip white + dark
  btn.textContent='⏳ Cuantizando…'; await new Promise(r=>setTimeout(r,0));
  const palIdx=new Uint8Array(N), layerOf=new Uint8Array(N);
  let cc=0;
  for(let i=0;i<N;i++){
    const r=src[i*4],g=src[i*4+1],b=src[i*4+2];
    if(r>=WHITE&&g>=WHITE&&b>=WHITE) continue; // always skip pure white
    if(!isPro && r<=DARK&&g<=DARK&&b<=DARK) continue; // skip dark only in normal mode
    const ci=_palLookup(lut,r,g,b); palIdx[i]=ci; cc++;
    layerOf[i]=_PAL_LAYER_MAP[ci]||1;
  }
  // Safety: if still over budget, trim from bottom
  if(cc>ink){let ex=cc-ink; for(let i=N-1;i>=0&&ex>0;i--){if(layerOf[i]){layerOf[i]=0;ex--;}}}

  // Render
  btn.textContent='⏳ Renderizando…'; await new Promise(r=>setTimeout(r,0));
  const compD=new Uint8ClampedArray(N*4);
  for(let i=0;i<compD.length;i+=4){compD[i]=255;compD[i+1]=255;compD[i+2]=255;compD[i+3]=255;}
  const layerData={};
  if(useLayers){
    for(let l=1;l<=5;l++){
      layerData[l]=new Uint8ClampedArray(N*4);
      for(let i=0;i<N*4;i+=4){layerData[l][i]=255;layerData[l][i+1]=255;layerData[l][i+2]=255;layerData[l][i+3]=255;}
    }
  }
  let totalInk=0;
  for(let i=0;i<N;i++){
    const l=layerOf[i]; if(!l) continue;
    const p=palIdx[i]*3, k=i*4;
    compD[k]=palFlat[p]; compD[k+1]=palFlat[p+1]; compD[k+2]=palFlat[p+2]; compD[k+3]=255;
    if(useLayers&&layerData[l]){layerData[l][k]=palFlat[p];layerData[l][k+1]=palFlat[p+1];layerData[l][k+2]=palFlat[p+2];layerData[l][k+3]=255;}
    totalInk++;
  }

  // Post-quantize cleanup — remove isolated pixels (0 colored neighbors)
  if(cleanup==='clean'||cleanup==='median+clean'){
    const removed=_removeIsolatedPixels(compD,W,H);
    // Sync layerData with cleaned compD
    if(useLayers){
      for(let i=0;i<N;i++){
        const k=i*4;
        if(compD[k]===255&&compD[k+1]===255&&compD[k+2]===255){
          for(let l=1;l<=5;l++){
            if(layerData[l]){layerData[l][k]=255;layerData[l][k+1]=255;layerData[l][k+2]=255;layerData[l][k+3]=255;}
          }
        }
      }
    }
    totalInk-=removed;
  }

  const compC=document.createElement('canvas'); compC.width=W; compC.height=H;
  compC.getContext('2d').putImageData(new ImageData(compD,W,H),0,0);
  _sketchResult=compC; window._sketchW=W; window._sketchH=H;

  if(useLayers){
    window._sketchLayers=SKETCH_LAYERS_DEF.map(def=>{
      const lc=document.createElement('canvas'); lc.width=W; lc.height=H;
      lc.getContext('2d').putImageData(new ImageData(layerData[def.order],W,H),0,0);
      let inkC=0; const d=layerData[def.order];
      for(let i=0;i<d.length;i+=4) if(d[i]!==255||d[i+1]!==255||d[i+2]!==255) inkC++;
      return{...def,inkCount:inkC,_canvas:lc};
    });
  }

  // Display
  const dc=document.getElementById('sketchCanvas');
  dc.width=W; dc.height=H; dc.style.imageRendering='pixelated';
  dc.getContext('2d').drawImage(compC,0,0); dc.style.display='block';
  document.getElementById('sketchEmpty').style.display='none';
  const oc=document.getElementById('sketchOrigCanvas');
  oc.width=W; oc.height=H;
  const ocCtx=oc.getContext('2d'); ocCtx.fillStyle='#fff'; ocCtx.fillRect(0,0,W,H);
  ocCtx.drawImage(_sketchSrc,0,0,W,H);
  document.getElementById('sketchStats').style.display='flex';
  document.getElementById('sketchStats').innerHTML=
    `<span>📐 <b>${W}×${H}</b>${W<targetW?' (auto)':''}</span>`+
    `<span>🩸 <b>${totalInk.toLocaleString()}</b>/${ink.toLocaleString()} ink</span>`+
    `<span>💧 <b>${Math.max(0,ink-totalInk).toLocaleString()}</b> sobrante</span>`;
  document.getElementById('sketchPreviewLabel').textContent=`Sketch · ${W}×${H}${W<targetW?' ← reducido':''}`;
  document.getElementById('sketchActionBtns').style.display='flex';
  document.getElementById('sketchExportLayersBtn').style.display=useLayers?'flex':'none';
  if(useLayers) _renderLayersPanel(window._sketchLayers,W,H);
  else document.getElementById('sketchLayersPanel').style.display='none';
  btn.disabled=false; btn.textContent='✏️ Regenerar';
}

function _renderLayersPanel(layers,W,H){
  document.getElementById('sketchLayersPanel').style.display='block';
  document.getElementById('sketchLayerInfo').textContent=`${layers.length} capas · pintar en orden ↓`;
  const grid=document.getElementById('sketchLayersGrid');
  grid.innerHTML='';
  for(const layer of layers){
    const card=document.createElement('div');
    card.className='sketch-layer-card';
    const scale=Math.min(1,180/W);
    const tw=Math.round(W*scale), th=Math.round(H*scale);
    const thumb=document.createElement('canvas');
    thumb.width=tw; thumb.height=th;
    thumb.className='sketch-layer-canvas'; thumb.style.imageRendering='pixelated';
    const tCtx=thumb.getContext('2d');
    tCtx.imageSmoothingEnabled=false;
    tCtx.drawImage(layer._canvas,0,0,tw,th);
    thumb.onclick=()=>{
      const ov=document.createElement('div');
      ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:5000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;cursor:zoom-out;padding:1rem';
      ov.onclick=()=>ov.remove();
      const bc=document.createElement('canvas');
      const s2=Math.min(1,Math.min(window.innerWidth*.9,window.innerHeight*.8)/Math.max(W,H));
      bc.width=Math.round(W*s2); bc.height=Math.round(H*s2);
      bc.style.cssText='border-radius:8px;image-rendering:pixelated;box-shadow:0 8px 40px rgba(0,0,0,.8)';
      bc.getContext('2d').drawImage(layer._canvas,0,0,bc.width,bc.height);
      const lbl=document.createElement('div');
      lbl.style.cssText='color:#e8eaf0;font-size:13px';
      lbl.textContent=`${layer.icon} Capa ${layer.order}: ${layer.name} · ${layer.inkCount.toLocaleString()} ink`;
      ov.appendChild(bc); ov.appendChild(lbl);
      document.body.appendChild(ov);
    };
    card.innerHTML=`<div class="sketch-layer-header">
      <span class="sketch-layer-name"><span style="font-size:16px">${layer.icon}</span>Capa ${layer.order} — ${layer.name}</span>
      <span class="sketch-layer-badge" style="background:${layer.color}22;color:${layer.color}">${layer.inkCount.toLocaleString()} ink</span>
    </div>`;
    card.appendChild(thumb);
    const footer=document.createElement('div');
    footer.className='sketch-layer-footer';
    footer.innerHTML=`<span class="sketch-layer-order">${layer.desc}</span>
      <button class="sketch-layer-dl" onclick="sketchDownloadLayer(${layer.order-1})" title="Descargar esta capa como PNG">⬇ PNG</button>`;
    grid.appendChild(card);
  }
}

function sketchDownloadLayer(idx){
  const layer=window._sketchLayers?.[idx];
  if(!layer?._canvas) return;
  const link=document.createElement('a');
  link.download=`${_sketchFilename}_capa${layer.order}_${layer.id}.png`;
  link.href=layer._canvas.toDataURL('image/png');
  link.click();
}

async function sketchExportLayers(){
  const layers=window._sketchLayers;
  if(!layers?.length) return;
  if(!window.JSZip){
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    document.head.appendChild(s);
    await new Promise(r=>{s.onload=r;});
  }
  const btn=document.getElementById('sketchExportLayersBtn');
  btn.textContent='⏳ Generando ZIP…'; btn.disabled=true;
  const zip=new window.JSZip();
  const folder=zip.folder(_sketchFilename);
  folder.file('00_composite.png', await new Promise(r=>_sketchResult.toBlob(r,'image/png')));
  for(const l of layers){
    if(!l._canvas) continue;
    folder.file(`0${l.order}_${l.id}.png`, await new Promise(r=>l._canvas.toBlob(r,'image/png')));
  }
  folder.file('LEEME.txt',`Capas del sketch — pintar en orden:\n${layers.map(l=>`${l.order}. ${l.name} (${l.inkCount.toLocaleString()} ink) — ${l.desc}`).join('\n')}\nCanvas: ${window._sketchW}×${window._sketchH}`);
  const blob=await zip.generateAsync({type:'blob'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.download=_sketchFilename+'_capas.zip';
  link.href=url; link.click();
  URL.revokeObjectURL(url);
  btn.textContent='📦 Exportar capas (.zip)'; btn.disabled=false;
}

function sketchExport(){
  if(!_sketchResult) return;
  const W=_sketchResult.width, H=_sketchResult.height;
  const SCALE=4; // ×4 upscale for the visual reference view

  // ── Canvas A: original pixel-perfect ──
  const cA = document.getElementById('sketchExportCanvasA');
  cA.width=W; cA.height=H;
  cA.getContext('2d').drawImage(_sketchResult,0,0);
  document.getElementById('sketchExportInfoA').textContent=`${W}×${H}px · PNG`;

  // ── Canvas B: ×4 upscale, smooth rendering ──
  const cB = document.getElementById('sketchExportCanvasB');
  cB.width=W*SCALE; cB.height=H*SCALE;
  const ctxB=cB.getContext('2d');
  ctxB.imageSmoothingEnabled=true;
  ctxB.imageSmoothingQuality='high';
  ctxB.drawImage(_sketchResult,0,0,W*SCALE,H*SCALE);
  document.getElementById('sketchExportInfoB').textContent=`${W*SCALE}×${H*SCALE}px (×${SCALE}) · PNG`;

  // Sub info
  document.getElementById('sketchExportSub').textContent=
    `${_sketchFilename} · ${W}×${H}px`;

  // Show overlay
  document.getElementById('sketchExportOverlay').classList.remove('hidden');
}

function sketchExportCancel(){
  document.getElementById('sketchExportOverlay').classList.add('hidden');
}

function sketchExportDownload(mode){
  if(!_sketchResult) return;
  const W=_sketchResult.width, H=_sketchResult.height;
  const link=document.createElement('a');
  if(mode==='x4'){
    const SCALE=4;
    const offC=document.createElement('canvas');
    offC.width=W*SCALE; offC.height=H*SCALE;
    const ctx=offC.getContext('2d');
    ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    ctx.drawImage(_sketchResult,0,0,W*SCALE,H*SCALE);
    link.download=_sketchFilename+'_x4.png';
    link.href=offC.toDataURL('image/png');
  } else {
    link.download=_sketchFilename+'.png';
    link.href=_sketchResult.toDataURL('image/png');
  }
  link.click();
  sketchExportCancel();
}

async function sketchSave(){
  if(!_sketchResult)return;
  const name=await dlgPrompt('Nombre del sketch',_sketchFilename,{icon:'💾',title:'Guardar sketch',placeholder:'Nombre…',okText:'Guardar'})||_sketchFilename;
  const dataUrl=_sketchResult.toDataURL('image/png');
  await _saveSketch(name,dataUrl);
  renderSketchGallery();
  const btn=document.getElementById('sketchSaveBtn');
  btn.textContent='✅ Guardado';
  setTimeout(()=>{btn.textContent='💾 Guardar en galería';},2000);
}

async function renderSketchGallery(){
  const gallery=document.getElementById('sketchGallery');
  if(!gallery)return;
  const sketches=await _loadSketches();
  if(!sketches.length){
    gallery.innerHTML='<div class="sketch-gal-empty">No hay sketches guardados aún.</div>';
    return;
  }
  gallery.innerHTML=sketches.map(s=>`
    <div class="sketch-gal-item">
      <img class="sketch-gal-img" src="${s.dataUrl}" alt="${esc(s.name)}" onclick="sketchGalOpen(${s.id})">
      <div class="sketch-gal-info">
        <span class="sketch-gal-name">${esc(s.name)}</span>
        <span class="sketch-gal-date">${s.date}</span>
      </div>
      <div class="sketch-gal-actions">
        <button class="alb-icon-btn" onclick="sketchGalDownload(${s.id})" title="Descargar">⬇</button>
        <button class="alb-icon-btn del" onclick="sketchGalDelete(${s.id})" title="Eliminar">🗑</button>
      </div>
    </div>`).join('');
}

async function sketchGalOpen(id){
  const sketches=await _loadSketches();
  const s=sketches.find(x=>x.id===+id||x.id===id);
  if(!s)return;
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:5000;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:1rem';
  ov.onclick=()=>ov.remove();
  const img=document.createElement('img');
  img.src=s.dataUrl;
  img.style.cssText='max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.8)';
  ov.appendChild(img);
  document.body.appendChild(ov);
}

async function sketchGalDownload(id){
  const sketches=await _loadSketches();
  const s=sketches.find(x=>x.id===+id||x.id===id);
  if(!s)return;
  const link=document.createElement('a');
  link.download=s.name+'.png';
  link.href=s.dataUrl;
  link.click();
}

async function sketchGalDelete(id){
  if(!await dlgConfirm('¿Eliminar este sketch? No se puede recuperar.',{icon:'🗑',title:'Eliminar sketch',type:'danger',okText:'Eliminar'}))return;
  await _deleteSketch(+id||id);
  renderSketchGallery();
}

function _renderSketchPalette(){
  const grid=document.getElementById('sketchPaletteGrid');
  if(!grid||grid.children.length)return;
  grid.innerHTML=SKETCH_PALETTE.map(c=>`<div class="sketch-swatch" style="background:${c}" title="${c.toUpperCase()}" onclick="navigator.clipboard?.writeText('${c.toUpperCase()}')"></div>`).join('');
}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-tab="sketches"]')){
    setTimeout(()=>{_renderSketchPalette();renderSketchGallery();},50);
  }
});

/* ── CHAR FILTERS ── */
function clearCharFilters(){
  ['searchChar','filterQual','filterEdition','filterMorphed','filterFrame','filterTag','filterGrabbed','filterPrint'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  document.getElementById('sortChar').value='date';
  renderChars();
}

function _populateTagFilter(){
  const sel=document.getElementById('filterTag');
  if(!sel)return;
  const cur=sel.value;
  const tags=[...new Set(ALL.map(c=>(c.tag||'').trim()).filter(Boolean))].sort();
  sel.innerHTML='<option value="">Todos los tags</option>'+tags.map(t=>`<option value="${esc(t)}"${t===cur?' selected':''}>${esc(t)}</option>`).join('');
}

/* ── TAG OVERRIDES ── */
function _persistTagChanges(){
  try{
    const ov={};
    ALL.forEach(c=>{if(c.code)ov[c.code]=c.tag||'';});
    localStorage.setItem('karutaTagOverrides',JSON.stringify(ov));
  }catch(e){}
}

function _loadTagOverrides(){
  try{
    const ov=JSON.parse(localStorage.getItem('karutaTagOverrides')||'{}');
    if(!Object.keys(ov).length)return;
    ALL.forEach(c=>{if(c.code&&ov[c.code]!==undefined)c.tag=ov[c.code];});
  }catch(e){}
}

/* ── THEME & LANGUAGE ── */
const THEMES={dark:{},amoled:{},light:{},sakura:{},forest:{},ocean:{}};
const I18N={
  es:{characters:'Personajes',albums:'Álbumes',series:'Series',frames:'Marcos',workers:'Workers',tags:'Tags',stats:'Stats'},
  en:{characters:'Characters',albums:'Albums',series:'Series',frames:'Frames',workers:'Workers',tags:'Tags',stats:'Stats'},
  ja:{characters:'キャラ',albums:'アルバム',series:'シリーズ',frames:'フレーム',workers:'ワーカー',tags:'タグ',stats:'統計'}
};
let _currentLang='es', _currentTheme='dark';
function t(key){return(I18N[_currentLang]||I18N.es)[key]||key;}

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
  if(!isOpen){
    dd.classList.add('open');
    // Position sidebar dropdowns dynamically at button Y
    if(dd.classList.contains('sidebar-dropdown')){
      const row=dd.closest('.sidebar-footer-row')||dd.parentElement;
      const btn=row?.querySelector('button');
      if(btn){
        const r=btn.getBoundingClientRect();
        const sRect=document.getElementById('sidebar')?.getBoundingClientRect();
        const ddH=Math.min(dd.scrollHeight||250, window.innerHeight-r.top-16);
        const top=Math.max(8, Math.min(r.top, window.innerHeight-ddH-8));
        dd.style.top=top+'px';
        dd.style.left=((sRect?.right||220)+8)+'px';
        dd.style.maxHeight=ddH+'px';
        dd.style.overflowY='auto';
      }
    }
  }
}

function closeAllDropdowns(){
  document.querySelectorAll('.nav-dropdown.open,.sidebar-dropdown.open').forEach(d=>d.classList.remove('open'));
}

document.addEventListener('click',e=>{
  if(!e.target.closest('.nav-controls') && !e.target.closest('.sidebar-footer') && !e.target.closest('.sidebar-dropdown')){
    closeAllDropdowns();
  }
});




let _rescalerSrc=null, _rescalerLocked=true, _rescalerAspect=1;

function rescalerHandleDrop(e){
  e.preventDefault();
  document.getElementById('rescalerDrop').classList.remove('drag-over');
  const f=e.dataTransfer.files?.[0];
  if(f&&f.type.startsWith('image/')) rescalerLoadFile(f);
}

function rescalerLoadFile(file){
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      _rescalerSrc=img;
      _rescalerAspect=img.width/img.height;
      document.getElementById('rescalerDropLabel').textContent=`✅ ${file.name}`;
      document.getElementById('rescalerDrop').style.borderColor='var(--teal)';
      document.getElementById('rescalerOrigSize').textContent=`Original: ${img.width}×${img.height}px`;
      document.getElementById('rescalerOrigInfo').textContent=`Original: ${img.width}×${img.height}`;
      document.getElementById('rescalerW').value=img.width;
      document.getElementById('rescalerH').value=img.height;
      document.getElementById('rescalerBtn').disabled=false;
      rescalerUpdatePreview();
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

function rescalerApplyPreset(w,h){
  document.getElementById('rescalerW').value=w;
  document.getElementById('rescalerH').value=h;
  _rescalerLocked=false;
  document.getElementById('rescalerLockBtn').classList.remove('active');
  rescalerUpdatePreview();
}

function rescalerToggleLock(){
  _rescalerLocked=!_rescalerLocked;
  const btn=document.getElementById('rescalerLockBtn');
  btn.classList.toggle('active',_rescalerLocked);
  btn.textContent=_rescalerLocked?'🔒':'🔓';
  if(_rescalerSrc&&_rescalerLocked) _rescalerAspect=_rescalerSrc.width/_rescalerSrc.height;
}

function rescalerOnDimChange(which){
  if(_rescalerLocked){
    const wEl=document.getElementById('rescalerW'), hEl=document.getElementById('rescalerH');
    if(which==='w') hEl.value=Math.max(1,Math.round((+wEl.value||1)/_rescalerAspect));
    else            wEl.value=Math.max(1,Math.round((+hEl.value||1)*_rescalerAspect));
  }
  rescalerUpdatePreview();
}

function rescalerUpdateQualityVis(){
  const fmt=document.getElementById('rescalerFormat').value;
  const show=fmt==='image/jpeg'||fmt==='image/webp';
  document.getElementById('rescalerJpegQ').style.display=show?'block':'none';
  document.getElementById('rescalerJpegQLabel').style.display=show?'inline':'none';
}

function rescalerUpdatePreview(){
  if(!_rescalerSrc) return;
  const W=+document.getElementById('rescalerW').value||1;
  const H=+document.getElementById('rescalerH').value||1;
  const quality=document.getElementById('rescalerQuality').value;
  const canvas=document.getElementById('rescalerCanvas');
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d');
  if(quality==='pixelated'){
    ctx.imageSmoothingEnabled=false;
  } else {
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality=quality==='high'?'high':'medium';
  }
  ctx.drawImage(_rescalerSrc,0,0,W,H);
  canvas.style.display='block';
  canvas.style.imageRendering=quality==='pixelated'?'pixelated':'auto';
  document.getElementById('rescalerEmpty').style.display='none';
  document.getElementById('rescalerPreviewLabel').textContent=`Vista previa · ${W}×${H}px`;
  document.getElementById('rescalerNewInfo').textContent=`Nuevo: ${W}×${H}`;
  document.getElementById('rescalerSizeBar').style.display='block';
  document.getElementById('rescalerSizeOrig').textContent=`${_rescalerSrc.width}×${_rescalerSrc.height}`;
  document.getElementById('rescalerSizeNew').textContent=`${W}×${H}`;
}

function rescalerProcess(){
  if(!_rescalerSrc) return;
  const W=+document.getElementById('rescalerW').value||1;
  const H=+document.getElementById('rescalerH').value||1;
  const fmt=document.getElementById('rescalerFormat').value;
  const quality=document.getElementById('rescalerQuality').value;
  const jpegQ=+document.getElementById('rescalerJpegQ').value/100;
  const canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d');
  if(quality==='pixelated'){ ctx.imageSmoothingEnabled=false; }
  else { ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality=quality==='high'?'high':'medium'; }
  ctx.drawImage(_rescalerSrc,0,0,W,H);
  const ext=fmt==='image/png'?'png':fmt==='image/webp'?'webp':'jpg';
  const link=document.createElement('a');
  link.download=`rescaled_${W}x${H}.${ext}`;
  link.href=fmt==='image/png'?canvas.toDataURL('image/png'):canvas.toDataURL(fmt,jpegQ);
  link.click();
}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-tab="rescaler"]')) setTimeout(rescalerUpdateQualityVis,50);
});

// ── CHAR SELECTION MODE ──────────────────────────────────
// selected codes

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
  btn.style.animation = 'copyFeedback 0.3s ease';
  setTimeout(()=>{
    btn.textContent = '📋 Copiar IDs';
    btn.style.animation = '';
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



(function(){
  const savedTheme=localStorage.getItem('karutaTheme')||'dark';
  const savedLang=localStorage.getItem('karutaLang')||'es';
  setTheme(savedTheme);
  _currentLang=savedLang;
  ['es','en','ja'].forEach(l=>{
    const el=document.getElementById('lang-'+l);
    if(el)el.classList.toggle('active',l===savedLang);
  });
})();

if(typeof _migrateToIdb==='function')_migrateToIdb();




// ── LAZY TAB RENDERING: only render when first visited ──
const _renderedTabs = new Set(['home']);

function _ensureTabRendered(tab){
  if(_renderedTabs.has(tab)) return;
  _renderedTabs.add(tab);
  switch(tab){
    case 'series':     renderSeries();   break;
    case 'frames':     renderFrames();   break;
    case 'workers':    renderWorkers();  break;
    case 'tags':       renderTags();     break;
    case 'albums':    renderAlbum();    break;
    case 'stats':      buildCharts();    break;
    case 'characters': renderChars();    break;
  }
}

// ── HOME PANEL ───────────────────────────────────────────────
function buildHomePanel(){
  if(!ALL.length) return;

  const total = ALL.length;
  const burn  = ALL.reduce((s,c)=>s+(+c.burnValue||0),0);
  const series= new Set(ALL.map(c=>c.series)).size;
  const q4    = ALL.filter(c=>c.quality==='4').length;
  const q3    = ALL.filter(c=>c.quality==='3').length;
  const q2    = ALL.filter(c=>c.quality==='2').length;
  const q1    = ALL.filter(c=>c.quality==='1').length;
  const morphed=ALL.filter(c=>c.morphed==='Yes').length;
  const withFrame=ALL.filter(c=>c.frame&&c.frame.trim()).length;

  // Greeting
  const greet=document.getElementById('homeGreeting');
  const sub=document.getElementById('homeSubtitle');
  if(greet) greet.textContent='Colección de Karuta';
  if(sub)   sub.textContent=total.toLocaleString('es')+' cartas en '+series.toLocaleString('es')+' series';

  // Stats list
  const statsList=document.getElementById('homeStatsList');
  if(statsList){
    const rows=[
      ['Total cartas', total.toLocaleString('es')],
      ['Series únicas', series.toLocaleString('es')],
      ['Burn total', burn.toLocaleString('es')+' 🔥'],
      ['★★★★', q4.toLocaleString('es')],
      ['Morphed', morphed.toLocaleString('es')],
      ['Con marco', withFrame.toLocaleString('es')],
    ];
    statsList.innerHTML=rows.map(([n,v])=>`
      <div class="home-stat-row">
        <span class="home-stat-name">${n}</span>
        <span class="home-stat-val">${v}</span>
      </div>`).join('');
  }

  // Quality bars
  const qBars=document.getElementById('homeQualityBars');
  if(qBars){
    const qs=[['★★★★',q4,'#f43f5e'],['★★★',q3,'#818cf8'],['★★',q2,'#bf6f4a'],['★',q1,'#505878']];
    const maxQ=Math.max(q4,q3,q2,q1)||1;
    qBars.innerHTML=qs.map(([l,n,c])=>`
      <div class="hqb-row">
        <span class="hqb-label" style="color:${c}">${l}</span>
        <div class="hqb-track"><div class="hqb-fill" style="width:${(n/maxQ*100).toFixed(1)}%;background:${c}"></div></div>
        <span class="hqb-count">${n}</span>
      </div>`).join('');
  }

  // Top series
  const topSeries=document.getElementById('homeTopSeries');
  if(topSeries){
    const sMap={};
    ALL.forEach(c=>{ sMap[c.series]=(sMap[c.series]||0)+1; });
    const top=Object.entries(sMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
    topSeries.innerHTML=top.map(([name,cnt],i)=>`
      <div class="hts-row">
        <span class="hts-rank">#${i+1}</span>
        <span class="hts-name">${esc(name||'—')}</span>
        <span class="hts-count">${cnt}</span>
      </div>`).join('');
  }

  // Recent cards (last 10 by timestamp)
  const recentEl=document.getElementById('homeRecent');
  if(recentEl){
    const recent=[...ALL]
      .filter(c=>c.obtainedTimestamp)
      .sort((a,b)=>(+b.obtainedTimestamp||0)-(+a.obtainedTimestamp||0))
      .slice(0,10);
    recentEl.innerHTML=recent.map(c=>{
      const slug=toSlug(c.character||'');
      const ed=c.edition||'1';
      const img=CDN+slug+'-'+ed+'.jpg';
      return `<div class="home-recent-card" onclick="openCardModal('${esc(c.code||'')}')">
        <img class="home-recent-img" src="${img}" alt="${esc(c.character)}" loading="lazy" onerror="this.style.opacity='.2'">
        <div class="home-recent-info">
          <div class="home-recent-name">${esc(c.character)}</div>
        </div>
      </div>`;
    }).join('');
  }
}

// ── HASH ROUTER ──────────────────────────────────────────────
const _VALID_TABS = ['personajes','albumes','series','marcos','workers','tags','stats','sketches','rescaler'];

function _routeToHash(){
  const hash = location.hash.slice(1) || 'personajes';
  const tab  = _VALID_TABS.includes(hash) ? hash : 'personajes';
  _activateTab(tab, false); // false = don't push history again
}

function _activateTab(tab){
  const btn       = document.querySelector('[data-tab="'+tab+'"]');
  const nextPanel = document.getElementById('panel-'+tab);
  if(!btn||!nextPanel) return;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  nextPanel.classList.add('active');
  _setTopbarTitle(tab);
  closeSidebarMobile();
  if(tab==='stats')   setTimeout(buildCharts,50);
  if(tab==='albums') setTimeout(renderAlbum,0);
  if(tab==='home')    setTimeout(buildHomePanel,0);
}

function _initRouter(){ /* no-op: routing via pages */ }

(function(){
  // Wait for DOM + deferred scripts to be ready
  function init(){
    try{
      if(_tryRestoreCSV()){
        _showDashboard();
      }
    }catch(e){
      console.error('[Karuta] Startup error:', e);
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

document.getElementById('formCharName')?.addEventListener('input',previewSlug);
document.getElementById('formEdition')?.addEventListener('change',previewSlug);
