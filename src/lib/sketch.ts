/** lib/sketch.ts — Sketch conversion pipeline */

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
    const sat=(mx-mn)/(mx+1); // 0-1
    const lum=(r+g+b)/3;
    // boost = 1 + sat * factor  (saturated → amplify, neutral → identity)
    const boost=1+sat*factor;
    data[i  ]=Math.max(0,Math.min(255,lum+(r-lum)*boost));
    data[i+1]=Math.max(0,Math.min(255,lum+(g-lum)*boost));
    data[i+2]=Math.max(0,Math.min(255,lum+(b-lum)*boost));
  }
}

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

async function sketchSave(){
  if(!_sketchResult)return;
  const name=prompt('Nombre del sketch:',_sketchFilename)||_sketchFilename;
  const dataUrl=_sketchResult.toDataURL('image/png');
  await _saveSketch(name,dataUrl);
  renderSketchGallery();
  const btn=document.getElementById('sketchSaveBtn');
  btn.textContent='✅ Guardado';
  setTimeout(()=>{btn.textContent='💾 Guardar en galería';},2000);
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

function sketchDetectSize(){
  if(!_sketchSrc){alert('Carga una imagen primero.');return;}
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
  if(!confirm('¿Eliminar este sketch?'))return;
  await _deleteSketch(+id||id);
  renderSketchGallery();
}

function _renderSketchPalette(){
  const grid=document.getElementById('sketchPaletteGrid');
  if(!grid||grid.children.length)return;
  grid.innerHTML=SKETCH_PALETTE.map(c=>`<div class="sketch-swatch" style="background:${c}" title="${c.toUpperCase()}" onclick="navigator.clipboard?.writeText('${c.toUpperCase()}')"></div>`).join('');
}