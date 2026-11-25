# Formato do perfil (`perfil/perfil.js`)

O perfil é um arquivo JavaScript com **um objeto JSON** atribuído a `window.PERFIL`.
Tudo depois de `window.PERFIL =` é JSON válido, então o mesmo conteúdo também pode ser importado como `.json`.

Você **não precisa escrever isso à mão**: use **Importar do SIGA** no app ou `ferramentas/gerar_perfil.py`.
Este documento serve para entender o arquivo e para quem quiser mexer no código.

## Estrutura

```js
window.PERFIL = {
  "titulo": "Grade ECI",                       // texto do cabeçalho
  "subtitulo": "…",
  "curso": 1,                                  // índice do curso em js/database.js (ECI = 1)
  "fonte": { "geradoPor": "siga.js 1.0", "geradoEm": "2026-11-26", "boaEmissao": "25/11/2026" },
  "boa": { "emissao": "25/11/2026", "naoExplicitadas": [ … ] },
  "equivalencias": [ … ],                      // pedidos de dispensa/equivalência
  "extensao": [ … ],                           // atividades de Extensão / ACE
  "tags": [ … ],                               // tags de cor (opcional)
  "marcacoes": { "COS482": "aprov-esperada" }, // o que foi pintado com o pincel (opcional)
  "periodos": [ … ]
};
```

## `periodos`

Cada período tem `nome` e `disciplinas`. Os períodos podem ser marcados como `"atual": true` ou `"planejado": true`.

| Tipo de período | Status padrão das disciplinas |
|---|---|
| cursado (sem marcação) | `aprovado` |
| `"atual": true` | `cursando` |
| `"planejado": true` | `planejado` |

Cada disciplina pode ser só o código (`"COS110"`) ou um objeto:

| Campo | Significado |
|---|---|
| `code` | Código SIGA. Se estiver no currículo ou no catálogo, nome e créditos vêm de lá |
| `status` | `aprovado` · `previsto` (aprovação esperada) · `cursando` · `planejado` · `reprovado` |
| `nota` | Grau final (número) |
| `name`, `credits`, `category` | Só para disciplinas fora do currículo/catálogo. `category`: 1 obrigatória, 2 condicionada, 3 livre escolha, 4 Humanas, 5 ACE |
| `horas` | Para ACE (categoria 5) |
| `equivale` | Código do currículo que esta disciplina substitui (ex.: `EEL470` → `"COS231"`) |
| `dispensa` | Lista de códigos dispensados por ela (ex.: `["MAC248"]`) |
| `horarios` | Lista como `["ter 10-12", "qui 10-12"]` (aba Cronograma) |

## `boa.naoExplicitadas`

"Atividades Acadêmicas Cursadas e Não Explicitadas" do BOA: `{code, name, credits, ch, grau}`.
São as disciplinas que contam como **livre escolha** e podem ser usadas em pedidos de equivalência.

## `equivalencias`

```json
{ "cursadas": [{"code": "EET100", "papel": "conteudo"}, {"code": "EEL350", "papel": "horas"}],
  "pedida": "COP509", "status": "a pedir", "obs": "processo nº …" }
```

- `papel`: `conteudo` (a cursada que justifica o conteúdo) ou `horas` (só completa a carga horária).
- `status`: `a pedir` · `em análise` · `deferido` · `indeferido`.
- Deferido: a pedida passa a contar e as cursadas saem da livre escolha. Indeferido: não conta.
- Pedidos que dividem a mesma cursada ficam fora da conta até a situação ser corrigida.
  Um deferimento sem conflito tem prioridade sobre um pedido pendente. Disciplinas usadas em
  dispensa já registrada ficam indisponíveis para novos pedidos.
- Formato antigo `{ "cursada": "EEL660", … }` continua aceito.

## `extensao` (Extensão / ACE)

```json
{ "nome": "Ativ. Curricular de Extensão", "code": "EEWZ52", "horas": 400, "periodo": "2026/2", "status": "em andamento" }
```

`status`: `a pedir` · `planejada` · `em andamento` · `validada`. Só `validada` conta como horas cumpridas.

## `tags` e `marcacoes`

```json
"tags": [{ "id": "aprovada", "nome": "Aprovada", "cor": "#16a34a", "status": "aprovado" }, …],
"marcacoes": { "FIM240": "reprov-esperada", "COE363": "aprov-esperada" }
```

O `status` de uma tag define como ela entra nas contas (`aprovado`, `previsto`, `cursando`, `planejado`,
`reprovado` ou `pendente`). Uma marcação **vence** o que o perfil diz; `""` significa "sem tag".
