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
  const grade = janela.courses[1].map((c, i) => Object.assign({}, c, { idx: i, category: c.category || 1 }));
  const codigos = new Set(grade.map((c) => c.code).filter(Boolean));
  const catalogo = (janela.optativas[1] || []).filter((o) => !codigos.has(o.code));
  return { grade, catalogo, periodos: (perfil.periodos || []).map((p) => ({ ...p })), editados: plano.periodos || {},
    pedidos: plano.equivalencias || perfil.equivalencias || [] };
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

let falhas = 0;
for (const [nome, f] of casos) {
  try { f(); console.log("OK   ", nome); }
  catch (e) { falhas++; console.log("FALHA", nome, "\n     ", String(e.message).split("\n").join("\n      ")); }
}
console.log(`${casos.length - falhas}/${casos.length} casos OK`);
process.exitCode = falhas ? 1 : 0;
