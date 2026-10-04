/* Inti bersama: format angka, sumber data, tooltip, pemuatan data, dan animasi muncul. */
window.W = (function(){
  const W = {};
  W.fmt  = new Intl.NumberFormat('id-ID');
  W.fmt1 = new Intl.NumberFormat('id-ID',{maximumFractionDigits:1});
  W.fmt2 = new Intl.NumberFormat('id-ID',{maximumFractionDigits:2});
  W.pct  = (a,b,d=1)=> new Intl.NumberFormat('id-ID',{maximumFractionDigits:d}).format(a/b*100)+'%';
  W.jt   = v => W.fmt1.format(v/1e6)+' juta';
  W.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  W.clamp = (x,a=0,b=1)=> Math.max(a,Math.min(b,x));
  W.ease  = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;      // easeInOutCubic
  W.lebar = el => Math.max(300, el.clientWidth);

  // Palet kawasan asal: Okabe-Ito (ramah buta warna)
  W.KAW = {'ASEAN':'#E69F00','Asia Lainnya':'#0072B2','Timur Tengah':'#009E73','Eropa':'#CC79A7','Amerika':'#D55E00','Oseania':'#56B4E9','Afrika':'#7a7a7a'};
  W.NAVY = '#1D3557'; W.RED = '#E63946'; W.SUN = '#FFB703';

  // Satu tempat untuk mengubah URL dan tanggal akses
  const TGL='3 Oktober 2026',
    U24='https://www.bps.go.id/id/publication/2025/03/20/a85d584df19ea65a5e2b3d0b',
    U25='https://www.bps.go.id/id/publication/2026/04/30/4fb8642851550952baead819/statistik-kunjungan-wisatawan-mancanegara-2025.html';
  W.SRC = {
    aliran:{pub:'Statistik Kunjungan Wisatawan Mancanegara 2024 (rilis 20 Maret 2025)',tahun:'2024',url:U24,tgl:TGL},
    tren:{pub:'Statistik Kunjungan Wisatawan Mancanegara 2025 (rilis 30 April 2026), tabel kunjungan per bulan 2000–2025',tahun:'2019–2025',url:U25,tgl:TGL},
    pdrb:{pub:'Produk Domestik Regional Bruto Provinsi-Provinsi di Indonesia Menurut Lapangan Usaha 2020–2024 (rilis 11 April 2025)',tahun:'2023–2024',url:'https://www.bps.go.id/id/publication/2025/04/11/95c729ee8c6fb5e2cb86b00f',tgl:TGL},
    brs:{pub:'Berita Resmi Statistik (BRS) pariwisata, daftar tiap dokumen di data/sumber_brs.csv',tahun:'data Nov 2015–Agu 2026',url:'https://www.bps.go.id/id/pressrelease',tgl:'1–3 Oktober 2026'}
  };
  W.sumber = function(meta,judul,key){
    const s=W.SRC[key]||{}, url=s.url||meta.url, t=s.tgl||meta.tanggal_akses;
    const u=url?`<a href="${url}">${url}</a>`:'[ISI URL]', tg=t||'[ISI TANGGAL AKSES]';
    return `<b>${judul}</b><br>Sumber: BPS, ${s.pub||meta.sumber}. Tahun data: ${s.tahun||meta.tahun}. URL: ${u}. Diakses: ${tg}.`;
  };

  // Tooltip
  const tip = d3.select('#tip');
  W.showTip = function(ev,html){
    tip.html(html).style('opacity',1);
    const w=tip.node().offsetWidth; let x=ev.clientX+14,y=ev.clientY+14;
    if(x+w>innerWidth-8) x=ev.clientX-w-14;
    tip.style('left',Math.max(8,x)+'px').style('top',y+'px');
  };
  W.hideTip = ()=>tip.style('opacity',0);

  // Muat data sekali, dipakai bersama
  const cache={};
  W.load = name => cache[name] || (cache[name]=fetch(`data/${name}.json`).then(r=>{ if(!r.ok) throw new Error(name+': '+r.status); return r.json(); }));
  W.aliran = W.load('aliran_wisman_2024');

  // Resize dengan jeda
  W.onResize = fn => { let t; addEventListener('resize',()=>{clearTimeout(t); t=setTimeout(fn,200);}); };

  // Segmented buttons
  W.segmen = function(id,items,get,set){
    const el=document.getElementById(id); el.innerHTML='';
    items.forEach(([v,l])=>{
      const b=document.createElement('button'); b.type='button'; b.textContent=l;
      b.setAttribute('aria-pressed',get()===v); b.onclick=()=>set(v); el.append(b);
    });
  };

  // Animasi muncul saat masuk layar
  function reveal(){
    const els=[...document.querySelectorAll('.rv')];
    if(!('IntersectionObserver' in window) || W.reduce){ els.forEach(e=>e.classList.add('in')); return; }
    const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} }),{rootMargin:'0px 0px -8% 0px',threshold:.06});
    els.forEach(e=>io.observe(e));
  }
  document.addEventListener('DOMContentLoaded',reveal);

  W.fail = (id,e)=>{ const el=document.getElementById(id); if(el) el.textContent='Gagal memuat data. Jalankan lewat server (mis. python -m http.server), bukan file://. '+e; console.error(e); };
  return W;
})();
