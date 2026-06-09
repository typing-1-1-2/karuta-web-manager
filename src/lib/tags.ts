/** lib/tags.ts — Tag management */

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

function tagGroupHeaderClick(header){header.closest('.tag-group').classList.toggle('open');}

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

function _loadTagOverrides(){
  try{
    const ov=JSON.parse(localStorage.getItem('karutaTagOverrides')||'{}');
    if(!Object.keys(ov).length)return;
    ALL.forEach(c=>{if(c.code&&ov[c.code]!==undefined)c.tag=ov[c.code];});
  }catch(e){}
}

function _persistTagChanges(){
  try{
    const ov={};
    ALL.forEach(c=>{if(c.code)ov[c.code]=c.tag||'';});
    localStorage.setItem('karutaTagOverrides',JSON.stringify(ov));
  }catch(e){}
}

function _populateTagFilter(){
  const sel=document.getElementById('filterTag');
  if(!sel)return;
  const cur=sel.value;
  const tags=[...new Set(ALL.map(c=>(c.tag||'').trim()).filter(Boolean))].sort();
  sel.innerHTML='<option value="">Todos los tags</option>'+tags.map(t=>`<option value="${esc(t)}"${t===cur?' selected':''}>${esc(t)}</option>`).join('');
}