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
    if (r.origens) return r.exata ? r.semestreEfetivo : null;   // pedida de equivalência: ver pedidaDaEquivalencia
    const p = periodos[r.pi];
    if (p && p.declarado) return semIdx(r.semestreDeclarado);
    return p ? p.semestre : null;
  }
  /** Semestre de um período do Histórico (nem declarado nem bloco de transferidas): regras de "mesmo período" (selos). */
  function semestreDoHistorico(r, periodos) {
    const p = r && periodos[r.pi];
    return p && !p.declarado && r.origem !== "declarado" ? p.semestre : null;
  }

  /**
   * Tempo de uma origem: o semestre que ela conhece, exato ou só como limite.
   *   importada, prevista ou em curso -> semestre do período (exato)
   *   transferida (bloco)             -> aprovadaEm (exato); sem ela, o ano do bloco (D-08: limite no fim do ano)
   *   declarada com semestre          -> semestre informado (exato)
   *   declarada sem semestre          -> limite do semestre de registradoEm (A7)
   *   sem nada disso                  -> null (a pedida fica sem data)
   */
  function tempoDaOrigem(r, periodos) {
    if (!r) return null;
    const s = semestreDoRegistro(r, periodos);
    if (s != null) return { r, v: s, exata: true };
    if (r.origens) return r.semestreEfetivo == null ? null : { r, v: r.semestreEfetivo, exata: false };
    if (r.origem === "declarado") { const l = semestreDaData(r.registradoEm); return l == null ? null : { r, v: l, exata: false }; }
    const p = periodos[r.pi], ano = p ? anoDoBloco(p.nome) : null;
    if (ano == null) return null;
    const a = semIdx(r.aprovadaEm);
    return a != null ? { r, v: a, exata: true } : { r, v: ano * 2 + 1, exata: false };
  }

  /**
   * Base do PRAZO de cinco anos (D-03) de um registro: o intervalo [de, ate] de semestres em que a aprovação vale para o
   * prazo. É outra data que a dos requisitos (tempoDaOrigem):
   *   importada, prevista ou em curso -> o semestre do período
   *   transferida (bloco)             -> o ano do bloco, mesmo com aprovadaEm (D-03; aprovadaEm vale só para requisitos)
   *   declarada com semestre          -> o semestre informado; declarada sem semestre -> null (data não confirmada)
   *   pedida de equivalência          -> a origem mais tardia ([maior de, maior ate]); sem data em alguma, null
   * @returns {{ de, ate, ano, fonte, declarado } | null}  ano: o ano, quando só ele é conhecido; fonte: de onde vem a
   *   data do prazo ("registro" do SIGA, "bloco" de transferidas ou "declarado" pela pessoa)
   */
  function prazoDoRegistro(r, periodos) {
    if (!r) return null;
    if (r.origens) {
      const ps = r.origens.map((o) => prazoDoRegistro(o, periodos));
      if (!ps.length || ps.some((x) => !x)) return null;
      const de = Math.max(...ps.map((x) => x.de)), ate = Math.max(...ps.map((x) => x.ate));
      // De onde vem a data: a origem mais tardia; no empate, o registro do SIGA antes do bloco e da declarada.
      const ordem = { registro: 0, bloco: 1, declarado: 2 };
      const det = ps.slice().sort((a, b) => b.ate - a.ate || b.de - a.de || ordem[a.fonte] - ordem[b.fonte])[0];
      return { de, ate, ano: ate > de ? Math.floor(ate / 2) : null, fonte: det.fonte, declarado: det.fonte === "declarado" };
    }
    const p = periodos[r.pi];
    if (r.origem === "declarado") { const s = semIdx(r.semestreDeclarado); return s == null ? null : { de: s, ate: s, ano: null, fonte: "declarado", declarado: true }; }
    if (p && p.semestre != null) return { de: p.semestre, ate: p.semestre, ano: null, fonte: "registro", declarado: false };
    const ano = p ? anoDoBloco(p.nome) : null;
    return ano == null ? null : { de: ano * 2, ate: ano * 2 + 1, ano, fonte: "bloco", declarado: false };
  }

  /**
   * Ordem fixa entre registros do mesmo código, que não depende da ordem dos períodos: pelo semestre dos requisitos,
   * depois pela base do prazo (D-03: entre dois blocos de transferidos, o mais recente é o do curso atual, PC-05),
   * depois pelo nome do período. Negativo: a vem antes (é mais antigo) que b.
   */
  function ordemDosRegistros(a, b, periodos) {
    const sa = semestreDoRegistro(a, periodos) ?? -1, sb = semestreDoRegistro(b, periodos) ?? -1;
    if (sa !== sb) return sa - sb;
    const pa = prazoDoRegistro(a, periodos), pb = prazoDoRegistro(b, periodos);
    const ta = pa ? pa.ate * 2 + pa.de : -1, tb = pb ? pb.ate * 2 + pb.de : -1;
    if (ta !== tb) return ta - tb;
    const na = (periodos[a.pi] || {}).nome || "", nb = (periodos[b.pi] || {}).nome || "";
    return na < nb ? -1 : na > nb ? 1 : 0;
  }
  /** A aprovação que dá a base do prazo de um código: a mais recente pela ordem fixa (ordemDosRegistros). */
  function aprovacaoDoPrazo(rs, periodos) {
    return (rs || []).filter((r) => r.status === "aprovado").sort((a, b) => ordemDosRegistros(a, b, periodos)).pop() || null;
  }

  /**
   * REGRA ÚNICA da pedida de uma equivalência deferida, a partir do CONJUNTO de origens (a ordem não muda nada):
   * - status: aprovada se todas as origens estão aprovadas; prevista se as que faltam estão previstas ou em curso;
   *   pendente se alguma origem está ausente ou reprovada (sem fonte, sem plano e sem selo).
   * - fonte: a mais fraca. Declarada se alguma origem for declarada (A1); prevista se a pedida ficou prevista.
   * - data dos REQUISITOS: a mais tardia entre as origens, pelo tempo de cada uma (tempoDaOrigem). No empate, a exata
   *   vence o limite. Se alguma origem não tem data, a pedida também não tem. A pedida cumpre um requisito num semestre
   *   quando TODAS as origens cumprem (registroCumpre), cada uma pelo próprio critério (D-08 no bloco, A7 na declarada).
   * - data do PRAZO de cinco anos: a de D-03 (prazoDoRegistro), nunca aprovadaEm.
   * - plano (previsão e selo do Notion): a pedida prevista entra no plano na data efetiva só quando as origens que
   *   faltam estão previstas ou em curso no período atual ou num futuro (noPlano). Num período passado, não cobre nada.
   * - período exibido: o da origem que dá a data. No empate, período real do Histórico ou do plano > bloco de
   *   transferidas > pedida > declarada; persistindo, a origem de menor código. Assim a exibição não depende da ordem.
   * @param {Array} origens   registro escolhido de cada cursada (ou undefined, se não há)
   * @param {Array} codigos   código de cada cursada, na mesma ordem (desempate)
   * @returns registro da pedida: { pi, status, origens, semestreEfetivo, exata, noPlano, origem?, semestreDeclarado?, registradoEm? }
   */
  function pedidaDaEquivalencia(origens, periodos, codigos = []) {
    const ok = (r) => !!r && r.status === "aprovado";
    const andamento = (r) => !!r && (r.status === "previsto" || emCurso(r.status));
    const status = origens.every(ok) ? "aprovado" : origens.every((r) => ok(r) || andamento(r)) ? "previsto" : "pendente";
    const declarada = origens.some((r) => r && r.origem === "declarado");
    const tipo = (t) => {
      const p = periodos[t.r.pi];
      const base = t.r.origens ? 2 : p && p.semestre != null && !p.declarado ? 0 : p && anoDoBloco(p.nome) != null ? 1 : 3;
      return (t.exata ? 0 : 10) + base;
    };
    const tempos = origens.map((r, i) => { const t = tempoDaOrigem(r, periodos); return t && { ...t, codigo: codigos[i] || "" }; });
    const antes = (a, b) => a.v !== b.v ? a.v > b.v : tipo(a) !== tipo(b) ? tipo(a) < tipo(b) : a.codigo < b.codigo;
    const det = tempos.every(Boolean) && tempos.length ? tempos.reduce((a, b) => (antes(b, a) ? b : a)) : null;
    const elegivel = (r) => ok(r) || (r.origens ? !!r.noPlano : ["atual", "planejado"].includes((periodos[r.pi] || {}).tipo));
    return {
      pi: det ? det.r.pi : null, status, origens: origens.slice(),
      semestreEfetivo: det ? det.v : null, exata: !!det && det.exata,
      noPlano: status === "previsto" && origens.every(elegivel),
      ...(declarada ? { origem: "declarado",
        semestreDeclarado: det && det.exata && det.r.origem === "declarado" ? det.r.semestreDeclarado || null : null,
        registradoEm: det && !det.exata && det.r.origem === "declarado" ? det.r.registradoEm || null : null } : {}),
    };
  }

  /**
   * Itens do plano para a cobertura (previsão e selo do Notion): os do período atual e dos planejados, e a pedida
   * prevista de uma equivalência com as origens no atual ou num futuro (noPlano), na data efetiva. Fica de fora o que
   * já foi cumprido, o que foi consumido por um pedido deferido (não conta de novo) e o reprovado. A cobertura descarta
   * os itens de semestres anteriores ao atual.
   * @param {object} m          resultado de montaRegistros
   * @param {object} o
   * @param {(code: string) => boolean} o.cumprida   código já cumprido pelo registrado
   * @returns {Array<{ code, grupo, valor, semestre, periodo }>}
   */
  function itensDoPlano(m, { cumprida }) {
    const itens = [];
    const valor = (cat, it) => (cat === "5" ? (it.horas ?? it.credits) : it.credits);
    m.periodos.filter((p) => (p.tipo === "atual" || p.tipo === "planejado") && !p.declarado).forEach((p) => p.itens.forEach((it) => {
      if (it.status === "reprovado" || cumprida(it.alvo) || m.consumidas.has(it.alvo)) return;
      const cat = String(it.category);
      itens.push({ code: it.alvo, origem: it.code, grupo: cat, valor: valor(cat, it), semestre: p.semestre, periodo: p.nome });
    }));
    Object.keys(m.regs).sort().forEach((code) => m.regs[code].forEach((r) => {
      if (!r.origens || !r.noPlano || cumprida(code) || m.consumidas.has(code)) return;
      const i = m.info(code); if (!i) return;
      const cat = String(i.category);
      itens.push({ code, origem: code, grupo: cat, valor: cat === "5" ? (i.horas != null ? i.horas : i.credits) : i.credits, semestre: r.semestreEfetivo,
        periodo: r.semestreEfetivo == null ? null : nomeDoSemestre(r.semestreEfetivo) });
    }));
    return itens;
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
    // Disciplina fora do catálogo: cada ocorrência fica guardada com o seu registro; no fim, os dados vêm da ocorrência
    // escolhida pela ordem fixa (resolveForaDoCatalogo), não da primeira da lista.
    const ocorrencias = {};
    const herdam = [];
    const foraDoCatalogo = (code) => !!code && !curr[code] && !opt[code];
    const conhece = (o, rec) => {
      if (foraDoCatalogo(o.code)) {
        const anterior = custom[o.code] || {};
        custom[o.code] = { name: anterior.name ?? o.name, credits: anterior.credits ?? o.credits,
          category: anterior.category ?? o.category, horas: anterior.horas ?? o.horas };
        if (rec) (ocorrencias[o.code] = ocorrencias[o.code] || []).push({ o, rec });
      }
    };

    const periodos = base.map((p, pi) => {
      const tipo = p.planejado ? "planejado" : p.atual ? "atual" : "cursado";
      const padrao = { planejado: "planejado", atual: "cursando", cursado: "aprovado" }[tipo];
      const editado = !!editados[p.nome];
      const brutos = editado ? editados[p.nome] : (p.disciplinas || []);
      const itens = brutos.map((raw) => {
        const it = typeof raw === "string" ? { code: raw } : raw;
        const status = it.status || padrao;
        conhece(it, { pi, status, aprovadaEm: it.aprovadaEm || null });
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
        if (foraDoCatalogo(it.code) && (it.name == null || it.credits == null || it.category == null || it.horas == null)) herdam.push({ item, it });
        registra(alvo, { pi, status, nota: it.nota, horas: alvo === it.code ? it.horas : undefined,
          via: it.equivale ? `equivalência: ${it.code} ${item.name}` : null, aprovadaEm: it.aprovadaEm || null });
        (it.dispensa || []).forEach((d) => {
          const dn = typeof d === "string" ? { code: d } : { category: 2, ...d };
          conhece(dn, status !== "reprovado" ? { pi, status } : null);
          if (status !== "reprovado") registra(dn.code, { pi, status, nota: "T", via: `dispensa por ${it.code}` });
          item.dispensas.push(dn.code);
        });
        return item;
      });
      return { nome: p.nome, semestre: semIdx(p.nome), nota: p.nota, tipo, itens, pi, editado, deduzido: !!p.deduzido };
    });

    // Aprovações registradas por você: o período virtual só existe no modelo (não vai para o perfil, para a exportação
    // nem para o Cronograma). A classificação usa os registros do perfil; a equivalência deferida é conferida depois.
    declaradas.forEach((d) => conhece(d, { pi: periodos.length, status: "aprovado", origem: "declarado",
      semestreDeclarado: semestreValido(d.semestre) ? d.semestre : null, registradoEm: d.registradoEm || null }));
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

    // Mesmo código fora do catálogo com dados diferentes (por exemplo, 2 cr num período e 5 cr noutro): vale a ocorrência
    // escolhida pela ordem fixa dos registros (ordemDosRegistros), de preferência a aprovação mais recente; os campos
    // que faltam nela vêm das outras, da mais recente para a mais antiga. Créditos diferentes ficam em creditosDivergentes.
    const creditosDivergentes = {};
    Object.entries(ocorrencias).forEach(([code, lista]) => {
      const ordem = lista.slice().sort((a, b) => ordemDosRegistros(b.rec, a.rec, periodos)
        || (b.rec.status === "aprovado") - (a.rec.status === "aprovado"));
      const aprovadas = ordem.filter((x) => x.rec.status === "aprovado");
      const escolhida = [...aprovadas, ...ordem.filter((x) => x.rec.status !== "aprovado")];
      const campo = (k) => { const x = escolhida.find((y) => y.o[k] != null); return x ? x.o[k] : undefined; };
      custom[code] = { name: campo("name"), credits: campo("credits"), category: campo("category"), horas: campo("horas") };
      const cr = [...new Set(lista.map((x) => x.o.credits).filter((c) => c != null))].sort((a, b) => a - b);
      if (cr.length > 1) creditosDivergentes[code] = cr;
    });
    herdam.forEach(({ item, it }) => {
      const inf = info(it.code) || {};
      if (it.name == null) item.name = inf.name || it.code || "?";
      if (it.credits == null) item.credits = inf.credits || 0;
      if (it.category == null) item.category = inf.category || 3;
      if (it.horas == null) item.horas = inf.horas;
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
    // Os deferidos são resolvidos em ordem topológica: um pedido que usa a pedida de outro vem depois dele, seja qual
    // for a ordem da lista. Empates seguem uma chave canônica (pedida e cursadas em ordem), para o resultado não depender
    // da ordem. Pedido em ciclo (A usa a pedida de B e B a de A) fica em conflito, sinalizado, e não registra nada.
    const deferidos = pedidos.filter((e) => e && e.pedida && cursadasDe(e).length && (e.status || "a pedir") === "deferido");
    const chave = (e) => `${e.pedida}<${cursadasDe(e).map((c) => c.code).sort().join("+")}`;
    const dependeDe = new Map(deferidos.map((e) => [e, deferidos.filter((f) => f !== e && cursadasDe(e).some((c) => c.code === f.pedida))]));
    const ordemTopologica = [];
    const feitos = new Set();
    let resto = deferidos.slice().sort((a, b) => (chave(a) < chave(b) ? -1 : chave(a) > chave(b) ? 1 : 0));
    while (resto.length) {
      const pronto = resto.find((e) => dependeDe.get(e).every((f) => feitos.has(f)));
      if (!pronto) { resto.forEach((e) => pedidosComConflito.add(e)); break; }    // só sobrou ciclo
      ordemTopologica.push(pronto); feitos.add(pronto); resto = resto.filter((e) => e !== pronto);
    }
    // Os pendentes também seguem uma ordem fixa: para o mesmo alvo, "em análise" (já enviado) vence "a pedir"; depois, a
    // menor chave. Assim o pedido exibido não depende da ordem da lista.
    const pesoPendente = (e) => ((e && e.status) === "em análise" ? 0 : 1);
    const outros = pedidos.filter((e) => !deferidos.includes(e)).sort((a, b) => {
      if (!a || !b || !a.pedida || !b.pedida) return 0;
      return pesoPendente(a) - pesoPendente(b) || (chave(a) < chave(b) ? -1 : chave(a) > chave(b) ? 1 : 0);
    });
    const emOrdem = [...ordemTopologica, ...outros];
    emOrdem.forEach((e) => {
      if (pedidosComConflito.has(e)) return;
      const cs = e ? cursadasDe(e) : [];
      if (!cs.length || !e.pedida) return;
      const st = e.status || "a pedir";
      if (st === "deferido") {
        if (cs.some((c) => usosDeferidos.get(c.code) > 1 || dispensou[c.code])) {
          pedidosComConflito.add(e);
          return;
        }
        const registros = cs.map((c) => {
          const origens = (regs[c.code] || []).filter((r) => r.pi != null).sort((a, b) => ordemDosRegistros(b, a, periodos));
          return origens.find((r) => r.status === "aprovado")
            || origens.find((r) => r.status === "previsto" || emCurso(r.status));
        });
        registra(e.pedida, { ...pedidaDaEquivalencia(registros, periodos, cs.map((c) => c.code)), nota: "E", via: `equivalência deferida: ${cs.map((c) => c.code).join(" + ")}` });
        cs.forEach((c) => consumidas.add(c.code));
      } else if (pendente(e)) {
        if (cs.some((c) => dispensou[c.code] || usosDeferidos.has(c.code) || usosPendentes.get(c.code) > 1)) {
          pedidosComConflito.add(e);
          return;
        }
        if (!pendEq[e.pedida]) pendEq[e.pedida] = e;
        cs.forEach((c) => pendConsumo.add(c.code));
      }
    });

    // Uma equivalência deferida (importada) para o código de uma declarada também a confirma: a declarada sai da conta.
    // Vale também para a declarada que estava em conflito com uma reprovação: a aprovação importada a confirma.
    const confirmada = (d) => (regs[d.code] || []).some((r) => r.status === "aprovado" && r.origem !== "declarado");
    const confirmadaDepois = declaradas.filter((d) => (classe.conflitos[d.code] || classe.ativas.includes(d)) && confirmada(d));
    if (confirmadaDepois.length) {
      const sai = new Set(confirmadaDepois.map((d) => d.code));
      sai.forEach((code) => { regs[code] = regs[code].filter((r) => r.origem !== "declarado" || r.via !== "aprovação registrada por você"); });
      virtual.itens = virtual.itens.filter((it) => !sai.has(it.code));
      const outras = classificaDeclaradas(confirmadaDepois, regs, periodos);
      const conflitos = Object.fromEntries(Object.entries(classe.conflitos).filter(([code]) => !sai.has(code)));
      const notas = Object.fromEntries(Object.entries(classe.notas).filter(([code]) => !sai.has(code)));
      classe = { ativas: classe.ativas.filter((d) => !sai.has(d.code)), confirmadas: { ...classe.confirmadas, ...outras.confirmadas },
        conflitos, notas };
    }

    // D-07: os alvos contam como no histórico e a origem de uma dispensa não soma créditos em grupo nenhum.
    // Duas ou mais dispensas pela mesma origem recebem aviso (CEG 01/2017, art. 46, II).
    const origensDispensa = new Set(Object.keys(dispensou));
    const reutilizadas = Object.entries(dispensou).map(([origem, alvos]) => ({ origem, alvos: [...new Set(alvos)] }))
      .filter((x) => x.alvos.length > 1);

    return { curr, opt, info, deps, regs, periodos, consumidas, pendEq, pendConsumo, dispensou, pedidosComConflito, creditosDivergentes,
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
    return (registros || []).some((r) => cumpreUm(r, periodos, semestre, aceitaMesmoSemestre));
  }
  function cumpreUm(r, periodos, semestre, aceitaMesmoSemestre) {
    if (!r || FORCA[r.status] < FORCA.planejado) return false;
    // Pedida de equivalência: cumpre quando todas as origens cumprem (regra única de pedidaDaEquivalencia).
    if (r.origens) return r.origens.length > 0 && r.origens.every((o) => cumpreUm(o, periodos, semestre, aceitaMesmoSemestre));
    const p = periodos[r.pi];
    if (!p) return false;
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
  }
  /** Declarada sem semestre cujo limite (`registradoEm`) cai neste semestre: não dá para saber se foi antes (aviso).
   *  Numa pedida, vale quando a incerteza vem dessa origem e as outras já cumprem. */
  const limiteEm = (o, periodos, semestre) => !!o && !o.origens && o.origem === "declarado" && o.status === "aprovado"
    && semestreDoRegistro(o, periodos) == null && semestreDaData(o.registradoEm) === semestre;
  const declaradaSemSemestreEm = (registros, periodos, semestre) => semestre != null && (registros || []).some((r) => (r.origens
    ? r.origens.some((o) => limiteEm(o, periodos, semestre)) && r.origens.every((o) => limiteEm(o, periodos, semestre) || cumpreUm(o, periodos, semestre, false))
    : limiteEm(r, periodos, semestre)));

  return { FORCA, NOME_DECL, tempoDaOrigem, prazoDoRegistro, ordemDosRegistros, aprovacaoDoPrazo, pedidaDaEquivalencia, itensDoPlano, dataValida, semestreDaData, nomeDoSemestre, semestreDoHistorico, erroDeclarada, normalizaDeclaradas,
    classificaDeclaradas, registroCumpre, declaradaSemSemestreEm, statusDosRegistros, fonteDaAprovacao, semestreValido, semIdx, anoDoBloco, emCurso, parseHorarios, cursadasDe, pendente, semestreDoRegistro,
    montaRegistros };
});
