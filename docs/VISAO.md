# Visão da Grade ECI

**Pergunta que este documento responde:** por que a Grade existe e para quem.
Para o que ela deve fazer, veja [REQUISITOS.md](REQUISITOS.md). Para as regras acadêmicas,
[REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md). Para o motivo de cada escolha, [DECISOES.md](DECISOES.md).

## O que é

A Grade ECI é um site para alunos de Engenharia de Computação e Informação da UFRJ planejarem o curso.
Ela reúne num só lugar o que você já cumpriu e o que falta em cada grupo de créditos, os próximos períodos
com requisitos e horários de referência, os pedidos de equivalência e as horas de extensão.

**Você monta uma previsão de formatura ao planejar os períodos.** A Grade não calcula uma data de formatura
por você. Ela mostra o que o seu plano cobre e o que ainda falta, para você ter uma meta clara e o controle do
próprio caminho, de forma agradável e intuitiva.

A Grade orienta. A confirmação acadêmica fica com o SIGA, o BOA e a coordenação do curso.

Os PDFs e o perfil são processados no seu dispositivo, no navegador. O arquivo exportado é uma cópia sob seu
controle e pode incluir dados acadêmicos e o nome que você informou. Guarde-o em local privado. Para usar o
planejamento em outro navegador, exporte antes de limpar os dados. Os links externos só abrem quando você
clica. Relatos de erro e propostas são Issues e Pull Requests do GitHub: são públicos e voluntários.

## Por que esta Grade existe

Planejar o curso exigia consultar vários lugares (SIGA, BOA, PDFs, o guia dos alunos), e os documentos se
perdiam no caminho. Sem uma previsão de formatura e uma meta clara, é fácil ir só seguindo e se perder.
A Grade nasceu para juntar tudo num lugar e colocar nas mãos de cada aluno a própria grade, o próprio futuro e
os próprios planos.

O projeto também é um exercício: consolidar conceitos de engenharia e de qualidade de software num exemplo
enxuto e útil para a comunidade.

## A ECI por trás da Grade

Cada recurso do site usa algo que se aprende no curso. Ler o PDF do SIGA é Algoritmos e Programação. As setas
de pré-requisito são Teoria dos Grafos. Conferir duas implementações uma contra a outra é Engenharia de
Software. A aba **A ECI por trás da Grade** mostra essas ligações com experiências curtas e dados fictícios.

A ideia é inspirar: mostrar que cada disciplina tem utilidade, usando o próprio site como exemplo didático de
si mesmo. O objetivo é cobrir, com o tempo, a maioria das disciplinas do curso. É um espaço aberto: qualquer
aluno pode propor uma nova experiência. Como propor está em [CONTRIBUTING.md](../CONTRIBUTING.md).

Hoje há três experiências (COS110, COS242 e EEL873). Entre as experiências planejadas estão COS231 e o diagrama
vivo de EEL873.

## 5W2H

| | |
| --- | --- |
| **O quê** | Um agregador para planejar, gerir e acompanhar o curso de ECI, e um exemplo didático do próprio curso |
| **Por quê** | Planejar exigia vários lugares, com perda de documentos e sem meta clara; e consolidar engenharia e qualidade de software num exemplo útil |
| **Quem** | Alunos de ECI usam e podem contribuir. Quem mantém revisa as fontes e coordena as atualizações |
| **Onde** | No navegador, pelo GitHub Pages ou por uma cópia local. Sem servidor próprio do app: os dados acadêmicos não saem do dispositivo |
| **Quando** | A primeira versão pública é a v2.0.0. Depois, o plano é manter a Grade a cada semestre ([MANUTENCAO.md](MANUTENCAO.md)). Sem data-alvo |
| **Como** | Etapas pequenas, revisão independente, testes com dados fictícios e condições claras para publicar (abaixo) |
| **Quanto** | Hospedagem gratuita. O custo é o tempo de quem mantém |

## Partes interessadas

| Parte | O que precisa da Grade | Como a Grade responde |
| --- | --- | --- |
| Calouros e alunos sem perfil | Entender o caminho do curso e o que fazer primeiro | Grade com pré-requisitos e paleta, sem criar conta nem enviar dados (H1) |
| Alunos com histórico no SIGA | Ver o que falta e planejar os períodos | Importação local, progresso por grupo e Cronograma (H2 a H4) |
| Alunos que pedem equivalência ou horas de extensão | Orientação para o pedido e controle das horas | Pedidos, avisos e horas "a confirmar" (H5 a H8) |
| Alunos que reingressaram | Prazos contados pelo histórico do curso atual | Regra de reingresso e escolha do histórico atual (H7) |
| **Alunos que contribuem** | Propor experiências, corrigir e, no futuro, manter | [CONTRIBUTING.md](../CONTRIBUTING.md), kit de testes com dados fictícios, [AGENTS.md](../AGENTS.md) (H13, H15) |
| Mantenedor atual | Atualizar currículo e horários com segurança | [MANUTENCAO.md](MANUTENCAO.md) e validador dos dados de referência (H14) |
| **Autores do guia no Notion** | Que os dados deles sejam usados com a atribuição combinada | Crédito no site. Têm papel técnico se houver automação: criar a conexão de leitura e manter a estrutura das bases (H16, planejada) |
| Grêmio ECI | Continuidade do projeto original | Crédito ao projeto de origem; correções do currículo podem voltar a ele (ver backlog em [MANUTENCAO.md](MANUTENCAO.md)) |
| Coordenação do curso | Que a Grade não pareça fonte oficial | Aviso no rodapé, seção Sobre e notas de estimativa; lista de consultas em [REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md) |

A Grade não é um serviço da UFRJ, do Grêmio nem da coordenação.

## Condições para publicar

Cada condição passa ou não passa, e é verificada no candidato à publicação, pelo hash do commit.

1. **Privacidade.** Nenhum dado pessoal sai do dispositivo.
2. **Correção.** Nenhum número mostrado pode estar errado sem aviso.
3. **Honestidade sobre o alcance.** Orientação e marcação manual não aparecem como verificação nem como
   registro oficial.
4. **Acessibilidade mínima.** Contraste, foco e teclado utilizáveis nos três navegadores do kit de testes.

Um problema que impeça o uso é bloqueante pela condição 4.

## Prioridades de melhoria

Depois das condições, nesta ordem:

1. **UX/UI:** uso agradável, funções úteis e intuitivas já na primeira visita.
2. **Continuidade:** testes, documentos e decisões no repositório.
3. **Conveniências.**

Desempate: o que atinge mais alunos, com menor custo. Quando uma prioridade entra em conflito com um aviso
necessário, o aviso fica, e o trabalho é desenhá-lo bem.
