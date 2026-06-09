// chunk: home.js

function buildHomePanel(){

  if(!ALL.length) return;

  const total = ALL.length;
  const burn  = ALL.reduce((s,c)=>s+(+c.burnValue||0),0);
  const series= new Set(ALL.map(c=>c.series)).size;
  const q4    = ALL.filter(c=>c.quality==='4').length;
  const q3    = ALL.filter(c=>c.quality==='3').length;
  const q2    = ALL.filter(c=>c.quality==='2').length;
  const q1    = ALL.filter(c=>c.quality==='1').length;
  const morphed=ALL.filter(c=>c.morphed==='Yes').length;
  const withFrame=ALL.filter(c=>c.frame&&c.frame.trim()).length;

  // Greeting
  const greet=document.getElementById('homeGreeting');
  const sub=document.getElementById('homeSubtitle');
  if(greet) greet.textContent=t('collection');
  if(sub)   sub.textContent=total.toLocaleString()+' '+t('cards')+' · '+series.toLocaleString()+' '+t('series');

  // Stats list
  const statsList=document.getElementById('homeStatsList');
  if(statsList){
    const rows=[
      [t('totalCards'), total.toLocaleString()],
      [t('uniqueSeries'), series.toLocaleString()],
      [t('totalBurn'), burn.toLocaleString()+' 🔥'],
      ['★★★★', q4.toLocaleString('es')],
      [t('morphed'), morphed.toLocaleString()],
      [t('withFrame'), withFrame.toLocaleString()],
    ];
    statsList.innerHTML=rows.map(([n,v])=>`
      <div class="home-stat-row">
        <span class="home-stat-name">${n}</span>
        <span class="home-stat-val">${v}</span>
      </div>`).join('');
  }

  // Quality bars
  const qBars=document.getElementById('homeQualityBars');
  if(qBars){
    const qs=[['★★★★',q4,'#f43f5e'],['★★★',q3,'#818cf8'],['★★',q2,'#bf6f4a'],['★',q1,'#505878']];
    const maxQ=Math.max(q4,q3,q2,q1)||1;
    qBars.innerHTML=qs.map(([l,n,c])=>`
      <div class="hqb-row">
        <span class="hqb-label" style="color:${c}">${l}</span>
        <div class="hqb-track"><div class="hqb-fill" style="width:${(n/maxQ*100).toFixed(1)}%;background:${c}"></div></div>
        <span class="hqb-count">${n}</span>
      </div>`).join('');
  }

  // Top series
  const topSeries=document.getElementById('homeTopSeries');
  if(topSeries){
    const sMap={};
    ALL.forEach(c=>{ sMap[c.series]=(sMap[c.series]||0)+1; });
    const top=Object.entries(sMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
    topSeries.innerHTML=top.map(([name,cnt],i)=>`
      <div class="hts-row">
        <span class="hts-rank">#${i+1}</span>
        <span class="hts-name">${esc(name||'—')}</span>
        <span class="hts-count">${cnt}</span>
      </div>`).join('');
  }

  // Recent cards (last 10 by timestamp)
  const recentEl=document.getElementById('homeRecent');
  if(recentEl){
    const recent=[...ALL]
      .filter(c=>c.obtainedTimestamp)
      .sort((a,b)=>(+b.obtainedTimestamp||0)-(+a.obtainedTimestamp||0))
      .slice(0,10);
    recentEl.innerHTML=recent.map(c=>{
      const slug=toSlug(c.character||'');
      const ed=c.edition||'1';
      const img=CDN+slug+'-'+ed+'.jpg';
      return `<div class="home-recent-card" onclick="openCardModal('${esc(c.code||'')}')">
        <img class="home-recent-img" src="${img}" alt="${esc(c.character)}" loading="lazy" onerror="this.style.opacity='.2'">
        <div class="home-recent-info">
          <div class="home-recent-name">${esc(c.character)}</div>
        </div>
      </div>`;
    }).join('');
  }
}