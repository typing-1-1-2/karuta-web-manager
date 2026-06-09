/** lib/album.ts — Album management */

function _albSave(){
  try{ localStorage.setItem('karutaAlbumBooks2', JSON.stringify(albumBooks)); }catch(e){}
  buildTabBadges();
}

function _albLoad(){
  try{ albumBooks = JSON.parse(localStorage.getItem('karutaAlbumBooks2')||'[]'); }
  catch(e){ albumBooks = []; }
}

function albFilledCount(){
  return albumBooks.reduce((s,b)=>s+(b.pages||[]).reduce((s2,p)=>s2+p.slots.filter(Boolean).length,0),0);
}

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

function albSetBg(bi, bg){
  const b=albumBooks[bi]; if(!b) return;
  b.bg=bg; b.bgUrl='';
  _saveAlbumBg(b.id, null);
  _albSave();
  renderAlbum();
}

function albHandleBgDrop(bi, file, text){
  if(file && file.type?.startsWith('image/')) { albHandleBgFile(bi, file); return; }
  const url=(text||'').trim();
  if(url && (url.startsWith('http')||url.startsWith('data:'))) albSetBgFromUrl(bi, url);
}

function albClearBgImg(bi){
  const b=albumBooks[bi]; if(!b) return;
  _saveAlbumBg(b.id, null);
  b.bgUrl='';
  _albSave();
  renderAlbum();
}

function albSetBgUrl(bi, url){ /* legacy no-op */ }

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

function albToggle(id){
  const b = albumBooks.find(x=>x.id===id);
  if(!b) return;
  b.open = !b.open;
  _albSave();
  renderAlbum();
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

function albClearSlot(bi, pi, si){
  const b = albumBooks[bi];
  if(!b) return;
  b.pages[pi].slots[si] = null;
  _albSave();
  renderAlbum();
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

function albPreviewConfirm(){
  if(!_exportCanvas) return;
  const link = document.createElement('a');
  link.download = _exportFilename;
  link.href = _exportCanvas.toDataURL('image/png');
  link.click();
  albPreviewCancel();
}

function albPreviewCancel(){
  document.getElementById('albPreviewOverlay').classList.add('hidden');
  _exportCanvas = null;
}

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

async function _applyCustomImgsToAlbumEl(el){
  const imgs=el.querySelectorAll('.alb-slot-img[data-code]');
  for(const img of imgs){
    const code=img.dataset.code;
    if(!code) continue;
    const custom=await _loadCustomImgAsync(code);
    if(custom) img.src=custom;
  }
}

function openAlbumModal(){ /* legacy stub */ }

function _buildModalList(){
  const q=(document.getElementById('searchChar')?.value||'').toLowerCase();
  const qual=document.getElementById('filterQual')?.value||'';
  let list=ALL.filter(c=>{const mQ=!q||c.character.toLowerCase().includes(q)||(c.series||'').toLowerCase().includes(q);return mQ&&(!qual||c.quality===qual);});
  const sort=document.getElementById('sortChar')?.value||'date';
  const fns={date:(a,b)=>(+b.obtainedTimestamp||0)-(+a.obtainedTimestamp||0),burn:(a,b)=>(+b.burnValue||0)-(+a.burnValue||0),wishlists:(a,b)=>(+b.wishlists||0)-(+a.wishlists||0),alpha:(a,b)=>(a.character||'').localeCompare(b.character||''),edition:(a,b)=>(+a.edition||0)-(+b.edition||0),print_asc:(a,b)=>(+a.number||0)-(+b.number||0),print_desc:(a,b)=>(+b.number||0)-(+a.number||0)};
  list.sort(fns[sort]||fns.date);return list;
}

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

function albPageDragStart(e, bi, pi){
  _albDragPage = {bi, pi};
  e.dataTransfer.effectAllowed = 'move';
}

function albPageDrop(e, bi, pi){
  if(!_albDragPage || _albDragPage.bi !== bi || _albDragPage.pi === pi) return;
  albMovePage(bi, _albDragPage.pi, pi);
  _albDragPage = null;
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