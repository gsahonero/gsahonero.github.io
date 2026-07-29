// ── DEFAULT STYLE OBJECT ──
var DEFAULT_STYLE = {
  cvTitle: 'Curriculum Vitae',
  style: 'classic',
  preamble: '',
  footer: '',
  latexTemplate: '',
  htmlTemplate: '',
  mappers: {},
  theme: { accentColor: '#2563eb', font: 'sans', photoLeftOffset: 40, photoTopOffset: 0 }
};

// ── DATABASE (CV) CRUD ──
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
      // Ensure instances and _style exist
      if (!data.instances) data.instances = {};
      if (!data._style) data._style = JSON.parse(JSON.stringify(DEFAULT_STYLE));
      if (!data._style.mappers || Object.keys(data._style.mappers).length === 0) {
        data._style.mappers = JSON.parse(JSON.stringify(DEFAULT_MAPPERS));
      }

      currentDbName = name;
      state.sections = {};
      state.propertyNames = {};
      state.activeSection = Object.keys(data).filter(function(k) {
        return k !== '_templates' && k !== 'templates' && k !== 'instances' && k !== '_style';
      })[0] || '';

      // Reset to no active instance when loading a new DB
      activeInstance = null;
      currentInstanceName = 'None (Master CV)';

      // Apply the CV's default style
      applyStyleToUI(data._style);

      markClean();
      renderAll();
      updateDbSelector();
      updateInstanceSelector();
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
  // Ensure _style has full templates
  if (!data._style.latexTemplate) data._style.latexTemplate = DEFAULT_LATEX_TEMPLATE;
  if (!data._style.htmlTemplate) data._style.htmlTemplate = DEFAULT_HTML_TEMPLATE;
  if (!data._style.mappers || Object.keys(data._style.mappers).length === 0) {
    data._style.mappers = JSON.parse(JSON.stringify(DEFAULT_MAPPERS));
  }
  currentDbName = name;
  saveCurrentDatabase();
  applyStyleToUI(data._style);
  renderAll();
  updateDbSelector();
  updateInstanceSelector();
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

// ── ACTIVE STYLE HELPERS ──

/**
 * Returns the current active style object (instance style or CV default style).
 */
function getActiveStyle() {
  if (activeInstance && activeInstance.style) return activeInstance.style;
  if (!data._style) data._style = JSON.parse(JSON.stringify(DEFAULT_STYLE));
  return data._style;
}

/**
 * Saves the current UI state into the active style (instance or CV default), then persists.
 */
function saveActiveStyle() {
  var styleObj = getActiveStyle();
  styleObj.cvTitle = tpl.cvTitle || 'Curriculum Vitae';
  styleObj.style = tpl.style || 'classic';
  styleObj.preamble = tpl.preamble || '';
  styleObj.footer = tpl.footer || '';
  styleObj.latexTemplate = el('latexTplEditor') ? el('latexTplEditor').value : (styleObj.latexTemplate || DEFAULT_LATEX_TEMPLATE);
  styleObj.htmlTemplate = el('htmlTplEditor') ? el('htmlTplEditor').value : (styleObj.htmlTemplate || DEFAULT_HTML_TEMPLATE);
  styleObj.mappers = mappers;
  if (!styleObj.theme) styleObj.theme = {};
  styleObj.theme.accentColor = state.themeAccentColor;
  styleObj.theme.font = state.themeFont;
  styleObj.theme.photoLeftOffset = state.photoLeftOffset !== undefined ? state.photoLeftOffset : 40;
  styleObj.theme.photoTopOffset = state.photoTopOffset !== undefined ? state.photoTopOffset : 0;

  if (activeInstance) {
    activeInstance.style = styleObj;
    saveCurrentInstance();
  } else {
    data._style = styleObj;
    saveCurrentDatabase();
  }
}

/**
 * Applies a style object to all UI controls.
 */
function applyStyleToUI(styleObj) {
  if (!styleObj) styleObj = JSON.parse(JSON.stringify(DEFAULT_STYLE));

  tpl.cvTitle = styleObj.cvTitle || 'Curriculum Vitae';
  tpl.style = styleObj.style || 'classic';
  tpl.preamble = styleObj.preamble || '';
  tpl.footer = styleObj.footer || '';

  var theme = styleObj.theme || {};
  state.themeAccentColor = theme.accentColor || '#2563eb';
  state.themeFont = theme.font || 'sans';
  state.photoLeftOffset = (theme.photoLeftOffset !== undefined) ? theme.photoLeftOffset : 40;
  state.photoTopOffset = (theme.photoTopOffset !== undefined) ? theme.photoTopOffset : 0;

  if (el('themeAccentColor')) el('themeAccentColor').value = state.themeAccentColor;
  if (el('themeAccentHex')) el('themeAccentHex').value = state.themeAccentColor;
  if (el('themeFontSelect')) el('themeFontSelect').value = state.themeFont;
  if (el('photoLeftSlider')) el('photoLeftSlider').value = state.photoLeftOffset;
  if (el('photoLeftVal')) el('photoLeftVal').textContent = state.photoLeftOffset + 'px';
  if (el('photoTopSlider')) el('photoTopSlider').value = state.photoTopOffset;
  if (el('photoTopVal')) el('photoTopVal').textContent = state.photoTopOffset + 'px';

  var latexTpl = styleObj.latexTemplate || DEFAULT_LATEX_TEMPLATE;
  var htmlTpl = styleObj.htmlTemplate || DEFAULT_HTML_TEMPLATE;

  // Migration: detect outdated templates and reset
  var hasMigration = false;
  if (latexTpl.indexOf('has_publications') === -1) { latexTpl = DEFAULT_LATEX_TEMPLATE; hasMigration = true; }
  if (htmlTpl.indexOf('all_sections') === -1 || latexTpl.indexOf('all_sections') === -1) { htmlTpl = DEFAULT_HTML_TEMPLATE; latexTpl = DEFAULT_LATEX_TEMPLATE; hasMigration = true; }
  if (hasMigration) { styleObj.latexTemplate = latexTpl; styleObj.htmlTemplate = htmlTpl; }

  if (el('latexTplEditor')) el('latexTplEditor').value = latexTpl;
  if (el('htmlTplEditor')) el('htmlTplEditor').value = htmlTpl;

  mappers = (styleObj.mappers && Object.keys(styleObj.mappers).length > 0)
    ? styleObj.mappers
    : JSON.parse(JSON.stringify(DEFAULT_MAPPERS));

  if (el('cvTitle')) el('cvTitle').value = tpl.cvTitle;
  if (el('styleName')) el('styleName').value = tpl.style;
}

// ── INSTANCES (stored in data.instances) ──

function listInstances() {
  if (!data.instances) data.instances = {};
  return Object.keys(data.instances);
}

function saveCurrentInstance() {
  if (!activeInstance || currentInstanceName === 'None (Master CV)') return;
  if (!data.instances) data.instances = {};
  data.instances[currentInstanceName] = activeInstance;
  saveCurrentDatabase();
  updateInstanceSelector();
}

function createNewInstancePrompt(defaultName) {
  var isEs = (typeof state === 'object' && state && state.langFilter === 'es');
  var promptMsg = isEs ? 'Ingrese un nombre para guardar su nueva Instancia de CV:' : 'Enter a name to save your new CV Instance:';
  var name = prompt(promptMsg, defaultName || '');
  if (!name) return null;
  name = name.trim();
  if (!name) return null;
  if (!data.instances) data.instances = {};
  if (data.instances[name]) {
    alert(isEs ? '¡Ya existe una instancia con ese nombre!' : 'An instance with that name already exists!');
    return null;
  }
  var currentStyle = getActiveStyle();
  var newInst = {
    style: JSON.parse(JSON.stringify(currentStyle)),
    overwrites: {},
    visibility: {},
    sections: JSON.parse(JSON.stringify(state.sections))
  };
  data.instances[name] = newInst;
  activeInstance = newInst;
  currentInstanceName = name;
  saveCurrentDatabase();
  updateInstanceSelector();
  renderAll();
  alert(isEs ? '¡Instancia de CV "' + name + '" guardada con éxito!' : 'CV Instance "' + name + '" saved successfully!');
  return newInst;
}

function loadInstance(name) {
  if (!name || name === 'None (Master CV)') {
    activeInstance = null;
    currentInstanceName = 'None (Master CV)';
    // Restore CV default style
    applyStyleToUI(data._style || DEFAULT_STYLE);
    updateInstanceSelector();
    renderAll();
    return;
  }
  if (!data.instances) data.instances = {};
  var inst = data.instances[name];
  if (inst) {
    activeInstance = inst;
    currentInstanceName = name;
    // Apply instance style
    if (inst.style) applyStyleToUI(inst.style);
    if (inst.sections) {
      Object.keys(inst.sections).forEach(function(k) {
        if (!state.sections[k]) state.sections[k] = {};
        Object.assign(state.sections[k], inst.sections[k]);
      });
    }
    updateInstanceSelector();
    renderAll();
  } else {
    alert((state.langFilter === 'es' ? 'Instancia no encontrada: ' : 'Instance not found: ') + name);
    loadInstance('None (Master CV)');
  }
}

function deleteInstance(name) {
  var isEs = state.langFilter === 'es';
  if (confirm(isEs ? '¿Eliminar la instancia "' + name + '"?' : 'Delete instance "' + name + '"?')) {
    if (!data.instances) data.instances = {};
    delete data.instances[name];
    if (currentInstanceName === name) {
      activeInstance = null;
      currentInstanceName = 'None (Master CV)';
      applyStyleToUI(data._style || DEFAULT_STYLE);
    }
    saveCurrentDatabase();
    updateInstanceSelector();
    renderAll();
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
    var isActive = (name === currentInstanceName);
    return '<div class="row" style="display:flex; justify-content:space-between; align-items:center; padding:var(--space-2) 0; border-bottom:1px solid oklch(from var(--color-text) l c h / .08)">'
      + '<span><strong>' + esc(name) + '</strong>' + (isActive ? ' <span class="pill" style="font-size:10px; background:oklch(from var(--color-primary) l c h / .15); color:var(--color-primary); border:1px solid var(--color-primary)">' + (isEs ? 'Activo' : 'Active') + '</span>' : '') + '</span>'
      + '<div style="display:flex; gap:var(--space-2)">'
      + '<button class="btn btn-ghost btn-xs" onclick="loadInstance(\'' + esc(name) + '\'); document.getElementById(\'instanceManagerModal\').remove();">' + (isEs ? 'Cargar' : 'Load') + '</button>'
      + '<button class="btn btn-danger btn-xs" onclick="deleteInstance(\'' + esc(name) + '\'); document.getElementById(\'instanceManagerModal\').remove(); showInstanceManagerModal();">' + (isEs ? 'Eliminar' : 'Delete') + '</button>'
      + '</div>'
      + '</div>';
  }).join('') || '<div class="muted tiny" style="padding:var(--space-4) 0">' + (isEs ? 'No hay instancias guardadas todavía.' : 'No custom CV Instances saved yet.') + '</div>';

  modal.innerHTML = '<div class="modal" style="max-width:500px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-4); box-shadow:var(--shadow-md)">'
    + '<div class="modal-header"><h3>' + (isEs ? 'Administrar Instancias de CV' : 'Manage CV Instances') + '</h3></div>'
    + '<div class="modal-body">'
    + '<div class="tiny muted" style="margin-bottom:var(--space-3)">' + (isEs ? 'Las instancias se guardan dentro del archivo .cv activo.' : 'Instances are saved inside the active .cv file.') + '</div>'
    + '<div style="display:flex; gap:var(--space-2); margin-bottom:var(--space-4)">'
    + '<button class="btn btn-primary" id="createInstanceBtn" style="flex:1">' + (isEs ? '+ Crear Instancia' : '+ Create New Instance') + '</button>'
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

  el('createInstanceBtn').onclick = function() {
    modal.remove();
    createNewInstancePrompt('');
  };
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
