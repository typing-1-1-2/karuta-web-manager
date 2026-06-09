// chunk: stats.js

function buildCharts(){

  destroyCharts();
  _buildStatKpis();
  _buildLuckyScore();

  const C=Chart, gc='rgba(255,255,255,0.05)', tc='#555c78', font={family:"'Outfit',sans-serif",size:12};
  const base={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
    scales:{x:{grid:{color:gc},ticks:{color:tc,font}},y:{grid:{color:gc},ticks:{color:tc,font}}}};

  const userId=_getUserId();
  const GRABBED=userId?ALL.filter(c=>c.grabber===userId):ALL;
  const QC={'0':'#555c78','1':'#60b8f0','2':'#41d9b0','3':'#a593ff','4':'#f06080'};

  const qMeds=[0,1,2,3,4].map(q=>{
    const ps=GRABBED.filter(c=>c.quality===String(q)&&+c.number>0).map(c=>+c.number).sort((a,b)=>a-b);
    return ps.length?ps[Math.floor(ps.length/2)]:0;
  });
  charts.pq=new C(document.getElementById('cPrintByQuality'),{type:'bar',data:{
    labels:['Sin ★','★','★★','★★★','★★★★'],
    datasets:[{data:qMeds,backgroundColor:['#555c78','#60b8f0','#41d9b0','#a593ff','#f06080'],borderRadius:6,borderSkipped:false}]
  },options:{...base,plugins:{...base.plugins,tooltip:{callbacks:{label:ctx=>`Mediana: #${ctx.parsed.y.toLocaleString()}`}}}}});

  const wlBuckets=[{l:'WL 0',lo:0,hi:0},{l:'WL 1–9',lo:1,hi:9},{l:'WL 10–49',lo:10,hi:49},
    {l:'WL 50–99',lo:50,hi:99},{l:'WL 100–499',lo:100,hi:499},{l:'WL 500+',lo:500,hi:99999}];
  const wlPrintData=wlBuckets.map(b=>{
    const cards=GRABBED.filter(c=>+c.wishlists>=b.lo&&+c.wishlists<=b.hi&&+c.number>0);
    return cards.length?Math.round(cards.reduce((s,c)=>s+(+c.number),0)/cards.length):null;
  });
  charts.wvp=new C(document.getElementById('cWlVsPrint'),{type:'line',data:{
    labels:wlBuckets.map(b=>b.l),
    datasets:[{data:wlPrintData,borderColor:'rgba(240,192,96,0.9)',backgroundColor:'rgba(240,192,96,0.08)',
      fill:true,tension:0.35,pointRadius:5,pointBackgroundColor:'rgba(240,192,96,0.9)',pointBorderColor:'#0d0f14',pointBorderWidth:2}]
  },options:{...base,plugins:{...base.plugins,tooltip:{callbacks:{label:ctx=>`Avg print: #${(ctx.parsed.y||0).toLocaleString()}`}}}}});

  const mGrabs={},mQ4={};
  GRABBED.forEach(c=>{
    const ts=+c.obtainedTimestamp;if(!ts)return;
    const m=new Date(ts).toISOString().slice(0,7);
    mGrabs[m]=(mGrabs[m]||0)+1;
    if(c.quality==='4')mQ4[m]=(mQ4[m]||0)+1;
  });
  const mKeys=Object.keys(mGrabs).sort();
  const MONTHS_ES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const MONTHS_EN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_JA=['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const MONTHS = _currentLang==='en' ? MONTHS_EN : _currentLang==='ja' ? MONTHS_JA : MONTHS_ES;
  const mLabels=mKeys.map(k=>{const[y,mo]=k.split('-');return MONTHS[+mo-1]+'\''+y.slice(2);});
  const mRates=mKeys.map(k=>mGrabs[k]?+((mQ4[k]||0)/mGrabs[k]*100).toFixed(1):0);
  charts.q4r=new C(document.getElementById('cQ4Rate'),{data:{
    labels:mLabels,
    datasets:[
      {type:'bar',label:t('cards'),data:mKeys.map(k=>mGrabs[k]),backgroundColor:'rgba(96,184,240,0.3)',borderRadius:4,yAxisID:'y'},
      {type:'line',label:'% ★★★★',data:mRates,borderColor:'rgba(240,96,128,0.9)',backgroundColor:'transparent',tension:0.35,pointRadius:4,pointBackgroundColor:'rgba(240,96,128,0.9)',yAxisID:'y2',borderWidth:2}
    ]
  },options:{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:true,labels:{color:'#8890a8',font,boxWidth:10}}},
    scales:{x:{grid:{color:gc},ticks:{color:tc,font,maxRotation:30}},
      y:{grid:{color:gc},ticks:{color:tc,font},position:'left'},
      y2:{grid:{color:'transparent'},ticks:{color:'rgba(240,96,128,0.7)',font,callback:v=>v+'%'},position:'right'}}}});

  const DAYS_ES=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const DAYS_EN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const DAYS_JA=['日','月','火','水','木','金','土'];
  const DAYS = _currentLang==='en' ? DAYS_EN : _currentLang==='ja' ? DAYS_JA : DAYS_ES;
  const wdCount=new Array(7).fill(0),wdQ4=new Array(7).fill(0);
  GRABBED.forEach(c=>{const ts=+c.obtainedTimestamp;if(!ts)return;const d=new Date(ts).getDay();wdCount[d]++;if(c.quality==='4')wdQ4[d]++;});
  charts.wd=new C(document.getElementById('cWeekday'),{type:'bar',data:{
    labels:DAYS,
    datasets:[
      {label:t('cards'),data:wdCount,backgroundColor:'rgba(165,147,255,0.55)',borderRadius:5,borderSkipped:false},
      {label:'★★★★',data:wdQ4,backgroundColor:'rgba(240,96,128,0.7)',borderRadius:5,borderSkipped:false}
    ]
  },options:{...base,plugins:{legend:{display:true,labels:{color:'#8890a8',font,boxWidth:10}}}}});

  const hm=new Array(24).fill(0);
  GRABBED.forEach(c=>{const ts=+c.obtainedTimestamp;if(!ts)return;hm[new Date(ts).getHours()]++;});
  charts.hr=new C(document.getElementById('cHours'),{type:'bar',data:{
    labels:Array.from({length:24},(_,i)=>i+'h'),
    datasets:[{data:hm,backgroundColor:hm.map((_,i)=>i>=22||i<6?'rgba(165,147,255,0.7)':i<12?'rgba(240,192,96,0.6)':i<18?'rgba(65,217,176,0.6)':'rgba(96,184,240,0.6)'),borderRadius:4,borderSkipped:false}]
  },options:{...base,scales:{x:{...base.scales.x,ticks:{...base.scales.x.ticks,maxRotation:0,autoSkip:false,font:{...font,size:10}}},y:base.scales.y}}});

  const sMap={};
  GRABBED.forEach(c=>{if(!sMap[c.series])sMap[c.series]=[];if(+c.number>0)sMap[c.series].push(+c.number);});
  const sMed=Object.entries(sMap)
    .filter(([,ps])=>ps.length>=5)
    .map(([s,ps])=>{ps.sort((a,b)=>a-b);return{s,med:ps[Math.floor(ps.length/2)],n:ps.length};})
    .sort((a,b)=>a.med-b.med).slice(0,15);
  const sH=Math.max(sMed.length*32+60,300);
  document.getElementById('topSeriesWrap').style.height=sH+'px';
  charts.s=new C(document.getElementById('cSeries'),{type:'bar',data:{
    labels:sMed.map(x=>`${x.s} (${x.n})`),
    datasets:[{data:sMed.map(x=>x.med),
      backgroundColor:sMed.map(x=>x.med<1000?'rgba(65,217,176,0.75)':x.med<10000?'rgba(165,147,255,0.6)':'rgba(85,92,120,0.5)'),
      borderRadius:5,borderSkipped:false,indexAxis:'y'}]
  },options:{...base,indexAxis:'y',
    plugins:{...base.plugins,tooltip:{callbacks:{label:ctx=>`Mediana: #${ctx.parsed.x.toLocaleString()}`}}},
    scales:{x:{...base.scales.x,ticks:{...base.scales.x.ticks,callback:v=>'#'+v.toLocaleString()}},
      y:{...base.scales.y,ticks:{color:tc,font:{family:"'Outfit'",size:11}}}}}});

  const qm={};ALL.forEach(c=>{const q=c.quality||'0';qm[q]=(qm[q]||0)+1;});
  const qk=Object.keys(qm).sort();
  charts.q=new C(document.getElementById('cQuality'),{type:'doughnut',data:{
    labels:qk.map(k=>QL[k]||k+'★'),
    datasets:[{data:qk.map(k=>qm[k]),backgroundColor:qk.map(k=>QC[k]||'#888'),borderWidth:0,hoverOffset:8}]
  },options:{responsive:true,maintainAspectRatio:false,cutout:'62%',
    plugins:{legend:{display:true,position:'right',labels:{color:'#8890a8',font,padding:14,boxWidth:12}},
      tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.parsed}`}}}}});

  const em={};ALL.forEach(c=>{const e=c.edition||'?';em[e]=(em[e]||0)+1;});
  const ek=Object.keys(em).sort((a,b)=>(+a||99)-(+b||99));
  charts.e=new C(document.getElementById('cEdition'),{type:'bar',data:{
    labels:ek.map(k=>'Ed.'+k),
    datasets:[{data:ek.map(k=>em[k]),backgroundColor:'rgba(165,147,255,0.7)',borderRadius:6,borderSkipped:false}]
  },options:{...base,scales:{x:{...base.scales.x,ticks:{...base.scales.x.ticks,autoSkip:false,maxRotation:0}},y:base.scales.y}}});

  const pb=[{l:'#1',max:1},{l:'2–3',max:3},{l:'4–10',max:10},{l:'11–50',max:50},{l:'51–100',max:100},{l:'101–500',max:500},{l:'501–1k',max:1000},{l:'1k–5k',max:5000},{l:'5k–10k',max:10000},{l:'>10k',max:Infinity}];
  const pc=new Array(pb.length).fill(0);
  GRABBED.forEach(c=>{const n=+c.number||0;const idx=pb.findIndex(b=>n<=b.max);if(idx>=0)pc[idx]++;});
  charts.pr=new C(document.getElementById('cPrints'),{type:'bar',data:{
    labels:pb.map(b=>b.l),
    datasets:[{data:pc,backgroundColor:['#f06080','#f06080','#a593ff','#a593ff','#41d9b0','#41d9b0','#60b8f0','#60b8f0','#555c78','#555c78'],borderRadius:5,borderSkipped:false}]
  },options:{...base}});

  const grades=['S','A','B','C','D','F'];
  const gcol={S:'rgba(65,217,176,0.7)',A:'rgba(96,184,240,0.7)',B:'rgba(165,147,255,0.7)',C:'rgba(240,192,96,0.7)',D:'rgba(240,96,128,0.7)',F:'rgba(85,92,120,0.5)'};
  const pur={};ALL.forEach(c=>{const g=c['worker.purity']||'F';pur[g]=(pur[g]||0)+1;});
  charts.pu=new C(document.getElementById('cPurity'),{type:'bar',data:{
    labels:grades,
    datasets:[{data:grades.map(g=>pur[g]||0),backgroundColor:grades.map(g=>gcol[g]),borderRadius:6,borderSkipped:false}]
  },options:{...base}});

  charts.mo=new C(document.getElementById('cMonths'),{type:'bar',data:{
    labels:mLabels,
    datasets:[{data:mKeys.map(k=>mGrabs[k]),backgroundColor:'rgba(96,184,240,0.65)',borderRadius:5,borderSkipped:false}]
  },options:{...base,scales:{x:{...base.scales.x,ticks:{color:tc,font,maxRotation:30}},y:base.scales.y}}});

  const sortedTs=GRABBED.map(c=>+c.obtainedTimestamp).filter(t=>t>0).sort((a,b)=>a-b);
  const step=Math.max(1,Math.floor(sortedTs.length/60));
  const cumLabels=[],cumData=[];
  const locale=_currentLang==='en'?'en-US':_currentLang==='ja'?'ja-JP':'es-ES';
  sortedTs.forEach((ts,i)=>{if(i%step===0||i===sortedTs.length-1){cumLabels.push(new Date(ts).toLocaleDateString(locale,{month:'short',year:'2-digit'}));cumData.push(i+1);}});
  charts.cum=new C(document.getElementById('cCumulative'),{type:'line',data:{
    labels:cumLabels,
    datasets:[{data:cumData,borderColor:'rgba(65,217,176,0.8)',backgroundColor:'rgba(65,217,176,0.06)',fill:true,tension:0.2,pointRadius:0,borderWidth:2}]
  },options:{...base,scales:{x:{...base.scales.x,ticks:{color:tc,font,maxRotation:30,autoSkip:true,maxTicksLimit:10}},y:base.scales.y}}});

  const et={};ALL.forEach(c=>{const tag=(c.tag&&c.tag.trim())||'(—)';if(!et[tag])et[tag]=[];et[tag].push(+c['worker.effort']||0);});
  const ef=Object.entries(et).map(([tag,v])=>[tag,Math.round(v.reduce((s,x)=>s+x,0)/v.length)]).sort((a,b)=>b[1]-a[1]).slice(0,12);
  charts.ef=new C(document.getElementById('cEffort'),{type:'bar',data:{
    labels:ef.map(([tag])=>tag),
    datasets:[{data:ef.map(([,v])=>v),backgroundColor:'rgba(240,192,96,0.65)',borderRadius:6,borderSkipped:false}]
  },options:{...base,scales:{x:{...base.scales.x,ticks:{color:tc,font,maxRotation:35}},y:base.scales.y}}});

  const q4ed={1:0,2:0,3:0,4:0,5:0,6:0,7:0};
  GRABBED.filter(c=>c.quality==='4').forEach(c=>{const e=+c.edition;if(q4ed[e]!==undefined)q4ed[e]++;});
  charts.q4e=new C(document.getElementById('cQ4ByEd'),{type:'bar',data:{
    labels:Object.keys(q4ed).map(e=>'Ed.'+e),
    datasets:[{data:Object.values(q4ed),backgroundColor:'rgba(240,96,128,0.7)',borderRadius:6,borderSkipped:false}]
  },options:{...base}});
}

function destroyCharts(){
Object.values(charts).forEach(c=>{try{c.destroy()}catch(e){}});charts={};}

function _buildStatKpis(){

  const total=ALL.length; if(!total) return;
  const userId=_getUserId();
  const GRABBED = userId ? ALL.filter(c=>c.grabber===userId) : ALL;
  const gTotal = GRABBED.length;

  const prints=GRABBED.map(c=>+c.number||0).filter(n=>n>0).sort((a,b)=>a-b);
  const wls=GRABBED.map(c=>+c.wishlists||0);
  const q4=GRABBED.filter(c=>c.quality==='4').length;
  const q3=GRABBED.filter(c=>c.quality==='3').length;
  const p1s=prints.filter(p=>p===1).length;
  const top10=prints.filter(p=>p<=10).length;
  const top100=prints.filter(p=>p<=100).length;
  const printMed=prints.length?prints[Math.floor(prints.length/2)]:0;
  const wlTotal=wls.reduce((s,w)=>s+w,0);
  const wlMax=Math.max(0,...wls);
  const wlOver100=wls.filter(w=>w>=100).length;
  const wlOver500=wls.filter(w=>w>=500).length;

  const gts=GRABBED.map(c=>+c.obtainedTimestamp).filter(t=>t>0).sort((a,b)=>a-b);
  const gDays=gts.length?(gts[gts.length-1]-gts[0])/86400000:0;
  const grabsPerDay=gDays>0?(gTotal/gDays).toFixed(1):gTotal;

  const dayCounts={};
  gts.forEach(ts=>{const d=new Date(ts).toISOString().slice(0,10);dayCounts[d]=(dayCounts[d]||0)+1;});
  const bestDay=Object.values(dayCounts).length?Math.max(...Object.values(dayCounts)):0;

  const activeDays=Object.keys(dayCounts).sort();
  let maxStreak=1,cur=1;
  for(let i=1;i<activeDays.length;i++){
    const prev=new Date(activeDays[i-1]),curr=new Date(activeDays[i]);
    const diff=(curr-prev)/86400000;
    cur=diff===1?cur+1:1;
    if(cur>maxStreak)maxStreak=cur;
  }

  const now=Date.now();
  const recent30=GRABBED.filter(c=>+c.obtainedTimestamp>now-30*86400000);
  const q4Rate30=recent30.length?((recent30.filter(c=>c.quality==='4').length/recent30.length)*100).toFixed(1):0;

  const uniqSeries=new Set(ALL.map(c=>c.series)).size;
  const uniqChars=new Set(ALL.map(c=>c.character)).size;

  const seriesQ4={};
  GRABBED.filter(c=>c.quality==='4').forEach(c=>{seriesQ4[c.series]=(seriesQ4[c.series]||0)+1;});
  const topSeriesQ4=Object.entries(seriesQ4).sort((a,b)=>b[1]-a[1])[0];

  const q4wls=GRABBED.filter(c=>c.quality==='4').map(c=>+c.wishlists||0);
  const avgQ4Wl=q4wls.length?Math.round(q4wls.reduce((s,w)=>s+w,0)/q4wls.length):0;

  const efforts=ALL.map(c=>+c['worker.effort']||0);
  const totalEffort=efforts.reduce((s,e)=>s+e,0);
  const morphed=ALL.filter(c=>c.morphed==='Yes').length;
  const trimmed=ALL.filter(c=>c.trimmed==='Yes').length;
  const withFrame=ALL.filter(c=>c.frame&&c.frame.trim()).length;

  // Translated KPI labels
  const kL={
    ownGrabs:     {es:'Grabs propios',    en:'Own grabs',       ja:'自グラブ'},
    printMed:     {es:'Print mediana',    en:'Median print',    ja:'中央プリント'},
    bestPrint:    {es:'Mejor print',      en:'Best print',      ja:'最高プリント'},
    print1:       {es:'Print #1',         en:'Print #1',        ja:'プリント#1'},
    prints10:     {es:'Prints ≤10',       en:'Prints ≤10',      ja:'プリント≤10'},
    prints100:    {es:'Prints ≤100',      en:'Prints ≤100',     ja:'プリント≤100'},
    q4grabbed:    {es:'★★★★ grabadas',   en:'★★★★ grabbed',  ja:'★★★★グラブ'},
    q3grabbed:    {es:'★★★ grabadas',    en:'★★★ grabbed',   ja:'★★★グラブ'},
    q4last30:     {es:'Q4 últimos 30d',   en:'Q4 last 30d',     ja:'Q4 直近30日'},
    wlAvgQ4:      {es:'WL media (Q4)',    en:'Avg WL (Q4)',     ja:'平均WL (Q4)'},
    grabs100wl:   {es:'Grabs ≥100 WL',   en:'Grabs ≥100 WL',  ja:'≥100 WLグラブ'},
    grabs500wl:   {es:'Grabs ≥500 WL',   en:'Grabs ≥500 WL',  ja:'≥500 WLグラブ'},
    grabsDay:     {es:'Grabs/día',        en:'Grabs/day',       ja:'グラブ/日'},
    bestDay:      {es:'Mejor día',        en:'Best day',        ja:'最高日'},
    longestStreak:{es:'Racha más larga',  en:'Longest streak',  ja:'最長連続'},
    uniqSeries:   {es:'Series distintas', en:'Unique series',   ja:'ユニークシリーズ'},
    withFrame:    {es:'Con marco',        en:'With frame',      ja:'フレームあり'},
    morphed:      {es:'Morphed',          en:'Morphed',         ja:'モーフ'},
    totalEffort:  {es:'Effort total',     en:'Total effort',    ja:'総努力度'},
    topQ4Series:  {es:'Serie top Q4',     en:'Top Q4 series',   ja:'Q4上位シリーズ'},
  };
  const lk = (key) => (kL[key]||{})[_currentLang||'es'] || (kL[key]||{}).es || key;

  const kpis=[
    {l:lk('ownGrabs'),     v:gTotal,                                        s:`de ${total} en colección`,                               c:'var(--accent2)'},
    {l:lk('printMed'),     v:'#'+printMed.toLocaleString(),                 s:`de tus ${gTotal} grabs`,                                 c:'var(--rose)'},
    {l:lk('bestPrint'),    v:'#'+(prints.length?Math.min(...prints).toLocaleString():'?'), s:'print más bajo grabado',                  c:'var(--gold)'},
    {l:lk('print1'),       v:p1s,                                           s:`carta${p1s!==1?'s':''} únicas`,                          c:'var(--teal)'},
    {l:lk('prints10'),     v:top10,                                         s:`${gTotal?((top10/gTotal)*100).toFixed(1):0}% de tus grabs`, c:'var(--accent2)'},
    {l:lk('prints100'),    v:top100,                                        s:`${gTotal?((top100/gTotal)*100).toFixed(1):0}% de tus grabs`, c:'var(--sky)'},
    {l:lk('q4grabbed'),    v:q4,                                            s:`${gTotal?((q4/gTotal)*100).toFixed(1):0}% tasa Q4`,     c:'var(--r4)'},
    {l:lk('q3grabbed'),    v:q3,                                            s:`${gTotal?((q3/gTotal)*100).toFixed(1):0}% tasa Q3`,     c:'var(--r3)'},
    {l:lk('q4last30'),     v:q4Rate30+'%',                                  s:`de ${recent30.length} grabs recientes`,                  c:'var(--rose)'},
    {l:lk('wlAvgQ4'),      v:avgQ4Wl.toLocaleString(),                      s:'wishlists por ★★★★ grabada',                            c:'var(--gold)'},
    {l:lk('grabs100wl'),   v:wlOver100,                                     s:`${gTotal?((wlOver100/gTotal)*100).toFixed(1):0}% cartas demand.`, c:'var(--accent2)'},
    {l:lk('grabs500wl'),   v:wlOver500,                                     s:'cartas muy demandadas',                                  c:'var(--rose)'},
    {l:lk('grabsDay'),     v:grabsPerDay,                                   s:`en ${Math.round(gDays)} días activos`,                   c:'var(--sky)'},
    {l:lk('bestDay'),      v:bestDay+' grabs',                              s:'en un solo día',                                         c:'var(--gold)'},
    {l:lk('longestStreak'),v:maxStreak+' '+t('days'||'días'),               s:'seguidos grabando',                                      c:'var(--teal)'},
    {l:lk('uniqSeries'),   v:uniqSeries,                                    s:`${uniqChars} personajes únicos`,                         c:'var(--accent2)'},
    {l:lk('withFrame'),    v:withFrame,                                     s:`${total?((withFrame/total)*100).toFixed(1):0}% colección`, c:'var(--sky)'},
    {l:lk('morphed'),      v:morphed,                                       s:`${total?((morphed/total)*100).toFixed(1):0}% / Trimmed: ${trimmed}`, c:'var(--accent2)'},
    {l:lk('totalEffort'),  v:totalEffort.toLocaleString(),                  s:'workers acumulados',                                     c:'var(--gold)'},
    {l:lk('topQ4Series'),  v:topSeriesQ4?topSeriesQ4[1]+'×':0,             s:topSeriesQ4?topSeriesQ4[0].slice(0,22):'—',               c:'var(--r4)'},
  ];
  document.getElementById('statKpiGrid').innerHTML=kpis.map(k=>`
    <div class="stat-kpi" style="--kc:${k.c}">
      <div class="stat-kpi-label">${k.l}</div>
      <div class="stat-kpi-val">${k.v}</div>
      <div class="stat-kpi-sub">${k.s}</div>
    </div>`).join('');
}

function _buildLuckyScore(){

  const total=ALL.length; if(!total){document.getElementById('statLucky').innerHTML='';return;}
  const userId=_getUserId();
  const GRABBED = userId ? ALL.filter(c=>c.grabber===userId) : ALL;
  const gTotal = GRABBED.length;
  if(!gTotal){
    document.getElementById('statLucky').innerHTML=`<div style="color:var(--text3);padding:1rem">${
      _currentLang==='en'?'No grabbed cards detected.':
      _currentLang==='ja'?'グラブ済みカードが見つかりません。':
      'No se detectaron cartas grabadas por ti.'
    }</div>`;
    return;
  }

  const prints=GRABBED.map(c=>+c.number||0).filter(n=>n>0).sort((a,b)=>a-b);
  const wls=GRABBED.map(c=>+c.wishlists||0);
  const q4=GRABBED.filter(c=>c.quality==='4').length;
  const q3=GRABBED.filter(c=>c.quality==='3').length;

  const printMed=prints.length?prints[Math.floor(prints.length/2)]:99999;
  const printScore=Math.max(0,Math.min(100,100-Math.log10(printMed+1)*20));
  const top10=prints.filter(p=>p<=10).length;
  const topPrintBonus=Math.min(40,top10*8);
  const wlAvg=wls.reduce((s,w)=>s+w,0)/wls.length;
  const wlScore=Math.min(100,wlAvg/5);
  const qualScore=((q4/gTotal)*100*1.5+(q3/gTotal)*100*0.8);
  const raw=(printScore*0.35+topPrintBonus*0.5+wlScore*0.2+Math.min(100,qualScore)*0.25);
  const score=Math.round(Math.min(100,raw));

  const grades={
    es:[
      {g:'S',col:'var(--teal)',  txt:'¡Suerte legendaria!'},
      {g:'A',col:'var(--sky)',   txt:'Muy buena suerte'},
      {g:'B',col:'var(--accent2)',txt:'Buena suerte'},
      {g:'C',col:'var(--gold)',  txt:'Suerte normal'},
      {g:'D',col:'var(--rose)',  txt:'Algo de mala suerte'},
      {g:'F',col:'var(--text3)', txt:'Las cartas no te favorecen'},
    ],
    en:[
      {g:'S',col:'var(--teal)',  txt:'Legendary luck!'},
      {g:'A',col:'var(--sky)',   txt:'Very good luck'},
      {g:'B',col:'var(--accent2)',txt:'Good luck'},
      {g:'C',col:'var(--gold)',  txt:'Average luck'},
      {g:'D',col:'var(--rose)',  txt:'Below average luck'},
      {g:'F',col:'var(--text3)', txt:'The cards are against you'},
    ],
    ja:[
      {g:'S',col:'var(--teal)',  txt:'伝説の運！'},
      {g:'A',col:'var(--sky)',   txt:'非常に良い運'},
      {g:'B',col:'var(--accent2)',txt:'良い運'},
      {g:'C',col:'var(--gold)',  txt:'普通の運'},
      {g:'D',col:'var(--rose)',  txt:'やや不運'},
      {g:'F',col:'var(--text3)', txt:'カードに恵まれていない'},
    ],
  };
  const lang = _currentLang||'es';
  const gradeList = grades[lang] || grades.es;
  const grade = score>=90?gradeList[0]:score>=75?gradeList[1]:score>=55?gradeList[2]:score>=35?gradeList[3]:score>=20?gradeList[4]:gradeList[5];

  const p1s=prints.filter(p=>p===1).length;
  const wlMax=Math.max(0,...wls);
  const wlOver500=wls.filter(w=>w>=500).length;
  const printMin=prints.length?Math.min(...prints):0;
  const ts=GRABBED.map(c=>+c.obtainedTimestamp).filter(t=>t>0);
  const locale=lang==='en'?'en-US':lang==='ja'?'ja-JP':'es-ES';
  const firstDate=ts.length?new Date(Math.min(...ts)).toLocaleDateString(locale,{year:'numeric',month:'long',day:'numeric'}):'—';
  const totalDays=ts.length?Math.round((Math.max(...ts)-Math.min(...ts))/86400000):0;
  const grabsPerDay=totalDays>0?(gTotal/totalDays).toFixed(1):gTotal;

  const factLabels={
    es:['Grabbing desde','Total grabs propios','Grabs/día','Mejor print grabado','Prints #1 grabados','WL más alta grabada','Grabs ≥500 WL','★★★★ grabadas','★★★ grabadas'],
    en:['Grabbing since','Total own grabs','Grabs/day','Best grabbed print','Prints #1 grabbed','Highest WL grabbed','Grabs ≥500 WL','★★★★ grabbed','★★★ grabbed'],
    ja:['グラブ開始','自グラブ合計','グラブ/日','最高プリント','#1プリント','最高WL','≥500 WLグラブ','★★★★グラブ','★★★グラブ'],
  };
  const fl = factLabels[lang] || factLabels.es;

  const facts=[
    [fl[0], firstDate],
    [fl[1], gTotal+' / '+total],
    [fl[2], grabsPerDay],
    [fl[3], '#'+printMin],
    [fl[4], p1s+' carta'+(p1s!==1?'s':'')],
    [fl[5], wlMax.toLocaleString()+' wishlists'],
    [fl[6], wlOver500+' carta'+(wlOver500!==1?'s':'')],
    [fl[7], q4+' ('+((q4/gTotal)*100).toFixed(1)+'%)'],
    [fl[8], q3+' ('+((q3/gTotal)*100).toFixed(1)+'%)'],
  ];

  document.getElementById('statLucky').innerHTML=`
    <div class="lucky-score-wrap">
      <div class="lucky-score-num">${score}</div>
      <div class="lucky-score-label">Luck Score</div>
      <div class="lucky-score-grade" style="background:${grade.col}22;color:${grade.col};border:1px solid ${grade.col}55">${grade.g} — ${grade.txt}</div>
    </div>
    <div class="lucky-facts">
      ${facts.map(([k,v])=>`<div class="lucky-fact"><span>${k}</span><span>${v}</span></div>`).join('')}
    </div>`;
}
