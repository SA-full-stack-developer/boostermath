const BM_VER = "2.0";
(function () {
  const show = (m) => {
    const l = document.getElementById("ld");
    if (l) {
      l.hidden = false;
      l.textContent = "Error (" + BM_VER + "): " + m;
    }
  };
  window.addEventListener("error", (e) =>
    show(
      (e.message || "desconocido") +
        " [" +
        String(e.filename || "")
          .split("/")
          .pop() +
        ":" +
        e.lineno +
        "]",
    ),
  );
  window.addEventListener("unhandledrejection", (e) =>
    show(String((e.reason && e.reason.message) || e.reason)),
  );
})();
const NS = "boostermath.v1.";
const LS = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(NS + k));
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(NS + k, JSON.stringify(v));
      return true;
    } catch (e) {
      return false;
    }
  },
  del(k) {
    try {
      localStorage.removeItem(NS + k);
    } catch (e) {}
  },
};
const CUSTOM_CSV =
  "# nombre;sobres;pvp;extras (descripcion:valor|descripcion:valor);origen;idioma;fecha(AAAA-MM-DD)\n# Con 0 sobres el producto es solo referencia: se compara contra su PVP en euros\n";
const FX0 = { CNY: 7.5, JPY: 177.5, KRW: 1499, TWD: 36.8, HKD: 8.83 };
let EXPS = [],
  meta = LS.get("meta"),
  cur = null,
  S = null,
  EXP = { name: "", dates: [] },
  EXP_Q = "",
  DEF = "";
if (!meta || !Array.isArray(meta.custom)) meta = { cur: "", custom: [] };
if (!meta.last || typeof meta.last !== "object") meta.last = {};
if (!Array.isArray(meta.recent)) meta.recent = [];
if (!Array.isArray(meta.games)) meta.games = [];
if (!meta.gameOv || typeof meta.gameOv !== "object") meta.gameOv = {};
if (!Array.isArray(meta.hiddenGames)) meta.hiddenGames = [];
const ui = LS.get("ui") || {};
const saveUi = () => LS.set("ui", ui);
let GAMES = [];
const freshState = (d) => ({
  ok: num(d.ok) || 6,
  mx: num(d.mx) || 7.5,
  csv: d.csv || CUSTOM_CSV,
  finds: [],
  imgs: {},
  imgUrl: {},
  seedRev: 0,
  noex: Object.assign({}, d.noex),
  dates: Object.assign({}, d.dates),
  sealed: {},
  wish: {},
  fav: {},
  obs: {},
  fx: Object.assign({}, FX0, d.fx),
});
function loadState(d) {
  const s = Object.assign(freshState(d), LS.get("s." + d.id) || {});
  [
    "imgs",
    "imgUrl",
    "noex",
    "dates",
    "sealed",
    "fx",
    "fav",
    "obs",
    "wish",
  ].forEach((k) => {
    if (!s[k] || typeof s[k] !== "object") s[k] = {};
  });
  s.fx = Object.assign({}, FX0, d.fx, s.fx);
  if (!Array.isArray(s.finds)) s.finds = [];
  const rev = d.rev || 1;
  if ((s.seedRev || 0) < rev) {
    const seen = new Set(s.finds.map((z) => [z.n, z.s, z.p].join("|")));
    (d.finds || []).forEach((z) => {
      const k = [z.n, z.s, z.p].join("|");
      if (!seen.has(k)) {
        seen.add(k);
        s.finds.push(Object.assign({}, z));
      }
    });
    s.seedRev = rev;
    LS.set("s." + d.id, s);
  }
  return s;
}
const save = () => {
  if (!cur) return;
  const ok = LS.set("s." + cur.id, S);
  $("warn").hidden = ok;
  if (!ok)
    $("warn").textContent =
      "No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado. Exporta tus datos.";
};
const DATES = {};
const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const dateFor = (n) => {
  const k = norm(n),
    m = Object.keys(DATES).find((d) => k.startsWith(d));
  return m ? DATES[m] : "";
};
const fmtDate = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
  return m ? m[3] + "/" + m[2] + "/" + m[1] : v || "sin confirmar";
};
function hdr() {
  const e = document.getElementById("hd");
  e.innerHTML = "";
  if (!EXP.dates.length) return;
  const b = document.createElement("div");
  b.className = "xd";
  b.textContent =
    "Salida: " +
    EXP.dates.map((d) => d[0] + " " + fmtDate(d[1])).join(" \u00b7 ");
  e.append(b);
}
const STORES = [
  "Amazon",
  "Fnac",
  "Carrefour",
  "Toys R Us",
  "Toy Planet",
  "Drim",
  "Joguiba",
  "Alcampo",
  "El Corte Ingl\u00e9s",
  "GAME",
  "Flash Store",
  "Juguettos",
  "Juguetilandia",
  "MediaMarkt",
  "PcComponentes",
  "Miravia",
  "Eroski",
  "Worten",
  "Pokemon Center",
];
const $ = (id) => document.getElementById(id);
const FMORE = new Set(),
  SHMORE = new Set(),
  SH_N = 12,
  F_N = 10;
const cardsOf = (n) =>
  [...document.querySelectorAll(".card")].filter((c) => c.dataset.n === n);
const num = (v) => {
  const n = parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? n : null;
};
const f = (n) =>
  n.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const LBL = { ok: "Compra", wa: "Aceptable", ko: "Caro" };
const verdict = (pp) =>
  pp <= (S.ok + S.mx) / 2 ? "ok" : pp <= S.mx ? "wa" : "ko";
const price = (s) => {
  s = (s || "").trim();
  const m = s.match(/^([\d.,]+)\s*([A-Za-z]{3})$/);
  if (m) {
    const a = num(m[1]),
      r = S.fx[m[2].toUpperCase()];
    return a !== null && r
      ? { eur: a / r, org: m[1] + " " + m[2].toUpperCase() }
      : { eur: null, org: "" };
  }
  return { eur: num(s), org: "" };
};
const exs = (s, lg) =>
  (s || "")
    .split("|")
    .map((t) => {
      const i = t.lastIndexOf(":");
      if (i < 0) return null;
      const d = t.slice(0, i).trim(),
        r = t.slice(i + 1),
        m = {};
      r.replace(/([A-Za-z]{2})\s*=\s*([\d.,]+)/g, (_, k, n) => {
        m[k.toUpperCase()] = num(n);
      });
      const ks = Object.keys(m);
      const v = ks.length
        ? m[lg] !== undefined
          ? m[lg]
          : m.ES !== undefined
            ? m.ES
            : m[ks[0]]
        : num(r);
      return v === null || v === undefined ? null : { d, v };
    })
    .filter((e) => e);
const parse = () =>
  S.csv
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l[0] !== "#")
    .map((l) => {
      const p = l.split(";");
      const lg =
          (p[5] || "").trim().toUpperCase() ||
          (/ JP\b/.test(p[0])
            ? "JP"
            : / KR\b/.test(p[0])
              ? "KO"
              : / (CN|TW)\b/.test(p[0])
                ? "ZH"
                : "ES"),
        ex = exs(p[3], lg),
        pv = price(p[2]);
      return {
        lg,
        n: p[0],
        k: num(p[1]),
        pvp: pv.eur,
        ex,
        xt: S.noex && S.noex[p[0]] ? 0 : ex.reduce((a, e) => a + e.v, 0),
        off: !!(S.noex && S.noex[p[0]]),
        ph: (p[7] || "").trim(),
        fe:
          S.dates && Object.prototype.hasOwnProperty.call(S.dates, p[0])
            ? S.dates[p[0]]
            : (p[6] || "").trim() || dateFor(p[0]),
        or:
          (pv.org ? pv.org + " \u2248 " + f(pv.eur) + " \u20ac" : "") +
          (p[4] && p[4].trim() ? (pv.org ? " \u00b7 " : "") + p[4].trim() : ""),
      };
    })
    .filter((x) => x.n && x.k !== null && x.k >= 0);
function meas(x, p) {
  if (x.k > 0) {
    const pp = (p - x.xt) / x.k;
    return { v: verdict(pp), t: f(pp) + " €/sobre" };
  }
  if (x.pvp) {
    const d = (p / x.pvp - 1) * 100;
    return {
      v: d <= 10 ? "ok" : d <= 30 ? "wa" : "ko",
      t: (d >= 0 ? "+" : "") + Math.round(d) + " % vs PVP",
    };
  }
  return { v: "", t: "" };
}
function paint(x, c) {
  const i = c.querySelector(".pp"),
    r = c.querySelector(".res"),
    b = c.querySelector(".brk");
  const p = num(i.value),
    use = p !== null ? p : x.pvp;
  c.classList.remove("ok", "wa", "ko");
  if (p === null) {
    r.className = "res";
    r.textContent = "—";
  } else {
    const m = meas(x, p);
    r.className = "res " + m.v;
    r.textContent = m.t + (m.v ? " · " + LBL[m.v] : "");
    if (m.v) c.classList.add(m.v);
  }
  if (use === null) {
    b.className = "brk";
    b.textContent = "";
  } else if (x.k === 0) {
    b.className = "brk" + (p !== null ? " " + meas(x, p).v : "");
    b.textContent = `${p !== null ? "Tu precio" : "PVP"}: ${f(use)} €`;
  } else {
    const pp = (use - x.xt) / x.k;
    b.className = "brk " + verdict(pp);
    b.textContent = `${p !== null ? "Tu precio" : "PVP"}: ${x.k} sobres × ${f(pp)} € + ${f(x.xt)} € extras = ${f(use)} €`;
  }
}
function finds(x, c) {
  const L = S.finds
      .filter((z) => z.n === x.n)
      .sort((a, b) => (a.a === false) - (b.a === false) || a.p - b.p),
    d = c.querySelector(".fd"),
    u = d.querySelector("ul");
  d.querySelector("summary").textContent = `Hallazgos (${L.length})`;
  u.innerHTML = "";
  const all = FMORE.has(x.n),
    shown = all ? L : L.slice(0, F_N);
  shown.forEach((z) => {
    const li = document.createElement("li"),
      m = meas(x, z.p),
      v = m.v;
    let nm;
    if (z.u) {
      nm = document.createElement("a");
      nm.href = z.u;
      nm.target = "_blank";
      nm.rel = "noopener noreferrer";
    } else nm = document.createElement("span");
    nm.textContent = z.s + (z.l ? " (" + z.l + ")" : "");
    const sp = document.createElement("span");
    sp.className = "p " + v;
    sp.textContent = `${f(z.p)} € · ${m.t}`;
    const dl = document.createElement("button");
    dl.className = "x";
    dl.textContent = "\uD83D\uDDD1\uFE0F";
    dl.title = "Eliminar hallazgo";
    dl.setAttribute("aria-label", "Eliminar hallazgo");
    dl.onclick = async () => {
      if (!(await ask("Eliminar hallazgo", `«${z.s}» · ${f(z.p)} €`))) return;
      const ix = S.finds.indexOf(z);
      if (ix >= 0) S.finds.splice(ix, 1);
      save();
      render();
    };
    const av = document.createElement("button");
    av.className = "x av";
    av.textContent = z.a === false ? "\uD83D\uDEAB" : "\u2705";
    av.title =
      z.a === false
        ? "No disponible: pulsa para marcar disponible"
        : "Disponible: pulsa para marcar no disponible";
    av.onclick = () => {
      z.a = z.a === false;
      save();
      render();
    };
    if (z.a === false) li.style.opacity = ".55";
    const ed = document.createElement("button");
    ed.className = "x";
    ed.textContent = "\u270F\uFE0F";
    ed.title = "Editar";
    ed.onclick = () => {
      li.textContent = "";
      li.classList.remove("fh");
      li.style.flexWrap = "wrap";
      li.style.flexDirection = "row";
      li.style.opacity = "1";
      const f1 = document.createElement("input"),
        f2 = document.createElement("input"),
        f3 = document.createElement("input"),
        f4 = document.createElement("select");
      ["ES", "EN", "JP", "KO", "ZH"].forEach((l) => {
        const o = document.createElement("option");
        o.textContent = l;
        f4.appendChild(o);
      });
      f4.value = z.l || "ES";
      f1.value = z.s;
      f1.placeholder = "Tienda";
      f2.value = String(z.p).replace(".", ",");
      f2.inputMode = "decimal";
      f2.placeholder = "Precio";
      f3.value = z.u || "";
      f3.placeholder = "Enlace (opcional)";
      const ok = document.createElement("button"),
        no = document.createElement("button");
      ok.textContent = "Guardar";
      no.textContent = "Cancelar";
      ok.onclick = () => {
        const np = num(f2.value);
        if (np === null || !f1.value.trim()) return;
        if (np !== z.p)
          z.h = (z.h || []).concat({ p: z.p, t: z.t || 0 }).slice(-10);
        z.s = f1.value.trim();
        z.p = np;
        let uu = "";
        try {
          const U = new URL(f3.value.trim());
          if (/^https?:$/.test(U.protocol)) uu = U.href;
        } catch (e) {}
        z.u = uu;
        z.l = f4.value;
        z.t = Date.now();
        save();
        render();
      };
      no.onclick = () => finds(x, c);
      li.append(f1, f4, f2, f3, ok, no);
    };
    const tr = document.createElement("span");
    if (z.h && z.h.length) {
      const pr = z.h[z.h.length - 1].p;
      tr.className = "p " + (z.p < pr ? "ok" : "ko");
      tr.textContent =
        (z.p < pr ? "\u25BC" : "\u25B2") + " antes " + f(pr) + " \u20AC";
    }
    if (z.t)
      sp.title = "Actualizado " + new Date(z.t).toLocaleDateString("es-ES");
    const ic = document.createElement("div");
    ic.className = "fic";
    ic.append(av, ed, dl);
    const fp = document.createElement("div");
    fp.className = "fpr";
    fp.append(sp);
    if (tr.textContent) fp.append(tr);
    li.append(ic, nm, fp);
    li.classList.add("fh");
    const fo = document.createElement("textarea");
    fo.className = "fo";
    fo.rows = 2;
    fo.placeholder = "Observaciones…";
    fo.setAttribute("aria-label", "Observaciones del hallazgo");
    fo.value = z.o || "";
    fo.addEventListener("input", () => {
      if (fo.value.trim()) z.o = fo.value;
      else delete z.o;
      save();
    });
    li.append(fo);
    u.appendChild(li);
  });
  if (L.length > F_N) {
    const li = document.createElement("li"),
      b = document.createElement("button");
    b.type = "button";
    b.className = "clr";
    b.textContent = all ? "▲ Ver menos" : "▼ Ver todos (" + L.length + ")";
    b.onclick = () => {
      all ? FMORE.delete(x.n) : FMORE.add(x.n);
      cardsOf(x.n).forEach((cc) => finds(x, cc));
    };
    li.appendChild(b);
    u.appendChild(li);
  }
}
const KS_TAGS = [
  ["Moneda", /moneda|coin/i],
  ["Tapete", /tapete|playmat|alfombrilla/i],
  ["Fundas", /funda|sleeve/i],
  ["Dados / contadores", /dado|contador|marcador|damage/i],
  ["Promo", /promo/i],
  ["Carta jumbo", /jumbo|gigante/i],
  ["Figura", /figura/i],
  ["Póster", /p[oó]ster/i],
  ["Pegatinas", /pegatina|sticker/i],
  ["Álbum", /[aá]lbum|carpeta|binder/i],
  ["Lata / caja / expositor", /lata|expositor|deck box|estuche|\bcaja\b/i],
  ["Energías", /energ[ií]a/i],
  ["Mazo", /mazo|deck/i],
];
const tagsOf = (x) => {
  const t = x.ex.map((e) => e.d).join(" | ") + " | " + x.n,
    o = new Set();
  KS_TAGS.forEach(([n, r]) => {
    if (r.test(t)) o.add(n);
  });
  return o;
};
let WM = "";
const ST = new Map();
function useExp(d) {
  if (!ST.has(d.id)) ST.set(d.id, loadState(d));
  cur = d;
  S = ST.get(d.id);
  EXP_Q = d.q || d.name;
}
const use = (x) => {
  if (x._d) useExp(x._d);
  return x;
};
function modeItems() {
  const out = [];
  EXPS.forEach((d) => {
    useExp(d);
    parse().forEach((x) => {
      if (S[WM === "fav" ? "fav" : "wish"][x.n]) {
        x._d = d;
        out.push(x);
      }
    });
  });
  return out;
}
function enterMode(m) {
  if (!cur) useExp(EXPS[0]);
  WM = m;
  document.body.classList.add("wm");
  ST.clear();
  FL.so = "pbest";
  FL.k.clear();
  FL.t.clear();
  FL.f.clear();
  FL.l.clear();
  $("q").value = "";
  buildGames();
  render();
}
function exitWish() {
  WM = "";
  document.body.classList.remove("wm");
}
const FL = {
  so: "pbest",
  k: new Set(),
  t: new Set(),
  f: new Set(),
  l: new Set(),
};
function effBest(x) {
  use(x);
  if (!(x.k > 0)) return null;
  const L = S.finds.filter((z) => z.n === x.n),
    av = L.filter((z) => z.a !== false),
    a = (av.length ? av : L).map((z) => z.p),
    p = a.length ? Math.min(...a) : x.pvp;
  if (p === null || p === undefined) return null;
  return (p - x.xt) / x.k;
}
const effPvp = (x) =>
  x.k > 0 && x.pvp !== null && x.pvp !== undefined
    ? (x.pvp - x.xt) / x.k
    : null;
const dv = (x) => (/^\d{4}-\d{2}-\d{2}$/.test(x.fe) ? Date.parse(x.fe) : null);
const U = (v) => v === null || v === undefined || isNaN(v);
const by = (f, d) => (a, b) => {
  const x = f(a),
    y = f(b);
  if (U(x) && U(y)) return 0;
  if (U(x)) return 1;
  if (U(y)) return -1;
  return d * (x - y);
};
const SORTS = {
  best: by(effBest, 1),
  pbest: by(effPvp, 1),
  worst: by(effBest, -1),
  kasc: by((x) => x.k, 1),
  kdesc: by((x) => x.k, -1),
  pasc: by((x) => x.pvp, 1),
  pdesc: by((x) => x.pvp, -1),
  name: (a, b) => a.n.localeCompare(b.n, "es"),
  dasc: by(dv, 1),
  ddesc: by(dv, -1),
};
function applyFilters(P, q) {
  let A = P.filter((x) => x.n.toLowerCase().includes(q));
  if (FL.k.size) A = A.filter((x) => FL.k.has(String(x.k > 0 ? x.k : 0)));
  if (FL.l.size) A = A.filter((x) => FL.l.has(x.lg));
  if (FL.t.size)
    A = A.filter((x) => {
      const t = tagsOf(x);
      return [...FL.t].every((n) => t.has(n));
    });
  if (FL.f.has("wish")) A = A.filter((x) => use(x) && S.wish[x.n]);
  if (FL.f.has("fav")) A = A.filter((x) => use(x) && S.fav[x.n]);
  if (FL.f.has("hall"))
    A = A.filter((x) => use(x) && S.finds.some((z) => z.n === x.n));
  if (FL.f.has("disp"))
    A = A.filter(
      (x) => use(x) && S.finds.some((z) => z.n === x.n && z.a !== false),
    );
  if (FL.f.has("sealed")) A = A.filter((x) => use(x) && S.sealed[x.n]);
  if (FL.f.has("ok"))
    A = A.filter((x) => {
      use(x);
      const e = effBest(x);
      return e !== null && e <= (S.ok + S.mx) / 2;
    });
  if (SORTS[FL.so]) A = A.slice().sort(SORTS[FL.so]);
  return A;
}
function buildFilters(P) {
  const fc = $("fc");
  fc.innerHTML = "";
  const grp = (title, items, set) => {
    if (!items.length) return;
    const g = document.createElement("div");
    g.className = "fg";
    const t = document.createElement("span");
    t.textContent = title;
    g.appendChild(t);
    items.forEach((it) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (set.has(it.v) ? " on" : "");
      b.textContent = it.l;
      b.onclick = () => {
        set.has(it.v) ? set.delete(it.v) : set.add(it.v);
        render();
      };
      g.appendChild(b);
    });
    fc.appendChild(g);
  };
  const ks = [...new Set(P.map((x) => (x.k > 0 ? x.k : 0)))].sort(
    (a, b) => a - b,
  );
  grp(
    "Sobres",
    ks.map((k) => ({
      v: String(k),
      l: k === 0 ? "Sin sobres" : k + (k === 1 ? " sobre" : " sobres"),
    })),
    FL.k,
  );
  const LG = {
    ES: "Español",
    EN: "Inglés",
    JP: "Japonés",
    KO: "Coreano",
    ZH: "Chino",
  };
  grp(
    "Idioma",
    Object.keys(LG)
      .filter((k) => P.some((x) => x.lg === k))
      .map((k) => ({ v: k, l: LG[k] })),
    FL.l,
  );
  grp(
    "Extras",
    KS_TAGS.map((t) => t[0])
      .filter((n) => P.some((x) => tagsOf(x).has(n)))
      .map((n) => ({ v: n, l: n })),
    FL.t,
  );
  grp(
    "Estado",
    [
      { v: "wish", l: "\uD83D\uDC96 Deseados" },
      { v: "fav", l: "\u2B50 Favoritos" },
      { v: "hall", l: "Con hallazgos" },
      { v: "disp", l: "Disponible" },
      { v: "sealed", l: "\uD83D\uDCE6 Lo tengo" },
      { v: "ok", l: "Dentro del ideal" },
    ],
    FL.f,
  );
  const n = FL.k.size + FL.t.size + FL.f.size + FL.l.size;
  $("fsum").textContent = "Filtros" + (n ? " (" + n + ")" : "");
  if (n) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "clr";
    b.textContent = "Quitar filtros";
    b.onclick = () => {
      FL.k.clear();
      FL.t.clear();
      FL.f.clear();
      FL.l.clear();
      render();
    };
    fc.appendChild(b);
  }
}
function render() {
  if (!cur && !WM) return;
  hdr();
  fillShops();
  const keep = {},
    opened = {},
    sy = window.scrollY;
  document.querySelectorAll("#list .card").forEach((c) => {
    const i = c.querySelector(".pp");
    if (i) keep[c.dataset.n] = i.value;
    opened[c.parentNode.id + "|" + c.dataset.n] = [
      ".fd",
      ".sh",
      ".mo",
      ".ob",
      ".ac",
    ].filter((s) => {
      const d = c.querySelector(s);
      return d && d.open;
    });
  });
  const q = $("q").value.toLowerCase(),
    L = $("list"),
    P = WM ? modeItems() : parse(),
    sel = $("fs").value;
  L.innerHTML = "";
  $("pl").innerHTML = "";
  P.forEach((x) => {
    const o = document.createElement("option");
    o.value = x.n;
    $("pl").appendChild(o);
  });
  FSALL = P.map((x) => x.n);
  rebuildFs(sel);
  buildFilters(P);
  $("so").value = FL.so;
  {
    const allOff = P.length > 0 && P.every((x) => S.noex[x.n]),
      b = $("allx");
    b.textContent = allOff
      ? "\uD83D\uDEAB Extras no contados (todos)"
      : "\u2705 Extras contados (todos)";
    b.className = "nx" + (allOff ? " on" : "");
  }
  const A = applyFilters(P, q);
  $("cnt").textContent =
    A.length === P.length
      ? P.length + " productos"
      : A.length + " de " + P.length;
  if (!A.length) {
    const e = document.createElement("p");
    e.className = "hint empty";
    e.textContent =
      WM && !P.length
        ? WM === "fav"
          ? "Todavía no tienes favoritos: marca la ⭐ en cualquier producto."
          : "Todavía no tienes productos deseados: marca el ❤️ en cualquier producto."
        : P.length
          ? "Ning\u00fan producto coincide con la b\u00fasqueda o los filtros."
          : "Esta expansi\u00f3n no tiene productos todav\u00eda. A\u00f1\u00e1delos en el cat\u00e1logo o con \u00abA\u00f1adir hallazgo\u00bb.";
    L.appendChild(e);
  }
  const build = (x, L) => {
    if (x._d) useExp(x._d);
    const c = document.createElement("div");
    if (x._d)
      ["click", "input", "change"].forEach((ev) =>
        c.addEventListener(ev, () => useExp(x._d), true),
      );
    c.className = "card";
    c.dataset.n = x.n;
    c.innerHTML = `
<div class="top">
  <button class="th" type="button" aria-label="Foto"></button>
  <button class="heart" type="button">🤍</button>
  <div class="side">
    <div class="ic">
      <button class="x av star" type="button">⭐</button>
      <button class="x av own" type="button"></button>
      <button class="x rm" type="button" title="Eliminar producto" aria-label="Eliminar producto">🗑️</button>
    </div>
    <button class="nx" type="button"></button>
  </div>
  <div class="tt"><b class="nm"></b><span class="mt"></span></div>
</div>
<div class="lim"></div>
<div class="row"><input class="pp" inputmode="decimal" placeholder="Precio € en tienda" aria-label="Precio en tienda"><div class="res">—</div></div>
<div class="brk"></div>
<details class="fd"><summary></summary><ul></ul></details>
<details class="sh"><summary>Buscar en tiendas</summary><div class="shl"></div></details>
<details class="mo"><summary>Detalles</summary><button type="button" class="edp">✏️ Editar producto</button><div class="desc"></div><div class="desc org"></div><div class="phr"><input class="pu" type="url" placeholder="URL de la foto (https://…)" aria-label="URL de la foto"><button type="button" class="pg">Guardar</button><button type="button" class="pf">Subir</button></div></details>
<details class="ob"><summary>Observaciones</summary><textarea class="obt" rows="3" placeholder="Notas sobre este producto…" aria-label="Observaciones"></textarea></details>
<details class="ac"><summary>Acciones</summary><div class="acb"><button type="button" class="cpy">📋 Copiar a…</button><button type="button" class="mov">➡️ Mover a…</button></div></details>`;
    c.querySelector(".nm").textContent = x.n;
    (opened[L.id + "|" + x.n] || []).forEach((s) => {
      const d = c.querySelector(s);
      if (d) d.open = true;
    });
    const mt = c.querySelector(".mt"),
      mtx = () => {
        const fe =
          S.dates && Object.prototype.hasOwnProperty.call(S.dates, x.n)
            ? S.dates[x.n]
            : x.fe;
        mt.textContent = [
          x._d ? x._d.name : "",
          x.k > 0 ? x.k + (x.k === 1 ? " sobre" : " sobres") : "sin sobres",
          x.lg,
          /^\d{4}-\d{2}-\d{2}$/.test(fe) ? fmtDate(fe) : "",
        ]
          .filter(Boolean)
          .join(" \u00b7 ");
      };
    mtx();
    c.querySelector(".lim").innerHTML =
      x.k > 0
        ? `Verde \u2264 <b>${f(((S.ok + S.mx) / 2) * x.k + x.xt)} \u20ac</b> \u00b7 M\u00e1x <b>${f(S.mx * x.k + x.xt)} \u20ac</b>`
        : x.pvp
          ? `Referencia: PVP <b>${f(x.pvp)} \u20ac</b>`
          : "Solo referencia, sin PVP en \u20ac";
    const ow = c.querySelector(".own"),
      owp = () => {
        const on = !!S.sealed[x.n];
        ow.textContent = "\uD83D\uDCE6";
        ow.classList.toggle("on", on);
        ow.title = on
          ? "Lo tengo sin abrir (solo informativo): pulsa para quitar la marca"
          : "Sin marcar (solo informativo): pulsa si tienes este producto sin abrir";
        ow.setAttribute("aria-pressed", on ? "true" : "false");
      };
    owp();
    ow.onclick = () => {
      if (S.sealed[x.n]) delete S.sealed[x.n];
      else S.sealed[x.n] = true;
      save();
      render();
    };
    const st = c.querySelector(".star");
    {
      const on = !!S.fav[x.n];
      st.classList.toggle("on", on);
      st.title = on ? "Favorito: pulsa para quitarlo" : "Marcar como favorito";
      st.setAttribute("aria-pressed", on ? "true" : "false");
    }
    st.onclick = () => {
      if (S.fav[x.n]) delete S.fav[x.n];
      else S.fav[x.n] = true;
      save();
      render();
    };
    const hr = c.querySelector(".heart");
    {
      const on = !!S.wish[x.n];
      hr.textContent = on ? "❤️" : "🤍";
      hr.classList.toggle("on", on);
      hr.title = on ? "Deseado: pulsa para quitarlo" : "Añadir a la wishlist";
      hr.setAttribute("aria-pressed", on ? "true" : "false");
    }
    hr.onclick = () => {
      if (S.wish[x.n]) delete S.wish[x.n];
      else S.wish[x.n] = true;
      save();
      render();
    };
    c.querySelector(".edp").onclick = () => openEdit(x);
    c.querySelector(".cpy").onclick = () => openMove(x, false);
    c.querySelector(".mov").onclick = () => openMove(x, true);
    const ot = c.querySelector(".obt");
    ot.value = S.obs[x.n] || "";
    c.querySelector(".ob").classList.toggle("has", !!ot.value.trim());
    ot.addEventListener("input", () => {
      const v = ot.value;
      if (v.trim()) S.obs[x.n] = v;
      else delete S.obs[x.n];
      save();
      cardsOf(x.n).forEach((o) => {
        if (o !== c) o.querySelector(".obt").value = v;
        o.querySelector(".ob").classList.toggle("has", !!v.trim());
      });
    });
    const th = c.querySelector(".th"),
      pu = c.querySelector(".pu"),
      slug = (t) =>
        norm(t)
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      setTh = () => {
        const custom = (S.imgUrl && S.imgUrl[x.n]) || x.ph || S.imgs[x.n],
          chain = [custom]
            .concat(
              ["webp", "png", "jpg", "jpeg", "avif", "gif", "svg"].map(
                (e) => "assets/productos/" + cur.id + "/" + slug(x.n) + "." + e,
              ),
              ["assets/default-product.png"],
            )
            .filter(Boolean);
        th.textContent = "";
        const im = document.createElement("img");
        im.alt = "";
        im.loading = "lazy";
        im.referrerPolicy = "no-referrer";
        let i = 0;
        im.onerror = () => {
          i++;
          if (i < chain.length) im.src = chain[i];
          else {
            im.remove();
            th.textContent = "\uD83D\uDCF7";
          }
        };
        im.src = chain[0];
        th.appendChild(im);
      };
    setTh();
    pu.value = (S.imgUrl && S.imgUrl[x.n]) || x.ph || "";
    th.onclick = () => {
      const im = th.querySelector("img");
      if (im && im.complete && im.naturalWidth) {
        openImg(im.currentSrc || im.src);
        return;
      }
      c.querySelector(".mo").open = true;
      pu.focus();
    };
    c.querySelector(".pg").onclick = () => {
      const v = pu.value.trim();
      if (!v) {
        delete S.imgUrl[x.n];
      } else {
        try {
          const U2 = new URL(v);
          if (!/^https?:$/.test(U2.protocol)) throw 0;
          S.imgUrl[x.n] = U2.href;
        } catch (e) {
          pu.setCustomValidity("Enlace no v\u00e1lido");
          pu.reportValidity();
          setTimeout(() => pu.setCustomValidity(""), 1500);
          return;
        }
      }
      save();
      setTh();
    };
    c.querySelector(".pf").onclick = () => {
      phT = x.n;
      $("ph").click();
    };
    chipsFor(c);
    const nx = c.querySelector(".nx");
    nx.textContent = x.off
      ? "\uD83D\uDEAB Extras no contados"
      : "\u2705 Extras contados";
    nx.className = "nx" + (x.off ? " on" : "");
    nx.onclick = () => {
      S.noex[x.n] = !S.noex[x.n];
      save();
      render();
    };
    const rm = c.querySelector(".rm");
    rm.onclick = async () => {
      if (
        !(await ask(
          "Eliminar producto",
          `«${x.n}» se borrará junto con sus hallazgos, su foto y sus notas.`,
        ))
      )
        return;
      const L2 = S.csv.split("\n"),
        ix = L2.findIndex(
          (l) => l.trim() && l.trim()[0] !== "#" && l.split(";")[0] === x.n,
        );
      if (ix >= 0) L2.splice(ix, 1);
      S.csv = L2.join("\n");
      S.finds = S.finds.filter((z) => z.n !== x.n);
      delete S.imgs[x.n];
      delete S.imgUrl[x.n];
      delete S.noex[x.n];
      delete S.sealed[x.n];
      delete S.fav[x.n];
      delete S.wish[x.n];
      delete S.obs[x.n];
      save();
      $("csv").value = S.csv;
      render();
    };
    c.querySelector(".desc").textContent = x.ex.length
      ? "Trae (" +
        x.lg +
        "): " +
        x.ex
          .map((e) => (x.k > 0 ? `${e.d} \u2248 ${f(e.v)} \u20ac` : e.d))
          .join(" \u00b7 ")
      : "Solo sobres";
    c.querySelector(".org").textContent = x.or ? "Origen: " + x.or : "";
    const i = c.querySelector(".pp");
    i.addEventListener("input", () => {
      paint(x, c);
      cardsOf(x.n).forEach((o) => {
        if (o === c) return;
        o.querySelector(".pp").value = i.value;
        paint(x, o);
      });
    });
    if (keep[x.n]) i.value = keep[x.n];
    L.appendChild(c);
    paint(x, c);
    finds(x, c);
  };
  A.forEach((x) => build(x, L));
  window.scrollTo(0, sy);
}
let phT = null;
$("ph").onchange = (e) => {
  const fl = e.target.files[0];
  e.target.value = "";
  if (!fl || !phT) return;
  const n = phT,
    fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, 160 / Math.max(img.width, img.height)),
        cv = document.createElement("canvas");
      cv.width = Math.round(img.width * r);
      cv.height = Math.round(img.height * r);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      S.imgs[n] = cv.toDataURL("image/jpeg", 0.72);
      save();
      render();
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(fl);
};
const baseShop = (s) =>
  String(s || "")
    .replace(/\s*\(.*\)\s*$/, "")
    .trim();
function shops() {
  const out = STORES.slice(),
    low = new Set(out.map((x) => x.toLowerCase()));
  S.finds.forEach((z) => {
    const b = baseShop(z.s);
    if (b && !low.has(b.toLowerCase())) {
      low.add(b.toLowerCase());
      out.push(b);
    }
  });
  return out;
}
function fillShops() {
  $("shops").innerHTML = "";
  shops().forEach((st) => {
    const o = document.createElement("option");
    o.value = st;
    $("shops").appendChild(o);
  });
}
function chipsFor(c) {
  const shl = c.querySelector(".shl"),
    all = shops(),
    open = SHMORE.has(c.dataset.n);
  shl.innerHTML = "";
  (open ? all : all.slice(0, SH_N)).forEach((st) => {
    const a = document.createElement("a");
    a.textContent = st;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.href =
      "https://www.google.com/search?q=" +
      encodeURIComponent(EXP_Q + " " + c.dataset.n + " " + st);
    shl.appendChild(a);
  });
  if (all.length > SH_N) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = open ? "▲ Menos" : "▼ " + (all.length - SH_N) + " más";
    b.title = open ? "Ver menos tiendas" : "Ver todas las tiendas";
    b.onclick = () => {
      open ? SHMORE.delete(c.dataset.n) : SHMORE.add(c.dataset.n);
      cardsOf(c.dataset.n).forEach(chipsFor);
    };
    shl.appendChild(b);
  }
}
function free() {
  const k = num($("fk").value),
    p = num($("fp").value),
    r = $("fr"),
    c = $("free");
  c.classList.remove("ok", "wa", "ko");
  if (!k || p === null) {
    r.className = "res";
    r.textContent = "—";
    return;
  }
  const v = verdict(p / k);
  r.className = "res " + v;
  r.textContent = f(p / k) + " €/sobre · " + LBL[v];
  c.classList.add(v);
}
let FSALL = [],
  FKW = false,
  FKF = false,
  FKS = false;
function rebuildFs(want) {
  const fs = $("fs"),
    q = $("fsq").value.trim().toLowerCase(),
    keep = want === undefined ? fs.value : want;
  fs.innerHTML = "";
  FSALL.filter((n) => !q || n.toLowerCase().includes(q)).forEach((n) => {
    const o = document.createElement("option");
    o.textContent = n;
    fs.appendChild(o);
  });
  const nw = document.createElement("option");
  nw.value = "__new__";
  nw.textContent = "+ Crear producto nuevo...";
  fs.appendChild(nw);
  if (keep && [...fs.options].some((o) => o.value === keep)) fs.value = keep;
  $("np").hidden = fs.value !== "__new__";
  $("fimbox").hidden = fs.value !== "__new__";
}
function drawMarks() {
  [
    ["fkw", FKW],
    ["fkf", FKF],
    ["fks", FKS],
  ].forEach(([id, on]) => {
    $(id).classList.toggle("on", on);
    $(id).setAttribute("aria-pressed", on ? "true" : "false");
  });
}
function syncMarks() {
  const v = $("fs").value,
    ex = v !== "__new__";
  FKW = ex && !!S.wish[v];
  FKF = ex && !!S.fav[v];
  FKS = ex && !!S.sealed[v];
  drawMarks();
}
function fsApply(onlyEmpty) {
  const v = $("fs").value,
    isNew = v === "__new__";
  $("np").hidden = !isNew;
  $("fimbox").hidden = !isNew;
  syncMarks();
  if (!isNew && v) {
    const x = parse().find((y) => y.n === v);
    if (x && x.pvp && (!onlyEmpty || !$("fpr").value))
      $("fpr").value = String(Math.round(x.pvp * 100) / 100).replace(".", ",");
    if (!onlyEmpty) $("fl").value = "ES";
  }
}
$("fs").onchange = () => {
  fsApply();
  const v = $("fs").value;
  if (v !== "__new__") {
    $("q").value = v;
    render();
  }
};
$("fsq").oninput = () => {
  rebuildFs();
  fsApply();
};
$("fsn").onclick = () => {
  $("fs").value = "__new__";
  fsApply();
  $("nn").focus();
};
$("fkw").onclick = () => {
  FKW = !FKW;
  drawMarks();
};
$("fkf").onclick = () => {
  FKF = !FKF;
  drawMarks();
};
$("fks").onclick = () => {
  FKS = !FKS;
  drawMarks();
};
$("addbox").addEventListener("toggle", () => {
  if ($("addbox").open) fsApply(true);
});
let fa = true;
$("fa").onclick = () => {
  fa = !fa;
  $("fa").innerHTML = fa ? "&#9989; Disponible" : "&#128683; No disponible";
};
$("fb").onclick = () => {
  let n = $("fs").value;
  const s = $("ft").value.trim(),
    p = num($("fpr").value);
  if (!n || !s || p === null) return;
  const wasNew = n === "__new__";
  if (n === "__new__") {
    const nm = $("nn")
        .value.trim()
        .replace(/[;|\n]/g, " "),
      kk = num($("nk").value);
    if (!nm || kk === null || kk < 0) return;
    if (!parse().some((x) => x.n.trim() === nm)) {
      S.csv =
        S.csv.replace(/\s*$/, "") +
        "\n" +
        nm +
        ";" +
        kk +
        ";;" +
        $("ne").value.trim().replace(/;/g, " ");
      $("csv").value = S.csv;
    }
    if ($("nd").value) {
      S.dates[nm] = $("nd").value;
    }
    n = nm;
  }
  let u = "";
  try {
    const U = new URL($("fu").value.trim());
    if (/^https?:$/.test(U.protocol)) u = U.href;
  } catch (e) {}
  const fimu = okUrl($("fim").value);
  if (wasNew && FIMD) S.imgs[n] = FIMD;
  else if (wasNew && fimu) S.imgUrl[n] = fimu;
  FIMD = "";
  $("fim").value = "";
  $("fimh").textContent = "";
  const fob = $("fobs").value.trim();
  [
    ["wish", FKW],
    ["fav", FKF],
    ["sealed", FKS],
  ].forEach(([k, on]) => {
    if (on) S[k][n] = true;
  });
  S.finds.push(
    Object.assign(
      { n, s, p, u, a: fa, l: $("fl").value, t: Date.now() },
      fob ? { o: fob } : {},
    ),
  );
  save();
  if (wasNew) $("fsq").value = "";
  $("q").value = n;
  render();
  $("fs").value = n;
  $("np").hidden = true;
  $("fimbox").hidden = true;
  syncMarks();
};
$("fclr").onclick = () => {
  ["nn", "nk", "ne", "nd", "ft", "fpr", "fu", "fim", "fobs"].forEach(
    (id) => ($(id).value = ""),
  );
  FIMD = "";
  $("fimh").textContent = "";
  $("fl").selectedIndex = 0;
  fa = true;
  $("fa").innerHTML = "&#9989; Disponible";
  syncMarks();
};
function buildFx() {
  $("fx").innerHTML = "";
  Object.keys(S.fx).forEach((k) => {
    const l = document.createElement("label"),
      i = document.createElement("input");
    l.textContent = k;
    i.inputMode = "decimal";
    i.value = String(S.fx[k]).replace(".", ",");
    i.oninput = () => {
      const n = num(i.value);
      if (n) {
        S.fx[k] = n;
        save();
        render();
      }
    };
    l.appendChild(i);
    $("fx").appendChild(l);
  });
}
$("ok").oninput = () => {
  const n = num($("ok").value);
  if (n) {
    S.ok = n;
    save();
    render();
    free();
  }
};
$("mx").oninput = () => {
  const n = num($("mx").value);
  if (n) {
    S.mx = n;
    save();
    render();
    free();
  }
};
$("q").oninput = render;
$("qr").onclick = () => {
  $("q").value = "";
  render();
  $("q").focus();
};
$("allx").onclick = () => {
  const P = parse(),
    allOff = P.length > 0 && P.every((x) => S.noex[x.n]);
  P.forEach((x) => {
    if (allOff) delete S.noex[x.n];
    else S.noex[x.n] = true;
  });
  save();
  render();
};
$("so").onchange = () => {
  FL.so = $("so").value;
  render();
};
$("fk").oninput = free;
$("fp").oninput = free;
$("apply").onclick = () => {
  S.csv = $("csv").value;
  save();
  render();
};
$("rs").onclick = () => {
  S.csv = DEF;
  $("csv").value = DEF;
  save();
  render();
};
$("cp").onclick = () => {
  try {
    navigator.clipboard.writeText($("csv").value);
  } catch (e) {
    $("csv").select();
  }
};
const packOne = (d, s, wi) => {
  const gd = GAMES.find((g) => g.custom && g.id === gameOf(d));
  const o = {
    v: 3,
    id: d.id,
    game: gameOf(d),
    serie: d.serie || "",
    name: d.name,
    q: d.q || d.name,
    rel: d.rel || [],
    rev: d.rev || 1,
    ok: s.ok,
    mx: s.mx,
    csv: s.csv,
    finds: s.finds,
    fx: s.fx,
    noex: s.noex,
    sealed: s.sealed,
    imgUrl: s.imgUrl,
    dates: s.dates,
    fav: s.fav,
    wish: s.wish,
    obs: s.obs,
    logo: d.custom ? d.logo || "" : undefined,
    gameDef: gd
      ? { id: gd.id, name: gd.name, icon: gd.icon || "", img: gd.img || "" }
      : undefined,
  };
  if (wi) o.imgs = s.imgs;
  return o;
};
const getState = (d) => (d === cur ? S : loadState(d));
const pack = () => JSON.stringify(packOne(cur, S, $("wi").checked));
const packAll = () =>
  JSON.stringify({
    v: 3,
    all: true,
    games: GAMES.filter((g) => g.custom).map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon || "",
      img: g.img || "",
    })),
    exps: EXPS.filter((d) => d === cur || LS.get("s." + d.id)).map((d) =>
      packOne(d, getState(d), $("wi").checked),
    ),
  });
const say = (t) => {
  $("st").textContent = t;
};
function dl(name, text) {
  try {
    const b = new Blob([text], { type: "application/json" }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    return true;
  } catch (e) {
    return false;
  }
}
$("ex").onclick = () => {
  const t = pack();
  $("dt").value = t;
  say(
    dl("boostermath-" + cur.id + ".json", t)
      ? "Exportado."
      : "Copia el texto de arriba.",
  );
};
$("exa").onclick = () => {
  const t = packAll();
  $("dt").value = t;
  say(
    dl("boostermath-todo.json", t)
      ? "Exportado (todas las expansiones con datos)."
      : "Copia el texto de arriba.",
  );
};
$("ec").onclick = () => {
  const t = $("dt").value || pack();
  $("dt").value = t;
  try {
    navigator.clipboard.writeText(t).then(
      () => say("Copiado."),
      () => {
        $("dt").select();
        say("Selecciona y copia el texto.");
      },
    );
  } catch (e) {
    $("dt").select();
    say("Selecciona y copia el texto.");
  }
};
$("fi").onchange = (e) => {
  const fl = e.target.files[0];
  if (!fl) return;
  const fr = new FileReader();
  fr.onload = () => {
    $("dt").value = fr.result;
    say("Archivo cargado: pulsa Importar.");
  };
  fr.readAsText(fl);
};
function ensureGame(g) {
  const id = String((g && g.id) || "");
  if (!/^g-[\w-]+$/.test(id)) return null;
  let x = GAMES.find((y) => y.id === id);
  if (!x) {
    const img = /^(https?:\/\/|data:image\/)/.test((g && g.img) || "")
        ? g.img
        : "",
      raw = id.slice(2).replace(/-/g, " ");
    x = {
      id,
      name: String(
        (g && g.name) || raw.charAt(0).toUpperCase() + raw.slice(1),
      ).slice(0, 60),
      icon: String((g && g.icon) || "📦").slice(0, 8),
      custom: true,
    };
    if (img) x.img = img;
    GAMES.push(x);
    meta.games.push(Object.assign({}, x, { custom: undefined }));
    LS.set("meta", meta);
  }
  return x;
}
function importExp(o) {
  if (!o || typeof o.csv !== "string" || !Array.isArray(o.finds)) return null;
  if (o.gameDef) ensureGame(o.gameDef);
  else if (/^g-[\w-]+$/.test(String(o.game || ""))) ensureGame({ id: o.game });
  let d = null;
  if (o.id && /^[\w.-]+$/.test(String(o.id))) {
    d = EXPS.find((e) => e.id === o.id);
    if (!d) {
      d = {
        id: String(o.id),
        name: String(o.name || o.id),
        q: String(o.q || o.name || o.id),
        rel: Array.isArray(o.rel)
          ? o.rel
              .filter((r) => Array.isArray(r) && r.length >= 2)
              .map((r) => [String(r[0]), String(r[1])])
          : [],
        rev: 1,
        ok: o.ok,
        mx: o.mx,
        csv: o.csv,
        fx: o.fx,
        finds: [],
        custom: true,
        logo: /^(https?:\/\/|data:image\/)/.test(o.logo || "") ? o.logo : "",
        serie: o.serie ? String(o.serie) : "",
        game: GAMES.some((g) => g.id === o.game) ? o.game : meta.game,
      };
      EXPS.push(d);
      meta.custom.push(d);
      LS.set("meta", meta);
    }
  } else d = cur;
  const s = getState(d);
  if (num(o.ok)) s.ok = num(o.ok);
  if (num(o.mx)) s.mx = num(o.mx);
  s.csv = o.csv;
  if (o.noex && typeof o.noex === "object") s.noex = o.noex;
  if (o.sealed && typeof o.sealed === "object")
    Object.assign(s.sealed, o.sealed);
  if (o.imgUrl && typeof o.imgUrl === "object")
    Object.keys(o.imgUrl).forEach((k) => {
      if (/^https?:\/\//.test(String(o.imgUrl[k])))
        s.imgUrl[k] = String(o.imgUrl[k]);
    });
  if (o.dates && typeof o.dates === "object") Object.assign(s.dates, o.dates);
  if (o.fav && typeof o.fav === "object") Object.assign(s.fav, o.fav);
  if (o.wish && typeof o.wish === "object") Object.assign(s.wish, o.wish);
  if (o.obs && typeof o.obs === "object")
    Object.keys(o.obs).forEach((k) => {
      if (typeof o.obs[k] === "string") s.obs[k] = o.obs[k];
    });
  if (o.fx && typeof o.fx === "object") s.fx = Object.assign(s.fx, o.fx);
  const seen = new Set(s.finds.map((z) => [z.n, z.s, z.p, z.u].join("|")));
  let add = 0;
  o.finds.forEach((z) => {
    if (z && z.n && z.s && isFinite(z.p)) {
      const k = [z.n, z.s, z.p, z.u || ""].join("|");
      if (!seen.has(k)) {
        seen.add(k);
        s.finds.push({
          n: String(z.n),
          s: String(z.s),
          p: Number(z.p),
          a: z.a !== false,
          h: Array.isArray(z.h) ? z.h.slice(-10) : undefined,
          l: /^(ES|EN|JP|KO|ZH)$/.test(z.l) ? z.l : undefined,
          t: Number(z.t) || undefined,
          u: /^https?:\/\//.test(z.u || "") ? z.u : "",
          o: typeof z.o === "string" && z.o ? z.o : undefined,
        });
        add++;
      }
    }
  });
  if (o.imgs && typeof o.imgs === "object")
    Object.keys(o.imgs).forEach((k) => {
      if (String(o.imgs[k]).startsWith("data:image/")) s.imgs[k] = o.imgs[k];
    });
  LS.set("s." + d.id, s);
  if (d === cur) S = s;
  return { d, add };
}
$("im").onclick = () => {
  let o;
  try {
    o = JSON.parse($("dt").value);
  } catch (e) {
    say("El texto no es un export válido.");
    return;
  }
  if (o && Array.isArray(o.games)) o.games.forEach(ensureGame);
  const list = o && o.all && Array.isArray(o.exps) ? o.exps : [o];
  let add = 0,
    n = 0,
    last = null;
  list.forEach((x) => {
    const r = importExp(x);
    if (r) {
      add += r.add;
      n++;
      last = r.d;
    }
  });
  if (!last) {
    say("El texto no es un export válido.");
    return;
  }
  openExp(last);
  say(
    "Importado: " +
      n +
      (n === 1 ? " expansión, " : " expansiones, ") +
      add +
      " hallazgos nuevos.",
  );
};
const gameOf = (d) =>
  d.game && GAMES.some((g) => g.id === d.game)
    ? d.game
    : meta.game || (GAMES[0] && GAMES[0].id) || "tcg";
const dlgOpen = (d) => {
  try {
    d.showModal();
  } catch (e) {
    d.setAttribute("open", "");
  }
};
const dlgClose = (d) => {
  try {
    d.close();
  } catch (e) {
    d.removeAttribute("open");
  }
};
function emptyGame(id) {
  cur = null;
  meta.game = id;
  meta.cur = null;
  LS.set("meta", meta);
  FL.so = "pbest";
  FL.k.clear();
  FL.t.clear();
  FL.f.clear();
  FL.l.clear();
  $("q").value = "";
  $("hd").innerHTML = "";
  $("cnt").textContent = "";
  $("pl").innerHTML = "";
  $("fs").innerHTML = "";
  $("list").innerHTML =
    '<p class="hint empty">Este juego todav\u00eda no tiene expansiones. Crea una desde el selector.</p>';
  try {
    history.replaceState(null, "", location.pathname + location.search);
  } catch (e) {}
  buildGames();
  updPicker();
}
function buildGames() {
  const g = $("games");
  g.innerHTML = "";
  [
    ["fav", "⭐ Favoritos"],
    ["wish", "💖 Wishlist"],
  ].forEach(([m, t]) => {
    const w = document.createElement("button");
    w.type = "button";
    w.className = "gp" + (WM === m ? " on" : "");
    w.textContent = t;
    w.onclick = () => enterMode(m);
    g.appendChild(w);
  });
  GAMES.forEach((x) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "gp" + (!WM && x.id === meta.game ? " on" : "");
    const lbl = (x.icon ? x.icon + " " : "") + x.name;
    if (x.img) {
      const im = document.createElement("img");
      im.src = x.img;
      im.alt = x.name;
      b.classList.add("gimg");
      b.setAttribute("aria-label", x.name);
      im.onerror = () => {
        im.remove();
        b.classList.remove("gimg");
        b.textContent = lbl;
      };
      b.appendChild(im);
    } else b.textContent = lbl;
    b.onclick = () => {
      if (x.id === meta.game && !WM) return;
      exitWish();
      const pool = EXPS.filter((e) => gameOf(e) === x.id),
        last = pool.find((e) => e.id === meta.last[x.id]) || pool[0];
      if (last) {
        $("list").innerHTML = "";
        openExp(last);
      } else emptyGame(x.id);
    };
    g.appendChild(b);
  });
  const ga = document.createElement("div");
  ga.className = "gacts";
  const add = document.createElement("button");
  add.type = "button";
  add.className = "gp gadd";
  add.textContent = "+";
  add.title = "Añadir juego";
  add.setAttribute("aria-label", "Añadir juego");
  add.onclick = () => openGameDlg(false);
  ga.appendChild(add);
  const ed = document.createElement("button");
  ed.type = "button";
  ed.className = "gp gadd";
  ed.textContent = "✏️";
  ed.title = "Editar juego";
  ed.setAttribute("aria-label", "Editar juego");
  ed.onclick = () => openGameDlg(true);
  ga.appendChild(ed);
  [
    [
      "−",
      "Eliminar juego (o vaciar Favoritos / Wishlist)",
      removeGame,
      "gp gadd",
    ],
    ["⬇️ Exportar", "Exportar este juego a un archivo", exportGame, "gp"],
    ["⬆️ Importar", "Importar un juego desde un archivo", importGame, "gp"],
  ].forEach(([t, ti, fn, cl]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cl;
    b.textContent = t;
    b.title = ti;
    b.setAttribute("aria-label", ti);
    b.onclick = fn;
    ga.appendChild(b);
  });
  g.appendChild(ga);
}
function updPicker() {
  $("xpn").textContent =
    cur && gameOf(cur) === meta.game ? cur.name : "Sin expansiones: crea una";
  $("xps2").textContent =
    cur && gameOf(cur) === meta.game
      ? [
          cur.serie,
          EXPS.filter((e) => gameOf(e) === meta.game).length + " expansiones",
        ]
          .filter(Boolean)
          .join(" \u00b7 ")
      : "";
}
function fillPicker() {
  const box = $("xpl"),
    q = norm($("xps").value);
  const pool = EXPS.filter(
    (e) =>
      gameOf(e) === meta.game &&
      norm(e.name + " " + (e.serie || "") + " " + e.id).includes(q),
  );
  box.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "xg";
  pool.forEach((e) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "xc" + (e === cur ? " on" : "");
    const im = document.createElement("div");
    im.className = "xi";
    const img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";
    const lc = (e.logo ? [e.logo] : []).concat(
      ["webp", "png", "jpg", "jpeg", "avif", "gif", "svg"].map(
        (x) => "assets/expansiones/" + e.id + "." + x,
      ),
    );
    let li = 0;
    img.onerror = () => {
      li++;
      if (li < lc.length) img.src = lc[li];
      else {
        img.remove();
        im.textContent = "\uD83C\uDCCF";
      }
    };
    img.src = lc[0];
    im.appendChild(img);
    const n = document.createElement("b");
    n.textContent = e.name;
    const m = document.createElement("span");
    m.textContent = [
      e.rel && e.rel[0] ? fmtDate(e.rel[0][1]) : "",
      e.custom ? "propia" : "",
    ]
      .filter(Boolean)
      .join(" \u00b7 ");
    b.append(im, n, m);
    b.onclick = () => {
      dlgClose($("xpd"));
      openExp(e);
    };
    grid.appendChild(b);
  });
  box.appendChild(grid);
  if (!pool.length) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "Sin resultados.";
    box.appendChild(p);
  }
}
$("xpb").onclick = () => {
  $("xps").value = "";
  fillPicker();
  dlgOpen($("xpd"));
  $("xps").focus();
};
$("xps").oninput = fillPicker;
$("xpx").onclick = () => dlgClose($("xpd"));
$("xpd").onclick = (e) => {
  if (e.target === $("xpd")) dlgClose($("xpd"));
};
function openExp(d) {
  cur = d;
  S = loadState(d);
  EXP = { name: d.name, dates: d.rel || [] };
  EXP_Q = d.q || d.name;
  DEF = d.csv || CUSTOM_CSV;
  meta.cur = d.id;
  meta.game = gameOf(d);
  meta.last[meta.game] = d.id;
  meta.recent = [d.id]
    .concat(meta.recent.filter((x) => x !== d.id))
    .slice(0, 5);
  LS.set("meta", meta);
  FL.so = "pbest";
  FL.k.clear();
  FL.t.clear();
  FL.f.clear();
  FL.l.clear();
  $("ok").value = String(S.ok).replace(".", ",");
  $("mx").value = String(S.mx).replace(".", ",");
  $("csv").value = S.csv;
  $("q").value = "";
  $("dt").value = "";
  say("");
  $("fxn").textContent = d.fxNote || "Editables.";
  buildGames();
  updPicker();
  buildFx();
  render();
  free();
  try {
    history.replaceState(null, "", "#" + d.id);
  } catch (e) {}
}
let NXI = "";
$("nxb").onclick = () => $("nxf").click();
$("nxf").onchange = (e) => {
  const fl = e.target.files[0];
  e.target.value = "";
  if (!fl) return;
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, 240 / Math.max(img.width, img.height)),
        cv = document.createElement("canvas");
      cv.width = Math.round(img.width * r);
      cv.height = Math.round(img.height * r);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      NXI = cv.toDataURL("image/webp", 0.85);
      $("nxi").value = "";
      $("nxh").textContent = "Imagen adjuntada ✓";
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(fl);
};
$("nxc").onclick = () => {
  const nm = $("nxn")
    .value.trim()
    .replace(/[;|\n]/g, " ");
  if (!nm) return;
  let id =
      nm
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "expansion",
    b = id,
    i = 2;
  while (EXPS.some((e) => e.id === id)) id = b + "-" + i++;
  const nxu = $("nxi").value.trim(),
    logo = NXI || (/^https?:\/\//.test(nxu) ? nxu : "");
  const d = {
    id,
    name: nm,
    q: nm,
    rel: [],
    rev: 1,
    ok: 6,
    mx: 7.5,
    csv: CUSTOM_CSV,
    fx: Object.assign({}, cur ? S.fx : FX0),
    finds: [],
    custom: true,
    game: meta.game || (GAMES[0] && GAMES[0].id),
  };
  if (logo) d.logo = logo;
  EXPS.push(d);
  meta.custom.push(d);
  LS.set("meta", meta);
  $("nxn").value = "";
  $("nxi").value = "";
  $("nxh").textContent = "";
  NXI = "";
  dlgClose($("xpd"));
  openExp(d);
};
$("rx").onclick = async () => {
  const own = !!cur.custom;
  if (
    !(await ask(
      own ? "Eliminar expansión" : "Restablecer expansión",
      own
        ? `«${cur.name}» es una expansión propia: se eliminará con todos sus datos de este navegador.`
        : `Se borrarán tus hallazgos, ediciones, fotos y marcas de «${cur.name}» y volverá a los datos originales.`,
      own ? "Eliminar" : "Restablecer",
    ))
  )
    return;
  LS.del("s." + cur.id);
  if (cur.custom) {
    EXPS = EXPS.filter((e) => e !== cur);
    meta.custom = meta.custom.filter((e) => e.id !== cur.id);
    LS.set("meta", meta);
    if (!EXPS.length) EXPS.push(newBlank());
    openExp(EXPS.find((e) => gameOf(e) === meta.game) || EXPS[0]);
  } else openExp(cur);
};
const newBlank = () => ({
  id: "mi-expansion",
  name: "Mi expansi\u00f3n",
  q: "Mi expansi\u00f3n",
  rel: [],
  rev: 1,
  ok: 6,
  mx: 7.5,
  csv: CUSTOM_CSV,
  fx: Object.assign({}, FX0),
  finds: [],
  custom: true,
  game: GAMES[0] && GAMES[0].id,
});
$("help").open = ui.help !== false;
$("help").addEventListener("toggle", () => {
  ui.help = $("help").open;
  saveUi();
});
$("gd").onclick = () => {
  $("datos").open = true;
};
$("cka").onclick = () => {
  ui.ck = 1;
  saveUi();
  dlgClose($("ck"));
};
let ip = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  ip = e;
  $("ins").hidden = false;
});
$("ins").onclick = async () => {
  if (!ip) {
    alert(
      "Para instalar: abre el menú del navegador (☰ o ⋮) y elige «Instalar BoosterMath…», o usa el icono de instalar de la barra de direcciones.",
    );
    return;
  }
  ip.prompt();
  try {
    await ip.userChoice;
  } catch (e) {}
  ip = null;
  $("ins").hidden = true;
};
window.addEventListener("appinstalled", () => {
  $("ins").hidden = true;
});
if (!matchMedia("(display-mode: standalone)").matches)
  setTimeout(() => {
    if (!ip) $("ins").hidden = false;
  }, 3000);
if ("serviceWorker" in navigator && /^https?:/.test(location.protocol))
  navigator.serviceWorker.register("sw.js").catch(() => {});
/* ===== Noticias y calendario ===== */
const SRV = { news: [], cal: [] };
const NW = Object.assign({ mine: [], hidden: [] }, LS.get("news")),
  CL = Object.assign({ mine: [], hidden: [] }, LS.get("cal"));
[NW, CL].forEach((o) => {
  if (!Array.isArray(o.mine)) o.mine = [];
  if (!Array.isArray(o.hidden)) o.hidden = [];
});
const okUrl = (v) => {
  try {
    const u = new URL(String(v || "").trim());
    return /^https?:$/.test(u.protocol) ? u.href : "";
  } catch (e) {
    return "";
  }
};
const pad2 = (n) => String(n).padStart(2, "0");
function drawNews() {
  const box = $("nwl");
  box.innerHTML = "";
  const vis = SRV.news
    .map((x) => ({ n: x.n || x.u, u: x.u, s: 1 }))
    .concat(NW.mine.map((x) => ({ n: x.n, u: x.u, s: 0 })))
    .filter((x) => !(x.s && NW.hidden.includes(x.u)));
  if (!vis.length) box.textContent = "Todavía no hay webs.";
  vis.forEach((x) => {
    const r = document.createElement("div"),
      a = document.createElement("a"),
      b = document.createElement("button");
    r.className = "nwr";
    a.href = x.u;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = x.n;
    b.type = "button";
    b.className = "x";
    b.textContent = "✕";
    b.title = x.s
      ? "Ocultar en este navegador (el archivo del servidor no cambia)"
      : "Quitar";
    b.onclick = async () => {
      if (
        !(await ask(
          x.s ? "Ocultar web" : "Quitar web",
          x.s
            ? `«${x.n}» se ocultará solo en este navegador; el archivo del servidor no cambia.`
            : `«${x.n}» se quitará de tu lista.`,
          x.s ? "Ocultar" : "Quitar",
        ))
      )
        return;
      if (x.s) NW.hidden.push(x.u);
      else NW.mine = NW.mine.filter((m) => m.u !== x.u);
      LS.set("news", NW);
      drawNews();
    };
    r.append(a, b);
    box.appendChild(r);
  });
  $("nwr").hidden = !NW.hidden.length;
}
$("nwa").onclick = () => {
  const u = okUrl($("nwu").value);
  if (!u || NW.mine.some((m) => m.u === u)) return;
  NW.mine.push({
    n: $("nwn").value.trim() || new URL(u).hostname.replace(/^www\./, ""),
    u,
  });
  LS.set("news", NW);
  $("nwn").value = "";
  $("nwu").value = "";
  drawNews();
};
$("nwr").onclick = () => {
  NW.hidden = [];
  LS.set("news", NW);
  drawNews();
};
let calY = new Date().getFullYear(),
  calM = new Date().getMonth();
const calAll = () =>
  SRV.cal
    .map((x) => ({
      id: "s|" + x.d + "|" + x.t,
      d: x.d,
      t: String(x.t),
      c: x.c || "#2563eb",
      s: 1,
    }))
    .concat(CL.mine.map((x) => Object.assign({ s: 0 }, x)))
    .filter((x) => !(x.s && CL.hidden.includes(x.id)));
function drawCal() {
  const first = new Date(calY, calM, 1),
    lead = (first.getDay() + 6) % 7,
    days = new Date(calY, calM + 1, 0).getDate(),
    now = new Date(),
    today =
      now.getFullYear() +
      "-" +
      pad2(now.getMonth() + 1) +
      "-" +
      pad2(now.getDate()),
    all = calAll(),
    g = $("calg");
  $("calm").textContent = first.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
  g.innerHTML = "";
  ["L", "M", "X", "J", "V", "S", "D"].forEach((t) => {
    const h = document.createElement("div");
    h.className = "ch";
    h.textContent = t;
    g.appendChild(h);
  });
  for (let i = 0; i < lead; i++) g.appendChild(document.createElement("div"));
  for (let d = 1; d <= days; d++) {
    const ds = calY + "-" + pad2(calM + 1) + "-" + pad2(d),
      c = document.createElement("div"),
      n = document.createElement("span");
    c.className =
      "cd" +
      (ds === today ? " hoy" : "") +
      (ds === $("cad").value ? " sel" : "");
    n.textContent = d;
    c.appendChild(n);
    all
      .filter((x) => x.d === ds)
      .forEach((x) => {
        const p = document.createElement("i");
        p.style.background = x.c;
        p.title = x.t;
        c.appendChild(p);
      });
    c.onclick = () => {
      $("cad").value = ds;
      drawCal();
    };
    g.appendChild(c);
  }
  const box = $("cal"),
    sel = $("cad").value,
    mes = sel ? all.filter((x) => x.d === sel) : [];
  box.innerHTML = "";
  mes.forEach((x) => {
    const r = document.createElement("div"),
      dot = document.createElement("span"),
      t = document.createElement("b"),
      b = document.createElement("button");
    r.className = "cer";
    dot.className = "cdot";
    dot.style.background = x.c;
    t.textContent = x.t;
    b.type = "button";
    b.className = "x";
    b.textContent = "✕";
    b.title = x.s
      ? "Ocultar en este navegador (el archivo del servidor no cambia)"
      : "Quitar";
    b.onclick = async () => {
      if (
        !(await ask(
          x.s ? "Ocultar entrada" : "Quitar entrada",
          x.s
            ? `«${x.t}» se ocultará solo en este navegador; el archivo del servidor no cambia.`
            : `«${x.t}» se quitará del calendario.`,
          x.s ? "Ocultar" : "Quitar",
        ))
      )
        return;
      if (x.s) CL.hidden.push(x.id);
      else CL.mine = CL.mine.filter((m) => m.id !== x.id);
      LS.set("cal", CL);
      drawCal();
    };
    r.append(dot, t, b);
    box.appendChild(r);
  });
  $("calr").hidden = !CL.hidden.length;
}
$("calp").onclick = () => {
  if (--calM < 0) {
    calM = 11;
    calY--;
  }
  drawCal();
};
$("caln").onclick = () => {
  if (++calM > 11) {
    calM = 0;
    calY++;
  }
  drawCal();
};
const calToday = () => {
  const t = new Date();
  calY = t.getFullYear();
  calM = t.getMonth();
  $("cad").value = calY + "-" + pad2(calM + 1) + "-" + pad2(t.getDate());
  drawCal();
};
$("calh").onclick = calToday;
$("calb").onclick = () => {
  calToday();
  dlgOpen($("cald"));
};
$("calx").onclick = () => dlgClose($("cald"));
$("cald").onclick = (e) => {
  if (e.target === $("cald")) dlgClose($("cald"));
};
$("caa").onclick = () => {
  const d = $("cad").value,
    t = $("cat").value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !t) return;
  CL.mine.push({
    id: "m" + Date.now() + Math.random().toString(36).slice(2, 6),
    d,
    t,
    c: $("cac").value || "#2563eb",
  });
  LS.set("cal", CL);
  $("cat").value = "";
  calY = +d.slice(0, 4);
  calM = +d.slice(5, 7) - 1;
  drawCal();
};
$("calr").onclick = () => {
  CL.hidden = [];
  LS.set("cal", CL);
  drawCal();
};
async function loadExtra() {
  const get = async (f) => {
    try {
      const r = await fetch("data/" + f, { cache: "no-cache" });
      if (!r.ok) throw 0;
      const v = await r.json();
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  };
  SRV.news = (await get("noticias.json")).filter((x) => x && okUrl(x.u));
  SRV.cal = (await get("calendario.json")).filter(
    (x) => x && /^\d{4}-\d{2}-\d{2}$/.test(x.d) && x.t,
  );
  drawNews();
  drawCal();
}

/* ===== Confirmación y juegos propios ===== */
function ask(title, text, okLabel, safe) {
  return new Promise((res) => {
    const d = $("cfd");
    let done = false;
    const end = (v) => {
      if (done) return;
      done = true;
      d.onclose = null;
      d.onclick = null;
      dlgClose(d);
      res(v);
    };
    $("cft").textContent = title;
    $("cfx").textContent = text || "";
    $("cfy").textContent = okLabel || "Eliminar";
    $("cfy").classList.toggle("safe", !!safe);
    $("cfy").onclick = () => end(true);
    $("cfn").onclick = () => end(false);
    d.onclose = () => end(false);
    d.onclick = (e) => {
      if (e.target === d) end(false);
    };
    dlgOpen(d);
    $("cfn").focus();
  });
}
const ICONS = [
  "⚡",
  "🔥",
  "💧",
  "🌿",
  "🐉",
  "🃏",
  "🎴",
  "🎲",
  "🧙",
  "⚔️",
  "🛡️",
  "🏆",
  "⭐",
  "🌟",
  "💎",
  "👾",
  "🤖",
  "🦖",
  "🐱",
  "🐶",
  "🦊",
  "🚀",
  "🌍",
  "🎮",
  "🧩",
  "🔮",
  "📦",
  "💀",
  "👑",
  "🦄",
  "🍀",
  "🌙",
  "☀️",
  "❄️",
  "🎯",
  "🏰",
  "🧪",
  "🪄",
  "🕹️",
  "🎁",
];
let GMI = ICONS[0],
  GMD = "",
  GME = null;
function drawGmIcons() {
  const box = $("gmi");
  box.innerHTML = "";
  (GMI && !ICONS.includes(GMI) ? [GMI, ...ICONS] : ICONS).forEach((ic) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = ic;
    b.className = ic === GMI ? "on" : "";
    b.onclick = () => {
      GMI = ic;
      drawGmIcons();
    };
    box.appendChild(b);
  });
}
function drawGmList() {
  const box = $("gml");
  box.innerHTML = "";
  const mine = GAMES.filter((g) => g.custom);
  if (!mine.length) return;
  const h = document.createElement("b");
  h.textContent = "Mis juegos";
  box.appendChild(h);
  mine.forEach((g) => {
    const r = document.createElement("div"),
      t = document.createElement("span"),
      b = document.createElement("button");
    r.className = "cer";
    t.style.flex = "1";
    t.textContent = (g.icon ? g.icon + " " : "") + g.name;
    b.type = "button";
    b.className = "x";
    b.textContent = "✕";
    b.title = "Eliminar juego";
    b.onclick = async () => {
      if (
        !(await ask(
          "Eliminar juego",
          `«${g.name}» y sus expansiones propias se borrarán de este navegador.`,
        ))
      )
        return;
      delGame(g.id);
      drawGmList();
    };
    r.append(t, b);
    box.appendChild(r);
  });
}
function delGame(id) {
  exitWish();
  const g = GAMES.find((x) => x.id === id),
    mine = EXPS.filter((e) => gameOf(e) === id);
  mine.forEach((e) => LS.del("s." + e.id));
  EXPS = EXPS.filter((e) => !mine.includes(e));
  meta.custom = meta.custom.filter((e) => !mine.some((m) => m.id === e.id));
  if (g && g.custom) meta.games = meta.games.filter((x) => x.id !== id);
  else if (!meta.hiddenGames.includes(id)) meta.hiddenGames.push(id);
  GAMES = GAMES.filter((x) => x.id !== id);
  delete meta.last[id];
  delete meta.gameOv[id];
  if (meta.game === id) meta.game = GAMES[0].id;
  if (!EXPS.length) EXPS.push(newBlank());
  LS.set("meta", meta);
  const keep = EXPS.includes(cur)
    ? cur
    : EXPS.find((e) => gameOf(e) === meta.game);
  keep ? openExp(keep) : emptyGame(meta.game);
}
function fillGame(id) {
  const g = GAMES.find((x) => x.id === id);
  if (!g) return;
  GME = id;
  GMD = g.img && /^data:image\//.test(g.img) ? g.img : "";
  GMI = g.icon || "";
  $("gmn").value = g.name;
  $("gmu").value = g.img && /^https?:\/\//.test(g.img) ? g.img : "";
  $("gmh").textContent = GMD
    ? "Imagen subida conservada (usa «Quitar imagen» para eliminarla)."
    : "";
  $("gmr").hidden = !g.img;
  drawGmIcons();
}
function openGameDlg(edit) {
  const sel = $("gms");
  GME = null;
  GMD = "";
  sel.hidden = !edit;
  $("gmt").textContent = edit ? "✏️ Editar juego" : "＋ Nuevo juego";
  $("gmc").textContent = edit ? "Guardar cambios" : "Crear juego";
  $("gml").hidden = !!edit;
  $("gmz").hidden = !(edit && meta.hiddenGames.length);
  $("gmr").hidden = true;
  $("gmh").textContent = "";
  if (edit) {
    sel.innerHTML = "";
    GAMES.forEach((g) =>
      sel.appendChild(new Option((g.icon ? g.icon + " " : "") + g.name, g.id)),
    );
    sel.value = GAMES.some((g) => g.id === meta.game) ? meta.game : GAMES[0].id;
    fillGame(sel.value);
  } else {
    GMI = ICONS[0];
    $("gmn").value = "";
    $("gmu").value = "";
    drawGmIcons();
    drawGmList();
  }
  dlgOpen($("gmd"));
  $("gmn").focus();
}
$("gms").onchange = () => fillGame($("gms").value);
$("gmz").onclick = () => {
  meta.hiddenGames = [];
  LS.set("meta", meta);
  location.reload();
};
$("gmr").onclick = () => {
  GMD = "";
  $("gmu").value = "";
  $("gmr").hidden = true;
  $("gmh").textContent = "La imagen se quitará al guardar.";
};
$("gmx").onclick = () => dlgClose($("gmd"));
$("gmd").onclick = (e) => {
  if (e.target === $("gmd")) dlgClose($("gmd"));
};
$("gmb").onclick = () => $("gmf").click();
$("gmf").onchange = (e) => {
  const fl = e.target.files[0];
  e.target.value = "";
  if (!fl) return;
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, 160 / Math.max(img.width, img.height)),
        cv = document.createElement("canvas");
      cv.width = Math.round(img.width * r);
      cv.height = Math.round(img.height * r);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      GMD = cv.toDataURL("image/webp", 0.85);
      $("gmu").value = "";
      $("gmh").textContent = "Imagen adjuntada ✓";
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(fl);
};
$("gmc").onclick = () => {
  const nm = $("gmn").value.trim();
  if (!nm) {
    $("gmh").textContent = "Escribe un nombre para el juego.";
    return;
  }
  const u = $("gmu").value.trim(),
    img = GMD || (/^https?:\/\//.test(u) ? u : ""),
    base =
      "g-" +
      (nm
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "juego");
  if (GME) {
    const g = GAMES.find((x) => x.id === GME);
    if (!g) return;
    g.name = nm;
    g.icon = GMI;
    if (img) g.img = img;
    else delete g.img;
    if (g.custom) {
      const m = meta.games.find((x) => x.id === GME);
      if (m) {
        m.name = nm;
        m.icon = GMI;
        if (img) m.img = img;
        else delete m.img;
      }
    } else meta.gameOv[GME] = { name: nm, icon: GMI, img };
    LS.set("meta", meta);
    dlgClose($("gmd"));
    buildGames();
    return;
  }
  let id = base,
    k = 2;
  while (GAMES.some((g) => g.id === id)) id = base + "-" + k++;
  const g = { id, name: nm, icon: GMI };
  if (img) g.img = img;
  meta.games.push(g);
  GAMES.push(Object.assign({ custom: true }, g));
  LS.set("meta", meta);
  exitWish();
  dlgClose($("gmd"));
  emptyGame(id);
};

/* ===== Editar producto y foto en el formulario ===== */
function photoData(fl, cb) {
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, 160 / Math.max(img.width, img.height)),
        cv = document.createElement("canvas");
      cv.width = Math.round(img.width * r);
      cv.height = Math.round(img.height * r);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      cb(cv.toDataURL("image/jpeg", 0.72));
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(fl);
}
let FIMD = "";
$("fimb").onclick = () => $("fimf").click();
$("fimf").onchange = (e) => {
  const fl = e.target.files[0];
  e.target.value = "";
  if (!fl) return;
  photoData(fl, (u) => {
    FIMD = u;
    $("fim").value = "";
    $("fimh").textContent = "Foto adjuntada ✓";
  });
};
let EPX = null;
const csvIdx = (name) => {
  const L = S.csv.split("\n");
  return {
    L,
    i: L.findIndex((l) => {
      const t = l.trim();
      return t && t[0] !== "#" && t.split(";")[0] === name;
    }),
  };
};
function openEdit(x) {
  const { L, i } = csvIdx(x.n);
  if (i < 0) return;
  const p = L[i].trim().split(";"),
    fe = /^\d{4}-\d{2}-\d{2}$/.test(x.fe || "") ? x.fe : "";
  EPX = { n: x.n, fe };
  $("epn").value = p[0] || "";
  $("epk").value = p[1] || "";
  $("epp").value = p[2] || "";
  $("epe").value = p[3] || "";
  $("epo").value = p[4] || "";
  $("epl").value = (p[5] || "").trim().toUpperCase();
  $("epf").value = fe;
  $("epu").value = (S.imgUrl && S.imgUrl[x.n]) || x.ph || "";
  $("epm").textContent = "";
  dlgOpen($("epd"));
  $("epn").focus();
}
$("epx").onclick = $("epc").onclick = () => {
  EPX = null;
  dlgClose($("epd"));
};
$("epd").onclick = (e) => {
  if (e.target === $("epd")) $("epx").onclick();
};
$("eps").onclick = () => {
  if (!EPX) return;
  const clean = (v) =>
      String(v)
        .replace(/[;\n\r]/g, " ")
        .trim(),
    nm = clean($("epn").value).replace(/\|/g, " "),
    kk = num($("epk").value),
    uu = $("epu").value.trim(),
    pu = uu ? okUrl(uu) : "",
    err = (t) => ($("epm").textContent = t);
  if (!nm) return err("Escribe un nombre.");
  if (kk === null || kk < 0)
    return err("Sobres: escribe un número (0 si no trae).");
  if (uu && !pu) return err("El enlace de la foto no es válido.");
  if (nm !== EPX.n && parse().some((y) => y.n === nm))
    return err("Ya hay un producto con ese nombre.");
  const { L, i } = csvIdx(EPX.n);
  if (i < 0) return err("No encuentro el producto en el catálogo.");
  const p = L[i].trim().split(";");
  while (p.length < 8) p.push("");
  p[0] = nm;
  p[1] = String(kk);
  p[2] = clean($("epp").value);
  p[3] = clean($("epe").value);
  p[4] = clean($("epo").value);
  p[5] = $("epl").value;
  if ($("epf").value !== EPX.fe) {
    p[6] = $("epf").value;
    if (S.dates) delete S.dates[EPX.n];
  }
  while (p.length > 2 && p[p.length - 1] === "") p.pop();
  L[i] = p.join(";");
  S.csv = L.join("\n");
  if (nm !== EPX.n) {
    ["noex", "sealed", "fav", "wish", "obs", "imgs", "imgUrl", "dates"].forEach(
      (k) => {
        const o = S[k];
        if (o && Object.prototype.hasOwnProperty.call(o, EPX.n)) {
          o[nm] = o[EPX.n];
          delete o[EPX.n];
        }
      },
    );
    S.finds.forEach((z) => {
      if (z.n === EPX.n) z.n = nm;
    });
  }
  if (pu) S.imgUrl[nm] = pu;
  else delete S.imgUrl[nm];
  $("csv").value = S.csv;
  save();
  EPX = null;
  dlgClose($("epd"));
  render();
};

/* ===== Copiar / mover producto ===== */
let MVX = null;
const stateOf = (d) =>
  d === cur ? S : ST.has(d.id) ? ST.get(d.id) : loadState(d);
function newExpIn(gid, nm) {
  let id =
      nm
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "expansion",
    b = id,
    i = 2;
  while (EXPS.some((e) => e.id === id)) id = b + "-" + i++;
  const d = {
    id,
    name: nm,
    q: nm,
    rel: [],
    rev: 1,
    ok: 6,
    mx: 7.5,
    csv: CUSTOM_CSV,
    fx: Object.assign({}, cur ? S.fx : FX0),
    finds: [],
    custom: true,
    game: gid,
  };
  EXPS.push(d);
  meta.custom.push(d);
  LS.set("meta", meta);
  return d;
}
function fillMvCols() {
  const gid = $("mvg").value,
    sel = $("mvs");
  sel.innerHTML = "";
  EXPS.filter((e) => e !== cur && gameOf(e) === gid).forEach((e) =>
    sel.appendChild(new Option(e.name, e.id)),
  );
  sel.appendChild(new Option("＋ Nueva colección…", "__new__"));
  $("mvn").hidden = sel.value !== "__new__";
}
function openMove(x, move) {
  const g = $("mvg");
  g.innerHTML = "";
  GAMES.forEach((gm) =>
    g.appendChild(new Option((gm.icon ? gm.icon + " " : "") + gm.name, gm.id)),
  );
  g.value = gameOf(cur);
  fillMvCols();
  $("mvn").value = "";
  MVX = { n: x.n, move };
  $("mvt").textContent = (move ? "Mover" : "Copiar") + " producto";
  $("mvp").textContent =
    "«" +
    x.n +
    "» se " +
    (move ? "moverá" : "copiará") +
    " tal cual, con sus hallazgos, foto, notas y marcas.";
  $("mvy").textContent = move ? "Mover" : "Copiar";
  $("mvm").textContent = "";
  dlgOpen($("mvd"));
}
$("mvg").onchange = fillMvCols;
$("mvs").onchange = () => {
  $("mvn").hidden = $("mvs").value !== "__new__";
};
$("mvx").onclick = $("mvc").onclick = () => {
  MVX = null;
  dlgClose($("mvd"));
};
$("mvd").onclick = (e) => {
  if (e.target === $("mvd")) $("mvx").onclick();
};
$("mvy").onclick = () => {
  if (!MVX) return;
  const n = MVX.n,
    mv = MVX.move,
    src = csvIdx(n),
    err = (t) => ($("mvm").textContent = t);
  if (src.i < 0) return err("No encuentro el producto en el catálogo.");
  const isNew = $("mvs").value === "__new__",
    nm = $("mvn")
      .value.trim()
      .replace(/[;|\n]/g, " ");
  if (isNew && !nm) return err("Escribe el nombre de la nueva colección.");
  let d = isNew ? null : EXPS.find((e) => e.id === $("mvs").value);
  if (!isNew && !d) return;
  if (
    d &&
    stateOf(d)
      .csv.split("\n")
      .some((l) => {
        const t = l.trim();
        return t && t[0] !== "#" && t.split(";")[0] === n;
      })
  )
    return err(
      "En «" +
        d.name +
        "» ya hay un producto llamado «" +
        n +
        "». Cámbiale el nombre (✏️ Editar producto) o elige otro destino.",
    );
  if (isNew) d = newExpIn($("mvg").value, nm);
  const sd = stateOf(d);
  sd.csv = sd.csv.replace(/\s*$/, "") + "\n" + src.L[src.i].trim();
  ["noex", "sealed", "fav", "wish", "obs", "imgs", "imgUrl", "dates"].forEach(
    (k) => {
      if (S[k] && Object.prototype.hasOwnProperty.call(S[k], n)) {
        sd[k][n] = S[k][n];
        if (mv) delete S[k][n];
      }
    },
  );
  S.finds
    .filter((z) => z.n === n)
    .forEach((z) => sd.finds.push(Object.assign({}, z)));
  LS.set("s." + d.id, sd);
  if (mv) {
    S.finds = S.finds.filter((z) => z.n !== n);
    src.L.splice(src.i, 1);
    S.csv = src.L.join("\n");
    $("csv").value = S.csv;
    save();
  }
  MVX = null;
  dlgClose($("mvd"));
  render();
};

/* ===== Eliminar / exportar / importar juego, imagen grande ===== */
function clearMarks(key) {
  EXPS.forEach((e) => {
    const s = stateOf(e);
    if (Object.keys(s[key]).length) {
      s[key] = {};
      LS.set("s." + e.id, s);
    }
  });
  render();
}
async function removeGame() {
  if (WM) {
    const key = WM,
      lbl = key === "fav" ? "Favoritos" : "Wishlist";
    if (
      !(await ask(
        "Vaciar " + lbl,
        "Se quitarán las marcas de todos los productos de todos los juegos. Los productos no se borran.",
        "Vaciar",
      ))
    )
      return;
    clearMarks(key);
    return;
  }
  if (GAMES.length <= 1) {
    await ask(
      "No se puede eliminar",
      "Es el único juego que queda.",
      "Entendido",
      true,
    );
    return;
  }
  const g = GAMES.find((x) => x.id === meta.game);
  if (!g) return;
  const mine = EXPS.filter((e) => gameOf(e) === g.id),
    nf = mine.reduce((a, e) => a + stateOf(e).finds.length, 0);
  if (
    !(await ask(
      "Eliminar juego",
      `«${g.name}» se eliminará con sus ${mine.length} colecciones y ${nf} hallazgos, y se borrarán todos sus datos de este navegador.` +
        (g.custom
          ? ""
          : " (Al ser un juego del servidor, solo se oculta aquí; puedes restaurarlo desde ✏️.)"),
      "Eliminar",
    ))
  )
    return;
  delGame(g.id);
}
async function exportGame() {
  const g = GAMES.find((x) => x.id === meta.game);
  if (WM || !g) {
    await ask(
      "Exportar juego",
      "Elige primero un juego (no Favoritos ni Wishlist).",
      "Entendido",
      true,
    );
    return;
  }
  const mine = EXPS.filter((e) => gameOf(e) === g.id),
    nf = mine.reduce((a, e) => a + stateOf(e).finds.length, 0);
  if (
    !(await ask(
      "Exportar «" + g.name + "»",
      `Se descargará un archivo .json con este juego: ${mine.length} colecciones y ${nf} hallazgos, junto con tus fotos subidas, notas y marcas (favoritos, deseados, 📦).\n\nNo se borra ni se cambia nada en este navegador. Para recuperarlo o llevarlo a otro navegador, usa ⬆️ Importar.`,
      "Descargar",
      true,
    ))
  )
    return;
  const t = JSON.stringify({
    v: 3,
    all: true,
    games: g.custom
      ? [{ id: g.id, name: g.name, icon: g.icon || "", img: g.img || "" }]
      : [],
    exps: mine.map((e) => packOne(e, stateOf(e), true)),
  });
  if (!dl("boostermath-juego-" + g.id + ".json", t))
    ask(
      "No se pudo descargar",
      "Prueba con «Exportar todo» en la sección Datos.",
      "Entendido",
      true,
    );
}
async function importGame() {
  if (
    !(await ask(
      "Importar un juego",
      "Elige un archivo .json exportado con ⬇️ Exportar (o con «Exportar todo»).\n\nQué pasará:\n• Si el juego o sus colecciones no existen aquí, se crean.\n• Los hallazgos del archivo se añaden a los tuyos, sin duplicar.\n• El catálogo de productos y los ajustes de esas colecciones se reemplazan por los del archivo.\n• Favoritos, deseados, 📦, notas y fotos se combinan con los que ya tienes.\n\nNo se borra ningún juego ni colección que no esté en el archivo.",
      "Elegir archivo",
      true,
    ))
  )
    return;
  $("gimf").click();
}
$("gimf").onchange = (e) => {
  const fl = e.target.files[0];
  e.target.value = "";
  if (!fl) return;
  const fr = new FileReader();
  fr.onload = () => {
    exitWish();
    $("dt").value = String(fr.result);
    $("im").onclick();
    ask("Importar juego", $("st").textContent, "Aceptar", true);
  };
  fr.readAsText(fl);
};
function openImg(src) {
  $("imb").src = src;
  dlgOpen($("imd"));
}
$("imd").onclick = () => dlgClose($("imd"));

async function init() {
  const defs = [];
  let fail = false;
  try {
    const gj = await (
      await fetch("data/games.json", { cache: "no-cache" })
    ).json();
    GAMES = (Array.isArray(gj) ? gj : gj.games || []).filter(
      (g) => g && g.id && !meta.hiddenGames.includes(g.id),
    );
    const jobs = [];
    GAMES.forEach((g) =>
      (g.expansions || []).forEach((f) =>
        jobs.push(
          fetch("data/" + f, { cache: "no-cache" })
            .then((r) => {
              if (!r.ok) throw 0;
              return r.json();
            })
            .then((v) => {
              v.game = g.id;
              return v;
            }),
        ),
      ),
    );
    const rs = await Promise.allSettled(jobs);
    rs.forEach((r) => {
      if (
        r.status === "fulfilled" &&
        r.value &&
        r.value.id &&
        typeof r.value.csv === "string"
      )
        defs.push(r.value);
      else fail = true;
    });
  } catch (e) {
    fail = true;
  }
  if (!GAMES.length)
    GAMES = [{ id: "pokemon", name: "Pok\u00e9mon", icon: "\u26A1" }];
  meta.games.forEach((g) => {
    if (g && g.id && !GAMES.some((x) => x.id === g.id))
      GAMES.push(Object.assign({}, g, { custom: true }));
  });
  GAMES.forEach((g) => {
    const o = !g.custom && meta.gameOv[g.id];
    if (!o) return;
    if (o.name) g.name = o.name;
    g.icon = o.icon || "";
    if (o.img) g.img = o.img;
    else delete g.img;
  });
  if (fail) {
    $("ld").hidden = false;
    $("ld").textContent = defs.length
      ? "Alguna expansi\u00f3n no se pudo cargar."
      : "No se pudieron cargar las expansiones. Si abriste el archivo directamente, sirve la carpeta con un servidor local (python3 -m http.server) o usa GitHub Pages. Mientras, puedes crear o importar expansiones.";
  }
  EXPS = defs.slice();
  meta.custom.forEach((c) => {
    if (!EXPS.some((e) => e.id === c.id))
      EXPS.push(Object.assign({}, c, { custom: true }));
  });
  if (!meta.game || !GAMES.some((g) => g.id === meta.game))
    meta.game = GAMES[0].id;
  if (!EXPS.length) EXPS.push(newBlank());
  const h = decodeURIComponent((location.hash || "").slice(1));
  const start =
    EXPS.find((e) => e.id === h) ||
    EXPS.find((e) => e.id === meta.cur) ||
    EXPS.find((e) => gameOf(e) === meta.game);
  if (start) openExp(start);
  else emptyGame(meta.game);
  if (!ui.ck) dlgOpen($("ck"));
  loadExtra();
}
init().catch((e) => {
  const l = document.getElementById("ld");
  l.hidden = false;
  l.textContent =
    "Error al iniciar (" + BM_VER + "): " + ((e && e.message) || e);
});
