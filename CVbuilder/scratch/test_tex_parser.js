function texEscape(s) {
  if (s == null) return '';
  var str = String(s);

  var placeholders = [];

  var cmdRegex = /\\([a-zA-Z@]+)(\*?)(?:\{[^{}]*\}|\[[^\[\]]*\])*/g;

  str = str.replace(cmdRegex, function(match, cmdName) {
    var recognized = [
      'textbf','textit','emph','underline','small','large','Large','huge','HUGE',
      'textquotedblleft','textquotedblright','href','url','cventry','cvitem',
      'cvitemwithcomment','cvlistitem','vspace','hspace','par','smallskip',
      'medskip','bigskip','makeatletter','makeatother','compiledPublications',
      'compiledAbstracts','noindent','hangindent','hangafter','hbox','hss',
      'parbox','textbf','textit','textquotedblleft','textquotedblright'
    ];
    if (recognized.indexOf(cmdName) !== -1 || cmdName.indexOf('cv') === 0) {
      placeholders.push(match);
      return '@@TEXCMD' + (placeholders.length - 1) + '@@';
    }
    return match;
  });

  str = str
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');

  for (var i = 0; i < placeholders.length; i++) {
    str = str.replace('@@TEXCMD' + i + '@@', placeholders[i]);
  }

  return str;
}

function parseLatexToHtml(s) {
  if (s == null) return '';
  var str = String(s);

  str = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  var limit = 0;
  while (limit < 10 && /\\textbf\{([^{}]*)\}/.test(str)) {
    limit++;
    str = str.replace(/\\textbf\{([^{}]*)\}/g, '<strong>$1</strong>');
  }

  limit = 0;
  while (limit < 10 && /\\(textit|emph)\{([^{}]*)\}/.test(str)) {
    limit++;
    str = str.replace(/\\(textit|emph)\{([^{}]*)\}/g, '<em>$2</em>');
  }

  limit = 0;
  while (limit < 10 && /\\underline\{([^{}]*)\}/.test(str)) {
    limit++;
    str = str.replace(/\\underline\{([^{}]*)\}/g, '<u>$1</u>');
  }

  str = str.replace(/\\href\{([^{}]*)\}\{([^{}]*)\}/g, '<a href="$1" target="_blank" rel="noopener">$2</a>');
  str = str.replace(/\\url\{([^{}]*)\}/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  str = str
    .replace(/\\textquotedblleft/g, '“')
    .replace(/\\textquotedblright/g, '”')
    .replace(/\\\\/g, '<br>')
    .replace(/~/g, '&nbsp;');

  return str;
}

console.log("=== TEST TEX ESCAPE ===");
console.log(texEscape("Winner of \\textbf{Plurinational Award} for 100% success rate & growth"));

console.log("\n=== TEST HTML PARSE ===");
console.log(parseLatexToHtml("Winner of \\textbf{Plurinational Award} for 100% success rate & \\textit{growth}"));
