/*
 * conquistas.js — Fase do curso, conquistas (selos) e previsão de formatura, sem DOM e sem armazenamento.
 * Funciona no navegador (window.CONQUISTAS) e no Node (require), para os testes diretos em testes/progresso.js.
 *
 * js/app.js monta o contexto com dados explícitos (fonte de cada aprovação, créditos e horas por fonte, períodos do
 * Histórico, níveis do guia, dependências) e desenha o resultado. Tudo é recalculado do perfil atual a cada vez.
 *
 * Fontes, da mais forte para a mais fraca: importado (registro do perfil) · declarado (registrada por você) ·
 * previsto · pincel. Dá selo o importado; o declarado dá selo com "· declarado". Prevista e pincel só mostram
 * "quase lá", com a origem. Regras de "mesmo período" usam só períodos do Histórico (semestre declarado não vale).
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.CONQUISTAS = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const FONTES = ["importado", "declarado", "previsto", "pincel"];
  /** "falta 1 obrigatória" / "faltam 3 obrigatórias" (concordância com N variável). */
  const faltam = (n, um, varios = um) => `${n === 1 ? "falta" : "faltam"} ${n} ${n === 1 ? um : varios}`.trimEnd();
  const rank = (f) => { const i = FONTES.indexOf(f); return i < 0 ? 99 : i; };

  // ---------- Fase do curso ----------
  /**
   * Calouro: menos de 25% e até dois semestres do Histórico do curso atual (sem bloco de transferidas, período em
   * curso nem semestre declarado). Veterano: 75% ou mais. O resto é meio de curso (25% exatos = meio).
   * Sem Histórico, só o percentual decide. A precisão é a do cálculo; arredonda-se só na tela.
   */
  function fase(pct, semestres) {
    if (pct >= 0.75) return "veterano";
    if (pct < 0.25 && (semestres == null || semestres <= 2)) return "calouro";
    return "meio";
  }
  /** Fase com as declaradas e, se ela muda sem elas, a marca "declarado". */
  function faseDoCurso({ pctComDeclaradas, pctImportado, semestres }) {
    const f = fase(pctComDeclaradas, semestres);
    return { fase: f, pct: pctComDeclaradas, declarado: f !== fase(pctImportado, semestres) };
  }
  /** Percentual do curso até a fonte de índice `n` (0 = só importado), com cada grupo limitado ao seu total. */
  function percentual(creditos, totais, n) {
    let feito = 0, total = 0;
    Object.keys(totais).forEach((k) => {
      const c = creditos[k] || {};
      const soma = FONTES.slice(0, n + 1).reduce((a, f) => a + (c[f] || 0), 0);
      feito += Math.min(soma, totais[k]); total += totais[k];
    });
    return total ? feito / total : 0;
  }

  // ---------- Selos ----------
  const LISTAS = [
    ["rei-calculos", "👑", "Rei dos Cálculos", "linhas", ["MAC118", "MAC128", "MAC238", "MAC248"]],
    ["valeu-einstein", "🧠", "Valeu, Einstein", "linhas", ["FIT112", "FIT122", "FIM230", "FIM240"]],
    ["mao-na-massa", "🔬", "Mão na massa", "linhas", ["FIS111", "FIS121", "FIN231", "FIN241"]],
    ["transistor-so", "⚡", "Do transistor ao SO", "linhas", ["EEL280", "EEL480", "EEL580", "EEL770"]],
    ["hello-world", "👋", "Hello, world", "linhas", ["COS110"]],
    ["matematico-raiz", "🧮", "Matemático de raiz", "linhas", ["MAE125", "COS351", "EEL881", "COS242"]],
    ["ping-0ms", "📶", "Ping 0 ms", "linhas", ["EEL878", "EEL879"]],
    ["select-aprovadas", "🗄️", "SELECT * FROM aprovadas", "linhas", ["EEL871", "COS480"]],
    ["nazare-confusa", "😵‍💫", "Nazaré confusa", "linhas", ["COS351", "EEL881"]],
  ];
  const GRUPOS = { linhas: "Linhas de matérias", dificeis: "Matérias difíceis", etapas: "Etapas do curso", extras: "Extras" };
  const PG = "EEWX00", ESTAGIO = "EEWU00";

  /**
   * Avalia todos os selos.
   * @param {object} c contexto
   * @param {(code: string) => string|null} c.fonte    fonte da aprovação do código
   * @param {string[]} c.codigos                       códigos com algum registro ou marcação
   * @param {(code: string) => number|null} c.nivel    nível de dificuldade do guia (1 a 5)
   * @param {object} c.deps                            código -> disciplinas que ele libera
   * @param {Array} c.grade                            currículo (code, semester, category)
   * @param {object} c.creditos                        grupo (1 a 4) -> { importado, declarado, previsto, pincel }
   * @param {object} c.totais                          grupo (1 a 4) -> total de créditos do currículo
   * @param {object} c.ace                             { importado, declarado, previsto, pincel } horas de ACE
   * @param {number} c.aceTotal                        horas de ACE do currículo
   * @param {Array} c.historico                        períodos do Histórico: [{ nome, itens: [{ code, status }] }]
   * @param {object} c.fenix                           { importado: bool, declarado: bool }
   * @param {boolean} c.planejamentoCompleto           as disciplinas que faltam estão no Cronograma (selo do Notion)
   */
  function avaliaSelos(c) {
    const ok = (code, n) => rank(c.fonte(code)) <= n;
    const nome = (code) => (c.nomeDe ? c.nomeDe(code) : code);
    const pct = (n) => percentual(c.creditos, c.totais, n);
    const ace = (n) => FONTES.slice(0, n + 1).reduce((a, f) => a + (c.ace[f] || 0), 0);
    const cred = (k, n) => FONTES.slice(0, n + 1).reduce((a, f) => a + ((c.creditos[k] || {})[f] || 0), 0);
    const aprovadas = (n) => c.codigos.filter((code) => ok(code, n));
    const duras = (n, min) => aprovadas(n).filter((code) => (c.nivel(code) || 0) >= min);
    const basico = c.grade.filter((x) => x.code && x.category === 1 && x.semester <= 4).map((x) => x.code);
    const hist = c.historico || [];
    const calma = hist.some((p) => { const h = p.itens.filter((it) => (c.nivel(it.code) || 0) >= 4); return h.length >= 2 && h.every((it) => it.status === "aprovado"); });
    const taPago = hist.some((p) => p.itens.length > 0 && p.itens.every((it) => it.status === "aprovado"));
    const cafe = hist.some((p) => p.itens.filter((it) => it.status === "aprovado").length >= 5);
    const falta = (lista, n = 1) => lista.filter((code) => !ok(code, n));

    // Cada regra: passa(n) para n = 0 (importado) a 3 (pincel); `fixo` = só registrado (Histórico ou plano).
    const regras = [
      ...LISTAS.map(([id, emoji, titulo, grupo, codes]) => ({ id, emoji, titulo, grupo, regra: codes.map(nome).join(", "),
        passa: (n) => codes.every((x) => ok(x, n)), progresso: () => (codes.length - falta(codes).length) / codes.length,
        falta: () => `falta ${falta(codes).map(nome).join(", ")}` })),
      { id: "sobrevivente", emoji: "💀", titulo: "Sobrevivente", grupo: "dificeis", regra: "Uma aprovação numa 🔴 Morte instantânea",
        passa: (n) => duras(n, 5).length >= 1, progresso: () => 0, falta: () => "falta uma 🔴 aprovada" },
      { id: "casca-grossa", emoji: "🛡️", titulo: "Casca grossa", grupo: "dificeis", regra: "Três aprovações em 🟠 ou 🔴",
        passa: (n) => duras(n, 4).length >= 3, progresso: () => Math.min(duras(1, 4).length, 3) / 3,
        falta: () => `${faltam(3 - Math.min(duras(1, 4).length, 3), "em 🟠 ou 🔴")}` },
      { id: "calma-calabreso", emoji: "🧘", titulo: "Calma, Calabreso", grupo: "dificeis", regra: "Duas ou mais 🟠/🔴 no mesmo período do Histórico, todas aprovadas",
        fixo: true, passa: () => calma, progresso: () => 0, falta: () => "um período do Histórico com duas 🟠/🔴 aprovadas" },
      { id: "fenix", emoji: "🐦‍🔥", titulo: "Fênix", grupo: "dificeis", regra: "Aprovação numa disciplina com reprovação anterior",
        passa: (n) => (n >= 0 && c.fenix.importado) || (n >= 1 && c.fenix.declarado), progresso: () => 0, falta: () => "passar numa que já reprovou" },
      { id: "ciclo-basico", emoji: "🧱", titulo: "Ciclo básico fechado", grupo: "etapas", regra: "Todas as obrigatórias do 1º ao 4º período",
        passa: (n) => basico.every((x) => ok(x, n)), progresso: () => (basico.length - falta(basico).length) / basico.length,
        falta: () => `${faltam(falta(basico).length, "obrigatória", "obrigatórias")} do 1º ao 4º` },
      { id: "metade", emoji: "⛰️", titulo: "Metade do caminho", grupo: "etapas", regra: "50% do curso",
        passa: (n) => pct(n) >= 0.5, progresso: () => Math.min(pct(1) / 0.5, 1), falta: () => faltam(Math.ceil((0.5 - pct(1)) * totalCr(c)), "cr") },
      { id: "extensao", emoji: "🌍", titulo: "Extensão em dia", grupo: "etapas", regra: `${c.aceTotal} h de ACE`,
        passa: (n) => ace(n) >= c.aceTotal, progresso: () => Math.min(ace(1) / c.aceTotal, 1), falta: () => faltam(c.aceTotal - ace(1), "h de ACE") },
      { id: "creditos-completos", emoji: "🏁", titulo: "Créditos completos", grupo: "etapas", regra: `Os ${totalCr(c)} cr do currículo`,
        passa: (n) => pct(n) >= 1, progresso: () => pct(1), falta: () => faltam(Math.ceil((1 - pct(1)) * totalCr(c)), "cr"),
        nota: () => (ace(1) < c.aceTotal ? `falta ACE: ${c.aceTotal - ace(1)} h` : "") },
      { id: "acabou", emoji: "🎓", titulo: "Acabou! Acabou!", grupo: "etapas", regra: "Créditos, ACE, Projeto de Graduação e Estágio",
        passa: (n) => pct(n) >= 1 && ace(n) >= c.aceTotal && ok(PG, n) && ok(ESTAGIO, n), progresso: () => (pct(1) + Math.min(ace(1) / c.aceTotal, 1)) / 2,
        falta: () => [pct(1) < 1 ? `${Math.ceil((1 - pct(1)) * totalCr(c))} cr` : "", ace(1) < c.aceTotal ? `${c.aceTotal - ace(1)} h de ACE` : "",
          !ok(PG, 1) ? "Projeto de Graduação" : "", !ok(ESTAGIO, 1) ? "Estágio" : ""].filter(Boolean).join(", ").replace(/^/, "falta ") },
      { id: "ta-pago", emoji: "💪", titulo: "Tá pago", grupo: "extras", regra: "Um período do Histórico inteiro aprovado",
        fixo: true, passa: () => taPago, progresso: () => 0, falta: () => "um período do Histórico todo aprovado" },
      { id: "receba", emoji: "🫴", titulo: "Receba!", grupo: "extras", regra: "Uma aprovação que libera pelo menos três disciplinas",
        passa: (n) => aprovadas(n).some((x) => (c.deps[x] || []).length >= 3), progresso: () => 0, falta: () => "aprovar uma que libera três ou mais" },
      { id: "movido-cafe", emoji: "☕", titulo: "Movido a café", grupo: "extras", regra: "Cinco ou mais aprovações no mesmo período do Histórico",
        fixo: true, passa: () => cafe, progresso: () => 0, falta: () => "cinco aprovações num período do Histórico" },
      { id: "colecionador", emoji: "📚", titulo: "Colecionador", grupo: "extras", regra: `Todos os ${c.totais[2] || 0} cr de optativas`,
        passa: (n) => cred(2, n) >= (c.totais[2] || 0), progresso: () => Math.min(cred(2, 1) / (c.totais[2] || 1), 1),
        falta: () => faltam(Math.max(0, (c.totais[2] || 0) - cred(2, 1)), "cr de optativas") },
      { id: "notion", emoji: "🗂️", titulo: "Quer organizar o Notion e o código também não???", grupo: "extras",
        regra: "As disciplinas que faltam estão planejadas no Cronograma", fixo: true, plano: true,
        passa: () => !!c.planejamentoCompleto, progresso: () => 0, falta: () => "planejar no Cronograma as disciplinas que faltam" },
    ];
    const res = regras.map((r) => {
      const base = { id: r.id, emoji: r.emoji, titulo: r.titulo, grupo: r.grupo, regra: r.regra };
      const lim = r.fixo ? 0 : 3;
      let n = 0; while (n <= lim && !r.passa(n)) n++;
      if (n > lim) return { ...base, estado: "falta", falta: r.falta(), progresso: r.progresso() };
      if (n === 0) return { ...base, estado: "obtido", declarado: false, nota: r.nota ? r.nota() : "" };
      if (n === 1) return { ...base, estado: "obtido", declarado: true, nota: r.nota ? r.nota() : "" };
      if (n === 2) return { ...base, estado: "quase", origem: "prevista", falta: r.falta(), progresso: r.progresso() };
      if (n === 3) return { ...base, estado: "quase", origem: "simulação ✎", falta: r.falta(), progresso: r.progresso() };
      return { ...base, estado: "falta", falta: r.falta(), progresso: r.progresso() };
    });
    // É tetra!: quatro conquistas (com "· declarado" se só chega a quatro com as declaradas).
    const obtidos = res.filter((s) => s.estado === "obtido");
    const so = obtidos.filter((s) => !s.declarado).length;
    const tetra = { id: "tetra", emoji: "🏆", titulo: "É tetra!", grupo: "extras", regra: "Quatro conquistas desbloqueadas" };
    res.splice(res.findIndex((s) => s.id === "notion"), 0, so >= 4 ? { ...tetra, estado: "obtido", declarado: false, nota: "" }
      : obtidos.length >= 4 ? { ...tetra, estado: "obtido", declarado: true, nota: "" }
      : { ...tetra, estado: "falta", falta: faltam(4 - obtidos.length, "conquista", "conquistas"), progresso: obtidos.length / 4 });
    return res;
  }
  const totalCr = (c) => Object.values(c.totais).reduce((a, b) => a + b, 0);

  /** Próximo marco: o selo ainda não obtido mais perto de sair (quase lá primeiro; empate pela ordem da tabela). */
  function proximoMarco(selos) {
    const cand = selos.filter((s) => s.estado !== "obtido");
    const peso = (s) => (s.estado === "quase" ? 2 : 0) + (s.progresso || 0);
    return cand.reduce((m, s) => (!m || peso(s) > peso(m) ? s : m), null);
  }

  // ---------- Cobertura do que falta pelo plano (previsão de formatura e selo do Notion) ----------
  /**
   * O cumprido vem só das fontes registradas (importado e registrado por você); créditos manuais, pincel e prevista
   * não entram. O que falta é coberto pelo plano elegível (período atual e planejados), em ordem cronológica: cada
   * disciplina conta uma vez, na primeira ocorrência, e as horas de ACE planejadas contam no semestre delas.
   * @param {object} e
   * @param {object} e.grupos         grupo ("1" a "4" em cr, "5" ACE em h) -> { nome, un, total, cumprido }
   * @param {Array} e.obrigatorias    obrigatórias que ainda faltam: [{ code, nome }]
   * @param {Array} e.itens           itens do plano: [{ code, origem, grupo, valor, semestre }] (semestre null = sem data)
   * @param {Array} e.horasAce        extensão planejada: [{ horas, semestre }]
   * @returns {{ grupos, semPlano, primeiro, semData, disciplinasPlanejadas, concluido }}
   *   primeiro: o primeiro semestre em que tudo fica coberto (null se não fica); semData: só fica com itens sem data
   */
  function coberturaDoPlano({ grupos, obrigatorias, itens, horasAce, semestreAtual = null }) {
    const falta = {}; Object.entries(grupos).forEach(([k, g]) => { falta[k] = Math.max(0, g.total - g.cumprido); });
    // Plano em semestre anterior ao atual não cobre nada: fica listado para o aviso.
    const passou = (x) => semestreAtual != null && x.semestre != null && x.semestre < semestreAtual;
    const noPassado = [...new Set([...itens.filter(passou).map((it) => it.periodo || nomeSem(it.semestre)),
      ...(horasAce || []).filter(passou).map((h) => nomeSem(h.semestre))])].sort();
    itens = itens.filter((it) => !passou(it));
    horasAce = (horasAce || []).filter((h) => !passou(h));
    // Ordem fixa: semestre, código e, quando dois itens dão o mesmo código no mesmo semestre, a origem de menor código.
    const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
    const ordem = (a, b) => (a.semestre ?? Infinity) - (b.semestre ?? Infinity) || cmp(String(a.code || ""), String(b.code || ""))
      || cmp(String(a.origem || ""), String(b.origem || ""));
    const vistos = new Set(), plano = [];
    itens.slice().sort(ordem).forEach((it) => {
      if (it.code && vistos.has(it.code)) return;
      if (it.code) vistos.add(it.code);
      plano.push(it);
    });
    (horasAce || []).forEach((h) => plano.push({ grupo: "5", valor: h.horas, semestre: h.semestre }));
    const precisa = new Set(obrigatorias.map((o) => o.code));
    const cobreAte = (lim) => {
      const acc = {}, ob = new Set();
      plano.forEach((it) => {
        if (lim !== "tudo" && (it.semestre == null || it.semestre > lim)) return;
        acc[it.grupo] = (acc[it.grupo] || 0) + (it.valor || 0);
        if (precisa.has(it.code)) ob.add(it.code);
      });
      return { acc, ob };
    };
    const coberto = ({ acc, ob }, grupoOk = () => true) => ob.size === precisa.size
      && Object.keys(falta).filter(grupoOk).every((k) => (acc[k] || 0) >= falta[k]);
    const total = cobreAte("tudo");
    const semestres = [...new Set(plano.map((it) => it.semestre).filter((s) => s != null))].sort((a, b) => a - b);
    const primeiro = semestres.find((s) => coberto(cobreAte(s))) ?? null;
    const saida = {};
    Object.entries(grupos).forEach(([k, g]) => { saida[k] = { nome: g.nome, un: g.un, falta: falta[k], planejado: total.acc[k] || 0 }; });
    return {
      grupos: saida,
      semPlano: obrigatorias.filter((o) => !total.ob.has(o.code)).map((o) => o.nome),
      primeiro, semData: primeiro == null && coberto(total),
      disciplinasPlanejadas: coberto(total, (k) => k !== "5"),
      concluido: !precisa.size && Object.values(falta).every((f) => f <= 0),
      noPassado,
    };
  }

  // ---------- Previsão de formatura (C4) ----------
  /**
   * Só aparece quando o Cronograma cobre tudo o que falta: créditos de cada grupo, obrigatórias (com Projeto de
   * Graduação e Estágio) e ACE em horas. Cada disciplina conta uma vez, mesmo planejada em vários períodos.
   * @param {object} e
   * @param {boolean} e.perfil, e.temAtual
   * @param {object} e.grupos       grupo -> { nome, un, falta, planejado }
   * @param {string[]} e.obrigatoriasSemPlano  obrigatórias que faltam e não estão no plano (nomes)
   * @param {number|null} e.ultimoSemestre     semestre (índice) do último período com algo necessário
   * @param {boolean} e.semDataNecessaria      algo necessário está num período sem semestre
   * @param {string[]} [e.noPassado]          períodos do plano que já passaram (não contam; o texto avisa)
   * @param {(i: number) => string} e.nomeDoSemestre
   */
  function previsaoFormatura(e) {
    if (!e.perfil) return { estado: "indisponivel", texto: "Importe ou crie um perfil para ver a previsão de formatura." };
    if (!e.temAtual) return { estado: "indisponivel", texto: "Sem período atual no perfil: a previsão precisa saber de onde partir." };
    const grupos = Object.values(e.grupos);
    if (grupos.every((g) => g.falta <= 0) && !e.obrigatoriasSemPlano.length) return { estado: "concluido", texto: "Você já cumpriu tudo o que a Grade modela." };
    const pend = grupos.filter((g) => g.falta > g.planejado).map((g) => `${fmtN(g.falta - g.planejado)} ${g.un} de ${g.nome}`);
    const passado = e.noPassado && e.noPassado.length
      ? ` O plano em ${e.noPassado.join(", ")} está num período que já passou e não conta: mova para o atual ou um futuro.` : "";
    if (e.obrigatoriasSemPlano.length || pend.length) {
      const cr = grupos.filter((g) => g.un === "cr").reduce((a, g) => a + Math.max(0, g.falta - g.planejado), 0);
      const ob = e.obrigatoriasSemPlano;
      const nomes = ob.length > 5 ? [...ob.slice(0, 5), `e mais ${ob.length - 5} obrigatórias`] : ob;
      return { estado: "pendente", cr, texto: `${cr ? `Planeje os ${fmtN(cr)} cr que faltam` : "Planeje o que falta"}: ${[...nomes, ...pend].join(", ")}.${passado}` };
    }
    if (e.semDataNecessaria || e.ultimoSemestre == null) return { estado: "indisponivel", texto: "Algo necessário no plano está sem semestre (um período ou horas de ACE): não dá para calcular a previsão." };
    return { estado: "previsao", semestre: e.nomeDoSemestre(e.ultimoSemestre), texto: `No seu plano, você forma em ${e.nomeDoSemestre(e.ultimoSemestre)} (estimativa).${passado}` };
  }
  const nomeSem = (i) => i == null ? null : `${Math.floor(i / 2)}/${(i % 2) + 1}`;
  const fmtN = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));   // texto em pt-BR: vírgula decimal

  return { FONTES, fase, faseDoCurso, percentual, avaliaSelos, proximoMarco, coberturaDoPlano, previsaoFormatura, GRUPOS, PG, ESTAGIO };
});
