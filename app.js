// Bibliodatos — explorador interactivo de la base de la Biblioteca País
"use strict";

const PAGINA = 100;           // filas que se muestran por tanda
let DATA = null;              // datos crudos cargados
let REGISTROS = [];           // registros normalizados (objetos)
let filtrados = [];           // resultado actual del filtro
let mostrados = 0;            // cuántas filas visibles llevamos
let orden = { col: null, dir: 1 };

const $ = (id) => document.getElementById(id);

// Elementos
const elBusca = $("busca");
const elUsuario = $("usuario");
const elFecha = $("fecha");
const elDepto = $("depto");
const elEdad = $("edad");
const elCuerpo = $("cuerpo");
const elConteo = $("conteo");
const elVacio = $("vacio");
const elMasWrap = $("mas-wrap");
const elMas = $("mas");

// --- Carga de datos ---
fetch("data.json")
  .then((r) => r.json())
  .then((d) => {
    DATA = d;
    normalizar();
    poblarSelectores();
    conectarEventos();
    aplicarFiltros();
  })
  .catch((e) => {
    elConteo.textContent = "No se pudieron cargar los datos 😕";
    console.error(e);
  });

function normalizar() {
  const { deptos, titulos, rows, mes } = DATA;
  // fila compacta: [día, id, edad, idxDepto, prestamos, tiempo, idxTitulo]
  REGISTROS = rows.map((f) => ({
    dia: f[0],
    fecha: `${String(f[0]).padStart(2, "0")}/05/2021`,
    id: f[1],
    edad: f[2],
    depto: f[3] >= 0 ? deptos[f[3]] : "—",
    prestamos: f[4],
    tiempo: f[5],
    titulo: titulos[f[6]],
    tituloLower: titulos[f[6]].toLowerCase(),
  }));
}

function poblarSelectores() {
  // Fechas (días del mes presentes, ordenados)
  const dias = [...new Set(REGISTROS.map((r) => r.dia))].sort((a, b) => a - b);
  for (const d of dias) {
    const o = document.createElement("option");
    o.value = d;
    o.textContent = `${String(d).padStart(2, "0")}/05/2021`;
    elFecha.appendChild(o);
  }
  // Departamentos
  for (const dep of DATA.deptos) {
    const o = document.createElement("option");
    o.value = dep;
    o.textContent = dep;
    elDepto.appendChild(o);
  }
  // Edades
  const edades = [...new Set(REGISTROS.map((r) => r.edad))].sort((a, b) => a - b);
  for (const e of edades) {
    const o = document.createElement("option");
    o.value = e;
    o.textContent = `${e} años`;
    elEdad.appendChild(o);
  }
}

function conectarEventos() {
  const refiltrar = () => aplicarFiltros();
  elBusca.addEventListener("input", debounce(refiltrar, 180));
  elUsuario.addEventListener("input", debounce(refiltrar, 180));
  elFecha.addEventListener("change", refiltrar);
  elDepto.addEventListener("change", refiltrar);
  elEdad.addEventListener("change", refiltrar);

  $("limpiar").addEventListener("click", () => {
    elBusca.value = "";
    elUsuario.value = "";
    elFecha.value = "";
    elDepto.value = "";
    elEdad.value = "";
    orden = { col: null, dir: 1 };
    document.querySelectorAll("th").forEach((th) => th.classList.remove("asc", "desc"));
    aplicarFiltros();
  });

  elMas.addEventListener("click", () => renderMas());

  document.querySelectorAll("th[data-col]").forEach((th) => {
    th.addEventListener("click", () => ordenarPor(th.dataset.col, th));
  });
}

function aplicarFiltros() {
  const texto = elBusca.value.trim().toLowerCase();
  const uid = elUsuario.value.trim();
  const dia = elFecha.value;
  const dep = elDepto.value;
  const edad = elEdad.value;

  filtrados = REGISTROS.filter((r) => {
    if (texto && !r.tituloLower.includes(texto)) return false;
    if (uid && String(r.id) !== uid) return false;
    if (dia && String(r.dia) !== dia) return false;
    if (dep && r.depto !== dep) return false;
    if (edad && String(r.edad) !== edad) return false;
    return true;
  });

  if (orden.col) aplicarOrden();

  mostrados = 0;
  elCuerpo.innerHTML = "";
  actualizarConteo();
  renderMas();
}

function aplicarOrden() {
  const c = orden.col;
  const d = orden.dir;
  filtrados.sort((a, b) => {
    let va = a[c], vb = b[c];
    if (c === "titulo" || c === "depto") {
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
      return va < vb ? -d : va > vb ? d : 0;
    }
    return (va - vb) * d;
  });
}

function ordenarPor(col, th) {
  if (orden.col === col) {
    orden.dir *= -1;
  } else {
    orden.col = col;
    orden.dir = 1;
  }
  document.querySelectorAll("th").forEach((t) => t.classList.remove("asc", "desc"));
  th.classList.add(orden.dir === 1 ? "asc" : "desc");
  aplicarOrden();
  mostrados = 0;
  elCuerpo.innerHTML = "";
  renderMas();
}

function renderMas() {
  const hasta = Math.min(mostrados + PAGINA, filtrados.length);
  const frag = document.createDocumentFragment();
  for (let i = mostrados; i < hasta; i++) {
    frag.appendChild(fila(filtrados[i]));
  }
  elCuerpo.appendChild(frag);
  mostrados = hasta;

  elVacio.hidden = filtrados.length !== 0;
  elMasWrap.hidden = mostrados >= filtrados.length;
  elMas.textContent = `Mostrar más resultados ▾  (${filtrados.length - mostrados} restantes)`;
}

function fila(r) {
  const tr = document.createElement("tr");
  tr.innerHTML =
    `<td>${r.fecha}</td>` +
    `<td class="num">${r.id}</td>` +
    `<td class="num">${r.edad}</td>` +
    `<td>${r.depto}</td>` +
    `<td class="num">${r.prestamos}</td>` +
    `<td class="num">${r.tiempo}</td>` +
    `<td class="titulo">${escapar(r.titulo)}</td>`;
  return tr;
}

function actualizarConteo() {
  const n = filtrados.length;
  if (n === REGISTROS.length) {
    elConteo.textContent = `📚 ${n.toLocaleString("es")} préstamos en total`;
  } else {
    elConteo.textContent = `🔎 ${n.toLocaleString("es")} resultado${n === 1 ? "" : "s"} encontrado${n === 1 ? "" : "s"}`;
  }
}

// --- utilidades ---
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
function escapar(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
