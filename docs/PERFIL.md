# Formato do perfil (`perfil.js` ou `.json`)

**Pergunta que este documento responde:** o que há dentro do arquivo de perfil e o que o app aceita ler.
Quem gera o arquivo: [IMPORTADOR.md](IMPORTADOR.md). O que cada campo significa para as contas:
[REGRAS-ACADEMICAS.md](REGRAS-ACADEMICAS.md).

O perfil é **um objeto JSON**. Como `perfil.js`, ele vem depois de `window.PERFIL =` e termina em `;`. Como `.json`,
é o objeto puro. O app lê os dois formatos em **Importar do SIGA → Ou carregar um perfil pronto**.

Você **não precisa escrever isso à mão**: use **Importar do SIGA** no app ou `ferramentas/gerar_perfil.py`. Este
documento serve para entender o arquivo e para quem quiser mexer no código.

> **Privacidade.** Um perfil exportado pode conter dados acadêmicos e o nome que você informou. Não o anexe a
> Issues nem o cole em ferramentas de IA. Use sempre dados fictícios em exemplos ([PRIVACIDADE.md](PRIVACIDADE.md)).

## Exemplo copiável (JSON válido, dados fictícios)

Salve como `perfil-exemplo.json` e carregue no app, ou use como `perfil.js` com `window.PERFIL = ` na frente e `;`
no fim. Os códigos que não estão no currículo (`XYZ101`, `ABC123`) são fictícios.

```json
{
  "titulo": "Grade ECI",
  "subtitulo": "Engenharia de Computação e Informação · UFRJ",
  "nome": "Ana Exemplo",
  "curso": 1,
  "fonte": {
    "geradoPor": "siga.js 1.0",
    "geradoEm": "2026-11-26",
    "boaEmissao": "26/11/2026",
    "historicoAtual": "escolhido"
  },
  "boa": {
    "emissao": "26/11/2026",
    "naoExplicitadasPresente": true,
    "naoExplicitadas": [
      { "code": "ABC123", "name": "Tópicos Fictícios", "credits": 4, "ch": 60, "grau": 8.5 }
    ]
  },
  "periodos": [
    {
      "nome": "2025 (transferidas)",
      "disciplinas": [
        { "code": "MAC118", "status": "aprovado", "aprovadaEm": "2020/1" }
      ]
    },
    {
      "nome": "2025/2",
      "disciplinas": [
        { "code": "COS111", "nota": 8.5 },
        { "code": "FIT112", "status": "reprovado" },
        { "code": "XYZ101", "name": "Disciplina Fictícia", "credits": 4, "category": 3, "nota": 9.0,
          "dispensa": [{ "code": "ABC123", "name": "Tópicos Fictícios", "credits": 4, "category": 3 }] }
      ]
    },
    {
      "nome": "2026/2",
      "atual": true,
      "deduzido": true,
      "disciplinas": [
        { "code": "MAC128", "status": "cursando", "horarios": ["ter 10-12", "qui 10-12"] }
      ]
    },
    {
      "nome": "2027/1",
      "planejado": true,
      "disciplinas": ["COS231"]
    }
  ],
  "equivalencias": [
    {
      "cursadas": [{ "code": "XYZ101", "papel": "conteudo" }],
      "pedida": "COP509",
      "status": "a pedir",
      "obs": "exemplo fictício"
    }
  ],
  "extensao": [
    { "nome": "Atividade fictícia de extensão", "code": "ACE901", "horas": 30, "periodo": "2026/1", "status": "validada" }
  ],
  "tags": [
    { "id": "aprovada", "nome": "Cursada", "cor": "#16a34a", "status": "aprovado" },
    { "id": "cursando", "nome": "Cursando", "cor": "#2563eb", "status": "cursando" },
    { "id": "planejada", "nome": "Planejada", "cor": "#7c3aed", "status": "planejado" }
  ],
  "marcacoes": { "COS482": "planejada" }
}
```

O arquivo [`perfil/perfil.exemplo.js`](../perfil/perfil.exemplo.js) traz um exemplo mínimo comentado. Comentários
não são JSON: só o `.js` os aceita.

## Campos de nível superior

| Campo | Significado |
| --- | --- |
| `titulo`, `subtitulo` | Textos do cabeçalho. Perfis antigos com `"Grade ECI — Fulano"` no título continuam aceitos |
| `nome` | Opcional. O cabeçalho mostra "Grade ECI — Nome" |
| `curso` | Índice do curso em `js/database.js` (ECI = 1) |
| `fonte` | Metadados da geração (abaixo) |
| `boa` | Dados do BOA que a Grade usa (abaixo) |
| `periodos` | Períodos reais e planejados |
| `equivalencias`, `extensao` | Pedidos de dispensa/equivalência e atividades de extensão |
| `tags`, `marcacoes` | Tags de cor e o que foi pintado com o pincel |

O app **recusa** o arquivo se um campo conhecido tiver o tipo errado (a mensagem aponta o campo) e **preserva o perfil
anterior**. Campos desconhecidos são ignorados.

### `fonte`

| Campo | Significado |
| --- | --- |
| `geradoPor` | Importador e versão (por exemplo, `siga.js 1.0`) |
| `geradoEm` | Data de geração (AAAA-MM-DD). É **metadado**: muda a cada importação sem mudar os dados ([IMPORTADOR.md](IMPORTADOR.md#determinismo)) |
| `boaEmissao` | Data de emissão do BOA importado, `DD/MM/AAAA`, ou `null` sem BOA |
| `historicoAtual` | Só aparece com **dois ou mais históricos**. O importador grava `"automatico"` (reconhecido pela data mais recente) ou `"escolhido"` (a pessoa escolheu, na prévia ou com `--atual`). Ver [PC-05](DECISOES.md#pc-05--qual-é-o-histórico-do-curso-atual) |

`historicoAtual` **nunca** é gravado como `"duvida"`: na dúvida, o importador pergunta antes de gerar o perfil. O
app ainda **lê** `"duvida"` em perfis antigos e mostra "Estimativa: o histórico do curso atual não foi confirmado."
junto do prazo de 5 anos (ver [Compatibilidade](#compatibilidade-com-perfis-antigos)).

### `boa`

| Campo | Significado |
| --- | --- |
| `emissao` | Data de emissão do BOA |
| `naoExplicitadas` | Lista da seção "Atividades Acadêmicas Cursadas e Não Explicitadas": `{code, name, credits, ch, grau}`. São as disciplinas que contam como livre escolha e podem entrar em pedidos |
| `naoExplicitadasPresente` | `true` quando a seção existe no BOA, **mesmo vazia**; `false` quando não foi encontrada. Alimenta o segundo número da livre escolha |

Perfis antigos podem não ter `naoExplicitadasPresente`: com linhas em `naoExplicitadas`, vale como presente; sem
linhas, a Grade não prova que a seção existia e mostra "BOA: indisponível" ([PC-04](DECISOES.md#pc-04--número-do-boa-na-livre-escolha)).

## `periodos`

Cada período tem `nome` e `disciplinas`. Os períodos podem ser marcados como `"atual": true` ou `"planejado": true`.
O nome costuma ser `AAAA/1` ou `AAAA/2`. Um período atual sem data se chama `"atual"`, como o importador gera quando o
Histórico não tem um semestre para servir de base. Sem o formato `AAAA/n`, o aviso de oferta por semestre não compara
paridade.

| Tipo de período | Status padrão das disciplinas |
| --- | --- |
| cursado (sem marcação) | `aprovado` |
| `"atual": true` | `cursando` |
| `"planejado": true` | `planejado` |

| Campo do período | Significado |
| --- | --- |
| `nome` | `AAAA/1`, `AAAA/2`, `atual`, ou o **bloco de transferidos** (abaixo) |
| `atual`, `planejado` | Marcam o período atual e os planejados |
| `nota` | Texto livre opcional |
| `deduzido` | Opcional. `true` quando o importador **deduziu** o semestre atual a partir do Histórico. Só existe no período atual com semestre real, e é mantido ao reimportar enquanto a pessoa não trocar o semestre. Mostra a nota de estimativa de [RA-19](REGRAS-ACADEMICAS.md#textos-de-aviso). Sem o campo, não há nota |

### Bloco de transferidos

Créditos transferidos vêm no Histórico do curso atual, num bloco **só com o ano** (sem semestre). O importador grava
esse bloco como um período chamado `"AAAA (transferidas)"` (ou o marcador `AAAA/0` do SIGA, que **não** é semestre
real). O prazo de 5 anos de uma disciplina desse bloco conta a partir do **ano** do bloco, com precisão de ano
([D-03](DECISOES.md#d-03--reingresso-e-prazo-de-5-anos), [PC-06](DECISOES.md#pc-06--fronteira-de-5-anos-com-só-o-ano)).
O bloco não vale como semestre de precedência.

### Disciplinas

Cada disciplina pode ser só o código (`"COS110"`) ou um objeto:

| Campo | Significado |
| --- | --- |
| `code` | Código SIGA: três letras e três caracteres (`COS110`). Se estiver no currículo ou no catálogo, nome e créditos vêm de lá |
| `status` | `aprovado` · `previsto` (aprovação esperada) · `cursando` · `planejado` · `reprovado` |
| `nota` | Grau final (número ou texto, como `T` de dispensa) |
| `name`, `credits`, `category` | Só para disciplinas fora do currículo/catálogo. `category`: 1 obrigatória, 2 condicionada, 3 livre escolha, 4 Humanas, 5 ACE |
| `horas` | Para ACE (categoria 5) |
| `aprovadaEm` | Opcional, texto `AAAA/N`. **Só informação**: o semestre original da aprovação quando o registro do curso atual veio de um bloco de transferidos. Não rege o prazo nem a precedência |
| `equivale` | Código do currículo que esta disciplina substitui (ex.: `EEL470` → `"COS231"`) |
| `dispensa` | Lista dos alvos dispensados por ela. Cada item é **um código** (alvo no currículo ou no catálogo) **ou um objeto** `{code, name, credits, category}` (alvo **fora** do catálogo, para que nome, créditos e grupo sobrevivam à exportação) |
| `horarios` | Lista como `["ter 10-12", "qui 10-12"]` (aba Cronograma) |

O alvo de uma dispensa conta como está no histórico, e a **origem** não soma créditos de novo
([D-07](DECISOES.md#d-07--origem-de-dispensa-não-soma-créditos)).

## `equivalencias`

```json
{ "cursadas": [{"code": "EET100", "papel": "conteudo"}, {"code": "EEL350", "papel": "horas"}],
  "pedida": "COP509", "status": "a pedir", "obs": "processo nº …" }
```

- `papel`: `conteudo` (a cursada que justifica o conteúdo) ou `horas` (só completa a carga horária).
- `status`: `a pedir` · `em análise` · `deferido` · `indeferido`.
- Deferido: a pedida passa a contar e as cursadas saem da livre escolha. Indeferido: não conta.
- Pedidos que dividem a mesma cursada ficam fora da conta até a situação ser corrigida. Um deferimento sem conflito
  tem prioridade sobre um pedido pendente. Disciplinas usadas em dispensa já registrada ficam indisponíveis para
  novos pedidos.
- Formato antigo `{ "cursada": "EEL660", … }` continua aceito.

## `extensao` (Extensão / ACE)

```json
{ "nome": "Ativ. Curricular de Extensão", "code": "EEWZ52", "horas": 40, "periodo": "2026/2", "status": "em andamento" }
```

`status`: `a pedir` · `planejada` · `em andamento` · `validada`. Só `validada` conta como horas cumpridas. A **identidade**
de uma ocorrência é código + período: ocorrências em períodos conhecidos diferentes somam; registros que podem ser a
mesma ocorrência confirmam só o maior valor e o resto aparece "a confirmar"
([PC-01](DECISOES.md#pc-01--identidade-de-uma-ocorrência-de-extensão)).

## `tags` e `marcacoes`

A paleta padrão tem **Cursada** (`aprovada`: cursada e aprovada, conta como concluída), **Cursando** (`cursando`) e
**Planejada** (`planejada`). O `status` de uma tag define como ela entra nas contas (`aprovado`, `previsto`,
`cursando`, `planejado`, `reprovado` ou `pendente`). Uma marcação **vence** o que o perfil diz; `""` significa "sem
tag". A tag "aprovada" do pincel é uma marcação manual, não um registro importado
([PC-02 e PC-03](DECISOES.md#pc-02-e-pc-03--tag-aprovada-do-pincel)).

## Compatibilidade com perfis antigos

O app continua lendo:

- título `"Grade ECI — Fulano"`, com ou sem o campo `nome`;
- `fonte.historicoAtual: "duvida"`, com o aviso de estimativa do histórico atual junto do prazo. Os valores
  `"automatico"`, `"escolhido"` ou a ausência do campo não mostram o aviso;
- `boa` sem `naoExplicitadasPresente` (regra acima) e períodos sem `deduzido` (sem a nota de período deduzido);
- `dispensa` com códigos simples, sem o objeto do alvo;
- `equivalencias[].cursada` (singular);
- a paleta antiga de cinco tags: quem nunca a personalizou passa para a nova, e as tags antigas que ainda pintam
  alguma disciplina (como `aprov-esperada` e `reprov-esperada`) são mantidas. Tags personalizadas não mudam.

Fixtures fictícias de perfis antigos estão em `testes/fixtures/` (`perfil-antigo.json` e `perfil-antigo-sem-nome.json`);
os casos que os usam estão em [PLANO-DE-TESTE.md](PLANO-DE-TESTE.md).
