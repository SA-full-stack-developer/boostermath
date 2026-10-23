const BM_VER="2.0";
(function(){const show=m=>{const l=document.getElementById("ld");if(l){l.hidden=false;l.textContent="Error ("+BM_VER+"): "+m}};
window.addEventListener("error",e=>show((e.message||"desconocido")+" ["+String(e.filename||"").split("/").pop()+":"+e.lineno+"]"));
window.addEventListener("unhandledrejection",e=>show(String(e.reason&&e.reason.message||e.reason)))})();
const NS="boostermath.v1.";
const LS={get(k){try{return JSON.parse(localStorage.getItem(NS+k))}catch(e){return null}},set(k,v){try{localStorage.setItem(NS+k,JSON.stringify(v));return true}catch(e){return false}},del(k){try{localStorage.removeItem(NS+k)}catch(e){}}};
const CUSTOM_CSV="# nombre;sobres;pvp;extras (descripcion:valor|descripcion:valor);origen;idioma;fecha(AAAA-MM-DD)\n# Con 0 sobres el producto es solo referencia: se compara contra su PVP en euros\n";
const FX0={CNY:7.5,JPY:177.5,KRW:1499,TWD:36.8,HKD:8.83};
let EXPS=[],meta=LS.get("meta"),cur=null,S=null,EXP={name:"",dates:[]},EXP_Q="",DEF="";
if(!meta||!Array.isArray(meta.custom))meta={cur:"",custom:[]};
if(!meta.last||typeof meta.last!=="object")meta.last={};if(!Array.isArray(meta.recent))meta.recent=[];
const ui=LS.get("ui")||{};const saveUi=()=>LS.set("ui",ui);
let GAMES=[];
const freshState=d=>({ok:num(d.ok)||6,mx:num(d.mx)||7.5,csv:d.csv||CUSTOM_CSV,finds:[],imgs:{},imgUrl:{},seedRev:0,noex:Object.assign({},d.noex),dates:Object.assign({},d.dates),sealed:{},fx:Object.assign({},FX0,d.fx)});
function loadState(d){const s=Object.assign(freshState(d),LS.get("s."+d.id)||{});["imgs","imgUrl","noex","dates","sealed","fx"].forEach(k=>{if(!s[k]||typeof s[k]!=="object")s[k]={}});s.fx=Object.assign({},FX0,d.fx,s.fx);if(!Array.isArray(s.finds))s.finds=[];
const rev=d.rev||1;if((s.seedRev||0)<rev){const seen=new Set(s.finds.map(z=>[z.n,z.s,z.p].join("|")));(d.finds||[]).forEach(z=>{const k=[z.n,z.s,z.p].join("|");if(!seen.has(k)){seen.add(k);s.finds.push(Object.assign({},z))}});s.seedRev=rev;LS.set("s."+d.id,s)}
return s}
const save=()=>{if(!cur)return;const ok=LS.set("s."+cur.id,S);$("warn").hidden=ok;if(!ok)$("warn").textContent="No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado. Exporta tus datos."};
const DATES={};
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const dateFor=n=>{const k=norm(n),m=Object.keys(DATES).find(d=>k.startsWith(d));return m?DATES[m]:""};
const fmtDate=v=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||"");return m?m[3]+"/"+m[2]+"/"+m[1]:(v||"sin confirmar")};
function hdr(){const e=document.getElementById("hd");e.innerHTML="";if(!EXP.dates.length)return;const b=document.createElement("div");b.className="xd";b.textContent="Salida: "+EXP.dates.map(d=>d[0]+" "+fmtDate(d[1])).join(" \u00b7 ");e.append(b)}
const STORES=["Amazon","Fnac","Carrefour","Toys R Us","Toy Planet","Drim","Joguiba","Alcampo","El Corte Ingl\u00e9s","GAME","Flash Store","Juguettos","Juguetilandia","MediaMarkt","PcComponentes","Miravia","Eroski","Worten","Pokemon Center"];
const $=id=>document.getElementById(id);
const num=v=>{const n=parseFloat(String(v).replace(",","."));return isFinite(n)?n:null};
const f=n=>n.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2});
const LBL={ok:"Compra",wa:"Aceptable",ko:"Caro"};
const verdict=pp=>pp<=S.ok?"ok":pp<=S.mx?"wa":"ko";
const price=s=>{s=(s||"").trim();const m=s.match(/^([\d.,]+)\s*([A-Za-z]{3})$/);if(m){const a=num(m[1]),r=S.fx[m[2].toUpperCase()];return a!==null&&r?{eur:a/r,org:m[1]+" "+m[2].toUpperCase()}:{eur:null,org:""}}return{eur:num(s),org:""}};
const exs=(s,lg)=>(s||"").split("|").map(t=>{const i=t.lastIndexOf(":");if(i<0)return null;const d=t.slice(0,i).trim(),r=t.slice(i+1),m={};r.replace(/([A-Za-z]{2})\s*=\s*([\d.,]+)/g,(_,k,n)=>{m[k.toUpperCase()]=num(n)});const ks=Object.keys(m);const v=ks.length?(m[lg]!==undefined?m[lg]:m.ES!==undefined?m.ES:m[ks[0]]):num(r);return v===null||v===undefined?null:{d,v}}).filter(e=>e);
const parse=()=>S.csv.split("\n").map(l=>l.trim()).filter(l=>l&&l[0]!=="#").map(l=>{const p=l.split(";");const lg=(p[5]||"").trim().toUpperCase()||(/ JP\b/.test(p[0])?"JP":/ KR\b/.test(p[0])?"KO":/ (CN|TW)\b/.test(p[0])?"ZH":"ES"),ex=exs(p[3],lg),pv=price(p[2]);return{lg,n:p[0],k:num(p[1]),pvp:pv.eur,ex,xt:(S.noex&&S.noex[p[0]])?0:ex.reduce((a,e)=>a+e.v,0),off:!!(S.noex&&S.noex[p[0]]),ph:(p[7]||"").trim(),fe:(S.dates&&Object.prototype.hasOwnProperty.call(S.dates,p[0]))?S.dates[p[0]]:((p[6]||"").trim()||dateFor(p[0])),or:(pv.org?pv.org+" \u2248 "+f(pv.eur)+" \u20ac":"")+(p[4]&&p[4].trim()?(pv.org?" \u00b7 ":"")+p[4].trim():"")}}).filter(x=>x.n&&x.k!==null&&x.k>=0);
function meas(x,p){if(x.k>0){const pp=(p-x.xt)/x.k;return{v:verdict(pp),t:f(pp)+" €/sobre"}}if(x.pvp){const d=(p/x.pvp-1)*100;return{v:d<=10?"ok":d<=30?"wa":"ko",t:(d>=0?"+":"")+Math.round(d)+" % vs PVP"}}return{v:"",t:""}}
function paint(x,c){const i=c.querySelector(".pp"),r=c.querySelector(".res"),b=c.querySelector(".brk");
const p=num(i.value),use=p!==null?p:x.pvp;c.classList.remove("ok","wa","ko");
if(p===null){r.className="res";r.textContent="—"}else{const m=meas(x,p);r.className="res "+m.v;r.textContent=m.t+(m.v?" · "+LBL[m.v]:"");if(m.v)c.classList.add(m.v)}
if(use===null||x.k===0){b.className="brk";b.textContent=""}else{const pp=(use-x.xt)/x.k;b.className="brk "+verdict(pp);b.textContent=`${p!==null?"Tu precio":"PVP"}: ${x.k} sobres × ${f(pp)} € + ${f(x.xt)} € extras = ${f(use)} €`}}
function finds(x,c){const L=S.finds.filter(z=>z.n===x.n).sort((a,b)=>a.p-b.p),d=c.querySelector(".fd"),u=d.querySelector("ul");
d.querySelector("summary").textContent=`Hallazgos (${L.length})`;u.innerHTML="";
L.forEach(z=>{const li=document.createElement("li"),m=meas(x,z.p),v=m.v;
let nm;if(z.u){nm=document.createElement("a");nm.href=z.u;nm.target="_blank";nm.rel="noopener noreferrer"}else nm=document.createElement("span");
nm.textContent=z.s+(z.l?" ("+z.l+")":"");const sp=document.createElement("span");sp.className="p "+v;sp.textContent=`${f(z.p)} € · ${m.t}`;
const dl=document.createElement("button");dl.className="x";dl.textContent="×";dl.onclick=()=>{S.finds.splice(S.finds.indexOf(z),1);save();render()};
const av=document.createElement("button");av.className="x av";av.textContent=z.a===false?"\uD83D\uDEAB":"\u2705";av.title=z.a===false?"No disponible: pulsa para marcar disponible":"Disponible: pulsa para marcar no disponible";av.onclick=()=>{z.a=z.a===false;save();finds(x,c)};if(z.a===false)li.style.opacity=".55";const ed=document.createElement("button");ed.className="x";ed.textContent="\u270F\uFE0F";ed.title="Editar";ed.onclick=()=>{li.textContent="";li.style.flexWrap="wrap";li.style.opacity="1";const f1=document.createElement("input"),f2=document.createElement("input"),f3=document.createElement("input"),f4=document.createElement("select");["ES","EN","JP","KO","ZH"].forEach(l=>{const o=document.createElement("option");o.textContent=l;f4.appendChild(o)});f4.value=z.l||"ES";f1.value=z.s;f1.placeholder="Tienda";f2.value=String(z.p).replace(".",",");f2.inputMode="decimal";f2.placeholder="Precio";f3.value=z.u||"";f3.placeholder="Enlace (opcional)";const ok=document.createElement("button"),no=document.createElement("button");ok.textContent="Guardar";no.textContent="Cancelar";ok.onclick=()=>{const np=num(f2.value);if(np===null||!f1.value.trim())return;if(np!==z.p)z.h=(z.h||[]).concat({p:z.p,t:z.t||0}).slice(-10);z.s=f1.value.trim();z.p=np;let uu="";try{const U=new URL(f3.value.trim());if(/^https?:$/.test(U.protocol))uu=U.href}catch(e){}z.u=uu;z.l=f4.value;z.t=Date.now();save();fillShops();document.querySelectorAll("#list .card").forEach(chipsFor);finds(x,c)};no.onclick=()=>finds(x,c);li.append(f1,f4,f2,f3,ok,no)};
const tr=document.createElement("span");if(z.h&&z.h.length){const pr=z.h[z.h.length-1].p;tr.className="p "+(z.p<pr?"ok":"ko");tr.textContent=(z.p<pr?"\u25BC":"\u25B2")+" antes "+f(pr)+" \u20AC"}if(z.t)sp.title="Actualizado "+new Date(z.t).toLocaleDateString("es-ES");li.append(av,nm,sp);if(tr.textContent)li.append(tr);li.append(ed,dl);u.appendChild(li)})}
const KS_TAGS=[["Moneda",/moneda|coin/i],["Tapete",/tapete|playmat|alfombrilla/i],["Fundas",/funda|sleeve/i],["Dados / contadores",/dado|contador|marcador|damage/i],["Promo",/promo/i],["Carta jumbo",/jumbo|gigante/i],["Figura",/figura/i],["Póster",/p[oó]ster/i],["Pegatinas",/pegatina|sticker/i],["Álbum",/[aá]lbum|carpeta|binder/i],["Lata / caja / expositor",/lata|expositor|deck box|estuche|\bcaja\b/i],["Energías",/energ[ií]a/i],["Mazo",/mazo|deck/i]];
const tagsOf=x=>{const t=x.ex.map(e=>e.d).join(" | ")+" | "+x.n,o=new Set();KS_TAGS.forEach(([n,r])=>{if(r.test(t))o.add(n)});return o};
const FL={so:"cat",k:new Set(),t:new Set(),f:new Set()};
function effBest(x){if(!(x.k>0))return null;const L=S.finds.filter(z=>z.n===x.n),av=L.filter(z=>z.a!==false),a=(av.length?av:L).map(z=>z.p),p=a.length?Math.min(...a):x.pvp;if(p===null||p===undefined)return null;return (p-x.xt)/x.k}
const dv=x=>/^\d{4}-\d{2}-\d{2}$/.test(x.fe)?Date.parse(x.fe):null;
const U=v=>v===null||v===undefined||isNaN(v);
const by=(f,d)=>(a,b)=>{const x=f(a),y=f(b);if(U(x)&&U(y))return 0;if(U(x))return 1;if(U(y))return -1;return d*(x-y)};
const SORTS={best:by(effBest,1),worst:by(effBest,-1),kasc:by(x=>x.k,1),kdesc:by(x=>x.k,-1),pasc:by(x=>x.pvp,1),pdesc:by(x=>x.pvp,-1),name:(a,b)=>a.n.localeCompare(b.n,"es"),dasc:by(dv,1),ddesc:by(dv,-1)};
function applyFilters(P,q){let A=P.filter(x=>x.n.toLowerCase().includes(q));
if(FL.k.size)A=A.filter(x=>FL.k.has(String(x.k>0?x.k:0)));
if(FL.t.size)A=A.filter(x=>{const t=tagsOf(x);return [...FL.t].every(n=>t.has(n))});
if(FL.f.has("hall"))A=A.filter(x=>S.finds.some(z=>z.n===x.n));
if(FL.f.has("disp"))A=A.filter(x=>S.finds.some(z=>z.n===x.n&&z.a!==false));
if(FL.f.has("sealed"))A=A.filter(x=>S.sealed[x.n]);
if(FL.f.has("ok"))A=A.filter(x=>{const e=effBest(x);return e!==null&&e<=S.ok});
if(SORTS[FL.so])A=A.slice().sort(SORTS[FL.so]);return A}
function buildFilters(P){const fc=$("fc");fc.innerHTML="";
const grp=(title,items,set)=>{if(!items.length)return;const g=document.createElement("div");g.className="fg";const t=document.createElement("span");t.textContent=title;g.appendChild(t);items.forEach(it=>{const b=document.createElement("button");b.type="button";b.className="chip"+(set.has(it.v)?" on":"");b.textContent=it.l;b.onclick=()=>{set.has(it.v)?set.delete(it.v):set.add(it.v);render()};g.appendChild(b)});fc.appendChild(g)};
const ks=[...new Set(P.map(x=>x.k>0?x.k:0))].sort((a,b)=>a-b);
grp("Sobres",ks.map(k=>({v:String(k),l:k===0?"Sin sobres":k+(k===1?" sobre":" sobres")})),FL.k);
grp("Extras",KS_TAGS.map(t=>t[0]).filter(n=>P.some(x=>tagsOf(x).has(n))).map(n=>({v:n,l:n})),FL.t);
grp("Estado",[{v:"hall",l:"Con hallazgos"},{v:"disp",l:"Disponible"},{v:"sealed",l:"\uD83D\uDCE6 Lo tengo"},{v:"ok",l:"Dentro del ideal"}],FL.f);
const n=FL.k.size+FL.t.size+FL.f.size;$("fsum").textContent="Filtros"+(n?" ("+n+")":"");
if(n){const b=document.createElement("button");b.type="button";b.className="clr";b.textContent="Quitar filtros";b.onclick=()=>{FL.k.clear();FL.t.clear();FL.f.clear();render()};fc.appendChild(b)}}
function render(){hdr();fillShops();const keep={};document.querySelectorAll("#list .card").forEach(c=>{const i=c.querySelector(".pp");if(i)keep[c.dataset.n]=i.value});const q=$("q").value.toLowerCase(),L=$("list"),P=parse(),sel=$("fs").value;L.innerHTML="";$("pl").innerHTML="";P.forEach(x=>{const o=document.createElement("option");o.value=x.n;$("pl").appendChild(o)});
$("fs").innerHTML="";P.forEach(x=>{const o=document.createElement("option");o.textContent=x.n;$("fs").appendChild(o)});{const o=document.createElement("option");o.value="__new__";o.textContent="+ Crear producto nuevo...";$("fs").appendChild(o)}if(sel)$("fs").value=sel;$("np").hidden=$("fs").value!=="__new__";
buildFilters(P);$("so").value=FL.so;const A=applyFilters(P,q);$("cnt").textContent=A.length===P.length?P.length+" productos":A.length+" de "+P.length;
if(!A.length){const e=document.createElement("p");e.className="hint empty";e.textContent=P.length?"Ning\u00fan producto coincide con la b\u00fasqueda o los filtros.":"Esta expansi\u00f3n no tiene productos todav\u00eda. A\u00f1\u00e1delos en el cat\u00e1logo o con \u00abA\u00f1adir hallazgo\u00bb.";L.appendChild(e)}
A.forEach(x=>{
const c=document.createElement("div");c.className="card";c.dataset.n=x.n;
c.innerHTML=`<div class="top"><button class="th" type="button" aria-label="Foto"></button><div class="tt"><b class="nm"></b><span class="mt"></span></div><button class="x av own" type="button"></button></div><div class="lim"></div><div class="row"><input class="pp" inputmode="decimal" placeholder="Precio \u20ac en tienda" aria-label="Precio en tienda"><div class="res">\u2014</div></div><div class="brk"></div><details class="fd"><summary></summary><ul></ul></details><details class="mo"><summary>Detalles</summary><div class="desc"></div><div class="desc org"></div><div class="rel"><span class="k">Salida</span><input type="date" class="dt"><span class="ds"></span></div><div class="phr"><input class="pu" type="url" placeholder="URL de la foto (https://\u2026)" aria-label="URL de la foto"><button type="button" class="pg">Guardar</button><button type="button" class="pf">Subir</button><a class="sr" target="_blank" rel="noopener noreferrer" aria-label="Buscar foto">&#128269;</a></div><details class="sh"><summary>Buscar en tiendas</summary><div class="shl"></div></details><div class="acts"><button class="nx"></button><button class="rm">Eliminar producto</button></div></details>`;
c.querySelector(".nm").textContent=x.n;
const mt=c.querySelector(".mt"),mtx=()=>{const fe=(S.dates&&Object.prototype.hasOwnProperty.call(S.dates,x.n))?S.dates[x.n]:x.fe;mt.textContent=[x.k>0?x.k+(x.k===1?" sobre":" sobres"):"sin sobres",x.lg,/^\d{4}-\d{2}-\d{2}$/.test(fe)?fmtDate(fe):""].filter(Boolean).join(" \u00b7 ")};mtx();
c.querySelector(".lim").innerHTML=x.k>0?`Verde \u2264 <b>${f(S.ok*x.k+x.xt)} \u20ac</b> \u00b7 M\u00e1x <b>${f(S.mx*x.k+x.xt)} \u20ac</b>`:(x.pvp?`Referencia: PVP <b>${f(x.pvp)} \u20ac</b> (verde \u2264 +10 %, \u00e1mbar \u2264 +30 %)`:"Solo referencia, sin PVP en \u20ac");
const ow=c.querySelector(".own"),owp=()=>{const on=!!S.sealed[x.n];ow.textContent="\uD83D\uDCE6";ow.classList.toggle("on",on);ow.title=on?"Lo tengo sin abrir (solo informativo): pulsa para quitar la marca":"Sin marcar (solo informativo): pulsa si tienes este producto sin abrir";ow.setAttribute("aria-pressed",on?"true":"false")};owp();ow.onclick=()=>{if(S.sealed[x.n])delete S.sealed[x.n];else S.sealed[x.n]=true;save();owp()};
const th=c.querySelector(".th"),pu=c.querySelector(".pu"),setTh=()=>{const src=(S.imgUrl&&S.imgUrl[x.n])||x.ph||S.imgs[x.n];th.textContent="";if(src){const im=document.createElement("img");im.alt="";im.loading="lazy";im.referrerPolicy="no-referrer";im.onerror=()=>{th.textContent="\uD83D\uDCF7"};im.src=src;th.appendChild(im)}else th.textContent="\uD83D\uDCF7"};setTh();pu.value=(S.imgUrl&&S.imgUrl[x.n])||x.ph||"";
th.onclick=()=>{c.querySelector(".mo").open=true;pu.focus()};
c.querySelector(".pg").onclick=()=>{const v=pu.value.trim();if(!v){delete S.imgUrl[x.n]}else{try{const U2=new URL(v);if(!/^https?:$/.test(U2.protocol))throw 0;S.imgUrl[x.n]=U2.href}catch(e){pu.setCustomValidity("Enlace no v\u00e1lido");pu.reportValidity();setTimeout(()=>pu.setCustomValidity(""),1500);return}}save();setTh()};
c.querySelector(".pf").onclick=()=>{phT=x.n;$("ph").click()};c.querySelector(".sr").href="https://www.google.com/search?tbm=isch&q="+encodeURIComponent(EXP_Q+" "+x.n);
chipsFor(c);
const nx=c.querySelector(".nx");nx.textContent=x.off?"Extras no contados":"Extras contados";nx.className="nx"+(x.off?" on":"");nx.onclick=()=>{S.noex[x.n]=!S.noex[x.n];save();render()};
const rm=c.querySelector(".rm");let arm=0;rm.onclick=()=>{if(!arm){arm=1;rm.textContent="\u00bfSeguro? Pulsa otra vez";setTimeout(()=>{arm=0;rm.textContent="Eliminar producto"},3000);return}
const L2=S.csv.split("\n"),ix=L2.findIndex(l=>l.trim()&&l.trim()[0]!=="#"&&l.split(";")[0]===x.n);if(ix>=0)L2.splice(ix,1);S.csv=L2.join("\n");S.finds=S.finds.filter(z=>z.n!==x.n);delete S.imgs[x.n];delete S.imgUrl[x.n];delete S.noex[x.n];delete S.sealed[x.n];save();$("csv").value=S.csv;render()};
c.querySelector(".desc").textContent=x.ex.length?"Trae ("+x.lg+"): "+x.ex.map(e=>x.k>0?`${e.d} \u2248 ${f(e.v)} \u20ac`:e.d).join(" \u00b7 "):"Solo sobres";
c.querySelector(".org").textContent=x.or?"Origen: "+x.or:"";
const dt=c.querySelector(".dt"),ds=c.querySelector(".ds");dt.value=/^\d{4}-\d{2}-\d{2}$/.test(x.fe)?x.fe:"";const upd=()=>{const v=dt.value;if(!v){ds.textContent="";ds.className="ds";return}const d=new Date(v+"T00:00:00"),t=new Date();t.setHours(0,0,0,0);const n=Math.round((d-t)/864e5);ds.className="ds "+(n<=0?"now":"fut");ds.textContent=n<=0?"a la venta":"sale en "+n+(n===1?" d\u00eda":" d\u00edas")};upd();dt.onchange=()=>{S.dates[x.n]=dt.value;save();upd();mtx()};
const i=c.querySelector(".pp");i.addEventListener("input",()=>paint(x,c));if(keep[x.n])i.value=keep[x.n];
L.appendChild(c);paint(x,c);finds(x,c);if(q&&x.n.toLowerCase()===q)c.querySelector(".fd").open=true})}
let phT=null;
$("ph").onchange=e=>{const fl=e.target.files[0];e.target.value="";if(!fl||!phT)return;const n=phT,fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const r=Math.min(1,160/Math.max(img.width,img.height)),cv=document.createElement("canvas");cv.width=Math.round(img.width*r);cv.height=Math.round(img.height*r);cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);S.imgs[n]=cv.toDataURL("image/jpeg",0.72);save();render()};img.src=fr.result};fr.readAsDataURL(fl)};
const baseShop=s=>String(s||"").replace(/\s*\(.*\)\s*$/,"").trim();
function shops(){const out=STORES.slice(),low=new Set(out.map(x=>x.toLowerCase()));S.finds.forEach(z=>{const b=baseShop(z.s);if(b&&!low.has(b.toLowerCase())){low.add(b.toLowerCase());out.push(b)}});return out}
function fillShops(){$("shops").innerHTML="";shops().forEach(st=>{const o=document.createElement("option");o.value=st;$("shops").appendChild(o)})}
function chipsFor(c){const shl=c.querySelector(".shl");shl.innerHTML="";shops().forEach(st=>{const a=document.createElement("a");a.textContent=st;a.target="_blank";a.rel="noopener noreferrer";a.href="https://www.google.com/search?q="+encodeURIComponent(EXP_Q+" "+c.dataset.n+" "+st);shl.appendChild(a)})}
function free(){const k=num($("fk").value),p=num($("fp").value),r=$("fr"),c=$("free");c.classList.remove("ok","wa","ko");
if(!k||p===null){r.className="res";r.textContent="—";return}const v=verdict(p/k);r.className="res "+v;r.textContent=f(p/k)+" €/sobre · "+LBL[v];c.classList.add(v)}
$("fs").onchange=()=>{const v=$("fs").value;$("np").hidden=v!=="__new__";if(v!=="__new__"){$("q").value=v;render()}};
let fa=true;$("fa").onclick=()=>{fa=!fa;$("fa").innerHTML=fa?"&#9989; Disponible":"&#128683; No disponible"};
$("fb").onclick=()=>{let n=$("fs").value;const s=$("ft").value.trim(),p=num($("fpr").value);if(!n||!s||p===null)return;
if(n==="__new__"){const nm=$("nn").value.trim().replace(/[;|\n]/g," "),kk=num($("nk").value);if(!nm||kk===null||kk<0)return;if(!parse().some(x=>x.n.trim()===nm)){S.csv=S.csv.replace(/\s*$/,"")+"\n"+nm+";"+kk+";;"+$("ne").value.trim().replace(/;/g," ");$("csv").value=S.csv}if($("nd").value){S.dates[nm]=$("nd").value}$("nd").value="";n=nm;$("nn").value="";$("nk").value="";$("ne").value=""}
let u="";try{const U=new URL($("fu").value.trim());if(/^https?:$/.test(U.protocol))u=U.href}catch(e){}
S.finds.push({n,s,p,u,a:fa,l:$("fl").value,t:Date.now()});save();fa=true;$("fa").innerHTML="&#9989; Disponible";$("ft").value="";$("fpr").value="";$("fu").value="";$("q").value=n;render();$("fs").value=n;$("np").hidden=true};
function buildFx(){$("fx").innerHTML="";Object.keys(S.fx).forEach(k=>{const l=document.createElement("label"),i=document.createElement("input");l.textContent=k;i.inputMode="decimal";i.value=String(S.fx[k]).replace(".",",");i.oninput=()=>{const n=num(i.value);if(n){S.fx[k]=n;save();render()}};l.appendChild(i);$("fx").appendChild(l)})}
$("ok").oninput=()=>{const n=num($("ok").value);if(n){S.ok=n;save();render();free()}};
$("mx").oninput=()=>{const n=num($("mx").value);if(n){S.mx=n;save();render();free()}};
$("q").oninput=render;$("so").onchange=()=>{FL.so=$("so").value;render()};$("fk").oninput=free;$("fp").oninput=free;
$("apply").onclick=()=>{S.csv=$("csv").value;save();render()};
$("rs").onclick=()=>{S.csv=DEF;$("csv").value=DEF;save();render()};
$("cp").onclick=()=>{try{navigator.clipboard.writeText($("csv").value)}catch(e){$("csv").select()}};
const packOne=(d,s,wi)=>{const o={v:3,id:d.id,game:gameOf(d),serie:d.serie||"",name:d.name,q:d.q||d.name,rel:d.rel||[],rev:d.rev||1,ok:s.ok,mx:s.mx,csv:s.csv,finds:s.finds,fx:s.fx,noex:s.noex,sealed:s.sealed,imgUrl:s.imgUrl,dates:s.dates};if(wi)o.imgs=s.imgs;return o};
const getState=d=>d===cur?S:loadState(d);
const pack=()=>JSON.stringify(packOne(cur,S,$("wi").checked));
const packAll=()=>JSON.stringify({v:3,all:true,exps:EXPS.filter(d=>d===cur||LS.get("s."+d.id)).map(d=>packOne(d,getState(d),$("wi").checked))});
const say=t=>{$("st").textContent=t};
function dl(name,text){try{const b=new Blob([text],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);return true}catch(e){return false}}
$("ex").onclick=()=>{const t=pack();$("dt").value=t;say(dl("boostermath-"+cur.id+".json",t)?"Exportado.":"Copia el texto de arriba.")};
$("exa").onclick=()=>{const t=packAll();$("dt").value=t;say(dl("boostermath-todo.json",t)?"Exportado (todas las expansiones con datos).":"Copia el texto de arriba.")};
$("ec").onclick=()=>{const t=$("dt").value||pack();$("dt").value=t;try{navigator.clipboard.writeText(t).then(()=>say("Copiado."),()=>{$("dt").select();say("Selecciona y copia el texto.")})}catch(e){$("dt").select();say("Selecciona y copia el texto.")}};
$("fi").onchange=e=>{const fl=e.target.files[0];if(!fl)return;const fr=new FileReader();fr.onload=()=>{$("dt").value=fr.result;say("Archivo cargado: pulsa Importar.")};fr.readAsText(fl)};
function importExp(o){
if(!o||typeof o.csv!=="string"||!Array.isArray(o.finds))return null;
let d=null;
if(o.id&&/^[\w.-]+$/.test(String(o.id))){d=EXPS.find(e=>e.id===o.id);
if(!d){d={id:String(o.id),name:String(o.name||o.id),q:String(o.q||o.name||o.id),rel:Array.isArray(o.rel)?o.rel.filter(r=>Array.isArray(r)&&r.length>=2).map(r=>[String(r[0]),String(r[1])]):[],rev:1,ok:o.ok,mx:o.mx,csv:o.csv,fx:o.fx,finds:[],custom:true,serie:o.serie?String(o.serie):"",game:GAMES.some(g=>g.id===o.game)?o.game:meta.game};EXPS.push(d);meta.custom.push(d);LS.set("meta",meta)}}
else d=cur;
const s=getState(d);
if(num(o.ok))s.ok=num(o.ok);if(num(o.mx))s.mx=num(o.mx);s.csv=o.csv;if(o.noex&&typeof o.noex==="object")s.noex=o.noex;if(o.sealed&&typeof o.sealed==="object")Object.assign(s.sealed,o.sealed);if(o.imgUrl&&typeof o.imgUrl==="object")Object.keys(o.imgUrl).forEach(k=>{if(/^https?:\/\//.test(String(o.imgUrl[k])))s.imgUrl[k]=String(o.imgUrl[k])});if(o.dates&&typeof o.dates==="object")Object.assign(s.dates,o.dates);if(o.fx&&typeof o.fx==="object")s.fx=Object.assign(s.fx,o.fx);
const seen=new Set(s.finds.map(z=>[z.n,z.s,z.p,z.u].join("|")));let add=0;
o.finds.forEach(z=>{if(z&&z.n&&z.s&&isFinite(z.p)){const k=[z.n,z.s,z.p,z.u||""].join("|");if(!seen.has(k)){seen.add(k);s.finds.push({n:String(z.n),s:String(z.s),p:Number(z.p),a:z.a!==false,h:Array.isArray(z.h)?z.h.slice(-10):undefined,l:/^(ES|EN|JP|KO|ZH)$/.test(z.l)?z.l:undefined,t:Number(z.t)||undefined,u:/^https?:\/\//.test(z.u||"")?z.u:""});add++}}});
if(o.imgs&&typeof o.imgs==="object")Object.keys(o.imgs).forEach(k=>{if(String(o.imgs[k]).startsWith("data:image/"))s.imgs[k]=o.imgs[k]});
LS.set("s."+d.id,s);if(d===cur)S=s;return{d,add}}
$("im").onclick=()=>{let o;try{o=JSON.parse($("dt").value)}catch(e){say("El texto no es un export válido.");return}
const list=o&&o.all&&Array.isArray(o.exps)?o.exps:[o];let add=0,n=0,last=null;
list.forEach(x=>{const r=importExp(x);if(r){add+=r.add;n++;last=r.d}});
if(!last){say("El texto no es un export válido.");return}
openExp(last);say("Importado: "+n+(n===1?" expansión, ":" expansiones, ")+add+" hallazgos nuevos.")};
const gameOf=d=>d.game&&GAMES.some(g=>g.id===d.game)?d.game:(meta.game||(GAMES[0]&&GAMES[0].id)||"tcg");
const dlgOpen=d=>{try{d.showModal()}catch(e){d.setAttribute("open","")}};const dlgClose=d=>{try{d.close()}catch(e){d.removeAttribute("open")}};
function buildGames(){const g=$("games");g.innerHTML="";GAMES.forEach(x=>{const b=document.createElement("button");b.type="button";b.className="gp"+(x.id===meta.game?" on":"");b.textContent=(x.icon?x.icon+" ":"")+x.name;b.onclick=()=>{if(x.id===meta.game)return;const pool=EXPS.filter(e=>gameOf(e)===x.id),last=pool.find(e=>e.id===meta.last[x.id])||pool[0];if(last)openExp(last);else{meta.game=x.id;LS.set("meta",meta);buildGames();updPicker()}};g.appendChild(b)})}
function updPicker(){$("xpn").textContent=cur&&gameOf(cur)===meta.game?cur.name:"Sin expansiones: crea una";$("xps2").textContent=cur&&gameOf(cur)===meta.game?[cur.serie,EXPS.filter(e=>gameOf(e)===meta.game).length+" expansiones"].filter(Boolean).join(" \u00b7 "):""}
function fillPicker(){const box=$("xpl"),q=norm($("xps").value),pool=EXPS.filter(e=>gameOf(e)===meta.game),match=e=>norm(e.name+" "+(e.serie||"")+" "+e.id).includes(q);box.innerHTML="";
const grp=(title,list)=>{if(!list.length)return;const h=document.createElement("div");h.className="pgh";h.textContent=title;box.appendChild(h);list.forEach(e=>{const b=document.createElement("button");b.type="button";b.className="pi"+(e===cur?" on":"");const n=document.createElement("b"),m=document.createElement("span");n.textContent=e.name;m.textContent=[e.serie,e.rel&&e.rel[0]?fmtDate(e.rel[0][1]):"",e.custom?"propia":""].filter(Boolean).join(" \u00b7 ");b.append(n,m);b.onclick=()=>{dlgClose($("xpd"));openExp(e)};box.appendChild(b)})};
const rec=meta.recent.map(id=>pool.find(e=>e.id===id)).filter(e=>e&&match(e));if(!q&&rec.length>1)grp("Recientes",rec);
const bs={};pool.filter(match).forEach(e=>{(bs[e.serie||"Otras"]=bs[e.serie||"Otras"]||[]).push(e)});Object.keys(bs).forEach(k=>grp(k,bs[k]));
if(!box.children.length){const p=document.createElement("p");p.className="hint";p.textContent="Sin resultados.";box.appendChild(p)}}
$("xpb").onclick=()=>{$("xps").value="";fillPicker();dlgOpen($("xpd"));$("xps").focus()};$("xps").oninput=fillPicker;$("xpx").onclick=()=>dlgClose($("xpd"));$("xpd").onclick=e=>{if(e.target===$("xpd"))dlgClose($("xpd"))};
function openExp(d){cur=d;S=loadState(d);EXP={name:d.name,dates:d.rel||[]};EXP_Q=d.q||d.name;DEF=d.csv||CUSTOM_CSV;meta.cur=d.id;meta.game=gameOf(d);meta.last[meta.game]=d.id;meta.recent=[d.id].concat(meta.recent.filter(x=>x!==d.id)).slice(0,5);LS.set("meta",meta);
FL.so="cat";FL.k.clear();FL.t.clear();FL.f.clear();
$("ok").value=String(S.ok).replace(".",",");$("mx").value=String(S.mx).replace(".",",");$("csv").value=S.csv;$("q").value="";$("dt").value="";say("");$("fxn").textContent=d.fxNote||"Editables.";
buildGames();updPicker();buildFx();render();free();try{history.replaceState(null,"","#"+d.id)}catch(e){}}
$("nxc").onclick=()=>{const nm=$("nxn").value.trim().replace(/[;|\n]/g," ");if(!nm)return;let id=nm.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"expansion",b=id,i=2;while(EXPS.some(e=>e.id===id))id=b+"-"+i++;
const d={id,name:nm,q:nm,rel:[],rev:1,ok:6,mx:7.5,csv:CUSTOM_CSV,fx:Object.assign({},cur?S.fx:FX0),finds:[],custom:true,game:meta.game||(GAMES[0]&&GAMES[0].id)};EXPS.push(d);meta.custom.push(d);LS.set("meta",meta);$("nxn").value="";dlgClose($("xpd"));openExp(d)};
let rxArm=0;$("rx").onclick=()=>{const b=$("rx");if(!rxArm){rxArm=1;b.textContent="\u00bfSeguro? Pulsa otra vez";setTimeout(()=>{rxArm=0;b.textContent="Restablecer expansi\u00f3n"},3000);return}
rxArm=0;b.textContent="Restablecer expansi\u00f3n";LS.del("s."+cur.id);
if(cur.custom){EXPS=EXPS.filter(e=>e!==cur);meta.custom=meta.custom.filter(e=>e.id!==cur.id);LS.set("meta",meta);if(!EXPS.length)EXPS.push(newBlank());openExp(EXPS.find(e=>gameOf(e)===meta.game)||EXPS[0])}else openExp(cur)};
const newBlank=()=>({id:"mi-expansion",name:"Mi expansi\u00f3n",q:"Mi expansi\u00f3n",rel:[],rev:1,ok:6,mx:7.5,csv:CUSTOM_CSV,fx:Object.assign({},FX0),finds:[],custom:true,game:GAMES[0]&&GAMES[0].id});
$("help").open=ui.help!==false;$("help").addEventListener("toggle",()=>{ui.help=$("help").open;saveUi()});
$("gd").onclick=()=>{$("datos").open=true};$("cka").onclick=()=>{ui.ck=1;saveUi();dlgClose($("ck"))};
let ip=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();ip=e;$("ins").hidden=false});$("ins").onclick=async()=>{if(!ip)return;ip.prompt();try{await ip.userChoice}catch(e){}ip=null;$("ins").hidden=true};window.addEventListener("appinstalled",()=>{$("ins").hidden=true});
if("serviceWorker" in navigator&&/^https?:/.test(location.protocol))navigator.serviceWorker.register("sw.js").catch(()=>{});
async function init(){
const defs=[];let fail=false;
try{const gj=await (await fetch("data/games.json",{cache:"no-cache"})).json();GAMES=(Array.isArray(gj)?gj:gj.games||[]).filter(g=>g&&g.id);
const jobs=[];GAMES.forEach(g=>(g.expansions||[]).forEach(f=>jobs.push(fetch("data/"+f,{cache:"no-cache"}).then(r=>{if(!r.ok)throw 0;return r.json()}).then(v=>{v.game=g.id;return v}))));
const rs=await Promise.allSettled(jobs);rs.forEach(r=>{if(r.status==="fulfilled"&&r.value&&r.value.id&&typeof r.value.csv==="string")defs.push(r.value);else fail=true})}catch(e){fail=true}
if(!GAMES.length)GAMES=[{id:"pokemon",name:"Pok\u00e9mon",icon:"\u26A1"}];
if(fail){$("ld").hidden=false;$("ld").textContent=defs.length?"Alguna expansi\u00f3n no se pudo cargar.":"No se pudieron cargar las expansiones. Si abriste el archivo directamente, sirve la carpeta con un servidor local (python3 -m http.server) o usa GitHub Pages. Mientras, puedes crear o importar expansiones."}
EXPS=defs.slice();meta.custom.forEach(c=>{if(!EXPS.some(e=>e.id===c.id))EXPS.push(Object.assign({},c,{custom:true}))});
if(!meta.game||!GAMES.some(g=>g.id===meta.game))meta.game=GAMES[0].id;
if(!EXPS.length)EXPS.push(newBlank());
const h=decodeURIComponent((location.hash||"").slice(1));
const start=EXPS.find(e=>e.id===h)||EXPS.find(e=>e.id===meta.cur)||EXPS.find(e=>gameOf(e)===meta.game)||EXPS[0];
openExp(start);
if(!ui.ck)dlgOpen($("ck"))}
init().catch(e=>{const l=document.getElementById("ld");l.hidden=false;l.textContent="Error al iniciar ("+BM_VER+"): "+(e&&e.message||e)});
