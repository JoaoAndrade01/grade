/*
 * progresso.js — Cálculo do progresso sem DOM e sem armazenamento. Funciona no navegador (window.PROGRESSO) e no
 * Node (require), para os testes diretos em testes/progresso.js.
 *
 * Recebe dados explícitos (currículo, catálogo, períodos do perfil, edições e pedidos) e devolve os registros por
 * código (`regs`), os períodos do modelo e o estado das equivalências e dispensas. js/app.js junta esse resultado
 * com as preferências da tela (marcações, tags, filtros) e desenha. A prévia do importador usa a mesma montagem.
 *
 * Fontes de uma aprovação (barra, fase e selos distinguem):
 *   importado  registro do perfil (histórico, dispensa, equivalência deferida)
 *   declarado  "Aprovação registrada por você" (aprovacoesDeclaradas), sem registro importado do mesmo código;
 *              também a equivalência deferida cuja origem é declarada
 *   previsto   aprovação prevista (status "previsto")
 *   pincel     marcação do pincel com tag de tipo "aprovado", sem registro
 *
 * Aprovações registradas por você (aprovacoesDeclaradas): cada uma vira um registro num período virtual do modelo
 * ("Registradas por você"), sem semestre próprio; o semestre informado fica em `semestreDeclarado`. O registro
 * importado vence a declarada; a declarada vence previsão e plano; uma reprovação do SIGA no semestre da declarada
 * ou depois (sem semestre: o de `registradoEm`) é conflito e a declarada não conta. Nada é apagado aqui.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.PROGRESSO = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const FORCA = { pendente: 0, reprovado: 1, analise: 1.5, planejado: 2, cursando: 3, previsto: 4, aprovado: 5 };
  const DIAS = ["seg", "ter", "qua", "qui", "sex"];
  const semestreValido = (v) => typeof v === "string" && /^\d{4}\/[12]$/.test(v);
  const semIdx = (nome) => semestreValido(nome) ? Number(nome.slice(0, 4)) * 2 + Number(nome[5]) - 1 : null;
  // Bloco de transferidas: "AAAA (transferidas)" ou "AAAA/0" (só o ano, sem semestre real).
  const anoDoBloco = (nome) => { const m = /^(\d{4})(?: \(transferidas\)|\/0)$/.exec(nome || ""); return m ? +m[1] : null; };
  const emCurso = (s) => s === "planejado" || s === "cursando";

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

  // Um pedido pode juntar várias cursadas: [{code, papel: "conteudo" | "horas"}]
  const cursadasDe = (e) => Array.isArray(e.cursadas)
    ? e.cursadas.map((c) => (typeof c === "string" ? { code: c, papel: "conteudo" } : c)).filter((c) => c && c.code)
    : (e.cursada ? [{ code: e.cursada, papel: "conteudo" }] : []);
  const pendente = (e) => { const st = e.status || "a pedir"; return st === "a pedir" || st === "em análise"; };

  const dataValida = (v) => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v);
  /** Semestre (índice de `semIdx`) de uma data AAAA-MM-DD: janeiro a junho = /1. */
  const semestreDaData = (d) => dataValida(d) ? Number(d.slice(0, 4)) * 2 + (Number(d.slice(5, 7)) <= 6 ? 0 : 1) : null;
  const nomeDoSemestre = (i) => i == null ? null : `${Math.floor(i / 2)}/${(i % 2) + 1}`;
  const NOME_DECL = "Registradas por você";

  /**
   * Semestre real de um registro (índice de `semIdx`), ou null. Único ponto que diz "quando" um registro aconteceu:
   * o semestre do período ou, no período virtual das aprovações registradas por você, o semestre informado.
   */
  function semestreDoRegistro(r, periodos) {
    if (!r) return null;
    const p = periodos[r.pi];
    if (p && p.declarado) return semIdx(r.semestreDeclarado);
    return p ? p.semestre : null;
  }
  /** Semestre de um período do Histórico (nem declarado nem bloco de transferidas): regras de "mesmo período" (selos). */
  function semestreDoHistorico(r, periodos) {
    const p = r && periodos[r.pi];
    return p && !p.declarado && r.origem !== "declarado" ? p.semestre : null;
  }

  const CODIGO = /^[A-Z]{3}[A-Z0-9]{3}$/;
  /** Erro de formato de uma aprovação declarada (caminho do campo), ou null. */
  function erroDeclarada(d, caminho) {
    if (d == null || typeof d !== "object" || Array.isArray(d)) return caminho;
    const opc = (v, ok) => v == null || ok(v);
    const num = (v) => Number.isFinite(v) && v >= 0;
    const campos = {
      code: (v) => typeof v === "string" && CODIGO.test(v), registradoEm: (v) => opc(v, dataValida), semestre: (v) => opc(v, semestreValido),
      name: (v) => opc(v, (x) => typeof x === "string"), credits: (v) => opc(v, num), horas: (v) => opc(v, num),
      category: (v) => opc(v, (c) => [1, 2, 3, 4, 5].includes(c)),
    };
    const k = Object.keys(campos).find((c) => !campos[c](d[c]));
    return k ? `${caminho}.${k}` : null;
  }
  /** Lista tolerante: itens válidos (um por código, vale o último) e quantos foram ignorados por formato inválido. */
  function normalizaDeclaradas(lista) {
    if (!Array.isArray(lista)) return { itens: [], ignoradas: lista == null ? 0 : 1 };
    const porCodigo = new Map(); let ignoradas = 0;
    lista.forEach((d) => {
      if (erroDeclarada(d, "item")) { ignoradas++; return; }
      porCodigo.delete(d.code); porCodigo.set(d.code, d);
    });
    return { itens: [...porCodigo.values()], ignoradas };
  }

  /**
   * Classifica cada declarada contra os registros que não são declarados (regs de um modelo, sem as declaradas).
   * @returns {{ ativas: Array, confirmadas: object, conflitos: object, notas: object }}
   *   ativas       declaradas que contam (com a nota da reprovação anterior ou do curso em andamento, se houver)
   *   confirmadas  código -> { semestre, nome, via, diverge } quando há aprovação importada (vale o SIGA)
   *   conflitos    código -> { semestre, nome } quando o SIGA traz reprovação no semestre declarado ou depois
   *   notas        código -> { tipo: "reprovacao-antes" | "cursando", semestre, nome }
   */
  function classificaDeclaradas(declaradas, regs, periodos) {
    const ativas = [], confirmadas = {}, conflitos = {}, notas = {};
    const sem = (r) => semestreDoRegistro(r, periodos);
    declaradas.forEach((d) => {
      const rs = (regs[d.code] || []).filter((r) => r.origem !== "declarado");
      const informado = semIdx(d.semestre);
      const limite = informado ?? semestreDaData(d.registradoEm);
      const aprovadas = rs.filter((r) => r.status === "aprovado");
      if (aprovadas.length) {
        // Vale o SIGA. O bloco de transferidas é confirmação: compara-se só com `aprovadaEm`, quando houver (A8).
        const r = aprovadas[aprovadas.length - 1];
        const p = periodos[r.pi];
        const doSiga = sem(r) ?? (p && anoDoBloco(p.nome) != null ? semIdx(r.aprovadaEm) : null);
        confirmadas[d.code] = { semestre: doSiga, nome: doSiga != null ? nomeDoSemestre(doSiga) : p ? p.nome : null, via: r.via || null,
          diverge: informado != null && doSiga != null && doSiga !== informado };
        return;
      }
      const reprov = rs.filter((r) => r.status === "reprovado" && sem(r) != null);
      const depois = limite == null ? [] : reprov.filter((r) => sem(r) >= limite);
      if (depois.length) {
        const s = Math.min(...depois.map(sem));
        conflitos[d.code] = { semestre: s, nome: nomeDoSemestre(s) };
        return;
      }
      if (reprov.length) {
        const s = Math.max(...reprov.map(sem));
        notas[d.code] = { tipo: "reprovacao-antes", semestre: s, nome: nomeDoSemestre(s) };
      }
      const cur = rs.find((r) => r.status === "cursando");
      if (cur && !notas[d.code]) notas[d.code] = { tipo: "cursando", semestre: sem(cur), nome: periodos[cur.pi] ? periodos[cur.pi].nome : null };
      ativas.push(d);
    });
    return { ativas, confirmadas, conflitos, notas };
  }

  /**
   * Monta os registros por código a partir dos dados do perfil.
   * @param {object} e
   * @param {Array} e.grade        currículo do curso (com `idx` e `category`)
   * @param {Array} e.catalogo     optativas fora do currículo
   * @param {Array} e.periodos     períodos do perfil já filtrados (removidos) e com os novos do plano
   * @param {object} e.editados    nome do período -> itens editados no navegador
   * @param {Array} e.pedidos      pedidos de equivalência
   * @param {Array} e.declaradas   aprovações registradas por você, já normalizadas (normalizaDeclaradas)
   */
  function montaRegistros({ grade, catalogo, periodos: base, editados = {}, pedidos = [], declaradas = [] }) {
    const curr = {};
    grade.forEach((c) => { if (c.code && !curr[c.code]) curr[c.code] = c; });
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

    const periodos = base.map((p, pi) => {
      const tipo = p.planejado ? "planejado" : p.atual ? "atual" : "cursado";
      const padrao = { planejado: "planejado", atual: "cursando", cursado: "aprovado" }[tipo];
      const editado = !!editados[p.nome];
      const brutos = editado ? editados[p.nome] : (p.disciplinas || []);
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
          workload: inf.workload, cel: parseHorarios(it.horarios), dispensas: [], aprovadaEm: it.aprovadaEm || null,
          ri: (regs[alvo] || []).length,   // posição do registro deste item em regs[alvo]: identifica a ocorrência
        };
        registra(alvo, { pi, status, nota: it.nota, horas: alvo === it.code ? it.horas : undefined,
          via: it.equivale ? `equivalência: ${it.code} ${item.name}` : null, aprovadaEm: it.aprovadaEm || null });
        (it.dispensa || []).forEach((d) => {
          const dn = typeof d === "string" ? { code: d } : { category: 2, ...d };
          conhece(dn);
          if (status !== "reprovado") registra(dn.code, { pi, status, nota: "T", via: `dispensa por ${it.code}` });
          item.dispensas.push(dn.code);
        });
        return item;
      });
      return { nome: p.nome, semestre: semIdx(p.nome), nota: p.nota, tipo, itens, pi, editado, deduzido: !!p.deduzido };
    });

    // Aprovações registradas por você: o período virtual só existe no modelo (não vai para o perfil, para a exportação
    // nem para o Cronograma). A classificação usa os registros do perfil; a equivalência deferida é conferida depois.
    declaradas.forEach((d) => conhece(d));
    let classe = classificaDeclaradas(declaradas, regs, periodos);
    // Sem declaradas, o período virtual não existe (o modelo fica igual ao de antes).
    const piDecl = declaradas.length ? periodos.length : null;
    const virtual = { nome: NOME_DECL, semestre: null, nota: null, tipo: "cursado", itens: [], pi: piDecl, editado: false, deduzido: false, declarado: true };
    if (declaradas.length) periodos.push(virtual);
    const registraDeclarada = (d) => {
      const inf = info(d.code) || {};
      const item = { code: d.code, alvo: d.code, status: "aprovado", pi: piDecl, nota: undefined, equivale: undefined,
        name: d.name || inf.name || d.code, credits: d.credits != null ? d.credits : inf.credits || 0,
        category: d.category != null ? d.category : inf.category || 3, horas: d.horas != null ? d.horas : inf.horas,
        workload: inf.workload, cel: new Set(), dispensas: [], aprovadaEm: null, declarada: true,
        semestreDeclarado: semestreValido(d.semestre) ? d.semestre : null, registradoEm: d.registradoEm || null,
        ri: (regs[d.code] || []).length };
      virtual.itens.push(item);
      registra(d.code, { pi: piDecl, status: "aprovado", origem: "declarado", semestreDeclarado: item.semestreDeclarado,
        registradoEm: item.registradoEm, horas: d.horas, via: "aprovação registrada por você", aprovadaEm: null });
    };
    classe.ativas.forEach(registraDeclarada);

    // Equivalências: deferida passa a valer como a disciplina pedida (e a cursada deixa de contar no grupo original);
    // "a pedir" / "em análise" ficam numa faixa separada até a resposta.
    const consumidas = new Set();
    const pendEq = {};
    const pendConsumo = new Set();
    const dispensou = {};
    periodos.forEach((p) => p.itens.forEach((it) => {
      if (it.dispensas.length && it.status === "aprovado") dispensou[it.code] = (dispensou[it.code] || []).concat(it.dispensas);
    }));
    const usosDeferidos = new Map();
    pedidos.filter((e) => e.status === "deferido").forEach((e) => {
      new Set(cursadasDe(e).map((c) => c.code)).forEach((code) => usosDeferidos.set(code, (usosDeferidos.get(code) || 0) + 1));
    });
    const usosPendentes = new Map();
    pedidos.filter(pendente).forEach((e) => {
      new Set(cursadasDe(e).map((c) => c.code)).forEach((code) => usosPendentes.set(code, (usosPendentes.get(code) || 0) + 1));
    });
    const pedidosComConflito = new Set();
    const semestreDe = (r) => semestreDoRegistro(r, periodos);
    pedidos.forEach((e) => {
      const cs = e ? cursadasDe(e) : [];
      if (!cs.length || !e.pedida) return;
      const st = e.status || "a pedir";
      if (st === "deferido") {
        if (cs.some((c) => usosDeferidos.get(c.code) > 1 || dispensou[c.code])) {
          pedidosComConflito.add(e);
          return;
        }
        const maisRecentePrimeiro = (a, b) => (semestreDe(b) ?? -1) - (semestreDe(a) ?? -1);
        const registros = cs.map((c) => {
          const origens = (regs[c.code] || []).filter((r) => r.pi != null).sort(maisRecentePrimeiro);
          return origens.find((r) => r.status === "aprovado")
            || origens.find((r) => r.status === "previsto" || emCurso(r.status));
        });
        const status = registros.every((r) => r?.status === "aprovado") ? "aprovado" : "previsto";
        // A1: com uma origem declarada, a pedida também é declarada (nunca importada).
        const declarada = registros.some((r) => r?.origem === "declarado");
        // A data é a da origem que a determina (a mais recente), pelo próprio registro: as declaradas dividem o mesmo
        // período virtual. Uma declarada sem semestre leva o limite de registradoEm (e A7) para a pedida.
        const semData = registros.filter((r) => r && r.origem === "declarado" && semestreDe(r) == null);
        let pi = null, data = {};
        if (semData.length) {
          pi = semData[0].pi;
          data = { semestreDeclarado: null, registradoEm: semData.map((r) => r.registradoEm).filter(Boolean).sort().pop() || null };
        } else if (registros.every((r) => r && semestreDe(r) != null)) {
          const det = registros.slice().sort(maisRecentePrimeiro)[0];
          pi = det.pi;
          if (det.origem === "declarado") data = { semestreDeclarado: det.semestreDeclarado, registradoEm: det.registradoEm || null };
        }
        registra(e.pedida, { pi, status, nota: "E", via: `equivalência deferida: ${cs.map((c) => c.code).join(" + ")}`,
          ...(declarada ? { origem: "declarado", semestreDeclarado: null, ...data } : {}) });
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

    // Uma equivalência deferida (importada) para o código de uma declarada também a confirma: a declarada sai da conta.
    const confirmadaDepois = classe.ativas.filter((d) => (regs[d.code] || []).some((r) => r.status === "aprovado" && r.origem !== "declarado"));
    if (confirmadaDepois.length) {
      const sai = new Set(confirmadaDepois.map((d) => d.code));
      sai.forEach((code) => { regs[code] = regs[code].filter((r) => r.origem !== "declarado" || r.via !== "aprovação registrada por você"); });
      virtual.itens = virtual.itens.filter((it) => !sai.has(it.code));
      const outras = classificaDeclaradas(confirmadaDepois, regs, periodos);
      classe = { ativas: classe.ativas.filter((d) => !sai.has(d.code)), confirmadas: { ...classe.confirmadas, ...outras.confirmadas },
        conflitos: classe.conflitos, notas: classe.notas };
    }

    // D-07: os alvos contam como no histórico e a origem de uma dispensa não soma créditos em grupo nenhum.
    // Duas ou mais dispensas pela mesma origem recebem aviso (CEG 01/2017, art. 46, II).
    const origensDispensa = new Set(Object.keys(dispensou));
    const reutilizadas = Object.entries(dispensou).map(([origem, alvos]) => ({ origem, alvos: [...new Set(alvos)] }))
      .filter((x) => x.alvos.length > 1);

    return { curr, opt, info, deps, regs, periodos, consumidas, pendEq, pendConsumo, dispensou, pedidosComConflito,
      origensDispensa, reutilizadas, piDecl, declaradas: classe };
  }

  /** Status vindo só dos registros do perfil (histórico, atual, planos e pedidos): o de maior força. */
  function statusDosRegistros(registros, pedidoPendente) {
    const b = (registros || []).reduce((a, r) => (FORCA[r.status] > FORCA[a] ? r.status : a), "pendente");
    if (FORCA[b] < FORCA.planejado && pedidoPendente) return "analise";
    return b;
  }

  /**
   * Fonte da aprovação de um código, para fase e selos (a barra continua usando o status efetivo):
   * "importado" (registro do perfil), "declarado", "previsto", "pincel" (tag de tipo aprovado sem registro) ou null.
   * @param {Array} registros     registros do código (regs[code])
   * @param {string|undefined} statusPincel  tipo da tag marcada com o pincel, se houver
   */
  function fonteDaAprovacao(registros, statusPincel) {
    const rs = registros || [];
    if (rs.some((r) => r.status === "aprovado" && r.origem !== "declarado")) return "importado";
    if (rs.some((r) => r.status === "aprovado")) return "declarado";
    if (rs.some((r) => r.status === "previsto")) return "previsto";
    if (statusPincel === "aprovado") return "pincel";
    return null;
  }

  /**
   * O registro cumpre o requisito no período de semestre `semestre` (índice), sem contar o pincel.
   * Transferida (D-08): vale `aprovadaEm`; sem ela, só anos posteriores ao do bloco. Declarada: vale o semestre
   * informado; sem ele, o limite é o semestre de `registradoEm` (aprovada até essa data): o pré-requisito vale nos
   * semestres posteriores e o co-requisito também no mesmo (A7). Sem nenhum dos dois, não cumpre em período datado.
   */
  function registroCumpre(registros, periodos, semestre, aceitaMesmoSemestre = false) {
    if (semestre == null) return false;
    return (registros || []).some((r) => {
      const p = periodos[r.pi];
      if (!p || FORCA[r.status] < FORCA.planejado) return false;
      let origem = semestreDoRegistro(r, periodos);
      if (origem == null && r.origem === "declarado" && r.status === "aprovado") {
        const limite = semestreDaData(r.registradoEm);
        return limite != null && (limite < semestre || (aceitaMesmoSemestre && limite === semestre));
      }
      if (origem == null && r.status === "aprovado") {
        origem = semIdx(r.aprovadaEm);
        const ano = anoDoBloco(p.nome);
        if (origem == null) return ano != null && Math.floor(semestre / 2) > ano;
      }
      return origem != null && (origem < semestre || (aceitaMesmoSemestre && origem === semestre));
    });
  }
  /** Declarada sem semestre cujo limite (`registradoEm`) cai neste semestre: não dá para saber se foi antes (aviso). */
  const declaradaSemSemestreEm = (registros, periodos, semestre) => semestre != null && (registros || []).some((r) =>
    r.origem === "declarado" && r.status === "aprovado" && semestreDoRegistro(r, periodos) == null && semestreDaData(r.registradoEm) === semestre);

  return { FORCA, NOME_DECL, dataValida, semestreDaData, nomeDoSemestre, semestreDoHistorico, erroDeclarada, normalizaDeclaradas,
    classificaDeclaradas, registroCumpre, declaradaSemSemestreEm, statusDosRegistros, fonteDaAprovacao, semestreValido, semIdx, anoDoBloco, emCurso, parseHorarios, cursadasDe, pendente, semestreDoRegistro,
    montaRegistros };
});
