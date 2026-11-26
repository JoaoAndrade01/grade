/*
 * =============================================================================
 *  Grade Interativa — app.js
 * =============================================================================
 *  Aplicação 100% estática (HTML + JS, sem build e sem servidor). Visão geral em
 *  docs/ARQUITETURA.md; formato do perfil em docs/PERFIL.md.
 *
 *  DADOS DE ENTRADA (variáveis globais carregadas pelo index.html)
 *    window.courses / window.semesters  js/database.js   currículo (grade fixa, requisitos)
 *    window.optativas                   js/optativas.js  catálogo de eletivas (SIGA)
 *    window.horarios                    js/horarios.js   horários de referência (Notion)
 *    window.guia                        js/guia.js       dificuldade/presença/comentários (Notion)
 *    window.SIGA                        js/siga.js       regras do importador de PDFs do SIGA
 *    window.icone                       js/icones.js     ícones Lucide (SVG embutido)
 *    window.PERFIL                      perfil/perfil.js perfil pessoal (opcional, fora do git)
 *
 *  ESTADO NO NAVEGADOR (localStorage, prefixo "gradeECI.v2.")
 *    perfilImportado  perfil gerado pelo "Importar do SIGA" (tem prioridade sobre perfil.js)
 *    tags, marcacoes  tags de cor e o que foi pintado com o pincel
 *    plano            edições de planejamento/pedidos/extensão ainda não exportadas
 *                     (plano.removidos = períodos planejados do perfil excluídos no Cronograma)
 *    tema             "claro" | "escuro": escolha do botão sol/lua (js/tema.js); sem ela, segue o sistema
 *    modoClassico     seletor de modo do topo (padrão: ligado = só a grade e a paleta)
 *    ocultarSeletor   esconde o seletor de modo (o modo continua o escolhido; troca em Configurações)
 *    atalhos          atalhos fixados na barra: perfil, importar, tema, privacidade, referencias, tags (começa vazio)
 *    aparencia        "texto" | "icone" (sem a chave = ícone e texto), aplicada por js/tema.js
 *    cadeado          protege as cursadas contra alterações manuais
 *    vista, filtros, exibir, filtroNivel, cronoPeriodo, progressoAberto   preferências de tela
 *
 *  FLUXO
 *    montaModelo()  junta currículo + catálogo + perfil (+ edições) num modelo M:
 *                   M.regs[código] = registros por período (status, nota, via)
 *    statusDe()     status efetivo de uma disciplina (pincel > perfil)
 *    totais()       créditos por grupo: ok / prev / plan / cur / anal
 *    render()       desenha a barra geral e a tela ativa (render<Tela>())
 *    liga()         eventos (delegação no #painel, #detalhes e documento)
 *
 *  SEÇÕES DESTE ARQUIVO (procure pelos títulos "// ---------- ... ----------")
 *    Constantes · Utilitários · Tags de cor · Estado · Modelo · Edição do planejamento ·
 *    Renderização (peças) · Página inicial (Grade) · Linha do tempo · Optativas ·
 *    Equivalências e Extensão/ACE · Planejamento · Cronograma · Progresso/legenda ·
 *    Detalhes · Privacidade · Importar do SIGA · Destaque de requisitos · Eventos
 *
 *  PRIVACIDADE: o index.html tem Content-Security-Policy com connect-src 'self' — o navegador
 *  bloqueia qualquer envio para outro endereço. Não adicione scripts, fontes ou APIs externas.
 * =============================================================================
 */
(async () => {
  "use strict";

  // ---------- Constantes ----------
  const STORE = "gradeECI.v2.";
  const CATS = {
    1: { nome: "Obrigatórias", un: "cr" },
    2: { nome: "Optativas", un: "cr" },
    3: { nome: "Livre escolha", un: "cr" },
    4: { nome: "Humanas", un: "cr" },
    5: { nome: "Extensão / ACE", un: "h" },
  };
  const GRUPOS_OPT = { 2: "Condicionada", 4: "Humanas", 5: "ACE (extensão)" };
  const FORCA = { pendente: 0, reprovado: 1, analise: 1.5, planejado: 2, cursando: 3, previsto: 4, aprovado: 5 };
  const ROTULO = {
    aprovado: "Aprovada", previsto: "Aprovação prevista", cursando: "Cursando",
    planejado: "Planejada", reprovado: "Reprovada", pendente: "Pendente", analise: "Equivalência pedida",
  };
  const EQ_STATUS = ["a pedir", "em análise", "deferido", "indeferido"];
  const EXT_STATUS = ["a pedir", "planejada", "em andamento", "validada"];
  const DIAS = ["seg", "ter", "qua", "qui", "sex"];
  const DIAS_NOME = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
  const H_INI = 8, H_FIM = 17; // faixa do cronograma: 8h às 17h
  const PALETA = ["#2563eb", "#16a34a", "#d97706", "#db2777", "#7c3aed", "#0d9488", "#dc2626", "#4f46e5", "#65a30d", "#0891b2", "#c026d3", "#ea580c"];
  // Obrigatórias do ciclo básico: não recebem o aviso de oferta por semestre (lista aprovada em 2026-11-25).
  const CICLO_BASICO = new Set([
    "MAC118", "MAC128", "MAC238", "MAC248", "MAE125", "COE241",                       // Matemática e Estatística
    "FIT112", "FIS111", "FIT122", "FIS121", "FIT230", "FIM230", "FIN231", "FIT240",
    "FIM240", "FIN241", "IQG111", "IQG112",                                           // Física e Química
    "COS111", "COS110", "EEL280", "EEL480", "EEL670", "COS231",                       // Computação e Engenharia
  ]);
  const TITULO = "Grade ECI";
  const semestreValido = (v) => typeof v === "string" && /^\d{4}\/[12]$/.test(v);
  const concluido = (s) => s === "aprovado" || s === "previsto";
  const emCurso = (s) => s === "planejado" || s === "cursando";

  // ---------- Utilitários ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const pad = (n) => String(n).padStart(2, "0");
  const load = (k, def, valida = () => true) => {
    try {
      const v = JSON.parse(localStorage.getItem(STORE + k));
      return v != null && valida(v) ? v : def;
    }
    catch (e) { return def; }
  };
  const DADOS_DA_PREVIA = new Set(["perfilImportado", "perfil", "plano", "tags", "marcacoes", "creditos", "manual"]);
  const save = (k, v) => {
    if (DADOS_DA_PREVIA.has(k)) invalidaPrevia();
    try { v == null ? localStorage.removeItem(STORE + k) : localStorage.setItem(STORE + k, JSON.stringify(v)); }
    catch (e) { /* armazenamento indisponível: segue só em memória */ }
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const objeto = (v) => v != null && typeof v === "object" && !Array.isArray(v);
  const texto = (v) => typeof v === "string";
  const numero = (v) => Number.isFinite(v) && v >= 0;
  const opcional = (v, valida) => v == null || valida(v);
  const listaDe = (v, valida) => Array.isArray(v) && v.every(valida);
  const codigo = (v) => texto(v) && /^[A-Z]{3}[A-Z0-9]{3}$/.test(v);
  const nomePeriodo = (v) => texto(v) && v.trim() !== "" && !Object.hasOwn(Object.prototype, v);
  const statusDisciplina = (v) => texto(v) && Object.hasOwn(FORCA, v);
  function erroCampos(dados, campos, caminho) {
    if (!objeto(dados)) return caminho;
    const campo = Object.keys(campos).find((k) => !campos[k](dados[k]));
    return campo ? (caminho ? caminho + "." : "") + campo : null;
  }
  const camposDisciplina = {
    code: codigo, name: (v) => opcional(v, texto), credits: (v) => opcional(v, numero),
    horas: (v) => opcional(v, numero), category: (v) => opcional(v, (c) => [1, 2, 3, 4, 5].includes(c)),
  };
  const dadosDisciplina = (d) => !erroCampos(d, camposDisciplina, "disciplina");
  const camposItem = {
    ...camposDisciplina,
    status: (v) => opcional(v, statusDisciplina), nota: (v) => opcional(v, (n) => texto(n) || numero(n)),
    equivale: (v) => opcional(v, codigo), horarios: (v) => opcional(v, (h) => listaDe(h, texto)),
    dispensa: (v) => opcional(v, (d) => listaDe(d, (x) => codigo(x) || dadosDisciplina(x))),
  };
  const erroDisciplina = (d, caminho) => codigo(d) ? null : erroCampos(d, camposItem, caminho);
  const disciplinaValida = (d) => !erroDisciplina(d, "disciplina");
  const camposPeriodo = {
    nome: nomePeriodo, atual: (v) => opcional(v, (b) => typeof b === "boolean"),
    planejado: (v) => opcional(v, (b) => typeof b === "boolean"), nota: (v) => opcional(v, (n) => texto(n) || numero(n)),
  };
  const periodoValido = (p) => !erroCampos(p, camposPeriodo, "periodo")
    && opcional(p.disciplinas, (v) => listaDe(v, disciplinaValida));
  const pedidoValido = (e) => objeto(e) && codigo(e.pedida)
    && opcional(e.status, (v) => EQ_STATUS.includes(v)) && opcional(e.obs, texto)
    && (Array.isArray(e.cursadas)
      ? e.cursadas.every((c) => codigo(c) || (objeto(c) && codigo(c.code) && opcional(c.papel, (v) => ["conteudo", "horas"].includes(v))))
      : codigo(e.cursada));
  const extensaoValida = (a) => objeto(a) && opcional(a.nome, texto) && opcional(a.code, texto)
    && opcional(a.horas, numero) && opcional(a.periodo, texto) && opcional(a.status, (v) => EXT_STATUS.includes(v));
  const camposTag = {
    id: texto, nome: texto, cor: (v) => texto(v) && /^#[\da-f]{6}$/i.test(v),
    status: (v) => texto(v) && Object.hasOwn(CONTA_COMO, v),
  };
  const tagsValidas = (v) => listaDe(v, (t) => !erroCampos(t, camposTag, "tag"));
  const marcacoesValidas = (v) => objeto(v) && Object.entries(v).every(([c, t]) => codigo(c) && texto(t));
  const listasValidas = (v) => opcional(v.equivalencias, (e) => listaDe(e, pedidoValido))
    && opcional(v.extensao, (e) => listaDe(e, extensaoValida));
  function erroPerfil(p) {
    if (!objeto(p)) return "objeto do perfil";
    if (!Array.isArray(p.periodos)) return "periodos";
    for (const [i, periodo] of p.periodos.entries()) {
      const caminho = `periodos[${i}]`;
      const erro = erroCampos(periodo, camposPeriodo, caminho);
      if (erro) return erro;
      if (periodo.disciplinas != null) {
        if (!Array.isArray(periodo.disciplinas)) return caminho + ".disciplinas";
        for (const [j, d] of periodo.disciplinas.entries()) {
          const erro = erroDisciplina(d, `${caminho}.disciplinas[${j}]`);
          if (erro) return erro;
        }
      }
    }
    if (p.tags != null) {
      if (!Array.isArray(p.tags)) return "tags";
      for (const [i, t] of p.tags.entries()) {
        const erro = erroCampos(t, camposTag, `tags[${i}]`);
        if (erro) return erro;
      }
    }
    return erroCampos(p, {
      equivalencias: (v) => opcional(v, (e) => listaDe(e, pedidoValido)),
      extensao: (v) => opcional(v, (e) => listaDe(e, extensaoValida)),
      curso: (v) => opcional(v, (i) => Number.isInteger(i) && Array.isArray((window.courses || [])[i])),
      titulo: (v) => opcional(v, texto), subtitulo: (v) => opcional(v, texto), nome: (v) => opcional(v, texto),
      fonte: (v) => opcional(v, (f) => objeto(f) && opcional(f.boaEmissao, texto)),
      marcacoes: (v) => opcional(v, marcacoesValidas),
      boa: (v) => opcional(v, (b) => objeto(b) && listaDe(b.naoExplicitadas, (d) => dadosDisciplina(d)
        && numero(d.credits) && numero(d.ch) && (texto(d.grau) || numero(d.grau)))),
    }, "");
  }
  const planoValido = (p) => objeto(p) && listasValidas(p)
    && opcional(p.novos, (v) => listaDe(v, periodoValido))
    && opcional(p.removidos, (v) => listaDe(v, nomePeriodo))
    && (p.periodos === undefined || (objeto(p.periodos)
      && Object.entries(p.periodos).every(([nome, itens]) => nomePeriodo(nome) && listaDe(itens, disciplinaValida))));

  // Horários: "ter 08-10" <-> células (dia*100 + hora)
  function parseHorarios(lista) {
    const cel = new Set();
    (lista || []).forEach((s) => {
      const m = /^\s*(seg|ter|qua|qui|sex)\w*\s+(\d{1,2})(?::\d\d)?h?\s*-\s*(\d{1,2})/i.exec(String(s));
      if (!m) return;
      const d = DIAS.indexOf(m[1].toLowerCase());
      for (let h = +m[2]; h < +m[3]; h++) cel.add(d * 100 + h);
    });
    return cel;
  }
  function formataHorarios(cel) {
    const out = [];
    const ord = [...cel].sort((a, b) => a - b);
    let ini = null, ant = null;
    ord.concat([null]).forEach((c) => {
      if (c != null && ant != null && c === ant + 1) { ant = c; return; }
      if (ini != null) out.push(`${DIAS[Math.floor(ini / 100)]} ${pad(ini % 100)}-${pad((ant % 100) + 1)}`);
      ini = ant = c;
    });
    return out;
  }

  // ---------- Tags de cor (pincel) ----------
  // Cada tag tem um "status" que diz como ela entra nas contas:
  //   aprovado (concluída) · previsto (aprovação esperada, conta como cursando na barra)
  //   cursando · planejado · reprovado (não conta) · pendente (não conta)
  // Paleta padrão: Cursada (= cursada e aprovada, conta como concluída), Cursando e Planejada.
  const TAGS_PADRAO = [
    { id: "aprovada", nome: "Cursada", cor: "#16a34a", status: "aprovado" },
    { id: "cursando", nome: "Cursando", cor: "#2563eb", status: "cursando" },
    { id: "planejada", nome: "Planejada", cor: "#7c3aed", status: "planejado" },
  ];
  // Paleta padrão até 2026-11 (5 tags). Quem nunca a personalizou passa para a nova, mantendo as tags antigas
  // que ainda pintam alguma disciplina (assim nenhuma marcação muda de estado).
  const TAGS_PADRAO_V1 = [
    { id: "aprovada", nome: "Aprovada", cor: "#16a34a", status: "aprovado" },
    { id: "aprov-esperada", nome: "Aprovação esperada", cor: "#84cc16", status: "previsto" },
    { id: "cursando", nome: "Cursando", cor: "#2563eb", status: "cursando" },
    { id: "reprov-esperada", nome: "Reprovação esperada", cor: "#dc2626", status: "reprovado" },
    { id: "planejada", nome: "Planejada", cor: "#7c3aed", status: "planejado" },
  ];
  function migraTags(lista, marc) {
    if (!lista || JSON.stringify(lista) !== JSON.stringify(TAGS_PADRAO_V1)) return lista;
    const usadas = new Set(Object.values(marc || {}));
    return clone(TAGS_PADRAO).concat(TAGS_PADRAO_V1.filter((t) => usadas.has(t.id) && !TAGS_PADRAO.some((n) => n.id === t.id)));
  }
  // Cor de estados do perfil que não têm tag na paleta (perfis antigos): o cartão continua pintado.
  const COR_STATUS = {
    previsto: { id: "", nome: "Aprovação esperada", cor: "#84cc16", status: "previsto" },
    reprovado: { id: "", nome: "Reprovação esperada", cor: "#dc2626", status: "reprovado" },
  };
  const CONTA_COMO = { aprovado: "Concluída (cursada e aprovada)", previsto: "Aprovação esperada", cursando: "Em curso", planejado: "Planejada", reprovado: "Reprovação (não conta)", pendente: "Não conta" };

  // ---------- Estado ----------
  // Ordem de prioridade do perfil: importado pelo app (localStorage) > perfil/perfil.js > nenhum.
  const avisosPerfil = new Map();
  function perfilOuAviso(p, origem) {
    const erro = erroPerfil(p);
    if (!erro) return p;
    avisosPerfil.set(origem, erro);
    return null;
  }
  function lerPerfilSalvo(chave, origem) {
    let salvo;
    try { salvo = localStorage.getItem(STORE + chave); } catch { return null; }
    if (salvo == null) return null;
    try { return perfilOuAviso(JSON.parse(salvo), origem); }
    catch {
      avisosPerfil.set(origem, "JSON inválido");
      return null;
    }
  }
  if (location.protocol === "file:" && window.PERFIL === undefined) {
    await carregaScript("perfil/perfil.js").catch(() => { /* arquivo local opcional */ });
  }
  const perfilArquivo = window.PERFIL === undefined ? null : perfilOuAviso(window.PERFIL, "perfil/perfil.js");
  const perfilLocalAntigo = () => lerPerfilSalvo("perfil", "perfil antigo do navegador");
  let perfilImportado = lerPerfilSalvo("perfilImportado", "perfil importado");
  let perfil = perfilImportado || perfilArquivo || perfilLocalAntigo();
  let tags = load("tags", null, tagsValidas) || (perfil && perfil.tags) || clone(TAGS_PADRAO);
  // marcações feitas com o pincel: código -> id da tag ("" = sem tag)
  let marcacoes = load("marcacoes", null, marcacoesValidas) || (perfil && perfil.marcacoes) || (() => {
    const antigo = load("manual", {}, objeto); const m = {};   // migra o "✎ Marcar" da versão anterior
    Object.keys(antigo).filter(codigo).forEach((c) => { m[c] = antigo[c] === "aprovado" ? "aprovada" : ""; });
    return m;
  })();
  tags = migraTags(tags, marcacoes);
  let pincel = null;                 // id da tag selecionada para pintar (null = clique abre detalhes)
  let cadeado = load("cadeado", false, (v) => typeof v === "boolean"); // protege as cursadas contra alterações manuais
  let focoSetas = null;              // disciplina em foco para as setas de requisitos
  // Barra do topo: atalhos fixados em Configurações (todos começam desafixados) e o seletor de modo.
  const ATALHOS = ["perfil", "importar", "tema", "privacidade", "referencias", "tags"];
  let atalhos = load("atalhos", [], (v) => listaDe(v, (x) => ATALHOS.includes(x)));
  let ocultarSeletor = load("ocultarSeletor", false, (v) => typeof v === "boolean");
  let seletorECI = false;            // paleta "ECI por trás" (só nesta visita): destaca os cartões com experiência
  let exibir = Object.assign({ codigo: true, notas: false, dificuldade: false, presenca: false, setas: "ocultas" }, load("exibir", {}));
  if (!["ocultas", "foco", "todas"].includes(exibir.setas)) exibir.setas = "ocultas";
  let filtroNivel = load("filtroNivel", [], (v) => listaDe(v, numero));   // níveis de dificuldade em destaque (vazio = todos)
  let progressoAberto = load("progressoAberto", false);
  // Modo clássico (padrão ao abrir): só a grade inteira numa tela e a paleta para pintar.
  // Desligado = modo completo, com as abas (linha do tempo, optativas, cronograma, pedidos).
  let modoClassico = load("modoClassico", true);
  let creditosManuais = load("creditos", {}, (v) => objeto(v)
    && Object.entries(v).every(([k, n]) => Object.hasOwn(CATS, k) && numero(n))); // categoria -> créditos extras
  let plano = { periodos: {}, novos: [], ...load("plano", {}, planoValido) }; // edições de planejamento
  let vistaAtual = load("vista", perfil ? "timeline" : "grade");   // aba do modo completo
  let filtros = Object.assign({ busca: "", grupo: "2", prefixo: "", liberadas: false, ocultarFeitas: true, cabe: false, alvo: "", ativas: true }, load("filtros", {}));
  let cronoPeriodo = load("cronoPeriodo", null);
  let cronoSel = null;
  let cronoSlot = null;   // célula escolhida para "busca por horário"
  let proposta = null;    // { periodo, itens: [{code, horarios}] }
  let M = null; // modelo calculado (ver montaModelo)

  // Listas editáveis no app (o navegador guarda as edições até exportar)
  const getEq = () => plano.equivalencias || (perfil && perfil.equivalencias) || [];
  // Um pedido pode juntar várias cursadas: [{code, papel: "conteudo" | "horas"}]
  const cursadasDe = (e) => Array.isArray(e.cursadas)
    ? e.cursadas.map((c) => (typeof c === "string" ? { code: c, papel: "conteudo" } : c)).filter((c) => c && c.code)
    : (e.cursada ? [{ code: e.cursada, papel: "conteudo" }] : []);
  const pendente = (e) => { const st = e.status || "a pedir"; return st === "a pedir" || st === "em análise"; };
  const getExt = () => plano.extensao || (perfil && perfil.extensao) || [];
  function setLista(chave, arr) { plano[chave] = arr; save("plano", plano); montaModelo(); render(); }

  // ---------- Modelo ----------
  function montaModelo() {
    const cursoId = perfil && perfil.curso != null ? perfil.curso : 1;
    const grade = ((window.courses || [])[cursoId] || []).map((c, i) =>
      Object.assign({}, c, { idx: i, category: c.category || 1 }));
    const curr = {};
    grade.forEach((c) => { if (c.code && !curr[c.code]) curr[c.code] = c; });
    const catalogo = ((window.optativas || {})[cursoId] || []).filter((o) => !curr[o.code]);
    const opt = {};
    catalogo.forEach((o) => { opt[o.code] = o; });
    const custom = {}; // disciplinas citadas no perfil que não estão nem no currículo nem no catálogo

    const reqCodes = (c, campo) => (c[campo] || [])
      .map((r) => (typeof r === "number" ? (grade[r] && grade[r].code) : r)).filter(Boolean);

    function info(code) {
      if (curr[code]) {
        const c = curr[code];
        return { code, name: c.name, credits: c.credits, category: c.category, workload: c.workload, semester: c.semester,
          req: reqCodes(c, "requirements"), coreq: reqCodes(c, "corequirements"), fonte: "grade", idx: c.idx };
      }
      const o = opt[code] || custom[code];
      if (!o) return null;
      return { code, name: o.name || code, credits: o.credits || 0, horas: o.horas, category: o.category || 3, workload: o.workload,
        req: o.requirements || [], coreq: o.corequirements || [], fonte: opt[code] ? "catalogo" : "perfil" };
    }

    const deps = {};
    const addDeps = (code, i) => i && i.req.forEach((r) => (deps[r] = deps[r] || []).includes(code) || deps[r].push(code));
    Object.keys(curr).forEach((c) => addDeps(c, info(c)));
    Object.keys(opt).forEach((c) => addDeps(c, info(c)));

    const regs = {};
    const registra = (code, r) => (regs[code] = regs[code] || []).push(r);
    const conhece = (o) => {
      if (o.code && !curr[o.code] && !opt[o.code]) {
        const anterior = custom[o.code] || {};
        custom[o.code] = { name: anterior.name ?? o.name, credits: anterior.credits ?? o.credits,
          category: anterior.category ?? o.category, horas: anterior.horas ?? o.horas };
      }
    };

    const removidos = new Set(plano.removidos || []);
    const base = ((perfil && perfil.periodos) || []).filter((p) => !(p.planejado && removidos.has(p.nome))).map((p) => ({ ...p }));
    (plano.novos || []).forEach((n) => { if (!base.some((p) => p.nome === n.nome)) base.push({ disciplinas: [], ...n }); });

    const periodos = base.map((p, pi) => {
      const tipo = p.planejado ? "planejado" : p.atual ? "atual" : "cursado";
      const padrao = { planejado: "planejado", atual: "cursando", cursado: "aprovado" }[tipo];
      const editado = !!plano.periodos[p.nome];
      const brutos = editado ? plano.periodos[p.nome] : (p.disciplinas || []);
      const itens = brutos.map((raw) => {
        const it = typeof raw === "string" ? { code: raw } : raw;
        conhece(it);
        const status = it.status || padrao;
        const alvo = it.equivale || it.code;
        const inf = info(it.code) || {};
        const item = {
          code: it.code, alvo, status, pi, nota: it.nota, equivale: it.equivale,
          name: it.name || inf.name || it.code || "?",
          credits: it.credits != null ? it.credits : inf.credits || 0,
          category: it.category != null ? it.category : inf.category || 3,
          horas: it.horas != null ? it.horas : inf.horas,
          workload: inf.workload, cel: parseHorarios(it.horarios), dispensas: [],
        };
        registra(alvo, { pi, status, nota: it.nota, via: it.equivale ? `equivalência: ${it.code} ${item.name}` : null });
        (it.dispensa || []).forEach((d) => {
          const dn = typeof d === "string" ? { code: d } : { category: 2, ...d };
          conhece(dn);
          if (status !== "reprovado") registra(dn.code, { pi, status, nota: "T", via: `dispensa por ${it.code}` });
          item.dispensas.push(dn.code);
        });
        return item;
      });
      return { nome: p.nome, nota: p.nota, tipo, itens, pi, editado };
    });

    // Equivalências: deferida passa a valer como a disciplina pedida (e a cursada deixa de contar no grupo original);
    // "a pedir" / "em análise" ficam numa faixa separada até a resposta.
    const consumidas = new Set();
    const pendEq = {};
    const pendConsumo = new Set();
    const dispensou = {};
    periodos.forEach((p) => p.itens.forEach((it) => {
      if (it.dispensas.length && it.status === "aprovado") dispensou[it.code] = (dispensou[it.code] || []).concat(it.dispensas);
    }));
    const pedidos = getEq();
    const usosDeferidos = new Map();
    pedidos.filter((e) => e.status === "deferido").forEach((e) => {
      new Set(cursadasDe(e).map((c) => c.code)).forEach((code) => usosDeferidos.set(code, (usosDeferidos.get(code) || 0) + 1));
    });
    const usosPendentes = new Map();
    pedidos.filter(pendente).forEach((e) => {
      new Set(cursadasDe(e).map((c) => c.code)).forEach((code) => usosPendentes.set(code, (usosPendentes.get(code) || 0) + 1));
    });
    const pedidosComConflito = new Set();
    pedidos.forEach((e) => {
      const cs = e ? cursadasDe(e) : [];
      if (!cs.length || !e.pedida) return;
      const st = e.status || "a pedir";
      if (st === "deferido") {
        if (cs.some((c) => usosDeferidos.get(c.code) > 1 || dispensou[c.code])) {
          pedidosComConflito.add(e);
          return;
        }
        const registros = cs.map((c) => {
          const datados = (regs[c.code] || []).filter((r) => r.pi != null);
          return datados.filter((r) => r.status === "aprovado").pop()
            || datados.filter((r) => r.status === "previsto" || emCurso(r.status)).pop();
        });
        const pi = registros.every(Boolean) ? Math.max(...registros.map((r) => r.pi)) : null;
        const status = registros.every((r) => r?.status === "aprovado") ? "aprovado" : "previsto";
        registra(e.pedida, { pi, status, nota: "E", via: `equivalência deferida: ${cs.map((c) => c.code).join(" + ")}` });
        cs.forEach((c) => consumidas.add(c.code));
      } else if (pendente(e)) {
        if (cs.some((c) => dispensou[c.code] || usosDeferidos.has(c.code) || usosPendentes.get(c.code) > 1)) {
          pedidosComConflito.add(e);
          return;
        }
        pendEq[e.pedida] = e;
        cs.forEach((c) => pendConsumo.add(c.code));
      }
    });

    const ref = (window.horarios || {})[cursoId] || null;
    const guia = (window.guia || {})[cursoId] || null;
    const boa = (perfil && perfil.boa) || null;
    M = { grade, curr, opt, catalogo, info, deps, regs, periodos, cursoId, ref, consumidas, pendEq, pendConsumo, guia, dispensou, boa, pedidosComConflito };
  }

  /** Status vindo só do perfil (histórico, período atual, planos e pedidos), sem as marcações do pincel. */
  function statusPerfil(code) {
    const b = (M.regs[code] || []).reduce((a, r) => (FORCA[r.status] > FORCA[a] ? r.status : a), "pendente");
    if (FORCA[b] < FORCA.planejado && M.pendEq[code]) return "analise";
    return b;
  }
  const tagPorId = (id) => tags.find((t) => t.id === id) || null;
  const statusDaTag = (id) => { const t = tagPorId(id); return t ? t.status : "pendente"; };
  /** Status efetivo: a marcação do pincel, se houver, vence o perfil. */
  function statusDe(code) {
    if (Object.prototype.hasOwnProperty.call(marcacoes, code)) return statusDaTag(marcacoes[code]);
    return statusPerfil(code);
  }
  /** Tag exibida: a marcada pelo usuário ou a deduzida do perfil. */
  function tagDe(code) {
    if (Object.prototype.hasOwnProperty.call(marcacoes, code)) return tagPorId(marcacoes[code]);
    const s = statusPerfil(code);
    if (s === "reprovado") {
      // reprovação no período atual = "reprovação esperada"
      const atual = M.periodos.find((p) => p.tipo === "atual");
      const r = (M.regs[code] || []).find((x) => x.status === "reprovado" && atual && x.pi === atual.pi);
      return r ? tags.find((t) => t.status === "reprovado") || COR_STATUS.reprovado : null;
    }
    return tags.find((t) => t.status === s) || COR_STATUS[s] || null;
  }
  const notaDe = (code) => {
    const r = (M.regs[code] || []).filter((x) => concluido(x.status)).pop();
    return r ? r.nota : null;
  };
  const periodoDe = (code, filtro) => (M.regs[code] || []).filter((r) => filtro(r.status)).map((r) => M.periodos[r.pi]?.nome).filter(Boolean);

  // Requisito cumprido (ou previsto/planejado) em período anterior a "pi"?
  function cumpridoAntes(code, pi) {
    if (Object.prototype.hasOwnProperty.call(marcacoes, code) && statusDaTag(marcacoes[code]) === "aprovado") return true;
    return (M.regs[code] || []).some((r) => r.pi != null && FORCA[r.status] >= FORCA.planejado && r.pi < pi);
  }
  function avisos(code, pi) {
    const i = M.info(code); if (!i) return [];
    return i.req.filter((r) => !cumpridoAntes(r, pi)).map((r) => `Requisito ${r} não cumprido antes deste período`)
      .concat(i.coreq.filter((r) => !cumpridoAntes(r, pi + 1)).map((r) => `Co-requisito ${r} não cumprido até este período`));
  }
  // Para o catálogo: requisitos que faltam hoje (aprovado/previsto contam)
  const faltamHoje = (i) => i.req.filter((r) => !concluido(statusDe(r)));

  // Horários de referência (js/horarios.js) conforme a paridade do semestre ("/1" ímpar, "/2" par)
  const paridade = (nome) => { const m = /\/(\d)\s*$/.exec(nome || ""); return m ? (m[1] === "1" ? "impar" : "par") : null; };
  const ofertaDe = (code, nome) => {
    const par = paridade(nome);
    return (M.ref && par && M.ref[par] && M.ref[par][code]) || null;
  };
  // Guia (dificuldade/presença/comentários)
  const guiaDe = (code) => (M.guia && M.guia.disciplinas && M.guia.disciplinas[code]) || null;
  const PRESENCA = { com: "com presença", sem: "sem presença", depende: "presença: depende" };
  function seloGuia(code, curto) {
    const g = guiaDe(code); if (!g || !g.nivel) return "";
    const n = M.guia.niveis[g.nivel];
    return `<span class="nivel" title="${esc(n.nome)}: ${esc(n.texto)}${g.presenca ? " · " + esc(PRESENCA[g.presenca]) : ""}">${n.emoji}${curto ? "" : " " + esc(n.nome)}</span>`;
  }
  const textoPresenca = (code) => { const g = guiaDe(code); return g && g.presenca ? PRESENCA[g.presenca] : ""; };

  // Eletiva "ativa" = tem turma na referência (Notion) em algum semestre
  const paridadesOferta = (code) => ["impar", "par"].filter((k) => M.ref && M.ref[k] && M.ref[k][code]);
  /**
   * Aviso de oferta para uma obrigatória da ECI (fora do ciclo básico) planejada no período `nome`.
   * Só compara paridades quando o período está no formato AAAA/1 ou AAAA/2; sem referência em nenhuma
   * paridade, avisa "Sem oferta de referência". A disciplina continua no plano.
   * @returns {{curto: string, texto: string} | null}
   */
  function avisoOferta(code, nome) {
    if (M.cursoId !== 1 || !M.ref) return null;
    const c = M.curr[code];
    if (!c || c.category !== 1 || CICLO_BASICO.has(code)) return null;
    const pars = paridadesOferta(code);
    if (!pars.length) return { curto: "Sem oferta de referência", texto: "Sem oferta de referência. Confira no SIGA." };
    if (!semestreValido(nome)) return null;
    if (pars.includes(nome.endsWith("/1") ? "impar" : "par")) return null;
    const so = pars[0] === "impar" ? "/1" : "/2";
    return { curto: `Referência só lista turmas em ${so}`, texto: `Pode não ser ofertada neste semestre. A referência só lista turmas em ${so}. Confira no SIGA.` };
  }
  const ativa = (code) => paridadesOferta(code).length > 0;
  // Choques de uma lista de horários com as disciplinas já no período (exceto "ignorar")
  function chocaCom(horarios, nome, ignorar) {
    const p = M.periodos.find((x) => x.nome === nome); if (!p) return [];
    const cel = parseHorarios(horarios);
    return p.itens.filter((it) => it.alvo !== ignorar && it.code !== ignorar && it.status !== "reprovado" && [...it.cel].some((c) => cel.has(c))).map((it) => it.code);
  }

  const valorCat = (i) => (i.category == 5 ? (i.horas != null ? i.horas : i.credits) : i.credits);

  function totais() {
    const t = {};
    // ok = concluído · prev = aprovação esperada · plan = planejado + cursando · cur = só cursando · anal = pedido em análise
    for (const k in CATS) t[k] = { total: 0, ok: 0, prev: 0, plan: 0, cur: 0, anal: 0 };
    M.grade.forEach((c) => { if (t[c.category]) t[c.category].total += c.credits; });
    new Set([...Object.keys(M.regs), ...Object.keys(marcacoes), ...Object.keys(M.pendEq)]).forEach((code) => {
      if (M.consumidas.has(code)) return;
      const i = M.info(code); if (!i || !t[i.category]) return;
      const T = t[i.category], v = valorCat(i), s = statusDe(code);
      if (s === "aprovado") T.ok += v; else if (s === "previsto") T.prev += v; else if (emCurso(s)) T.plan += v;
      else if (s === "analise") T.anal += v;
      if (s === "cursando") T.cur += v;
    });
    getExt().forEach((a) => {
      const h = Number(a.horas) || 0;
      if (a.status === "validada") t[5].ok += h; else t[5].plan += h;
    });
    for (const k in creditosManuais) if (t[k]) t[k].ok += Number(creditosManuais[k]) || 0;
    return t;
  }

  // Distribui as disciplinas feitas/planejadas pelos blocos genéricos ("Atividades Acad. Optativas" etc.)
  function preenchimentoBlocos() {
    const filas = {};
    new Set([...Object.keys(M.regs), ...Object.keys(marcacoes)]).forEach((code) => {
      if (M.curr[code] || M.consumidas.has(code)) return;
      const i = M.info(code); if (!i) return;
      const s = statusDe(code); if (!(concluido(s) || emCurso(s))) return;
      (filas[i.category] = filas[i.category] || []).push({ code, name: i.name, v: valorCat(i), s, f: FORCA[s] });
    });
    getExt().forEach((a) => {
      const h = Number(a.horas) || 0;
      if (h) (filas[5] = filas[5] || []).push({ code: null, name: a.nome || a.code || "atividade", v: h, s: a.status === "validada" ? "aprovado" : "planejado", f: a.status === "validada" ? 5 : 2 });
    });
    for (const k in creditosManuais) {
      const v = Number(creditosManuais[k]) || 0;
      if (v) (filas[k] = filas[k] || []).push({ code: null, name: "créditos manuais", v, s: "aprovado", f: 5 });
    }
    for (const k in filas) filas[k].sort((a, b) => b.f - a.f);
    const fill = {};
    M.grade.slice().sort((a, b) => a.semester - b.semester || a.idx - b.idx).forEach((c) => {
      if (c.code) return;
      const fila = filas[c.category] || [];
      const f = { ok: 0, prev: 0, plan: 0, nomes: [] };
      let livre = c.credits;
      while (livre > 0 && fila.length) {
        const x = fila[0];
        const usa = Math.min(livre, x.v);
        if (x.s === "aprovado") f.ok += usa; else if (x.s === "previsto") f.prev += usa; else f.plan += usa;
        if (!x.usado) { f.nomes.push(x); x.usado = true; }
        x.v -= usa; livre -= usa;
        if (x.v <= 0) fila.shift();
      }
      fill[c.idx] = f;
    });
    return fill;
  }

  // ---------- Edição do planejamento (fica no navegador até exportar) ----------
  function periodoBase(nome) {
    return ((perfil && perfil.periodos) || []).find((p) => p.nome === nome) || (plano.novos || []).find((p) => p.nome === nome);
  }
  function itensBrutos(nome) {
    if (plano.periodos[nome]) return clone(plano.periodos[nome]);
    const p = periodoBase(nome);
    return ((p && p.disciplinas) || []).map((r) => (typeof r === "string" ? { code: r } : clone(r)));
  }
  function gravaItens(nome, arr) {
    plano.periodos[nome] = arr;
    save("plano", plano);
    montaModelo(); render();
  }
  function adicionaAoPeriodo(nome, code) {
    const arr = itensBrutos(nome);
    if (arr.some((x) => x.code === code)) return;
    const of = ofertaDe(code, nome);
    arr.push(of ? { code, horarios: of.slice() } : { code });
    gravaItens(nome, arr);
  }
  function removeDoPeriodo(nome, code) {
    gravaItens(nome, itensBrutos(nome).filter((x) => x.code !== code));
  }
  function usaReferencia(nome, code) {
    const of = ofertaDe(code, nome); if (!of) return;
    const arr = itensBrutos(nome);
    const it = arr.find((x) => x.code === code); if (!it) return;
    it.horarios = of.slice();
    gravaItens(nome, arr);
  }
  function alteraCelula(nome, code, cel, adicionar) {
    const arr = itensBrutos(nome);
    const it = arr.find((x) => x.code === code); if (!it) return;
    const s = parseHorarios(it.horarios);
    if (adicionar) s.add(cel); else s.delete(cel);
    it.horarios = formataHorarios(s);
    if (!it.horarios.length) delete it.horarios;
    gravaItens(nome, arr);
  }
  const periodosPlanejaveis = () => M.periodos.filter((p) => p.tipo !== "cursado");
  const periodosFuturos = () => M.periodos.filter((p) => p.tipo === "planejado");

  function perfilExportado() {
    const out = perfil ? clone(perfil) : { titulo: TITULO, curso: 1, periodos: [] };
    const removidos = new Set(plano.removidos || []);
    out.periodos = out.periodos.filter((p) => !(p.planejado && removidos.has(p.nome)));
    (plano.novos || []).forEach((n) => { if (!out.periodos.some((p) => p.nome === n.nome)) out.periodos.push(Object.assign({}, n, { disciplinas: [] })); });
    out.periodos.forEach((p) => { if (plano.periodos[p.nome]) p.disciplinas = clone(plano.periodos[p.nome]); });
    if (plano.equivalencias) out.equivalencias = clone(plano.equivalencias);
    if (plano.extensao) out.extensao = clone(plano.extensao);
    out.tags = clone(tags);
    if (Object.keys(marcacoes).length) out.marcacoes = clone(marcacoes); else delete out.marcacoes;
    return out;
  }
  function textoPerfil(obj) {
    const linhas = ["{"];
    const listas = ["equivalencias", "extensao", "tags"];
    Object.keys(obj).filter((k) => k !== "periodos" && !listas.includes(k)).forEach((k) => linhas.push(`  ${JSON.stringify(k)}: ${JSON.stringify(obj[k])},`));
    listas.filter((k) => obj[k]).forEach((k) => {
      linhas.push(`  ${JSON.stringify(k)}: [`);
      linhas.push(obj[k].map((x) => "    " + JSON.stringify(x)).join(",\n"));
      linhas.push("  ],");
    });
    linhas.push('  "periodos": [');
    obj.periodos.forEach((p, i) => {
      const meta = Object.assign({}, p); delete meta.disciplinas;
      linhas.push(`    ${JSON.stringify(meta).slice(0, -1)}, "disciplinas": [`);
      linhas.push((p.disciplinas || []).map((d) => "      " + JSON.stringify(d)).join(",\n"));
      linhas.push(`    ]}${i < obj.periodos.length - 1 ? "," : ""}`);
    });
    linhas.push("  ]", "}");
    return "// Perfil exportado pela Grade Interativa em " + new Date().toLocaleString("pt-BR") +
      ".\n// Salve como perfil/perfil.js (ignorado pelo git).\nwindow.PERFIL = " + linhas.join("\n") + ";\n";
  }
  function exportaPerfil() { baixa("perfil.js", textoPerfil(perfilExportado())); }
  const temEdicoes = () => Object.keys(plano.periodos).length > 0 || (plano.novos || []).length > 0 || (plano.removidos || []).length > 0
    || !!plano.equivalencias || !!plano.extensao
    || JSON.stringify(marcacoes) !== JSON.stringify((perfil && perfil.marcacoes) || {})
    || JSON.stringify(tags) !== JSON.stringify(migraTags((perfil && perfil.tags) || TAGS_PADRAO, marcacoes));

  // ---------- Renderização: peças ----------
  const metaDe = (code, valor, cat) =>
    [code, valor != null ? `${fmt(valor)} ${cat == 5 || valor >= 30 ? "h" : "cr"}` : null].filter(Boolean).join(" · ");

  function card(o) {
    const temAviso = o.aviso && o.aviso.length;
    const attrs = [
      `class="card s-${esc(o.status)} cat-${esc(o.cat)}${temAviso ? " tem-aviso" : ""}${o.classe ? " " + o.classe : ""}"`,
      o.code ? `data-code="${esc(o.code)}"` : "",
      o.idx != null ? `data-idx="${o.idx}"` : "",
      o.inerte ? "inert" : "",
      o.fill ? `style="--ok:${o.fill.ok}%;--prev:${o.fill.prev}%;--plan:${o.fill.plan}%"` : "",
      `title="${esc(ROTULO[o.status] || "")}${temAviso ? " — " + esc(o.aviso.join("; ")) : ""}"`,
    ].join(" ");
    const nota = o.nota != null && o.nota !== "" ? (typeof o.nota === "number" ? o.nota.toFixed(1) : o.nota) : null;
    return `<button type="button" ${attrs}>
      ${nota != null ? `<span class="nota">${esc(nota)}</span>` : ""}
      ${temAviso ? `<span class="aviso" aria-label="aviso">!</span>` : ""}
      <span class="nome">${esc(o.name)}</span>
      ${o.sub ? `<span class="sub">${o.sub}</span>` : ""}
      <span class="meta">${o.code ? seloGuia(o.code, true) + " " : ""}${esc(o.meta)}</span>
    </button>`;
  }

  function coluna(titulo, chips, cards, extraClasse = "") {
    return `<section class="coluna ${extraClasse}">
      <header class="col-topo"><h2>${esc(titulo)}</h2><div class="chips">${chips}</div></header>
      <div class="col-cards">${cards || `<p class="vazio">—</p>`}</div>
    </section>`;
  }

  /**
   * Cartão da página inicial (estilo clássico): só o nome em destaque, pintado com a cor da tag.
   * Extras (código/créditos, nota, dificuldade, presença) aparecem conforme o menu "Exibir".
   */
  function cardLimpo(c) {
    const tag = tagDe(c.code), s = statusDe(c.code);
    const g = guiaDe(c.code);
    const apagado = filtroNivel.length && !(g && filtroNivel.includes(g.nivel));
    const nota = exibir.notas ? notaDe(c.code) : null;
    const extras = [
      exibir.codigo ? esc(metaDe(c.code, c.credits, c.category)) : "",
      exibir.dificuldade && g && g.nivel ? seloGuia(c.code, true) : "",
      exibir.presenca && g && g.presenca ? esc(PRESENCA[g.presenca]) : "",
    ].filter(Boolean).join(" · ");
    const prot = protegida(c.code);
    const exp = seletorECI && window.ECI.tem(c.code);
    return `<button type="button" class="card limpo${tag ? " com-tag" : ""}${s === "analise" ? " s-analise" : ""}${apagado ? " apagado" : ""}${prot ? " protegida" : ""}${exp ? " com-eci" : ""}"
      data-code="${esc(c.code)}" ${tag ? `style="--tag:${esc(tag.cor)}"` : ""} title="${exp ? "Abrir a experiência: " + esc(window.ECI.tem(c.code).titulo) : esc(tag ? tag.nome : ROTULO[s]) + (prot ? " · protegida pelo cadeado" : "")}"
      ${seletorECI && !exp ? "inert" : ""}${exp ? ` aria-describedby="dica-eci"` : ""}>
      ${exp ? `<span class="selo-eci">${icone("eci", 12)} ECI por trás</span>` : ""}
      ${prot ? `<span class="cad" aria-hidden="true">${icone("cadeado", 11)}</span>` : ""}
      ${nota != null ? `<span class="nota">${esc(typeof nota === "number" ? nota.toFixed(1) : nota)}</span>` : ""}
      <span class="nome">${esc(c.name)}</span>
      ${extras ? `<span class="meta">${extras}</span>` : ""}
    </button>`;
  }

  /** Barra única de progresso: concluída · cursando · planejada · não planejada (créditos dos grupos 1–4). */
  function renderBarraGeral() {
    const t = totais();
    let total = 0, ok = 0, cur = 0, pl = 0;
    ["1", "2", "3", "4"].forEach((k) => {
      const T = t[k]; if (!T.total) return;
      const a = Math.min(T.ok, T.total);
      const b = Math.min(T.prev + T.cur, T.total - a);
      const c = Math.min(Math.max(0, T.plan - T.cur), T.total - a - b);
      total += T.total; ok += a; cur += b; pl += c;
    });
    const resto = Math.max(0, total - ok - cur - pl);
    const pc = (v) => (total ? (v / total) * 100 : 0);
    const seg = (cls, v, nome) => `<span class="seg-${cls}" style="width:${pc(v)}%" title="${nome}: ${fmt(v)} cr (${pc(v).toFixed(0)}%)"></span>`;
    const T5 = t[5];
    $("#barra-geral").innerHTML = `
      <div class="bg-barra">${seg("ok", ok, "Concluída")}${seg("cur", cur, "Cursando")}${seg("plan", pl, "Planejada")}${seg("resto", resto, "Não planejada")}</div>
      <div class="bg-legenda">
        <span><i class="seg-ok"></i>Concluída <b>${pc(ok).toFixed(0)}%</b></span>
        <span><i class="seg-cur"></i>Cursando <b>${pc(cur).toFixed(0)}%</b></span>
        <span><i class="seg-plan"></i>Planejada <b>${pc(pl).toFixed(0)}%</b></span>
        <span><i class="seg-resto"></i>Não planejada <b>${pc(resto).toFixed(0)}%</b></span>
        <span class="bg-total">${fmt(ok)} de ${fmt(total)} cr${T5.total ? ` · Extensão/ACE ${fmt(T5.ok)}/${fmt(T5.total)} h` : ""}</span>
        <button type="button" class="link" id="bg-detalhes">${progressoAberto ? "ocultar detalhes ▴" : "detalhes ▾"}</button>
      </div>`;
  }

  /** Cor do texto (preto/branco) com melhor contraste sobre a cor de fundo `hex` (WCAG, luminância relativa). */
  function corTextoSobre(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return "#fff";
    const [r, g, b] = [0, 2, 4].map((i) => { const c = parseInt(m[1].slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? "#111" : "#fff";
  }

  /**
   * Paleta flutuante (fixa embaixo da tela): escolhe a tag do pincel.
   * No modo clássico sempre há um pincel ativo (clique = pintar). No modo completo existe a opção
   * "Detalhes" (pincel nulo): o clique abre o painel da disciplina.
   */
  function renderPaleta() {
    const conta = {};
    M.grade.forEach((c) => { if (!c.code) return; const t = tagDe(c.code); if (t && t.id) conta[t.id] = (conta[t.id] || 0) + 1; });
    const botao = (id, rotulo, cor, extra = "") => {
      const on = pincel === id;
      return `<button type="button" class="pal-btn${on ? " on" : ""}" data-pincel="${esc(id)}" aria-pressed="${on}"
        ${cor ? `style="--tag:${esc(cor)};--tag-txt:${corTextoSobre(cor)}"` : ""} ${extra}>
        ${cor ? `<i class="pal-cor"></i>` : ""}<span>${rotulo}</span></button>`;
    };
    return `<div class="pal-trilho" role="toolbar" aria-label="Paleta: escolha a tag e clique nas disciplinas">
      ${modoClassico ? "" : botao("__detalhes", `${icone("detalhes")} Detalhes`, null, 'title="Clique abre os detalhes da disciplina"')}
      ${modoClassico ? "" : `<button type="button" class="pal-btn pal-eci${seletorECI ? " on" : ""}" id="pal-eci" aria-pressed="${seletorECI}"
        title="Destaca as disciplinas com experiência de A ECI por trás da Grade">${icone("eci")} <span>ECI por trás</span></button>`}
      ${tags.map((t) => botao(t.id, `${esc(t.nome)}${conta[t.id] ? ` <small>${conta[t.id]}</small>` : ""}`, t.cor, `title="${esc(CONTA_COMO[t.status] || "")}"`)).join("")}
      ${botao("", `${icone("borracha")} Borracha`, null, 'title="Tirar a tag"')}
      <button type="button" class="pal-btn pal-icone" id="editar-tags" title="Editar tags" aria-label="Editar tags">${icone("tags")}</button>
      <button type="button" class="pal-btn pal-icone pal-cadeado" id="cadeado" aria-pressed="${cadeado}" aria-label="Proteger disciplinas cursadas"
        title="${cadeado ? "Cursadas protegidas: clique para liberar alterações" : "Proteger as cursadas contra alterações"}">${icone(cadeado ? "cadeado" : "cadeado-aberto")}</button>
    </div>
    ${seletorECI ? `<p class="dica-eci" id="dica-eci">Escolha um cartão destacado para abrir a experiência. As outras disciplinas ficam inativas até você desligar “ECI por trás”.</p>` : ""}`;
  }

  /** Opções de exibição e filtro (só no modo completo, aba Grade). */
  function renderFerramentas() {
    const niveis = M.guia ? Object.keys(M.guia.niveis) : [];
    return `<div class="ferr-grupo"><span class="ferr-rot">${icone("exibir", 14)} Exibir</span>
        ${[["codigo", "Código e créditos"], ["notas", "Notas"], ["dificuldade", "Dificuldade"], ["presenca", "Presença"]].map(([k, n]) =>
          `<label class="check"><input type="checkbox" data-exibir="${k}" ${exibir[k] ? "checked" : ""}> ${n}</label>`).join("")}
      </div>
      <div class="ferr-grupo" role="radiogroup" aria-label="Setas de requisitos"><span class="ferr-rot">${icone("setas", 14)} Setas</span>
        ${[["ocultas", "Ocultas"], ["foco", "Disciplina em foco"], ["todas", "Todas"]].map(([v, n]) =>
          `<label class="check"><input type="radio" name="setas" value="${v}" ${exibir.setas === v ? "checked" : ""}> ${n}</label>`).join("")}
        ${exibir.setas !== "ocultas" ? `<span class="leg-setas"><i class="l-req"></i>pré-requisito <i class="l-coreq"></i>co-requisito</span>` : ""}
      </div>
      ${niveis.length ? `<div class="ferr-grupo"><span class="ferr-rot">Dificuldade</span>
        ${niveis.map((k) => `<button type="button" class="chip chip-btn${filtroNivel.includes(+k) ? " on" : ""}" data-nivel="${k}" title="${esc(M.guia.niveis[k].nome)}">${M.guia.niveis[k].emoji}</button>`).join("")}
      </div>` : ""}`;
  }

  /** Editor de tags (no painel lateral). */
  function abreEditorTags() {
    const box = $("#detalhes");
    box.innerHTML = `<header><span class="cat-pill">Tags</span><button type="button" class="fechar" aria-label="Fechar">×</button></header>
      <h3>Tags de cor</h3>
      <p class="det-meta">Cada tag pinta as disciplinas e diz como elas entram na barra de progresso.</p>
      <ul class="lista tags-edit">${tags.map((t, k) => `<li>
        <input type="color" value="${esc(t.cor)}" data-tagcor="${k}">
        <input class="campo campo-sm" value="${esc(t.nome)}" data-tagnome="${k}">
        <select class="campo campo-sm" data-tagstatus="${k}">${Object.entries(CONTA_COMO).map(([v, n]) => `<option value="${v}" ${t.status === v ? "selected" : ""}>${n}</option>`).join("")}</select>
        <button type="button" class="x" data-tagdel="${k}" title="Apagar tag">×</button></li>`).join("")}</ul>
      <div class="add"><button type="button" class="btn btn-sm" id="tag-nova">+ Nova tag</button>
      <button type="button" class="btn btn-sm btn-ghost" id="tag-padrao">Restaurar padrão</button></div>`;
    box.hidden = false;
    box.dataset.alvo = "tags";
  }
  function salvaTags() { save("tags", tags); render(); abreEditorTags(); }

  // ---------- Vista: Grade ----------
  function renderGrade() {
    const n = window.semesters || Math.max(...M.grade.map((c) => c.semester));
    const fill = preenchimentoBlocos();
    let html = "";
    for (let s = 1; s <= n; s++) {
      const cs = M.grade.filter((c) => c.semester === s);
      let feitos = 0;
      const cards = cs.map((c) => {
        if (!c.code) {
          const f = fill[c.idx] || { ok: 0, prev: 0, plan: 0, nomes: [] };
          const feito = f.ok + f.prev, tudo = feito + f.plan;
          if (feito >= c.credits) feitos++;
          const st = feito >= c.credits ? (f.prev ? "previsto" : "aprovado") : tudo > 0 ? "planejado" : "pendente";
          const nomes = f.nomes.slice(0, 4).map((x) => `<span class="mini s-${x.s}">${esc(x.name)}</span>`).join("")
            + (f.nomes.length > 4 ? `<span class="mini">+${f.nomes.length - 4}</span>` : "");
          const pc = (v) => (v / c.credits) * 100;
          return card({
            idx: c.idx, name: c.name, cat: c.category, status: st, classe: "bloco", inerte: seletorECI,
            meta: `${fmt(feito)}${f.plan ? ` (+${fmt(f.plan)} plan.)` : ""} / ${metaDe(null, c.credits, c.category)}`,
            sub: modoClassico ? "" : nomes, fill: { ok: pc(f.ok), prev: pc(f.ok + f.prev), plan: pc(tudo) },
          });
        }
        if (concluido(statusDe(c.code))) feitos++;
        return cardLimpo(c);
      }).join("");
      const chip = perfil ? `<span class="chip ${feitos === cs.length ? "chip-ok" : ""}">${feitos}/${cs.length}</span>` : "";
      html += coluna(`${s}º período`, chip, cards, perfil && feitos === cs.length ? "col-completa" : "");
    }
    return html;
  }

  // ---------- Vista: Linha do tempo ----------
  function semPerfil(texto) {
    return `<div class="sem-perfil">
      <h2>Nenhum perfil carregado</h2>
      <p>${texto}</p>
      <p>Use <b>Criar perfil</b> para começar do zero, ou <b>Importar do SIGA</b> com os PDFs do Histórico e do BOA.
      Também dá para carregar um <code>perfil.js</code> pronto pelo painel de importação.</p></div>`;
  }

  function renderTimeline() {
    if (!M.periodos.length) return semPerfil("A linha do tempo mostra as disciplinas no período em que você cursou (ou planeja cursar).");
    let html = "";
    M.periodos.forEach((p) => {
      let cr = 0;
      const cards = p.itens.map((it) => {
        if (it.status !== "reprovado" && it.category != 5) cr += it.credits;
        const subs = [];
        if (it.equivale && M.curr[it.equivale]) subs.push(`≡ ${esc(it.equivale)} ${esc(M.curr[it.equivale].name)}`);
        if (it.dispensas.length) subs.push("dispensa " + it.dispensas.map(esc).join(", "));
        const aviso = p.tipo !== "cursado" && it.status !== "reprovado" ? avisos(it.alvo, p.pi) : [];
        const oferta = p.tipo === "planejado" && it.status !== "reprovado" ? avisoOferta(it.alvo, p.nome) : null;
        if (oferta) { aviso.push(oferta.texto); subs.push(`<span class="aviso-oferta">${esc(oferta.curto)}</span>`); }
        return card({
          code: it.alvo, name: it.name, cat: it.category, status: it.status, nota: it.nota,
          meta: metaDe(it.code, it.category == 5 ? it.horas : it.credits, it.category), sub: subs.join("<br>"), aviso,
        });
      }).join("");
      const tipoChip = { atual: `<span class="chip chip-atual">atual</span>`, planejado: `<span class="chip chip-plan">planejado</span>`, cursado: "" }[p.tipo];
      const chips = `${tipoChip}${p.nota ? `<span class="chip">${esc(p.nota)}</span>` : ""}<span class="chip">${fmt(cr)} cr</span>${p.editado ? `<span class="chip chip-alerta" title="Editado no navegador — exporte o perfil para salvar">editado</span>` : ""}`;
      html += coluna(p.nome, chips, cards, `col-${p.tipo}`);
    });

    const tot = totais();
    const falta = M.grade.filter((c) => c.code && FORCA[statusDe(c.code)] <= FORCA.reprovado);
    let cards = falta.map((c) => card({
      code: c.code, name: c.name, cat: c.category, status: "pendente",
      meta: metaDe(c.code, c.credits, c.category), sub: `recomendada no ${c.semester}º período`,
    })).join("");
    for (const k of ["2", "4", "3", "5"]) {
      const T = tot[k]; const resta = T.total - T.ok - T.prev - T.plan;
      if (resta > 0) cards += card({ name: CATS[k].nome, cat: k, status: "pendente", classe: "resumo", meta: `faltam ${fmt(resta)} ${CATS[k].un} sem período` });
    }
    html += coluna("A alocar", `<span class="chip chip-alerta">${falta.length} disciplinas</span>`, cards, "col-alocar");
    return html;
  }

  // ---------- Vista: Optativas ----------
  function situacaoOpt(i) {
    const s = statusDe(i.code);
    if (concluido(s)) return { cls: "feita", txt: `${ROTULO[s]}${periodoDe(i.code, concluido).length ? " em " + periodoDe(i.code, concluido).pop() : ""}` };
    if (emCurso(s)) return { cls: "plan", txt: `${ROTULO[s]} em ${periodoDe(i.code, emCurso).pop()}` };
    if (s === "analise") { const e = M.pendEq[i.code]; return { cls: "plan", txt: `Equivalência ${e.status || "a pedir"} (com ${cursadasDe(e).map((c) => c.code).join(" + ")})` }; }
    const f = faltamHoje(i);
    if (!f.length) return { cls: "livre", txt: "Liberada" };
    const futuros = f.filter((r) => emCurso(statusDe(r)));
    if (futuros.length === f.length) return { cls: "breve", txt: `Libera após ${f.map((r) => `${r} (${periodoDe(r, emCurso).pop()})`).join(", ")}` };
    return { cls: "bloq", txt: `Falta ${f.join(", ")}` };
  }

  function renderOptativas() {
    if (!M.catalogo.length) return `<div class="sem-perfil"><h2>Sem catálogo de optativas</h2><p>Inclua <code>js/optativas.js</code> com <code>window.optativas[${M.cursoId}]</code>.</p></div>`;
    const tot = totais();
    const lista = M.catalogo.filter((o) => (o.category || 2) == filtros.grupo);
    const prefixos = [...new Set(lista.map((o) => o.code.slice(0, 3)))].sort();
    const q = filtros.busca.trim().toLowerCase();
    const futuros = periodosFuturos();
    if (!futuros.some((p) => p.nome === filtros.alvo)) filtros.alvo = futuros.length ? futuros[0].nome : "";
    const alvo = filtros.alvo;
    const encaixe = (code) => {
      const of = ofertaDe(code, alvo);
      if (!of) return { of: null };
      return { of, choques: chocaCom(of, alvo, code) };
    };
    const itens = lista.map((o) => M.info(o.code)).filter((i) => {
      if (filtros.prefixo && !i.code.startsWith(filtros.prefixo)) return false;
      if (filtros.ativas && M.ref && !ativa(i.code) && !concluido(statusDe(i.code)) && !emCurso(statusDe(i.code))) return false;
      if (q && !(i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q))) return false;
      const s = statusDe(i.code);
      if (filtros.ocultarFeitas && concluido(s)) return false;
      if (filtros.liberadas && !concluido(s) && !emCurso(s) && faltamHoje(i).length) return false;
      if (filtros.cabe && alvo) { const e = encaixe(i.code); if (!e.of || e.choques.length) return false; }
      return true;
    });
    const T = tot[filtros.grupo] || tot[2];
    const resumoPlan = futuros.map((p) => {
      const v = p.itens.filter((it) => it.category == filtros.grupo).reduce((a, it) => a + (filtros.grupo == 5 ? it.horas || 0 : it.credits), 0);
      return `<span class="chip chip-plan">${esc(p.nome)}: ${fmt(v)} ${CATS[filtros.grupo].un}</span>`;
    }).join("");

    const cards = itens.map((i) => {
      const sit = situacaoOpt(i);
      const s = statusDe(i.code);
      const acoes = futuros.map((p) => {
        const dentro = p.itens.some((it) => it.alvo === i.code);
        return `<button type="button" class="mini-btn${dentro ? " on" : ""}" data-plan="${esc(p.nome)}" data-pcode="${esc(i.code)}" title="${dentro ? "Remover de" : "Planejar em"} ${esc(p.nome)}">${dentro ? "✓" : "+"} ${esc(p.nome)}</button>`;
      }).join("");
      const pars = paridadesOferta(i.code);
      const selo = M.ref ? (pars.length
        ? `<span class="selo ativa" title="Tem turma na referência (Notion)">ativa · ${pars.map((x) => (x === "impar" ? "/1" : "/2")).join(" ")}</span>`
        : `<span class="selo inativa" title="Sem turma na referência (Notion)">inativa</span>`) : "";
      return `<div class="opt s-${s} opt-${sit.cls}${M.ref && !pars.length ? " opt-inativa" : ""}" data-code="${esc(i.code)}">
        <button type="button" class="opt-corpo" data-abrir="${esc(i.code)}">
          <span class="nome">${esc(i.name)}${selo}</span>
          <span class="meta">${seloGuia(i.code)} ${esc(metaDe(i.code, valorCat(i), i.category))}${i.workload && i.category != 5 ? ` · ${i.workload} h` : ""}${textoPresenca(i.code) ? " · " + esc(textoPresenca(i.code)) : ""}</span>
          <span class="sit">${esc(sit.txt)}</span>
          ${alvo && !concluido(s) ? (() => {
            const e = encaixe(i.code);
            if (!e.of) return `<span class="hor sem">sem turma de referência em ${esc(alvo)}</span>`;
            return `<span class="hor ${e.choques.length ? "choca" : "cabe"}">🕒 ${esc(e.of.join(", "))} · ${e.choques.length ? "choca com " + esc(e.choques.join(", ")) : "cabe em " + esc(alvo)}</span>`;
          })() : ""}
        </button>
        ${concluido(s) ? "" : `<div class="opt-acoes">${acoes}</div>`}
      </div>`;
    }).join("");

    return `<div class="optativas">
      <div class="filtros">
        <div class="seg seg-sm">${Object.entries(GRUPOS_OPT).map(([k, n]) => `<button type="button" data-fgrupo="${k}" aria-selected="${filtros.grupo == k}">${n}</button>`).join("")}</div>
        <input type="search" class="campo busca" id="busca-opt" placeholder="Buscar por nome ou código…" value="${esc(filtros.busca)}">
        ${M.ref ? `<label class="check"><input type="checkbox" data-fcheck="ativas" ${filtros.ativas ? "checked" : ""}> só ativas</label>` : ""}
        <label class="check"><input type="checkbox" data-fcheck="liberadas" ${filtros.liberadas ? "checked" : ""}> só liberadas</label>
        <label class="check"><input type="checkbox" data-fcheck="ocultarFeitas" ${filtros.ocultarFeitas ? "checked" : ""}> ocultar cursadas</label>
        ${futuros.length ? `<label class="check">horários de
          <select class="campo campo-sm" data-falvo>${futuros.map((p) => `<option ${p.nome === alvo ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></label>
          <label class="check"><input type="checkbox" data-fcheck="cabe" ${filtros.cabe ? "checked" : ""}> só as que cabem em ${esc(alvo)}</label>` : ""}
      </div>
      <div class="chips prefixos">
        <button type="button" class="chip chip-btn${!filtros.prefixo ? " on" : ""}" data-fprefixo="">todas</button>
        ${prefixos.map((p) => `<button type="button" class="chip chip-btn${filtros.prefixo === p ? " on" : ""}" data-fprefixo="${p}">${p}</button>`).join("")}
      </div>
      <p class="resumo-opt"><b>${CATS[filtros.grupo].nome}:</b> ${fmt(T.ok)}${T.prev ? ` +${fmt(T.prev)} previstos` : ""} de ${fmt(T.total)} ${CATS[filtros.grupo].un} · faltam ${fmt(Math.max(0, T.total - T.ok - T.prev - T.plan))} sem período ${resumoPlan}
        <span class="dica">${itens.length} de ${lista.length} disciplinas</span></p>
      ${futuros.length ? "" : `<p class="dica">Crie um período planejado (na aba Cronograma) para poder planejar optativas.</p>`}
      <div class="opt-grid">${cards || `<p class="vazio">Nenhuma disciplina com esses filtros.</p>`}</div>
      ${(() => {
        const par = paridade(alvo);
        const extras = (M.ref && M.ref.semCodigo && par && M.ref.semCodigo[par]) || [];
        if (!extras.length) return "";
        return `<h3 class="sub-titulo">Outras turmas na referência de ${esc(alvo)} (sem código no currículo)</h3>
          <ul class="lista sem-codigo">${extras.map((x) => { const ch = chocaCom(x.horarios, alvo);
            return `<li><span>${esc(x.name)}</span><small class="${ch.length ? "choca" : "cabe"}">${esc(x.horarios.join(", "))} · ${ch.length ? "choca com " + esc(ch.join(", ")) : "cabe"}</small></li>`; }).join("")}</ul>`;
      })()}
      ${M.ref ? `<p class="dica">Horários de referência: ${esc(M.ref.fonte || "")}${M.ref.consultado ? `, consultado em ${esc(M.ref.consultado)}` : ""}. Confira no SIGA antes da inscrição.</p>` : ""}
    </div>`;
  }

  // ---------- Vista: Equivalências & Extensão ----------
  // Semestre "2021/1" -> índice; usado para o prazo de 5 anos (Res. CEG 01/2017)
  const semIdx = (nome) => { const m = /^(\d{4})\/([12])$/.exec(nome || ""); return m ? (+m[1]) * 2 + (+m[2] - 1) : null; };
  const semAtual = () => { const d = new Date(); return d.getFullYear() * 2 + (d.getMonth() < 6 ? 0 : 1); };
  function idadeAnos(code) {
    const r = (M.regs[code] || []).filter((x) => x.status === "aprovado").pop();
    const i = r ? semIdx(M.periodos[r.pi]?.nome) : null;
    return i == null ? null : (semAtual() - i) / 2;
  }
  const boaDe = (c) => ((M.boa && M.boa.naoExplicitadas) || []).find((d) => d.code === c) || null;
  const chDe = (c) => { const b = boaDe(c); if (b && b.ch) return b.ch; const i = M.info(c); return i ? (i.workload || 0) : 0; };
  const crDe = (c) => { const b = boaDe(c); if (b) return b.credits; const i = M.info(c); return i ? i.credits || 0 : 0; };
  // Quem usa cada cursada: dispensa automática ou pedido (exceto indeferidos)
  function usosDe(code, ignorar) {
    const u = [];
    if (M.dispensou[code]) u.push({ tipo: "dispensa", txt: `dispensou ${M.dispensou[code].join(", ")}` });
    getEq().forEach((e, k) => {
      if (k === ignorar || (e.status || "a pedir") === "indeferido") return;
      const c = cursadasDe(e).find((x) => x.code === code);
      if (c) u.push({ tipo: "pedido", k, txt: `${e.status || "a pedir"} → ${e.pedida}${c.papel === "horas" ? " (só horas)" : ""}` });
    });
    return u;
  }

  function descr(code) {
    const i = M.info(code);
    if (!i) return `<b>${esc(code)}</b> <small class="alerta">não encontrada</small>`;
    const quando = periodoDe(code, concluido).pop();
    const b = boaDe(code);
    if (b) return `<b>${esc(code)}</b> ${esc(b.name)}<br><small>${fmt(b.credits)} cr · ${b.ch} h · grau ${esc(b.grau)}${quando ? ` · ${esc(quando)}` : ""}</small>`;
    const grupo = i.fonte === "grade" ? "obrigatória" : (GRUPOS_OPT[i.category] || (CATS[i.category] || {}).nome || "").toLowerCase();
    return `<b>${esc(code)}</b> ${esc(i.name)}<br><small>${esc(metaDe(null, valorCat(i), i.category))}${i.workload ? ` · ${i.workload} h` : ""} · ${esc(grupo)}${quando ? ` · ${esc(quando)}` : ""}</small>`;
  }

  // Checagens automáticas de um pedido
  function analisaPedido(e) {
    const cs = cursadasDe(e), pi = M.info(e.pedida);
    const ch = cs.reduce((a, c) => a + chDe(c.code), 0);
    const chPed = pi ? pi.workload || 0 : 0;
    const idades = cs.map((c) => ({ code: c.code, anos: idadeAnos(c.code) }));
    const velhas = idades.filter((c) => c.anos != null && c.anos > 5);
    const semData = idades.filter((c) => c.anos == null);
    const cr = cs.reduce((a, c) => a + crDe(c.code), 0);
    const semConteudo = !cs.some((c) => c.papel !== "horas");
    const repetidas = (e.status || "a pedir") === "indeferido" ? [] : cs.filter((c) => usosDe(c.code, getEq().indexOf(e)).length).map((c) => c.code);
    const pedidaFeita = concluido((M.regs[e.pedida] || []).reduce((a, r) => (FORCA[r.status] > FORCA[a] ? r.status : a), "pendente")) && (e.status || "") !== "deferido";
    return { cs, ch, chPed, chOk: !chPed || ch >= chPed, velhas, semData, cr, semConteudo, repetidas, pedidaFeita };
  }

  function renderPedidos() {
    const tot = totais();
    const eqs = getEq(), ext = getExt();
    const boaNE = (M.boa && M.boa.naoExplicitadas) || null;
    const neCodes = boaNE ? boaNE.map((d) => d.code)
      : Object.keys(M.regs).filter((c) => { const i = M.info(c); return i && i.fonte === "perfil" && i.category == 3 && concluido(statusDe(c)); });

    // ----- contas -----
    const livreExig = tot[3].total;
    const livreHoje = tot[3].ok + tot[3].prev;
    const reservado = [...M.pendConsumo].filter((c) => !M.consumidas.has(c) && (M.info(c) || {}).category == 3).reduce((a, c) => a + crDe(c), 0);
    const livreDepois = livreHoje - reservado;
    const cenario = (k) => {
      const T = tot[k];
      const depois = T.ok + T.prev + T.anal;
      const falta = Math.max(0, T.total - depois);
      const sobra = depois + T.plan - T.total;
      return { T, depois, falta, faltaSemPlano: Math.max(0, falta - T.plan), sobra };
    };
    const op = cenario(2), hu = cenario(4);
    const planejadas = (k) => periodosPlanejaveis().flatMap((p) => p.itens.filter((it) => it.category == k && emCurso(it.status)).map((it) => ({ p: p.nome, it })));
    const sobraTxt = (k, c) => {
      if (c.sobra <= 0) return "";
      const lista = planejadas(k).filter((x) => valorCat(x.it) <= c.sobra);
      return lista.length ? `<p class="dica">Se tudo for deferido, sobram ${fmt(c.sobra)} cr planejados: dá para tirar ${lista.map((x) => `<b>${esc(x.it.code)}</b> (${esc(x.p)}, ${fmt(valorCat(x.it))} cr${x.it.cel.size ? `, libera ${esc(formataHorarios(x.it.cel).join(", "))}` : ""})`).join(" ou ")}.</p>` : "";
    };
    const linhaConta = (nome, hoje, maisAnal, depois, total, un, extra) =>
      `<tr><td><b>${nome}</b></td><td>${fmt(hoje)}</td><td>${maisAnal ? (maisAnal > 0 ? "+" : "−") + fmt(Math.abs(maisAnal)) : "—"}</td><td><b>${fmt(depois)}</b> / ${fmt(total)} ${un}</td><td>${extra}</td></tr>`;
    const contas = `<section class="sec">
      <h2>Contas automáticas</h2>
      <table class="tabela contas"><thead><tr><th>Grupo</th><th>Hoje</th><th>Pedidos pendentes</th><th>Se tudo for deferido</th><th>Situação</th></tr></thead><tbody>
        ${linhaConta("Optativas", op.T.ok + op.T.prev, op.T.anal, op.depois, op.T.total, "cr",
          op.falta ? `faltam ${fmt(op.falta)} cr · planejados ${fmt(op.T.plan)} cr → ${op.faltaSemPlano ? `<span class="alerta">ainda faltam ${fmt(op.faltaSemPlano)} cr sem período</span>` : `<span class="ok">fecha ✓</span>`}` : `<span class="ok">completo ✓</span>`)}
        ${linhaConta("Humanas", hu.T.ok + hu.T.prev, hu.T.anal, hu.depois, hu.T.total, "cr",
          hu.falta ? `faltam ${fmt(hu.falta)} cr${hu.faltaSemPlano ? ` · <span class="alerta">${fmt(hu.faltaSemPlano)} cr sem período</span>` : ` · <span class="ok">fecha com o planejado ✓</span>`}` : `<span class="ok">completo ✓</span>`)}
        ${linhaConta("Livre escolha", livreHoje, reservado ? -reservado : 0, livreDepois, livreExig, "cr",
          livreDepois >= livreExig ? `<span class="ok">sobram ${fmt(livreDepois - livreExig)} cr acima do exigido ✓</span>` : `<span class="alerta">ficaria ${fmt(livreExig - livreDepois)} cr abaixo do exigido</span>`)}
      </tbody></table>
      ${sobraTxt(2, op)}${sobraTxt(4, hu)}
      <p class="dica">Pedidos "a pedir"/"em análise" entram na coluna do meio. Os créditos das cursadas usadas saem de livre escolha; a pedida entra no grupo dela. Indeferidos não contam.</p>
    </section>`;

    // ----- pedidos -----
    const linhasEq = eqs.map((e, k) => {
      const a = analisaPedido(e);
      const cursCell = a.cs.map((c, j) => {
        const id = idadeAnos(c.code);
        return `<div class="cur">${descr(c.code)}
          <div class="cur-acoes"><select class="campo campo-sm" data-eqpapel="${k}:${j}"><option value="conteudo" ${c.papel !== "horas" ? "selected" : ""}>conteúdo</option><option value="horas" ${c.papel === "horas" ? "selected" : ""}>só horas</option></select>
          ${id != null && id > 5 ? `<small class="alerta" title="Res. CEG 01/2017">⚠ ${fmt(Math.floor(id * 2) / 2)} anos: pode exigir exame de suficiência</small>` : ""}
          ${a.cs.length > 1 ? `<button type="button" class="x" data-eqrmc="${k}:${j}" title="Tirar do pedido">×</button>` : ""}</div></div>`;
      }).join("") + `<div class="add add-cur"><input class="campo campo-sm" list="eq-cursadas" data-eqnovo="${k}" placeholder="+ cursada"><button type="button" class="mini-btn" data-eqaddc="${k}">juntar</button></div>`;
      const checks = [
        a.chPed ? `<li class="${a.chOk ? "ok" : "alerta"}">${a.chOk ? "✓" : "✗"} C.H. ${a.ch} h ${a.chOk ? "≥" : "<"} ${a.chPed} h</li>` : "",
        a.semConteudo ? `<li class="alerta">✗ nenhuma cursada marcada como conteúdo</li>` : "",
        a.velhas.length ? `<li class="alerta">⚠ mais de 5 anos: ${a.velhas.map((v) => esc(v.code)).join(", ")}</li>` : "",
        a.semData.length ? `<li class="alerta">Data de aprovação não confirmada: ${a.semData.map((v) => esc(v.code)).join(", ")}</li>` : "",
        a.cs.length && !a.velhas.length && !a.semData.length ? `<li class="ok">✓ dentro de 5 anos pela estimativa semestral</li>` : "",
        a.repetidas.length ? `<li class="alerta">⚠ já usada em outro pedido/dispensa: ${a.repetidas.map(esc).join(", ")}</li>` : "",
        M.pedidosComConflito.has(e) ? `<li class="alerta">Créditos fora da soma até resolver o uso em duplicidade.</li>` : "",
        a.pedidaFeita ? `<li class="alerta">⚠ a pedida já está aprovada/prevista</li>` : "",
        `<li>usa ${fmt(a.cr)} cr de livre escolha</li>`,
      ].join("");
      return `<tr class="eq-${(e.status || "a pedir").replace(/\W+/g, "-")}">
        <td>${cursCell}</td><td class="seta">→</td><td>${descr(e.pedida)}</td>
        <td><ul class="checks">${checks}</ul></td>
        <td><select class="campo campo-sm" data-eqstatus="${k}">${EQ_STATUS.map((x) => `<option ${x === (e.status || "a pedir") ? "selected" : ""}>${x}</option>`).join("")}</select>
          <input class="campo campo-sm" data-eqobs="${k}" value="${esc(e.obs || "")}" placeholder="processo, data, motivo…"></td>
        <td><button type="button" class="x" data-eqdel="${k}" title="Remover pedido">×</button></td></tr>`;
    }).join("");

    const cursadasOpc = neCodes.map((c) => { const u = usosDe(c); return `<option value="${esc(c)}">${esc(c)} — ${esc((boaDe(c) || M.info(c) || {}).name || "")}${u.length ? ` (${esc(u.map((x) => x.txt).join("; "))})` : ""}</option>`; }).join("");
    const pedidasOpc = M.catalogo.filter((o) => !concluido(statusDe(o.code)) && o.category != 5)
      .map((o) => `<option value="${esc(o.code)}">${esc(o.code)} — ${esc(o.name)} (${GRUPOS_OPT[o.category] || ""}, ${o.workload || "?"} h${ativa(o.code) ? ", ativa" : ""})</option>`).join("");
    const aceOpc = M.catalogo.filter((o) => o.category == 5).map((o) => `<option value="${esc(o.code)}">${esc(o.code)} — ${esc(o.name)} (${o.horas} h)</option>`).join("");

    // ----- livre escolha: de onde vem e para onde vai -----
    let somaLivre = 0, somaUsada = 0;
    const linhasLivre = neCodes.map((c) => {
      const cr = crDe(c); somaLivre += cr;
      const u = usosDe(c);
      const usada = M.consumidas.has(c);
      if (usada) somaUsada += cr;
      const id = idadeAnos(c);
      return `<tr class="${u.length ? "" : "livre"}"><td>${descr(c)}</td><td>${id != null ? `${fmt(Math.floor(id * 2) / 2)} anos${id > 5 ? " ⚠" : ""}` : "—"}</td>
        <td>${u.length ? u.map((x) => `<span class="chip ${x.tipo === "dispensa" ? "" : "chip-plan"}">${esc(x.txt)}</span>`).join(" ") : `<button type="button" class="chip chip-btn" data-eqcand="${esc(c)}">livre — usar num pedido</button>`}</td></tr>`;
    }).join("");

    const linhasExt = ext.map((a, k) => `<tr>
        <td><input class="campo campo-sm" data-ext="${k}" data-campo="nome" value="${esc(a.nome || "")}" placeholder="Atividade"></td>
        <td><input class="campo campo-sm" list="ace-list" data-ext="${k}" data-campo="code" value="${esc(a.code || "")}" placeholder="Código ACE"></td>
        <td><input class="campo campo-sm num" type="number" min="0" data-ext="${k}" data-campo="horas" value="${esc(a.horas || 0)}"></td>
        <td><input class="campo campo-sm" data-ext="${k}" data-campo="periodo" value="${esc(a.periodo || "")}" placeholder="2027/1"></td>
        <td><span class="situ situ-${(a.status || "planejada").replace(/\W+/g, "-")}">${esc(a.status || "planejada")}</span>
          <select class="campo campo-sm" data-ext="${k}" data-campo="status">${EXT_STATUS.map((x) => `<option ${x === (a.status || "planejada") ? "selected" : ""}>${x}</option>`).join("")}</select></td>
        <td><button type="button" class="x" data-extdel="${k}" title="Remover">×</button></td></tr>`).join("");
    const T5 = tot[5];

    return `<div class="pedidos">
      ${temEdicoes() ? `<p class="aviso-edicao">Há edições só neste navegador. <button type="button" class="btn btn-sm" id="exportar">${icone("baixar", 14)} Exportar perfil.js</button></p>` : ""}
      ${contas}
      <section class="sec">
        <h2>Pedidos de dispensa / equivalência</h2>
        <p class="dica">Um pedido pode juntar várias cursadas para uma eletiva. Marque qual cursada traz o <b>conteúdo</b> e quais entram <b>só pelas horas</b>. O app soma a C.H. e avisa sobre o prazo de 5 anos (Res. CEG 01/2017).</p>
        <table class="tabela"><thead><tr><th>Cursada(s)</th><th></th><th>Eletiva pedida</th><th>Checagens</th><th>Situação</th><th></th></tr></thead>
        <tbody>${linhasEq || `<tr><td colspan="6" class="vazio">Nenhum pedido.</td></tr>`}</tbody></table>
        <div class="add">
          <input class="campo" list="eq-cursadas" id="eq-c" placeholder="Cursada(s): ex. EET100 + EEL170">
          <span class="seta">→</span>
          <input class="campo" list="eq-pedidas" id="eq-p" placeholder="Eletiva pedida (código)">
          <button type="button" class="btn btn-sm" id="eq-add">Adicionar pedido</button>
          <datalist id="eq-cursadas">${cursadasOpc}</datalist><datalist id="eq-pedidas">${pedidasOpc}</datalist>
        </div>
        <p class="dica">A primeira cursada entra como "conteúdo" e as demais como "só horas"; dá para trocar depois.</p>
      </section>
      <section class="sec">
        <h2>Livre escolha ${M.boa ? `<small>cursadas não explicitadas no BOA${M.boa.emissao ? ` de ${esc(M.boa.emissao)}` : ""}</small>` : ""}</h2>
        <p class="dica">${fmt(somaLivre)} cr no total · exigido ${fmt(livreExig)} cr · já consumidos por deferimento ${fmt(somaUsada)} cr · reservados por pedidos pendentes ${fmt(reservado)} cr.</p>
        <table class="tabela"><thead><tr><th>Disciplina</th><th>Cursada há</th><th>Uso</th></tr></thead><tbody>${linhasLivre}</tbody></table>
      </section>
      <section class="sec">
        <h2>Extensão / ACE <small>${fmt(T5.ok)} h validadas${T5.plan ? ` · ${fmt(T5.plan)} h em andamento/planejadas` : ""} · exigido ${fmt(T5.total)} h</small></h2>
        <div class="barra"><span class="b-ok" style="width:${Math.min(100, (T5.ok / T5.total) * 100)}%;background:var(--cat5)"></span><span class="b-plan" style="width:${Math.min(100 - Math.min(100, (T5.ok / T5.total) * 100), (T5.plan / T5.total) * 100)}%;background:color-mix(in srgb, var(--cat5) 30%, transparent)"></span></div>
        <table class="tabela"><thead><tr><th>Atividade</th><th>Código ACE</th><th>Horas</th><th>Período</th><th>Situação</th><th></th></tr></thead>
        <tbody>${linhasExt || `<tr><td colspan="6" class="vazio">Nenhuma atividade.</td></tr>`}</tbody></table>
        <datalist id="ace-list">${aceOpc}</datalist>
        <button type="button" class="btn btn-sm" id="ext-add">+ Atividade</button>
      </section>
    </div>`;
  }

  // ---------- Planejamento: pendências e sugestões ----------
  function ultimoPlanejado() { const f = periodosFuturos(); return f.length ? f[f.length - 1] : null; }

  function necessidades() {
    const t = totais(), need = {};
    for (const k in t) need[k] = Math.max(0, t[k].total - t[k].ok - t[k].prev - t[k].plan);
    return need;
  }

  function candidatos(p) {
    const par = paridade(p.nome);
    const of = (M.ref && par && M.ref[par]) || {};
    const need = necessidades();
    const lista = [];
    Object.keys(of).forEach((code) => {
      const i = M.info(code); if (!i) return;
      const s = statusDe(code);
      if (concluido(s) || emCurso(s) || s === "analise") return;
      const obrig = i.fonte === "grade" && i.category == 1;
      if (!obrig && !(need[i.category] > 0)) return;
      if (i.req.some((r) => !cumpridoAntes(r, p.pi)) || i.coreq.some((r) => !cumpridoAntes(r, p.pi + 1))) return;
      const choques = chocaCom(of[code], p.nome, code);
      lista.push({ code, i, obrig, horarios: of[code], cel: parseHorarios(of[code]), choques });
    });
    const nv = (c) => { const g = guiaDe(c); return g && g.nivel ? g.nivel : 3; };
    lista.sort((a, b) => (b.obrig - a.obrig) || (a.choques.length - b.choques.length) || (nv(a.code) - nv(b.code)) || (valorCat(b.i) - valorCat(a.i)) || a.code.localeCompare(b.code));
    return lista;
  }

  // Proposta gulosa: obrigatórias primeiro, depois optativas/humanas até cobrir o que falta, sem choques
  function montaProposta(p) {
    const ocup = new Set(); p.itens.forEach((it) => { if (it.status !== "reprovado") it.cel.forEach((c) => ocup.add(c)); });
    const need = necessidades();
    const itens = [];
    candidatos(p).forEach((c) => {
      if ([...c.cel].some((x) => ocup.has(x))) return;
      if (!c.obrig && !(need[c.i.category] > 0)) return;
      itens.push({ code: c.code, horarios: c.horarios.slice(), name: c.i.name, cr: valorCat(c.i), cat: c.i.category });
      c.cel.forEach((x) => ocup.add(x));
      if (!c.obrig) need[c.i.category] -= valorCat(c.i);
    });
    // sem horário fixo (PG, estágio) entram no último período planejado
    if (ultimoPlanejado() && ultimoPlanejado().nome === p.nome) {
      M.grade.filter((c) => c.code && FORCA[statusDe(c.code)] <= FORCA.reprovado && !paridadesOferta(c.code).length
        && reqsOk(c.code, p.pi)).forEach((c) => itens.push({ code: c.code, name: c.name, cr: c.credits, cat: 1, semHorario: true }));
    }
    return { periodo: p.nome, itens, falta: need };
  }
  const reqsOk = (code, pi) => { const i = M.info(code); return !i || (i.req.every((r) => cumpridoAntes(r, pi)) && i.coreq.every((r) => cumpridoAntes(r, pi + 1))); };

  function renderPlanejamento(p) {
    const ult = ultimoPlanejado();
    const need = necessidades();
    const tot = totais();
    // pendências para formar
    const semPeriodo = M.grade.filter((c) => c.code && FORCA[statusDe(c.code)] <= FORCA.reprovado);
    const avisosPlan = [];
    periodosPlanejaveis().forEach((q) => q.itens.forEach((it) => {
      if (it.status === "reprovado") return;
      const av = avisos(it.alvo, q.pi);
      if (!av.length) return;
      const outras = paridadesOferta(it.alvo).filter((x) => x !== paridade(q.nome));
      avisosPlan.push(`<li><b>${esc(it.code)}</b> em ${esc(q.nome)}: ${esc(av.join("; "))}. ${outras.length ? `Também tem turma em semestres ${outras[0] === "par" ? "pares (/2)" : "ímpares (/1)"}.` : `Sem turma de referência em semestres ${paridade(q.nome) === "impar" ? "pares (/2)" : "ímpares (/1)"} — se ficar para depois, só volta em ${q.nome.replace(/\d{4}/, (a) => +a + 1)}.`} Alternativa: pedir à coordenação quebra de requisito (cursar junto com o requisito).</li>`);
    }));
    periodosFuturos().forEach((q) => q.itens.forEach((it) => {
      if (it.status === "reprovado") return;
      const of = avisoOferta(it.alvo, q.nome);
      if (of) avisosPlan.push(`<li><b>${esc(it.code)}</b> em ${esc(q.nome)}: <span class="aviso-oferta">${esc(of.texto)}</span></li>`);
    }));
    const pend = semPeriodo.map((c) => {
      const pars = paridadesOferta(c.code);
      return `<li><b>${esc(c.code)}</b> ${esc(c.name)} <small>${pars.length ? `turma em ${pars.map((x) => (x === "impar" ? "/1" : "/2")).join(" e ")}` : "sem horário fixo"}</small></li>`;
    }).join("") + ["2", "4", "5", "3"].filter((k) => need[k] > 0).map((k) =>
      `<li><b>${CATS[k].nome}</b>: faltam ${fmt(need[k])} ${CATS[k].un} sem período${tot[k].anal ? ` (${fmt(tot[k].anal)} em análise por equivalência)` : ""}</li>`).join("");

    // sugestões (com busca por horário)
    let cands = candidatos(p);
    if (cronoSlot != null) cands = cands.filter((c) => c.cel.has(cronoSlot));
    const sug = cands.map((c) => `<li class="${c.choques.length ? "choca" : "cabe"}">
        <span>${seloGuia(c.code, true)} <b>${esc(c.code)}</b> ${esc(c.i.name)} <small>${esc(metaDe(null, valorCat(c.i), c.i.category))} · ${c.obrig ? "obrigatória" : esc(GRUPOS_OPT[c.i.category] || "")}</small><br>
        <small>${textoPresenca(c.code) ? esc(textoPresenca(c.code)) + " · " : ""}🕒 ${esc(c.horarios.join(", "))}${c.choques.length ? ` · choca com ${esc(c.choques.join(", "))}` : " · cabe"}</small></span>
        <button type="button" class="mini-btn" data-sugadd="${esc(c.code)}">+ ${esc(p.nome)}</button></li>`).join("");
    const slotTxt = cronoSlot != null ? `${DIAS_NOME[Math.floor(cronoSlot / 100)]} ${pad(cronoSlot % 100)}h` : "";

    const prop = proposta && proposta.periodo === p.nome ? proposta : null;
    const propHtml = prop ? `<div class="proposta">
        <h4>Proposta para ${esc(p.nome)} (${fmt(prop.itens.reduce((a, x) => a + (x.cat == 5 ? 0 : x.cr), 0))} cr)</h4>
        <ul>${prop.itens.map((x) => `<li>${seloGuia(x.code, true)} <b>${esc(x.code)}</b> ${esc(x.name)} <small>${x.semHorario ? "sem horário fixo" : esc(x.horarios.join(", "))}</small></li>`).join("") || "<li>Nada novo cabe sem choque.</li>"}</ul>
        ${["2", "4"].filter((k) => prop.falta[k] > 0).map((k) => `<p class="alerta">Ainda faltariam ${fmt(prop.falta[k])} cr de ${CATS[k].nome}${k === "4" ? " (Humanas não tem horário na referência — escolha no SIGA)" : " — tente outro semestre ou equivalência"}.</p>`).join("")}
        <div class="add"><button type="button" class="btn btn-sm btn-primario-sm" id="prop-aplicar" ${prop.itens.length ? "" : "disabled"}>Aplicar proposta</button><button type="button" class="btn btn-sm btn-ghost" id="prop-fechar">Descartar</button></div>
      </div>` : "";

    return `<section class="plano">
      <div class="plano-col">
        <h3>Para formar${ult ? ` até ${esc(ult.nome)}` : ""}</h3>
        <ul class="lista-plano">${pend || "<li>Nada pendente sem período 🎉</li>"}</ul>
        ${avisosPlan.length ? `<h4>Atenção</h4><ul class="lista-plano atencao">${avisosPlan.join("")}</ul>` : ""}
      </div>
      <div class="plano-col">
        <h3>Sugestões para ${esc(p.nome)} ${slotTxt ? `<span class="chip chip-plan">${esc(slotTxt)} <button type="button" class="x-chip" id="slot-limpar">×</button></span>` : ""}</h3>
        <p class="dica">Só turmas ativas na referência, com requisitos cumpridos antes de ${esc(p.nome)} e que ainda fazem falta. ${cronoSel ? "" : "Clique numa célula vazia da grade para buscar por horário."}</p>
        <button type="button" class="btn btn-sm" id="prop-gerar">✨ Sugerir combinação sem choques</button>
        ${propHtml}
        <ul class="lista-sug">${sug || `<li class="vazio">Nenhuma turma${slotTxt ? " nesse horário" : ""}.</li>`}</ul>
      </div>
    </section>`;
  }

  // ---------- Vista: Cronograma ----------
  function renderCronograma() {
    const ps = periodosPlanejaveis();
    if (!ps.length && !perfil) return semPerfil("O cronograma usa os períodos atual e planejados do perfil.");
    if (!ps.some((p) => p.nome === cronoPeriodo)) cronoPeriodo = (periodosFuturos()[0] || ps[0] || {}).nome || null;
    const p = M.periodos.find((x) => x.nome === cronoPeriodo);
    const abas = ps.map((x) => `<button type="button" data-cperiodo="${esc(x.nome)}" aria-selected="${x.nome === cronoPeriodo}">${esc(x.nome)}${x.tipo === "atual" ? " · atual" : ""}</button>`).join("");
    const topo = `<div class="crono-topo">
        <div class="seg seg-sm">${abas}</div>
        <button type="button" class="btn btn-sm" id="novo-periodo">+ Período</button>
        <span class="espaco"></span>
        ${temEdicoes() ? `<span class="chip chip-alerta">edições não exportadas</span>` : ""}
        <button type="button" class="btn btn-sm" id="exportar" title="Baixar perfil.js com as edições">${icone("baixar", 14)} Exportar perfil.js</button>
        ${p && p.editado && periodoDoPerfil(p.nome) ? `<button type="button" class="btn btn-sm btn-ghost" id="descartar" title="Volta ao conteúdo original do perfil">Descartar edições de ${esc(p.nome)}</button>` : ""}
        ${p && p.tipo === "planejado" ? `<button type="button" class="btn btn-sm btn-perigo-ghost" id="excluir-periodo">${icone("lixeira", 14)} Excluir período</button>` : ""}
      </div>`;
    if (!p) return `<div class="crono">${topo}<p class="dica">Crie um período para começar.</p></div>`;

    const cor = {};
    p.itens.forEach((it, i) => { cor[it.code] = PALETA[i % PALETA.length]; });
    if (cronoSel && !p.itens.some((it) => it.code === cronoSel)) cronoSel = null;

    // ocupação e choques
    const ocup = {};
    p.itens.forEach((it) => it.cel.forEach((c) => (ocup[c] = ocup[c] || []).push(it.code)));
    const choques = Object.entries(ocup).filter(([, v]) => v.length > 1)
      .map(([c, v]) => ({ c: +c, v })).sort((a, b) => a.c - b.c);
    const textoChoques = {};
    choques.forEach(({ c, v }) => {
      const k = v.slice().sort().join(" × ");
      (textoChoques[k] = textoChoques[k] || []).push(c);
    });

    let cr = 0, hs = 0;
    const lista = p.itens.map((it) => {
      if (it.status !== "reprovado" && it.category != 5) cr += it.credits;
      hs += it.cel.size;
      const aviso = p.tipo !== "cursado" && it.status !== "reprovado" ? avisos(it.alvo, p.pi) : [];
      const oferta = p.tipo === "planejado" && it.status !== "reprovado" ? avisoOferta(it.alvo, p.nome) : null;
      return `<li class="crono-item${cronoSel === it.code ? " sel" : ""} s-${esc(it.status)}" style="--cor:${cor[it.code]}">
        <button type="button" class="crono-pick" data-csel="${esc(it.code)}">
          <i class="sw"></i><span><b>${seloGuia(it.alvo, true)} ${esc(it.name)}</b><small>${esc(metaDe(it.code, it.category == 5 ? it.horas : it.credits, it.category))}${it.status !== "planejado" ? " · " + ROTULO[it.status].toLowerCase() : ""}${textoPresenca(it.alvo) ? " · " + esc(textoPresenca(it.alvo)) : ""}</small>
          <small class="${it.cel.size ? "" : "alerta"}">${it.cel.size ? `${formataHorarios(it.cel).join(", ")} · ${it.cel.size} h/sem` : "sem horário"}</small>
          ${aviso.length ? `<small class="alerta">⚠ ${esc(aviso.join("; "))}</small>` : ""}
          ${oferta ? `<small class="aviso-oferta">⚠ ${esc(oferta.texto)}</small>` : ""}</span>
        </button>
        <button type="button" class="x" data-cremove="${esc(it.code)}" title="Remover do período">×</button>
        ${(() => {
          const of = ofertaDe(it.code, p.nome);
          if (!of) return "";
          const igual = formataHorarios(parseHorarios(of)).join(",") === formataHorarios(it.cel).join(",");
          if (igual) return `<div class="ref-linha ok">✓ igual ao horário de referência</div>`;
          return `<div class="ref-linha">Referência: ${esc(of.join(", "))} <button type="button" class="mini-btn" data-usaref="${esc(it.code)}">usar</button></div>`;
        })()}
      </li>`;
    }).join("");

    // opções para adicionar: obrigatórias pendentes + catálogo ainda não feitas
    const jaNo = new Set(p.itens.map((it) => it.alvo));
    const opcoes = M.grade.filter((c) => c.code && !concluido(statusDe(c.code)) && !jaNo.has(c.code))
      .map((c) => `<option value="${esc(c.code)}">${esc(c.code)} — ${esc(c.name)} (obrigatória)</option>`)
      .concat(M.catalogo.filter((o) => !concluido(statusDe(o.code)) && !jaNo.has(o.code))
        .map((o) => `<option value="${esc(o.code)}">${esc(o.code)} — ${esc(o.name)} (${GRUPOS_OPT[o.category] || "optativa"})</option>`)).join("");

    // grade semanal
    const linhas = H_FIM - H_INI;
    let celulas = "";
    for (let h = H_INI; h < H_FIM; h++) {
      celulas += `<div class="hora" style="grid-row:${h - H_INI + 2}">${pad(h)}h</div>`;
      DIAS.forEach((d, di) => {
        const c = di * 100 + h;
        celulas += `<div class="cel${ocup[c] && ocup[c].length > 1 ? " choque" : ""}${cronoSlot === c ? " slot" : ""}" data-cel="${c}" style="grid-row:${h - H_INI + 2};grid-column:${di + 2}"></div>`;
      });
    }
    let blocos = "";
    DIAS.forEach((d, di) => {
      // blocos contínuos por disciplina, com faixas (lanes) para choques
      const runs = [];
      p.itens.forEach((it) => {
        const hs2 = [...it.cel].filter((c) => Math.floor(c / 100) === di).map((c) => c % 100).sort((a, b) => a - b);
        let ini = null, ant = null;
        hs2.concat([null]).forEach((h) => {
          if (h != null && ant != null && h === ant + 1) { ant = h; return; }
          if (ini != null) runs.push({ it, ini, fim: ant + 1 });
          ini = ant = h;
        });
      });
      runs.sort((a, b) => a.ini - b.ini);
      const lanes = [];
      runs.forEach((r) => {
        let l = lanes.findIndex((fim) => fim <= r.ini);
        if (l < 0) { l = lanes.length; lanes.push(0); }
        lanes[l] = r.fim; r.lane = l;
      });
      runs.forEach((r) => {
        const sobrep = runs.filter((o) => o.ini < r.fim && r.ini < o.fim);
        const n = Math.max(...sobrep.map((o) => o.lane)) + 1;
        const ini = Math.max(r.ini, H_INI), fim = Math.min(r.fim, H_FIM);
        if (fim <= ini) return;
        blocos += `<div class="bloco-aula${sobrep.length > 1 ? " conflito" : ""}${cronoSel === r.it.code ? " sel" : ""} s-${esc(r.it.status)}"
          style="grid-column:${di + 2};grid-row:${ini - H_INI + 2} / ${fim - H_INI + 2};--cor:${cor[r.it.code]};--lane:${r.lane};--lanes:${n}">
          <b>${seloGuia(r.it.alvo, true)} ${esc(r.it.code)}</b><span>${esc(r.it.name)}</span><small>${pad(ini)}–${pad(fim)}h</small></div>`;
      });
    });
    const foraFaixa = p.itens.filter((it) => [...it.cel].some((c) => c % 100 < H_INI || c % 100 >= H_FIM));

    return `<div class="crono">
      ${topo}
      <div class="crono-corpo">
        <aside class="crono-lista">
          <h3>${esc(p.nome)} <small>${fmt(cr)} cr · ${hs} h/sem</small></h3>
          ${(() => {
            if (!M.guia) return "";
            const cont = {};
            p.itens.forEach((it) => { const g = guiaDe(it.alvo); if (g && g.nivel && it.status !== "reprovado") cont[g.nivel] = (cont[g.nivel] || 0) + 1; });
            const ks = Object.keys(cont).sort();
            return ks.length ? `<p class="carga">Carga: ${ks.map((k) => `${M.guia.niveis[k].emoji}×${cont[k]}`).join("  ")}</p>` : "";
          })()}
          <p class="dica">${cronoSel ? `Clique (ou arraste) nas células para marcar/desmarcar horários de <b>${esc(cronoSel)}</b>. Esc para sair.` : "Escolha uma disciplina e clique na grade para definir os horários."}</p>
          <ul>${lista || `<li class="vazio">Nenhuma disciplina.</li>`}</ul>
          <div class="add">
            <input class="campo" list="opcoes-add" id="add-code" placeholder="Adicionar disciplina (código ou nome)…">
            <datalist id="opcoes-add">${opcoes}</datalist>
            <button type="button" class="btn btn-sm" id="add-btn">Adicionar</button>
          </div>
        </aside>
        <div class="crono-grade-wrap">
          ${choques.length ? `<div class="choques">⚠ Choque de horário: ${Object.entries(textoChoques).map(([k, cs]) => `<b>${esc(k)}</b> (${formataHorarios(new Set(cs)).join(", ")})`).join(" · ")}</div>` : `<div class="choques ok">Sem choques de horário.</div>`}
          ${foraFaixa.length ? `<p class="dica">Fora da faixa ${H_INI}h–${H_FIM}h: ${foraFaixa.map((it) => esc(it.code)).join(", ")}</p>` : ""}
          <div class="crono-grade${cronoSel ? " editando" : " buscando"}" style="--linhas:${linhas}">
            <div class="canto"></div>
            ${DIAS_NOME.map((d, i) => `<div class="dia" style="grid-column:${i + 2}">${d}</div>`).join("")}
            ${celulas}${blocos}
          </div>
        </div>
      </div>
      ${p.tipo === "planejado" ? renderPlanejamento(p) : ""}
    </div>`;
  }

  // ---------- Progresso / legenda ----------
  function renderProgresso() {
    const t = totais();
    $("#progresso").innerHTML = Object.keys(CATS).map((k) => {
      const T = t[k], c = CATS[k];
      if (!T.total) return "";
      const p = (v) => Math.max(0, Math.min(100, (v / T.total) * 100));
      const pOk = p(T.ok), pPrev = Math.min(100 - pOk, p(T.prev)), pPlan = Math.min(100 - pOk - pPrev, p(T.plan));
      const pAnal = Math.min(100 - pOk - pPrev - pPlan, p(T.anal));
      const falta = Math.max(0, T.total - T.ok - T.prev);
      return `<div class="prog cat-${k}">
        <div class="prog-topo"><span>${c.nome}</span><b>${fmt(T.ok)}${T.prev ? `<i> +${fmt(T.prev)}</i>` : ""} / ${fmt(T.total)} ${c.un}</b></div>
        <div class="barra"><span class="b-ok" style="width:${pOk}%"></span><span class="b-prev" style="width:${pPrev}%"></span><span class="b-plan" style="width:${pPlan}%"></span><span class="b-anal" style="width:${pAnal}%"></span></div>
        <small>${falta ? `faltam ${fmt(falta)} ${c.un}${T.plan ? ` · ${fmt(Math.min(T.plan, falta))} planejados` : ""}${T.anal ? ` · ${fmt(T.anal)} em análise` : ""}` : "completo ✓"}</small>
      </div>`;
    }).join("");
  }

  function renderLegenda() {
    $("#legenda").innerHTML = ["aprovado", "previsto", "cursando", "planejado", "analise", "reprovado", "pendente"]
      .map((s) => `<span class="leg s-${s}"><i></i>${ROTULO[s]}</span>`).join("")
      + `<span class="leg-sep"></span>`
      + Object.keys(CATS).map((k) => `<span class="leg-cat cat-${k}"><i></i>${CATS[k].nome}</span>`).join("")
      + (M.guia ? `<span class="leg-sep"></span>` + Object.values(M.guia.niveis).map((n) => `<span class="leg-niv" title="${esc(n.texto)}">${n.emoji} ${esc(n.nome)}</span>`).join("") : "");
  }

  function renderAvisoPerfil() {
    const el = $("#aviso-perfil");
    el.hidden = !avisosPerfil.size;
    el.textContent = [...avisosPerfil].map(([origem, erro]) =>
      `Não foi possível usar ${origem}. Campo inválido: ${erro}.`).join(" ");
  }

  /** Nome pessoal do perfil: campo "nome" ou, em perfis antigos, o "Fulano" de "Grade ECI — Fulano". */
  function nomeDoPerfil(p) {
    if (!p) return "";
    if (texto(p.nome) && p.nome.trim()) return p.nome.trim();
    const m = /^\s*Grade ECI\s*[—–-]\s*(.+?)\s*$/.exec(texto(p.titulo) ? p.titulo : "");
    return m ? m[1] : "";
  }
  /** Logo + "Grade ECI — Nome" (nome e progresso só com perfil válido). A aba do navegador fica "Grade ECI". */
  function renderCabecalho() {
    const nome = nomeDoPerfil(perfil);
    const h1 = $("#titulo");
    h1.textContent = TITULO;
    if (nome) {
      const s = document.createElement("span");
      s.className = "nome-perfil"; s.textContent = ` — ${nome}`;
      h1.append(s);
    }
    $("#subtitulo").textContent = (perfil && texto(perfil.subtitulo) && perfil.subtitulo) || "Fluxograma interativo do curso";
    document.title = TITULO;
    document.body.classList.toggle("com-perfil", !!perfil);
    document.body.classList.toggle("sem-perfil-valido", !perfil);
    renderAtalhos();
  }

  // ---------- Barra de atalhos e Configurações ----------
  const temaAtual = () => (window.TEMA ? window.TEMA.atual() : "claro");
  function infoAtalho(id) {
    const escuro = temaAtual() === "escuro";
    return {
      perfil: { btn: "btn-perfil", ic: perfil ? "perfil" : "perfil-novo", rot: perfil ? "Editar perfil" : "Criar perfil", nome: "Perfil" },
      importar: { btn: "btn-importar", ic: "importar", rot: "Importar do SIGA", nome: "Importar do SIGA" },
      tema: { btn: "btn-tema", ic: escuro ? "sol" : "lua", rot: escuro ? "Modo claro" : "Modo escuro", aria: escuro ? "Ativar modo claro" : "Ativar modo escuro", nome: "Tema" },
      privacidade: { btn: "btn-privacidade", ic: "privacidade", rot: "Privacidade", nome: "Privacidade" },
      referencias: { btn: "btn-referencias", ic: "referencias", rot: "Referências", nome: "Referências" },
      tags: { btn: "btn-tags", ic: "tags", rot: "Tags", nome: "Tags" },
    }[id];
  }
  const ACAO_ATALHO = {
    perfil: () => abreDialogoPerfil(), importar: () => abreImportador(), tema: () => window.TEMA && window.TEMA.alterna(),
    privacidade: () => abrePrivacidade(), referencias: () => abreReferencias(), tags: () => abreEditorTags(),
  };
  /** Atalhos visíveis: os fixados e, sem perfil válido, "Criar perfil" e "Importar do SIGA". */
  function renderAtalhos() {
    $("#seletor-modo").hidden = ocultarSeletor;
    const vis = ATALHOS.filter((id) => atalhos.includes(id) || (!perfil && (id === "perfil" || id === "importar")));
    const box = $("#atalhos");
    const chave = `${vis.join(",")}|${!!perfil}|${temaAtual()}`;
    if (box.dataset.chave === chave) return;
    const foco = document.activeElement && box.contains(document.activeElement) ? document.activeElement.id : null;
    box.dataset.chave = chave;
    box.innerHTML = vis.map((id) => {
      const a = infoAtalho(id), primario = !perfil && !atalhos.includes(id);
      return `<button type="button" id="${a.btn}" class="btn btn-icone btn-atalho${primario ? " btn-primario-topo" : ""}" title="${esc(a.aria || a.rot)}"${a.aria ? ` aria-label="${esc(a.aria)}"` : ""}>${icone(a.ic)}<span class="rot">${esc(a.rot)}</span></button>`;
    }).join("");
    if (foco && document.getElementById(foco)) document.getElementById(foco).focus();
  }
  function linhaAtalho(id, rotulo) {
    const a = infoAtalho(id), fix = atalhos.includes(id);
    return `<div class="cfg-linha">
      ${rotulo ? `<span class="cfg-rot">${rotulo}</span>` : `<button type="button" class="btn btn-sm cfg-abrir" data-abrir-atalho="${id}">${icone(a.ic, 16)} ${esc(a.rot)}</button>`}
      <button type="button" class="btn btn-sm cfg-fixar" data-fixar="${id}" aria-pressed="${fix}" title="${fix ? "Fixado na barra: clique para desafixar" : "Mostrar também na barra do topo"}">${icone("fixar", 15)}<span>${fix ? "Fixado" : "Fixar"}</span><span class="sr"> ${esc(a.nome)} na barra</span></button>
    </div>`;
  }
  function renderConfig() {
    const ap = window.TEMA ? window.TEMA.aparencia() : "icone-texto";
    const te = window.TEMA ? window.TEMA.escolha() || "sistema" : "sistema";
    const radio = (nome, v, rot, marcado) => `<label class="opcao"><input type="radio" name="${nome}" value="${v}"${marcado ? " checked" : ""}> ${rot}</label>`;
    $("#config-corpo").innerHTML = `
      <h1 id="dlg-config-titulo" class="dlg-titulo">${icone("configuracoes", 20)} Configurações</h1>
      <p class="dlg-texto">As escolhas valem na hora e ficam salvas neste navegador. Fixe um item para ele aparecer também na barra do topo; ele continua aqui.</p>
      <section class="cfg-sec" aria-labelledby="cfg-h-perfil"><h2 id="cfg-h-perfil">Perfil e dados</h2>
        ${linhaAtalho("perfil")}${linhaAtalho("importar")}${linhaAtalho("privacidade")}
        <div class="cfg-linha"><button type="button" class="btn btn-sm btn-perigo-ghost" id="btn-limpar">${icone("limpar", 16)} Limpar dados salvos</button>
          <span class="dica">Apaga marcações, planos e o perfil salvo neste navegador.</span></div>
      </section>
      <section class="cfg-sec" aria-labelledby="cfg-h-ap"><h2 id="cfg-h-ap">Aparência</h2>
        <fieldset class="opcoes"><legend>Abas e barra</legend>
          ${radio("aparencia", "icone-texto", "Ícone e texto", ap === "icone-texto")}${radio("aparencia", "texto", "Somente texto", ap === "texto")}${radio("aparencia", "icone", "Somente ícone", ap === "icone")}
        </fieldset>
        <fieldset class="opcoes"><legend>Tema</legend>
          ${radio("tema", "sistema", "Igual ao sistema", te === "sistema")}${radio("tema", "claro", "Claro", te === "claro")}${radio("tema", "escuro", "Escuro", te === "escuro")}
          ${linhaAtalho("tema", "Botão sol/lua na barra")}
        </fieldset>
        <fieldset class="opcoes"><legend>Modo</legend>
          ${radio("modo", "classico", "Clássico: só a grade e a paleta", modoClassico)}${radio("modo", "completo", "Completo: com as abas", !modoClassico)}
          <label class="opcao"><input type="checkbox" id="cfg-seletor"${ocultarSeletor ? "" : " checked"}> Mostrar o seletor de modo no topo</label>
        </fieldset>
      </section>
      <section class="cfg-sec" aria-labelledby="cfg-h-grade"><h2 id="cfg-h-grade">Grade</h2>
        <fieldset class="opcoes"><legend>Exibir nos cartões</legend>
          ${[["codigo", "Código e créditos"], ["notas", "Notas"], ["dificuldade", "Dificuldade"], ["presenca", "Presença"]].map(([k, n]) =>
            `<label class="opcao"><input type="checkbox" data-exibir="${k}"${exibir[k] ? " checked" : ""}> ${n}</label>`).join("")}
        </fieldset>
        <fieldset class="opcoes"><legend>Setas de requisitos</legend>
          ${radio("setas", "ocultas", "Ocultas", exibir.setas === "ocultas")}${radio("setas", "foco", "Disciplina em foco", exibir.setas === "foco")}${radio("setas", "todas", "Todas", exibir.setas === "todas")}
        </fieldset>
        <label class="opcao"><input type="checkbox" id="cfg-cadeado"${cadeado ? " checked" : ""}> Proteger as disciplinas cursadas (cadeado da paleta)</label>
        ${linhaAtalho("tags")}
      </section>
      <section class="cfg-sec" aria-labelledby="cfg-h-ref"><h2 id="cfg-h-ref">Referências</h2>
        ${linhaAtalho("referencias")}
      </section>
      <div class="dlg-acoes"><button type="submit" value="" class="btn btn-escuro">Fechar</button></div>`;
  }
  /** Redesenha Configurações aberta (após uma mudança) e devolve o foco ao mesmo controle. */
  function atualizaConfig() {
    const d = $("#dlg-config"); if (!d.open) return;
    const a = document.activeElement;
    let sel = null;
    if (a && d.contains(a)) {
      if (a.id) sel = "#" + a.id;
      else if (a.dataset.fixar) sel = `[data-fixar="${a.dataset.fixar}"]`;
      else if (a.dataset.abrirAtalho) sel = `[data-abrir-atalho="${a.dataset.abrirAtalho}"]`;
      else if (a.dataset.exibir) sel = `[data-exibir="${a.dataset.exibir}"]`;
      else if (a.name) sel = `input[name="${a.name}"][value="${a.value}"]`;
    }
    renderConfig();
    const el = sel && d.querySelector(sel); if (el) el.focus();
  }
  function defineModo(classico) {
    modoClassico = classico; save("modoClassico", modoClassico);
    if (!modoClassico) pincel = null;   // no modo completo o clique volta a abrir detalhes
    seletorECI = false;
    fechaDetalhes(); render();
  }
  function limpaDados() {
    const temImportado = !perfilArquivo && perfilLocalAntigo();
    if (!confirm("Apagar tudo o que foi salvo neste navegador (marcações manuais, edições de planejamento" + (temImportado ? ", perfil importado" : "") + ")?")) return;
    marcacoes = {}; creditosManuais = {}; plano = { periodos: {}, novos: [] }; proposta = null; cronoSlot = null;
    ["manual", "marcacoes", "creditos", "plano", "perfilImportado"].forEach((k) => save(k, null));
    avisosPerfil.delete("perfil importado");
    if (perfilImportado) { perfilImportado = null; perfil = perfilArquivo || perfilLocalAntigo(); }
    if (temImportado) { save("perfil", null); perfil = null; }
    montaModelo(); render(); atualizaConfig();
  }

  // ---------- Referências (os links só abrem por clique; nada externo é carregado aqui) ----------
  const LINKS = [
    { url: "https://intranet.ufrj.br/", nome: "Intranet UFRJ (acesso ao SIGA)", txt: "Histórico, BOA e inscrição em disciplinas." },
    { url: "https://www.siga.ufrj.br/sira/repositorio-curriculo/distribuicoes/A46B41C8-92A4-F79C-7383-BE627D84214E.html",
      nome: "Currículo oficial da ECI", txt: "Repositório público de currículos do SIGA (2012/1 em diante)." },
    { url: "https://github.com/JoaoAndrade01/grade", nome: "Repositório deste site", txt: "Código, documentação e registro de mudanças." },
    { url: "https://github.com/gremio-eci/grade", nome: "Projeto original do Grêmio de ECI", txt: "A grade interativa que deu origem a este fork." },
  ];
  function abreReferencias() {
    const box = $("#detalhes");
    const ref = (M.ref && M.ref.fonte) || "Notion — Grades de ECI (Editável)";
    box.innerHTML = `<header><span class="cat-pill">${icone("referencias", 14)} Referências</span><button type="button" class="fechar" aria-label="Fechar">×</button></header>
      <h3>De onde vêm os dados</h3>
      <ul class="lista refs">
        <li><span><b>Horários de referência e guia dos alunos</b><br><small>${esc(ref)}${M.ref && M.ref.consultado ? `, consultado em ${esc(M.ref.consultado)}` : ""}.
          Página mantida por alunos de ECI; os horários mudam a cada semestre. Confira sempre no SIGA.</small></span></li>
        <li><span><b>Currículo e catálogo de optativas</b><br><small>Copiados do currículo oficial no SIGA para js/database.js e js/optativas.js.</small></span></li>
      </ul>
      <h4>Links</h4>
      <ul class="lista refs">${LINKS.map((l) => `<li><a href="${l.url}" target="_blank" rel="noopener noreferrer">${esc(l.nome)} ${icone("externo", 13)}<span class="sr"> (abre em outra aba)</span></a><small>${esc(l.txt)}</small></li>`).join("")}</ul>
      <p class="dica">Os links abrem em outra aba só quando você clica. Abrir esta lista não carrega nada de fora deste site.</p>`;
    box.hidden = false;
    box.dataset.alvo = "referencias";
  }

  function render() {
    // Modo clássico: força a aba Grade e mantém um pincel sempre ativo
    document.body.classList.toggle("classico", modoClassico);
    $("#modo-classico").checked = modoClassico;
    if (modoClassico) { if (pincel === null) pincel = (tags[0] || {}).id || ""; }
    const vista = modoClassico ? "grade" : vistaAtual;
    renderCabecalho();
    document.querySelectorAll("[data-vista]").forEach((b) =>
      b.setAttribute("aria-selected", String(b.dataset.vista === vista)));
    document.body.classList.toggle("pintando", pincel !== null);
    // Sem perfil válido, os indicadores de progresso ficam ocultos (a grade continua utilizável).
    $("#barra-geral").hidden = !perfil;
    if (perfil) renderBarraGeral();
    const detalhado = !!perfil && (vista === "timeline" || progressoAberto);
    $("#progresso").hidden = !detalhado;
    $("#legenda").hidden = vista !== "timeline";
    if (detalhado) renderProgresso();
    if (vista === "timeline") renderLegenda();
    $("#ferramentas").hidden = vista !== "grade" || modoClassico;
    if (vista === "grade" && !modoClassico) $("#ferramentas").innerHTML = renderFerramentas();
    $("#paleta").hidden = vista !== "grade";
    if (vista === "grade") $("#paleta").innerHTML = renderPaleta();
    const imp = $("#aviso-importado");
    renderAvisoPerfil();
    imp.hidden = !perfilImportado;
    const doSiga = /^siga/i.test((perfilImportado && perfilImportado.fonte && perfilImportado.fonte.geradoPor) || "");
    if (perfilImportado) imp.innerHTML = `${doSiga ? "Usando o perfil importado do SIGA" : "Usando o perfil salvo"}${perfilImportado.fonte && perfilImportado.fonte.boaEmissao ? ` (BOA de ${esc(perfilImportado.fonte.boaEmissao)})` : ""}, guardado neste navegador.
      <button type="button" class="link" id="baixar-importado">Baixar perfil.js</button> ·
      <button type="button" class="link" id="descartar-importado">${perfilArquivo ? "Voltar ao perfil/perfil.js" : "Descartar perfil salvo"}</button>`;
    const painel = $("#painel");
    const scroll = painel.dataset.vista === vista ? { x: painel.scrollLeft, y: window.scrollY } : null;
    painel.className = `painel vista-${vista}`;
    painel.dataset.vista = vista;
    const foco = document.activeElement && document.activeElement.id === "busca-opt" ? document.activeElement.selectionStart : null;
    const fn = { timeline: renderTimeline, optativas: renderOptativas, cronograma: renderCronograma, pedidos: renderPedidos,
      eci: () => window.ECI.renderSecao(contextoECI()) }[vista] || renderGrade;
    painel.innerHTML = fn();
    if (vista === "eci") window.ECI.montado(painel, contextoECI());
    desenhaSetas();
    if (scroll) { painel.scrollLeft = scroll.x; window.scrollTo(0, scroll.y); }
    else {
      painel.scrollLeft = 0;
      if (vista === "timeline") {
        const atual = painel.querySelector(".col-atual");
        if (atual) painel.scrollLeft = Math.max(0, atual.offsetLeft - painel.clientWidth / 2);
      }
    }
    if (foco != null) { const b = $("#busca-opt"); b.focus(); b.setSelectionRange(foco, foco); }
  }

  // ---------- Detalhes ----------
  function linhaCurso(code) {
    const i = M.info(code), s = statusDe(code);
    return `<li><button type="button" class="link" data-ir="${esc(code)}"><i class="dot s-${s}"></i>${esc(code)} ${esc(i ? i.name : "")}</button><small>${ROTULO[s]}</small></li>`;
  }

  function abreDetalhes(alvo) {
    const box = $("#detalhes");
    let html = "";
    if (alvo.code) {
      const code = alvo.code, i = M.info(code);
      if (!i) return;
      const s = statusDe(code);
      const hist = (M.regs[code] || []).map((r) =>
        `<li><b>${esc(M.periodos[r.pi]?.nome ?? "Período não confirmado")}</b> — ${ROTULO[r.status]}${r.nota != null ? ` · nota ${esc(r.nota)}` : ""}${r.via ? `<br><small>${esc(r.via)}</small>` : ""}</li>`).join("");
      const ds = M.deps[code] || [];
      const fonte = i.fonte === "grade" ? `${i.semester}º período recomendado` : i.fonte === "catalogo" ? (GRUPOS_OPT[i.category] || "optativa") : "fora do currículo";
      const futuros = periodosFuturos();
      html = `
        <header><span class="cat-pill cat-${i.category}">${CATS[i.category] ? CATS[i.category].nome : ""}</span>
          <button type="button" class="fechar" aria-label="Fechar">×</button></header>
        <h3>${esc(i.name)}</h3>
        <p class="det-meta">${esc(metaDe(code, valorCat(i), i.category))}${i.workload ? ` · ${i.workload} h` : ""} · ${esc(fonte)}</p>
        <p class="det-status s-${s}"><i class="dot s-${s}"></i>${ROTULO[s]}${Object.prototype.hasOwnProperty.call(marcacoes, code) ? " (marcada com o pincel)" : ""}</p>
        ${(() => {
          const lst = periodosFuturos().filter((p) => p.itens.some((it) => it.alvo === code && it.status !== "reprovado"))
            .map((p) => [p.nome, avisoOferta(code, p.nome)]).filter((x) => x[1]);
          return lst.length ? `<ul class="lista avisos-det">${lst.map(([n, a]) => `<li class="aviso-oferta">${esc(n)}: ${esc(a.texto)}</li>`).join("")}</ul>` : "";
        })()}
        ${(() => {
          const g = guiaDe(code); if (!g) return "";
          const n = g.nivel ? M.guia.niveis[g.nivel] : null;
          return `<h4>Guia dos alunos</h4><div class="guia">
            ${n ? `<p><b>${n.emoji} ${esc(n.nome)}</b> — ${esc(n.texto)}</p>` : ""}
            ${g.presenca ? `<p>👤 ${esc(PRESENCA[g.presenca])}</p>` : ""}
            ${g.descricao ? `<p>${esc(g.descricao)}</p>` : ""}
            ${g.avaliacao ? `<p><b>Avaliação:</b> ${esc(g.avaliacao)}</p>` : ""}
            ${g.dicas ? `<p><b>Dicas:</b> ${esc(g.dicas)}</p>` : ""}
            <p class="dica">Fonte: ${esc(M.guia.fonte || "")}. Opinião geral de alunos — não tome como lei.</p></div>`;
        })()}
        ${hist ? `<h4>Histórico</h4><ul class="lista">${hist}</ul>` : ""}
        ${i.req.length ? `<h4>Pré-requisitos</h4><ul class="lista">${i.req.map(linhaCurso).join("")}</ul>` : ""}
        ${i.coreq.length ? `<h4>Co-requisitos</h4><ul class="lista">${i.coreq.map(linhaCurso).join("")}</ul>` : ""}
        ${ds.length ? `<h4>Libera</h4><ul class="lista">${ds.map(linhaCurso).join("")}</ul>` : ""}
        ${!concluido(s) && futuros.length ? `<h4>Planejar</h4><div class="chips">${futuros.map((p) => {
          const dentro = p.itens.some((it) => it.alvo === code);
          return `<button type="button" class="mini-btn${dentro ? " on" : ""}" data-plan="${esc(p.nome)}" data-pcode="${esc(code)}">${dentro ? "✓" : "+"} ${esc(p.nome)}</button>`;
        }).join("")}</div>` : ""}
        <h4>Tag</h4>${protegida(code) ? `<p class="det-meta">${icone("cadeado", 14)} Protegida pelo cadeado: desligue o cadeado na paleta para alterar.</p>` : ""}
        <div class="chips">${tags.map((t) => `<button type="button" class="chip chip-btn tag-chip${tagDe(code) === t ? " on" : ""}" style="--tag:${esc(t.cor)}" data-settag="${esc(code)}" data-tag="${esc(t.id)}"${protegida(code) ? " disabled" : ""}><i></i>${esc(t.nome)}</button>`).join("")}
          <button type="button" class="chip chip-btn" data-settag="${esc(code)}" data-tag=""${protegida(code) ? " disabled" : ""}>sem tag</button></div>
        ${Object.prototype.hasOwnProperty.call(marcacoes, code) && !protegida(code) ? `<button type="button" class="btn btn-ghost" data-reset="${esc(code)}">Voltar ao que o perfil diz</button>` : ""}`;
      box.dataset.alvo = "c:" + code;
    } else if (alvo.idx != null) {
      const c = M.grade[+alvo.idx];
      const f = preenchimentoBlocos()[c.idx] || { nomes: [] };
      const v = creditosManuais[c.category] || 0;
      html = `
        <header><span class="cat-pill cat-${c.category}">${CATS[c.category] ? CATS[c.category].nome : ""}</span>
          <button type="button" class="fechar" aria-label="Fechar">×</button></header>
        <h3>${esc(c.name)}</h3>
        <p class="det-meta">${esc(metaDe(null, c.credits, c.category))} · ${c.semester}º período recomendado</p>
        ${f.nomes.some((x) => x.code) ? `<h4>Preenchido por</h4><ul class="lista">${f.nomes.filter((x) => x.code).map((x) => linhaCurso(x.code)).join("")}</ul>` : ""}
        ${GRUPOS_OPT[c.category] ? `<button type="button" class="btn btn-ghost" data-ver-opt="${c.category}">Ver catálogo: ${esc(GRUPOS_OPT[c.category])}</button>` : ""}
        <h4>Créditos extras (manual)</h4>
        <p class="det-meta">Some aqui ${CATS[c.category].un} de ${CATS[c.category].nome.toLowerCase()} que não estão no perfil.</p>
        <input type="number" min="0" step="1" value="${v}" data-creditos="${c.category}" class="campo">`;
      box.dataset.alvo = "i:" + c.idx;
    } else return;
    box.innerHTML = html;
    box.hidden = false;
  }

  function fechaDetalhes() { $("#detalhes").hidden = true; }
  function reabreDetalhes() {
    const box = $("#detalhes");
    if (box.hidden || !box.dataset.alvo) return;
    if (box.dataset.alvo === "tags") return abreEditorTags();
    if (box.dataset.alvo === "importar") return abreImportador();
    if (box.dataset.alvo === "privacidade") return abrePrivacidade();
    if (box.dataset.alvo === "referencias") return abreReferencias();
    const t = box.dataset.alvo.slice(0, 1), v = box.dataset.alvo.slice(2);
    abreDetalhes(t === "c" ? { code: v } : { idx: v });
  }

  /** Cadeado ligado: aprovadas pelo perfil ou marcadas como Cursada (tag que conta como concluída) não mudam. */
  function protegida(code) {
    if (!cadeado || !code) return false;
    if (statusPerfil(code) === "aprovado") return true;
    return Object.prototype.hasOwnProperty.call(marcacoes, code) && statusDaTag(marcacoes[code]) === "aprovado";
  }
  let anuncioTempo = null;
  function anuncia(msg) {
    const el = $("#anuncio");
    el.textContent = msg; el.classList.add("visivel");
    clearTimeout(anuncioTempo);
    anuncioTempo = setTimeout(() => { el.classList.remove("visivel"); }, 3500);
  }
  /** Aplica a tag `id` (ou "" = sem tag) à disciplina; null remove a marcação e volta ao perfil. */
  function marca(code, id) {
    if (protegida(code)) { anuncia(`${code} está protegida pelo cadeado. Desligue o cadeado na paleta para alterar.`); return; }
    if (id === null) delete marcacoes[code]; else marcacoes[code] = id;
    save("marcacoes", marcacoes);
    render(); reabreDetalhes();
  }
  /** Clique com o pincel: aplica a tag; clicar de novo com a mesma tag tira a tag. */
  function pinta(code) {
    if (protegida(code)) {   // o clique continua mostrando os detalhes e as setas
      destaca(code); defineFoco(code); abreDetalhes({ code });
      anuncia(`${code} está protegida pelo cadeado. Desligue o cadeado na paleta para alterar.`);
      return;
    }
    const atual = tagDe(code);
    marca(code, atual && atual.id === pincel ? "" : pincel);
  }

  function alternaPlano(nome, code) {
    const p = M.periodos.find((x) => x.nome === nome); if (!p) return;
    const atual = p.itens.find((it) => it.alvo === code);
    if (atual) removeDoPeriodo(nome, atual.code); else adicionaAoPeriodo(nome, code);
    reabreDetalhes();
  }

  // ---------- Privacidade ----------
  /**
   * Painel "Seus dados": explica e MOSTRA as garantias. A lista de recursos carregados vem da própria
   * API do navegador (performance.getEntriesByType), então dá para conferir que nada saiu deste site.
   */
  function abrePrivacidade() {
    const aqui = location.origin === "null" || location.protocol === "file:" ? "file:" : location.origin;
    const recursos = performance.getEntriesByType("resource").map((r) => r.name);
    const externos = recursos.filter((u) => { try { const o = new URL(u); return o.protocol !== "file:" && o.origin !== location.origin && o.protocol !== "blob:" && o.protocol !== "data:"; } catch (e) { return false; } });
    const chaves = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(STORE)) chaves.push([k.slice(STORE.length), (localStorage.getItem(k) || "").length]); } } catch (e) { /* sem acesso */ }
    const box = $("#detalhes");
    box.innerHTML = `<header><span class="cat-pill">${icone("privacidade", 14)} Privacidade</span><button type="button" class="fechar" aria-label="Fechar">×</button></header>
      <h3>Seus dados ficam neste computador</h3>
      <ul class="lista garantias">
        <li>${icone("cadeado", 16)} <span><b>A importação não envia dados.</b> A política de segurança (CSP)
          bloqueia conexões do código com outras origens, scripts externos e envios de formulário.</span></li>
        <li>${icone("offline", 16)} <span><b>Sem servidor, sem conta, sem rastreadores.</b> Tudo (inclusive o leitor de PDF) vem dos arquivos do próprio site.
          Funciona até sem internet.</span></li>
        <li>${icone("importar", 16)} <span><b>PDFs processados neste dispositivo.</b> O leitor de PDF decodifica cada página em memória.
          O importador descarta os cabeçalhos e usa somente as linhas acadêmicas e a data de emissão do BOA.</span></li>
        <li>${icone("privacidade", 16)} <span><b>Guardado só neste navegador</b> (localStorage). Outra pessoa, outro navegador ou o site publicado não veem nada disso.</span></li>
      </ul>
      <h4>Verificação ao vivo</h4>
      <p class="det-meta">${aqui === "file:" ? "Aberto direto do seu computador (<code>file:</code>): nenhum endereço de internet é usado." :
        `Recursos carregados por esta página: <b>${recursos.length}</b> · de outros sites: <b class="${externos.length ? "alerta" : "ok"}">${externos.length}</b>${externos.length ? ` (${esc(externos.join(", "))})` : " ✓"} · origem <code>${esc(aqui)}</code>.`}<br> Para conferir por conta própria: F12 → aba <b>Rede</b> (Network), ou desligue a internet e continue usando.</p>
      <h4>O que está guardado neste navegador</h4>
      <ul class="lista">${chaves.length ? chaves.map(([k, n]) => `<li><code>${esc(k)}</code><small>${(n / 1024).toFixed(1)} KB</small></li>`).join("") : "<li>Nada.</li>"}</ul>
      <div class="add">
        <button type="button" class="btn btn-sm" id="baixar-importado">${icone("baixar", 14)} Baixar meus dados (perfil.js)</button>
        <button type="button" class="btn btn-sm btn-ghost" id="apagar-tudo">${icone("lixeira", 14)} Apagar tudo deste navegador</button>
      </div>
      <p class="dica">Detalhes técnicos em docs/PRIVACIDADE.md.</p>`;
    box.hidden = false;
    box.dataset.alvo = "privacidade";
  }

  // ---------- Importar do SIGA (PDFs) ----------
  // Usa js/siga.js (mesmas regras de ferramentas/gerar_perfil.py) sobre o texto extraído pelo pdf.js.
  // Tudo roda no navegador: os PDFs não saem do computador.
  let resultadoImportacao = null;
  let previaObsoleta = false;
  const PREVIA_OBSOLETA = "Os dados da Grade mudaram. Escolha os PDFs e gere uma nova prévia.";

  function invalidaPrevia() {
    if (!resultadoImportacao) return;
    resultadoImportacao = null;
    previaObsoleta = true;
    if ($("#detalhes").dataset.alvo === "importar") {
      $("#detalhes .resumo-import")?.remove();
      $("#siga-status").textContent = PREVIA_OBSOLETA;
    }
  }

  function carregaScript(src) {
    return new Promise((ok, erro) => {
      const el = document.createElement("script");
      el.src = src; el.onload = ok; el.onerror = () => erro(new Error("não consegui carregar " + src));
      document.head.appendChild(el);
    });
  }
  let carregamentoPdf = null;
  function carregaPdfJs() {
    carregamentoPdf ??= iniciaLeitorPdf().catch((e) => { carregamentoPdf = null; throw e; });
    return carregamentoPdf;
  }

  async function iniciaLeitorPdf() {
    if (!window.SIGA) await carregaScript("js/siga.js");
    if (window.pdfjsLib) return;
    // O worker é carregado como script comum para funcionar também abrindo o index.html direto (file://).
    await carregaScript("js/vendor/pdf.worker.min.js");
    await carregaScript("js/vendor/pdf.min.js");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "js/vendor/pdf.worker.min.js";
  }
  async function linhasPDF(arquivo) {
    return window.SIGA.extrairLinhasPDF(window.pdfjsLib, await arquivo.arrayBuffer());
  }

  function abreImportador() {
    const r = resultadoImportacao;
    const box = $("#detalhes");
    box.innerHTML = `<header><span class="cat-pill">Importar</span><button type="button" class="fechar" aria-label="Fechar">×</button></header>
      <h3>Importar do SIGA</h3>
      <ol class="passos">
        <li>No SIGA, baixe em PDF o <b>Histórico</b> (e o do curso anterior, se você mudou de curso) e o <b>BOA</b>.</li>
        <li>Escolha os PDFs abaixo (pode selecionar todos de uma vez).</li>
        <li>Confira o resumo e clique em <b>Usar este perfil</b>. Planos, pedidos, extensão e tags que você já tinha são mantidos.</li>
      </ol>
      <p class="aviso-pdf" id="siga-aviso-pdf">${icone("cadeado", 16)} <span>O BOA e o Histórico são lidos neste navegador. Os PDFs não são enviados ao GitHub.</span></p>
      <input type="file" id="siga-pdfs" accept="application/pdf,.pdf" multiple class="campo" aria-describedby="siga-aviso-pdf">
      <button type="button" class="btn btn-primario" id="siga-gerar">Gerar perfil</button>
      <p class="dica" id="siga-status" role="status">${previaObsoleta ? PREVIA_OBSOLETA : "Os PDFs são processados neste navegador. Os cabeçalhos com dados pessoais são descartados."}</p>
      ${r ? `<div class="resumo-import">
        <h4>Resumo</h4>
        <ul class="lista">
          <li>${r.perfil.periodos.filter((p) => !p.planejado).length} períodos cursados/atuais${r.perfil.periodos.some((p) => p.planejado) ? ` + ${r.perfil.periodos.filter((p) => p.planejado).length} planejados (mantidos)` : ""}</li>
          <li>${r.perfil.periodos.reduce((a, p) => a + (p.planejado ? 0 : p.disciplinas.filter((d) => d.status !== "reprovado").length), 0)} disciplinas aprovadas ou em curso</li>
          ${r.atual ? `<li>Período atual: ${r.atual.disciplinas.length} disciplina(s) cursando no BOA</li>` : ""}
          ${r.boa ? `<li>BOA de ${esc(r.boa.emissao || "?")}: ${r.boa.naoExplicitadas.length} não explicitadas, ${r.boa.equivalencias.length} equivalência(s) automática(s)</li>`
            : `<li class="alerta">Sem BOA: nenhuma disciplina em curso foi atualizada.${r.perfil.periodos.some((p) => p.atual) ? " O período atual do perfil anterior foi mantido." : ""}</li>`}
          ${r.semCategoria.length ? `<li class="alerta">Atividades sem créditos fora do currículo e catálogo. Confira se são ACE: ${r.semCategoria.map(esc).join(", ")}.</li>` : ""}
          <li>Documentos reconhecidos: ${r.historicos} Histórico(s)${r.boa ? " e 1 BOA" : ""}</li>
        </ul>
        ${r.atual ? `<div class="periodo-sugerido">
          <label class="rotulo" for="siga-atual">Período atual sugerido</label>
          <input id="siga-atual" class="campo campo-sm" value="${esc(r.atualEscolhido)}" placeholder="sem data" maxlength="6"
            inputmode="numeric" autocomplete="off" aria-describedby="siga-atual-dica siga-atual-msg"${r.conflito ? ' aria-invalid="true"' : ""}>
          <p class="dica" id="siga-atual-dica">${r.ultimoReal
            ? `Último semestre do histórico (${esc(r.ultimoReal)}).`
            : "O histórico não tem um semestre para servir de base."} A sugestão considera o período atual já salvo e o Histórico. Corrija se precisar, no formato AAAA/1 ou AAAA/2, ou deixe em branco para manter o período sem data.</p>
          <p class="msg-campo" id="siga-atual-msg" aria-live="polite">${esc(r.conflito || "")}</p>
        </div>` : ""}
        <div id="siga-planos" class="siga-planos" aria-live="polite">${htmlPlanosImportacao(r)}</div>
        <button type="button" class="btn btn-primario" id="siga-usar"${importacaoBloqueada(r) ? " disabled" : ""}>Usar este perfil</button>
        <button type="button" class="btn btn-ghost" id="siga-baixar"${importacaoBloqueada(r) ? " disabled" : ""}>Baixar perfil.js</button>
        <button type="button" class="btn btn-ghost" id="siga-descartar">Descartar prévia</button>
      </div>` : ""}
      <h4>Ou carregar um perfil pronto</h4>
      <label class="btn btn-sm">Escolher perfil.js / .json<input type="file" id="importar" accept=".json,.js" hidden></label>`;
    box.hidden = false;
    box.dataset.alvo = "importar";
  }

  async function geraPerfilDoSiga() {
    const arquivos = [...($("#siga-pdfs").files || [])];
    const status = $("#siga-status");
    if (!arquivos.length) { status.textContent = "Escolha pelo menos um PDF."; return; }
    if ($("#siga-gerar").disabled) return;
    resultadoImportacao = null;
    $("#detalhes .resumo-import")?.remove();
    $("#siga-gerar").disabled = true;
    status.textContent = "Lendo PDFs…";
    try {
      await carregaPdfJs();
      const lidos = [];
      for (const f of arquivos) {
        const linhas = await linhasPDF(f);
        const tipo = linhas.some((l) => /BOLETIM DE ORIENTA/i.test(l)) ? "BOA" : "Histórico";
        lidos.push({ tipo, linhas });
      }
      const curriculo = {}, catalogo = {};
      M.grade.forEach((c) => { if (c.code) curriculo[c.code] = { category: c.category }; });
      M.catalogo.forEach((o) => { catalogo[o.code] = { category: o.category || 2 }; });
      const historicos = lidos.filter((x) => x.tipo === "Histórico").map((x) => window.SIGA.lerHistorico(x.linhas));
      const boaL = lidos.find((x) => x.tipo === "BOA");
      const boa = boaL ? window.SIGA.lerBOA(boaL.linhas) : null;
      if (!historicos.some((h) => h.registros.length) && !boa) throw new Error("não reconheci nenhum Histórico ou BOA do SIGA nesses arquivos");
      if (!status.isConnected || $("#detalhes").hidden) return;
      const anterior = perfilExportado();
      const atualAnterior = anterior.periodos.find((p) => p.atual);
      // Com BOA, a mesclagem do período atual depende da escolha feita na prévia.
      const base = boa ? { ...anterior, periodos: anterior.periodos.filter((p) => !p.atual) } : anterior;
      const novo = window.SIGA.montarPerfil({ historicos, boa, curriculo, catalogo, anterior: base });
      // O importador descarta os planejados até o semestre inferido. Guardamos esses planos para devolvê-los
      // depois da escolha do período atual (ou pedir uma decisão explícita se ainda colidirem).
      const planosFora = clone(anterior.periodos.filter((p) => p.planejado
        && !novo.periodos.some((q) => q.planejado && q.nome === p.nome)));
      const semCategoria = [...new Set((boa?.cursando || [])
        .filter((c) => c.ncc && !curriculo[c.code] && !catalogo[c.code]).map((c) => c.code))].sort();
      // Período atual inferido pelo importador (semestre seguinte ao último real); só com BOA. Pode ser corrigido na prévia.
      const atual = boa ? novo.periodos.find((p) => p.atual) || null : null;
      const ultimoReal = novo.periodos.filter((p) => !p.atual && !p.planejado && semestreValido(p.nome)).map((p) => p.nome).pop() || null;
      const anteriorDatado = semestreValido(atualAnterior?.nome) && (!ultimoReal || atualAnterior.nome > ultimoReal)
        && !conflitoPeriodo(novo, atualAnterior.nome);
      const mesmoBoaSemData = atualAnterior?.nome === "atual" && boa?.emissao && boa.emissao === anterior.fonte?.boaEmissao;
      const sugerido = anteriorDatado ? atualAnterior.nome : atual?.nome;
      previaObsoleta = false;
      resultadoImportacao = { perfil: novo, boa, semCategoria, historicos: historicos.filter((h) => h.registros.length).length,
        atual, atualAnterior, ultimoReal, conflito: null,
        atualEscolhido: atual && !mesmoBoaSemData && semestreValido(sugerido) ? sugerido : "",
        planosFora, descartarPlanos: false };
      avaliaImportacao(resultadoImportacao);
      abreImportador();
    } catch (e) {
      status.textContent = "Não deu certo: " + e.message;
    } finally {
      if (status.isConnected) $("#siga-gerar").disabled = false;
    }
  }

  function baixa(nome, texto) {
    const blob = new Blob([texto], { type: "text/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /** Conflito de nome do período atual com outro período do mesmo perfil (o atual pode manter o próprio nome). */
  function conflitoPeriodo(p, nome) {
    const atual = p.periodos.find((x) => x.atual);
    const outro = p.periodos.find((x) => x.nome === nome && x !== atual);
    return outro ? `${nome} já existe como período ${outro.planejado ? "planejado" : "cursado"}. Escolha outro semestre ou deixe em branco; nada foi alterado.` : null;
  }
  /** Renomeia o período atual de `p` (perfil já clonado) e acompanha as atividades de extensão daquele período. */
  function renomeiaPeriodoAtual(p, para) {
    const atual = p.periodos.find((x) => x.atual);
    if (!atual || atual.nome === para) return;
    const de = atual.nome;
    atual.nome = para;
    (p.extensao || []).forEach((a) => { if (a.periodo === de) a.periodo = para; });
  }
  /** Valida o semestre digitado na prévia do SIGA. Vazio = período atual sem data ("atual"). */
  function validaAtualImportado(r) {
    if (!r.atual) return null;
    const v = (r.atualEscolhido || "").trim();
    if (v && !semestreValido(v)) return "Use o formato AAAA/1 ou AAAA/2, ou deixe em branco.";
    return conflitoPeriodo(r.perfil, v || "atual");
  }
  /** Perfil da prévia com o período atual escolhido, sem os planos guardados à parte. */
  function perfilBaseImportacao(r) {
    const novo = clone(r.perfil);
    if (r.atual) {
      const nome = r.atualEscolhido.trim() || "atual";
      renomeiaPeriodoAtual(novo, nome);
      if (r.atualAnterior?.nome === nome) {
        const anotacoes = new Map(r.atualAnterior.disciplinas.filter(objeto).map((d) => [d.code, d]));
        novo.periodos.find((p) => p.atual).disciplinas.forEach((d) => {
          const anterior = anotacoes.get(d.code);
          if (anterior?.horarios != null) d.horarios = clone(anterior.horarios);
          if (anterior?.status) d.status = anterior.status;
        });
      }
    }
    return novo;
  }
  /** Planos anteriores que ainda colidem com algum período do perfil importado (com o atual escolhido). */
  function colisoesDePlanos(r) {
    const base = perfilBaseImportacao(r);
    return (r.planosFora || []).map((p) => {
      const q = base.periodos.find((x) => x.nome === p.nome);
      return q ? { nome: p.nome, n: (p.disciplinas || []).length, com: q.atual ? "atual" : q.planejado ? "planejado" : "historico" } : null;
    }).filter(Boolean);
  }
  function avaliaImportacao(r) {
    r.conflito = validaAtualImportado(r);
    r.colisoes = r.conflito ? [] : colisoesDePlanos(r);
    // A confirmação vale só para o conjunto de planos que a pessoa viu: se ele muda, a marcação sai.
    const chave = r.colisoes.map((c) => `${c.nome}:${c.com}`).join("|");
    if (chave !== r.chaveColisoes) { r.descartarPlanos = false; r.chaveColisoes = chave; }
  }
  const importacaoBloqueada = (r) => !!r.conflito || (r.colisoes.length > 0 && !r.descartarPlanos);
  function htmlPlanosImportacao(r) {
    const voltam = (r.planosFora || []).filter((p) => !r.colisoes.some((c) => c.nome === p.nome));
    const disc = (n) => `${n} disciplina${n === 1 ? "" : "s"}`;
    const motivo = { atual: "é o período atual escolhido", planejado: "já existe no perfil importado", historico: "já está no histórico importado" };
    return (voltam.length ? `<p class="dica ok-planos">Planos mantidos: ${voltam.map((p) => `<b>${esc(p.nome)}</b> (${disc((p.disciplinas || []).length)})`).join(", ")}.</p>` : "")
      + (r.colisoes.length ? `<div class="colisao-planos">
          <p>${r.colisoes.map((c) => `O plano de <b>${esc(c.nome)}</b> (${disc(c.n)}) ${motivo[c.com]}.`).join(" ")}
          ${r.colisoes.some((c) => c.com === "atual") ? "Escolha outro semestre para o período atual ou confirme a substituição." : "Confirme para continuar."}</p>
          <label class="check"><input type="checkbox" id="siga-descartar-planos"${r.descartarPlanos ? " checked" : ""}>
            Substituir ${r.colisoes.length === 1 ? "esse plano" : "esses planos"} pelos dados do SIGA</label>
        </div>` : "");
  }
  /** Ordem cronológica para devolver um plano ("2026/2" -> 20262; nomes sem data ficam no fim). */
  const chaveSemestre = (n) => { const m = /^(\d{4})(?:\/(\d))?/.exec(n || ""); return m ? +m[1] * 10 + (m[2] != null ? +m[2] : 0) : 0; };
  function perfilDaImportacao(r) {
    const novo = perfilBaseImportacao(r);
    (r.planosFora || []).forEach((p) => {
      if (novo.periodos.some((q) => q.nome === p.nome)) return;     // colisão: só sai com a confirmação explícita
      const k = chaveSemestre(p.nome);
      const i = k ? novo.periodos.findIndex((q) => chaveSemestre(q.nome) > k) : -1;
      novo.periodos.splice(i < 0 ? novo.periodos.length : i, 0, clone(p));
    });
    return novo;
  }

  // ---------- Criar / editar perfil ----------
  function mensagemCampo(campo, texto) {
    const c = $(campo), msg = $(`#${c.id}-msg`);
    msg.textContent = texto || "";
    if (texto) c.setAttribute("aria-invalid", "true"); else c.removeAttribute("aria-invalid");
  }
  function abreDialogoPerfil() {
    const d = $("#dlg-perfil");
    const rot = perfil ? "Editar perfil" : "Criar perfil";
    $("#dlg-perfil-titulo").textContent = rot;
    $("#perfil-nome").value = nomeDoPerfil(perfil);
    const atual = perfil && (perfil.periodos || []).find((p) => p.atual);
    $("#perfil-semestre").value = atual && semestreValido(atual.nome) ? atual.nome : "";
    mensagemCampo("#perfil-semestre", "");
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  }
  /**
   * Cria (ou edita) o perfil a partir do que já está no navegador: marcações, tags, planos, pedidos e extensão
   * continuam. Nome e semestre atual são opcionais. Devolve a mensagem de erro, ou null se salvou.
   */
  function salvaPerfilCriado(nomeTxt, semTxt) {
    const nome = String(nomeTxt || "").trim().replace(/\s+/g, " ");
    const sem = String(semTxt || "").trim();
    if (sem && !semestreValido(sem)) return "Use o formato AAAA/1 ou AAAA/2, ou deixe em branco.";
    const novo = perfilExportado();
    novo.titulo = TITULO;
    if (nome) novo.nome = nome; else delete novo.nome;
    if (novo.curso == null) novo.curso = 1;
    const atual = novo.periodos.find((p) => p.atual);
    // Vazio: período atual datado passa a "atual" (sem data); um nome fora do padrão AAAA/n é mantido como está.
    const alvo = sem || (atual ? (semestreValido(atual.nome) ? "atual" : atual.nome) : "");
    if (alvo) {
      const conflito = conflitoPeriodo(novo, alvo);
      if (conflito) return conflito;
      if (atual) renomeiaPeriodoAtual(novo, alvo);
      else {
        const i = novo.periodos.findIndex((p) => p.planejado);
        novo.periodos.splice(i < 0 ? novo.periodos.length : i, 0, { nome: alvo, atual: true, disciplinas: [] });
      }
    }
    if (!novo.fonte) novo.fonte = { geradoPor: "Grade ECI (Criar perfil)", geradoEm: new Date().toISOString().slice(0, 10) };
    try { usaPerfilImportado(novo, { irParaLinhaDoTempo: false }); }
    catch (e) { return "Não consegui salvar o perfil: " + e.message; }
    return null;
  }

  // ---------- Diálogo de confirmação (substitui o confirm() nas ações destrutivas novas) ----------
  function confirma({ titulo, texto, ok = "Confirmar" }) {
    const d = $("#dlg-confirma");
    if (typeof d.showModal !== "function") return Promise.resolve(window.confirm(`${titulo}\n\n${texto}`));
    $("#dlg-confirma-titulo").textContent = titulo;
    $("#dlg-confirma-texto").textContent = texto;
    $("#dlg-confirma-ok").textContent = ok;
    d.returnValue = "";
    return new Promise((fim) => {
      d.addEventListener("close", () => { const sim = d.returnValue === "ok"; d.returnValue = ""; fim(sim); }, { once: true });
      d.showModal();
    });
  }
  const focaPeriodo = (nome) => {
    const b = nome && document.querySelector(`[data-cperiodo="${CSS.escape(nome)}"]`);
    (b || $("#novo-periodo") || $("#painel")).focus();
  };

  // ---------- Configurações (aparência e tema) ----------
  function abreConfiguracoes() {
    const d = $("#dlg-config");
    renderConfig();
    d.showModal();
    d.querySelector(".cfg-abrir").focus();
  }

  // ---------- "A ECI por trás da Grade": só leitura do currículo, sem tocar no perfil ----------
  function contextoECI() {
    const info = (code) => { const i = M.info(code); return i && { code: i.code, name: i.name, semester: i.semester, req: i.req.slice(), coreq: i.coreq.slice() }; };
    const curriculo = {}, catalogo = {};
    M.grade.forEach((c) => { if (c.code) curriculo[c.code] = { category: c.category }; });
    M.catalogo.forEach((o) => { catalogo[o.code] = { category: o.category || 2 }; });
    return { info, esc, icone: window.icone, carregaScript, carregaPdfJs, curriculo, catalogo, anuncia, codigos: Object.keys(M.curr) };
  }

  // ---------- Excluir período planejado ----------
  const periodoDoPerfil = (nome) => ((perfil && perfil.periodos) || []).some((p) => p.nome === nome);
  async function excluiPeriodo(nome) {
    const p = M.periodos.find((x) => x.nome === nome);
    if (!p || p.tipo !== "planejado") return;   // atual e cursados ficam protegidos
    const n = p.itens.length;
    const lista = p.itens.map((it) => it.code).join(", ");
    const ok = await confirma({
      titulo: `Excluir o período ${nome}?`,
      texto: n ? `${n} ${n === 1 ? "disciplina sairá" : "disciplinas sairão"} do plano: ${lista}. O período também sai do perfil.js exportado.`
        : "O período está vazio. Ele também sai do perfil.js exportado.",
      ok: "Excluir período",
    });
    if (!ok) return;
    const ordem = periodosPlanejaveis().map((x) => x.nome);
    const i = ordem.indexOf(nome);
    plano.novos = (plano.novos || []).filter((x) => x.nome !== nome);
    delete plano.periodos[nome];
    if (periodoDoPerfil(nome)) plano.removidos = [...new Set([...(plano.removidos || []), nome])];
    if (proposta && proposta.periodo === nome) proposta = null;
    save("plano", plano);
    montaModelo();
    const resta = periodosPlanejaveis().map((x) => x.nome);
    const futuros = periodosFuturos().map((x) => x.nome);
    cronoPeriodo = futuros.find((x) => ordem.indexOf(x) > i) || futuros.filter((x) => ordem.indexOf(x) < i).pop() || resta[0] || null;
    save("cronoPeriodo", cronoPeriodo);
    cronoSel = null; cronoSlot = null;
    render();
    focaPeriodo(cronoPeriodo);
  }

  function usaPerfilImportado(novo, opcoes = {}) {
    const erro = erroPerfil(novo);
    if (erro) throw new Error(`perfil com campos inválidos (${erro}). Confira a estrutura em docs/PERFIL.md`);
    const anterior = { perfilImportado, perfil, plano, tags, marcacoes, vistaAtual, M };
    perfilImportado = perfil = novo;
    plano = { periodos: {}, novos: [] };
    tags = novo.tags ?? tags;
    marcacoes = novo.marcacoes ?? marcacoes;
    if (opcoes.irParaLinhaDoTempo !== false) vistaAtual = "timeline";
    try {
      montaModelo();
      render();
    } catch (e) {
      ({ perfilImportado, perfil, plano, tags, marcacoes, vistaAtual, M } = anterior);
      render();
      throw e;
    }
    save("perfilImportado", perfilImportado);
    save("plano", plano);
    save("tags", tags);
    save("marcacoes", marcacoes);
    save("vista", vistaAtual);
    avisosPerfil.delete("perfil importado");
    renderAvisoPerfil();
    fechaDetalhes();
  }

  // ---------- Destaque de requisitos ----------
  function destaca(code) {
    limpaDestaque();
    if (!code) return;
    const i = M.info(code); if (!i) return;
    const marca = (c, cls) => document.querySelectorAll(`.painel [data-code="${CSS.escape(c)}"]`).forEach((el) => el.classList.add(cls));
    i.req.concat(i.coreq).forEach((r) => marca(r, "hl-req"));
    (M.deps[code] || []).forEach((d) => marca(d, "hl-dep"));
    marca(code, "hl-self");
  }
  function limpaDestaque() {
    document.querySelectorAll(".hl-req,.hl-dep,.hl-self").forEach((el) => el.classList.remove("hl-req", "hl-dep", "hl-self"));
  }

  // ---------- Setas de requisitos (Grade → Exibir) ----------
  // A seta parte do requisito e aponta para a disciplina que o exige: contínua = pré-requisito, tracejada = co-requisito.
  function arestasDe(code) {
    const i = M.info(code); if (!i) return [];
    const out = i.req.map((r) => ({ de: r, para: code, tipo: "req" })).concat(i.coreq.map((r) => ({ de: r, para: code, tipo: "coreq" })));
    Object.keys(M.curr).forEach((c) => {
      const j = M.info(c);
      if (j.req.includes(code)) out.push({ de: code, para: c, tipo: "req" });
      if (j.coreq.includes(code)) out.push({ de: code, para: c, tipo: "coreq" });
    });
    return out;
  }
  const todasArestas = () => Object.keys(M.curr).flatMap((c) => {
    const i = M.info(c);
    return i.req.map((r) => ({ de: r, para: c, tipo: "req" })).concat(i.coreq.map((r) => ({ de: r, para: c, tipo: "coreq" })));
  });
  function defineFoco(code) {
    if (focoSetas === code) return;
    focoSetas = code;
    if (exibir.setas === "foco") desenhaSetas();
  }
  function desenhaSetas() {
    const painel = $("#painel");
    const ativo = !modoClassico && vistaAtual === "grade" && exibir.setas !== "ocultas";
    const arestas = !ativo ? [] : exibir.setas === "todas" ? todasArestas() : focoSetas ? arestasDe(focoSetas) : [];
    window.ECI.desenhaSetas(painel, arestas, (code) => painel.querySelector(`.card[data-code="${CSS.escape(code)}"]`),
      { classe: `setas-grade setas-${exibir.setas}`, destaque: exibir.setas === "foco" ? focoSetas : null, vao: exibir.setas !== "todas" });
  }

  // ---------- Eventos ----------
  function liga() {
    document.querySelectorAll("[data-icone]").forEach((el) => el.insertAdjacentHTML("afterbegin", icone(el.dataset.icone)));
    const painel = $("#painel");
    let arrasto = null; // { modo: true (adicionar) / false (remover), visit }

    function adicionaPorTexto() {
      const v = ($("#add-code").value || "").trim(); if (!v) return;
      let code = v.split(/\s|—/)[0].toUpperCase();
      if (!M.info(code)) {
        const q = v.toLowerCase();
        const achado = M.grade.find((c) => c.code && c.name.toLowerCase().includes(q)) || M.catalogo.find((o) => o.name.toLowerCase().includes(q));
        if (!achado) return alert("Não encontrei essa disciplina no currículo nem no catálogo de optativas.");
        code = achado.code;
      }
      cronoSel = code;
      adicionaAoPeriodo(cronoPeriodo, code);
    }

    painel.addEventListener("click", (ev) => {
      const t = ev.target;
      // optativas
      const plan = t.closest("[data-plan]");
      if (plan) return alternaPlano(plan.dataset.plan, plan.dataset.pcode);
      const abrir = t.closest("[data-abrir]");
      if (abrir) {
        if (pincel !== null) return pinta(abrir.dataset.abrir);
        destaca(abrir.dataset.abrir); return abreDetalhes({ code: abrir.dataset.abrir });
      }
      const fg = t.closest("[data-fgrupo]");
      if (fg) { filtros.grupo = fg.dataset.fgrupo; filtros.prefixo = ""; save("filtros", filtros); return render(); }
      const fp = t.closest("[data-fprefixo]");
      if (fp) { filtros.prefixo = fp.dataset.fprefixo; save("filtros", filtros); return render(); }
      // cronograma
      const cp = t.closest("[data-cperiodo]");
      if (cp) { cronoPeriodo = cp.dataset.cperiodo; save("cronoPeriodo", cronoPeriodo); cronoSel = null; cronoSlot = null; return render(); }
      const cs = t.closest("[data-csel]");
      if (cs) { cronoSel = cronoSel === cs.dataset.csel ? null : cs.dataset.csel; return render(); }
      const cr = t.closest("[data-cremove]");
      if (cr) { if (confirm(`Remover ${cr.dataset.cremove} de ${cronoPeriodo}?`)) removeDoPeriodo(cronoPeriodo, cr.dataset.cremove); return; }
      if (t.closest("#add-btn")) return adicionaPorTexto();
      // planejamento
      const sa = t.closest("[data-sugadd]");
      if (sa) { cronoSel = sa.dataset.sugadd; return adicionaAoPeriodo(cronoPeriodo, sa.dataset.sugadd); }
      if (t.closest("#slot-limpar")) { cronoSlot = null; return render(); }
      if (t.closest("#prop-gerar")) { proposta = montaProposta(M.periodos.find((x) => x.nome === cronoPeriodo)); return render(); }
      if (t.closest("#prop-fechar")) { proposta = null; return render(); }
      if (t.closest("#prop-aplicar") && proposta) {
        const arr = itensBrutos(proposta.periodo);
        proposta.itens.forEach((x) => { if (!arr.some((y) => y.code === x.code)) arr.push(x.horarios ? { code: x.code, horarios: x.horarios } : { code: x.code }); });
        proposta = null; return gravaItens(cronoPeriodo, arr);
      }
      // equivalências / extensão
      const ne = (M.boa && M.boa.naoExplicitadas) || null;
      const validaCursada = (c) => {
        if (ne && !ne.some((d) => d.code === c)) { alert(`${c} não está entre as disciplinas cursadas e não explicitadas do seu BOA.`); return false; }
        if (!M.info(c)) { alert(`Código ${c} não encontrado.`); return false; }
        return true;
      };
      if (t.closest("#eq-add")) {
        const cods = ($("#eq-c").value || "").toUpperCase().match(/[A-Z]{3}[A-Z0-9]{3}/g) || [];
        const q = (($("#eq-p").value || "").toUpperCase().match(/[A-Z]{3}[A-Z0-9]{3}/) || [""])[0];
        if (!cods.length || !q) return alert("Informe a(s) cursada(s) e a eletiva pedida.");
        if (!cods.every(validaCursada)) return;
        if (!M.info(q)) return alert(`Código ${q} não encontrado.`);
        const cursadas = [...new Set(cods)].map((c, j) => ({ code: c, papel: j === 0 ? "conteudo" : "horas" }));
        return setLista("equivalencias", clone(getEq()).concat([{ cursadas, pedida: q, status: "a pedir" }]));
      }
      const ac = t.closest("[data-eqaddc]");
      if (ac) {
        const k = +ac.dataset.eqaddc, inp = document.querySelector(`[data-eqnovo="${k}"]`);
        const c = ((inp.value || "").toUpperCase().match(/[A-Z]{3}[A-Z0-9]{3}/) || [""])[0];
        if (!c || !validaCursada(c)) return;
        const arr = clone(getEq()); const cs = cursadasDe(arr[k]);
        if (!cs.some((x) => x.code === c)) cs.push({ code: c, papel: "horas" });
        arr[k].cursadas = cs; delete arr[k].cursada;
        return setLista("equivalencias", arr);
      }
      const rc = t.closest("[data-eqrmc]");
      if (rc) {
        const [k, j] = rc.dataset.eqrmc.split(":").map(Number);
        const arr = clone(getEq()); const cs = cursadasDe(arr[k]); cs.splice(j, 1);
        arr[k].cursadas = cs; delete arr[k].cursada;
        return setLista("equivalencias", arr);
      }
      const ec = t.closest("[data-eqcand]");
      if (ec) {
        const inp = $("#eq-c"); const atual = (inp.value || "").trim();
        inp.value = atual && !atual.includes(ec.dataset.eqcand) ? `${atual} + ${ec.dataset.eqcand}` : ec.dataset.eqcand;
        inp.scrollIntoView({ block: "center" }); return;
      }
      const ed = t.closest("[data-eqdel]");
      if (ed) { const arr = clone(getEq()); arr.splice(+ed.dataset.eqdel, 1); return setLista("equivalencias", arr); }
      if (t.closest("#ext-add")) return setLista("extensao", clone(getExt()).concat([{ nome: "", horas: 0, status: "a pedir" }]));
      const xd = t.closest("[data-extdel]");
      if (xd) { const arr = clone(getExt()); arr.splice(+xd.dataset.extdel, 1); return setLista("extensao", arr); }
      const ur = t.closest("[data-usaref]");
      if (ur) return usaReferencia(cronoPeriodo, ur.dataset.usaref);
      if (t.closest("#exportar")) return exportaPerfil();
      if (t.closest("#descartar")) {
        const nome = cronoPeriodo;
        confirma({ titulo: `Descartar as edições de ${nome}?`, texto: "O período volta ao conteúdo original do perfil. As outras edições continuam.", ok: "Descartar edições" })
          .then((sim) => {
            if (!sim) return;
            delete plano.periodos[nome];
            save("plano", plano); montaModelo(); render(); focaPeriodo(nome);
          });
        return;
      }
      if (t.closest("#excluir-periodo")) { excluiPeriodo(cronoPeriodo); return; }
      if (t.closest("#novo-periodo")) {
        const ult = M.periodos[M.periodos.length - 1];
        let sug = "";
        if (ult && /^(\d{4})\/(\d)$/.test(ult.nome)) { const [a, s] = ult.nome.split("/").map(Number); sug = s >= 2 ? `${a + 1}/1` : `${a}/2`; }
        const nome = (prompt("Nome do novo período planejado:", sug) || "").trim();
        if (!nomePeriodo(nome) || M.periodos.some((p) => p.nome === nome)) return;
        if ((plano.removidos || []).includes(nome)) plano.removidos = plano.removidos.filter((x) => x !== nome);   // recria vazio
        else plano.novos = (plano.novos || []).concat([{ nome, planejado: true }]);
        plano.periodos[nome] = [];
        cronoPeriodo = nome; save("cronoPeriodo", nome); save("plano", plano); montaModelo(); render();
        return;
      }
      if (t.closest(".cel")) return; // tratado no mousedown
      // cartões
      const el = t.closest(".card"); if (!el) return;
      if (seletorECI && el.dataset.code && window.ECI.tem(el.dataset.code)) return window.ECI.abre(el.dataset.code, contextoECI(), el);
      if (pincel !== null && el.dataset.code) return pinta(el.dataset.code);
      destaca(el.dataset.code);
      if (el.dataset.code) defineFoco(el.dataset.code);
      abreDetalhes(el.dataset.code ? { code: el.dataset.code } : { idx: el.dataset.idx });
    });

    // pintar horários (clique ou arrasto)
    painel.addEventListener("mousedown", (ev) => {
      const cel = ev.target.closest(".cel"); if (!cel) return;
      ev.preventDefault();
      const c = +cel.dataset.cel;
      const p = M.periodos.find((x) => x.nome === cronoPeriodo); if (!p) return;
      if (!cronoSel) {
        const dono = p.itens.find((it) => it.cel.has(c));
        if (dono) { cronoSel = dono.code; cronoSlot = null; }
        else cronoSlot = cronoSlot === c ? null : c;
        render();
        return;
      }
      const it = p.itens.find((x) => x.code === cronoSel); if (!it) return;
      arrasto = { modo: !it.cel.has(c), visit: new Set([c]) };
      alteraCelula(cronoPeriodo, cronoSel, c, arrasto.modo);
    });
    painel.addEventListener("mouseover", (ev) => {
      const cel = ev.target.closest(".cel");
      if (cel && arrasto && cronoSel) {
        const c = +cel.dataset.cel;
        if (!arrasto.visit.has(c)) { arrasto.visit.add(c); alteraCelula(cronoPeriodo, cronoSel, c, arrasto.modo); }
        return;
      }
      const el = ev.target.closest(".card[data-code], .opt[data-code]");
      if (el) { destaca(el.dataset.code); defineFoco(el.dataset.code); }
    });
    // teclado: o foco num cartão mostra as ligações dele
    painel.addEventListener("focusin", (ev) => {
      const el = ev.target.closest(".card[data-code]");
      if (el) { destaca(el.dataset.code); defineFoco(el.dataset.code); }
    });
    // as setas acompanham a grade quando a janela muda de tamanho
    if (window.ResizeObserver) new ResizeObserver(() => desenhaSetas()).observe(painel);
    document.addEventListener("mouseup", () => { arrasto = null; });
    painel.addEventListener("mouseleave", () => {
      limpaDestaque();
      // com o painel de detalhes aberto (ex.: toque), as setas continuam na disciplina aberta
      const aberto = !$("#detalhes").hidden && ($("#detalhes").dataset.alvo || "").startsWith("c:") ? $("#detalhes").dataset.alvo.slice(2) : null;
      defineFoco(aberto);
      if (aberto) destaca(aberto);
    });

    painel.addEventListener("input", (ev) => {
      if (ev.target.id === "busca-opt") { filtros.busca = ev.target.value; save("filtros", filtros); render(); }
    });
    painel.addEventListener("change", (ev) => {
      const f = ev.target.dataset.fcheck;
      if (f) { filtros[f] = ev.target.checked; save("filtros", filtros); render(); }
      if (ev.target.matches("[data-falvo]")) { filtros.alvo = ev.target.value; save("filtros", filtros); render(); }
      const t = ev.target;
      if (t.dataset.eqpapel) {
        const [k, j] = t.dataset.eqpapel.split(":").map(Number);
        const arr = clone(getEq()); const cs = cursadasDe(arr[k]); cs[j].papel = t.value;
        arr[k].cursadas = cs; delete arr[k].cursada;
        return setLista("equivalencias", arr);
      }
      if (t.dataset.eqstatus != null || t.dataset.eqobs != null) {
        const arr = clone(getEq()), k = +(t.dataset.eqstatus ?? t.dataset.eqobs);
        if (t.dataset.eqstatus != null) arr[k].status = t.value; else arr[k].obs = t.value;
        setLista("equivalencias", arr);
      }
      if (t.dataset.ext != null) {
        const arr = clone(getExt()), k = +t.dataset.ext;
        arr[k][t.dataset.campo] = t.dataset.campo === "horas" ? Math.max(0, Number(t.value) || 0) : t.value;
        if (t.dataset.campo === "code" && !arr[k].nome) { const i = M.info(t.value); if (i) { arr[k].nome = i.name; if (!arr[k].horas) arr[k].horas = i.horas || 0; } }
        setLista("extensao", arr);
      }
    });
    painel.addEventListener("keydown", (ev) => {
      if (ev.target.id === "add-code" && ev.key === "Enter") adicionaPorTexto();
    });

    // Barra geral, ferramentas da página inicial e aviso de perfil importado
    document.addEventListener("click", (ev) => {
      const t = ev.target.closest("button"); if (!t) return;
      if (t.id === "bg-detalhes") { progressoAberto = !progressoAberto; save("progressoAberto", progressoAberto); return render(); }
      if (t.dataset.pincel != null) { pincel = t.dataset.pincel === "__detalhes" ? null : t.dataset.pincel; seletorECI = false; return render(); }
      if (t.id === "pal-eci") {
        seletorECI = !seletorECI; if (seletorECI) { pincel = null; fechaDetalhes(); }
        render(); $("#pal-eci").focus();
        return anuncia(seletorECI ? "ECI por trás ligado: escolha uma disciplina destacada." : "ECI por trás desligado.");
      }
      if (t.dataset.nivel) {
        const n = +t.dataset.nivel;
        filtroNivel = filtroNivel.includes(n) ? filtroNivel.filter((x) => x !== n) : filtroNivel.concat([n]);
        save("filtroNivel", filtroNivel); return render();
      }
      if (t.id === "editar-tags") return abreEditorTags();
      if (t.id === "cadeado") {
        cadeado = !cadeado; save("cadeado", cadeado); render(); $("#cadeado").focus(); atualizaConfig();
        return anuncia(cadeado ? "Cadeado ligado: as cursadas estão protegidas." : "Cadeado desligado: as cursadas podem ser alteradas.");
      }
      if (t.id === "btn-config") return abreConfiguracoes();
      if (t.id === "btn-tema") return window.TEMA && window.TEMA.alterna();
      if (t.id === "btn-referencias") return abreReferencias();
      if (t.id === "btn-tags") return abreEditorTags();
      if (t.id === "btn-limpar") return limpaDados();
      if (t.dataset.fixar) {
        const id = t.dataset.fixar;
        atalhos = atalhos.includes(id) ? atalhos.filter((x) => x !== id) : ATALHOS.filter((x) => x === id || atalhos.includes(x));
        save("atalhos", atalhos); renderAtalhos(); atualizaConfig();
        return anuncia(atalhos.includes(id) ? `${infoAtalho(id).nome} fixado na barra.` : `${infoAtalho(id).nome} saiu da barra; continua em Configurações.`);
      }
      if (t.dataset.abrirAtalho) { $("#dlg-config").close(); return ACAO_ATALHO[t.dataset.abrirAtalho](); }
      if (t.id === "btn-importar") return abreImportador();
      if (t.id === "btn-perfil") return abreDialogoPerfil();
      if (t.id === "btn-privacidade") return abrePrivacidade();
      if (t.id === "baixar-importado") return baixa("perfil.js", textoPerfil(perfilExportado()));
      if (t.id === "apagar-tudo") {
        if (!confirm("Apagar TUDO o que este site guardou neste navegador (perfil importado, tags, marcações, planos e preferências)?")) return;
        try { Object.keys(localStorage).filter((k) => k.startsWith(STORE)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ok */ }
        location.reload(); return;
      }
      if (t.id === "descartar-importado") {
        // O perfil salvo guarda também os planos, pedidos e extensão que estavam no navegador quando foi criado/importado.
        if (!confirm(`${perfilArquivo ? "Voltar a usar o perfil/perfil.js" : "Ficar sem perfil"} e descartar o perfil salvo neste navegador?

`
          + "Os planos, pedidos e a extensão guardados nele também saem. Use \"Baixar perfil.js\" antes, se quiser guardar uma cópia.")) return;
        perfilImportado = null; save("perfilImportado", null); perfil = perfilArquivo || perfilLocalAntigo();
        avisosPerfil.delete("perfil importado");
        montaModelo(); return render();
      }
    });
    document.addEventListener("change", (ev) => {
      const t = ev.target;
      if (t.id === "modo-classico") return defineModo(t.checked);
      if (t.name === "modo") { defineModo(t.value === "classico"); return atualizaConfig(); }
      if (t.id === "cfg-seletor") { ocultarSeletor = !t.checked; save("ocultarSeletor", ocultarSeletor); renderAtalhos(); return atualizaConfig(); }
      if (t.id === "cfg-cadeado") { cadeado = t.checked; save("cadeado", cadeado); render(); return atualizaConfig(); }
      if (t.dataset.exibir) { exibir[t.dataset.exibir] = t.checked; save("exibir", exibir); render(); atualizaConfig(); }
      if (t.name === "setas") {
        exibir.setas = t.value; save("exibir", exibir); render(); atualizaConfig();
        if (!t.closest("dialog")) document.querySelector(`#ferramentas input[name="setas"][value="${t.value}"]`)?.focus();
      }
      if (t.name === "aparencia" && window.TEMA) { window.TEMA.defineAparencia(t.value); atualizaConfig(); }
      if (t.name === "tema" && window.TEMA) window.TEMA.define(t.value === "sistema" ? null : t.value);
    });

    $("#detalhes").addEventListener("click", (ev) => {
      const t = ev.target.closest("button"); if (!t) return;
      if (t.classList.contains("fechar")) return fechaDetalhes();
      // editor de tags
      if (t.dataset.tagdel != null) {
        const k = +t.dataset.tagdel, id = tags[k].id;
        if (!confirm(`Apagar a tag "${tags[k].nome}"? As disciplinas marcadas com ela ficam sem tag.`)) return;
        tags.splice(k, 1);
        Object.keys(marcacoes).forEach((c) => { if (marcacoes[c] === id) marcacoes[c] = ""; });
        save("marcacoes", marcacoes); if (pincel === id) pincel = null; return salvaTags();
      }
      if (t.id === "tag-nova") { tags.push({ id: "tag-" + Date.now().toString(36), nome: "Nova tag", cor: "#f59e0b", status: "pendente" }); return salvaTags(); }
      if (t.id === "tag-padrao") { if (confirm("Restaurar as tags padrão?")) { tags = clone(TAGS_PADRAO); return salvaTags(); } return; }
      // importador
      if (t.id === "siga-gerar") return geraPerfilDoSiga();
      if (t.id === "siga-usar" && resultadoImportacao) {
        if (!previaLiberada()) return;
        try {
          usaPerfilImportado(perfilDaImportacao(resultadoImportacao));
          resultadoImportacao = null;
          previaObsoleta = false;
        } catch (e) {
          $("#siga-status").textContent = "Não consegui usar o perfil: " + e.message;
        }
        return;
      }
      if (t.id === "siga-descartar") { resultadoImportacao = null; previaObsoleta = false; abreImportador(); $("#siga-pdfs").focus(); return; }
      if (t.id === "siga-baixar" && resultadoImportacao) {
        if (!previaLiberada()) return;
        return baixa("perfil.js", textoPerfil(perfilDaImportacao(resultadoImportacao)));
      }
      if (t.dataset.settag != null) return marca(t.dataset.settag, t.dataset.tag);
      if (t.dataset.reset) return marca(t.dataset.reset, null);
      if (t.dataset.plan) return alternaPlano(t.dataset.plan, t.dataset.pcode);
      if (t.dataset.verOpt) { filtros.grupo = t.dataset.verOpt; filtros.prefixo = ""; save("filtros", filtros); vistaAtual = "optativas"; save("vista", vistaAtual); fechaDetalhes(); return render(); }
      if (t.dataset.ir) {
        const alvo = document.querySelector(`.painel [data-code="${CSS.escape(t.dataset.ir)}"]`);
        if (alvo) { alvo.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }); destaca(t.dataset.ir); }
        abreDetalhes({ code: t.dataset.ir });
      }
    });
    $("#detalhes").addEventListener("change", (ev) => {
      const t = ev.target;
      if (t.dataset.tagcor != null) { tags[+t.dataset.tagcor].cor = t.value; return salvaTags(); }
      if (t.dataset.tagnome != null) { tags[+t.dataset.tagnome].nome = t.value.trim() || tags[+t.dataset.tagnome].nome; return salvaTags(); }
      if (t.dataset.tagstatus != null) { tags[+t.dataset.tagstatus].status = t.value; return salvaTags(); }
      if (t.id === "importar") return importaArquivoPerfil(t);
      if (t.dataset.creditos) {
        creditosManuais[t.dataset.creditos] = Math.max(0, Number(t.value) || 0);
        save("creditos", creditosManuais); render(); reabreDetalhes();
      }
    });
    // Período atual sugerido na prévia do SIGA: valida enquanto digita, sem redesenhar o painel.
    $("#detalhes").addEventListener("input", (ev) => {
      if (ev.target.id !== "siga-atual" || !resultadoImportacao) return;
      resultadoImportacao.atualEscolhido = ev.target.value;
      atualizaPreviaImportacao();
    });
    $("#detalhes").addEventListener("change", (ev) => {
      if (ev.target.id !== "siga-descartar-planos" || !resultadoImportacao) return;
      resultadoImportacao.descartarPlanos = ev.target.checked;
      atualizaPreviaImportacao();
      $("#siga-descartar-planos").focus();
    });
    /** Validação única da prévia, usada por "Usar este perfil" e "Baixar perfil.js" (também no próprio clique). */
    function previaLiberada() {
      atualizaPreviaImportacao();
      return !importacaoBloqueada(resultadoImportacao);
    }
    function atualizaPreviaImportacao() {
      const r = resultadoImportacao;
      avaliaImportacao(r);
      if ($("#siga-atual")) mensagemCampo("#siga-atual", r.conflito);
      $("#siga-planos").innerHTML = htmlPlanosImportacao(r);
      const bloq = importacaoBloqueada(r);
      $("#siga-usar").disabled = bloq; $("#siga-baixar").disabled = bloq;
      const caixa = $("#siga-descartar-planos"); if (caixa) caixa.checked = !!r.descartarPlanos;
    }

    // Criar / editar perfil
    $("#perfil-cancelar").addEventListener("click", () => $("#dlg-perfil").close());
    $("#perfil-semestre").addEventListener("input", () => mensagemCampo("#perfil-semestre", ""));
    $("#form-perfil").addEventListener("submit", (ev) => {
      const erro = salvaPerfilCriado($("#perfil-nome").value, $("#perfil-semestre").value);
      if (erro) { ev.preventDefault(); mensagemCampo("#perfil-semestre", erro); $("#perfil-semestre").focus(); }
    });

    // Configurações é redesenhada a cada abertura; ao fechar, sai do DOM (sem controles duplicados escondidos).
    $("#dlg-config").addEventListener("close", () => { $("#config-corpo").innerHTML = ""; });
    // Tema: o atalho sol/lua mostra a ação disponível; Configurações acompanha a escolha.
    if (window.TEMA) window.TEMA.aoMudar(() => { renderAtalhos(); atualizaConfig(); });

    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      if (document.querySelector("dialog[open]")) return;   // o próprio <dialog> trata o Esc
      if (seletorECI) { seletorECI = false; render(); return; }
      if (pincel !== null && !modoClassico) { pincel = null; render(); }
      fechaDetalhes();
      if (cronoSel) { cronoSel = null; render(); }
    });

    document.querySelectorAll("[data-vista]").forEach((b) => b.addEventListener("click", () => {
      vistaAtual = b.dataset.vista; save("vista", vistaAtual); fechaDetalhes(); render();
    }));

  }

  /** "Ou carregar um perfil pronto": aceita perfil.js (window.PERFIL = {...}) ou JSON puro. */
  function importaArquivoPerfil(input) {
    const f = input.files[0]; if (!f) return;
    f.text().then((txt) => {
      const m = txt.match(/^\s*window\.PERFIL\s*=\s*/m);
      const obj = JSON.parse((m ? txt.slice(m.index + m[0].length) : txt).replace(/;\s*$/, ""));
      usaPerfilImportado(obj);
    }).catch((e) => alert("Não consegui ler o perfil: " + e.message + "\n(O conteúdo precisa ser JSON válido, com chaves entre aspas.)"));
    input.value = "";
  }

  // Ganchos para testes e para quem quiser depurar no console do navegador.
  window.GradeInterativa = { carregaPdfJs, linhasPDF, perfilExportado: () => perfilExportado(), totais: () => totais(),
    avisoOferta: (c, p) => avisoOferta(c, p), avisos: (c, nome) => { const p = M.periodos.find((x) => x.nome === nome); return p ? avisos(c, p.pi) : null; } };

  montaModelo();
  liga();
  render();
})();
