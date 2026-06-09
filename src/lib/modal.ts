/** lib/modal.ts — Card detail modal */

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

function modalToggleFrame(){_modalFrameOn=!_modalFrameOn;_renderModal();}

function modalSetEd(n){
  _modalEd=String(n);
  const key=_modalCard.code||(_modalCard.character+'|'+String(n));
  _loadCustomImgAsync(key).then(img=>{_modalCustomImg=img;_renderModal();});
}