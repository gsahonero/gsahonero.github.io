const fs = require('fs');

global.state = {
  sections: {},
  langFilter: 'all',
  propertyNames: {}
};
global.activeInstance = null;
global.DEFAULT_MAPPERS = {};
global.clone = (x) => JSON.parse(JSON.stringify(x));
global.isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
global.human = (s) => s ? s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : '';
global.htmlEscape = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
global.texEscape = (s) => String(s || '');
global.latexText = (s) => String(s || '');
global.joinDate = (start, end, style) => {
  if (!start && !end) return '';
  if (start && !end) return start + ' -- Present';
  if (!start && end) return end;
  return start + ' -- ' + end;
};

function renderAutoSectionHtml(key, val) {
  if (state.sections[key] && state.sections[key].include === false) return '';
  if (activeInstance && activeInstance.visibility && activeInstance.visibility[key] === false) return '';
  if (!val) return '';
  
  var title = (state.sections[key] && state.sections[key].title) || human(key);
  var html = '<section>\n  <h2>' + htmlEscape(title) + '</h2>\n';
  
  if (isObj(val)) {
    html += '  <ul class="kv-list">\n';
    Object.keys(val).forEach(function(g) {
      if (Array.isArray(val[g])) {
        var list = val[g].filter(function(x) { return !isObj(x) || x.selected !== false; });
        if (!list.length) return;
        var gLabel = state.propertyNames[key + '.' + g] || human(g);
        var csv = list.map(function(x) { return typeof x === 'string' ? x : (x.name || x.label || x.language || ''); }).filter(Boolean).join(', ');
        html += '    <li><strong>' + htmlEscape(gLabel) + ':</strong> ' + htmlEscape(csv) + '</li>\n';
      } else if (val[g] != null) {
        var kLabel = state.propertyNames[key + '.' + g] || human(g);
        html += '    <li><strong>' + htmlEscape(kLabel) + ':</strong> ' + htmlEscape(String(val[g])) + '</li>\n';
      }
    });
    html += '  </ul>\n</section>';
    return html;
  }
  
  if (Array.isArray(val)) {
    var activeItems = val.filter(function(item) {
      if (isObj(item) && item.selected === false) return false;
      if (state.langFilter && state.langFilter !== 'all' && isObj(item) && item.lang) {
        if (item.lang !== 'all' && item.lang !== state.langFilter) return false;
      }
      return true;
    });
    if (!activeItems.length) return '';
    
    var isPubLike = activeItems.every(function(it) { return isObj(it) && (it.authors || (it.title && (it.venue || it.publisher))); });
    
    if (isPubLike) {
      html += '  <ul>\n';
      activeItems.forEach(function(it) {
        var line = '';
        if (it.authors) line += htmlEscape(it.authors) + '. ';
        if (it.title) line += '"' + htmlEscape(it.title) + '." ';
        if (it.venue || it.publisher) line += '<em>' + htmlEscape(it.venue || it.publisher) + '</em>, ';
        if (it.year || it.date) line += htmlEscape(it.year || it.date);
        if (it.type) line += ' (' + htmlEscape(it.type) + ')';
        if (!it.venue && !it.title && it.description) line += htmlEscape(it.description);
        html += '    <li>' + line + '</li>\n';
      });
      html += '  </ul>\n';
    } else {
      activeItems.forEach(function(it) {
        if (!isObj(it)) {
          html += '  <div class="entry">' + htmlEscape(String(it)) + '</div>\n';
          return;
        }
        var headerLeft = it.role || it.degree || it.title || it.language || it.name || it.label || it.category || it.course_area || it.project || '';
        var headerRight = joinDate(it.start, it.end, 'dash') || it.year || it.date || '';
        var subheader = it.organization || it.institution || it.company || it.publisher || it.vendor || it.department || it.fluency || (it.level ? (it.institution ? (it.institution + ' (' + it.level + ')') : it.level) : '') || '';
        var desc = it.description || it.details || it.summary || it.highlights || it.dissertation || '';
        if (Array.isArray(it.courses) && it.courses.length) {
          var cCsv = it.courses.map(function(c){ return typeof c === 'string' ? c : (c.name || ''); }).join(', ');
          desc = '<em>Courses:</em> ' + cCsv + (desc ? '<br>' + desc : '');
        }
        
        html += '  <div class="entry">\n';
        html += '    <div class="entry-header">\n';
        html += '      <span>' + htmlEscape(headerLeft + (subheader ? ' - ' + subheader : '')) + '</span>\n';
        if (headerRight) html += '      <span>' + htmlEscape(headerRight) + '</span>\n';
        html += '    </div>\n';
        if (desc) html += '    <div class="entry-description">' + desc + '</div>\n';
        html += '  </div>\n';
      });
    }
  } else if (typeof val === 'string') {
    html += '  <p>' + htmlEscape(val) + '</p>\n';
  }
  
  html += '</section>';
  return html;
}

function renderAutoSectionLatex(key, val) {
  if (state.sections[key] && state.sections[key].include === false) return '';
  if (activeInstance && activeInstance.visibility && activeInstance.visibility[key] === false) return '';
  if (!val) return '';
  
  var title = (state.sections[key] && state.sections[key].title) || human(key);
  var tex = '\\section{' + latexText(title) + '}\n';
  
  if (isObj(val)) {
    Object.keys(val).forEach(function(g) {
      if (Array.isArray(val[g])) {
        var list = val[g].filter(function(x) { return !isObj(x) || x.selected !== false; });
        if (!list.length) return;
        var gLabel = latexText(state.propertyNames[key + '.' + g] || human(g));
        var csv = list.map(function(x) { return typeof x === 'string' ? x : (x.name || x.label || x.language || ''); }).filter(Boolean).join(', ');
        tex += '\\cvitemwithcomment{' + gLabel + '}{\\parbox[t]{0.85\\textwidth}{' + latexText(csv) + '}}{}\n';
      } else if (val[g] != null) {
        var kLabel = latexText(state.propertyNames[key + '.' + g] || human(g));
        tex += '\\cvitemwithcomment{' + kLabel + '}{\\parbox[t]{0.85\\textwidth}{' + latexText(String(val[g])) + '}}{}\n';
      }
    });
    return tex;
  }
  
  if (Array.isArray(val)) {
    var activeItems = val.filter(function(item) {
      if (isObj(item) && item.selected === false) return false;
      if (state.langFilter && state.langFilter !== 'all' && isObj(item) && item.lang) {
        if (item.lang !== 'all' && item.lang !== state.langFilter) return false;
      }
      return true;
    });
    if (!activeItems.length) return '';
    
    var isPubLike = activeItems.every(function(it) { return isObj(it) && (it.authors || (it.title && (it.venue || it.publisher))); });
    
    if (isPubLike) {
      activeItems.forEach(function(it) {
        var authors = latexText(it.authors || '');
        var pTitle = latexText(it.title || '');
        var venue = latexText(it.venue || it.publisher || '');
        var year = latexText(it.year || it.date || '');
        var typ = it.type ? ' (' + latexText(it.type) + ')' : '';
        tex += '\\cvitem{-}{' + authors + '. \\textquotedblleft ' + pTitle + '.\\textquotedblright\\ \\textit{' + venue + '}. ' + year + typ + '.}\n';
      });
    } else {
      activeItems.forEach(function(it) {
        if (!isObj(it)) {
          tex += '\\cvitem{-}{' + latexText(String(it)) + '}\n';
          return;
        }
        var dateStr = joinDate(it.start, it.end, 'dash') || latexText(it.year || it.date || '');
        var title1 = latexText(it.role || it.degree || it.title || it.language || it.name || it.label || it.category || it.course_area || it.project || '');
        var title2 = latexText(it.organization || it.institution || it.company || it.publisher || it.vendor || it.department || it.fluency || (it.level ? (it.institution ? (it.institution + ' (' + it.level + ')') : it.level) : '') || '');
        var desc = latexText(it.description || it.details || it.summary || it.highlights || it.dissertation || '');
        if (Array.isArray(it.courses) && it.courses.length) {
          var cCsv = latexText(it.courses.map(function(c){ return typeof c === 'string' ? c : (c.name || ''); }).join(', '));
          desc = '\\textbf{' + latexText(it.institution || '') + '} (' + latexText(it.level || '') + '). \\textit{Courses:} ' + cCsv;
        }
        
        tex += '\\cventry{' + dateStr + '}{' + title1 + '}{' + title2 + '}{}{}{' + desc + '}\n';
      });
    }
  } else if (typeof val === 'string') {
    tex += '\\cvlistitem{' + latexText(val) + '}\n';
  }
  
  return tex;
}

const sampleCv = JSON.parse(fs.readFileSync('guillermo_sahonero.cv', 'utf8'));

sampleCv.languages = [
  { language: 'Spanish', fluency: 'Native speaker', selected: true },
  { language: 'English', fluency: 'Full professional proficiency', selected: true }
];
sampleCv.patents = [
  { title: 'Method for MRI Sequence Synthesis', year: '2025', organization: 'WIPO', description: 'Patent application #12345', selected: true }
];
sampleCv.custom_kv = {
  "Citizenship": "Bolivian",
  "Residency": "Chile"
};

console.log("=== TESTING LANGUAGES HTML ===");
console.log(renderAutoSectionHtml('languages', sampleCv.languages));

console.log("=== TESTING LANGUAGES LATEX ===");
console.log(renderAutoSectionLatex('languages', sampleCv.languages));

console.log("=== TESTING PATENTS HTML ===");
console.log(renderAutoSectionHtml('patents', sampleCv.patents));

console.log("=== TESTING PATENTS LATEX ===");
console.log(renderAutoSectionLatex('patents', sampleCv.patents));

console.log("=== TESTING CUSTOM KV HTML ===");
console.log(renderAutoSectionHtml('custom_kv', sampleCv.custom_kv));

console.log("=== TESTING CUSTOM KV LATEX ===");
console.log(renderAutoSectionLatex('custom_kv', sampleCv.custom_kv));
