
// ── SIDEBAR NAVIGATION ───────────────────────────────────────
const _tabTitles = {
  home:'Inicio', characters:'Personajes', albums:'Álbumes', series:'Series',
  frames:'Marcos', workers:'Workers', tags:'Tags', stats:'Stats',
  sketches:'Sketches', rescaler:'Rescalador'
};

// Returns translated tab title using I18N
function _tabTitle(tab){
  const map = {
    home:       {es:'Inicio',     en:'Home',       ja:'ホーム'},
    characters: {es:'Personajes', en:'Characters',  ja:'キャラ'},
    albums:     {es:'Álbumes',    en:'Albums',       ja:'アルバム'},
    series:     {es:'Series',     en:'Series',       ja:'シリーズ'},
    frames:     {es:'Marcos',     en:'Frames',       ja:'フレーム'},
    workers:    {es:'Workers',    en:'Workers',      ja:'ワーカー'},
    tags:       {es:'Tags',       en:'Tags',         ja:'タグ'},
    stats:      {es:'Stats',      en:'Stats',        ja:'統計'},
    sketches:   {es:'Sketches',   en:'Sketches',     ja:'スケッチ'},
    rescaler:   {es:'Rescalador', en:'Rescaler',     ja:'リサイズ'},
  };
  return (map[tab]||{})[_currentLang||'es'] || tab;
}

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
  if(el) el.textContent = _tabTitle(tab);
}

function _updateSidebarLabels(){
  document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(el=>{
    const tab = el.dataset.tab;
    const label = el.querySelector('.sidebar-nav-label');
    if(label) label.textContent = _tabTitle(tab);
    el.title = _tabTitle(tab);
  });
  // Sidebar footer labels
  const sfLabels = {
    'sfooter-theme': t('theme'),
    'sfooter-language': t('language'),
    'sfooter-data': t('data'),
    'sfooter-csv': t('changeCSV'),
  };
  Object.entries(sfLabels).forEach(([id,txt])=>{
    const el = document.getElementById(id);
    if(el) el.textContent = txt;
  });
  // Search button label
  const sl = document.getElementById('sidebarSearchLabel');
  if(sl) sl.textContent = t('searchCardsPlaceholder');
  // Gsearch input placeholder
  const gi = document.getElementById('gsearchInput');
  if(gi) gi.placeholder = t('gsearchPlaceholder');
  // Card picker search placeholder
  const cp = document.getElementById('cpSearch');
  if(cp) cp.placeholder = t('cpSearchPlaceholder');
  // Topbar search label
  const tsl = document.getElementById('topbarSearchLabel');
  if(tsl) tsl.textContent = t('search');
}

// Apply translations to all [data-i18n] elements in the DOM
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.dataset.i18n;
    const val = t(key);
    if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){
      if(el.placeholder!==undefined) el.placeholder=val;
    } else if(el.tagName==='OPTION'){
      el.textContent=val;
    } else {
      el.textContent=val;
    }
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{
    el.placeholder = t(el.dataset.i18nPh);
  });
  _updateSidebarLabels();
}

// Update sidebar card count
function _updateSidebarStats(){
  const el = document.getElementById('sidebarCardCount');
  if(!el) return;
  if(ALL.length){
    el.textContent = ALL.length.toLocaleString('es') + ' cartas';
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
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
    if(!ALL.length){await dlgAlert(t('noResults'),{icon:'📂',title:t('noResults')});return}
    // Persist CSV in localStorage
    try{localStorage.setItem('karutaCSV',raw);}catch(ex){}
    // Navigate to home after loading CSV
    window.location.href=(window.__KWM_BASE__||'')+'/';
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
  buildMetrics();buildTabBadges();_updateSidebarStats();
  // Populate tag filter if available (used by characters page)
  if(typeof _populateTagFilter==='function') _populateTagFilter();
  // Note: panel rendering is handled by _showDashboard per-page
}

function _showDashboard(){
  // Remove has-csv class (already handled flash) and show dashboard
  document.documentElement.classList.remove('has-csv');
  document.getElementById('upload-screen').style.display='none';
  document.getElementById('dashboard').style.display='block';

  const tab = window.__ACTIVE_TAB__ || 'home';

  // Activate the panel for this page immediately
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  const panel = document.getElementById('panel-'+tab);
  if(panel) panel.classList.add('active');

  // Load persistent data
  _loadTagOverrides();
  loadAlbum();

  // Init sidebar indicator (after DOM is ready)
  requestAnimationFrame(()=>{ _initSidebarIndicator(); _updateSidebarLabels(); applyI18n(); });

  // buildAll sets up data + metrics/badges, then we render the active section
  buildAll();
  // Ensure badges are always visible regardless of page
  requestAnimationFrame(buildTabBadges);

  // Render the section for this specific page (chunk functions are already loaded)
  _updateSidebarStats();
  _updateSidebarThemeLang();

  // Page-specific rendering
  const _pageRender = {
    characters: ()=>typeof renderChars    ==='function' && renderChars(),
    albums:     ()=>typeof renderAlbum    ==='function' && renderAlbum(),
    series:     ()=>typeof renderSeries   ==='function' && renderSeries(),
    frames:     ()=>typeof renderFrames   ==='function' && renderFrames(),
    workers:    ()=>typeof renderWorkers  ==='function' && renderWorkers(),
    tags:       ()=>typeof renderTags     ==='function' && renderTags(),
    stats:      ()=>typeof buildCharts    ==='function' && setTimeout(buildCharts, 100),
    sketches:   ()=>typeof renderSketchGallery==='function' && renderSketchGallery(),
    home:       ()=>typeof buildHomePanel ==='function' && buildHomePanel(),
  };
  _pageRender[tab]?.();

  // Suggestions can be async
  if(typeof populateSuggestions==='function') setTimeout(populateSuggestions, 200);
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
    characters: ALL.length,
    albums:     albumBooks.length,
    series:     new Set(ALL.map(c=>c.series)).size,
    frames:     new Set(ALL.map(c=>c.frame).filter(Boolean)).size,
    workers:    ALL.length,
    tags:       new Set(ALL.map(c=>c.tag||'')).size,
    stats:      '—',
    // Legacy tab bar (if still present)
    personajes:ALL.length,
    albumes:albumBooks.length,
    marcos:new Set(ALL.map(c=>c.frame).filter(Boolean)).size,
  };

  // Sketches: async count from IDB
  _loadSketches().then(sketches=>{
    const el=document.getElementById('badge-sketches');
    if(el&&sketches.length) el.textContent=sketches.length;
  }).catch(()=>{});

  // Update sidebar nav badges
  document.querySelectorAll('.sidebar-nav-item[data-tab]').forEach(el=>{
    const tab=el.dataset.tab, n=bd[tab];
    if(n===undefined) return;
    const badge=el.querySelector('.sidebar-nav-badge');
    if(badge) badge.textContent = typeof n==='number' ? n.toLocaleString('es') : n;
  });

  // Update legacy tab bar badges if present
  document.querySelectorAll('#tabsBar .tab-btn').forEach(btn=>{
    const tab=btn.dataset.tab, n=bd[tab];
    if(n!==undefined){
      btn.innerHTML=btn.innerHTML.replace(/<span.*<\/span>/,'');
      btn.innerHTML+=` <span class="badge">${n}</span>`;
    }
  });
}

/* ── Sidebar sliding indicator ── */
function _initSidebarIndicator(){
  const nav  = document.getElementById('sidebarNav');
  const ind  = document.getElementById('sidebarIndicator');
  if(!nav||!ind) return;

  function _moveIndicator(item, animate){
    if(!item){ ind.classList.remove('visible'); return; }
    const navRect  = nav.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const top = itemRect.top - navRect.top + nav.scrollTop;
    if(!animate) ind.style.transition='none';
    ind.style.transform = `translateY(${top}px)`;
    ind.style.height    = `${itemRect.height}px`;
    ind.classList.add('visible');
    if(!animate) requestAnimationFrame(()=>{ ind.style.transition=''; });
  }

  // Position on load (no animation)
  const active = nav.querySelector('.sidebar-nav-item.active');
  _moveIndicator(active, false);

  // Animate on hover
  nav.addEventListener('mouseover', e=>{
    const item = e.target.closest('.sidebar-nav-item');
    if(item) _moveIndicator(item, true);
  });
  nav.addEventListener('mouseleave', ()=>{
    const active = nav.querySelector('.sidebar-nav-item.active');
    _moveIndicator(active, true);
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
  return `<div class="char-card${_charSelMode?' sel-mode':''}${_isSel?' selected':''}${cardEffectClass(c.code)}" data-code="${safeCode}" onclick="if(!charSelToggleCard('${safeCode}',this)){${onclick||`openCardModal('${safeCode}')`}}">
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

// ── RENDER CACHE: avoid rebuilding DOM when filters haven't changed ──
let _lastFilterKey = '';
let _lastCharHTML  = '';

let _charsHasMore=false;
let _charsScrollObs=null;




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


// Apply custom images to a specific DOM element (not full re-render)







// ── Controls ──









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







// ── Card Picker ──
let _cpTarget = null; // {bi, ri, si}





// Keyboard search in picker
document.addEventListener('keydown', e=>{
  if(!document.getElementById('cardPickerOverlay')?.classList.contains('hidden')) return;
  if(e.key==='Escape') closeCardPicker();
});

// Legacy stubs (keep buildTabBadges working)
function importAllToAlbum(){}
function clearAlbum(){}
function addAlbumCard(){}
function previewSlug(){}
function delAlbum(){}
function openAlbumModal(){ /* legacy stub */ }

/* ══════════════════════════════════════════
   ALBUM EXPORT
══════════════════════════════════════════ */
let _exportCanvas = null;
let _exportFilename = '';




// Close on backdrop click
document.addEventListener('click', e=>{
  if(e.target.id==='albPreviewOverlay') albPreviewCancel();
});

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

/* ── WORKERS ── */

/* ── TAGS ── */
let _tagSelectMode=false;
const _tagSelected=new Set();
function _tagCardKey(c){return c.code||(c.character+'|'+c.edition);}

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
  _modalCard=c;_modalEd=c.edition||'1';_modalFrameOn=false;_modalCustomImg=null;_modalEditMode=false;
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
  closeCardZoom();
}
function maybeCloseModal(e){if(e.target===document.getElementById('modalOverlay'))closeModal();}
function modalSetEd(n){
  _modalEd=String(n);
  const key=_modalCard.code||(_modalCard.character+'|'+String(n));
  _loadCustomImgAsync(key).then(img=>{_modalCustomImg=img;_renderModal();});
}
/* ── CARD HOLOGRAPHIC EFFECTS ─────────────────────────────────────── */
const CARD_EFFECTS = [
  { id:'none',     name:'Sin efecto',    icon:'○' },
  { id:'holo',     name:'Holo',          icon:'✨' },
  { id:'reverse',  name:'Reverse Holo',  icon:'🔄' },
  { id:'cosmos',   name:'Cosmos',        icon:'🌌' },
  { id:'vmax',     name:'VMAX',          icon:'⚡' },
  { id:'rainbow',  name:'Rainbow Rare',  icon:'🌈' },
  { id:'secret',   name:'Secret Rare',   icon:'💎' },
  { id:'gold',     name:'Gold',          icon:'🥇' },
  { id:'illust',   name:'Illustration Rare',          icon:'🖼️' },
  { id:'sir',      name:'Special Illustration Rare',  icon:'🎨' },
  { id:'shiny',    name:'Shiny',         icon:'💠' },
  { id:'acespec',  name:'ACE SPEC',      icon:'♠️' },
];

function _getCardEffects(){
  try{ return JSON.parse(localStorage.getItem('karutaCardEffects')||'{}'); }catch(e){ return {}; }
}
function _setCardEffects(obj){
  try{ localStorage.setItem('karutaCardEffects', JSON.stringify(obj)); }catch(e){}
}
function getCardEffect(code){
  if(!code) return 'none';
  const m=_getCardEffects();
  return m[code]||'none';
}
function setCardEffect(code, effectId){
  if(!code) return;
  const m=_getCardEffects();
  if(effectId==='none') delete m[code];
  else m[code]=effectId;
  _setCardEffects(m);
  // Refresh any visible thumbnails/slots for this card across the app
  document.querySelectorAll(`[data-code="${CSS.escape(code)}"]`).forEach(el=>{
    el.classList.remove(...CARD_EFFECTS.map(e=>'fx-'+e.id));
    if(effectId!=='none') el.classList.add('fx-'+effectId);
  });
}
function cardEffectClass(code){
  const fx=getCardEffect(code);
  return fx!=='none' ? ' fx-'+fx : '';
}

function modalToggleFrame(){_modalFrameOn=!_modalFrameOn;_renderModal();}

function modalCopyCode(){
  const code=_modalCard?.code;
  if(!code) return;
  navigator.clipboard.writeText(code).catch(()=>{});
  const lbl=document.getElementById('mcCopyLabel');
  if(lbl){lbl.textContent='✅ Copiado!';setTimeout(()=>{lbl.textContent='Copiar código';},1500);}
}

async function modalDeleteCard(){
  const c=_modalCard; if(!c) return;
  const ok=await dlgConfirm(
    `Se eliminará <strong>${esc(c.character)}</strong> de tu sesión.`,
    {icon:'🗑',title:'Borrar carta',type:'danger',okText:'Borrar',cancelText:'Cancelar'}
  );
  if(!ok) return;
  ALL=ALL.filter(x=>x!==c);
  try{
    const h=Object.keys(ALL[0]||{});
    if(h.length){
      const csv=[h.join(','),...ALL.map(r=>h.map(k=>`"${(r[k]||'').replace(/"/g,'""')}"`).join(','))].join('\n');
      localStorage.setItem('karutaCSV',csv);
    }
  }catch(e){}
  buildTabBadges();_updateSidebarStats();
  // Move to next card or close
  if(_modalList.length>1){
    _modalList=_modalList.filter(x=>x!==c);
    _modalIdx=Math.min(_modalIdx,_modalList.length-1);
    const next=_modalList[_modalIdx];
    _modalCard=next;_modalEd=next.edition||'1';_modalFrameOn=false;_modalCustomImg=null;_modalEditMode=false;
    _loadCustomImgAsync(next.code||(next.character+'|'+_modalEd)).then(img=>{_modalCustomImg=img;_renderModal();_updateSwipeBtns();});
  } else {
    closeModal();
  }
  if(typeof renderChars==='function') renderChars();
}

function modalToggleEdit(){
  _modalEditMode=!_modalEditMode;
  _renderModal();
}

function modalSaveEdits(){
  const c=_modalCard; if(!c) return;
  const qual=document.getElementById('meQual')?.value;
  const burn=document.getElementById('meBurn')?.value;
  const wl=document.getElementById('meWl')?.value;
  const tag=(document.getElementById('meTag')?.value||'').trim();
  if(qual!==undefined) c.quality=qual;
  if(burn!==undefined) c.burnValue=String(+burn||0);
  if(wl!==undefined) c.wishlists=String(+wl||0);
  c.tag=tag;
  // Persist tag override
  _persistTagChanges();
  // Persist CSV
  try{
    const h=Object.keys(ALL[0]||{});
    if(h.length){
      const csv=[h.join(','),...ALL.map(r=>h.map(k=>`"${(r[k]||'').replace(/"/g,'""')}"`).join(','))].join('\n');
      localStorage.setItem('karutaCSV',csv);
    }
  }catch(e){}
  _modalEditMode=false;
  _renderModal();
  if(typeof renderChars==='function') renderChars();
  buildTabBadges();
}
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
let _modalEditMode = false;

function _renderModal(){
  const c=_modalCard,q=c.quality||'0';
  const slug=toSlug(c.character),ed=_modalEd;
  const hasFrame=!!(c.frame&&c.frame.trim());
  const frameOverlay=hasFrame&&_modalFrameOn?frameOverlayUrl(c.frame):null;
  const imgUrl=_modalCustomImg||(CDN+slug+'-'+ed+'.jpg');
  const edBtns=Array.from({length:7},(_,i)=>i+1).map(n=>'<button class="modal-ed-btn'+(String(n)===String(ed)&&!_modalCustomImg?' active':'')+'" onclick="modalSetEd('+n+')">'+ n+'</button>').join('');
  const currentFx = getCardEffect(c.code);

  // ── Card side ──
  document.getElementById('modalCardSide').innerHTML=
    '<div class="modal-card-viewer fx-'+currentFx+'" id="mcViewer" style="--cardimg:url(\''+imgUrl+'\')">'+
      '<div class="modal-card-img-wrap" id="mci">'+
        '<div class="modal-card-bg" id="mcbg" style="background-image:url(\''+imgUrl+'\')"></div>'+
        (frameOverlay?'<img class="modal-card-frame-canvas" id="mcframe" src="'+frameOverlay+'" alt="" onerror="this.style.display=\'none\'">':'')+
        '<div class="modal-card-placeholder" id="mcph" style="display:none">🎴</div>'+
        '<div class="modal-fx-shine"></div>'+
        '<div class="modal-fx-glare"></div>'+
        '<button class="modal-zoom-btn" onclick="event.stopPropagation();openCardZoom()" title="Ampliar">'+
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>'+
        '</button>'+
      '</div>'+
    '</div>'+
    '<div class="modal-ed-btns">'+edBtns+'</div>'+
    '<div class="modal-fx-picker" id="mcFxPicker">'+
      CARD_EFFECTS.map(fx=>`<button class="modal-fx-chip${fx.id===currentFx?' active':''}" onclick="modalSetEffect('${fx.id}')" title="${esc(fx.name)}"><span>${fx.icon}</span>${esc(fx.name)}</button>`).join('')+
    '</div>'+
    '<div class="modal-drop-zone" id="mcDropZone" onclick="document.getElementById(&quot;mcFileIn&quot;).click()" ondragover="event.preventDefault();this.classList.add(&quot;drag-over&quot;)" ondragleave="this.classList.remove(&quot;drag-over&quot;)" ondrop="handleModalDrop(event)">'+
      '<input type="file" id="mcFileIn" accept="image/*" style="display:none" onchange="handleModalFile(this.files[0])">'+
      '<span class="dz-icon">🖼️</span>Arrastra una imagen o pega del portapapeles<small>Click para abrir archivos</small>'+
    '</div>'+
    (_modalCustomImg?'<button onclick="modalClearCustomImg()" style="font-size:11px;color:var(--text3);background:none;border:none;cursor:pointer;text-decoration:underline;margin-top:4px">↩ Restablecer imagen CDN</button>':'')+
    '<div class="modal-swipe-btns"><button class="modal-swipe-btn" id="msPrev" onclick="modalSwipe(-1)">◄</button><span style="font-size:11px;color:var(--text3);align-self:center" id="msPos"></span><button class="modal-swipe-btn" id="msNext" onclick="modalSwipe(1)">►</button></div>'+
    '<div class="modal-action-row">'+
      '<button class="modal-action-btn" onclick="modalCopyCode()" title="Copiar código">'+
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'+
        '<span id="mcCopyLabel">Copiar código</span>'+
      '</button>'+
      '<button class="modal-action-btn modal-action-danger" onclick="modalDeleteCard()" title="Borrar carta">'+
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>'+
        'Borrar carta'+
      '</button>'+
      '<button class="modal-action-btn'+(_modalEditMode?' modal-action-active':'')+'" id="mcEditToggle" onclick="modalToggleEdit()" title="Editar campos">'+
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'+
        (_modalEditMode?'Cancelar':'Editar')+
      '</button>'+
      (_modalEditMode?'<button class="modal-action-btn modal-action-save" onclick="modalSaveEdits()" title="Guardar cambios"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Guardar</button>':'')+
    '</div>';

  setTimeout(()=>{
    const bg=document.getElementById('mcbg');
    if(bg){const ti=new Image();ti.onerror=()=>{const fb=_modalCustomImg?null:(CDN+slug+'-1.jpg');if(fb&&imgUrl!==fb){bg.style.backgroundImage="url('"+fb+"')";}else{bg.style.display='none';const ph=document.getElementById('mcph');if(ph)ph.style.display='flex';}};ti.src=imgUrl;}
  },50);

  // ── Info side ──
  const _row=(key,valHtml)=>`<div class="modal-stat-row"><span class="modal-stat-key">${key}</span><span class="modal-stat-val">${valHtml}</span></div>`;
  const _input=(id,val,type='text',extra='')=>`<input id="${id}" class="modal-edit-input" type="${type}" value="${esc(String(val||''))}" ${extra}>`;
  const _select=(id,opts,cur)=>`<select id="${id}" class="modal-edit-input">${opts.map(([v,l])=>`<option value="${v}"${v===cur?' selected':''}>${l}</option>`).join('')}</select>`;

  const em = _modalEditMode;
  const rows=[
    _row('Calidad',     em ? _select('meQual',   [['0','— Sin ★'],['1','★'],['2','★★'],['3','★★★'],['4','★★★★']], q) : (QL[q]||q+'★')),
    _row('Edición',     'Ed.'+(c.edition||'?')),
    _row('Print #',     c.number||'—'),
    _row('Burn value',  em ? `🔥 ${_input('meBurn', +c.burnValue||0, 'number', 'min="0" style="width:80px"')}` : '🔥 '+(+c.burnValue||0).toLocaleString()),
    _row('Wishlists',   em ? _input('meWl',  c.wishlists||'0', 'number', 'min="0" style="width:80px"') : (c.wishlists||'0')),
    _row('Marco',       c.frame ? (FRAME_NAME[c.frame]||c.frame) : '(sin marco)'),
    _row('Morphed',     c.morphed==='Yes'?'✨ Sí':'No'),
    _row('Trimmed',     c.trimmed==='Yes'?'✂ Sí':'No'),
    _row('Tag',         em ? _input('meTag', c.tag||'', 'text', 'maxlength="30" style="width:120px"') : (c.tag||'—')),
    _row('Worker effort', c['worker.effort']||'—'),
    _row('Código',      `<span style="font-family:monospace;font-size:12px">${esc(c.code||'—')}</span>`),
  ].join('');

  document.getElementById('modalInfoSide').innerHTML=
    `<button class="modal-close" onclick="closeModal()">✕</button>`+
    `<div style="font-size:11px;color:var(--text3);letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">${esc(c.series||'—')}</div>`+
    `<div class="modal-char-name">${esc(c.character)}</div>`+
    `<div style="margin-bottom:1.25rem"><span class="card-q-badge ${QB[q]||'bq0'}" style="position:static;display:inline-block">${QL[q]||q+'★'}</span></div>`+
    `<div class="modal-stats">${rows}</div>`;
}

function modalSetEffect(effectId){
  const c=_modalCard; if(!c||!c.code) return;
  setCardEffect(c.code, effectId);
  const viewer=document.getElementById('mcViewer');
  if(viewer){
    viewer.classList.remove(...CARD_EFFECTS.map(e=>'fx-'+e.id));
    viewer.classList.add('fx-'+effectId);
  }
  document.querySelectorAll('#mcFxPicker .modal-fx-chip').forEach(chip=>chip.classList.remove('active'));
  const btn=[...document.querySelectorAll('#mcFxPicker .modal-fx-chip')].find(b=>b.getAttribute('onclick')?.includes(`'${effectId}'`));
  if(btn) btn.classList.add('active');
  if(typeof renderChars==='function') renderChars();
}

/* ── 3D TILT (mouse + gyroscope) ── only active inside the zoom view ── */
let _tiltActive=false, _tiltRAF=null, _tiltTargetEl=null, _tiltZoomMode=false;
let _tiltRX=0, _tiltRY=0, _tiltPX=50, _tiltPY=50;
let _gyroHandler=null;

function openCardZoom(){
  const c=_modalCard; if(!c) return;
  const currentFx=getCardEffect(c.code);
  const slug=toSlug(c.character),ed=_modalEd;
  const imgUrl=_modalCustomImg||(CDN+slug+'-'+ed+'.jpg');
  const hasFrame=!!(c.frame&&c.frame.trim());
  const frameOverlay=hasFrame&&_modalFrameOn?frameOverlayUrl(c.frame):null;

  const ov=document.createElement('div');
  ov.id='cardZoomOverlay';
  ov.className='card-zoom-overlay';
  ov.onclick=e=>{ if(e.target===ov) closeCardZoom(); };
  ov.innerHTML=
    '<button class="card-zoom-close" onclick="closeCardZoom()">✕</button>'+
    '<div class="modal-card-viewer fx-'+currentFx+'" id="zoomViewer" style="--cardimg:url(\''+imgUrl+'\')">'+
      '<div class="modal-card-img-wrap" id="zoomImgWrap">'+
        '<div class="modal-card-bg" id="zoomBg" style="background-image:url(\''+imgUrl+'\')"></div>'+
        (frameOverlay?'<img class="modal-card-frame-canvas" src="'+frameOverlay+'" alt="" onerror="this.style.display=\'none\'">':'')+
        '<div class="modal-fx-shine"></div>'+
        '<div class="modal-fx-glare"></div>'+
      '</div>'+
    '</div>'+
    '<div class="card-zoom-hint">Mueve el ratón o el dispositivo para rotar</div>';
  document.body.appendChild(ov);
  requestAnimationFrame(()=>ov.classList.add('visible'));
  _initCardTilt('zoomViewer', true);
}

function closeCardZoom(){
  const ov=document.getElementById('cardZoomOverlay');
  if(!ov){ return; }
  ov.classList.remove('visible');
  _stopCardTilt();
  setTimeout(()=>ov.remove(),200);
}

function _initCardTilt(targetId, zoomMode){
  const viewer=document.getElementById(targetId||'mcViewer');
  if(!viewer) return;
  _tiltTargetEl=viewer;
  _tiltZoomMode=!!zoomMode;
  if(_tiltActive) return;
  _tiltActive=true;

  const onMove=(clientX, clientY)=>{
    if(!_tiltTargetEl) return;
    const rect=_tiltTargetEl.getBoundingClientRect();
    if(rect.width===0) return;
    const px=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width));
    const py=Math.max(0,Math.min(1,(clientY-rect.top)/rect.height));
    _tiltPX=px*100; _tiltPY=py*100;
    _tiltRY=(px-0.5)*22;
    _tiltRX=(0.5-py)*22;
    _scheduleTiltApply();
  };
  const onLeave=()=>{
    _tiltRX=0; _tiltRY=0; _tiltPX=50; _tiltPY=50;
    _scheduleTiltApply();
  };

  document.addEventListener('mousemove', _tiltMouseHandler=e=>{
    if(!_tiltTargetEl||!document.body.contains(_tiltTargetEl)) return;
    onMove(e.clientX, e.clientY);
  });
  _tiltTargetEl.parentElement?.addEventListener('mouseleave', onLeave);

  document.addEventListener('touchmove', _tiltTouchHandler=e=>{
    if(!_tiltTargetEl||!document.body.contains(_tiltTargetEl)) return;
    const t=e.touches[0]; if(!t) return;
    onMove(t.clientX, t.clientY);
  }, {passive:true});

  // Gyroscope — only meaningful on mobile, only while zoom is open
  if(window.DeviceOrientationEvent){
    _gyroHandler=e=>{
      if(!_tiltTargetEl||!document.body.contains(_tiltTargetEl)) return;
      const beta = e.beta||0;
      const gamma = e.gamma||0;
      _tiltRX = Math.max(-22, Math.min(22, beta-45));
      _tiltRY = Math.max(-22, Math.min(22, gamma));
      _tiltPX = 50 + (gamma/90)*50;
      _tiltPY = 50 + ((beta-45)/45)*50;
      _scheduleTiltApply();
    };
    if(typeof DeviceOrientationEvent.requestPermission==='function'){
      _tiltTargetEl.addEventListener('click', function _reqPerm(){
        DeviceOrientationEvent.requestPermission().then(state=>{
          if(state==='granted') window.addEventListener('deviceorientation', _gyroHandler);
        }).catch(()=>{});
        this.removeEventListener('click', _reqPerm);
      }, {once:true});
    } else {
      window.addEventListener('deviceorientation', _gyroHandler);
    }
  }
}

function _stopCardTilt(){
  _tiltActive=false;
  _tiltTargetEl=null;
  _tiltRX=0; _tiltRY=0; _tiltPX=50; _tiltPY=50;
  if(_tiltMouseHandler) document.removeEventListener('mousemove', _tiltMouseHandler);
  if(_tiltTouchHandler) document.removeEventListener('touchmove', _tiltTouchHandler);
  if(_gyroHandler) window.removeEventListener('deviceorientation', _gyroHandler);
  _tiltMouseHandler=null; _tiltTouchHandler=null; _gyroHandler=null;
  // Reset the normal modal viewer transform too
  const v=document.getElementById('mcViewer');
  if(v){ v.style.setProperty('--rx','0deg'); v.style.setProperty('--ry','0deg'); v.style.setProperty('--px','50%'); v.style.setProperty('--py','50%'); }
}
let _tiltMouseHandler=null, _tiltTouchHandler=null;

function _scheduleTiltApply(){
  if(_tiltRAF) return;
  _tiltRAF=requestAnimationFrame(()=>{
    _tiltRAF=null;
    if(!_tiltTargetEl) return;
    _tiltTargetEl.style.setProperty('--rx', _tiltRX.toFixed(2)+'deg');
    _tiltTargetEl.style.setProperty('--ry', _tiltRY.toFixed(2)+'deg');
    _tiltTargetEl.style.setProperty('--px', _tiltPX.toFixed(1)+'%');
    _tiltTargetEl.style.setProperty('--py', _tiltPY.toFixed(1)+'%');
  });
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
  if(document.getElementById('cardZoomOverlay')){
    if(e.key==='Escape') closeCardZoom();
    return;
  }
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

// Cambiar CSV: solo borra karutaCSV y vuelve al upload screen
function changeCSV(){
  try{ localStorage.removeItem('karutaCSV'); }catch(e){}
  try{ destroyCharts(); }catch(e){}
  ALL = [];
  charsPage = 40; seriesPage = 50; workersPage = 40;
  window.location.href = (window.__KWM_BASE__||'') + '/';
}

async function deleteSelectedCards(source){
  // Get selected codes from the right source
  const selectedCodes = source === 'tags'
    ? new Set([...ALL.filter(c => _tagSelected.has(_tagCardKey(c))).map(c => c.code).filter(Boolean)])
    : new Set(_charSelSet);

  if(!selectedCodes.size){
    await dlgAlert(t('selectOneDlg'), {icon:'🃏', title:t('noSelectionDlg')});
    return;
  }

  const confirmed = await dlgConfirm(
    `Se eliminarán <strong>${selectedCodes.size} carta${selectedCodes.size!==1?'s':''}</strong> de tu sesión. No se modificará el CSV original.`,
    {icon:'🗑', title: t('deleteSelected'), type:'danger', okText: t('deleteSelected'), cancelText: t('cancel')}
  );
  if(!confirmed) return;

  // Remove from ALL
  ALL = ALL.filter(c => !selectedCodes.has(c.code));

  // Persist updated CSV to localStorage
  try{
    const headers = Object.keys(ALL[0]||{});
    if(headers.length){
      const csvContent = [
        headers.join(','),
        ...ALL.map(c => headers.map(h => `"${(c[h]||'').replace(/"/g,'""')}"`).join(','))
      ].join('\n');
      localStorage.setItem('karutaCSV', csvContent);
    }
  }catch(e){}

  // Clear selection state
  _charSelSet.clear();
  _tagSelected.clear();

  // Re-render
  buildTabBadges();
  _updateSidebarStats();
  if(source === 'tags'){
    if(typeof renderTags === 'function') renderTags();
  } else {
    if(typeof renderChars === 'function') renderChars();
    // Exit selection mode
    _charSelMode = false;
    const btn = document.getElementById('charSelectToggle');
    const bar = document.getElementById('charSelBar');
    if(btn){ btn.textContent = t('select'); btn.style.borderColor=''; btn.style.color=''; }
    if(bar) bar.classList.add('hidden');
  }
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

  window.location.href = (window.__KWM_BASE__||'') + '/';
}

// Keep resetApp as alias for backward compat
function resetApp(){ changeCSV(); }

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



function _getUserId(){
  const counts={};
  ALL.forEach(c=>{ if(c.grabber) counts[c.grabber]=(counts[c.grabber]||0)+1; });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
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
  document.getElementById('gsearchResults').innerHTML=`<div class="gsearch-empty" id="gsearchEmptyMsg">${t('gsearchHint')}</div>`;
  requestAnimationFrame(()=>inp.focus());
}

function closeGSearch(){
  document.getElementById('gsearchOverlay').classList.add('hidden');
  _gsResults=[];_gsIdx=-1;
}

function runGSearch(q){
  const sq=(q||'').toLowerCase().trim();
  if(!sq){
    document.getElementById('gsearchResults').innerHTML=`<div class="gsearch-empty" id="gsearchEmptyMsg">${t('gsearchHint')}</div>`;
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
    document.getElementById('gsearchResults').innerHTML=`<div class="gsearch-empty">${t('gsearchNoResults')} "<strong>${esc(q)}</strong>"</div>`;
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



// ── VIBRANCE BOOST (professional sketch color engine) ────
// Amplifies already-saturated colors while leaving neutrals/skin tones intact.
// Unlike plain saturation boost, vibrance is self-regulating:
// - Neutral gray (sat=0) → no change
// - Slightly saturated (sat=0.2) → ×1.6 boost
// - Fully saturated (sat=1.0) → ×4.0 boost
// Result: deep vivid hair/eye colors without clipping skin or whites


// Reduces color noise before quantization — keeps edges, removes speckles

// ── POST-QUANTIZE CLEANUP (remove isolated colored pixels) ──
// pixels with 0 colored neighbors are noise — remove them



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
  es:{
    // Nav
    home:'Inicio',characters:'Personajes',albums:'Álbumes',series:'Series',
    frames:'Marcos',workers:'Workers',tags:'Tags',stats:'Stats',
    sketches:'Sketches',rescaler:'Rescalador',
    // Sidebar footer
    theme:'Tema',language:'Idioma',data:'Datos',changeCSV:'Cambiar CSV',
    // Common
    search:'Buscar',clear:'Limpiar',cancel:'Cancelar',confirm:'Confirmar',
    noResults:'Sin resultados.',loading:'Cargando…',
    cards:'cartas',card:'carta',selected:'seleccionada',selectedPl:'seleccionadas',
    noSelection:'Sin selección',
    // Characters
    searchPlaceholder:'Buscar personaje, serie o código…',
    allQualities:'Todas las calidades',
    allPrints:'Todos los prints',allEditions:'Todas las ediciones',
    allOrigins:'Todos los orígenes',allTags:'Todos los tags',
    morphedAll:'Morphed: todos',framesAll:'Marcos: todos',
    newest:'Más recientes',highestBurn:'Mayor burn',mostWished:'Más pedidas',
    nameAZ:'Nombre A–Z',byEdition:'Edición',printAsc:'Print ↑',printDesc:'Print ↓',byEffort:'Effort',
    moreFilters:'▼ Más filtros',lessFilters:'▲ Menos filtros',
    grabOwn:'Grabadas por mí',grabOther:'Recibidas',
    select:'☑ Seleccionar',cancelSelect:'✕ Cancelar selección',
    selectAll:'Seleccionar todas',deselect:'Deseleccionar',
    copyIDs:'Copiar IDs',copied:'copiados',
    // Albums
    newAlbum:'+ Nuevo álbum',newPage:'+ Nueva página',
    background:'Fondo',change:'Cambiar',pasteURL:'o pegar URL…',
    // Series
    searchSeries:'Buscar serie…',mostCards:'Más cartas',nameAZSort:'Nombre A–Z',
    moreSeries:'Ver más series',
    searchInSeries:'Buscar personaje…',
    allQualitiesSeries:'Todas las calidades',allPrintsSeries:'Todos los prints',
    recentSort:'Recientes',
    // Workers
    searchWorker:'Buscar personaje…',allWorkers:'Todos',
    highEffort:'Alto esfuerzo (≥80)',midEffort:'Esfuerzo medio (40–79)',lowEffort:'Esfuerzo bajo (<40)',
    highestEffort:'Mayor esfuerzo',purityFirst:'Purity S primero',
    quickFirst:'Quickness S primero',
    moreWorkers:'Ver más workers',
    accumulatedEffort:'Esfuerzo acumulado',
    // Tags
    tagManager:'Gestor de Tags',selectCards:'✦ Seleccionar cartas',cancelTagSelect:'✕ Cancelar selección',
    tagHint:'Cartas agrupadas por tag. Activa la selección para gestionar tags.',
    tagSelectHint:'Haz clic en las cartas para seleccionarlas.',
    tagPlaceholder:'tag (ej: favs)',
    copyCommand:'Copiar comando',saveHere:'Guardar aquí',removeTag:'Quitar tag',
    selectVisible:'Seleccionar visibles',
    // Home
    collection:'Colección de Karuta',
    totalCards:'Total cartas',uniqueSeries:'Series únicas',totalBurn:'Burn total',
    morphed:'Morphed',withFrame:'Con marco',
    qualityDist:'Distribución de calidad',topSeries:'Series más representadas',
    recentCards:'Últimas cartas obtenidas',
    // Stats chart titles
    printByQuality:'Print mediana por calidad',ownGrabs:'solo grabs propios',
    wlVsPrint:'WL promedio → print promedio',correlation:'correlación',
    q4RateMonthly:'Tasa ★★★★ mensual vs total grabs',
    grabsByWeekday:'Grabs por día de la semana',
    activeHour:'Hora del día más activa',
    topSeriesByPrint:'Top series por print mediana',minGrabs:'mín. 5 grabs — menor = mejor suerte',
    qualityDist2:'Distribución calidad',cardsByEdition:'Cartas por edición',
    printDist:'Distribución de prints (rangos)',purityGrades:'Purity grades (workers)',
    monthlyActivity:'Actividad mensual de grabs',
    cumulativeCollection:'Colección acumulada (grabs propios)',
    effortByTag:'Worker effort por tag',
    q4ByEdition:'★★★★ grabadas por edición',
    // Rescaler
    rescalerTitle:'Rescalador de imágenes',
    rescalerDesc:'Redimensiona cualquier imagen al tamaño exacto que necesites.',
    dropImage:'Arrastra una imagen o haz clic',
    quickPresets:'Presets rápidos',dimensions:'Dimensiones',
    width:'Ancho (px)',height:'Alto (px)',
    scaleQuality:'Calidad de escalado',
    highQuality:'Alta (suavizado bicúbico)',medQuality:'Media',pixelated:'Pixelado (pixel art)',
    exportFormat:'Formato de exportación',
    rescaleDownload:'Rescalar y descargar',noImage:'Sin imagen cargada',
    // Sketches
    sketchTitle:'Convertidor de Sketches',
    sketchDesc:'Genera un sketch por capas listo para pintar en el Studio.',
    availableInk:'Ink disponible',inkHint:'Cada píxel pintado consume 1 de tinta.',
    canvasRes:'Resolución del canvas',
    canvasHint:'Tamaño real del canvas del Studio',
    colorMode:'Modo de color',
    fullColor:'Color completo (52 colores)',proSketch:'Sketch profesional',
    grayscale:'Escala de grises',limitedPalette:'Paleta limitada (ahorra ink)',
    genMode:'Modo de generación',
    byLayers:'Por capas (recomendado)',flatImage:'Imagen plana (sin capas)',
    layersHint:'Las capas dividen el sketch por tipo: base → sombras → contornos → brillos.',
    noiseCleaning:'Limpieza de ruido',
    maxClean:'Máxima limpieza (recomendado)',onlySmooth:'Solo suavizado previo',
    onlyIsolated:'Solo eliminar píxeles aislados',noClean:'Sin limpieza (más detalle)',
    noiseHint:'Elimina píxeles sueltos y suaviza transiciones de color antes de cuantizar.',
    generateSketch:'Generar sketch',
    exportFinal:'Exportar imagen final',exportLayers:'Exportar capas (.zip)',
    saveGallery:'Guardar en galería',
    generatedLayers:'Capas generadas',
    palette:'Paleta (52 colores del Studio) — clic para copiar',
    gallery:'Galería guardada',noSketches:'No hay sketches guardados aún.',
    // Dialogs
    tagRequired:'Tag requerido',writeTagFirst:'Escribe un tag primero.',
    noSelectionDlg:'Sin selección',selectOneDlg:'Selecciona al menos una carta.',
    noCode:'Sin código',noCodeDlg:'Las cartas seleccionadas no tienen código.',
    removeTagConfirm:'Quitar tag',remove:'Quitar',
    // Data
    exportBackup:'Exportar backup',importBackup:'Importar backup',deleteAll:'Borrar todo',deleteSelected:'Borrar selección',
    days:'días',
    searchCardsPlaceholder:'Buscar cartas…',gsearchPlaceholder:'Buscar por nombre, serie, código o tag…',gsearchHint:'Escribe para buscar en tu colección',gsearchNoResults:'Sin resultados para',selectCardTitle:'Seleccionar carta',cpSearchPlaceholder:'Buscar por nombre o código…',albumPreview:'Previsualización',download:'⬇ Descargar',downloadX4:'⬇ ×4',downloadOriginal:'⬇ Original',exportSketch:'⬇ Exportar sketch',exportOriginal:'Original (pixel-perfect)',exportUpscaled:'Ampliado ×4',
  },
  en:{
    home:'Home',characters:'Characters',albums:'Albums',series:'Series',
    frames:'Frames',workers:'Workers',tags:'Tags',stats:'Stats',
    sketches:'Sketches',rescaler:'Rescaler',
    theme:'Theme',language:'Language',data:'Data',changeCSV:'Change CSV',
    search:'Search',clear:'Clear',cancel:'Cancel',confirm:'Confirm',
    noResults:'No results.',loading:'Loading…',
    cards:'cards',card:'card',selected:'selected',selectedPl:'selected',
    noSelection:'No selection',
    searchPlaceholder:'Search character, series or code…',
    allQualities:'All qualities',
    allPrints:'All prints',allEditions:'All editions',
    allOrigins:'All origins',allTags:'All tags',
    morphedAll:'Morphed: all',framesAll:'Frames: all',
    newest:'Most recent',highestBurn:'Highest burn',mostWished:'Most wished',
    nameAZ:'Name A–Z',byEdition:'Edition',printAsc:'Print ↑',printDesc:'Print ↓',byEffort:'Effort',
    moreFilters:'▼ More filters',lessFilters:'▲ Less filters',
    grabOwn:'Grabbed by me',grabOther:'Received',
    select:'☑ Select',cancelSelect:'✕ Cancel selection',
    selectAll:'Select all',deselect:'Deselect',
    copyIDs:'Copy IDs',copied:'copied',
    newAlbum:'+ New album',newPage:'+ New page',
    background:'Background',change:'Change',pasteURL:'or paste URL…',
    searchSeries:'Search series…',mostCards:'Most cards',nameAZSort:'Name A–Z',
    moreSeries:'Show more series',
    searchInSeries:'Search character…',
    allQualitiesSeries:'All qualities',allPrintsSeries:'All prints',
    recentSort:'Recent',
    searchWorker:'Search character…',allWorkers:'All',
    highEffort:'High effort (≥80)',midEffort:'Mid effort (40–79)',lowEffort:'Low effort (<40)',
    highestEffort:'Highest effort',purityFirst:'Purity S first',
    quickFirst:'Quickness S first',
    moreWorkers:'Show more workers',
    accumulatedEffort:'Accumulated effort',
    tagManager:'Tag Manager',selectCards:'✦ Select cards',cancelTagSelect:'✕ Cancel selection',
    tagHint:'Cards grouped by tag. Enable selection to manage tags.',
    tagSelectHint:'Click on cards to select them.',
    tagPlaceholder:'tag (e.g. favs)',
    copyCommand:'Copy command',saveHere:'Save here',removeTag:'Remove tag',
    selectVisible:'Select visible',
    collection:'Karuta Collection',
    totalCards:'Total cards',uniqueSeries:'Unique series',totalBurn:'Total burn',
    morphed:'Morphed',withFrame:'With frame',
    qualityDist:'Quality distribution',topSeries:'Most represented series',
    recentCards:'Latest obtained cards',
    printByQuality:'Median print by quality',ownGrabs:'own grabs only',
    wlVsPrint:'Avg WL → avg print',correlation:'correlation',
    q4RateMonthly:'Monthly ★★★★ rate vs total grabs',
    grabsByWeekday:'Grabs by day of week',
    activeHour:'Most active hour',
    topSeriesByPrint:'Top series by median print',minGrabs:'min. 5 grabs — lower = better luck',
    qualityDist2:'Quality distribution',cardsByEdition:'Cards by edition',
    printDist:'Print distribution (ranges)',purityGrades:'Purity grades (workers)',
    monthlyActivity:'Monthly grab activity',
    cumulativeCollection:'Cumulative collection (own grabs)',
    effortByTag:'Worker effort by tag',
    q4ByEdition:'★★★★ grabbed by edition',
    rescalerTitle:'Image Rescaler',
    rescalerDesc:'Resize any image to the exact dimensions you need.',
    dropImage:'Drag an image or click',
    quickPresets:'Quick presets',dimensions:'Dimensions',
    width:'Width (px)',height:'Height (px)',
    scaleQuality:'Scale quality',
    highQuality:'High (bicubic smoothing)',medQuality:'Medium',pixelated:'Pixelated (pixel art)',
    exportFormat:'Export format',
    rescaleDownload:'Rescale and download',noImage:'No image loaded',
    sketchTitle:'Sketch Converter',
    sketchDesc:'Generate a layered sketch ready to paint in the Studio.',
    availableInk:'Available ink',inkHint:'Each painted pixel consumes 1 ink.',
    canvasRes:'Canvas resolution',
    canvasHint:'Actual Studio canvas size',
    colorMode:'Color mode',
    fullColor:'Full color (52 colors)',proSketch:'Professional sketch',
    grayscale:'Grayscale',limitedPalette:'Limited palette (saves ink)',
    genMode:'Generation mode',
    byLayers:'By layers (recommended)',flatImage:'Flat image (no layers)',
    layersHint:'Layers split the sketch by type: base → shadows → outlines → highlights.',
    noiseCleaning:'Noise cleaning',
    maxClean:'Maximum cleaning (recommended)',onlySmooth:'Smooth only',
    onlyIsolated:'Remove isolated pixels only',noClean:'No cleaning (more detail)',
    noiseHint:'Removes stray pixels and smooths color transitions before quantizing.',
    generateSketch:'Generate sketch',
    exportFinal:'Export final image',exportLayers:'Export layers (.zip)',
    saveGallery:'Save to gallery',
    generatedLayers:'Generated layers',
    palette:'Palette (52 Studio colors) — click to copy',
    gallery:'Saved gallery',noSketches:'No sketches saved yet.',
    tagRequired:'Tag required',writeTagFirst:'Write a tag first.',
    noSelectionDlg:'No selection',selectOneDlg:'Select at least one card.',
    noCode:'No code',noCodeDlg:'Selected cards have no code.',
    removeTagConfirm:'Remove tag',remove:'Remove',
    exportBackup:'Export backup',importBackup:'Import backup',deleteAll:'Delete all',deleteSelected:'Delete selection',
    days:'days',
    searchCardsPlaceholder:'Search cards…',gsearchPlaceholder:'Search by name, series, code or tag…',gsearchHint:'Type to search your collection',gsearchNoResults:'No results for',selectCardTitle:'Select card',cpSearchPlaceholder:'Search by name or code…',albumPreview:'Preview',download:'⬇ Download',downloadX4:'⬇ ×4',downloadOriginal:'⬇ Original',exportSketch:'⬇ Export sketch',exportOriginal:'Original (pixel-perfect)',exportUpscaled:'Upscaled ×4',
  },
  ja:{
    home:'ホーム',characters:'キャラ',albums:'アルバム',series:'シリーズ',
    frames:'フレーム',workers:'ワーカー',tags:'タグ',stats:'統計',
    sketches:'スケッチ',rescaler:'リサイズ',
    theme:'テーマ',language:'言語',data:'データ',changeCSV:'CSV変更',
    search:'検索',clear:'クリア',cancel:'キャンセル',confirm:'確認',
    noResults:'結果なし。',loading:'読込中…',
    cards:'枚',card:'枚',selected:'選択済み',selectedPl:'選択済み',
    noSelection:'未選択',
    searchPlaceholder:'キャラ・シリーズ・コードで検索…',
    allQualities:'全品質',
    allPrints:'全プリント',allEditions:'全エディション',
    allOrigins:'全オリジン',allTags:'全タグ',
    morphedAll:'モーフ: 全て',framesAll:'フレーム: 全て',
    newest:'最新順',highestBurn:'バーン高順',mostWished:'人気順',
    nameAZ:'名前 A–Z',byEdition:'エディション',printAsc:'プリント ↑',printDesc:'プリント ↓',byEffort:'努力度',
    moreFilters:'▼ 詳細フィルター',lessFilters:'▲ フィルターを隠す',
    grabOwn:'自分でグラブ',grabOther:'受け取り',
    select:'☑ 選択',cancelSelect:'✕ 選択キャンセル',
    selectAll:'全て選択',deselect:'選択解除',
    copyIDs:'IDコピー',copied:'コピー済み',
    newAlbum:'+ 新規アルバム',newPage:'+ 新規ページ',
    background:'背景',change:'変更',pasteURL:'またはURLを貼り付け…',
    searchSeries:'シリーズを検索…',mostCards:'カード数順',nameAZSort:'名前 A–Z',
    moreSeries:'もっと見る',
    searchInSeries:'キャラを検索…',
    allQualitiesSeries:'全品質',allPrintsSeries:'全プリント',
    recentSort:'最新順',
    searchWorker:'キャラを検索…',allWorkers:'全て',
    highEffort:'高努力 (≥80)',midEffort:'中努力 (40–79)',lowEffort:'低努力 (<40)',
    highestEffort:'努力度高順',purityFirst:'ピュリティS優先',
    quickFirst:'クイックネスS優先',
    moreWorkers:'もっと見る',
    accumulatedEffort:'累計努力度',
    tagManager:'タグ管理',selectCards:'✦ カード選択',cancelTagSelect:'✕ 選択キャンセル',
    tagHint:'タグ別カード。選択モードでタグを管理。',
    tagSelectHint:'カードをクリックして選択。',
    tagPlaceholder:'タグ (例: favs)',
    copyCommand:'コマンドコピー',saveHere:'ここに保存',removeTag:'タグ削除',
    selectVisible:'表示中を全選択',
    collection:'Karuta コレクション',
    totalCards:'総カード数',uniqueSeries:'ユニークシリーズ',totalBurn:'総バーン',
    morphed:'モーフ済み',withFrame:'フレームあり',
    qualityDist:'品質分布',topSeries:'上位シリーズ',
    recentCards:'最近取得したカード',
    printByQuality:'品質別中央プリント',ownGrabs:'自グラブのみ',
    wlVsPrint:'平均WL → 平均プリント',correlation:'相関',
    q4RateMonthly:'月別★★★★率',
    grabsByWeekday:'曜日別グラブ',
    activeHour:'最もアクティブな時間',
    topSeriesByPrint:'中央プリント上位シリーズ',minGrabs:'最低5グラブ',
    qualityDist2:'品質分布',cardsByEdition:'エディション別カード',
    printDist:'プリント分布',purityGrades:'ピュリティグレード',
    monthlyActivity:'月別グラブ活動',
    cumulativeCollection:'累計コレクション',
    effortByTag:'タグ別努力度',
    q4ByEdition:'エディション別★★★★',
    rescalerTitle:'画像リサイズ',
    rescalerDesc:'画像を正確なサイズにリサイズします。',
    dropImage:'画像をドラッグまたはクリック',
    quickPresets:'クイックプリセット',dimensions:'サイズ',
    width:'幅 (px)',height:'高さ (px)',
    scaleQuality:'スケール品質',
    highQuality:'高品質 (バイキュービック)',medQuality:'中品質',pixelated:'ピクセル (ピクセルアート)',
    exportFormat:'エクスポート形式',
    rescaleDownload:'リサイズしてダウンロード',noImage:'画像なし',
    sketchTitle:'スケッチコンバーター',
    sketchDesc:'Studio用レイヤースケッチを生成します。',
    availableInk:'利用可能インク',inkHint:'塗ったピクセルごとに1インク消費。',
    canvasRes:'キャンバス解像度',
    canvasHint:'Studioの実際のキャンバスサイズ',
    colorMode:'カラーモード',
    fullColor:'フルカラー (52色)',proSketch:'プロスケッチ',
    grayscale:'グレースケール',limitedPalette:'限定パレット (インク節約)',
    genMode:'生成モード',
    byLayers:'レイヤー別 (推奨)',flatImage:'フラット画像',
    layersHint:'レイヤーはタイプ別に分割: ベース → 影 → アウトライン → ハイライト。',
    noiseCleaning:'ノイズクリーニング',
    maxClean:'最大クリーニング (推奨)',onlySmooth:'スムージングのみ',
    onlyIsolated:'孤立ピクセル除去のみ',noClean:'クリーニングなし',
    noiseHint:'量子化前に孤立ピクセルを除去し色遷移を滑らかにします。',
    generateSketch:'スケッチ生成',
    exportFinal:'最終画像エクスポート',exportLayers:'レイヤーエクスポート (.zip)',
    saveGallery:'ギャラリーに保存',
    generatedLayers:'生成済みレイヤー',
    palette:'パレット (Studio 52色) — クリックでコピー',
    gallery:'保存済みギャラリー',noSketches:'スケッチはまだありません。',
    tagRequired:'タグ必須',writeTagFirst:'タグを入力してください。',
    noSelectionDlg:'未選択',selectOneDlg:'カードを1枚以上選択してください。',
    noCode:'コードなし',noCodeDlg:'選択したカードにコードがありません。',
    removeTagConfirm:'タグ削除',remove:'削除',
    exportBackup:'バックアップ書き出し',importBackup:'バックアップ読込',deleteAll:'全削除',deleteSelected:'選択を削除',
    searchCardsPlaceholder:'カードを検索…',gsearchPlaceholder:'名前・シリーズ・コード・タグで検索…',gsearchHint:'コレクションを検索するには入力してください',gsearchNoResults:'結果なし:',selectCardTitle:'カードを選択',cpSearchPlaceholder:'名前またはコードで検索…',albumPreview:'プレビュー',download:'⬇ ダウンロード',downloadX4:'⬇ ×4',downloadOriginal:'⬇ オリジナル',exportSketch:'⬇ スケッチを書き出す',exportOriginal:'オリジナル (ピクセル精確)',exportUpscaled:'拡大 ×4',
    days:'日',
  }
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
  applyI18n();
  _setTopbarTitle(window.__ACTIVE_TAB__||'home');
  if(ALL.length)buildAll();
}

function toggleDropdown(id){
  const dd=document.getElementById(id);if(!dd)return;
  const isOpen=dd.classList.contains('open');
  closeAllDropdowns();
  if(!isOpen){
    dd.classList.add('open');
    // Position sidebar dropdowns — measure AFTER open so scrollHeight is valid
    if(dd.classList.contains('sidebar-dropdown')){
      const row=dd.closest('.sidebar-footer-row')||dd.parentElement;
      const btn=row?.querySelector('button');
      if(btn){
        const r=btn.getBoundingClientRect();
        const sidebar=document.getElementById('sidebar');
        const sRight=sidebar ? sidebar.getBoundingClientRect().right : 220;
        const ddH=Math.min(dd.scrollHeight||280, window.innerHeight-r.top-16);
        const top=Math.max(8, Math.min(r.top, window.innerHeight-ddH-8));
        dd.style.top=top+'px';
        dd.style.left=(sRight+8)+'px';
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









document.addEventListener('click',e=>{
  if(e.target.closest('[data-tab="rescaler"]')) setTimeout(rescalerUpdateQualityVis,50);
});

// ── CHAR SELECTION MODE ──────────────────────────────────
// selected codes










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

// Cleanup: remove deprecated wishlist feature data
(function _removeWishlistData(){
  try{
    localStorage.removeItem('karutaWishlist');
    localStorage.removeItem('karutaWishlistAlbums');
  }catch(e){}
  // Remove wl: prefixed images from IDB
  _openIdb().then(db=>{
    try{
      const tx=db.transaction(_idbStore,'readwrite');
      const store=tx.objectStore(_idbStore);
      const req=store.getAllKeys();
      req.onsuccess=()=>{
        (req.result||[]).forEach(k=>{
          if(typeof k==='string' && k.startsWith('wl:')) store.delete(k);
        });
      };
    }catch(e){}
  }).catch(()=>{});
})();




// ── LAZY TAB RENDERING: only render when first visited ──
const _renderedTabs = new Set(['home']);

function _ensureTabRendered(tab){
  if(_renderedTabs.has(tab)) return;
  _renderedTabs.add(tab);
  // Guard: chunk functions only available on their page
  const fns = {
    series:     ()=>typeof renderSeries  ==='function'&&renderSeries(),
    frames:     ()=>typeof renderFrames  ==='function'&&renderFrames(),
    workers:    ()=>typeof renderWorkers ==='function'&&renderWorkers(),
    tags:       ()=>typeof renderTags    ==='function'&&renderTags(),
    albums:     ()=>typeof renderAlbum   ==='function'&&renderAlbum(),
    stats:      ()=>typeof buildCharts   ==='function'&&buildCharts(),
    characters: ()=>typeof renderChars   ==='function'&&renderChars(),
    home:       ()=>typeof buildHomePanel==='function'&&buildHomePanel(),
  };
  fns[tab]?.();
}

// ── HOME PANEL ───────────────────────────────────────────────

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

// startup moved to init.js — loads after page chunk

document.getElementById('formCharName')?.addEventListener('input',previewSlug);
document.getElementById('formEdition')?.addEventListener('change',previewSlug);
