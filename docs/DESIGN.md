---
# Identidade visual da Grade Interativa (formato inspirado no DESIGN.md do Google Labs)
nome: Grade Interativa ECI
tema: claro e escuro automáticos (prefers-color-scheme)
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
  grupos: { obrigatorias: "#475569", condicionadas: "#d97706", livre: "#0d9488", humanas: "#db2777", ace: "#4f46e5" }
espaco: { raio: 10px, raio-paleta: 16px, gap-cartoes: 6–8px }
alvo-de-toque-minimo: 44px (48px no celular)
icones: Lucide (traço 2, 18px), embutidos em js/icones.js
movimento: só transições curtas; respeita prefers-reduced-motion
---

# Princípios

1. **A grade é a estrela.** No modo clássico (padrão) só aparecem o título, a barra de progresso, a grade e a paleta.
   Todo o resto mora no modo completo (interruptor sem texto no topo).
2. **Uma tela.** Em telas largas, os 10 períodos cabem lado a lado sem rolagem horizontal; a altura dos cartões
   se ajusta à janela.
3. **Celular em lista.** Abaixo de 720px, os períodos empilham e as matérias ficam em 2 colunas; nada de girar o aparelho.
4. **Pintar é o gesto principal.** A paleta flutua embaixo, sempre à mão, com botões de 44px.
5. **Cor tem significado, e sempre vem com nome.** As tags mostram nome, contagem e dica de como contam.
   O texto sobre a cor escolhe preto ou branco pela maior razão de contraste (WCAG).
6. **Privacidade visível.** O escudo no topo explica e comprova que nada sai do computador.

# Componentes

| Componente | Estados | Regras |
|---|---|---|
| Cartão de disciplina (`.card.limpo`) | sem tag · com tag (fundo 22% da cor + borda) · equivalência pedida (contorno tracejado âmbar) · apagado pelo filtro (25%) · destaque de requisito (contorno vermelho/laranja) | Nome em destaque; extras só se "Exibir" pedir |
| Paleta (`.paleta .pal-btn`) | normal · ativa (fundo da cor, texto com contraste) · foco (contorno azul) | 44px; rola na horizontal no celular |
| Interruptor (`.interruptor`) | ligado (verde) = modo clássico · desligado = completo · foco visível | sem rótulo visível; `aria-label="Modo clássico"` |
| Barra geral (`.bg-barra`) | concluída · cursando · planejada · não planejada | 8px no modo clássico; 14px com legenda no completo |
| Painel lateral (`.detalhes`) | aberto · fechado | lateral no computador; folha inferior no celular |

# Acessibilidade (checklist de lançamento)

- Contraste do texto ≥ 4,5:1 nas cores de tag (escolha automática preto/branco).
- Todos os botões alcançáveis por teclado, com foco visível; Esc fecha painéis.
- Ícones com `aria-hidden`; botões só com ícone têm `aria-label`.
- Funciona em 320px de largura.
