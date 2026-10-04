/* Pembuka: peta penerbangan yang digerakkan gulir.
   Teknik aliran #3 (flow map). Garis = negara asal -> pintu masuk, tebal = jumlah kunjungan 2024.
   Semua teks adegan dan angka dihitung dari data (aliran_wisman_2024.json); tidak ada angka tertulis tangan.
   Basemap: Natural Earth (domain publik) via world-atlas; koordinat negara = titik pusat, hanya untuk menggambar garis. */
(function(){
  const $ = id => document.getElementById(id);
  const scroller=$('mapscroll'), stage=$('mapstage'), svgEl=$('mapsvg');
  const cap=$('mapcap'), capK=$('capK'), capT=$('capT'), legend=$('maplegend'), note=$('mapnote');
  const heroT=$('heroTitle'), cue=$('cue'), counter=$('counter');

  Promise.all([W.aliran, fetch('data/peta_dunia_50m.json').then(r=>r.json()), d3.csv('data/koordinat_negara_asal.csv',d3.autoType)])
    .then(([A,topo,coords])=>init(A,topo,coords))
    .catch(e=>{ W.fail('lede',e); });

  // Ikon kendaraan (satuan sekitar ±12). Pesawat berputar mengikuti arah; kapal dan truk hanya dibalik.
  const ICON = {
    'Bandara/Airport':'M12 0 L5 -2.2 L-1 -10 L-4.4 -10 L-1.6 -2.4 L-7 -2.4 L-9.4 -5.6 L-11.6 -5.6 L-10 0 L-11.6 5.6 L-9.4 5.6 L-7 2.4 L-1.6 2.4 L-4.4 10 L-1 10 L5 2.2 Z',
    'Pelabuhan Laut/Seaport':'M-11 1 L11 1 L7 7.5 L-7 7.5 Z M-1.5 -10 L-1.5 -1 L8 -1 Z',
    'Pos Lintas Batas Darat/Landport':'M-11 -6 H2 V3 H-11 Z M3 -2 H8 L11 1 V3 H3 Z M-5 5 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M6 5 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0'
  };
  const JENIS = {'Bandara/Airport':'pesawat','Pelabuhan Laut/Seaport':'kapal','Pos Lintas Batas Darat/Landport':'truk'};

  function init(A,topo,coords){
    const NEG = new Map(coords.filter(c=>c.jenis_titik==='negara').map(c=>[c.negara,c]));
    const PIN = Object.fromEntries(A.pintu.map(p=>[p.id,p]));
    const T = A.meta.total;
    const sumBy = f => A.negara.filter(f).reduce((s,r)=>s+r.nilai,0);
    const val = (n,p)=>sumBy(r=>r.negara===n&&r.pintu===p);
    const totNeg = n=>sumBy(r=>r.negara===n);
    const linkVal = (k,p)=>A.links.filter(l=>l.kawasan===k&&l.pintu===p).reduce((s,l)=>s+l.nilai,0);
    const kawTot = Object.fromEntries(A.kawasan.map(k=>[k.id,k.total]));
    const NR='ngurah_rai_bali', SH='soekarno_hatta_banten';

    // ---- daftar aliran yang digambar: negara (bukan wilayah gabungan) x pintu berkoordinat, >= 20 ribu kunjungan
    const BATAS = 20000;
    const flows = A.negara.filter(r=>NEG.has(r.negara)&&PIN[r.pintu]&&PIN[r.pintu].lat!=null&&r.nilai>=BATAS)
      .map(r=>({negara:r.negara,kawasan:r.kawasan,pintu:r.pintu,nilai:r.nilai,o:[NEG.get(r.negara).lon,NEG.get(r.negara).lat],d:[PIN[r.pintu].lon,PIN[r.pintu].lat],jenis:PIN[r.pintu].kategori}))
      .sort((a,b)=>b.nilai-a.nilai);
    const drawn = d3.sum(flows,f=>f.nilai), maxV = d3.max(flows,f=>f.nilai);
    const fk = (n,p)=>flows.find(f=>f.negara===n&&f.pintu===p);

    // ---- adegan (acts). 'p' = rentang progres gulir; 'view' = kotak kamera [lon0,lat0,lon1,lat1]
    const ACTS = [
      {id:'oseania',p:[.08,.25],view:[99,-40,160,9],dy:-.02,kick:'Penerbangan 1 · Oseania',fl:[['Australia',NR],['Selandia Baru',NR]]},
      {id:'asia',p:[.25,.43],view:[66,-16,150,46],dy:-.02,kick:'Penerbangan 2 · Asia',fl:[['Tiongkok',SH],['Tiongkok',NR],['India',NR],['Korea Selatan',NR],['Jepang',SH],['Singapura',SH],['Malaysia',SH],['Malaysia',NR]]},
      {id:'barat',p:[.43,.60],view:null,dy:-.03,kick:'Penerbangan 3 · Belahan barat',fl:[['Inggris',NR],['Jerman',NR],['Perancis',NR],['Belanda',NR],['Rusia',NR],['Amerika Serikat',NR],['Kanada',NR]]},
      {id:'kepri',p:[.60,.78],view:[100,-1.6,107,4.4],dy:-.05,kick:'Penyeberangan · Selat Singapura',fl:[['Singapura','batam_kepri'],['Malaysia','batam_kepri'],['Singapura','tanjung_uban_kepri'],['Malaysia','tanjung_uban_kepri']]},
      {id:'darat',p:[.78,.89],view:[94,-12,150,7],dy:-.05,kick:'Lintas darat · Perbatasan',fl:[['Timor Leste','atambua_ntt'],['Papua Nugini','skouw_papua']]},
      {id:'semua',p:[.89,1.0],view:[94,-12,150,7],dy:-.05,kick:'Semua jalur · 2024',fl:null}
    ];
    const taken = new Set();
    ACTS.forEach(a=>{ if(a.fl){ a.flows=a.fl.map(([n,p])=>fk(n,p)).filter(Boolean); a.flows.forEach(f=>taken.add(f)); } });
    ACTS.find(a=>a.id==='semua').flows = flows.filter(f=>!taken.has(f));

    const pctKaw = (k,p)=>W.pct(linkVal(k,p),kawTot[k]);
    const nm = p=>PIN[p].nama_pendek.replace(/ \(.*\)$/,'');
    const TEXT = {
      oseania:()=>`Australia mengirim ${W.fmt.format(val('Australia',NR))} kunjungan ke Ngurah Rai, Selandia Baru ${W.fmt.format(val('Selandia Baru',NR))}. Dari seluruh wisman Oseania, ${pctKaw('Oseania',NR)} tercatat masuk lewat Bali.`,
      asia:()=>`Tiongkok terbagi dua jalan: ${W.fmt.format(val('Tiongkok',SH))} ke Soekarno–Hatta dan ${W.fmt.format(val('Tiongkok',NR))} ke Ngurah Rai. India, Korea Selatan, Jepang, Singapura, dan Malaysia memakai dua gerbang yang sama.`,
      barat:()=>`Dari jauh, wisman paling banyak tercatat masuk di Bali: ${pctKaw('Eropa',NR)} wisman Eropa dan ${pctKaw('Amerika',NR)} wisman Amerika lewat Ngurah Rai, jauh di atas Jakarta (${pctKaw('Eropa',SH)} dan ${pctKaw('Amerika',SH)}).`,
      kepri:()=>{ const s=['Singapura','Malaysia'].reduce((a,n)=>a+val(n,'batam_kepri')+val(n,'tanjung_uban_kepri'),0);
        const rank=[...A.pintu].sort((a,b)=>b.total-a.total).findIndex(p=>p.id==='batam_kepri')+1;
        return `${W.fmt.format(s)} kunjungan dari Singapura dan Malaysia masuk lewat Batam dan Tanjung Uban. Mereka naik kapal, bukan pesawat. Batam sendiri menerima ${W.fmt.format(PIN.batam_kepri.total)} kunjungan, pintu nomor ${rank} terbanyak.`; },
      darat:()=>`Di darat, Timor Leste ke Atambua mencatat ${W.fmt.format(val('Timor Leste','atambua_ntt'))} kunjungan dan Papua Nugini ke Skouw ${W.fmt.format(val('Papua Nugini','skouw_papua'))}. Lintas batas darat lainnya (${W.fmt.format(PIN.perbatasan_darat.total)}) tidak dirinci BPS per lokasi, jadi tidak digambar.`,
      semua:()=>{ const a=PIN[NR].total,b=PIN[SH].total;
        return `${nm(NR)} (${W.pct(a,T)}) dan ${nm(SH)} (${W.pct(b,T)}) menerima ${W.pct(a+b,T)} dari seluruh wisman. Titik merah membesar sesuai kunjungan yang tercatat di pintu itu. Pintu masuk adalah tempat mereka tercatat, bukan ke mana mereka pergi setelahnya.`; }
    };

    // ---- teks pembuka
    const top = [...A.pintu].sort((a,b)=>b.total-a.total)[0];
    $('lede').innerHTML = `<b>${W.fmt.format(T)}</b> kunjungan wisatawan mancanegara tercatat masuk Indonesia pada 2024. <b>${W.pct(top.total,T,0)}</b> di antaranya lewat satu pintu saja: ${top.nama_pendek}. Gulir untuk mengikuti penerbangannya.`;
    // penghitung rata-rata (bukan pencacahan waktu nyata)
    const detik = 366*86400, laju = T/detik, t0 = Date.now();
    counter.innerHTML = `<b id="cnt">0</b>wisman tiba sejak halaman ini dibuka, jika memakai rata-rata 2024 (satu orang tiap ${W.fmt1.format(1/laju)} detik). Ilustrasi, bukan hitungan waktu nyata.`;
    const cnt=$('cnt'); if(!W.reduce) setInterval(()=>{ cnt.textContent=W.fmt.format(Math.floor((Date.now()-t0)/1000*laju)); },400);

    // legenda
    const ikon = k=>`<svg width="22" height="16" viewBox="-13 -11 26 22" style="vertical-align:middle"><path d="${ICON[k]}" fill="#1D3557"/></svg>`;
    legend.innerHTML = A.kawasan.map(k=>`<div><i style="background:${W.KAW[k.id]}"></i>${k.nama}</div>`).join('')
      + `<div class="ico"><span>${ikon('Bandara/Airport')} bandara</span><span>${ikon('Pelabuhan Laut/Seaport')} pelabuhan</span><span>${ikon('Pos Lintas Batas Darat/Landport')} pos lintas batas</span></div>`
      + `<div style="margin-top:4px">Tebal garis = jumlah kunjungan</div>`;
    note.textContent = `Digambar: ${W.pct(drawn,T,0)} dari ${W.fmt.format(T)} kunjungan (negara dengan ≥ ${W.fmt.format(BATAS)} kunjungan ke pintu berlokasi jelas). Perbatasan laut/darat dan pintu lainnya tidak dirinci BPS. Sumber: BPS (diolah). Basemap: Natural Earth.`;

    // =================== gambar ===================
    let Wd,Hd,proj,gz,items,pins,sphereView,viewOf={},path;
    const world = topojson.feature(topo,topo.objects.countries).features.filter(f=>String(f.id)!=='010');
    const sw = v=>1.5+5.2*Math.sqrt(v/maxV);               // lebar garis (px layar)
    const dur = .062;

    function viewFromBox(b,dy){
      const [lon0,lat0,lon1,lat1]=b, pts=[];
      for(let i=0;i<=12;i++){ const u=i/12; pts.push([lon0+(lon1-lon0)*u,lat0],[lon0+(lon1-lon0)*u,lat1],[lon0,lat0+(lat1-lat0)*u],[lon1,lat0+(lat1-lat0)*u]); }
      const xy=pts.map(proj), x0=d3.min(xy,d=>d[0]),x1=d3.max(xy,d=>d[0]),y0=d3.min(xy,d=>d[1]),y1=d3.max(xy,d=>d[1]);
      const w=Math.max((x1-x0)*1.14,(y1-y0)*1.14*Wd/Hd);
      return {cx:(x0+x1)/2,cy:(y0+y1)/2,w,dy};
    }
    function viewWorld(dy){
      const [[x0,y0],[x1,y1]]=path.bounds({type:'Sphere'});
      return {cx:(x0+x1)/2,cy:(y0+y1)/2,w:Math.max((x1-x0)*1.03,(y1-y0)*1.03*Wd/Hd),dy};
    }

    function build(){
      Wd=stage.clientWidth; Hd=stage.clientHeight;
      proj=d3.geoNaturalEarth1().rotate([-118,0]).precision(.2);
      proj.fitExtent([[12,Hd*.1],[Wd-12,Hd-14]],{type:'Sphere'});
      path=d3.geoPath(proj);
      const svg=d3.select(svgEl); svg.selectAll('*').remove();
      svg.attr('viewBox',`0 0 ${Wd} ${Hd}`);
      gz=svg.append('g');
      gz.append('path').attr('d',path({type:'Sphere'})).attr('fill','none').attr('stroke','rgba(29,53,87,.18)').attr('stroke-width',1).attr('vector-effect','non-scaling-stroke');
      gz.append('path').attr('d',path(d3.geoGraticule10())).attr('fill','none').attr('stroke','rgba(29,53,87,.07)').attr('stroke-width',.6).attr('vector-effect','non-scaling-stroke');
      gz.append('g').selectAll('path').data(world).join('path').attr('class',d=>'land'+(String(d.id)==='360'?' id':'')).attr('d',path)
        .append('title').text(d=>d.properties.name);

      // views
      viewOf.hero=viewWorld(Wd<640?.1:.17); viewOf.world=Wd<640?viewFromBox([-12,-50,205,75],-.02):viewWorld(-.03);
      ACTS.forEach(a=>{ a.v=a.view?viewFromBox(a.view,a.dy):viewOf.world; });

      // busur
      const gArc=gz.append('g'), gVeh=gz.append('g'), gPin=gz.append('g'), gLbl=gz.append('g');
      const lineGen=d3.line();
      function arcPts(o,d){
        const gi=d3.geoInterpolate(o,d), n=Math.max(28,Math.min(110,Math.round(d3.geoDistance(o,d)*70)));
        const xy=d3.range(n+1).map(i=>proj(gi(i/n)));
        const dx=xy[n][0]-xy[0][0], dy=xy[n][1]-xy[0][1], len=Math.hypot(dx,dy)||1, lift=len>500?.07:(len>40?.14:.4);
        let nx=-dy/len, ny=dx/len; if(ny>0){ nx=-nx; ny=-ny; }              // normal yang menghadap ke atas layar
        return xy.map((p,i)=>{ const o=Math.sin(Math.PI*i/n)*len*lift; return [p[0]+nx*o, p[1]+ny*o]; });
      }
      // jadwal
      items=[];
      ACTS.forEach(a=>{
        const n=a.flows.length, last=a.id==='semua';
        a.flows.forEach((f,j)=>{
          let ws,we;
          if(last){ ws=a.p[0]+.004+(j/Math.max(1,n))*.05; we=ws+.045; }
          else { const s0=a.p[0]+.035, span=Math.max(0,(a.p[1]-.012-s0-dur)); ws=s0+(n>1?j*span/(n-1):0); we=ws+dur; }
          const pts=arcPts(f.o,f.d);
          const el=gArc.append('path').attr('class','arc').attr('d',lineGen(pts)).attr('stroke',W.KAW[f.kawasan]).attr('opacity',0);
          const L=el.node().getTotalLength();
          el.attr('stroke-dasharray',`${L} ${L}`).attr('stroke-dashoffset',L);
          const vh=gVeh.append('path').attr('class','veh').attr('d',ICON[f.jenis]).attr('opacity',0);
          el.on('pointermove',ev=>W.showTip(ev,`<b>${f.negara} → ${nm(f.pintu)}</b><br>${W.fmt.format(f.nilai)} kunjungan<br>${W.pct(f.nilai,totNeg(f.negara))} dari wisman ${f.negara}`)).on('pointerleave',W.hideTip);
          items.push({f,a,ws,we,el,vh,L,last,jenis:JENIS[f.jenis]});
        });
      });
      // penanda pintu
      const LBL={[NR]:{dx:10,dy:6,an:'start',k:0},[SH]:{dx:-10,dy:-8,an:'end',k:0},kualanamu_sumut:{dx:10,dy:4,an:'start',k:2.2},juanda_jatim:{dx:10,dy:4,an:'start',k:2.2},batam_kepri:{dx:-12,dy:16,an:'end',k:2.2},tanjung_uban_kepri:{dx:12,dy:20,an:'start',k:20},atambua_ntt:{dx:0,dy:22,an:'middle',k:2.2},skouw_papua:{dx:0,dy:-14,an:'middle',k:2.2}};
      pins=A.pintu.filter(p=>p.lat!=null&&items.some(i=>i.f.pintu===p.id)).map(p=>{
        const [x,y]=proj([p.lon,p.lat]), mine=items.filter(i=>i.f.pintu===p.id);
        const g=gPin.append('circle').attr('class','pintu-dot').attr('cx',x).attr('cy',y).attr('r',0);
        g.on('pointermove',ev=>W.showTip(ev,`<b>${p.nama}</b><br>${W.fmt.format(p.total)} kunjungan (${W.pct(p.total,T)} dari total)`)).on('pointerleave',W.hideTip);
        const lb=gLbl.append('text').attr('class','pintu-lbl').attr('x',x).attr('y',y).attr('text-anchor',(LBL[p.id]||{an:'start'}).an).text(nm(p.id)).attr('opacity',0);
        return {p,x,y,g,lb,mine,sumDrawn:d3.sum(mine,i=>i.f.nilai),conf:LBL[p.id]||{dx:10,dy:4,an:'start',k:2.2}};
      });
      // label negara asal (hanya aliran cerita)
      items.filter(i=>!i.last).forEach(i=>{
        const [x,y]=proj(i.f.o);
        i.lbl=gLbl.append('text').attr('class','org-lbl').attr('x',x).attr('y',y-8).attr('text-anchor','middle').text(i.f.negara).attr('opacity',0);
        i.dot=gLbl.append('circle').attr('cx',x).attr('cy',y).attr('r',0).attr('fill',W.KAW[i.f.kawasan]).attr('stroke','#EFECE6').attr('stroke-width',1);
      });
      // idle di hero: satu rute jauh yang berulang
      const idleF=fk('Inggris',NR)||flows[0], ipts=arcPts(idleF.o,idleF.d);
      const idleArc=gz.append('path').attr('d',lineGen(ipts)).attr('fill','none').attr('stroke',W.KAW[idleF.kawasan]).attr('opacity',.5).attr('stroke-dasharray','2 6');
      const idleVeh=gz.append('path').attr('class','veh').attr('d',ICON['Bandara/Airport']);
      idle={arc:idleArc,veh:idleVeh,L:idleArc.node().getTotalLength()};
      render(true);
    }
    let idle=null, lastP=-1, lastAct=null, camK=1;

    function camera(p){
      // hero -> adegan pertama -> ... ; peralihan kamera selama T_CAM di awal tiap adegan
      const TC=.05;
      let from,to,t;
      if(p<.04){ return viewOf.hero; }
      if(p<ACTS[0].p[0]+TC){ from=viewOf.hero; to=ACTS[0].v; t=W.clamp((p-.04)/(ACTS[0].p[0]+TC-.04)); return mix(from,to,W.ease(t)); }
      let i=0; for(let k=0;k<ACTS.length;k++) if(p>=ACTS[k].p[0]) i=k;
      const prev=i>0?ACTS[i-1].v:viewOf.hero, a=ACTS[i];
      t=W.clamp((p-a.p[0])/TC); return mix(prev,a.v,W.ease(t));
    }
    function mix(a,b,t){
      const zi=d3.interpolateZoom([a.cx,a.cy,a.w],[b.cx,b.cy,b.w])(t);
      return {cx:zi[0],cy:zi[1],w:zi[2],dy:a.dy+(b.dy-a.dy)*t};
    }

    function render(force){
      const rect=scroller.getBoundingClientRect();
      let p=W.reduce?1:W.clamp(-rect.top/Math.max(1,rect.height-Hd));
      if(!force&&Math.abs(p-lastP)<.0004) return; lastP=p;
      const v=W.reduce?viewOf.world:camera(p), k=Wd/v.w, tx=Wd/2-v.cx*k, ty=Hd/2+v.dy*Hd-v.cy*k; camK=k;
      gz.attr('transform',`translate(${tx},${ty}) scale(${k})`);

      // hero
      const ho=W.reduce?1:1-W.clamp((p-.025)/.05);
      heroT.style.opacity=ho; cue.style.opacity=ho; counter.style.opacity=ho;
      heroT.style.visibility=ho<.01?'hidden':'visible';

      // aliran
      const landed=new Map(pins.map(x=>[x.p.id,0]));
      items.forEach(it=>{
        const u=W.clamp((p-it.ws)/(it.we-it.ws)), e=d3.easeSinInOut(u);
        const flying=u>0&&u<1, on=u>0;
        it.el.attr('stroke-width',sw(it.f.nilai)/k).attr('stroke-dashoffset',it.L*(1-e)).attr('opacity',on?(flying?.95:(W.reduce||it.last?.78:.62)):0).style('pointer-events',u>=1?'stroke':'none');
        if(u>=1) landed.set(it.f.pintu,(landed.get(it.f.pintu)||0)+it.f.nilai);
        else if(on) landed.set(it.f.pintu,(landed.get(it.f.pintu)||0)+it.f.nilai*e);
        if(flying&&!W.reduce){
          const L=it.L*e, pt=it.el.node().getPointAtLength(L), p2=it.el.node().getPointAtLength(Math.min(it.L,L+2)), p1=it.el.node().getPointAtLength(Math.max(0,L-2));
          const ang=Math.atan2(p2.y-p1.y,p2.x-p1.x)*180/Math.PI, flip=(p2.x<p1.x)?-1:1, s=(it.last?.62:.95)/k*1.25;
          it.vh.attr('opacity',1).attr('transform',it.jenis==='pesawat'?`translate(${pt.x},${pt.y}) rotate(${ang}) scale(${s})`:`translate(${pt.x},${pt.y}) scale(${s*flip},${s})`);
        } else it.vh.attr('opacity',0);
        if(it.lbl){ const o=on&&p<it.we+.05?1:0; it.lbl.attr('opacity',o).style('font-size',(11/k)+'px').style('stroke-width',(3.5/k)+'px').attr('y',proj(it.f.o)[1]-9/k); it.dot.attr('r',o?3.2/k:0); }
      });
      pins.forEach(x=>{
        const ld=landed.get(x.p.id)||0, frac=ld/x.sumDrawn, vol=x.p.total*(W.reduce?1:W.clamp(frac));
        const r=ld>0?(Wd<640?.62:1)*(3.5+17*Math.sqrt(vol/PIN[NR].total))/k:0;
        x.g.attr('r',r).style('pointer-events',ld>0?'auto':'none');
        const show=ld>0&&k>=x.conf.k; x.lb.attr('opacity',show?1:0).style('font-size',(12.5/k)+'px').style('stroke-width',(4/k)+'px').attr('x',x.x+x.conf.dx/k).attr('y',x.y+x.conf.dy/k);
      });

      // idle hero
      if(idle){ const showIdle=!W.reduce&&p<.075; idle.arc.attr('opacity',showIdle?.55:0).attr('stroke-width',1.6/k); if(!showIdle) idle.veh.attr('opacity',0); }

      // adegan aktif: caption + legenda
      let act=null; if(W.reduce) act=ACTS[ACTS.length-1]; else ACTS.forEach(a=>{ if(p>=a.p[0]+.012) act=a; });
      if(act!==lastAct){ lastAct=act;
        if(act){ cap.classList.remove('on'); setTimeout(()=>{ capK.textContent=act.kick; capT.textContent=TEXT[act.id](); cap.classList.add('on'); },W.reduce?0:140); }
        else cap.classList.remove('on');
      }
      legend.classList.toggle('on',!!act); note.classList.toggle('on',!!act&&act.id==='semua');
    }

    // idle loop (hanya animasi hero)
    function loop(ts){
      if(idle&&!W.reduce&&lastP<.075){
        const u=((ts/1000)%7)/7, e=d3.easeSinInOut(u), pt=idle.arc.node().getPointAtLength(idle.L*e), p2=idle.arc.node().getPointAtLength(Math.min(idle.L,idle.L*e+2)), p1=idle.arc.node().getPointAtLength(Math.max(0,idle.L*e-2));
        const ang=Math.atan2(p2.y-p1.y,p2.x-p1.x)*180/Math.PI, s=1.25/camK*1.2;
        idle.veh.attr('opacity',u>.02&&u<.98?1:0).attr('transform',`translate(${pt.x},${pt.y}) rotate(${ang}) scale(${s})`);
      }
      requestAnimationFrame(loop);
    }

    let ticking=false; addEventListener('scroll',()=>{ if(!ticking){ ticking=true; requestAnimationFrame(()=>{ ticking=false; render(); }); } },{passive:true});
    W.onResize(()=>{ lastAct=null; build(); });
    if(W.reduce){ scroller.style.height='auto'; stage.style.position='relative'; }
    build(); requestAnimationFrame(loop);
    window.__peta={render,ACTS,items,get p(){return lastP}};   // untuk pengujian
  }
})();
