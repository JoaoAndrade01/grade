/*
 * Horários de referência das turmas, por curso e paridade do semestre.
 *   impar = semestres "/1" (oferta dos períodos 1, 3, 5, 7, 9 e eletivas de período ímpar)
 *   par   = semestres "/2" (oferta dos períodos 2, 4, 6, 8, 10 e eletivas de período par)
 * Fonte: página "Grades de ECI (Editável)" no Notion (consultada em 25/11/2026).
 * ATENÇÃO: horários mudam de semestre para semestre — confira no SIGA antes de se inscrever.
 * Formato dos horários: "ter 10-12" (dia de 3 letras, hora início-fim).
 */
window.horarios = window.horarios || {};
window.horarios[1] = {
  fonte: "Notion — Grades de ECI (Editável)",
  consultado: "2026-11-25",
  impar: {
    // 1º período
    FIT112: ["qua 08-10", "sex 08-10"],
    MAC118: ["seg 10-12", "qua 10-12", "sex 10-12"],
    COS110: ["seg 13-15", "qua 13-15", "sex 13-15"],
    FIS111: ["qua 15-17"],
    EEL280: ["ter 10-12", "qui 10-12", "ter 13-15"],
    COS111: ["qui 13-15"],
    // 3º período
    EEL881: ["ter 08-10", "qui 08-10"],
    FIN231: ["sex 13-15"],
    FIM230: ["qua 15-17", "sex 15-17"],
    MAC238: ["ter 10-12", "qui 10-12"],
    EEL580: ["ter 13-15", "qui 12-15"],
    COS231: ["ter 15-17", "qui 15-17"],
    // 5º período
    COC473: ["ter 08-10", "qui 08-10"],
    EEL871: ["seg 08-10", "sex 08-10"],
    EEL878: ["seg 10-12", "qua 10-12"],
    IQG112: ["qua 13-17"],
    COS351: ["ter 10-12", "qui 10-12"],
    EEL770: ["ter 15-17", "qui 15-17"],
    // 7º período
    COC472: ["sex 08-12"],
    COP232: ["qua 08-12"],
    COS470: ["ter 10-12", "qui 10-12"],
    EEL418: ["seg 15-17", "sex 15-17"],
    EEL882: ["ter 15-17", "qui 15-17"],
    // Eletivas de período ímpar
    EET100: ["sex 08-10"],
    EEL874: ["seg 10-12", "sex 10-12"],
    EEL890: ["seg 10-12", "qua 10-12"],
    EEL857: ["ter 08-10", "qui 08-10"],   // "Otimização em Grafos" (turma do mestrado)
    EEL970: ["ter 10-12", "qui 10-12"],
    COC602: ["ter 10-12", "qui 10-12"],   // Mineração de Dados (turma do mestrado)
    EEL841: ["ter 13-15", "qui 13-15"],
    COP509: ["seg 13-17"],                // Trabalho do Futuro
    EEL816: ["ter 15-17", "qui 15-17"],
    EEL891: ["ter 15-17", "qui 15-17"],
    EEL817: ["ter 15-17", "qui 15-17"],   // Redes Neurais (turma do mestrado)
  },
  par: {
    // 2º período
    EEL480: ["ter 08-10", "qui 08-10", "ter 13-15"],
    EEL670: ["seg 08-10", "sex 08-12"],
    FIS121: ["seg 15-17"],
    MAC128: ["qua 13-15", "sex 13-15"],
    FIT122: ["qua 15-17", "sex 15-17"],
    MAE125: ["ter 10-12", "qui 10-12"],
    // 4º período
    IQG111: ["ter 08-10", "qui 08-10"],
    FIM240: ["qua 10-12", "sex 10-12"],
    COS242: ["seg 13-15", "qua 13-15"],
    COS471: ["ter 13-15", "qui 13-15"],
    MAC248: ["qua 15-17", "sex 15-17"],
    FIN241: ["seg 15-17"],
    COE241: ["ter 15-17", "qui 15-17"],
    // 6º período
    COS360: ["seg 08-10", "qua 08-10"],
    EEL879: ["seg 10-12", "qua 10-12"],
    EEL873: ["ter 08-10", "qui 08-10"],
    COE363: ["ter 13-15", "qui 13-15"],
    COC361: ["ter 15-17", "qui 15-17"],
    // 8º período
    COP364: ["sex 08-12"],
    COS480: ["seg 10-12", "qua 10-12"],
    COS482: ["ter 10-12", "qui 10-12"],
    // Eletivas de período par
    EET100: ["sex 08-10"],
    EEL874: ["seg 10-12", "sex 10-12"],
    EEL970: ["seg 10-12", "qua 10-12"],
    COS013: ["ter 10-12", "qui 10-12"],   // Tóp. Esp. em ECI (Compiladores)
    EEL841: ["ter 13-15", "qui 13-15"],
    EEL880: ["seg 08-12"],                // Tóp. Esp. em Sistemas Digitais
    COP481: ["ter 13-15", "qui 13-15"],
    EEL816: ["ter 15-17", "qui 15-17"],
    EEL891: ["ter 15-17", "qui 15-17"],
    COS624: ["ter 15-17", "qui 15-17"],
  },
  // Turmas da página sem código identificável no currículo
  semCodigo: {
    impar: [
      { name: "Comp 3 (condicionada)", horarios: ["ter 13-15", "qui 13-15"] },
      { name: "Tóp. Ciência de Dados: Estrutura de Dados", horarios: ["ter 15-17", "qui 15-17"] },
      { name: "Mapas (livre escolha)", horarios: ["ter 13-15", "qui 13-15"] },
    ],
    par: [
      { name: "Grafos de Interseção (mestrado)", horarios: ["seg 13-15", "qua 13-15"] },
    ],
  },
};
