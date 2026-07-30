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

## Etapa 2 — Gráficos (`graficos.html`)

Cuando filtrar y ordenar ya no alcanza, la Etapa 2 permite **generar gráficos de barras** sobre la misma base.

- **Qué comparar:** edad, departamento, día de mayo, tiempo de lectura, título del libro o ID de usuario.
- **Qué contar:** cantidad de préstamos, lectores distintos, minutos leídos (total) o minutos leídos (promedio).
- **Orden:** de mayor a menor, de menor a mayor, o por categoría (para ver la evolución día a día).
- **Resaltado automático:** la barra más alta queda en verde y la más baja en amarillo, con dos tarjetas que responden el "¿cuál es el que más / el que menos?".
- **Filtros:** departamento, edad y título, para preguntas como *"¿qué libro leen más los de 11 años?"*.
- **Descargar gráfico:** exporta un PNG para pegar en el informe de la agencia de detectives.

> ⚠️ La base guarda **título**, no *género* ni *autor*. La pregunta por el "género más consultado" se trabaja agrupando por título y conversando en clase qué género le corresponde a cada libro: reconocer los límites de los datos es parte de la actividad.

## Publicación

El sitio se sirve como **GitHub Pages** desde la rama `main`. Archivos:

- `index.html` — Etapa 1: estructura de la página
- `app.js` — Etapa 1: lógica de búsqueda/filtro/orden
- `graficos.html` — Etapa 2: generador de gráficos
- `graficos.js` — Etapa 2: agrupación de datos y dibujo del SVG
- `style.css` — estilos base
- `graficos.css` — estilos de la Etapa 2 y de la navegación
- `data.json` — datos (formato compacto), compartido por ambas etapas

## Datos

Fuente: *Base anonimizada PC - Biblioteca País* (Plan Ceibal). 20.630 préstamos, 19 departamentos de Uruguay, lectores de 6 a 12 años, mayo 2021.
