'use strict';
/* =====================================================================
   Pintu Masuk Bukan Destinasi · logika grafik & scrollytelling
   - Palet data: Okabe-Ito (kategorikal) dan Viridis (kontinu).
   - Semua teks langkah dihitung dari data, tidak ada angka ditulis tangan.
   ===================================================================== */
const WARNA={'ASEAN':'#E69F00','Asia Lainnya':'#0072B2','Timur Tengah':'#009E73','Eropa':'#CC79A7','Amerika':'#D55E00','Oseania':'#56B4E9','Afrika':'#7a7a7a'};
const PINTU_C='#4a5563';
const fmt=new Intl.NumberFormat('id-ID'),fmt1=new Intl.NumberFormat('id-ID',{maximumFractionDigits:1});
const $=s=>document.querySelector(s);
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* MOTION: animasi pesawat (dekoratif). Dengan pengaturan "kurangi animasi", pesawat tampil diam, dan pembaca bisa menyalakannya sendiri lewat tombol. */
let MOTION=!RM;
const num=n=>fmt.format(Math.round(n));
const pct=(a,b,d=1)=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:d}).format(a/b*100)+'%';
const juta=n=>fmt1.format(n/1e6)+' juta',ribu=n=>fmt1.format(n/1e3)+' ribu';
const MON=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONF=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const tip=d3.select('#tip');
let D,TRN,HD,TK={},COORD={},PIN={};

/* ---------- bendera (hanya negara sungguhan; kelompok "Lainnya" tidak punya bendera) ---------- */
const ISO={Indonesia:'id',Malaysia:'my',Australia:'au',Singapura:'sg',Tiongkok:'cn','Timor Leste':'tl',India:'in','Korea Selatan':'kr','Amerika Serikat':'us',Inggris:'gb',Perancis:'fr',Jepang:'jp',Belanda:'nl',Jerman:'de',Filipina:'ph',Taiwan:'tw',Rusia:'ru','Selandia Baru':'nz',Spanyol:'es','Saudi Arabia':'sa',Italia:'it','Papua Nugini':'pg',Thailand:'th',Vietnam:'vn',Kanada:'ca',Swiss:'ch','Hong Kong':'hk',Belgia:'be',Myanmar:'mm',Denmark:'dk',Swedia:'se',Austria:'at',Portugal:'pt','Afrika Selatan':'za',Pakistan:'pk',Norwegia:'no','Brunei Darussalam':'bn',Mesir:'eg',Finlandia:'fi',Bangladesh:'bd','Sri Lanka':'lk','Uni Emirat Arab':'ae',Yaman:'ye',Kuwait:'kw',Bahrain:'bh',Qatar:'qa'};
const flagSrc=n=>ISO[n]?`assets/flags/${ISO[n]}.svg`:null;
const flagImg=(n,cls='fl')=>ISO[n]?`<img class="${cls}" src="${flagSrc(n)}" alt="" title="${n}" width="28" height="21">`:'';

/* ---------- sumber (satu tempat untuk URL dan tanggal akses) ---------- */
const TGL='3 Oktober 2026',U24='https://www.bps.go.id/id/publication/2025/03/20/a85d584df19ea65a5e2b3d0b',U25='https://www.bps.go.id/id/publication/2026/04/30/4fb8642851550952baead819/statistik-kunjungan-wisatawan-mancanegara-2025.html';
const SRC={
  aliran:{pub:'Statistik Kunjungan Wisatawan Mancanegara 2024 (rilis 20 Maret 2025)',tahun:'2024',url:U24,tgl:TGL},
  tren:{pub:'Statistik Kunjungan Wisatawan Mancanegara 2025 (rilis 30 April 2026), tabel kunjungan per bulan 2000–2025',tahun:'2019–2025',url:U25,tgl:TGL},
  pdrb:{pub:'Produk Domestik Regional Bruto Provinsi-Provinsi di Indonesia Menurut Lapangan Usaha 2020–2024 (rilis 11 April 2025)',tahun:'2023–2024',url:'https://www.bps.go.id/id/publication/2025/04/11/95c729ee8c6fb5e2cb86b00f',tgl:TGL},
  brs:{pub:'Berita Resmi Statistik (BRS) pariwisata, daftar tiap dokumen di data/sumber_brs.csv',tahun:'data Nov 2015–Agu 2026',url:'https://www.bps.go.id/id/pressrelease',tgl:'1–3 Oktober 2026'}};
function sumber(meta,judul,key){
  const s=SRC[key]||{},url=s.url||meta.url,t=s.tgl||meta.tanggal_akses;
  const u=url?`<a href="${url}">${url}</a>`:'<span class="todo">[ISI URL]</span>',tg=t||'<span class="todo">[ISI TANGGAL AKSES]</span>';
  return `<b>${judul}</b> · Sumber: BPS, ${s.pub||meta.sumber}. Tahun data: ${s.tahun||meta.tahun}. URL: ${u}. Diakses: ${tg}.`;
}

/* ---------- util umum ---------- */
function showTip(ev,html){
  tip.html(html).style('opacity',1);
  const n=tip.node(),w=n.offsetWidth,h=n.offsetHeight;let x=ev.clientX+14,y=ev.clientY+14;
  if(x+w>innerWidth-8)x=ev.clientX-w-14;if(y+h>innerHeight-8)y=ev.clientY-h-14;
  tip.style('left',Math.max(8,x)+'px').style('top',Math.max(8,y)+'px');
}
const hideTip=()=>tip.style('opacity',0);
function watch(el,fn){let lw=0,lh=0,t;new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h||(Math.abs(w-lw)<2&&Math.abs(h-lh)<2))return;lw=w;lh=h;clearTimeout(t);t=setTimeout(fn,120)}).observe(el)}
function segment(id,items,get,set,cls){
  const el=document.getElementById(id);el.innerHTML='';
  items.forEach(([v,l,c])=>{const b=document.createElement('button');if(cls)b.className=cls;
    b.innerHTML=(c?`<span class="dot" style="background:${c}"></span>`:'')+l;
    b.setAttribute('aria-pressed',get()===v);b.onclick=()=>set(v);el.append(b)});
}
const stampHTML=list=>{
  const f=(list&&list.length?list:['Indonesia']).filter(n=>ISO[n]).slice(0,1);
  return `<span class="pc-mark" aria-hidden="true">BPS<br>2024</span><span class="pc-stamp" aria-hidden="true">${f.map(n=>`<img src="${flagSrc(n)}" alt="">`).join('')}</span>`;
};
/* Kerangka scrollytelling: kartu pos di kanan, panggung lengket di kiri. */
function scrolly(id,steps,onStep){
  const root=document.getElementById(id),box=root.querySelector('[data-steps]');box.innerHTML='';
  steps.forEach((s,i)=>{const a=document.createElement('article');a.className='step';a.dataset.i=i;
    a.innerHTML=`<span class="pc-no">Kartu ${i+1} dari ${steps.length}</span>${stampHTML(s.stamp)}<h3>${s.t}</h3><p>${s.p}</p>${s.hand?`<span class="hand">${s.hand}</span>`:''}`;box.append(a)});
  const els=[...box.children];let cur=-1;
  const go=i=>{if(i===cur)return;cur=i;els.forEach((e,j)=>e.classList.toggle('is-active',j===i));onStep(i,steps[i])};
  const mob=innerWidth<=860;
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)go(+e.target.dataset.i)}),{rootMargin:mob?'-70% 0px -14% 0px':'-42% 0px -48% 0px'});
  els.forEach(e=>io.observe(e));
  return {go,steps};
}
const sumBy=(arr,f)=>arr.reduce((a,x)=>a+f(x),0);
const group=(arr,key,val)=>{const m=new Map();arr.forEach(x=>m.set(key(x),(m.get(key(x))||0)+val(x)));return m};
const sortedEntries=m=>[...m.entries()].sort((a,b)=>b[1]-a[1]);
const listID=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' dan '+a[a.length-1];

/* =====================================================================
   HERO
   ===================================================================== */
function hero(){
  const T=D.meta.total,top=D.pintu.filter(p=>p.kategori.startsWith('Bandara')).sort((a,b)=>b.total-a.total)[0],p=T?top.total/T*100:0;
  $('#stat').textContent=Math.round(p)+'%';
  $('#statTxt').textContent=`kunjungan masuk lewat satu bandara: ${top.nama_pendek}.`;
  const lead=p>=40&&p<50?'hampir separuhnya':`${pct(top.total,T,0)} di antaranya`;
  $('#heroLead').innerHTML=`Sepanjang 2024, <b>${juta(T)}</b> kunjungan wisatawan asing tercatat di pintu masuk Indonesia, dan ${lead} mendarat di satu bandara saja. Ayo kita ikuti perjalanan mereka, dari tiket sampai ke meja makan.`;
  $('#stubAsal').textContent=new Set(D.negara.map(r=>r.negara)).size+' negara dan kawasan';
  const tot=group(D.negara,r=>r.negara,r=>r.nilai);
  $('#heroFlags').innerHTML=sortedEntries(tot).filter(([n])=>ISO[n]).slice(0,10).map(([n])=>flagImg(n)).join('');
  heroPlane();
  const mb=$('#motionBox');
  if(RM&&mb){mb.hidden=false;const bt=mb.querySelector('button');
    bt.onclick=()=>{MOTION=!MOTION;bt.textContent=MOTION?'Matikan animasi pesawat':'Nyalakan animasi pesawat';bt.setAttribute('aria-pressed',MOTION);heroPlane();if(MP.built)petaUpdate(false)}}
}
/* Pesawat hero: bergerak, atau diam di tengah jalur (terlihat penuh) saat animasi dikurangi. */
function heroPlane(){
  document.querySelectorAll('.plane-layer').forEach(sv=>{
    if(!sv.pauseAnimations)return;
    if(MOTION){sv.unpauseAnimations()}else{sv.setCurrentTime(5.5);sv.pauseAnimations()}
  });
}

/* =====================================================================
   1. NAIK-TURUN (tren bulanan)
   ===================================================================== */
const TR={mode:'seri',end:null,rows:[],ref:null};
function trenInit(d){
  TRN=d;TR.rows=d.bulanan.map(r=>({...r,t:new Date(+r.ym.slice(0,4),+r.ym.slice(5)-1,1)}));
  const R=TR.rows,yr=y=>sumBy(R.filter(r=>r.t.getFullYear()===y),r=>r.wisman);
  const t={};[2019,2020,2021,2022,2023,2024,2025].forEach(y=>t[y]=yr(y));
  const avg19=t[2019]/12,lo=d3.least(R,r=>r.wisman),pk=d3.greatest(R,r=>r.wisman);
  TR.avg19=avg19;TR.lo=lo;TR.pk=pk;TR.t=t;
  $('#srcTren').innerHTML=sumber(d.meta,d.meta.judul,'tren');
  const a=D.meta.total,s24=t[2024];
  if(a!==s24)$('#trenNote').innerHTML=`Catatan: jumlah bulanan 2024 pada tabel ini (${fmt.format(s24)}) berbeda dari total pada diagram aliran (${fmt.format(a)}) karena berasal dari dua edisi publikasi: diagram aliran dari <i>Statistik Kunjungan Wisatawan Mancanegara 2024</i>, tren bulanan dari edisi 2025 yang dipakai sebagai angka rujukan.`;
  const endOf=y=>new Date(y,11,1);
  const steps=[
    {t:'2019: sebelum badai',p:`Sepanjang 2019 tercatat <b>${num(t[2019])}</b> kunjungan, atau rata-rata ${ribu(avg19)} per bulan. Anggap saja ini garis dasar, patokan untuk menimbang semua yang terjadi sesudahnya.`,end:endOf(2019),stamp:['Indonesia']},
    {t:'Maret 2020: pintu ditutup',p:`Dalam hitungan bulan, kunjungan runtuh dan titik terendahnya terjadi pada ${MONF[lo.t.getMonth()]} ${lo.t.getFullYear()}, ketika hanya <b>${num(lo.wisman)}</b> kunjungan tercatat, sekitar ${pct(lo.wisman,avg19,0)} dari rata-rata bulanan 2019.`,end:lo.t,hand:'Bandara mendadak lengang.'},
    {t:'2021: setahun yang sepi',p:`Sepanjang 2021 hanya tercatat <b>${num(t[2021])}</b> kunjungan, atau ${pct(t[2021],t[2019])} dari 2019. Area abu-abu menandai masa pandemi menurut data ini, yaitu Maret 2020 sampai Desember 2021.`,end:endOf(2021)},
    {t:'2022–2023: pelan, tapi naik',p:`Pada 2022 kunjungan mulai merambat naik hingga ${num(t[2022])}, lalu 2023 melompat ke <b>${num(t[2023])}</b>, atau ${pct(t[2023],t[2019],0)} dari angka 2019.`,end:endOf(2023)},
    {t:'2024–2025: hampir kembali',p:`Pada 2024 tercatat ${num(t[2024])} kunjungan, lalu pada 2025 naik menjadi <b>${num(t[2025])}</b>, atau ${pct(t[2025],t[2019])} dari 2019. ${t[2025]>=t[2019]?'Dengan begitu angka 2019 akhirnya terlampaui.':'Namun garis dasar 2019 belum sepenuhnya terkejar.'}`,end:endOf(2025),stamp:['Indonesia','Australia']},
    {t:'Giliranmu menjelajah',p:`Arahkan kursor (atau sentuh) grafik untuk melihat angka tiap bulan. Tombol di atas grafik juga bisa mengganti tampilan menjadi tumpukan tahun, yaitu satu garis untuk satu tahun yang dibaca dari Januari sampai Desember.`,end:endOf(2025),free:true}];
  TR.end=steps[0].end;
  trenSeg();
  scrolly('sc-tren',steps,(i,s)=>{
    if(!s.free&&TR.mode!=='seri'){TR.mode='seri';trenRender(false);trenSeg()}
    if(TR.mode==='seri')trenReveal(s.end,true)});
  trenRender(false);watch($('#trenChart'),()=>trenRender(false));
}
function trenSeg(){segment('segTren',[['seri','Linimasa'],['tahun','Tumpuk per tahun']],()=>TR.mode,v=>{TR.mode=v;if(v==='seri'&&!TR.end)TR.end=new Date(2025,11,1);trenRender(false);trenSeg()})}
function trenRender(anim){
  const el=$('#trenChart');el.innerHTML='';const W=el.clientWidth,H=el.clientHeight;if(!W||!H)return;
  const R=TR.rows,mob=W<560,m={t:26,r:mob?40:60,b:30,l:mob?42:54},fs=mob?10.5:12;
  const y=d3.scaleLinear().domain([0,d3.max(R,r=>r.wisman)]).nice().range([H-m.b,m.t]);
  const svg=d3.select(el).append('svg').attr('viewBox',[0,0,W,H]).attr('role','img');
  svg.attr('aria-label',TR.mode==='seri'?'Grafik garis kunjungan wisatawan mancanegara bulanan, 2019 sampai 2025':'Grafik garis kunjungan wisman per bulan, satu garis untuk tiap tahun 2019 sampai 2025');
  const yAx=svg.append('g').attr('class','ax').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W-m.l-m.r)).tickFormat(v=>fmt.format(v/1e6)+' jt'));
  yAx.select('.domain').remove();yAx.selectAll('line').attr('stroke-dasharray','2 4').attr('opacity',.25);
  const foc=svg.append('g').style('display','none');
  if(TR.mode==='tahun'){
    const x=d3.scalePoint().domain(d3.range(12)).range([m.l,W-m.r]).padding(.3);
    svg.append('g').attr('class','ax').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).tickFormat(i=>MON[i]).tickSize(0));
    const yrs=d3.range(2019,2026),col=d3.scaleOrdinal(yrs,yrs.map((_,i)=>d3.interpolateViridis(i/(yrs.length-1)*.92)));
    const lab=yrs.map(yy=>{const rows=R.filter(r=>r.t.getFullYear()===yy),l=rows[rows.length-1];return {yy,y:y(l.wisman),x:x(l.t.getMonth())}}).sort((a,b)=>a.y-b.y);
    lab.forEach((l,i)=>{if(i&&l.y-lab[i-1].y<13)l.y=lab[i-1].y+13});
    yrs.forEach((yy,i)=>{const rows=R.filter(r=>r.t.getFullYear()===yy);
      svg.append('path').datum(rows).attr('fill','none').attr('stroke',col(yy)).attr('stroke-width',yy===2019||yy===2025?3:2).attr('stroke-dasharray',['','6 3','2 3','8 3 2 3','','6 3','2 3'][i]).attr('stroke-linejoin','round')
        .attr('d',d3.line().x(r=>x(r.t.getMonth())).y(r=>y(r.wisman)));
      const L=lab.find(l=>l.yy===yy);svg.append('text').attr('x',L.x+7).attr('y',L.y).attr('dy','0.35em').attr('font-size',fs).style('font-weight',700).style('fill',col(yy)).text(yy)});
    foc.append('line').attr('y1',m.t).attr('y2',H-m.b).attr('stroke','var(--mute)');
    svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',W-m.l-m.r).attr('height',H-m.b-m.t).attr('fill','none').attr('pointer-events','all')
      .on('pointermove',ev=>{const mx=d3.pointer(ev)[0];let best=0,bd=1e9;d3.range(12).forEach(i=>{const dd=Math.abs(x(i)-mx);if(dd<bd){bd=dd;best=i}});
        foc.style('display',null).select('line').attr('x1',x(best)).attr('x2',x(best));
        showTip(ev,`<b>${MONF[best]}</b>`+yrs.map(yy=>{const r=R.find(r=>r.t.getFullYear()===yy&&r.t.getMonth()===best);return r?`<br>${yy}: ${fmt.format(r.wisman)}`:''}).join(''))})
      .on('pointerleave',()=>{foc.style('display','none');hideTip()});
    return;
  }
  const x=d3.scaleTime().domain([R[0].t,new Date(2025,11,31)]).range([m.l,W-m.r]);
  const uid='trenClip'+Math.random().toString(36).slice(2,6);
  const clip=svg.append('defs').append('clipPath').attr('id',uid).append('rect').attr('x',0).attr('y',0).attr('height',H).attr('width',x(TR.end||new Date(2019,11,1))+4);
  svg.append('g').attr('class','ax').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat('%Y')));
  const x0=x(new Date(2020,2,1)),x1=x(new Date(2022,0,1));
  const band=svg.append('g').attr('clip-path',`url(#${uid})`);
  band.append('rect').attr('x',x0).attr('y',m.t).attr('width',x1-x0).attr('height',H-m.b-m.t).attr('fill','#7a7a7a').attr('opacity',.16);
  band.append('text').attr('x',(x0+x1)/2).attr('y',m.t+13).attr('text-anchor','middle').attr('font-size',fs).style('font-weight',600).text('Masa pandemi');
  // garis patokan: rata-rata bulanan 2019
  const ya=y(TR.avg19);
  svg.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',ya).attr('y2',ya).attr('stroke','var(--terra)').attr('stroke-dasharray','5 4').attr('stroke-width',1.6);
  svg.append('text').attr('x',x(new Date(2021,0,1))).attr('y',ya-7).attr('text-anchor','middle').attr('font-size',fs-.5).style('fill','var(--terra)').style('font-weight',700).text(`Rata-rata bulanan 2019: ${ribu(TR.avg19)}`);
  const body=svg.append('g').attr('clip-path',`url(#${uid})`);
  body.append('path').datum(R).attr('fill','var(--sun)').attr('opacity',.18).attr('d',d3.area().x(r=>x(r.t)).y0(H-m.b).y1(r=>y(r.wisman)));
  body.append('path').datum(R).attr('fill','none').attr('stroke','var(--ink)').attr('stroke-width',2.4).attr('stroke-linejoin','round').attr('d',d3.line().x(r=>x(r.t)).y(r=>y(r.wisman)));
  const mk=(r,txt,dx,dy,an,cls)=>{const g=svg.append('g').attr('class',cls).attr('data-t',+r.t).style('opacity',0).style('transition','opacity .5s');
    g.append('circle').attr('cx',x(r.t)).attr('cy',y(r.wisman)).attr('r',5).attr('fill','var(--terra)').attr('stroke','var(--paper)').attr('stroke-width',2);
    g.append('text').attr('x',x(r.t)+dx).attr('y',y(r.wisman)+dy).attr('text-anchor',an).attr('font-size',fs).style('font-weight',700).style('paint-order','stroke').style('stroke','var(--paper)').attr('stroke-width',4).text(txt)};
  mk(TR.pk,`Puncak: ${MON[TR.pk.t.getMonth()]} ${TR.pk.t.getFullYear()}, ${fmt1.format(TR.pk.wisman/1e6)} jt`,0,-11,TR.pk.t.getFullYear()>=2024?'end':'middle','mk');
  mk(TR.lo,`Terendah: ${MON[TR.lo.t.getMonth()]} ${TR.lo.t.getFullYear()}, ${num(TR.lo.wisman/1e3)} rb`,10,-10,'start','mk');
  TR.svg={svg,clip,x,uid};
  trenReveal(TR.end||new Date(2019,11,1),false);
  const bis=d3.bisector(r=>r.t).center;foc.append('circle').attr('r',5).attr('fill','var(--ink)').attr('stroke','var(--paper)').attr('stroke-width',2);
  svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',W-m.l-m.r).attr('height',H-m.b-m.t).attr('fill','none').attr('pointer-events','all')
    .on('pointermove',ev=>{const r=R[bis(R,x.invert(d3.pointer(ev)[0]))];if(r.t>TR.end){foc.style('display','none');hideTip();return}
      foc.style('display',null).attr('transform',`translate(${x(r.t)},${y(r.wisman)})`);
      showTip(ev,`<b>${MONF[r.t.getMonth()]} ${r.t.getFullYear()}</b><br>${fmt.format(r.wisman)} kunjungan<br>${pct(r.wisman,TR.avg19,0)} dari rata-rata bulanan 2019`)})
    .on('pointerleave',()=>{foc.style('display','none');hideTip()});
}
function trenReveal(date,anim){
  TR.end=date;const S=TR.svg;if(!S)return;
  const w=S.x(date)+4;
  const c=S.clip;(anim&&!RM?c.transition().duration(1400).ease(d3.easeCubicInOut):c).attr('width',w);
  S.svg.selectAll('.mk').style('opacity',function(){return +this.dataset.t<=+date?1:0});
}

/* =====================================================================
   2. ASAL TAMU (peta busur)
   ===================================================================== */
const MP={sel:new Set(),built:null};
const REG_ORDER=['ASEAN','Asia Lainnya','Oseania','Eropa','Amerika','Timur Tengah','Afrika'];
function petaInit(world){
  const P=Object.fromEntries(D.pintu.map(p=>[p.id,p]));PIN=P;
  $('#srcPeta').innerHTML=sumber(D.meta,'Kunjungan wisman 2024 menurut kebangsaan dan pintu masuk (titik asal: koordinat_negara_asal.csv)','aliran');
  const tot=group(D.negara,r=>r.negara,r=>r.nilai),kaw=new Map(D.negara.map(r=>[r.negara,r.kawasan]));
  const T=D.meta.total;
  const topIn=(regs,n=3)=>sortedEntries(group(D.negara.filter(r=>!regs.length||regs.includes(r.kawasan)),r=>r.negara,r=>r.nilai)).slice(0,n);
  const regTot=regs=>sumBy(D.negara.filter(r=>regs.includes(r.kawasan)),r=>r.nilai);
  const names=l=>listID(l.map(([n,v])=>`${n} (${num(v)})`));
  const mkStep=(regs,t,hand)=>{const tp=topIn(regs,3),rt=regs.length?regTot(regs):T;
    return {t,sel:regs,stamp:tp.map(x=>x[0]),hand,
      p:regs.length?`${listID(regs)} mengirim <b>${num(rt)}</b> kunjungan, atau ${pct(rt,T)} dari total, dengan ${names(tp)} sebagai yang terbanyak. ${tp[0][0]} sendirian menyumbang ${pct(tp[0][1],rt,0)} dari kunjungan pada pilihan ini.`
        :`Dari ${new Set(D.negara.map(r=>r.negara)).size} negara dan kawasan asal, tiga yang terbesar adalah ${names(tp)}, dan kamu bisa melihat betapa gemuk busur yang menuju Bali dan Jakarta.`}};
  const steps=[mkStep([],'Semua rute sekaligus'),
    mkStep(['ASEAN'],'Tetangga dekat','Hanya selemparan batu.'),
    mkStep(['Asia Lainnya'],'Asia, luas dan beragam'),
    mkStep(['Oseania'],'Dari selatan','G\'day!'),
    mkStep(['Eropa'],'Terbang belasan jam','Salam dari Eropa!'),
    mkStep(['Amerika','Timur Tengah','Afrika'],'Tiga kawasan yang lebih jauh'),
    {t:'Giliranmu memilih',sel:[],stamp:['Indonesia'],p:`Tombol kawasan di atas peta bisa dipilih lebih dari satu, dan kursor yang diarahkan ke bendera atau garis akan menampilkan angkanya. Titik putus-putus bukan negara, melainkan titik tengah suatu wilayah (misalnya "Eropa Timur Lainnya").`,free:true}];
  petaChips();
  scrolly('sc-peta',steps,(i,s)=>{MP.sel=new Set(s.sel);petaChips();petaUpdate(true)});
  petaRender();watch($('#petaChart'),petaRender);
}
function petaChips(){
  const el=$('#petaChips');el.innerHTML='';
  const mk=(lab,on,fn,c)=>{const b=document.createElement('button');b.className='chip';b.innerHTML=(c?`<span class="dot" style="background:${c}"></span>`:'')+lab;b.setAttribute('aria-pressed',on);b.onclick=fn;el.append(b)};
  mk('Semua',MP.sel.size===0,()=>{MP.sel=new Set();petaChips();petaUpdate(true)});
  REG_ORDER.forEach(r=>mk(r,MP.sel.has(r),()=>{MP.sel.has(r)?MP.sel.delete(r):MP.sel.add(r);petaChips();petaUpdate(true)},WARNA[r]));
}
function petaRender(){
  const host=$('#petaChart');host.innerHTML='';host.classList.add('col');
  const mapEl=document.createElement('div');mapEl.className='map';const list=document.createElement('ol');list.className='toplist';list.id='petaList';host.append(mapEl,list);
  const W=mapEl.clientWidth,H=mapEl.clientHeight;if(!W||!H)return;
  const mob=W<560,P=PIN;
  const proj=d3.geoNaturalEarth1().rotate([-40,0]);
  proj.fitWidth(W,{type:'Sphere'});
  // perbesar peta ke sebaran titik (negara asal + pintu), bukan seluruh bola dunia, supaya memenuhi panggung
  {const pad=mob?8:16,ll=[...Object.values(COORD).map(c=>[c.lon,c.lat]),...D.pintu.filter(p=>p.lat!=null).map(p=>[p.lon,p.lat])],
     xy=ll.map(c=>proj(c)),x0=d3.min(xy,d=>d[0]),x1=d3.max(xy,d=>d[0]),y0=d3.min(xy,d=>d[1]),y1=d3.max(xy,d=>d[1]),
     k=Math.min((W-2*pad)/(x1-x0),(H-2*pad-18)/(y1-y0)),sc=proj.scale(),tr0=proj.translate();
   proj.scale(sc*k).translate([W/2-((x0+x1)/2-tr0[0])*k,H/2-((y0+y1)/2-tr0[1])*k]);}
  const path=d3.geoPath(proj);
  const svg=d3.select(mapEl).append('svg').attr('viewBox',[0,0,W,H]).attr('role','img').attr('aria-label','Peta dunia dengan busur dari negara asal wisatawan ke pintu masuk Indonesia');
  svg.append('path').datum(MP.world).attr('d',path).attr('fill','#E7DCC4').attr('stroke','#fff').attr('stroke-width',.6);
  // titik asal, digeser sedikit agar bendera tidak saling menimpa
  const tot=group(D.negara,r=>r.negara,r=>r.nilai),R=mob?7:9;
  const nodes=Object.values(COORD).map(c=>{const p=proj([c.lon,c.lat]);return {...c,ox:p[0],oy:p[1],x:p[0],y:p[1],reg:c.kawasan,v:tot.get(c.negara)||0}});
  d3.forceSimulation(nodes).force('x',d3.forceX(d=>d.ox).strength(.12)).force('y',d3.forceY(d=>d.oy).strength(.12)).force('c',d3.forceCollide(R+1.5)).stop().tick(160);
  const byName=Object.fromEntries(nodes.map(n=>[n.negara,n]));
  // busur: baris negara × pintu yang punya koordinat; ambil yang terbesar saja agar tetap terbaca
  const pts=id=>P[id]&&P[id].lat!=null?proj([P[id].lon,P[id].lat]):null;
  let arcs=D.negara.filter(r=>byName[r.negara]&&pts(r.pintu)).map(r=>({...r,a:byName[r.negara],b:pts(r.pintu)}));
  arcs=arcs.sort((x,y)=>y.nilai-x.nilai).slice(0,170);
  const sw=d3.scalePow().exponent(.5).domain([0,d3.max(arcs,d=>d.nilai)]).range([.7,mob?6:9]);
  const arcD=d=>{const [x0,y0]=[d.a.x,d.a.y],[x1,y1]=d.b,dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1;let nx=dy/L,ny=-dx/L;if(ny>0){nx=-nx;ny=-ny}
    const o=L*.27;return `M${x0},${y0}Q${(x0+x1)/2+nx*o},${(y0+y1)/2+ny*o} ${x1},${y1}`};
  arcs.forEach((d,i)=>{d.id='arc'+i;d.d=arcD(d)});
  const ga=svg.append('g').attr('fill','none').attr('stroke-linecap','round');
  ga.selectAll('path').data(arcs).join('path').attr('class','arc').attr('id',d=>d.id).attr('d',d=>d.d).attr('stroke',d=>WARNA[d.kawasan]).attr('stroke-width',d=>sw(d.nilai))
    .on('pointermove',(ev,d)=>showTip(ev,`<b>${d.negara} → ${P[d.pintu].nama_pendek}</b><br>${num(d.nilai)} kunjungan<br>${pct(d.nilai,D.meta.total,2)} dari total wisman 2024`)).on('pointerleave',hideTip);
  // pintu
  const gp=svg.append('g');const seen=new Set();
  D.pintu.filter(p=>p.lat!=null).forEach(p=>{const q=proj([p.lon,p.lat]);const g=gp.append('g').attr('transform',`translate(${q[0]},${q[1]})`);
    g.append('circle').attr('r',3.6).attr('fill','var(--ink)').attr('stroke','#fff').attr('stroke-width',1.4)
      .on('pointermove',ev=>showTip(ev,`<b>${p.nama}</b><br>${num(p.total)} kunjungan (${pct(p.total,D.meta.total)})`)).on('pointerleave',hideTip);});
  const lab=[['ngurah_rai_bali','Ngurah Rai',8,16],['soekarno_hatta_banten','Soekarno-Hatta',-6,-9],['batam_kepri','Batam',-8,-10]];
  lab.forEach(([id,t,dx,dy])=>{const q=pts(id);if(q)svg.append('text').attr('x',q[0]+dx).attr('y',q[1]+dy).attr('text-anchor',dx<0?'end':'start').attr('font-size',mob?9.5:11).style('font-weight',700).style('paint-order','stroke').style('stroke','#fff').attr('stroke-width',3).text(t)});
  // pesawat dan marker asal
  const gpl=svg.append('g').attr('class','planes').attr('pointer-events','none');
  const gm=svg.append('g');
  const clipId='cflag';svg.append('defs').append('clipPath').attr('id',clipId).append('circle').attr('r',R);
  const mg=gm.selectAll('g.o').data(nodes).join('g').attr('class','o').attr('transform',d=>`translate(${d.x},${d.y})`)
    .on('pointermove',(ev,d)=>showTip(ev,`<b>${d.negara}</b>${d.jenis_titik==='wilayah'?' <i>(titik tengah wilayah)</i>':''}<br>${num(d.v)} kunjungan (${pct(d.v,D.meta.total,2)})`)).on('pointerleave',hideTip);
  mg.each(function(d){const g=d3.select(this);
    if(ISO[d.negara]){g.append('image').attr('href',flagSrc(d.negara)).attr('x',-R).attr('y',-R).attr('width',2*R).attr('height',2*R).attr('preserveAspectRatio','xMidYMid slice').attr('clip-path',`url(#${clipId})`);
      g.append('circle').attr('r',R).attr('fill','none').attr('stroke','var(--ink)').attr('stroke-opacity',.55).attr('stroke-width',1.2)}
    else g.append('circle').attr('r',R-1).attr('fill','var(--paper)').attr('stroke',WARNA[d.reg]).attr('stroke-width',2).attr('stroke-dasharray','2.5 2.5')});
  const lb=gm.selectAll('text').data(nodes).join('text').attr('class','olab').attr('x',d=>d.x).attr('y',d=>d.y-R-4).attr('text-anchor','middle').attr('font-size',mob?9.5:11).style('font-weight',700).style('paint-order','stroke').style('stroke','#fff').attr('stroke-width',3.2).text(d=>d.negara).style('pointer-events','none');
  gpl.raise();
  MP.built={svg,arcs,nodes,gpl,R,mob};
  petaUpdate(false);
}
function petaUpdate(anim){
  const B=MP.built;if(!B)return;const sel=MP.sel,on=r=>!sel.size||sel.has(r);
  const tr=s=>anim&&!RM?s.transition().duration(600):s;
  tr(B.svg.selectAll('.arc')).attr('stroke-opacity',d=>sel.size?(on(d.kawasan)?.7:.04):.42);
  tr(B.svg.selectAll('g.o')).style('opacity',d=>on(d.reg)?1:.16);
  // label hanya untuk pilihan terbesar
  const vis=B.nodes.filter(d=>on(d.reg)).sort((a,b)=>b.v-a.v).slice(0,3).map(d=>d.negara);
  B.svg.selectAll('.olab').style('opacity',d=>vis.includes(d.negara)?1:0);
  // pesawat: pilih busur yang cukup panjang (bukan yang menempel di pintu) agar gerakannya terlihat
  if(MP.tm){MP.tm.stop();MP.tm=null}
  B.gpl.selectAll('*').remove();
  {const n=sel.size?6:5,seen=new Set(),pick=[];
    B.arcs.filter(d=>on(d.kawasan)).slice(0,30).map(d=>{const p=document.getElementById(d.id);return p?{d,p,L:p.getTotalLength()}:null}).filter(Boolean)
      .sort((a,b)=>b.L-a.L).forEach(o=>{if(pick.length<n&&!seen.has(o.d.negara)){seen.add(o.d.negara);pick.push(o)}});
    const sc=B.mob?1.15:1.55;
    const pl=pick.map((o,i)=>{
      const g=B.gpl.append('g').style('opacity',0);g.append('path').attr('d','M-7,-2.4 L4,-2.4 L8,-7 L10,-7 L7.6,-2.4 L11,-2.4 L13,0 L11,2.4 L7.6,2.4 L10,7 L8,7 L4,2.4 L-7,2.4 L-9,5 L-10,5 L-9,0 L-10,-5 L-9,-5Z').attr('fill','#FFFAF0').attr('stroke','var(--ink)').attr('stroke-width',.9).attr('stroke-linejoin','round');
      return {g,p:o.p,L:o.L,dur:Math.max(6000,Math.min(15000,o.L/55*1000)),off:i*1900}});
    const place=(o,f)=>{const s0=f*o.L,a=o.p.getPointAtLength(s0),b=o.p.getPointAtLength(Math.min(o.L,s0+2)),c=o.p.getPointAtLength(Math.max(0,s0-2));
      o.g.attr('transform',`translate(${a.x},${a.y}) rotate(${Math.atan2(b.y-c.y,b.x-c.x)*180/Math.PI}) scale(${sc})`)
        .style('opacity',Math.min(1,f/.08,(1-f)/.08))};
    if(!MOTION)pl.forEach((o,i)=>{place(o,.22+.11*i);o.g.style('opacity',1)});
    else MP.tm=d3.timer(t=>pl.forEach(o=>place(o,((t+o.off)%o.dur)/o.dur)))}
  // daftar peringkat + catatan
  const rows=D.negara.filter(r=>on(r.kawasan)),tot=sortedEntries(group(rows,r=>r.negara,r=>r.nilai)).slice(0,5),mx=tot[0][1],all=sumBy(rows,r=>r.nilai);
  $('#petaList').innerHTML=tot.map(([n,v])=>`<li>${flagImg(n)||'<span class="fl blank"></span>'}<span class="nm">${n}</span><span class="bar"><i style="width:${v/mx*100}%;background:${WARNA[(D.negara.find(r=>r.negara===n)||{}).kawasan]||'#888'}"></i></span><span class="vl">${num(v)}</span></li>`).join('');
  const unm=sumBy(rows.filter(r=>!(PIN[r.pintu]&&PIN[r.pintu].lat!=null)),r=>r.nilai);
  $('#petaNote').textContent=`Busur hanya digambar untuk pintu yang punya koordinat, sehingga ${pct(unm,all,0)} kunjungan pada pilihan ini (yang masuk lewat perbatasan atau "pintu lainnya") tidak tergambar. Peta menampilkan sampai 170 arus terbesar.`;
}

/* =====================================================================
   3. PINTU GERBANG (Sankey yang bisa morph)
   ===================================================================== */
const SK={view:'semua',focus:null,svg:null};
function skLayout(view,W,H){
  const mob=W<560;let nodes,links;
  if(view==='semua'){
    nodes=[...D.kawasan.map(k=>({id:'k:'+k.id,label:k.nama,color:WARNA[k.id],klik:k.id,side:'L'})),...D.pintu.map(p=>({id:'p:'+p.id,label:p.nama_pendek,color:PINTU_C,side:'R'}))];
    links=D.links.map(l=>({source:'k:'+l.kawasan,target:'p:'+l.pintu,value:l.nilai,color:WARNA[l.kawasan]}));
  }else{
    const rows=D.negara.filter(r=>r.kawasan===view),pid=[...new Set(rows.map(r=>r.pintu))],ng=[...new Set(rows.map(r=>r.negara))];
    nodes=[...ng.map(n=>({id:'n:'+n,label:n,color:WARNA[view],side:'L',flag:ISO[n]?flagSrc(n):null})),...pid.map(i=>({id:'p:'+i,label:PIN[i].nama_pendek,color:PINTU_C,side:'R'}))];
    links=rows.map(r=>({source:'n:'+r.negara,target:'p:'+r.pintu,value:r.nilai,color:WARNA[view]}));
  }
  const m={t:6,b:6,l:mob?(view==='semua'?82:112):(view==='semua'?110:150),r:mob?100:Math.min(196,Math.max(166,W*.26))};
  const nL=nodes.filter(n=>n.side==='L').length,nR=nodes.length-nL;
  const pad=Math.max(3,Math.min(13,H*.45/Math.max(nL,nR)));
  const sk=d3.sankey().nodeId(d=>d.id).nodeAlign(d3.sankeyLeft).nodeWidth(12).nodePadding(pad).nodeSort((a,b)=>b.value-a.value).extent([[m.l,m.t],[W-m.r,H-m.b]]);
  const g=sk({nodes:nodes.map(d=>({...d})),links:links.map(d=>({...d}))});
  g.links.forEach(l=>l.key=l.source.id+'>'+l.target.id);
  return g;
}
const skOp=l=>SK.focus?(SK.focus.includes(l.source.id)||SK.focus.includes(l.target.id)?.62:.06):.45;
function skRender(anim){
  const host=$('#sankey'),W=host.clientWidth,H=host.clientHeight;if(!W||!H)return;
  const mob=W<560,view=SK.view;
  if(!SK.svg){SK.svg=d3.select(host).append('svg').attr('role','img').attr('aria-label','Diagram Sankey aliran wisatawan mancanegara 2024');SK.gL=SK.svg.append('g').attr('fill','none');SK.gN=SK.svg.append('g')}
  const svg=SK.svg.attr('viewBox',[0,0,W,H]),g=skLayout(view,W,H),lk=d3.sankeyLinkHorizontal(),fs=mob?10.5:12.5;
  const dur=anim&&!RM?900:0,ease=d3.easeCubicInOut;
  const T=D.meta.total;
  // pita
  const L=SK.gL.selectAll('path.lk').data(g.links,d=>d.key);
  L.exit().transition().duration(dur?300:0).attr('stroke-opacity',0).remove();
  const Le=L.enter().append('path').attr('class','lk').attr('d',lk).attr('stroke',d=>d.color).attr('stroke-width',d=>Math.max(1,d.width)).attr('stroke-opacity',0);
  const Lu=Le.merge(L).on('pointermove',(ev,d)=>{d3.select(ev.currentTarget).attr('stroke-opacity',.85);
      showTip(ev,`<b>${d.source.label} → ${d.target.label}</b><br>${num(d.value)} kunjungan<br>${pct(d.value,T)} dari total wisman 2024`)})
    .on('pointerleave',(ev,d)=>{d3.select(ev.currentTarget).attr('stroke-opacity',skOp(d));hideTip()});
  Lu.transition().duration(dur).ease(ease).attr('d',lk).attr('stroke',d=>d.color).attr('stroke-width',d=>Math.max(1,d.width)).attr('stroke-opacity',skOp);
  // simpul
  const N=SK.gN.selectAll('g.nd').data(g.nodes,d=>d.id);
  N.exit().transition().duration(dur?300:0).style('opacity',0).remove();
  const Ne=N.enter().append('g').attr('class','nd').style('opacity',0);
  Ne.append('rect').attr('x',d=>d.x0).attr('y',d=>d.y0).attr('width',d=>d.x1-d.x0).attr('height',d=>Math.max(1,d.y1-d.y0)).attr('fill',d=>d.color);
  Ne.append('text').attr('dy','0.35em').attr('x',d=>d.x0-6).attr('y',d=>(d.y0+d.y1)/2);
  const Nu=Ne.merge(N);
  Nu.transition().duration(dur).ease(ease).style('opacity',1);
  Nu.select('rect').attr('class',d=>d.klik?'node-k':null).attr('tabindex',d=>d.klik?0:null).attr('aria-label',d=>d.klik?'Lihat negara asal kawasan '+d.label:null)
    .on('pointermove',(ev,d)=>showTip(ev,`<b>${d.label}</b><br>${num(d.value)} kunjungan (${pct(d.value,T)})`+(d.klik?'<br><i>Klik untuk rincian</i>':'')))
    .on('pointerenter',(ev,d)=>{SK.gL.selectAll('path.lk').attr('stroke-opacity',l=>l.source.id===d.id||l.target.id===d.id?.8:.06)})
    .on('pointerleave',()=>{hideTip();SK.gL.selectAll('path.lk').attr('stroke-opacity',skOp)})
    .on('click',(ev,d)=>d.klik&&skShow(d.klik)).on('keydown',(ev,d)=>{if(d.klik&&ev.key==='Enter')skShow(d.klik)})
    .transition().duration(dur).ease(ease).attr('x',d=>d.x0).attr('y',d=>d.y0).attr('width',d=>d.x1-d.x0).attr('height',d=>Math.max(1,d.y1-d.y0)).attr('fill',d=>d.color);
  Nu.select('text').attr('font-size',fs).attr('text-anchor',d=>d.side==='L'?'end':'start').style('cursor',d=>d.klik?'pointer':null)
    .on('click',(ev,d)=>d.klik&&skShow(d.klik)).text(d=>mob?d.label.replace(/ \(.*\)$/,''):d.label)
    .transition().duration(dur).ease(ease).attr('x',d=>d.side==='L'?d.x0-(d.flag?24:6):d.x1+6).attr('y',d=>(d.y0+d.y1)/2);
  Nu.each(function(d){const s=d3.select(this);let im=s.select('image');
    if(d.flag){if(im.empty())im=s.append('image').attr('width',16).attr('height',12).attr('preserveAspectRatio','xMidYMid slice').attr('x',d.x0-20).attr('y',(d.y0+d.y1)/2-6);
      im.attr('href',d.flag);im.transition().duration(dur).ease(ease).attr('x',d.x0-20).attr('y',(d.y0+d.y1)/2-6)}
    else im.remove()});
  $('#sankeyNote').textContent=view==='semua'?'* Perbatasan Laut/Darat adalah agregat BPS tanpa lokasi rinci. "Pintu lainnya" menggabungkan 19 pintu kecil.':`Rincian negara asal untuk kawasan ${view}. Kembali ke "Semua kawasan" lewat tombol di atas.`;
}
function skCrumb(){
  const c=$('#crumb');c.innerHTML='';const v=SK.view;
  if(v==='semua'){const s=document.createElement('span');s.className='now';s.textContent='Semua kawasan';c.append(s)}
  else{const b=document.createElement('button');b.textContent='Semua kawasan';b.onclick=()=>skShow('semua');c.append(b,' › ');const s=document.createElement('span');s.className='now';s.textContent=v;c.append(s)}
  segment('segKaw',[['semua','Semua'],...REG_ORDER.map(r=>[r,r,WARNA[r]])],()=>SK.view,v=>skShow(v),'chip');
}
function skShow(v,anim=true,focus=null){SK.view=v;SK.focus=focus;hideTip();skCrumb();skRender(anim)}
function sankeyInit(){
  $('#srcAliran').innerHTML=sumber(D.meta,'Kunjungan wisman 2024 menurut kebangsaan dan pintu masuk','aliran');
  const T=D.meta.total;
  const byPintu=kaw=>{const m=group(D.links.filter(l=>!kaw||l.kawasan===kaw),l=>l.pintu,l=>l.nilai);const tot=sumBy([...m.values()],x=>x);
    return {tot,list:sortedEntries(m).map(([i,v])=>({id:i,n:PIN[i].nama_pendek,v,kat:PIN[i].kategori}))}};
  const a=byPintu(),kk=sortedEntries(group(D.links,l=>l.kawasan,l=>l.nilai));
  const asean=byPintu(kk[0][0]),nonAir=sumBy(asean.list.filter(x=>/^(Pelabuhan|Perbatasan|Pos Lintas)/.test(x.kat)),x=>x.v);
  const eu=byPintu('Eropa'),os=byPintu('Oseania');
  const topNeg=k=>sortedEntries(group(D.negara.filter(r=>r.kawasan===k),r=>r.negara,r=>r.nilai))[0];
  const osN=topNeg('Oseania'),kawTot=Object.fromEntries(kk);
  const steps=[
    {t:'Semua aliran sekaligus',view:'semua',stamp:['Indonesia'],p:`Total <b>${num(T)}</b> kunjungan wisman 2024 mengalir dari ${D.kawasan.length} kawasan asal ke ${D.pintu.length} kelompok pintu masuk, dan lebar pita menunjukkan jumlahnya. Sekilas saja sudah terlihat beberapa pita jauh lebih gemuk daripada yang lain.`},
    {t:'Dua gerbang besar',view:'semua',focus:['p:'+a.list[0].id,'p:'+a.list[1].id],stamp:['Indonesia'],p:`${a.list[0].n} menerima <b>${pct(a.list[0].v,T)}</b> dan ${a.list[1].n} ${pct(a.list[1].v,T)}, sehingga berdua mereka menampung ${pct(a.list[0].v+a.list[1].v,T)} dari seluruh kunjungan. Tapi ingat, data ini hanya mencatat tempat wisman masuk, bukan ke mana mereka pergi sesudahnya.`},
    {t:'Tetangga dekat',view:kk[0][0],stamp:[topNeg(kk[0][0])[0]],p:`${kk[0][0]} adalah kawasan asal terbesar dengan ${pct(kawTot[kk[0][0]],T)} dari total, dan ${asean.list[0].n} paling ramai (${pct(asean.list[0].v,asean.tot,0)} dari kawasan ini), disusul ${asean.list[1].n}. Sekitar ${pct(nonAir,asean.tot,0)} tamu ${kk[0][0]} masuk lewat pelabuhan laut atau pos perbatasan, bukan bandara.`,hand:'Dekat, jadi macam-macam jalannya.'},
    {t:'Jauh di mata, dekat ke Bali',view:'Eropa',stamp:[topNeg('Eropa')[0]],p:`Eropa menyumbang ${pct(kawTot['Eropa'],T)} dan sangat terkonsentrasi: ${eu.list[0].n} menampung <b>${pct(eu.list[0].v,eu.tot,0)}</b> wisman Eropa, disusul ${eu.list[1].n} dengan ${pct(eu.list[1].v,eu.tot,0)}.`,hand:'Salam dari Eropa!'},
    {t:'Tetangga di selatan',view:'Oseania',stamp:[osN[0]],p:`${osN[0]} sendiri mengirim ${num(osN[1])} kunjungan, atau ${pct(osN[1],kawTot['Oseania'],0)} dari kawasan Oseania, dan pintu terbesarnya adalah ${os.list[0].n} dengan ${pct(os.list[0].v,os.tot,0)}.`},
    {t:'Giliranmu menjelajah',view:'semua',stamp:['Indonesia'],free:true,p:`Sekarang kendali ada padamu: tekan tombol kawasan di atas diagram, atau klik nama kawasan di dalam diagram, untuk melihat negara-negaranya, lalu pakai breadcrumb untuk kembali ke tampilan awal.`}];
  skCrumb();
  scrolly('sc-sankey',steps,(i,s)=>skShow(s.view,true,s.focus||null));
  skRender(false);watch($('#sankey'),()=>skRender(false));
}

/* =====================================================================
   3b. Matriks asal × pintu
   ===================================================================== */
const OD={mode:'jml',rows:[],cols:[],svg:null};
function odRender(anim){
  const host=$('#odChart'),W=host.clientWidth,H=host.clientHeight;if(!W||!H)return;
  const K=D.kawasan,P=D.pintu,V=new Map();D.links.forEach(l=>{const k=l.kawasan+'|'+l.pintu;V.set(k,(V.get(k)||0)+l.nilai)});
  const raw=(k,p)=>V.get(k.id+'|'+p.id)||0,rt=Object.fromEntries(K.map(k=>[k.id,sumBy(P,p=>raw(k,p))]));
  const val=(k,p)=>OD.mode==='jml'?raw(k,p):(rt[k.id]?raw(k,p)/rt[k.id]*100:0);
  const mob=W<560,m={t:mob?100:128,r:mob?36:56,b:4,l:mob?80:116},cw=(W-m.l-m.r)/P.length,ch=Math.min(46,(H-m.t-m.b)/K.length);
  const cells=K.flatMap((k,i)=>P.map((p,j)=>({k,p,i,j,v:val(k,p),r:raw(k,p),key:k.id+'|'+p.id}))),mx=d3.max(cells,c=>c.v)||1;
  const col=d3.scaleSequentialSqrt(d3.interpolateViridis).domain([0,mx]);
  const short=v=>OD.mode==='pangsa'?fmt1.format(v)+'%':v>=1e6?fmt1.format(v/1e6)+' jt':v>=1e3?Math.round(v/1e3)+' rb':String(Math.round(v));
  if(!OD.svg){OD.svg=d3.select(host).append('svg').attr('role','img').attr('aria-label','Matriks kunjungan wisatawan mancanegara 2024: kawasan asal menurut pintu masuk');
    OD.svg.append('g').attr('class','kl');OD.svg.append('g').attr('class','pl');OD.svg.append('g').attr('class','cl')}
  const svg=OD.svg.attr('viewBox',[0,0,W,H]),dur=anim&&!RM?700:0;
  const rowOn=k=>!OD.rows.length||OD.rows.includes(k.id),colOn=p=>!OD.cols.length||OD.cols.includes(p.id),cellOn=c=>rowOn(c.k)&&colOn(c.p);
  svg.select('.kl').selectAll('text').data(K,k=>k.id).join('text').attr('x',m.l-6).attr('y',(k,i)=>m.t+i*ch+ch/2).attr('dy','0.35em').attr('text-anchor','end').attr('font-size',mob?10.5:12.5)
    .style('font-weight',k=>OD.rows.includes(k.id)?700:400).transition().duration(dur).style('opacity',k=>rowOn(k)?1:.3).text(k=>k.nama);
  svg.select('.pl').selectAll('text').data(P,p=>p.id).join('text').attr('transform',(p,j)=>`translate(${m.l+j*cw+cw/2},${m.t-6}) rotate(-50)`).attr('font-size',mob?9.5:11)
    .style('font-weight',p=>OD.cols.includes(p.id)?700:400).transition().duration(dur).style('opacity',p=>colOn(p)?1:.3).text(p=>mob?p.nama_pendek.replace(/ \(.*\)$/,'').slice(0,14):p.nama_pendek.slice(0,26));
  const g=svg.select('.cl').selectAll('g.c').data(cells,c=>c.key).join(e=>{const n=e.append('g').attr('class','c');n.append('rect').attr('rx',2);n.append('text').attr('text-anchor','middle').attr('dy','0.35em').style('pointer-events','none');return n});
  g.select('rect').attr('x',c=>m.l+c.j*cw+1).attr('y',c=>m.t+c.i*ch+1).attr('width',Math.max(1,cw-2)).attr('height',ch-2)
    .on('pointermove',(ev,c)=>showTip(ev,`<b>${c.k.nama} → ${c.p.nama_pendek}</b><br>${num(c.r)} kunjungan<br>${pct(c.r,rt[c.k.id]||1)} dari kunjungan kawasan ini`)).on('pointerleave',hideTip)
    .transition().duration(dur).attr('fill',c=>col(c.v)).style('opacity',c=>cellOn(c)?1:.14);
  g.select('text').attr('x',c=>m.l+c.j*cw+cw/2).attr('y',c=>m.t+c.i*ch+ch/2).attr('font-size',mob?8.5:10.5).style('fill',c=>d3.lab(col(c.v)).l>55?'#15303F':'#fff')
    .text(c=>(cw<(mob?30:40)||c.v<=0)?'':short(c.v)).transition().duration(dur).style('opacity',c=>cellOn(c)?1:0);
  const st=[0,.25,.5,.75,1].map(t=>d3.interpolateViridis(t)).join(',');
  $('#odLegend').innerHTML=`<span>0</span><div class="bar" style="background:linear-gradient(90deg,${st})"></div><span>${OD.mode==='pangsa'?fmt1.format(mx)+'%':fmt.format(mx)}</span>`;
  $('#odNote').textContent=(OD.mode==='pangsa'?'Pangsa = persen dari total kunjungan kawasan itu (tiap baris berjumlah 100%). ':'Satuan: kunjungan. ')+'Warna memakai skala akar kuadrat (Viridis) agar sel kecil tetap terbaca. "Perbatasan Laut/Darat" adalah agregat BPS tanpa lokasi rinci.';
}
function odSeg(){segment('segOD',[['jml','Jumlah kunjungan'],['pangsa','Pangsa per kawasan (%)']],()=>OD.mode,v=>{OD.mode=v;odSeg();odRender(true)})}
function odInit(){
  $('#srcOD').innerHTML=sumber(D.meta,'Matriks kawasan asal × pintu masuk, kunjungan wisman 2024','aliran');
  const K=D.kawasan,V=new Map();D.links.forEach(l=>V.set(l.kawasan+'|'+l.pintu,(V.get(l.kawasan+'|'+l.pintu)||0)+l.nilai));
  const rt=k=>sumBy(D.pintu,p=>V.get(k+'|'+p.id)||0),sh=(k,p)=>(V.get(k+'|'+p)||0)/rt(k);
  const topP=k=>D.pintu.map(p=>[p.id,V.get(k.id+'|'+p.id)||0]).sort((a,b)=>b[1]-a[1])[0][0];
  const nm=id=>PIN[id].nama_pendek,ng='ngurah_rai_bali',sh2='soekarno_hatta_banten';
  const cNg=K.filter(k=>topP(k)===ng).length,bestSH=K.map(k=>[k.nama,sh(k.id,sh2)]).sort((a,b)=>b[1]-a[1])[0];
  const nei=['batam_kepri','tanjung_uban_kepri','perbatasan_laut','perbatasan_darat'],aseanNei=nei.reduce((a,p)=>a+sh('ASEAN',p),0);
  const euNg=sh('Eropa',ng),osNg=sh('Oseania',ng);
  const steps=[
    {t:'Cara membaca tabel ini',mode:'jml',rows:[],cols:[],p:`Tiap baris adalah kawasan asal dan tiap kolom adalah pintu masuk, jadi sel yang terang berarti banyak kunjungan. Warnanya memakai skala akar kuadrat supaya sel yang kecil tetap terlihat.`},
    {t:'Satu kolom menyala',mode:'jml',rows:[],cols:[ng],p:`Kolom ${nm(ng)} paling terang: dari ${K.length} kawasan asal, <b>${cNg}</b> menjadikannya pintu terbesar. Wajar kalau pita Sankey tadi tampak berkumpul di sana.`},
    {t:'Tetangga punya jalan sendiri',mode:'jml',rows:['ASEAN'],cols:[],p:`Baris ASEAN tampil beda, karena sekitar <b>${fmt1.format(aseanNei*100)}%</b> tamunya masuk lewat Batam, Tanjung Uban, serta perbatasan laut dan darat, jalur yang hampir tidak dipakai kawasan lain.`,stamp:['Malaysia','Singapura']},
    {t:'Jakarta, gerbang kedua',mode:'jml',rows:[],cols:[sh2],p:`${nm(sh2)} menampung tamu dari banyak kawasan, dan yang paling bergantung padanya adalah ${bestSH[0]}, dengan ${fmt1.format(bestSH[1]*100)}% kunjungan kawasan itu lewat sini.`},
    {t:'Dari jumlah ke pangsa',mode:'pangsa',rows:['Eropa','Oseania'],cols:[],p:`Kalau dilihat dari pangsa per kawasan, <b>${fmt1.format(euNg*100)}%</b> wisman Eropa masuk lewat ${nm(ng)}, begitu pula ${fmt1.format(osNg*100)}% wisman Oseania. Dengan pangsa, kawasan kecil dan besar bisa dibandingkan secara setara.`,stamp:['Australia','Belanda']},
    {t:'Giliranmu menjelajah',mode:'jml',rows:[],cols:[],free:true,p:`Arahkan kursor ke sel mana pun untuk melihat angkanya, dan ganti ukuran tabel dengan tombol di atas.`}];
  odSeg();odRender(false);watch($('#odChart'),()=>odRender(false));
  scrolly('sc-od',steps,(i,s)=>{OD.mode=s.mode;OD.rows=s.rows;OD.cols=s.cols;odSeg();odRender(true)});
}

/* =====================================================================
   4. RUPIAH (hierarki PDRB)
   ===================================================================== */
const WIL={"Aceh":"Sumatera","Sumatera Utara":"Sumatera","Sumatera Barat":"Sumatera","Riau":"Sumatera","Jambi":"Sumatera","Sumatera Selatan":"Sumatera","Bengkulu":"Sumatera","Lampung":"Sumatera","Kepulauan Bangka Belitung":"Sumatera","Kepulauan Riau":"Sumatera","DKI Jakarta":"Jawa","Jawa Barat":"Jawa","Jawa Tengah":"Jawa","DI Yogyakarta":"Jawa","Jawa Timur":"Jawa","Banten":"Jawa","Bali":"Bali & Nusa Tenggara","Nusa Tenggara Barat":"Bali & Nusa Tenggara","Nusa Tenggara Timur":"Bali & Nusa Tenggara","Kalimantan Barat":"Kalimantan","Kalimantan Tengah":"Kalimantan","Kalimantan Selatan":"Kalimantan","Kalimantan Timur":"Kalimantan","Kalimantan Utara":"Kalimantan","Sulawesi Utara":"Sulawesi","Sulawesi Tengah":"Sulawesi","Sulawesi Selatan":"Sulawesi","Sulawesi Tenggara":"Sulawesi","Gorontalo":"Sulawesi","Sulawesi Barat":"Sulawesi","Maluku":"Maluku & Papua","Maluku Utara":"Maluku & Papua","Papua Barat":"Maluku & Papua","Papua Barat Daya":"Maluku & Papua","Papua":"Maluku & Papua","Papua Selatan":"Maluku & Papua","Papua Tengah":"Maluku & Papua","Papua Pegunungan":"Maluku & Papua"};
let HU='wilayah',HY=3,HPATH=[],HC;
const isI=d=>d.data.kode==='I',HI='#D55E00';
const hWil=()=>[...new Set(HD.provinsi.map(n=>WIL[n]))],hProvIdx=w=>HD.provinsi.map((n,i)=>i).filter(i=>WIL[HD.provinsi[i]]===w);
const hGrow=r=>r.each(n=>{const g=d3.sum(n.leaves(),l=>l.data.v23);n.gr=g?(n.value/g-1)*100:null});
function hTree(){const k=HD.kategori,p=HD.provinsi,Dd=HD.data,lf=(d,nm)=>({name:nm,kode:k[d[1]].kode,v23:d[2],v24:d[3]});
  const kids=HU==='wilayah'?hWil().map(w=>({name:w,children:hProvIdx(w).map(i=>({name:p[i],children:Dd.filter(d=>d[0]===i).map(d=>lf(d,k[d[1]].pendek))}))}))
    :k.map((c,ci)=>({name:c.pendek,kode:c.kode,children:hWil().map(w=>({name:w,kode:c.kode,children:hProvIdx(w).map(i=>lf(Dd.find(d=>d[0]===i&&d[1]===ci),p[i]))}))}));
  return hGrow(d3.hierarchy({name:'Indonesia (38 provinsi)',children:kids}).sum(d=>d.v24||0).sort((a,b)=>b.value-a.value))}
function hKolor(r){const gs=r.descendants().map(n=>n.gr).filter(Number.isFinite).sort(d3.ascending),lo=d3.quantile(gs,.05),hi=d3.quantile(gs,.95);
  HC=d3.scaleSequential(d3.interpolateViridis).domain([lo,hi]).clamp(true);
  $('#hLegend').innerHTML=`<span>${fmt1.format(lo)}%</span><div class="bar" style="background:linear-gradient(90deg,${[0,.25,.5,.75,1].map(t=>d3.interpolateViridis(t)).join(',')})"></div><span>${fmt1.format(hi)}%</span>`}
const hFill=d=>d.depth===0?'#8a8f98':(d.gr==null?'#999999':HC(d.gr)),hTxt=d=>d3.lab(hFill(d)).l>58?'#15303F':'#fff';
const hTip=(cur,d)=>`<b>${d.data.name}</b><br>${fmt1.format(d.value/1e3)} triliun (${fmt1.format(d.value/cur.value*100)}% dari ${cur.data.name})`+(d.gr==null?'':`<br>pertumbuhan riil 2023→2024: ${fmt1.format(d.gr)}%`);
function hSegs(){segment('segUrut',[['wilayah','Wilayah → Provinsi → Sektor'],['sektor','Sektor → Wilayah → Provinsi']],()=>HU,v=>{HU=v;HPATH=[];hRender()})}
function hRender(){
  const root=hTree();hKolor(root);let cur=root;HPATH.forEach(n=>{cur=(cur.children&&cur.children.find(c=>c.data.name===n))||cur});
  const cb=$('#hCrumb');cb.innerHTML='';const names=[root.data.name,...HPATH];
  names.forEach((n,i)=>{if(i<names.length-1){const b=document.createElement('button');b.textContent=n;b.onclick=()=>{HPATH=HPATH.slice(0,i);hRender()};cb.append(b,' › ')}
    else{const s=document.createElement('span');s.className='now';s.textContent=n+` (${fmt1.format(cur.value/1e3)} triliun)`;cb.append(s)}});
  const go=p=>{HPATH=p;hRender()},tw=$('#treemap'),W=tw.clientWidth,Ht=tw.clientHeight,mob=W<560;tw.innerHTML='';
  if(W&&Ht){
    /* d3.treemap hanya valid dari akar (kedalaman 0), jadi simpul turunan dibangun ulang sebagai akar baru */
    const sub=cur.depth?hGrow(d3.hierarchy(cur.data).sum(d=>d.v24||0).sort((a,b)=>b.value-a.value)):cur;
    if(sub.children){
      d3.treemap().size([W,Ht]).paddingInner(2).round(true)(sub);
      const svg=d3.select(tw).append('svg').attr('viewBox',[0,0,W,Ht]).attr('role','img').attr('aria-label','Treemap PDRB: '+cur.data.name);
      const g=svg.selectAll('g').data(sub.children).join('g');
      g.append('rect').attr('x',d=>d.x0).attr('y',d=>d.y0).attr('width',d=>d.x1-d.x0).attr('height',d=>d.y1-d.y0).attr('fill',d=>hFill(d)).attr('stroke',d=>isI(d)?HI:'none').attr('stroke-width',3)
        .attr('data-d',d=>d.children?1:null).attr('tabindex',d=>d.children?0:null)
        .on('pointermove',(ev,d)=>showTip(ev,hTip(sub,d)+(d.children?'<br><i>Klik untuk rincian</i>':''))).on('pointerleave',hideTip)
        .on('click',(ev,d)=>d.children&&go([...HPATH,d.data.name])).on('keydown',(ev,d)=>{if(d.children&&ev.key==='Enter')go([...HPATH,d.data.name])});
      g.append('text').attr('x',d=>d.x0+5).attr('y',d=>d.y0+15).attr('font-size',mob?10:12).style('fill',d=>hTxt(d)).style('pointer-events','none')
        .text(d=>{const w=d.x1-d.x0,h=d.y1-d.y0;return(w<46||h<18)?'':d.data.name.slice(0,Math.floor(w/6.4))});
      g.style('opacity',0).transition().duration(RM?0:500).style('opacity',1);
    }else tw.innerHTML=`<p class="note">Tingkat terdalam: ${cur.data.name} = ${fmt1.format(cur.value/1e3)} triliun rupiah.</p>`;
  }
  const iw=$('#icicle');iw.innerHTML='';const IW=iw.clientWidth;
  if(cur.children&&IW){
    const r2=hGrow(d3.hierarchy(cur.data).sum(d=>d.v24||0).sort((a,b)=>b.value-a.value)),dep=r2.height+1,IH=IW<560?540:600;
    d3.partition().size([IH,IW])(r2);
    const svg=d3.select(iw).append('svg').attr('viewBox',[0,0,IW,IH]).attr('role','img').attr('aria-label','Icicle PDRB: '+cur.data.name).style('height','auto');
    const g=svg.selectAll('g').data(r2.descendants()).join('g');
    g.append('rect').attr('x',d=>d.y0+1).attr('y',d=>d.x0).attr('width',d=>Math.max(0,d.y1-d.y0-2)).attr('height',d=>Math.max(.5,d.x1-d.x0-1))
      .attr('fill',d=>hFill(d)).attr('stroke',d=>isI(d)&&d.depth>0?HI:'none').attr('stroke-width',2).attr('data-d',d=>d.children?1:null)
      .on('pointermove',(ev,d)=>showTip(ev,hTip(cur,d))).on('pointerleave',hideTip)
      .on('click',(ev,d)=>{if(d.children&&d.depth>0)go([...HPATH,...d.ancestors().reverse().slice(1).map(n=>n.data.name)])});
    g.append('text').attr('x',d=>d.y0+5).attr('y',d=>(d.x0+d.x1)/2).attr('dy','0.35em').attr('font-size',IW<560?9.5:11).style('fill',d=>hTxt(d)).style('pointer-events','none')
      .text(d=>(d.x1-d.x0<12||d.y1-d.y0<40)?'':d.data.name.slice(0,Math.floor((d.y1-d.y0-8)/5.6)));
  }
  hSegs();
}
function hierInit(d){
  HD=d;
  $('#hNote').innerHTML=`Jumlah 38 provinsi, bukan PDB nasional. ${d.meta.catatan_angka}. Satuan: triliun rupiah, atas dasar harga konstan (ADHK), sehingga porsi antarsektor tidak persis sama dengan struktur nominal (ADHB).`;
  $('#srcH').innerHTML=sumber(d.meta,d.meta.judul,'pdrb');
  document.querySelectorAll('[data-src=pdrb]').forEach(e=>e.innerHTML=sumber(d.meta,d.meta.judul,'pdrb'));
  const I=d.kategori.findIndex(c=>c.kode==='I'),Ip=d.kategori[I].pendek,y=HY;
  const tot=sumBy(d.data,r=>r[y]),iT=sumBy(d.data.filter(r=>r[1]===I),r=>r[y]);
  const share=pi=>sumBy(d.data.filter(r=>r[0]===pi&&r[1]===I),r=>r[y])/sumBy(d.data.filter(r=>r[0]===pi),r=>r[y])*100;
  const provShare=d.provinsi.map((n,i)=>({n,v:share(i)})).sort((a,b)=>b.v-a.v);
  const wilTot=hWil().map(w=>[w,sumBy(hProvIdx(w).flatMap(i=>d.data.filter(r=>r[0]===i)),r=>r[3])]).sort((a,b)=>b[1]-a[1]);
  const regW=wilTot.find(x=>x[0]==='Bali & Nusa Tenggara'),balProv=hProvIdx('Bali & Nusa Tenggara').map(i=>[d.provinsi[i],sumBy(d.data.filter(r=>r[0]===i),r=>r[3])]).sort((a,b)=>b[1]-a[1]);
  const bali=share(d.provinsi.indexOf('Bali')),nas=iT/tot*100;
  const iBy=wilTot.map(([w])=>[w,sumBy(hProvIdx(w).flatMap(i=>d.data.filter(r=>r[0]===i&&r[1]===I)),r=>r[3])]).sort((a,b)=>b[1]-a[1]);
  const steps=[
    {t:'Satu peta, 38 provinsi',u:'wilayah',path:[],stamp:['Indonesia'],p:`Luas tiap kotak menunjukkan nilai PDRB (harga konstan 2024), dan ${wilTot[0][0]} paling lebar dengan <b>${pct(wilTot[0][1],sumBy(wilTot,x=>x[1]),0)}</b> dari jumlah 38 provinsi. Warnanya menunjukkan seberapa cepat ekonomi tumbuh dari 2023 ke 2024.`},
    {t:'Zoom ke Bali & Nusa Tenggara',u:'wilayah',path:['Bali & Nusa Tenggara'],stamp:['Indonesia'],p:`Wilayah ini menyumbang ${pct(regW[1],sumBy(wilTot,x=>x[1]))} dari jumlah PDRB, dan di dalamnya ${balProv[0][0]} paling besar (${num(balProv[0][1]/1e3)} triliun), disusul ${balProv[1][0]}.`},
    {t:'Bali, kamar dan meja makan',u:'wilayah',path:['Bali & Nusa Tenggara','Bali'],stamp:['Indonesia'],p:`Di Bali, akomodasi dan makan minum menyumbang <b>${fmt1.format(bali)}%</b> PDRB provinsinya, ${bali>nas?'di atas':'di bawah'} rata-rata 38 provinsi (${fmt1.format(nas)}%). Sektor ini ditandai garis tepi oranye.`,hand:'Pintu masuknya Ngurah Rai, kamarnya di sini.'},
    {t:'Ganti sudut pandang',u:'sektor',path:[Ip],stamp:['Indonesia'],p:`Sekarang kita mulai dari sektornya: akomodasi dan makan minum bernilai ${fmt1.format(iT/1e3)} triliun atau ${fmt1.format(nas)}% dari jumlah PDRB, dengan wilayah terbesar ${iBy[0][0]} (${pct(iBy[0][1],iT,0)}). Provinsi dengan pangsa sektor tertinggi adalah ${provShare.slice(0,3).map(s=>`${s.n} (${fmt1.format(s.v)}%)`).join(', ')}.`},
    {t:'Giliranmu menjelajah',u:'wilayah',path:[],free:true,stamp:['Indonesia'],p:`Klik kotak mana pun untuk masuk lebih dalam, pakai breadcrumb untuk kembali, dan ganti urutan hierarki dengan tombol di atas. Tampilan icicle di bawah akan mengikuti pilihanmu.`}];
  hRender();watch($('#treemap'),hRender);let ht;addEventListener('resize',()=>{clearTimeout(ht);ht=setTimeout(hRender,200)});
  scrolly('sc-hier',steps,(i,s)=>{HU=s.u;HPATH=s.path;hRender()});
}

/* =====================================================================
   5. KATA BPS
   ===================================================================== */
const PER=[['1_pra_pandemi','Pra-pandemi'],['2_pandemi','Pandemi'],['3_pemulihan','Pemulihan']],OI=['#0072B2','#D55E00','#009E73','#CC79A7'],DASH=['','6 3','2 3','8 3 2 3'];
let TP='3_pemulihan',TM='frek',TW=['penumpang','perjalanan','wisnus'];
const perLabel=id=>PER.find(p=>p[0]===id)[1];
function teksSegs(){
  segment('segPeriode',PER,()=>TP,v=>{TP=v;teksSegs();frekRender(true);bigramRender()});
  segment('segPeriode2',PER,()=>TP,v=>{TP=v;teksSegs();frekRender(true);bigramRender()});
  segment('segMode',[['frek','Paling sering'],['khas','Paling khas'],['awan','Awan kata']],()=>TM,v=>{TM=v;teksSegs();frekRender(true)});
}
function frekRender(anim){
  const host=$('#frekChart'),W=host.clientWidth,H=host.clientHeight;if(!W||!H)return;
  const dur=anim&&!RM?600:0,mob=W<560;
  if(TM==='awan'){
    host.innerHTML='';
    const rows=TK.frek[TP],sz=d3.scaleSqrt().domain([0,d3.max(rows,r=>r.per10rb)]).range([12,mob?32:46]);
    const svg=d3.select(host).append('svg').attr('viewBox',[0,0,W,H]).attr('role','img').attr('aria-label','Awan kata paling sering, periode '+perLabel(TP));
    if(!d3.layout||!d3.layout.cloud){host.textContent='Awan kata butuh pustaka d3-cloud yang gagal dimuat.';return}
    d3.layout.cloud().size([W*.96,H*.94]).words(rows.map(r=>({text:r.kata,size:sz(r.per10rb),v:r.per10rb,dok:r.dok}))).padding(4).rotate((d,i)=>(i%6===4&&d.size<30)?90:0).font('DM Sans').fontWeight(700).fontSize(d=>d.size)
      .on('end',ws=>{const g=svg.append('g').attr('transform',`translate(${W/2},${H/2})`);
        g.selectAll('text').data(ws).join('text').attr('text-anchor','middle').attr('font-family','DM Sans, system-ui, sans-serif').attr('font-weight',700).attr('font-size',d=>d.size)
          .attr('transform',d=>`translate(${d.x},${d.y}) rotate(${d.rotate})`).style('fill',(d,i)=>i<3?'var(--terra)':'var(--ink)').style('opacity',0).text(d=>d.text)
          .on('pointermove',(ev,d)=>showTip(ev,`<b>${d.text}</b><br>${fmt.format(d.v)} per 10 rb kata`)).on('pointerleave',hideTip)
          .transition().duration(RM?0:600).style('opacity',(d,i)=>.95)}).start();
    return;
  }
  let svg=d3.select(host).select('svg.bars');
  if(svg.empty()){host.innerHTML='';svg=d3.select(host).append('svg').attr('class','bars').attr('role','img')}
  svg.attr('viewBox',[0,0,W,H]).attr('aria-label','Diagram batang kata teratas periode '+perLabel(TP));
  const rows=(TM==='frek'?TK.frek[TP]:TK.khas[TP]).slice(0,15),val=r=>TM==='frek'?r.per10rb:r.z;
  const nd=TK.meta.periode.find(p=>p.id===TP).n_dok,m={t:6,r:54,b:6,l:mob?92:112},rh=Math.min(30,(H-m.t-m.b)/rows.length);
  const x=d3.scaleLinear().domain([0,d3.max(rows,val)]).range([0,W-m.l-m.r]),y=(r,i)=>m.t+i*rh;
  const G=svg.selectAll('g.r').data(rows,r=>r.kata);
  G.exit().transition().duration(dur?250:0).style('opacity',0).remove();
  const Ge=G.enter().append('g').attr('class','r').style('opacity',0).attr('transform',(r,i)=>`translate(0,${y(r,i)})`);
  Ge.append('rect').attr('x',m.l).attr('height',rh*.74).attr('rx',3).attr('width',0).attr('fill','var(--teal)');
  Ge.append('text').attr('class','k').attr('x',m.l-8).attr('text-anchor','end').attr('dy','0.35em').attr('font-size',13);
  Ge.append('text').attr('class','v').attr('dy','0.35em').attr('font-size',11);
  const Gu=Ge.merge(G);
  Gu.transition().duration(dur).style('opacity',1).attr('transform',(r,i)=>`translate(0,${y(r,i)})`);
  Gu.select('rect').on('pointermove',(ev,r)=>showTip(ev,TM==='frek'?`<b>${r.kata}</b><br>${fmt.format(r.per10rb)} per 10 rb kata<br>ada di ${r.dok} dari ${nd} dokumen`:`<b>${r.kata}</b><br>skor ${fmt.format(r.z)}<br>${fmt.format(r.per10rb)} vs ${fmt.format(r.per10rb_lain)} per 10 rb kata di periode lain`)).on('pointerleave',hideTip)
    .transition().duration(dur).attr('width',r=>Math.max(1,x(val(r)))).attr('height',rh*.74);
  Gu.select('text.k').attr('y',rh*.37).text(r=>r.kata);
  Gu.select('text.v').text(r=>fmt.format(val(r))).transition().duration(dur).attr('x',r=>m.l+x(val(r))+5).attr('y',rh*.37);
}
function kataRender(){
  const el=$('#trenKata');el.innerHTML='';const W=el.clientWidth,H=el.clientHeight;if(!W||!H)return;
  const T=TK.tren,ws=TW.filter(w=>T.kata[w]),miss=TW.filter(w=>!T.kata[w]);
  $('#trenKataNote').textContent=miss.length?`Tidak ditemukan (hanya ${Object.keys(T.kata).length} kata teratas yang bisa dicari): ${miss.join(', ')}`:'';
  if(!ws.length)return;
  const bln=T.bulan.map(b=>new Date(+b.slice(0,4),+b.slice(5)-1,1)),mob=W<560,m={t:24,r:12,b:28,l:44};
  const x=d3.scaleTime().domain(d3.extent(bln)).range([m.l,W-m.r]),y=d3.scaleLinear().domain([0,d3.max(ws,w=>d3.max(T.kata[w],v=>v??0))]).nice().range([H-m.b,m.t]);
  const svg=d3.select(el).append('svg').attr('viewBox',[0,0,W,H]).attr('role','img').attr('aria-label','Grafik tren kata dalam BRS per bulan: '+ws.join(', '));
  const uid='kc'+Math.random().toString(36).slice(2,6),cl=svg.append('defs').append('clipPath').attr('id',uid).append('rect').attr('x',0).attr('y',0).attr('height',H).attr('width',RM?W:m.l);
  svg.append('g').attr('class','ax').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).ticks(mob?5:9).tickFormat(d3.timeFormat('%Y')));
  svg.append('g').attr('class','ax').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5));
  [[new Date(2020,2,1),'Mar 2020'],[new Date(2022,0,1),'Jan 2022'],[new Date(2023,6,1),'Jul 2023']].forEach(([d,l])=>{
    svg.append('line').attr('x1',x(d)).attr('x2',x(d)).attr('y1',m.t).attr('y2',H-m.b).style('stroke','var(--mute)').attr('stroke-dasharray','3 3');
    svg.append('text').attr('x',x(d)+3).attr('y',m.t-8).attr('font-size',10).text(l)});
  const g=svg.append('g').attr('clip-path',`url(#${uid})`);
  ws.forEach((w,i)=>g.append('path').datum(T.kata[w]).attr('fill','none').attr('stroke',OI[i]).attr('stroke-width',2.2).attr('stroke-dasharray',DASH[i])
    .attr('d',d3.line().defined(v=>v!=null).x((v,j)=>x(bln[j])).y(v=>y(v))));
  ws.forEach((w,i)=>svg.append('text').attr('x',m.l+8+i*(mob?78:112)).attr('y',m.t+14).attr('font-size',12.5).style('font-weight',700).style('fill',OI[i]).text(w));
  const bis=d3.bisector(d=>d).center,foc=svg.append('line').style('stroke','var(--mute)').attr('y1',m.t).attr('y2',H-m.b).style('display','none');
  svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',W-m.l-m.r).attr('height',H-m.b-m.t).attr('fill','none').attr('pointer-events','all')
    .on('pointermove',ev=>{const j=bis(bln,x.invert(d3.pointer(ev)[0]));foc.style('display',null).attr('x1',x(bln[j])).attr('x2',x(bln[j]));
      showTip(ev,`<b>${T.bulan[j]}</b>`+ws.map(w=>`<br>${w}: ${T.kata[w][j]==null?'tidak ada BRS':fmt.format(T.kata[w][j])}`).join(''))})
    .on('pointerleave',()=>{foc.style('display','none');hideTip()});
  if(!RM)cl.transition().duration(1300).ease(d3.easeCubicInOut).attr('width',W);
}
function kataSegs(){const sk=$('#segKata');sk.innerHTML='';[['penumpang','perjalanan','wisnus'],['nonbintang'],['papua'],['wisman','wisatawan']].forEach(a=>{const b=document.createElement('button');b.textContent=a.join(' + ');b.onclick=()=>setW(a);sk.append(b)})}
function setW(a){TW=a;$('#kataInput').value=a.join(', ');kataRender()}
function bigramRender(){
  const el=$('#bigramChart');el.innerHTML='';const W=el.clientWidth,H=el.clientHeight;if(!W||!H)return;
  const g=TK.bigram[TP],mob=W<560,nodes=g.nodes.map(d=>({...d})),links=g.links.map(d=>({...d}));
  const r=d3.scaleSqrt().domain([0,d3.max(nodes,d=>d.bobot)]).range([4,mob?11:15]),sw=d3.scaleLinear().domain(d3.extent(links,d=>d.value)).range([1.2,6]);
  /* gravitasi ke tengah supaya kelompok kata kecil tidak terlempar ke tepi; tabrakan diperbesar agar titik tidak menumpuk */
  const sim=d3.forceSimulation(nodes).force('link',d3.forceLink(links).id(d=>d.id).distance(mob?34:52).strength(.75))
    .force('charge',d3.forceManyBody().strength(mob?-120:-190)).force('x',d3.forceX(W/2).strength(.09)).force('y',d3.forceY(H/2).strength(.13))
    .force('collide',d3.forceCollide(d=>r(d.bobot)+(mob?8:11))).stop();
  for(let i=0;i<500;i++)sim.tick();
  const mx=mob?34:60,my=26;
  nodes.forEach(d=>{d.x=Math.max(mx,Math.min(W-mx,d.x));d.y=Math.max(my+8,Math.min(H-my,d.y))});
  const svg=d3.select(el).append('svg').attr('class','fadein').attr('viewBox',[0,0,W,H]).attr('role','img').attr('aria-label','Jaringan pasangan kata berurutan, periode '+perLabel(TP));
  svg.append('g').selectAll('line').data(links).join('line').attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y).style('stroke','var(--mute)').attr('stroke-opacity',.45).attr('stroke-width',d=>sw(d.value))
    .on('pointermove',(ev,d)=>showTip(ev,`<b>${d.source.id} → ${d.target.id}</b><br>${fmt.format(d.value)} kali`)).on('pointerleave',hideTip);
  svg.append('g').selectAll('circle').data(nodes).join('circle').attr('cx',d=>d.x).attr('cy',d=>d.y).attr('r',d=>r(d.bobot)).style('fill','var(--teal)').attr('fill-opacity',.88).attr('stroke','var(--paper)').attr('stroke-width',1.5)
    .on('pointermove',(ev,d)=>showTip(ev,`<b>${d.id}</b><br>keterhubungan ${fmt.format(d.bobot)}`)).on('pointerleave',hideTip);
  /* label: tempatkan dari kata terpenting; lewati yang menabrak label atau titik lain */
  const fs=mob?10.5:12,cw=fs*.58,placed=[],hit=(a,b)=>!(a.x2<b.x1||a.x1>b.x2||a.y2<b.y1||a.y1>b.y2);
  const circ=nodes.map(d=>({x1:d.x-r(d.bobot),x2:d.x+r(d.bobot),y1:d.y-r(d.bobot),y2:d.y+r(d.bobot)}));
  const labs=[];
  [...nodes].sort((a,b)=>b.bobot-a.bobot).forEach(d=>{const w=d.id.length*cw+4,h=fs+2,rr=r(d.bobot)+3;
    const cands=[{x:d.x,y:d.y-rr-2,a:'middle',bx:d.x-w/2,by:d.y-rr-h},{x:d.x,y:d.y+rr+h-2,a:'middle',bx:d.x-w/2,by:d.y+rr},
      {x:d.x+rr+2,y:d.y+fs*.35,a:'start',bx:d.x+rr,by:d.y-h/2},{x:d.x-rr-2,y:d.y+fs*.35,a:'end',bx:d.x-rr-w,by:d.y-h/2}];
    for(const c of cands){const bb={x1:c.bx,x2:c.bx+w,y1:c.by,y2:c.by+h};
      if(bb.x1<2||bb.x2>W-2||bb.y1<2||bb.y2>H-2)continue;
      if(placed.some(p=>hit(p,bb))||circ.some((q,i)=>nodes[i]!==d&&hit(q,bb)))continue;
      placed.push(bb);labs.push({t:d.id,x:c.x,y:c.y,a:c.a});break}});
  svg.append('g').selectAll('text').data(labs).join('text').attr('x',d=>d.x).attr('y',d=>d.y).attr('text-anchor',d=>d.a).attr('font-size',fs).style('font-weight',600).style('pointer-events','none')
    .style('paint-order','stroke').style('stroke','var(--paper)').attr('stroke-width',3.5).text(d=>d.t);
}
function teksInit(frek,khas,tren,bigram,meta){
  TK={frek,khas,tren,bigram,meta};
  const ft=sumber({},`Korpus ${meta.n_dokumen} BRS pariwisata`,'brs');document.querySelectorAll('[data-src=teks]').forEach(e=>e.innerHTML=ft);
  $('#teksNote').textContent=`Korpus: ${meta.n_dokumen} BRS, data ${meta.bulan_awal} s.d. ${meta.bulan_akhir}. Bulan data tanpa BRS pariwisata: ${meta.bulan_tanpa_dokumen.join(', ')}.`;
  const dl=$('#kataList');Object.keys(tren.kata).forEach(w=>dl.append(new Option(w)));
  const inp=$('#kataInput');inp.value=TW.join(', ');inp.addEventListener('input',()=>{TW=inp.value.toLowerCase().split(/[,\s]+/).filter(Boolean).slice(0,4);kataRender()});
  kataSegs();
  /* data untuk teks langkah */
  const nd=id=>meta.periode.find(p=>p.id===id).n_dok;
  const rank=(id,w)=>frek[id].findIndex(r=>r.kata===w)+1;
  const first=(w)=>{const v=tren.kata[w];const i=v.findIndex(x=>x>0);return i<0?null:tren.bulan[i]};
  const last=(w)=>{const v=tren.kata[w];let i=-1;v.forEach((x,j)=>{if(x>0)i=j});return i<0?null:tren.bulan[i]};
  const bl=ym=>ym?`${MONF[+ym.slice(5)-1]} ${ym.slice(0,4)}`:'-',nxt=ym=>{if(!ym)return null;const i=tren.bulan.indexOf(ym);return tren.bulan[i+1]||null};
  const pv=tren.kata['penumpang'].filter(x=>x>0),pMin=d3.min(pv),pMax=d3.max(pv);
  const khasPer=k=>khas[k].slice(0,4).map(r=>`"${r.kata}"`);
  const kp=khas['3_pemulihan'].find(r=>r.kata==='perjalanan');
  const steps=[
    {t:'Sebelum pandemi',tp:'1_pra_pandemi',tm:'frek',p:`Di ${nd('1_pra_pandemi')} BRS pra-pandemi, lima kata yang paling sering muncul adalah ${listID(frek['1_pra_pandemi'].slice(0,5).map(r=>`"${r.kata}"`))}, dan "penumpang" berada di peringkat ${rank('1_pra_pandemi','penumpang')}, tanda laporannya waktu itu masih memuat angkutan.`,stamp:['Indonesia']},
    {t:'Saat pandemi',tp:'2_pandemi',tm:'khas',p:`Kata paling khas masa pandemi adalah ${listID(khasPer('2_pandemi'))}. Kosakatanya condong ke bandara dan angkutan udara karena BRS waktu itu masih mencampur data pariwisata dengan transportasi.`},
    {t:'Masa pemulihan',tp:'3_pemulihan',tm:'khas',p:`Kata paling khas masa pemulihan adalah ${listID(khasPer('3_pemulihan'))}. "Perjalanan" muncul ${fmt.format(kp.per10rb)} kali per 10 ribu kata, padahal di periode lain nyaris nol (${fmt1.format(kp.per10rb_lain)}). ${khas['3_pemulihan'].some(r=>r.kata==='penumpang')?'':'Sementara itu "penumpang" tidak lagi masuk daftar kata paling khas.'}`,hand:'Kamus laporannya ganti halaman.'},
    {t:'Dalam bentuk awan',tp:'3_pemulihan',tm:'awan',p:`Dalam awan kata masa pemulihan ini, makin besar tulisannya, makin sering kata itu dipakai, dan kamu bisa mengganti periode atau ukuran dengan tombol di atas grafik.`},
    {t:'Giliranmu menjelajah',tp:'3_pemulihan',tm:'frek',free:true,p:`Semua tombol di atas grafik tetap bisa dipakai, dan kursor yang diarahkan ke batang akan menampilkan jumlah dokumen yang memuat kata itu.`}];
  teksSegs();frekRender(false);watch($('#frekChart'),()=>frekRender(false));
  scrolly('sc-frek',steps,(i,s)=>{TP=s.tp;TM=s.tm;teksSegs();frekRender(true);bigramRender()});
  const ks=[
    {t:'Kata yang tiba-tiba hilang',w:['penumpang'],p:`"Penumpang" dipakai konsisten sejak 2015, antara ${fmt.format(pMin)} dan ${fmt.format(pMax)} kali per 10 ribu kata, lalu terakhir muncul pada ${bl(last('penumpang'))} dan setelah itu nol.`},
    {t:'Format laporannya berubah',w:['penumpang','perjalanan'],p:`Penyebabnya ada di judul BRS: sampai data ${bl(last('penumpang'))}, judulnya masih memuat pariwisata sekaligus penumpang angkutan, tetapi sejak data ${bl(nxt(last('penumpang')))} isinya hanya membahas pariwisata. Jadi hilangnya "penumpang" menandakan format laporan berubah, bukan kebiasaan menulis. Sementara itu "perjalanan" mulai muncul pada ${bl(first('perjalanan'))}.`},
    {t:'Wisata nusantara ikut masuk',w:['perjalanan','wisnus','wisnas'],p:`"Wisnus" pertama muncul pada ${bl(first('wisnus'))}, bertepatan dengan BRS yang mulai memuat perjalanan wisatawan nusantara, dan "wisnas" menyusul pada ${bl(first('wisnas'))}. Artinya laporan mulai membahas perjalanan penduduk Indonesia sendiri.`},
    {t:'Giliranmu mencari kata',w:['wisman','wisatawan'],free:true,p:`Ketik kata apa saja (maksimal empat, pisahkan dengan koma) atau pakai tombol pilihan cepat, dan perlu diingat hanya kata-kata teratas yang tersedia untuk dicari.`}];
  setW(ks[0].w);watch($('#trenKata'),kataRender);
  scrolly('sc-kata',ks,(i,s)=>setW(s.w));
  const topL=id=>[...bigram[id].links].sort((a,b)=>b.value-a.value)[0];
  const vv=(id,a,b)=>{const l=bigram[id].links.find(l=>(l.source.id||l.source)===a&&(l.target.id||l.target)===b);return l?l.value:0};
  const bs=PER.map(([id,l],i)=>{const t=topL(id);
    const rk=[...bigram[id].links].sort((a,b)=>b.value-a.value).findIndex(l=>l.source==='kunjungan'&&l.target==='wisman')+1;
    const extra=id==='3_pemulihan'&&rk>1?` Pasangan "kunjungan wisman" tergeser ke peringkat ${rk} (${fmt.format(vv(id,'kunjungan','wisman'))} kali), karena perhotelan kini dibahas lebih sering daripada kunjungan wisman.`:'';
    return {t:l,tp:id,p:`Pasangan yang paling sering muncul adalah <b>"${t.source} ${t.target}"</b> (${fmt.format(t.value)} kali).${extra}`}});
  bs.push({t:'Giliranmu menjelajah',tp:TP,free:true,p:`Ganti periode dengan tombol di atas jaringan, lalu arahkan kursor ke titik atau garis untuk melihat pasangan katanya.`});
  bigramRender();watch($('#bigramChart'),bigramRender);
  scrolly('sc-bigram',bs,(i,s)=>{if(!s.free)TP=s.tp;teksSegs();frekRender(false);bigramRender()});
  kataRender();
}

/* =====================================================================
   NAVIGASI: scroll-spy + progres
   ===================================================================== */
function navInit(){
  const links=[...document.querySelectorAll('#navlist a')],secs=links.map(a=>document.getElementById(a.dataset.sec));
  const on=id=>links.forEach(a=>{const o=a.dataset.sec===id;a.classList.toggle('is-on',o);if(o){a.setAttribute('aria-current','true');const ul=a.parentElement.parentElement,l=a.offsetLeft-ul.clientWidth/2+a.clientWidth/2;if(ul.scrollWidth>ul.clientWidth)ul.scrollTo({left:l,behavior:RM?'auto':'smooth'})}else a.removeAttribute('aria-current')});
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)on(e.target.id)}),{rootMargin:'-40% 0px -55% 0px'});
  secs.forEach(s=>s&&io.observe(s));on('tiket');
  const bar=$('#progress');const upd=()=>{const h=document.documentElement.scrollHeight-innerHeight;bar.style.transform=`scaleX(${h>0?Math.min(1,scrollY/h):0})`};
  addEventListener('scroll',upd,{passive:true});upd();
}

/* =====================================================================
   MULAI
   ===================================================================== */
navInit();
Promise.all([d3.json('data/aliran_wisman_2024.json'),d3.json('data/tren_wisman.json'),d3.json('data/hierarki_pdrb.json'),
  ...['frekuensi','khas','tren','bigram','meta'].map(n=>d3.json(`data/teks_${n}.json`)),d3.csv('data/koordinat_negara_asal.csv',r=>({negara:r.negara,kawasan:r.kawasan,lat:+r.lat,lon:+r.lon,jenis_titik:r.jenis_titik})),d3.json('data/dunia_110m.geojson')])
.then(([aliran,tren,hier,frek,khas,tk,bigram,meta,coord,world])=>{
  D=aliran;PIN=Object.fromEntries(D.pintu.map(p=>[p.id,p]));coord.forEach(c=>COORD[c.negara]=c);MP.world=world;
  hero();trenInit(tren);petaInit(world);sankeyInit();odInit();hierInit(hier);teksInit(frek,khas,tk,bigram,meta);kesimpulanInit();
  window.__ready=true;
}).catch(e=>{console.error(e);$('#heroLead').textContent='Gagal memuat data. Jalankan lewat server (mis. python -m http.server), bukan file://. '+e});
/* =====================================================================
   6. KESIMPULAN (semua angka dihitung dari data)
   ===================================================================== */
function kesimpulanInit(){
  const T=D.meta.total,pin=[...D.pintu].sort((a,b)=>b.total-a.total),top=pin[0],top3=sumBy(pin.slice(0,3),p=>p.total);
  const nTot=sortedEntries(group(D.negara,r=>r.negara,r=>r.nilai)),n3=sumBy(nTot.slice(0,3),x=>x[1]);
  const t=TR.t,rec=t[2025]/t[2019]*100,low=TR.lo;
  const I=HD.kategori.findIndex(c=>c.kode==='I'),y=HY;
  const shr=pi=>sumBy(HD.data.filter(r=>r[0]===pi&&r[1]===I),r=>r[y])/sumBy(HD.data.filter(r=>r[0]===pi),r=>r[y])*100;
  const bali=shr(HD.provinsi.indexOf('Bali')),nas=sumBy(HD.data.filter(r=>r[1]===I),r=>r[y])/sumBy(HD.data,r=>r[y])*100;
  const nd=TK.meta.periode.reduce((a,p)=>a+p.n_dok,0);
  $('#cLead').innerHTML=`Dari tiket sampai meja makan, datanya bercerita satu hal: wisatawan asing memang datang ke Indonesia, tetapi <b>pintu tempat mereka masuk tidak sama dengan tempat mereka tinggal dan berbelanja</b>.`;
  const lowTxt=MONF[low.t.getMonth()]+' '+low.t.getFullYear();
  $('#cStats').innerHTML=[
    [pct(top.total,T,0),`kunjungan lewat satu bandara: ${top.nama_pendek}`],
    [pct(top3,T,0),'lewat tiga pintu teratas'],
    [fmt1.format(rec)+'%',`total 2025 dibanding 2019`],
    [fmt1.format(bali)+'%',`PDRB Bali dari akomodasi dan makan minum (rata-rata 38 provinsi: ${fmt1.format(nas)}%)`]
  ].map(([b,t])=>`<div class="stat"><b>${b}</b><span>${t}</span></div>`).join('');
  $('#cFinds').innerHTML=[
    `<b>Kedatangan sangat terkonsentrasi.</b> Pada 2024, ${top.nama_pendek} menerima ${pct(top.total,T,0)} dari ${juta(T)} kunjungan, dan tiga pintu teratas menerima ${pct(top3,T,0)}.`,
    `<b>Asalnya lebih terpusat daripada kelihatannya.</b> Tiga negara asal teratas (${nTot.slice(0,3).map(x=>x[0]).join(', ')}) membawa ${pct(n3,T,0)} kunjungan.`,
    `<b>${rec>=100?'Pemulihan sudah terlewati':'Pemulihan hampir tuntas'}.</b> Total 2025 mencapai ${fmt1.format(rec)}% dari total 2019, setelah titik terendah pada ${lowTxt} (${fmt.format(low.wisman)} kunjungan sebulan).`,
    `<b>Kamar dan meja makan paling terasa di Bali.</b> Akomodasi dan makan minum menyumbang ${fmt1.format(bali)}% PDRB Bali, dibanding ${fmt1.format(nas)}% rata-rata 38 provinsi. Ini korelasi, bukan bukti bahwa wisman penyebabnya.`,
    `<b>Cara BPS bercerita ikut berubah.</b> Dari ${fmt.format(nd)} Berita Resmi Statistik dalam korpus, kosakata antarperiode bergeser. Sebabnya terlihat dari judul laporan: sampai data Juli 2023 BRS ini masih memuat penumpang angkutan, dan sejak data Agustus 2023 isinya hanya pariwisata.`
  ].map(s=>`<li>${s}</li>`).join('');
  $('#cTitle').innerHTML=`Angka ${pct(top.total,T,0)} di ${top.nama_pendek} adalah angka <b>kedatangan</b>. Data BPS ini mencatat di mana wisman melintasi perbatasan, bukan ke mana mereka pergi, berapa malam menginap, atau berapa uang yang dibelanjakan. Karena itu bandara tersibuk tidak boleh otomatis dibaca sebagai destinasi terfavorit. Ia hanya menunjukkan di mana infrastruktur kedatangan paling dipakai. Judul kita mengingatkan jarak antara <i>pintu</i> dan <i>tujuan</i>.`;
  $('#cLim').innerHTML=[
    `Analisis gerbang, asal, dan PDRB memakai potret satu tahun (2024). Hanya tren bulanan (2019–2025) dan korpus BRS yang melintasi banyak tahun.`,
    `Total kunjungan di edisi 2024 dan 2025 sedikit berbeda (13.902.420 pada edisi 2024 dibanding 13.886.678 pada edisi 2025 untuk tahun yang sama), sehingga angka dua edisi tidak dicampur dalam satu hitungan.`,
    `PDRB memakai harga konstan dan angka 2023–2024 masih sementara.`,
    `Hubungan PDRB akomodasi dengan pintu masuk bersifat deskriptif, tidak menunjukkan sebab-akibat.`
  ].map(s=>`<li>${s}</li>`).join('');
  $('#cNext').innerHTML=[
    `Menggabungkan data lama tinggal, pengeluaran, dan tujuan perjalanan wisman untuk melihat destinasi yang sebenarnya.`,
    `Menambahkan data pintu masuk 2025 per kebangsaan agar potret gerbang ikut bergerak.`,
    `Membandingkan pola kosakata BRS dengan angka kunjungan bulanan secara formal.`
  ].map(s=>`<li>${s}</li>`).join('');
}

