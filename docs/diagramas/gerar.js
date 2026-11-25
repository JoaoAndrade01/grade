// Gera os SVGs da arquitetura com as marcas locais e ícones de arquivo.
//   node docs/diagramas/gerar.js
const fs = require('node:fs');
const path = require('node:path');

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
      { id: 'siga', x: 50, y: 130, w: 240, h: 110, icon: 'ufrj', t: ['SIGA', 'Currículo público'] },
      { id: 'notion', x: 50, y: 270, w: 240, h: 110, icon: 'notion', t: ['Notion', 'Horários e guia de ECI'] },
      { id: 'pdf', x: 50, y: 410, w: 240, h: 110, icon: 'pdf', t: ['PDFs do aluno', 'Histórico e BOA'] },
      { id: 'aluno', x: 50, y: 570, w: 240, h: 110, icon: 'user', t: ['Você', 'planos, pedidos,', 'tags'] },
      { id: 'extr', x: 430, y: 200, w: 240, h: 120, icon: 'cog', t: ['Extração', '1× por semestre', '(script / à mão)'] },
      { id: 'imp', x: 430, y: 420, w: 240, h: 120, icon: 'scripts', t: ['Importador', 'siga.js e gerar_perfil.py', 'Mesmas regras'] },
      { id: 'db', x: 785, y: 120, w: 210, h: 70, icon: 'js', t: ['database.js', 'Currículo'] },
      { id: 'opt', x: 785, y: 205, w: 210, h: 70, icon: 'js', t: ['optativas.js', 'Eletivas'] },
      { id: 'hor', x: 785, y: 290, w: 210, h: 70, icon: 'js', t: ['horarios.js', 'Turmas'] },
      { id: 'guia', x: 785, y: 375, w: 210, h: 70, icon: 'js', t: ['guia.js', 'Dificuldade'] },
      { id: 'perfil', x: 785, y: 500, w: 210, h: 110, icon: 'hard-drive', t: ['Seu perfil', 'localStorage', 'ou perfil.js'], privado: true },
      { id: 'modelo', x: 1110, y: 130, w: 340, h: 90, icon: 'layers', t: ['Modelo', 'status · créditos · requisitos'] },
      { id: 'g1', x: 1110, y: 270, w: 160, h: 90, icon: 'palette', t: ['Grade', 'clássica'], peq: true },
      { id: 'g2', x: 1290, y: 270, w: 160, h: 90, icon: 'list-tree', t: ['Linha do', 'tempo'], peq: true },
      { id: 'g3', x: 1110, y: 380, w: 160, h: 90, icon: 'calendar-days', t: ['Cronograma'], peq: true },
      { id: 'g4', x: 1290, y: 380, w: 160, h: 90, icon: 'scroll-text', t: ['Equivalências', 'Extensão/ACE'], peq: true },
      { id: 'g5', x: 1110, y: 490, w: 160, h: 90, icon: 'book-open-check', t: ['Optativas'] },
      { id: 'exp', x: 1290, y: 490, w: 160, h: 90, icon: 'download', t: ['Exportar', 'perfil.js'] },
      { id: 'csp', x: 1110, y: 620, w: 340, h: 90, icon: 'shield-check', t: ['Importação no dispositivo', 'Cabeçalhos pessoais descartados'], selo: true },
    ],
    setas: [['siga','extr'],['notion','extr'],['pdf','imp'],['aluno','perfil'],['extr','db'],['extr','opt'],['extr','hor'],['extr','guia'],['imp','perfil'],
      ['db','modelo'],['opt','modelo'],['hor','modelo'],['guia','modelo'],['perfil','modelo'],['modelo','g1'],['modelo','g2']],
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
      { id: 'nt', x: 50, y: 130, w: 240, h: 100, icon: 'notion', t: ['Notion · Turmas', 'Código, dia, hora, ativa'] },
      { id: 'nd', x: 50, y: 250, w: 240, h: 100, icon: 'notion', t: ['Notion · Disciplinas', 'Nível, presença, dicas'] },
      { id: 'sc', x: 50, y: 400, w: 240, h: 100, icon: 'ufrj', t: ['SIGA', 'Currículo público'] },
      { id: 'sync', x: 420, y: 150, w: 320, h: 100, icon: 'py', t: ['sincronizar_notion.py', 'Token em Secret'] },
      { id: 'cur', x: 420, y: 415, w: 320, h: 95, icon: 'py', t: ['atualizar_curriculo.py'] },
      { id: 'val', x: 420, y: 280, w: 320, h: 105, icon: 'book-open-check', t: ['validação', 'códigos · horários'] },
      { id: 'f1', x: 865, y: 150, w: 210, h: 70, icon: 'js', t: ['horarios.js'] },
      { id: 'f2', x: 865, y: 240, w: 210, h: 70, icon: 'js', t: ['guia.js'] },
      { id: 'f3', x: 865, y: 330, w: 210, h: 90, icon: 'js', t: ['optativas.js', 'database.js'] },
      { id: 'gc', x: 865, y: 440, w: 210, h: 70, icon: 'git-branch', t: ['commit automático'], peq: true },
      { id: 'pg', x: 1190, y: 150, w: 260, h: 100, icon: 'globe', t: ['GitHub Pages', 'site estático'] },
      { id: 'al', x: 1190, y: 300, w: 260, h: 100, icon: 'users', t: ['Alunos', 'abrem o site'] },
      { id: 'pv', x: 1190, y: 415, w: 260, h: 105, icon: 'shield-check', t: ['PDFs ficam no', 'computador de cada um'], selo: true },
    ],
    setas: [['nt','sync'],['nd','sync'],['sc','cur'],['sync','val'],['cur','val'],['val','f1'],['val','f2'],['val','f3'],['f3','gc'],['gc','pg'],['pg','al']],
  },
};


const arquivo = (sigla, cor, tinta = '#fff') =>
  `<path fill="#fff" stroke="${cor}" d="M6 2h8l5 5v15H6z"/><path stroke="${cor}" d="M14 2v6h5"/>
   <rect x="2" y="11" width="20" height="8" rx="2" fill="${cor}" stroke="none"/>
   <text x="12" y="17" style="fill:${tinta}" stroke="none" font-family="Arial, sans-serif" font-size="6" font-weight="700" text-anchor="middle">${sigla}</text>`;

const icones = {
  pdf: arquivo('PDF', '#bd2527'),
  js: arquivo('JS', '#f4cd47', '#2b2100'),
  py: arquivo('PY', '#235f9c'),
  scripts: arquivo('&lt;/&gt;', '#5145a0'),
  user: '<circle cx="12" cy="7" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2z"/>',
  cog: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="white"/><circle cx="15" cy="12" r="2" fill="white"/><circle cx="10" cy="18" r="2" fill="white"/>',
  'hard-drive': '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="m3 10 3-6h12l3 6M3 15h18m-13 2h1"/>',
  layers: '<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  palette: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m6-16v16M3 10h18"/>',
  'list-tree': '<path d="M6 4v16m0-13h13m-13 5h10m-10 5h13"/><circle cx="6" cy="7" r="1.5" fill="white"/><circle cx="6" cy="12" r="1.5" fill="white"/><circle cx="6" cy="17" r="1.5" fill="white"/>',
  'calendar-days': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4m-8 7h2m4 0h2m-8 3h2"/>',
  'scroll-text': '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h4"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/>',
  'shield-check': '<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6zM9 12l2 2 4-4"/>',
  'book-open-check': '<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v14m3-9 1 1 3-3"/>',
  'git-branch': '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10m12-10c0 7-12 4-12 10"/>',
  globe: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20m-16 4h5m-5 4h8"/>',
  users: '<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2zM16 4a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5v2h-3"/>',
};

const marcas = {
  // Use a composição horizontal completa da UFRJ, com a proporção do original.
  ufrj: { largura: 96, arquivo: 'ufrj.svg', nome: 'UFRJ' },
  notion: { largura: 33, arquivo: 'notion.svg', nome: 'Notion' },
};
for (const marca of Object.values(marcas)) {
  const dados = fs.readFileSync(path.join(__dirname, marca.arquivo)).toString('base64');
  marca.url = `data:image/svg+xml;base64,${dados}`;
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const texto = (x, y, s, classe) => `<text x="${x}" y="${y}" class="${classe}">${esc(s)}</text>`;

function desenharNo(n) {
  const centro = n.y + n.h / 2;
  const marca = marcas[n.icon];
  const tam = marca ? marca.largura : n.peq ? 25 : 32;
  const x = n.x + 16;
  const imagem = marca
    ? `<image href="${marca.url}" x="${x}" y="${centro - 26}" width="${tam}" height="52" aria-label="${marca.nome}"/>`
    : `<g transform="translate(${x} ${centro - tam / 2}) scale(${tam / 24})" class="icone">${icones[n.icon]}</g>`;
  const cor = n.selo ? ' local' : n.privado ? ' privado' : '';
  const y = centro + 5 - (n.t.length - 1) * 9;
  const rotulos = n.t.map((s, i) => texto(x + tam + 14, y + i * 19, s, i ? 'descricao' : 'rotulo'));
  return [`<g id="${n.id}">`, `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="12" class="no${cor}"/>`,
    imagem, ...rotulos, '</g>'].join('\n');
}

function desenharSeta(a, b) {
  if (b.x >= a.x + a.w) {
    const x = a.x + a.w, y1 = a.y + a.h / 2, y2 = b.y + b.h / 2, meio = (x + b.x) / 2;
    return `<path d="M${x} ${y1} C${meio} ${y1} ${meio} ${y2} ${b.x - 3} ${y2}"/>`;
  }
  const x1 = a.x + a.w / 2, x2 = b.x + b.w / 2;
  const abaixo = b.y >= a.y + a.h;
  const y1 = abaixo ? a.y + a.h : a.y, y2 = abaixo ? b.y - 3 : b.y + b.h + 3;
  const meio = (y1 + y2) / 2;
  return `<path d="M${x1} ${y1} C${x1} ${meio} ${x2} ${meio} ${x2} ${y2}"/>`;
}

function desenhar(d) {
  const nos = new Map(d.nos.map((n) => [n.id, n]));
  const grupos = d.grupos.flatMap((g) => [
    `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="20" class="grupo${g.destaque ? ' destaque' : ''}"/>`,
    texto(g.x + 22, g.y - 13, g.rot, 'coluna'),
  ]);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- Gerado por docs/diagramas/gerar.js. Atribuição das marcas em docs/ARQUITETURA.md. -->',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${d.w}" height="${d.h}" viewBox="0 0 ${d.w} ${d.h}" role="img" aria-labelledby="titulo">`,
    `<title id="titulo">${esc(d.titulo)}</title>`,
    '<style>',
    'text{font-family:system-ui,Segoe UI,Arial,sans-serif;fill:#142238}',
    '.titulo{font-size:28px;font-weight:750}.coluna{font-size:13px;font-weight:700;letter-spacing:.8px;fill:#384d69}',
    '.rotulo{font-size:15px;font-weight:700}.descricao{font-size:12px;fill:#465973}',
    '.grupo{fill:#f0f4fa;stroke:#cbd7e6}.destaque{fill:#edf0ff;stroke:#c7cbef}',
    '.no{fill:#fff;stroke:#cbd7e6}.local{fill:#edfaf3;stroke:#a0cfb4}.privado{fill:#fff8e9;stroke:#dbbd86}',
    '.icone{fill:none;stroke:#2a4666;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}',
    '.setas{fill:none;stroke:#7186a2;stroke-width:1.6;marker-end:url(#seta)}',
    '</style>',
    '<defs><marker id="seta" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7z" fill="#7186a2"/></marker></defs>',
    `<rect width="${d.w}" height="${d.h}" fill="#fcfdff"/>`,
    texto(22, 47, d.titulo, 'titulo'),
    ...grupos,
    '<g class="setas">',
    ...d.setas.map(([a, b]) => desenharSeta(nos.get(a), nos.get(b))),
    '</g>',
    ...d.nos.map(desenharNo),
    '</svg>',
    '',
  ].join('\n');
}

for (const [nome, dados] of Object.entries(diagramas)) {
  const arquivo = nome === 'atual' ? 'arquitetura-atual.svg' : 'plano-notion.svg';
  fs.writeFileSync(path.join(__dirname, arquivo), desenhar(dados));
}
