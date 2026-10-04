/* Bab 3: hierarki PDRB 38 provinsi x 17 lapangan usaha. Ukuran = PDRB ADHK 2024, warna = pertumbuhan riil 2023-2024.
   Dua representasi (treemap dan icicle), dua urutan hierarki, drill-down dengan breadcrumb. */
(function(){
  const $=id=>document.getElementById(id), fmt1=W.fmt1, fmt2=W.fmt2;
  const WIL={Sumatera:['Aceh','Sumatera Utara','Sumatera Barat','Riau','Jambi','Sumatera Selatan','Bengkulu','Lampung','Kepulauan Bangka Belitung','Kepulauan Riau'],
    Jawa:['DKI Jakarta','Jawa Barat','Jawa Tengah','DI Yogyakarta','Jawa Timur','Banten'],
    'Bali dan Nusa Tenggara':['Bali','Nusa Tenggara Barat','Nusa Tenggara Timur'],
    Kalimantan:['Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara'],
    Sulawesi:['Sulawesi Utara','Sulawesi Tengah','Sulawesi Selatan','Sulawesi Tenggara','Gorontalo','Sulawesi Barat'],
    'Maluku dan Papua':['Maluku','Maluku Utara','Papua Barat','Papua Barat Daya','Papua','Papua Selatan','Papua Tengah','Papua Pegunungan']};
  const wilOf=p=>Object.keys(WIL).find(w=>WIL[w].includes(p));
  const SEG=[['wil','Wilayah › Provinsi › Lapangan usaha'],['sek','Lapangan usaha › Provinsi']];
  let H,urut='wil',path=[],root,col;

  W.load('hierarki_pdrb').then(h=>{
    H=h; H.IA=H.kategori.findIndex(k=>k.kode==='I');
    H.rows=H.data.map(([p,k,a,b])=>({p:H.provinsi[p],k:H.kategori[k],ki:k,a,b,g:a?(b/a-1)*100:null}));
    const R=H.rows, tot=d3.sum(R,r=>r.b), ia=d3.sum(R.filter(r=>r.ki===H.IA),r=>r.b);
    const gIA=(ia/d3.sum(R.filter(r=>r.ki===H.IA),r=>r.a)-1)*100, gAll=(tot/d3.sum(R,r=>r.a)-1)*100;
    const top=d3.rollups(R.filter(r=>r.ki===H.IA),v=>d3.sum(v,r=>r.b),r=>r.p).sort((x,y)=>y[1]-x[1]);
    $('hStat').innerHTML=`Akomodasi dan makan minum menyumbang ${W.pct(ia,tot,1)} dari PDRB (ADHK) 38 provinsi pada 2024 dan tumbuh ${fmt1.format(gIA)}% dibanding 2023, ${gIA>gAll?'di atas':'di bawah'} pertumbuhan seluruh ekonomi (${fmt1.format(gAll)}%). ${top[0][0]} saja memegang ${W.pct(top[0][1],ia,0)} dari nilai sektor ini.`;
    const gs=R.map(r=>r.g).filter(v=>v!=null).sort(d3.ascending), gmin=d3.quantile(gs,.05), gmax=d3.quantile(gs,.95);
    col=d3.scaleSequential(d3.interpolateViridis).domain([gmin,gmax]).clamp(true);
    $('hLegend').innerHTML=`<span>${fmt1.format(gmin)}%</span><div class="bar" style="background:linear-gradient(90deg,${[0,.25,.5,.75,1].map(t=>d3.interpolateViridis(t)).join(',')})"></div><span>${fmt1.format(gmax)}%</span><span>&nbsp;pertumbuhan riil 2023→2024</span>`;
    $('srcH').innerHTML=W.sumber(H.meta,'PDRB ADHK menurut provinsi dan 17 lapangan usaha','pdrb');
    $('hNote').textContent='Angka 2023 sementara dan 2024 sangat sementara (BPS). Pertumbuhan memakai nilai ADHK sehingga sudah mengabaikan inflasi.';
    seg(); build(); W.onResize(draw);
  }).catch(e=>W.fail('hStat',e));

  function seg(){ W.segmen('segUrut',SEG,()=>urut,v=>{urut=v;seg();build();}); }
  function build(){
    const R=H.rows;
    root = urut==='wil'
      ? {name:'Indonesia',children:Object.keys(WIL).map(w=>({name:w,children:WIL[w].map(p=>({name:p,children:R.filter(r=>r.p===p).map(r=>({name:r.k.pendek,rows:[r],ia:r.ki===H.IA}))}))}))}
      : {name:'Indonesia',children:H.kategori.map((k,i)=>({name:k.pendek,ia:i===H.IA,children:H.provinsi.map(p=>({name:p,rows:R.filter(r=>r.ki===i&&r.p===p),ia:i===H.IA}))}))};
    (function fill(n){
      if(n.children){ n.children.forEach(fill); n.rows=n.children.flatMap(c=>c.rows); n.ia=n.children.every(c=>c.ia); }
      const a=d3.sum(n.rows,r=>r.a), b=d3.sum(n.rows,r=>r.b); n.v=b; n.g=a?(b/a-1)*100:null;
    })(root);
    path=[]; draw();
  }
  function nodeAt(){ let n=root; for(const nm of path) n=n.children.find(c=>c.name===nm); return n; }
  function crumb(){
    const c=$('hCrumb'); c.innerHTML=''; const parts=['Indonesia',...path];
    parts.forEach((nm,i)=>{
      if(i<parts.length-1){ const b=document.createElement('button'); b.type='button'; b.textContent=nm; b.onclick=()=>{path=path.slice(0,i);draw();}; c.append(b,' › '); }
      else { const s=document.createElement('span'); s.className='now'; s.textContent=nm; c.append(s); }
    });
  }
  const clip=(s,n)=>s.length>n?s.slice(0,Math.max(1,n-1))+'…':s;
  const tip=d=>`<b>${d.name}</b><br>PDRB 2024: ${fmt2.format(d.v/1000)} triliun rupiah (ADHK)<br>Pertumbuhan 2023→2024: ${d.g==null?'–':fmt1.format(d.g)+'%'}`+(d.ia?'<br><i>Akomodasi dan makan minum</i>':'')+(d.children?'<br><i>Klik untuk rincian</i>':'');
  const txt=d=>d.g!=null&&d3.lab(col(d.g)).l>55?'#1D3557':'#fff';

  function draw(){
    if(!H||!root) return; W.hideTip(); crumb();
    const n=nodeAt(), kids=n.children||[], el=$('treemap'), Wd=W.lebar(el), mob=Wd<560;
    el.innerHTML=''; const Ht=mob?420:480;
    const svg=d3.select(el).append('svg').attr('viewBox',[0,0,Wd,Ht]).attr('role','img').attr('aria-label','Treemap PDRB: ukuran = besar PDRB, warna = pertumbuhan riil');
    const ic=$('icicle'); ic.innerHTML='';
    if(!n.children){
      svg.append('text').attr('x',Wd/2).attr('y',Ht/2).attr('text-anchor','middle').attr('font-size',14).text(`${n.name}: ${fmt2.format(n.v/1000)} triliun rupiah, tumbuh ${n.g==null?'–':fmt1.format(n.g)+'%'}`);
      return;
    }
    const t=d3.treemap().size([Wd,Ht]).paddingInner(2).round(true)(d3.hierarchy({children:kids.map(k=>({...k,children:null,kids:k.children}))}).sum(d=>d.v||0).sort((a,b)=>b.value-a.value));
    const go=d=>{ if(d.data.kids){ path=[...path,d.data.name]; draw(); } };
    const g=svg.selectAll('g').data(t.leaves()).join('g').attr('transform',d=>`translate(${d.x0},${d.y0})`);
    g.append('rect').attr('width',d=>d.x1-d.x0).attr('height',d=>d.y1-d.y0).attr('rx',3).attr('fill',d=>d.data.g==null?'#ccc':col(d.data.g))
      .attr('stroke',d=>d.data.ia?'#E69F00':'none').attr('stroke-width',d=>d.data.ia?3:0).style('cursor',d=>d.data.kids?'pointer':'default').attr('tabindex',d=>d.data.kids?0:null)
      .on('click',(ev,d)=>go(d)).on('keydown',(ev,d)=>{ if(ev.key==='Enter') go(d); })
      .on('pointermove',(ev,d)=>W.showTip(ev,tip({...d.data,children:d.data.kids}))).on('pointerleave',W.hideTip);
    g.append('text').style('pointer-events','none').attr('x',6).attr('y',16).attr('font-size',12).attr('font-weight',700).style('fill',d=>txt(d.data))
      .text(d=>(d.x1-d.x0>58&&d.y1-d.y0>24)?clip(d.data.name,Math.floor((d.x1-d.x0)/6.8)):'');
    // icicle: tiga tingkat dari simpul aktif
    const levels=[]; let cur=[n];
    while(cur.length&&levels.length<3){ levels.push(cur); cur=cur.flatMap(c=>c.children||[]); }
    const rh=mob?26:30, Hi=levels.length*rh+4, s2=d3.select(ic).append('svg').attr('viewBox',[0,0,Wd,Hi]).attr('role','img').attr('aria-label','Icicle hierarki PDRB');
    const x0=new Map([[n,0]]);
    levels.forEach((lv,i)=>lv.forEach(nd=>{
      const x=x0.get(nd), w=nd.v/n.v*Wd; if(!(w>0)) return;
      let off=x; (nd.children||[]).forEach(c=>{ x0.set(c,off); off+=c.v/n.v*Wd; });
      const gg=s2.append('g').attr('transform',`translate(${x},${i*rh})`);
      gg.append('rect').attr('width',Math.max(0,w-1)).attr('height',rh-2).attr('rx',2).attr('fill',nd.g==null?'#ccc':col(nd.g)).attr('stroke',nd.ia?'#E69F00':'none').attr('stroke-width',nd.ia?2.5:0)
        .on('pointermove',ev=>W.showTip(ev,tip(nd))).on('pointerleave',W.hideTip);
      if(w>54) gg.append('text').attr('x',5).attr('y',rh/2).attr('dy','0.3em').attr('font-size',11).style('pointer-events','none').style('fill',txt(nd)).text(clip(nd.name,Math.floor(w/6.4)));
    }));
  }
})();
