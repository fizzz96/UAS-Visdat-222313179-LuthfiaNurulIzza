/* Bab 1: Sankey (drill-down kawasan -> negara) dengan scrollytelling, dan matriks asal-tujuan (OD).
   Teknik aliran #1 (Sankey) dan #2 (matriks OD). Semua teks langkah dihitung dari data. */
(function(){
  const WARNA = W.KAW, fmt = W.fmt, fmt1 = W.fmt1;
  let DATA, VIEW='semua';
  const $ = id => document.getElementById(id);

  W.aliran.then(d=>{
    DATA=d;
    $('srcAliran').innerHTML = W.sumber(d.meta,'Kunjungan wisman 2024 menurut kebangsaan dan pintu masuk','aliran');
    tampil('semua'); gambarOD(); isiLangkah(); pasangScrolly();
    W.onResize(()=>{ tampil(VIEW); gambarOD(); });
  }).catch(e=>W.fail('sankey',e));

  function crumb(){
    const c=$('crumb'); c.innerHTML='';
    const now=t=>{ const s=document.createElement('span'); s.className='now'; s.textContent=t; return s; };
    if(VIEW==='semua') c.append(now('Semua kawasan'));
    else { const b=document.createElement('button'); b.type='button'; b.textContent='Semua kawasan'; b.onclick=()=>tampil('semua'); c.append(b,' › ',now(VIEW)); }
  }

  function gambar(nodes,links,onNode){
    const el=$('sankey'); el.innerHTML='';
    const Wd=W.lebar(el), mob=Wd<560, m={t:8,r:mob?104:170,b:8,l:mob?94:120};
    const H=Math.max(mob?520:440,nodes.length*(mob?27:24));
    const svg=d3.select(el).append('svg').attr('viewBox',[0,0,Wd,H]).attr('role','img').attr('aria-label','Diagram Sankey aliran wisatawan mancanegara 2024');
    const sk=d3.sankey().nodeId(d=>d.id).nodeAlign(d3.sankeyLeft).nodeWidth(12).nodePadding(mob?10:12).extent([[m.l,m.t],[Wd-m.r,H-m.b]]);
    const g=sk({nodes:nodes.map(d=>({...d})),links:links.map(d=>({...d}))});
    const fs=mob?9.5:12;
    svg.append('g').attr('fill','none').selectAll('path').data(g.links).join('path')
      .attr('d',d3.sankeyLinkHorizontal()).attr('stroke',d=>d.color).attr('stroke-width',d=>Math.max(1,d.width)).attr('stroke-opacity',.45)
      .on('pointermove',(ev,d)=>{ d3.select(ev.currentTarget).attr('stroke-opacity',.8);
        W.showTip(ev,`<b>${d.source.label} → ${d.target.label}</b><br>${fmt.format(d.value)} kunjungan<br>${W.pct(d.value,DATA.meta.total)} dari total wisman 2024`); })
      .on('pointerleave',ev=>{ d3.select(ev.currentTarget).attr('stroke-opacity',.45); W.hideTip(); });
    const n=svg.append('g').selectAll('g').data(g.nodes).join('g');
    n.append('rect').attr('x',d=>d.x0).attr('y',d=>d.y0).attr('width',d=>d.x1-d.x0).attr('height',d=>Math.max(1,d.y1-d.y0)).attr('fill',d=>d.color)
      .attr('class',d=>d.klik?'node-k':null).attr('tabindex',d=>d.klik?0:null)
      .on('pointermove',(ev,d)=>W.showTip(ev,`<b>${d.label}</b><br>${fmt.format(d.value)} kunjungan`+(d.klik?'<br><i>Klik untuk rincian</i>':''))).on('pointerleave',W.hideTip)
      .on('click',(ev,d)=>d.klik&&onNode(d)).on('keydown',(ev,d)=>{ if(d.klik&&ev.key==='Enter') onNode(d); });
    n.append('text').attr('font-size',fs).attr('dy','0.35em').attr('x',d=>d.targetLinks.length?d.x1+6:d.x0-6).attr('y',d=>(d.y0+d.y1)/2)
      .attr('text-anchor',d=>d.targetLinks.length?'start':'end').text(d=>mob?d.label.replace(/ \(.*\)$/,''):d.label)
      .style('cursor',d=>d.klik?'pointer':null).on('click',(ev,d)=>d.klik&&onNode(d));
  }

  function tampil(v){
    VIEW=v; crumb(); W.hideTip();
    const P=Object.fromEntries(DATA.pintu.map(p=>[p.id,p])), note=$('sankeyNote'), warnaPintu='#4a5160';
    if(v==='semua'){
      const nodes=[...DATA.kawasan.map(k=>({id:'k:'+k.id,label:k.nama,color:WARNA[k.id],klik:k.id})),...DATA.pintu.map(p=>({id:'p:'+p.id,label:p.nama_pendek,color:warnaPintu}))];
      const links=DATA.links.map(l=>({source:'k:'+l.kawasan,target:'p:'+l.pintu,value:l.nilai,color:WARNA[l.kawasan]}));
      gambar(nodes,links,d=>tampil(d.klik));
      note.textContent='* Perbatasan Laut/Darat adalah agregat BPS tanpa lokasi rinci. "Pintu lainnya" menggabungkan 19 pintu kecil.';
    } else {
      const rows=DATA.negara.filter(r=>r.kawasan===v), pid=[...new Set(rows.map(r=>r.pintu))], ng=[...new Set(rows.map(r=>r.negara))];
      const nodes=[...ng.map(n=>({id:'n:'+n,label:n,color:WARNA[v]})),...pid.map(i=>({id:'p:'+i,label:P[i].nama_pendek,color:warnaPintu}))];
      const links=rows.map(r=>({source:'n:'+r.negara,target:'p:'+r.pintu,value:r.nilai,color:WARNA[v]}));
      gambar(nodes,links,()=>{});
      note.textContent=`Rincian negara asal untuk kawasan ${v}. Gunakan "Semua kawasan" di atas untuk kembali.`;
    }
  }

  /* ---- teks langkah (dihitung dari data) ---- */
  function isiLangkah(){
    const T=DATA.meta.total, num=n=>fmt.format(n);
    const topPintu=kaw=>{ const c={}; DATA.links.filter(l=>!kaw||l.kawasan===kaw).forEach(l=>c[l.pintu]=(c[l.pintu]||0)+l.nilai);
      const tot=Object.values(c).reduce((a,b)=>a+b,0), nm=Object.fromEntries(DATA.pintu.map(p=>[p.id,p.nama_pendek]));
      return {tot,list:Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([i,v])=>({n:nm[i],v}))}; };
    const a=topPintu(), k={}; DATA.links.forEach(l=>k[l.kawasan]=(k[l.kawasan]||0)+l.nilai);
    const kk=Object.entries(k).sort((x,y)=>y[1]-x[1]), as=topPintu(kk[0][0]), eu=topPintu('Eropa');
    $('st0').textContent=`Total ${num(T)} kunjungan wisman 2024 mengalir dari ${DATA.kawasan.length} kawasan asal ke ${DATA.pintu.length} kelompok pintu masuk. Lebar pita = jumlah kunjungan.`;
    $('st1').textContent=`${a.list[0].n} menerima ${W.pct(a.list[0].v,T)} dan ${a.list[1].n} ${W.pct(a.list[1].v,T)}: berdua ${W.pct(a.list[0].v+a.list[1].v,T)} dari seluruh kunjungan. Pintu masuk bukan destinasi: data ini mencatat tempat masuk, bukan ke mana wisman pergi setelahnya.`;
    $('st2').textContent=`${kk[0][0]} adalah kawasan asal terbesar (${W.pct(kk[0][1],T)}). Pintu utamanya ${as.list[0].n} (${W.pct(as.list[0].v,as.tot)} dari kunjungan kawasan ini), disusul ${as.list[1].n}. Polanya paling tersebar dibanding kawasan lain.`;
    $('st3').textContent=`Eropa menyumbang ${W.pct(k['Eropa'],T)}. Sangat terkonsentrasi: ${eu.list[0].n} menampung ${W.pct(eu.list[0].v,eu.tot)} wisman Eropa, ${eu.list[1].n} ${W.pct(eu.list[1].v,eu.tot)}.`;
  }
  function pasangScrolly(){
    const steps=[...document.querySelectorAll('#steps .step')];
    if(!('IntersectionObserver' in window)){ steps.forEach(s=>s.style.opacity=1); return; }
    let cur=null;
    const io=new IntersectionObserver(es=>es.forEach(e=>{ if(!e.isIntersecting) return;
      steps.forEach(s=>s.classList.toggle('is-active',s===e.target));
      const v=e.target.dataset.view; if(v!==cur){ cur=v; tampil(v); } }),{rootMargin:'-42% 0px -42% 0px'});
    steps.forEach(s=>io.observe(s));
  }

  /* ---- matriks asal-tujuan ---- */
  let ODM='jml';
  function gambarOD(){
    const el=$('odChart'); el.innerHTML='';
    const K=DATA.kawasan, P=DATA.pintu, V=new Map();
    DATA.links.forEach(l=>{ const k=l.kawasan+'|'+l.pintu; V.set(k,(V.get(k)||0)+l.nilai); });
    const raw=(k,p)=>V.get(k.id+'|'+p.id)||0, rt=Object.fromEntries(K.map(k=>[k.id,d3.sum(P,p=>raw(k,p))]));
    const pt=Object.fromEntries(P.map(p=>[p.id,d3.sum(K,k=>raw(k,p))])), G=d3.sum(Object.values(rt));
    const lq=(k,p)=>rt[k.id]&&pt[p.id]? (raw(k,p)/rt[k.id])/(pt[p.id]/G) : 0;
    const val=(k,p)=>ODM==='jml'?raw(k,p):ODM==='pangsa'?(rt[k.id]?raw(k,p)/rt[k.id]*100:0):lq(k,p);
    const Wd=W.lebar(el), mob=Wd<560, m={t:mob?84:100,r:mob?46:66,b:6,l:mob?82:118}, cw=(Wd-m.l-m.r)/P.length, ch=mob?30:36, H=m.t+m.b+K.length*ch;
    const cells=K.flatMap((k,i)=>P.map((p,j)=>({k,p,i,j,v:val(k,p),r:raw(k,p)}))), mx=d3.max(cells,c=>c.v)||1;
    const cl=x=>Math.max(-2,Math.min(2,Math.log2(Math.max(x,1e-6)))), div=x=>d3.interpolatePuOr(.5-cl(x)/4);
    const col=ODM==='lq'?(v=>div(v)):d3.scaleSequentialSqrt(d3.interpolateViridis).domain([0,mx]);
    const short=v=>ODM==='lq'?fmt1.format(v)+'×':ODM==='pangsa'?fmt1.format(v)+'%':v>=1e6?fmt1.format(v/1e6)+' jt':v>=1e3?Math.round(v/1e3)+' rb':String(Math.round(v));
    const svg=d3.select(el).append('svg').attr('viewBox',[0,0,Wd,H]).attr('role','img').attr('aria-label','Matriks kunjungan wisatawan mancanegara 2024: kawasan asal menurut pintu masuk');
    svg.selectAll('.kl').data(K).join('text').attr('x',m.l-6).attr('y',(k,i)=>m.t+i*ch+ch/2).attr('dy','0.35em').attr('text-anchor','end').attr('font-size',mob?10.5:12.5).text(k=>k.nama);
    svg.selectAll('.pl').data(P).join('text').attr('transform',(p,j)=>`translate(${m.l+j*cw+cw/2},${m.t-6}) rotate(-50)`).attr('font-size',mob?9.5:11).text(p=>p.nama_pendek.replace(/ \(.*\)$/,'').replace('Perbatasan','Perb.').slice(0,mob?13:18));
    const g=svg.selectAll('g.c').data(cells).join('g');
    g.append('rect').attr('x',c=>m.l+c.j*cw+1).attr('y',c=>m.t+c.i*ch+1).attr('width',Math.max(1,cw-2)).attr('height',ch-2).attr('rx',2).attr('fill',c=>col(c.v))
      .on('pointermove',(ev,c)=>W.showTip(ev,`<b>${c.k.nama} → ${c.p.nama_pendek}</b><br>${fmt.format(c.r)} kunjungan<br>${fmt1.format(rt[c.k.id]?c.r/rt[c.k.id]*100:0)}% dari kunjungan kawasan ini<br>indeks spesialisasi ${fmt1.format(lq(c.k,c.p))}× rata-rata`)).on('pointerleave',W.hideTip);
    const lum=c=>d3.lab(col(c.v)).l;
    g.append('text').attr('x',c=>m.l+c.j*cw+cw/2).attr('y',c=>m.t+c.i*ch+ch/2).attr('dy','0.35em').attr('text-anchor','middle').attr('font-size',mob?8.5:10.5).style('pointer-events','none')
      .style('fill',c=>lum(c)>55?'#1D3557':'#fff').text(c=>(cw<(mob?30:40)||c.v<=0)?'':short(c.v));
    const lg=$('odLegend');
    if(ODM==='lq'){
      const st=[0,.25,.5,.75,1].map(t=>d3.interpolatePuOr(t)).join(',');
      lg.innerHTML=`<span>0,25×</span><div class="bar" style="background:linear-gradient(90deg,${[1,.75,.5,.25,0].map(t=>d3.interpolatePuOr(t)).join(',')})"></div><span>4×</span>`;
    } else {
      const st=[0,.25,.5,.75,1].map(t=>d3.interpolateViridis(t)).join(',');
      lg.innerHTML=`<span>0</span><div class="bar" style="background:linear-gradient(90deg,${st})"></div><span>${ODM==='pangsa'?fmt1.format(mx)+'%':fmt.format(mx)}</span>`;
    }
    $('odNote').textContent = ODM==='lq'
      ? 'Indeks spesialisasi = pangsa pintu itu dalam kunjungan kawasan, dibagi pangsa pintu itu dalam seluruh kunjungan. 1× = sama dengan rata-rata; di atas 1× (ungu) kawasan itu memilih pintu tersebut lebih sering dari wisman pada umumnya; di bawah 1× (cokelat) lebih jarang. Skala logaritmik, dipotong pada 0,25× dan 4×. "Perbatasan Laut/Darat" adalah agregat BPS tanpa lokasi rinci.'
      : (ODM==='pangsa'?'Pangsa = persen dari total kunjungan kawasan itu (tiap baris berjumlah 100%). ':'Satuan: kunjungan. ')+'Warna memakai skala akar kuadrat (Viridis) agar sel kecil tetap terbaca. "Perbatasan Laut/Darat" adalah agregat BPS tanpa lokasi rinci.';
    $('srcOD').innerHTML=W.sumber(DATA.meta,'Matriks kawasan asal × pintu masuk, kunjungan wisman 2024','aliran');
    W.segmen('segOD',[['jml','Jumlah kunjungan'],['pangsa','Pangsa per kawasan (%)'],['lq','Indeks spesialisasi (×)']],()=>ODM,v=>{ODM=v;gambarOD();});
  }
})();
