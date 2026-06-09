/**
 * lib/csv.ts
 * CSV parsing and card data management
 * These functions operate on raw data arrays — no DOM
 */
import type { CardEntry } from "../stores/app";

function parseCSV(raw){
  const lines=raw.split('\n').filter(l=>l.trim());
  if(lines.length<2)return[];
  const headers=splitLine(lines[0]).map(h=>h.replace(/^"|"$/g,'').trim());
  return lines.slice(1).map(l=>{
    const vals=splitLine(l);
    const o={};
    headers.forEach((h,i)=>o[h]=(vals[i]||'').replace(/^"|"$/g,''));
    return o;
  }).filter(r=>r.character);
}

function _getUserId(){
  const counts={};
  ALL.forEach(c=>{ if(c.grabber) counts[c.grabber]=(counts[c.grabber]||0)+1; });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
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

function buildAll(){
  charsPage=40;seriesPage=50;workersPage=40;
  buildMetrics();buildTabBadges();
  _populateTagFilter();
  renderChars();renderSeries();renderFrames();renderWorkers();renderTags();renderAlbum();
  setTimeout(buildCharts,200);
}