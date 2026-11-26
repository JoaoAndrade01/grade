# Instruções para agentes de IA

Regras públicas do projeto. O processo de contribuição está em [CONTRIBUTING.md](CONTRIBUTING.md).

## O projeto

A Grade ECI é um site estático (HTML, CSS e JavaScript, sem servidor próprio nem build) para alunos de
Engenharia de Computação e Informação da UFRJ planejarem o curso. Os dados acadêmicos ficam só no navegador.
Visão em [docs/VISAO.md](docs/VISAO.md); arquitetura em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Regras

- **Só dados fictícios.** Nunca leia, copie nem cole PDFs do SIGA, `perfil/perfil.js` ou qualquer dado
  pessoal. Para testar, use `testes/fixtures`. Não afrouxe a CSP nem adicione recursos de outros domínios.
- **Testes e paridade.** Para corrigir defeitos ou alterar o importador, siga os passos de teste (vermelho → verde) e de paridade
  JS × Python do [CONTRIBUTING.md](CONTRIBUTING.md). Comandos em [testes/README.md](testes/README.md).
- **Decisões** ficam em [docs/DECISOES.md](docs/DECISOES.md). Antes de mudar um comportamento, confira lá e em
  [docs/REQUISITOS.md](docs/REQUISITOS.md) e [docs/REGRAS-ACADEMICAS.md](docs/REGRAS-ACADEMICAS.md). Mudança de
  requisito registra uma decisão nova.
- **A Grade orienta, não confirma.** Estimativa e marcação manual aparecem como tais, nunca como dado oficial.
- **Idioma:** português do Brasil, frases curtas, datas AAAA-MM-DD. Commits em português.
- **Seja pequeno.** Mudanças focadas, sem refatorar fora do pedido. Declare o uso de IA no Pull Request.
