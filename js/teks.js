/* Bab 4: teks. Awan kata (status hilang/muncul/bertahan), tren kata, jaringan bigram. Korpus: 127 BRS pariwisata. */
(function(){
  const $=id=>document.getElementById(id), fmt=W.fmt, fmt1=W.fmt1;
  const C={hilang:'#D55E00',muncul:'#0072B2',tetap:'#5b6676'}, K=45;
  const BAND={
    cut:{a:'sebelum',b:'sesudah',la:'sebelum Jul 2023',lb:'sesudah Jul 2023',lab:'Sebelum vs sesudah Jul 2023'},
    pan:{a:'pra',b:'pulih',la:'pra-pandemi',lb:'pemulihan',lab:'Pra-pandemi vs pemulihan'}};
  let AW,TR,BG,META,mode='cut',sisi='both',pos=[];
  const tok=k=>AW.meta.segmen_token[k];

  Promise.all([W.load('teks_awan'),W.load('teks_tren'),W.load('teks_bigram'),W.load('teks_meta')]).then(([a,t,b,m])=>{
    AW=a;TR=t;BG=b;META=m;
    document.querySelectorAll('[data-src=teks]').forEach(e=>e.innerHTML=W.sumber({},'Korpus 127 Berita Resmi Statistik pariwisata, Nov 2015–Agu 2026 (diolah)','brs'));
    $('teksNote').textContent=`Korpus: ${m.n_dokumen} dokumen, ${fmt.format(m.n_token_total)} kata setelah pembersihan. Bulan tanpa dokumen: ${m.bulan_tanpa_dokumen.join(', ')}. ${m.dokumen_dobel_dibuang.length} dokumen ganda dibuang.`;
    segs(); kataUI(); bigramUI(); lead();
    (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(()=>{ build(); });
    W.onResize(()=>{build();trenKata();bigram();});
  }).catch(e=>W.fail('teksLead',e));

  function segs(){
    W.segmen('segBanding',Object.entries(BAND).map(([k,v])=>[k,v.lab]),()=>mode,v=>{mode=v;sisi='both';segs();build();});
    const B=BAND[mode];
    W.segmen('segSisi',[['a','Hanya '+B.la],['both','Keduanya'],['b','Hanya '+B.lb]],()=>sisi,v=>{sisi=v;segs();paint(true);});
  }
  function lead(){
    const g=w=>AW.kata.find(x=>x.w===w);
    const p=g('penumpang'), j=g('perjalanan');
    const ok=p&&j&&TR.kata.penumpang&&TR.kata.perjalanan, CUT='2023-08';
    // jumlah dokumen (bulan data) yang memuat kata, sebelum dan sejak data Agustus 2023
    const ada=(ws,sisi)=>{ let n=0,tot=0; TR.bulan.forEach((b,i)=>{ if((b<CUT)!==sisi) return; const v=ws.map(w=>TR.kata[w]&&TR.kata[w][i]); if(v.every(x=>x==null)) return; tot++; if(v.some(x=>x>0)) n++; }); return [n,tot]; };
    if(!ok){ $('teksLead').textContent='Kosakata BRS berbeda antar periode.'; $('rhet').textContent=''; return; }
    const AN=['penumpang','barang','kereta','diangkut'], [a1,b1]=ada(['penumpang'],true), [a2,b2]=ada(['penumpang'],false), [c1,d1]=ada(['perjalanan'],true), [c2,d2]=ada(['perjalanan'],false), [e1,f1]=ada(AN,true), [e2,f2]=ada(AN,false);
    $('teksLead').innerHTML=`Kata <em class="hl">penumpang</em> ada di ${a1} dari ${b1} BRS sampai data Juli 2023, tetapi di ${a2} dari ${b2} BRS sejak data Agustus 2023. Sebaliknya <em class="hl">perjalanan</em> ada di ${c1} dari ${d1} BRS sebelumnya dan di ${c2} dari ${d2} BRS sesudahnya. Laju per 10.000 kata pada pembanding sebelum dan sesudah Jul 2023: penumpang ${fmt1.format(p.sebelum)} menjadi ${fmt1.format(p.sesudah)}, perjalanan ${fmt1.format(j.sebelum)} menjadi ${fmt1.format(j.sesudah)}.`;
    $('rhet').innerHTML=`Kosakata angkutan (penumpang, barang, kereta, diangkut) ada di ${e1} dari ${f1} BRS sampai data Juli 2023 dan di ${e2} dari ${f2} BRS sejak data Agustus 2023. Alasan perubahan isi ini tidak tercatat dalam korpus.`;
  }

  /* ---- awan kata ---- */
  function sets(){
    const B=BAND[mode], top=k=>new Set(AW.kata.slice().sort((x,y)=>y[k]-x[k]).slice(0,K).map(d=>d.w));
    const A=top(B.a), Z=top(B.b);
    return AW.kata.filter(d=>A.has(d.w)||Z.has(d.w)).map(d=>({w:d.w,ra:d[B.a],rb:d[B.b],st:A.has(d.w)&&Z.has(d.w)?'tetap':A.has(d.w)?'hilang':'muncul'}));
  }
  let words=[],svg,Wd,Ht,fs;
  function build(){
    const el=$('awan'); if(!el) return; Wd=W.lebar(el.parentNode); Ht=Math.round(Wd*(Wd<560?1.15:.58));
    words=sets(); const mob=Wd<560, rmax=d3.max(words,d=>Math.max(d.ra,d.rb));
    fs=d3.scaleSqrt().domain([0,rmax]).range([mob?7:9,mob?34:62]);
    d3.select(el).attr('viewBox',[0,0,Wd,Ht]).attr('height',null);
    d3.select(el).selectAll('g').remove();
    const st=$('statusAwan'), B=BAND[mode], n=s=>words.filter(d=>d.st===s).length;
    st.innerHTML=`<span><i style="background:${C.hilang}"></i>Hilang dari 45 teratas: ${n('hilang')}</span><span><i style="background:${C.muncul}"></i>Muncul: ${n('muncul')}</span><span><i style="background:${C.tetap}"></i>Bertahan: ${n('tetap')}</span>`;
    $('awanNote').textContent=`Ukuran = kemunculan per 10.000 kata (akar kuadrat). Status membandingkan 45 kata teratas ${B.la} dengan ${B.lb}. Warna oranye, biru, dan abu-abu dipilih agar aman bagi buta warna. Korpus hanya memuat isi BRS; alasan perubahan isinya tidak tercatat di dalamnya.`;
    const lay=d3.layout.cloud().size([Wd,Ht]).words(words.map(d=>({...d,text:d.w,size:fs(Math.max(d.ra,d.rb))}))).padding(2).rotate(0)
      .font('Fraunces').fontWeight(700).fontSize(d=>d.size).random(d3.randomLcg(42)).spiral('rectangular')
      .on('end',out=>{ pos=out; paint(false); });
    lay.start();
  }
  function paint(anim){
    const g=d3.select('#awan').selectAll('g.w').data(pos,d=>d.w).join(e=>{const x=e.append('g').attr('class','w');x.append('text').attr('text-anchor','middle').text(d=>d.w);return x;});
    g.attr('transform',d=>`translate(${d.x+Wd/2},${d.y+Ht/2})`);
    const B=BAND[mode], show=d=>sisi==='both'||(sisi==='a'?d.st!=='muncul':d.st!=='hilang');
    const size=d=>fs(sisi==='both'?Math.max(d.ra,d.rb):sisi==='a'?d.ra:d.rb);
    const t=g.select('text').attr('fill',d=>C[d.st]).on('pointermove',(ev,d)=>W.showTip(ev,`<b>${d.w}</b><br>${B.la}: ${fmt1.format(d.ra)} per 10.000 kata<br>${B.lb}: ${fmt1.format(d.rb)} per 10.000 kata<br>Status: ${d.st==='tetap'?'bertahan':d.st}`)).on('pointerleave',W.hideTip);
    (anim&&!W.reduce?t.transition().duration(600):t).style('font-size',d=>size(d)+'px').attr('fill-opacity',d=>show(d)?1:0).attr('dy','0.35em');
    t.style('pointer-events',d=>show(d)?null:'none');
  }

  /* ---- tren kata ---- */
  let pilih=['penumpang','perjalanan'];
  function kataUI(){
    $('kataList').innerHTML=Object.keys(TR.kata).map(w=>`<option value="${w}">`).join('');
    const inp=$('kataInput'); inp.value=pilih.join(', ');
    inp.addEventListener('change',()=>{ const v=inp.value.toLowerCase().split(/[,\s]+/).filter(x=>x&&TR.kata[x]).slice(0,4); if(v.length){pilih=v;} inp.value=pilih.join(', '); trenKata(); });
    W.segmen('segKata',[['penumpang, perjalanan','penumpang vs perjalanan'],['wisman, wisatawan','wisman vs wisatawan'],['tpk, hotel','tpk vs hotel']].filter(([v])=>v.split(', ').every(w=>TR.kata[w])),()=>pilih.join(', '),v=>{pilih=v.split(', ');inp.value=v;kataUI2();});
    trenKata();
  }
  function kataUI2(){ W.segmen('segKata',[['penumpang, perjalanan','penumpang vs perjalanan'],['wisman, wisatawan','wisman vs wisatawan'],['tpk, hotel','tpk vs hotel']].filter(([v])=>v.split(', ').every(w=>TR.kata[w])),()=>pilih.join(', '),v=>{pilih=v.split(', ');$('kataInput').value=v;kataUI2();}); trenKata(); }
  function trenKata(){
    const el=$('trenKata'); el.innerHTML=''; const Wd=W.lebar(el), mob=Wd<560, m={t:14,r:mob?10:16,b:28,l:mob?40:52}, H=mob?260:320;
    const bln=TR.bulan, x=d3.scalePoint().domain(bln).range([m.l,Wd-m.r]);
    const ser=pilih.map(w=>({w,v:TR.kata[w]})), mx=d3.max(ser,s=>d3.max(s.v,v=>v==null?0:v))||1, y=d3.scaleLinear().domain([0,mx*1.08]).nice().range([H-m.b,m.t]);
    const cs=['#0072B2','#D55E00','#009E73','#CC79A7'];
    const svg=d3.select(el).append('svg').attr('viewBox',[0,0,Wd,H]).attr('role','img').attr('aria-label','Tren kemunculan kata dalam BRS pariwisata');
    svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1',m.l).attr('x2',Wd-m.r).attr('y1',y).attr('y2',y).attr('stroke','#d9d4c7');
    svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x',m.l-6).attr('y',y).attr('dy','0.35em').attr('text-anchor','end').attr('font-size',11).attr('fill','#44546a').text(v=>v);
    svg.append('g').selectAll('text').data(d3.range(2016,2027)).join('text').attr('x',v=>x(v+'-01')||x(bln.find(b=>b.startsWith(v))||bln[0])).attr('y',H-8).attr('text-anchor','middle').attr('font-size',10.5).attr('fill','#44546a').text(v=>mob&&v%2?'':v);
    [['2020-03','awal pandemi'],['2022-01','pemulihan'],['2023-08','tanpa kosakata angkutan']].forEach(([ym,l],i)=>{ const xx=x(ym); svg.append('line').attr('x1',xx).attr('x2',xx).attr('y1',m.t).attr('y2',H-m.b).attr('stroke','#1D3557').attr('stroke-dasharray','3 3').attr('opacity',.5);
      svg.append('text').attr('x',xx+4).attr('y',m.t+10+i*0).attr('font-size',10).attr('fill','#44546a').text(mob?'':l); });
    ser.forEach((s,i)=>{ svg.append('path').datum(bln.map((b,j)=>({b,v:s.v[j]}))).attr('fill','none').attr('stroke',cs[i]).attr('stroke-width',2.3)
      .attr('d',d3.line().defined(d=>d.v!=null).x(d=>x(d.b)).y(d=>y(d.v)));
      const last=bln.length-1-s.v.slice().reverse().findIndex(v=>v!=null);
      svg.append('text').attr('x',Math.min(Wd-m.r,x(bln[last])+4)).attr('y',y(s.v[last])-6).attr('text-anchor','end').attr('font-size',11).attr('font-weight',700).attr('fill',cs[i]).text(s.w); });
    svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',Wd-m.l-m.r).attr('height',H-m.t-m.b).attr('fill','transparent').style('touch-action','pan-y')
      .on('pointermove',ev=>{ const px=d3.pointer(ev)[0], b=d3.least(bln,q=>Math.abs(x(q)-px)), j=bln.indexOf(b);
        W.showTip(ev,`<b>${b}</b><br>`+ser.map(s=>`${s.w}: ${s.v[j]==null?'tidak ada dokumen':fmt1.format(s.v[j])}`).join('<br>')); }).on('pointerleave',W.hideTip);
    const gap=bln.filter((b,j)=>ser.every(s=>s.v[j]==null)).length;
    $('trenKataNote').textContent=`Garis terputus pada bulan tanpa dokumen BRS. Satuan: kemunculan per 10.000 kata. Kata tersedia: 300 kata teratas korpus.`;
  }

  /* ---- bigram ---- */
  let per='3_pemulihan';
  function bigramUI(){ W.segmen('segPeriode',META.periode.map(p=>[p.id,`${p.label} (${p.n_dok} dok.)`]),()=>per,v=>{per=v;bigramUI();}); bigram(); }
  function bigram(){
    const el=$('bigramChart'); if(!el||!BG[per]) return; el.innerHTML='';
    const Wd=W.lebar(el), H=Wd<560?420:480, d=BG[per], nodes=d.nodes.map(n=>({...n})), ids=new Set(nodes.map(n=>n.id));
    const links=d.links.filter(l=>ids.has(l.source)&&ids.has(l.target)).map(l=>({...l}));
    const r=d3.scaleSqrt().domain([0,d3.max(nodes,n=>n.bobot)]).range([4,Wd<560?16:22]), lw=d3.scaleLinear().domain([0,d3.max(links,l=>l.value)]).range([.6,7]);
    const svg=d3.select(el).append('svg').attr('viewBox',[0,0,Wd,H]).attr('role','img').attr('aria-label','Jaringan pasangan kata dalam BRS pariwisata');
    const sim=d3.forceSimulation(nodes).force('link',d3.forceLink(links).id(n=>n.id).distance(55).strength(.5)).force('charge',d3.forceManyBody().strength(-70)).force('x',d3.forceX(Wd/2).strength(.09)).force('y',d3.forceY(H/2).strength(.12)).force('col',d3.forceCollide(n=>r(n.bobot)+10)).stop();
    for(let i=0;i<400;i++) sim.tick();
    const cl=n=>Math.max(30,Math.min(Wd-30,n.x)), cy=n=>Math.max(26,Math.min(H-16,n.y));
    svg.append('g').selectAll('line').data(links).join('line').attr('x1',l=>cl(l.source)).attr('y1',l=>cy(l.source)).attr('x2',l=>cl(l.target)).attr('y2',l=>cy(l.target)).attr('stroke','#5b6676').attr('stroke-opacity',.4).attr('stroke-width',l=>lw(l.value))
      .on('pointermove',(ev,l)=>W.showTip(ev,`<b>${l.source.id} ${l.target.id}</b><br>${fmt.format(l.value)} kemunculan`)).on('pointerleave',W.hideTip);
    const g=svg.append('g').selectAll('g').data(nodes).join('g').attr('transform',n=>`translate(${cl(n)},${cy(n)})`);
    g.append('circle').attr('r',n=>r(n.bobot)).attr('fill','#0072B2').attr('fill-opacity',.85).attr('stroke','#fff').attr('stroke-width',1.5)
      .on('pointermove',(ev,n)=>W.showTip(ev,`<b>${n.id}</b><br>keterhubungan ${fmt.format(n.bobot)}`)).on('pointerleave',W.hideTip);
    g.append('text').attr('y',n=>-r(n.bobot)-4).attr('text-anchor','middle').attr('font-size',Wd<560?10:12).attr('fill','#1D3557').style('paint-order','stroke').style('stroke','#FBFAF6').style('stroke-width','3px').text(n=>n.id);
  }
})();
