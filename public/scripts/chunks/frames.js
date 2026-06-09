// chunk: frames.js

function renderFrames(){

  const map={};
  ALL.forEach(c=>{const f=(c.frame&&c.frame.trim())?c.frame.trim():'(sin marco)';map[f]=(map[f]||0)+1;});
  const entries=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  let html='';
  for(const[f,n]of entries){
    const imgUrl=f!=='(sin marco)'?frameImgEl(f):null;
    const displayName=FRAME_NAME[f]||f;
    html+=`<div class="frame-card"><div class="frame-img-wrap">${imgUrl||'<div class="frame-no-img">🚫</div>'}</div><div class="frame-info"><span class="frame-name">${esc(displayName)}</span><span class="frame-cnt">${n}</span></div></div>`;
  }
  document.getElementById('framesGrid').innerHTML=html;
  wireFrameImgs();
}

function frameImgEl(key){

  const url=frameImgUrl(key);
  if(!url)return'<div class="frame-no-img">🖼️</div>';
  const uid='fi'+(++_imgUid);
  return '<img class="frame-img" id="'+uid+'" src="'+url+'" alt="">';
}