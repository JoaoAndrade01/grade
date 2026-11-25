---
# Identidade visual da Grade Interativa (formato inspirado no DESIGN.md do Google Labs)
nome: Grade ECI
logo: static/logo-gremio-eci.png (Grêmio de ECI; também é o favicon)
tema: segue o sistema até a primeira escolha (botão sol/lua ou Configurações); a escolha vale também para controles nativos (color-scheme)
aparencia: abas e barra com "Ícone e texto" (padrão), "Somente texto" ou "Somente ícone" (data-aparencia no <html>)
tipografia:
  familia: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif
  base: 14px
  nome-da-disciplina: 600, clamp(10px, .78vw, 13px) na grade de uma tela; 13px no celular
cores:
  aprovado: "#16a34a"
  aprovacao-esperada: "#84cc16"
  cursando: "#2563eb"
  reprovacao-esperada: "#dc2626"
  planejado: "#7c3aed"
  analise: "#b45309"
  pendente: "#94a3b8"
  alerta: { claro: "#b45309", escuro: "#fbbf24" }   # avisos em texto, contraste >= 4,5:1
  foco: { claro: "#1d4ed8", escuro: "#93c5fd" }
  grupos: { obrigatorias: "#475569", condicionadas: "#d97706", livre: "#0d9488", humanas: "#db2777", ace: "#4f46e5" }
espaco: { raio: 10px, raio-paleta: 16px, gap-cartoes: 6–8px }
alvo-de-toque-minimo: 44px (48px no celular)
icones: Lucide (traço 2, 18px), embutidos em js/icones.js
movimento: só transições curtas; respeita prefers-reduced-motion
---

# Princípios

1. **A grade é a estrela.** No modo clássico (padrão) só aparecem o logo e o título, a barra de progresso (com perfil),
   a grade e a paleta. Todo o resto mora no modo completo ou em **Configurações**.
2. **Barra mínima.** O topo tem a engrenagem (sempre), o seletor de modo (pode ser ocultado) e só os atalhos que a pessoa
   fixar. Sem perfil, "Criar perfil" e "Importar do SIGA" aparecem por padrão.
3. **Uma tela.** Em telas largas, os 10 períodos cabem lado a lado sem rolagem horizontal; a altura dos cartões
   se ajusta à janela.
4. **Celular em lista.** Abaixo de 720px, os períodos empilham e as matérias ficam em 2 colunas; nada de girar o aparelho.
5. **Pintar é o gesto principal.** A paleta flutua embaixo, sempre à mão, com botões de 44px.
6. **Cor tem significado, e sempre vem com nome.** As tags mostram nome, contagem e dica de como contam.
   O texto sobre a cor escolhe preto ou branco pela maior razão de contraste (WCAG).
7. **Privacidade visível.** Privacidade (em Configurações, fixável) explica e comprova que nada sai do computador;
   o aviso junto do seletor de PDFs repete a garantia no momento da escolha.
8. **Aprender com o próprio site.** "A ECI por trás da Grade" começa pelo problema, só depois nomeia o conceito
   e guarda a explicação técnica em "Ver a lógica".

# Componentes

| Componente | Estados | Regras |
|---|---|---|
| Cartão de disciplina (`.card.limpo`) | sem tag · com tag (fundo 22% da cor + borda) · equivalência pedida (contorno tracejado âmbar) · apagado pelo filtro (25%) · destaque de requisito (contorno vermelho/laranja) | Nome em destaque; extras só se "Exibir" pedir |
| Paleta (`.paleta .pal-btn`) | normal · ativa (fundo da cor, texto com contraste) · foco (contorno azul) | 44px; rola na horizontal no celular |
| Interruptor (`#seletor-modo`) | ligado (verde) = modo clássico · desligado = completo · oculto (Configurações) · foco visível | sem rótulo visível; `aria-label="Modo clássico"` |
| Barra de atalhos (`#atalhos`, `.btn-atalho`) | fixado · desafixado · primário sem perfil | ícone e texto por padrão; o nome acessível vem do texto (escondido só visualmente em "Somente ícone") |
| Configurações (`#dlg-config`) | `<dialog>` modal; seções Perfil e dados, Aparência, Grade, Referências | cada atalho tem abrir + "Fixar" (`aria-pressed`); controles sincronizados com a Grade |
| Setas de requisitos (`svg.setas`) | ocultas · em foco (entra vermelho, sai âmbar) · todas (por baixo dos cartões) · simulada (pontilhada) | contínua = pré-requisito, tracejada = co-requisito; `pointer-events: none` |
| Cadeado (`#cadeado`) | desligado · ligado (fundo escuro) | só ícone, `aria-label="Proteger disciplinas cursadas"` + `aria-pressed` |
| Seletor "ECI por trás" (`#pal-eci`) | desligado · ligado: cartões com experiência contornados, os demais `inert` e atenuados | Esc desliga |
| Experiência (`#dlg-eci`) | `<dialog>` em tela cheia | "Voltar" e Esc fecham; o foco volta ao cartão ou botão que abriu |
| Barra geral (`.bg-barra`) | concluída · cursando · planejada · não planejada | 8px no modo clássico; 14px com legenda no completo |
| Painel lateral (`.detalhes`) | aberto · fechado | lateral no computador; folha inferior no celular |

# Acessibilidade (checklist de lançamento)

- Contraste do texto ≥ 4,5:1 nas cores de tag (escolha automática preto/branco).
- Todos os botões alcançáveis por teclado, com foco visível; Esc fecha painéis.
- Ícones com `aria-hidden`; botões só com ícone têm nome acessível (`aria-label` ou texto escondido só visualmente).
- Alvos de toque de 44px no celular (barra, abas, diálogos).
- Avisos não dependem de passar o mouse (oferta por semestre, cadeado, ciclo simulado).
- Funciona em 320px de largura.
