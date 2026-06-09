// chunk: rescaler.js

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