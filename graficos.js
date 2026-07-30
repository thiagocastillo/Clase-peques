// Bibliodatos — Etapa 2: generador de gráficos de barras
"use strict";

const $ = (id) => document.getElementById(id);

let DATA = null;
let REGISTROS = [];
let tipo = "v";            // "v" vertical, "h" horizontal
let ultimaSerie = [];      // [{label, valor}] del gráfico dibujado
let ultimaMetrica = null;

const COLORES = {
  barra: "#1565c0",
  barraOsc: "#0d3d75",
  max: "#2e9e5b",
  min: "#e8a33d",
  eje: "#5b6b7a",
  grilla: "#dce4ee",
  texto: "#20303f",
};

const RANGOS = [
  { k: 0, l: "Sin lectura (0 min)", test: (t) => t === 0 },
  { k: 1, l: "1 a 10 min", test: (t) => t >= 1 && t <= 10 },
  { k: 2, l: "11 a 30 min", test: (t) => t >= 11 && t <= 30 },
  { k: 3, l: "31 a 60 min", test: (t) => t >= 31 && t <= 60 },
  { k: 4, l: "Más de 60 min", test: (t) => t > 60 },
];

const DIMS = {
  edad:    { titulo: "edad de los lectores",        eje: "Edad",           limitable: false },
  depto:   { titulo: "departamento",                eje: "Departamento",   limitable: false },
  dia:     { titulo: "día de mayo",                 eje: "Día",            limitable: false },
  rango:   { titulo: "tiempo de lectura en línea",  eje: "Tiempo leído",   limitable: false },
  titulo:  { titulo: "título del libro",            eje: "Título",         limitable: true },
  usuario: { titulo: "ID de usuario",               eje: "Usuario",        limitable: true },
};

const METRICAS = {
  prestamos: { titulo: "Cantidad de préstamos", unidad: "préstamos", dec: 0 },
  lectores:  { titulo: "Lectores distintos",    unidad: "lectores",  dec: 0 },
  minutos:   { titulo: "Minutos leídos en línea", unidad: "minutos", dec: 0 },
  promedio:  { titulo: "Minutos leídos (promedio)", unidad: "minutos", dec: 1 },
};

// ---------- carga ----------
fetch("data.json")
  .then((r) => r.json())
  .then((d) => {
    DATA = d;
    normalizar();
    poblarFiltros();
    conectarEventos();
    dibujar();
  })
  .catch((e) => {
    $("grafico").innerHTML =
      '<p class="vacio">No se pudieron cargar los datos. Revisá que <code>data.json</code> esté junto a esta página.</p>';
    console.error(e);
  });

function normalizar() {
  const { deptos, titulos } = DATA;
  REGISTROS = DATA.rows.map((f) => ({
    dia: f[0],
    id: f[1],
    edad: f[2],
    depto: f[3] >= 0 ? deptos[f[3]] : "Sin dato",
    prestamos: f[4],
    tiempo: f[5],
    titulo: titulos[f[6]],
    tituloLower: titulos[f[6]].toLowerCase(),
  }));
}

function poblarFiltros() {
  for (const dep of DATA.deptos) {
    const o = document.createElement("option");
    o.value = dep;
    o.textContent = dep;
    $("f-depto").appendChild(o);
  }
  const edades = [...new Set(REGISTROS.map((r) => r.edad))].sort((a, b) => a - b);
  for (const e of edades) {
    const o = document.createElement("option");
    o.value = e;
    o.textContent = `${e} años`;
    $("f-edad").appendChild(o);
  }
}

function conectarEventos() {
  ["dim", "metrica", "orden", "top", "f-depto", "f-edad"].forEach((id) =>
    $(id).addEventListener("change", dibujar)
  );
  $("f-titulo").addEventListener("input", debounce(dibujar, 200));

  $("dim").addEventListener("change", ajustarTop);

  $("f-limpiar").addEventListener("click", () => {
    $("f-depto").value = "";
    $("f-edad").value = "";
    $("f-titulo").value = "";
    dibujar();
  });

  $("tipo-v").addEventListener("click", () => setTipo("v"));
  $("tipo-h").addEventListener("click", () => setTipo("h"));

  $("descargar").addEventListener("click", descargarPNG);
  $("copiar").addEventListener("click", copiarDatos);

  ajustarTop();
}

function setTipo(t) {
  tipo = t;
  $("tipo-v").classList.toggle("activo", t === "v");
  $("tipo-h").classList.toggle("activo", t === "h");
  $("tipo-v").setAttribute("aria-pressed", String(t === "v"));
  $("tipo-h").setAttribute("aria-pressed", String(t === "h"));
  dibujar();
}

function ajustarTop() {
  const dim = $("dim").value;
  $("wrap-top").hidden = !DIMS[dim].limitable;
  // Con muchas categorías largas, las barras horizontales se leen mejor
  if (DIMS[dim].limitable && tipo === "v") setTipo("h");
}

// ---------- agrupación ----------
function filtrar() {
  const dep = $("f-depto").value;
  const edad = $("f-edad").value;
  const txt = $("f-titulo").value.trim().toLowerCase();
  return REGISTROS.filter((r) => {
    if (dep && r.depto !== dep) return false;
    if (edad && String(r.edad) !== edad) return false;
    if (txt && !r.tituloLower.includes(txt)) return false;
    return true;
  });
}

function agrupar(regs, dim) {
  const mapa = new Map();
  for (const r of regs) {
    let clave, label, ordenNat;
    switch (dim) {
      case "edad":
        clave = r.edad; label = `${r.edad} años`; ordenNat = r.edad; break;
      case "depto":
        clave = r.depto; label = r.depto; ordenNat = r.depto; break;
      case "dia":
        clave = r.dia; label = `${String(r.dia).padStart(2, "0")}/05`; ordenNat = r.dia; break;
      case "rango": {
        const g = RANGOS.find((x) => x.test(r.tiempo)) || RANGOS[0];
        clave = g.k; label = g.l; ordenNat = g.k; break;
      }
      case "titulo":
        clave = r.titulo; label = r.titulo; ordenNat = r.titulo; break;
      case "usuario":
        clave = r.id; label = `#${r.id}`; ordenNat = r.id; break;
    }
    let g = mapa.get(clave);
    if (!g) {
      g = { label, ordenNat, prestamos: 0, minutos: 0, ids: new Set() };
      mapa.set(clave, g);
    }
    g.prestamos += r.prestamos || 1;
    g.minutos += r.tiempo;
    g.ids.add(r.id);
  }
  return [...mapa.values()];
}

function valorDe(g, metrica) {
  switch (metrica) {
    case "prestamos": return g.prestamos;
    case "lectores": return g.ids.size;
    case "minutos": return g.minutos;
    case "promedio": return g.prestamos ? Math.round((g.minutos / g.prestamos) * 10) / 10 : 0;
  }
}

// ---------- dibujar ----------
function dibujar() {
  const dim = $("dim").value;
  const metrica = $("metrica").value;
  const orden = $("orden").value;
  const grupos = agrupar(filtrar(), dim);

  let serie = grupos.map((g) => ({ label: g.label, ordenNat: g.ordenNat, valor: valorDe(g, metrica) }));

  // Orden
  if (orden === "natural") {
    serie.sort((a, b) =>
      typeof a.ordenNat === "number" ? a.ordenNat - b.ordenNat : String(a.ordenNat).localeCompare(String(b.ordenNat), "es")
    );
  } else {
    const d = orden === "valor-desc" ? -1 : 1;
    serie.sort((a, b) => (a.valor - b.valor) * d || String(a.label).localeCompare(String(b.label), "es"));
  }

  // Top N solo para dimensiones con muchísimas categorías
  if (DIMS[dim].limitable) serie = serie.slice(0, Number($("top").value));

  ultimaSerie = serie;
  ultimaMetrica = metrica;

  const hayDatos = serie.length > 0;
  $("graf-vacio").hidden = hayDatos;
  $("hallazgo").hidden = !hayDatos;
  $("descargar").disabled = !hayDatos;
  $("titulo-graf").textContent = `${METRICAS[metrica].titulo} por ${DIMS[dim].titulo}${etiquetaFiltros()}`;

  if (!hayDatos) {
    $("grafico").innerHTML = "";
    $("cuerpo-graf").innerHTML = "";
    return;
  }

  mostrarHallazgos(serie, metrica);
  $("grafico").innerHTML = tipo === "v" ? svgVertical(serie, metrica, dim) : svgHorizontal(serie, metrica, dim);
  llenarTabla(serie, metrica);
}

function etiquetaFiltros() {
  const p = [];
  if ($("f-depto").value) p.push($("f-depto").value);
  if ($("f-edad").value) p.push(`${$("f-edad").value} años`);
  const t = $("f-titulo").value.trim();
  if (t) p.push(`títulos con “${t}”`);
  return p.length ? ` · ${p.join(" · ")}` : "";
}

function mostrarHallazgos(serie, metrica) {
  const max = serie.reduce((a, b) => (b.valor > a.valor ? b : a));
  const min = serie.reduce((a, b) => (b.valor < a.valor ? b : a));
  $("max-label").textContent = max.label;
  $("max-valor").textContent = `${fmt(max.valor, metrica)} ${METRICAS[metrica].unidad}`;
  $("min-label").textContent = min.label;
  $("min-valor").textContent = `${fmt(min.valor, metrica)} ${METRICAS[metrica].unidad}`;
}

function llenarTabla(serie, metrica) {
  const total = serie.reduce((s, x) => s + x.valor, 0);
  $("cuerpo-graf").innerHTML = serie
    .map((x) => {
      const pct = total ? ((x.valor / total) * 100).toFixed(1) : "0.0";
      return `<tr><td>${escapar(x.label)}</td><td class="num">${fmt(x.valor, metrica)}</td><td class="num">${pct} %</td></tr>`;
    })
    .join("");
}

// ---------- SVG ----------
const estiloSVG = `
  <style>
    .b{transition:opacity .15s}
    .b:hover{opacity:.82}
    @keyframes crecerV{from{transform:scaleY(0)}to{transform:scaleY(1)}}
    @keyframes crecerH{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    .animV{animation:crecerV .45s cubic-bezier(.2,.7,.3,1) both}
    .animH{animation:crecerH .45s cubic-bezier(.2,.7,.3,1) both}
    @media (prefers-reduced-motion: reduce){.animV,.animH{animation:none}}
  </style>`;

function ticks(maxValor, metrica) {
  const entero = !METRICAS[metrica] || METRICAS[metrica].dec === 0;
  const bruto = maxValor / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto || 1)));
  let paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto) || mag * 10;
  if (entero) paso = Math.max(1, Math.round(paso));   // sin decimales en conteos
  const tope = Math.ceil(maxValor / paso) * paso;
  const arr = [];
  for (let v = 0; v <= tope + 1e-9; v += paso) arr.push(Math.round(v * 100) / 100);
  return { tope: tope || 1, arr };
}

function svgVertical(serie, metrica, dim) {
  const W = 900, ML = 62, MR = 18, MT = 22;
  const rot = serie.length > 8 || serie.some((s) => s.label.length > 8);
  const MB = rot ? 96 : 54;
  const H = 420;
  const ancho = W - ML - MR, alto = H - MT - MB;
  const { tope, arr } = ticks(Math.max(...serie.map((s) => s.valor)), metrica);
  const paso = ancho / serie.length;
  const bw = Math.min(paso * 0.68, 78);
  const maxV = Math.max(...serie.map((s) => s.valor));
  const minV = Math.min(...serie.map((s) => s.valor));

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapar($("titulo-graf").textContent)}" font-family="Segoe UI, system-ui, Arial, sans-serif">${estiloSVG}`;
  s += `<rect width="${W}" height="${H}" fill="#ffffff"/>`;

  // grilla + eje Y
  for (const t of arr) {
    const y = MT + alto - (t / tope) * alto;
    s += `<line x1="${ML}" y1="${y.toFixed(1)}" x2="${W - MR}" y2="${y.toFixed(1)}" stroke="${COLORES.grilla}" stroke-width="1"/>`;
    s += `<text x="${ML - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="${COLORES.eje}">${fmt(t, metrica)}</text>`;
  }
  s += `<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${MT + alto}" stroke="${COLORES.eje}" stroke-width="1.5"/>`;
  s += `<line x1="${ML}" y1="${MT + alto}" x2="${W - MR}" y2="${MT + alto}" stroke="${COLORES.eje}" stroke-width="1.5"/>`;
  s += `<text x="${ML - 48}" y="${MT + alto / 2}" transform="rotate(-90 ${ML - 48} ${MT + alto / 2})" text-anchor="middle" font-size="12.5" font-weight="600" fill="${COLORES.eje}">${escapar(METRICAS[metrica].titulo)}</text>`;

  serie.forEach((d, i) => {
    const x = ML + paso * i + (paso - bw) / 2;
    const h = tope ? (d.valor / tope) * alto : 0;
    const y = MT + alto - h;
    const color = d.valor === maxV ? COLORES.max : d.valor === minV && maxV !== minV ? COLORES.min : COLORES.barra;
    s += `<g class="animV" style="transform-origin:${(x + bw / 2).toFixed(1)}px ${(MT + alto).toFixed(1)}px;animation-delay:${(i * 28)}ms">`;
    s += `<rect class="b" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="5" fill="${color}"><title>${escapar(d.label)}: ${fmt(d.valor, metrica)} ${METRICAS[metrica].unidad}</title></rect>`;
    s += `</g>`;
    if (bw >= 26) {
      s += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="${COLORES.barraOsc}">${fmt(d.valor, metrica)}</text>`;
    } else if (d.valor === maxV || (d.valor === minV && maxV !== minV)) {
      // con muchas barras, solo se rotulan la más alta y la más baja
      s += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${d.valor === maxV ? COLORES.max : COLORES.min}">${fmt(d.valor, metrica)}</text>`;
    }
    const etiqueta = recortar(d.label, rot ? 26 : 14);
    if (rot) {
      s += `<text x="${(x + bw / 2).toFixed(1)}" y="${MT + alto + 14}" transform="rotate(-38 ${(x + bw / 2).toFixed(1)} ${MT + alto + 14})" text-anchor="end" font-size="12" fill="${COLORES.texto}">${escapar(etiqueta)}</text>`;
    } else {
      s += `<text x="${(x + bw / 2).toFixed(1)}" y="${MT + alto + 19}" text-anchor="middle" font-size="12.5" fill="${COLORES.texto}">${escapar(etiqueta)}</text>`;
    }
  });

  s += `<text x="${ML + ancho / 2}" y="${H - 6}" text-anchor="middle" font-size="12.5" font-weight="600" fill="${COLORES.eje}">${escapar(DIMS[dim].eje)}</text>`;
  return s + "</svg>";
}

function svgHorizontal(serie, metrica, dim) {
  const W = 900, MT = 22, MB = 44, MR = 66;
  const ML = Math.min(300, Math.max(96, Math.max(...serie.map((s) => recortar(s.label, 34).length)) * 7.2 + 16));
  const bh = serie.length > 14 ? 22 : 28;
  const gap = serie.length > 14 ? 7 : 10;
  const alto = serie.length * (bh + gap);
  const H = MT + alto + MB;
  const ancho = W - ML - MR;
  const { tope, arr } = ticks(Math.max(...serie.map((s) => s.valor)), metrica);
  const maxV = Math.max(...serie.map((s) => s.valor));
  const minV = Math.min(...serie.map((s) => s.valor));

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapar($("titulo-graf").textContent)}" font-family="Segoe UI, system-ui, Arial, sans-serif">${estiloSVG}`;
  s += `<rect width="${W}" height="${H}" fill="#ffffff"/>`;

  for (const t of arr) {
    const x = ML + (t / tope) * ancho;
    s += `<line x1="${x.toFixed(1)}" y1="${MT}" x2="${x.toFixed(1)}" y2="${MT + alto}" stroke="${COLORES.grilla}" stroke-width="1"/>`;
    s += `<text x="${x.toFixed(1)}" y="${MT + alto + 18}" text-anchor="middle" font-size="12" fill="${COLORES.eje}">${fmt(t, metrica)}</text>`;
  }
  s += `<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${MT + alto}" stroke="${COLORES.eje}" stroke-width="1.5"/>`;

  serie.forEach((d, i) => {
    const y = MT + i * (bh + gap);
    const w = tope ? (d.valor / tope) * ancho : 0;
    const color = d.valor === maxV ? COLORES.max : d.valor === minV && maxV !== minV ? COLORES.min : COLORES.barra;
    s += `<text x="${ML - 10}" y="${(y + bh / 2 + 4.5).toFixed(1)}" text-anchor="end" font-size="12.5" fill="${COLORES.texto}">${escapar(recortar(d.label, 34))}</text>`;
    s += `<g class="animH" style="transform-origin:${ML}px ${(y + bh / 2).toFixed(1)}px;animation-delay:${(i * 28)}ms">`;
    s += `<rect class="b" x="${ML}" y="${y.toFixed(1)}" width="${Math.max(w, 1).toFixed(1)}" height="${bh}" rx="5" fill="${color}"><title>${escapar(d.label)}: ${fmt(d.valor, metrica)} ${METRICAS[metrica].unidad}</title></rect>`;
    s += `</g>`;
    s += `<text x="${(ML + w + 8).toFixed(1)}" y="${(y + bh / 2 + 4.5).toFixed(1)}" font-size="12" font-weight="700" fill="${COLORES.barraOsc}">${fmt(d.valor, metrica)}</text>`;
  });

  s += `<text x="${ML + ancho / 2}" y="${H - 6}" text-anchor="middle" font-size="12.5" font-weight="600" fill="${COLORES.eje}">${escapar(METRICAS[metrica].titulo)}</text>`;
  return s + "</svg>";
}

// ---------- exportar ----------
function descargarPNG() {
  const svg = $("grafico").querySelector("svg");
  if (!svg) return;
  const texto = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([texto], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  img.onload = () => {
    const w = svg.viewBox.baseVal.width || 900;
    const h = svg.viewBox.baseVal.height || 420;
    const c = document.createElement("canvas");
    c.width = w * 2;
    c.height = h * 2;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `grafico-bibliodatos-${$("dim").value}-${$("metrica").value}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    alert("No se pudo generar la imagen. Podés sacar una captura de pantalla del gráfico.");
  };
  img.src = url;
}

function copiarDatos() {
  const lineas = [
    `${DIMS[$("dim").value].eje}\t${METRICAS[ultimaMetrica].titulo}`,
    ...ultimaSerie.map((d) => `${d.label}\t${fmt(d.valor, ultimaMetrica)}`),
  ].join("\n");
  navigator.clipboard.writeText(lineas).then(() => {
    const aviso = $("copiado");
    aviso.hidden = false;
    setTimeout(() => (aviso.hidden = true), 1600);
  });
}

// ---------- utilidades ----------
function fmt(v, metrica) {
  const dec = METRICAS[metrica] ? METRICAS[metrica].dec : 0;
  return v.toLocaleString("es-UY", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function recortar(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function escapar(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
