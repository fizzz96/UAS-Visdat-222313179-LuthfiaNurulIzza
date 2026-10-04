/* Bab 2: tren bulanan wisman 2019-2025 dengan pembanding rata-rata bulanan 2019. */
(function(){
  const $=id=>document.getElementById(id), fmt=W.fmt;
  const BLN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const lab=ym=>{const[y,m]=ym.split('-');return BLN[+m-1]+' '+y;};
  Promise.all([W.load('tren_wisman'),W.aliran]).then(([t,a])=>{
    const r=t.bulanan.filter(d=>d.ym<'2026'), y19=r.filter(d=>d.ym.startsWith('2019')), avg19=d3.mean(y19,d=>d.wisman), tot19=d3.sum(y19,d=>d.wisman);
    const low=d3.least(r,d=>d.wisman);
    const back=r.find(d=>d.ym>'2021-12'&&d.wisman>=avg19), y24=d3.sum(r.filter(d=>d.ym.startsWith('2024')),d=>d.wisman), y25=d3.sum(r.filter(d=>d.ym.startsWith('2025')),d=>d.wisman);
    $('trenLead').innerHTML=`Pada ${lab(low.ym)} hanya ${fmt.format(low.wisman)} wisman masuk dalam sebulan, ${W.pct(low.wisman,avg19,1)} dari rata-rata bulanan 2019 (${fmt.format(Math.round(avg19))}). `+
      (back?`Kunjungan bulanan baru melampaui rata-rata 2019 pada ${lab(back.ym)}.`:'Kunjungan bulanan belum melampaui rata-rata 2019.');
    $('trenChips').innerHTML=[['Total 2019',fmt.format(tot19)],['Titik terendah',fmt.format(low.wisman)+' ('+lab(low.ym)+')'],['Total 2024 (jumlah bulanan)',fmt.format(y24)+' ('+W.pct(y24,tot19,0)+' dari 2019)'],['Total 2025',fmt.format(y25)+' ('+W.pct(y25,tot19,0)+' dari 2019)']]
      .map(([k,v])=>`<div class="chip">${k}<b>${v}</b></div>`).join('');
    $('trenNote').innerHTML=`Jumlah 12 bulan 2024 dari tabel bulanan (${fmt.format(y24)}) berbeda tipis dari total pada diagram aliran (${fmt.format(a.meta.total)}) karena BPS merilis keduanya dari tabel yang berbeda; tiap angka dipakai pada konteksnya. Rata-rata bulanan 2019 = ${fmt.format(Math.round(avg19))}.`;
    $('srcTren').innerHTML=W.sumber(t.meta,'Kunjungan wisman per bulan, Januari 2019–Desember 2025','tren');
    draw(r,avg19); W.onResize(()=>draw(r,avg19));
  }).catch(e=>W.fail('trenChart',e));

  function draw(r,avg){
    const el=$('trenChart'); el.innerHTML='';
    const Wd=W.lebar(el), mob=Wd<560, m={t:16,r:mob?10:18,b:30,l:mob?46:58}, H=mob?300:380;
    const dt=ym=>new Date(ym+'-15'), x=d3.scaleTime().domain([new Date('2019-01-01'),new Date('2025-12-31')]).range([m.l,Wd-m.r]);
    const y=d3.scaleLinear().domain([0,d3.max(r,d=>d.wisman)*1.08]).nice().range([H-m.b,m.t]);
    const svg=d3.select(el).append('svg').attr('viewBox',[0,0,Wd,H]).attr('role','img').attr('aria-label','Garis kunjungan wisman bulanan 2019 sampai 2025');
    svg.append('rect').attr('x',x(new Date('2020-03-01'))).attr('width',x(new Date('2021-12-31'))-x(new Date('2020-03-01'))).attr('y',m.t).attr('height',H-m.b-m.t).attr('fill','#9aa5b4').attr('opacity',.22);
    svg.append('text').attr('x',x(new Date('2020-03-01'))+6).attr('y',m.t+13).attr('font-size',11).attr('fill','#44546a').text('Pandemi');
    svg.append('g').selectAll('line').data(y.ticks(5)).join('line').attr('x1',m.l).attr('x2',Wd-m.r).attr('y1',y).attr('y2',y).attr('stroke','#d9d4c7');
    svg.append('g').selectAll('text').data(y.ticks(5)).join('text').attr('x',m.l-6).attr('y',y).attr('dy','0.35em').attr('text-anchor','end').attr('font-size',11).attr('fill','#44546a').text(v=>v?v/1e6+' jt':'0');
    svg.append('g').selectAll('text').data(d3.range(2019,2026)).join('text').attr('x',v=>x(new Date(v+'-07-01'))).attr('y',H-9).attr('text-anchor','middle').attr('font-size',11).attr('fill','#44546a').text(v=>v);
    svg.append('line').attr('x1',m.l).attr('x2',Wd-m.r).attr('y1',y(avg)).attr('y2',y(avg)).attr('stroke','#1D3557').attr('stroke-dasharray','5 4').attr('opacity',.7);
    svg.append('text').attr('x',Wd-m.r).attr('y',y(avg)-6).attr('text-anchor','end').attr('font-size',11).attr('fill','#1D3557').text('rata-rata bulanan 2019');
    svg.append('path').datum(r).attr('fill','none').attr('stroke','#0072B2').attr('stroke-width',2.4).attr('d',d3.line().x(d=>x(dt(d.ym))).y(d=>y(d.wisman)));
    const low=d3.least(r,d=>d.wisman);
    svg.append('circle').attr('cx',x(dt(low.ym))).attr('cy',y(low.wisman)).attr('r',4.5).attr('fill','#E63946');
    svg.append('text').attr('x',x(dt(low.ym))+8).attr('y',y(low.wisman)-8).attr('font-size',11).attr('fill','#1D3557').attr('font-weight',700).text(lab(low.ym));
    const dot=svg.append('circle').attr('r',5).attr('fill','#1D3557').attr('stroke','#fff').attr('stroke-width',2).style('display','none');
    svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',Wd-m.l-m.r).attr('height',H-m.t-m.b).attr('fill','transparent').style('touch-action','pan-y')
      .on('pointermove',ev=>{ const px=d3.pointer(ev)[0], d=d3.least(r,q=>Math.abs(x(dt(q.ym))-px));
        dot.style('display',null).attr('cx',x(dt(d.ym))).attr('cy',y(d.wisman));
        W.showTip(ev,`<b>${lab(d.ym)}</b><br>${fmt.format(d.wisman)} wisman<br>${W.pct(d.wisman,avg,0)} dari rata-rata bulanan 2019`); })
      .on('pointerleave',()=>{dot.style('display','none');W.hideTip();});
  }
})();
