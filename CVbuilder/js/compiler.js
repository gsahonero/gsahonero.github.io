function renderTemplate(template, data, escapeFn) {
  var rendered = template;
  
  var conditionalRegex = /\{\{\#([a-zA-Z0-9_\\.-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  var limit = 0;
  while (limit < 100) {
    limit++;
    conditionalRegex.lastIndex = 0;
    if (!conditionalRegex.test(rendered)) break;
    conditionalRegex.lastIndex = 0;
    rendered = rendered.replace(conditionalRegex, function(match, key, innerContent) {
      var val = getPathValue(key, data);
      
      // Instance section inclusion checks
      if (activeInstance && activeInstance.visibility && activeInstance.visibility[key] === false) {
        return '';
      }
      
      var isList = Array.isArray(val);
      var isTruthy = val && (!isList || val.length > 0);
      if (!isTruthy) return '';
      return innerContent;
    });
  }
  
  var loopRegex = /\{\{\#each\s+([a-zA-Z0-9_\\.-]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  limit = 0;
  while (limit < 100) {
    limit++;
    loopRegex.lastIndex = 0;
    if (!loopRegex.test(rendered)) break;
    loopRegex.lastIndex = 0;
    rendered = rendered.replace(loopRegex, function(match, section, innerTemplate) {
      var items = getPathValue(section, data);
      if (section === 'skills' && items && !Array.isArray(items) && typeof items === 'object') {
        var skillGroups = Object.keys(items).map(function(g) {
          var list = items[g].filter(function(x) { return x.selected !== false; });
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
            items_csv: list.map(function(x) { return typeof x === 'string' ? x : x.name; }).filter(Boolean).join(', ')
          };
        }).filter(function(g) { return g.items.length > 0; });
        return skillGroups.map(function(sg) {
          return renderTemplate(innerTemplate, Object.assign({ _parent: data }, sg), escapeFn);
        }).join('\n');
      }
      if (!items) return '';
      if (typeof items === 'string' || typeof items === 'boolean' || typeof items === 'number') {
        return items ? renderTemplate(innerTemplate, data, escapeFn) : '';
      }
      if (!Array.isArray(items)) {
        return renderTemplate(innerTemplate, Object.assign({ _parent: data }, items), escapeFn);
      }
      return items.filter(function(item) { return !isObj(item) || item.selected !== false; }).map(function(item) {
        var context = isObj(item) ? Object.assign({ _parent: data }, item) : { value: item, _parent: data };
        return renderTemplate(innerTemplate, context, escapeFn);
      }).join('\n');
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
  return String(s==null?'':s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
    fontLatex: getFontLatex(state.themeFont)
  };

  // Add customized property/field names mappings
  root.labels = {};
  Object.keys(state.propertyNames).forEach(function(pathStr) {
    var label = state.propertyNames[pathStr];
    var parts = pathStr.split('.');
    var current = root.labels;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = label;
  });

  // Add Spanish sections translation support
  root.sections = {};
  Object.keys(state.sections).forEach(function(key) {
    root.sections[key] = {
      title: state.sections[key].title || human(key)
    };
  });

  return root;
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
