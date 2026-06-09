// chunk: workers.js

function renderWorkers(){

  const q=(document.getElementById('searchWorker')?.value||'').toLowerCase();
  const ef=document.getElementById('filterEffort')?.value||'';
  const sort=document.getElementById('sortWorker')?.value||'effort';
  let list=ALL.filter(c=>{
    const mQ=!q||(c.character||'').toLowerCase().includes(q)||(c.series||'').toLowerCase().includes(q);
    const efN=+c['worker.effort']||0;
    const mEf=!ef||(ef==='hi'&&efN>=80)||(ef==='mid'&&efN>=40&&efN<80)||(ef==='lo'&&efN<40);
    return mQ&&mEf;
  });
  const GRADE_O={S:0,A:1,B:2,C:3,D:4,F:5};
  const fns={effort:(a,b)=>(+b['worker.effort']||0)-(+a['worker.effort']||0),purity:(a,b)=>(GRADE_O[a['worker.purity']]||5)-(GRADE_O[b['worker.purity']]||5),quick:(a,b)=>(GRADE_O[a['worker.quickness']]||5)-(GRADE_O[b['worker.quickness']]||5),alpha:(a,b)=>(a.character||'').localeCompare(b.character||'')};
  list.sort(fns[sort]||fns.effort);
  const fields=[['worker.style','Style'],['worker.purity','Purity'],['worker.grabber','Grabber'],['worker.dropper','Dropper'],['worker.quickness','Quick'],['worker.toughness','Tough'],['worker.vanity','Vanity']];
  document.getElementById('workerGrid').innerHTML=list.slice(0,workersPage).map(c=>`
    <div class="worker-card" onclick="openCardModal('${esc(c.code||c.character)}')">
      <div class="worker-char">${esc(c.character)}</div>
      <div class="worker-series">${esc(c.series||'—')}</div>
      <div class="worker-effort-row"><span class="effort-label">Esfuerzo acumulado</span><span class="effort-val">${+c['worker.effort']||0}</span></div>
      <div class="stats-grid-sm">${fields.map(([k,l])=>{const v=c[k]||'?';return`<div class="stat-row"><span class="stat-name">${l}</span><span class="grade g${v}">${v}</span></div>`;}).join('')}</div>
    </div>`).join('')||`<div class="empty">${t('noResults')}</div>`;
  document.getElementById('btnMoreWorkers').style.display=list.length>workersPage?'inline-block':'none';
}

function moreWorkers(){
workersPage+=40;renderWorkers();}