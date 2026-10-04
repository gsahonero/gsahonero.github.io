const fs = require('fs');

async function testCompile() {
  let tex = fs.readFileSync('scratch/output_test_cv.tex', 'utf8');
  tex = tex.replace(/\\definecolor\{color1\}\{HTML\}([0-9A-Fa-f]{6})/, '\\definecolor{color1}{HTML}{$1}');
  tex = tex.replace(/\\title([^\n]+)/, '\\title{$1}');
  tex = tex.replace(/\\address([^\n]+)/, '\\address{$1}');
  tex = tex.replace(/\\email([^\n]+)/, '\\email{$1}');
  tex = tex.replace(/\\sectionresearch_interests/, '\\section{Intereses de Investigación}');
  tex = tex.replace(/“/g, "``").replace(/”/g, "''");
  
  console.log('Fixed preview:');
  console.log(tex.split('\n').slice(0, 32).join('\n'));

  const payload = {
    compiler: 'pdflatex',
    resources: [{ main: true, content: tex }]
  };
  try {
    const res = await fetch('https://latex.ytotech.com/builds/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Status:', res.status);
    if (!res.ok && res.status !== 201) {
      const err = await res.text();
      console.log('Error text:', err);
    } else {
      const blob = await res.blob();
      console.log('SUCCESS! PDF compiled! PDF size:', blob.size, 'bytes');
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
testCompile();
