// Perfil de exemplo, para entender o formato (especificação completa em docs/PERFIL.md).
// Você NÃO precisa escrever o seu à mão: use "⤓ Importar do SIGA" no app ou ferramentas/gerar_perfil.py.
// Se quiser editar à mão: copie para perfil/perfil.js (ignorado pelo git). O conteúdo após "window.PERFIL =" é JSON.
//
// Campos de cada disciplina (ou só o código, como string):
//   code      código da disciplina. Se estiver no currículo (js/database.js), nome/créditos vêm de lá.
//   status    "aprovado" | "previsto" | "cursando" | "planejado" | "reprovado"
//             (padrão: aprovado em períodos passados, cursando no "atual", planejado nos "planejado")
//   nota      opcional, aparece no cartão
//   name, credits, category   para disciplinas fora do currículo
//             category: 1 obrigatória, 2 optativa, 3 livre escolha, 4 humanas, 5 extensão (use "horas")
//   equivale  código do currículo que esta disciplina substitui (ex.: cursou EEL470 ≡ COS231)
//   horarios  lista como ["ter 08-10", "qui 08-10"] (usada na aba Cronograma)
//   dispensa  lista de códigos (ou objetos {code,name,credits,category}) dispensados por ela
window.PERFIL = {
  "titulo": "Grade ECI — Fulano",
  "subtitulo": "Eng. de Computação e Informação · UFRJ",
  "nome": "Fulano",
  "curso": 1,
  "periodos": [
    { "nome": "2025/1", "disciplinas": [
      { "code": "COS110", "nota": 8.5 }, "COS111", "EEL280", "MAC118", "FIT112", "FIS111"
    ]},
    { "nome": "2025/2", "disciplinas": [
      "EEL670", "MAE125", "EEL480", { "code": "MAC128", "status": "reprovado" }, "FIT122", "FIS121",
      { "code": "EEI206", "name": "História da Tecnologia", "credits": 2, "category": 4 }
    ]},
    { "nome": "2026/1", "atual": true, "disciplinas": [
      "COS231", "EEL881", "EEL580", { "code": "MAC128", "status": "previsto" }
    ]},
    { "nome": "2026/2", "planejado": true, "disciplinas": [ { "code": "MAC238", "horarios": ["ter 10-12", "qui 10-12"] }, "FIM230", "FIN231", "COP503" ] }
  ]
};
