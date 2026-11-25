#!/usr/bin/env node
/*
 * Versão Node do importador, usada no teste de paridade com o Python.
 * Recebe arquivos .txt já extraídos ou um --pdf por documento a detectar e
 * processar com o mesmo pdf.js do navegador. Imprime o perfil em JSON canônico.
 *   node ferramentas/gerar_perfil_node.js --historico a.txt --boa b.txt [--mesclar perfil.js] --hoje AAAA-MM-DD
 */
const fs = require("fs"), path = require("path");
const raiz = path.join(__dirname, "..");
global.window = {};
require(path.join(raiz, "js/database.js"));
require(path.join(raiz, "js/optativas.js"));
const SIGA = require(path.join(raiz, "js/siga.js"));

const args = process.argv.slice(2), op = { historico: [], pdf: [] };
for (let i = 0; i < args.length; i++) {
  const k = args[i].replace(/^--/, "");
  if (k === "historico" || k === "pdf") op[k].push(args[++i]);
  else if (["boa", "mesclar", "hoje", "curso"].includes(k)) op[k] = args[++i];
}
const curso = op.curso != null ? +op.curso : 1;
const curriculo = {}, catalogo = {};
window.courses[curso].forEach((c) => { if (c.code) curriculo[c.code] = { category: c.category || 1 }; });
((window.optativas || {})[curso] || []).forEach((o) => { catalogo[o.code] = { category: o.category || 2 }; });
const ler = (f) => fs.readFileSync(f, "utf8");
let anterior = null;
if (op.mesclar) { const t = ler(op.mesclar); const m = t.match(/^\s*window\.PERFIL\s*=\s*/m); anterior = JSON.parse((m ? t.slice(m.index + m[0].length) : t).replace(/;\s*$/, "")); }
const ordena = (v) => Array.isArray(v) ? v.map(ordena) : v && typeof v === "object" ? Object.keys(v).sort().reduce((o, k) => (o[k] = ordena(v[k]), o), {}) : v;

async function main() {
  const historicos = op.historico.map((h) => SIGA.lerHistorico(ler(h)));
  let boa = op.boa ? SIGA.lerBOA(ler(op.boa)) : null;
  if (op.pdf.length) {
    global.pdfjsWorker = require(path.join(raiz, "js/vendor/pdf.worker.min.js"));
    const pdfjs = require(path.join(raiz, "js/vendor/pdf.min.js"));
    // Os avisos do leitor também usam stdout. Mantenha a saída JSON isolada.
    const leitor = { getDocument: (opts) => pdfjs.getDocument({ ...opts, verbosity: pdfjs.VerbosityLevel.ERRORS }) };
    for (const f of op.pdf) {
      const linhas = await SIGA.extrairLinhasPDF(leitor, new Uint8Array(fs.readFileSync(f)));
      if (linhas.some((l) => /BOLETIM DE ORIENTA/i.test(l))) boa = SIGA.lerBOA(linhas);
      else historicos.push(SIGA.lerHistorico(linhas));
    }
  }
  const perfil = SIGA.montarPerfil({ historicos, boa, curriculo, catalogo, anterior, hoje: op.hoje });
  process.stdout.write(JSON.stringify(ordena(perfil)) + "\n");
}

main().catch(() => {
  console.error("Não foi possível gerar o perfil no Node. Confira os arquivos e argumentos.");
  process.exitCode = 1;
});
