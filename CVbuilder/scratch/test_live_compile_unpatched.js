const fs = require('fs');

async function testDirectCompile() {
  const tex = fs.readFileSync('scratch/output_test_cv.tex', 'utf8');
  console.log('Sending pure compiled output directly to LaTeX engine (length: ' + tex.length + ')...');

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
    console.log('HTTP Status:', res.status);
    if (!res.ok && res.status !== 201) {
      const err = await res.text();
      console.log('Compiler error message:\n', err);
    } else {
      const blob = await res.blob();
      console.log('SUCCESS: PDF successfully generated!');
      console.log('Generated PDF size:', blob.size, 'bytes');
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testDirectCompile();
