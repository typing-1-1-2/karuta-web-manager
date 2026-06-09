/** lib/idb.ts — IndexedDB helpers */

function _openIdb(){
  return new Promise((res,rej)=>{
    if(_idb){res(_idb);return;}
    const req=indexedDB.open(_idbName,_idbVer);
    req.onupgradeneeded=e=>e.target.result.createObjectStore(_idbStore);
    req.onsuccess=e=>{_idb=e.target.result;res(_idb);}
    req.onerror=()=>rej(req.error);
  });
}

function _openSketchIdb(){
  return new Promise((res,rej)=>{
    if(_sketchIdb){res(_sketchIdb);return;}
    const req=indexedDB.open(_SKETCH_IDB,1);
    req.onupgradeneeded=e=>e.target.result.createObjectStore(_SKETCH_STORE,{keyPath:'id'});
    req.onsuccess=e=>{_sketchIdb=e.target.result;res(_sketchIdb);}
    req.onerror=()=>rej(req.error);
  });
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