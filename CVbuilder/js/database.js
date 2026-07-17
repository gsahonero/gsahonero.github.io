function listDatabases() {
  var list = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.indexOf('cvbuilder_cv_') === 0) {
      list.push(key.substring('cvbuilder_cv_'.length));
    }
  }
  if (list.length === 0) {
    list.push('Default CV');
  }
  return list;
}

function saveCurrentDatabase() {
  if (!currentDbName) currentDbName = 'Default CV';
  var cleanData = clone(data);
  delete cleanData._templates;
  delete cleanData.templates;
  localStorage.setItem('cvbuilder_cv_' + currentDbName, JSON.stringify(cleanData));
  markClean();
  updateDbSelector();
}

function loadDatabase(name) {
  var raw = localStorage.getItem('cvbuilder_cv_' + name);
  if (raw) {
    try {
      data = JSON.parse(raw);
      var isEmptyDefault = (name === 'Default CV' && (!data.basics || (!data.basics.firstname && !data.basics.lastname)));
      var isPersonalDefault = (data.basics && data.basics.firstname === 'Guillermo' && data.basics.lastname === 'Sahonero');
      if (isEmptyDefault || isPersonalDefault) {
        data = JSON.parse(JSON.stringify(BASIC_CV));
        localStorage.setItem('cvbuilder_cv_' + name, JSON.stringify(data));
      }
      delete data._templates;
      delete data.templates;
      currentDbName = name;
      state.sections = {};
      state.propertyNames = {};
      state.activeSection = Object.keys(data).filter(function(k) { return k !== '_templates' && k !== 'templates'; })[0] || '';
      
      markClean();
      renderAll();
      updateDbSelector();
    } catch (e) {
      alert(t('invalid_json') + e.message);
    }
  } else {
    createPresetDatabase(name, 'basic');
  }
}

function createPresetDatabase(name, preset) {
  var template = RESEARCHER_CV;
  if (preset === 'basic') template = BASIC_CV;
  else if (preset === 'minimal') template = MINIMAL_CV;
  
  data = JSON.parse(JSON.stringify(template));
  currentDbName = name;
  saveCurrentDatabase();
  renderAll();
  updateDbSelector();
}

function deleteDatabase(name) {
  localStorage.removeItem('cvbuilder_cv_' + name);
  var list = listDatabases();
  loadDatabase(list[0]);
}

function updateDbSelector() {
  var sel = el('dbSelect');
  if (!sel) return;
  sel.innerHTML = '';
  var list = listDatabases();
  list.forEach(function(name) {
    var opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === currentDbName) opt.selected = true;
    sel.appendChild(opt);
  });
  
  var optDiv = document.createElement('option');
  optDiv.disabled = true;
  optDiv.textContent = '──────────';
  sel.appendChild(optDiv);
  
  var optManage = document.createElement('option');
  optManage.value = '__manage__';
  optManage.textContent = state.langFilter === 'es' ? '⚙️ Administrar CVs...' : '⚙️ Manage CVs...';
  sel.appendChild(optManage);
}

function listStyles() {
  var list = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.indexOf('cvbuilder_style_') === 0) {
      list.push(key.substring('cvbuilder_style_'.length));
    }
  }
  if (list.length === 0) {
    list.push('Default Style');
  }
  return list;
}

function saveCurrentStyle() {
  if (!currentStyleName) currentStyleName = 'Default Style';
  var payload = {
    cvTitle: tpl.cvTitle || 'Curriculum Vitae',
    style: tpl.style || 'classic',
    preamble: tpl.preamble || '',
    footer: tpl.footer || '',
    latexTemplate: el('latexTplEditor').value,
    htmlTemplate: el('htmlTplEditor').value,
    mappers: mappers,
    theme: {
      accentColor: state.themeAccentColor,
      font: state.themeFont
    }
  };
  localStorage.setItem('cvbuilder_style_' + currentStyleName, JSON.stringify(payload));
  updateStyleSelector();
  
  if (activeInstance) {
    saveCurrentInstance();
  }
}

function loadStyle(name) {
  var raw = localStorage.getItem('cvbuilder_style_' + name);
  if (raw) {
    try {
      var payload = JSON.parse(raw);
      currentStyleName = name;
      
      tpl.cvTitle = payload.cvTitle || 'Curriculum Vitae';
      tpl.style = payload.style || 'classic';
      tpl.preamble = payload.preamble || '';
      tpl.footer = payload.footer || '';
      
      state.themeAccentColor = (payload.theme && payload.theme.accentColor) || '#2563eb';
      state.themeFont = (payload.theme && payload.theme.font) || 'sans';
      el('themeAccentColor').value = state.themeAccentColor;
      el('themeAccentHex').value = state.themeAccentColor;
      el('themeFontSelect').value = state.themeFont;
      
      var latexTpl = payload.latexTemplate || DEFAULT_LATEX_TEMPLATE;
      var hasMigration = false;
      if (name === 'Default Style' && latexTpl.indexOf('has_publications') === -1) {
        latexTpl = DEFAULT_LATEX_TEMPLATE;
        payload.htmlTemplate = DEFAULT_HTML_TEMPLATE;
        hasMigration = true;
      }
      if (latexTpl.indexOf('\\address{{{basics.location}}}\\\\') !== -1) {
        latexTpl = latexTpl.replace('\\address{{{basics.location}}}\\\\', '\\address{{{basics.location}}}');
        hasMigration = true;
      }
      var oldEdu = '\\cventry{{{date_paren}}}{{{degree}}}{{{institution}}}{{#dissertation}}\\textbf{Dissertation: } {{{dissertation}}}{{/dissertation}}{{{description}}}{}';
      var newEdu = '\\cventry{{{date_paren}}}{{{degree}}}{{{institution}}}{}{ {{#dissertation}}\\textbf{Dissertation: } {{{dissertation}}}{{/dissertation}} }{{{description}}}';
      if (latexTpl.indexOf(oldEdu) !== -1) {
        latexTpl = latexTpl.replace(oldEdu, newEdu);
        hasMigration = true;
      }
      if (hasMigration) {
        payload.latexTemplate = latexTpl;
        localStorage.setItem('cvbuilder_style_' + name, JSON.stringify(payload));
      }
      el('latexTplEditor').value = latexTpl;
      el('htmlTplEditor').value = payload.htmlTemplate || DEFAULT_HTML_TEMPLATE;
      mappers = payload.mappers || JSON.parse(JSON.stringify(DEFAULT_MAPPERS));
      
      el('cvTitle').value = tpl.cvTitle;
      el('styleName').value = tpl.style;
      
      renderLatex();
      updateStyleSelector();
    } catch (e) {
      alert(t('invalid_json') + e.message);
    }
  } else {
    createBlankStyle(name);
  }
}

function createBlankStyle(name) {
  currentStyleName = name;
  tpl = {
    cvTitle: 'Curriculum Vitae',
    style: 'classic',
    preamble: '',
    footer: ''
  };
  el('latexTplEditor').value = DEFAULT_LATEX_TEMPLATE;
  el('htmlTplEditor').value = DEFAULT_HTML_TEMPLATE;
  mappers = JSON.parse(JSON.stringify(DEFAULT_MAPPERS));
  
  el('cvTitle').value = tpl.cvTitle;
  el('styleName').value = tpl.style;
  
  saveCurrentStyle();
  renderLatex();
  updateStyleSelector();
}

function deleteStyle(name) {
  localStorage.removeItem('cvbuilder_style_' + name);
  var list = listStyles();
  loadStyle(list[0]);
}

function updateStyleSelector() {
  var sel = el('styleSelect');
  if (!sel) return;
  sel.innerHTML = '';
  var list = listStyles();
  list.forEach(function(name) {
    var opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === currentStyleName) opt.selected = true;
    sel.appendChild(opt);
  });
  
  var optDiv = document.createElement('option');
  optDiv.disabled = true;
  optDiv.textContent = '──────────';
  sel.appendChild(optDiv);
  
  var optManage = document.createElement('option');
  optManage.value = '__manage__';
  optManage.textContent = state.langFilter === 'es' ? '⚙️ Administrar estilos...' : '⚙️ Manage Styles...';
  sel.appendChild(optManage);
}

function listInstances() {
  var list = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.indexOf('cvbuilder_instance_') === 0) {
      list.push(key.substring('cvbuilder_instance_'.length));
    }
  }
  return list;
}

function saveCurrentInstance() {
  if (!activeInstance || currentInstanceName === 'None (Master CV)') return;
  activeInstance.style = {
    cvTitle: tpl.cvTitle || 'Curriculum Vitae',
    style: tpl.style || 'classic',
    preamble: tpl.preamble || '',
    footer: tpl.footer || '',
    latexTemplate: el('latexTplEditor').value,
    htmlTemplate: el('htmlTplEditor').value,
    mappers: mappers
  };
  localStorage.setItem('cvbuilder_instance_' + currentInstanceName, JSON.stringify(activeInstance));
  updateInstanceSelector();
}

function loadInstance(name) {
  if (!name || name === 'None (Master CV)') {
    activeInstance = null;
    currentInstanceName = 'None (Master CV)';
    updateInstanceSelector();
    renderAll();
    return;
  }
  var raw = localStorage.getItem('cvbuilder_instance_' + name);
  if (raw) {
    try {
      var payload = JSON.parse(raw);
      activeInstance = payload;
      currentInstanceName = name;
      
      if (payload.masterCvName && payload.masterCvName !== currentDbName) {
        var dbRaw = localStorage.getItem('cvbuilder_cv_' + payload.masterCvName);
        if (dbRaw) {
          loadDatabase(payload.masterCvName);
        }
      }
      
      if (payload.style) {
        tpl.cvTitle = payload.style.cvTitle || 'Curriculum Vitae';
        tpl.style = payload.style.style || 'classic';
        tpl.preamble = payload.style.preamble || '';
        tpl.footer = payload.style.footer || '';
        el('latexTplEditor').value = payload.style.latexTemplate || DEFAULT_LATEX_TEMPLATE;
        el('htmlTplEditor').value = payload.style.htmlTemplate || DEFAULT_HTML_TEMPLATE;
        mappers = payload.style.mappers || JSON.parse(JSON.stringify(DEFAULT_MAPPERS));
        
        el('cvTitle').value = tpl.cvTitle;
        el('styleName').value = tpl.style;
      }
      
      updateInstanceSelector();
      renderAll();
    } catch (e) {
      alert(t('invalid_json') + e.message);
    }
  }
}

function deleteInstance(name) {
  if (confirm(t('confirm_delete_instance', { name: name }))) {
    localStorage.removeItem('cvbuilder_instance_' + name);
    if (currentInstanceName === name) {
      loadInstance('None (Master CV)');
    } else {
      updateInstanceSelector();
    }
  }
}

function updateInstanceSelector() {
  var sel = el('instanceSelect');
  if (!sel) return;
  sel.innerHTML = '';
  
  var optNone = document.createElement('option');
  optNone.value = 'None (Master CV)';
  optNone.textContent = 'None (Master CV)';
  sel.appendChild(optNone);
  
  var list = listInstances();
  list.forEach(function(name) {
    var opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
  
  var optSep = document.createElement('option');
  optSep.disabled = true;
  optSep.textContent = '──────────';
  sel.appendChild(optSep);
  
  var optManage = document.createElement('option');
  optManage.value = '__manage__';
  optManage.textContent = state.langFilter === 'es' ? 'Administrar instancias...' : 'Manage CV Instances...';
  sel.appendChild(optManage);
  
  sel.value = currentInstanceName;

  var indicator = el('instanceIndicator');
  if (indicator) {
    if (activeInstance && currentInstanceName !== 'None (Master CV)') {
      indicator.classList.remove('hidden');
      sel.style.borderColor = 'var(--color-primary)';
      sel.style.boxShadow = '0 0 0 1px oklch(from var(--color-primary) l c h / .15)';
    } else {
      indicator.classList.add('hidden');
      sel.style.borderColor = 'oklch(from var(--color-text) l c h / .14)';
      sel.style.boxShadow = 'none';
    }
  }
}

function showInstanceManagerModal() {
  var modal = document.createElement('div');
  modal.className = 'modal-backdrop open';
  modal.id = 'instanceManagerModal';
  modal.onclick = function(e) {
    if (e.target === modal) {
      modal.remove();
      updateInstanceSelector();
    }
  };
  
  var list = listInstances();
  var isEs = state.langFilter === 'es';
  var rows = list.map(function(name) {
    return '<div class="row" style="display:flex; justify-content:space-between; align-items:center; padding:var(--space-2) 0; border-bottom:1px solid oklch(from var(--color-text) l c h / .08)">'
      + '<span><strong>' + esc(name) + '</strong></span>'
      + '<div style="display:flex; gap:var(--space-2)">'
      + '<button class="btn btn-secondary btn-xs" onclick="downloadInstanceFile(\'' + esc(name) + '\')">' + (isEs ? 'Exportar' : 'Export') + '</button>'
      + '<button class="btn btn-danger btn-xs" onclick="deleteInstance(\'' + esc(name) + '\'); document.getElementById(\'instanceManagerModal\').remove(); showInstanceManagerModal();">' + (isEs ? 'Eliminar' : 'Delete') + '</button>'
      + '</div>'
      + '</div>';
  }).join('') || '<div class="muted tiny" style="padding:var(--space-4) 0">' + (isEs ? 'No hay instancias guardadas todavía.' : 'No custom CV Instances saved yet.') + '</div>';

  modal.innerHTML = '<div class="modal" style="max-width:500px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-4); box-shadow:var(--shadow-md)">'
    + '<div class="modal-header"><h3>' + (isEs ? 'Administrar Instancias de CV' : 'Manage CV Instances') + '</h3></div>'
    + '<div class="modal-body">'
    + '<div style="display:flex; gap:var(--space-2); margin-bottom:var(--space-4)">'
    + '<input type="file" id="importInstanceFileInput" accept=".cvinstance" style="display:none">'
    + '<button class="btn btn-primary" id="importInstanceBtn" style="flex:1">' + (isEs ? 'Importar .cvinstance' : 'Import .cvinstance File') + '</button>'
    + '<button class="btn" id="createInstanceBtn" style="flex:1">' + (isEs ? 'Crear Instancia' : 'Create New Instance') + '</button>'
    + '</div>'
    + '<div><strong>' + (isEs ? 'Instancias Guardadas:' : 'Saved Instances:') + '</strong></div>'
    + '<div style="max-height:250px; overflow-y:auto; margin-top:var(--space-2)">' + rows + '</div>'
    + '</div>'
    + '<div class="modal-footer">'
    + '<button class="btn btn-ghost" id="closeInstanceManagerBtn">' + (isEs ? 'Cerrar' : 'Close') + '</button>'
    + '</div>'
    + '</div>';
  
  document.body.appendChild(modal);
  
  el('closeInstanceManagerBtn').onclick = function() {
    modal.remove();
    updateInstanceSelector();
  };
  
  el('importInstanceBtn').onclick = function() {
    el('importInstanceFileInput').click();
  };
  
  el('importInstanceFileInput').onchange = function(e) {
    var f = e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var payload = JSON.parse(ev.target.result);
        if (!payload.name || !payload.style) throw new Error('Missing name or style parameters');
        localStorage.setItem('cvbuilder_instance_' + payload.name, ev.target.result);
        modal.remove();
        loadInstance(payload.name);
        alert(t('import_success', { name: payload.name }));
      } catch (err) {
        alert(t('invalid_json') + err.message);
      }
    };
    reader.readAsText(f);
  };
  
  el('createInstanceBtn').onclick = function() {
    var name = prompt(t('enter_instance_rename', { name: '' }));
    if (!name) return;
    name = name.trim();
    if (!name) return;
    if (localStorage.getItem('cvbuilder_instance_' + name)) {
      alert(t('cv_exists', { name: name }));
      return;
    }
    var newInst = {
      name: name,
      masterCvName: currentDbName,
      style: {
        cvTitle: tpl.cvTitle || 'Curriculum Vitae',
        style: tpl.style || 'classic',
        preamble: tpl.preamble || '',
        footer: tpl.footer || '',
        latexTemplate: el('latexTplEditor').value,
        htmlTemplate: el('htmlTplEditor').value,
        mappers: mappers
      },
      overwrites: {},
      visibility: {}
    };
    localStorage.setItem('cvbuilder_instance_' + name, JSON.stringify(newInst));
    modal.remove();
    loadInstance(name);
    alert(t('style_created', { name: name }));
  };
}

function downloadInstanceFile(name) {
  var raw = localStorage.getItem('cvbuilder_instance_' + name);
  if (raw) {
    var blob = new Blob([raw], {type: 'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.cvinstance';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 500);
  }
}

function getInstanceValue(pathStr, fallback) {
  if (activeInstance && activeInstance.overwrites && (pathStr in activeInstance.overwrites)) {
    return activeInstance.overwrites[pathStr];
  }
  return fallback;
}

function setInstanceOverride(pathStr, value) {
  if (!activeInstance) return;
  if (!activeInstance.overwrites) activeInstance.overwrites = {};
  activeInstance.overwrites[pathStr] = value;
  saveCurrentInstance();
  renderLatex();
  renderHtmlPreview();
  renderSchema();
}

function resetInstanceOverride(pathStr) {
  if (!activeInstance || !activeInstance.overwrites) return;
  delete activeInstance.overwrites[pathStr];
  saveCurrentInstance();
  renderAll();
}

function applyOverrideToMaster(pathStr, pathArray) {
  if (!activeInstance || !activeInstance.overwrites) return;
  if (confirm(t('confirm_override_master'))) {
    var val = activeInstance.overwrites[pathStr];
    var last = pathArray[pathArray.length - 1];
    var ref = pathArray.slice(0, -1).reduce(function(acc, key) { return acc[key]; }, data);
    ref[last] = val;
    
    delete activeInstance.overwrites[pathStr];
    saveCurrentInstance();
    saveCurrentDatabase();
    renderAll();
  }
}
