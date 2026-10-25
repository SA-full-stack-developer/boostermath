# BoosterMath

Calculadora de precio por sobre de cartas TCG. Web estática (HTML + CSS + JS), sin servidor ni base de datos, instalable como app (PWA). Funciona con GitHub Pages gratis.

Publicada en: https://sa-full-stack-developer.github.io/boostermath/

Te dice **cuánto pagas de verdad por cada sobre**: al precio de un producto le resta el valor de los extras (promos, monedas, fundas, figuras…) y lo divide entre el número de sobres. Así sabes si una oferta compensa.

Tus datos (hallazgos, ediciones, fotos, marcas 📦, umbrales y tipos de cambio) se guardan **solo en el navegador**, separados por expansión. Para llevarlos a otro dispositivo usa **Exportar** / **Exportar todo** e **Importar**.

## Estructura

```
index.html  style.css  app.js  sw.js  manifest.webmanifest
favicon.ico                          <- tu favicon (la página ya apunta a él)
assets/logo.png                      <- logo centrado arriba
assets/icon-192.png                  <- iconos de la app instalada (provisionales)
assets/icon-512.png
assets/default-product.png           <- imagen por defecto de un producto sin foto
assets/juegos/                       <- logos de las pestañas de juego (opcional)
assets/expansiones/<id>.<ext>        <- logo de cada expansión (tarjeta del selector)
assets/productos/<id>/<nombre>.<ext> <- foto de cada producto
data/games.json                      <- lista de juegos y de sus expansiones
data/<expansion>.json                <- una por expansión
nombres-imagenes.js                  <- script que lista cómo nombrar las fotos
```

## Cómo se usa

1. **Elige juego y expansión.** Las pestañas son los juegos; el botón de debajo abre el selector de expansiones, que muestra tarjetas con logo, nombre y fecha (2 columnas en móvil, 5 en escritorio). Si un juego no tiene expansiones, la lista queda vacía hasta que crees una con «＋ Nueva expansión».
2. **Escribe el precio** que ves en una tienda en la ficha del producto. Te dice si es **Compra** (verde), **Aceptable** (ámbar) o **Caro** (rojo).
3. **Guarda hallazgos** (tienda, idioma, precio y enlace) para comparar y ver cómo cambian. Cada hallazgo se puede marcar como disponible (✅) o no (🚫) y editar (✏️).
4. **Marca 📦** los productos que tienes sin abrir (solo informativo) y usa **filtros y orden** para encontrar lo mejor.
5. **Exporta tus datos** de vez en cuando.

### La ficha de producto

- Arriba: la foto a la izquierda y, a la derecha, 📦 y 🗑️ en una fila y el botón de extras debajo. Debajo, el nombre y los datos (sobres · idioma · fecha de salida).
- **🗑️ Eliminar producto** pide confirmación y borra también sus hallazgos, foto y marcas.
- **✅ Extras contados / 🚫 Extras no contados:** activa o desactiva el valor de los extras en el cálculo de ese producto.
- **Hallazgos**, **Buscar en tiendas** y **Detalles** (qué trae, origen del precio, URL de la foto y subida de foto) son desplegables al mismo nivel.

### Cómo se mide el precio

Con los umbrales **Ideal** y **Máximo** (€/sobre) se calcula `(precio − extras) / sobres`:

- **Verde** hasta el punto medio entre Ideal y Máximo (con 6 y 8, hasta 7 €/sobre).
- **Ámbar** desde ahí hasta el Máximo (7 a 8).
- **Rojo** por encima del Máximo.

Los productos con **0 sobres** son solo referencia: se comparan con su PVP en euros (verde hasta +10 %, ámbar hasta +30 %, rojo por encima) y la ficha muestra el PVP.

## Imágenes

Los formatos válidos son `webp` (recomendado), `png`, `jpg`, `jpeg`, `avif`, `gif` y `svg`. El nombre del fichero distingue minúsculas y mayúsculas en GitHub Pages: usa siempre minúsculas.

**Foto de producto.** Orden de búsqueda:

1. El enlace del producto (campo «URL de la foto» en Detalles, o la 8.ª columna del catálogo) o una foto subida desde el navegador.
2. `assets/productos/<id-expansion>/<nombre>.<ext>`.
3. `assets/default-product.png`.
4. Un icono 📷 si no hay nada.

El `<nombre>` es el del producto en minúsculas, sin tildes y con cualquier símbolo o espacio convertido en un guion. Por ejemplo, «Caja ex + 4 sobres» en `dominio-delta` es `assets/productos/dominio-delta/caja-ex-4-sobres.webp`. Para sacar la lista exacta de tus expansiones, desde la carpeta del proyecto:

```
node nombres-imagenes.js
```

Imprime los nombres y los guarda en `nombres-imagenes.txt`. Si cambias el nombre de un producto en el catálogo, renombra también su imagen.

**Logo de expansión.** `assets/expansiones/<id>.<ext>` (por ejemplo `dominio-delta.webp`), o un campo `logo` en el JSON de la expansión con la ruta. Si no existe, la tarjeta muestra 🃏.

**Logo de juego.** Campo `img` en `games.json` (ver más abajo). Si falla, vuelve al icono y el nombre.

## Publicar en GitHub Pages

1. Repositorio público; sube todo el contenido de esta carpeta (arrastra `data` y `assets` enteras).
2. **Settings → Pages → Deploy from a branch → `main` / `(root)` → Save**.
3. En un par de minutos estará en `https://TU_USUARIO.github.io/NOMBRE_REPO/`.

## Desarrollo en local

Abrir `index.html` con doble clic no funciona: el navegador bloquea `fetch()` desde `file://` y la web carga sus JSON con `fetch`. Sírvela por HTTP:

- **VS Code:** extensión **Live Server** → clic derecho en `index.html` → _Open with Live Server_.
- **Terminal:** `python3 -m http.server 8000` (o `npx serve`) y abre `http://localhost:8000`.

Cosas a tener en cuenta:

- **Brave** bloquea JS por defecto con Shields: da la excepción también a `localhost`.
- **Service worker:** si cambias algo y no lo ves, es la caché. En DevTools → _Application_ → _Service Workers_ marca **Update on reload**, o pulsa _Unregister_. Al publicar cambios, sube también el número de versión de `sw.js` (`const C="bm-v3"`) para que los visitantes reciban la versión nueva.
- **Datos separados:** el `localStorage` es por origen y por puerto. `localhost:5500` y `github.io` guardan datos distintos; usa siempre el mismo puerto y pasa tus datos entre ellos con Exportar / Importar.
- **Cambios en el JSON del servidor:** lo que ya estaba guardado en tu navegador no se actualiza solo. Para ver un catálogo o unos hallazgos nuevos del repositorio, pulsa **Restablecer expansión** (y luego **Importar** tus datos si los tenías).

## Añadir un juego

Edita `data/games.json`:

```json
[
  {
    "id": "pokemon",
    "name": "Pokémon",
    "icon": "⚡",
    "img": "assets/juegos/pokemon.webp",
    "expansions": ["dominio-delta.json", "30-aniversario.json"]
  },
  {
    "id": "digimon",
    "name": "Digimon",
    "icon": "🦖",
    "expansions": []
  }
]
```

Cada juego sale como una pestaña. `img` es opcional: si existe, la pestaña muestra el logo en lugar del icono y el nombre (déjalos igualmente como respaldo). Las expansiones aparecen en el selector con su logo; el campo `serie` de cada una se usa para la búsqueda del selector.

## Añadir una expansión

1. Créala en la web («＋ Nueva expansión» en el selector), rellénala y pulsa **Exportar**. Baja `boostermath-<id>.json`.
2. Cópiala a `data/`, quita de ella los `finds` que no quieras publicar y añade su nombre de fichero a `expansions` del juego en `games.json`.
3. Sube los cambios.

Campos de una expansión: `id`, `name`, `serie`, `logo` (opcional), `q` (texto de las búsquedas en Google), `rel` (fechas de salida por región), `rev`, `ok` y `mx` (umbrales), `fx` (tipos de cambio), `fxNote`, `csv` (catálogo), `finds` (hallazgos iniciales; vacío en las que publicas), `noex` y `dates`.

### Catálogo (`csv`)

Una línea por producto, columnas separadas por `;`:

```
nombre ; sobres ; PVP ; extras ; origen ; idioma ; fecha ; foto
```

- **sobres:** con `0` el producto es solo referencia (se compara contra su PVP).
- **PVP:** en euros (`15,99`) o en otra moneda (`7200 JPY`, `70000 KRW`, `360 CNY`, `1980 TWD`, `750 HKD`); se convierte con los tipos de cambio de la expansión.
- **extras:** `descripción:valor|descripción:valor`, en euros. Si una carta vale distinto según el idioma: `ES=30 EN=32 JP=45`. Los valores son estimaciones.
- **origen:** texto libre (por ejemplo el precio oficial local).
- **idioma:** `ES`, `EN`, `JP`, `KO` o `ZH`. Si se omite, se deduce del nombre (` JP`, ` KR`, ` CN`/` TW`) y, si no, es `ES`.
- **fecha:** de salida, `AAAA-MM-DD`. Es la que se muestra en la ficha y sirve para ordenar.
- **foto:** URL de una imagen (opcional).
- Las líneas que empiezan por `#` se ignoran.

Ejemplo:

```
Blíster 2 sobres (Knock Out);2;15,99;Promo foil Eevee:0,02|Moneda:0,25;;;2026-09-16
Caja 20 sobres JP;20;7200 JPY;;360 yenes por sobre;;2026-09-16
Mazo de Combate Espeon o Umbreon ex;0;34,99;Mazo de combate:0;;;2026-10-30
```

Los paneles «Catálogo de la expansión» y «Tipos de cambio» están ocultos por CSS (`#catalogo` y `#conversor` en `style.css`). Para editarlos desde la web, quítalos de la regla `display: none`.

## Exportar e importar

- **Exportar** baja la expansión abierta; **Exportar todo**, todas las que tengan datos. El formato actual es v3 (con `id`, `game`, `serie` e `imgUrl`).
- **Importar** fusiona los hallazgos y reemplaza el resto; si el archivo trae una expansión nueva, la crea. También admite los exports antiguos v2 de los comparadores de un solo HTML (se importan en la expansión abierta).
- «Incluir fotos subidas» añade las fotos subidas desde el navegador (pesa más).

## Instalar como app

En Chrome/Edge/Brave aparece el icono de instalar en la barra de direcciones (y el botón «Instalar» de la página). En el móvil, menú del navegador → «Instalar aplicación» o «Añadir a pantalla de inicio». Necesita HTTPS (GitHub Pages ya lo da). El service worker guarda una copia para funcionar sin conexión.

## Cuando tengas dominio propio

1. **Settings → Pages → Custom domain**: escribe el dominio (crea un fichero `CNAME`).
2. DNS: registros `A` para `@` a `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153` (confírmalo en la documentación de GitHub Pages) y `CNAME` de `www` a `TU_USUARIO.github.io`. Si los DNS están en Loading (`ns1-3.grupoloading.com`), los registros se crean allí.
3. Activa **Enforce HTTPS**.

El navegador guarda los datos por dirección: antes de cambiar de `usuario.github.io` al dominio nuevo, pulsa **Exportar todo**, y en la dirección nueva **Importar**.
