const fs = require('fs');

async function testHeader() {
  let tex = fs.readFileSync('scratch/output_test_cv.tex', 'utf8');

  const customHeader = `
\\makeatletter
\\renewcommand*{\\makecvtitle}{%
  \\noindent\\begin{minipage}{\\textwidth}%
    {\\fontsize{22}{26}\\selectfont\\bfseries\\color{color2} Maria Lourdes Nava}\\par\\vspace{4pt}%
    {\\color{color2!80}\\large Profesional en Bibliotecología y Ciencias de la información | Alemán | Enseñanza particular}\\par\\vspace{6pt}%
    {\\small\\color{color2}%
      \\textbf{Email:} \\href{mailto:maourdesnava@hotmail.com}{maourdesnava@hotmail.com}\\quad \\textbf{Location:} La Paz, Bolivia%
    }%
  \\end{minipage}%
  \\par\\vspace{8pt}%
  {\\color{black!15}\\rule{\\textwidth}{1pt}}%
  \\par\\vspace{10pt}%
}
\\renewcommand*{\\section}[1]{%
  \\par\\addvspace{2ex}%
  \\phantomsection{}%
  {\\color{color1}\\Large\\bfseries #1}\\par\\nobreak\\vspace{2pt}%
  {\\color{color1}\\rule{\\textwidth}{1.2pt}}%
  \\par\\nobreak\\addvspace{1.2ex}\\@afterheading%
}
\\makeatother
`;

  tex = tex.replace('\\hyphenation{Universidad}', customHeader + '\n\\hyphenation{Universidad}');

  const payload = {
    compiler: 'pdflatex',
    resources: [{ main: true, content: tex }]
  };
  const res = await fetch('https://latex.ytotech.com/builds/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log('Status:', res.status);
  if (!res.ok) {
    console.log(await res.text());
  } else {
    const buf = await res.arrayBuffer();
    fs.writeFileSync('scratch/test_header.pdf', Buffer.from(buf));
    console.log('Saved scratch/test_header.pdf, size:', buf.byteLength);
  }
}

testHeader();
