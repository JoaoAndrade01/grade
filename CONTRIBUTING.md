# Como contribuir com a Grade ECI

Obrigado por querer ajudar. A Grade é feita por alunos de ECI, e qualquer aluno pode corrigir um erro, propor
uma experiência nova ou ajudar a manter os dados. Antes de começar, leia a [visão](docs/VISAO.md) em dois
minutos.

## Regras de privacidade

A Grade trata dados acadêmicos, e a regra mais importante é: **nenhum dado pessoal entra no repositório, nas
Issues nem nos Pull Requests.**

- Use **só dados fictícios** em testes, exemplos, capturas de tela e relatos.
- Não anexe PDFs do SIGA, prints com nome ou matrícula, nem o seu `perfil.js`. Os arquivos `perfil/perfil.js`,
  `*.pdf` e `*.xlsx` já estão no `.gitignore`; não force a entrada deles.
- Não afrouxe a política de segurança de conteúdo (CSP) nem adicione scripts, fontes ou APIs de outros
  domínios. Copie o arquivo para o repositório.
- Ao mudar o importador, preserve o filtro que descarta os cabeçalhos pessoais.

O detalhe técnico está em [docs/PRIVACIDADE.md](docs/PRIVACIDADE.md).

## Rodar o kit de testes

O kit usa PDFs e perfis **fictícios** (`testes/fixtures`) e não precisa de nada seu. Instalação e comandos
estão em [testes/README.md](testes/README.md). Rode a matriz antes de abrir um Pull Request. Se você só mexeu
em documentos, confira que os links relativos abrem.

## Corrigir um defeito: vermelho → verde

1. Escreva o **caso de teste** que reproduz o erro com dados fictícios. Rode e veja **falhar** (vermelho).
2. Corrija. Rode e veja **passar** (verde).
3. No Pull Request, mostre os dois resultados. Se o cenário já passava, diga por quê.

Se a mudança é intencional (um requisito mudou), atualize o caso esperado e registre a decisão em
[docs/DECISOES.md](docs/DECISOES.md). Os casos e os requisitos estão em [docs/REQUISITOS.md](docs/REQUISITOS.md).

## Mexer no importador: paridade

O importador existe em JavaScript (`js/siga.js`) e em Python (`ferramentas/gerar_perfil.py`), e as duas
versões precisam gerar o **mesmo perfil**. Se você mudar uma, mude a outra e rode a paridade, como descrito em
[testes/README.md](testes/README.md) e [docs/IMPORTADOR.md](docs/IMPORTADOR.md). A paridade só acusa
divergência entre as duas; erro nas duas continua exigindo um caso com resultado esperado escrito à mão.

## Ciclo de revisão

1. Abra uma **Issue** descrevendo o esperado, o observado e os passos, com dados fictícios.
2. Trabalhe numa branch e faça commits pequenos, com mensagens em português.
3. Abra o **Pull Request** com o que mudou, por quê, e como testou.
4. **Outra pessoa revisa.** Quem escreveu a mudança não é quem a aprova.
5. Quem mantém integra a versão aprovada, pelo **hash do commit**, e confere o resultado na publicação
   ([docs/PUBLICAR.md](docs/PUBLICAR.md)).

Escreva em português do Brasil, com frases curtas e datas no formato AAAA-MM-DD.

## Propor uma experiência de "A ECI por trás da Grade"

A aba mostra como as disciplinas do curso aparecem no próprio site (ver [docs/VISAO.md](docs/VISAO.md)). Quer
sugerir uma? Abra uma Issue com:

- **A disciplina** e o **conceito** que a experiência mostra (por exemplo, "COS231: detectar choque de horário
  com intervalos").
- **Por que ajuda** a entender ou a motivar quem vai cursá-la.
- **Como seria**: uma interação curta, com **dados fictícios**.

Toda experiência precisa:

- não ler nem gravar o perfil, os planos nem o armazenamento do navegador da pessoa;
- funcionar por HTTP e por `file://`, com teclado, sem biblioteca externa;
- ter um caso no kit de testes.

As experiências atuais estão em `js/eci.js` e em `js/demo-pdf.js`.

## Contribuir com IA

Usar uma ferramenta de IA para contribuir é bem-vindo, com estas regras:

- **Não cole** PDFs do SIGA, prints identificáveis nem o seu perfil em nenhuma ferramenta de IA. Se precisar de
  um exemplo, use os arquivos de `testes/fixtures` ou crie dados fictícios.
- **Quem abre o Pull Request revisa e testa** o que a IA produziu. Rode o kit e leia o diff inteiro: a
  responsabilidade é sua.
- **Declare o uso de IA** na descrição do Pull Request: qual ferramenta e em que parte.
- **Credite no commit** com o trailer `Co-Authored-By`, em linha própria no fim da mensagem, usando a
  identidade pública da ferramenta. Exemplo fictício:

  ```text
  Co-Authored-By: Assistente Exemplo <assistente@example.com>
  ```

- Agentes de IA devem seguir o [AGENTS.md](AGENTS.md). Instruções pessoais ficam na sua configuração, fora do
  repositório.
