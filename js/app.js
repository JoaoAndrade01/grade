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
 *    plano            edições de planejamento/pedidos/extensão e aprovações registradas por você ainda não exportadas
 *                     (plano.removidos = períodos planejados do perfil excluídos no Cronograma)
 *    tema             "claro" | "escuro": escolha do botão sol/lua (js/tema.js); sem ela, segue o sistema
 *    modoClassico     seletor Clássico | Planejador do topo (padrão: Clássico = só a grade e a paleta)
 *    ocultarSeletor   esconde o seletor de modo (o modo continua o escolhido; troca em Configurações)
 *    atalhos          atalhos fixados na barra: perfil, importar, tema, privacidade, referencias, tags (começa vazio)
 *    aparencia        "icone" (Só ícones) | "minimalista" (sem a chave = Ícone + texto); lida, migrada (da chave
 *                     antiga seletorIcones) e aplicada por js/tema.js
 *    cadeado          protege as cursadas contra alterações manuais
 *    foco             modo Foco do Planejador (true/false); tom: "zoeira" (padrão) | "discreto" nas mensagens do Foco
 *    perfilId         identidade local opaca do perfil (nunca dado do aluno); selosAvisados: { id, vistos } conquistas já anunciadas
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
  const ICONE_GRUPO = { 2: "camadas", 4: "referencias", 5: "globo" };
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
  // Regras puras do cálculo (sem DOM nem armazenamento): js/progresso.js.
  const { semestreValido, semIdx, anoDoBloco, parseHorarios, cursadasDe, pendente, montaRegistros } = window.PROGRESSO;
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
  /** Seletor que reencontra um controle depois que a tela é redesenhada (id, atributos data-* ou name). */
  function chaveFoco(el) {
    if (!el || el === document.body || el === document.documentElement) return null;
    if (el.id) return "#" + CSS.escape(el.id);
    const q = (v) => CSS.escape(v);
    const dados = [...el.attributes].filter((a) => a.name.startsWith("data-") && a.name !== "data-icone").map((a) => `[${a.name}="${q(a.value)}"]`).join("");
    if (dados) return el.tagName.toLowerCase() + dados;
    if (el.name) return `${el.tagName.toLowerCase()}[name="${q(el.name)}"]${el.type === "radio" ? `[value="${q(el.value)}"]` : ""}`;
    return null;
  }
  /** Executa `fn` (que redesenha parte da tela) e devolve o foco ao mesmo controle; se ele sumiu, ao painel. */
  function preservaFoco(fn, fallback) {
    const antes = document.activeElement, chave = chaveFoco(antes);
    const r = fn();
    if (antes && antes !== document.body && !antes.isConnected && (!document.activeElement || document.activeElement === document.body)) {
      const novo = (chave && document.querySelector(chave)) || (fallback && fallback());
      if (novo) novo.focus({ preventScroll: true });
    }
    return r;
  }
  /**
   * Padrão de ícones dos controles (Aparência): ícone decorativo e o texto em `.rot`. Em Só ícones e no Minimalista o
   * `.rot` some só visualmente; o nome acessível continua e o `title` mostra o nome ao passar o mouse. Os ícones são
   * todos da Lucide (js/icones.js): nada de emoji ou símbolo solto nos controles.
   */
  const rotulo = (ico, txt) => `${ico}<span class="rot">${txt}</span>`;
  /** Aparência Minimalista: cartões só com o nome e o ícone de estado; ferramentas atrás do ⋯; sem detalhamento. */
  const minimalista = () => !!window.TEMA && window.TEMA.aparencia() === "minimalista";
  let ferrAberto = false;            // painel ⋯ das ferramentas (Minimalista), só nesta visita
  const focaTitulo = (el) => { if (!el) return null; el.tabIndex = -1; return el; };
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
    equivale: (v) => opcional(v, codigo), aprovadaEm: (v) => opcional(v, texto), horarios: (v) => opcional(v, (h) => listaDe(h, texto)),
    dispensa: (v) => opcional(v, (d) => listaDe(d, (x) => codigo(x) || dadosDisciplina(x))),
  };
  const erroDisciplina = (d, caminho) => codigo(d) ? null : erroCampos(d, camposItem, caminho);
  const disciplinaValida = (d) => !erroDisciplina(d, "disciplina");
  const camposPeriodo = {
    nome: nomePeriodo, atual: (v) => opcional(v, (b) => typeof b === "boolean"),
    planejado: (v) => opcional(v, (b) => typeof b === "boolean"), nota: (v) => opcional(v, (n) => texto(n) || numero(n)),
    deduzido: (v) => opcional(v, (b) => typeof b === "boolean"),
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
    // "reprovado" é o antigo "Reprovação (não conta)": perfis e navegadores antigos continuam válidos e viram "Não conta".
    status: (v) => texto(v) && (Object.hasOwn(CONTA_COMO, v) || v === "reprovado"),
    barra: (v) => opcional(v, (x) => typeof x === "boolean"),
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
    if (p.aprovacoesDeclaradas != null) {
      if (!Array.isArray(p.aprovacoesDeclaradas)) return "aprovacoesDeclaradas";
      for (const [i, d] of p.aprovacoesDeclaradas.entries()) {
        const erro = window.PROGRESSO.erroDeclarada(d, `aprovacoesDeclaradas[${i}]`);
        if (erro) return erro;
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
      fonte: (v) => opcional(v, (f) => objeto(f) && opcional(f.boaEmissao, texto)
        && opcional(f.historicoAtual, (h) => ["automatico", "duvida", "escolhido"].includes(h))),
      marcacoes: (v) => opcional(v, marcacoesValidas),
      boa: (v) => opcional(v, (b) => objeto(b) && opcional(b.naoExplicitadasPresente, (x) => typeof x === "boolean")
        && listaDe(b.naoExplicitadas, (d) => dadosDisciplina(d)
        && numero(d.credits) && numero(d.ch) && (texto(d.grau) || numero(d.grau)))),
    }, "");
  }
  const planoValido = (p) => objeto(p) && listasValidas(p)
    && opcional(p.novos, (v) => listaDe(v, periodoValido))
    && opcional(p.removidos, (v) => listaDe(v, nomePeriodo))
    && (p.periodos === undefined || (objeto(p.periodos)
      && Object.entries(p.periodos).every(([nome, itens]) => nomePeriodo(nome) && listaDe(itens, disciplinaValida))));

  // Horários: células (dia*100 + hora) -> "ter 08-10" (a leitura, parseHorarios, está em js/progresso.js)
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
  const CONTA_COMO = { aprovado: "Concluída (cursada e aprovada)", previsto: "Aprovação esperada", cursando: "Em curso", planejado: "Planejada", pendente: "Não conta" };
  /**
   * Tags no formato atual: o antigo "Reprovação (não conta)" vira "Não conta" (os dois não contam no progresso) e
   * "Usar a cor desta tag na barra" vale para no máximo uma tag por tipo, nunca para "Não conta".
   */
  function normalizaTags(lista) {
    if (!Array.isArray(lista)) return lista;
    const naBarra = new Set();
    return lista.map((t) => {
      const n = { ...t, status: t.status === "reprovado" ? "pendente" : t.status };
      if (n.barra && n.status !== "pendente" && !naBarra.has(n.status)) naBarra.add(n.status);
      else delete n.barra;
      return n;
    });
  }

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
  tags = normalizaTags(migraTags(tags, marcacoes));
  try {   // grava a conversão das tags salvas neste navegador (a marcação continua apontando para o mesmo id)
    const salvas = localStorage.getItem(STORE + "tags");
    if (salvas && tagsValidas(JSON.parse(salvas)) && salvas !== JSON.stringify(tags)) localStorage.setItem(STORE + "tags", JSON.stringify(tags));
  } catch (e) { /* armazenamento indisponível: a conversão vale só nesta visita */ }
  let pincel = null;                 // id da tag selecionada para pintar (null = clique abre detalhes)
  let cadeado = load("cadeado", false, (v) => typeof v === "boolean"); // protege as cursadas contra alterações manuais
  // Barra do topo: atalhos fixados em Configurações (todos começam desafixados) e o seletor de modo.
  const ATALHOS = ["perfil", "importar", "tema", "privacidade", "referencias", "tags"];
  let atalhos = load("atalhos", [], (v) => listaDe(v, (x) => ATALHOS.includes(x)));
  let ocultarSeletor = load("ocultarSeletor", false, (v) => typeof v === "boolean");
  let celTab = null;                 // célula do cronograma que entra na ordem de Tab (foco móvel)
  let consultado = null;             // toque: cartão consultado, à espera do segundo toque que marca
  let seletorECI = false;            // paleta "ECI por trás" (só nesta visita): destaca os cartões com experiência
  // Trilha dos requisitos na Grade (chave `destaque`): "segurar" (Ao segurar, padrão), "foco" (Ao passar o mouse, o antigo
  // "Em foco") ou "desligado". Migração pela regra literal: sem a chave, vale "segurar" (nada é gravado); "foco" e
  // "desligado" salvos continuam. A cadeia antiga `setas` migra (Ocultas → Desligado; Disciplina em foco e Todas → "foco")
  // e sai do objeto salvo.
  const TRILHAS = ["desligado", "segurar", "foco"];
  let exibir = Object.assign({ codigo: true, notas: false, dificuldade: false, presenca: false, plano: false, situacao: true, destaque: "segurar" }, load("exibir", {}));
  if (Object.prototype.hasOwnProperty.call(exibir, "setas")) {
    if (!TRILHAS.includes(load("exibir", {}).destaque)) exibir.destaque = exibir.setas === "ocultas" ? "desligado" : "foco";
    delete exibir.setas; save("exibir", exibir);
  }
  if (!TRILHAS.includes(exibir.destaque)) exibir.destaque = "segurar";
  let filtroNivel = load("filtroNivel", [], (v) => listaDe(v, numero));   // níveis de dificuldade em destaque (vazio = todos)
  let progressoAberto = load("progressoAberto", false);
  // Foco (Planejador): ficam Grade, Linha do tempo e Cronograma; o concluído some e aparecem a fase e as conquistas.
  let foco = load("foco", false, (v) => typeof v === "boolean");
  let tom = load("tom", "zoeira", (v) => v === "zoeira" || v === "discreto");
  const VISTAS_FOCO = ["grade", "timeline", "cronograma", "conquistas"];
  const NOMES_VISTA = { optativas: "Optativas", pedidos: "Equivalências e Extensão / ACE", eci: "A ECI por trás da Grade", conquistas: "Conquistas" };
  // Aba Conquistas (Planejador): com o Foco ligado e, se Configurações → Conquistas permitir, também fora do Foco.
  let conquistasFora = load("conquistasFora", false, (v) => typeof v === "boolean");
  const focoAtivo = () => foco && !modoClassico && !!perfil;
  const abaConquistas = () => !modoClassico && (focoAtivo() || conquistasFora);
  let infoLivreAberta = false;      // explicação dos números da livre escolha (ⓘ do detalhamento), só nesta visita
  // Modo clássico (padrão ao abrir): só a grade inteira numa tela e a paleta para pintar.
  // Desligado = modo Planejador, com as abas (linha do tempo, optativas, cronograma, pedidos).
  const abrirNoModoClassico = new URLSearchParams(window.location.search).get("modo") === "classico";
  let modoClassico = abrirNoModoClassico || load("modoClassico", true);
  let creditosManuais = load("creditos", {}, (v) => objeto(v)
    && Object.entries(v).every(([k, n]) => Object.hasOwn(CATS, k) && numero(n))); // categoria -> créditos extras
  let plano = { periodos: {}, novos: [], ...load("plano", {}, planoValido) }; // edições de planejamento
  // Aprovações registradas por você no navegador: lidas item a item (um item inválido não derruba o plano inteiro).
  let avisoDeclaradas = "";
  if (plano.aprovacoesDeclaradas !== undefined) {
    const lidas = window.PROGRESSO.normalizaDeclaradas(plano.aprovacoesDeclaradas);
    if (lidas.ignoradas) avisoDeclaradas = `${lidas.ignoradas} ${lidas.ignoradas === 1 ? "aprovação registrada por você foi ignorada" : "aprovações registradas por você foram ignoradas"} por formato inválido.`;
    if (Array.isArray(plano.aprovacoesDeclaradas)) plano.aprovacoesDeclaradas = lidas.itens; else delete plano.aprovacoesDeclaradas;
  }
  let vistaAtual = load("vista", perfil ? "timeline" : "grade");   // aba do Planejador
  let filtros = Object.assign({ busca: "", grupo: "2", prefixo: "", liberadas: false, ocultarFeitas: true, cabe: false, alvo: "", ativas: true, acesas: false }, load("filtros", {}));
  let cronoPeriodo = load("cronoPeriodo", null);
  let cronoSel = null;
  let cronoSlot = null;   // célula escolhida para "busca por horário"
  let proposta = null;    // { periodo, itens: [{code, horarios}] }
  let M = null; // modelo calculado (ver montaModelo)

  // Listas editáveis no app (o navegador guarda as edições até exportar)
  const getEq = () => plano.equivalencias || (perfil && perfil.equivalencias) || [];
  const getExt = () => plano.extensao || (perfil && perfil.extensao) || [];
  /** Aprovações registradas por você (plano sobre perfil), um item por código: vale o último. */
  const getDecl = () => window.PROGRESSO.normalizaDeclaradas(plano.aprovacoesDeclaradas || (perfil && perfil.aprovacoesDeclaradas) || []).itens;
  function setLista(chave, arr) { plano[chave] = arr; save("plano", plano); montaModelo(); render(); }

  // ---------- Modelo ----------
  function montaModelo() {
    const cursoId = perfil && perfil.curso != null ? perfil.curso : 1;
    const grade = ((window.courses || [])[cursoId] || []).map((c, i) =>
      Object.assign({}, c, { idx: i, category: c.category || 1 }));
    const codigosGrade = new Set(grade.map((c) => c.code).filter(Boolean));
    const catalogo = ((window.optativas || {})[cursoId] || []).filter((o) => !codigosGrade.has(o.code));
    const removidos = new Set(plano.removidos || []);
    const base = ((perfil && perfil.periodos) || []).filter((p) => !(p.planejado && removidos.has(p.nome))).map((p) => ({ ...p }));
    (plano.novos || []).forEach((n) => { if (!base.some((p) => p.nome === n.nome)) base.push({ disciplinas: [], ...n }); });
    const r = montaRegistros({ grade, catalogo, periodos: base, editados: plano.periodos, pedidos: getEq(), declaradas: getDecl() });
    const ref = (window.horarios || {})[cursoId] || null;
    const guia = (window.guia || {})[cursoId] || null;
    const boa = (perfil && perfil.boa) || null;
    M = { grade, catalogo, cursoId, ref, guia, boa, ...r };
  }
  /** Semestre real de um registro do modelo (js/progresso.js). */
  const semestreDoRegistro = (r) => window.PROGRESSO.semestreDoRegistro(r, M.periodos);

  /** Status vindo só do perfil (histórico, período atual, planos e pedidos), sem as marcações do pincel. */
  function statusPerfil(code) {
    return window.PROGRESSO.statusDosRegistros(M.regs[code], !!M.pendEq[code]);
  }
  const tagPorId = (id) => tags.find((t) => t.id === id) || null;
  const statusDaTag = (id) => { const t = tagPorId(id); return t ? t.status : "pendente"; };
  const aprovacaoManual = (code) => Object.hasOwn(marcacoes, code) && statusDaTag(marcacoes[code]) === "aprovado";
  /** Fonte da aprovação (importado, previsto, pincel ou null) para fase e selos; a barra segue `statusDe`. */
  const fonteDe = (code) => window.PROGRESSO.fonteDaAprovacao(M.regs[code],
    Object.hasOwn(marcacoes, code) ? statusDaTag(marcacoes[code]) : undefined);
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
      return r ? COR_STATUS.reprovado : null;   // cor reserva: nenhuma tag tem o tipo "reprovado"
    }
    if (s === "pendente") return null;   // "Não conta" só pinta o que a pessoa marcou
    return tags.find((t) => t.status === s) || COR_STATUS[s] || null;
  }
  // Registros em ordem fixa (ordemDosRegistros), não na ordem dos períodos: o último é o mais recente.
  const emOrdemFixa = (code) => (M.regs[code] || []).slice().sort((a, b) => window.PROGRESSO.ordemDosRegistros(a, b, M.periodos));
  const notaDe = (code) => {
    const r = emOrdemFixa(code).filter((x) => concluido(x.status)).pop();
    return r ? r.nota : null;
  };
  /** Nome do período de um registro; a declarada usa o semestre informado (ou nenhum). */
  const nomeDoRegistro = (r) => M.periodos[r.pi]?.declarado ? (r.semestreDeclarado || null) : M.periodos[r.pi]?.nome;
  const periodoDe = (code, filtro) => emOrdemFixa(code).filter((r) => filtro(r.status)).map(nomeDoRegistro).filter(Boolean);

  // A marcação manual simula aprovação mesmo sem uma data no histórico.
  /** O registro do perfil (com data) cumpre o requisito neste semestre, sem contar a marcação manual. */
  // Transferida (D-08): vale o semestre original (`aprovadaEm`); sem ele, só períodos de anos posteriores ao do bloco.
  function registroCumpre(code, semestre, aceitaMesmoSemestre = false) {
    return window.PROGRESSO.registroCumpre(M.regs[code], M.periodos, semestre, aceitaMesmoSemestre);
  }
  function requisitoCumprido(code, semestre, aceitaMesmoSemestre = false) {
    return aprovacaoManual(code) || registroCumpre(code, semestre, aceitaMesmoSemestre);
  }
  /**
   * Requisitos (P e C) de `code` que só a marcação manual satisfaz (PC-03): a tag está aprovada e o registro datado
   * do perfil não cumpriria o requisito no período em que a disciplina aparece (sem período: o perfil não ter aprovação).
   */
  function requisitosPorMarcacao(code) {
    const i = M.info(code); if (!i) return [];
    const semestres = (M.regs[code] || []).map(semestreDoRegistro).filter((x) => x != null);
    const so = (r, coreq) => aprovacaoManual(r) && (semestres.length
      ? semestres.some((sem) => !registroCumpre(r, sem, coreq)) : statusPerfil(r) !== "aprovado");
    return i.req.filter((r) => so(r, false)).concat(i.coreq.filter((r) => so(r, true)));
  }
  /** Requisitos (P e C) de `code` cumpridos por uma aprovação registrada por você (sem registro importado nem pincel). */
  const requisitosPorDeclarada = (code) => { const i = M.info(code); return i ? i.req.concat(i.coreq).filter((r) => !aprovacaoManual(r) && fonteDe(r) === "declarado") : []; };
  function avisos(code, semestre) {
    const i = M.info(code); if (!i) return [];
    return i.req.filter((r) => !requisitoCumprido(r, semestre)).map((r) => window.PROGRESSO.declaradaSemSemestreEm(M.regs[r], M.periodos, semestre)
      ? `Requisito ${r} registrado por você sem semestre: não dá para saber se foi antes deste período.`
      : `Requisito ${r} não cumprido antes deste período`)
      .concat(i.coreq.filter((r) => !requisitoCumprido(r, semestre, true)).map((r) => `Co-requisito ${r} não cumprido até este período`));
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

  function resumoExtensao() {
    const confirmadas = [], porCodigo = new Map();
    const codigosDuvidosos = new Set();
    let aConfirmar = 0;
    function inclui(item) {
      if (!(item.horas > 0)) return;
      if (!item.code) {
        confirmadas.push(item);
        return;
      }
      const periodos = porCodigo.get(item.code) || new Map();
      const grupo = periodos.get(item.semestre) || [];
      grupo.push(item);
      periodos.set(item.semestre, grupo);
      porCodigo.set(item.code, periodos);
    }

    new Set([...Object.keys(M.regs), ...Object.keys(marcacoes)]).forEach((code) => {
      if (M.consumidas.has(code) || statusDe(code) !== "aprovado") return;
      const info = M.info(code);
      if (info?.category != 5) return;
      const registros = (M.regs[code] || []).filter((r) => r.status === "aprovado");
      if (!registros.length) {
        inclui({ code, nome: info.name, horas: valorCat(info), semestre: null, historico: true, origem: "pincel" });
      }
      // Cada ocorrência guarda a própria origem (importado ou registrada por você) para fase e conquistas.
      registros.forEach((r) => inclui({
        code, nome: info.name, horas: r.horas ?? valorCat(info),
        semestre: semestreDoRegistro(r), historico: true, origem: r.origem === "declarado" ? "declarado" : "importado",
      }));
    });
    getExt().forEach((a) => {
      if (a.status !== "validada") return;
      inclui({ code: (a.code || "").trim().toUpperCase(), nome: a.nome || a.code || "atividade",
        horas: Number(a.horas) || 0, semestre: semIdx(a.periodo), origem: "importado" });
    });

    for (const [code, periodos] of porCodigo) {
      const semData = periodos.get(null) || [];
      const grupos = [...periodos].filter(([semestre]) => semestre != null)
        .sort(([a], [b]) => a - b).map(([, grupo]) => grupo);
      if (semData.length) {
        // Uma data desconhecida pode repetir qualquer período. Mantemos separados os
        // períodos conhecidos e comparamos os valores sem data com o maior já registrado.
        let grupoMaior = null, maisHoras = 0;
        for (const grupo of grupos) {
          for (const item of grupo) {
            if (item.horas > maisHoras) {
              grupoMaior = grupo;
              maisHoras = item.horas;
            }
          }
        }
        if (grupoMaior) {
          semData.forEach((item) => grupoMaior.push(item));
        } else {
          grupos.push(semData);
        }
      }
      grupos.forEach((grupo) => {
        // Empate: fica a origem mais forte (registro importado antes de registrada por você e do pincel).
        const peso = { importado: 0, declarado: 1, pincel: 2 };
        const maior = grupo.reduce((a, b) => (a.horas > b.horas || (a.horas === b.horas && (peso[a.origem] ?? 0) <= (peso[b.origem] ?? 0)) ? a : b));
        confirmadas.push(maior);
        if (grupo.length < 2) return;
        codigosDuvidosos.add(code);
        aConfirmar += grupo.reduce((soma, a) => soma + a.horas, 0) - maior.horas;
      });
    }
    return { confirmadas, aConfirmar, codigosDuvidosos };
  }

  function totais(extensao = resumoExtensao()) {
    const t = {};
    // ok = concluído · prev = aprovação esperada · plan = planejado + cursando · cur = só cursando · anal = pedido em análise
    for (const k in CATS) t[k] = { total: 0, ok: 0, prev: 0, plan: 0, cur: 0, anal: 0 };
    M.grade.forEach((c) => { if (t[c.category]) t[c.category].total += c.credits; });
    new Set([...Object.keys(M.regs), ...Object.keys(marcacoes), ...Object.keys(M.pendEq)]).forEach((code) => {
      if (M.consumidas.has(code) || M.origensDispensa.has(code)) return;
      const i = M.info(code); if (!i || !t[i.category]) return;
      const T = t[i.category], v = valorCat(i), s = statusDe(code);
      if (i.category == 5 && s === "aprovado") return; // tratado por ocorrência
      if (s === "aprovado") T.ok += v; else if (s === "previsto") T.prev += v; else if (emCurso(s)) T.plan += v;
      else if (s === "analise") T.anal += v;
      if (s === "cursando") T.cur += v;
    });
    t[5].ok = extensao.confirmadas.reduce((soma, a) => soma + a.horas, 0);
    t[5].aConfirmar = extensao.aConfirmar;
    getExt().forEach((a) => { if (a.status !== "validada") t[5].plan += Number(a.horas) || 0; });
    for (const k in creditosManuais) if (t[k]) t[k].ok += Number(creditosManuais[k]) || 0;
    return t;
  }

  // Distribui as disciplinas feitas/planejadas pelos blocos genéricos ("Atividades Acad. Optativas" etc.)
  function preenchimentoBlocos() {
    const filas = {};
    new Set([...Object.keys(M.regs), ...Object.keys(marcacoes)]).forEach((code) => {
      if (M.curr[code] || M.consumidas.has(code) || M.origensDispensa.has(code)) return;
      const i = M.info(code); if (!i) return;
      const s = statusDe(code); if (!(concluido(s) || emCurso(s))) return;
      if (i.category == 5 && s === "aprovado") return;
      (filas[i.category] = filas[i.category] || []).push({ code, name: i.name, v: valorCat(i), s, f: FORCA[s] });
    });
    resumoExtensao().confirmadas.forEach((a) => {
      (filas[5] = filas[5] || []).push({ code: a.historico ? a.code : null, name: a.nome, v: a.horas, s: "aprovado", f: FORCA.aprovado });
    });
    getExt().forEach((a) => {
      const h = Number(a.horas) || 0;
      if (h && a.status !== "validada") (filas[5] = filas[5] || []).push({ code: null, name: a.nome || a.code || "atividade", v: h, s: "planejado", f: FORCA.planejado });
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
    if (plano.aprovacoesDeclaradas) {
      if (plano.aprovacoesDeclaradas.length) out.aprovacoesDeclaradas = clone(plano.aprovacoesDeclaradas); else delete out.aprovacoesDeclaradas;
    }
    out.tags = clone(tags);
    if (Object.keys(marcacoes).length) out.marcacoes = clone(marcacoes); else delete out.marcacoes;
    return out;
  }
  function textoPerfil(obj) {
    const linhas = ["{"];
    const listas = ["equivalencias", "extensao", "aprovacoesDeclaradas", "tags"];
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
    || !!plano.equivalencias || !!plano.extensao || !!plano.aprovacoesDeclaradas
    || JSON.stringify(marcacoes) !== JSON.stringify((perfil && perfil.marcacoes) || {})
    || JSON.stringify(tags) !== JSON.stringify(normalizaTags(migraTags((perfil && perfil.tags) || TAGS_PADRAO, marcacoes)));

  // ---------- Renderização: peças ----------
  const metaDe = (code, valor, cat) =>
    [code, valor != null ? `${fmt(valor)} ${cat == 5 || valor >= 30 ? "h" : "cr"}` : null].filter(Boolean).join(" · ");

  /** Situação e origem em texto (nunca só por cor): marcação do pincel, registro do perfil ou nenhuma. */
  function situacaoOrigem(code) {
    if (Object.prototype.hasOwnProperty.call(marcacoes, code)) {
      const t = tagPorId(marcacoes[code]);
      return { rot: t ? t.nome : "Sem tag", origem: "marcação" };
    }
    const s = statusPerfil(code);
    if (s === "aprovado" && fonteDe(code) === "declarado") return { rot: ROTULO[s], origem: ORIGEM_DECL };
    return s === "pendente" ? { rot: "Pendente", origem: null } : { rot: ROTULO[s], origem: "perfil" };
  }
  const ORIGEM_DECL = "registrada por você";

  /**
   * Ícone de estado do cartão (PC-08, WCAG 1.4.1): a situação não depende só da cor. O ícone é decorativo; a
   * situação e a origem vão em texto no nome acessível (`.sr`), no primeiro toque (14h) e nos detalhes.
   */
  // Ícones Lucide por estado; o `data-estado` é estável (os testes e o CSS apontam para ele, não para o desenho).
  const ICONE_ESTADO = { aprovado: "circulo-check", previsto: "relogio", cursando: "carregando", planejado: "circulo-tracejado",
    reprovado: "circulo-x", equivalencia: "equivalencias", marcacao: "lapis", declarada: "quadrado-check" };
  const ESTADO_DO_STATUS = { aprovado: "aprovado", previsto: "previsto", cursando: "cursando", planejado: "planejado", reprovado: "reprovado", analise: "equivalencia" };
  const ICONE_MARCACAO = "marcacao";
  const ICONE_DECLARADA = "declarada";   // aprovação registrada por você: distinta do ícone do registro importado (PC-08)
  /** Ícone de um estado (`data-estado`) para textos fora do cartão: legenda do detalhamento, detalhes, etiquetas. */
  const iconeEstado = (estado, tam = 14) => `<span class="ico-estado" data-estado="${estado}" aria-hidden="true">${icone(ICONE_ESTADO[estado], tam)}</span>`;
  function estadoHtml(estado) {
    return estado && ICONE_ESTADO[estado] ? `<span class="estado e-${estado}" data-estado="${estado}" aria-hidden="true">${icone(ICONE_ESTADO[estado], 14)}</span>` : "";
  }
  /**
   * Nome visível e nome acessível do cartão. Com situação, o nome visível fica fora da árvore de acessibilidade e um
   * único texto oculto diz "Nome, Situação · origem" (dois elementos separados geravam "Nome , Situação").
   */
  function nomeDoCartao(nome, estado, texto) {
    if (!texto) return `<span class="nome">${estadoHtml(estado)}${esc(nome)}</span>`;
    return `<span class="nome" aria-hidden="true">${estadoHtml(estado)}${esc(nome)}</span><span class="sr">${esc(nome)}, ${esc(texto)}</span>`;
  }

  function card(o) {
    const temAviso = o.aviso && o.aviso.length;
    const attrs = [
      `class="card s-${esc(o.status)} cat-${esc(o.cat)}${temAviso ? " tem-aviso" : ""}${o.classe ? " " + o.classe : ""}"`,
      o.code ? `data-code="${esc(o.code)}"` : "",
      o.periodo ? `data-periodo="${esc(o.periodo)}"` : "",
      o.ri != null ? `data-reg="${o.ri}" data-status="${esc(o.status)}"${o.transferida ? " data-transferida" : ""}${o.declarada ? " data-declarada" : ""}` : "",
      o.idx != null ? `data-idx="${o.idx}"` : "",
      o.inerte ? "inert" : "",
      o.fill ? `style="--ok:${o.fill.ok}%;--prev:${o.fill.prev}%;--plan:${o.fill.plan}%"` : "",
      `title="${esc(ROTULO[o.status] || "")}${o.titulo ? " · " + esc(o.titulo) : ""}${temAviso ? " — " + esc(o.aviso.join("; ")) : ""}"`,
    ].join(" ");
    const nota = o.nota != null && o.nota !== "" ? (typeof o.nota === "number" ? o.nota.toFixed(1) : o.nota) : null;
    return `<button type="button" ${attrs}>
      ${nota != null ? `<span class="nota">${esc(nota)}</span>` : ""}
      ${temAviso ? `<span class="aviso" aria-label="aviso">!</span>` : ""}
      ${nomeDoCartao(o.name, o.semIcone ? "" : o.icone || ESTADO_DO_STATUS[o.status], ESTADO_DO_STATUS[o.status] && ROTULO[o.status] ? ROTULO[o.status] + (o.origem ? " · " + o.origem : "") : "")}
      ${o.sub ? `<span class="sub">${o.sub}</span>` : ""}
      ${o.semMeta ? "" : `<span class="meta">${o.code ? seloGuia(o.code, true) + " " : ""}${esc(o.meta)}</span>`}
    </button>`;
  }

  function coluna(titulo, chips, cards, extraClasse = "", notas = "") {
    return `<section class="coluna ${extraClasse}">
      <header class="col-topo"><h2>${esc(titulo)}</h2><div class="chips">${chips}</div></header>
      ${notas}
      <div class="col-cards">${cards || `<p class="vazio">—</p>`}</div>
    </section>`;
  }

  /**
   * Cartão da página inicial (estilo clássico): só o nome em destaque, pintado com a cor da tag.
   * Extras (código/créditos, nota, dificuldade, presença, plano e o ícone de estado) aparecem conforme o menu "Exibir",
   * só no Planejador. O Clássico é só para pintar: cartão com cor e nome, e a preferência salva não muda.
   */
  function cardLimpo(c) {
    const tag = tagDe(c.code), s = statusDe(c.code);
    const g = guiaDe(c.code);
    const ver = modoClassico ? {} : exibir;
    const apagado = !modoClassico && filtroNivel.length && !(g && filtroNivel.includes(g.nivel));
    const nota = ver.notas ? notaDe(c.code) : null;
    const extras = [
      ver.codigo ? esc(metaDe(c.code, c.credits, c.category)) : "",
      ver.dificuldade && g && g.nivel ? seloGuia(c.code, true) : "",
      ver.presenca && g && g.presenca ? esc(PRESENCA[g.presenca]) : "",
    ].filter(Boolean).join(" · ");
    const prot = protegida(c.code);
    const exp = seletorECI && window.ECI.tem(c.code);
    // Exibir → Plano: o primeiro semestre planejado e "+N" se houver outros; a lista completa vai no nome acessível e nos detalhes.
    const planos = ver.plano ? [...new Set(periodoDe(c.code, (st) => st === "planejado"))] : [];
    const plano = planos.length ? `<span class="plano-flag" aria-hidden="true" title="Planejada em ${esc(planos.join(", "))}">${icone("calendario-mais", 12)} ${esc(planos[0])}${planos.length > 1 ? ` <b>+${planos.length - 1}</b>` : ""}</span><span class="sr">, planejada em ${esc(planos.join(", "))}</span>` : "";
    const so = situacaoOrigem(c.code);
    const estado = so.origem ? `${so.rot} · ${so.origem}` : "";
    // Exibir → Situação: liga ou desliga só o ícone; a situação continua no nome acessível e nos detalhes.
    const ico = !so.origem || !ver.situacao ? "" : so.origem === "marcação" ? ICONE_MARCACAO : so.origem === ORIGEM_DECL ? ICONE_DECLARADA : ESTADO_DO_STATUS[statusPerfil(c.code)] || "";
    return `<button type="button" class="card limpo${tag ? " com-tag" : ""}${s === "analise" ? " s-analise" : ""}${apagado ? " apagado" : ""}${prot ? " protegida" : ""}${exp ? " com-eci" : ""}"
      data-code="${esc(c.code)}" ${tag ? `style="--tag:${esc(tag.cor)}"` : ""} title="${exp ? "Abrir a experiência: " + esc(window.ECI.tem(c.code).titulo) : esc(tag ? tag.nome : ROTULO[s]) + (prot ? " · protegida pelo cadeado" : "")}"
      ${seletorECI && !exp ? "inert" : ""}${exp ? ` aria-describedby="dica-eci"` : ""}>
      ${exp ? `<span class="selo-eci">${icone("eci", 12)} ECI por trás</span>` : ""}
      ${nota != null ? `<span class="nota">${esc(typeof nota === "number" ? nota.toFixed(1) : nota)}</span>` : ""}
      ${nomeDoCartao(c.name, ico, estado)}
      ${extras ? `<span class="meta">${extras}</span>` : ""}
      ${plano}
    </button>`;
  }

  /**
   * Barra única de progresso (créditos dos grupos 1–4), nesta ordem: concluída · prevista · cursando · planejada ·
   * não planejada. Cada trecho usa a cor da tag escolhida para o tipo ("Usar a cor desta tag na barra") ou a padrão.
   */
  function renderBarraGeral() {
    const t = totais();
    let total = 0, ok = 0, prev = 0, cur = 0, pl = 0;
    ["1", "2", "3", "4"].forEach((k) => {
      const T = t[k]; if (!T.total) return;
      const a = Math.min(T.ok, T.total);
      const b = Math.min(T.prev, T.total - a);
      const c = Math.min(T.cur, T.total - a - b);
      const d = Math.min(Math.max(0, T.plan - T.cur), T.total - a - b - c);
      total += T.total; ok += a; prev += b; cur += c; pl += d;
    });
    const resto = Math.max(0, total - ok - prev - cur - pl);
    const pc = (v) => (total ? (v / total) * 100 : 0);
    const cor = (status) => { const tg = tags.find((x) => x.barra && x.status === status); return tg ? `background:${esc(tg.cor)};` : ""; };
    const trechos = [["ok", ok, "Concluída", "aprovado"], ["prev", prev, "Prevista", "previsto"], ["cur", cur, "Cursando", "cursando"],
      ["plan", pl, "Planejada", "planejado"], ["resto", resto, "Não planejada", null]];
    const T5 = t[5];
    const mini = minimalista();
    const numeros = `${trechos.map(([, v, nome]) => `${nome} ${pc(v).toFixed(0)}%`).join(", ")}. ${fmt(ok)} de ${fmt(total)} cr${T5.total ? `. Extensão/ACE ${fmt(T5.ok)} de ${fmt(T5.total)} h` : ""}`;
    // No Minimalista a linha de números some da tela, mas continua lida: a barra recebe foco (e toque) e diz os números.
    $("#barra-geral").innerHTML = `
      <div class="bg-barra"${mini ? ` tabindex="0" role="img" aria-label="Progresso geral: ${esc(numeros)}" title="Toque ou foque para ver os números"` : ""}>${trechos.map(([cls, v, nome, st]) =>
        `<span class="seg-${cls}" style="width:${pc(v)}%;${st ? cor(st) : ""}" title="${nome}: ${fmt(v)} cr (${pc(v).toFixed(0)}%)"></span>`).join("")}</div>
      <div class="bg-legenda"${mini ? ' aria-hidden="true"' : ""}>
        ${trechos.map(([cls, v, nome, st]) => `<span><i class="seg-${cls}"${st && cor(st) ? ` style="${cor(st)}"` : ""}></i>${nome} <b>${pc(v).toFixed(0)}%</b></span>`).join("")}
        <span class="bg-total">${fmt(ok)} de ${fmt(total)} cr${T5.total ? ` · Extensão/ACE ${fmt(T5.ok)}/${fmt(T5.total)} h${T5.aConfirmar ? ` ${textoAConfirmar(T5)}` : ""}` : ""}</span>
        ${mini ? "" : `<button type="button" class="link" id="bg-detalhes">${progressoAberto ? `ocultar detalhes ${icone("seta-cima", 14)}` : `detalhes ${icone("seta-baixo", 14)}`}</button>`}
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
   * No modo clássico sempre há um pincel ativo (clique = pintar). No Planejador existe a opção
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
    const pinc = tagPorId(pincel);
    const jaTem = consultado && tagDe(consultado) && pinc && marcacoes[consultado] === pinc.id;
    const consulta = consultado && pinc ? (() => {
      const so = situacaoOrigem(consultado), i = M.info(consultado);
      return `<p class="consulta" id="consulta" role="status">${esc(consultado)} · ${esc(i ? i.name : "")}: ${esc(so.rot)} · ${so.origem ? esc(so.origem) : "sem marcação"}.
        ${jaTem ? `Toque de novo para tirar a tag ${esc(pinc.nome)}.` : `Toque de novo para marcar como ${esc(pinc.nome)}.`}
        ${modoClassico ? "" : `<button type="button" class="btn btn-sm" id="consulta-detalhes">Detalhes</button>`}</p>`;
    })() : "";
    return `${consulta}<div class="pal-trilho" role="toolbar" aria-label="Paleta: escolha a tag e clique nas disciplinas">
      ${modoClassico ? "" : botao("__detalhes", `${icone("detalhes")} Detalhes`, null, 'title="Clique abre os detalhes da disciplina"')}
      ${modoClassico ? "" : `<button type="button" class="pal-btn pal-eci${seletorECI ? " on" : ""}" id="pal-eci" aria-pressed="${seletorECI}"
        title="Destaca as disciplinas com experiência de A ECI por trás da Grade">${icone("eci")} <span>ECI por trás</span></button>`}
      ${tags.map((t) => botao(t.id, `${esc(t.nome)}${conta[t.id] ? ` <small>${conta[t.id]}</small>` : ""}`, t.cor, `title="${esc(CONTA_COMO[t.status] || "")}"`)).join("")}
      ${modoClassico ? botao("", `${icone("borracha")} Limpar`, null, 'title="Limpar: tira a tag da disciplina"')
        : botao("", `${icone("borracha")} Borracha`, null, 'title="Tirar a tag"')}
      ${modoClassico ? "" : botaoRegistrar("pal-btn pal-registrar", "btn-registrar")}
      <button type="button" class="pal-btn pal-icone" id="editar-tags" title="Editar tags" aria-label="Editar tags">${icone("tags")}</button>
      <button type="button" class="pal-btn pal-icone pal-cadeado" id="cadeado" aria-pressed="${cadeado}" aria-label="Proteger disciplinas cursadas"
        title="${cadeado ? "Cursadas protegidas: clique para liberar alterações" : "Proteger as cursadas contra alterações"}">${icone(cadeado ? "cadeado" : "cadeado-aberto")}</button>
    </div>
    ${seletorECI ? `<p class="dica-eci" id="dica-eci">Escolha um cartão destacado para abrir a experiência. As outras disciplinas ficam inativas até você desligar “ECI por trás”.</p>` : ""}`;
  }

  const TRILHA = [["desligado", "Desligado", "olho-fechado"], ["segurar", "Ao segurar", "mao"], ["foco", "Ao passar o mouse", "ponteiro"]];
  // A distinção não depende da cor: contorno contínuo, tracejado e a etiqueta "libera".
  const LEGENDA_DESTAQUE = `<span class="leg-destaque"><i class="l-pre"></i>pré-requisito <i class="l-co"></i>co-requisito <i class="l-libera">libera</i>o que ela libera</span>`;
  const EXIBIR = [["codigo", "Código e créditos", "hash"], ["notas", "Notas", "estrela"], ["dificuldade", "Dificuldade", "medidor"],
    ["presenca", "Presença", "presenca"], ["plano", "Plano", "calendario-mais"], ["situacao", "Situação", "circulo-check"]];
  /**
   * Botão que acende (um por opção, sem caixa de marcar): ligado = aceso, com aria-pressed. Ícone + texto mostra os dois;
   * Só ícones, só o ícone (o nome fica no `title` e no nome acessível, pelo `.rot`). O `data-*` é a chave do foco.
   */
  const botaoAceso = (attrs, ligado, ic, nome, dica = nome) =>
    `<button type="button" class="ctl aceso" ${attrs} aria-pressed="${!!ligado}" title="${esc(dica)}">${rotulo(icone(ic, 16), nome)}</button>`;
  /** Opções de exibição e filtro (só no Planejador, aba Grade). */
  function renderFerramentas() {
    const niveis = M.guia ? Object.keys(M.guia.niveis) : [];
    return `<div class="ferr-grupo" role="group" aria-label="Exibir"><span class="ferr-rot ctl" aria-hidden="true">${rotulo(icone("exibir", 14), "Exibir")}</span>
        ${EXIBIR.map(([k, n, ic]) => botaoAceso(`data-exibir="${k}"`, exibir[k], ic, n)).join("")}
        ${exibir.dificuldade ? escalaDificuldade() : ""}
      </div>
      <div class="ferr-grupo"><span class="ferr-rot ctl" aria-hidden="true">${rotulo(icone("setas", 14), "Trilha")}</span>
        <div class="seletor-modo seletor-trilha" role="radiogroup" aria-label="Trilha dos requisitos">${TRILHA.map(([v, n, ic]) =>
          `<label class="modo-op ctl" title="Trilha: ${n}"><input type="radio" name="trilha" value="${v}"${exibir.destaque === v ? " checked" : ""}>${icone(ic)}<span class="rot">${n}</span></label>`).join("")}</div>
        ${exibir.destaque !== "desligado" ? LEGENDA_DESTAQUE : ""}
      </div>
      ${niveis.length ? `<div class="ferr-grupo"><span class="ferr-rot">Dificuldade</span>
        ${niveis.map((k) => `<button type="button" class="chip chip-btn${filtroNivel.includes(+k) ? " on" : ""}" data-nivel="${k}" title="${esc(M.guia.niveis[k].nome)}">${M.guia.niveis[k].emoji}</button>`).join("")}
      </div>` : ""}`;
  }

  /** Editor de tags (no painel lateral). */
  function abreEditorTags() {
    const box = $("#detalhes");
    box.innerHTML = `<header><span class="cat-pill">Tags</span><button type="button" class="fechar" aria-label="Fechar">${icone("fechar")}</button></header>
      <h3>Tags de cor</h3>
      <p class="det-meta">Cada tag pinta as disciplinas e diz como elas entram na barra de progresso.</p>
      <ul class="lista tags-edit">${tags.map((t, k) => `<li>
        <input type="color" value="${esc(t.cor)}" data-tagcor="${k}" aria-label="Cor da tag ${esc(t.nome)}">
        <input class="campo campo-sm" value="${esc(t.nome)}" data-tagnome="${k}" aria-label="Nome da tag ${k + 1}">
        <select class="campo campo-sm" data-tagstatus="${k}" aria-label="Como a tag ${esc(t.nome)} conta no progresso">${Object.entries(CONTA_COMO).map(([v, n]) => `<option value="${v}" ${t.status === v ? "selected" : ""}>${n}</option>`).join("")}</select>
        <button type="button" class="x" data-tagdel="${k}" title="Apagar tag" aria-label="Apagar a tag ${esc(t.nome)}">${icone("fechar", 16)}</button>
        ${t.status !== "pendente" ? `<label class="check tag-barra"><input type="checkbox" data-tagbarra="${k}" ${t.barra ? "checked" : ""}> Usar a cor desta tag na barra</label>` : ""}</li>`).join("")}</ul>
      <p class="dica">Na barra, cada tipo (concluída, prevista, cursando, planejada) usa a cor de no máximo uma tag; sem escolha, a cor padrão.</p>
      <div class="add"><button type="button" class="btn btn-sm" id="tag-nova">${icone("mais", 16)} Nova tag</button>
      <button type="button" class="btn btn-sm btn-ghost" id="tag-padrao">Restaurar padrão</button></div>`;
    mostraPainel();
    box.dataset.alvo = "tags";
  }
  /** Salva e redesenha o editor de tags devolvendo o foco ao mesmo controle (o redesenho troca o HTML do painel). */
  function salvaTags() {
    const a = document.activeElement, box = $("#detalhes");
    const attr = a && box.contains(a) ? [...a.attributes].find((x) => x.name.startsWith("data-tag")) : null;
    const k = attr && attr.value, id = a && box.contains(a) && a.id;
    save("tags", tags); render(); abreEditorTags();
    // Sem o controle (ex.: a opção da barra some ao virar "Não conta"), o foco fica no tipo da mesma tag.
    const alvo = (attr && (box.querySelector(`[${attr.name}="${CSS.escape(k)}"]`) || box.querySelector(`[data-tagstatus="${CSS.escape(k)}"]`)))
      || (id && document.getElementById(id));
    if (alvo) alvo.focus();
  }

  // ---------- Vista: Grade ----------
  function renderGrade() {
    const n = window.semesters || Math.max(...M.grade.map((c) => c.semester));
    const fill = preenchimentoBlocos();
    const aConfirmarACE = resumoExtensao().aConfirmar;
    let html = "";
    for (let s = 1; s <= n; s++) {
      const cs = M.grade.filter((c) => c.semester === s);
      let feitos = 0, visiveis = 0;
      const foco = focoAtivo();
      const cards = cs.map((c) => {
        if (!c.code) {
          const f = fill[c.idx] || { ok: 0, prev: 0, plan: 0, nomes: [] };
          const feito = f.ok + f.prev, tudo = feito + f.plan;
          if (feito >= c.credits) feitos++;
          const st = feito >= c.credits ? (f.prev ? "previsto" : "aprovado") : tudo > 0 ? "planejado" : "pendente";
          const nomes = f.nomes.slice(0, 4).map((x) => `<span class="mini s-${x.s}">${esc(x.name)}</span>`).join("")
            + (f.nomes.length > 4 ? `<span class="mini">+${f.nomes.length - 4}</span>` : "");
          const pc = (v) => (v / c.credits) * 100;
          if (foco && st === "aprovado") return "";      // Foco: o concluído some (previstas ficam)
          visiveis++;
          return card({
            idx: c.idx, name: c.name, cat: c.category, status: st, classe: "bloco", inerte: seletorECI, semIcone: modoClassico || !exibir.situacao, semMeta: modoClassico,
            meta: `${fmt(feito)}${f.plan ? ` (+${fmt(f.plan)} plan.)` : ""} / ${metaDe(null, c.credits, c.category)}${c.category == 5 && aConfirmarACE ? ` · ${textoAConfirmar({ aConfirmar: aConfirmarACE })}` : ""}`,
            sub: modoClassico ? "" : nomes, fill: modoClassico ? null : { ok: pc(f.ok), prev: pc(f.ok + f.prev), plan: pc(tudo) },
          });
        }
        if (concluido(statusDe(c.code))) feitos++;
        if (foco && statusDe(c.code) === "aprovado") return "";
        visiveis++;
        return cardLimpo(c);
      }).join("");
      if (foco && !visiveis) continue;   // Foco: período da grade todo concluído
      const comChip = perfil && !modoClassico;   // Clássico: só cor e nome, sem a contagem do período
      const chip = comChip ? `<span class="chip ${feitos === cs.length ? "chip-ok" : ""}">${feitos}/${cs.length}</span>` : "";
      html += coluna(`${s}º período`, chip, cards, comChip && feitos === cs.length ? "col-completa" : "");
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

  /**
   * Colunas da linha do tempo. A transferida com semestre original conhecido (`aprovadaEm`) aparece nele, com etiqueta;
   * sem ele, fica no bloco. Só exibição: o prazo (D-03), os requisitos (D-08) e as contagens não mudam.
   */
  function colunasTimeline() {
    const cols = M.periodos.map((p) => ({ p, nome: p.nome, semestre: p.semestre, tipo: p.tipo, itens: [] }));
    const proprias = cols.slice(), porNome = new Map(cols.map((c) => [c.nome, c]));
    M.periodos.forEach((p, k) => {
      const ano = p.semestre == null ? anoDoBloco(p.nome) : null;
      p.itens.forEach((it) => {
        // Aprovação registrada por você com semestre: vai para a coluna dele, com etiqueta; sem semestre, fica na própria.
        if (p.declarado) {
          if (!it.semestreDeclarado) return proprias[k].itens.push({ it, decl: true });
        }
        // A data é a do próprio item: duas ocorrências do mesmo código no bloco podem ter semestres originais diferentes.
        const original = p.declarado ? it.semestreDeclarado
          : ano != null && it.status === "aprovado" && semestreValido(it.aprovadaEm) ? it.aprovadaEm : null;
        if (!original) return proprias[k].itens.push({ it });
        let c = porNome.get(original);
        if (!c) {
          const s = semIdx(original);
          c = { p: null, nome: original, semestre: s, tipo: "cursado", itens: [], so: true };
          const depois = cols.reduce((u, x, i) => (x.semestre != null && x.semestre < s ? i : u), -1);
          cols.splice(depois + 1, 0, c); porNome.set(original, c);
        }
        c.itens.push(p.declarado ? { it, decl: true } : { it, bloco: ano });
      });
    });
    // A coluna "Registradas por você · sem semestre" vem primeiro: a posição não afirma ordem.
    const virtual = cols.findIndex((c) => c.p && c.p.declarado);
    if (virtual > 0) cols.unshift(cols.splice(virtual, 1)[0]);
    return cols;
  }

  function renderTimeline() {
    if (!M.periodos.length) return semPerfil("A linha do tempo mostra as disciplinas no período em que você cursou (ou planeja cursar).");
    let html = "";
    colunasTimeline().forEach((colOriginal) => {
      let col = colOriginal;
      const p = col.p || col;
      // Bloco de transferidas sem nenhum item (todas foram ao semestre original): some da tela, fica no modelo (D-03, D-08).
      if (col.p && col.p.semestre == null && anoDoBloco(col.p.nome) != null && !col.itens.length) return;
      if (col.p && col.p.declarado && !col.itens.length) return;
      // Foco: some o concluído (inclusive transferidas aprovadas, dispensas e declaradas) e a reprovação já superada;
      // períodos passados sem nada elegível somem, inclusive o bloco; o período atual sempre aparece.
      if (focoAtivo()) {
        col = { ...col, itens: col.itens.filter(({ it }) => it.status !== "aprovado" && !(it.status === "reprovado" && concluido(statusDe(it.alvo)))) };
        if ((!col.p || col.p.tipo === "cursado") && !col.itens.length) return;
      }
      let cr = 0, temOferta = false;
      const cards = col.itens.map(({ it, bloco, decl }) => {
        if (it.status !== "reprovado" && it.category != 5) cr += it.credits;
        const subs = bloco != null ? [`<span class="etq-transferida">transferida · bloco ${bloco}</span>`]
          : decl ? [`<span class="etq-transferida etq-declarada">${iconeEstado(ICONE_DECLARADA, 12)} registrada por você${it.semestreDeclarado ? "" : " · sem semestre"}</span>`] : [];
        if (it.equivale && M.curr[it.equivale]) subs.push(`${icone("equivalencias", 12)} ${esc(it.equivale)} ${esc(M.curr[it.equivale].name)}`);
        if (it.dispensas.length) subs.push("dispensa " + it.dispensas.map(esc).join(", "));
        // Alertas pelo tipo do registro de origem: a transferida é histórico aprovado, mesmo na coluna do atual ou de um plano.
        const tipo = bloco != null || decl ? "cursado" : p.tipo;
        const aviso = tipo !== "cursado" && it.status !== "reprovado" ? avisos(it.alvo, p.semestre) : [];
        const oferta = tipo === "planejado" && it.status !== "reprovado" ? avisoOferta(it.alvo, p.nome) : null;
        if (oferta) { temOferta = true; aviso.push(oferta.texto); subs.push(`<span class="aviso-oferta">${esc(oferta.curto)}</span>`); }
        return card({
          code: it.alvo, name: it.name, cat: it.category, status: it.status, nota: it.nota, origem: decl ? ORIGEM_DECL : "perfil", periodo: col.nome, ri: it.ri, transferida: bloco != null,
          declarada: !!decl, ...(decl ? { icone: ICONE_DECLARADA } : {}),
          meta: metaDe(it.code, it.category == 5 ? it.horas : it.credits, it.category), sub: subs.join("<br>"), aviso,
          ...(bloco != null ? { classe: "transferida", titulo: `transferida do curso anterior (bloco ${bloco})` } : {}),
        });
      }).join("");
      const tipoChip = p.declarado ? `<span class="chip">sem semestre</span>`
        : { atual: `<span class="chip chip-atual">atual</span>`, planejado: `<span class="chip chip-plan">planejado</span>`, cursado: "" }[p.tipo];
      const chips = `${tipoChip}${p.nota ? `<span class="chip">${esc(p.nota)}</span>` : ""}<span class="chip">${fmt(cr)} cr</span>${p.editado ? `<span class="chip chip-alerta" title="Editado no navegador — exporte o perfil para salvar">editado</span>` : ""}`;
      const notas = (p.tipo === "atual" && p.deduzido ? notaHtml(NOTA_RA19) : "") + (temOferta ? notaHtml(notaRA20()) : "");
      html += coluna(p.nome, chips, cards, `col-${p.tipo}${col.so ? " col-original" : ""}`, notas);
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
    // "Todas acesas" só tira o esmaecimento das inativas: habilitado quando há uma inativa na lista (inclusive as
    // cursadas e planejadas que "só ativas" mantém); desabilitado, a preferência fica guardada.
    const temInativa = !!M.ref && itens.some((i) => !paridadesOferta(i.code).length);
    // Filtros: botões que acendem. Indisponível, o botão fica com aria-disabled e o motivo em texto (anunciado ao clicar);
    // a preferência salva continua e o aria-pressed a acompanha.
    const filtroOpt = (k, ic, txt, motivo = "", dica = txt) => motivo
      ? `<button type="button" class="ctl aceso" data-fcheck="${k}" aria-pressed="${!!filtros[k]}" aria-disabled="true" aria-describedby="fmotivo-${k}" title="${esc(dica)}">${rotulo(icone(ic, 16), txt)}</button><span class="sr" id="fmotivo-${k}">${esc(motivo)}</span>`
      : botaoAceso(`data-fcheck="${k}"`, filtros[k], ic, txt, dica);
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
        return `<button type="button" class="mini-btn${dentro ? " on" : ""}" data-plan="${esc(p.nome)}" data-pcode="${esc(i.code)}" title="${dentro ? "Remover de" : "Planejar em"} ${esc(p.nome)}">${icone(dentro ? "check" : "mais", 14)} ${esc(p.nome)}</button>`;
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
            return `<span class="hor ${e.choques.length ? "choca" : "cabe"}">${icone("relogio", 13)} ${esc(e.of.join(", "))} · ${e.choques.length ? "choca com " + esc(e.choques.join(", ")) : "cabe em " + esc(alvo)}</span>`;
          })() : ""}
        </button>
        ${concluido(s) ? "" : `<div class="opt-acoes">${acoes}</div>`}
      </div>`;
    }).join("");

    return `<div class="optativas${M.ref && filtros.acesas ? " acesas" : ""}">
      <div class="filtros">
        <div class="seg seg-sm" role="group" aria-label="Grupo de optativas">${Object.entries(GRUPOS_OPT).map(([k, n]) => `<button type="button" class="ctl" data-fgrupo="${k}" aria-pressed="${filtros.grupo == k}" title="${n}">${rotulo(icone(ICONE_GRUPO[k], 16), n)}</button>`).join("")}</div>
        <input type="search" class="campo busca" id="busca-opt" aria-label="Buscar optativas por nome ou código" placeholder="Buscar por nome ou código…" value="${esc(filtros.busca)}">
        ${M.ref ? filtroOpt("ativas", "raio", "Só ativas") : ""}
        ${filtroOpt("liberadas", "cadeado-aberto", "Só liberadas")}
        ${filtroOpt("ocultarFeitas", "lista-x", "Ocultar cursadas")}
        ${futuros.length ? `<label class="check ctl" title="Horários de ${esc(alvo)}">${rotulo(icone("relogio", 16), "Horários de")}
          <select class="campo campo-sm" data-falvo>${futuros.map((p) => `<option ${p.nome === alvo ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></label>
          ${filtroOpt("cabe", "calendario-check", `Só as que cabem em ${esc(alvo)}`)}` : ""}
        ${M.ref ? filtroOpt("acesas", "eci", "Todas acesas", temInativa ? "" : "Nenhuma optativa inativa na lista.",
          temInativa ? "Todas acesas: tira o esmaecimento das optativas inativas" : "Todas acesas: nenhuma optativa inativa na lista") : ""}
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
      ${M.ref ? `<p class="dica nota-estimativa">${esc(notaRA20())}</p>` : ""}
    </div>`;
  }

  // ---------- Vista: Equivalências & Extensão ----------
  const semAtual = () => { const d = new Date(); return d.getFullYear() * 2 + (d.getMonth() < 6 ? 0 : 1); };
  // Base do prazo de 5 anos (CR-04): semestre real, ou só o ano de um bloco de transferidos (`anoDoBloco`).
  // Com só o ano, a idade fica entre `min` e `max`; `aprovadaEm` (data original) não conta para o prazo (D-03), só para requisitos (D-08).
  // Perfis antigos podem trazer historicoAtual "duvida"; os gerados agora nunca gravam esse valor (PC-05).
  const papelEmDuvida = () => !!(perfil && perfil.fonte && perfil.fonte.historicoAtual === "duvida");
  function baseDoPrazo(code) {
    const r = window.PROGRESSO.aprovacaoDoPrazo(M.regs[code], M.periodos);   // ordem fixa, não a dos períodos
    if (!r) return null;
    // D-03 (js/progresso.js): transferida pelo ano do bloco; declarada sem semestre sem data; pedida pela origem mais tardia.
    const b = window.PROGRESSO.prazoDoRegistro(r, M.periodos);
    if (!b) return null;      // declarada sem semestre: "Data de aprovação não confirmada" (sem idade)
    return { ano: b.ano, min: (semAtual() - b.ate) / 2, max: (semAtual() - b.de) / 2, aprovadaEm: r.origens ? null : r.aprovadaEm || null, declarado: !!b.declarado,
      fonte: b.fonte, misto: !!r.origens && r.origem === "declarado" && b.fonte !== "declarado" };
  }
  /**
   * Os dois números da livre escolha (D-02, PC-04): o da Grade e a soma da lista "Cursadas e Não Explicitadas" do BOA.
   * A seção presente e vazia vale 0 cr; ausente (ou sem prova de presença, em perfil antigo) é "indisponível".
   * O número do BOA nunca é o total do BOA: o importador não lê a linha de total.
   */
  function numerosLivreEscolha(t = totais()) {
    const grade = t[3].ok + t[3].prev;
    const boa = M.boa, lista = (boa && boa.naoExplicitadas) || [];
    const presente = !!boa && (boa.naoExplicitadasPresente === true || (boa.naoExplicitadasPresente == null && lista.length > 0));
    return { grade, presente, soma: presente ? lista.reduce((a, d) => a + (Number(d.credits) || 0), 0) : null,
      emissao: (boa && boa.emissao) || null,
      motivo: !boa ? "nenhum BOA importado" : "a seção “Cursadas e Não Explicitadas” não foi encontrada neste BOA" };
  }
  function htmlNumerosLivre(t) {
    const n = numerosLivreEscolha(t);
    return `<ul class="livre-numeros">
      <li>Grade: <b>${fmt(n.grade)} cr</b> <small>(estimativa da Grade)</small></li>
      <li>${n.presente ? `BOA, soma das não explicitadas: <b>${fmt(n.soma)} cr</b> <small>(${n.emissao ? `BOA de ${esc(n.emissao)}; ` : ""}estimativa)</small>`
        : `BOA: <b>indisponível</b> <small>(${esc(n.motivo)})</small>`}</li>
    </ul>${notaHtml(NOTA_RA13)}`;
  }
  /**
   * Detalhamento: o cartão "Livre escolha" tem o mesmo formato dos outros; o ⓘ pequeno ao lado do título mostra os
   * dois números rotulados e a nota de RA-13 (clique, toque ou teclado). Sem BOA importado, só a estimativa da Grade.
   */
  const botaoInfoLivre = () => `<button type="button" class="info-btn" id="livre-info-btn" aria-expanded="${infoLivreAberta}"
      aria-controls="livre-info" aria-label="Como ler os números da livre escolha" title="Como ler estes números">${icone("info", 16)}</button>`;
  function htmlInfoLivre(t) {
    const n = numerosLivreEscolha(t);
    const iso = (d) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d || ""); return m ? `${m[3]}-${m[2]}-${m[1]}` : d; };
    const boa = !M.boa ? "" : n.presente
      ? `<li>BOA, soma das não explicitadas: <b>${fmt(n.soma)} cr</b>${n.emissao ? ` <small>(BOA de ${esc(iso(n.emissao))})</small>` : ""}</li>`
      : `<li>BOA: <b>indisponível</b> <small>(${esc(n.motivo)})</small></li>`;
    return `<div class="livre-info" id="livre-info"${infoLivreAberta ? "" : " hidden"}>
        <ul class="livre-numeros"><li>Grade: <b>${fmt(n.grade)} cr</b> <small>(estimativa)</small></li>${boa}</ul>${M.boa ? notaHtml(NOTA_RA13) : ""}</div>`;
  }
  // Notas de estimativa de D-06 (textos em docs/REGRAS-ACADEMICAS.md#textos-de-aviso). A data de RA-20 vem de `consultado`.
  const dataBR = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || ""); };
  const NOTA_RA13 = "Estimativa da Grade. No BOA, os créditos usados em equivalências podem continuar aparecendo na livre escolha.";
  const NOTA_RA09 = "Idade estimada pelo semestre de aprovação. Para quem reingressou, a data que vale pode ser outra; confira com a coordenação.";
  const NOTA_RA19 = "Período atual deduzido do histórico. Confira e corrija na prévia, se precisar.";
  const notaRA20 = () => `Horários de referência mantidos por alunos (Notion${M.ref && M.ref.consultado ? `, consultado em ${dataBR(M.ref.consultado)}` : ""}). Podem mudar; confira no SIGA antes da inscrição.`;
  const notaHtml = (t) => `<p class="nota-estimativa">${esc(t)}</p>`;
  /** Horas de extensão ainda sem identidade certa: o mesmo texto na barra, no bloco da Grade, no progresso e nos Pedidos. */
  const textoAConfirmar = (T5) => (T5 && T5.aConfirmar ? `+${fmt(T5.aConfirmar)} h a confirmar` : "");
  /** Aviso de origem reutilizada em mais de uma dispensa (D-07). `origem` limita o aviso a uma disciplina. */
  function avisoReuso(origem) {
    const lista = M.reutilizadas.filter((x) => !origem || x.origem === origem);
    if (!lista.length) return "";
    return `<p class="aviso-dispensa alerta" role="note">⚠ ${lista.map((x) => `${esc(x.origem)} aparece como origem de ${x.alvos.length} dispensas (${x.alvos.map(esc).join(", ")}).`).join(" ")}
      A Resolução CEG 01/2017, art. 46, II, veda reutilizar a mesma origem. Os alvos contam como no histórico; os créditos da origem não são somados de novo.</p>`;
  }
  /** Texto curto da base e da origem de uma cursada, para o pedido e a tabela de livre escolha. */
  function textoBase(b) {
    if (!b) return "";
    // Diz de onde vem a data do prazo: registro do SIGA, bloco de transferidos ou semestre informado por você.
    const frases = [];
    if (b.fonte === "declarado") frases.push("Semestre informado por você, sem registro do SIGA.");
    else if (b.ano != null) frases.push(`Base do prazo: só o ano ${b.ano} (bloco de transferidos).`);
    else if (b.misto) frases.push("Base do prazo: o registro do SIGA (outra origem foi informada por você).");
    if (b.aprovadaEm) frases.push(`Aprovação original em ${b.aprovadaEm}: não conta para o prazo.`);
    return frases.join(" ");
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
    const idades = cs.map((c) => ({ code: c.code, base: baseDoPrazo(c.code) }));
    const velhas = idades.filter((c) => c.base && c.base.min > 5);
    const imprecisas = idades.filter((c) => c.base && c.base.min <= 5 && c.base.max > 5 && c.base.ano != null);
    const semData = idades.filter((c) => !c.base);
    const cr = cs.reduce((a, c) => a + crDe(c.code), 0);
    const semConteudo = !cs.some((c) => c.papel !== "horas");
    const repetidas = (e.status || "a pedir") === "indeferido" ? [] : cs.filter((c) => usosDe(c.code, getEq().indexOf(e)).length).map((c) => c.code);
    const pedidaFeita = concluido((M.regs[e.pedida] || []).reduce((a, r) => (FORCA[r.status] > FORCA[a] ? r.status : a), "pendente")) && (e.status || "") !== "deferido";
    const semCarga = cs.filter((c) => !chDe(c.code)).map((c) => c.code);   // carga indisponível: a soma não a inclui
    return { cs, ch, chPed, semCarga, velhas, imprecisas, semData, cr, semConteudo, repetidas, pedidaFeita };
  }

  function renderPedidos() {
    const resumo = resumoExtensao();
    const tot = totais(resumo);
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
      <div class="tabela-rolagem" role="region" tabindex="0" aria-label="Contas automáticas (tabela)"><table class="tabela contas"><thead><tr><th>Grupo</th><th>Hoje</th><th>Pedidos pendentes</th><th>Se tudo for deferido</th><th>Situação</th></tr></thead><tbody>
        ${linhaConta("Optativas", op.T.ok + op.T.prev, op.T.anal, op.depois, op.T.total, "cr",
          op.falta ? `faltam ${fmt(op.falta)} cr · planejados ${fmt(op.T.plan)} cr → ${op.faltaSemPlano ? `<span class="alerta">ainda faltam ${fmt(op.faltaSemPlano)} cr sem período</span>` : `<span class="ok">fecha ✓</span>`}` : `<span class="ok">completo ✓</span>`)}
        ${linhaConta("Humanas", hu.T.ok + hu.T.prev, hu.T.anal, hu.depois, hu.T.total, "cr",
          hu.falta ? `faltam ${fmt(hu.falta)} cr${hu.faltaSemPlano ? ` · <span class="alerta">${fmt(hu.faltaSemPlano)} cr sem período</span>` : ` · <span class="ok">fecha com o planejado ✓</span>`}` : `<span class="ok">completo ✓</span>`)}
        ${linhaConta("Livre escolha", livreHoje, reservado ? -reservado : 0, livreDepois, livreExig, "cr",
          livreDepois >= livreExig ? `<span class="ok">sobram ${fmt(livreDepois - livreExig)} cr acima do exigido ✓</span>` : `<span class="alerta">ficaria ${fmt(livreExig - livreDepois)} cr abaixo do exigido</span>`)}
      </tbody></table></div>
      ${sobraTxt(2, op)}${sobraTxt(4, hu)}
      <p class="dica">Pedidos "a pedir"/"em análise" entram na coluna do meio. Os créditos das cursadas usadas saem de livre escolha; a pedida entra no grupo dela. Indeferidos não contam.</p>
    </section>`;

    // ----- pedidos -----
    const linhasEq = eqs.map((e, k) => {
      const a = analisaPedido(e);
      const cursCell = a.cs.map((c, j) => {
        const base = baseDoPrazo(c.code);
        const id = base ? base.max : null;
        const infoBase = textoBase(base);
        return `<div class="cur">${descr(c.code)}${infoBase ? `<br><small class="base-prazo">${esc(infoBase)}${papelEmDuvida() ? " Estimativa: o histórico do curso atual não foi confirmado." : ""}</small>` : ""}
          <div class="cur-acoes"><select class="campo campo-sm" data-eqpapel="${k}:${j}" aria-label="Papel de ${esc(c.code)} no pedido ${k + 1}"><option value="conteudo" ${c.papel !== "horas" ? "selected" : ""}>conteúdo</option><option value="horas" ${c.papel === "horas" ? "selected" : ""}>só horas</option></select>
          ${base && base.min > 5 ? `<small class="alerta" title="Res. CEG 01/2017">⚠ ${base.ano != null ? "mais de 5 anos" : fmt(Math.floor(id * 2) / 2) + " anos"}: pode exigir exame de suficiência</small>` : ""}
          ${a.cs.length > 1 ? `<button type="button" class="x" data-eqrmc="${k}:${j}" title="Tirar do pedido" aria-label="Tirar ${esc(c.code)} do pedido ${k + 1}">${icone("fechar", 16)}</button>` : ""}</div></div>`;
      }).join("") + `<div class="add add-cur"><input class="campo campo-sm" list="eq-cursadas" data-eqnovo="${k}" aria-label="Juntar outra cursada ao pedido ${k + 1}" placeholder="+ cursada"><button type="button" class="mini-btn" data-eqaddc="${k}">juntar</button></div>`;
      const checks = [
        // D-01: a comparação de carga horária é orientação (a CEG 01/2017 pede conteúdo e orientação, não percentual): sem ✓/✗.
        a.chPed ? `<li class="orientacao-carga">Carga horária: ${a.ch} h de ${a.chPed} h: ${a.ch < a.chPed ? "abaixo da carga da pedida" : a.ch === a.chPed ? "igual" : "acima"}</li>`
          : `<li class="orientacao-carga">Carga horária da pedida indisponível</li>`,
        a.semCarga.length ? `<li class="orientacao-carga">Carga horária indisponível para ${a.semCarga.map(esc).join(", ")}; a soma não a inclui.</li>` : "",
        a.semConteudo ? `<li class="alerta">✗ nenhuma cursada marcada como conteúdo</li>` : "",
        a.velhas.length ? `<li class="alerta">⚠ mais de 5 anos: ${a.velhas.map((v) => esc(v.code)).join(", ")}</li>` : "",
        a.imprecisas.length ? `<li class="alerta">Precisão insuficiente: só o ano é conhecido; pode passar de 5 anos (${a.imprecisas.map((v) => esc(v.code)).join(", ")}).</li>` : "",
        a.semData.length ? `<li class="alerta">Data de aprovação não confirmada: ${a.semData.map((v) => esc(v.code) + (fonteDe(v.code) === "declarado" ? " (aprovação registrada por você, sem semestre)" : "")).join(", ")}</li>` : "",
        a.cs.some((c) => baseDoPrazo(c.code)) ? `<li class="nota-estimativa">${esc(NOTA_RA09)}</li>` : "",
        a.repetidas.length ? `<li class="alerta">⚠ já usada em outro pedido/dispensa: ${a.repetidas.map(esc).join(", ")}</li>` : "",
        M.pedidosComConflito.has(e) ? `<li class="alerta">Créditos fora da soma até resolver o uso em duplicidade.</li>` : "",
        a.pedidaFeita ? `<li class="alerta">⚠ a pedida já está aprovada/prevista</li>` : "",
        `<li>usa ${fmt(a.cr)} cr de livre escolha</li>`,
      ].join("");
      return `<tr class="eq-${(e.status || "a pedir").replace(/\W+/g, "-")}">
        <td>${cursCell}</td><td class="seta">→</td><td>${descr(e.pedida)}</td>
        <td><ul class="checks">${checks}</ul></td>
        <td><select class="campo campo-sm" data-eqstatus="${k}" aria-label="Situação do pedido ${k + 1}">${EQ_STATUS.map((x) => `<option ${x === (e.status || "a pedir") ? "selected" : ""}>${x}</option>`).join("")}</select>
          <input class="campo campo-sm" data-eqobs="${k}" aria-label="Observação do pedido ${k + 1}" value="${esc(e.obs || "")}" placeholder="processo, data, motivo…"></td>
        <td><button type="button" class="x" data-eqdel="${k}" title="Remover pedido" aria-label="Remover o pedido ${k + 1}">${icone("fechar", 16)}</button></td></tr>`;
    }).join("");

    const cursadasOpc = neCodes.map((c) => { const u = usosDe(c); return `<option value="${esc(c)}">${esc(c)} — ${esc((boaDe(c) || M.info(c) || {}).name || "")}${u.length ? ` (${esc(u.map((x) => x.txt).join("; "))})` : ""}</option>`; }).join("");
    const pedidasOpc = M.catalogo.filter((o) => !concluido(statusDe(o.code)) && o.category != 5)
      .map((o) => `<option value="${esc(o.code)}">${esc(o.code)} — ${esc(o.name)} (${GRUPOS_OPT[o.category] || ""}, ${o.workload || "?"} h${ativa(o.code) ? ", ativa" : ""})</option>`).join("");
    const aceOpc = M.catalogo.filter((o) => o.category == 5).map((o) => `<option value="${esc(o.code)}">${esc(o.code)} — ${esc(o.name)} (${o.horas} h)</option>`).join("");

    // ----- livre escolha: de onde vem e para onde vai -----
    let somaUsada = 0;
    const linhasLivre = neCodes.map((c) => {
      const cr = crDe(c);
      const u = usosDe(c);
      const usada = M.consumidas.has(c);
      if (usada) somaUsada += cr;
      const base = baseDoPrazo(c);
      const idade = !base ? "—" : base.ano != null
        ? `${fmt(Math.floor(base.min * 2) / 2)} a ${fmt(Math.floor(base.max * 2) / 2)} anos${base.min > 5 ? " ⚠" : base.max > 5 ? " (pode passar de 5)" : ""}`
        : `${fmt(Math.floor(base.max * 2) / 2)} anos${base.max > 5 ? " ⚠" : ""}`;
      return `<tr class="${u.length ? "" : "livre"}"><td>${descr(c)}</td><td>${idade}</td>
        <td>${u.length ? u.map((x) => `<span class="chip ${x.tipo === "dispensa" ? "" : "chip-plan"}">${esc(x.txt)}</span>`).join(" ") : `<button type="button" class="chip chip-btn" data-eqcand="${esc(c)}">livre — usar num pedido</button>`}</td></tr>`;
    }).join("");

    const linhasExt = ext.map((a, k) => `<tr>
        <td><input class="campo campo-sm" data-ext="${k}" data-campo="nome" aria-label="Nome da atividade ${k + 1}" value="${esc(a.nome || "")}" placeholder="Atividade"></td>
        <td><input class="campo campo-sm" list="ace-list" data-ext="${k}" data-campo="code" aria-label="Código ACE da atividade ${k + 1}" value="${esc(a.code || "")}" placeholder="Código ACE"></td>
        <td><input class="campo campo-sm num" type="number" min="0" data-ext="${k}" data-campo="horas" aria-label="Horas da atividade ${k + 1}" value="${esc(a.horas || 0)}"></td>
        <td><input class="campo campo-sm" data-ext="${k}" data-campo="periodo" aria-label="Período da atividade ${k + 1}" value="${esc(a.periodo || "")}" placeholder="2027/1"></td>
        <td><span class="situ situ-${(a.status || "planejada").replace(/\W+/g, "-")}">${esc(a.status || "planejada")}</span>
          <select class="campo campo-sm" data-ext="${k}" data-campo="status" aria-label="Situação da atividade ${k + 1}">${EXT_STATUS.map((x) => `<option ${x === (a.status || "planejada") ? "selected" : ""}>${x}</option>`).join("")}</select></td>
        <td><button type="button" class="x" data-extdel="${k}" title="Remover" aria-label="Remover a atividade ${k + 1}">${icone("fechar", 16)}</button></td></tr>`).join("");
    const T5 = tot[5];

    return `<div class="pedidos">
      ${temEdicoes() ? `<p class="aviso-edicao">Há edições só neste navegador. <button type="button" class="btn btn-sm" id="exportar">${icone("baixar", 14)} Exportar perfil.js</button></p>` : ""}
      ${avisoReuso()}
      ${contas}
      <section class="sec">
        <h2>Pedidos de dispensa / equivalência</h2>
        <p class="dica">Um pedido pode juntar várias cursadas para uma eletiva. Marque qual cursada traz o <b>conteúdo</b> e quais entram <b>só pelas horas</b>. O app soma a C.H. só como orientação e avisa sobre o prazo de 5 anos (Res. CEG 01/2017).</p>
        <div class="tabela-rolagem" role="region" tabindex="0" aria-label="Pedidos de dispensa ou equivalência (tabela)"><table class="tabela"><thead><tr><th>Cursada(s)</th><th></th><th>Eletiva pedida</th><th>Checagens</th><th>Situação</th><th></th></tr></thead>
        <tbody>${linhasEq || `<tr><td colspan="6" class="vazio">Nenhum pedido.</td></tr>`}</tbody></table></div>
        <div class="add">
          <input class="campo" list="eq-cursadas" id="eq-c" aria-label="Cursadas do pedido" placeholder="Cursada(s): ex. EET100 + EEL170">
          <span class="seta">→</span>
          <input class="campo" list="eq-pedidas" id="eq-p" aria-label="Eletiva pedida" placeholder="Eletiva pedida (código)">
          <button type="button" class="btn btn-sm" id="eq-add">Adicionar pedido</button>
          <datalist id="eq-cursadas">${cursadasOpc}</datalist><datalist id="eq-pedidas">${pedidasOpc}</datalist>
        </div>
        <p class="dica">A primeira cursada entra como "conteúdo" e as demais como "só horas"; dá para trocar depois.</p>
      </section>
      <section class="sec">
        <h2>Livre escolha ${M.boa ? `<small>cursadas não explicitadas no BOA${M.boa.emissao ? ` de ${esc(M.boa.emissao)}` : ""}</small>` : ""}</h2>
        ${htmlNumerosLivre(tot)}
        <p class="dica">Exigido ${fmt(livreExig)} cr · já consumidos por deferimento ${fmt(somaUsada)} cr · reservados por pedidos pendentes ${fmt(reservado)} cr.</p>
        <div class="tabela-rolagem" role="region" tabindex="0" aria-label="Livre escolha: cursadas e uso (tabela)"><table class="tabela"><thead><tr><th>Disciplina</th><th>Cursada há</th><th>Uso</th></tr></thead><tbody>${linhasLivre}</tbody></table></div>
        ${neCodes.some((c) => baseDoPrazo(c)) ? notaHtml(NOTA_RA09) : ""}
      </section>
      <section class="sec">
        <h2>Extensão / ACE <small>${fmt(T5.ok)} h confirmadas${T5.aConfirmar ? ` · ${textoAConfirmar(T5)}` : ""}${T5.plan ? ` · ${fmt(T5.plan)} h em andamento/planejadas` : ""} · exigido ${fmt(T5.total)} h</small></h2>
        <div class="barra"><span class="b-ok" style="width:${Math.min(100, (T5.ok / T5.total) * 100)}%;background:var(--cat5)"></span><span class="b-plan" style="width:${Math.min(100 - Math.min(100, (T5.ok / T5.total) * 100), (T5.plan / T5.total) * 100)}%;background:color-mix(in srgb, var(--cat5) 30%, transparent)"></span></div>
        ${T5.aConfirmar ? `<p class="ace-duplicidade alerta">Possível duplicidade em ${esc([...resumo.codigosDuvidosos].join(", "))}.
          ${fmt(T5.aConfirmar)} h a confirmar. Confira no SIGA ou com a coordenação.</p>` : ""}
        <div class="tabela-rolagem" role="region" tabindex="0" aria-label="Atividades de extensão e ACE (tabela)"><table class="tabela"><thead><tr><th>Atividade</th><th>Código ACE</th><th>Horas</th><th>Período</th><th>Situação</th><th></th></tr></thead>
        <tbody>${linhasExt || `<tr><td colspan="6" class="vazio">Nenhuma atividade.</td></tr>`}</tbody></table></div>
        <datalist id="ace-list">${aceOpc}</datalist>
        <button type="button" class="btn btn-sm" id="ext-add">${icone("mais", 16)} Atividade</button>
      </section>
    </div>`;
  }

  // ---------- Planejamento: pendências e sugestões ----------
  function ultimoPlanejado() {
    return periodosFuturos().reduce((ultimo, p) =>
      (p.semestre ?? -1) >= (ultimo?.semestre ?? -1) ? p : ultimo, null);
  }

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
      if (!reqsOk(i, p.semestre)) return;
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
    if (ultimoPlanejado() === p) {
      M.grade.filter((c) => c.code && FORCA[statusDe(c.code)] <= FORCA.reprovado && !paridadesOferta(c.code).length
        && reqsOk(M.info(c.code), p.semestre)).forEach((c) => itens.push({ code: c.code, name: c.name, cr: c.credits, cat: 1, semHorario: true }));
    }
    return { periodo: p.nome, itens, falta: need };
  }
  const reqsOk = (info, semestre) => !info || (info.req.every((r) => requisitoCumprido(r, semestre))
    && info.coreq.every((r) => requisitoCumprido(r, semestre, true)));

  function renderPlanejamento(p) {
    const ult = ultimoPlanejado();
    const need = necessidades();
    const tot = totais();
    // pendências para formar
    const semPeriodo = M.grade.filter((c) => c.code && FORCA[statusDe(c.code)] <= FORCA.reprovado);
    const avisosPlan = [];
    periodosPlanejaveis().forEach((q) => q.itens.forEach((it) => {
      if (it.status === "reprovado") return;
      const av = avisos(it.alvo, q.semestre);
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
        <small>${textoPresenca(c.code) ? esc(textoPresenca(c.code)) + " · " : ""}${icone("relogio", 13)} ${esc(c.horarios.join(", "))}${c.choques.length ? ` · choca com ${esc(c.choques.join(", "))}` : " · cabe"}</small></span>
        <button type="button" class="mini-btn" data-sugadd="${esc(c.code)}">${icone("mais", 14)} ${esc(p.nome)}</button></li>`).join("");
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
        <h3>Sugestões para ${esc(p.nome)} ${slotTxt ? `<span class="chip chip-plan">${esc(slotTxt)} <button type="button" class="x-chip" id="slot-limpar" aria-label="Limpar o horário escolhido" title="Limpar o horário escolhido">${icone("fechar", 14)}</button></span>` : ""}</h3>
        <p class="dica">Só turmas ativas na referência, com requisitos cumpridos antes de ${esc(p.nome)} e que ainda fazem falta. ${cronoSel ? "" : "Clique numa célula vazia da grade para buscar por horário."}</p>
        <button type="button" class="btn btn-sm" id="prop-gerar">${icone("brilho", 16)} Sugerir combinação sem choques</button>
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
    const abas = ps.map((x) => `<button type="button" data-cperiodo="${esc(x.nome)}" aria-pressed="${x.nome === cronoPeriodo}">${esc(x.nome)}${x.tipo === "atual" ? " · atual" : ""}</button>`).join("");
    const topo = `<div class="crono-topo">
        <div class="seg seg-sm" role="group" aria-label="Período">${abas}</div>
        <button type="button" class="btn btn-sm ctl" id="novo-periodo" title="Adicionar período" aria-label="Adicionar período">${rotulo(icone("mais", 16), "Período")}</button>
        <span class="espaco"></span>
        ${temEdicoes() ? `<span class="chip chip-alerta">edições não exportadas</span>` : ""}
        <button type="button" class="btn btn-sm ctl" id="exportar" title="Exportar perfil.js: baixa o perfil com as edições">${rotulo(icone("baixar", 14), "Exportar perfil.js")}</button>
        ${p && p.editado && periodoDoPerfil(p.nome) ? `<button type="button" class="btn btn-sm btn-ghost" id="descartar" title="Volta ao conteúdo original do perfil">Descartar edições de ${esc(p.nome)}</button>` : ""}
        ${p && p.tipo === "planejado" ? `<button type="button" class="btn btn-sm btn-perigo-ghost ctl" id="excluir-periodo" title="Excluir período">${rotulo(icone("lixeira", 14), "Excluir período")}</button>` : ""}
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
      const aviso = p.tipo !== "cursado" && it.status !== "reprovado" ? avisos(it.alvo, p.semestre) : [];
      const oferta = p.tipo === "planejado" && it.status !== "reprovado" ? avisoOferta(it.alvo, p.nome) : null;
      return `<li class="crono-item${cronoSel === it.code ? " sel" : ""} s-${esc(it.status)}" style="--cor:${cor[it.code]}">
        <button type="button" class="crono-pick" data-csel="${esc(it.code)}">
          <i class="sw"></i><span><b>${seloGuia(it.alvo, true)} ${esc(it.name)}</b><small>${esc(metaDe(it.code, it.category == 5 ? it.horas : it.credits, it.category))}${it.status !== "planejado" ? " · " + ROTULO[it.status].toLowerCase() : ""}${textoPresenca(it.alvo) ? " · " + esc(textoPresenca(it.alvo)) : ""}</small>
          <small class="${it.cel.size ? "" : "alerta"}">${it.cel.size ? `${formataHorarios(it.cel).join(", ")} · ${it.cel.size} h/sem` : "sem horário"}</small>
          ${aviso.length ? `<small class="alerta">${icone("alerta", 13)} ${esc(aviso.join("; "))}</small>` : ""}
          ${oferta ? `<small class="aviso-oferta">${icone("alerta", 13)} ${esc(oferta.texto)}</small>` : ""}</span>
        </button>
        <button type="button" class="x" data-cremove="${esc(it.code)}" title="Remover do período" aria-label="Remover ${esc(it.code)} do período">${icone("fechar", 16)}</button>
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
    const celFoco = celTab != null && celTab % 100 >= H_INI && celTab % 100 < H_FIM && celTab < DIAS.length * 100 ? celTab : H_INI;
    let celulas = "";
    for (let h = H_INI; h < H_FIM; h++) {
      celulas += `<div class="hora" style="grid-row:${h - H_INI + 2}">${pad(h)}h</div>`;
      DIAS.forEach((d, di) => {
        const c = di * 100 + h;
        const donos = ocup[c] || [];
        const estado = donos.length > 1 ? `choque entre ${donos.join(" e ")}` : donos.length ? donos[0] : "livre";
        const pressionado = cronoSel ? ` aria-pressed="${donos.includes(cronoSel)}"` : (!donos.length ? ` aria-pressed="${cronoSlot === c}"` : "");
        celulas += `<button type="button" class="cel${donos.length > 1 ? " choque" : ""}${cronoSlot === c ? " slot" : ""}" data-cel="${c}" tabindex="${c === celFoco ? 0 : -1}"
          aria-label="${DIAS_NOME[di]} ${pad(h)}h: ${esc(estado)}"${pressionado} style="grid-row:${h - H_INI + 2};grid-column:${di + 2}"></button>`;
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
          ${M.ref && p.tipo !== "cursado" ? notaHtml(notaRA20()) : ""}
          <div class="add">
            <input class="campo" list="opcoes-add" id="add-code" aria-label="Adicionar disciplina ao período (código ou nome)" placeholder="Adicionar disciplina (código ou nome)…">
            <datalist id="opcoes-add">${opcoes}</datalist>
            <button type="button" class="btn btn-sm" id="add-btn">Adicionar</button>
          </div>
        </aside>
        <div class="crono-grade-wrap">
          ${choques.length ? `<div class="choques">⚠ Choque de horário: ${Object.entries(textoChoques).map(([k, cs]) => `<b>${esc(k)}</b> (${formataHorarios(new Set(cs)).join(", ")})`).join(" · ")}</div>` : `<div class="choques ok">Sem choques de horário.</div>`}
          ${foraFaixa.length ? `<p class="dica">Fora da faixa ${H_INI}h–${H_FIM}h: ${foraFaixa.map((it) => esc(it.code)).join(", ")}</p>` : ""}
          <div class="crono-grade${cronoSel ? " editando" : " buscando"}" role="group" aria-label="Horários da semana: setas movem entre as células, Espaço ou Enter marca" style="--linhas:${linhas}">
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
        <div class="prog-topo"><span>${c.nome}${k === "3" ? botaoInfoLivre() : ""}</span><b>${fmt(T.ok)}${T.prev ? `<i> +${fmt(T.prev)}</i>` : ""} / ${fmt(T.total)} ${c.un}</b></div>
        <div class="barra"><span class="b-ok" style="width:${pOk}%"></span><span class="b-prev" style="width:${pPrev}%"></span><span class="b-plan" style="width:${pPlan}%"></span><span class="b-anal" style="width:${pAnal}%"></span></div>
        <small>${falta ? `faltam ${fmt(falta)} ${c.un}${T.plan ? ` · ${fmt(Math.min(T.plan, falta))} planejados` : ""}${T.anal ? ` · ${fmt(T.anal)} em análise` : ""}` : "completo ✓"}${T.aConfirmar ? ` · ${textoAConfirmar(T)} (possível duplicidade)` : ""}</small>
        ${k === "3" ? htmlInfoLivre(t) : ""}
      </div>`;
    }).join("")
      // PC-02/03: a aprovação pelo pincel é identificada no detalhamento, com o mesmo ícone do cartão.
      + (Object.keys(marcacoes).some(aprovacaoManual)
        ? `<p class="leg-manual">${iconeEstado(ICONE_MARCACAO)} Aprovação por marcação manual (pincel): simulação, não é registro importado.</p>` : "")
      + (() => {
        const n = Object.keys(M.regs).filter((c) => !aprovacaoManual(c) && fonteDe(c) === "declarado").length;
        return n ? `<p class="leg-manual leg-declarada">${iconeEstado(ICONE_DECLARADA)} ${n} ${n === 1 ? "aprovação registrada" : "aprovações registradas"} por você: ${n === 1 ? "conta" : "contam"} para fase e conquistas, não ${n === 1 ? "é" : "são"} registro do SIGA.</p>` : "";
      })();
  }

  /**
   * Escala de dificuldade do guia (Exibir → Dificuldade). Ícone + texto: "🟢 Trivial · 🔵 Só o básico · …". Só ícones:
   * só as bolinhas; o nome fica no `title` e no `.sr`, e o foco ou o toque na escala mostram os nomes (como a barra do
   * Minimalista). Tocar na escala não muda o filtro de dificuldade.
   */
  function escalaDificuldade() {
    if (!M.guia) return "";
    const ns = Object.values(M.guia.niveis);
    if (!window.TEMA || window.TEMA.aparencia() !== "icone") {
      return `<span class="escala-dificuldade" role="list" aria-label="Escala de dificuldade">${ns.map((n) =>
        `<span class="leg-niv" role="listitem" title="${esc(n.texto)}"><span aria-hidden="true">${n.emoji}</span> ${esc(n.nome)}</span>`).join("")}</span>`;
    }
    return `<span class="escala-dificuldade so-icones" role="list" aria-label="Escala de dificuldade" tabindex="0" title="Toque ou foque para ver os nomes">${ns.map((n) =>
      `<span class="leg-niv" role="listitem" title="${esc(n.nome)}"><span aria-hidden="true">${n.emoji}</span><span class="sr"> ${esc(n.nome)}</span></span>`).join("")}<span class="leg-nomes" aria-hidden="true">${ns.map((n) => `<span class="leg-par">${n.emoji} ${esc(n.nome)}</span>`).join(" · ")}</span></span>`;
  }

  /**
   * Faixa de legenda abaixo do progresso, só na Linha do tempo: os grupos (categorias). Sem legenda de estados: o cartão
   * tem o ícone e o nome acessível. No Clássico não há legenda (o Exibir não vale lá).
   */
  function renderLegenda() {
    $("#legenda").innerHTML = Object.keys(CATS).map((k) => `<span class="leg-cat cat-${k}"><i></i>${CATS[k].nome}</span>`).join("");
  }

  function renderAvisoPerfil() {
    const el = $("#aviso-perfil");
    el.hidden = !avisosPerfil.size && !avisoDeclaradas;
    el.textContent = [...avisosPerfil].map(([origem, erro]) =>
      `Não foi possível usar ${origem}. Campo inválido: ${erro}.`).concat(avisoDeclaradas ? [avisoDeclaradas] : []).join(" ");
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

  // ---------- Foco: fase do curso, previsão de formatura e conquistas (regras em js/conquistas.js) ----------
  const CQ = () => window.CONQUISTAS;
  const TOTAIS_CR = () => { const t = {}; ["1", "2", "3", "4"].forEach((k) => { t[k] = M.grade.filter((c) => String(c.category) === k).reduce((a, c) => a + c.credits, 0); }); return t; };
  /** Contexto explícito para js/conquistas.js: fonte de cada aprovação, créditos e horas por fonte, Histórico e plano. */
  function contextoConquistas() {
    const codigos = [...new Set([...Object.keys(M.regs), ...Object.keys(marcacoes)])].filter((c) => !M.consumidas.has(c) && !M.origensDispensa.has(c));
    const creditos = {}, ace = {};
    codigos.forEach((code) => {
      const i = M.info(code), f = fonteDe(code); if (!i || !f) return;
      if (i.category == 5) return;
      const k = String(i.category); creditos[k] = creditos[k] || {}; creditos[k][f] = (creditos[k][f] || 0) + valorCat(i);
    });
    resumoExtensao().confirmadas.forEach((a) => {
      const f = a.origem || "importado";     // a origem da própria ocorrência, não a do código
      ace[f] = (ace[f] || 0) + a.horas;
    });
    const historico = M.periodos.filter((p) => p.tipo === "cursado" && p.semestre != null && !p.declarado)
      .map((p) => ({ nome: p.nome, itens: p.itens.map((it) => ({ code: it.alvo, status: it.status })) }));
    const semDe = (r) => semestreDoRegistro(r);
    const fenixImportado = Object.keys(M.regs).some((code) => {
      const rs = M.regs[code].filter((r) => r.origem !== "declarado");
      return rs.some((a) => a.status === "aprovado" && semDe(a) != null && rs.some((r) => r.status === "reprovado" && semDe(r) != null && semDe(r) < semDe(a)));
    });
    const fenixDeclarado = Object.entries(M.declaradas.notas).some(([code, n]) => n.tipo === "reprovacao-antes" && fonteDe(code) === "declarado");
    const cob = coberturaDoPlano(creditos, ace);
    return { fonte: fonteDe, codigos, nivel: (code) => { const g = guiaDe(code); return g ? g.nivel : null; }, deps: M.deps, grade: M.grade,
      creditos, totais: TOTAIS_CR(), ace, aceTotal: M.grade.filter((c) => c.category == 5).reduce((a, c) => a + c.credits, 0) || 405,
      historico, fenix: { importado: fenixImportado, declarado: fenixDeclarado }, planejamentoCompleto: cob.disciplinasPlanejadas,
      nomeDe: (code) => (M.info(code) || {}).name || code, semestres: historico.filter((p) => p.itens.length).length, cobertura: cob };
  }
  /**
   * O que falta e o que o plano cobre (js/conquistas.js). O cumprido é só o registrado (importado e registrado por
   * você); a barra continua com a simulação (pincel e créditos manuais), mas a previsão e o selo do Notion não.
   */
  function coberturaDoPlano(creditos, ace) {
    const reg = (o) => (o.importado || 0) + (o.declarado || 0);
    const grupos = {};
    Object.keys(CATS).forEach((k) => {
      const total = M.grade.filter((c) => String(c.category) === k).reduce((a, c) => a + c.credits, 0);
      if (total) grupos[k] = { nome: CATS[k].nome, un: CATS[k].un, total, cumprido: k === "5" ? reg(ace) : reg(creditos[k] || {}) };
    });
    const cumprida = (code) => ["importado", "declarado"].includes(fonteDe(code));
    const obrigatorias = M.grade.filter((c) => c.code && c.category === 1 && !cumprida(c.code)).map((c) => ({ code: c.code, nome: c.name }));
    // Itens do plano (js/progresso.js, itensDoPlano): atual e planejados, e a pedida prevista com as origens no atual ou
    // no futuro; o consumido por um pedido deferido não conta de novo. O que ficou num período passado não cobre nada.
    const itens = window.PROGRESSO.itensDoPlano(M, { cumprida });
    const horasAce = getExt().filter((a) => a.status !== "validada" && Number(a.horas) > 0).map((a) => ({ horas: Number(a.horas), semestre: semIdx(a.periodo) }));
    const atual = M.periodos.find((p) => p.tipo === "atual" && p.semestre != null);
    return CQ().coberturaDoPlano({ grupos, obrigatorias, itens, horasAce, semestreAtual: atual ? atual.semestre : semAtual() });
  }
  function calculaMotivacao() {
    const c = contextoConquistas();
    const pctImportado = CQ().percentual(c.creditos, c.totais, 0), pctComDeclaradas = CQ().percentual(c.creditos, c.totais, 1);
    const fase = CQ().faseDoCurso({ pctImportado, pctComDeclaradas, semestres: c.semestres });
    const selos = CQ().avaliaSelos(c);
    const previsao = CQ().previsaoFormatura({ perfil: !!perfil, temAtual: M.periodos.some((p) => p.tipo === "atual"), grupos: c.cobertura.grupos,
      obrigatoriasSemPlano: c.cobertura.semPlano, ultimoSemestre: c.cobertura.primeiro, semDataNecessaria: c.cobertura.semData,
      noPassado: c.cobertura.noPassado, nomeDoSemestre: window.PROGRESSO.nomeDoSemestre });
    return { fase, selos, proximo: CQ().proximoMarco(selos), previsao, semestres: c.semestres, pctImportado, pctComDeclaradas, totalCr: Object.values(c.totais).reduce((a, b) => a + b, 0) };
  }
  const pctTela = (p) => { const v = Math.floor(p * 1000) / 10; return `${Number.isInteger(v) ? v : v.toFixed(1)}%`; };
  const FASES = { calouro: ["🌱", "Calouro"], meio: ["🏋️", "Meio do curso"], veterano: ["🎓", "Veterano"] };
  /** Disciplina que mais destrava entre as candidatas: [código, liberadas]. */
  function maisDestrava(codes) {
    return codes.map((c) => [c, (M.deps[c] || []).filter((d) => !concluido(statusDe(d)))]).sort((a, b) => b[1].length - a[1].length)[0] || null;
  }
  const htmlLibera = (lib) => lib.slice(0, 2).map((d) => `<span class="chip">🔓 ${esc((M.info(d) || {}).name || d)}</span>`).join("") + (lib.length > 2 ? `<span class="chip">+${lib.length - 2}</span>` : "");
  const cursandoAgora = () => Object.keys(M.regs).filter((c) => statusDe(c) === "cursando" && !M.consumidas.has(c));
  /** Fração do curso que o período em curso acrescenta se tudo for aprovado (estimativa). */
  const ganhoDoPeriodo = (m) => cursandoAgora().reduce((a, c) => { const i = M.info(c); return a + (i && i.category != 5 ? valorCat(i) : 0); }, 0) / m.totalCr;
  /** Barra da fase: o registrado e, listrado, o que o período em curso acrescenta (estimativa). */
  function barraDaFase(m) {
    const pct = Math.min(1, m.fase.pct), ganho = Math.max(0, Math.min(1 - pct, ganhoDoPeriodo(m)));
    const texto = `${pctTela(pct)} do curso registrado${ganho ? `; passando em tudo neste período, mais ${pctTela(ganho)} (estimativa)` : ""}`;
    return `<div class="cq-barra" role="img" aria-label="${esc(texto)}" title="${esc(texto)}"><i class="cq-ok" style="width:${pct * 100}%"></i><i class="cq-prev" style="width:${ganho * 100}%"></i></div>`;
  }
  function htmlCartaoFase(m) {
    const z = tom === "zoeira";
    const { fase } = m, [emoji, nome] = FASES[fase.fase];
    const T = totais(), cr = (k) => T[k] ? T[k] : { ok: 0, total: 0, plan: 0, cur: 0 };
    const feitoCr = fase.pct * m.totalCr;
    const marco = (alvo) => Math.max(0, Math.ceil(alvo * m.totalCr - feitoCr - 1e-9));
    const partes = [];
    if (fase.fase === "calouro") {
      const pend = M.grade.filter((c) => c.code && c.category === 1 && !concluido(statusDe(c.code)));
      const menor = Math.min(...pend.map((c) => c.semester));
      const base = maisDestrava(pend.filter((c) => c.semester === menor).map((c) => c.code));
      if (base && base[1].length) partes.push(`<h4>${z ? "Base que destrava tudo" : "Base do curso"}</h4><p>Passando em <b>${esc(M.info(base[0]).name)}</b>, você libera ${base[1].length} ${base[1].length === 1 ? "matéria" : "matérias"} nos próximos períodos.</p><p class="chips">${htmlLibera(base[1])}</p>`);
      const alvo = fase.pct < 0.1 ? 0.1 : 0.25;
      partes.push(`<h4>Primeiro marco 🏁</h4><p>${marco(alvo) === 1 ? "Falta" : "Faltam"} ${marco(alvo)} cr para ${alvo * 100}% do curso.</p>`);
      const temPlano = M.periodos.some((p) => p.tipo === "planejado" && p.itens.length);
      const temOpt = M.periodos.some((p) => p.tipo === "planejado" && p.itens.some((it) => it.category == 2 || it.category == 4));
      const doSiga = /^siga/i.test((perfil.fonte && perfil.fonte.geradoPor) || "");
      partes.push(`<h4>Primeiros passos</h4><ul class="checklist">${[[doSiga, "Importar o histórico"], [temPlano, "Planejar o próximo período"], [temOpt, "Dar uma olhada nas optativas"]]
        .map(([v, t]) => `<li>${v ? "☑" : "☐"} ${t}<span class="sr">${v ? ": feito" : ": a fazer"}</span></li>`).join("")}</ul>`);
    } else if (fase.fase === "meio") {
      const cursando = cursandoAgora(), ganho = ganhoDoPeriodo(m);
      if (ganho > 0) partes.push(`<h4>${z ? "Bora, academia 💪" : "Andamento do período"}</h4><p>Passando em tudo, você avança +${pctTela(ganho)}: ${pctTela(fase.pct)} → ${pctTela(Math.min(1, fase.pct + ganho))} no fim do período (estimativa).</p>`);
      const d = maisDestrava(cursando);
      if (d && d[1].length) partes.push(`<h4>O que você destrava</h4><p>Passando em <b>${esc(M.info(d[0]).name)}</b>:</p><p class="chips">${htmlLibera(d[1])}</p>`);
      const alvo = fase.pct < 0.5 ? 0.5 : 0.75;
      partes.push(`<h4>${alvo === 0.5 ? "Metade do caminho ⛰️" : "Rumo à reta final 🏁"}</h4><p>${z ? "🐢 Devagar e sempre. " : ""}${marco(alvo) === 1 ? "Falta" : "Faltam"} ${marco(alvo)} cr para ${alvo * 100}%. Optativas: ${fmt(cr(2).ok)} de ${fmt(cr(2).total)} cr${z ? "; escolha pelo que te interessa" : ""}.</p>`);
    } else {
      const falta = Math.max(0, Math.ceil(m.totalCr - feitoCr - 1e-9));
      partes.push(`<h4>${z ? "Reta final 🏁" : "O que falta"}</h4><p>${falta === 1 ? "Falta" : "Faltam"} ${falta} cr${falta ? `, em ${Math.ceil(falta / 4) === 1 ? "uma matéria" : `umas ${Math.ceil(falta / 4)} matérias`} (estimativa)` : ""}.</p>`);
      const ok = (code) => fonteDe(code) === "importado" || fonteDe(code) === "declarado";
      const t5 = cr("5");
      partes.push(`<h4>Checklist da formatura</h4><ul class="checklist">${[[ok(CQ().PG), "Projeto de Graduação"], [ok(CQ().ESTAGIO), "Estágio obrigatório"],
        [t5.ok >= t5.total, `Extensão/ACE: ${fmt(t5.ok)} de ${fmt(t5.total)} h`], [cr(4).ok >= cr(4).total, `Humanas: ${fmt(cr(4).ok)} de ${fmt(cr(4).total)} cr`],
        [cr(2).ok >= cr(2).total, `Optativas: ${fmt(cr(2).ok)} de ${fmt(cr(2).total)} cr`]]
        .map(([v, t]) => `<li>${v ? "☑" : "☐"} ${t}<span class="sr">${v ? ": cumprido" : ": falta"}</span></li>`).join("")}</ul>`);
    }
    // Período do plano com duas ou mais 🟠/🔴: dá para planejar (frase da tabela de conquistas).
    M.periodos.filter((p) => p.tipo === "planejado" || p.tipo === "atual").forEach((p) => {
      const n = p.itens.filter((it) => it.status !== "reprovado" && ((guiaDe(it.alvo) || {}).nivel || 0) >= 4).length;
      if (n >= 2) partes.push(`<p class="frase-dificeis">${z ? `🧘 Calma, Calabreso. Período ${esc(p.nome)} com ${n} matérias difíceis: dá para planejar.`
        : `O período ${esc(p.nome)} tem ${n} matérias difíceis. Vale planejar com folga.`}</p>`);
    });
    partes.push(`<h4>Previsão de formatura</h4><p class="previsao">${esc(m.previsao.texto)}${m.previsao.estado === "previsao" ? " 🎓" : ""}</p>`);
    return `<article class="cartao-fase fase-${fase.fase}" aria-labelledby="fase-titulo">
      <h3 id="fase-titulo">${emoji} ${nome}${fase.declarado ? ` <span class="marca-declarado">· declarado</span><span class="sr"> (inclui aprovações registradas por você)</span>` : ""}</h3>
      <p class="fase-pct">${pctTela(fase.pct)} do curso registrado${fase.declarado || m.pctComDeclaradas !== m.pctImportado ? ", com aprovações registradas por você" : ""}.</p>
      ${barraDaFase(m)}
      ${partes.join("")}</article>`;
  }
  let avisoSelos = "";   // conquistas novas ainda não anunciadas
  let avisoAba = "";     // a aba Conquistas sumiu com ela selecionada
  let avisoTempo = null;
  /** Os avisos saem depois do desenho, juntos; se uma ação já vai anunciar algo (ex.: ligar o Foco), entram nela. */
  function agendaAvisos() {
    if (avisoTempo) return;
    avisoTempo = setTimeout(() => {
      avisoTempo = null;
      const t = [avisoAba, avisoSelos].filter(Boolean).join(" ");
      avisoAba = avisoSelos = "";
      if (t) anuncia(t);
    }, 0);
  }
  /** Identidade local opaca do perfil: chave dos avisos de conquistas (nunca nome, matrícula ou código do aluno). */
  function idDoPerfil() {
    let id = load("perfilId", null, (v) => typeof v === "string" && /^[a-z0-9]{8,}$/.test(v));
    if (!id && perfil) { id = Array.from({ length: 16 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join(""); save("perfilId", id); }
    return id;
  }
  const selosNovos = new Set();   // obtidos e já anunciados, ainda não vistos na aba (aparecem como .novo)
  let selosNaTela = false;
  /**
   * Anúncio de conquista nova, separado do desenho (T10): só no Planejador, com a aba disponível (Foco ligado ou
   * "também fora do Foco"), mesmo com a aba fechada. A deduplicação por perfil (perfilId e selosAvisados) continua.
   */
  function anunciaSelosNovos() {
    if (!abaConquistas() || !perfil) return;
    const id = idDoPerfil(); if (!id) return;
    const m = calculaMotivacao();
    const salvo = load("selosAvisados", null, (v) => objeto(v) && typeof v.id === "string" && Array.isArray(v.vistos));
    const vistos = new Set(salvo && salvo.id === id ? salvo.vistos : []);
    const novos = m.selos.filter((x) => x.estado === "obtido" && !vistos.has(x.id));
    if (!novos.length) return;
    save("selosAvisados", { id, vistos: [...vistos, ...novos.map((x) => x.id)] });
    novos.forEach((x) => selosNovos.add(x.id));
    const lista = novos.map((x) => `${x.emoji} ${x.titulo}`).join(", ");
    avisoSelos = novos.length === 1 ? `${tom === "zoeira" ? "Receba! " : ""}Nova conquista: ${lista}.` : `${novos.length} novas conquistas: ${lista}.`;
    agendaAvisos();
  }
  /** Conquistas em cartões grandes por grupo: emoji, nome, regra, progresso e "· declarado" ou "quase lá" quando couber. */
  function htmlEstante(m) {
    const obtidos = m.selos.filter((x) => x.estado === "obtido");
    selosNaTela = true;
    const prox = m.proximo;
    const pc = (x) => (x.estado === "obtido" ? 100 : Math.round(Math.max(0, Math.min(1, Number(x.progresso) || 0)) * 100));
    const item = (x) => `<li class="selo s-${x.estado}${selosNovos.has(x.id) ? " novo" : ""}">
      <span class="selo-emoji" aria-hidden="true">${x.emoji}</span>
      <span class="selo-texto"><b>${esc(x.titulo)}</b>${x.estado === "obtido" && x.declarado ? ` <span class="marca-declarado">· declarado</span>` : ""}
        <small>${x.estado === "obtido" ? esc(x.regra) + (x.nota ? ` · ${esc(x.nota)}` : "")
          : x.estado === "quase" ? `quase lá (${esc(x.origem)}) · ${esc(x.falta)}`
          : esc(x.regra) + (x.falta && x.falta !== `falta ${x.regra}` ? " · " + esc(x.falta) : "")}</small></span>
      <span class="selo-barra" aria-hidden="true"><i style="width:${pc(x)}%"></i></span>
      <span class="sr">${x.estado === "obtido" ? "obtida" : `${x.estado === "quase" ? "quase lá" : "ainda não"}, ${pc(x)}%`}</span></li>`;
    const grupos = Object.entries(CQ().GRUPOS).map(([g, t]) => {
      const sel = m.selos.filter((x) => x.grupo === g), n = sel.filter((x) => x.estado === "obtido").length;
      return `<section class="cq-grupo" aria-labelledby="cq-g-${g}"><h3 id="cq-g-${g}">${t} · ${n} de ${sel.length}</h3><ul class="estante-lista">${sel.map(item).join("")}</ul></section>`;
    }).join("");
    return `<section class="estante" aria-labelledby="estante-titulo">
      <h2 id="estante-titulo">Conquistas</h2>
      <p class="estante-resumo">${obtidos.length} ${obtidos.length === 1 ? "conquista" : "conquistas"}${obtidos.length ? ` <span aria-hidden="true">${obtidos.map((x) => x.emoji).join(" ")}</span>` : ""}${prox ? ` · próxima: ${prox.emoji} ${esc(prox.titulo)} (${esc(prox.falta)})` : ""}</p>
      ${grupos}</section>`;
  }
  /**
   * Página Conquistas (#painel): Situação à esquerda (em cima no celular) e as conquistas à direita. Sem perfil, um ramo
   * próprio com orientação. Tom zoeira: "Bora, [nome] 💪"; discreto: "Situação · [nome]". O nome passa por esc().
   */
  function renderConquistas() {
    const z = tom === "zoeira", nome = nomeDoPerfil(perfil);
    if (!perfil) {
      return `<div class="conquistas sem-dados"><section class="cq-situacao" aria-labelledby="cq-titulo">
        <h2 id="cq-titulo" class="cq-cabeca">${z ? "Bora 💪" : "Situação"}</h2>
        <p>Crie ou importe um perfil no Planejador para ver a sua fase do curso, o progresso, as conquistas e a previsão de formatura.</p>
        <p class="dica">Use <b>Criar perfil</b> ou <b>Importar do SIGA</b>, na barra do topo. Os dados ficam só neste navegador.</p></section></div>`;
    }
    const m = calculaMotivacao();
    const cab = z ? `Bora${nome ? ", " + esc(nome) : ""} 💪` : `Situação${nome ? " · " + esc(nome) : ""}`;
    return `<div class="conquistas">
      <section class="cq-situacao" aria-labelledby="cq-titulo"><h2 id="cq-titulo" class="cq-cabeca">${cab}</h2>${htmlCartaoFase(m)}</section>
      ${htmlEstante(m)}</div>`;
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
  /** Foco: aria-pressed; sem perfil, aria-disabled com o motivo em texto. No Clássico, oculto (a preferência fica guardada). */
  function renderBotaoFoco() {
    const b = $("#btn-foco");
    const motivo = !perfil ? "Importe ou crie um perfil para usar o Foco." : "";
    b.setAttribute("aria-pressed", String(focoAtivo()));
    if (motivo) { b.setAttribute("aria-disabled", "true"); b.setAttribute("aria-describedby", "btn-foco-motivo"); }
    else { b.removeAttribute("aria-disabled"); b.removeAttribute("aria-describedby"); }
    b.title = motivo ? `Foco: ${motivo}` : focoAtivo() ? "Foco ligado: clique para desligar" : "Foco: esconde o que já foi concluído";
    $("#btn-foco-motivo").textContent = motivo;
  }
  function alternaFoco() {
    const b = $("#btn-foco");
    if (b.getAttribute("aria-disabled") === "true") return anuncia($("#btn-foco-motivo").textContent);
    foco = !foco; save("foco", foco);
    let msg = foco ? "Foco ligado: o que já foi concluído fica escondido." : "Foco desligado.";
    if (foco && !VISTAS_FOCO.includes(vistaAtual)) {
      msg = `Foco ligado. A aba ${NOMES_VISTA[vistaAtual] || vistaAtual} fica escondida; você está na Linha do tempo.`;
      vistaAtual = "timeline"; save("vista", vistaAtual); fechaDetalhes();
    }
    render();
    $("#btn-foco").focus();
    anuncia([msg, avisoAba, avisoSelos].filter(Boolean).join(" ")); avisoAba = avisoSelos = "";
  }
  function renderAtalhos() {
    renderBotaoFoco();
    // Clássico (só pintar): no topo, só o seletor de modo e o tema. Os dois aparecem mesmo com o seletor oculto ou o
    // atalho do tema desfixado em Configurações, e essas preferências continuam salvas para o Planejador.
    $("#seletor-modo").hidden = ocultarSeletor && !modoClassico;
    $("#btn-config").hidden = modoClassico;
    $("#btn-foco").hidden = modoClassico;
    const vis = modoClassico ? ["tema"] : ATALHOS.filter((id) => atalhos.includes(id) || (!perfil && (id === "perfil" || id === "importar")));
    const box = $("#atalhos");
    const chave = `${modoClassico ? "classico" : "planejador"}|${vis.join(",")}|${!!perfil}|${temaAtual()}`;
    if (box.dataset.chave === chave) return;
    const foco = document.activeElement && box.contains(document.activeElement) ? document.activeElement.id : null;
    box.dataset.chave = chave;
    box.innerHTML = vis.map((id) => {
      const a = infoAtalho(id), primario = !modoClassico && !perfil && !atalhos.includes(id);
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
      <div class="dlg-cabeca"><h1 id="dlg-config-titulo" class="dlg-titulo" tabindex="-1">${icone("configuracoes", 20)} Configurações</h1>
        <button type="button" class="dlg-x fecha-config" aria-label="Fechar Configurações" title="Fechar (Esc)">${icone("fechar")}</button></div>
      <p class="dlg-texto">As escolhas valem na hora e ficam salvas neste navegador. Fixe um item para ele aparecer também na barra do topo; ele continua aqui.</p>
      <section class="cfg-sec" aria-labelledby="cfg-h-perfil"><h2 id="cfg-h-perfil">Perfil e dados</h2>
        ${linhaAtalho("perfil")}${linhaAtalho("importar")}${linhaAtalho("privacidade")}
        <div class="cfg-linha">${botaoRegistrar("btn btn-sm cfg-abrir", "cfg-registrar")}
          <span class="dica">Grava as marcações aprovadas do pincel como aprovações registradas por você.</span></div>
        ${htmlListaDeclaradas()}
        <div class="cfg-linha"><button type="button" class="btn btn-sm btn-perigo-ghost" id="btn-limpar">${icone("limpar", 16)} Limpar dados salvos</button>
          <span class="dica">Apaga marcações, planos e o perfil salvo neste navegador.</span></div>
      </section>
      <section class="cfg-sec" aria-labelledby="cfg-h-ap"><h2 id="cfg-h-ap">Aparência</h2>
        <fieldset class="opcoes"><legend>Aparência</legend>
          ${radio("aparencia", "icone-texto", "Ícone + texto", ap === "icone-texto")}${radio("aparencia", "icone", "Só ícones", ap === "icone")}${radio("aparencia", "minimalista", "Minimalista", ap === "minimalista")}
          <p class="dica">Vale para a barra do topo, o seletor de modo, as abas e os controles. Só ícones mantém o nome ao passar o mouse e no leitor de tela.</p>
        </fieldset>
        <fieldset class="opcoes"><legend>Tom das mensagens do Foco</legend>
          ${radio("tom", "zoeira", "Zoeira", tom === "zoeira")}${radio("tom", "discreto", "Discreto", tom === "discreto")}
        </fieldset>
        <fieldset class="opcoes"><legend>Conquistas</legend>
          ${radio("conquistas", "foco", "Mostrar a aba só no Foco", !conquistasFora)}${radio("conquistas", "sempre", "Mostrar a aba também fora do Foco", conquistasFora)}
          <p class="dica">A aba fica no Planejador, depois de Cronograma.</p>
        </fieldset>
        <fieldset class="opcoes"><legend>Tema</legend>
          ${radio("tema", "sistema", "Igual ao sistema", te === "sistema")}${radio("tema", "claro", "Claro", te === "claro")}${radio("tema", "escuro", "Escuro", te === "escuro")}
          ${linhaAtalho("tema", "Botão sol/lua na barra")}
        </fieldset>
        <fieldset class="opcoes"><legend>Modo</legend>
          ${radio("modo", "classico", "Clássico: só a grade e a paleta", modoClassico)}${radio("modo", "completo", "Planejador: com as abas", !modoClassico)}
          <label class="opcao"><input type="checkbox" id="cfg-seletor"${ocultarSeletor ? "" : " checked"}> Mostrar o seletor de modo no topo</label>
        </fieldset>
      </section>
      <section class="cfg-sec" aria-labelledby="cfg-h-grade"><h2 id="cfg-h-grade">Grade</h2>
        <fieldset class="opcoes"><legend>Exibir nos cartões</legend>
          ${EXIBIR.map(([k, n]) =>
            `<label class="opcao"><input type="checkbox" data-exibir="${k}"${exibir[k] ? " checked" : ""}> ${n}</label>`).join("")}
        </fieldset>
        <fieldset class="opcoes"><legend>Trilha dos requisitos</legend>
          ${radio("destaque", "desligado", "Desligado", exibir.destaque === "desligado")}${radio("destaque", "segurar", "Ao segurar: clique e segure (ou toque e segure) numa disciplina; soltar apaga", exibir.destaque === "segurar")}${radio("destaque", "foco", "Ao passar o mouse: ao passar o mouse ou focar, os requisitos e o que ela libera acendem", exibir.destaque === "foco")}
          <p class="dica">Vale na Grade, no Clássico e no Planejador.</p>
        </fieldset>
        <label class="opcao"><input type="checkbox" id="cfg-cadeado"${cadeado ? " checked" : ""}> Proteger as disciplinas cursadas (cadeado da paleta)</label>
        ${linhaAtalho("tags")}
      </section>
      <section class="cfg-sec" aria-labelledby="cfg-h-ref"><h2 id="cfg-h-ref">Referências</h2>
        ${linhaAtalho("referencias")}
      </section>
      ${htmlSobre()}
      <div class="dlg-acoes"><button type="button" class="btn btn-escuro fecha-config">Fechar</button></div>`;
  }
  let selDecl = new Set();   // seleção da lista de Configurações (só nesta visita)
  /** Configurações → Perfil e dados: as aprovações registradas por você, com remoção em lote. */
  function htmlListaDeclaradas() {
    const decl = getDecl();
    if (!decl.length) return "";
    selDecl = new Set([...selDecl].filter((c) => decl.some((d) => d.code === c)));
    const conf = decl.filter((d) => M.declaradas.confirmadas[d.code]).map((d) => d.code);
    const bot = (id, txt, n, motivo) => `<button type="button" class="btn btn-sm btn-perigo-ghost" id="${id}"${n ? "" : ` aria-disabled="true" aria-describedby="${id}-motivo"`}>${txt} (${n})</button>${n ? "" : `<span id="${id}-motivo" class="sr">${motivo}</span>`}`;
    return `<fieldset class="opcoes cfg-declaradas"><legend>Aprovações registradas por você (${decl.length})</legend>
      <p class="dica">Não são registro do SIGA. As confirmadas pelo SIGA ficam guardadas, fora da conta.</p>
      <ul class="lista">${decl.map((d) => `<li><label class="opcao"><input type="checkbox" data-decl-sel="${esc(d.code)}"${selDecl.has(d.code) ? " checked" : ""}>
        ${esc(d.code)} · ${esc((M.info(d.code) || {}).name || d.code)} · ${d.semestre ? esc(d.semestre) : "sem semestre"}${M.declaradas.confirmadas[d.code] ? " · confirmada pelo SIGA" : M.declaradas.conflitos[d.code] ? " · em conflito com o SIGA" : ""}</label></li>`).join("")}</ul>
      <div class="cfg-linha">${bot("decl-remover-sel", "Remover selecionadas", selDecl.size, "Marque pelo menos uma.")}
        ${bot("decl-remover-conf", "Remover as já confirmadas pelo SIGA", conf.length, "Nenhuma confirmada pelo SIGA.")}</div></fieldset>`;
  }
  /** Seção "Sobre" de Configurações (texto aprovado pela manutenção em 2026-11-26; D-09). */
  function htmlSobre() {
    const link = (url, txt) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${txt} ${icone("externo", 13)}<span class="sr"> (abre em outra aba)</span></a>`;
    return `<section class="cfg-sec cfg-sobre" id="cfg-sobre" aria-labelledby="cfg-h-sobre"><h2 id="cfg-h-sobre">Sobre</h2>
        <p>A Grade ECI é feita por alunos de Engenharia de Computação e Informação da UFRJ, para alunos do curso. Sugestões e correções são bem-vindas pelas issues.</p>
        <p><b>Seus dados ficam neste navegador.</b> Os PDFs do SIGA e o perfil são lidos no seu dispositivo. Nada é enviado a um servidor. O arquivo que você exporta é uma cópia sua; guarde-o em local privado.</p>
        <p><b>Dois modos.</b></p>
        <ul>
          <li><b>Clássico:</b> a grade do curso numa tela, para pintar o que você já fez.</li>
          <li><b>Planejador:</b> linha do tempo, optativas, cronograma, pedidos de equivalência e extensão.</li>
        </ul>
        <p><b>A Grade orienta, não confirma.</b> Ela não é um serviço da UFRJ nem da coordenação. Créditos, requisitos e prazos são estimativas. A confirmação fica com o SIGA, o BOA e a coordenação do curso.</p>
        <p><b>Limites conhecidos.</b></p>
        <ul>
          <li>Os horários de referência são mantidos por alunos e mudam a cada semestre. Confira no SIGA.</li>
          <li>Para quem reingressou, a data que vale para o prazo de 5 anos ainda está em consulta.</li>
          <li>O limite de 25% de créditos por equivalência e os prazos de pedido não são avisados.</li>
          <li>Marcações feitas com o pincel são simulações suas, não registros.</li>
        </ul>
        <p><b>Links.</b></p>
        <ul>
          <li>Código e documentação: ${link("https://github.com/JoaoAndrade01/grade", "repositório no GitHub")}</li>
          <li>Achou um erro? ${link("https://github.com/JoaoAndrade01/grade/issues/new/choose", "Crie uma nova issue")}. Use só dados fictícios: a issue é pública.</li>
        </ul>
      </section>`;
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
      else if (a.dataset.declSel) sel = `[data-decl-sel="${a.dataset.declSel}"]`;
      else if (a.name) sel = `input[name="${a.name}"][value="${a.value}"]`;
    }
    renderConfig();
    const el = sel && d.querySelector(sel); if (el) el.focus();
  }
  function defineModo(classico) {
    consultado = null;
    modoClassico = classico; save("modoClassico", modoClassico);
    if (!modoClassico) pincel = null;   // no Planejador o clique volta a abrir detalhes
    seletorECI = false;
    fechaDetalhes(); render();
  }
  function limpaDados() {
    const temImportado = !perfilArquivo && perfilLocalAntigo();
    const nd = declaradasNoNavegador();
    if (!confirm("Apagar tudo o que foi salvo neste navegador (marcações manuais, edições de planejamento" + (temImportado ? ", perfil importado" : "")
      + (nd ? `, ${textoDeclaradas(nd)}` : "") + ")?" + (nd ? " Use Exportar perfil.js antes, se quiser guardar uma cópia." : ""))) return;
    marcacoes = {}; creditosManuais = {}; plano = { periodos: {}, novos: [] }; proposta = null; cronoSlot = null;
    ["manual", "marcacoes", "creditos", "plano", "perfilImportado", "perfilId", "selosAvisados"].forEach((k) => save(k, null));
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
    box.innerHTML = `<header><span class="cat-pill">${icone("referencias", 14)} Referências</span><button type="button" class="fechar" aria-label="Fechar">${icone("fechar")}</button></header>
      <h3>De onde vêm os dados</h3>
      <ul class="lista refs">
        <li><span><b>Horários de referência e guia dos alunos</b><br><small>${esc(ref)}${M.ref && M.ref.consultado ? `, consultado em ${esc(M.ref.consultado)}` : ""}.
          Página mantida por alunos de ECI; os horários mudam a cada semestre. Confira sempre no SIGA.</small></span></li>
        <li><span><b>Currículo e catálogo de optativas</b><br><small>Copiados do currículo oficial no SIGA para js/database.js e js/optativas.js.</small></span></li>
      </ul>
      <h4>Links</h4>
      <ul class="lista refs">${LINKS.map((l) => `<li><a href="${l.url}" target="_blank" rel="noopener noreferrer">${esc(l.nome)} ${icone("externo", 13)}<span class="sr"> (abre em outra aba)</span></a><small>${esc(l.txt)}</small></li>`).join("")}</ul>
      <p class="dica">Os links abrem em outra aba só quando você clica. Abrir esta lista não carrega nada de fora deste site.</p>`;
    mostraPainel();
    box.dataset.alvo = "referencias";
  }

  let abaSumiu = false;
  function render() {
    // A aba Conquistas pode sumir com ela selecionada (T11): o foco fica no controle que causou a mudança; só vai para a
    // aba Grade se estava na aba ou no painel removido.
    const a = document.activeElement, painel = $("#painel");
    const naAba = !!a && (a.id === "aba-conquistas" || (vistaAtual === "conquistas" && painel.contains(a)));
    abaSumiu = false;
    const r = preservaFoco(desenha, () => focaTitulo($("#painel")));
    if (abaSumiu) { if (naAba) $("#aba-grade").focus(); agendaAvisos(); }
    return r;
  }
  function desenha() {
    if (pressao) { clearTimeout(pressao.timer); pressao = null; }   // troca de tela cancela a pressão longa
    // Modo clássico: força a aba Grade e mantém um pincel sempre ativo
    document.body.classList.toggle("classico", modoClassico);
    $("#modo-classico").checked = modoClassico; $("#modo-planejador").checked = !modoClassico;
    if (modoClassico) { if (pincel === null) pincel = (tags[0] || {}).id || ""; }
    const emFoco = focoAtivo();
    document.body.classList.toggle("em-foco", emFoco);
    if (emFoco && !VISTAS_FOCO.includes(vistaAtual)) vistaAtual = "timeline";
    const comConquistas = abaConquistas();
    if (vistaAtual === "conquistas" && !comConquistas) {   // vista salva normalizada: a aba ficou indisponível
      vistaAtual = "grade"; save("vista", vistaAtual); abaSumiu = true;
      avisoAba = "A aba Conquistas fica escondida; você está na Grade.";
    }
    const vista = modoClassico ? "grade" : vistaAtual;
    renderCabecalho();
    document.querySelectorAll(".abas [data-vista]").forEach((b) => {
      b.hidden = (emFoco && !VISTAS_FOCO.includes(b.dataset.vista)) || (b.dataset.vista === "conquistas" && !comConquistas);
      const on = b.dataset.vista === vista;
      b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
    });
    // O painel é o tabpanel da aba ativa (no modo clássico as abas não aparecem e o painel é só a Grade).
    if (modoClassico) { painelRef.removeAttribute("role"); painelRef.removeAttribute("aria-labelledby"); }
    else { painelRef.setAttribute("role", "tabpanel"); painelRef.setAttribute("aria-labelledby", `aba-${vista}`); }
    document.body.classList.toggle("pintando", pincel !== null);
    // Barra e Detalhes do progresso só na Grade e na Linha do tempo do Planejador; sem perfil ou no Clássico, ocultos.
    const comProgresso = !!perfil && !modoClassico && (vista === "grade" || vista === "timeline");
    $("#barra-geral").hidden = !comProgresso;
    if (comProgresso) renderBarraGeral();
    const mini = minimalista();
    document.body.classList.toggle("minimalista", mini);
    // O Minimalista não tem o detalhamento do progresso (nem a soma da lista do BOA, PC-04): volta ao sair dele.
    const detalhado = comProgresso && progressoAberto && !mini;
    $("#progresso").hidden = !detalhado;
    const mostraLegenda = vista === "timeline";   // a escala de dificuldade fica junto a Exibir → Dificuldade (Planejador)
    $("#legenda").hidden = !mostraLegenda;
    if (detalhado) renderProgresso();
    if (vista !== "conquistas" && selosNaTela) { selosNovos.clear(); selosNaTela = false; }   // .novo só até a aba ser vista
    if (mostraLegenda) renderLegenda();
    $("#ferramentas").hidden = vista !== "grade" || modoClassico;
    if (vista === "grade" && !modoClassico) $("#ferramentas").innerHTML = mini ? `
      <button type="button" class="btn btn-icone ferr-mais" id="ferr-mais" aria-expanded="${ferrAberto}" aria-controls="ferr-painel" title="Ferramentas">${icone("reticencias")}<span class="sr">Ferramentas</span></button>
      <div class="ferr-painel" id="ferr-painel" role="group" aria-label="Ferramentas"${ferrAberto ? "" : " hidden"}>${renderFerramentas()}</div>` : renderFerramentas();
    $("#paleta").hidden = vista !== "grade";
    if (vista === "grade") $("#paleta").innerHTML = renderPaleta();
    const imp = $("#aviso-importado");
    renderAvisoPerfil();
    imp.hidden = !perfilImportado || modoClassico;   // o Clássico é só para pintar: perfil e arquivos ficam no Planejador
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
      eci: () => window.ECI.renderSecao(contextoECI()), conquistas: renderConquistas }[vista] || renderGrade;
    painel.innerHTML = fn();
    if (vista === "eci") window.ECI.montado(painel, contextoECI());
    if (scroll) { painel.scrollLeft = scroll.x; window.scrollTo(0, scroll.y); }
    else {
      painel.scrollLeft = 0;
      if (vista === "timeline") {
        const atual = painel.querySelector(".col-atual");
        if (atual) painel.scrollLeft = Math.max(0, atual.offsetLeft - painel.clientWidth / 2);
      }
    }
    if (foco != null) { const b = $("#busca-opt"); b.focus(); b.setSelectionRange(foco, foco); }
    anunciaSelosNovos();
  }

  // ---------- Detalhes ----------
  const painelRef = document.querySelector("#painel");
  function linhaCurso(code, requisito = false) {
    const i = M.info(code), s = statusDe(code);
    const origem = requisito && aprovacaoManual(code) ? " por marcação manual (pincel)" : "";
    return `<li><button type="button" class="link" data-ir="${esc(code)}"><i class="dot s-${s}"></i>${esc(code)} ${esc(i ? i.name : "")}</button><small>${ROTULO[s]}${origem}</small></li>`;
  }

  function abreDetalhes(alvo) {
    const box = $("#detalhes");
    let html = "";
    if (alvo.code) {
      const code = alvo.code, i = M.info(code);
      if (!i) return;
      const s = statusDe(code);
      const hist = (M.regs[code] || []).map((r) =>
        `<li><b>${esc(M.periodos[r.pi]?.declarado ? (r.semestreDeclarado || "Semestre não informado") : M.periodos[r.pi]?.nome ?? "Período não confirmado")}</b> — ${ROTULO[r.status]}${r.nota != null ? ` · nota ${esc(r.nota)}` : ""}${r.via ? `<br><small>${esc(r.via)}</small>` : ""}</li>`).join("");
      const ds = M.deps[code] || [];
      const fonte = i.fonte === "grade" ? `${i.semester}º período recomendado` : i.fonte === "catalogo" ? (GRUPOS_OPT[i.category] || "optativa") : "fora do currículo";
      const futuros = periodosFuturos();
      // Cartão da Linha do tempo: primeiro o semestre, a situação e a origem dessa ocorrência; depois, o resumo.
      const regs = M.regs[code] || [];
      // O índice do registro é só uma pista: o modelo pode ter sido remontado (remover, mover, planejar) com o painel
      // aberto. Vale o registro que corresponde ao cartão (semestre, situação e, se transferida, bloco com aprovadaEm);
      // se a ocorrência deixou de existir, a linha some.
      const nomeDe = (r) => M.periodos[r.pi]?.nome;
      const casa = (r) => !!r && (alvo.status == null || r.status === alvo.status) && (alvo.declarada ? r.origem === "declarado" && M.periodos[r.pi]?.declarado
        : alvo.transferida ? r.aprovadaEm === alvo.periodo && anoDoBloco(nomeDe(r)) != null : nomeDe(r) === alvo.periodo);
      const oc = !alvo.periodo ? null : casa(regs[alvo.reg]) ? regs[alvo.reg] : regs.find(casa) || null;
      const blocoOc = oc && alvo.transferida ? nomeDe(oc) : null;
      html = `
        <header><span class="cat-pill cat-${i.category}">${CATS[i.category] ? CATS[i.category].nome : ""}</span>
          <button type="button" class="fechar" aria-label="Fechar">${icone("fechar")}</button></header>
        <h3>${esc(i.name)}</h3>
        ${oc ? `<p class="det-ocorrencia s-${oc.status}"><b>${esc(alvo.declarada && !oc.semestreDeclarado ? "Sem semestre" : alvo.periodo)}</b>: ${ROTULO[oc.status]} · ${oc.origem === "declarado" ? ORIGEM_DECL : "perfil"}${oc.nota != null ? ` · nota ${esc(oc.nota)}` : ""}${blocoOc ? ` (transferida, ${esc(blocoOc)})` : ""}</p>` : ""}
        <p class="det-meta">${esc(metaDe(code, valorCat(i), i.category))}${i.workload ? ` · ${i.workload} h` : ""} · ${esc(fonte)}</p>
        <p class="det-status s-${s}"><i class="dot s-${s}"></i>${oc ? "Na disciplina: " : ""}${ROTULO[s]}${aprovacaoManual(code) ? " por marcação manual (pincel), não é registro importado"
          : Object.prototype.hasOwnProperty.call(marcacoes, code) ? " (marcada com o pincel)" : s === "aprovado" && fonteDe(code) === "declarado" ? ` · ${ORIGEM_DECL}, não é registro do SIGA` : ""}</p>
        ${htmlDeclarada(code)}
        ${(() => {
          const por = requisitosPorMarcacao(code);
          return por.length ? `<p class="aviso-manual alerta" role="note">Requisito satisfeito por marcação manual: ${por.map(esc).join(", ")}. É uma simulação sua, sem data no histórico importado.</p>` : "";
        })()}
        ${(() => {
          const por = requisitosPorDeclarada(code);
          return por.length ? `<p class="aviso-manual" role="note">Requisito satisfeito por aprovação registrada por você: ${por.map(esc).join(", ")}. Não é registro do SIGA.</p>` : "";
        })()}
        ${avisoReuso(code)}
        ${(() => {
          const lst = periodosFuturos().filter((p) => p.itens.some((it) => it.alvo === code && it.status !== "reprovado"))
            .map((p) => [p.nome, avisoOferta(code, p.nome)]).filter((x) => x[1]);
          return lst.length ? `<ul class="lista avisos-det">${lst.map(([n, a]) => `<li class="aviso-oferta">${esc(n)}: ${esc(a.texto)}</li>`).join("")}</ul>${notaHtml(notaRA20())}` : "";
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
        ${i.req.length ? `<h4>Pré-requisitos</h4><ul class="lista">${i.req.map((r) => linhaCurso(r, true)).join("")}</ul>` : ""}
        ${i.coreq.length ? `<h4>Co-requisitos</h4><ul class="lista">${i.coreq.map((r) => linhaCurso(r, true)).join("")}</ul>` : ""}
        ${ds.length ? `<h4>Libera</h4><ul class="lista">${ds.map((r) => linhaCurso(r)).join("")}</ul>` : ""}
        ${!concluido(s) && futuros.length ? `<h4>Planejar</h4><div class="chips">${futuros.map((p) => {
          const dentro = p.itens.some((it) => it.alvo === code);
          return `<button type="button" class="mini-btn${dentro ? " on" : ""}" data-plan="${esc(p.nome)}" data-pcode="${esc(code)}">${icone(dentro ? "check" : "mais", 14)} ${esc(p.nome)}</button>`;
        }).join("")}</div>` : ""}
        <h4>Tag</h4>${protegida(code) ? `<p class="det-meta">${icone("cadeado", 14)} Protegida pelo cadeado: desligue o cadeado na paleta para alterar.</p>` : ""}
        <div class="chips">${tags.map((t) => `<button type="button" class="chip chip-btn tag-chip${tagDe(code) === t ? " on" : ""}" style="--tag:${esc(t.cor)}" data-settag="${esc(code)}" data-tag="${esc(t.id)}"${protegida(code) ? " disabled" : ""}><i></i>${esc(t.nome)}</button>`).join("")}
          <button type="button" class="chip chip-btn" data-settag="${esc(code)}" data-tag=""${protegida(code) ? " disabled" : ""}>sem tag</button></div>
        ${Object.prototype.hasOwnProperty.call(marcacoes, code) && !protegida(code) ? `<button type="button" class="btn btn-ghost" data-reset="${esc(code)}">Voltar ao que o perfil diz</button>` : ""}`;
      box.dataset.alvo = "c:" + code;
      box.dataset.periodo = oc ? alvo.periodo : "";
      box.dataset.reg = oc && alvo.reg != null ? String(alvo.reg) : "";
      box.dataset.status = oc && alvo.status ? alvo.status : "";
      box.dataset.transferida = oc && alvo.transferida ? "1" : "";
      box.dataset.declarada = oc && alvo.declarada ? "1" : "";
    } else if (alvo.idx != null) {
      const c = M.grade[+alvo.idx];
      const f = preenchimentoBlocos()[c.idx] || { nomes: [] };
      const v = creditosManuais[c.category] || 0;
      html = `
        <header><span class="cat-pill cat-${c.category}">${CATS[c.category] ? CATS[c.category].nome : ""}</span>
          <button type="button" class="fechar" aria-label="Fechar">${icone("fechar")}</button></header>
        <h3>${esc(c.name)}</h3>
        <p class="det-meta">${esc(metaDe(null, c.credits, c.category))} · ${c.semester}º período recomendado</p>
        ${f.nomes.some((x) => x.code) ? `<h4>Preenchido por</h4><ul class="lista">${f.nomes.filter((x) => x.code).map((x) => linhaCurso(x.code)).join("")}</ul>` : ""}
        ${GRUPOS_OPT[c.category] ? `<button type="button" class="btn btn-ghost" data-ver-opt="${c.category}">Ver catálogo: ${esc(GRUPOS_OPT[c.category])}</button>` : ""}
        <h4>Créditos extras (manual)</h4>
        <p class="det-meta">Some aqui ${CATS[c.category].un} de ${CATS[c.category].nome.toLowerCase()} que não estão no perfil.</p>
        <input type="number" min="0" step="1" value="${v}" data-creditos="${c.category}" class="campo" aria-label="Créditos extras de ${esc(CATS[c.category].nome.toLowerCase())}">`;
      box.dataset.alvo = "i:" + c.idx;
    } else return;
    box.innerHTML = html;
    mostraPainel();
  }

  /** Seção "Aprovação registrada por você" do detalhe: o registro, a confirmação pelo SIGA e as divergências. */
  function htmlDeclarada(code) {
    const d = getDecl().find((x) => x.code === code);
    if (!d) return "";
    const c = M.declaradas.confirmadas[code], k = M.declaradas.conflitos[code], n = M.declaradas.notas[code];
    const futuro = d.semestre && semIdx(d.semestre) > semAtual();
    const linhas = [
      `<p class="det-meta">${iconeEstado(ICONE_DECLARADA)} Registrada por você${d.registradoEm ? ` em ${esc(d.registradoEm)}` : ""} · ${d.semestre ? `semestre ${esc(d.semestre)}` : "semestre não informado"}. Não é registro do SIGA.</p>`,
      futuro ? `<p class="alerta">O semestre informado (${esc(d.semestre)}) é posterior ao atual. Confira.</p>` : "",
      c && c.diverge ? `<p class="alerta" role="note">Você registrou ${esc(d.semestre)}; o SIGA traz ${esc(c.nome)}. Vale o SIGA.</p>`
        : c ? `<p class="det-meta">Confirmada pelo SIGA${c.nome ? ` em ${esc(c.nome)}` : ""}${c.via && /dispensa|equival/.test(c.via) ? " como dispensa ou equivalência" : ""}. Fica guardada, fora da conta.</p>` : "",
      k ? `<p class="alerta" role="note">O SIGA traz reprovação em ${esc(k.nome)}, no semestre ou depois da aprovação que você registrou. Ela não conta até você editar o semestre ou remover o registro.</p>` : "",
      n && n.tipo === "reprovacao-antes" ? `<p class="det-meta">O SIGA traz reprovação em ${esc(n.nome)}. Sua aprovação registrada ainda não aparece no Histórico.</p>` : "",
      n && n.tipo === "cursando" ? `<p class="det-meta">O BOA mostra a disciplina em curso${n.nome ? ` em ${esc(n.nome)}` : ""}.</p>` : "",
    ];
    return `<section class="det-declarada" aria-label="Aprovação registrada por você"><h4>Aprovação registrada por você</h4>${linhas.join("")}
      <label class="rotulo" for="decl-semestre">Semestre da aprovação <span class="opcional">opcional</span></label>
      <input id="decl-semestre" class="campo campo-sm" maxlength="6" autocomplete="off" inputmode="numeric" placeholder="ex.: 2025/1" value="${esc(d.semestre || "")}"
        data-decl-code="${esc(code)}" aria-describedby="decl-semestre-dica decl-semestre-msg">
      <p id="decl-semestre-dica" class="dica">Em branco, o semestre fica desconhecido. A data do registro não muda.</p>
      <p id="decl-semestre-msg" class="msg-campo" aria-live="polite"></p>
      <div class="add"><button type="button" class="btn btn-sm" data-decl-salvar="${esc(code)}">Salvar semestre</button>
        <button type="button" class="btn btn-sm btn-perigo-ghost" data-decl-remover="${esc(code)}">Remover registro</button></div></section>`;
  }

  // Foco do painel de detalhes: entra no título quando aberto pelo teclado e volta ao disparador ao fechar.
  let gatilho = null;
  const guardaGatilho = (el) => { gatilho = chaveFoco(el); };
  function focaPainel() { const h = focaTitulo($("#detalhes h3") || $("#detalhes header")); if (h) h.focus(); }
  /**
   * Abre e fecha o painel #detalhes por um caminho só (T5). Em telas de até 720 px ele vira uma folha que sobe de baixo,
   * inteira e com rolagem interna: fundo escurecido, o resto da página `inert`, role="dialog" com aria-modal e o foco
   * preso dentro. Ao passar de 720 px com a folha aberta, volta a ser o painel lateral e a página deixa de ser inerte.
   */
  const midiaFolha = window.matchMedia ? window.matchMedia("(max-width: 720px)") : { matches: false };
  function mostraPainel() {
    const box = $("#detalhes"), abrindo = box.hidden;
    box.hidden = false;
    if (abrindo) box.scrollTop = 0;
    aplicaFolha();
    if (abrindo && box.classList.contains("folha")) focaPainel();
  }
  function aplicaFolha() {
    const box = $("#detalhes"), fundo = $("#detalhes-fundo"), folha = !box.hidden && !!midiaFolha.matches;
    box.classList.toggle("folha", folha);
    if (folha) {
      const t = box.querySelector("h3");
      box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
      box.setAttribute("aria-label", (t && t.textContent.trim()) || "Detalhes");
    } else ["role", "aria-modal", "aria-label"].forEach((a) => box.removeAttribute(a));
    fundo.hidden = !folha;
    [...document.body.children].forEach((el) => {
      if (el === box || el === fundo || el.id === "anuncio" || el.tagName === "DIALOG" || el.tagName === "SCRIPT") return;
      if (folha && !el.inert) { el.inert = true; el.dataset.inertFolha = "1"; }
      else if (!folha && el.dataset.inertFolha) { el.inert = false; delete el.dataset.inertFolha; }
    });
  }
  /** Clique fora fecha só os detalhes de uma disciplina, de um bloco e o editor de tags (T4). */
  const fechaComCliqueFora = () => /^(c|i):/.test($("#detalhes").dataset.alvo || "") || $("#detalhes").dataset.alvo === "tags";
  function abrePainel(ev, abre, foco = true) {
    guardaGatilho(ev.target.closest("button, [data-code]") || ev.target);
    abre();
    if (ev.detail === 0 && foco) focaPainel();
  }
  function fechaDetalhes() {
    const box = $("#detalhes");
    const tinhaFoco = !box.hidden && (box.contains(document.activeElement) || document.activeElement === document.body);   // o foco pode ter sumido com o botão
    box.hidden = true;
    aplicaFolha();   // tira o inert antes de devolver o foco
    if (!tinhaFoco) return;
    let alvo = gatilho && document.querySelector(gatilho);
    gatilho = null;
    // O atalho do importador some depois de Usar quando não está fixado: o retorno vai a Configurações.
    if (!(alvo && alvo.getClientRects().length) && box.dataset.alvo === "importar") alvo = $("#btn-config");
    (alvo && alvo.getClientRects().length ? alvo : focaTitulo($("#titulo"))).focus();
  }
  function reabreDetalhes() {
    return preservaFoco(reabreDetalhes0, () => { focaPainel(); return document.activeElement; });
  }
  function reabreDetalhes0() {
    const box = $("#detalhes");
    if (box.hidden || !box.dataset.alvo) return;
    if (box.dataset.alvo === "tags") return abreEditorTags();
    if (box.dataset.alvo === "importar") return abreImportador();
    if (box.dataset.alvo === "privacidade") return abrePrivacidade();
    if (box.dataset.alvo === "referencias") return abreReferencias();
    const t = box.dataset.alvo.slice(0, 1), v = box.dataset.alvo.slice(2);
    abreDetalhes(t === "c" ? { code: v, periodo: box.dataset.periodo || null, reg: box.dataset.reg ? +box.dataset.reg : null,
      status: box.dataset.status || null, transferida: box.dataset.transferida === "1", declarada: box.dataset.declarada === "1" } : { idx: v });
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
    // Abaixo da barra do topo, para não cobrir botões (com a página rolada, a barra saiu da tela: volta ao alto).
    const topo = $(".topo").getBoundingClientRect();
    el.style.top = `${Math.max(14, Math.round(topo.bottom) + 8)}px`;
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
    if (protegida(code)) {   // Planejador: o clique continua mostrando os detalhes e o destaque; Clássico: só o anúncio
      if (!modoClassico) { destaca(code); abreDetalhes({ code }); }
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
    box.innerHTML = `<header><span class="cat-pill">${icone("privacidade", 14)} Privacidade</span><button type="button" class="fechar" aria-label="Fechar">${icone("fechar")}</button></header>
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
    mostraPainel();
    box.dataset.alvo = "privacidade";
  }

  /** Link de relato de erro (o endereço fica no rodapé de index.html). Nunca leva dados da pessoa. */
  function htmlRelato() {
    const a = $("#link-relato");
    return a ? `<a href="${esc(a.href)}" target="_blank" rel="noopener">${esc(a.textContent)}</a>` : "";
  }

  // ---------- Importar do SIGA (PDFs) ----------
  // Usa js/siga.js (mesmas regras de ferramentas/gerar_perfil.py) sobre o texto extraído pelo pdf.js.
  // Tudo roda no navegador: os PDFs não saem do computador.
  let resultadoImportacao = null;
  let previaObsoleta = false;
  const PREVIA_OBSOLETA = "Os dados da Grade mudaram. Escolha os PDFs e gere uma nova prévia.";
  const MSG_PDF_ILEGIVEL = "não consegui ler um dos PDFs. Confira se são o Histórico e o BOA em PDF baixados do SIGA, sem senha nem edição, e escolha os arquivos e tente de novo.";

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

  /** Descrição de um histórico na prévia, sem nome de arquivo: só datas e contagem. */
  function descricaoHistorico(h, i) {
    const r = window.SIGA.resumoHistorico(h);
    return `Histórico ${i + 1}: ${r.semestre ? `último semestre ${r.semestre}` : "sem semestre real"}${r.bloco ? ` · bloco de transferidos ${r.bloco}` : ""} · ${r.registros} registro${r.registros === 1 ? "" : "s"}`;
  }
  function htmlPapelHistorico(r) {
    if (!r.entrada || r.entrada.historicos.length < 2) return "";
    const p = r.papel;
    const msg = p.estado === "duvida"
      ? `<p class="alerta" id="siga-papel-msg">Não consegui decidir qual é o histórico do curso atual: as datas empatam ou não permitem decidir. Escolha uma opção para continuar: Usar este perfil e Baixar perfil.js ficam desativados até lá.</p>`
      : `<p class="dica" id="siga-papel-msg">${p.estado === "escolhido" ? "Escolha sua. Vale para Usar este perfil e para Baixar perfil.js." : "Reconhecido pela data mais recente. Se não for este, escolha o outro."}</p>`;
    return `<fieldset class="papel-historico" aria-describedby="siga-papel-msg">
      <legend>Qual é o histórico do curso atual?</legend>
      ${r.entrada.historicos.map((h, i) => `<label class="check"><input type="radio" name="siga-papel" value="${i}"${p.indice === i ? " checked" : ""}> ${esc(descricaoHistorico(h, i))}</label>`).join("")}
      ${msg}
    </fieldset>`;
  }
  /**
   * Tudo o que depende de qual histórico é o do curso atual: perfil, papel, período atual sugerido, planos que
   * ficam de fora e a marca de período deduzido. Roda na geração e a cada troca na prévia, para que "Usar este
   * perfil", "Baixar perfil.js" e o aviso de plano descartado reflitam sempre a escolha final.
   */
  function derivaPrevia(r, escolha) {
    const e = r.entrada;
    r.escolha = escolha;
    r.papel = window.SIGA.papelHistoricos(e.historicos, escolha);
    r.perfil = window.SIGA.montarPerfil({ historicos: e.historicos, boa: e.boa, curriculo: e.curriculo, catalogo: e.catalogo,
      anterior: e.base, atualIdx: escolha });
    // O importador descarta os planejados até o semestre inferido. Guardamos esses planos para devolvê-los
    // depois da escolha do período atual (ou pedir uma decisão explícita se ainda colidirem).
    r.planosFora = clone(e.anterior.periodos.filter((p) => p.planejado
      && !r.perfil.periodos.some((q) => q.planejado && q.nome === p.nome)));
    r.atual = e.boa ? r.perfil.periodos.find((p) => p.atual) || null : null;
    r.ultimoReal = r.perfil.periodos.filter((p) => !p.atual && !p.planejado && semestreValido(p.nome)).map((p) => p.nome).pop() || null;
    const ant = e.atualAnterior;
    const anteriorDatado = semestreValido(ant?.nome) && (!r.ultimoReal || ant.nome > r.ultimoReal) && !conflitoPeriodo(r.perfil, ant.nome);
    const mesmoBoaSemData = ant?.nome === "atual" && e.boa?.emissao && e.boa.emissao === e.anterior.fonte?.boaEmissao;
    const sugerido = anteriorDatado ? ant.nome : r.atual?.nome;
    // RA-19: só há "deduzido" quando o semestre sugerido é um semestre real. Um período já marcado como deduzido
    // continua deduzido ao reimportar, enquanto a pessoa mantiver o mesmo semestre.
    r.deduzido = !r.atual || !semestreValido(sugerido) ? null : anteriorDatado ? (ant.deduzido ? ant.nome : null) : r.atual.nome;
    if (!r.atualEditado) r.atualEscolhido = r.atual && !mesmoBoaSemData && semestreValido(sugerido) ? sugerido : "";
  }
  /** Refaz a prévia com a escolha do histórico atual; aplicar e baixar leem o mesmo resultado. */
  function recalculaPapel(r, escolha) {
    derivaPrevia(r, escolha);
  }

  function abreImportador() {
    const r = resultadoImportacao;
    const box = $("#detalhes");
    box.innerHTML = `<header><span class="cat-pill">Importar</span><button type="button" class="fechar" aria-label="Fechar">${icone("fechar")}</button></header>
      <h3>Importar do SIGA</h3>
      <ol class="passos">
        <li>No SIGA, baixe em PDF o <b>Histórico</b> (e o do curso anterior, se você mudou de curso) e o <b>BOA</b> (Boletim de Orientação Acadêmica).</li>
        <li>Escolha os PDFs abaixo (pode selecionar todos de uma vez).</li>
        <li>Confira o resumo e clique em <b>Usar este perfil</b>. Planos, pedidos, extensão e tags que você já tinha são mantidos.</li>
      </ol>
      <p class="aviso-pdf" id="siga-aviso-pdf">${icone("cadeado", 16)} <span>O BOA e o Histórico são lidos neste navegador. Os PDFs não são enviados ao GitHub.</span></p>
      <input type="file" id="siga-pdfs" accept="application/pdf,.pdf" multiple class="campo" aria-label="Arquivos PDF do Histórico e do BOA" aria-describedby="siga-aviso-pdf">
      <button type="button" class="btn btn-primario" id="siga-gerar">Gerar perfil</button>
      <p class="dica" id="siga-status" role="status">${previaObsoleta ? PREVIA_OBSOLETA : "Os PDFs são processados neste navegador. Os cabeçalhos com dados pessoais são descartados."}</p>
      ${r ? `<div class="resumo-import">
        <h4>Resumo</h4>
        <ul class="lista">
          <li>${r.perfil.periodos.filter((p) => !p.planejado).length} períodos cursados/atuais${r.perfil.periodos.some((p) => p.planejado) ? ` + ${r.perfil.periodos.filter((p) => p.planejado).length} planejados (mantidos)` : ""}</li>
          <li>${r.perfil.periodos.reduce((a, p) => a + (p.planejado ? 0 : p.disciplinas.filter((d) => d.status !== "reprovado").length), 0)} disciplinas aprovadas ou em curso</li>
          ${r.ignoradas ? `<li class="alerta">${r.ignoradas} linha(s) do Histórico não puderam ser lidas; confira a lista antes de usar o perfil.</li>` : ""}
          ${r.atual ? `<li>Período atual: ${r.atual.disciplinas.length} disciplina(s) cursando no BOA</li>` : ""}
          ${r.boa ? `<li>BOA de ${esc(r.boa.emissao || "?")}: ${r.boa.naoExplicitadasPresente ? `${r.boa.naoExplicitadas.length} não explicitadas` : "seção de não explicitadas não encontrada"}, ${r.boa.equivalencias.length} equivalência(s) automática(s)</li>`
            : `<li class="alerta">Sem BOA: nenhuma disciplina em curso foi atualizada.${r.perfil.periodos.some((p) => p.atual) ? " O período atual do perfil anterior foi mantido." : ""}</li>`}
          ${r.semCategoria.length ? `<li class="alerta">Atividades sem créditos fora do currículo e catálogo. Confira se são ACE: ${r.semCategoria.map(esc).join(", ")}.</li>` : ""}
          <li>Documentos reconhecidos: ${r.historicos} Histórico(s)${r.boa ? " e 1 BOA" : ""}</li>
          ${htmlDeclaradasPrevia(r)}
        </ul>
        ${htmlPapelHistorico(r)}
        ${r.atual ? `<div class="periodo-sugerido">
          <label class="rotulo" for="siga-atual">Período atual sugerido</label>
          <input id="siga-atual" class="campo campo-sm" value="${esc(r.atualEscolhido)}" placeholder="sem data" maxlength="6"
            inputmode="numeric" autocomplete="off" aria-describedby="siga-atual-dica siga-atual-msg"${r.conflito ? ' aria-invalid="true"' : ""}>
          <p class="dica" id="siga-atual-dica">${r.ultimoReal
            ? `Último semestre do histórico (${esc(r.ultimoReal)}).`
            : "O histórico não tem um semestre para servir de base."} A sugestão considera o período atual já salvo e o Histórico. Corrija se precisar, no formato AAAA/1 ou AAAA/2, ou deixe em branco para manter o período sem data.</p>
          <p class="msg-campo" id="siga-atual-msg" aria-live="polite">${esc(r.conflito || "")}</p>
          <div id="siga-nota-ra19"${r.deduzido && r.atualEscolhido.trim() === r.deduzido ? "" : " hidden"}>${notaHtml(NOTA_RA19)}</div>
        </div>` : ""}
        <div id="siga-planos" class="siga-planos" aria-live="polite">${htmlPlanosImportacao(r)}</div>
        <button type="button" class="btn btn-primario" id="siga-usar"${importacaoBloqueada(r) ? " disabled" : ""}>Usar este perfil</button>
        <button type="button" class="btn btn-ghost" id="siga-baixar"${importacaoBloqueada(r) ? " disabled" : ""}>Baixar perfil.js</button>
        <button type="button" class="btn btn-ghost" id="siga-descartar">Descartar prévia</button>
      </div>` : ""}
      <h4>Ou carregar um perfil pronto</h4>
      <button type="button" class="btn btn-sm" id="escolher-perfil" aria-describedby="escolher-perfil-dica">Escolher perfil.js / .json</button>
      <input type="file" id="importar" accept=".json,.js" hidden aria-label="Arquivo de perfil (.js ou .json)">
      <p class="dica" id="escolher-perfil-dica">Um arquivo válido substitui o perfil salvo; um inválido é recusado e nada muda.</p>`;
    mostraPainel();
    box.dataset.alvo = "importar";
  }

  /**
   * Prévia: as aprovações registradas por você contra o perfil importado, com a mesma montagem do modelo. Não bloqueia
   * "Usar este perfil": as confirmadas ficam guardadas fora da conta e as divergências aparecem nos detalhes.
   */
  function htmlDeclaradasPrevia(r) {
    const decl = window.PROGRESSO.normalizaDeclaradas(r.perfil.aprovacoesDeclaradas || []).itens;
    if (!decl.length) return "";
    const d = montaRegistros({ grade: M.grade, catalogo: M.catalogo, periodos: r.perfil.periodos.map((x) => ({ ...x })),
      pedidos: r.perfil.equivalencias || [], declaradas: decl }).declaradas;
    const confirmadas = Object.keys(d.confirmadas);
    const divergentes = Object.keys(d.conflitos).concat(confirmadas.filter((c) => d.confirmadas[c].diverge));
    const ultimo = semIdx(r.ultimoReal);
    // Declaradas com semestre que o Histórico importado cobre, mas que ele não traz.
    const naoEncontradas = d.ativas.filter((x) => x.semestre && ultimo != null && semIdx(x.semestre) <= ultimo).map((x) => x.code);
    const n = (v, um, varios) => `${v} ${v === 1 ? um : varios}`;
    return `<li class="previa-declaradas">Aprovações registradas por você: ${n(d.ativas.length, "mantida", "mantidas")}, ${n(confirmadas.length, "confirmada", "confirmadas")} pelo SIGA, ${divergentes.length} com divergência${divergentes.length ? ` (${divergentes.map(esc).join(", ")})` : ""}.</li>
      ${naoEncontradas.length ? `<li class="alerta">Registradas por você e não encontradas no Histórico importado: ${naoEncontradas.map(esc).join(", ")}.</li>` : ""}`;
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
        let linhas;
        // A mensagem do leitor de PDF vem em inglês e não ajuda: troca por orientação, sem nome nem conteúdo do arquivo.
        try { linhas = await linhasPDF(f); }
        catch (e) { throw new Error(MSG_PDF_ILEGIVEL); }
        const tipo = linhas.some((l) => /BOLETIM DE ORIENTA/i.test(l)) ? "BOA" : "Histórico";
        lidos.push({ tipo, linhas });
      }
      const curriculo = {}, catalogo = {};
      M.grade.forEach((c) => { if (c.code) curriculo[c.code] = { category: c.category }; });
      M.catalogo.forEach((o) => { catalogo[o.code] = { category: o.category || 2 }; });
      const lidosHistorico = lidos.filter((x) => x.tipo === "Histórico").map((x) => window.SIGA.lerHistorico(x.linhas));
      const ignoradas = lidosHistorico.reduce((n, h) => n + h.ignoradas, 0);
      const historicos = lidosHistorico.filter((h) => h.registros.length);
      const boaL = lidos.find((x) => x.tipo === "BOA");
      const boa = boaL ? window.SIGA.lerBOA(boaL.linhas) : null;
      if (!historicos.length && !boa) throw new Error("não reconheci nenhum Histórico ou BOA do SIGA nesses arquivos");
      if (!status.isConnected || $("#detalhes").hidden) return;
      const anterior = perfilExportado();
      const atualAnterior = anterior.periodos.find((p) => p.atual);
      // Com BOA, a mesclagem do período atual depende da escolha feita na prévia.
      const base = boa ? { ...anterior, periodos: anterior.periodos.filter((p) => !p.atual) } : anterior;
      const semCategoria = [...new Set((boa?.cursando || [])
        .filter((c) => c.ncc && !curriculo[c.code] && !catalogo[c.code]).map((c) => c.code))].sort();
      previaObsoleta = false;
      resultadoImportacao = { boa, semCategoria, ignoradas, historicos: historicos.length,
        entrada: { historicos, boa, curriculo, catalogo, base, anterior, atualAnterior },
        atualAnterior, conflito: null, atualEditado: false, descartarPlanos: false };
      derivaPrevia(resultadoImportacao, null);
      avaliaImportacao(resultadoImportacao);
      abreImportador();
      // A prévia substitui o conteúdo do painel: o foco vai para o resultado e a região viva estável avisa.
      const resumo = focaTitulo($(".resumo-import h4")); if (resumo) resumo.focus();
      anuncia("Prévia pronta. Confira o resumo e escolha Usar este perfil ou Baixar perfil.js.");
    } catch (e) {
      status.innerHTML = `${esc("Não deu certo: " + e.message)} ${htmlRelato()}`;
    } finally {
      if (status.isConnected) {
        const eraFoco = document.activeElement === document.body || document.activeElement === $("#siga-gerar");
        $("#siga-gerar").disabled = false;
        if (eraFoco && !resultadoImportacao) $("#siga-gerar").focus();     // desativado durante a leitura, o botão perdeu o foco
      }
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
    delete atual.deduzido;      // o semestre mudou: não é mais o deduzido pelo importador
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
      if (r.deduzido && nome === r.deduzido) novo.periodos.find((p) => p.atual).deduzido = true;   // RA-19: semestre sugerido pelo importador
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
  const importacaoBloqueada = (r) => !!r.conflito || r.papel.estado === "duvida" || (r.colisoes.length > 0 && !r.descartarPlanos);
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
  function salvaPerfilCriado(nomeTxt, semTxt, ajusta = null) {
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
    if (ajusta) ajusta(novo);
    try { usaPerfilImportado(novo, { irParaLinhaDoTempo: false }); }
    catch (e) { return "Não consegui salvar o perfil: " + e.message; }
    return null;
  }

  // ---------- Registrar marcações (aprovações registradas por você) ----------
  // O pincel continua simulação. Este fluxo grava as marcações aprovadas como "Aprovação registrada por você" no perfil
  // (aprovacoesDeclaradas), com o semestre opcional, e tira essas marcações do pincel. Sem perfil, cria um no próprio fluxo.
  let registro = null;   // { fase: "escolha" | "resultado", marcadas: Set, gatilho, antes, gravadas }
  const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const nomeSemestre = (i) => window.PROGRESSO.nomeDoSemestre(i);
  /** Marcações aprovadas do pincel separadas pelo que acontece com cada uma no registro. */
  function gruposRegistro() {
    const decl = new Set(getDecl().map((d) => d.code));
    const g = { gravar: [], emCurso: [], jaAprovadas: [], jaRegistradas: [], naoReconhecidas: [] };
    Object.keys(marcacoes).filter(aprovacaoManual).sort().forEach((code) => {
      if (!M.info(code)) return g.naoReconhecidas.push(code);
      if (decl.has(code)) return g.jaRegistradas.push(code);
      if (fonteDe(code) === "importado") return g.jaAprovadas.push(code);
      if (emCurso(statusPerfil(code))) return g.emCurso.push(code);
      g.gravar.push(code);
    });
    return g;
  }
  const elegiveisRegistro = () => { const g = gruposRegistro(); return g.gravar.length + g.emCurso.length; };
  const MOTIVO_REGISTRAR = "Nenhuma disciplina marcada como aprovada com o pincel para registrar.";
  /** Botão "Registrar marcações" (paleta e Configurações): sem elegíveis, aria-disabled com o motivo em texto. */
  function botaoRegistrar(classe, id) {
    const n = elegiveisRegistro();
    return `<button type="button" class="${classe}" id="${id}" data-registrar${n ? "" : ` aria-disabled="true" aria-describedby="${id}-motivo"`}
      title="${n ? "Gravar as marcações aprovadas como aprovações registradas por você" : esc(MOTIVO_REGISTRAR)}">${icone("check")} <span>Registrar marcações</span></button>${n ? "" : `<span id="${id}-motivo" class="sr">${esc(MOTIVO_REGISTRAR)}</span>`}`;
  }
  /** Reprovação importada no semestre do registro ou depois (sem semestre: o de hoje): a declarada seria conflito. */
  function conflitoRegistro(code, semestre) {
    const limite = semIdx(semestre) ?? window.PROGRESSO.semestreDaData(hojeISO());
    const rs = (M.regs[code] || []).filter((r) => r.status === "reprovado" && r.origem !== "declarado")
      .map(semestreDoRegistro).filter((x) => x != null && x >= limite);
    return rs.length ? nomeSemestre(Math.min(...rs)) : null;
  }
  function erroSemestreRegistro(v) {
    if (!v) return null;
    if (!semestreValido(v)) return "Use AAAA/1 ou AAAA/2, ou deixe em branco.";
    if (semIdx(v) > semAtual()) return `O semestre não pode ser posterior ao atual (${nomeSemestre(semAtual())}).`;
    return null;
  }
  function abreRegistro(gatilho) {
    if (!elegiveisRegistro()) return anuncia(MOTIVO_REGISTRAR);
    registro = { fase: "escolha", marcadas: new Set(gruposRegistro().gravar), gatilho: chaveFoco(gatilho) };
    const d = $("#dlg-registrar");
    renderRegistro();
    if (!d.open) d.showModal();
    $("#dlg-registrar-titulo").focus();
  }
  function renderRegistro() {
    const corpo = $("#registrar-corpo");
    const titulo = `<h1 id="dlg-registrar-titulo" class="dlg-titulo" tabindex="-1">Registrar marcações</h1>`;
    if (registro.fase === "resultado") {
      const n = registro.gravadas;
      corpo.innerHTML = `${titulo}
        <p id="reg-resultado" class="reg-resultado" role="status" tabindex="-1">${n} ${n === 1 ? "aprovação registrada" : "aprovações registradas"} por você.</p>
        <p class="dlg-texto">${n === 1 ? "Ela conta" : "Elas contam"} para fase e conquistas, com a marca "declarado". Não ${n === 1 ? "é" : "são"} registro do SIGA. Edite o semestre ou remova nos detalhes da disciplina.</p>
        <div class="dlg-acoes"><button type="button" class="btn" id="reg-desfazer">Desfazer</button><button type="button" class="btn btn-escuro" id="reg-fechar">Fechar</button></div>`;
      return;
    }
    const g = gruposRegistro();
    const linha = (code) => {
      const i = M.info(code);
      return `<li data-reg-linha="${esc(code)}"><label class="check reg-item"><input type="checkbox" data-reg-code="${esc(code)}"${registro.marcadas.has(code) ? " checked" : ""}>
        <span>${esc(code)} · ${esc(i.name)}</span></label><small class="reg-motivo" id="reg-motivo-${esc(code)}"></small></li>`;
    };
    const outros = [...g.jaAprovadas.map((c) => [c, "já aprovada no perfil"]), ...g.jaRegistradas.map((c) => [c, "já registrada por você"]),
      ...g.naoReconhecidas.map((c) => [c, "não reconhecida no currículo nem no catálogo"])];
    corpo.innerHTML = `${titulo}
      <p class="dlg-texto">As disciplinas marcadas como aprovadas com o pincel passam a ser "Aprovação registrada por você" no perfil. Não é registro do SIGA.</p>
      ${perfil ? "" : `<fieldset class="opcoes reg-criar"><legend>Criar perfil</legend>
        <p class="dica">Um perfil novo será criado neste navegador. Os dois campos são opcionais.</p>
        <label class="rotulo" for="reg-nome">Nome <span class="opcional">opcional</span></label>
        <input id="reg-nome" class="campo" maxlength="60" autocomplete="off" spellcheck="false">
        <label class="rotulo" for="reg-atual">Semestre atual <span class="opcional">opcional</span></label>
        <input id="reg-atual" class="campo" maxlength="6" autocomplete="off" inputmode="numeric" placeholder="ex.: 2026/2" aria-describedby="reg-atual-msg">
        <p id="reg-atual-msg" class="msg-campo" aria-live="polite"></p></fieldset>`}
      ${g.gravar.length ? `<h2 class="reg-h" id="reg-h-gravar">Serão gravadas</h2><ul class="reg-lista" aria-labelledby="reg-h-gravar">${g.gravar.map(linha).join("")}</ul>` : ""}
      ${g.emCurso.length ? `<h2 class="reg-h" id="reg-h-curso">Em curso no BOA: registre só se já foi aprovada</h2><ul class="reg-lista" aria-labelledby="reg-h-curso">${g.emCurso.map(linha).join("")}</ul>` : ""}
      <label class="rotulo" for="reg-semestre">Semestre da aprovação <span class="opcional">opcional</span></label>
      <input id="reg-semestre" class="campo" maxlength="6" autocomplete="off" inputmode="numeric" placeholder="ex.: 2025/1" aria-describedby="reg-semestre-dica reg-semestre-msg">
      <p id="reg-semestre-dica" class="dica">Todas no mesmo semestre? Se não, deixe em branco e ajuste no detalhe. Em branco, o semestre fica desconhecido.</p>
      <p id="reg-semestre-msg" class="msg-campo" aria-live="polite"></p>
      ${outros.length ? `<h2 class="reg-h">Não serão gravadas</h2><ul class="reg-outros">${outros.map(([c, m]) => `<li>${esc(c)}: ${esc(m)}</li>`).join("")}</ul>` : ""}
      <p id="reg-contagem" class="reg-contagem" role="status"></p>
      <div class="dlg-acoes"><button type="button" class="btn" id="reg-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-escuro" id="reg-gravar" aria-describedby="reg-gravar-motivo"></button></div>
      <p id="reg-gravar-motivo" class="sr"></p>`;
    atualizaRegistro();
  }
  /** Atualiza conflitos, contagem e o botão sem redesenhar (o campo de semestre não perde o cursor). */
  function atualizaRegistro() {
    const sem = ($("#reg-semestre")?.value || "").trim();
    const erro = erroSemestreRegistro(sem);
    $("#reg-semestre-msg").textContent = erro || "";
    $("#reg-semestre").toggleAttribute("aria-invalid", !!erro);
    document.querySelectorAll("#registrar-corpo [data-reg-code]").forEach((cx) => {
      const code = cx.dataset.regCode, k = erro ? null : conflitoRegistro(code, sem);
      if (k) registro.marcadas.delete(code);
      cx.checked = registro.marcadas.has(code);
      if (k) { cx.setAttribute("aria-disabled", "true"); cx.setAttribute("aria-describedby", `reg-motivo-${code}`); }
      else { cx.removeAttribute("aria-disabled"); cx.removeAttribute("aria-describedby"); }
      $(`#reg-motivo-${CSS.escape(code)}`).textContent = k ? `O SIGA traz reprovação em ${k}, no semestre ou depois deste registro. Informe um semestre posterior ou deixe em branco.` : "";
    });
    const n = registro.marcadas.size;
    $("#reg-contagem").textContent = n === 1 ? "Será gravada 1 aprovação." : `Serão gravadas ${n} aprovações.`;
    const b = $("#reg-gravar");
    b.textContent = `Gravar ${n} ${n === 1 ? "aprovação" : "aprovações"}`;
    const motivo = erro ? "Corrija o semestre da aprovação." : !n ? "Marque pelo menos uma disciplina." : "";
    b.toggleAttribute("aria-disabled", !!motivo); if (motivo) b.setAttribute("aria-disabled", "true");
    $("#reg-gravar-motivo").textContent = motivo;
  }
  function gravaRegistro() {
    const sem = ($("#reg-semestre").value || "").trim();
    if (erroSemestreRegistro(sem) || !registro.marcadas.size) { atualizaRegistro(); return anuncia($("#reg-gravar-motivo").textContent); }
    const codes = [...registro.marcadas].sort().filter((c) => !conflitoRegistro(c, sem));
    const itens = codes.map((code) => ({ code, registradoEm: hojeISO(), ...(sem ? { semestre: sem } : {}) }));
    const antes = { perfilImportado, perfil, plano: clone(plano), marcacoes: clone(marcacoes), tags: clone(tags), vistaAtual };
    const resto = clone(marcacoes); codes.forEach((c) => { delete resto[c]; });
    if (!perfil) {
      // Perfil novo: as declaradas entram nele e as marcações convertidas saem (marcacoes explícito, mesmo vazio).
      const erro = salvaPerfilCriado($("#reg-nome").value, $("#reg-atual").value, (novo) => { novo.aprovacoesDeclaradas = itens; novo.marcacoes = resto; });
      if (erro) { mensagemCampo("#reg-atual", erro); $("#reg-atual").focus(); return; }
    } else {
      // Com perfil: grava as declaradas antes de limpar as marcações do pincel.
      plano.aprovacoesDeclaradas = getDecl().concat(itens); save("plano", plano);
      marcacoes = resto; save("marcacoes", marcacoes);
      montaModelo(); render();
    }
    Object.assign(registro, { fase: "resultado", antes, gravadas: itens.length });
    renderRegistro();
    $("#reg-resultado").focus();
  }
  function desfazRegistro() {
    const a = registro.antes;
    ({ perfilImportado, perfil, plano, marcacoes, tags, vistaAtual } = a);
    save("perfilImportado", perfilImportado); save("plano", plano); save("marcacoes", marcacoes); save("tags", tags); save("vista", vistaAtual);
    montaModelo(); render();
    registro = { fase: "escolha", marcadas: new Set(gruposRegistro().gravar), gatilho: registro.gatilho };
    renderRegistro();
    $("#dlg-registrar-titulo").focus();
    anuncia("Registro desfeito. As marcações do pincel voltaram.");
  }
  /** Fecha e devolve o foco na hora (o evento close chega depois no WebKit, e o gatilho pode ter sido redesenhado). */
  function fechaRegistro() {
    const d = $("#dlg-registrar");
    if (d.open) d.close();
    devolveFocoRegistro();
  }
  function devolveFocoRegistro() {
    if (!registro) return;
    const g = registro.gatilho;
    registro = null;
    const alvo = (g && document.querySelector(g)) || $("#btn-registrar") || $("#painel");
    if (alvo) alvo.focus();
  }

  /** Edita o semestre de uma declarada (em branco = desconhecido); `registradoEm` não muda. */
  function salvaSemestreDeclarada(code) {
    const v = ($("#decl-semestre").value || "").trim();
    const erro = erroSemestreRegistro(v);
    if (erro) { mensagemCampo("#decl-semestre", erro); return $("#decl-semestre").focus(); }
    setLista("aprovacoesDeclaradas", getDecl().map((d) => {
      if (d.code !== code) return d;
      const novo = { ...d }; if (v) novo.semestre = v; else delete novo.semestre; return novo;
    }));
    reabreDetalhes(); focaPainel();
    anuncia(v ? `Semestre de ${code} salvo: ${v}.` : `Semestre de ${code} removido: fica desconhecido.`);
  }
  /** Remove declaradas (com confirmação e o número). A marcação do pincel não é recriada. */
  async function removeDeclaradas(codes, { titulo, depois } = {}) {
    if (!codes.length) return false;
    const n = codes.length;
    const ok = await confirma({ titulo: titulo || "Remover registro",
      texto: `${n === 1 ? `A aprovação registrada por você de ${codes[0]} sai` : `${n} aprovações registradas por você saem`} do perfil. A marcação do pincel não volta.`,
      ok: n === 1 ? "Remover registro" : `Remover ${n}` });
    if (!ok) return false;
    const sai = new Set(codes);
    setLista("aprovacoesDeclaradas", getDecl().filter((d) => !sai.has(d.code)));
    if (depois) depois();
    anuncia(n === 1 ? `Registro de ${codes[0]} removido.` : `${n} registros removidos.`);
    return true;
  }
  /** Declaradas que saem ao limpar os dados do navegador ou trocar de perfil (as do perfil/perfil.js ficam no arquivo). */
  const declaradasNoNavegador = () => (perfilImportado || plano.aprovacoesDeclaradas ? getDecl().length : 0);
  const textoDeclaradas = (n) => `${n} ${n === 1 ? "aprovação registrada" : "aprovações registradas"} por você`;

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
  /** Fecha o diálogo modal com clique (ou toque) no fundo, fora da janela; começar o gesto dentro não conta. */
  function fechaAoClicarFora(d, fecha = () => d.close()) {
    const fora = (ev) => { const r = d.getBoundingClientRect(); return ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom; };
    let comecouFora = false;
    d.addEventListener("pointerdown", (ev) => { comecouFora = ev.target === d && fora(ev); });
    d.addEventListener("click", (ev) => { if (comecouFora && ev.target === d && fora(ev)) fecha(); comecouFora = false; });
  }

  // ---------- Novo período planejado (janela central, como "Excluir período") ----------
  function abreDialogoPeriodo(sugestao) {
    const d = $("#dlg-periodo"), campo = $("#periodo-nome");
    campo.value = sugestao; campo.removeAttribute("aria-invalid"); $("#periodo-msg").textContent = "";
    d.returnValue = "";
    d.showModal(); campo.focus(); campo.select();
  }
  function criaPeriodo(ev) {
    ev.preventDefault();
    const campo = $("#periodo-nome"), nome = campo.value.trim();
    const erro = !nomePeriodo(nome) ? "Informe o nome do período, por exemplo 2028/1."
      : M.periodos.some((p) => p.nome === nome) || nome === window.PROGRESSO.NOME_DECL ? `O período ${nome} já existe.` : null;
    if (erro) { $("#periodo-msg").textContent = erro; campo.setAttribute("aria-invalid", "true"); campo.focus(); return; }
    $("#dlg-periodo").close("ok");
    if ((plano.removidos || []).includes(nome)) plano.removidos = plano.removidos.filter((x) => x !== nome);   // recria vazio
    else plano.novos = (plano.novos || []).concat([{ nome, planejado: true }]);
    plano.periodos[nome] = [];
    cronoPeriodo = nome; save("cronoPeriodo", nome); save("plano", plano); montaModelo(); render();
    focaPeriodo(nome);
  }
  const focaPeriodo = (nome) => {
    const b = nome && document.querySelector(`[data-cperiodo="${CSS.escape(nome)}"]`);
    (b || $("#novo-periodo") || $("#painel")).focus();
  };

  // ---------- Configurações (aparência e tema) ----------
  let abriuConfig = null;   // botão que abriu Configurações: recebe o foco de volta ao fechar
  /**
   * Sem outro destino (foco no documento ou preso no diálogo fechado), o foco volta ao botão que abriu Configurações;
   * um atalho acionado dentro da janela já levou o foco ao próprio destino e não é desfeito.
   */
  function devolveFocoConfig() {
    const d = $("#dlg-config"), a = document.activeElement, semDestino = !a || a === document.body || d.contains(a);
    if (!d.open && semDestino && abriuConfig && abriuConfig.isConnected && abriuConfig !== document.body) abriuConfig.focus();
  }
  /** Fecha Configurações (X, Fechar, Esc e clique fora) e devolve o foco na hora. */
  function fechaConfig() {
    const d = $("#dlg-config");
    if (d.open) d.close();
    devolveFocoConfig();
  }
  function abreConfiguracoes(botao) {
    const d = $("#dlg-config");
    // No WebKit o clique não foca o botão: guarda quem abriu pelo próprio evento, não pelo foco.
    abriuConfig = botao || document.activeElement;
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
    tags = normalizaTags(novo.tags) ?? tags;
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

  // ---------- Destaque de requisitos (Trilha) ----------
  // Pré-requisito com contorno contínuo, co-requisito tracejado e o que ela libera com a etiqueta "libera". Na Grade
  // (Clássico e Planejador) segue a Trilha: Ao segurar, só a pressão longa (`segurando`) acende e soltar apaga; Ao passar
  // o mouse, mouse, foco, detalhes e "ir para" acendem e o resto esmaece; Desligado não destaca. Nas outras telas
  // (Linha do tempo, Optativas), só os contornos, como antes. As setas de "A ECI por trás da Grade" ficam em js/eci.js.
  function destaca(code, segurando = false) {
    const painel = $("#painel"), naGrade = painel.classList.contains("vista-grade");
    if (naGrade && exibir.destaque === "segurar" && !segurando) return;   // nenhum outro gatilho acende nem apaga
    limpaDestaque();
    if (!code) return;
    const i = M.info(code); if (!i) return;
    if (naGrade && exibir.destaque === "desligado") return;
    const marca = (c, cls) => painel.querySelectorAll(`[data-code="${CSS.escape(c)}"]`).forEach((el) => el.classList.add(cls));
    i.req.forEach((r) => marca(r, "hl-req"));
    i.coreq.forEach((r) => marca(r, "hl-coreq"));
    (M.deps[code] || []).forEach((d) => marca(d, "hl-dep"));
    // quem a exige como co-requisito também é liberado por ela, com o contorno tracejado do co-requisito
    Object.keys(M.curr).filter((c) => M.info(c).coreq.includes(code)).forEach((d) => { marca(d, "hl-dep"); marca(d, "hl-coreq"); });
    marca(code, "hl-self");
    painel.classList.toggle("destacando", naGrade);
    // Na Grade, o que ela libera ganha a etiqueta "libera" em texto, dentro do cartão e abaixo do nome.
    if (naGrade) painel.querySelectorAll(".card.hl-dep").forEach((el) => el.insertAdjacentHTML("beforeend", '<span class="etq-libera" aria-hidden="true">libera</span>'));
  }
  function limpaDestaque() {
    document.querySelectorAll(".etq-libera").forEach((el) => el.remove());
    document.querySelectorAll(".hl-req,.hl-coreq,.hl-dep,.hl-self").forEach((el) => el.classList.remove("hl-req", "hl-coreq", "hl-dep", "hl-self"));
    $("#painel").classList.remove("destacando");
  }
  /** Sem o mouse e sem o foco na Grade: o destaque fica na disciplina com os detalhes abertos, ou some. */
  function destaqueEmRepouso() {
    const aberto = !$("#detalhes").hidden && ($("#detalhes").dataset.alvo || "").startsWith("c:") ? $("#detalhes").dataset.alvo.slice(2) : null;
    if (aberto) destaca(aberto); else limpaDestaque();
  }

  // ---------- Eventos ----------
  // Toque: não há hover nem `title`. A primeira ativação de um cartão só consulta (situação e origem em texto,
  // no próprio painel da paleta); a segunda, no mesmo cartão, aplica o pincel. Mouse e teclado marcam de uma vez.
  let toqueEm = 0;
  // Trilha Ao segurar (T6): pressão longa num cartão da Grade. { code, el, x, y, id, timer, ativa }
  let pressao = null;
  let semCliqueAte = 0;   // carimbo: o clique que fecha uma pressão longa não pinta nem abre Detalhes
  const porToque = () => Date.now() - toqueEm < 1200;
  function consulta(code) {
    consultado = code;
    destaca(code);
    $("#paleta").innerHTML = renderPaleta();
    const so = situacaoOrigem(code);
    anuncia(`${code}: ${so.rot}, ${so.origem || "sem marcação"}. Toque de novo para aplicar a tag.`);
  }

  function liga() {
    document.addEventListener("touchstart", () => { toqueEm = Date.now(); }, { capture: true, passive: true });
    document.addEventListener("pointerdown", (ev) => { if (ev.pointerType === "touch") toqueEm = Date.now(); }, true);
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
        if (pincel !== null) { consultado = null; return pinta(abrir.dataset.abrir); }
        destaca(abrir.dataset.abrir); return abrePainel(ev, () => abreDetalhes({ code: abrir.dataset.abrir }));
      }
      const fc = t.closest("[data-fcheck]");
      if (fc) {
        if (fc.getAttribute("aria-disabled") === "true") return anuncia($(`#fmotivo-${fc.dataset.fcheck}`).textContent);
        filtros[fc.dataset.fcheck] = !filtros[fc.dataset.fcheck]; save("filtros", filtros); return render();
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
        const ult = M.periodos.filter((p) => !p.declarado).pop();
        let sug = "";
        if (ult && /^(\d{4})\/(\d)$/.test(ult.nome)) { const [a, s] = ult.nome.split("/").map(Number); sug = s >= 2 ? `${a + 1}/1` : `${a}/2`; }
        return abreDialogoPeriodo(sug);
      }
      const celula = t.closest(".cel");
      if (celula) { if (ev.detail === 0) ativaCelula(+celula.dataset.cel, false); return; }   // com o mouse, tratado no mousedown
      // cartões
      const el = t.closest(".card"); if (!el) return;
      // "ECI por trás" e o pincel só agem na Grade; nas outras vistas o clique abre os detalhes.
      const naGrade = modoClassico || vistaAtual === "grade";
      if (seletorECI && naGrade && el.dataset.code && window.ECI.tem(el.dataset.code)) return window.ECI.abre(el.dataset.code, contextoECI(), el);
      if (pincel !== null && el.dataset.code && naGrade) {
        if (porToque() && consultado !== el.dataset.code && !protegida(el.dataset.code)) return consulta(el.dataset.code);
        consultado = null; return pinta(el.dataset.code);
      }
      destaca(el.dataset.code);
      abrePainel(ev, () => abreDetalhes(el.dataset.code ? { code: el.dataset.code, periodo: el.dataset.periodo || null, reg: el.dataset.reg != null ? +el.dataset.reg : null,
        status: el.dataset.status || null, transferida: el.hasAttribute("data-transferida"), declarada: el.hasAttribute("data-declarada") } : { idx: el.dataset.idx }));
    });

    // Horários: mouse e toque (mousedown, com arrasto) e teclado (Espaço/Enter, que chegam como clique sem detalhe).
    function ativaCelula(c, comArrasto) {
      celTab = c;
      const p = M.periodos.find((x) => x.nome === cronoPeriodo); if (!p) return;
      if (!cronoSel) {
        const dono = p.itens.find((it) => it.cel.has(c));
        if (dono) { cronoSel = dono.code; cronoSlot = null; }
        else cronoSlot = cronoSlot === c ? null : c;
        render();
        return;
      }
      const it = p.itens.find((x) => x.code === cronoSel); if (!it) return;
      const modo = !it.cel.has(c);
      if (comArrasto) arrasto = { modo, visit: new Set([c]) };
      alteraCelula(cronoPeriodo, cronoSel, c, modo);
    }
    painel.addEventListener("mousedown", (ev) => {
      const cel = ev.target.closest(".cel"); if (!cel) return;
      ev.preventDefault();
      ativaCelula(+cel.dataset.cel, true);
    });
    // Setas movem o foco entre as células (só uma entra na ordem de Tab); Home/End vão aos extremos da linha.
    painel.addEventListener("keydown", (ev) => {
      const cel = ev.target.closest && ev.target.closest(".cel"); if (!cel) return;
      const c = +cel.dataset.cel, di = Math.floor(c / 100), h = c % 100;
      const destino = {
        ArrowRight: di < DIAS.length - 1 ? c + 100 : null, ArrowLeft: di > 0 ? c - 100 : null,
        ArrowDown: h < H_FIM - 1 ? c + 1 : null, ArrowUp: h > H_INI ? c - 1 : null,
        Home: ev.ctrlKey ? H_INI : di * 0 + h, End: ev.ctrlKey ? (DIAS.length - 1) * 100 + H_FIM - 1 : (DIAS.length - 1) * 100 + h,
      }[ev.key];
      if (destino === undefined) return;
      ev.preventDefault();
      const alvo = destino != null && painel.querySelector(`.cel[data-cel="${destino}"]`);
      if (!alvo) return;
      painel.querySelectorAll('.cel[tabindex="0"]').forEach((x) => { x.tabIndex = -1; });
      alvo.tabIndex = 0; celTab = destino; alvo.focus();
    });
    // Trilha Ao segurar: clicar e segurar (mouse), tocar e segurar (~400 ms) ou segurar Espaço num cartão da Grade mostra
    // a trilha; soltar apaga. Cancela com movimento > 10 px, rolagem, saída do alvo, perda de foco, pointercancel ou troca
    // de tela. O clique curto continua igual (pincel: primeiro toque consulta, segundo pinta); a pressão longa consome a
    // ativação, sem pintar nem abrir Detalhes. A rolagem da página continua (sem touch-action: none).
    const SEGURAR_MS = 400, TOLERANCIA = 10;
    const segurarAtivo = () => painel.classList.contains("vista-grade") && exibir.destaque === "segurar";
    function encerraPressao() {
      if (!pressao) return;
      clearTimeout(pressao.timer);
      if (pressao.ativa) { limpaDestaque(); semCliqueAte = Date.now() + 700; }
      pressao = null;
    }
    function iniciaPressao(el, x, y, id) {
      encerraPressao();
      const p = pressao = { code: el.dataset.code, el, x, y, id, ativa: false };
      p.timer = setTimeout(() => { if (pressao !== p) return; p.ativa = true; destaca(p.code, true); }, SEGURAR_MS);
    }
    painel.addEventListener("pointerdown", (ev) => {
      if (!segurarAtivo() || ev.button !== 0) return;
      const el = ev.target.closest(".card[data-code]"); if (!el || el.inert) return;
      iniciaPressao(el, ev.clientX, ev.clientY, ev.pointerId);
    });
    document.addEventListener("pointermove", (ev) => {
      if (pressao && pressao.id === ev.pointerId && Math.hypot(ev.clientX - pressao.x, ev.clientY - pressao.y) > TOLERANCIA) encerraPressao();
    });
    document.addEventListener("pointerup", (ev) => { if (pressao && pressao.id === ev.pointerId) encerraPressao(); });
    document.addEventListener("pointercancel", encerraPressao);
    document.addEventListener("pointerout", (ev) => {
      if (pressao && pressao.id === ev.pointerId && ev.target === pressao.el && !pressao.el.contains(ev.relatedTarget)) encerraPressao();
    });
    window.addEventListener("scroll", encerraPressao, { capture: true, passive: true });
    window.addEventListener("blur", encerraPressao);
    document.addEventListener("visibilitychange", encerraPressao);
    // O menu do sistema (toque longo) fica bloqueado só durante a pressão.
    document.addEventListener("contextmenu", (ev) => { if (pressao && pressao.el.contains(ev.target)) ev.preventDefault(); });
    // Teclado: Espaço curto continua ativando (o clique nativo sai no keyup); Espaço segurado mostra a trilha.
    painel.addEventListener("keydown", (ev) => {
      if (ev.key !== " " || !segurarAtivo()) return;
      const el = ev.target.closest && ev.target.closest(".card[data-code]"); if (!el) return;
      if (ev.repeat) return;
      iniciaPressao(el, 0, 0, "teclado");
    });
    painel.addEventListener("keyup", (ev) => { if (ev.key === " " && pressao && pressao.id === "teclado") encerraPressao(); });
    painel.addEventListener("focusout", (ev) => { if (pressao && pressao.id === "teclado" && ev.target === pressao.el) encerraPressao(); });
    // O clique que termina uma pressão longa é consumido (fase de captura): não pinta, não consulta, não abre Detalhes.
    document.addEventListener("click", (ev) => {
      if (Date.now() >= semCliqueAte || !(ev.target.closest && ev.target.closest(".card"))) return;
      semCliqueAte = 0; ev.preventDefault(); ev.stopImmediatePropagation();
    }, true);
    painel.addEventListener("mouseover", (ev) => {
      const cel = ev.target.closest(".cel");
      if (cel && arrasto && cronoSel) {
        const c = +cel.dataset.cel;
        if (!arrasto.visit.has(c)) { arrasto.visit.add(c); alteraCelula(cronoPeriodo, cronoSel, c, arrasto.modo); }
        return;
      }
      const el = ev.target.closest(".card[data-code], .opt[data-code]");
      if (el) destaca(el.dataset.code);
    });
    // teclado: o foco num cartão mostra as ligações dele; ao sair da Grade, o destaque volta ao repouso
    painel.addEventListener("focusin", (ev) => {
      const el = ev.target.closest(".card[data-code]");
      if (el) destaca(el.dataset.code);
    });
    painel.addEventListener("focusout", (ev) => {
      if (ev.relatedTarget && !painel.contains(ev.relatedTarget) && !painel.matches(":hover")) destaqueEmRepouso();
    });
    document.addEventListener("mouseup", () => { arrasto = null; });
    // o mouse limpa o destaque ao sair; com os detalhes abertos (ex.: toque), ele fica na disciplina consultada
    painel.addEventListener("mouseleave", destaqueEmRepouso);

    painel.addEventListener("input", (ev) => {
      if (ev.target.id === "busca-opt") { filtros.busca = ev.target.value; save("filtros", filtros); render(); }
    });
    painel.addEventListener("change", (ev) => {
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
      if (t.classList.contains("fecha-config")) return fechaConfig();
      if (t.closest("#livre-info-btn")) {
        infoLivreAberta = !infoLivreAberta;
        $("#livre-info").hidden = !infoLivreAberta; $("#livre-info-btn").setAttribute("aria-expanded", String(infoLivreAberta));
        return;
      }
      if (t.id === "ferr-mais") { ferrAberto = !ferrAberto; return render(); }
      if (t.dataset.exibir != null && !t.closest("dialog")) {   // Exibir: botões que acendem (Configurações usa caixas nativas)
        exibir[t.dataset.exibir] = !exibir[t.dataset.exibir]; save("exibir", exibir); render(); return atualizaConfig();
      }
      if (t.id === "bg-detalhes") { progressoAberto = !progressoAberto; save("progressoAberto", progressoAberto); return render(); }
      if (t.dataset.pincel != null) { consultado = null; pincel = t.dataset.pincel === "__detalhes" ? null : t.dataset.pincel; seletorECI = false; return render(); }
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
      if (t.id === "consulta-detalhes") {   // ao fechar, o foco volta ao cartão consultado (o botão some com a consulta)
        const c = consultado; consultado = null; $("#paleta").innerHTML = renderPaleta();
        const cartao = c && document.querySelector(`#painel .card[data-code="${CSS.escape(c)}"]`);
        return c && abrePainel({ target: cartao || t, detail: ev.detail }, () => abreDetalhes({ code: c }));
      }
      if (t.id === "editar-tags") return abrePainel(ev, abreEditorTags);
      if (t.id === "cadeado") {
        cadeado = !cadeado; save("cadeado", cadeado); render(); $("#cadeado").focus(); atualizaConfig();
        return anuncia(cadeado ? "Cadeado ligado: as cursadas estão protegidas." : "Cadeado desligado: as cursadas podem ser alteradas.");
      }
      if (t.id === "btn-config") return abreConfiguracoes(t);
      if (t.id === "btn-tema") return window.TEMA && window.TEMA.alterna();
      if (t.id === "btn-referencias") return abrePainel(ev, abreReferencias);
      if (t.id === "btn-tags") return abrePainel(ev, abreEditorTags);
      if (t.id === "btn-limpar") return limpaDados();
      if (t.id === "btn-foco") return alternaFoco();
      if (t.dataset.fixar) {
        const id = t.dataset.fixar;
        atalhos = atalhos.includes(id) ? atalhos.filter((x) => x !== id) : ATALHOS.filter((x) => x === id || atalhos.includes(x));
        save("atalhos", atalhos); renderAtalhos(); atualizaConfig();
        return anuncia(atalhos.includes(id) ? `${infoAtalho(id).nome} fixado na barra.` : `${infoAtalho(id).nome} saiu da barra; continua em Configurações.`);
      }
      if (t.dataset.abrirAtalho) {
        $("#dlg-config").close();
        if (t.dataset.abrirAtalho !== "importar") return ACAO_ATALHO[t.dataset.abrirAtalho]();
        return abrePainel({ target: $("#btn-config"), detail: ev.detail }, abreImportador);   // mesma entrada de foco do atalho; retorno em Configurações
      }
      if (t.id === "btn-importar") return abrePainel(ev, abreImportador);
      if (t.id === "btn-perfil") return abreDialogoPerfil();
      if (t.id === "btn-privacidade") return abrePainel(ev, abrePrivacidade);
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
          + "Os planos, pedidos e a extensão guardados nele também saem" + (declaradasNoNavegador() ? `, e ${textoDeclaradas(declaradasNoNavegador())} também` : "")
          + ". Use \"Baixar perfil.js\" antes, se quiser guardar uma cópia.")) return;
        perfilImportado = null; save("perfilImportado", null); perfil = perfilArquivo || perfilLocalAntigo();
        // As aprovações registradas por você no plano eram do perfil descartado: saem junto, como o aviso disse.
        if (plano.aprovacoesDeclaradas) { delete plano.aprovacoesDeclaradas; save("plano", plano); }
        save("perfilId", null); save("selosAvisados", null);   // substituição: os avisos de conquistas recomeçam
        avisosPerfil.delete("perfil importado");
        montaModelo(); return render();
      }
    });
    document.addEventListener("change", (ev) => {
      const t = ev.target;
      if (t.dataset.declSel) { if (t.checked) selDecl.add(t.dataset.declSel); else selDecl.delete(t.dataset.declSel); return atualizaConfig(); }
      if (t.name === "modo-topo") return defineModo(t.value === "classico");
      if (t.name === "modo") { defineModo(t.value === "classico"); return atualizaConfig(); }
      if (t.id === "cfg-seletor") { ocultarSeletor = !t.checked; save("ocultarSeletor", ocultarSeletor); renderAtalhos(); return atualizaConfig(); }
      if (t.id === "cfg-cadeado") { cadeado = t.checked; save("cadeado", cadeado); render(); return atualizaConfig(); }
      if (t.dataset.exibir) { exibir[t.dataset.exibir] = t.checked; save("exibir", exibir); render(); atualizaConfig(); }
      // Trilha: a chave segmentada da Grade (rádios, como o seletor de modo) e os rádios de Configurações
      if ((t.name === "destaque" || t.name === "trilha") && TRILHAS.includes(t.value)) { exibir.destaque = t.value; save("exibir", exibir); limpaDestaque(); render(); atualizaConfig(); }
      if (t.name === "aparencia" && window.TEMA) { window.TEMA.defineAparencia(t.value); ferrAberto = false; render(); atualizaConfig(); }
      if (t.name === "tema" && window.TEMA) window.TEMA.define(t.value === "sistema" ? null : t.value);
      if (t.name === "tom") { tom = t.value; save("tom", tom); render(); atualizaConfig(); }
      if (t.name === "conquistas") { conquistasFora = t.value === "sempre"; save("conquistasFora", conquistasFora || null); render(); atualizaConfig(); }
    });

    $("#detalhes").addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && ev.target.id === "decl-semestre") { ev.preventDefault(); salvaSemestreDeclarada(ev.target.dataset.declCode); }
    });
    // Folha (≤ 720 px): Tab e Shift+Tab circulam dentro dela.
    $("#detalhes").addEventListener("keydown", (ev) => {
      const box = $("#detalhes");
      if (ev.key !== "Tab" || !box.classList.contains("folha")) return;
      const foc = [...box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((el) => !el.disabled && el.getClientRects().length);
      if (!foc.length) return;
      const primeiro = foc[0], ultimo = foc[foc.length - 1], a = document.activeElement;
      if (ev.shiftKey && (a === primeiro || !foc.includes(a))) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && (a === ultimo || !foc.includes(a))) { ev.preventDefault(); primeiro.focus(); }
    });
    if (midiaFolha.addEventListener) midiaFolha.addEventListener("change", aplicaFolha);
    // Clique fora (decidido no pointerdown) fecha os detalhes da disciplina e o editor de tags; o fundo da folha também.
    // Não fecham: importador, Privacidade e Referências; nem cliques em cartões (abrem outro), na paleta e em diálogos.
    // O fundo da folha fecha no clique, não no pointerdown: assim o fundo continua cobrindo a página até o fim do toque e
    // o clique não atravessa para o cartão de baixo (que abriria outros detalhes).
    $("#detalhes-fundo").addEventListener("click", (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      if (fechaComCliqueFora()) fechaDetalhes();
    });
    document.addEventListener("pointerdown", (ev) => {
      const box = $("#detalhes"), t = ev.target;
      if (box.hidden || !fechaComCliqueFora() || !t.isConnected || box.contains(t) || t.id === "detalhes-fundo") return;
      if (t.closest && t.closest(".card, [data-abrir], #paleta, dialog")) return;
      fechaDetalhes();
    });
    $("#detalhes").addEventListener("click", (ev) => {
      const t = ev.target.closest("button"); if (!t) return;
      if (t.dataset.declSalvar) return salvaSemestreDeclarada(t.dataset.declSalvar);
      if (t.dataset.declRemover) {
        const code = t.dataset.declRemover;
        return removeDeclaradas([code]).then((ok) => { if (ok) { reabreDetalhes(); focaPainel(); } else t.isConnected && t.focus(); });
      }
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
      if (t.id === "escolher-perfil") return $("#importar").click();
      if (t.id === "siga-gerar") return geraPerfilDoSiga();
      if (t.id === "siga-usar" && resultadoImportacao) {
        if (!previaLiberada()) return;
        try {
          usaPerfilImportado(perfilDaImportacao(resultadoImportacao));
          resultadoImportacao = null;
          previaObsoleta = false;
        } catch (e) {
          $("#siga-status").innerHTML = `${esc("Não consegui usar o perfil: " + e.message)} ${htmlRelato()}`;
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
        if (ev.detail === 0) focaPainel();
      }
    });
    $("#detalhes").addEventListener("change", (ev) => {
      const t = ev.target;
      if (t.dataset.tagcor != null) { tags[+t.dataset.tagcor].cor = t.value; return salvaTags(); }
      if (t.dataset.tagnome != null) { tags[+t.dataset.tagnome].nome = t.value.trim() || tags[+t.dataset.tagnome].nome; return salvaTags(); }
      if (t.dataset.tagstatus != null) {
        const tg = tags[+t.dataset.tagstatus]; tg.status = t.value;
        if (tg.barra && (tg.status === "pendente" || tags.some((x) => x !== tg && x.barra && x.status === tg.status))) delete tg.barra;
        return salvaTags();
      }
      if (t.dataset.tagbarra != null) {
        const tg = tags[+t.dataset.tagbarra];
        tags.forEach((x) => { if (x.status === tg.status) delete x.barra; });   // no máximo uma tag por tipo
        if (t.checked) tg.barra = true;
        return salvaTags();
      }
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
      resultadoImportacao.atualEditado = true;
      atualizaPreviaImportacao();
    });
    $("#detalhes").addEventListener("change", (ev) => {
      if (ev.target.name !== "siga-papel" || !resultadoImportacao) return;
      recalculaPapel(resultadoImportacao, Number(ev.target.value));
      avaliaImportacao(resultadoImportacao);
      abreImportador();
      $('input[name="siga-papel"]:checked')?.focus();
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
      const nota = $("#siga-nota-ra19"); if (nota) nota.hidden = !(r.deduzido && r.atualEscolhido.trim() === r.deduzido);
    }

    // Configurações → remoção em lote das declaradas
    document.addEventListener("click", (ev) => {
      const t = ev.target.closest && ev.target.closest("#decl-remover-sel, #decl-remover-conf"); if (!t) return;
      if (t.getAttribute("aria-disabled") === "true") return anuncia($(`#${t.id}-motivo`).textContent);
      const codes = t.id === "decl-remover-sel" ? [...selDecl] : getDecl().filter((d) => M.declaradas.confirmadas[d.code]).map((d) => d.code);
      removeDeclaradas(codes, { titulo: t.id === "decl-remover-sel" ? "Remover selecionadas" : "Remover as já confirmadas pelo SIGA",
        depois: () => { selDecl.clear(); } }).then(() => {
        atualizaConfig();
        // A lista pode ter sumido: o foco vai ao mesmo botão, à lista ou ao título de Configurações (nunca ao body).
        const alvo = document.getElementById(t.id) || $("#dlg-config .cfg-declaradas input") || $("#dlg-config-titulo");
        if (alvo) alvo.focus();
      });
    });
    // Registrar marcações
    document.addEventListener("click", (ev) => {
      const b = ev.target.closest && ev.target.closest("[data-registrar]"); if (!b) return;
      if (b.getAttribute("aria-disabled") === "true") return anuncia(MOTIVO_REGISTRAR);
      if (b.closest("#dlg-config")) { fechaConfig(); return abreRegistro($("#btn-config")); }
      abreRegistro(b);
    });
    const dlgReg = $("#dlg-registrar");
    dlgReg.addEventListener("click", (ev) => {
      const cx = ev.target.closest("[data-reg-code]");
      if (cx && cx.getAttribute("aria-disabled") === "true") { ev.preventDefault(); return anuncia($(`#reg-motivo-${CSS.escape(cx.dataset.regCode)}`).textContent); }
      const t = ev.target.closest("button"); if (!t) return;
      if (t.id === "reg-cancelar" || t.id === "reg-fechar") return fechaRegistro();
      if (t.id === "reg-desfazer") return desfazRegistro();
    });
    dlgReg.addEventListener("change", (ev) => {
      const cx = ev.target.closest("[data-reg-code]"); if (!cx) return;
      if (cx.checked) registro.marcadas.add(cx.dataset.regCode); else registro.marcadas.delete(cx.dataset.regCode);
      atualizaRegistro();
    });
    dlgReg.addEventListener("input", (ev) => {
      if (ev.target.id === "reg-semestre") atualizaRegistro();
      if (ev.target.id === "reg-atual") mensagemCampo("#reg-atual", "");
    });
    $("#registrar-corpo").addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (registro && registro.fase === "escolha") gravaRegistro();
    });
    dlgReg.addEventListener("close", devolveFocoRegistro);   // reserva: fechamentos que não passaram por fechaRegistro
    dlgReg.addEventListener("cancel", (ev) => { ev.preventDefault(); fechaRegistro(); });
    // Clique fora só fecha antes de gravar: o resultado fecha por Fechar ou Esc, para não perder o Desfazer.
    fechaAoClicarFora(dlgReg, () => { if (registro && registro.fase === "escolha") fechaRegistro(); });

    // Criar / editar perfil
    $("#perfil-cancelar").addEventListener("click", () => $("#dlg-perfil").close());
    $("#perfil-semestre").addEventListener("input", () => mensagemCampo("#perfil-semestre", ""));
    $("#form-perfil").addEventListener("submit", (ev) => {
      const erro = salvaPerfilCriado($("#perfil-nome").value, $("#perfil-semestre").value);
      if (erro) { ev.preventDefault(); mensagemCampo("#perfil-semestre", erro); $("#perfil-semestre").focus(); }
    });

    // Configurações é redesenhada a cada abertura; ao fechar, sai do DOM (sem controles duplicados escondidos).
    $("#dlg-config").addEventListener("close", () => {
      if ($("#dlg-config").open) return;   // o evento chega depois: se a pessoa já reabriu, não apaga o conteúdo novo
      $("#config-corpo").innerHTML = "";
      devolveFocoConfig();                 // reserva: fechamentos que não passaram por fechaConfig
    });
    // Esc: fecha pelo mesmo caminho (o foco volta na hora, sem esperar o evento close, que no WebKit chega depois).
    $("#dlg-config").addEventListener("cancel", (ev) => { ev.preventDefault(); fechaConfig(); });
    fechaAoClicarFora($("#dlg-config"), fechaConfig);
    ["#dlg-periodo", "#dlg-confirma"].forEach((s) => fechaAoClicarFora($(s)));
    $("#periodo-cancelar").addEventListener("click", () => $("#dlg-periodo").close());
    $("#form-periodo").addEventListener("submit", criaPeriodo);
    $("#dlg-periodo").addEventListener("close", () => {
      const b = $("#novo-periodo"), a = document.activeElement;
      if ((!a || a === document.body || $("#dlg-periodo").contains(a)) && b) b.focus();
    });
    // Tema: o atalho sol/lua mostra a ação disponível; Configurações acompanha a escolha.
    if (window.TEMA) window.TEMA.aoMudar(() => { renderAtalhos(); atualizaConfig(); });

    // Painel ⋯ (Minimalista): Esc fecha e devolve o foco ao ⋯; clicar fora fecha.
    $("#ferramentas").addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape" || !ferrAberto) return;
      ev.stopPropagation(); ferrAberto = false; render(); $("#ferr-mais")?.focus();
    });
    document.addEventListener("click", (ev) => {
      if (ferrAberto && ev.target.isConnected && !$("#ferramentas").contains(ev.target)) { ferrAberto = false; render(); }
    });
    // Números da barra no Minimalista: o toque mostra e esconde (o foco também mostra).
    document.addEventListener("click", (ev) => {
      const naBarra = ev.target.closest && ev.target.closest(".bg-barra");
      $("#barra-geral").classList.toggle("ver-numeros", !!naBarra && minimalista() && !$("#barra-geral").classList.contains("ver-numeros"));
    });
    document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") $("#barra-geral").classList.remove("ver-numeros"); });
    // Escala de dificuldade em Só ícones: o toque mostra e esconde os nomes (o foco também mostra); o filtro não muda.
    document.addEventListener("click", (ev) => {
      const escala = ev.target.closest && ev.target.closest(".escala-dificuldade.so-icones");
      document.querySelectorAll(".escala-dificuldade.so-icones").forEach((e) => e.classList.toggle("ver-nomes", e === escala && !e.classList.contains("ver-nomes")));
    });
    document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") document.querySelectorAll(".escala-dificuldade.ver-nomes").forEach((e) => e.classList.remove("ver-nomes")); });
    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      if (document.querySelector("dialog[open]")) return;   // o próprio <dialog> trata o Esc
      if (consultado) { consultado = null; $("#paleta").innerHTML = renderPaleta(); return; }
      if (seletorECI) { seletorECI = false; render(); return; }
      if (pincel !== null && !modoClassico) { pincel = null; render(); }
      fechaDetalhes();
      if (cronoSel) { cronoSel = null; render(); }
    });

    document.querySelectorAll(".abas [data-vista]").forEach((b) => b.addEventListener("click", () => {
      vistaAtual = b.dataset.vista; save("vista", vistaAtual); fechaDetalhes(); render();
    }));
    // Abas: setas, Home e End movem e ativam a aba (foco móvel: só a aba ativa entra na ordem de Tab).
    $(".abas").addEventListener("keydown", (ev) => {
      const abas = [...document.querySelectorAll(".abas [role=tab]:not([hidden])")];
      const i = abas.indexOf(document.activeElement); if (i < 0) return;
      const j = { ArrowRight: (i + 1) % abas.length, ArrowLeft: (i + abas.length - 1) % abas.length, Home: 0, End: abas.length - 1 }[ev.key];
      if (j == null) return;
      ev.preventDefault(); abas[j].focus(); abas[j].click();
    });

  }

  /** "Ou carregar um perfil pronto": aceita perfil.js (window.PERFIL = {...}) ou JSON puro. */
  function importaArquivoPerfil(input) {
    const f = input.files[0]; if (!f) return;
    f.text().then(async (txt) => {
      const m = txt.match(/^\s*window\.PERFIL\s*=\s*/m);
      const obj = JSON.parse((m ? txt.slice(m.index + m[0].length) : txt).replace(/;\s*$/, ""));
      const erro = erroPerfil(obj);     // arquivo inválido: recusado antes de perguntar ou de mexer em qualquer coisa
      if (erro) throw new Error(`perfil com campos inválidos (${erro}). Confira a estrutura em docs/PERFIL.md`);
      // Avisa pelas declaradas que efetivamente sairiam: as deste navegador que o arquivo não traz.
      const novas = new Set(window.PROGRESSO.normalizaDeclaradas(obj.aprovacoesDeclaradas || []).itens.map((d) => d.code));
      const saem = declaradasNoNavegador() ? getDecl().filter((d) => !novas.has(d.code)).map((d) => d.code) : [];
      const n = saem.length;
      if (n && !(await confirma({ titulo: "Trocar de perfil", ok: "Usar o arquivo",
        texto: `${textoDeclaradas(n)} (${saem.join(", ")}) não ${n === 1 ? "está" : "estão"} no arquivo e ${n === 1 ? "sai" : "saem"} com o perfil salvo. Use Exportar perfil.js antes, se quiser guardar uma cópia.` }))) return;
      // Outro perfil: os avisos de conquistas recomeçam, mas só depois que a troca deu certo.
      const idAntes = load("perfilId", null), avisosAntes = load("selosAvisados", null);
      save("perfilId", null); save("selosAvisados", null);
      try { usaPerfilImportado(obj); } catch (e) { save("perfilId", idAntes); save("selosAvisados", avisosAntes); throw e; }
    }).catch((e) => alert("Não consegui ler o perfil: " + e.message + "\n(O conteúdo precisa ser JSON válido, com chaves entre aspas.)"));
    input.value = "";
  }

  // Ganchos para testes e para quem quiser depurar no console do navegador.
  window.GradeInterativa = { carregaPdfJs, linhasPDF, perfilExportado: () => perfilExportado(), totais: () => totais(), fonte: (c) => fonteDe(c),
    motivacao: () => JSON.parse(JSON.stringify(calculaMotivacao())),
    declaradas: () => JSON.parse(JSON.stringify({ ativas: M.declaradas.ativas, confirmadas: M.declaradas.confirmadas, conflitos: M.declaradas.conflitos, notas: M.declaradas.notas })),
    avisoOferta: (c, p) => avisoOferta(c, p), avisos: (c, nome) => { const p = M.periodos.find((x) => x.nome === nome); return p ? avisos(c, p.semestre) : null; } };

  // Rodapé: data da conferência do currículo com o SIGA (campo `consultado` de js/database.js).
  const conferido = (window.curriculoSIGA || {})[1];
  if (conferido && conferido.consultado) $("#curriculo-conferido").textContent = `Currículo conferido no SIGA em ${conferido.consultado}`;
  // A paleta também é fixa: a rolagem por foco reserva o espaço dela (scroll-padding) e o painel de detalhes fica acima dela.
  const paletaEl = $("#paleta");
  // Nem todo navegador respeita scroll-padding na rolagem por foco (o Firefox não): confere e corrige o que ficou sob a paleta.
  document.addEventListener("focusin", (ev) => {
    const el = ev.target;
    if (!(el instanceof HTMLElement) || el.closest(".paleta, #detalhes, dialog")) return;
    // Só o foco de teclado: rolar a página no foco por clique (o WebKit foca o contêiner) faz o clique se perder.
    if (el === painelRef || !el.matches(":focus-visible")) return;
    requestAnimationFrame(() => {
      if (!el.isConnected || document.activeElement !== el) return;
      const alvo = el.matches(".seletor-modo input, .seletor-trilha input") ? el.closest("label") : el;
      const r = alvo.getBoundingClientRect();
      const topo = 0;
      const base = paletaEl && !paletaEl.hidden && paletaEl.offsetHeight ? paletaEl.getBoundingClientRect().top - 8 : innerHeight;
      if (r.height > base - topo) return;
      if (r.top < topo) window.scrollBy({ top: r.top - topo, behavior: "instant" });
      else if (r.bottom > base) window.scrollBy({ top: r.bottom - base, behavior: "instant" });
    });
  });
  if (paletaEl && "ResizeObserver" in window) new ResizeObserver(() => document.documentElement.style.setProperty("--paleta-h", (paletaEl.hidden ? 0 : paletaEl.offsetHeight) + "px")).observe(paletaEl);

  montaModelo();
  liga();
  render();
})();
