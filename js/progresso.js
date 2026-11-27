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
 *   previsto   aprovação prevista (status "previsto")
 *   pincel     marcação do pincel com tag de tipo "aprovado", sem registro
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

  /** Semestre real de um registro (índice de `semIdx`), ou null. Único ponto que diz "quando" um registro aconteceu. */
  function semestreDoRegistro(r, periodos) {
    if (!r) return null;
    const p = periodos[r.pi];
    return p ? p.semestre : null;
  }

  /**
   * Monta os registros por código a partir dos dados do perfil.
   * @param {object} e
   * @param {Array} e.grade        currículo do curso (com `idx` e `category`)
   * @param {Array} e.catalogo     optativas fora do currículo
   * @param {Array} e.periodos     períodos do perfil já filtrados (removidos) e com os novos do plano
   * @param {object} e.editados    nome do período -> itens editados no navegador
   * @param {Array} e.pedidos      pedidos de equivalência
   */
  function montaRegistros({ grade, catalogo, periodos: base, editados = {}, pedidos = [] }) {
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
        const pi = registros.every((r) => semestreDe(r) != null)
          ? registros.sort(maisRecentePrimeiro)[0].pi : null;
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

    // D-07: os alvos contam como no histórico e a origem de uma dispensa não soma créditos em grupo nenhum.
    // Duas ou mais dispensas pela mesma origem recebem aviso (CEG 01/2017, art. 46, II).
    const origensDispensa = new Set(Object.keys(dispensou));
    const reutilizadas = Object.entries(dispensou).map(([origem, alvos]) => ({ origem, alvos: [...new Set(alvos)] }))
      .filter((x) => x.alvos.length > 1);

    return { curr, opt, info, deps, regs, periodos, consumidas, pendEq, pendConsumo, dispensou, pedidosComConflito,
      origensDispensa, reutilizadas };
  }

  /** Status vindo só dos registros do perfil (histórico, atual, planos e pedidos): o de maior força. */
  function statusDosRegistros(registros, pedidoPendente) {
    const b = (registros || []).reduce((a, r) => (FORCA[r.status] > FORCA[a] ? r.status : a), "pendente");
    if (FORCA[b] < FORCA.planejado && pedidoPendente) return "analise";
    return b;
  }

  /**
   * Fonte da aprovação de um código, para fase e selos (a barra continua usando o status efetivo):
   * "importado" (registro do perfil), "previsto", "pincel" (tag de tipo aprovado sem registro) ou null.
   * @param {Array} registros     registros do código (regs[code])
   * @param {string|undefined} statusPincel  tipo da tag marcada com o pincel, se houver
   */
  function fonteDaAprovacao(registros, statusPincel) {
    const rs = registros || [];
    if (rs.some((r) => r.status === "aprovado")) return "importado";
    if (rs.some((r) => r.status === "previsto")) return "previsto";
    if (statusPincel === "aprovado") return "pincel";
    return null;
  }

  return { FORCA, statusDosRegistros, fonteDaAprovacao, semestreValido, semIdx, anoDoBloco, emCurso, parseHorarios, cursadasDe, pendente, semestreDoRegistro,
    montaRegistros };
});
