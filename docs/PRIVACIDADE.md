# Privacidade: como o app garante que seus dados não saem do computador

Resposta curta: **o site não tem servidor, não tem conta e o navegador é proibido de mandar dados para
qualquer outro endereço.** Os PDFs do SIGA são lidos dentro da página, e o resultado fica guardado só no seu navegador.

## As garantias, uma a uma

| Garantia | Como é garantida | Onde ver |
|---|---|---|
| **Nada é enviado para a internet** | O `index.html` declara uma *Content-Security-Policy* com `connect-src 'self'`, `form-action 'none'` e `script-src 'self'`. Com isso **o próprio navegador bloqueia** qualquer requisição, formulário ou script de outro endereço, mesmo que um código tentasse | `<meta http-equiv="Content-Security-Policy">` no topo do `index.html` |
| **Sem servidor** | O site é só um conjunto de arquivos estáticos (HTML, CSS, JS). No GitHub Pages ou aberto do seu computador, não há programa do outro lado recebendo nada | Estrutura do repositório: não existe backend |
| **Sem rastreadores** | Não há analytics, fontes externas, CDN nem anúncios. Todas as bibliotecas (pdf.js, ícones) estão dentro do repositório | `js/vendor/`, `js/icones.js` |
| **PDF lido localmente** | O arquivo é aberto com `File.arrayBuffer()` e lido pelo pdf.js na própria página | `geraPerfilDoSiga` e `linhasPDF` em `js/app.js` |
| **Só o necessário é lido** | As regras do importador só procuram códigos de disciplina, créditos, carga horária, notas, situação, períodos e a data do BOA. Nome, matrícula, CPF, RG, filiação e endereço **não são lidos nem guardados** | Objeto `RE` em `js/siga.js` |
| **Guardado só no seu navegador** | O perfil importado, as tags e os planos ficam no `localStorage` deste navegador. Outro navegador, outra pessoa ou o site publicado não têm acesso | Botão de escudo (Privacidade) no app |
| **Fora do git** | `perfil/perfil.js`, PDFs e planilhas estão no `.gitignore` | `.gitignore` |

## Como conferir você mesmo

1. **No app:** clique no ícone de escudo. O painel mostra quantos recursos a página carregou e quantos vieram de
   outros sites (deve ser 0), e lista o que está guardado no navegador.
2. **No navegador:** F12 → aba **Rede/Network** → importe os PDFs. Não aparece nenhuma requisição para fora.
3. **Sem internet:** desligue o Wi-Fi e use o app normalmente (inclusive importar). Funciona.
4. **No código:** procure por `fetch(`, `XMLHttpRequest` e `sendBeacon` em `js/app.js` e `js/siga.js`; não há envio
   de dados. E, mesmo que houvesse, a política de segurança bloquearia.

## Apagar tudo

No painel de Privacidade: **Apagar tudo deste navegador**. Ou limpe os dados do site nas configurações do navegador.

## Regras para quem contribui

- **Não** adicione scripts, fontes, imagens ou APIs de outros domínios. Copie o arquivo para o repositório.
- **Não** afrouxe a Content-Security-Policy.
- Ao mudar o importador, mantenha a regra: nenhum dado pessoal identificável é lido.
