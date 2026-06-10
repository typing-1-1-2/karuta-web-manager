// chunk: wishlist.js
// Favoritos externos — cartas de referencia/inspiración independientes del CSV

const _WL_KEY = 'karutaWishlist';
const _WL_IDB_PREFIX = 'wl:';
let _wlCards = [];
let _wlEditId = null; // null = new, string = editing existing
let _wlImgData = null; // base64 or URL for current form

// ── Storage ──────────────────────────────────────────────────

function _wlLoad(){
  try{ _wlCards = JSON.parse(localStorage.getItem(_WL_KEY)||'[]'); }
  catch(e){ _wlCards = []; }
}

function _wlSave(){
  try{ localStorage.setItem(_WL_KEY, JSON.stringify(_wlCards)); }
  catch(e){}
}

// ── Render ───────────────────────────────────────────────────

function renderWishlist(){
  _wlLoad();
  const q = (document.getElementById('wlSearch')?.value||'').toLowerCase().trim();
  const qual = document.getElementById('wlFilterQual')?.value||'';
  const sort = document.getElementById('wlSort')?.value||'date';

  // Always hide empty state initially
  const empty = document.getElementById('wlEmpty');
  if(empty) empty.classList.add('hidden');

  let list = _wlCards.filter(c=>{
    const mName = c.name?.toLowerCase().includes(q);
    const mSeries = (c.series||'').toLowerCase().includes(q);
    if(q && !mName && !mSeries) return false;
    if(qual && c.quality !== qual) return false;
    return true;
  });

  const fns = {
    date:    (a,b) => b.createdAt - a.createdAt,
    alpha:   (a,b) => (a.name||'').localeCompare(b.name||''),
    quality: (a,b) => (+b.quality||0) - (+a.quality||0),
  };
  list.sort(fns[sort]||fns.date);

  const grid  = document.getElementById('wlGrid');
  const count = document.getElementById('wlCount');

  if(count) count.textContent = `${list.length} ${t('cards')}`;

  if(!list.length){
    if(grid)  grid.innerHTML = '';
    if(empty) empty.classList.remove('hidden');
    return;
  }
  if(empty) empty.classList.add('hidden');
  if(grid)  grid.innerHTML = list.map(c => _wlMkCard(c)).join('');

  // Load images async
  requestAnimationFrame(()=>_wlApplyImages(list));
}

function _wlMkCard(c){
  const q = c.quality||'0';
  const bv = +c.burnValue||0;
  const wl = +c.wishlists||0;
  const imgId = 'wli-'+c.id;
  const pills = [
    c.tag ? `<span class="pill pill-tag">#${esc(c.tag)}</span>` : '',
  ].filter(Boolean).join('');

  return `<div class="char-card wl-card" data-wlid="${esc(c.id)}" onclick="openWishlistCard('${esc(c.id)}')">
    <div class="card-quality-bar" style="background:${QS[q]}"></div>
    <div class="card-img-wrap loading">
      <img id="${imgId}" class="card-img" src="" alt="" style="display:none"
        onload="this.style.display='';this.closest('.card-img-wrap')?.classList.remove('loading')"
        onerror="this.style.display='none'">
      <div class="card-no-img" id="wlni-${c.id}" style="display:flex">
        <span class="ni-icon">♥</span>
        <span>Sin imagen</span>
      </div>
      <span class="card-q-badge ${QB[q]||'bq0'}">${QL[q]||q+'★'}</span>
    </div>
    <div class="card-info">
      <div class="card-name">${esc(c.name||'—')}</div>
      <div class="card-series">${esc(c.series||'—')}</div>
      <div class="card-row">
        ${c.edition ? `<span class="pill pill-ed">Ed.${c.edition}</span>` : ''}
        ${c.print ? `<span class="pill pill-ed">#${c.print}</span>` : ''}
        ${pills}
        ${wl>0 ? `<span class="card-wl">♥${wl}</span>` : ''}
        ${bv>0 ? `<span class="card-burn"><b>${bv.toLocaleString()}</b>🔥</span>` : ''}
      </div>
      ${c.note ? `<div style="font-size:10px;color:var(--text3);margin-top:4px;line-height:1.4">${esc(c.note)}</div>` : ''}
    </div>
  </div>`;
}

async function _wlApplyImages(list){
  for(const c of list){
    const imgEl = document.getElementById('wli-'+c.id);
    const niEl  = document.getElementById('wlni-'+c.id);
    if(!imgEl) continue;
    // Try IDB first (base64), then fall back to direct URL (works even with CORS-restricted hosts via <img>)
    let src = null;
    try{ src = await _loadCustomImgAsync(_WL_IDB_PREFIX+c.id); }catch(e){}
    if(!src && c.imgUrl) src = c.imgUrl;
    if(src){
      imgEl.onload = ()=>{
        imgEl.style.display='';
        imgEl.closest('.card-img-wrap')?.classList.remove('loading');
        if(niEl) niEl.style.display='none';
      };
      imgEl.onerror = ()=>{ imgEl.style.display='none'; };
      imgEl.src = src;
    }
  }
}

// ── Form ─────────────────────────────────────────────────────

function openWishlistForm(editId){
  _wlEditId = editId || null;
  _wlImgData = null;
  const overlay = document.getElementById('wlFormOverlay');
  const title   = document.getElementById('wlFormTitle');
  if(title) title.textContent = editId ? 'Editar carta' : 'Nueva carta';

  // Clear / prefill fields
  if(editId){
    const c = _wlCards.find(x=>x.id===editId);
    if(!c) return;
    _wlSetField('wlFName',   c.name||'');
    _wlSetField('wlFSeries', c.series||'');
    _wlSetField('wlFQual',   c.quality||'0');
    _wlSetField('wlFEd',     c.edition||'');
    _wlSetField('wlFPrint',  c.print||'');
    _wlSetField('wlFBurn',   c.burnValue||'');
    _wlSetField('wlFWl',     c.wishlists||'');
    _wlSetField('wlFTag',    c.tag||'');
    _wlSetField('wlFCode',   c.code||'');
    _wlSetField('wlFNote',   c.note||'');
    _wlSetField('wlImgUrl',  c.imgUrl||'');
    // Load image preview
    _loadCustomImgAsync(_WL_IDB_PREFIX+editId).then(img=>{
      wlSetPreview(img || c.imgUrl || null);
    });
  } else {
    ['wlFName','wlFSeries','wlFPrint','wlFBurn','wlFWl','wlFTag','wlFCode','wlFNote','wlImgUrl'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    _wlSetField('wlFQual','0');
    _wlSetField('wlFEd','');
    wlSetPreview(null);
  }
  document.getElementById('wlFormError').textContent = '';
  const delBtn = document.getElementById('wlDeleteBtn');
  if(delBtn) delBtn.style.display = editId ? 'inline-flex' : 'none';
  overlay?.classList.remove('hidden');
  setTimeout(()=>document.getElementById('wlFName')?.focus(), 50);
}

function closeWishlistForm(){
  document.getElementById('wlFormOverlay')?.classList.add('hidden');
  _wlEditId = null;
  _wlImgData = null;
}

function _wlSetField(id, val){
  const el = document.getElementById(id);
  if(el) el.value = val;
}

function wlPreviewUrl(url){
  if(!url) return;
  wlSetPreview(url);
  _wlImgData = url;
}

function wlHandleImgFile(file){
  if(!file||!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    _wlImgData = e.target.result;
    wlSetPreview(_wlImgData);
  };
  reader.readAsDataURL(file);
}

function wlSetPreview(src){
  const prev = document.getElementById('wlImgPreview');
  if(!prev) return;
  if(src){
    prev.innerHTML = `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.style.display='none'">`;
  } else {
    prev.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Sin imagen</span>`;
  }
}

function wlClearImg(){
  _wlImgData = null;
  wlSetPreview(null);
  const urlEl = document.getElementById('wlImgUrl');
  if(urlEl) urlEl.value = '';
}

async function saveWishlistCard(){
  const name = (document.getElementById('wlFName')?.value||'').trim();
  const errEl = document.getElementById('wlFormError');
  if(!name){ if(errEl) errEl.textContent = 'El nombre es obligatorio.'; return; }
  if(errEl) errEl.textContent = '';

  const btn = document.getElementById('wlFormSaveBtn');
  if(btn){ btn.disabled=true; btn.querySelector('span')? btn.querySelector('span').textContent='Guardando…' : (btn.textContent='Guardando…'); }

  const id = _wlEditId || ('wl'+Date.now());
  const imgUrl = !_wlImgData?.startsWith('data:') ? (_wlImgData || document.getElementById('wlImgUrl')?.value?.trim() || '') : '';

  // Save image to IDB if it's a file (base64)
  if(_wlImgData?.startsWith('data:')){
    try{ await new Promise((res,rej)=>{
      _openIdb().then(db=>{
        const tx=db.transaction(_idbStore,'readwrite');
        tx.objectStore(_idbStore).put(_wlImgData, _WL_IDB_PREFIX+id);
        tx.oncomplete=res; tx.onerror=rej;
      }).catch(rej);
    }); }catch(e){}
  } else if(_wlEditId && !_wlImgData){
    // If editing and no new image, keep existing — don't delete
  }

  const card = {
    id,
    name,
    series:     (document.getElementById('wlFSeries')?.value||'').trim(),
    quality:    document.getElementById('wlFQual')?.value||'0',
    edition:    document.getElementById('wlFEd')?.value||'',
    print:      document.getElementById('wlFPrint')?.value||'',
    burnValue:  document.getElementById('wlFBurn')?.value||'',
    wishlists:  document.getElementById('wlFWl')?.value||'',
    tag:        (document.getElementById('wlFTag')?.value||'').trim(),
    code:       (document.getElementById('wlFCode')?.value||'').trim(),
    note:       (document.getElementById('wlFNote')?.value||'').trim(),
    imgUrl,
    createdAt:  _wlEditId ? (_wlCards.find(x=>x.id===_wlEditId)?.createdAt||Date.now()) : Date.now(),
  };

  if(_wlEditId){
    const idx = _wlCards.findIndex(x=>x.id===_wlEditId);
    if(idx>=0) _wlCards[idx] = card; else _wlCards.push(card);
  } else {
    _wlCards.unshift(card);
  }
  _wlSave();
  closeWishlistForm();
  renderWishlist();
  buildTabBadges();
}

// ── Card detail (open existing) ───────────────────────────────

function openWishlistCard(id){
  _wlLoad();
  const c = _wlCards.find(x=>x.id===id);
  if(!c) return;

  // Build a synthetic card object compatible with showModal
  const synth = {
    character: c.name||'—',
    series:    c.series||'—',
    quality:   c.quality||'0',
    edition:   c.edition||'1',
    number:    c.print||'—',
    burnValue: c.burnValue||'0',
    wishlists: c.wishlists||'0',
    frame:     '',
    morphed:   'No',
    trimmed:   'No',
    tag:       c.tag||'',
    code:      c.code||'',
    'worker.effort': '',
    _wlId:     c.id,   // mark as wishlist card
    _note:     c.note||'',
    _imgUrl:   c.imgUrl||'',
  };

  // Load custom image from IDB then open modal
  _loadCustomImgAsync(_WL_IDB_PREFIX+c.id).then(idbImg=>{
    if(idbImg) _modalCustomImg = idbImg;
    else if(c.imgUrl) _modalCustomImg = c.imgUrl;
    else _modalCustomImg = null;
    _modalCard = synth;
    _modalEd = synth.edition||'1';
    _modalFrameOn = false;
    _modalEditMode = false;
    _modalList = [];
    _modalIdx = 0;
    _renderWlModal(c);
    openModal();
  });
}

function _renderWlModal(c){
  const q = c.quality||'0';
  const imgUrl = _modalCustomImg || c.imgUrl || '';

  // Card side — image only, no edition buttons
  document.getElementById('modalCardSide').innerHTML =
    '<div class="modal-card-viewer">'+
      '<div class="modal-card-img-wrap" id="mci">'+
        (imgUrl
          ? `<div class="modal-card-bg" id="mcbg" style="background-image:url('${esc(imgUrl)}')"></div>`
          : '<div class="modal-card-bg" id="mcbg" style="background:var(--bg3)"></div>')+
        '<div class="modal-card-placeholder" id="mcph" style="display:none">♥</div>'+
      '</div>'+
    '</div>'+
    '<div class="modal-action-row" style="margin-top:8px">'+
      '<button class="modal-action-btn" onclick="openWishlistForm(\''+esc(c.id)+'\')" title="Editar">'+
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'+
        'Editar'+
      '</button>'+
      '<button class="modal-action-btn modal-action-danger" onclick="closeModal();deleteWishlistCard(\''+esc(c.id)+'\')" title="Eliminar">'+
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>'+
        'Eliminar'+
      '</button>'+
    '</div>';

  if(imgUrl){
    setTimeout(()=>{
      const bg = document.getElementById('mcbg');
      if(bg){ const ti=new Image(); ti.onerror=()=>{bg.style.display='none';const ph=document.getElementById('mcph');if(ph)ph.style.display='flex';}; ti.src=imgUrl; }
    },50);
  }

  // Info side
  const _row = (k,v) => `<div class="modal-stat-row"><span class="modal-stat-key">${k}</span><span class="modal-stat-val">${v}</span></div>`;
  const rows = [
    _row('Calidad',   QL[q]||q+'★'),
    c.edition ? _row('Edición', 'Ed.'+c.edition) : '',
    c.print   ? _row('Print #', c.print) : '',
    c.burnValue ? _row('Burn value', '🔥 '+(+c.burnValue||0).toLocaleString()) : '',
    c.wishlists ? _row('Wishlists', c.wishlists) : '',
    c.tag     ? _row('Tag', c.tag) : '',
    c.code    ? _row('Código', `<span style="font-family:monospace;font-size:12px">${esc(c.code)}</span>`) : '',
    c.note    ? _row('Nota', esc(c.note)) : '',
  ].filter(Boolean).join('');

  document.getElementById('modalInfoSide').innerHTML =
    `<button class="modal-close" onclick="closeModal()">✕</button>`+
    `<div style="font-size:11px;color:var(--text3);letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">${esc(c.series||'—')}</div>`+
    `<div class="modal-char-name">${esc(c.name||'—')}</div>`+
    `<div style="margin-bottom:1.25rem"><span class="card-q-badge ${QB[q]||'bq0'}" style="position:static;display:inline-block">${QL[q]||q+'★'}</span></div>`+
    `<div class="modal-stats">${rows}</div>`;
}

// Auto-load image from CDN when name is typed
let _wlAutoImgTimer = null;
function wlAutoImg(name){
  clearTimeout(_wlAutoImgTimer);
  if(!name || name.length < 2) return;
  // Only auto-load if no image has been manually set
  if(_wlImgData) return;
  _wlAutoImgTimer = setTimeout(()=>{
    const slug = name.toLowerCase().replace(/['\u2019`]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    const url = CDN + slug + '-1.jpg';
    // Test if image loads
    const img = new Image();
    img.onload = ()=>{
      // Only apply if user hasn't typed something else meanwhile and no manual image set
      if(!_wlImgData && document.getElementById('wlFName')?.value === name){
        wlSetPreview(url);
        const urlEl = document.getElementById('wlImgUrl');
        if(urlEl && !urlEl.value) urlEl.value = url;
      }
    };
    img.onerror = ()=>{}; // silently fail
    img.src = url;
  }, 500);
}

// Paste image from clipboard while form is open
document.addEventListener('paste', e=>{
  const overlay = document.getElementById('wlFormOverlay');
  if(!overlay || overlay.classList.contains('hidden')) return;
  const item = [...e.clipboardData.items].find(i=>i.type.startsWith('image/'));
  if(item){
    e.preventDefault();
    wlHandleImgFile(item.getAsFile());
  }
});

async function deleteWishlistCard(id){
  if(!await dlgConfirm('¿Eliminar esta carta de favoritos externos?',{icon:'🗑',title:'Eliminar carta',type:'danger',okText:'Eliminar',cancelText:'Cancelar'})) return;
  _wlCards = _wlCards.filter(x=>x.id!==id);
  _wlSave();
  // Remove from IDB
  try{
    _openIdb().then(db=>{
      db.transaction(_idbStore,'readwrite').objectStore(_idbStore).delete(_WL_IDB_PREFIX+id);
    });
  }catch(e){}
  closeWishlistForm();
  renderWishlist();
  buildTabBadges();
}
