const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSpfQ6QbaY7qp8UfRQk0-6cJDwU-6aQDuEnJ9KnbgIQfAwdJphWKnaS6imavvwBDw/pub?gid=607615076&single=true&output=csv";
const $ = id => document.getElementById(id);
let allRows = [], charts = {};
const titles = {overview:["Performance Digital AHASS Astra Motor Sumsel",""],channels:["Analisis Channel","Bandingkan adopsi dan pencapaian target pada tiga channel digital."],ranking:["Peringkat AHASS","Identifikasi AHASS dengan kinerja terbaik dan yang perlu ditingkatkan."],actions:["Prioritas Tindak Lanjut","Fokuskan tindak lanjut pada AHASS dengan kesenjangan target terbesar."]};
function num(v){if(v===null||v===undefined)return 0;let s=String(v).trim().replace(/%/g,"").replace(/,/g,"");if(!s||s==="#"||s.startsWith("#"))return 0;let n=Number(s);return Number.isFinite(n)?n:0}
function pct(v){if(v===null||v===undefined)return 0;let s=String(v).trim();if(s.includes("%"))return num(s)/100;let n=num(s);return n>1?n/100:n}
function fmt(n){return Math.round(n||0).toLocaleString("en-US")}
function percent(n){return `${(n*100).toFixed(1)}%`}
function statusClass(metric, value){
  const threshold = metric === "digitalShare" ? [0.8,0.9] : [0.7,0.9];
  return value < threshold[0] ? "red" : value < threshold[1] ? "yellow" : "green";
}
function coloredPercent(metric,value){return `<span class="metric-status ${statusClass(metric,value)}">${percent(value)}</span>`}
function avgRate(actual,target){return target>0?actual/target:0}
function parseRows(raw){
  const rows=Papa.parse(raw,{skipEmptyLines:false}).data;
  const headerIndex=rows.findIndex(r=>String(r[0]||"").trim()==="SE"&&String(r[3]||"").trim()==="KOTA");
  if(headerIndex<0)throw new Error("Baris judul kolom AHASS tidak ditemukan di CSV. Periksa struktur tab yang dipublikasikan.");
  const out=[];
  for(let i=headerIndex+2;i<rows.length;i++){
    const r=rows[i]||[];
    const name=String(r[7]||"").trim(), code=String(r[5]||"").trim(), city=String(r[3]||"").trim();
    if(!name||!code||!city||name.toLowerCase()==="nan"||name.startsWith("#"))continue;
    const d={se:String(r[0]||"").trim(),group:String(r[1]||"").trim(),no:String(r[2]||"").trim(),city,status:String(r[4]||"").trim(),code,name,
      kpbTotal:num(r[9]),kpbBooking:num(r[10]),kpbNonBooking:num(r[11]),kpbDigital:num(r[12]),digitalShare:pct(r[13]),
      bookingTarget:num(r[14]),bookingActual:num(r[15]),bookingAch:pct(r[16]),payTarget:num(r[17]),payActual:num(r[18]),payAch:pct(r[19])};
    d.digitalShare=d.kpbTotal>0?d.kpbDigital/d.kpbTotal:d.digitalShare;
    d.bookingAch=d.bookingTarget>0?d.bookingActual/d.bookingTarget:d.bookingAch;
    d.payAch=d.payTarget>0?d.payActual/d.payTarget:d.payAch;
    d.bookingGap=Math.max(0,d.bookingTarget-d.bookingActual);d.payGap=Math.max(0,d.payTarget-d.payActual);
    d.priority=(d.bookingAch<.25||d.payAch<.25)?"Critical":(d.bookingAch<.5||d.payAch<.5||d.digitalShare<.5)?"High":"Monitor";
    d.focus=[d.bookingAch<.5?"Tingkatkan konversi booking servis":null,d.payAch<.5?"Tingkatkan penggunaan transaksi AstraPay":null,d.digitalShare<.5?"Tingkatkan penggunaan KPB Digital":null].filter(Boolean).join(" • ")||"Pertahankan kinerja saat ini";
    out.push(d);
  }
  return out;
}
async function loadData(){
  $("refreshBtn").disabled=true;$("refreshBtn").textContent="↻ Loading…";$("errorBanner").classList.add("hidden");
  try{
    const response=await fetch(CSV_URL,{cache:"no-store"});
    if(!response.ok)throw new Error(`Google Sheets mengembalikan HTTP ${response.status}.`);
    const raw=await response.text();
    const parsed=parseRows(raw);
    if(!parsed.length)throw new Error("CSV berhasil dimuat, tetapi tidak ada baris AHASS yang terdeteksi.");
    allRows=parsed;
    $("connectionLabel").textContent="Terhubung";
    $("connectionLabel").style.color="#18865b";
    const meta=raw.match(/Periode\s*:\s*([^,\r\n]+)/i);$("periodLabel").textContent=meta?meta[1].trim():"Google Sheets · Live CSV";
    populateFilters();render();
    $("lastUpdated").textContent=new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
  }catch(e){
    $("connectionLabel").textContent="Kendala koneksi";$("connectionLabel").style.color="#c33d4b";
    $("errorBanner").textContent="Data langsung tidak dapat dimuat. "+e.message+" Jika terjadi pembatasan CORS browser, publikasikan tab sebagai CSV dan pastikan URL dapat diakses publik.";
    $("errorBanner").classList.remove("hidden");
    if(!allRows.length){$("periodLabel").textContent="Data tidak tersedia";["kpiDigital","kpiBooking","kpiPay","kpiOutlets"].forEach(id=>$(id).textContent="—")}
  }finally{$("refreshBtn").disabled=false;$("refreshBtn").innerHTML="↻ <span>Refresh data</span>"}
}
function populateFilters(resetDependents=false){
  const filterDefs=[
    {id:"cityFilter",key:"city",all:"Semua kota",label:d=>d.city},
    {id:"groupFilter",key:"group",all:"Semua grup",label:d=>d.group},
    {id:"statusFilter",key:"status",all:"Semua status",label:d=>d.status},
    {id:"ahassFilter",key:"ahass",all:"Semua AHASS",label:d=>`${String(d.code||"").trim()}||${String(d.name||"").trim()}`}
  ];
  const current={};
  filterDefs.forEach(f=>current[f.key]=$(f.id).value);
  if(resetDependents){
    current.group="all";current.status="all";current.ahass="all";
  }

  // Rebuild each dropdown using all other active filters. This keeps the
  // available choices mutually consistent instead of merely filtering by city.
  filterDefs.forEach(f=>{
    const otherRows=allRows.filter(d=>filterDefs.every(other=>{
      if(other.key===f.key)return true;
      const selected=current[other.key];
      if(!selected||selected==="all")return true;
      if(other.key==="ahass")return `${String(d.code||"").trim()}||${String(d.name||"").trim()}`===selected;
      return String(d[other.key]||"").trim()===selected;
    }));
    let options;
    if(f.key==="ahass"){
      options=[...new Map(otherRows.filter(d=>String(d.name||"").trim()).map(d=>{
        const code=String(d.code||"").trim(),name=String(d.name||"").trim(),key=`${code}||${name}`;
        return [key,{value:key,label:code?`${code} - ${name}`:name}];
      })).values()].sort((a,b)=>a.label.localeCompare(b.label,"id"));
    } else {
      options=[...new Set(otherRows.map(d=>String(d[f.key]||"").trim()).filter(Boolean))]
        .sort((a,b)=>a.localeCompare(b,"id")).map(v=>({value:v,label:v}));
    }
    const select=$(f.id),wanted=current[f.key];
    select.innerHTML=`<option value="all">${f.all}</option>`+options.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
    const valid=options.some(o=>o.value===wanted);
    select.value=valid?wanted:"all";
    current[f.key]=select.value;
  });
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function filtered(){
  const city=$("cityFilter").value,group=$("groupFilter").value,status=$("statusFilter").value,ahass=$("ahassFilter").value;
  return allRows.filter(d=>(city==="all"||String(d.city||"").trim()===city)
    &&(group==="all"||String(d.group||"").trim()===group)
    &&(status==="all"||String(d.status||"").trim()===status)
    &&(ahass==="all"||`${String(d.code||"").trim()}||${String(d.name||"").trim()}`===ahass));
}
function aggregate(rows){return rows.reduce((a,d)=>{["kpbTotal","kpbDigital","kpbNonBooking","kpbBooking","bookingTarget","bookingActual","payTarget","payActual"].forEach(k=>a[k]+=d[k]);return a},{kpbTotal:0,kpbDigital:0,kpbNonBooking:0,kpbBooking:0,bookingTarget:0,bookingActual:0,payTarget:0,payActual:0})}
function chart(id,config){if(charts[id])charts[id].destroy();const el=$(id);if(el)charts[id]=new Chart(el,config)}
function baseOptions(){return {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:"#142b49",padding:10,titleFont:{family:"DM Sans"},bodyFont:{family:"DM Sans"}}},scales:{x:{grid:{display:false},ticks:{color:"#8c98aa",font:{family:"DM Sans",size:10}}},y:{grid:{color:"#eef1f6"},ticks:{color:"#8c98aa",font:{family:"DM Sans",size:10}}}}}}
function render(){
 const rows=filtered(),a=aggregate(rows),digital=a.kpbTotal?a.kpbDigital/a.kpbTotal:0,b=avgRate(a.bookingActual,a.bookingTarget),p=avgRate(a.payActual,a.payTarget);
 $("kpiDigital").innerHTML=coloredPercent("digitalShare",digital);$("digitalCount").textContent=fmt(a.kpbDigital)+" / "+fmt(a.kpbTotal);
 $("kpiBooking").innerHTML=coloredPercent("bookingAch",b);$("bookingCount").textContent=fmt(a.bookingActual)+" / "+fmt(a.bookingTarget);
 $("kpiPay").innerHTML=coloredPercent("payAch",p);$("payCount").textContent=fmt(a.payActual)+" / "+fmt(a.payTarget);$("kpiOutlets").textContent=fmt(rows.length);
 chart("achievementChart",{type:"bar",data:{labels:["KPB Digital","Booking Servis","AstraPay"],datasets:[{data:[digital*100,b*100,p*100],backgroundColor:["#2864dc","#8c6ce5","#2ca878"],borderRadius:6,barThickness:28}]},options:{...baseOptions(),indexAxis:"y",scales:{x:{beginAtZero:true,grid:{color:"#eef1f6"},ticks:{color:"#8c98aa",callback:v=>v+"%"}},y:{grid:{display:false},ticks:{color:"#56657a"}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw.toFixed(1)+"%"}}}}});
 chart("mixChart",{type:"doughnut",data:{labels:["Digital KPB","Non-digital KPB"],datasets:[{data:[a.kpbDigital,Math.max(0,a.kpbTotal-a.kpbDigital)],backgroundColor:["#2864dc","#dce3ed"],borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:"72%",plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.label+": "+fmt(c.raw)}}}}});
 const top=[...rows].sort((x,y)=>Math.min(x.bookingAch,x.payAch)-Math.min(y.bookingAch,y.payAch)).slice(0,6);
 $("watchlistBody").innerHTML=top.map(d=>`<tr><td>${esc(d.code)} · ${esc(d.name)}</td><td>${esc(d.city)}</td><td>${coloredPercent("digitalShare",d.digitalShare)}</td><td>${coloredPercent("bookingAch",d.bookingAch)}</td><td>${coloredPercent("payAch",d.payAch)}</td><td>${badge(d.priority)}</td></tr>`).join("")||emptyRow(6);
 renderChannels(rows,a);renderRanking(rows);renderActions(rows);
}
function badge(p){const label=({"Critical":"Kritis","High":"Tinggi","Monitor":"Pantau"})[p]||p;return `<span class="pill ${p.toLowerCase()}">${label}</span>`}
function emptyRow(n){return `<tr><td colspan="${n}" class="empty">Tidak ada AHASS yang sesuai dengan filter yang dipilih.</td></tr>`}
function renderChannels(rows,a){
 const d=a.kpbTotal?a.kpbDigital/a.kpbTotal:0,b=avgRate(a.bookingActual,a.bookingTarget),p=avgRate(a.payActual,a.payTarget);
 chart("channelChart",{type:"bar",data:{labels:["Presentase KPB Digital","Booking Servis","AstraPay"],datasets:[{label:"Achievement",data:[d*100,b*100,p*100],backgroundColor:["#2864dc","#8c6ce5","#2ca878"],borderRadius:6,barThickness:32}]},options:{...baseOptions(),scales:{x:{grid:{display:false},ticks:{color:"#78869a"}},y:{beginAtZero:true,grid:{color:"#eef1f6"},ticks:{color:"#8c98aa",callback:v=>v+"%"}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw.toFixed(1)+"%"}}}}});
 const statuses=[...new Set(rows.map(d=>d.status).filter(Boolean))].sort(),values=statuses.map(s=>{const z=aggregate(rows.filter(d=>d.status===s));return z.kpbTotal?z.kpbDigital/z.kpbTotal*100:0});
 chart("statusChart",{type:"bar",data:{labels:statuses,datasets:[{data:values,backgroundColor:"#3975e8",borderRadius:5,barThickness:28}]},options:{...baseOptions(),scales:{x:{grid:{display:false},ticks:{color:"#78869a"}},y:{beginAtZero:true,max:100,grid:{color:"#eef1f6"},ticks:{color:"#8c98aa",callback:v=>v+"%"}}},plugins:{tooltip:{callbacks:{label:c=>c.raw.toFixed(1)+"%"}}}}});
 $("channelSummary").innerHTML=[["KPB Digital",coloredPercent("digitalShare",d),`${fmt(a.kpbDigital)} KPB digital dari ${fmt(a.kpbTotal)} total KPB`],["Booking Servis",coloredPercent("bookingAch",b),`${fmt(a.bookingActual)} aktual dari target ${fmt(a.bookingTarget)}`],["AstraPay",coloredPercent("payAch",p),`${fmt(a.payActual)} aktual dari target ${fmt(a.payTarget)}`]].map(x=>`<div class="channel-card"><h3>${x[0]}</h3><strong>${x[1]}</strong><p>${x[2]}</p></div>`).join("");
}
function renderRanking(rows){
 const metric=$("rankMetric").value,limit=Number($("rankLimit").value);
 const sorted=[...rows].sort((a,b)=>b[metric]-a[metric]).slice(0,limit);
 $("rankingBody").innerHTML=sorted.map((d,i)=>`<tr><td>${i+1}</td><td>${esc(d.code)} · ${esc(d.name)}</td><td>${esc(d.city)}</td><td>${esc(d.group)}</td><td>${coloredPercent("digitalShare",d.digitalShare)}</td><td>${coloredPercent("bookingAch",d.bookingAch)}</td><td>${coloredPercent("payAch",d.payAch)}</td></tr>`).join("")||emptyRow(7);
}
function renderActions(rows){
 const counts={Critical:0,High:0,Monitor:0};rows.forEach(d=>counts[d.priority]++);
 $("actionKpis").innerHTML=[["Critical",counts.Critical],["High",counts.High],["Monitor",counts.Monitor]].map(([k,v])=>`<div class="action-kpi"><span>${({"Critical":"AHASS prioritas kritis","High":"AHASS prioritas tinggi","Monitor":"AHASS untuk dipantau"})[k]}</span><strong>${v}</strong></div>`).join("");
 const filter=$("priorityFilter").value;
 const sorted=rows.filter(d=>filter==="all"||d.priority===filter).sort((a,b)=>({Critical:0,High:1,Monitor:2}[a.priority]-({Critical:0,High:1,Monitor:2}[b.priority]))||Math.min(a.bookingAch,a.payAch)-Math.min(b.bookingAch,b.payAch));
 $("actionsBody").innerHTML=sorted.map(d=>`<tr><td>${badge(d.priority)}</td><td>${esc(d.code)} · ${esc(d.name)}</td><td>${esc(d.city)}</td><td>${fmt(d.bookingGap)}</td><td>${fmt(d.payGap)}</td><td>${esc(d.focus)}</td></tr>`).join("")||emptyRow(6);
}
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.goto)));
function showPage(page){document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));$("pageTitle").textContent=titles[page][0];$("pageSubtitle").textContent=titles[page][1];if(charts.achievementChart||charts.channelChart)Object.values(charts).forEach(c=>c.resize())}
["cityFilter","groupFilter","statusFilter","ahassFilter"].forEach(id=>$(id).addEventListener("change",()=>{populateFilters(false);render()}));
["rankMetric","rankLimit","priorityFilter"].forEach(id=>$(id).addEventListener("change",render));
$("refreshBtn").addEventListener("click",loadData);
$("exportJpegBtn").addEventListener("click",exportDashboardJpeg);

async function exportDashboardJpeg(){
  const btn=$("exportJpegBtn");
  if(!window.html2canvas){
    alert("Fitur ekspor belum termuat. Periksa koneksi internet lalu coba lagi.");
    return;
  }
  const original=btn.innerHTML;
  btn.disabled=true;
  btn.innerHTML="Menyiapkan JPEG…";
  document.body.classList.add("exporting");
  try{
    // Give Chart.js and the browser a moment to finish drawing before capture.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const target=$("page-overview");
    const canvas=await html2canvas(document.querySelector(".main"),{
      backgroundColor:"#f4f7fc",
      scale:2,
      useCORS:true,
      logging:false,
      windowWidth:Math.max(document.documentElement.scrollWidth,1440),
      onclone:(doc)=>{
        doc.body.classList.add("exporting");
        const clonedMain=doc.querySelector(".main");
        if(clonedMain){clonedMain.style.width="1440px";clonedMain.style.marginLeft="0";clonedMain.style.padding="28px 34px";}
        const actions=doc.querySelector(".top-actions");
        if(actions)actions.style.visibility="hidden";
        // Export the current page; omit both charts for a compact dealer report.
        doc.querySelectorAll(".page:not(.active)").forEach(el=>el.style.display="none");
        // Hide the entire chart row in the cloned document. Targeting the
        // container is more reliable than matching translated chart headings.
        const chartRow=doc.querySelector("#page-overview .grid-two");
        if(chartRow){
          chartRow.style.setProperty("display","none","important");
          chartRow.style.setProperty("height","0","important");
          chartRow.style.setProperty("margin","0","important");
          chartRow.style.setProperty("padding","0","important");
        }
        // Fallback: hide any chart panels still present in the export clone.
        doc.querySelectorAll("#page-overview canvas").forEach(canvas=>{
          const panel=canvas.closest(".panel");
          if(panel)panel.style.setProperty("display","none","important");
        });
      }
    });
    const link=document.createElement("a");
    const city=$("cityFilter").value==="all"?"Semua-Kota":$("cityFilter").value;
    const group=$("groupFilter").value==="all"?"Semua-Grup":$("groupFilter").value;
    const ahass=$("ahassFilter").value==="all"?"Semua-AHASS":$("ahassFilter").selectedOptions[0].textContent.split(" - ")[0];
    const safe=s=>String(s).normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-|-$/g,"").slice(0,45);
    link.download=`Laporan-Digital-AHASS-${safe(city)}-${safe(group)}-${safe(ahass)}.jpg`;
    link.href=canvas.toDataURL("image/jpeg",0.94);
    link.click();
  }catch(err){
    console.error("JPEG export failed:",err);
    alert("Gagal mengekspor JPEG. Coba lagi setelah dashboard selesai dimuat.");
  }finally{
    document.body.classList.remove("exporting");
    btn.disabled=false;
    btn.innerHTML=original;
  }
}

loadData();
setInterval(loadData,5*60*1000);