const fs = require('fs');

async function run() {
  let outTex = fs.readFileSync('scratch/output_test_cv.tex', 'utf8');

  // Replace cvitemwithcomment definition without minipage:
  outTex = outTex.replace(
    /\\renewcommand\*\{\\cvitemwithcomment\}\[3\]\{[\s\S]*?\n\}/,
    `\\renewcommand*{\\cvitemwithcomment}[3]{%
  \\par\\addvspace{0.5ex}%
  \\noindent%
  \\if\\relax\\detokenize{#3}\\relax%
    {\\bfseries #1:}\\hspace{0.5em}#2%
  \\else%
    {\\bfseries #1}\\hfill{\\color{color2!80}\\textit{#2}}%
  \\fi%
  \\par\\addvspace{0.5ex}%
}`
  );

  const res = await fetch('https://latex.ytotech.com/builds/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ compiler: 'pdflatex', resources: [{ main: true, content: outTex }] })
  });

  console.log('Status without cvitem minipage:', res.status);
  if (!res.ok) {
    console.log(await res.text());
  } else {
    const buf = await res.arrayBuffer();
    fs.writeFileSync('scratch/final_output.pdf', Buffer.from(buf));
    console.log('Saved scratch/final_output.pdf, size:', buf.byteLength);
  }
}

run();
