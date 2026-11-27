// Gera os diagramas da arquitetura a partir de um único conjunto de relações:
//   - os SVGs (com as marcas locais e ícones de arquivo) em docs/diagramas/;
//   - os blocos Mermaid de docs/ARQUITETURA.md, entre os marcadores <!-- mermaid:ID --> e <!-- /mermaid:ID -->.
// Cada vista tem título, fronteira (grupos), nós, relações direcionadas e um estado (v2.0.0 ou planejado).
// Uso, sem dependências: node docs/diagramas/gerar.js
const fs = require('node:fs');
const path = require('node:path');

// Tipos de nó: pessoa, sistema (a Grade), externo (serviço de terceiros), privado (dados da pessoa),
// planejado (ainda não existe). `selo` destaca uma garantia.
const vistas = [
  {
    id: 'atual', arquivo: 'arquitetura-atual.svg', direcao: 'LR',
    w: 1500, h: 970, titulo: 'FLUXO DE DADOS DA GRADE ECI', estado: 'ESTADO: v2.0.0',
    descricao: 'Dados públicos e o perfil local alimentam a Grade no navegador. Configurações ajusta a interface, o aviso no rodapé e as notas dizem que a Grade não é oficial e as experiências da ECI usam dados fictícios.',
    grupos: [
      { x: 20, y: 90, w: 300, h: 850, rot: 'ORIGENS DOS DADOS' },
      { x: 400, y: 90, w: 300, h: 850, rot: 'PROCESSAMENTO' },
      { x: 760, y: 90, w: 260, h: 850, rot: 'ARQUIVOS' },
      { x: 1080, y: 90, w: 400, h: 850, rot: 'GRADE INTERATIVA (no seu navegador)', destaque: true },
    ],
    nos: [
      { id: 'siga', x: 50, y: 130, w: 240, h: 110, icon: 'ufrj', t: ['SIGA', 'Currículo público'] },
      { id: 'notion', x: 50, y: 270, w: 240, h: 110, icon: 'notion', t: ['Notion', 'Horários e guia de ECI'] },
      { id: 'pdf', x: 50, y: 410, w: 240, h: 110, icon: 'pdf', t: ['PDFs do aluno', 'Histórico e BOA'] },
      { id: 'aluno', x: 50, y: 570, w: 240, h: 110, icon: 'user', t: ['Você', 'planos, pedidos,', 'tags'] },
      { id: 'extr', x: 430, y: 200, w: 240, h: 120, icon: 'cog', t: ['Extração', '1× por semestre', '(à mão, com validador)'] },
      { id: 'imp', x: 430, y: 420, w: 240, h: 120, icon: 'scripts', t: ['Importador', 'siga.js e gerar_perfil.py', 'Mesmas regras'] },
      { id: 'db', x: 785, y: 120, w: 210, h: 70, icon: 'js', t: ['database.js', 'Currículo'] },
      { id: 'opt', x: 785, y: 205, w: 210, h: 70, icon: 'js', t: ['optativas.js', 'Eletivas'] },
      { id: 'hor', x: 785, y: 290, w: 210, h: 70, icon: 'js', t: ['horarios.js', 'Turmas'] },
      { id: 'guia', x: 785, y: 375, w: 210, h: 70, icon: 'js', t: ['guia.js', 'Dificuldade'] },
      { id: 'perfil', x: 785, y: 500, w: 210, h: 110, icon: 'hard-drive', t: ['Seu perfil', 'localStorage', 'ou perfil.js'], tipo: 'privado' },
      { id: 'demo', x: 785, y: 630, w: 210, h: 70, icon: 'js', t: ['demo-pdf.js', 'PDFs fictícios e paridade'] },
      { id: 'modelo', x: 1110, y: 130, w: 340, h: 90, icon: 'layers', t: ['Modelo', 'status · créditos · requisitos · fase'] },
      { id: 'g1', x: 1110, y: 270, w: 160, h: 90, icon: 'palette', t: ['Grade', 'Tags e destaque'], peq: true },
      { id: 'g2', x: 1286, y: 270, w: 164, h: 90, icon: 'list-tree', t: ['Linha do tempo'], peq: true },
      { id: 'g3', x: 1110, y: 380, w: 160, h: 90, icon: 'calendar-days', t: ['Cronograma'], peq: true },
      { id: 'g4', x: 1286, y: 380, w: 164, h: 90, icon: 'scroll-text', t: ['Equivalências', 'Extensão/ACE'], peq: true },
      { id: 'g5', x: 1110, y: 490, w: 160, h: 90, icon: 'book-open-check', t: ['Optativas'], peq: true },
      { id: 'exp', x: 1286, y: 490, w: 164, h: 90, icon: 'download', t: ['Exportar', 'perfil.js'], peq: true },
      { id: 'eci', x: 1110, y: 600, w: 160, h: 90, icon: 'book-open-check', t: ['A ECI por trás', 'da Grade', 'Dados fictícios'], peq: true },
      { id: 'cfg', x: 1286, y: 600, w: 164, h: 90, icon: 'gear', t: ['Configurações', 'Tema e atalhos'], peq: true },
      { id: 'faixa', x: 1110, y: 730, w: 340, h: 80, icon: 'scroll-text', t: ['Aviso e notas de estimativa', 'A Grade orienta, não confirma'], tipo: 'aviso' },
      { id: 'csp', x: 1110, y: 830, w: 340, h: 90, icon: 'shield-check', t: ['Importação no dispositivo', 'Cabeçalhos pessoais descartados'], tipo: 'selo' },
    ],
    rels: [['siga', 'extr'], ['notion', 'extr'], ['pdf', 'imp'], ['aluno', 'perfil'], ['extr', 'db'], ['extr', 'opt'], ['extr', 'hor'], ['extr', 'guia'], ['imp', 'perfil'],
      ['db', 'modelo'], ['opt', 'modelo'], ['hor', 'modelo'], ['guia', 'modelo'], ['perfil', 'modelo'], ['modelo', 'g1'], ['modelo', 'g2'], ['demo', 'eci']],
  },
  {
    id: 'contexto', arquivo: 'c4-contexto.svg', direcao: 'TB',
    w: 1500, h: 620, titulo: 'C4 · NÍVEL 1 · CONTEXTO', estado: 'ESTADO: v2.0.0',
    descricao: 'O aluno usa a Grade ECI no próprio navegador e baixa os PDFs no SIGA. O GitHub hospeda o site e recebe relatos em Issues públicas. Quem mantém confere o SIGA e o Notion e publica versões revisadas no GitHub.',
    grupos: [
      { x: 440, y: 245, w: 580, h: 210, rot: 'NO NAVEGADOR DO ALUNO (os dados ficam aqui)', destaque: true },
    ],
    nos: [
      { id: 'siga', x: 330, y: 90, w: 300, h: 100, icon: 'ufrj', t: ['SIGA', 'Currículo, Histórico e BOA'], tipo: 'externo' },
      { id: 'notion', x: 870, y: 90, w: 300, h: 100, icon: 'notion', t: ['Notion · Grades de ECI', 'Horários e guia dos alunos'], tipo: 'externo' },
      { id: 'aluno', x: 20, y: 300, w: 280, h: 110, icon: 'user', t: ['Aluno de ECI', 'planeja o curso'], tipo: 'pessoa' },
      { id: 'grade', x: 470, y: 280, w: 520, h: 140, icon: 'layers', t: ['Grade ECI (v2.0.0)', 'Site estático: sem servidor próprio.', 'PDFs e perfil só neste navegador'], tipo: 'sistema' },
      { id: 'mant', x: 1200, y: 300, w: 280, h: 110, icon: 'users', t: ['Quem mantém', 'confere as fontes'], tipo: 'pessoa' },
      { id: 'gh', x: 470, y: 490, w: 520, h: 100, icon: 'git-branch', t: ['GitHub', 'Pages, repositório e Issues públicas'], tipo: 'externo' },
    ],
    rels: [
      ['aluno', 'siga', 'baixa Histórico e BOA (PDF)'],
      ['aluno', 'grade', 'importa, planeja e consulta'],
      ['aluno', 'gh', 'relata erros em Issues'],
      ['gh', 'grade', 'serve os arquivos estáticos'],
      ['mant', 'notion', 'confere horários e guia'],
      ['mant', 'siga', 'confere o currículo'],
      ['mant', 'gh', 'publica versões revisadas'],
    ],
  },
  {
    id: 'conteineres', arquivo: 'c4-conteineres.svg', direcao: 'LR',
    w: 1500, h: 600, titulo: 'C4 · NÍVEL 2 · CONTÊINERES', estado: 'ESTADO: v2.0.0',
    descricao: 'A aplicação JavaScript roda no navegador e guarda o perfil no armazenamento local. O GitHub Pages entrega os arquivos estáticos. O perfil exportado fica no computador e o importador de terminal é opcional.',
    grupos: [
      { x: 360, y: 100, w: 520, h: 340, rot: 'NO NAVEGADOR DO ALUNO', destaque: true },
      { x: 960, y: 100, w: 520, h: 430, rot: 'NO COMPUTADOR DO ALUNO (fora do navegador)' },
    ],
    nos: [
      { id: 'aluno', x: 20, y: 460, w: 260, h: 100, icon: 'user', t: ['Aluno de ECI'], tipo: 'pessoa' },
      { id: 'pages', x: 20, y: 120, w: 280, h: 130, icon: 'globe', t: ['GitHub Pages', 'Serve o app e os dados', 'de referência (js/*.js)'], tipo: 'externo' },
      { id: 'app', x: 390, y: 140, w: 460, h: 130, icon: 'layers', t: ['Aplicação Grade', 'HTML, CSS e JavaScript.', 'Importa PDFs com pdf.js'], tipo: 'sistema' },
      { id: 'storage', x: 390, y: 330, w: 460, h: 90, icon: 'hard-drive', t: ['Armazenamento local', 'localStorage, por origem'], tipo: 'privado' },
      { id: 'arq', x: 990, y: 140, w: 460, h: 110, icon: 'js', t: ['Arquivo exportado', 'perfil.js ou .json, sob seu controle'], tipo: 'privado' },
      { id: 'cli', x: 990, y: 400, w: 460, h: 110, icon: 'py', t: ['Importador de terminal', 'Python (pypdf) ou Node. Opcional', 'Mesmas regras do navegador'] },
    ],
    rels: [
      ['aluno', 'app', 'usa'],
      ['pages', 'app', 'entrega os arquivos'],
      ['app', 'storage', 'grava e lê o perfil'],
      ['app', 'arq', 'exporta'],
      ['arq', 'app', 'carrega'],
      ['aluno', 'cli', 'opcional: PDFs no terminal'],
      ['cli', 'arq', 'gera'],
    ],
  },
  {
    id: 'componentes', arquivo: 'c4-componentes.svg', direcao: 'LR',
    w: 1500, h: 790, titulo: 'C4 · NÍVEL 3 · COMPONENTES DA APLICAÇÃO', estado: 'ESTADO: v2.0.0',
    descricao: 'A interface aciona a importação, pede ao modelo os cálculos e grava preferências na persistência. O modelo consulta os dados de referência e o perfil. As experiências didáticas usam dados fictícios e não leem nem gravam o perfil.',
    grupos: [
      { x: 290, y: 90, w: 1190, h: 670, rot: 'APLICAÇÃO GRADE (JavaScript no navegador)', destaque: true },
    ],
    nos: [
      { id: 'aluno', x: 20, y: 300, w: 230, h: 110, icon: 'user', t: ['Aluno de ECI'], tipo: 'pessoa' },
      { id: 'interface', x: 330, y: 290, w: 330, h: 140, icon: 'list-tree', t: ['Interface', 'Telas, Configurações,', 'aviso e notas (js/app.js)'] },
      { id: 'tema', x: 740, y: 110, w: 310, h: 90, icon: 'palette', t: ['Tema e aparência', 'js/tema.js'] },
      { id: 'importacao', x: 740, y: 220, w: 310, h: 110, icon: 'scripts', t: ['Importação do SIGA', 'js/siga.js e pdf.js:', 'leitura e prévia'] },
      { id: 'modelo', x: 740, y: 440, w: 310, h: 120, icon: 'calendar-days', t: ['Modelo e regras', 'progresso.js e conquistas.js', 'créditos, requisitos e selos'] },
      { id: 'eci', x: 740, y: 620, w: 310, h: 110, icon: 'book-open-check', t: ['A ECI por trás da Grade', 'js/eci.js e demo-pdf.js', 'Só dados fictícios'] },
      { id: 'persist', x: 1130, y: 295, w: 320, h: 130, icon: 'hard-drive', t: ['Persistência local', 'localStorage, exportar e', 'carregar perfil'], tipo: 'privado' },
      { id: 'dados', x: 1130, y: 500, w: 320, h: 130, icon: 'js', t: ['Dados de referência', 'database, optativas,', 'horários e guia'] },
    ],
    rels: [
      ['aluno', 'interface', 'usa'],
      ['interface', 'tema', 'aplica'],
      ['interface', 'importacao', 'aciona'],
      ['interface', 'modelo', 'pede os cálculos'],
      ['interface', 'eci', 'abre as experiências'],
      ['interface', 'persist', 'preferências e exportação'],
      ['importacao', 'persist', 'grava o perfil confirmado'],
      ['modelo', 'persist', 'lê o perfil'],
      ['modelo', 'dados', 'consulta'],
    ],
  },
  {
    id: 'manutencao', arquivo: 'fluxo-manutencao.svg', direcao: 'LR',
    w: 1500, h: 600, titulo: 'FLUXO DE MANUTENÇÃO', estado: 'ESTADO: v2.0.0 (manual)',
    descricao: 'Uma mudança vira um commit candidato, é testada pelo kit, pela paridade, pelo validador e pelas verificações de acessibilidade, é revisada por outra pessoa e só então o mesmo hash é publicado no GitHub Pages.',
    grupos: [
      { x: 20, y: 90, w: 300, h: 470, rot: 'CONTRIBUIÇÃO' },
      { x: 390, y: 90, w: 470, h: 470, rot: 'VERIFICAÇÃO DO CANDIDATO (por hash)', destaque: true },
      { x: 930, y: 90, w: 550, h: 470, rot: 'REVISÃO E PUBLICAÇÃO' },
    ],
    nos: [
      { id: 'colab', x: 50, y: 150, w: 240, h: 110, icon: 'users', t: ['Alunos e quem mantém', 'Issue, branch e', 'Pull Request'], tipo: 'pessoa' },
      { id: 'issues', x: 50, y: 400, w: 240, h: 110, icon: 'scroll-text', t: ['Issues públicas', 'relatos com dados', 'fictícios'], tipo: 'externo' },
      { id: 'cand', x: 420, y: 140, w: 410, h: 80, icon: 'git-branch', t: ['Commit candidato', 'hash completo'] },
      { id: 'kit', x: 420, y: 250, w: 410, h: 70, icon: 'py', t: ['Kit de interface', 'seis pares motor × abertura'], peq: true },
      { id: 'par', x: 420, y: 335, w: 410, h: 70, icon: 'py', t: ['Paridade JS × Python', 'e oráculos escritos à mão'], peq: true },
      { id: 'val', x: 420, y: 420, w: 410, h: 55, icon: 'book-open-check', t: ['Validador dos dados (RF-17)'], peq: true },
      { id: 'acc', x: 420, y: 490, w: 410, h: 55, icon: 'shield-check', t: ['axe, contraste, teclado, CSP'], peq: true },
      { id: 'rev', x: 960, y: 230, w: 230, h: 130, icon: 'users', t: ['Revisão', 'por outra pessoa', 'e aprovação do hash'], tipo: 'pessoa' },
      { id: 'pages', x: 1230, y: 150, w: 220, h: 110, icon: 'globe', t: ['GitHub Pages', 'o mesmo hash'], tipo: 'externo' },
      { id: 'rel', x: 1230, y: 330, w: 220, h: 110, icon: 'git-branch', t: ['Tag v2.0.0', 'e release com notas'], tipo: 'externo' },
    ],
    rels: [
      ['colab', 'cand', 'envia a mudança'],
      ['cand', 'kit'], ['cand', 'par'], ['cand', 'val'], ['cand', 'acc'],
      ['kit', 'rev'], ['par', 'rev'], ['val', 'rev'], ['acc', 'rev'],
      ['rev', 'pages', 'publica'],
      ['pages', 'rel', 'registra'],
      ['issues', 'colab', 'relatos'],
    ],
  },
  {
    id: 'automacao', arquivo: 'plano-notion.svg', direcao: 'LR',
    w: 1500, h: 660, titulo: 'AUTOMAÇÃO COM O NOTION', estado: 'PLANEJADO · FORA DA v2.0.0', planejado: true,
    descricao: 'Plano ainda não implementado. Primeiro um piloto com exportação CSV; depois leitura pela API, com conexão criada no espaço dos autores. Um conversor gera os arquivos, a validação falha fechada e a rotina propõe um Pull Request que uma pessoa revisa. Nada é publicado sem revisão.',
    grupos: [
      { x: 20, y: 90, w: 320, h: 540, rot: 'FONTES', plan: true },
      { x: 390, y: 90, w: 380, h: 540, rot: 'LEITORES', plan: true },
      { x: 820, y: 90, w: 330, h: 540, rot: 'GITHUB ACTIONS (semanal e manual)', plan: true },
      { x: 1200, y: 90, w: 280, h: 540, rot: 'REVISÃO E PUBLICAÇÃO', plan: true },
    ],
    nos: [
      { id: 'notion', x: 50, y: 230, w: 260, h: 110, icon: 'notion', t: ['Notion', 'Turmas e Disciplinas', 'só linhas aprovadas'], tipo: 'planejado' },
      { id: 'siga', x: 50, y: 470, w: 260, h: 110, icon: 'ufrj', t: ['SIGA', 'Currículo público'], tipo: 'planejado' },
      { id: 'csv', x: 420, y: 130, w: 320, h: 100, icon: 'js', t: ['1º passo: CSV', 'exportado do Notion (piloto)'], tipo: 'planejado' },
      { id: 'api', x: 420, y: 270, w: 320, h: 100, icon: 'cog', t: ['Depois: API de leitura', 'conexão nos autores,', 'versão fixada'], tipo: 'planejado' },
      { id: 'cur', x: 420, y: 470, w: 320, h: 110, icon: 'py', t: ['Atualizador do currículo', 'RF-16'], tipo: 'planejado' },
      { id: 'conv', x: 850, y: 170, w: 270, h: 120, icon: 'py', t: ['Conversor', 'gera horarios.js e guia.js', 'saída determinística'], tipo: 'planejado' },
      { id: 'val', x: 850, y: 350, w: 270, h: 140, icon: 'book-open-check', t: ['Validação', 'RF-17, diff e queda em massa.', 'Falha fechada: preserva', 'o último conjunto bom'], tipo: 'planejado' },
      { id: 'pr', x: 1230, y: 140, w: 220, h: 110, icon: 'git-branch', t: ['Pull Request', 'nunca commit direto'], tipo: 'planejado' },
      { id: 'rev', x: 1230, y: 290, w: 220, h: 110, icon: 'users', t: ['Revisão humana', 'e aprovação'], tipo: 'planejado' },
      { id: 'pages', x: 1230, y: 440, w: 220, h: 110, icon: 'globe', t: ['GitHub Pages', 'publica o hash aprovado'], tipo: 'planejado' },
    ],
    rels: [
      ['notion', 'csv'], ['notion', 'api'], ['csv', 'conv', 'primeiro'], ['api', 'conv', 'depois'],
      ['siga', 'cur'], ['cur', 'val'], ['conv', 'val'],
      ['val', 'pr', 'só se passar'], ['pr', 'rev'], ['rev', 'pages', 'merge'],
    ],
  },
];

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
  gear: '<path d="M10 3h4l1 3 3 1 3 3-2 3v3l-3 2-2 3h-4l-2-3-3-2v-3l-2-3 3-3 3-1z"/><circle cx="12" cy="12" r="3"/>',
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
const texto = (x, y, s, classe, extra = '') => `<text x="${x}" y="${y}" class="${classe}"${extra}>${esc(s)}</text>`;

const CLASSES = { externo: ' externo', pessoa: ' pessoa', sistema: ' sistema', privado: ' privado', selo: ' local', aviso: ' aviso', planejado: ' planejado' };

function desenharNo(n) {
  const centro = n.y + n.h / 2;
  const marca = marcas[n.icon];
  const tam = marca ? marca.largura : n.peq ? 25 : 32;
  const x = n.x + 16;
  const imagem = marca
    ? `<image href="${marca.url}" x="${x}" y="${centro - 26}" width="${tam}" height="52" aria-label="${marca.nome}"/>`
    : `<g transform="translate(${x} ${centro - tam / 2}) scale(${tam / 24})" class="icone">${icones[n.icon]}</g>`;
  const cor = CLASSES[n.tipo] || '';
  const y = centro + 5 - (n.t.length - 1) * 9;
  const rotulos = n.t.map((s, i) => texto(x + tam + 14, y + i * 19, s, i ? 'descricao' : n.peq ? 'rotulo compacto' : 'rotulo'));
  return [`<g id="${n.id}">`, `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="12" class="no${cor}"/>`,
    imagem, ...rotulos, '</g>'].join('\n');
}

// Geometria de uma relação: curva e ponto do rótulo. `desl` afasta relações de sentido oposto entre os mesmos nós.
function geometria(a, b, desl = 0) {
  if (b.x >= a.x + a.w) {
    const x = a.x + a.w, y1 = a.y + a.h / 2 + desl, y2 = b.y + b.h / 2 + desl, meio = (x + b.x) / 2;
    return { d: `M${x} ${y1} C${meio} ${y1} ${meio} ${y2} ${b.x - 3} ${y2}`, lx: meio, ly: (y1 + y2) / 2 };
  }
  const x1 = a.x + a.w / 2 + desl, x2 = b.x + b.w / 2 + desl;
  const abaixo = b.y >= a.y + a.h;
  const y1 = abaixo ? a.y + a.h : a.y, y2 = abaixo ? b.y - 3 : b.y + b.h + 3;
  const meio = (y1 + y2) / 2;
  return { d: `M${x1} ${y1} C${x1} ${meio} ${x2} ${meio} ${x2} ${y2}`, lx: (x1 + x2) / 2, ly: meio };
}

function desenhar(d) {
  const nos = new Map(d.nos.map((n) => [n.id, n]));
  const deslocamento = (i) => {
    const [a, b] = d.rels[i];
    const j = d.rels.findIndex(([c, e]) => c === b && e === a);
    return j < 0 ? 0 : i < j ? -14 : 14;
  };
  const geos = d.rels.map(([a, b], i) => geometria(nos.get(a), nos.get(b), deslocamento(i)));
  const grupos = d.grupos.flatMap((g) => [
    `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="20" class="grupo${g.destaque ? ' destaque' : ''}${g.plan ? ' plan' : ''}"/>`,
    texto(g.x + 22, g.y - 13, g.rot, 'coluna'),
  ]);
  const rotulos = d.rels.map((r, i) => (r[2] ? texto(Math.round(geos[i].lx), Math.round(geos[i].ly) - 6, r[2], 'rel', ' text-anchor="middle"') : null)).filter(Boolean);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- Gerado por docs/diagramas/gerar.js. Atribuição das marcas em docs/ARQUITETURA.md. -->',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${d.w}" height="${d.h}" viewBox="0 0 ${d.w} ${d.h}" role="img" aria-labelledby="titulo" aria-describedby="descricao">`,
    `<title id="titulo">${esc(d.titulo)} (${esc(d.estado)})</title>`,
    `<desc id="descricao">${esc(d.descricao)}</desc>`,
    '<style>',
    'text{font-family:system-ui,Segoe UI,Arial,sans-serif;fill:#142238}',
    '.titulo{font-size:28px;font-weight:750}.coluna{font-size:13px;font-weight:700;letter-spacing:.8px;fill:#384d69}',
    '.estado{font-size:14px;font-weight:700;letter-spacing:.6px;fill:#384d69}.estado.plan{fill:#8a4b00}',
    '.rotulo{font-size:15px;font-weight:700}.rotulo.compacto{font-size:14px}.descricao{font-size:12px;fill:#465973}',
    '.rel{font-size:12px;fill:#2a4666;paint-order:stroke;stroke:#fcfdff;stroke-width:5px;stroke-linejoin:round}',
    '.grupo{fill:#f0f4fa;stroke:#cbd7e6}.destaque{fill:#edf0ff;stroke:#c7cbef}.grupo.plan{stroke:#d3a766;stroke-dasharray:8 5;fill:#fffaf1}',
    '.no{fill:#fff;stroke:#cbd7e6}.local{fill:#edfaf3;stroke:#a0cfb4}.privado{fill:#fff8e9;stroke:#dbbd86}',
    '.pessoa{fill:#eef6ff;stroke:#9fc0e6}.sistema{fill:#e6ecff;stroke:#8da4e6;stroke-width:2}.externo{fill:#f3f4f6;stroke:#b6bec9}',
    '.aviso{fill:#fff3e2;stroke:#e0b06a}.planejado{stroke:#d3a766;stroke-dasharray:8 5;fill:#fffdf8}',
    '.icone{fill:none;stroke:#2a4666;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}',
    '.setas{fill:none;stroke:#7186a2;stroke-width:1.6;marker-end:url(#seta)}',
    '</style>',
    '<defs><marker id="seta" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7z" fill="#7186a2"/></marker></defs>',
    `<rect width="${d.w}" height="${d.h}" fill="#fcfdff"/>`,
    texto(22, 47, d.titulo, 'titulo'),
    texto(d.w - 22, 47, d.estado, `estado${d.planejado ? ' plan' : ''}`, ' text-anchor="end"'),
    ...grupos,
    '<g class="setas">',
    ...geos.map((g) => `<path d="${g.d}"/>`),
    '</g>',
    ...d.nos.map(desenharNo),
    ...(rotulos.length ? ['<g class="rotulos">', ...rotulos, '</g>'] : []),
    '</svg>',
    '',
  ].join('\n');
}

// Mermaid a partir das mesmas relações: um nó pertence ao grupo cujo retângulo contém o seu centro.
const mermaidTexto = (t) => t.map((s) => s.replace(/"/g, "'")).join('<br/>');
function mermaid(d) {
  const dentro = (g, n) => n.x + n.w / 2 >= g.x && n.x + n.w / 2 <= g.x + g.w && n.y + n.h / 2 >= g.y && n.y + n.h / 2 <= g.y + g.h;
  const grupoDe = new Map();
  d.grupos.forEach((g, i) => d.nos.forEach((n) => { if (!grupoDe.has(n.id) && dentro(g, n)) grupoDe.set(n.id, i); }));
  const no = (n, recuo) => `${recuo}${n.id}["${mermaidTexto(n.t)}"]`;
  const linhas = [`flowchart ${d.direcao}`];
  d.grupos.forEach((g, i) => {
    const membros = d.nos.filter((n) => grupoDe.get(n.id) === i);
    if (!membros.length) return;
    linhas.push(`  subgraph G${i}["${g.rot.replace(/"/g, "'")}"]`, ...membros.map((n) => no(n, '    ')), '  end');
  });
  d.nos.filter((n) => !grupoDe.has(n.id)).forEach((n) => linhas.push(no(n, '  ')));
  d.rels.forEach(([a, b, r]) => linhas.push(r ? `  ${a} -->|"${r}"| ${b}` : `  ${a} --> ${b}`));
  return linhas.join('\n');
}

for (const v of vistas) {
  const nos = new Set(v.nos.map((n) => n.id));
  for (const [a, b] of v.rels) if (!nos.has(a) || !nos.has(b)) throw new Error(`${v.id}: relação ${a} → ${b} sem nó`);
  fs.writeFileSync(path.join(__dirname, v.arquivo), desenhar(v));
}

// Atualiza os blocos Mermaid de ARQUITETURA.md (só entre os marcadores).
const doc = path.join(__dirname, '..', 'ARQUITETURA.md');
if (fs.existsSync(doc)) {
  let md = fs.readFileSync(doc, 'utf8');
  for (const v of vistas) {
    const re = new RegExp(`(<!-- mermaid:${v.id} -->)[\\s\\S]*?(<!-- /mermaid:${v.id} -->)`);
    if (re.test(md)) md = md.replace(re, (_, ini, fim) => `${ini}\n\`\`\`mermaid\n${mermaid(v)}\n\`\`\`\n${fim}`);
  }
  fs.writeFileSync(doc, md);
}
