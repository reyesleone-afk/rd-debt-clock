/* ========== RD Debt Clock - app.js ========== */
/* ------------ Utilidades ----------- */
function formatNumber(num, opts = {}) {
  const { min = 2, max = 2 } = opts;
  const n = typeof num === "number" ? num : Number(num || 0);
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: min, maximumFractionDigits: max }).format(n);
}
function guardarEnCache(clave, datos) {
  localStorage.setItem(clave, JSON.stringify({ timestamp: Date.now(), datos }));
}
function obtenerDeCache(clave, maxHoras = 12) {
  const item = localStorage.getItem(clave);
  if (!item) return null;
  const entrada = JSON.parse(item);
  if (Date.now() - entrada.timestamp < maxHoras * 3600 * 1000) return entrada.datos;
  localStorage.removeItem(clave);
  return null;
}

/* ----------------- Traducciones ---------------- */
const traducciones = {
  es: {
    dashboardTitulo: "Dashboard de Indicadores Clave",
    dashboardDescripcion: "Explorando datos en tiempo real...",
    detalleTitulo: "Análisis Detallado",
    detalleDescripcion: "Seleccione un indicador del dashboard para ver su evolución histórica y contexto detallado aquí.",
    impactoTitulo: "¿Qué significa esto para usted?",
    impactoDescripcion: "Traducimos los números a situaciones de la vida real…",
    botonIA: "Explicar con IA ✨",
    botonCSV: "Descargar CSV ⬇️",
    indicadores: { tipoCambioEuro: "Tipo de Cambio (EUR)", tasasInteres: "Tasas de Interés Promedio", carteraCreditos: "Cartera de Créditos" },
  },
  en: {
    dashboardTitulo: "Key Indicators Dashboard",
    dashboardDescripcion: "Exploring real-time data...",
    detalleTitulo: "Detailed Analysis",
    detalleDescripcion: "Select an indicator from the dashboard to see its historical evolution and context here.",
    impactoTitulo: "What does this mean for you?",
    impactoDescripcion: "We translate numbers into real-life situations…",
    botonIA: "Explain with AI ✨",
    botonCSV: "Download CSV ⬇️",
    indicadores: { tipoCambioEuro: "Exchange Rate (EUR)", tasasInteres: "Average Interest Rates", carteraCreditos: "Credit Portfolio" },
  },
};
let idiomaActual = localStorage.getItem("idioma") || "es";

/* --------------- Datos UI --------------- */
let currentChart, currentIndicatorId = null;

const data = {
  deudaPublica: { title:"Total de Captaciones", value:0, unit:"Monto Total", trend:"up", description:"Total de captaciones por localidad.",
    detail:{ description:"Detalle de captaciones por provincia (SB).", chartType:"bar",
      data:{ labels:[], datasets:[{ label:"Captaciones por Provincia", data:[], backgroundColor:"#2563eb", borderColor:"#1d4ed8", borderWidth:1 }]}
    }},
  pib: { title:"PIB Nominal", value:125.6, unit:"MM USD", trend:"up", description:"Valor de mercado de bienes y servicios.",
    detail:{ description:"Variación trimestral del PIB (demo).", chartType:"bar",
      data:{ labels:["Q1 2024","Q2 2024","Q3 2024","Q4 2024"], datasets:[{ label:"Crecimiento % PIB", data:[4.8,5.1,4.9,5.3], backgroundColor:"#2563eb", borderColor:"#1d4ed8", borderWidth:1 }]}
    }},
  inflacion:{ title:"Inflación Anual", value:4.8, unit:"%", trend:"down", description:"Variación del IPC.",
    detail:{ description:"Serie mensual de inflación (demo).", chartType:"line",
      data:{ labels:["Ene","Feb","Mar","Abr","May","Jun","Jul"], datasets:[{ label:"Inflación mensual %", data:[0.5,0.4,0.6,0.3,0.4,0.2,0.3], fill:false, borderColor:"#2563eb", tension:.1 }]}
    }},
  tasaInteres:{ title:"Tasa de Política Monetaria", value:7.0, unit:"%", trend:"stable", description:"Tasa referencia BCRD.",
    detail:{ description:"TPM histórica (demo).", chartType:"line",
      data:{ labels:["Ene","Feb","Mar","Abr","May","Jun","Jul"], datasets:[{ label:"TPM %", data:[7.5,7.5,7.25,7.25,7.0,7.0,7.0], fill:true, backgroundColor:"rgba(37,99,235,.1)", borderColor:"#2563eb", tension:.1 }]}
    }},
  tipoCambio:{ title:"Tipo de Cambio (USD)", value:59.15, unit:"RD$", trend:"up", description:"Tasa de venta.",
    detail:{ description:"RD$ por USD (demo).", chartType:"line",
      data:{ labels:["Lun","Mar","Mié","Jue","Vie"], datasets:[{ label:"RD$ por USD", data:[59.05,59.1,59.08,59.12,59.15], borderColor:"#2563eb" }]}
    }},
  tipoCambioEuro:{ title:"Tipo de Cambio (EUR)", value:0, unit:"RD$", trend:"stable", description:"EUR a DOP en vivo (exchangerate.host).",
    detail:{ description:"Cuántos RD$ por 1 EUR.", chartType:"line",
      data:{ labels:["Hoy"], datasets:[{ label:"RD$ por EUR", data:[0], borderColor:"#16a34a", backgroundColor:"rgba(22,163,74,.1)", tension:.2, fill:true }]}
    }},
  tasasInteres:{ title:"Tasas de Interés Promedio", value:0, unit:"%", trend:"stable", description:"Promedio de préstamos vs depósitos (SB).",
    detail:{ description:"Consumo (activa) vs Ahorro (pasiva) en MN (SB).", chartType:"bar",
      data:{ labels:["Préstamos Consumo","Depósitos Ahorro"], datasets:[{ label:"Tasa Promedio (%)", data:[0,0], backgroundColor:["#2563eb","#16a34a"] }]}
    }},
  carteraCreditos:{ title:"Cartera de Créditos", value:0, unit:"RD$ MM", trend:"up", description:"Distribución por actividad económica (SB).",
    detail:{ description:"Montos por sector (SB).", chartType:"bar",
      data:{ labels:[], datasets:[{ label:"Millones de RD$", data:[], backgroundColor:"#f59e0b" }]}
    }},
};

/* -------------- Render -------------- */
function getTrendIcon(t){ if(t==="up")return'<span class="trend-up">&#9650;</span>'; if(t==="down")return'<span class="trend-down">&#9660;</span>'; return'<span class="trend-stable">&#9654;</span>'; }
function createIndicatorCard(id, indicator){
  const grid=document.getElementById("indicators-grid");
  const card=document.createElement("div");
  card.className="indicator-card bg-white p-5 rounded-xl shadow-md";
  card.innerHTML=`
    <h4 class="font-semibold text-neutral-500">${indicator.title}</h4>
    <p class="text-3xl font-bold text-neutral-800 my-2">${formatNumber(indicator.value)} <span class="text-xl font-semibold text-neutral-600">${indicator.unit}</span></p>
    <div class="flex justify-between items-center text-sm">
      <span class="text-neutral-500">${indicator.description}</span>
      <span class="text-lg">${getTrendIcon(indicator.trend)}</span>
    </div>
    <button data-id="${id}" class="view-detail-btn mt-4 w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 active:scale-[0.98]">Ver más</button>
  `;
  grid.appendChild(card);
}
function updateDetailedView(id){
  const indicator=data[id]; if(!indicator) return;
  currentIndicatorId=id;
  document.getElementById("detail-title").textContent=indicator.title;
  document.getElementById("detail-description").textContent=indicator.detail.description;
  const ctx=document.getElementById("detailChart").getContext("2d");
  if(currentChart) currentChart.destroy();
  currentChart=new Chart(ctx,{ type:indicator.detail.chartType, data:indicator.detail.data,
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:"top"},tooltip:{enabled:true,mode:"index",intersect:false}},
      scales:(["bar","line"].includes(indicator.detail.chartType))?{y:{beginAtZero:false}}:{} }});
  const w=document.getElementById("share-whatsapp"); if(w){ w.href=generarMensajeWhatsApp(indicator); }
  const sec=document.getElementById("detalle-indicador"); sec.classList.remove("hidden"); sec.scrollIntoView({behavior:"smooth"});
}

/* --------- CSV + WhatsApp ---------- */
function downloadCurrentChartAsCSV(){
  const indicator=data[currentIndicatorId]; if(!indicator) return;
  const labels=indicator.detail.data.labels, values=indicator.detail.data.datasets[0].data, datasetLabel=indicator.detail.data.datasets[0].label;
  let csv="data:text/csv;charset=utf-8,"; csv+=`Categoria,${datasetLabel}\n`;
  for(let i=0;i<labels.length;i++) csv+=`${labels[i]},${values[i]}\n`;
  const a=document.createElement("a"); a.href=encodeURI(csv); a.download=`${indicator.title.replace(/\s+/g,"_")}.csv`; document.body.appendChild(a); a.click(); a.remove();
}
function generarMensajeWhatsApp(indicador){
  const valor=`${formatNumber(indicador.value)} ${indicador.unit||""}`.trim();
  const mensaje=`📊 *${indicador.title}*\n\nValor actual: ${valor}\n\nFuente: RD Debt Clock\n${location.href}`;
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}

/* --------- Traducción --------- */
function aplicarTraduccion(){
  const t=traducciones[idiomaActual];
  document.querySelector("#dashboard h3").textContent=t.dashboardTitulo;
  document.querySelector("#dashboard p").textContent=t.dashboardDescripcion;
  document.getElementById("detail-title").textContent=t.detalleTitulo;
  document.getElementById("detail-description").textContent=t.detalleDescripcion;
  const wrap=document.querySelector("#impacto-ciudadano"); wrap?.querySelector("h3")&&(wrap.querySelector("h3").textContent=t.impactoTitulo);
  wrap?.querySelector("p")&&(wrap.querySelector("p").textContent=t.impactoDescripcion);
  document.getElementById("explain-button").textContent=t.botonIA;
  document.getElementById("download-csv-btn").textContent=t.botonCSV;
  Object.keys(data).forEach(id=>{ if(t.indicadores[id]) data[id].title=t.indicadores[id]; });
  const grid=document.getElementById("indicators-grid"); grid.innerHTML=""; Object.keys(data).forEach(k=>createIndicatorCard(k,data[k]));
  document.querySelectorAll(".view-detail-btn").forEach(b=>b.addEventListener("click",e=>updateDetailedView(e.target.dataset.id)));
}

/* -------------- APIs -------------- */
const API_KEY_SB = "TU_API_KEY_SB"; // ← pon tu key aquí si no usas backend-proxy
const BACKEND_BASE = ""; // ej: "https://tu-backend.vercel.app/api/sb" (opcional)

async function fetchEuroToPeso(){
  const c=obtenerDeCache("tipoCambioEuro"); if(c){ data.tipoCambioEuro.value=c.valor; data.tipoCambioEuro.detail.data.datasets[0].data=[c.valor]; data.tipoCambioEuro.detail.data.labels=[c.fecha]; return; }
  try{
    const r=await fetch("https://api.exchangerate.host/latest?base=EUR&symbols=DOP");
    const js=await r.json(); const rate=js?.rates?.DOP||0; const fecha=js?.date||"Hoy";
    data.tipoCambioEuro.value=rate; data.tipoCambioEuro.detail.data.datasets[0].data=[rate]; data.tipoCambioEuro.detail.data.labels=[fecha];
    guardarEnCache("tipoCambioEuro",{valor:rate,fecha});
  }catch(e){ console.error("Error EUR→DOP:",e); }
}

async function fetchTasasInteres(){
  const c=obtenerDeCache("tasasInteresPromedio"); if(c){ data.tasasInteres.value=c.promedio; data.tasasInteres.detail.data.datasets[0].data=c.series; return; }
  try{
    const proxy="https://corsproxy.io/?", BASE="https://apis.sb.gob.do/estadisticas/v2/tasas-interes";
    const headers={"Ocp-Apim-Subscription-Key":API_KEY_SB,"User-Agent":"Mozilla/5.0"};
    const [r1,r2]=await Promise.all([
      fetch(`${proxy}${encodeURIComponent(`${BASE}?tipoMoneda=MN&tipoEntidad=BM&producto=CONSUMO`)}`,{headers}),
      fetch(`${proxy}${encodeURIComponent(`${BASE}?tipoMoneda=MN&tipoEntidad=BM&producto=AHORRO`)}`,{headers})
    ]);
    const [d1,d2]=await Promise.all([r1.json(),r2.json()]);
    const consumo=(d1?.[0]?.tasaPromedio)||0, ahorro=(d2?.[0]?.tasaPromedio)||0;
    const promedio=Number(((consumo+ahorro)/2).toFixed(2));
    data.tasasInteres.value=promedio; data.tasasInteres.detail.data.datasets[0].data=[consumo,ahorro];
    guardarEnCache("tasasInteresPromedio",{promedio,series:[consumo,ahorro]});
  }catch(e){ console.error("Error tasasInteres:",e); }
}

async function fetchCarteraCreditos(){
  const periodo=document.getElementById("filtroPeriodo")?.value||"2024-06";
  const tipoEntidad=document.getElementById("filtroEntidad")?.value||"BM";
  const moneda=document.getElementById("filtroMoneda")?.value||"MN";
  const key=`cartera_${periodo}_${tipoEntidad}_${moneda}`;
  const c=obtenerDeCache(key); if(c){ aplicarDatosCartera(c); return; }
  try{
    const proxy="https://corsproxy.io/?", BASE="https://apis.sb.gob.do/estadisticas/v2/cartera/actividad-economica";
    const headers={"Ocp-Apim-Subscription-Key":API_KEY_SB,"User-Agent":"Mozilla/5.0"};
    const res=await fetch(`${proxy}${encodeURIComponent(`${BASE}?tipoEntidad=${tipoEntidad}&moneda=${moneda}&periodo=${periodo}`)}`,{headers});
    const js=await res.json();
    const labels=(js||[]).map(x=>x.actividadEconomica);
    const valores=(js||[]).map(x=>(x.montoTotal||0)/1_000_000);
    const total=Number(valores.reduce((a,b)=>a+b,0).toFixed(2));
    const pkg={total,labels,valores}; guardarEnCache(key,pkg); aplicarDatosCartera(pkg);
  }catch(e){ console.error("Error cartera:",e); }
}
function aplicarDatosCartera(pkg){
  data.carteraCreditos.value=pkg.total;
  data.carteraCreditos.detail.data.labels=pkg.labels;
  data.carteraCreditos.detail.data.datasets[0].data=pkg.valores;
}

async function fetchCaptacionesPorLocalidad(){
  const c=obtenerDeCache("captaciones_localidad"); if(c){ aplicarCaptaciones(c); return; }
  try{
    const proxy="https://corsproxy.io/?", BASE="https://apis.sb.gob.do/estadisticas/v2/captaciones/localidad";
    const headers={"Ocp-Apim-Subscription-Key":API_KEY_SB,"User-Agent":"Mozilla/5.0"};
    let all=[], page=1, hasNext=true;
    while(hasNext){
      const res=await fetch(`${proxy}${encodeURIComponent(`${BASE}?periodoInicial=2024-01&paginas=${page}&registros=100&tipoEntidad=BM`)}`,{headers});
      const json=await res.json(); const pag=JSON.parse(res.headers.get("x-pagination")||"{}");
      all=all.concat(json||[]); hasNext=!!pag.HasNext; page++;
    }
    guardarEnCache("captaciones_localidad",all); aplicarCaptaciones(all);
  }catch(e){ console.error("Error captaciones:",e); }
}
function aplicarCaptaciones(lista){
  if(!Array.isArray(lista)||!lista.length) return;
  const total=lista.reduce((s,r)=>s+(r.balance||0),0);
  const provincias=[...new Set(lista.map(x=>x.provincia))];
  const montos=provincias.map(p=>lista.filter(x=>x.provincia===p).reduce((s,r)=>s+(r.balance||0),0));
  data.deudaPublica.value=total;
  data.deudaPublica.detail.data.labels=provincias;
  data.deudaPublica.detail.data.datasets[0].data=montos;
}

/* -------------- Arranque -------------- */
document.addEventListener("DOMContentLoaded", async()=>{
  const html=document.documentElement;
  if(localStorage.getItem("modoOscuro")==="true") html.classList.add("dark");
  document.getElementById("toggle-dark")?.addEventListener("click", ()=>{
    html.classList.toggle("dark"); localStorage.setItem("modoOscuro", html.classList.contains("dark"));
  });
  document.getElementById("toggle-lang")?.addEventListener("click", ()=>{
    idiomaActual = (idiomaActual==="es")?"en":"es"; localStorage.setItem("idioma",idiomaActual); aplicarTraduccion();
  });
  const mobileBtn=document.getElementById("mobile-menu-button"), mobileMenu=document.getElementById("mobile-menu");
  mobileBtn?.addEventListener("click", ()=> mobileMenu?.classList.toggle("hidden"));
  document.getElementById("download-csv-btn")?.addEventListener("click", downloadCurrentChartAsCSV);
  ["filtroPeriodo","filtroEntidad","filtroMoneda"].forEach(id=>{
    document.getElementById(id)?.addEventListener("change", async()=>{
      await fetchCarteraCreditos(); updateDetailedView("carteraCreditos");
    });
  });

  const grid=document.getElementById("indicators-grid");
  const dashLoading=document.getElementById("loading-dashboard");
  try{
    await Promise.all([ fetchEuroToPeso(), fetchTasasInteres(), fetchCarteraCreditos(), fetchCaptacionesPorLocalidad() ]);
    dashLoading?.classList.add("hidden"); grid.innerHTML="";
    Object.keys(data).forEach(k=>createIndicatorCard(k,data[k]));
    document.querySelectorAll(".view-detail-btn").forEach(b=> b.addEventListener("click", e=>updateDetailedView(e.target.dataset.id)));
    aplicarTraduccion();
    updateDetailedView("tipoCambioEuro");
  }catch(e){
    console.error(e);
    dashLoading.innerHTML=`<p class="text-red-500">No se pudieron cargar los datos. Revisa tu conexión o API key.</p>`;
  }

  if("serviceWorker" in navigator){
    window.addEventListener("load", ()=> navigator.serviceWorker.register("./sw.js").catch(err=>console.error("SW error:",err)) );
  }
});
