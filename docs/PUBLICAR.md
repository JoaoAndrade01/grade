# Publicar no GitHub Pages e manter o fork sincronizado

O app é estático: o GitHub Pages serve os arquivos como estão. Cada pessoa importa os **próprios** PDFs
no navegador; nada pessoal vai para o site (ver [PRIVACIDADE.md](PRIVACIDADE.md)).

Exemplo com o fork `https://github.com/JoaoAndrade01/grade` e a branch `master`.
Rode os comandos no **PowerShell**, dentro da pasta do projeto (`C:\dev\gradeECI\grade`).

## 1. Apontar o repositório local para o seu fork (uma vez)

```powershell
git remote rename origin upstream          # o repositório original do Grêmio vira "upstream"
git remote add origin https://github.com/JoaoAndrade01/grade.git
git remote -v                               # confira: origin = seu fork, upstream = gremio-eci
git config core.autocrlf true               # evita que o Windows marque todos os arquivos como alterados
```

## 2. Conferir que nada pessoal vai junto

```powershell
git status --short
```

**Não podem aparecer:** `perfil/perfil.js`, `*.pdf`, `*.xlsx`, a página salva do SIGA, `Claude outputs/`.
Eles estão no `.gitignore`; se algum aparecer, pare e me avise.

## 3. Commitar

Um commit único:

```powershell
git add -A
git commit -m "Grade Interativa v2: modo clássico, importador do SIGA, planejamento e documentação"
```

Ou um commit por etapa, como sugerido no fim de [MUDANCAS.md](MUDANCAS.md).

## 4. Enviar para o fork

```powershell
git push -u origin master
```

## 5. Ligar o GitHub Pages

No GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `master` / `(root)` → Save**.
Em 1–2 minutos o site fica em **https://joaoandrade01.github.io/grade/**.

Mande o link para o pessoal: abrir → ícone de enviar (Importar do SIGA) → Histórico + BOA → **Usar este perfil**.

## Mantendo sincronizado

| Situação | Comando |
|---|---|
| Publicar mudanças novas | `git add -A` → `git commit -m "..."` → `git push` |
| Trazer novidades do repositório original | `git fetch upstream` → `git merge upstream/master` → `git push` |
| Propor as melhorias ao Grêmio | No GitHub do fork: **Contribute → Open pull request** para `gremio-eci/grade` |

## Observações

- No site publicado não existe `perfil/perfil.js`; o navegador mostra um aviso 404 no console, que é esperado.
- O `js/guia.js` traz comentários de alunos copiados do Notion; combine com quem mantém a página antes de publicar
  (o app funciona sem esse arquivo).
- GitHub Pages em repositório privado exige plano pago; para testes, deixe o fork público.
