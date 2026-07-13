# 🕵️ Bibliodatos — Biblioteca País

Página interactiva para explorar la base de datos anonimizada de la **Biblioteca País** (Plan Ceibal), usada en la actividad de **Pensamiento Computacional** "Bibliodatos: Develando misterios con datos".

Los niños actúan como detectives/analistas de datos y usan la herramienta para **buscar, filtrar y ordenar** más de 20.000 préstamos de mayo de 2021 — algo imposible de hacer con el PDF estático.

## Cómo se usa

- **Buscar título:** escribí parte del nombre de un libro (ej: `splat`, `dragón`).
- **ID de usuario:** filtrá por un lector puntual (ej: `500001`).
- **Fecha / Departamento / Edad:** acotá la búsqueda.
- **Ordenar:** tocá el título de cualquier columna (ej: *Tiempo lectura*) para ordenar ↕.
- **Limpiar filtros:** vuelve a mostrar todo.

No requiere Drive, login ni instalación: funciona en el navegador.

## Publicación

El sitio se sirve como **GitHub Pages** desde la rama `main`. Archivos:

- `index.html` — estructura de la página
- `style.css` — estilos
- `app.js` — lógica de búsqueda/filtro/orden
- `data.json` — datos (formato compacto)

## Datos

Fuente: *Base anonimizada PC - Biblioteca País* (Plan Ceibal). 20.630 préstamos, 19 departamentos de Uruguay, lectores de 6 a 12 años, mayo 2021.
