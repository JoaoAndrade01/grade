r"""Gera os PDFs FICTÍCIOS de "A ECI por trás da Grade" e escreve js/demo-pdf.js.
Uso (na raiz do repositório): pip install pypdf && python ferramentas/gerar_demo_pdf.py [PASTA_PARA_OS_PDFS]
Os PDFs e textos intermediários vão para uma pasta temporária (ou a indicada); só js/demo-pdf.js entra no repositório.
Rode de novo quando as regras do importador mudarem, para a saída Python pré-computada continuar coerente.
- PDFs mínimos escritos à mão (Helvetica padrão, WinAnsi, sem fonte embutida).
- Inclui a saída PRÉ-COMPUTADA do importador Python (ferramentas/gerar_perfil.py) sobre o texto lido pelo pypdf.
"""
import base64, json, pathlib, runpy, subprocess, sys


def pdf(linhas):
    def esc(t):
        return t.encode("cp1252").replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")
    y = 790
    corpo = b"BT\n"
    for tam, t in linhas:
        corpo += b"/F1 %d Tf 1 0 0 1 40 %d Tm (" % (tam, y) + esc(t) + b") Tj\n"
        y -= tam + 8
    corpo += b"ET\n"
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
            b"<< /Length %d >>\nstream\n" % len(corpo) + corpo + b"endstream"]
    out = b"%PDF-1.4\n"
    offs = []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1) + b"".join(b"%010d 00000 n \n" % o for o in offs)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, x)
    return out


H = [(13, "DOCUMENTO DE DEMONSTRAÇÃO - DADOS FICTÍCIOS"), (10, "Histórico escolar de exemplo da Grade ECI"),
     (10, "Aluna: PESSOA DE EXEMPLO    CPF: 000.000.000-00    Matrícula: 000000000"),
     (10, "Período Código Nome CrR CH Grau CrO Pontos SF"),
     (10, "2025/1 MAC118 Cálculo Diferencial e Integral I 6.0 90.0 7.5 6.0 45.0 AP"),
     (10, "COS110 Algoritmos e Programação 5.0 75.0 8.0 5.0 40.0 AP"),
     (10, "2025/2 EEL670 Linguagens de Programação 5.0 75.0 9.0 5.0 45.0 AP"),
     (10, "MAC128 Cálculo Diferencial e Integral II 4.0 60.0 4.0 0.0 0.0 RM"),
     (10, "2026/1 MAC128 Cálculo Diferencial e Integral II 4.0 60.0 7.0 4.0 28.0 AP"),
     (10, "COS231 Estruturas de Dados 5.0 75.0 8.5 5.0 42.5 AP"),
     (10, "COS242 Teoria dos Grafos 4.0 60.0 8,5 AP")]          # fora do formato (faltam CrO e Pontos)
B = [(13, "BOLETIM DE ORIENTAÇÃO ACADÊMICA"), (10, "Documento de demonstração - dados fictícios"),
     (10, "Aluno Matrícula Curso Emissão"),
     (10, "PESSOA DE EXEMPLO 000000000 Eng. Computação 20/11/2026 10:30"),
     (10, "Atividades Acadêmicas Obrigatórias"),
     (10, "MAC238 Cálculo Diferencial e Integral III 4.0 60 3 Cursando"),
     (10, "COS351 Lógica Matemática 4.0 60 5 Cursando"),
     (10, "EEL873 Engenharia de Software 4.0 60 6 Cursando")]

import tempfile
repo = pathlib.Path(__file__).resolve().parent.parent
dest = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(tempfile.mkdtemp(prefix="grade-demo-"))
js_saida = repo / "js" / "demo-pdf.js"
h, b = pdf(H), pdf(B)
(dest / "demo-historico.pdf").write_bytes(h)
(dest / "demo-boa.pdf").write_bytes(b)

ler = runpy.run_path(str(repo / "ferramentas" / "gerar_perfil.py"))["texto_pdf"]
th, tb = ler(str(dest / "demo-historico.pdf")), ler(str(dest / "demo-boa.pdf"))
(dest / "demo-historico.txt").write_text(th, encoding="utf-8")
(dest / "demo-boa.txt").write_text(tb, encoding="utf-8")
cmd = [sys.executable, "-X", "utf8", str(repo / "ferramentas" / "gerar_perfil.py"), "--texto", "--json", "--hoje", "2000-01-01",
       "--historico", str(dest / "demo-historico.txt"), "--boa", str(dest / "demo-boa.txt")]
py = json.loads(subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", check=True).stdout)
paridade = {
    "geradoEm": "2026-11-25",
    "comando": "python ferramentas/gerar_perfil.py --texto --json --hoje 2000-01-01 --historico demo-historico.txt --boa demo-boa.txt",
    "textoPypdf": {"historico": th, "boa": tb},
    "python": py,
}
js = (
    "/*\n"
    " * PDFs FICTÍCIOS de \"A ECI por trás da Grade\" (Histórico e BOA de exemplo, sem nenhum dado real),\n"
    " * em base64 para abrir também por file://. Helvetica padrão, sem fonte embutida.\n"
    " * DEMO_PARIDADE: resultado PRÉ-COMPUTADO do importador Python (ferramentas/gerar_perfil.py) sobre os mesmos\n"
    " * PDFs, com o texto lido pelo pypdf. Nenhum Python roda no navegador.\n"
    " * Gerado por ferramentas/gerar_demo_pdf.py (não edite à mão).\n"
    " */\n"
    "window.DEMO_PDF = {\n  historico: \"%s\",\n  boa: \"%s\",\n};\n"
    "window.DEMO_PARIDADE = %s;\n"
) % (base64.b64encode(h).decode(), base64.b64encode(b).decode(), json.dumps(paridade, ensure_ascii=False, indent=1))
js_saida.write_text(js, encoding="utf-8", newline="\n")
print(f"js/demo-pdf.js atualizado; PDFs fictícios em {dest}")
