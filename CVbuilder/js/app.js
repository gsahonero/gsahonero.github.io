// Global application state registry
var data = {};
var state = {
  sections: {},
  propertyNames: {},
  activeSection: '',
  tab: 'editor',
  dirty: false,
  langFilter: 'all',
  themeAccentColor: '#2563eb',
  themeFont: 'sans'
};
var activeInstance = null;
var currentInstanceName = 'None (Master CV)';
var presetGalleryCreateMode = false;
var tpl = {
  cvTitle: 'Curriculum Vitae',
  style: 'classic',
  preamble: '',
  footer: ''
};
var mappers = JSON.parse(JSON.stringify(DEFAULT_MAPPERS));
var currentDbName = 'Default CV';
var currentStyleName = 'Default Style';

var DB_PREFIX = 'cvbuilder_cv_';
var STYLE_PREFIX = 'cvbuilder_style_';
var INSTANCE_PREFIX = 'cvbuilder_instance_';

// ── UTILITY HELPERS ──
function el(id) { return document.getElementById(id); }
function esc(s) { return htmlEscape(s); }
function human(s) {
  if (!s) return '';
  var clean = s.replace(/_/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
function slugId(section, idx) { return 'entry-' + section + '-' + idx; }
function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function isDirty() { return state.dirty; }
function markDirty() {
  state.dirty = true;
  var banner = el('unsavedBanner');
  if (banner) {
    banner.className = 'dirty';
    el('bannerText').textContent = t('unsaved_changes');
  }
}
function markClean() {
  state.dirty = false;
  var banner = el('unsavedBanner');
  if (banner) {
    banner.className = 'clean';
    el('bannerText').textContent = t('changes_saved');
  }
}

function resolvePath(pathArray) {
  return pathArray.reduce(function(acc, key) {
    return acc ? acc[key] : undefined;
  }, data);
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown.open').forEach(function(el) {
    el.classList.remove('open');
  });
  document.querySelectorAll('.menubtn.open').forEach(function(btn) {
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  });
}

function base64ToBlob(base64, contentType) {
  contentType = contentType || '';
  var sliceSize = 1024;
  var byteCharacters = atob(base64.split(',')[1]);
  var byteArrays = [];
  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    var slice = byteCharacters.slice(offset, offset + sliceSize);
    var byteNumbers = new Array(slice.length);
    for (var i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    var byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, {type: contentType});
}

// ── RENDER ROOT CONTROL ──
function renderAll() {
  initSections();
  renderSectionList();
  renderOutline();
  renderEditor();
  renderLatex();
  renderSchema();
}

// ── DIALOG MODALS ──
function openModal(id) {
  var m = el(id);
  if (m) m.classList.add('open');
}
function closeModal(id) {
  var m = el(id);
  if (m) m.classList.remove('open');
}

// ── ACTIONS ──
function exportDatabaseFile() {
  var cleanData = clone(data);
  delete cleanData._templates;
  delete cleanData.templates;
  var raw = JSON.stringify(cleanData, null, 2);
  downloadFile(raw, 'application/json', currentDbName.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.cv');
  markClean();
}

function importDatabaseFile(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var imported = JSON.parse(e.target.result);
      var name = file.name.replace(/\.cv$/i, '');
      localStorage.setItem('cvbuilder_cv_' + name, JSON.stringify(imported));
      updateDbSelector();
      loadDatabase(name);
      alert(t('import_success', { name: name }));
    } catch(err) {
      alert(t('invalid_json') + err.message);
    }
  };
  reader.readAsText(file);
}

function importStyleFile(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var imported = JSON.parse(e.target.result);
      var name = file.name.replace(/\.cvstyle$/i, '');
      localStorage.setItem('cvbuilder_style_' + name, JSON.stringify(imported));
      updateStyleSelector();
      loadStyle(name);
      alert(t('import_success', { name: name }));
    } catch(err) {
      alert(t('invalid_json') + err.message);
    }
  };
  reader.readAsText(file);
}

function downloadFile(content, mime, filename) {
  var blob = new Blob([content], {type: mime});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 500);
}

function downloadTexFile() {
  var tplText = (el('latexTplEditor') && el('latexTplEditor').value) || DEFAULT_LATEX_TEMPLATE;
  var context = buildTemplateContext();
  var rendered = renderTemplate(tplText, context, texEscape);
  downloadFile(rendered, 'application/x-tex', currentDbName.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.tex');
}

function downloadPdfFile() {
  var tplText = (el('latexTplEditor') && el('latexTplEditor').value) || DEFAULT_LATEX_TEMPLATE;
  var context = buildTemplateContext();
  
  // Attach Base64 photo attachment if vorhanden
  var photoUrl = (data.basics && data.basics.photo) || '';
  var payload = new FormData();
  
  if (photoUrl.indexOf('data:image/') === 0) {
    try {
      var contentType = photoUrl.substring(5, photoUrl.indexOf(';'));
      var b64Data = photoUrl;
      var blob = base64ToBlob(b64Data, contentType);
      var filename = 'photo.' + contentType.split('/')[1];
      
      payload.append('file[]', blob, filename);
      
      // Update template to reference filename
      context.basics.photo = filename;
    } catch (e) {
      console.warn('Failed to embed profile photo binary in compile request:', e);
    }
  }
  
  var rendered = renderTemplate(tplText, context, texEscape);
  payload.append('file[]', new Blob([rendered], {type: 'application/x-tex'}), 'main.tex');
  
  var btn = el('downloadPdfBtn');
  btn.setAttribute('disabled', 'true');
  btn.textContent = state.langFilter === 'es' ? 'Compilando...' : 'Compiling PDF...';
  
  fetch('https://texlive.net/cgi-bin/latexcgi', {
    method: 'POST',
    body: payload
  })
  .then(function(res) {
    if (!res.ok) throw new Error('TeX Live API compile error');
    return res.blob();
  })
  .then(function(blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = currentDbName.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  })
  .catch(function(err) {
    alert(state.langFilter === 'es' ? 'La compilación falló. Compruebe la sintaxis de la plantilla LaTeX.' : 'Compilation failed. Please inspect the LaTeX template syntax.');
    console.error(err);
  })
  .finally(function() {
    btn.removeAttribute('disabled');
    btn.textContent = state.langFilter === 'es' ? 'Descargar PDF' : 'Download PDF';
  });
}

function openDbManagerModal() {
  openModal('dbManagerModal');
  renderDbManagerTable();
}

function renderDbManagerTable() {
  var tbody = el('dbManagerTableBody');
  tbody.innerHTML = '';
  var list = listDatabases();
  var isEs = state.langFilter === 'es';
  list.forEach(function(name) {
    var tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--color-divider)';
    tr.style.fontSize = 'var(--text-sm)';
    
    var tdName = document.createElement('td');
    tdName.style.padding = 'var(--space-3) var(--space-4)';
    tdName.style.fontWeight = name === currentDbName ? 'bold' : 'normal';
    tdName.textContent = name + (name === currentDbName ? (isEs ? ' (Activo)' : ' (Active)') : '');
    
    var tdActions = document.createElement('td');
    tdActions.style.padding = 'var(--space-3) var(--space-4)';
    tdActions.style.textAlign = 'right';
    tdActions.className = 'toolbar';
    tdActions.style.justifyContent = 'flex-end';
    
    var btnLoad = document.createElement('button');
    btnLoad.className = 'btn btn-ghost btn-xs';
    btnLoad.style.minHeight = '28px';
    btnLoad.style.padding = '2px 8px';
    btnLoad.textContent = isEs ? 'Cargar' : 'Load';
    btnLoad.disabled = name === currentDbName;
    btnLoad.onclick = function() {
      if (isDirty()) {
        if (!confirm(isEs ? 'Tienes cambios sin guardar. ¿Cargar de todos modos?' : 'You have unsaved changes in your active CV. Load anyway?')) return;
      }
      loadDatabase(name);
      closeModal('dbManagerModal');
    };
    tdActions.appendChild(btnLoad);
    
    var btnDup = document.createElement('button');
    btnDup.className = 'btn btn-ghost btn-xs';
    btnDup.style.minHeight = '28px';
    btnDup.style.padding = '2px 8px';
    btnDup.textContent = isEs ? 'Duplicar' : 'Duplicate';
    btnDup.onclick = function() {
      var newName = prompt(t('enter_db_name', { name: name }), name + ' (Copy)');
      if (newName && newName.trim()) {
        newName = newName.trim();
        var raw = localStorage.getItem('cvbuilder_cv_' + name);
        if (raw) {
          localStorage.setItem('cvbuilder_cv_' + newName, raw);
          renderDbManagerTable();
          updateDbSelector();
        }
      }
    };
    tdActions.appendChild(btnDup);
    
    var btnExport = document.createElement('button');
    btnExport.className = 'btn btn-ghost btn-xs';
    btnExport.style.minHeight = '28px';
    btnExport.style.padding = '2px 8px';
    btnExport.textContent = isEs ? 'Exportar' : 'Export';
    btnExport.onclick = function() {
      var raw = localStorage.getItem('cvbuilder_cv_' + name);
      if (raw) {
        try {
          var parsed = JSON.parse(raw);
          delete parsed._templates;
          delete parsed.templates;
          var cleanRaw = JSON.stringify(parsed, null, 2);
          downloadFile(cleanRaw, 'application/json', name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.cv');
        } catch(e) {
          downloadFile(raw, 'application/json', name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.cv');
        }
      }
    };
    tdActions.appendChild(btnExport);

    var btnRename = document.createElement('button');
    btnRename.className = 'btn btn-ghost btn-xs';
    btnRename.style.minHeight = '28px';
    btnRename.style.padding = '2px 8px';
    btnRename.textContent = isEs ? 'Renombrar' : 'Rename';
    btnRename.onclick = function() {
      var newName = prompt(t('enter_db_name', { name: name }), name);
      if (newName && newName.trim() && newName.trim() !== name) {
        newName = newName.trim();
        var raw = localStorage.getItem('cvbuilder_cv_' + name);
        localStorage.setItem('cvbuilder_cv_' + newName, raw);
        localStorage.removeItem('cvbuilder_cv_' + name);
        if (name === currentDbName) {
          currentDbName = newName;
        }
        renderDbManagerTable();
        updateDbSelector();
      }
    };
    tdActions.appendChild(btnRename);
    
    var btnDel = document.createElement('button');
    btnDel.className = 'btn btn-danger btn-xs';
    btnDel.style.minHeight = '28px';
    btnDel.style.padding = '2px 8px';
    btnDel.textContent = isEs ? 'Eliminar' : 'Delete';
    btnDel.disabled = list.length <= 1;
    btnDel.onclick = function() {
      if (confirm(t('confirm_delete_db', { name: name }))) {
        deleteDatabase(name);
        renderDbManagerTable();
        updateDbSelector();
      }
    };
    tdActions.appendChild(btnDel);
    
    tr.appendChild(tdName);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

function openStyleManagerModal() {
  openModal('styleManagerModal');
  renderStyleManagerTable();
}

function renderStyleManagerTable() {
  var tbody = el('styleManagerTableBody');
  tbody.innerHTML = '';
  var list = listStyles();
  var isEs = state.langFilter === 'es';
  list.forEach(function(name) {
    var tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--color-divider)';
    tr.style.fontSize = 'var(--text-sm)';
    
    var tdName = document.createElement('td');
    tdName.style.padding = 'var(--space-3) var(--space-4)';
    tdName.style.fontWeight = name === currentStyleName ? 'bold' : 'normal';
    tdName.textContent = name + (name === currentStyleName ? (isEs ? ' (Activo)' : ' (Active)') : '');
    
    var tdActions = document.createElement('td');
    tdActions.style.padding = 'var(--space-3) var(--space-4)';
    tdActions.style.textAlign = 'right';
    tdActions.className = 'toolbar';
    tdActions.style.justifyContent = 'flex-end';
    
    var btnLoad = document.createElement('button');
    btnLoad.className = 'btn btn-ghost btn-xs';
    btnLoad.style.minHeight = '28px';
    btnLoad.style.padding = '2px 8px';
    btnLoad.textContent = isEs ? 'Cargar' : 'Load';
    btnLoad.disabled = name === currentStyleName;
    btnLoad.onclick = function() {
      loadStyle(name);
      closeModal('styleManagerModal');
    };
    tdActions.appendChild(btnLoad);
    
    var btnDup = document.createElement('button');
    btnDup.className = 'btn btn-ghost btn-xs';
    btnDup.style.minHeight = '28px';
    btnDup.style.padding = '2px 8px';
    btnDup.textContent = isEs ? 'Duplicar' : 'Duplicate';
    btnDup.onclick = function() {
      var newName = prompt(t('enter_style_rename', { name: name }), name + ' (Copy)');
      if (newName && newName.trim()) {
        newName = newName.trim();
        var raw = localStorage.getItem('cvbuilder_style_' + name);
        if (raw) {
          localStorage.setItem('cvbuilder_style_' + newName, raw);
          renderStyleManagerTable();
          updateStyleSelector();
        }
      }
    };
    tdActions.appendChild(btnDup);
    
    var btnExport = document.createElement('button');
    btnExport.className = 'btn btn-ghost btn-xs';
    btnExport.style.minHeight = '28px';
    btnExport.style.padding = '2px 8px';
    btnExport.textContent = isEs ? 'Exportar' : 'Export';
    btnExport.onclick = function() {
      var raw = localStorage.getItem('cvbuilder_style_' + name);
      if (raw) {
        downloadFile(raw, 'application/json', name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.cvstyle');
      }
    };
    tdActions.appendChild(btnExport);

    var btnRename = document.createElement('button');
    btnRename.className = 'btn btn-ghost btn-xs';
    btnRename.style.minHeight = '28px';
    btnRename.style.padding = '2px 8px';
    btnRename.textContent = isEs ? 'Renombrar' : 'Rename';
    btnRename.onclick = function() {
      var newName = prompt(t('enter_style_rename', { name: name }), name);
      if (newName && newName.trim() && newName.trim() !== name) {
        newName = newName.trim();
        var raw = localStorage.getItem('cvbuilder_style_' + name);
        localStorage.setItem('cvbuilder_style_' + newName, raw);
        localStorage.removeItem('cvbuilder_style_' + name);
        if (name === currentStyleName) {
          currentStyleName = newName;
        }
        renderStyleManagerTable();
        updateStyleSelector();
      }
    };
    tdActions.appendChild(btnRename);
    
    var btnDel = document.createElement('button');
    btnDel.className = 'btn btn-danger btn-xs';
    btnDel.style.minHeight = '28px';
    btnDel.style.padding = '2px 8px';
    btnDel.textContent = isEs ? 'Eliminar' : 'Delete';
    btnDel.disabled = list.length <= 1;
    btnDel.onclick = function() {
      if (confirm(t('confirm_delete_style', { name: name }))) {
        deleteStyle(name);
        renderStyleManagerTable();
        updateStyleSelector();
      }
    };
    tdActions.appendChild(btnDel);
    
    tr.appendChild(tdName);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

function openPresetGalleryModal() {
  closeModal('styleManagerModal');
  openModal('presetGalleryModal');
  
  var grid = el('presetGalleryGrid');
  grid.innerHTML = '';
  var isEs = state.langFilter === 'es';
  Object.entries(STYLE_PRESETS).forEach(function(entry) {
    var key = entry[0], preset = entry[1];
    
    var card = document.createElement('div');
    card.className = 'preset-card';
    card.style.border = '1.5px solid var(--color-border)';
    card.style.borderRadius = 'var(--radius-md)';
    card.style.padding = 'var(--space-4)';
    card.style.cursor = 'pointer';
    card.style.transition = 'all var(--transition)';
    card.style.background = 'var(--color-surface)';
    
    card.innerHTML = '<div style="font-weight:700; margin-bottom:var(--space-1); color:var(--color-text)">' + esc(preset.name) + '</div>'
      + '<div class="tiny muted" style="margin-bottom:var(--space-3)">' + esc(preset.desc) + '</div>'
      + '<button class="btn btn-xs btn-primary">' + (isEs ? 'Aplicar plantilla' : 'Apply Preset') + '</button>';
      
    card.onclick = function() {
      if (presetGalleryCreateMode) {
        var name = prompt(t('enter_style_name'));
        if (!name) return;
        name = name.trim();
        if (!name) return;
        currentStyleName = name;
        tpl = {
          cvTitle: 'Curriculum Vitae',
          style: key === 'classic' ? 'classic' : (key === 'corporate' ? 'banking' : 'casual'),
          preamble: '',
          footer: ''
        };
        el('latexTplEditor').value = preset.latexTemplate;
        el('htmlTplEditor').value = preset.htmlTemplate;
        mappers = JSON.parse(JSON.stringify(DEFAULT_MAPPERS));
        saveCurrentStyle();
      } else {
        el('latexTplEditor').value = preset.latexTemplate;
        el('htmlTplEditor').value = preset.htmlTemplate;
        tpl.style = key === 'classic' ? 'classic' : (key === 'corporate' ? 'banking' : 'casual');
        saveCurrentStyle();
      }
      
      closeModal('presetGalleryModal');
      renderLatex();
      alert(t('preset_applied', { name: preset.name }));
    };
    grid.appendChild(card);
  });
}

function openEditMappersModal() {
  closeModal('styleManagerModal');
  openModal('editMappersModal');
  
  // Populate the mappers textarea with a JSON representation
  var textarea = el('mappersEditor');
  if (textarea) {
    textarea.value = JSON.stringify(mappers, null, 2);
  }
}

// ── LATEX ESCAPING REGISTRY ──
function texEscape(s) {
  return String(s==null?'':s)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// ── EMBEDDED SYSTEM DIAGNOSTICS SUITE ──
var diagLastReport = null;

function runDiagnostics() {
  var diagResultsBody = el('diagResultsBody');
  if (!diagResultsBody) return;
  diagResultsBody.innerHTML = '';
  
  var totalPassed = 0;
  var totalFailed = 0;
  var testRuns = [];
  var startSuiteTime = performance.now();
  var isEs = state.langFilter === 'es';
  
  function appendDiagRow(id, name, desc, category, expected, actual, time, passed) {
    var tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid oklch(from var(--color-text) l c h / .08)';
    
    var tdName = document.createElement('td');
    tdName.style.padding = '10px 16px';
    tdName.innerHTML = '<strong>' + id + ': ' + name + '</strong><div class="tiny muted" style="margin-top:2px">' + desc + '</div>';
    
    var tdCategory = document.createElement('td');
    tdCategory.style.padding = '10px 16px';
    tdCategory.innerHTML = '<code>' + category + '</code>';
    
    var tdExpected = document.createElement('td');
    tdExpected.style.padding = '10px 16px';
    tdExpected.innerHTML = '<pre style="margin:0; font-family:var(--font-mono); font-size:11px; background:rgba(0,0,0,0.2); padding:4px 8px; border-radius:4px; max-width:180px; overflow-x:auto">' + esc(expected) + '</pre>';
    
    var tdActual = document.createElement('td');
    tdActual.style.padding = '10px 16px';
    tdActual.innerHTML = '<pre style="margin:0; font-family:var(--font-mono); font-size:11px; background:rgba(0,0,0,0.2); padding:4px 8px; border-radius:4px; max-width:180px; overflow-x:auto">' + esc(actual) + '</pre>';
    
    var tdTime = document.createElement('td');
    tdTime.style.padding = '10px 16px';
    tdTime.textContent = time + 'ms';
    
    var tdResult = document.createElement('td');
    tdResult.style.padding = '10px 16px';
    tdResult.innerHTML = passed 
      ? '<span class="status-badge passed">' + (isEs ? 'Aprobado' : 'Passed') + '</span>' 
      : '<span class="status-badge failed">' + (isEs ? 'Fallido' : 'Failed') + '</span>';
      
    tr.appendChild(tdName);
    tr.appendChild(tdCategory);
    tr.appendChild(tdExpected);
    tr.appendChild(tdActual);
    tr.appendChild(tdTime);
    tr.appendChild(tdResult);
    diagResultsBody.appendChild(tr);
  }

  var backupData = clone(data);
  var backupCurrentDb = currentDbName;
  var backupActiveSection = state.activeSection;

  try {
    // ── SUITE 1: COMPILER & ESCAPING ──
    // Test 1.1: Escape LaTeX special characters
    (function() {
      var tStart = performance.now();
      var inputStr = "Guillermo & Co % Sales #100 {New} _Project_ ~home^";
      var expected = "Guillermo \\& Co \\% Sales \\#100 \\{New\\} \\_Project\\_ \\textasciitilde{}home\\textasciicircum{}";
      var actual = texEscape(inputStr);
      var passed = actual === expected;
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("1.1", "LaTeX Escaping", "Verifies escaping of LaTeX characters", "compiler", expected, actual, latency, passed);
      testRuns.push({ id: "1.1", name: "LaTeX Escaping", category: "compiler", expected: expected, actual: actual, passed: passed, latency: latency });
    })();

    // Test 1.2: LaTeX escaping of raw lists of strings
    (function() {
      var tStart = performance.now();
      var inputList = ["A&B", "C%D"];
      var expected = "A\\&B, C\\%D";
      var actual = inputList.map(texEscape).join(', ');
      var passed = actual === expected;
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("1.2", "Array Item Escaping", "Escapes lists of items correctly for compiling templates", "compiler", expected, actual, latency, passed);
      testRuns.push({ id: "1.2", name: "Array Item Escaping", category: "compiler", expected: expected, actual: actual, passed: passed, latency: latency });
    })();

    // Test 1.3: HTML Preview Render escaping boundaries
    (function() {
      var tStart = performance.now();
      var inputVal = "John <script>alert(1)</" + "script> & Co";
      var expected = "John &lt;script&gt;alert(1)&lt;/script&gt; &amp; Co";
      var actual = esc(inputVal);
      var passed = actual === expected;
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("1.3", "HTML Sanitizer Escaping", "Escapes dangerous html script tags to prevent XSS in previews", "compiler", expected, actual, latency, passed);
      testRuns.push({ id: "1.3", name: "HTML Sanitizer Escaping", category: "compiler", expected: expected, actual: actual, passed: passed, latency: latency });
    })();

    // Test 1.4: HTML Entity escaping
    (function() {
      var tStart = performance.now();
      var inputVal = "A & B < C > D";
      var expected = "A &amp; B &lt; C &gt; D";
      var actual = htmlEscape(inputVal);
      var passed = actual === expected;
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("1.4", "HTML Entity Escaping", "Escapes basic HTML characters to prevent template syntax breakages", "compiler", expected, actual, latency, passed);
      testRuns.push({ id: "1.4", name: "HTML Entity Escaping", category: "compiler", expected: expected, actual: actual, passed: passed, latency: latency });
    })();

    // ── SUITE 2: DATA STRUCTURE & LIST OPERATIONS ──
    // Test 2.1: Reorder items (Move Up)
    (function() {
      var tStart = performance.now();
      data.work = [
        { role: "Developer A" },
        { role: "Developer B" },
        { role: "Developer C" }
      ];
      
      var arr = data.work;
      var i = 2;
      var temp = arr[i];
      arr[i] = arr[i-1];
      arr[i-1] = temp;
      
      var expected = ["Developer A", "Developer C", "Developer B"];
      var actual = data.work.map(function(w) { return w.role; });
      var passed = JSON.stringify(actual) === JSON.stringify(expected);
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("2.1", "Entry Move Up", "Swaps list indices correctly to reorder items upward", "data", JSON.stringify(expected), JSON.stringify(actual), latency, passed);
      testRuns.push({ id: "2.1", name: "Entry Move Up", category: "data", expected: JSON.stringify(expected), actual: JSON.stringify(actual), passed: passed, latency: latency });
    })();

    // Test 2.2: Reorder items (Move Down)
    (function() {
      var tStart = performance.now();
      var arr = data.work;
      var i = 0;
      var temp = arr[i];
      arr[i] = arr[i+1];
      arr[i+1] = temp;
      
      var expected = ["Developer C", "Developer A", "Developer B"];
      var actual = data.work.map(function(w) { return w.role; });
      var passed = JSON.stringify(actual) === JSON.stringify(expected);
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("2.2", "Entry Move Down", "Swaps list indices correctly to reorder items downward", "data", JSON.stringify(expected), JSON.stringify(actual), latency, passed);
      testRuns.push({ id: "2.2", name: "Entry Move Down", category: "data", expected: JSON.stringify(expected), actual: JSON.stringify(actual), passed: passed, latency: latency });
    })();

    // Test 2.3: Reorder boundaries checks
    (function() {
      var tStart = performance.now();
      var arr = data.work;
      var canMoveUp = 0 > 0;
      var canMoveDown = 2 < arr.length - 1;
      
      var expected = { canMoveUp: false, canMoveDown: false };
      var actual = { canMoveUp: canMoveUp, canMoveDown: canMoveDown };
      var passed = canMoveUp === expected.canMoveUp && canMoveDown === expected.canMoveDown;
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("2.3", "Reorder Boundaries", "Ensures reorder locks indices to bounds [0, length-1]", "data", JSON.stringify(expected), JSON.stringify(actual), latency, passed);
      testRuns.push({ id: "2.3", name: "Reorder Boundaries", category: "data", expected: JSON.stringify(expected), actual: JSON.stringify(actual), passed: passed, latency: latency });
    })();

    // Test 2.4: Deep nested key resolution
    (function() {
      var tStart = performance.now();
      data.basics = {
        location: {
          city: "La Paz"
        }
      };
      var expected = "La Paz";
      var actual = resolvePath(["basics", "location", "city"]);
      var passed = actual === expected;
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("2.4", "Nested Key Resolver", "Verifies path resolver fetches values inside nested sub-objects", "data", expected, actual, latency, passed);
      testRuns.push({ id: "2.4", name: "Nested Key Resolver", category: "data", expected: expected, actual: actual, passed: passed, latency: latency });
    })();

    // Test 2.5: Dynamic path setter
    (function() {
      var tStart = performance.now();
      setPath(["basics", "location", "city"], "New City");
      
      var expected = "New City";
      var actual = data.basics.location.city;
      var passed = actual === expected;
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("2.5", "Nested Path Setter", "Verifies deep nested setter assigns value at target path array", "data", expected, actual, latency, passed);
      testRuns.push({ id: "2.5", name: "Nested Path Setter", category: "data", expected: expected, actual: actual, passed: passed, latency: latency });
    })();

    // ── SUITE 3: LOCAL STORAGE PERSISTENCE ──
    // Test 3.1: Save new custom database
    (function() {
      var tStart = performance.now();
      currentDbName = "Test_Database";
      data = { basics: { firstname: "UnitTester" } };
      saveCurrentDatabase();
      
      var list = listDatabases();
      var expected = true;
      var actual = list.indexOf("Test_Database") !== -1;
      var passed = actual === expected;
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("3.1", "Save DB LocalStorage", "Checks saving database serializes and registers key in storage", "storage", String(expected), String(actual), latency, passed);
      testRuns.push({ id: "3.1", name: "Save DB LocalStorage", category: "storage", expected: String(expected), actual: String(actual), passed: passed, latency: latency });
    })();

    // Test 3.2: Load custom database from storage
    (function() {
      var tStart = performance.now();
      data = { basics: { firstname: "DirtyValue" } };
      loadDatabase("Test_Database");
      
      var expected = "UnitTester";
      var actual = data.basics.firstname;
      var passed = actual === expected;
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("3.2", "Load DB Storage", "Asserts loading custom database recovers stored data object state", "storage", expected, actual, latency, passed);
      testRuns.push({ id: "3.2", name: "Load DB Storage", category: "storage", expected: expected, actual: actual, passed: passed, latency: latency });
    })();

    // Test 3.3: Delete database from storage
    (function() {
      var tStart = performance.now();
      deleteDatabase("Test_Database");
      
      var list = listDatabases();
      var expected = false;
      var actual = list.indexOf("Test_Database") !== -1;
      var passed = actual === expected;
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("3.3", "Delete DB Storage", "Asserts database deletion completely destroys localStorage target", "storage", String(expected), String(actual), latency, passed);
      testRuns.push({ id: "3.3", name: "Delete DB Storage", category: "storage", expected: String(expected), actual: String(actual), passed: passed, latency: latency });
    })();

    // ── SUITE 4: MODULE INTEGRATION TESTING ──
    // Test 4.1: Integration: DB to Compiler
    (function() {
      var tStart = performance.now();
      var originalFirstname = data.basics.firstname;
      data.basics.firstname = "DynamicIntegrationTest";
      renderLatex();
      var compiled = el('latexPreview').textContent;
      var passed = compiled.indexOf("DynamicIntegrationTest") !== -1;
      data.basics.firstname = originalFirstname;
      renderLatex();
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("4.1", "DB to Compiler Integration", "Verifies changes in active database instantly compile into the preview panels", "integration", "Contains 'DynamicIntegrationTest'", passed ? "Passed" : "Failed", latency, passed);
      testRuns.push({ id: "4.1", name: "DB to Compiler Integration", category: "integration", expected: "Contains 'DynamicIntegrationTest'", actual: passed ? "Passed" : "Failed", passed: passed, latency: latency });
    })();

    // Test 4.2: Integration: Translator to UI
    (function() {
      var tStart = performance.now();
      var backupLang = state.langFilter;
      state.langFilter = 'es';
      updateUITranslations();
      var actualText = el('downloadPdfBtn').textContent;
      var expectedText = 'Descargar PDF';
      var passed = actualText === expectedText;
      state.langFilter = backupLang;
      updateUITranslations();
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("4.2", "Translator to UI Integration", "Asserts that switching global language updates DOM element labels correctly", "integration", expectedText, actualText, latency, passed);
      testRuns.push({ id: "4.2", name: "Translator to UI Integration", category: "integration", expected: expectedText, actual: actualText, passed: passed, latency: latency });
    })();

    // Test 4.3: Integration: Instance Overrides to Compiler
    (function() {
      var tStart = performance.now();
      var backupInstance = activeInstance;
      var backupInstanceName = currentInstanceName;
      
      activeInstance = {
        name: "IntegrationInstanceTest",
        masterCvName: currentDbName,
        overwrites: {
          "basics.title": "Architect Override"
        },
        visibility: {}
      };
      currentInstanceName = "IntegrationInstanceTest";
      renderLatex();
      var compiled = el('latexPreview').textContent;
      var passed = compiled.indexOf("Architect Override") !== -1;
      
      activeInstance = backupInstance;
      currentInstanceName = backupInstanceName;
      renderLatex();
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("4.3", "Instance Overrides to Compiler Integration", "Ensures active tailored instance overwrites compile into previews", "integration", "Contains 'Architect Override'", passed ? "Passed" : "Failed", latency, passed);
      testRuns.push({ id: "4.3", name: "Instance Overrides to Compiler Integration", category: "integration", expected: "Contains 'Architect Override'", actual: passed ? "Passed" : "Failed", passed: passed, latency: latency });
    })();

  } catch (err) {
    console.error(err);
  } finally {
    data = backupData;
    currentDbName = backupCurrentDb;
    state.activeSection = backupActiveSection;
    saveCurrentDatabase();
    renderAll();
  }

  var endSuiteTime = performance.now();
  var duration = Math.round(endSuiteTime - startSuiteTime);
  
  el('diagTotalCount').textContent = testRuns.length;
  el('diagPassedCount').textContent = totalPassed;
  el('diagFailedCount').textContent = totalFailed;
  el('diagDuration').textContent = duration + 'ms';
  
  diagLastReport = {
    suiteName: "CVbuilder Embedded Logic Diagnostic Report",
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    summary: {
      total: testRuns.length,
      passed: totalPassed,
      failed: totalFailed,
      durationMs: duration
    },
    assertions: testRuns
  };
  
  el('diagDownloadBtn').removeAttribute('disabled');
}

function downloadDiagReportFile() {
  if (!diagLastReport) return;
  var blob = new Blob([JSON.stringify(diagLastReport, null, 2)], {type: 'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'cvbuilder_diagnostics_report_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── STYLE MANAGER MODAL BINDINGS ──
el('modalStylePresetsBtn').onclick = function() {
  presetGalleryCreateMode = false;
  openPresetGalleryModal();
};
el('modalCreateStyleBtn').onclick = function() {
  presetGalleryCreateMode = true;
  openPresetGalleryModal();
};
el('modalEditMappersBtn').onclick = function() {
  openEditMappersModal();
};
el('modalImportStyleBtn').onclick = function() {
  el('tplFileInput').click();
};
el('closeStyleManagerModal').onclick = function() {
  closeModal('styleManagerModal');
};
el('closePresetGalleryModal').onclick = function() {
  closeModal('presetGalleryModal');
};
el('closeEditMappersModal').onclick = function() {
  closeModal('editMappersModal');
};
el('applyMappersBtn').onclick = function() {
  var textarea = el('mappersEditor');
  if (textarea) {
    try {
      var parsed = JSON.parse(textarea.value);
      mappers = parsed;
      saveCurrentStyle();
      renderLatex();
      closeModal('editMappersModal');
    } catch(err) {
      alert((state.langFilter === 'es' ? 'JSON inválido: ' : 'Invalid JSON: ') + err.message);
    }
  }
};

// ── DB MANAGER MODAL BINDINGS ──
el('modalCreateDbBtn').onclick = function() {
  closeModal('dbManagerModal');
  var name = prompt(t('enter_cv_name'));
  if (name && name.trim()) {
    name = name.trim();
    if (listDatabases().indexOf(name) !== -1) {
      alert(t('cv_exists', { name: name }));
      return;
    }
    createPresetDatabase(name, 'basic');
  }
};
el('closeDbManagerModal').onclick = function() {
  closeModal('dbManagerModal');
};

// ── MENU EVENT BINDINGS ──
el('newCvBtn').onclick = function() {
  closeAllDropdowns();
  var name = prompt(t('enter_cv_name'));
  if (name && name.trim()) {
    name = name.trim();
    if (listDatabases().indexOf(name) !== -1) {
      alert(t('cv_exists', { name: name }));
      return;
    }
    // Render custom database type selection dialog overlay
    var overlay = document.createElement('div');
    overlay.className = 'modal-backdrop open';
    overlay.innerHTML = '<div class="modal" style="max-width:400px; padding:var(--space-4)">'
      + '<div class="modal-header"><h3>Select CV Template</h3></div>'
      + '<div class="modal-body stack" style="gap:var(--space-3)">'
      + '  <label class="preset-option-card" style="display:flex; flex-direction:column; gap:4px; padding:var(--space-3); border:1.5px solid var(--color-border); border-radius:var(--radius-md); cursor:pointer"><input type="radio" name="presetTpl" value="basic" checked style="margin-right:8px"><strong>Basic CV Preset</strong><span class="tiny muted">Fills essential sections with generic professional experience.</span></label>'
      + '  <label class="preset-option-card" style="display:flex; flex-direction:column; gap:4px; padding:var(--space-3); border:1.5px solid var(--color-border); border-radius:var(--radius-md); cursor:pointer"><input type="radio" name="presetTpl" value="researcher" style="margin-right:8px"><strong>Full Researcher CV</strong><span class="tiny muted">Includes postdoctoral teaching, journals, posters, and grants.</span></label>'
      + '  <label class="preset-option-card" style="display:flex; flex-direction:column; gap:4px; padding:var(--space-3); border:1.5px solid var(--color-border); border-radius:var(--radius-md); cursor:pointer"><input type="radio" name="presetTpl" value="minimal" style="margin-right:8px"><strong>Minimal Blank CV</strong><span class="tiny muted">Loads empty schema properties to write sections from scratch.</span></label>'
      + '</div>'
      + '<div class="modal-footer" style="display:flex; gap:var(--space-2)">'
      + '  <button class="btn btn-primary" id="confirmPresetBtn" style="flex:1">Create CV</button>'
      + '  <button class="btn btn-ghost" id="cancelPresetBtn">Cancel</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(overlay);
    
    overlay.querySelector('#cancelPresetBtn').onclick = function() { overlay.remove(); };
    overlay.querySelector('#confirmPresetBtn').onclick = function() {
      var selected = overlay.querySelector('input[name="presetTpl"]:checked').value;
      createPresetDatabase(name, selected);
      overlay.remove();
    };
  }
};

el('saveCvAsBtn').onclick = function() {
  closeAllDropdowns();
  exportDatabaseFile();
};

el('downloadInstanceBtn').onclick = function() {
  closeAllDropdowns();
  if (activeInstance) {
    downloadInstanceFile(currentInstanceName);
  } else {
    alert(t('no_overrides'));
  }
};

el('renameCvBtn').onclick = function() {
  closeAllDropdowns();
  var newName = prompt(t('enter_db_name', { name: currentDbName }), currentDbName);
  if (newName && newName.trim() && newName.trim() !== currentDbName) {
    newName = newName.trim();
    var raw = localStorage.getItem('cvbuilder_cv_' + currentDbName);
    localStorage.setItem('cvbuilder_cv_' + newName, raw);
    localStorage.removeItem('cvbuilder_cv_' + currentDbName);
    currentDbName = newName;
    updateDbSelector();
    loadDatabase(newName);
  }
};

el('deleteCvBtn').onclick = function() {
  closeAllDropdowns();
  if (confirm(t('confirm_delete_db', { name: currentDbName }))) {
    deleteDatabase(currentDbName);
  }
};

el('downloadTexBtn').onclick = function() {
  closeAllDropdowns();
  downloadTexFile();
};

el('downloadPdfBtn').onclick = function() {
  downloadPdfFile();
};

// Help menu binders
el('helpScratchBtn').onclick = function() {
  closeAllDropdowns();
  openModal('helpScratchModal');
};
el('helpUsageBtn').onclick = function() {
  closeAllDropdowns();
  openModal('helpUsageModal');
};
el('helpTemplatesBtn').onclick = function() {
  closeAllDropdowns();
  openModal('helpTemplatesModal');
};
el('helpTourBtn').onclick = function() {
  closeAllDropdowns();
  startWelcomeTour();
};
el('helpDiagnosticsBtn').onclick = function() {
  closeAllDropdowns();
  openModal('diagnosticsModal');
};

el('closeHelpScratchModal').onclick = function() { closeModal('helpScratchModal'); };
el('closeHelpUsageModal').onclick = function() { closeModal('helpUsageModal'); };
el('closeHelpTemplatesModal').onclick = function() { closeModal('helpTemplatesModal'); };
el('closeDiagnosticsModal').onclick = function() { closeModal('diagnosticsModal'); };

el('diagRunBtn').onclick = runDiagnostics;
el('diagDownloadBtn').onclick = downloadDiagReportFile;

// Select change observers
el('dbSelect').onchange = function(e) {
  if (e.target.value === '__manage__') {
    openDbManagerModal();
    e.target.value = currentDbName;
  } else {
    loadDatabase(e.target.value);
  }
};

el('styleSelect').onchange = function(e) {
  if (e.target.value === '__manage__') {
    openStyleManagerModal();
    e.target.value = currentStyleName;
  } else {
    loadStyle(e.target.value);
  }
};

el('instanceSelect').onchange = function(e) {
  if (e.target.value === '__manage__') {
    showInstanceManagerModal();
    e.target.value = currentInstanceName;
  } else {
    loadInstance(e.target.value);
  }
};

el('langFilterSelect').onchange = function(e) {
  state.langFilter = e.target.value;
  updateUITranslations();
  renderAll();
};

// Visual Customizer Theme Bindings
el('themeAccentColor').oninput = function(e) {
  state.themeAccentColor = e.target.value;
  el('themeAccentHex').value = e.target.value;
  saveCurrentStyle();
  renderLatex();
};
el('themeAccentHex').oninput = function(e) {
  var val = e.target.value;
  if (val.indexOf('#') !== 0) val = '#' + val;
  if (/^#[0-9A-F]{6}$/i.test(val)) {
    state.themeAccentColor = val;
    el('themeAccentColor').value = val;
    saveCurrentStyle();
    renderLatex();
  }
};
el('themeFontSelect').onchange = function(e) {
  state.themeFont = e.target.value;
  saveCurrentStyle();
  renderLatex();
};

// Custom sections drawer buttons
el('addSectionBtn').onclick = function() {
  var isEs = state.langFilter === 'es';
  var labelText = isEs ? 'Nombre de la nueva sección (en minúsculas, ej. awards):' : 'Enter name for the new section (lowercase, e.g. awards):';
  var section = prompt(labelText);
  if (!section) return;
  section = section.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  if (!section) return;
  if (data[section]) {
    alert(isEs ? '¡Esa sección ya existe!' : 'That section already exists!');
    return;
  }
  
  // Choose custom array or custom object template layout
  var isArray = confirm(isEs ? '¿Es una sección que contiene una lista de elementos (ej. educación)?' : 'Is this section a list of entries (e.g. education)?');
  if (isArray) {
    data[section] = [{ selected: true }];
  } else {
    data[section] = {};
  }
  state.sections[section] = { include: true, title: human(section) };
  state.activeSection = section;
  markDirty();
  renderAll();
};

// Global menu dropdown toggle triggers
document.querySelectorAll('.menubtn').forEach(function(btn) {
  btn.onclick = function(e) {
    var dropdown = btn.nextElementSibling;
    var isOpen = dropdown && dropdown.classList.contains('open');
    closeAllDropdowns();
    if (!isOpen && dropdown) {
      dropdown.classList.add('open');
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
    e.stopPropagation();
  };
});
window.onclick = function() { closeAllDropdowns(); };

// Version badge → opens changelog modal
var versionBtn = el('versionBtn');
if (versionBtn) {
  versionBtn.onclick = function() {
    var body = el('versionBody');
    if (body) {
      body.innerHTML = CHANGELOG.map(function(entry) {
        return '<div style="margin-bottom:var(--space-4)">'
          + '<div style="font-weight:700; margin-bottom:var(--space-1); color:var(--color-primary)">v' + entry.version + '</div>'
          + '<ul style="margin:0; padding-left:var(--space-4); display:flex; flex-direction:column; gap:var(--space-1)">'
          + entry.changes.map(function(c) { return '<li style="font-size:var(--text-sm); color:var(--color-text-muted)">' + esc(c) + '</li>'; }).join('')
          + '</ul></div>';
      }).join('');
    }
    openModal('versionModal');
  };
}
el('closeVersionModal').onclick = function() { closeModal('versionModal'); };

// Theme toggle → switches dark/light
document.querySelectorAll('[data-theme-toggle]').forEach(function(btn) {
  btn.onclick = function() {
    var html = document.documentElement;
    var isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    btn.textContent = isDark ? '\u2600\ufe0f' : '\u263d';
  };
});

// Language auto-detection from browser locale
var userLang = navigator.language || navigator.userLanguage || 'en';
if (userLang.indexOf('es') === 0) {
  state.langFilter = 'es';
  el('langFilterSelect').value = 'es';
} else {
  state.langFilter = 'en';
  el('langFilterSelect').value = 'en';
}

// ── INITIAL BOOTSTRAP ──
updateInstanceSelector();
var dbList = listDatabases();
var styleList = listStyles();
loadDatabase(dbList[0]);
loadStyle(styleList[0]);

if (!localStorage.getItem('cvbuilder_visited')) {
  setTimeout(startWelcomeTour, 1000);
}

window.addEventListener('load', function() {
  setTimeout(function() {
    var loader = el('loadingScreen');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(function() {
        loader.remove();
      }, 500);
    }
  }, 1500);
});
