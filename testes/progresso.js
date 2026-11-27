/*
 * Testes diretos do cálculo do progresso (js/progresso.js), sem navegador.
 * Uso: node testes/progresso.js
 * Usa só dados fictícios: testes/fixtures e o currículo e o catálogo públicos de js/.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const RAIZ = path.resolve(__dirname, "..");
const P = require(path.join(RAIZ, "js", "progresso.js"));
const janela = {};
for (const f of ["database.js", "optativas.js"]) vm.runInNewContext(fs.readFileSync(path.join(RAIZ, "js", f), "utf8"), { window: janela });
const FICTICIO = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "perfil-ficticio.json"), "utf8"));
const clone = (o) => JSON.parse(JSON.stringify(o));

/** Mesma entrada que js/app.js monta para o curso 1. */
function entrada(perfil, plano = {}) {
  const decl = P.normalizaDeclaradas(plano.aprovacoesDeclaradas || perfil.aprovacoesDeclaradas || []).itens;
  const grade = janela.courses[1].map((c, i) => Object.assign({}, c, { idx: i, category: c.category || 1 }));
  const codigos = new Set(grade.map((c) => c.code).filter(Boolean));
  const catalogo = (janela.optativas[1] || []).filter((o) => !codigos.has(o.code));
  return { grade, catalogo, periodos: (perfil.periodos || []).map((p) => ({ ...p })), editados: plano.periodos || {},
    pedidos: plano.equivalencias || perfil.equivalencias || [], declaradas: decl };
}
const modelo = (perfil, plano) => P.montaRegistros(entrada(perfil, plano));

const casos = [];
const caso = (nome, f) => casos.push([nome, f]);

caso("semIdx e anoDoBloco: semestre real e bloco de transferidas", () => {
  assert.equal(P.semIdx("2025/1"), 4050); assert.equal(P.semIdx("2025/2"), 4051);
  assert.equal(P.semIdx("2025/0"), null); assert.equal(P.anoDoBloco("2024 (transferidas)"), 2024);
  assert.equal(P.anoDoBloco("2024/0"), 2024); assert.equal(P.anoDoBloco("2024/1"), null);
});

caso("montaRegistros: registros por ocorrência, com o status padrão de cada tipo de período", () => {
  const m = modelo(FICTICIO);
  assert.deepEqual(m.regs.MAC118.map((r) => [m.periodos[r.pi].nome, r.status]), [["2025/1", "reprovado"], ["2026/2", "previsto"]]);
  assert.deepEqual(m.regs.MAC128.map((r) => r.status), ["cursando"]);
  assert.deepEqual(m.regs.EEL873.map((r) => r.status), ["planejado"]);
  assert.equal(m.regs.COS110[0].nota, 8.5);
  assert.deepEqual(m.periodos.map((p) => p.tipo), ["cursado", "cursado", "cursado", "atual", "planejado", "planejado"]);
  assert.equal(m.periodos[4].itens.find((it) => it.code === "EEL871").cel.size, 4);     // seg 08-10, sex 08-10
});

caso("semestreDoRegistro: semestre do período; sem período, null", () => {
  const m = modelo(FICTICIO);
  assert.equal(P.semestreDoRegistro(m.regs.COS110[0], m.periodos), P.semIdx("2025/1"));
  assert.equal(P.semestreDoRegistro({ pi: null }, m.periodos), null);
  assert.equal(P.semestreDoRegistro(null, m.periodos), null);
});

caso("montaRegistros: equivalência deferida registra a pedida no semestre da cursada e consome a cursada", () => {
  const perfil = clone(FICTICIO);
  perfil.equivalencias = [{ pedida: "COS351", cursadas: ["COS111"], status: "deferido" }];
  const m = modelo(perfil);
  assert.equal(m.regs.COS351.length, 1);
  assert.equal(m.regs.COS351[0].status, "aprovado");
  assert.equal(m.periodos[m.regs.COS351[0].pi].nome, "2025/1");
  assert.ok(m.consumidas.has("COS111"));
});

caso("montaRegistros: dispensa registra o alvo e marca a origem; pedido pendente vai para pendEq", () => {
  const perfil = clone(FICTICIO);
  perfil.periodos[1].disciplinas.push({ code: "XYZ101", name: "Fictícia", credits: 4, dispensa: ["COS351"] });
  perfil.equivalencias = [{ pedida: "EEL418", cursadas: ["EEL670"], status: "em análise" }];
  const m = modelo(perfil);
  assert.deepEqual(m.regs.COS351.map((r) => [r.status, r.nota]), [["aprovado", "T"]]);
  assert.ok(m.origensDispensa.has("XYZ101"));
  assert.equal(m.info("XYZ101").name, "Fictícia");
  assert.ok(m.pendEq.EEL418 && m.pendConsumo.has("EEL670"));
});

caso("montaRegistros: edições do navegador substituem os itens do período", () => {
  const m = modelo(FICTICIO, { periodos: { "2027/2": [{ code: "COS360" }] } });
  assert.ok(m.periodos[5].editado);
  assert.deepEqual(m.periodos[5].itens.map((it) => it.code), ["COS360"]);
  assert.equal(m.regs.EEL873, undefined);
});

caso("statusDosRegistros: vale o de maior força; pedido pendente sem aprovação vira análise", () => {
  const m = modelo(FICTICIO);
  assert.equal(P.statusDosRegistros(m.regs.MAC118), "previsto");
  assert.equal(P.statusDosRegistros(m.regs.COS110), "aprovado");
  assert.equal(P.statusDosRegistros(undefined), "pendente");
  assert.equal(P.statusDosRegistros(undefined, true), "analise");
  assert.equal(P.statusDosRegistros(m.regs.MAC128, true), "cursando");
});

caso("fonteDaAprovacao: importado, previsto, pincel ou nenhuma", () => {
  const m = modelo(FICTICIO);
  assert.equal(P.fonteDaAprovacao(m.regs.COS110), "importado");
  assert.equal(P.fonteDaAprovacao(m.regs.COS110, "cursando"), "importado");     // a tag não apaga o registro
  assert.equal(P.fonteDaAprovacao(m.regs.MAC118), "previsto");                  // reprovada antes, prevista agora
  assert.equal(P.fonteDaAprovacao(m.regs.MAC128, "aprovado"), "pincel");        // cursando no perfil, aprovada no pincel
  assert.equal(P.fonteDaAprovacao(undefined, "aprovado"), "pincel");
  assert.equal(P.fonteDaAprovacao(m.regs.MAC128), null);
  assert.equal(P.fonteDaAprovacao(undefined, "planejado"), null);
});

// ---------- Aprovações registradas por você (contrato de Registrar marcações; relógio dos casos: 2026-11-27)
const SO = (periodos, decl, extra = {}) => ({ periodos, aprovacoesDeclaradas: decl, ...extra });
const sem = P.semIdx;
const cumpre = (m, code, nome, co = false) => P.registroCumpre(m.regs[code], m.periodos, sem(nome), co);

caso("Declarada: formato, data e semestre; tolerância item a item; repetidos valem o último", () => {
  assert.equal(P.erroDeclarada({ code: "MAC118", registradoEm: "2026-11-27", semestre: "2025/1" }, "x"), null);
  assert.equal(P.erroDeclarada({ code: "MAC118", semestre: "2025" }, "aprovacoesDeclaradas[0]"), "aprovacoesDeclaradas[0].semestre");
  assert.equal(P.erroDeclarada({ code: "MAC118", semestre: "2025/0" }, "x"), "x.semestre");               // nunca AAAA/0 nem bloco
  assert.equal(P.erroDeclarada({ code: "MAC118", registradoEm: "27/11/2026" }, "x"), "x.registradoEm");
  assert.equal(P.erroDeclarada({ semestre: "2025/1" }, "x"), "x.code");
  const n = P.normalizaDeclaradas([{ semestre: "2025/1" }, { code: "MAC118", semestre: "2024/1" }, { code: "COS110" }, { code: "MAC118", semestre: "2025/1" }]);
  assert.equal(n.ignoradas, 1);
  assert.deepEqual(n.itens.map((d) => [d.code, d.semestre]), [["COS110", undefined], ["MAC118", "2025/1"]]);
  assert.equal(P.semestreDaData("2026-11-27"), sem("2026/2")); assert.equal(P.semestreDaData("2026-06-30"), sem("2026/1"));
});

caso("Sem declaradas, o período virtual não existe; com elas, fica fora dos tipos planejáveis", () => {
  assert.ok(!modelo(FICTICIO).periodos.some((p) => p.declarado));
  const m = modelo(SO([], [{ code: "MAC118", registradoEm: "2026-11-27" }]));
  const v = m.periodos.filter((p) => p.declarado);
  assert.equal(v.length, 1); assert.equal(v[0].tipo, "cursado"); assert.equal(v[0].nome, P.NOME_DECL);
  assert.deepEqual(m.regs.MAC118.map((r) => [r.status, r.origem]), [["aprovado", "declarado"]]);
  assert.equal(P.fonteDaAprovacao(m.regs.MAC118), "declarado");
});

caso("R07 e R08: requisito com semestre e sem semestre (limite em registradoEm); aviso só no semestre do registro", () => {
  const com = modelo(SO([], [{ code: "MAC118", registradoEm: "2026-11-27", semestre: "2025/1" }]));
  assert.ok(cumpre(com, "MAC118", "2026/1")); assert.ok(!cumpre(com, "MAC118", "2025/1"));
  const semS = modelo(SO([], [{ code: "MAC118", registradoEm: "2026-11-27" }]));
  assert.ok(!cumpre(semS, "MAC118", "2026/2")); assert.ok(cumpre(semS, "MAC118", "2027/1"));
  assert.ok(P.declaradaSemSemestreEm(semS.regs.MAC118, semS.periodos, sem("2026/2")));
  assert.ok(!P.declaradaSemSemestreEm(semS.regs.MAC118, semS.periodos, sem("2027/1")));
  const nada = modelo(SO([], [{ code: "MAC118" }]));                                     // sem semestre e sem data: não cumpre
  assert.ok(!cumpre(nada, "MAC118", "2030/1"));
});

caso("R09 e R36: co-requisito no mesmo semestre declarado; sem semestre, igual ou posterior ao do registro (A7)", () => {
  const com = modelo(SO([], [{ code: "COS231", registradoEm: "2026-11-27", semestre: "2026/1" }]));
  assert.ok(cumpre(com, "COS231", "2026/1", true)); assert.ok(!cumpre(com, "COS231", "2026/1", false));
  const semS = modelo(SO([], [{ code: "COS231", registradoEm: "2026-11-27" }]));
  assert.ok(cumpre(semS, "COS231", "2026/2", true)); assert.ok(cumpre(semS, "COS231", "2027/1", true));
  assert.ok(!cumpre(semS, "COS231", "2026/1", true));
});

caso("R12 e R13: o SIGA confirma (vale o SIGA, a declarada sai da conta e fica guardada); semestre diferente é divergência", () => {
  const hist = [{ nome: "2025/1", disciplinas: ["MAC118"] }];
  const m = modelo(SO(hist, [{ code: "MAC118", registradoEm: "2026-11-27" }]));
  assert.deepEqual(m.regs.MAC118.map((r) => r.origem || "importado"), ["importado"]);     // conta uma vez
  assert.deepEqual(m.declaradas.confirmadas.MAC118, { semestre: sem("2025/1"), nome: "2025/1", via: null, diverge: false });
  assert.equal(m.declaradas.ativas.length, 0);
  const d = modelo(SO([{ nome: "2024/2", disciplinas: ["MAC118"] }], [{ code: "MAC118", registradoEm: "2026-11-27", semestre: "2024/1" }]));
  assert.equal(d.declaradas.confirmadas.MAC118.diverge, true);
  assert.ok(cumpre(d, "MAC118", "2025/1") && !cumpre(d, "MAC118", "2024/2"));             // o requisito usa 2024/2 (SIGA)
});

caso("R14, R15 e R32: reprovação no semestre declarado ou depois é conflito; antes, a declarada conta com nota", () => {
  const rep = (nome) => [{ nome, disciplinas: [{ code: "FIT112", status: "reprovado" }] }];
  const r14 = modelo(SO(rep("2025/2"), [{ code: "FIT112", registradoEm: "2026-11-27", semestre: "2025/1" }]));
  assert.deepEqual(r14.declaradas.conflitos.FIT112, { semestre: sem("2025/2"), nome: "2025/2" });
  assert.equal(P.fonteDaAprovacao(r14.regs.FIT112), null);                               // fora da conta
  const r15 = modelo(SO(rep("2025/2"), [{ code: "FIT112", registradoEm: "2026-11-27" }]));   // sem semestre: limite 2026/2
  assert.equal(r15.declaradas.notas.FIT112.tipo, "reprovacao-antes");
  assert.equal(P.fonteDaAprovacao(r15.regs.FIT112), "declarado");
  const r32 = modelo(SO(rep("2026/2"), [{ code: "FIT112", registradoEm: "2026-11-27" }]));   // A2: reprovação no semestre do registro
  assert.ok(r32.declaradas.conflitos.FIT112);
  assert.equal(P.fonteDaAprovacao(r32.regs.FIT112), null);
});

caso("Cursando no BOA: a declarada continua contando, com a nota; prevista e planejada perdem para a declarada", () => {
  const m = modelo(SO([{ nome: "2026/2", atual: true, disciplinas: ["MAC128"] }, { nome: "2027/1", planejado: true, disciplinas: ["COS110"] }],
    [{ code: "MAC128", registradoEm: "2026-11-27" }, { code: "COS110", registradoEm: "2026-11-27" }]));
  assert.equal(m.declaradas.notas.MAC128.tipo, "cursando");
  assert.equal(P.statusDosRegistros(m.regs.MAC128), "aprovado");
  assert.equal(P.statusDosRegistros(m.regs.COS110), "aprovado"); assert.equal(m.declaradas.notas.COS110, undefined);
});

caso("R31 (A1): equivalência deferida com origem declarada conta como declarada, nunca como importada", () => {
  const m = modelo(SO([], [{ code: "COS111", registradoEm: "2026-11-27", semestre: "2025/1" }],
    { equivalencias: [{ pedida: "COS351", cursadas: ["COS111"], status: "deferido" }] }));
  assert.equal(P.fonteDaAprovacao(m.regs.COS351), "declarado");
  assert.equal(P.semestreDoRegistro(m.regs.COS351[0], m.periodos), sem("2025/1"));
  assert.ok(m.consumidas.has("COS111"));
});

caso("Equivalência importada para o código de uma declarada a confirma (vale o SIGA)", () => {
  const m = modelo(SO([{ nome: "2025/1", disciplinas: ["COS111"] }], [{ code: "COS351", registradoEm: "2026-11-27" }],
    { equivalencias: [{ pedida: "COS351", cursadas: ["COS111"], status: "deferido" }] }));
  assert.equal(P.fonteDaAprovacao(m.regs.COS351), "importado");
  assert.ok(m.declaradas.confirmadas.COS351 && !m.declaradas.ativas.length);
  assert.ok(!m.periodos.find((p) => p.declarado).itens.length);
});

caso("R37 (A8): o bloco de transferidas confirma; compara com aprovadaEm, não com o ano do bloco", () => {
  const bloco = (it) => [{ nome: "2024 (transferidas)", disciplinas: [it] }];
  const a = modelo(SO(bloco({ code: "MAC118", aprovadaEm: "2023/1" }), [{ code: "MAC118", semestre: "2023/1", registradoEm: "2026-11-27" }]));
  assert.equal(a.declaradas.confirmadas.MAC118.diverge, false);
  const b = modelo(SO(bloco({ code: "MAC118", aprovadaEm: "2022/2" }), [{ code: "MAC118", semestre: "2023/1", registradoEm: "2026-11-27" }]));
  assert.equal(b.declaradas.confirmadas.MAC118.diverge, true);
  const c = modelo(SO(bloco("MAC118"), [{ code: "MAC118", semestre: "2021/1", registradoEm: "2026-11-27" }]));   // sem aprovadaEm
  assert.deepEqual([c.declaradas.confirmadas.MAC118.diverge, c.declaradas.confirmadas.MAC118.nome], [false, "2024 (transferidas)"]);
});

caso("semestreDoHistorico: só o período do Histórico vale para as regras de mesmo período (selos)", () => {
  const m = modelo(SO([{ nome: "2025/1", disciplinas: ["COS110"] }, { nome: "2024 (transferidas)", disciplinas: ["MAC118"] }],
    [{ code: "MAC128", semestre: "2025/1", registradoEm: "2026-11-27" }]));
  assert.equal(P.semestreDoHistorico(m.regs.COS110[0], m.periodos), sem("2025/1"));
  assert.equal(P.semestreDoHistorico(m.regs.MAC118[0], m.periodos), null);
  assert.equal(P.semestreDoHistorico(m.regs.MAC128[0], m.periodos), null);
  assert.equal(P.semestreDoRegistro(m.regs.MAC128[0], m.periodos), sem("2025/1"));
});

caso("B3: equivalência com duas origens declaradas usa a origem que determina a data; sem semestre, preserva registradoEm e A7", () => {
  const eq = (s1, s2, reg2 = "2026-11-27") => P.montaRegistros({ grade: [], catalogo: [], periodos: [],
    declaradas: [{ code: "XYZ101", registradoEm: "2026-11-27", ...(s1 ? { semestre: s1 } : {}) }, { code: "XYZ102", registradoEm: reg2, ...(s2 ? { semestre: s2 } : {}) }],
    pedidos: [{ status: "deferido", pedida: "XYZ201", cursadas: ["XYZ101", "XYZ102"] }] });
  const a = eq("2024/1", "2026/1");
  assert.equal(P.semestreDoRegistro(a.regs.XYZ201[0], a.periodos), sem("2026/1"));       // a mais recente determina a data
  assert.ok(!P.registroCumpre(a.regs.XYZ201, a.periodos, sem("2025/1")));                  // não libera antes da segunda origem
  assert.ok(P.registroCumpre(a.regs.XYZ201, a.periodos, sem("2026/2")));
  assert.equal(P.fonteDaAprovacao(a.regs.XYZ201), "declarado");
  const b = eq(null, null);                                                               // ambas sem semestre, registradas em 2026/2
  assert.equal(b.regs.XYZ201[0].registradoEm, "2026-11-27");
  assert.ok(!P.registroCumpre(b.regs.XYZ201, b.periodos, sem("2026/2")));                  // pré-requisito só depois do registro
  assert.ok(P.registroCumpre(b.regs.XYZ201, b.periodos, sem("2026/2"), true));             // A7: co-requisito no mesmo
  assert.ok(P.registroCumpre(b.regs.XYZ201, b.periodos, sem("2027/1")));
  const c = eq("2024/1", null, "2025-03-10");                                             // uma com semestre, outra só com o limite 2025/1
  assert.ok(!P.registroCumpre(c.regs.XYZ201, c.periodos, sem("2025/1")) && P.registroCumpre(c.regs.XYZ201, c.periodos, sem("2025/2")));
});

caso("B3 (misto): a data da equivalência é a mais tardia entre a origem datada e o limite de registradoEm da sem semestre, nas duas ordens", () => {
  const eq = (decl) => P.montaRegistros({ grade: [], catalogo: [], periodos: [], declaradas: decl,
    pedidos: [{ status: "deferido", pedida: "XYZ201", cursadas: decl.map((d) => d.code) }] });
  const datada = { code: "XYZ101", semestre: "2026/1", registradoEm: "2026-07-01" }, semData = { code: "XYZ102", registradoEm: "2024-11-27" };
  for (const ordem of [[datada, semData], [semData, datada]]) {           // 2026/1 contra o limite 2024/2: vale 2026/1
    const m = eq(ordem);
    assert.equal(P.semestreDoRegistro(m.regs.XYZ201[0], m.periodos), sem("2026/1"));
    assert.ok(!P.registroCumpre(m.regs.XYZ201, m.periodos, sem("2025/1")) && !P.registroCumpre(m.regs.XYZ201, m.periodos, sem("2024/2"), true));
    assert.ok(P.registroCumpre(m.regs.XYZ201, m.periodos, sem("2026/2")));
  }
  const tarde = { code: "XYZ102", registradoEm: "2027-08-10" };            // limite 2027/2, mais tardio que 2026/1: valem o limite e A7
  for (const ordem of [[datada, tarde], [tarde, datada]]) {
    const m = eq(ordem);
    assert.equal(P.semestreDoRegistro(m.regs.XYZ201[0], m.periodos), null);
    assert.equal(m.regs.XYZ201[0].registradoEm, "2027-08-10");
    assert.ok(!P.registroCumpre(m.regs.XYZ201, m.periodos, sem("2027/2")) && P.registroCumpre(m.regs.XYZ201, m.periodos, sem("2027/2"), true));
    assert.ok(P.registroCumpre(m.regs.XYZ201, m.periodos, sem("2028/1")));
  }
});

caso("B4: equivalência importada aprovada confirma também a declarada que estava em conflito com uma reprovação", () => {
  const m = P.montaRegistros({ grade: [], catalogo: [],
    periodos: [{ nome: "2025/1", disciplinas: ["XYZ101", { code: "XYZ201", status: "reprovado" }] }],
    declaradas: [{ code: "XYZ201", semestre: "2025/1", registradoEm: "2026-11-27" }],
    pedidos: [{ status: "deferido", pedida: "XYZ201", cursadas: ["XYZ101"] }] });
  assert.equal(P.fonteDaAprovacao(m.regs.XYZ201), "importado");
  assert.deepEqual(m.declaradas.conflitos, {});
  assert.ok(m.declaradas.confirmadas.XYZ201);
});

// ---------- Pedida de equivalência: tabela de combinações de origens (regra única, independente da ordem)
const TIPOS = {
  importada:     { code: "XYZ601", periodo: "2025/1" },
  transfComData: { code: "XYZ602", bloco: { code: "XYZ602", aprovadaEm: "2023/2" } },
  transfSemData: { code: "XYZ603", bloco: { code: "XYZ603" } },
  declDatada:    { code: "XYZ604", decl: { code: "XYZ604", semestre: "2026/1", registradoEm: "2026-07-01" } },
  declSemData:   { code: "XYZ605", decl: { code: "XYZ605", registradoEm: "2024-11-27" } },
  prevista:      { code: "XYZ606", atual: { code: "XYZ606", status: "previsto" } },
  emCurso:       { code: "XYZ607", atual: { code: "XYZ607" } },
};
const SEMS = ["2023/2", "2024/1", "2024/2", "2025/1", "2025/2", "2026/1", "2026/2", "2027/1"];
function modeloDeOrigens(tipos, ordemPedido) {
  const periodos = [
    { nome: "2024 (transferidas)", disciplinas: tipos.filter((t) => TIPOS[t].bloco).map((t) => TIPOS[t].bloco) },
    { nome: "2025/1", disciplinas: tipos.filter((t) => TIPOS[t].periodo).map((t) => TIPOS[t].code) },
    { nome: "2026/2", atual: true, disciplinas: tipos.filter((t) => TIPOS[t].atual).map((t) => TIPOS[t].atual) },
  ];
  const declaradas = tipos.filter((t) => TIPOS[t].decl).map((t) => TIPOS[t].decl);
  const pedidos = ordemPedido ? [{ status: "deferido", pedida: "XYZ699", cursadas: ordemPedido.map((t) => TIPOS[t].code) }] : [];
  return P.montaRegistros({ grade: [], catalogo: [], periodos, declaradas, pedidos });
}
/** O que a pedida diz (status, fonte, data e requisito em cada semestre), para comparar entre as ordens. */
function resumoPedida(m) {
  const rs = m.regs.XYZ699;
  return { status: P.statusDosRegistros(rs), fonte: P.fonteDaAprovacao(rs), semestre: P.semestreDoRegistro(rs[0], m.periodos),
    efetivo: rs[0].semestreEfetivo ?? null,
    pre: SEMS.map((n) => P.registroCumpre(rs, m.periodos, sem(n))), co: SEMS.map((n) => P.registroCumpre(rs, m.periodos, sem(n), true)),
    aviso: SEMS.map((n) => P.declaradaSemSemestreEm(rs, m.periodos, sem(n))) };
}
caso("Pedida de equivalência: todos os pares de tipos de origem, nas duas ordens, com o requisito = todas as origens cumprem", () => {
  const nomes = Object.keys(TIPOS);
  const falhas = [];
  for (let i = 0; i < nomes.length; i++) for (let j = i + 1; j < nomes.length; j++) {
    const par = [nomes[i], nomes[j]];
    const so = modeloDeOrigens(par, null);                                // origens sozinhas: o oráculo de cada uma
    const um = (t, n, co) => P.registroCumpre(so.regs[TIPOS[t].code], so.periodos, sem(n), co);
    const limite = (t, n) => P.declaradaSemSemestreEm(so.regs[TIPOS[t].code], so.periodos, sem(n));
    const esperado = {
      status: par.some((t) => TIPOS[t].atual) ? "previsto" : "aprovado",
      pre: SEMS.map((n) => par.every((t) => um(t, n, false))), co: SEMS.map((n) => par.every((t) => um(t, n, true))),
      aviso: SEMS.map((n) => par.some((t) => limite(t, n)) && par.every((t) => limite(t, n) || um(t, n, false))),
    };
    const a = resumoPedida(modeloDeOrigens(par, par)), b = resumoPedida(modeloDeOrigens(par, par.slice().reverse()));
    if (JSON.stringify(a) !== JSON.stringify(b)) falhas.push(`${par}: a ordem muda o resultado ${JSON.stringify(a)} × ${JSON.stringify(b)}`);
    for (const k of ["status", "pre", "co", "aviso"]) if (JSON.stringify(a[k]) !== JSON.stringify(esperado[k])) falhas.push(`${par} ${k}: ${JSON.stringify(a[k])} ≠ ${JSON.stringify(esperado[k])}`);
    if (par.includes("declDatada") || par.includes("declSemData")) {
      const f = par.some((t) => TIPOS[t].atual) ? "previsto" : "declarado";
      if (a.fonte !== f) falhas.push(`${par} fonte: ${a.fonte} ≠ ${f}`);
    }
  }
  assert.deepEqual(falhas, []);
});

caso("Pedida de equivalência: os casos das reconferências, nas duas ordens", () => {
  const nos = (decl, periodos, cursadas) => [cursadas, cursadas.slice().reverse()].map((c) => P.montaRegistros({ grade: [], catalogo: [],
    periodos, declaradas: decl, pedidos: [{ status: "deferido", pedida: "XYZ201", cursadas: c }] }));
  const pre = (m, n, co = false) => P.registroCumpre(m.regs.XYZ201, m.periodos, sem(n), co);
  // B3 original: duas declaradas datadas (2024/1 e 2026/1): vale 2026/1
  for (const m of nos([{ code: "XYZ101", semestre: "2024/1", registradoEm: "2026-11-27" }, { code: "XYZ102", semestre: "2026/1", registradoEm: "2026-11-27" }], [], ["XYZ101", "XYZ102"])) {
    assert.equal(P.semestreDoRegistro(m.regs.XYZ201[0], m.periodos), sem("2026/1")); assert.ok(!pre(m, "2025/1") && pre(m, "2026/2"));
  }
  // B3 misto: datada 2026/1 e sem semestre registrada em 2024-11-27: vale 2026/1
  for (const m of nos([{ code: "XYZ101", semestre: "2026/1", registradoEm: "2026-07-01" }, { code: "XYZ102", registradoEm: "2024-11-27" }], [], ["XYZ101", "XYZ102"])) {
    assert.equal(P.semestreDoRegistro(m.regs.XYZ201[0], m.periodos), sem("2026/1")); assert.ok(!pre(m, "2025/1") && !pre(m, "2024/2", true));
  }
  // B3 transferida + declarada sem semestre: transferida aprovada em 2023/2 e limite 2024/2: co-requisito e aviso em 2024/2, pré em 2025/1
  for (const m of nos([{ code: "XYZ102", registradoEm: "2024-11-27" }], [{ nome: "2024 (transferidas)", disciplinas: [{ code: "XYZ101", aprovadaEm: "2023/2" }] }], ["XYZ101", "XYZ102"])) {
    assert.ok(pre(m, "2024/2", true) && !pre(m, "2024/2") && pre(m, "2025/1"));
    assert.ok(P.declaradaSemSemestreEm(m.regs.XYZ201, m.periodos, sem("2024/2")));
  }
  // B2 declarada + prevista no atual (2026/2): prevista, com data efetiva 2026/2, nas duas ordens
  for (const m of nos([{ code: "XYZ101", semestre: "2025/1", registradoEm: "2026-11-27" }], [{ nome: "2026/2", atual: true, disciplinas: [{ code: "XYZ102", status: "previsto" }] }], ["XYZ101", "XYZ102"])) {
    assert.equal(P.statusDosRegistros(m.regs.XYZ201), "previsto"); assert.equal(P.fonteDaAprovacao(m.regs.XYZ201), "previsto");
    assert.equal(m.regs.XYZ201[0].semestreEfetivo, sem("2026/2"));
  }
});

// ---------- Varredura de vizinhos da pedida de equivalência (prazo × requisito, período, status do pedido, desempate)
const eqModelo = ({ periodos = [], declaradas = [], pedidos }) => P.montaRegistros({ grade: [], catalogo: [], periodos, declaradas, pedidos });
const defere = (pedida, cursadas, status = "deferido") => ({ status, pedida, cursadas });
const ORIGEM = {
  importada:     { periodos: [{ nome: "2025/1", disciplinas: ["XYZ101"] }] },
  transfComData: { periodos: [{ nome: "2024 (transferidas)", disciplinas: [{ code: "XYZ101", aprovadaEm: "2019/2" }] }] },
  transfSemData: { periodos: [{ nome: "2024 (transferidas)", disciplinas: ["XYZ101"] }] },
  declDatada:    { declaradas: [{ code: "XYZ101", semestre: "2026/1", registradoEm: "2026-07-01" }] },
  declSemData:   { declaradas: [{ code: "XYZ101", registradoEm: "2024-11-27" }] },
};
// Prazo (D-03) esperado de cada tipo: [de, ate] em semestres; null = data não confirmada. Requisito: primeiro semestre do pré.
const PRAZO = { importada: ["2025/1", "2025/1"], transfComData: ["2024/1", "2024/2"], transfSemData: ["2024/1", "2024/2"], declDatada: ["2026/1", "2026/1"], declSemData: null };
const PRIMEIRO_PRE = { importada: "2025/2", transfComData: "2020/1", transfSemData: "2025/1", declDatada: "2026/2", declSemData: "2025/1" };

caso("Varredura: prazo (D-03) × requisito (D-08, A7) para cada tipo de origem, direto e numa pedida usada como origem de outra", () => {
  for (const [tipo, base] of Object.entries(ORIGEM)) {
    const m = eqModelo({ ...base, pedidos: [defere("XYZ201", ["XYZ101"]), defere("XYZ301", ["XYZ201"])] });
    for (const code of ["XYZ201", "XYZ301"]) {                              // pedida e pedida de pedida
      const r = m.regs[code].find((x) => x.status === "aprovado");
      const b = P.prazoDoRegistro(r, m.periodos);
      const esperado = PRAZO[tipo] && PRAZO[tipo].map(sem);
      assert.deepEqual(b && [b.de, b.ate], esperado, `${tipo} ${code} prazo`);
      const primeiro = SEMS.find((n) => P.registroCumpre(m.regs[code], m.periodos, sem(n))) ?? (P.registroCumpre(m.regs[code], m.periodos, sem("2020/1")) ? "2020/1" : null);
      const pre20201 = P.registroCumpre(m.regs[code], m.periodos, sem("2020/1"));
      assert.equal(pre20201 ? "2020/1" : primeiro, PRIMEIRO_PRE[tipo], `${tipo} ${code} requisito`);
    }
  }
});

caso("Varredura: origem prevista ou em curso em período passado, atual e futuro: prevista; só entra no plano no atual ou no futuro", () => {
  const per = { passado: { nome: "2025/1" }, atual: { nome: "2026/2", atual: true }, futuro: { nome: "2027/1", planejado: true } };
  for (const [quando, p] of Object.entries(per)) for (const st of ["previsto", "cursando"]) {
    const m = eqModelo({ periodos: [{ ...p, disciplinas: [{ code: "XYZ101", status: quando === "futuro" && st === "cursando" ? "planejado" : st }] }], pedidos: [defere("XYZ201", ["XYZ101"])] });
    const r = m.regs.XYZ201[0];
    assert.equal(r.status, "previsto", `${quando} ${st}`);
    assert.equal(P.fonteDaAprovacao(m.regs.XYZ201), "previsto");
    assert.equal(r.noPlano, quando !== "passado", `${quando} ${st} no plano`);
    assert.equal(r.semestreEfetivo, sem(p.nome));
  }
});

caso("Varredura: deferido, a pedir e em análise com origem aprovada, ausente e reprovada: só deferido com origem aprovada dá aprovação", () => {
  const origem = { aprovada: ["XYZ101"], ausente: [], reprovada: [{ code: "XYZ101", status: "reprovado" }] };
  for (const [tipo, disc] of Object.entries(origem)) for (const st of ["deferido", "a pedir", "em análise"]) {
    const m = eqModelo({ periodos: [{ nome: "2025/1", disciplinas: disc }], pedidos: [defere("XYZ201", ["XYZ101"], st)] });
    const fonte = P.fonteDaAprovacao(m.regs.XYZ201), status = P.statusDosRegistros(m.regs.XYZ201, !!m.pendEq.XYZ201);
    if (st === "deferido" && tipo === "aprovada") assert.deepEqual([status, fonte], ["aprovado", "importado"], `${st} ${tipo}`);
    else if (st === "deferido") {
      assert.deepEqual([status, fonte], ["pendente", null], `${st} ${tipo}`);           // sem selo, sem plano
      assert.ok(!(m.regs.XYZ201 || []).some((r) => r.noPlano));
    } else assert.deepEqual([status, fonte], ["analise", null], `${st} ${tipo}`);
  }
});

caso("Varredura: desempate de exibição determinístico (período real > bloco > pedida > declarada; depois o menor código), em todas as permutações", () => {
  const periodos = [{ nome: "2025 (transferidas)", disciplinas: [{ code: "XYZ101", aprovadaEm: "2024/2" }] }, { nome: "2024/2", disciplinas: ["XYZ102"] }];
  const declaradas = [{ code: "XYZ103", semestre: "2024/2", registradoEm: "2026-11-27" }];
  const perms = (a) => a.length < 2 ? [a] : a.flatMap((x, i) => perms(a.filter((_, j) => j !== i)).map((p) => [x, ...p]));
  for (const conj of [["XYZ101", "XYZ102"], ["XYZ101", "XYZ103"], ["XYZ101", "XYZ102", "XYZ103"]]) {
    const vistos = new Set();
    for (const ordem of perms(conj)) {
      const m = eqModelo({ periodos, declaradas, pedidos: [defere("XYZ201", ordem)] });
      const r = m.regs.XYZ201[0];
      vistos.add(JSON.stringify([m.periodos[r.pi]?.nome, r.semestreEfetivo, r.semestreDeclarado ?? null, P.semestreDoRegistro(r, m.periodos)]));
    }
    assert.equal(vistos.size, 1, `${conj}: ${[...vistos]}`);
    const [nome] = JSON.parse([...vistos][0]);
    assert.equal(nome, conj.includes("XYZ102") ? "2024/2" : "2025 (transferidas)", conj.join("+"));
  }
});

caso("Varredura: três origens (bloco, limite e datada) nas seis permutações dão a mesma pedida", () => {
  const periodos = [{ nome: "2024 (transferidas)", disciplinas: [{ code: "XYZ101", aprovadaEm: "2023/2" }] }];
  const declaradas = [{ code: "XYZ102", registradoEm: "2024-11-27" }, { code: "XYZ103", semestre: "2024/2", registradoEm: "2026-11-27" }];
  const perms = (a) => a.length < 2 ? [a] : a.flatMap((x, i) => perms(a.filter((_, j) => j !== i)).map((p) => [x, ...p]));
  const vistos = new Set();
  for (const ordem of perms(["XYZ101", "XYZ102", "XYZ103"])) {
    const m = eqModelo({ periodos, declaradas, pedidos: [defere("XYZ201", ordem)] });
    vistos.add(JSON.stringify(resumoPedidaDe(m, "XYZ201")));
  }
  assert.equal(vistos.size, 1, [...vistos].join("\n"));
});
function resumoPedidaDe(m, code) {
  const rs = m.regs[code], r = rs[0];
  return { status: P.statusDosRegistros(rs), fonte: P.fonteDaAprovacao(rs), semestre: P.semestreDoRegistro(r, m.periodos), efetivo: r.semestreEfetivo,
    periodo: m.periodos[r.pi]?.nome ?? null, prazo: P.prazoDoRegistro(r, m.periodos),
    pre: SEMS.map((n) => P.registroCumpre(rs, m.periodos, sem(n))), co: SEMS.map((n) => P.registroCumpre(rs, m.periodos, sem(n), true)),
    aviso: SEMS.map((n) => P.declaradaSemSemestreEm(rs, m.periodos, sem(n))) };
}

// ---------- Fase, conquistas e previsão (js/conquistas.js)
const C = require(path.join(RAIZ, "js", "conquistas.js"));
const GUIA = {}; vm.runInNewContext(fs.readFileSync(path.join(RAIZ, "js", "guia.js"), "utf8"), { window: GUIA });
const GRADE = janela.courses[1].map((c, i) => Object.assign({}, c, { idx: i, category: c.category || 1 }));
const TOTAIS = { 1: 174, 2: 40, 3: 8, 4: 4 };
/** Contexto fictício: `aprov` = código -> fonte; o resto com padrões vazios. */
function ctx({ aprov = {}, historico = [], creditos = {}, ace = {}, fenix = {}, plano = false, deps } = {}) {
  const m = P.montaRegistros(entrada({ periodos: [] }));
  return { fonte: (c) => aprov[c] || null, codigos: Object.keys(aprov), nivel: (c) => (GUIA.guia[1].disciplinas[c] || {}).nivel || null,
    deps: deps || m.deps, grade: GRADE, creditos, totais: TOTAIS, ace, aceTotal: 405, historico,
    fenix: { importado: false, declarado: false, ...fenix }, planejamentoCompleto: plano };
}
const selo = (lista, id) => lista.find((s) => s.id === id);
const todos = (codes, f = "importado") => Object.fromEntries(codes.map((c) => [c, f]));

caso("Fase: fronteiras 24,9%, 25%, 74,9% e 75%; calouro só com até dois semestres do Histórico (P5)", () => {
  assert.equal(C.fase(0.249, 1), "calouro"); assert.equal(C.fase(0.25, 1), "meio");
  assert.equal(C.fase(0.749, 9), "meio"); assert.equal(C.fase(0.75, 9), "veterano");
  assert.equal(C.fase(0.10, 3), "meio");                     // menos de 25% com mais de dois semestres cursados
  assert.equal(C.fase(0.10, 2), "calouro"); assert.equal(C.fase(0.10, null), "calouro");   // sem Histórico: só o percentual
  // precisão no cálculo: 56 de 226 cr = 24,78% (calouro), mesmo que a tela arredonde para 25%
  assert.equal(C.fase(C.percentual({ 1: { importado: 56 } }, TOTAIS, 0), 1), "calouro");
});

caso("R27: fase com declaradas só ganha \"declarado\" quando muda sem elas", () => {
  const f = (imp, dec) => C.faseDoCurso({ pctImportado: C.percentual({ 1: { importado: imp } }, TOTAIS, 0),
    pctComDeclaradas: C.percentual({ 1: { importado: imp, declarado: dec } }, TOTAIS, 1), semestres: 1 });
  assert.deepEqual([f(60, 50).fase, f(60, 50).declarado], ["meio", false]);      // 48,7% e 26,5%: as duas dão meio
  assert.deepEqual([f(40, 20).fase, f(40, 20).declarado], ["meio", true]);       // 26,5% contra 17,7%
});

caso("Percentual: cada grupo limitado ao total; prevista e pincel ficam fora até o índice pedido", () => {
  const cr = { 1: { importado: 200 }, 2: { importado: 10, previsto: 10, pincel: 10 } };
  assert.equal(C.percentual(cr, TOTAIS, 0), (174 + 10) / 226);
  assert.equal(C.percentual(cr, TOTAIS, 2), (174 + 20) / 226);
});

caso("R28 e R29: selo com declarada mostra \"· declarado\"; só com o pincel fica \"quase lá (simulação ✎)\"", () => {
  const base = todos(["MAC118", "MAC128", "MAC238"]);
  const d = selo(C.avaliaSelos(ctx({ aprov: { ...base, MAC248: "declarado" } })), "rei-calculos");
  assert.deepEqual([d.estado, d.declarado], ["obtido", true]);
  const p = selo(C.avaliaSelos(ctx({ aprov: { ...base, MAC248: "pincel" } })), "rei-calculos");
  assert.deepEqual([p.estado, p.origem], ["quase", "simulação ✎"]);
  const v = selo(C.avaliaSelos(ctx({ aprov: { ...base, MAC248: "previsto" } })), "rei-calculos");
  assert.deepEqual([v.estado, v.origem], ["quase", "prevista"]);
  const f = selo(C.avaliaSelos(ctx({ aprov: base })), "rei-calculos");
  assert.equal(f.estado, "falta"); assert.match(f.falta, /MAC248/);
});

caso("Um caso fictício por selo de lista de disciplinas", () => {
  const listas = { "valeu-einstein": ["FIT112", "FIT122", "FIM230", "FIM240"], "mao-na-massa": ["FIS111", "FIS121", "FIN231", "FIN241"],
    "transistor-so": ["EEL280", "EEL480", "EEL580", "EEL770"], "hello-world": ["COS110"], "matematico-raiz": ["MAE125", "COS351", "EEL881", "COS242"],
    "ping-0ms": ["EEL878", "EEL879"], "select-aprovadas": ["EEL871", "COS480"], "nazare-confusa": ["COS351", "EEL881"] };
  for (const [id, codes] of Object.entries(listas)) {
    assert.equal(selo(C.avaliaSelos(ctx({ aprov: todos(codes) })), id).estado, "obtido", id);
    assert.equal(selo(C.avaliaSelos(ctx({ aprov: todos(codes.slice(1)) })), id).estado, "falta", id);
  }
});

caso("Difíceis: Sobrevivente, Casca grossa, Calma Calabreso (todas aprovadas, só Histórico) e Fênix (R15 \"· declarado\")", () => {
  assert.equal(selo(C.avaliaSelos(ctx({ aprov: todos(["COS110"]) })), "sobrevivente").estado, "obtido");        // nível 5
  assert.equal(selo(C.avaliaSelos(ctx({ aprov: todos(["MAC128"]) })), "sobrevivente").estado, "falta");         // nível 3
  assert.equal(selo(C.avaliaSelos(ctx({ aprov: todos(["COS110", "FIT122", "MAC248"]) })), "casca-grossa").estado, "obtido");
  assert.equal(selo(C.avaliaSelos(ctx({ aprov: todos(["COS110", "FIT122"]) })), "casca-grossa").estado, "falta");
  const h = (itens) => [{ nome: "2025/1", itens }];
  assert.equal(selo(C.avaliaSelos(ctx({ historico: h([{ code: "COS110", status: "aprovado" }, { code: "FIT122", status: "aprovado" }]) })), "calma-calabreso").estado, "obtido");
  assert.equal(selo(C.avaliaSelos(ctx({ historico: h([{ code: "COS110", status: "aprovado" }, { code: "FIT122", status: "reprovado" }]) })), "calma-calabreso").estado, "falta");
  const fx = selo(C.avaliaSelos(ctx({ fenix: { declarado: true } })), "fenix");
  assert.deepEqual([fx.estado, fx.declarado], ["obtido", true]);
  assert.equal(selo(C.avaliaSelos(ctx({ fenix: { importado: true } })), "fenix").declarado, false);
});

caso("R34 (A5): regras de mesmo período só com o Histórico; o semestre declarado não conta", () => {
  // as cinco aprovações declaradas no mesmo semestre não entram no Histórico: Movido a café e Tá pago não saem
  const r = C.avaliaSelos(ctx({ aprov: todos(["COS110", "COS111", "EEL280", "FIT112", "FIS111"], "declarado") }));
  assert.equal(selo(r, "movido-cafe").estado, "falta"); assert.equal(selo(r, "ta-pago").estado, "falta");
  const h = [{ nome: "2025/1", itens: ["COS110", "COS111", "EEL280", "FIT112", "FIS111"].map((code) => ({ code, status: "aprovado" })) }];
  const s = C.avaliaSelos(ctx({ historico: h }));
  assert.equal(selo(s, "movido-cafe").estado, "obtido"); assert.equal(selo(s, "ta-pago").estado, "obtido");
  const misto = [{ nome: "2025/2", itens: [{ code: "MAC118", status: "aprovado" }, { code: "FIT112", status: "reprovado" }] }];
  assert.equal(selo(C.avaliaSelos(ctx({ historico: misto })), "ta-pago").estado, "falta");
});

caso("Etapas: Ciclo básico, Metade, Extensão em dia, Créditos completos (com ACE pendente) × Acabou! Acabou!", () => {
  const basico = GRADE.filter((x) => x.code && x.category === 1 && x.semester <= 4).map((x) => x.code);
  assert.equal(selo(C.avaliaSelos(ctx({ aprov: todos(basico) })), "ciclo-basico").estado, "obtido");
  assert.equal(selo(C.avaliaSelos(ctx({ aprov: todos(basico.slice(1)) })), "ciclo-basico").estado, "falta");
  assert.equal(selo(C.avaliaSelos(ctx({ creditos: { 1: { importado: 113 } } })), "metade").estado, "obtido");   // 113/226 = 50%
  assert.equal(selo(C.avaliaSelos(ctx({ creditos: { 1: { importado: 112 } } })), "metade").estado, "falta");
  assert.equal(selo(C.avaliaSelos(ctx({ ace: { importado: 405 } })), "extensao").estado, "obtido");
  const cheio = { 1: { importado: 174 }, 2: { importado: 40 }, 3: { importado: 8 }, 4: { importado: 4 } };
  const semAce = C.avaliaSelos(ctx({ creditos: cheio, aprov: todos(["EEWX00", "EEWU00"]), ace: { importado: 300 } }));
  assert.equal(selo(semAce, "creditos-completos").estado, "obtido"); assert.equal(selo(semAce, "creditos-completos").nota, "falta ACE: 105 h");
  assert.equal(selo(semAce, "acabou").estado, "falta"); assert.match(selo(semAce, "acabou").falta, /105 h de ACE/);
  const tudo = C.avaliaSelos(ctx({ creditos: cheio, aprov: todos(["EEWX00", "EEWU00"]), ace: { importado: 405 } }));
  assert.equal(selo(tudo, "acabou").estado, "obtido");
});

caso("Extras: Receba!, Colecionador, É tetra! e o selo do Notion (só o plano das disciplinas; ACE não entra)", () => {
  assert.equal(selo(C.avaliaSelos(ctx({ aprov: todos(["MAC118"]) })), "receba").estado, "obtido");     // MAC118 libera 3 ou mais
  assert.equal(selo(C.avaliaSelos(ctx({ aprov: todos(["COS480"]) })), "receba").estado, "falta");
  assert.equal(selo(C.avaliaSelos(ctx({ creditos: { 2: { importado: 40 } } })), "colecionador").estado, "obtido");
  const quatro = todos(["COS110", "EEL878", "EEL879", "EEL871", "COS480"]);    // Hello, Ping, SELECT, Sobrevivente
  assert.deepEqual([selo(C.avaliaSelos(ctx({ aprov: quatro })), "tetra").estado, selo(C.avaliaSelos(ctx({ aprov: quatro })), "tetra").declarado], ["obtido", false]);
  const tres = { ...todos(["EEL878", "EEL879"]), COS110: "declarado", EEL871: "declarado", COS480: "declarado" };   // só Ping é importado
  assert.deepEqual([selo(C.avaliaSelos(ctx({ aprov: tres })), "tetra").estado, selo(C.avaliaSelos(ctx({ aprov: tres })), "tetra").declarado], ["obtido", true]);
  assert.equal(selo(C.avaliaSelos(ctx({ plano: true, ace: {} })), "notion").estado, "obtido");
  assert.equal(selo(C.avaliaSelos(ctx({ plano: false })), "notion").estado, "falta");
  assert.equal(C.avaliaSelos(ctx()).length, 24);                                   // a tabela inteira
});

caso("Próximo marco: o mais perto de sair, com quase lá primeiro", () => {
  const s = C.avaliaSelos(ctx({ aprov: { ...todos(["MAC118", "MAC128", "MAC238"]), EEL878: "importado" } }));
  assert.equal(C.proximoMarco(s).id, "rei-calculos");
  const q = C.avaliaSelos(ctx({ aprov: { EEL878: "importado", EEL879: "previsto" } }));
  assert.equal(C.proximoMarco(q).id, "ping-0ms");
});

caso("Previsão (C4): sem perfil e sem período atual explicam; pendência concreta (inclusive só horas); concluído; semestre final", () => {
  const nome = P.nomeDoSemestre;
  const g = (o) => ({ 1: { nome: "Obrigatórias", un: "cr", falta: 0, planejado: 0 }, 5: { nome: "Extensão / ACE", un: "h", falta: 0, planejado: 0 }, ...o });
  assert.equal(C.previsaoFormatura({ perfil: false }).estado, "indisponivel");
  assert.equal(C.previsaoFormatura({ perfil: true, temAtual: false }).estado, "indisponivel");
  assert.equal(C.previsaoFormatura({ perfil: true, temAtual: true, grupos: g(), obrigatoriasSemPlano: [] }).estado, "concluido");
  const so = C.previsaoFormatura({ perfil: true, temAtual: true, grupos: g({ 5: { nome: "Extensão / ACE", un: "h", falta: 30, planejado: 0 } }), obrigatoriasSemPlano: [] });
  assert.equal(so.estado, "pendente"); assert.match(so.texto, /30 h de Extensão \/ ACE/);
  const cr = C.previsaoFormatura({ perfil: true, temAtual: true, grupos: g({ 2: { nome: "Optativas", un: "cr", falta: 12, planejado: 4 } }), obrigatoriasSemPlano: ["Projeto de Graduação"] });
  assert.match(cr.texto, /^Planeje os 8 cr que faltam: Projeto de Graduação, 8 cr de Optativas/);
  const ok = C.previsaoFormatura({ perfil: true, temAtual: true, grupos: g({ 2: { nome: "Optativas", un: "cr", falta: 12, planejado: 12 } }), obrigatoriasSemPlano: [],
    ultimoSemestre: P.semIdx("2028/2"), nomeDoSemestre: nome });
  assert.deepEqual([ok.estado, ok.semestre], ["previsao", "2028/2"]);
  const sd = C.previsaoFormatura({ perfil: true, temAtual: true, grupos: g({ 2: { nome: "Optativas", un: "cr", falta: 4, planejado: 4 } }), obrigatoriasSemPlano: [], semDataNecessaria: true });
  assert.equal(sd.estado, "indisponivel");
});

caso("B1 e B2: cobertura pelo plano: primeiro semestre com tudo coberto, sem repetir disciplina, com o semestre das horas de ACE", () => {
  const G = (o = {}) => ({ 1: { nome: "Obrigatórias", un: "cr", total: 174, cumprido: 166 }, 2: { nome: "Optativas", un: "cr", total: 40, cumprido: 0 },
    5: { nome: "Extensão / ACE", un: "h", total: 405, cumprido: 0 }, ...o });
  const ob = [{ code: "EEWU00", nome: "Estágio Obrigatório" }, { code: "EEWX00", nome: "Projeto de Graduação" }];
  const base = [{ code: "EEWX00", grupo: "1", valor: 4, semestre: sem("2026/2") }, { code: "EEWU00", grupo: "1", valor: 4, semestre: sem("2027/1") },
    { code: "XYZ201", grupo: "2", valor: 40, semestre: sem("2027/1") }];
  const ace = (s) => [{ horas: 405, semestre: s }];
  const c = (itens, horas, grupos = G()) => C.coberturaDoPlano({ grupos, obrigatorias: ob, itens, horasAce: horas });
  assert.equal(c(base, ace(sem("2027/1"))).primeiro, sem("2027/1"));
  // B2: repetir a optativa em 2030/2 não muda (cada disciplina conta uma vez, na primeira ocorrência)
  assert.equal(c(base.concat([{ code: "XYZ201", grupo: "2", valor: 40, semestre: sem("2030/2") }]), ace(sem("2027/1"))).primeiro, sem("2027/1"));
  // B2: as horas de ACE terminam em 2029/2: é o primeiro semestre com tudo coberto
  assert.equal(c(base, ace(sem("2029/2"))).primeiro, sem("2029/2"));
  // B2: horas necessárias sem semestre: indisponível, não um semestre
  const sd = c(base, ace(null)); assert.equal(sd.primeiro, null); assert.equal(sd.semData, true);
  // B1: sem nada no plano para as optativas, falta e o selo do Notion não sai (créditos simulados não entram no cumprido)
  const b1 = c(base.slice(0, 2), ace(sem("2027/1")));
  assert.equal(b1.primeiro, null); assert.equal(b1.grupos[2].falta, 40); assert.equal(b1.grupos[2].planejado, 0); assert.equal(b1.disciplinasPlanejadas, false);
  // o selo do Notion não depende de ACE
  assert.equal(c(base, []).disciplinasPlanejadas, true);
  const p = C.previsaoFormatura({ perfil: true, temAtual: true, grupos: b1.grupos, obrigatoriasSemPlano: b1.semPlano, ultimoSemestre: b1.primeiro, semDataNecessaria: b1.semData, nomeDoSemestre: P.nomeDoSemestre });
  assert.equal(p.estado, "pendente"); assert.match(p.texto, /40 cr de Optativas/);
  // tudo cumprido pelo registrado: concluído
  const feito = C.coberturaDoPlano({ grupos: G({ 1: { nome: "Obrigatórias", un: "cr", total: 174, cumprido: 174 }, 2: { nome: "Optativas", un: "cr", total: 40, cumprido: 40 },
    5: { nome: "Extensão / ACE", un: "h", total: 405, cumprido: 405 } }), obrigatorias: [], itens: [], horasAce: [] });
  assert.equal(feito.concluido, true);
});

let falhas = 0;
for (const [nome, f] of casos) {
  try { f(); console.log("OK   ", nome); }
  catch (e) { falhas++; console.log("FALHA", nome, "\n     ", String(e.message).split("\n").join("\n      ")); }
}
console.log(`${casos.length - falhas}/${casos.length} casos OK`);
process.exitCode = falhas ? 1 : 0;
