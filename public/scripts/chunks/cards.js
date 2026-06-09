// chunk: cards.js

function renderChars(){

  charsPage=40;
  const list=_buildCharList();
  _modalList=list;
  document.getElementById('charCount').textContent=`${list.length.toLocaleString()} ${t('cards')}`;
  const _cg=document.getElementById('charGrid');
  _cg.style.opacity='0.3';
  _cg.innerHTML=list.slice(0,charsPage).map(c=>mkCard(c)).join('')||`<div class="empty">${t('noResults')}</div>`;
  wireImgs();
  _charsHasMore=list.length>charsPage;
  _initCharsScroll();
  requestAnimationFrame(()=>{_cg.style.transition='opacity .15s';_cg.style.opacity='1';});
}

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

function moreChars(){
charsPage+=40;renderChars();}

function getFilteredChars(){

  // Reset page when called fresh (not from _appendChars)
  const list=_buildCharList();
  return list;
}

function clearCharFilters(){

  ['searchChar','filterQual','filterEdition','filterMorphed','filterFrame','filterTag','filterGrabbed','filterPrint'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  document.getElementById('sortChar').value='date';
  renderChars();
}

function populateSuggestions(){
}

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

function charSelectionToggle(){

  _charSelMode = !_charSelMode;
  const btn = document.getElementById('charSelectToggle');
  const bar = document.getElementById('charSelBar');
  if(_charSelMode){
    btn.textContent = t('cancelSelect');
    btn.style.borderColor = 'var(--rose)';
    btn.style.color = 'var(--rose)';
    bar.classList.remove('hidden');
  } else {
    _charSelSet.clear();
    btn.textContent = t('select');
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
  btn.textContent = `✅ ${_charSelSet.size} ${t('copied')}`;
  btn.style.animation = 'copyFeedback 0.3s ease';
  setTimeout(()=>{
    btn.textContent = t('copyIDs');
    btn.style.animation = '';
    // Exit selection mode
    charSelectionToggle();
  }, 1200);
}

function _updateSelBar(){

  const n = _charSelSet.size;
  document.getElementById('charSelCount').textContent =
    n === 0 ? t('noSelection') :
    n === 1 ? `1 ${t('card')} ${t('selected')}` :
    `${n} ${t('cards')} ${t('selectedPl')}`;
  document.getElementById('charSelCopyBtn').disabled = n === 0;
}

function _applySelectionToGrid(){

  document.querySelectorAll('#charGrid .char-card').forEach(card=>{
    const code = card.dataset.code;
    card.classList.toggle('sel-mode', _charSelMode);
    card.classList.toggle('selected', _charSelMode && _charSelSet.has(code));
  });
}