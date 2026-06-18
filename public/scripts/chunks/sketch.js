// chunk: sketch.js

async function sketchGenerate(){

  if(!_sketchSrc){await dlgAlert(t('dropImage'),{icon:'🖼',title:t('sketchTitle')});return;}
  const btn=document.getElementById('sketchGenBtn');
  btn.disabled=true;
  const loadingMsg = _currentLang==='en'?'Preparing…':_currentLang==='ja'?'準備中…':'Preparando…';
  btn.querySelector('span').textContent=loadingMsg;
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

  const lut=_buildPalLUT(pal);
  const palFlat=new Uint8Array(pal.length*3);
  for(let j=0;j<pal.length;j++){palFlat[j*3]=pal[j][0];palFlat[j*3+1]=pal[j][1];palFlat[j*3+2]=pal[j][2];}

  const WHITE=245, DARK=isPro?0:22;

  const hiW=Math.min(_sketchSrc.width,targetW*4);
  const hiH=Math.min(_sketchSrc.height,targetH*4);
  const hiC=document.createElement('canvas'); hiC.width=hiW; hiC.height=hiH;
  const hiCtx=hiC.getContext('2d');
  hiCtx.fillStyle='#fff'; hiCtx.fillRect(0,0,hiW,hiH);
  hiCtx.drawImage(_sketchSrc,0,0,hiW,hiH);
  const hiD=hiCtx.getImageData(0,0,hiW,hiH);
  if(isPro){
    _sharpenImageData(hiD.data,hiW,hiH,2.5);
    _enhanceImageData(hiD.data,1.4,1.2);
    _vibranceBoost(hiD.data,hiW,hiH,3.0);
    _medianFilter(hiD.data,hiW,hiH);
  } else {
    _sharpenImageData(hiD.data,hiW,hiH,1.5);
    _enhanceImageData(hiD.data,1.1,1.15);
  }
  hiCtx.putImageData(hiD,0,0);

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
    if(r>=WHITE&&g>=WHITE&&b>=WHITE) continue;
    if(!isPro && r<=DARK&&g<=DARK&&b<=DARK) continue;
    nw++;
  }
  let W=targetW, H=targetH;
  if(nw>ink){const s=Math.sqrt(ink/nw); W=Math.max(20,Math.round(targetW*s)); H=Math.max(10,Math.round(targetH*s));}

  const sc=document.createElement('canvas'); sc.width=W; sc.height=H;
  const sCtx=sc.getContext('2d');
  sCtx.imageSmoothingEnabled=true; sCtx.imageSmoothingQuality='high';
  sCtx.fillStyle='#fff'; sCtx.fillRect(0,0,W,H);
  sCtx.drawImage(hiC,0,0,W,H);

  // ── Pre-quantization cleanup ──────────────────────────────────
  // Step 1: Median filter to remove noise
  if(cleanup==='median'||cleanup==='median+clean'||!isPro){
    const medD=sCtx.getImageData(0,0,W,H);
    _medianFilter3x3(medD.data,W,H);
    sCtx.putImageData(medD,0,0);
  }
  // Step 2: Bilateral-style simplification — key for clean color blocks
  {
    const blkD=sCtx.getImageData(0,0,W,H);
    _simplifyColorBlocks(blkD.data,W,H, isPro?1:2);
    sCtx.putImageData(blkD,0,0);
  }
  const src=sCtx.getImageData(0,0,W,H).data;
  const N=W*H;

  const palIdx=new Uint8Array(N), layerOf=new Uint8Array(N);
  let cc=0;
  for(let i=0;i<N;i++){
    const r=src[i*4],g=src[i*4+1],b=src[i*4+2];
    if(r>=WHITE&&g>=WHITE&&b>=WHITE) continue;
    if(!isPro && r<=DARK&&g<=DARK&&b<=DARK) continue;
    const ci=_palLookup(lut,r,g,b); palIdx[i]=ci; cc++;
    layerOf[i]=_PAL_LAYER_MAP[ci]||1;
  }
  if(cc>ink){let ex=cc-ink; for(let i=N-1;i>=0&&ex>0;i--){if(layerOf[i]){layerOf[i]=0;ex--;}}}

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

  if(cleanup==='clean'||cleanup==='median+clean'){
    const removed=_removeIsolatedPixels(compD,W,H);
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

  const dc=document.getElementById('sketchCanvas');
  dc.width=W; dc.height=H; dc.style.imageRendering='pixelated';
  dc.getContext('2d').drawImage(compC,0,0); dc.style.display='block';
  document.getElementById('sketchEmpty').style.display='none';
  const oc=document.getElementById('sketchOrigCanvas');
  oc.width=W; oc.height=H;
  const ocCtx=oc.getContext('2d'); ocCtx.fillStyle='#fff'; ocCtx.fillRect(0,0,W,H);
  ocCtx.drawImage(_sketchSrc,0,0,W,H);

  const inkLabel   = _currentLang==='en'?'ink':_currentLang==='ja'?'インク':'ink';
  const leftLabel  = _currentLang==='en'?'remaining':_currentLang==='ja'?'残り':'sobrante';
  const autoLabel  = _currentLang==='en'?' (auto)':_currentLang==='ja'?' (自動)':' (auto)';
  const redLabel   = _currentLang==='en'?' ← reduced':_currentLang==='ja'?' ← 縮小':' ← reducido';

  document.getElementById('sketchStats').style.display='flex';
  document.getElementById('sketchStats').innerHTML=
    `<span>📐 <b>${W}×${H}</b>${W<targetW?autoLabel:''}</span>`+
    `<span>🩸 <b>${totalInk.toLocaleString()}</b>/${ink.toLocaleString()} ${inkLabel}</span>`+
    `<span>💧 <b>${Math.max(0,ink-totalInk).toLocaleString()}</b> ${leftLabel}</span>`;
  document.getElementById('sketchPreviewLabel').textContent=`Sketch · ${W}×${H}${W<targetW?redLabel:''}`;
  document.getElementById('sketchActionBtns').style.display='flex';
  document.getElementById('sketchExportLayersBtn').style.display=useLayers?'flex':'none';
  if(useLayers) _renderLayersPanel(window._sketchLayers,W,H);
  else document.getElementById('sketchLayersPanel').style.display='none';

  btn.disabled=false;
  btn.querySelector('span').textContent=t('generateSketch');
}

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

function _vibranceBoost(data, w, h, factor){

  for(let i=0;i<w*h*4;i+=4){
    const r=data[i], g=data[i+1], b=data[i+2];
    const mx=Math.max(r,g,b);
    const mn=Math.min(r,g,b);
    const sat=(mx-mn)/(mx+1);
    const lum=(r+g+b)/3;
    const boost=1+sat*factor;
    data[i  ]=Math.max(0,Math.min(255,lum+(r-lum)*boost));
    data[i+1]=Math.max(0,Math.min(255,lum+(g-lum)*boost));
    data[i+2]=Math.max(0,Math.min(255,lum+(b-lum)*boost));
  }
}

function _medianFilter3x3(data, w, h){
  // True 3x3 median filter — much better noise removal than 2x2
  const out = new Uint8ClampedArray(data.length);
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      for(let c=0;c<3;c++){
        const vals=[];
        for(let ky=-1;ky<=1;ky++) for(let kx=-1;kx<=1;kx++){
          const nx=Math.min(w-1,Math.max(0,x+kx));
          const ny=Math.min(h-1,Math.max(0,y+ky));
          vals.push(data[(ny*w+nx)*4+c]);
        }
        vals.sort((a,b)=>a-b);
        out[i+c]=vals[4]; // median of 9
      }
      out[i+3]=255;
    }
  }
  for(let i=0;i<data.length;i++) data[i]=out[i];
}

function _simplifyColorBlocks(data, w, h, passes){
  // Iterative block averaging: groups nearby similar pixels into flat color zones
  // This is the main driver of the clean blocky look in the example
  for(let pass=0;pass<passes;pass++){
    const out = new Uint8ClampedArray(data.length);
    const THRESH = 40; // color similarity threshold
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4;
        const r0=data[i],g0=data[i+1],b0=data[i+2];
        // Skip whites (background)
        if(r0>245&&g0>245&&b0>245){ out[i]=255;out[i+1]=255;out[i+2]=255;out[i+3]=255; continue; }
        // Collect similar neighbors in 3x3
        let sr=0,sg=0,sb=0,n=0;
        for(let ky=-1;ky<=1;ky++) for(let kx=-1;kx<=1;kx++){
          const nx=Math.min(w-1,Math.max(0,x+kx));
          const ny=Math.min(h-1,Math.max(0,y+ky));
          const ni=(ny*w+nx)*4;
          const dr=data[ni]-r0,dg=data[ni+1]-g0,db=data[ni+2]-b0;
          const dist=Math.sqrt(dr*dr+dg*dg+db*db);
          if(dist<THRESH){ sr+=data[ni];sg+=data[ni+1];sb+=data[ni+2];n++; }
        }
        out[i]=sr/n|0; out[i+1]=sg/n|0; out[i+2]=sb/n|0; out[i+3]=255;
      }
    }
    for(let i=0;i<data.length;i++) data[i]=out[i];
  }
}

function _medianFilter(data, w, h){
  // Legacy 2x2 — kept for compatibility
  _medianFilter3x3(data, w, h);
}

function _removeIsolatedPixels(compD, W, H){

  const WHITE=250;
  const remove=new Uint8Array(W*H);
  for(let y=1;y<H-1;y++){
    for(let x=1;x<W-1;x++){
      const i=(y*W+x)*4;
      if(compD[i]>=WHITE&&compD[i+1]>=WHITE&&compD[i+2]>=WHITE) continue;
      let coloredNeighbors=0;
      for(const [dy,dx] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const ni=((y+dy)*W+(x+dx))*4;
        if(compD[ni]<WHITE||compD[ni+1]<WHITE||compD[ni+2]<WHITE) coloredNeighbors++;
      }
      if(coloredNeighbors===0) remove[y*W+x]=1;
    }
  }
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

function sketchHandleDrop(e){
e.preventDefault();document.getElementById('sketchDrop').classList.remove('drag-over');const f=e.dataTransfer.files?.[0];if(f)sketchLoadFile(f);}

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
      const changeLabel = _currentLang==='en'?'click to change':_currentLang==='ja'?'クリックで変更':'haz clic para cambiar';
      document.getElementById('sketchDrop').innerHTML=
        `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`+
        `<span style="font-size:13px">${esc(file.name)}</span>`+
        `<span style="font-size:11px;color:var(--text3)">${img.width}×${img.height}px · ${changeLabel}</span>`+
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

  if(!_sketchSrc){await dlgAlert(t('dropImage'),{icon:'🖼',title:t('sketchTitle')});return;}
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

async function renderSketchGallery(){

  const gallery=document.getElementById('sketchGallery');
  if(!gallery)return;
  const sketches=await _loadSketches();
  if(!sketches.length){
    gallery.innerHTML=`<div class="sketch-gal-empty">${t('noSketches')}</div>`;
    return;
  }
  const dlLabel  = _currentLang==='en'?'Download':_currentLang==='ja'?'ダウンロード':'Descargar';
  const delLabel = _currentLang==='en'?'Delete':_currentLang==='ja'?'削除':'Eliminar';
  gallery.innerHTML=sketches.map(s=>`
    <div class="sketch-gal-item">
      <img class="sketch-gal-img" src="${s.dataUrl}" alt="${esc(s.name)}" onclick="sketchGalOpen(${s.id})">
      <div class="sketch-gal-info">
        <span class="sketch-gal-name">${esc(s.name)}</span>
        <span class="sketch-gal-date">${s.date}</span>
      </div>
      <div class="sketch-gal-actions">
        <button class="alb-icon-btn" onclick="sketchGalDownload(${s.id})" title="${dlLabel}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="alb-icon-btn del" onclick="sketchGalDelete(${s.id})" title="${delLabel}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
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

  const delTitle = _currentLang==='en'?'Delete sketch':_currentLang==='ja'?'スケッチ削除':'Eliminar sketch';
  const delMsg   = _currentLang==='en'?'Delete this sketch? This cannot be undone.':_currentLang==='ja'?'このスケッチを削除しますか？':'¿Eliminar este sketch? No se puede recuperar.';
  const delOk    = _currentLang==='en'?'Delete':_currentLang==='ja'?'削除':'Eliminar';
  if(!await dlgConfirm(delMsg,{icon:'🗑',title:delTitle,type:'danger',okText:delOk}))return;
  await _deleteSketch(+id||id);
  renderSketchGallery();
}

function sketchExport(){

  if(!_sketchResult) return;
  const W=_sketchResult.width, H=_sketchResult.height;
  const SCALE=4;

  const cA = document.getElementById('sketchExportCanvasA');
  cA.width=W; cA.height=H;
  cA.getContext('2d').drawImage(_sketchResult,0,0);
  document.getElementById('sketchExportInfoA').textContent=`${W}×${H}px · PNG`;

  const cB = document.getElementById('sketchExportCanvasB');
  cB.width=W*SCALE; cB.height=H*SCALE;
  const ctxB=cB.getContext('2d');
  ctxB.imageSmoothingEnabled=true;
  ctxB.imageSmoothingQuality='high';
  ctxB.drawImage(_sketchResult,0,0,W*SCALE,H*SCALE);
  document.getElementById('sketchExportInfoB').textContent=`${W*SCALE}×${H*SCALE}px (×${SCALE}) · PNG`;

  document.getElementById('sketchExportSub').textContent=`${_sketchFilename} · ${W}×${H}px`;
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
  const saveTitle = _currentLang==='en'?'Save sketch':_currentLang==='ja'?'スケッチを保存':'Guardar sketch';
  const savePh    = _currentLang==='en'?'Name…':_currentLang==='ja'?'名前…':'Nombre…';
  const saveOk    = _currentLang==='en'?'Save':_currentLang==='ja'?'保存':'Guardar';
  const name=await dlgPrompt(saveTitle,_sketchFilename,{icon:'💾',title:saveTitle,placeholder:savePh,okText:saveOk})||_sketchFilename;
  const dataUrl=_sketchResult.toDataURL('image/png');
  await _saveSketch(name,dataUrl);
  renderSketchGallery();
  const btn=document.getElementById('sketchSaveBtn');
  const savedLabel = _currentLang==='en'?'Saved!':_currentLang==='ja'?'保存済み！':'¡Guardado!';
  if(btn){
    const origText = btn.querySelector('span')?.textContent || t('saveGallery');
    if(btn.querySelector('span')) btn.querySelector('span').textContent=savedLabel;
    else btn.textContent=savedLabel;
    setTimeout(()=>{
      if(btn.querySelector('span')) btn.querySelector('span').textContent=t('saveGallery');
      else btn.textContent=t('saveGallery');
    },2000);
  }
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
  const genLabel = _currentLang==='en'?'Generating ZIP…':_currentLang==='ja'?'ZIP生成中…':'Generando ZIP…';
  if(btn.querySelector('span')) btn.querySelector('span').textContent=genLabel;
  btn.disabled=true;
  const zip=new window.JSZip();
  const folder=zip.folder(_sketchFilename);
  folder.file('00_composite.png', await new Promise(r=>_sketchResult.toBlob(r,'image/png')));
  for(const l of layers){
    if(!l._canvas) continue;
    folder.file(`0${l.order}_${l.id}.png`, await new Promise(r=>l._canvas.toBlob(r,'image/png')));
  }
  folder.file('README.txt',`Sketch layers — paint in order:\n${layers.map(l=>`${l.order}. ${l.name} (${l.inkCount.toLocaleString()} ink) — ${l.desc}`).join('\n')}\nCanvas: ${window._sketchW}×${window._sketchH}`);
  const blob=await zip.generateAsync({type:'blob'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.download=_sketchFilename+'_layers.zip';
  link.href=url; link.click();
  URL.revokeObjectURL(url);
  if(btn.querySelector('span')) btn.querySelector('span').textContent=t('exportLayers');
  btn.disabled=false;
}

function sketchDownloadLayer(idx){

  const layer=window._sketchLayers?.[idx];
  if(!layer?._canvas) return;
  const link=document.createElement('a');
  link.download=`${_sketchFilename}_layer${layer.order}_${layer.id}.png`;
  link.href=layer._canvas.toDataURL('image/png');
  link.click();
}
