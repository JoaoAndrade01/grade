#!/usr/bin/env node
/*
 * Versão Node do importador, usada no teste de paridade com o Python.
 * Recebe os mesmos argumentos de gerar_perfil.py com --texto (arquivos .txt já extraídos)
 * e imprime o perfil em JSON canônico (chaves ordenadas).
 *   node ferramentas/gerar_perfil_node.js --historico a.txt --boa b.txt [--mesclar perfil.js] --hoje AAAA-MM-DD
 */
const fs = require("fs"), path = require("path");
const raiz = path.join(__dirname, "..");
global.window = {};
require(path.join(raiz, "js/database.js"));
require(path.join(raiz, "js/optativas.js"));
const SIGA = require(path.join(raiz, "js/siga.js"));

const args = process.argv.slice(2), op = { historico: [] };
for (let i = 0; i < args.length; i++) {
  const k = args[i].replace(/^--/, "");
  if (k === "historico") op.historico.push(args[++i]);
  else if (["boa", "mesclar", "hoje", "curso"].includes(k)) op[k] = args[++i];
}
const curso = op.curso != null ? +op.curso : 1;
const curriculo = {}, catalogo = {};
window.courses[curso].forEach((c) => { if (c.code) curriculo[c.code] = { category: c.category || 1 }; });
((window.optativas || {})[curso] || []).forEach((o) => { catalogo[o.code] = { category: o.category || 2 }; });
const ler = (f) => fs.readFileSync(f, "utf8");
let anterior = null;
if (op.mesclar) { const t = ler(op.mesclar); const m = t.match(/^\s*window\.PERFIL\s*=\s*/m); anterior = JSON.parse((m ? t.slice(m.index + m[0].length) : t).replace(/;\s*$/, "")); }
const perfil = SIGA.montarPerfil({
  historicos: op.historico.map((h) => SIGA.lerHistorico(ler(h))),
  boa: op.boa ? SIGA.lerBOA(ler(op.boa)) : null, curriculo, catalogo, anterior, hoje: op.hoje,
});
const ordena = (v) => Array.isArray(v) ? v.map(ordena) : v && typeof v === "object" ? Object.keys(v).sort().reduce((o, k) => (o[k] = ordena(v[k]), o), {}) : v;
process.stdout.write(JSON.stringify(ordena(perfil)) + "\n");
