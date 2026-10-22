/* Mapa do MoneyPrinterOmni: leitor do vault (notas .md e .canvas) sem dependências.
   Dados em data.js (gerado por tools/build_site.py). Rota: #/<idioma>/<id>, ex.: #/pt-BR/c02. */
(function () {
  "use strict";
  const DATA = window.MAPA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const LANGS = ["pt-BR", "en"];
  const SECTION_ORDER = ["walk", "concept", "ref"];

  const UI = {
    "pt-BR": {
      brand: "Mapa do MoneyPrinterOmni", search: "Buscar notas…", home: "Início", toc: "Nesta página", prev: "Anterior", next: "Próxima",
      stable: "estável", unstable: "unstable", sources: "Fontes", open: "Abrir canvas", fit: "Ajustar", noRes: "Nada encontrado",
      eyebrow: "Apostila 4D · Mapa do projeto", title: "Como o MoneyPrinterOmni funciona",
      lead: "Do pedido ao vídeo: a lógica do pipeline, as integrações, o harness de agentes e a organização do repositório, em notas curtas ligadas entre si e canvas que desenham cada fluxo.",
      start: "Por onde começar", overview: "O mapa geral", index: "Índice completo", notes: "notas", canvases: "canvas",
      blurb: {
        walk: "Casos resolvidos do começo ao fim: um vídeo pela API, CLI, WebUI e pelo time de agentes.",
        concept: "A teoria por trás: pipeline, integrações, harness, branches. Cada nota tem prática com gabarito.",
        ref: "Tabelas conferidas no código: rotas, flags, chaves de configuração, provedores, contratos e papéis.",
        canvas: "Fluxos desenhados: clique nos blocos, arraste e use o zoom.",
      },
    },
    en: {
      brand: "MoneyPrinterOmni Map", search: "Search notes…", home: "Home", toc: "On this page", prev: "Previous", next: "Next",
      stable: "stable", unstable: "unstable", sources: "Sources", open: "Open canvas", fit: "Fit", noRes: "Nothing found",
      eyebrow: "4D Study Guide · Project map", title: "How MoneyPrinterOmni works",
      lead: "From request to video: the pipeline logic, integrations, the agent harness and how the repository is organised, in short linked notes and canvases that draw each flow.",
      start: "Where to start", overview: "The big picture", index: "Full index", notes: "notes", canvases: "canvases",
      blurb: {
        walk: "Worked cases from start to finish: a video through the API, CLI, WebUI and the agent team.",
        concept: "The theory behind it: pipeline, integrations, harness, branches. Every note has practice with an answer key.",
        ref: "Tables checked against the code: routes, flags, config keys, providers, contracts and roles.",
        canvas: "Drawn flows: click the blocks, drag and zoom.",
      },
    },
  };

  /* ---------- estado ---------- */
  let lang = pickLang();
  let current = { id: "home" };

  function pickLang() {
    const h = location.hash.match(/^#\/(pt-BR|en)\b/);
    if (h) return h[1];
    try { const s = localStorage.getItem("mapa-lang"); if (LANGS.includes(s)) return s; } catch (e) { /* sem storage */ }
    return (navigator.language || "").toLowerCase().startsWith("pt") ? "pt-BR" : "en";
  }
  const L = () => DATA.langs[lang];
  const T = () => UI[lang];
  const noteById = (id, lg = lang) => DATA.langs[lg].notes.find((n) => n.id === id);
  const canvasById = (id, lg = lang) => DATA.langs[lg].canvases.find((c) => c.id === id);

  /* ---------- markdown ---------- */
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const stripMd = (s) => s.replace(/[`*_=]|\[\[|\]\]|%%/g, "");

  function resolveLink(raw) {
    const [target, alias] = raw.split("|");
    const name = target.split("#")[0].trim();
    const label = (alias || name).trim();
    const lg = L();
    if (name === lg.index.title) return { href: "#/" + lang, label };
    const n = lg.notes.find((x) => x.title === name);
    if (n) return { href: `#/${lang}/${n.id}`, label };
    const base = name.replace(/\.canvas$/, "");
    const c = lg.canvases.find((x) => x.title === base);
    if (c) return { href: `#/${lang}/${c.id}`, label };
    return { href: null, label };
  }

  function inline(s) {
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return "\u0000" + (codes.length - 1) + "\u0000"; });
    s = esc(s).replace(/%%.*?%%/g, "");
    s = s.replace(/\[\[([^\]]+)\]\]/g, (m, t) => {
      const r = resolveLink(t.replace(/&amp;/g, "&"));
      return r.href ? `<a href="${r.href}">${r.label}</a>` : `<span class="broken">${r.label}</span>`;
    });
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/==([^=]+)==/g, "<mark>$1</mark>");
    return s.replace(/\u0000(\d+)\u0000/g, (m, i) => "<code>" + esc(codes[+i]) + "</code>");
  }

  const LIST_ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

  function parseList(lines, i) {
    const first = lines[i].match(LIST_ITEM);
    const base = first[1].length;
    const ordered = /\d/.test(first[2]);
    let html = "";
    while (i < lines.length) {
      let m = lines[i].match(LIST_ITEM);
      if (!m && /^\s*$/.test(lines[i])) {
        const nx = lines.slice(i + 1).find((x) => !/^\s*$/.test(x));
        const mm = nx && nx.match(LIST_ITEM);
        if (mm && mm[1].length === base) { i++; continue; }
        break;
      }
      if (!m || m[1].length !== base) break;
      let text = m[3];
      i++;
      const sub = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && lines[i].match(/^(\s*)/)[1].length > base) { sub.push(lines[i]); i++; }
      let nested = "";
      const k = sub.findIndex((x) => LIST_ITEM.test(x));
      if (k >= 0) {
        const cont = sub.slice(0, k).map((x) => x.trim()).join(" ");
        if (cont) text += " " + cont;
        const nestedLines = sub.slice(k);
        const ind = nestedLines[0].match(/^(\s*)/)[1].length;
        nested = parseList(nestedLines.map((x) => x.slice(Math.min(ind, x.match(/^(\s*)/)[1].length))), 0)[0];
      } else if (sub.length) {
        text += " " + sub.map((x) => x.trim()).join(" ");
      }
      const task = text.match(/^\[( |x)\]\s+(.*)$/);
      const body = task ? `<span class="chk">${task[1] === "x" ? "☑" : "☐"}</span> ${inline(task[2])}` : inline(text);
      html += `<li>${body}${nested}</li>`;
    }
    const tag = ordered ? "ol" : "ul";
    return [`<${tag}>${html}</${tag}>`, i];
  }

  function cells(row) { return row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()); }

  function quote(buf) {
    const m = buf[0].match(/^\[!(\w+)\]([+-]?)\s*(.*)$/);
    if (!m) return `<blockquote>${md(buf.join("\n"))}</blockquote>`;
    const type = m[1].toLowerCase();
    const title = m[3] || m[1].charAt(0).toUpperCase() + m[1].slice(1);
    const body = md(buf.slice(1).join("\n"));
    if (m[2]) return `<details class="callout ${type}"${m[2] === "+" ? " open" : ""}><summary>${inline(title)}</summary>${body}</details>`;
    return `<div class="callout ${type}"><div class="ct">${inline(title)}</div>${body}</div>`;
  }

  function md(src) {
    const lines = src.replace(/\r/g, "").split("\n");
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      let m;
      if (/^```/.test(l)) {
        const buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
      } else if (/^\s*$/.test(l)) {
        i++;
      } else if ((m = l.match(/^(#{1,6})\s+(.*)$/))) {
        out.push(`<h${m[1].length} id="${slug(stripMd(m[2]))}">${inline(m[2])}</h${m[1].length}>`); i++;
      } else if (/^---+\s*$/.test(l)) {
        out.push("<hr>"); i++;
      } else if (/^>/.test(l)) {
        const buf = [];
        while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
        out.push(quote(buf));
      } else if (/^\|.*\|\s*$/.test(l) && /^\|?\s*:?-{2,}/.test(lines[i + 1] || "")) {
        const head = cells(l); i += 2;
        const rows = [];
        while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
        out.push(`<div class="tbl"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>` +
          rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("") + "</tbody></table></div>");
      } else if (LIST_ITEM.test(l)) {
        const r = parseList(lines, i); out.push(r[0]); i = r[1];
      } else {
        const buf = [l]; i++;
        while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6}\s|```|>|---+\s*$|\|)/.test(lines[i]) && !LIST_ITEM.test(lines[i])) buf.push(lines[i++]);
        out.push(`<p>${inline(buf.join(" "))}</p>`);
      }
    }
    return out.join("\n");
  }

  /* ---------- canvas (SVG) ---------- */
  const COLORS = { 1: "c1", 2: "c2", 3: "c3", 4: "c4", 5: "c5", 6: "c6" };
  const SVGNS = "http://www.w3.org/2000/svg";

  function anchor(n, side) {
    const x = n.x, y = n.y, w = n.width, h = n.height;
    return { top: [x + w / 2, y, 0, -1], bottom: [x + w / 2, y + h, 0, 1], left: [x, y + h / 2, -1, 0], right: [x + w, y + h / 2, 1, 0] }[side] || [x + w / 2, y + h / 2, 0, 0];
  }

  function canvasView(cv, cls) {
    const wrap = document.createElement("div");
    wrap.className = "cv-wrap " + (cls || "tall");
    const { nodes, edges } = cv.data;
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const pad = 70;
    const minX = Math.min(...nodes.map((n) => n.x)) - pad, minY = Math.min(...nodes.map((n) => n.y)) - pad;
    const maxX = Math.max(...nodes.map((n) => n.x + n.width)) + pad, maxY = Math.max(...nodes.map((n) => n.y + n.height)) + pad;
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);
    let html = '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow" d="M0,0 L10,5 L0,10 z"/></marker></defs><g class="vp">';
    nodes.filter((n) => n.type === "group").forEach((n) => {
      html += `<rect class="cg" x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" style="--gc:var(--${COLORS[n.color] || "c0"})"/>` +
        `<text class="cgl" x="${n.x + 18}" y="${n.y + 26}">${esc(n.label || "")}</text>`;
    });
    edges.forEach((e) => {
      const a = byId[e.fromNode], b = byId[e.toNode];
      if (!a || !b) return;
      const [x1, y1, dx1, dy1] = anchor(a, e.fromSide), [x2, y2, dx2, dy2] = anchor(b, e.toSide);
      const k = Math.max(60, Math.hypot(x2 - x1, y2 - y1) * 0.35);
      html += `<path class="ce" data-a="${e.fromNode}" data-b="${e.toNode}" marker-end="url(#ah)" d="M${x1},${y1} C${x1 + dx1 * k},${y1 + dy1 * k} ${x2 + dx2 * k},${y2 + dy2 * k} ${x2},${y2}"/>`;
      if (e.label) html += `<text class="cel" text-anchor="middle" x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}">${esc(e.label)}</text>`;
    });
    nodes.filter((n) => n.type !== "group").forEach((n) => {
      const col = COLORS[n.color] || "";
      let inner;
      if (n.type === "file") {
        const title = n.file.split("/").pop().replace(/\.md$/, "");
        inner = `<h3>↗ ${esc(title)}</h3>`;
      } else if (n.type === "link") {
        inner = `<h3>↗</h3><p>${esc(n.url)}</p>`;
      } else {
        inner = md(n.text);
      }
      html += `<foreignObject x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}"><div xmlns="http://www.w3.org/1999/xhtml" class="cn ${col} ${n.type}" data-id="${n.id}">${inner}</div></foreignObject>`;
    });
    svg.innerHTML = html + "</g>";
    wrap.appendChild(svg);
    const tools = document.createElement("div");
    tools.className = "cv-tools";
    tools.innerHTML = `<button class="btn icon" data-z="in" aria-label="+">＋</button><button class="btn icon" data-z="out" aria-label="−">－</button><button class="btn" data-z="fit">${T().fit}</button>`;
    wrap.appendChild(tools);

    const vp = $(".vp", svg);
    const vb = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    let view = { ...vb };
    const apply = () => svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
    const zoom = (f, cx, cy) => {
      const nw = Math.min(vb.w * 2, Math.max(vb.w / 6, view.w * f)), r = nw / view.w;
      view = { x: cx - (cx - view.x) * r, y: cy - (cy - view.y) * r, w: nw, h: view.h * r };
      apply();
    };
    const toSvg = (ev) => { const p = svg.getBoundingClientRect(); return [view.x + ((ev.clientX - p.left) / p.width) * view.w, view.y + ((ev.clientY - p.top) / p.height) * view.h]; };
    svg.addEventListener("wheel", (ev) => { ev.preventDefault(); const [cx, cy] = toSvg(ev); zoom(ev.deltaY > 0 ? 1.12 : 0.89, cx, cy); }, { passive: false });
    let drag = null;
    svg.addEventListener("pointerdown", (ev) => { if (ev.target.closest(".cn")) return; drag = { x: ev.clientX, y: ev.clientY, v: { ...view } }; svg.setPointerCapture(ev.pointerId); });
    svg.addEventListener("pointermove", (ev) => {
      if (!drag) return;
      const p = svg.getBoundingClientRect();
      view.x = drag.v.x - ((ev.clientX - drag.x) / p.width) * view.w; view.y = drag.v.y - ((ev.clientY - drag.y) / p.height) * view.h; apply();
    });
    svg.addEventListener("pointerup", () => { drag = null; });
    tools.addEventListener("click", (ev) => {
      const z = ev.target.closest("[data-z]"); if (!z) return;
      const cx = view.x + view.w / 2, cy = view.y + view.h / 2;
      if (z.dataset.z === "fit") { view = { ...vb }; apply(); } else zoom(z.dataset.z === "in" ? 0.8 : 1.25, cx, cy);
    });
    svg.addEventListener("click", (ev) => {
      const el = ev.target.closest(".cn"); if (!el) return;
      const n = byId[el.dataset.id];
      if (n.type === "file") {
        const name = n.file.split("/").pop().replace(/\.md$/, "");
        const note = L().notes.find((x) => x.title === name);
        if (note) location.hash = `#/${lang}/${note.id}`;
      } else if (n.type === "link") window.open(n.url, "_blank", "noopener");
      else openDrawer(md(n.text));
    });
    svg.addEventListener("mouseover", (ev) => {
      const el = ev.target.closest(".cn"); if (!el) return;
      $$(".ce", svg).forEach((p) => p.classList.toggle("hot", p.dataset.a === el.dataset.id || p.dataset.b === el.dataset.id));
    });
    svg.addEventListener("mouseout", () => $$(".ce.hot", svg).forEach((p) => p.classList.remove("hot")));
    void vp;
    return wrap;
  }

  /* ---------- views ---------- */
  const view = $("#view");

  function reveal(root) {
    const items = $$(".reveal", root);
    if (!("IntersectionObserver" in window)) { items.forEach((x) => x.classList.add("in")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    items.forEach((x) => io.observe(x));
    setTimeout(() => items.forEach((x) => x.classList.add("in")), 2500);
  }

  function statusPill(st) { return `<span class="pill ${st}">${T()[st]}</span>`; }

  function renderHome() {
    const lg = L(), t = T();
    const nNotes = lg.notes.length, nCv = lg.canvases.length;
    const cards = SECTION_ORDER.map((sec) => {
      const first = lg.notes.find((n) => n.section === sec);
      const cnt = lg.notes.filter((n) => n.section === sec).length;
      return first ? `<a class="card reveal" href="#/${lang}/${first.id}"><span class="n">${cnt} ${t.notes}</span><h3>${esc(lg.sections[sec])}</h3><p>${t.blurb[sec]}</p></a>` : "";
    }).join("") + (lg.canvases[0] ? `<a class="card reveal" href="#/${lang}/${lg.canvases[0].id}"><span class="n">${nCv} ${t.canvases}</span><h3>${esc(lg.sections.canvas)}</h3><p>${t.blurb.canvas}</p></a>` : "");
    view.innerHTML = `
      <section class="hero glass reveal"><div class="eyebrow">${t.eyebrow}</div><h1>${t.title}</h1><p class="lead">${t.lead}</p>
        <div class="chips"><span class="chip">${nNotes} ${t.notes}</span><span class="chip">${nCv} ${t.canvases}</span><span class="chip">pt-BR · en</span>${statusPill("stable")}${statusPill("unstable")}</div></section>
      <h2 class="reveal" style="font:800 22px var(--display);margin:6px 4px 12px">${t.start}</h2>
      <div class="cards">${cards}</div>
      <h2 class="reveal" style="font:800 22px var(--display);margin:6px 4px 12px">${t.overview}</h2>
      <div id="home-cv" class="reveal"></div>
      <section class="panel glass prose reveal" style="margin-top:18px"><h2>${t.index}</h2>${md(lg.index.body)}</section>`;
    const cv = canvasById("k0") || lg.canvases[0];
    if (cv) $("#home-cv").appendChild(canvasView(cv, "mid"));
    $("#toc").hidden = true;
    document.title = t.brand;
  }

  function renderNote(n) {
    const t = T(), lg = L();
    const list = lg.notes;
    const idx = list.findIndex((x) => x.id === n.id);
    const html = md(n.body);
    const parts = html.split(/(?=<h2 )/);
    const head = parts.shift();
    const meta = `<div class="meta">${statusPill(n.status)}${n.tags.map((x) => `<span class="tag">#${esc(x)}</span>`).join("")}</div>`;
    const src = n.sources.length ? `<p class="sources">${t.sources}: ${n.sources.map((s) => `<code>${esc(s)}</code>`).join(" ")}</p>` : "";
    const pager = `<nav class="pager reveal">${idx > 0 ? `<a href="#/${lang}/${list[idx - 1].id}"><small>← ${t.prev}</small>${esc(list[idx - 1].title)}</a>` : "<span></span>"}${idx < list.length - 1 ? `<a href="#/${lang}/${list[idx + 1].id}"><small>${t.next} →</small>${esc(list[idx + 1].title)}</a>` : "<span></span>"}</nav>`;
    view.innerHTML = `<article class="prose"><div class="panel glass reveal">${meta}${head}${src}</div>${parts.map((p) => `<section class="sec panel glass reveal">${p}</section>`).join("")}</article>${pager}`;
    const toc = $("#toc");
    const heads = $$("article h2", view);
    toc.hidden = !heads.length;
    toc.innerHTML = `<h4>${t.toc}</h4>` + heads.map((h) => `<a href="#" data-h="${h.id}">${h.textContent}</a>`).join("");
    document.title = `${n.title} · ${t.brand}`;
    scrollSpy(heads);
  }

  function renderCanvasPage(cv) {
    const t = T();
    view.innerHTML = `<div class="panel glass reveal"><div class="eyebrow">${esc(L().sections.canvas)}</div><h1 style="font:800 clamp(28px,4vw,40px)/1.1 var(--display);margin:6px 0 4px">${esc(cv.title)}</h1><p class="lead" style="margin:0">${t.blurb.canvas}</p></div><div id="cv-slot" class="reveal"></div>`;
    $("#cv-slot").appendChild(canvasView(cv, "tall"));
    $("#toc").hidden = true;
    document.title = `${cv.title} · ${t.brand}`;
  }

  let spy = null;
  function scrollSpy(heads) {
    if (spy) spy.disconnect();
    if (!heads.length || !("IntersectionObserver" in window)) return;
    spy = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) $$("#toc a").forEach((a) => a.classList.toggle("on", a.dataset.h === e.target.id));
    }), { rootMargin: "-20% 0px -70% 0px" });
    heads.forEach((h) => spy.observe(h));
  }

  /* ---------- sidebar, busca, drawer ---------- */
  function renderSidebar() {
    const lg = L();
    const link = (href, id, label, st) => `<a href="${href}" data-id="${id}">${st ? `<i class="dot ${st === "unstable" ? "unstable" : ""}"></i>` : ""}<span>${esc(label)}</span></a>`;
    let h = link("#/" + lang, "home", T().home);
    SECTION_ORDER.forEach((sec) => {
      const ns = lg.notes.filter((n) => n.section === sec);
      if (ns.length) h += `<details open><summary>${esc(lg.sections[sec])}</summary>${ns.map((n) => link(`#/${lang}/${n.id}`, n.id, n.title, n.status)).join("")}</details>`;
    });
    if (lg.canvases.length) h += `<details open><summary>${esc(lg.sections.canvas)}</summary>${lg.canvases.map((c) => link(`#/${lang}/${c.id}`, c.id, c.title)).join("")}</details>`;
    $("#sidebar").innerHTML = h;
  }

  function openDrawer(html) { $("#drawer-body").innerHTML = html; $("#drawer").hidden = false; }
  $("#drawer-close").addEventListener("click", () => { $("#drawer").hidden = true; });

  const q = $("#q"), results = $("#results");
  function search(text) {
    text = text.trim().toLowerCase();
    if (!text) { results.hidden = true; return; }
    const scored = L().notes.map((n) => {
      const body = stripMd(n.body).toLowerCase();
      const ti = n.title.toLowerCase().includes(text) ? 3 : 0;
      const bi = body.indexOf(text);
      return { n, s: ti + (bi >= 0 ? 1 : 0), snip: bi >= 0 ? stripMd(n.body).slice(Math.max(0, bi - 40), bi + 90).replace(/\s+/g, " ") : "" };
    }).filter((x) => x.s).sort((a, b) => b.s - a.s).slice(0, 8);
    results.innerHTML = scored.length ? scored.map((x) => `<a href="#/${lang}/${x.n.id}"><strong>${esc(x.n.title)}</strong><small>${esc(x.snip)}</small></a>`).join("") : `<a><small>${T().noRes}</small></a>`;
    results.hidden = false;
  }
  q.addEventListener("input", () => search(q.value));
  q.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { const a = $("a[href]", results); if (a) { location.hash = a.getAttribute("href"); results.hidden = true; q.blur(); } }
    if (e.key === "Escape") { results.hidden = true; q.blur(); }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) results.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "/" && document.activeElement !== q) { e.preventDefault(); q.focus(); } });
  results.addEventListener("click", () => { results.hidden = true; });

  /* ---------- roteamento ---------- */
  function route() {
    const m = location.hash.match(/^#\/(pt-BR|en)(?:\/([\w-]+))?$/);
    if (m) lang = m[1];
    const id = (m && m[2]) || "home";
    try { localStorage.setItem("mapa-lang", lang); } catch (e) { /* sem storage */ }
    document.documentElement.lang = lang;
    $("#brand-text").textContent = T().brand;
    q.placeholder = T().search;
    $("#lang").textContent = lang === "pt-BR" ? "EN" : "PT";
    renderSidebar();
    $("#drawer").hidden = true;
    document.body.classList.remove("menu-open");
    const note = noteById(id), cv = canvasById(id);
    current = { id };
    if (note) renderNote(note); else if (cv) renderCanvasPage(cv); else { current = { id: "home" }; renderHome(); }
    $$("#sidebar a").forEach((a) => a.classList.toggle("active", a.dataset.id === current.id));
    reveal(view);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }
  window.addEventListener("hashchange", route);

  $("#lang").addEventListener("click", () => {
    const next = lang === "pt-BR" ? "en" : "pt-BR";
    location.hash = current.id === "home" ? "#/" + next : `#/${next}/${current.id}`;
  });
  $("#toc").addEventListener("click", (e) => {
    const a = e.target.closest("a[data-h]"); if (!a) return;
    e.preventDefault();
    const el = document.getElementById(a.dataset.h);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  });
  $("#menu").addEventListener("click", () => document.body.classList.toggle("menu-open"));
  $("#theme").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("mapa-theme", root.dataset.theme); } catch (e) { /* sem storage */ }
  });
  try { const th = localStorage.getItem("mapa-theme"); if (th) document.documentElement.dataset.theme = th; } catch (e) { /* sem storage */ }

  /* scroll: barra de progresso, parallax do fundo e topbar */
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
      document.documentElement.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
      document.documentElement.style.setProperty("--sy", y);
      document.body.classList.toggle("scrolled", y > 8);
      ticking = false;
    });
  }, { passive: true });

  document.documentElement.classList.add("js");
  route();
})();
