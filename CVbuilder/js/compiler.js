function renderTemplate(template, data, escapeFn) {
  if (!template) return '';
  var rendered = template;
  
  var sectionRegex = /\{\{\#(?:each\s+)?([a-zA-Z0-9_\\.-]+)\}\}([\s\S]*?)\{\{\/(?:each\s+)?\1\}\}/g;
  var limit = 0;
  while (limit < 100) {
    limit++;
    sectionRegex.lastIndex = 0;
    var match = sectionRegex.exec(rendered);
    if (!match) break;
    
    sectionRegex.lastIndex = 0;
    rendered = rendered.replace(sectionRegex, function(fullMatch, key, innerContent) {
      var cleanKey = key.replace(/^has_/, '');
      if (state.sections[cleanKey] && state.sections[cleanKey].include === false) {
        return '';
      }
      if (state.sections[key] && state.sections[key].include === false) {
        return '';
      }
      if (activeInstance && activeInstance.visibility && (activeInstance.visibility[key] === false || activeInstance.visibility[cleanKey] === false)) {
        return '';
      }
      
      var val = getPathValue(key, data);
      
      if (!val) return '';
      
      if (Array.isArray(val)) {
        var activeItems = val.filter(function(item) {
          if (isObj(item) && item.selected === false) return false;
          if (state.langFilter && state.langFilter !== 'all' && isObj(item) && item.lang) {
            if (item.lang !== 'all' && item.lang !== state.langFilter) return false;
          }
          return true;
        });
        if (!activeItems.length) return '';
        
        return activeItems.map(function(item) {
          var itemContext = prepareContext(item, data);
          return renderTemplate(innerContent, itemContext, escapeFn);
        }).join('\n');
      }
      
      if (key === 'skills' && isObj(val)) {
        var skillGroups = Object.keys(val).map(function(g) {
          var list = val[g].filter(function(x) {
            var sel = !isObj(x) || x.selected !== false;
            if (state.langFilter && state.langFilter !== 'all' && isObj(x) && x.lang) {
              if (x.lang !== 'all' && x.lang !== state.langFilter) sel = false;
            }
            return sel;
          });
          var label = '';
          var pathKey = 'skills.' + g;
          if (activeInstance && activeInstance.propertyNames && activeInstance.propertyNames[pathKey]) {
            label = activeInstance.propertyNames[pathKey];
          } else {
            label = state.propertyNames[pathKey] || human(g);
          }
          return {
            group: label,
            items: list,
            items_csv: list.map(function(x) { return typeof x === 'string' ? x : (x.name || ''); }).filter(Boolean).join(', ')
          };
        }).filter(function(sg) { return sg.items.length > 0; });
        
        if (!skillGroups.length) return '';
        
        return skillGroups.map(function(sg) {
          var groupCtx = Object.assign({ _parent: data }, sg);
          return renderTemplate(innerContent, groupCtx, escapeFn);
        }).join('\n');
      }
      
      if (isObj(val)) {
        var objCtx = Object.assign({ _parent: data }, val);
        return renderTemplate(innerContent, objCtx, escapeFn);
      }
      
      return renderTemplate(innerContent, data, escapeFn);
    });
  }

  var rawRegex = /\{\{\&([a-zA-Z0-9_\\.-]+)\}\}/g;
  rendered = rendered.replace(rawRegex, function(match, path) {
    var val = getPathValue(path, data);
    return val !== undefined && val !== null ? String(val) : '';
  });

  var valRegex = /\{\{([a-zA-Z0-9_\\.-]+)\}\}/g;
  rendered = rendered.replace(valRegex, function(match, path) {
    var val = getPathValue(path, data);
    if (val === null || val === undefined) return '';
    return escapeFn ? escapeFn(String(val)) : String(val);
  });

  return rendered;
}

function getPathValue(path, obj) {
  var parts = path.split('.');
  var current = obj;
  var firstKey = parts[0];
  while (current && !(firstKey in current) && current._parent) {
    current = current._parent;
  }
  if (!current) return undefined;
  for (var i = 0; i < parts.length; i++) {
    if (current === null || current === undefined) return undefined;
    current = current[parts[i]];
  }
  return current;
}

function prepareContext(item, parentData) {
  if (!isObj(item)) {
    return { value: item, _parent: parentData };
  }
  var ctx = Object.assign({ _parent: parentData }, item);
  
  var start = String(item.start || '').trim();
  var end = String(item.end || '').trim();
  if (start && end) {
    ctx.date_paren = start + ' (' + end + ')';
    ctx.date_dash = start + '--' + end;
  } else {
    ctx.date_paren = start || end || '';
    ctx.date_dash = start || end || '';
  }
  
  if (Array.isArray(item.courses)) {
    ctx.courses_csv = item.courses.filter(Boolean).map(function(x) { return typeof x === 'string' ? x : (x.name || ''); }).join(', ');
  }
  
  if ('proficiency' in item) {
    if (isObj(item.proficiency)) {
      ctx.proficiency_desc = 'writes ' + (item.proficiency.writes || '') + 
                             ', reads ' + (item.proficiency.reads || '') + 
                             ', speaks ' + (item.proficiency.speaks || '') + 
                             ', listens ' + (item.proficiency.listens || '');
    } else {
      ctx.proficiency_desc = String(item.proficiency || '');
    }
  }

  if (Array.isArray(item.items)) {
    ctx.items_csv = item.items.filter(Boolean).map(function(x) { return typeof x === 'string' ? x : (x.name || ''); }).join(', ');
  }
  
  return ctx;
}

function htmlEscape(s) {
  if (s == null) return '';
  var str = String(s)
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
      'parbox','textit','textbf','textquotedblleft','textquotedblright'
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

function applyOverwrites(obj, overwrites) {
  if (!overwrites) return;
  Object.keys(overwrites).forEach(function(pathStr) {
    var val = overwrites[pathStr];
    var parts = pathStr.split('.');
    var current = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = val;
  });
}

function buildTemplateContext() {
  var root = clone(data);
  
  // Apply instance visibility filters and overwrites
  if (activeInstance) {
    applyOverwrites(root, activeInstance.overwrites);
  }

  // Pre-calculate has_ tags for template blocks
  Object.keys(root).forEach(function(key) {
    var isIncluded = true;
    if (state.sections[key] && state.sections[key].include === false) {
      isIncluded = false;
    }
    if (activeInstance && activeInstance.visibility && activeInstance.visibility[key] === false) {
      isIncluded = false;
    }
    
    var val = root[key];
    var hasContent = false;
    if (Array.isArray(val)) {
      var activeItems = val.filter(function(item) {
        var selected = !isObj(item) || item.selected !== false;
        
        // Dynamic bilingual translation language filtering
        if (state.langFilter && state.langFilter !== 'all' && isObj(item) && item.language) {
          if (item.language !== 'all' && item.language !== state.langFilter) {
            selected = false;
          }
        }
        return selected;
      });
      hasContent = activeItems.length > 0;
    } else if (isObj(val)) {
      hasContent = Object.keys(val).length > 0;
    } else {
      hasContent = !!val;
    }
    
    root['has_' + key] = isIncluded && hasContent;
  });

  // Prepare nested array contexts (dates, lists, language proficiency strings)
  Object.keys(root).forEach(function(key) {
    var val = root[key];
    if (Array.isArray(val)) {
      root[key] = val.map(function(item) {
        return prepareContext(item, root);
      });
    }
  });

  // Attach dynamic themes constants
  root.theme = {
    accentColor: state.themeAccentColor ? state.themeAccentColor.replace('#', '').toUpperCase() : '2563EB',
    fontCss: getFontCss(state.themeFont),
    fontLatex: getFontLatex(state.themeFont),
    photoLeftOffset: state.photoLeftOffset !== undefined ? state.photoLeftOffset : 40,
    photoTopOffset: state.photoTopOffset !== undefined ? state.photoTopOffset : 0
  };

  // Add customized property/field names mappings
  root.labels = {};
  Object.keys(state.propertyNames).forEach(function(pathStr) {
    var label = state.propertyNames[pathStr];
    var parts = pathStr.split('.');
    var current = root.labels;
    for (var i = 0; i < parts.length - 1; i++) {
      var p = parts[i];
      if (!current[p] || typeof current[p] !== 'object') {
        current[p] = {};
      }
      current = current[p];
    }
    if (current && typeof current === 'object') {
      current[parts[parts.length - 1]] = label;
    }
  });

  // Add Spanish sections translation support
  root.sections = {};
  Object.keys(state.sections).forEach(function(key) {
    root.sections[key] = {
      title: state.sections[key].title || human(key)
    };
  });

  // Automatic Section Compilation for HTML and LaTeX
  var htmlSections = [];
  var latexSections = [];
  var ignoreKeys = ['basics', 'research_interests', '_templates', 'templates', '_hiddenFields', 'all_sections', 'labels', 'theme', 'sections'];
  
  Object.keys(data).forEach(function(key) {
    if (ignoreKeys.indexOf(key) !== -1 || key.indexOf('_') === 0) return;
    
    var val = root[key] !== undefined ? root[key] : data[key];
    if (!val) return;
    
    var htmlSec = renderAutoSectionHtml(key, val);
    if (htmlSec) htmlSections.push(htmlSec);
    
    var latexSec = renderAutoSectionLatex(key, val);
    if (latexSec) latexSections.push(latexSec);
  });
  
  root.all_sections_html = htmlSections.join('\n\n');
  root.all_sections_latex = latexSections.join('\n\n');
  root.all_sections = root.all_sections_html;

  return root;
}

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

function getFontCss(font) {
  switch(font) {
    case 'serif': return "font-family: Georgia, Cambria, 'Times New Roman', Times, serif;";
    case 'mono': return "font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;";
    case 'garamond': return "font-family: 'EB Garamond', Garamond, 'Baskerville Old Face', serif;";
    case 'palatino': return "font-family: Palatino, 'Palatino Linotype', 'Book Antiqua', serif;";
    case 'sans':
    default: return "font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;";
  }
}

function getFontLatex(font) {
  switch(font) {
    case 'serif': return "\\renewcommand{\\familydefault}{\\rmdefault}";
    case 'mono': return "\\renewcommand{\\familydefault}{\\ttdefault}";
    case 'garamond': return "\\usepackage{ebgaramond}\\renewcommand{\\familydefault}{\\rmdefault}";
    case 'palatino': return "\\usepackage{mathpazo}\\renewcommand{\\familydefault}{\\rmdefault}";
    case 'sans':
    default: return "";
  }
}

function renderHtmlContent() {
  if (!Object.keys(data).length) return 'Upload or create a CV database to generate HTML.';
  var tplText = el('htmlTplEditor').value || DEFAULT_HTML_TEMPLATE;
  var context = buildTemplateContext();
  return renderTemplate(tplText, context, htmlEscape);
}

function renderHtmlPreview() {
  var frame = el('htmlPreviewFrame');
  if (!frame) return;
  var html = renderHtmlContent();
  frame.srcdoc = html;
}

function latexText(x){ return texEscape(String(x==null?'':x)); }
function latexRaw(x){ return String(x==null?'':x); }
function joinDate(start,end,mode){
  mode=mode||'dash'; start=String(start||'').trim(); end=String(end||'').trim();
  if(start&&end) return mode==='paren'?start+' ('+end+')':start+'--'+end;
  return start||end||'';
}
function cvitem(label,content){ return '\\cvitem{'+label+'}{'+content+'}'; }
function cventry(a,b,c,d,e,f){ return '\\cventry{'+a+'}{'+b+'}{'+c+'}{'+d+'}{'+e+'}{'+f+'}'; }
function commaList(arr){ return (arr||[]).filter(Boolean).map(function(x){ return typeof x==='string'?x:(x.name||''); }).filter(Boolean).join(', '); }

function buildFullWidthEntries(items,withType){
  var lines=[]; var macro=withType?'\\compiledAbstracts':'\\compiledPublications';
  lines.push('\\makeatletter'); lines.push('\\def'+macro+'{}');
  items.filter(function(x){ return !isObj(x)||x.selected!==false; }).forEach(function(p){
    var authors=latexRaw(p.authors),title=latexRaw(p.title),venue=latexRaw(p.venue),year=latexRaw(p.year);
    var typ=withType?latexRaw(p.type):'';
    var tail=withType?'\\ '+year+'~('+typ+').\\par\\smallskip':'\\ '+year+'.\\par\\smallskip';
    lines.push('\\g@addto@macro'+macro+'{%');
    lines.push('\\noindent\\hangindent=1.5em\\hangafter=1%');
    lines.push('\\hbox to 1.5em{-\\hss}%');
    lines.push(authors+'.%');
    lines.push('\\ \\textquotedblleft '+title+'.\\textquotedblright%');
    lines.push('\\ \\textit{'+venue+'}.%');
    lines.push(tail); lines.push('}');
  });
  lines.push('\\makeatother'); lines.push(macro);
  return lines;
}

function renderAwards(items){
  return items.filter(function(x){ return !isObj(x)||x.selected!==false; }).map(function(a){
    return '\\cvitemwithcomment{'+latexText(a.category||'')+'}{\\parbox[t]{0.87\\textwidth}{'+latexText(a.description||'')+(a.year?' ~ ('+latexText(a.year)+')':'')+'}}{}'; });
}
function renderSkillsLatex(obj){
  var lines=[];
  Object.keys(obj).forEach(function(group){
    var arr=obj[group]; if(!Array.isArray(arr)) return;
    var selected=arr.filter(function(x){ return x.selected!==false; });
    if(!selected.length) return;
    var label=latexText(state.propertyNames['skills.'+group]||human(group));
    lines.push('\\cvitemwithcomment{'+label+'}{\\parbox[t]{0.85\\textwidth}{'+latexText(commaList(selected))+'}}{}');
  });
  return lines;
}
function renderLanguages(items){
  return items.filter(function(x){ return !isObj(x)||x.selected!==false; }).map(function(l){
    var prof='';
    if(isObj(l.proficiency)) prof='writes '+(l.proficiency.writes||'')+', reads '+(l.proficiency.reads||'')+', speaks '+(l.proficiency.speaks||'')+', listens '+(l.proficiency.listens||'');
    else prof=String(l.proficiency||'');
    return '\\cvitemwithcomment{'+latexText(l.language||'')+'}{'+latexText(prof)+'}{}'; });
}

function renderLatex() {
  if (!Object.keys(data).length) {
    var prev = el('latexPreview');
    if (prev) prev.textContent = 'Upload or create a CV database to generate LaTeX.';
    return;
  }
  var tplText = (el('latexTplEditor') && el('latexTplEditor').value) || DEFAULT_LATEX_TEMPLATE;
  var context = buildTemplateContext();
  var rendered = renderTemplate(tplText, context, texEscape);
  var prevEl = el('latexPreview');
  if (prevEl) prevEl.textContent = rendered;
  
  renderHtmlPreview();
}

function renderSchema(){ el('schemaPreview').textContent=JSON.stringify(data,null,2); }
