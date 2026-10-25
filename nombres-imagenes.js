// Uso: node nombres-imagenes.js   (desde la carpeta del proyecto, donde está /data)
const fs = require("fs");
const path = require("path");

const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const dir = path.join(__dirname, "data");
const out = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "games.json")) {
  const o = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  out.push(`\n=== ${o.name || o.id}  ->  assets/productos/${o.id}/ ===`);
  String(o.csv || "").split("\n").map(l => l.trim()).filter(l => l && l[0] !== "#").forEach(l => {
    const nombre = l.split(";")[0];
    out.push(`${slug(nombre)}.png    <-  ${nombre}`);
  });
}
const txt = out.join("\n");
console.log(txt);
fs.writeFileSync(path.join(__dirname, "nombres-imagenes.txt"), txt, "utf8");
console.log("\nGuardado también en nombres-imagenes.txt");
