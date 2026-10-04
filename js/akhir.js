/* Penutup: poin "bawa pulang" dan keterbatasan, semua angka dihitung dari data. */
(function(){
  const $=id=>document.getElementById(id), fmt=W.fmt;
  Promise.all([W.aliran,W.load('tren_wisman'),W.load('hierarki_pdrb'),W.load('teks_awan')]).then(([a,t,h,aw])=>{
    const T=a.meta.total, byP={}, byK={};
    a.links.forEach(l=>{byP[l.pintu]=(byP[l.pintu]||0)+l.nilai; byK[l.kawasan]=(byK[l.kawasan]||0)+l.nilai;});
    const nm=Object.fromEntries(a.pintu.map(p=>[p.id,p.nama_pendek]));
    const pp=Object.entries(byP).sort((x,y)=>y[1]-x[1]), kk=Object.entries(byK).sort((x,y)=>y[1]-x[1]);
    const r=t.bulanan.filter(d=>d.ym<'2026'), avg19=d3.mean(r.filter(d=>d.ym.startsWith('2019')),d=>d.wisman), low=d3.least(r,d=>d.wisman);
    const IA=h.kategori.findIndex(k=>k.kode==='I'), rows=h.data, ia=d3.sum(rows.filter(x=>x[1]===IA),x=>x[3]), tot=d3.sum(rows,x=>x[3]);
    const p=aw.kata.find(x=>x.w==='penumpang'), j=aw.kata.find(x=>x.w==='perjalanan');
    $('bawaPulang').innerHTML=[
      `Dua pintu, ${nm[pp[0][0]]} dan ${nm[pp[1][0]]}, menerima ${W.pct(pp[0][1]+pp[1][1],T,0)} dari ${fmt.format(T)} kunjungan wisman 2024. Kebijakan yang menyentuh dua pintu ini menjangkau sebagian besar wisman.`,
      `${kk[0][0]} adalah kawasan asal terbesar (${W.pct(kk[0][1],T,0)}), tetapi tiap kawasan punya pintu favorit sendiri; indeks spesialisasi pada matriks menunjukkan siapa memilih apa.`,
      `Kunjungan bulanan sempat jatuh ke ${fmt.format(low.wisman)}, hanya ${W.pct(low.wisman,avg19,1)} dari rata-rata bulanan 2019.`,
      `Akomodasi dan makan minum adalah ${W.pct(ia,tot,1)} dari PDRB (ADHK) 38 provinsi: sektor kecil secara nasional yang bergantung pada wisman di daerah tertentu.`,
      p&&j?`Teks BRS bergeser: "penumpang" turun dari ${W.fmt1.format(p.sebelum)} ke ${W.fmt1.format(p.sesudah)} per 10.000 kata dan "perjalanan" naik dari ${W.fmt1.format(j.sebelum)} ke ${W.fmt1.format(j.sesudah)}. Kosakata angkutan (penumpang, barang, kereta, diangkut) tidak ditemukan pada BRS sejak data Agustus 2023; alasan perubahan isi ini tidak tercatat dalam korpus.`:''
    ].filter(Boolean).map(s=>`<li>${s}</li>`).join('');
    const y24=d3.sum(r.filter(d=>d.ym.startsWith('2024')),d=>d.wisman);
    $('batas').innerHTML=[
      `Data ini mencatat <b>pintu masuk</b>, bukan destinasi akhir; ke mana wisman pergi setelah masuk tidak terlihat.`,
      `Peta penerbangan hanya menggambar aliran negara × pintu dengan lokasi jelas dan minimal 20.000 kunjungan (sekitar 69% total); sisanya tidak digambar. Garis lurus melengkung bukan rute penerbangan sebenarnya, dan koordinat negara adalah titik pusat perkiraan.`,
      `Total 2024 pada diagram aliran (${fmt.format(T)}) berbeda dari jumlah 12 bulan pada tabel bulanan (${fmt.format(y24)}); keduanya angka BPS dari tabel berbeda. Jumlah bulanan 2020 juga berbeda tipis dari total tahunan di tabel.`,
      `PDRB 2023 bersifat sementara dan 2024 sangat sementara. Hubungan wisman dengan PDRB akomodasi dan makan minum tidak diuji secara kausal.`,
      `Korpus teks hanya 127 dokumen dan tiga bulan tidak ada dokumen. Korpus hanya memuat isi BRS sehingga alasan perubahan kosakata sejak data Agustus 2023 tidak dapat ditentukan darinya. Pada bigram periode pemulihan, "papua" berpasangan dengan "pegunungan" (319 kali), "tengah" (285), dan "selatan" (271).`
    ].map(s=>`<li>${s}</li>`).join('');
  }).catch(e=>console.error(e));
})();
