const fs = require('fs');

async function testReconcile() {
  const cvRaw = fs.readFileSync('scratch/test_user_cv.json', 'utf8');
  const cv = JSON.parse(cvRaw);

  const latexTemplate = `\\documentclass[11pt,a4paper,sans]{moderncv}
\\usepackage[utf8]{inputenc}
\\moderncvstyle{classic}
\\definecolor{color2}{RGB}{51,51,51}
\\definecolor{color1}{HTML}{{{theme.accentColor}}}
{{&theme.fontLatex}}
\\usepackage{lipsum}
\\usepackage{xstring}
\\usepackage[scale=0.92, top=1.8cm, bottom=2cm, left=2cm, right=2cm]{geometry}

\\setlength{\\hintscolumnwidth}{0pt}
\\setlength{\\separatorcolumnwidth}{0pt}

\\firstname{{{basics.firstname}}}
\\familyname{{{basics.lastname}}}
{{#basics.title}}\\title{{{basics.title}}}{{/basics.title}}
{{#has_photo}}\\photo[70pt][0.4pt]{{{photo_filename}}}{{/has_photo}}

\\newlength{\\cvheaderwidth}
\\setlength{\\cvheaderwidth}{\\textwidth}
{{#has_photo}}
\\addtolength{\\cvheaderwidth}{-85pt}
{{/has_photo}}

\\makeatletter
\\renewcommand*{\\makecvtitle}{%
  \\noindent\\begin{minipage}{\\cvheaderwidth}%
    {\\fontsize{22}{26}\\selectfont\\bfseries\\color{color2} {{{basics.firstname}}} {{{basics.lastname}}}}\\par\\vspace{4pt}%
    {{#basics.title}}{\\color{color2!80}\\large {{{basics.title}}}\\par\\vspace{6pt}}{{/basics.title}}%
    {\\small\\color{color2}%
      {{#basics.email}}\\textbf{{{labels.basics.email}}:} \\href{mailto:{{{basics.email}}}}{{{basics.email}}}\\quad {{/basics.email}}%
      {{#basics.homepage}}\\textbf{{{labels.basics.homepage}}:} \\href{{{{basics.homepage}}}}{{{basics.homepage}}}\\quad {{/basics.homepage}}%
      {{#basics.location}}\\textbf{{{labels.basics.location}}:} {{{basics.location}}}{{/basics.location}}%
    }%
  \\end{minipage}%
  {{#has_photo}}%
  \\hfill%
  \\begin{minipage}{80pt}%
    \\raggedleft%
    \\includegraphics[width=70pt]{{{photo_filename}}}%
  \\end{minipage}%
  {{/has_photo}}%
  \\par\\vspace{8pt}%
  {\\color{black!15}\\rule{\\textwidth}{1pt}}%
  \\par\\vspace{8pt}%
}

\\renewcommand*{\\section}[1]{%
  \\par\\addvspace{2.2ex}%
  \\phantomsection{}%
  {\\color{color1}\\Large\\bfseries #1}\\par\\nobreak\\vspace{2pt}%
  {\\color{color1}\\rule{\\textwidth}{1.2pt}}%
  \\par\\nobreak\\addvspace{1.2ex}\\@afterheading%
}

\\renewcommand*{\\cventry}[6]{%
  \\par\\addvspace{1ex}%
  \\noindent\\begin{minipage}{\\textwidth}%
    {\\bfseries #2}%
    \\if\\relax\\detokenize{#3}\\relax\\else\\ -- {\\normalfont #3}\\fi%
    \\if\\relax\\detokenize{#4}\\relax\\else, #4\\fi%
    \\if\\relax\\detokenize{#5}\\relax\\else, #5\\fi%
    \\if\\relax\\detokenize{#1}\\relax\\else\\hfill{\\normalfont #1}\\fi%
    \\par%
    \\if\\relax\\detokenize{#6}\\relax\\else%
      \\vspace{2pt}%
      {#6}%
      \\par%
    \\fi%
  \\end{minipage}%
  \\par\\addvspace{0.8ex}%
}

\\renewcommand*{\\cvitemwithcomment}[3]{%
  \\par\\addvspace{0.6ex}%
  \\noindent\\begin{minipage}{\\textwidth}%
    \\if\\relax\\detokenize{#3}\\relax%
      {\\bfseries #1:} {#2}%
    \\else%
      {\\bfseries #1}\\hfill{\\color{color2!80}\\textit{#2}}%
    \\fi%
  \\end{minipage}%
  \\par\\addvspace{0.6ex}%
}
\\makeatother

\\hyphenation{Universidad}

\\begin{document}
{{&theme.textAlignLatex}}
\\makecvtitle

{{#has_research_interests}}
\\section{{{labels.basics.research_interests}}}
{{{basics.research_interests}}}
{{/has_research_interests}}

{{&all_sections}}

\\end{document}`;

  global.window = global;
  global.state = {
    sections: cv._sections || {},
    propertyNames: {},
    activeSection: '',
    langFilter: 'all',
    themeAccentColor: '#2563eb',
    themeFont: 'sans',
    themeTextAlign: 'left',
    headerSpacer: 20
  };
  global.data = cv;
  global.activeInstance = null;
  global.clone = x => JSON.parse(JSON.stringify(x));
  global.isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  global.human = s => (s ? s.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : '');
  global.el = () => null;

  const sectionDefsCode = fs.readFileSync('js/section_defs.js', 'utf8');
  eval(sectionDefsCode);
  const constantsCode = fs.readFileSync('js/constants.js', 'utf8');
  eval(constantsCode);
  const compilerCode = fs.readFileSync('js/compiler.js', 'utf8');
  eval(compilerCode);

  const context = buildTemplateContext('latex');
  const renderedTex = renderTemplate(latexTemplate, context, texEscape);

  fs.writeFileSync('scratch/test_reconcile.tex', renderedTex, 'utf8');
  console.log('Saved scratch/test_reconcile.tex. Sending to YtoTech...');

  const payload = {
    compiler: 'pdflatex',
    resources: [{ main: true, content: renderedTex }]
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
    fs.writeFileSync('scratch/test_reconcile.pdf', Buffer.from(buf));
    console.log('Saved scratch/test_reconcile.pdf, size:', buf.byteLength);
  }
}

testReconcile();
