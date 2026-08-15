function getPropertyName(itemPath, fallbackKey) {
  if (activeInstance && activeInstance.propertyNames && activeInstance.propertyNames[itemPath] !== undefined && activeInstance.propertyNames[itemPath] !== '') {
    return activeInstance.propertyNames[itemPath];
  }
  if (typeof state !== 'undefined' && state.propertyNames && state.propertyNames[itemPath] !== undefined && state.propertyNames[itemPath] !== '') {
    return state.propertyNames[itemPath];
  }
  return fallbackKey !== undefined ? fallbackKey : human((itemPath || '').split('.').pop());
}

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

  var rawRegex = /\{\{\&([a-zA-Z0-9_\\.-]+)\}\}|\{\{\{([a-zA-Z0-9_\\.-]+)\}\}\}/g;
  rendered = rendered.replace(rawRegex, function(match, path1, path2) {
    var path = path1 || path2;
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

  // Markdown syntax parsing
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  str = str.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  str = str.replace(/(^|[^\*])\*([^*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');

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

  // Parse Bullet Lists (Multi-line text or explicit hyphens/asterisks/bullets)
  var hasNewlines = str.indexOf('\n') !== -1;
  var hasBulletMarkers = /(?:^|\n)\s*[-*•]\s+/m.test(str);

  if (hasNewlines || hasBulletMarkers) {
    var rawLines = str.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(Boolean);
    if (rawLines.length > 1 || hasBulletMarkers) {
      var resultLines = ['<ul class="cv-bullet-list" style="margin:2px 0; padding-left:14px; list-style-type:disc; line-height:1.35">'];
      for (var i = 0; i < rawLines.length; i++) {
        var cleanLine = rawLines[i].replace(/^\s*[-*•]\s+/, '');
        resultLines.push('  <li style="margin-bottom:1px">' + cleanLine + '</li>');
      }
      resultLines.push('</ul>');
      return resultLines.join('\n');
    }
  }

  str = str.replace(/\n/g, '<br>');
  return str;
}

function texEscape(str) {
  if (typeof str !== 'string') return str;

  if (/^[a-zA-Z0-9_\-.]+\.(png|jpg|jpeg|gif|pdf|eps)$/i.test(str)) {
    return str;
  }

  // Parse Markdown syntax into TeX commands
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '\\href{$2}{$1}');
  str = str.replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}');
  str = str.replace(/(^|[^\*])\*([^*]+)\*([^\*]|$)/g, '$1\\textit{$2}$3');

  // Parse Bullet Lists (- item, * item, • item) into LaTeX itemize
  if (/(?:^|\n)\s*[-*•]\s+/m.test(str)) {
    var texLines = str.split(/\r?\n/);
    var inTexList = false;
    var texResult = [];

    for (var j = 0; j < texLines.length; j++) {
      var tLine = texLines[j];
      var tMatch = tLine.match(/^\s*[-*•]\s+(.*)$/);
      if (tMatch) {
        if (!inTexList) {
          inTexList = true;
          texResult.push('\\begin{itemize}');
        }
        texResult.push('  \\item ' + tMatch[1]);
      } else {
        if (inTexList) {
          inTexList = false;
          texResult.push('\\end{itemize}');
        }
        if (tLine.trim()) {
          texResult.push(tLine);
        }
      }
    }
    if (inTexList) {
      texResult.push('\\end{itemize}');
    }
    str = texResult.join('\n');
  }

  var placeholders = [];

  var cmdRegex = /\\([a-zA-Z@]+)(\*?)(?:\{[^{}]*\}|\[[^\[\]]*\])*/g;

  str = str.replace(cmdRegex, function(match, cmdName) {
    var recognized = [
      'textbf','textit','emph','underline','small','large','Large','huge','HUGE',
      'textquotedblleft','textquotedblright','href','url','cventry','cvitem',
      'cvitemwithcomment','cvlistitem','vspace','hspace','par','smallskip',
      'medskip','bigskip','makeatletter','makeatother','compiledPublications',
      'compiledAbstracts','noindent','hangindent','hangafter','hbox','hss',
      'parbox','textit','textbf','textquotedblleft','textquotedblright','photo',
      'begin','end','item'
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

function buildTemplateContext(format) {
  format = format || 'html';
  var root = clone(data);
  
  // Apply instance visibility filters and overwrites
  if (activeInstance) {
    applyOverwrites(root, activeInstance.overwrites);
  }

  // Pre-calculate has_ tags for template blocks
  Object.keys(root).forEach(function(key) {
    if (key === 'instances' || key === '_style' || key.indexOf('_') === 0) {
      root['has_' + key] = false;
      return;
    }
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
      root[key] = val.map(function(item, idx) {
        var prepped = prepareContext(item, root);
        if (isObj(prepped)) {
          prepped._idx = idx;
          prepped._item_id = key + '-' + idx;
        }
        return prepped;
      });
    }
  });

  // Attach dynamic themes constants
  root.theme = {
    accentColor: state.themeAccentColor ? state.themeAccentColor.replace('#', '').toUpperCase() : '2563EB',
    fontCss: getFontCss(state.themeFont),
    fontLatex: getFontLatex(state.themeFont),
    textAlignCss: getTextAlignCss(state.themeTextAlign),
    textAlignFlexCss: getTextAlignFlexCss(state.themeTextAlign),
    textAlignLatex: getTextAlignLatex(state.themeTextAlign),
    textAlign: state.themeTextAlign || 'left',
    headerSpacer: state.headerSpacer !== undefined ? state.headerSpacer : 20,
    photoLeftOffset: state.photoLeftOffset !== undefined ? state.photoLeftOffset : 40,
    photoTopOffset: state.photoTopOffset !== undefined ? state.photoTopOffset : 0
  };

  // Handle profile photo metadata for LaTeX and HTML templates
  if (data && data.basics && data.basics.photo) {
    var photoStr = String(data.basics.photo).trim();
    if (photoStr) {
      root.has_photo = true;
      var ext = 'png';
      if (photoStr.indexOf('image/jpeg') !== -1 || photoStr.indexOf('image/jpg') !== -1 || photoStr.toLowerCase().indexOf('.jpg') !== -1 || photoStr.toLowerCase().indexOf('.jpeg') !== -1) {
        ext = 'jpg';
      }
      root.photo_filename = 'profile_photo.' + ext;
    } else {
      root.has_photo = false;
    }
  } else {
    root.has_photo = false;
  }

  // Add customized property/field names mappings combining global state and activeInstance overrides
  root.labels = {};
  var combinedPropNames = Object.assign({}, state.propertyNames || {});
  if (activeInstance && activeInstance.propertyNames) {
    Object.assign(combinedPropNames, activeInstance.propertyNames);
  }

  Object.keys(combinedPropNames).forEach(function(pathStr) {
    var label = combinedPropNames[pathStr];
    if (!label) return;
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

  // Handle research_interests metadata and fallback label for LaTeX and HTML
  var resInterestsRaw = (data && data.basics && data.basics.research_interests) || (data && data.research_interests) || '';
  if (typeof resInterestsRaw === 'object' && resInterestsRaw) {
    if (Array.isArray(resInterestsRaw)) {
      resInterestsRaw = resInterestsRaw.map(function(x) { return typeof x === 'string' ? x : (x.name || x.description || ''); }).filter(Boolean).join(', ');
    } else if (resInterestsRaw.description) {
      resInterestsRaw = resInterestsRaw.description;
    }
  }
  var resStr = String(resInterestsRaw || '').trim();
  var isResVisible = isFieldVisible('basics.research_interests') && isFieldVisible('research_interests') && (!state.sections.research_interests || state.sections.research_interests.include !== false);

  if (resStr && isResVisible) {
    root.has_research_interests = true;
    if (!root.basics) root.basics = {};
    root.basics.research_interests = resStr;
  } else {
    root.has_research_interests = false;
  }

  if (!root.labels.basics) root.labels.basics = {};
  var isEs = state.langFilter === 'es';
  var ensureBasicsLabel = function(field, defaultText) {
    var fullPath = 'basics.' + field;
    root.labels.basics[field] = getPropertyName(fullPath, field) || defaultText;
  };

  ensureBasicsLabel('firstname', isEs ? 'Nombre' : 'First Name');
  ensureBasicsLabel('lastname', isEs ? 'Apellido' : 'Last Name');
  ensureBasicsLabel('title', isEs ? 'Título Profesional' : 'Title');
  ensureBasicsLabel('email', 'Email');
  ensureBasicsLabel('location', isEs ? 'Ubicación' : 'Location');
  ensureBasicsLabel('homepage', isEs ? 'Sitio Web' : 'Website');
  ensureBasicsLabel('phone', isEs ? 'Teléfono' : 'Phone');
  ensureBasicsLabel('research_interests', isEs ? 'Intereses de Investigación' : 'Research Interests');

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
  var ignoreKeys = ['basics', 'research_interests', '_templates', 'templates', '_hiddenFields', 'all_sections', 'labels', 'theme', 'sections', 'instances'];
  
  Object.keys(data).forEach(function(key) {
    if (ignoreKeys.indexOf(key) !== -1 || key.indexOf('_') === 0) return;
    if (state.sections[key] && state.sections[key].include === false) return;
    if (activeInstance && activeInstance.visibility && activeInstance.visibility[key] === false) return;
    
    var val = data[key];
    if (!val) return;
    
    var htmlSec = renderAutoSectionHtml(key, val);
    if (htmlSec) htmlSections.push(htmlSec);
    
    var latexSec = renderAutoSectionLatex(key, val);
    if (latexSec) latexSections.push(latexSec);
  });
  
  root.all_sections_html = htmlSections.join('\n\n');
  root.all_sections_latex = latexSections.join('\n\n');
  root.all_sections = (format === 'latex') ? root.all_sections_latex : root.all_sections_html;

  return root;
}

function isFieldVisible(path) {
  if (!path) return true;
  if (activeInstance && activeInstance.visibility && activeInstance.visibility[path] !== undefined) {
    return activeInstance.visibility[path] !== false;
  }
  if (typeof data !== 'undefined' && data && data._hiddenFields && data._hiddenFields[path] !== undefined) {
    return !data._hiddenFields[path];
  }
  return true;
}

function getVisibleObject(item, basePath) {
  if (item == null) return item;
  if (typeof item !== 'object') {
    return isFieldVisible(basePath) ? item : undefined;
  }
  if (Array.isArray(item)) {
    return item.filter(function(sub, idx) {
      var subPath = basePath ? (basePath + '.' + idx) : String(idx);
      if (!isFieldVisible(subPath)) return false;
      if (isObj(sub) && sub.selected === false) return false;
      return true;
    }).map(function(sub, idx) {
      var subPath = basePath ? (basePath + '.' + idx) : String(idx);
      return getVisibleObject(sub, subPath);
    });
  }

  var cleanObj = {};
  Object.keys(item).forEach(function(k) {
    if (k === 'selected' || k === 'lang' || k === '_parent' || k === '_idx' || k === '_item_id') {
      cleanObj[k] = item[k];
      return;
    }
    var propPath = basePath ? (basePath + '.' + k) : k;
    if (!isFieldVisible(propPath)) {
      return;
    }
    var val = item[k];
    if (Array.isArray(val)) {
      cleanObj[k] = val.filter(function(sub, idx) {
        var subPath = propPath + '.' + idx;
        if (!isFieldVisible(subPath)) return false;
        if (isObj(sub) && sub.selected === false) return false;
        return true;
      }).map(function(sub, idx) {
        var subPath = propPath + '.' + idx;
        return getVisibleObject(sub, subPath);
      });
    } else if (isObj(val)) {
      cleanObj[k] = getVisibleObject(val, propPath);
    } else {
      cleanObj[k] = val;
    }
  });

  return cleanObj;
}

function renderAutoSectionHtml(key, val) {
  if (key === 'instances' || key === '_style' || key.indexOf('_') === 0) return '';
  if (state.sections[key] && state.sections[key].include === false) return '';
  if (activeInstance && activeInstance.visibility && activeInstance.visibility[key] === false) return '';
  if (!val) return '';
  
  var title = (state.sections[key] && state.sections[key].title) || human(key);
  var html = '<section id="section-' + key + '">\n  <h2>' + htmlEscape(title) + '</h2>\n';
  
  if (isObj(val) && !Array.isArray(val)) {
    var visVal = getVisibleObject(val, key);
    if (!visVal || !Object.keys(visVal).length) return '';
    html += '  <ul class="kv-list">\n';
    Object.keys(visVal).forEach(function(g) {
      if (g === 'selected' || g === 'lang') return;
      var itemPath = key + '.' + g;
      if (Array.isArray(visVal[g])) {
        if (!visVal[g].length) return;
        var gLabel = state.propertyNames[itemPath] || human(g);
        var csv = visVal[g].map(function(x) { return typeof x === 'string' ? x : (x.name || x.label || x.language || ''); }).filter(Boolean).join(', ');
        if (csv) html += '    <li id="item-' + key + '-' + g + '"><strong>' + htmlEscape(gLabel) + ':</strong> ' + htmlEscape(csv) + '</li>\n';
      } else if (visVal[g] != null) {
        var kLabel = state.propertyNames[itemPath] || human(g);
        html += '    <li id="item-' + key + '-' + g + '"><strong>' + htmlEscape(kLabel) + ':</strong> ' + htmlEscape(String(visVal[g])) + '</li>\n';
      }
    });
    html += '  </ul>\n</section>';
    return html;
  }
  
  if (Array.isArray(val)) {
    var activeItems = val.filter(function(item, idx) {
      var itemPath = key + '.' + idx;
      if (!isFieldVisible(itemPath)) return false;
      if (isObj(item) && item.selected === false) return false;
      if (activeInstance && activeInstance.visibility && activeInstance.visibility[key] && Array.isArray(activeInstance.visibility[key]) && activeInstance.visibility[key][idx] === false) return false;
      if (state.langFilter && state.langFilter !== 'all' && isObj(item) && item.lang) {
        if (item.lang !== 'all' && item.lang !== state.langFilter) return false;
      }
      return true;
    });
    if (!activeItems.length) return '';
    
    var isPubLike = activeItems.every(function(it) { return isObj(it) && (it.authors || (it.title && (it.venue || it.publisher))); });
    
    if (isPubLike) {
      html += '  <ul>\n';
      activeItems.forEach(function(rawIt, idx) {
        var realIdx = val.indexOf(rawIt);
        if (realIdx === -1) realIdx = idx;
        var itemPath = key + '.' + realIdx;
        var it = getVisibleObject(rawIt, itemPath);
        if (!it) return;

        var line = '';
        if (it.authors) line += htmlEscape(it.authors) + '. ';
        if (it.title) line += '"' + htmlEscape(it.title) + '." ';
        if (it.venue || it.publisher) line += '<em>' + htmlEscape(it.venue || it.publisher) + '</em>, ';
        if (it.year || it.date) line += htmlEscape(it.year || it.date);
        if (it.type) line += ' (' + htmlEscape(it.type) + ')';
        if (!it.venue && !it.title && it.description) line += htmlEscape(it.description);
        if (line.trim()) html += '    <li id="item-' + key + '-' + realIdx + '">' + line + '</li>\n';
      });
      html += '  </ul>\n';
    } else {
      activeItems.forEach(function(rawIt, idx) {
        var realIdx = val.indexOf(rawIt);
        if (realIdx === -1) realIdx = idx;
        var itemPath = key + '.' + realIdx;
        var it = getVisibleObject(rawIt, itemPath);
        if (!it) return;

        if (!isObj(it)) {
          html += '  <div class="entry" id="item-' + key + '-' + realIdx + '">' + htmlEscape(String(it)) + '</div>\n';
          return;
        }

        var headerLeft = it.role || it.degree || it.title || it.language || it.name || it.label || it.category || it.course_area || it.project || '';
        var headerRight = joinDate(it.start, it.end, 'dash') || it.year || it.date || '';
        
        var orgInstDept = '';
        if (it.organization && it.department) orgInstDept = it.organization + ', ' + it.department;
        else if (it.institution && it.department) orgInstDept = it.institution + ', ' + it.department;
        else if (it.organization) orgInstDept = it.organization;
        else if (it.institution) orgInstDept = it.institution;
        else if (it.department) orgInstDept = it.department;

        var subheader = orgInstDept || it.company || it.publisher || it.vendor || it.fluency || (it.level ? (it.institution ? (it.institution + ' (' + it.level + ')') : it.level) : '') || '';
        
        var descParts = [];
        if (it.dissertation) {
          descParts.push('<em>Dissertation:</em> ' + htmlEscape(it.dissertation));
        }
        var mainDesc = it.description || it.details || it.summary || it.highlights || '';
        if (mainDesc) {
          descParts.push(htmlEscape(mainDesc));
        }

        if (Array.isArray(it.courses) && it.courses.length) {
          var cCsv = it.courses.map(function(c){ return typeof c === 'string' ? c : (c.name || ''); }).filter(Boolean).join(', ');
          if (cCsv) descParts.push('<em>Courses:</em> ' + cCsv);
        }

        var desc = descParts.join('<br>');

        if (!headerLeft && !headerRight && !subheader && !desc) return;

        var spacer = (state.headerSpacer !== undefined) ? state.headerSpacer : 20;
        html += '  <div class="entry" id="item-' + key + '-' + realIdx + '">\n';
        html += '    <div class="entry-header" style="display:flex; justify-content:space-between; align-items:baseline; gap:' + spacer + 'px;">\n';
        html += '      <span>' + htmlEscape(headerLeft + (subheader ? ' - ' + subheader : '')) + '</span>\n';
        if (headerRight) html += '      <span style="white-space:nowrap;">' + htmlEscape(headerRight) + '</span>\n';
        html += '    </div>\n';
        if (desc) html += '    <div class="entry-description">' + desc + '</div>\n';
        html += '  </div>\n';
      });
    }
  } else if (typeof val === 'string') {
    if (isFieldVisible(key)) {
      html += '  <p>' + htmlEscape(val) + '</p>\n';
    }
  }
  
  html += '</section>';
  return html;
}

function renderAutoSectionLatex(key, val) {
  if (key === 'instances' || key === '_style' || key.indexOf('_') === 0) return '';
  if (state.sections[key] && state.sections[key].include === false) return '';
  if (activeInstance && activeInstance.visibility && activeInstance.visibility[key] === false) return '';
  if (!val) return '';
  
  var title = (state.sections[key] && state.sections[key].title) || human(key);
  var tex = '\\section{' + latexText(title) + '}\n';
  
  if (isObj(val) && !Array.isArray(val)) {
    var visVal = getVisibleObject(val, key);
    if (!visVal || !Object.keys(visVal).length) return '';
    Object.keys(visVal).forEach(function(g) {
      if (g === 'selected' || g === 'lang') return;
      var itemPath = key + '.' + g;
      if (Array.isArray(visVal[g])) {
        if (!visVal[g].length) return;
        var gLabel = latexText(getPropertyName(itemPath, g));
        var csv = visVal[g].map(function(x) { return typeof x === 'string' ? x : (x.name || x.label || x.language || ''); }).filter(Boolean).join(', ');
        if (csv) tex += '\\cvitemwithcomment{' + gLabel + '}{\\parbox[t]{0.85\\textwidth}{' + latexText(csv) + '}}{}\n';
      } else if (visVal[g] != null) {
        var kLabel = latexText(getPropertyName(itemPath, g));
        tex += '\\cvitemwithcomment{' + kLabel + '}{\\parbox[t]{0.85\\textwidth}{' + latexText(String(visVal[g])) + '}}{}\n';
      }
    });
    return tex;
  }
  
  if (Array.isArray(val)) {
    var activeItems = val.filter(function(item, idx) {
      var itemPath = key + '.' + idx;
      if (!isFieldVisible(itemPath)) return false;
      if (isObj(item) && item.selected === false) return false;
      if (activeInstance && activeInstance.visibility && activeInstance.visibility[key] && Array.isArray(activeInstance.visibility[key]) && activeInstance.visibility[key][idx] === false) return false;
      if (state.langFilter && state.langFilter !== 'all' && isObj(item) && item.lang) {
        if (item.lang !== 'all' && item.lang !== state.langFilter) return false;
      }
      return true;
    });
    if (!activeItems.length) return '';
    
    var isPubLike = activeItems.every(function(it) { return isObj(it) && (it.authors || (it.title && (it.venue || it.publisher))); });
    
    if (isPubLike) {
      activeItems.forEach(function(rawIt, idx) {
        var realIdx = val.indexOf(rawIt);
        if (realIdx === -1) realIdx = idx;
        var itemPath = key + '.' + realIdx;
        var it = getVisibleObject(rawIt, itemPath);
        if (!it) return;

        var authors = latexText(it.authors || '');
        var pTitle = latexText(it.title || '');
        var venue = latexText(it.venue || it.publisher || '');
        var year = latexText(it.year || it.date || '');
        var typ = it.type ? ' (' + latexText(it.type) + ')' : '';
        tex += '\\cvitem{-}{' + authors + '. \\textquotedblleft ' + pTitle + '.\\textquotedblright\\ \\textit{' + venue + '}. ' + year + typ + '.}\n';
      });
    } else {
      activeItems.forEach(function(rawIt, idx) {
        var realIdx = val.indexOf(rawIt);
        if (realIdx === -1) realIdx = idx;
        var itemPath = key + '.' + realIdx;
        var it = getVisibleObject(rawIt, itemPath);
        if (!it) return;

        if (!isObj(it)) {
          tex += '\\cvitem{-}{' + latexText(String(it)) + '}\n';
          return;
        }

        var dateStr = joinDate(it.start, it.end, 'dash') || latexText(it.year || it.date || '');
        var title1 = latexText(it.role || it.degree || it.title || it.language || it.name || it.label || it.category || it.course_area || it.project || '');
        
        var texOrgInstDept = '';
        if (it.organization && it.department) texOrgInstDept = it.organization + ', ' + it.department;
        else if (it.institution && it.department) texOrgInstDept = it.institution + ', ' + it.department;
        else if (it.organization) texOrgInstDept = it.organization;
        else if (it.institution) texOrgInstDept = it.institution;
        else if (it.department) texOrgInstDept = it.department;

        var subheaderVal = texOrgInstDept || it.company || it.publisher || it.vendor || it.fluency || (it.level ? (it.institution ? (it.institution + ' (' + it.level + ')') : it.level) : '') || '';
        var title2 = latexText(subheaderVal);
        
        var texDescParts = [];
        if (it.dissertation) {
          texDescParts.push('Dissertation: \\textit{' + latexText(it.dissertation) + '}');
        }
        var mainTexDesc = latexText(it.description || it.details || it.summary || it.highlights || '');
        if (mainTexDesc) {
          texDescParts.push(mainTexDesc);
        }

        if (Array.isArray(it.courses) && it.courses.length) {
          var cCsv = latexText(it.courses.map(function(c){ return typeof c === 'string' ? c : (c.name || ''); }).filter(Boolean).join(', '));
          if (cCsv) texDescParts.push('\\textit{Courses:} ' + cCsv);
        }

        var desc = texDescParts.join(' \\\\ ');
        
        tex += '\\cventry{' + dateStr + '}{' + title1 + '}{' + title2 + '}{}{}{' + desc + '}\n';
      });
    }
  } else if (typeof val === 'string') {
    if (isFieldVisible(key)) {
      tex += '\\cvlistitem{' + latexText(val) + '}\n';
    }
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

function getTextAlignCss(align) {
  switch(align) {
    case 'center': return 'text-align: center !important;';
    case 'right': return 'text-align: right !important;';
    case 'justify': return 'text-align: justify !important; text-justify: inter-word;';
    case 'left':
    default: return 'text-align: left !important;';
  }
}

function getTextAlignFlexCss(align) {
  switch(align) {
    case 'center': return 'justify-content: center !important; text-align: center !important;';
    case 'right': return 'justify-content: flex-end !important; text-align: right !important;';
    case 'justify': return 'justify-content: space-between !important; text-align: justify !important;';
    case 'left':
    default: return 'justify-content: flex-start !important; text-align: left !important;';
  }
}

function getTextAlignLatex(align) {
  switch(align) {
    case 'center': return '\\centering';
    case 'right': return '\\raggedleft';
    case 'left': return '\\raggedright';
    case 'justify':
    default: return '';
  }
}

function renderHtmlContent() {
  if (!Object.keys(data).length) return 'Upload or create a CV database to generate HTML.';
  var tplText = (el('htmlTplEditor') && el('htmlTplEditor').value) || DEFAULT_HTML_TEMPLATE;
  if (tplText.indexOf('theme.textAlign') === -1) {
    if (tplText.indexOf('</style>') !== -1) {
      tplText = tplText.replace('</style>', '  body, h1, h2, h3, p, section, .entry, .entry-description, .entry-subheader, .contact-info, .kv-list, ul, li {\n    {{&theme.textAlignCss}}\n  }\n  .contact-info, .entry-header {\n    {{&theme.textAlignFlexCss}}\n  }\n</style>');
    } else {
      tplText = DEFAULT_HTML_TEMPLATE;
    }
  }
  var context = buildTemplateContext('html');
  return renderTemplate(tplText, context, htmlEscape);
}

function findIframeSectionTarget(doc, sectionKey) {
  if (!doc || !sectionKey) return null;
  var secId = sectionKey.indexOf('section-') === 0 ? sectionKey : 'section-' + sectionKey;
  var rawKey = sectionKey.replace(/^section-/, '').toLowerCase();

  var elById = doc.getElementById(secId) || doc.getElementById(rawKey);
  if (elById) return elById;

  var elByQuery = doc.querySelector('[id*="' + rawKey + '"]');
  if (elByQuery) return elByQuery;

  var headings = doc.querySelectorAll('h1, h2, h3, header, section');
  for (var i = 0; i < headings.length; i++) {
    var txt = (headings[i].textContent || '').trim().toLowerCase();
    if (txt && (txt.indexOf(rawKey) !== -1 || rawKey.indexOf(txt) !== -1)) {
      return headings[i].closest('section') || headings[i].closest('header') || headings[i];
    }
  }

  return doc.querySelector('section, header') || doc.body;
}

function isElementInIframeViewport(targetEl, win) {
  if (!targetEl || !win) return false;
  try {
    var rect = targetEl.getBoundingClientRect();
    var viewH = win.innerHeight || (win.document && win.document.documentElement ? win.document.documentElement.clientHeight : 800);
    var viewW = win.innerWidth || (win.document && win.document.documentElement ? win.document.documentElement.clientWidth : 1200);
    
    return (
      rect.top >= 0 &&
      rect.bottom <= viewH &&
      rect.left >= 0 &&
      rect.right <= viewW
    );
  } catch (e) {
    return false;
  }
}

function findIframeItemTarget(doc, propPath) {
  if (!doc || !propPath) return null;

  var parts = String(propPath).trim().split('.');
  var sectionKey = parts[0];

  var sanitized = 'item-' + parts.join('-');
  var elById = doc.getElementById(sanitized);
  if (elById) return elById;

  if (parts.length >= 2 && !isNaN(parseInt(parts[1], 10))) {
    var entryId = 'item-' + parts[0] + '-' + parts[1];
    var entryEl = doc.getElementById(entryId);
    if (entryEl) return entryEl;
  }

  if (parts.length >= 2) {
    var groupId = 'item-' + parts[0] + '-' + parts[1];
    var groupEl = doc.getElementById(groupId);
    if (groupEl) return groupEl;
  }

  return findIframeSectionTarget(doc, sectionKey);
}

var lastFocusedItemPath = null;

function focusHtmlPreviewItem(propPath, force) {
  var frame = el('htmlPreviewFrame');
  if (!frame || !propPath) return;

  var cleanPath = String(propPath).trim();
  if (!force && lastFocusedItemPath === cleanPath) {
    return;
  }
  lastFocusedItemPath = cleanPath;

  if (frame.contentWindow) {
    try {
      frame.contentWindow.postMessage({ action: 'scrollToItem', propPath: cleanPath, force: !!force }, '*');
    } catch (e) {}
  }

  try {
    var doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
    var win = frame.contentWindow || window;
    if (doc) {
      var target = findIframeItemTarget(doc, cleanPath);
      if (target) {
        if (!force && isElementInIframeViewport(target, win)) {
          return;
        }

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.transition = 'outline 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease';
        target.style.outline = '2.5px solid #2563eb';
        target.style.borderRadius = '6px';
        target.style.boxShadow = '0 0 12px rgba(37, 99, 235, 0.3)';
        setTimeout(function() {
          if (target) {
            target.style.outline = 'none';
            target.style.boxShadow = 'none';
          }
        }, 1800);
      }
    }
  } catch (e) {
    console.warn('Could not focus iframe item:', e);
  }
}

var lastFocusedSection = null;

function focusHtmlPreviewSection(targetSectionId, force) {
  var frame = el('htmlPreviewFrame');
  if (!frame) return;

  var sectionKey = targetSectionId || (typeof state !== 'undefined' && state.activeSection) || 'basics';
  var secId = sectionKey.indexOf('section-') === 0 ? sectionKey : 'section-' + sectionKey;
  var rawKey = secId.replace(/^section-/, '').toLowerCase();

  if (frame.contentWindow) {
    try {
      frame.contentWindow.postMessage({ action: 'scrollToSection', sectionId: secId, force: !!force }, '*');
    } catch (e) {}
  }

  try {
    var doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
    var win = frame.contentWindow || window;
    if (doc) {
      var target = findIframeSectionTarget(doc, sectionKey);
      if (target) {
        if (!force && isElementInIframeViewport(target, win)) {
          return;
        }

        lastFocusedSection = rawKey;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.transition = 'outline 0.3s ease, box-shadow 0.3s ease';
        target.style.outline = '2.5px solid #2563eb';
        target.style.borderRadius = '6px';
        target.style.boxShadow = '0 0 12px rgba(37, 99, 235, 0.25)';
        setTimeout(function() {
          if (target) {
            target.style.outline = 'none';
            target.style.boxShadow = 'none';
          }
        }, 1800);
      }
    }
  } catch (e) {
    console.warn('Could not focus iframe section:', e);
  }
}

function updateHtmlPreviewContent() {
  var frame = el('htmlPreviewFrame');
  if (!frame) return;

  try {
    var doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
    if (doc && doc.body) {
      var newHtml = renderHtmlContent();
      var parser = new DOMParser();
      var parsedDoc = parser.parseFromString(newHtml, 'text/html');
      if (parsedDoc && parsedDoc.body) {
        // 1. Remove sections/elements from iframe doc that no longer exist in parsedDoc
        var existingSections = doc.body.querySelectorAll('section[id], header[id]');
        existingSections.forEach(function(existingSec) {
          if (existingSec.id && !parsedDoc.getElementById(existingSec.id)) {
            existingSec.remove();
          }
        });

        // 2. Sync / update / append sections from parsedDoc into iframe doc
        var newSections = parsedDoc.body.querySelectorAll('section[id], header[id]');
        newSections.forEach(function(newSec) {
          if (newSec.id) {
            var existingSec = doc.getElementById(newSec.id);
            if (existingSec) {
              if (existingSec.innerHTML !== newSec.innerHTML) {
                existingSec.innerHTML = newSec.innerHTML;
              }
            } else {
              doc.body.appendChild(doc.importNode(newSec, true));
            }
          }
        });

        // 3. Sync contact info
        var newContact = parsedDoc.body.querySelector('.contact-info');
        var existingContact = doc.querySelector('.contact-info');
        if (newContact && existingContact) {
          if (existingContact.innerHTML !== newContact.innerHTML) {
            existingContact.innerHTML = newContact.innerHTML;
          }
        } else if (newContact && !existingContact) {
          var header = doc.querySelector('header');
          if (header && header.nextSibling) {
            doc.body.insertBefore(doc.importNode(newContact, true), header.nextSibling);
          } else {
            doc.body.appendChild(doc.importNode(newContact, true));
          }
        } else if (!newContact && existingContact) {
          existingContact.remove();
        }

        // 4. Fallback full body sync if structure differs
        if (doc.body.innerHTML !== parsedDoc.body.innerHTML) {
          var currentScroll = frame.contentWindow ? frame.contentWindow.scrollY : 0;
          doc.body.innerHTML = parsedDoc.body.innerHTML;
          if (frame.contentWindow) {
            frame.contentWindow.scrollTo(0, currentScroll);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not update iframe HTML content:', e);
  }
  if (typeof updateAtsBadge === 'function') updateAtsBadge();
}

function renderHtmlPreview(targetSectionId) {
  var frame = el('htmlPreviewFrame');
  if (!frame) return;

  var html = renderHtmlContent();
  frame._isSrcdocLoading = true;
  frame.onload = function() {
    frame._isSrcdocLoading = false;
  };
  frame.srcdoc = html;

  var secKey = targetSectionId || (typeof state !== 'undefined' && state.activeSection);
  if (secKey) {
    setTimeout(function() {
      focusHtmlPreviewSection(secKey, true);
    }, 150);
  }
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

function renderLatexCode() {
  var tplText = (el('latexTplEditor') && el('latexTplEditor').value) || DEFAULT_LATEX_TEMPLATE;
  if (tplText.indexOf('theme.textAlign') === -1) {
    if (tplText.indexOf('\\begin{document}') !== -1) {
      tplText = tplText.replace('\\begin{document}', '\\begin{document}\n{{&theme.textAlignLatex}}');
    } else {
      tplText = DEFAULT_LATEX_TEMPLATE;
    }
  }
  if (tplText.indexOf('{{#basics.photo}}') !== -1) {
    tplText = tplText.replace('{{#basics.photo}}', '{{#has_photo}}').replace('{{/basics.photo}}', '{{/has_photo}}').replace('{{{basics.photo}}}', '{{{photo_filename}}}');
  }
  var context = buildTemplateContext('latex');
  return renderTemplate(tplText, context, texEscape);
}

function renderLatex() {
  if (!Object.keys(data).length) {
    var prev = el('latexPreview');
    if (prev) prev.textContent = 'Upload or create a CV database to generate LaTeX.';
    return;
  }
  var rendered = renderLatexCode();
  var prevEl = el('latexPreview');
  if (prevEl) prevEl.textContent = rendered;
  if (typeof updateAtsBadge === 'function') updateAtsBadge();
}

function renderSchema(){ el('schemaPreview').textContent=JSON.stringify(data,null,2); }

/**
 * Converts data.basics.photo into a base64 resource object for YtoTech compilation.
 */
async function getPhotoResource() {
  if (!data || !data.basics || !data.basics.photo) return null;
  var src = String(data.basics.photo).trim();
  if (!src) return null;

  var ext = 'png';
  var rawBase64 = '';

  if (src.indexOf('data:image/') === 0) {
    var commaIdx = src.indexOf(',');
    if (commaIdx !== -1) {
      var header = src.substring(0, commaIdx);
      if (header.indexOf('image/jpeg') !== -1 || header.indexOf('image/jpg') !== -1) ext = 'jpg';
      else if (header.indexOf('image/gif') !== -1) ext = 'gif';
      rawBase64 = src.substring(commaIdx + 1);
    }
  } else if (src.indexOf('http://') === 0 || src.indexOf('https://') === 0) {
    try {
      if (src.toLowerCase().indexOf('.jpg') !== -1 || src.toLowerCase().indexOf('.jpeg') !== -1) ext = 'jpg';
      var response = await fetch(src);
      var buffer = await response.arrayBuffer();
      var bytes = new Uint8Array(buffer);
      var binary = '';
      for (var i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      if (typeof btoa === 'function') {
        rawBase64 = btoa(binary);
      } else if (typeof Buffer !== 'undefined') {
        rawBase64 = Buffer.from(bytes).toString('base64');
      }
    } catch (e) {
      console.warn('Could not fetch remote photo for LaTeX compilation:', e);
      return null;
    }
  }

  if (!rawBase64) return null;
  return {
    path: 'profile_photo.' + ext,
    file: rawBase64
  };
}

/**
 * Compiles LaTeX code into a PDF binary Blob using the requested remote service.
 * Supported services:
 *   - 'ytotech': POST to https://latex.ytotech.com/builds/sync
 *   - 'latexonline': GET to https://latexonline.cc/compile?text=...
 */
async function compilePdfFromLatex(latexCode, serviceName) {
  serviceName = serviceName || (state && state.latexCompilerService) || 'ytotech';
  
  if (!latexCode || !latexCode.trim()) {
    throw new Error('LaTeX code is empty.');
  }

  if (serviceName === 'latexonline') {
    var url = 'https://latexonline.cc/compile?text=' + encodeURIComponent(latexCode);
    var res = await fetch(url);
    if (!res.ok) {
      throw new Error('LaTeX.Online server error: ' + res.status + ' ' + res.statusText);
    }
    return await res.blob();
  } else {
    // Default: YtoTech (POST)
    var photoRes = await getPhotoResource();
    var resources = [
      {
        main: true,
        content: latexCode
      }
    ];
    if (photoRes) {
      resources.push(photoRes);
    }

    var payload = {
      compiler: "pdflatex",
      resources: resources
    };
    var res = await fetch('https://latex.ytotech.com/builds/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok && res.status !== 201) {
      var errText = '';
      try {
        errText = await res.text();
      } catch (e) {}
      throw new Error('YtoTech LaTeX server error: ' + res.status + (errText ? ' - ' + errText.substring(0, 150) : ''));
    }
    return await res.blob();
  }
}

/**
 * Triggers browser download of a Blob file.
 */
function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename || 'CVbuilder_Document.pdf';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    if (a.parentNode) a.parentNode.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
