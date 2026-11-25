# Grade Interativa — Engenharia de Computação e Informação (UFRJ)

Fluxograma interativo da grade de ECI: veja o que já cursou, pinte as disciplinas com tags,
planeje os próximos períodos com horários, escolha optativas e controle pedidos de equivalência
e horas de Extensão/ACE.

Fork de [`gremio-eci/grade`](https://github.com/gremio-eci/grade). A versão original continua em `classico.html`.

## Começar em 3 passos

1. **Abra o app**: pelo GitHub Pages, ou baixe o repositório e dê dois cliques em `index.html`.
   (Não precisa instalar nada.)
2. **Baixe do SIGA**, em PDF, o seu **Histórico** e o **BOA** (Boletim de Orientação Acadêmica).
   Se você mudou de curso, baixe também o histórico do curso anterior.
3. No app, clique em **⤓ Importar do SIGA**, escolha os PDFs e clique em **Usar este perfil**.

Pronto: a grade aparece pintada com o que você já fez e está cursando.

O site abre no **modo clássico**: só a grade inteira na tela e uma paleta embaixo para pintar. O **interruptor**
no canto superior direito desliga o modo clássico e mostra as abas abaixo.

**Seus dados não saem do computador.** Os PDFs são lidos dentro da página, nome e CPF não são lidos, e uma
política de segurança faz o navegador bloquear qualquer envio para fora. Clique no escudo para conferir
(detalhes em [`docs/PRIVACIDADE.md`](docs/PRIVACIDADE.md)).

![Fluxo da Grade Interativa](docs/diagramas/arquitetura-atual.svg)

> Prefere terminal? `pip install pypdf` e
> `python ferramentas/gerar_perfil.py --historico historico.pdf --boa boa.pdf -o perfil/perfil.js`

## O que dá para fazer

| Tela | Para quê |
|---|---|
| **Modo clássico** (abre assim) | Grade inteira numa tela. Escolha uma tag na **paleta** (Aprovada, Aprovação esperada, Cursando, Reprovação esperada, Planejada, ou tags suas) e clique nas disciplinas. No celular, os períodos aparecem em lista |
| **Grade** (modo completo) | A mesma grade, com **Exibir** (código/créditos, notas, dificuldade, presença), filtro por dificuldade 🟢🔵🟡🟠🔴 e clique que abre os detalhes |
| **Linha do tempo** | Seus períodos reais, com notas, reprovações, equivalências, dispensas e o progresso por grupo |
| **Optativas** | Catálogo completo, com marcação **ativa/inativa** (tem turma) e filtros "só liberadas" e "só as que cabem" no seu horário |
| **Cronograma** | Grade semanal por período, com choques, horários de referência, sugestões e proposta sem choques |
| **Equivalências e Extensão / ACE** | Pedidos de dispensa (várias cursadas → uma eletiva), checagem de C.H. e do prazo de 5 anos, contas automáticas, horas de extensão |

A **barra no topo** mostra quanto do curso está concluído, cursando, planejado e não planejado.

## Salvar e levar para outro computador

O app guarda tudo no navegador. Para ter um arquivo: **Exportar perfil.js** (na aba Cronograma ou
Equivalências) ou **Baixar perfil.js** no aviso do topo. Coloque o arquivo em `perfil/perfil.js`
(ele está no `.gitignore`, não vai para o git).

## Para quem quer mexer no código

| Documento | Conteúdo |
|---|---|
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | De onde vêm os dados, camadas do app, ponto de partida, melhorias e o plano de automação com o Notion |
| [`docs/PERFIL.md`](docs/PERFIL.md) | Formato do `perfil.js` |
| [`docs/IMPORTADOR.md`](docs/IMPORTADOR.md) | Regras de leitura dos PDFs do SIGA e teste de paridade |
| [`docs/PRIVACIDADE.md`](docs/PRIVACIDADE.md) | Como o app garante que nada sai do computador, e como conferir |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Identidade visual, componentes e acessibilidade |
| [`docs/PUBLICAR.md`](docs/PUBLICAR.md) | Como publicar no GitHub Pages e sincronizar o fork |
| [`docs/MUDANCAS.md`](docs/MUDANCAS.md) | Registro passo a passo das mudanças |

Estrutura:

```
index.html            app (nova versão)          classico.html   versão original
js/app.js             modelo + telas             js/siga.js      regras do importador do SIGA
js/database.js        currículo e requisitos     js/optativas.js catálogo de eletivas (SIGA)
js/horarios.js        turmas de referência       js/guia.js      dificuldade/presença (Notion)
js/icones.js          ícones Lucide (ISC)        docs/diagramas/ diagramas (gerar.js → SVG)
js/vendor/            pdf.js (Apache-2.0)        static/app.css  estilos
ferramentas/          gerar_perfil.py · gerar_perfil_node.js · testar_paridade.sh
perfil/               perfil.exemplo.js (perfil.js pessoal fica fora do git)
docs/                 documentação
```

Sem build e sem dependências: edite e recarregue a página (Ctrl+F5).
Para rodar com servidor local: `python -m http.server 8000` e abra `http://localhost:8000`.

## Créditos e licença

- Projeto original: Grêmio ECI / [carloseduardov8](https://github.com/carloseduardov8/Interactive-Flowchart) — AGPL-3.0.
- Currículo e catálogo: SIGA/UFRJ (repositório público de currículos).
- Horários e guia dos alunos: página "Grades de ECI (Editável)" no Notion, feita por alunos de ECI.
- pdf.js: Mozilla, Apache-2.0 (`js/vendor/LICENSE-pdfjs.txt`). Ícones: Lucide, ISC. Diagramas: rough.js, MIT.

Licença: AGPL-3.0 (ver `LICENSE`).
