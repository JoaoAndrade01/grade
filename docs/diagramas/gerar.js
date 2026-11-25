// Gera os diagramas da arquitetura (docs/diagramas/*.svg) com traço "desenhado à mão" (rough.js, MIT)
// e ícones Lucide (ISC). Para regenerar:
//   npm i --no-save playwright roughjs lucide-static && npx playwright install chromium
//   node docs/diagramas/gerar.js
// Edite os objetos `diagramas` abaixo (caixas, setas, textos); não edite os SVGs à mão.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ICONES_DIR = path.join(path.dirname(require.resolve('lucide-static/package.json')), 'icons');
const ROUGH = require.resolve('roughjs/bundled/rough.js');
const SAIDA = __dirname;
const icon = (n) => fs.readFileSync(path.join(ICONES_DIR, `${n}.svg`), 'utf8').replace(/<!--.*?-->/s, '').match(/>\s*([\s\S]*)<\/svg>/)[1];
const ICONS = {}; ['globe','notebook-pen','file-text','user','cog','workflow','file-code-2','hard-drive','monitor-smartphone','lock','palette','list-tree','calendar-days','scroll-text','download','book-open-check','git-branch','clock','shield-check','users','database','graduation-cap','server-off','layers'].forEach(n => ICONS[n] = icon(n));

const diagramas = {
  atual: {
    w: 1500, h: 760, titulo: 'FLUXO DA GRADE INTERATIVA',
    grupos: [
      { x: 20, y: 90, w: 300, h: 640, rot: 'ORIGENS DOS DADOS' },
      { x: 400, y: 90, w: 300, h: 640, rot: 'PROCESSAMENTO' },
      { x: 760, y: 90, w: 260, h: 640, rot: 'ARQUIVOS' },
      { x: 1080, y: 70, w: 400, h: 660, rot: 'GRADE INTERATIVA (no seu navegador)', destaque: true },
    ],
    nos: [
      { id: 'siga', x: 50, y: 130, w: 240, h: 110, icon: 'globe', t: ['SIGA', 'página pública', 'do currículo'] },
      { id: 'notion', x: 50, y: 270, w: 240, h: 110, icon: 'notebook-pen', t: ['Notion', '"Grades de ECI"', 'horários e guia'] },
      { id: 'pdf', x: 50, y: 410, w: 240, h: 110, icon: 'file-text', t: ['PDFs do aluno', 'Histórico + BOA'] },
      { id: 'aluno', x: 50, y: 570, w: 240, h: 110, icon: 'user', t: ['Você', 'planos, pedidos,', 'tags'] },
      { id: 'extr', x: 430, y: 200, w: 240, h: 120, icon: 'cog', t: ['Extração', '1× por semestre', '(script / à mão)'] },
      { id: 'imp', x: 430, y: 420, w: 240, h: 120, icon: 'workflow', t: ['Importador', 'siga.js = gerar_perfil.py', 'mesmas regras'] },
      { id: 'db', x: 785, y: 120, w: 210, h: 70, icon: 'file-code-2', t: ['database.js', 'currículo'], peq: true },
      { id: 'opt', x: 785, y: 205, w: 210, h: 70, icon: 'file-code-2', t: ['optativas.js', 'eletivas'], peq: true },
      { id: 'hor', x: 785, y: 290, w: 210, h: 70, icon: 'file-code-2', t: ['horarios.js', 'turmas'], peq: true },
      { id: 'guia', x: 785, y: 375, w: 210, h: 70, icon: 'file-code-2', t: ['guia.js', 'dificuldade'], peq: true },
      { id: 'perfil', x: 785, y: 500, w: 210, h: 110, icon: 'hard-drive', t: ['Seu perfil', 'localStorage', 'ou perfil.js'], privado: true },
      { id: 'modelo', x: 1110, y: 130, w: 340, h: 90, icon: 'layers', t: ['Modelo', 'status · créditos · requisitos'] },
      { id: 'g1', x: 1110, y: 270, w: 160, h: 90, icon: 'palette', t: ['Grade', 'clássica'], peq: true },
      { id: 'g2', x: 1290, y: 270, w: 160, h: 90, icon: 'list-tree', t: ['Linha do', 'tempo'], peq: true },
      { id: 'g3', x: 1110, y: 380, w: 160, h: 90, icon: 'calendar-days', t: ['Cronograma'], peq: true },
      { id: 'g4', x: 1290, y: 380, w: 160, h: 90, icon: 'scroll-text', t: ['Equivalências', 'Extensão/ACE'], peq: true },
      { id: 'exp', x: 1110, y: 500, w: 340, h: 100, icon: 'download', t: ['Baixar perfil.js', '(guardar / levar)'] },
      { id: 'csp', x: 1110, y: 620, w: 340, h: 100, icon: 'shield-check', t: ['Nada sai do computador', 'bloqueio de rede (CSP)'], selo: true },
    ],
    setas: [['siga','extr'],['notion','extr'],['pdf','imp'],['aluno','perfil'],['extr','db'],['extr','opt'],['extr','hor'],['extr','guia'],['imp','perfil'],
      ['db','modelo'],['opt','modelo'],['hor','modelo'],['guia','modelo'],['perfil','modelo'],['modelo','g1'],['modelo','g2'],['g3','exp']],
  },
  alvo: {
    w: 1500, h: 560, titulo: 'PLANO: NOTION COMO FONTE DA VERDADE',
    grupos: [
      { x: 20, y: 90, w: 300, h: 440, rot: 'FONTES DA VERDADE' },
      { x: 390, y: 90, w: 380, h: 440, rot: 'GITHUB ACTIONS (agendado)' },
      { x: 840, y: 90, w: 260, h: 440, rot: 'REPOSITÓRIO' },
      { x: 1160, y: 90, w: 320, h: 440, rot: 'PUBLICAÇÃO', destaque: true },
    ],
    nos: [
      { id: 'nt', x: 50, y: 130, w: 240, h: 100, icon: 'notebook-pen', t: ['Notion · Turmas', 'código, dia, hora, ativa'] },
      { id: 'nd', x: 50, y: 250, w: 240, h: 100, icon: 'notebook-pen', t: ['Notion · Disciplinas', 'nível, presença, dicas'] },
      { id: 'sc', x: 50, y: 400, w: 240, h: 100, icon: 'globe', t: ['SIGA', 'currículo público'] },
      { id: 'sync', x: 420, y: 150, w: 320, h: 100, icon: 'clock', t: ['sincronizar_notion.py', 'token em Secret'] },
      { id: 'cur', x: 420, y: 415, w: 320, h: 95, icon: 'cog', t: ['atualizar_curriculo.py'] },
      { id: 'val', x: 420, y: 280, w: 320, h: 105, icon: 'book-open-check', t: ['validação', 'códigos · horários'] },
      { id: 'f1', x: 865, y: 150, w: 210, h: 70, icon: 'file-code-2', t: ['horarios.js'], peq: true },
      { id: 'f2', x: 865, y: 240, w: 210, h: 70, icon: 'file-code-2', t: ['guia.js'], peq: true },
      { id: 'f3', x: 865, y: 330, w: 210, h: 90, icon: 'file-code-2', t: ['optativas.js', 'database.js'], peq: true },
      { id: 'gc', x: 865, y: 440, w: 210, h: 70, icon: 'git-branch', t: ['commit automático'], peq: true },
      { id: 'pg', x: 1190, y: 150, w: 260, h: 100, icon: 'globe', t: ['GitHub Pages', 'site estático'] },
      { id: 'al', x: 1190, y: 300, w: 260, h: 100, icon: 'users', t: ['Alunos', 'abrem o site'] },
      { id: 'pv', x: 1190, y: 415, w: 260, h: 105, icon: 'shield-check', t: ['PDFs ficam no', 'computador de cada um'], selo: true },
    ],
    setas: [['nt','sync'],['nd','sync'],['sc','cur'],['sync','val'],['cur','val'],['val','f1'],['val','f2'],['val','f3'],['f3','gc'],['gc','pg'],['pg','al']],
  },
};

(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<html><body></body></html>');
  await p.addScriptTag({ path: ROUGH });
  for (const [nome, d] of Object.entries(diagramas)) {
    const svg = await p.evaluate(({ d, ICONS }) => {
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('xmlns', NS); svg.setAttribute('viewBox', `0 0 ${d.w} ${d.h}`); svg.setAttribute('width', d.w); svg.setAttribute('height', d.h);
      const rc = rough.svg(svg); let seed = 7;
      const opt = (o) => Object.assign({ seed: seed++, roughness: 1.3, bowing: 1.1, strokeWidth: 1.6, stroke: '#1e1e1e' }, o);
      const FONTE = "Virgil, 'Segoe Print', 'Comic Sans MS', 'Patrick Hand', cursive";
      const fundo = document.createElementNS(NS, 'rect'); fundo.setAttribute('width', d.w); fundo.setAttribute('height', d.h); fundo.setAttribute('fill', '#ffffff'); svg.appendChild(fundo);
      const texto = (x, y, s, tam, peso, cor = '#1e1e1e', anc = 'middle') => {
        const t = document.createElementNS(NS, 'text'); t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('text-anchor', anc);
        t.setAttribute('font-family', FONTE); t.setAttribute('font-size', tam); t.setAttribute('font-weight', peso); t.setAttribute('fill', cor); t.textContent = s; svg.appendChild(t);
      };
      texto(d.w / 2, 46, d.titulo, 28, 700);
      d.grupos.forEach((g) => {
        svg.appendChild(rc.rectangle(g.x, g.y, g.w, g.h, opt(g.destaque ? { stroke: '#7c3aed', strokeWidth: 2, fill: '#f5f3ff', fillStyle: 'solid' } : { stroke: '#9ca3af', strokeLineDash: [8, 8], strokeWidth: 1.2 })));
        texto(g.x + g.w / 2, g.y - 10, g.rot, 15, 700, g.destaque ? '#6d28d9' : '#6b7280');
      });
      const por = {};
      d.nos.forEach((n) => {
        por[n.id] = n;
        const cor = n.selo ? { stroke: '#15803d', fill: '#dcfce7' } : n.privado ? { stroke: '#b45309', fill: '#fef3c7' } : n.peq ? { stroke: '#1e1e1e', fill: '#f8fafc' } : { stroke: '#1e1e1e', fill: '#ffffff' };
        svg.appendChild(rc.rectangle(n.x, n.y, n.w, n.h, opt({ fill: cor.fill, fillStyle: 'solid', stroke: cor.stroke })));
        const tamI = n.peq ? 26 : 34;
        const ix = n.peq ? n.x + 14 : n.x + n.w / 2 - tamI / 2, iy = n.peq ? n.y + n.h / 2 - tamI / 2 : n.y + 10;
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('transform', `translate(${ix},${iy}) scale(${tamI / 24})`);
        g.setAttribute('fill', 'none'); g.setAttribute('stroke', cor.stroke === '#1e1e1e' ? '#334155' : cor.stroke); g.setAttribute('stroke-width', '1.8');
        g.setAttribute('stroke-linecap', 'round'); g.setAttribute('stroke-linejoin', 'round'); g.innerHTML = ICONS[n.icon]; svg.appendChild(g);
        if (n.peq) {
          const cx = n.x + 50, base = n.y + n.h / 2 - (n.t.length - 1) * 9 + 5;
          n.t.forEach((s, i) => texto(cx, base + i * 18, s, i ? 13 : 16, i ? 400 : 700, i ? '#475569' : '#1e1e1e', 'start'));
        } else {
          n.t.forEach((s, i) => texto(n.x + n.w / 2, n.y + 10 + tamI + 20 + i * 19, s, i ? 14 : 17, i ? 400 : 700, i ? '#475569' : '#1e1e1e'));
        }
      });
      const seta = (a, c) => {
        // liga a borda direita de "a" à borda esquerda de "c" (ou de baixo para cima se estão na mesma coluna)
        let x1, y1, x2, y2;
        if (c.x > a.x + a.w - 5) { x1 = a.x + a.w; y1 = a.y + a.h / 2; x2 = c.x; y2 = c.y + c.h / 2; }
        else if (c.y > a.y) { x1 = a.x + a.w / 2; y1 = a.y + a.h; x2 = c.x + c.w / 2; y2 = c.y; }
        else { x1 = a.x + a.w / 2; y1 = a.y; x2 = c.x + c.w / 2; y2 = c.y + c.h; }
        const mx = (x1 + x2) / 2;
        svg.appendChild(rc.curve([[x1, y1], [mx, y1 + (y2 - y1) * 0.15], [mx, y2 - (y2 - y1) * 0.15], [x2 - 2, y2]], opt({ strokeWidth: 1.4, roughness: 0.8 })));
        const ang = Math.atan2(y2 - (y2 - (y2 - y1) * 0.15), x2 - mx || 0.001);
        const a1 = ang + Math.PI * 0.85, a2 = ang - Math.PI * 0.85, L = 11;
        svg.appendChild(rc.linearPath([[x2 + L * Math.cos(a1), y2 + L * Math.sin(a1)], [x2, y2], [x2 + L * Math.cos(a2), y2 + L * Math.sin(a2)]], opt({ strokeWidth: 1.6, roughness: 0.6 })));
      };
      d.setas.forEach(([a, c]) => seta(por[a], por[c]));
      return svg.outerHTML;
    }, { d, ICONS });
    const cab = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Gerado por docs/diagramas/gerar.js (rough.js MIT + ícones Lucide ISC). Edite o script, não o SVG. -->\n`;
    fs.writeFileSync(path.join(SAIDA, `${nome === 'atual' ? 'arquitetura-atual' : 'plano-notion'}.svg`), cab + svg);
  }
  await b.close();
})();
