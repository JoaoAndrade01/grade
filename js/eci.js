/*
 * "A ECI por trás da Grade" — experiências curtas que mostram o que se estuda no curso por trás de recursos deste site.
 * Também exporta desenhaSetas(), usado pelas setas didáticas destas experiências.
 *
 * Disciplinas com experiência (as outras ficam no backlog; COS231 · Estruturas de Dados, com o choque de horários,
 * é a próxima etapa):
 *   COS110 · Algoritmos e Programação   Histórico fictício → linhas → registros → prévia de perfil
 *   COS242 · Teoria dos Grafos          requisitos como grafo: ligação direta, cadeia, co-requisito e ciclo simulado
 *   EEL873 · Engenharia de Software     paridade JS × Python (Python PRÉ-COMPUTADO em js/demo-pdf.js)
 *
 * INDEPENDÊNCIA: as experiências usam exemplos fictícios (js/demo-pdf.js) e o currículo só para leitura (ctx.info).
 * O estado de cada experiência é temporário (recomeça a cada abertura) e nada aqui lê ou grava localStorage,
 * perfil, planejamento ou marcações.
 *
 * ctx (montado por app.js): { info(code), esc, icone, carregaScript, carregaPdfJs, curriculo, catalogo, anuncia, codigos }
 */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  // ---------------------------------------------------------------------------
  // Setas (SVG) entre elementos de um contêiner com position: relative
  // ---------------------------------------------------------------------------
  /**
   * @param {HTMLElement} container  onde o <svg> é posto (coordenadas de rolagem do próprio contêiner)
   * @param {Array<{de, para, tipo: "req"|"coreq"|"sim"}>} arestas  a seta parte do requisito e aponta para quem o exige
   * @param {(code) => Element|null} acha  elemento de cada código
   * @param {{classe?: string, destaque?: string|null, vao?: boolean}} op  destaque = código em foco (entra/sai em cores próprias);
   *        vao = false desenha curvas simples (modo "Todas", por baixo dos cartões)
   */
  function desenhaSetas(container, arestas, acha, op = {}) {
    let svg = container.querySelector(":scope > svg.setas");
    if (!arestas.length) { if (svg) svg.remove(); return; }
    if (!svg) {
      svg = document.createElementNS(NS, "svg");
      svg.setAttribute("aria-hidden", "true");
      container.appendChild(svg);
    }
    svg.setAttribute("class", `setas ${op.classe || ""}`);
    const base = container.getBoundingClientRect();
    const W = container.scrollWidth, H = container.scrollHeight;
    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const caixa = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - base.left + container.scrollLeft - container.clientLeft, y: r.top - base.top + container.scrollTop - container.clientTop, w: r.width, h: r.height };
    };
    const id = container.id || "c";
    const pontas = ["neutra", "entra", "sai", "sim"].map((k) =>
      `<marker id="${id}-ponta-${k}" class="ponta-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0,0 L10,5 L0,10 z"/></marker>`).join("");
    const caminhos = [];
    arestas.forEach((a) => {
      const ea = acha(a.de), eb = acha(a.para);
      if (!ea || !eb) return;
      const A = caixa(ea), B = caixa(eb);
      let d;
      // Destinos a mais de um vão de distância passam pelo espaço entre os cartões (acima do mais alto dos dois),
      // para não riscar o nome das disciplinas do meio.
      const vao = (sx, sy, ex, ey, s) => {
        const gy = Math.min(A.y, B.y) - 4, k = 12 * s;
        return `M${sx},${sy} C${sx + k},${sy} ${sx + k},${gy} ${sx + 2 * k},${gy} L${ex - 2 * k},${gy} C${ex - k},${gy} ${ex - k},${ey} ${ex},${ey}`;
      };
      if (B.x >= A.x + A.w - 2) {            // destino à direita (períodos seguintes)
        const sx = A.x + A.w, sy = A.y + A.h / 2, ex = B.x - 2, ey = B.y + B.h / 2, dx = Math.max(18, (ex - sx) / 2);
        d = op.vao !== false && ex - sx > 70 ? vao(sx, sy, ex, ey, 1) : `M${sx},${sy} C${sx + dx},${sy} ${ex - dx},${ey} ${ex},${ey}`;
      } else if (B.x + B.w <= A.x + 2) {     // destino à esquerda (ex.: ligação simulada "para trás")
        const sx = A.x, sy = A.y + A.h / 2, ex = B.x + B.w + 2, ey = B.y + B.h / 2, dx = Math.max(18, (sx - ex) / 2);
        d = op.vao !== false && sx - ex > 70 ? vao(sx, sy, ex, ey, -1) : `M${sx},${sy} C${sx - dx},${sy} ${ex + dx},${ey} ${ex},${ey}`;
      } else {                               // mesma coluna (celular): sai por baixo/cima
        const desce = B.y > A.y;
        const sx = A.x + A.w / 2, sy = desce ? A.y + A.h : A.y, ex = B.x + B.w / 2, ey = desce ? B.y - 2 : B.y + B.h + 2;
        const dy = Math.max(14, Math.abs(ey - sy) / 2) * (desce ? 1 : -1);
        d = `M${sx},${sy} C${sx},${sy + dy} ${ex},${ey - dy} ${ex},${ey}`;
      }
      const papel = a.tipo === "sim" ? "sim" : op.destaque ? (a.de === op.destaque ? "sai" : a.para === op.destaque ? "entra" : "neutra") : "neutra";
      caminhos.push(`<path class="halo" d="${d}"/><path class="seta ${a.tipo} ${papel}" d="${d}" marker-end="url(#${id}-ponta-${papel})"/>`);
    });
    svg.innerHTML = `<defs>${pontas}</defs>${caminhos.join("")}`;
  }

  // ---------------------------------------------------------------------------
  // Catálogo das experiências
  // ---------------------------------------------------------------------------
  const EXPERIENCIAS = {
    COS110: { code: "COS110", nome: "Algoritmos e Programação", periodo: 1, titulo: "Do PDF ao perfil",
      problema: "Você escolhe o Histórico em PDF e, segundos depois, a grade aparece pintada. Como um documento vira uma lista de disciplinas, sem sair do seu computador?" },
    COS242: { code: "COS242", nome: "Teoria dos Grafos", periodo: 4, titulo: "Por que essa seta existe?",
      problema: "MAC128 precisa de MAC118 e libera MAC238. Como o site sabe o que vem antes e o que fica liberado?" },
    EEL873: { code: "EEL873", nome: "Engenharia de Software", periodo: 6, titulo: "Dois importadores, um resultado",
      problema: "O importador existe em JavaScript (no navegador) e em Python (no terminal). Como garantir que os dois leem o mesmo Histórico do mesmo jeito?" },
  };
  const tem = (code) => EXPERIENCIAS[code] || null;

  /** Aba "A ECI por trás da Grade": como entrar e quais disciplinas têm experiência. */
  function renderSecao(ctx) {
    const { esc, icone } = ctx;
    return `<section class="eci" aria-labelledby="eci-titulo">
      <header class="eci-topo">
        <h2 id="eci-titulo">A ECI por trás da Grade</h2>
        <p>Algumas disciplinas do curso explicam como este site funciona. Cada experiência começa por um problema do site e usa
          exemplos fictícios: abrir, usar e fechar não muda seu perfil, seus planos nem suas marcações. Funciona sem perfil.</p>
      </header>
      <h3 class="eci-sub">Como entrar</h3>
      <ol class="eci-passos">
        <li>No <b>Planejador</b>, abra a aba <b>Grade</b>.</li>
        <li>Na paleta, ligue <b>${icone("eci", 14)} ECI por trás</b>. As disciplinas com experiência ficam destacadas e as outras ficam inativas.</li>
        <li>Escolha um cartão destacado. A experiência abre em tela cheia; <b>Voltar</b> ou Esc retornam ao cartão.</li>
      </ol>
      <h3 class="eci-sub">Disciplinas com experiência</h3>
      <ul class="eci-lista">
        ${Object.values(EXPERIENCIAS).map((e) => `<li>
          <div><b>${e.code} · ${esc(e.nome)}</b> <span class="chip">${e.periodo}º período</span>
            <p><b>${esc(e.titulo)}.</b> ${esc(e.problema)}</p></div>
          <button type="button" class="btn btn-sm" data-eci-abrir="${e.code}">${icone("eci", 14)} Abrir experiência</button>
        </li>`).join("")}
      </ul>
      <p class="dica">Próxima etapa: COS231 · Estruturas de Dados, com a detecção de choques de horário do Cronograma.</p>
    </section>`;
  }
  function montado(painel, ctx) {
    const sec = painel.querySelector(".eci"); if (!sec) return;
    sec.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-eci-abrir]");
      if (b) abre(b.dataset.eciAbrir, ctx, b);
    });
  }

  // ---------------------------------------------------------------------------
  // Diálogo em tela cheia (estado temporário por abertura)
  // ---------------------------------------------------------------------------
  let atual = null;          // { code, ctx, invocador, st }
  let ligado = false;
  const $d = () => document.getElementById("dlg-eci");
  const corpo = () => document.getElementById("eci-exp");

  function abre(code, ctx, invocador) {
    const e = tem(code); if (!e) return;
    const d = $d();
    if (!ligado) liga();
    atual = { code, ctx, invocador, st: estadoInicial(code) };
    document.getElementById("dlg-eci-titulo").textContent = `${e.code} · ${e.nome} · ${e.periodo}º período`;
    redesenha();
    d.showModal();
    document.getElementById("eci-voltar").focus();
  }
  function fecha() { const d = $d(); if (d.open) d.close(); }
  function estadoInicial(code) {
    if (code === "COS110") return { lido: false, sel: null, edicao: {}, interagiu: false, erro: "" };
    if (code === "COS242") return { foco: "MAC128", cursadas: [], simuladas: [], de: "MAC238", para: "MAC118", interagiu: false };
    return { js: null, cenario: "real", interagiu: false, erro: "" };
  }

  /** Redesenha o conteúdo e devolve o foco ao mesmo controle (por id ou data-*). */
  function redesenha() {
    const c = corpo(), a = document.activeElement;
    let sel = null;
    if (a && c.contains(a)) {
      if (a.id) sel = "#" + a.id;
      else { const k = [...a.attributes].find((x) => x.name.startsWith("data-")); if (k) sel = `[${k.name}="${k.value}"]`; }
    }
    const e = EXPERIENCIAS[atual.code];
    const html = atual.code === "COS110" ? expPdf() : atual.code === "COS242" ? expGrafo() : expParidade();
    c.innerHTML = `<p class="eci-problema"><span class="eci-etq">O problema</span>${atual.ctx.esc(e.problema)}</p>${html}`;
    depois();
    const el = sel && c.querySelector(sel); if (el) el.focus();
  }
  function depois() {
    const g = document.getElementById("eci-grafo");
    if (g) desenhaSetas(g, arestasGrafo(), (c) => g.querySelector(`[data-no="${c}"]`), { classe: "setas-demo", destaque: atual.st.foco });
  }
  function liga() {
    ligado = true;
    const d = $d();
    document.getElementById("eci-voltar").addEventListener("click", fecha);
    d.addEventListener("close", () => {
      const inv = atual && atual.invocador;
      const alvo = inv && inv.isConnected ? inv
        : atual && (document.querySelector(`.card[data-code="${atual.code}"]`) || document.querySelector(`[data-eci-abrir="${atual.code}"]`));
      atual = null; corpo().innerHTML = "";
      if (alvo) alvo.focus();
    });
    corpo().addEventListener("click", (ev) => clique(ev.target));
    corpo().addEventListener("change", (ev) => muda(ev.target));
    if (window.ResizeObserver) new ResizeObserver(() => { if (atual) depois(); }).observe(corpo());
  }

  // ---------------------------------------------------------------------------
  // Recursos fictícios compartilhados (PDFs de demonstração + pdf.js locais)
  // ---------------------------------------------------------------------------
  let recursos = null;
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function carregaRecursos(ctx) {
    if (recursos) return recursos;
    if (!window.DEMO_PDF) await ctx.carregaScript("js/demo-pdf.js");
    await ctx.carregaPdfJs();
    const lib = window.pdfjsLib, docs = {};
    for (const chave of ["historico", "boa"]) {
      // texto bruto da página: só para MOSTRAR o que o importador descarta (etapa ilustrativa)
      const doc = await lib.getDocument({ data: b64(window.DEMO_PDF[chave]), isEvalSupported: false, useSystemFonts: true }).promise;
      const brutas = window.SIGA.normalizarLinhas((await (await doc.getPage(1)).getTextContent()).items.map((i) => i.str));
      await doc.destroy();
      // extração real do importador (a mesma função da importação)
      const mantidas = await window.SIGA.extrairLinhasPDF(lib, b64(window.DEMO_PDF[chave]));
      docs[chave] = { brutas, mantidas };
    }
    recursos = docs;
    return recursos;
  }
  const montar = (ctx, historico, boa) => window.SIGA.montarPerfil({ historicos: [historico], boa, curriculo: ctx.curriculo,
    catalogo: ctx.catalogo, anterior: null, hoje: "2000-01-01" });
  const termo = (st, html) => st.interagiu ? `<div class="eci-termo" role="note"><span class="eci-etq">O nome disso</span>${html}</div>` : "";
  const selo = (real, txt) => `<span class="selo-etapa ${real ? "real" : "ilustrativa"}">${real ? "Importador real" : "Ilustrativo"}: ${txt}</span>`;
  const logica = (html) => `<details class="logica"><summary>Ver a lógica</summary>${html}</details>`;

  // ---------------------------------------------------------------------------
  // COS110 — Do PDF ao perfil
  // ---------------------------------------------------------------------------
  /** Reescreve uma linha do Histórico com outro grau/situação (edição ilustrativa do texto). */
  function reescreve(linha, ed) {
    const m = window.SIGA.RE.histLinha.exec(linha); if (!m) return linha;
    return `${m[1] ? m[1] + " " : ""}${m[2]} ${m[3]} ${m[4]} ${m[5]} ${ed.grau ?? m[6]} ${m[7]} ${m[8]} ${ed.sf ?? m[9]}`;
  }
  function expPdf() {
    const { esc } = atual.ctx, st = atual.st;
    if (!st.lido) return `<div class="eci-acao">
        <button type="button" class="btn btn-escuro" data-acao="ler">${atual.ctx.icone("documento", 16)} Ler o Histórico fictício</button>
        <span class="dica">O documento de demonstração já vem com o site. Nada é enviado.</span>
        ${st.erro ? `<p class="msg-campo">${esc(st.erro)}</p>` : ""}</div>
      ${logicaPdf()}`;
    const r = recursos.historico;
    const linhas = r.mantidas.map((l, i) => (st.edicao[i] ? reescreve(l, st.edicao[i]) : l));
    const antes = montar(atual.ctx, window.SIGA.lerHistorico(r.mantidas), null);
    const regs = window.SIGA.lerHistorico(linhas).registros;
    const regsAntes = window.SIGA.lerHistorico(r.mantidas).registros;
    const perfil = montar(atual.ctx, { registros: regs }, null);
    // registro de cada linha mantida (as linhas de período sozinho não viram registro)
    const regDaLinha = {}; let k = 0;
    linhas.forEach((l, i) => { if (window.SIGA.RE.histLinha.test(l)) regDaLinha[i] = k++; });
    const sel = st.sel, regSel = sel != null ? regs[regDaLinha[sel]] : null;
    const itemPrevia = (p, d) => `${p.nome}|${d.code}|${d.status || ""}|${d.nota ?? ""}`;
    const antesSet = new Set(antes.periodos.flatMap((p) => p.disciplinas.map((d) => itemPrevia(p, d))));
    const mantidaSet = new Set(r.mantidas);
    const descarte = (l) => /CPF|Aluna|Matrícula|DEMONSTRA|exemplo da Grade/i.test(l) ? "cabeçalho pessoal fictício: descartado"
      : /^Per[íi]odo C[óo]digo/.test(l) ? "cabeçalho das colunas: descartado"
        : !mantidaSet.has(l) ? "fora do formato: ignorada" : "";
    const ed = sel != null ? (st.edicao[sel] || {}) : {};
    const regOrig = sel != null ? regsAntes[regDaLinha[sel]] : null;
    return `<div class="eci-pdf">
      <div class="eci-col">
        <h2>1. Linhas lidas do PDF</h2>
        ${selo(true, "SIGA.extrairLinhasPDF")} ${selo(false, "lista do texto bruto, para mostrar o descarte")}
        <ol class="linhas-lidas">
          ${r.brutas.filter((l) => !mantidaSet.has(l)).map((l) => `<li class="descartada"><span class="sr">${esc(descarte(l))}: </span><span class="txt">${esc(l)}</span><small>${esc(descarte(l))}</small></li>`).join("")}
          ${linhas.map((l, i) => {
            const reg = regDaLinha[i] != null;
            return `<li class="${l !== r.mantidas[i] ? "mudou" : ""}">${reg
              ? `<button type="button" class="linha-btn${sel === i ? " sel" : ""}" data-linha="${i}" aria-pressed="${sel === i}">${esc(l)}</button>`
              : `<span class="linha-periodo">${esc(l)}</span><small>só o período: vale para as linhas seguintes</small>`}</li>`;
          }).join("")}
        </ol>
      </div>
      <div class="eci-col">
        <h2>2. Registros reconhecidos</h2>
        ${selo(true, "SIGA.lerHistorico")}
        <table class="tabela tabela-eci"><thead><tr><th>Período</th><th>Código</th><th>Grau</th><th>Situação</th></tr></thead><tbody>
          ${regs.map((g, j) => { const o = regsAntes[j] || {}; const m = o.grau !== g.grau || o.sf !== g.sf;
            const lin = Object.keys(regDaLinha).find((i) => regDaLinha[i] === j);
            return `<tr class="${+lin === sel ? "sel" : ""}${m ? " mudou" : ""}"><td>${esc(g.periodo)}</td><td>${esc(g.code)}</td><td>${esc(g.grau)}</td><td>${esc(g.sf)}</td></tr>`; }).join("")}
        </tbody></table>
        ${regSel ? `<fieldset class="opcoes editor-linha"><legend>Editar a linha de ${esc(regSel.code)} (exemplo)</legend>
          <label class="opcao">Nota (grau) <input class="campo campo-sm" id="ed-grau" type="number" min="0" max="10" step="0.5" value="${esc(ed.grau ?? regOrig.grau)}"></label>
          <label class="opcao">Situação <select class="campo campo-sm" id="ed-sf">${["AP", "RM", "RF"].map((s) => `<option ${s === (ed.sf ?? regOrig.sf) ? "selected" : ""}>${s}</option>`).join("")}</select></label>
          <small>AP = aprovado · RM = reprovado por média · RF = reprovado por frequência</small>
          <button type="button" class="btn btn-sm btn-ghost" data-acao="desfazer">Desfazer edições</button>
        </fieldset>` : `<p class="dica">Escolha uma linha em “Linhas lidas” para ver de onde vem cada registro e editar a nota ou a situação.</p>`}
      </div>
      <div class="eci-col">
        <h2>3. Prévia do perfil</h2>
        ${selo(true, "SIGA.montarPerfil")}
        <ul class="previa-periodos">${perfil.periodos.map((p) => `<li><b>${esc(p.nome)}</b>
          <ul>${p.disciplinas.map((d) => { const mud = !antesSet.has(itemPrevia(p, d)); const s = regSel && d.code === regSel.code;
            return `<li class="${mud ? "mudou" : ""}${s ? " sel" : ""}">${esc(d.code)}${d.status === "reprovado" ? " · reprovada" : " · aprovada"}${d.nota != null ? ` · nota ${esc(d.nota)}` : ""}${mud ? ' <span class="sr">(mudou)</span>' : ""}</li>`; }).join("")}</ul></li>`).join("")}</ul>
        <p class="dica">${Object.keys(st.edicao).length ? "Destacado: o que mudou com a sua edição." : "Repare: COS242 não aparece. A linha dela está fora do formato e o importador a ignora."}</p>
      </div>
    </div>
    <p class="dica">${selo(false, "editar a nota troca o texto da linha, como se o PDF fosse outro")} O resto da cadeia roda o importador real.</p>
    ${termo(st, `Isso é <b>análise sintática</b> (parsing): uma <b>expressão regular</b> descreve o formato de cada linha
      (período, código, nome, créditos, carga horária, grau, situação) e separa os campos. Linha que não casa com o padrão fica de fora.`)}
    ${logicaPdf()}`;
  }
  const logicaPdf = () => logica(`<pre class="pseudo">periodo ← nenhum
para cada linha do PDF:
  se é cabeçalho pessoal: descarta
  m ← RE.histLinha.casa(linha)
  se m: periodo ← m.periodo ou periodo
        registros.adiciona({periodo, código, grau, situação})
  senão: ignora a linha</pre>
    <p><b>Onde está:</b> <code>js/siga.js</code> — <code>filtrarPaginaPDF</code>, <code>RE.histLinha</code>, <code>lerHistorico</code> e <code>montarPerfil</code>
      (o mesmo em <code>ferramentas/gerar_perfil.py</code>).</p>
    <p><b>Caso de borda:</b> uma linha sem período herda o período da linha anterior (COS110 fica em 2025/1). E uma linha fora do formato,
      como a de COS242 aqui, some sem erro — por isso a importação mostra um resumo para você conferir antes de usar.</p>`);

  // ---------------------------------------------------------------------------
  // COS242 — Requisitos como grafo
  // ---------------------------------------------------------------------------
  const NOS = [[1, ["MAC118", "COS110"]], [2, ["MAC128", "MAE125"]], [3, ["MAC238", "COS231"]], [4, ["MAC248", "COS242"]], [7, ["EEL418"]]];
  const CODIGOS = NOS.flatMap(([, cs]) => cs);
  function arestasGrafo() {
    const out = [];
    CODIGOS.forEach((c) => {
      const i = atual.ctx.info(c); if (!i) return;
      i.req.filter((r) => CODIGOS.includes(r)).forEach((r) => out.push({ de: r, para: c, tipo: "req" }));
      i.coreq.filter((r) => CODIGOS.includes(r)).forEach((r) => out.push({ de: r, para: c, tipo: "coreq" }));
    });
    return out.concat(atual.st.simuladas.map((s) => ({ de: s.de, para: s.para, tipo: "sim" })));
  }
  /**
   * Analisa o grafo de pré-requisitos (reais + simulados; co-requisito não entra na cadeia).
   * Busca em profundidade com três cores: termina sempre, mesmo com ciclo, e devolve o primeiro ciclo achado.
   */
  function analisaGrafo(arestas) {
    const pre = {}; CODIGOS.forEach((c) => { pre[c] = []; });
    arestas.filter((a) => a.tipo !== "coreq").forEach((a) => pre[a.para].push(a.de));
    const cor = {}, pilha = []; let ciclo = null;
    const visita = (n) => {
      cor[n] = 1; pilha.push(n);
      pre[n].forEach((p) => {
        if (cor[p] === 1) { if (!ciclo) ciclo = pilha.slice(pilha.indexOf(p)).concat([p]).reverse(); }
        else if (!cor[p]) visita(p);
      });
      pilha.pop(); cor[n] = 2;
    };
    CODIGOS.forEach((c) => { if (!cor[c]) visita(c); });
    const memo = {};
    const cadeia = (n) => {   // só é chamada sem ciclo
      if (memo[n]) return memo[n];
      let melhor = [];
      pre[n].forEach((p) => { const c = cadeia(p); if (c.length > melhor.length) melhor = c; });
      return (memo[n] = melhor.concat([n]));
    };
    return { pre, ciclo, cadeia: (n) => (ciclo ? null : cadeia(n)) };
  }
  function expGrafo() {
    const { esc, info } = atual.ctx, st = atual.st;
    const arestas = arestasGrafo(), g = analisaGrafo(arestas);
    const f = st.foco, fi = info(f);
    const nome = (c) => { const i = info(c); return `<b>${esc(c)}</b> ${esc(i ? i.name : "")}`; };
    const lista = (cs) => (cs.length ? cs.map(nome).join(", ") : "nenhuma");
    const diretos = arestas.filter((a) => a.para === f && a.tipo !== "coreq").map((a) => a.de);
    const coreqs = arestas.filter((a) => a.para === f && a.tipo === "coreq").map((a) => a.de);
    const libera = arestas.filter((a) => a.de === f && a.tipo !== "coreq").map((a) => a.para);
    const foraReq = fi ? fi.req.filter((r) => !CODIGOS.includes(r)) : [];
    const foraLibera = atual.ctx.codigos.filter((c) => !CODIGOS.includes(c) && (info(c).req.includes(f)));
    const cad = g.cadeia(f);
    const cursada = (c) => st.cursadas.includes(c);
    const liberada = (c) => !cursada(c) && g.pre[c].every(cursada);
    const estado = (c) => (cursada(c) ? "cursada" : liberada(c) ? "liberada" : "bloqueada");
    const ROT = { cursada: "cursada (fictício)", liberada: "liberada", bloqueada: "ainda bloqueada" };
    return `<div class="eci-grafo-corpo">
      <div class="mini-grade" id="eci-grafo">
        ${NOS.map(([sem, cs]) => `<div class="mini-col"><span class="mini-sem">${sem}º período</span>
          ${cs.map((c) => `<button type="button" class="no est-${estado(c)}${c === f ? " foco" : ""}" data-no="${c}" aria-pressed="${c === f}">
            <b>${c}</b><span>${esc(info(c) ? info(c).name : "")}</span><small>${ROT[estado(c)]}</small></button>`).join("")}</div>`).join("")}
      </div>
      <p class="leg-setas"><i class="l-req"></i>pré-requisito <i class="l-coreq"></i>co-requisito <i class="l-sim"></i>ligação simulada</p>
      ${g.ciclo ? `<p class="eci-alerta" role="alert">Ciclo: ${g.ciclo.map(esc).join(" → ")}. Nenhuma ordem de períodos atende a todas as ligações,
        então não existe cadeia de pré-requisitos. O cálculo parou ao encontrar o ciclo e a grade continua utilizável.</p>` : ""}
      <div class="eci-explica" aria-live="polite">
        <h2>${nome(f)}</h2>
        <dl class="eci-dl">
          <dt><span class="l-tipo l-entra"></span>Dependência direta</dt>
          <dd>Precisa de: ${lista(diretos)}${foraReq.length ? ` (e ${foraReq.map(esc).join(", ")}, fora desta mini-grade)` : ""}.
            Libera: ${lista(libera)}${foraLibera.length ? ` (e ${foraLibera.map(esc).join(", ")}, fora da mini-grade)` : ""}.</dd>
          <dt>Cadeia de pré-requisitos</dt>
          <dd>${cad ? `${cad.map(esc).join(" → ")} (${cad.length - 1} ${cad.length - 1 === 1 ? "ligação" : "ligações"}: o mínimo de períodos antes de chegar aqui)` : "indefinida enquanto houver ciclo"}</dd>
          <dt><span class="l-tipo l-entra l-tracejada"></span>Co-requisito</dt>
          <dd>${coreqs.length ? `${lista(coreqs)}: pode ser cursada antes ou no mesmo período.` : "nenhum. Veja EEL418, que tem COS231 como co-requisito."}</dd>
        </dl>
        <div class="eci-acao">
          <button type="button" class="btn btn-sm" data-cursar="${f}" aria-pressed="${cursada(f)}">${cursada(f) ? "Desmarcar" : "Marcar"} ${esc(f)} como cursada (fictício)</button>
          <span class="dica">Liberadas agora: ${CODIGOS.filter(liberada).map(esc).join(", ") || "nenhuma"}.</span>
        </div>
      </div>
      <fieldset class="opcoes simula">
        <legend>Simular uma ligação</legend>
        <label class="opcao">De <select class="campo campo-sm" id="sim-de">${CODIGOS.map((c) => `<option ${c === st.de ? "selected" : ""}>${c}</option>`).join("")}</select></label>
        <label class="opcao">para <select class="campo campo-sm" id="sim-para">${CODIGOS.map((c) => `<option ${c === st.para ? "selected" : ""}>${c}</option>`).join("")}</select></label>
        <button type="button" class="btn btn-sm" data-acao="simular">Simular ligação</button>
        ${st.simuladas.length ? `<button type="button" class="btn btn-sm btn-ghost" data-acao="limpar-sim">Remover simulações (${st.simuladas.length})</button>` : ""}
        <small>Experimente MAC238 → MAC118: com MAC118 → MAC128 → MAC238, fecha um ciclo.</small>
      </fieldset>
      ${termo(st, `Em Teoria dos Grafos, isto é um <b>grafo dirigido</b>: as disciplinas são vértices e cada pré-requisito é uma aresta.
        Sem ciclos ele é um <b>DAG</b>, e existe uma <b>ordenação topológica</b> — uma ordem de períodos que respeita todas as setas.
        A cadeia mais longa até uma disciplina é um <b>caminho máximo</b>.`)}
      ${logica(`<pre class="pseudo">visita(v):  cor[v] ← cinza
  para cada pré-requisito p de v:
    se cor[p] = cinza: achou um ciclo (aresta de volta)
    se cor[p] = branco: visita(p)
  cor[v] ← preto
cadeia(v) = maior cadeia(p) dos pré-requisitos + [v]   (com memória)</pre>
        <p><b>Onde está:</b> requisitos em <code>js/database.js</code>; <code>montaModelo</code> e <code>destaca</code> em <code>js/app.js</code> (destaque de requisitos da Grade);
          esta análise em <code>analisaGrafo</code>, <code>js/eci.js</code>.</p>
        <p><b>Caso de borda:</b> um ciclo. A busca marca quem está “em visita” (cinza); voltar a um vértice cinza é um ciclo, e ela para ali em vez de girar para sempre.
          Co-requisito não entra na cadeia: pode ser cursado junto.</p>`)}
    </div>`;
  }

  // ---------------------------------------------------------------------------
  // EEL873 — Paridade JS × Python
  // ---------------------------------------------------------------------------
  const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object"
    ? Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {}) : v);
  function difere(a, b, caminho = "", out = []) {
    if (out.length >= 6) return out;
    if (JSON.stringify(canon(a)) === JSON.stringify(canon(b))) return out;
    if (a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b)) {
      new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => difere(a[k], b[k], Array.isArray(a) ? `${caminho}[${k}]` : `${caminho}.${k}`, out));
    } else out.push({ caminho: caminho || "(raiz)", js: a, py: b });
    return out;
  }
  const CENARIOS = {
    real: { rot: "Real: as duas implementações como estão", sim: false },
    regra: { rot: "Simulado: divergência de regra (o JavaScript passa a tratar RM como aprovado)", sim: true },
    extracao: { rot: "Simulado: divergência de extração (o pdf.js perde a linha que abre 2026/1)", sim: true },
    compartilhado: { rot: "Erro compartilhado: a linha fora do formato (COS242)", sim: false },
  };
  function rodaJs(ctx, cenario) {
    const P = window.DEMO_PARIDADE, rec = recursos;
    const regra = (h) => (cenario === "regra" ? { registros: h.registros.map((r) => (r.sf === "RM" ? { ...r, sf: "AP" } : r)) } : h);
    const ext = (ls) => (cenario === "extracao" ? ls.filter((l) => !/^2026\/1 /.test(l)) : ls);
    // A) regras: JS sobre o MESMO texto que o Python leu (pypdf)
    const regras = montar(ctx, regra(window.SIGA.lerHistorico(P.textoPypdf.historico)), window.SIGA.lerBOA(P.textoPypdf.boa));
    // B) extração: JS sobre o texto do pdf.js (leitor diferente)
    const extracao = montar(ctx, regra(window.SIGA.lerHistorico(ext(rec.historico.mantidas))), window.SIGA.lerBOA(rec.boa.mantidas));
    return { regras, extracao };
  }
  function expParidade() {
    const { esc } = atual.ctx, st = atual.st, P = window.DEMO_PARIDADE;
    if (!st.js) return `<div class="eci-acao">
        <button type="button" class="btn btn-escuro" data-acao="comparar">Rodar a comparação</button>
        <span class="dica">JavaScript roda agora, neste navegador. O resultado Python vem pronto (pré-computado).</span>
        ${st.erro ? `<p class="msg-campo">${esc(st.erro)}</p>` : ""}</div>
      ${logicaParidade()}`;
    const js = rodaJs(atual.ctx, st.cenario);
    const comp = [
      { id: "regras", nome: "Regras", oque: "JavaScript e Python sobre o mesmo texto (lido pelo pypdf)", d: difere(js.regras, P.python) },
      { id: "extracao", nome: "Extração", oque: "JavaScript com o texto do pdf.js × Python com o texto do pypdf", d: difere(js.extracao, P.python) },
    ];
    const fmt = (v) => (v === undefined ? "ausente" : JSON.stringify(v));
    const cen = CENARIOS[st.cenario];
    const linhaCos242 = P.textoPypdf.historico.split(/\r?\n/).map((l) => l.trim()).find((l) => /^COS242/.test(l));
    const explica = {
      real: "As duas comparações passam: mesmas regras e mesmo perfil com leitores independentes.",
      regra: "A comparação de <b>Regras</b> acusa: com o mesmo texto, os resultados diferem, então a diferença está nas regras. A de extração também falha, mas é a de regras que aponta a causa.",
      extracao: "Só a comparação de <b>Extração</b> acusa: as regras concordam sobre o mesmo texto, então a diferença está na leitura do PDF.",
      compartilhado: `As duas passam — e o perfil continua errado. A linha <code>${esc(linhaCos242 || "COS242 …")}</code> está fora do formato e as duas implementações a ignoram do mesmo jeito.
        O teste de paridade só compara uma implementação com a outra; um erro igual nas duas passa despercebido. Para isso existem os testes com um resultado esperado escrito à mão.`,
    }[st.cenario];
    return `<fieldset class="opcoes cenarios"><legend>Cenário</legend>
        ${Object.entries(CENARIOS).map(([k, c]) => `<label class="opcao"><input type="radio" name="eci-cenario" value="${k}"${st.cenario === k ? " checked" : ""}>
          ${c.sim ? '<span class="selo-sim">Simulado</span>' : ""} ${esc(c.rot)}</label>`).join("")}
      </fieldset>
      <div class="lados">
        <p><b>JavaScript</b> <span class="selo-etapa real">executado agora</span> js/siga.js</p>
        <p><b>Python</b> <span class="selo-etapa ilustrativa">pré-computado</span> gerado em ${esc(P.geradoEm)} com <code>${esc(P.comando)}</code></p>
      </div>
      ${cen.sim ? `<p class="aviso-sim" role="note">Cenário simulado: a mudança existe só nesta demonstração. O importador real não foi alterado.</p>` : ""}
      <table class="tabela tabela-eci"><thead><tr><th>Comparação</th><th>O que compara</th><th>Resultado</th></tr></thead><tbody>
        ${comp.map((c) => `<tr class="${c.d.length ? "falha" : "passa"}"><td><b>${c.nome}</b></td><td>${c.oque}</td>
          <td>${c.d.length ? `✗ diferentes<ul class="difs">${c.d.map((x) => `<li><code>${esc(x.caminho)}</code>: JS ${esc(fmt(x.js))} × Python ${esc(fmt(x.py))}</li>`).join("")}</ul>` : "✓ iguais"}</td></tr>`).join("")}
      </tbody></table>
      <p class="eci-explica-txt" aria-live="polite">${explica}</p>
      ${termo(st, `Isso é um <b>teste diferencial</b> (aqui chamado de teste de paridade): duas implementações independentes da mesma especificação
        servem de <b>oráculo</b> uma para a outra. Separar “mesmo texto” de “leitores diferentes” isola onde está a diferença.`)}
      ${logicaParidade()}`;
  }
  const logicaParidade = () => logica(`<pre class="pseudo">texto_py ← pypdf(pdf)
py      ← gerar_perfil.py(texto_py)
js_a    ← siga.js(texto_py)          # Regras: mesmo texto
js_b    ← siga.js(pdf.js(pdf))       # Extração: leitor diferente
exige py = js_a e py = js_b</pre>
    <p><b>Onde está:</b> <code>ferramentas/testar_paridade.sh</code>, com <code>ferramentas/gerar_perfil.py</code> e <code>ferramentas/gerar_perfil_node.js</code>.</p>
    <p><b>Caso de borda:</b> um erro compartilhado — as duas implementações erram igual — passa no teste. A paridade garante coerência, não correção.</p>`);

  // ---------------------------------------------------------------------------
  // Eventos dentro da experiência
  // ---------------------------------------------------------------------------
  async function clique(t) {
    if (!atual) return;
    const st = atual.st, ctx = atual.ctx;
    const b = t.closest("button"); if (!b) return;
    if (b.dataset.acao === "ler" || b.dataset.acao === "comparar") {
      b.disabled = true; b.textContent = "Lendo os documentos fictícios…";
      try { await carregaRecursos(ctx); if (b.dataset.acao === "ler") st.lido = true; else st.js = true; }
      catch (e) { st.erro = "Não consegui abrir os documentos de demonstração: " + e.message; }
      if (!atual || atual.st !== st) return;   // a experiência foi fechada (ou trocada) durante a leitura
      redesenha();
      const alvo = corpo().querySelector(b.dataset.acao === "ler" ? "[data-linha]" : 'input[name="eci-cenario"]');
      if (alvo) alvo.focus();
      return;
    }
    if (b.dataset.linha != null) { st.sel = +b.dataset.linha; st.interagiu = true; return redesenha(); }
    if (b.dataset.acao === "desfazer") { st.edicao = {}; return redesenha(); }
    if (b.dataset.no) { st.foco = b.dataset.no; st.interagiu = true; return redesenha(); }
    if (b.dataset.cursar) {
      const c = b.dataset.cursar;
      st.cursadas = st.cursadas.includes(c) ? st.cursadas.filter((x) => x !== c) : st.cursadas.concat([c]);
      st.interagiu = true; return redesenha();
    }
    if (b.dataset.acao === "simular") {
      const de = st.de, para = st.para;
      if (de === para) return ctx.anuncia("Escolha duas disciplinas diferentes.");
      if (!st.simuladas.some((s) => s.de === de && s.para === para)) st.simuladas.push({ de, para });
      st.interagiu = true; redesenha();
      const ciclo = analisaGrafo(arestasGrafo()).ciclo;
      return ctx.anuncia(ciclo ? "A ligação simulada fechou um ciclo." : `Ligação simulada: ${de} → ${para}.`);
    }
    if (b.dataset.acao === "limpar-sim") { st.simuladas = []; redesenha(); corpo().querySelector('[data-acao="simular"]').focus(); }
  }
  function muda(t) {
    if (!atual) return;
    const st = atual.st;
    if (t.id === "ed-grau" || t.id === "ed-sf") {
      const e = st.edicao[st.sel] || {};
      if (t.id === "ed-grau") { const v = Number(t.value); if (Number.isFinite(v) && v >= 0 && v <= 10) e.grau = v.toFixed(1); }
      else e.sf = t.value;
      st.edicao[st.sel] = e; st.interagiu = true; return redesenha();
    }
    if (t.id === "sim-de") { st.de = t.value; return; }
    if (t.id === "sim-para") { st.para = t.value; return; }
    if (t.name === "eci-cenario") { st.cenario = t.value; st.interagiu = true; return redesenha(); }
  }

  window.ECI = { tem, renderSecao, montado, abre, fecha, desenhaSetas, _analisaGrafo: analisaGrafo };
})();
