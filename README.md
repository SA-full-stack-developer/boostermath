# BoosterMath

Calculadora de precio por sobre de cartas TCG. Web estática (HTML + JS), sin servidor ni base de datos. Funciona con GitHub Pages gratis.

Tus datos (hallazgos, ediciones, fotos, marcas 📦, umbrales y tipos de cambio) se guardan **solo en el navegador**, separados por expansión. Para llevarlos a otro dispositivo usa **Exportar** / **Exportar todo** e **Importar**.

## Publicar en GitHub Pages

1. Crea un repositorio público (por ejemplo `boostermath`) y sube todo el contenido de esta carpeta.
2. En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
3. En un par de minutos estará en `https://TU_USUARIO.github.io/boostermath/`.

Para probarlo en local no sirve abrir `index.html` con doble clic (el navegador bloquea la carga de los JSON). Desde esta carpeta ejecuta `python3 -m http.server` y abre `http://localhost:8000`.

## Añadir una expansión

**Solo en tu navegador:** selector de arriba → **+ Nueva expansión...**, escribe el nombre y rellena el catálogo.

**Para todos los dispositivos desde el repositorio:**
1. Crea la expansión en la web, rellénala y pulsa **Exportar**. Baja `boostermath-<id>.json`.
2. Copia ese fichero a la carpeta `data/`.
3. Añade su nombre de fichero a `data/expansions.json` (el primero de la lista es el que se abre por defecto).
4. Sube los cambios. Si cambias datos de una expansión ya publicada, sube también el número `rev` del JSON para que los hallazgos nuevos se fusionen en los navegadores que ya tienen datos guardados.

Campos del JSON de una expansión: `id`, `name`, `q` (texto de las búsquedas en Google), `rel` (fechas de salida por región), `rev`, `ok` y `mx` (umbrales), `fx` (tipos de cambio), `fxNote`, `csv` (catálogo), `finds` (hallazgos iniciales), `noex` y `dates`.

## Cuando tengas dominio propio

1. En **Settings → Pages → Custom domain** escribe el dominio (se crea un fichero `CNAME`).
2. En el DNS del dominio: registros `A` para `@` hacia `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153` (confírmalos en la documentación de GitHub Pages) y un `CNAME` de `www` hacia `TU_USUARIO.github.io`.
3. Activa **Enforce HTTPS** cuando GitHub lo permita.

**Importante:** el navegador guarda los datos por dirección. Antes de cambiar de `usuario.github.io` al dominio nuevo, pulsa **Exportar todo**; después, en la dirección nueva, **Importar**.

## Ficheros

- `index.html`, `style.css`, `app.js`: la aplicación.
- `data/expansions.json`: lista de expansiones.
- `data/*.json`: una por expansión.
