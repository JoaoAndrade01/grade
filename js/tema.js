/*
 * Tema claro/escuro. Carregado de forma síncrona no <head> (a CSP não permite script inline),
 * antes da primeira pintura, para não piscar o tema errado.
 *
 *   Sem escolha salva   segue o sistema (prefers-color-scheme) e <meta name="color-scheme" content="light dark">.
 *   Com escolha salva   "claro" ou "escuro" em localStorage (gradeECI.v2.tema): vale para a página e para os
 *                       controles nativos (color-scheme), mesmo que o sistema mude depois.
 *
 * Aparência das abas e da barra ("Ícone e texto", "Somente texto" ou "Somente ícone", em Configurações): gradeECI.v2.aparencia, aplicada aqui
 * também, como data-aparencia no <html>, para não piscar.
 *
 * O botão sol/lua do cabeçalho chama window.TEMA.alterna(); Configurações usa define() e defineAparencia().
 */
(function () {
  "use strict";
  var CHAVE = "gradeECI.v2.tema";
  var raiz = document.documentElement;
  var midia = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var ouvintes = [];
  var naMemoria = null; // escolha desta visita quando o navegador não deixa salvar
  var CHAVE_AP = "gradeECI.v2.aparencia";
  var aparenciaMemoria = null;

  function salvo() {
    try {
      var v = JSON.parse(localStorage.getItem(CHAVE));
      if (v === "claro" || v === "escuro") return v;
    } catch (e) { /* armazenamento indisponível */ }
    return naMemoria;
  }
  function sistema() { return midia && midia.matches ? "escuro" : "claro"; }
  function atual() { return salvo() || sistema(); }

  function aplica() {
    var escolha = salvo();
    if (escolha) raiz.setAttribute("data-tema", escolha); else raiz.removeAttribute("data-tema");
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute("content", escolha === "claro" ? "light" : escolha === "escuro" ? "dark" : "light dark");
    ouvintes.forEach(function (f) { f(atual()); });
  }

  /** Troca para o oposto do tema que está na tela e lembra a escolha neste navegador. */
  function alterna() {
    var novo = atual() === "escuro" ? "claro" : "escuro";
    naMemoria = novo;
    try { localStorage.setItem(CHAVE, JSON.stringify(novo)); } catch (e) { /* vale só nesta visita */ }
    aplica();
  }

  /** Escolha explícita: "claro", "escuro" ou null (seguir o sistema). */
  function define(v) {
    naMemoria = v === "claro" || v === "escuro" ? v : null;
    try { if (naMemoria) localStorage.setItem(CHAVE, JSON.stringify(naMemoria)); else localStorage.removeItem(CHAVE); } catch (e) { /* só nesta visita */ }
    aplica();
  }

  function aparencia() {
    try { var v = JSON.parse(localStorage.getItem(CHAVE_AP)); if (v === "texto" || v === "icone") return v; } catch (e) { /* padrão */ }
    return aparenciaMemoria || "icone-texto";
  }
  function aplicaAparencia() { raiz.setAttribute("data-aparencia", aparencia()); }
  function defineAparencia(v) {
    aparenciaMemoria = v === "texto" || v === "icone" ? v : "icone-texto";
    try { if (aparenciaMemoria !== "icone-texto") localStorage.setItem(CHAVE_AP, JSON.stringify(aparenciaMemoria)); else localStorage.removeItem(CHAVE_AP); } catch (e) { /* só nesta visita */ }
    aplicaAparencia();
  }

  aplica();
  aplicaAparencia();
  if (midia) {
    var mudou = function () { if (!salvo()) aplica(); };
    if (midia.addEventListener) midia.addEventListener("change", mudou); else if (midia.addListener) midia.addListener(mudou);
  }
  // Outra aba mudou o tema (ou apagou os dados): acompanha.
  window.addEventListener("storage", function (ev) {
    if (ev.key === CHAVE || ev.key === null) { naMemoria = null; aplica(); }
    if (ev.key === CHAVE_AP || ev.key === null) { aparenciaMemoria = null; aplicaAparencia(); }
  });

  window.TEMA = {
    atual: atual, escolha: salvo, alterna: alterna, define: define, aoMudar: function (f) { ouvintes.push(f); },
    aparencia: aparencia, defineAparencia: defineAparencia,
  };
})();
