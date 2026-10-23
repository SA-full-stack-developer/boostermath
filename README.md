# BoosterMath

Calculadora de precio por sobre de cartas TCG. Web estática (HTML + JS), sin servidor ni base de datos, instalable como app (PWA). Funciona con GitHub Pages gratis.

Tus datos (hallazgos, ediciones, fotos, marcas 📦, umbrales y tipos de cambio) se guardan **solo en el navegador**, separados por expansión. Para llevarlos a otro dispositivo usa **Exportar** / **Exportar todo** e **Importar**.

## Estructura

```
index.html  style.css  app.js  sw.js  manifest.webmanifest
favicon.ico            <- pon aquí tu favicon (la página ya apunta a él)
assets/logo.png        <- pon aquí tu logo (se muestra centrado arriba)
assets/icon-192.png    <- iconos de la app instalada (provisionales, sustitúyelos)
assets/icon-512.png
data/games.json        <- lista de juegos y de sus expansiones
data/<expansion>.json  <- una por expansión
```

## Publicar en GitHub Pages

1. Repositorio público, sube todo el contenido de esta carpeta (la carpeta `data` y `assets` arrastrándolas enteras).
2. **Settings → Pages → Deploy from a branch → `main` / `(root)` → Save**.
3. En un par de minutos estará en `https://TU_USUARIO.github.io/NOMBRE_REPO/`.

En local no sirve abrir `index.html` con doble clic: ejecuta `python3 -m http.server` en esta carpeta y abre `http://localhost:8000`.

## Añadir un juego

Edita `data/games.json`:

```json
[
  {"id":"pokemon","name":"Pokémon","icon":"⚡","expansions":["dominio-delta.json","30-aniversario.json"]},
  {"id":"onepiece","name":"One Piece","icon":"🏴‍☠️","expansions":["op-01.json"]}
]
```

Cada juego sale como una pestaña. Las expansiones aparecen en el selector agrupadas por su campo `serie`.

## Añadir una expansión

1. Créala en la web («+ Nueva expansión» en el selector), rellénala y pulsa **Exportar**. Baja `boostermath-<id>.json`.
2. Cópiala a `data/`, quita de ella los `finds` que no quieras publicar y añade su nombre de fichero a `expansions` del juego en `games.json`.
3. Sube los cambios.

Campos de una expansión: `id`, `name`, `serie`, `q` (texto de las búsquedas en Google), `rel` (fechas de salida por región), `rev`, `ok` y `mx` (umbrales), `fx` (tipos de cambio), `fxNote`, `csv` (catálogo), `finds` (hallazgos iniciales; vacío en las que publicas), `noex` y `dates`.

Columnas del catálogo (`csv`), separadas por `;`: nombre; sobres; PVP; extras; origen; idioma; fecha de salida (AAAA-MM-DD); URL de foto.

## Instalar como app

En Chrome/Edge/Brave aparece el icono de instalar en la barra de direcciones (y el botón «Instalar» de la página). En el móvil, menú del navegador → «Instalar aplicación» o «Añadir a pantalla de inicio». Necesita HTTPS (GitHub Pages ya lo da).

## Cuando tengas dominio propio

1. **Settings → Pages → Custom domain**: escribe el dominio (crea un fichero `CNAME`).
2. DNS: registros `A` para `@` a `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153` (confírmalo en la documentación de GitHub Pages) y `CNAME` de `www` a `TU_USUARIO.github.io`.
3. Activa **Enforce HTTPS**.

El navegador guarda los datos por dirección: antes de cambiar de `usuario.github.io` al dominio nuevo, pulsa **Exportar todo**, y en la dirección nueva **Importar**.
