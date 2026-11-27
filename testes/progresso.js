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

let falhas = 0;
for (const [nome, f] of casos) {
  try { f(); console.log("OK   ", nome); }
  catch (e) { falhas++; console.log("FALHA", nome, "\n     ", String(e.message).split("\n").join("\n      ")); }
}
console.log(`${casos.length - falhas}/${casos.length} casos OK`);
process.exitCode = falhas ? 1 : 0;
