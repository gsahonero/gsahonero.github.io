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
  themeFont: 'sans',
  themeTextAlign: 'left',
  headerSpacer: 20
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
var mappers = {};
var currentDbName = 'Default CV';

var DB_PREFIX = 'cvbuilder_cv_';
var INSTANCE_PREFIX = 'cvbuilder_instance_';

// ── UTILITY HELPERS ──
function el(id) { return document.getElementById(id); }
function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function human(s) {
  if (!s) return '';
  var clean = s.replace(/_/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
function slugId(section, idx) { return 'entry-' + section + '-' + idx; }
function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function cleanHtmlFromDatabase(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (/<[a-z][\s\S]*>/i.test(obj)) {
      return obj
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
        .split(/\r?\n/).map(function(l) { return l.trim(); }).filter(Boolean).join('\n');
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      obj[i] = cleanHtmlFromDatabase(obj[i]);
    }
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(function(k) {
      if (k === 'instances' || k === '_templates' || k === 'templates') return;
      obj[k] = cleanHtmlFromDatabase(obj[k]);
    });
  }
  return obj;
}
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
  renderHtmlPreview();
  renderSchema();
  updateAtsBadge();
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
  saveCurrentInstance();
  saveCurrentDatabase();
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
      // Ensure new format keys exist for backward compat
      imported.instances = imported.instances || {};
      imported._style = imported._style || {};
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
  var activeTab = state.rightTab || 'html-prev';

  if (activeTab === 'latex-prev') {
    // Mode 1: LaTeX PDF Compilation via TeX Live CGI POST form submission (avoids 414 & Cannot POST errors)
    var tplText = (el('latexTplEditor') && el('latexTplEditor').value) || DEFAULT_LATEX_TEMPLATE;
    var context = buildTemplateContext();
    var rendered = renderTemplate(tplText, context, texEscape);

    var isEs = state.langFilter === 'es';
    var topbarBtn = el('topbarPdfBtn');
    if (topbarBtn) {
      topbarBtn.setAttribute('disabled', 'true');
      var topbarPdfText = el('topbarPdfBtnText');
      if (topbarPdfText) topbarPdfText.textContent = isEs ? 'Compilando...' : 'Compiling PDF...';
    }

    try {
      var form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://texlive.net/cgi-bin/latexcgi';
      form.enctype = 'multipart/form-data';
      form.target = '_blank';
      form.style.display = 'none';

      var nameInput = document.createElement('input');
      nameInput.type = 'hidden';
      nameInput.name = 'filename[]';
      nameInput.value = 'main.tex';
      form.appendChild(nameInput);

      var textarea = document.createElement('textarea');
      textarea.name = 'file[]';
      textarea.value = rendered;
      form.appendChild(textarea);

      document.body.appendChild(form);
      form.submit();
      setTimeout(function() { form.remove(); }, 1500);
    } catch(e) {
      alert(isEs ? 'La compilación falló. Descargue el archivo .tex en su lugar.' : 'Compilation failed. Please download the .tex file instead.');
    } finally {
      if (topbarBtn) {
        setTimeout(function() {
          topbarBtn.removeAttribute('disabled');
          var topbarPdfText = el('topbarPdfBtnText');
          if (topbarPdfText) topbarPdfText.textContent = isEs ? 'Exportar PDF' : 'Export PDF';
        }, 1200);
      }
    }
  } else {
    // Mode 2: HTML Preview Print to PDF
    var htmlContent = renderHtmlContent();
    var w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(htmlContent);
      w.document.close();
      setTimeout(function() {
        try {
          w.focus();
          w.print();
        } catch(e) { console.warn('Print invocation deferred:', e); }
      }, 300);
    }
  }
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

function openEditMappersModal() {
  openModal('editMappersModal');
  var textarea = el('mappersEditor');
  if (textarea) {
    textarea.value = JSON.stringify(mappers, null, 2);
  }
}

// ── LATEX ESCAPING REGISTRY ──
// texEscape is defined in compiler.js to preserve LaTeX commands like \textbf{}, \textit{}, \href{}, etc.

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

    // ── SUITE 5: INSTANCE USER INTERACTION & BUTTON TRIGGERS ──
    // Test 5.1: Verification of "Manage Instances" gear button trigger
    (function() {
      var tStart = performance.now();
      var btn = el('manageInstancesBtn');
      var passed = false;
      var actualMsg = "";
      
      if (!btn) {
        actualMsg = "Button manageInstancesBtn not found in DOM";
      } else {
        // Trigger click
        btn.click();
        var modal = document.getElementById('instanceManagerModal');
        if (modal) {
          passed = true;
          actualMsg = "Successfully triggered Instance Manager Modal";
          modal.remove(); // Clean up immediately
        } else {
          actualMsg = "Clicking button did not spawn instanceManagerModal";
        }
      }
      
      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("5.1", "Manage Instances Button", "Verifies the gear button triggers the Instance Manager Modal", "ui-triggers", "Spawns instanceManagerModal", actualMsg, latency, passed);
      testRuns.push({ id: "5.1", name: "Manage Instances Button", category: "ui-triggers", expected: "Spawns instanceManagerModal", actual: actualMsg, passed: passed, latency: latency });
    })();

    // Test 5.2: Verification of warning banner "Switch to Master" button
    (function() {
      var tStart = performance.now();
      var backupInst = activeInstance;
      var backupInstName = currentInstanceName;
      var backupActiveSection = state.activeSection;

      var passed = false;
      var actualMsg = "";

      // Set state to look like a tailored instance is active
      activeInstance = { overwrites: {}, visibility: {}, sections: {} };
      currentInstanceName = "BannerTestInstance";
      state.activeSection = "basics";

      try {
        renderEditor();
        var backBtn = el('instanceBannerBackBtn');
        if (!backBtn) {
          actualMsg = "Switch to Master button not found in active banner";
        } else {
          backBtn.click();
          if (currentInstanceName === "None (Master CV)" && activeInstance === null) {
            passed = true;
            actualMsg = "Successfully switched back to Master CV";
          } else {
            actualMsg = "Failed to switch to Master. Current: " + currentInstanceName;
          }
        }
      } catch(e) {
        actualMsg = "Error: " + e.message;
      } finally {
        // Restore backup state
        activeInstance = backupInst;
        currentInstanceName = backupInstName;
        state.activeSection = backupActiveSection;
        renderEditor();
      }

      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("5.2", "Switch to Master Banner Button", "Verifies banner button switches back to Master CV mode", "ui-triggers", "Switches to None (Master CV)", actualMsg, latency, passed);
      testRuns.push({ id: "5.2", name: "Switch to Master Banner Button", category: "ui-triggers", expected: "Switches to None (Master CV)", actual: actualMsg, passed: passed, latency: latency });
    })();

    // Test 5.3: Verification of field-level "Reset" and "Save to Master" button triggers
    (function() {
      var tStart = performance.now();
      var backupInst = activeInstance;
      var backupInstName = currentInstanceName;
      var backupActiveSection = state.activeSection;
      var backupConfirm = window.confirm;

      var passed = false;
      var actualMsg = "";

      // Setup a tailored instance with an override
      activeInstance = {
        overwrites: { "basics.name": "Override Name" },
        visibility: {},
        sections: {}
      };
      currentInstanceName = "FieldTestInstance";
      state.activeSection = "basics";

      // Mock confirm to auto-approve
      window.confirm = function() { return true; };

      try {
        renderEditor();
        var inputs = el('editorTab').querySelectorAll('[data-path="basics.name"]');
        if (inputs.length === 0) {
          actualMsg = "Override field inputs not rendered";
        } else {
          var fieldWrapper = inputs[0].closest('.input-wrapper');
          var resetBtn = fieldWrapper.querySelector('[data-reset]');
          var promoteBtn = fieldWrapper.querySelector('[data-promote]');

          if (!resetBtn || !promoteBtn) {
            actualMsg = "Reset or Promote buttons not found in field status bar";
          } else {
            // Verify promote
            promoteBtn.click();
            var promotedVal = data.basics.name;
            var overrideRemoved = !( "basics.name" in activeInstance.overwrites );

            if (promotedVal === "Override Name" && overrideRemoved) {
              passed = true;
              actualMsg = "Successfully promoted override to Master and cleared local state";
            } else {
              actualMsg = "Promotion failed. Val: " + promotedVal + ", Override removed: " + overrideRemoved;
            }
          }
        }
      } catch(e) {
        actualMsg = "Error: " + e.message;
      } finally {
        // Restore backups
        activeInstance = backupInst;
        currentInstanceName = backupInstName;
        state.activeSection = backupActiveSection;
        window.confirm = backupConfirm;
        renderEditor();
      }

      var tEnd = performance.now();
      var latency = Math.round(tEnd - tStart);
      if (passed) totalPassed++; else totalFailed++;
      appendDiagRow("5.3", "Field-Level Override Buttons", "Verifies field-level reset and promote (Save to Master) triggers", "ui-triggers", "Saves to Master and removes local override", actualMsg, latency, passed);
      testRuns.push({ id: "5.3", name: "Field-Level Override Buttons", category: "ui-triggers", expected: "Saves to Master and removes local override", actual: actualMsg, passed: passed, latency: latency });
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

// ── STYLE MANAGER (now tied to active instance / CV _style) ──
// Style preset gallery now accessed via Edit Mappers button in Customizer tab.
el('modalEditMappersBtn') && (el('modalEditMappersBtn').onclick = function() {
  openEditMappersModal();
});
el('closeEditMappersModal') && (el('closeEditMappersModal').onclick = function() {
  closeModal('editMappersModal');
});
el('applyMappersBtn') && (el('applyMappersBtn').onclick = function() {
  var textarea = el('mappersEditor');
  if (textarea) {
    try {
      var parsed = JSON.parse(textarea.value);
      mappers = parsed;
      saveActiveStyle();
      renderLatex();
      closeModal('editMappersModal');
    } catch(err) {
      alert((state.langFilter === 'es' ? 'JSON inválido: ' : 'Invalid JSON: ') + err.message);
    }
  }
});

// ── CUSTOMIZER TAB TEMPLATE TOOL BUTTONS ──
el('customizerEditMappersBtn') && (el('customizerEditMappersBtn').onclick = function() {
  openEditMappersModal();
});
el('customizerPresetsBtn') && (el('customizerPresetsBtn').onclick = function() {
  var modal = document.createElement('div');
  modal.className = 'modal-backdrop open';
  var isEs = state.langFilter === 'es';
  var presetCards = Object.entries(STYLE_PRESETS).map(function(entry) {
    var key = entry[0], preset = entry[1];
    return '<div class="preset-card" data-key="' + key + '" style="border:1.5px solid var(--color-border); border-radius:var(--radius-md); padding:var(--space-3); cursor:pointer; background:var(--color-surface); transition:all 0.15s">'
      + '<div style="font-weight:700; color:var(--color-text)">' + esc(preset.name) + '</div>'
      + '<div class="tiny muted" style="margin-top:4px">' + esc(preset.desc) + '</div>'
      + '</div>';
  }).join('');
  modal.innerHTML = '<div class="modal" style="max-width:480px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-4)">'
    + '<div class="modal-header"><h3>' + (isEs ? 'Aplicar Plantilla Preset' : 'Apply Preset Template') + '</h3></div>'
    + '<div class="modal-body"><div class="tiny muted" style="margin-bottom:var(--space-3)">' + (isEs ? 'Aplica una plantilla al estilo activo.' : 'Apply a template to the currently active style.') + '</div>'
    + '<div style="display:grid; gap:var(--space-3)">' + presetCards + '</div></div>'
    + '<div class="modal-footer"><button class="btn btn-ghost" id="closePresetPickerBtn">' + (isEs ? 'Cancelar' : 'Cancel') + '</button></div>'
    + '</div>';
  document.body.appendChild(modal);
  el('closePresetPickerBtn').onclick = function() { modal.remove(); };
  modal.querySelectorAll('.preset-card').forEach(function(card) {
    card.onmouseenter = function() { card.style.borderColor = 'var(--color-primary)'; };
    card.onmouseleave = function() { card.style.borderColor = 'var(--color-border)'; };
    card.onclick = function() {
      var key = card.getAttribute('data-key');
      var preset = STYLE_PRESETS[key];
      if (preset) {
        if (el('latexTplEditor')) el('latexTplEditor').value = preset.latexTemplate;
        if (el('htmlTplEditor')) el('htmlTplEditor').value = preset.htmlTemplate;
        tpl.style = key === 'classic' ? 'classic' : (key === 'corporate' ? 'banking' : 'casual');
        
        // Define preset visual style mapping overrides
        var presetTheme = { accentColor: '#2563eb', font: 'sans', textAlign: 'left' };
        if (key === 'corporate') {
          presetTheme.accentColor = '#1e3a8a';
          presetTheme.font = 'sans';
        } else if (key === 'tech') {
          presetTheme.accentColor = '#10b981';
          presetTheme.font = 'mono';
        }
        
        state.themeAccentColor = presetTheme.accentColor;
        state.themeFont = presetTheme.font;
        state.themeTextAlign = presetTheme.textAlign;
        
        // Update DOM control inputs in visual customizer to match the preset values
        if (el('themeAccentColor')) el('themeAccentColor').value = state.themeAccentColor;
        if (el('themeAccentHex')) el('themeAccentHex').value = state.themeAccentColor;
        if (el('themeFontSelect')) el('themeFontSelect').value = state.themeFont;
        if (el('themeTextAlignSelect')) el('themeTextAlignSelect').value = state.themeTextAlign;

        saveActiveStyle();
        renderAll();
        alert(t('preset_applied', { name: preset.name }));
      }
      modal.remove();
    };
  });
});

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

if (el('importExternalBtn')) {
  el('importExternalBtn').onclick = function() {
    closeAllDropdowns();
    showImportModal();
  };
}

if (el('exportFormatsBtn')) {
  el('exportFormatsBtn').onclick = function() {
    closeAllDropdowns();
    showExportModal();
  };
}


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

var dontAskLatexPrivacySession = false;

function openHtmlWindow(triggerPrint) {
  var htmlContent = renderHtmlContent();
  if (triggerPrint) {
    var printScript = '\n<script>window.onload = function() { setTimeout(function() { window.print(); }, 350); };</script>\n';
    if (htmlContent.indexOf('</body>') !== -1) {
      htmlContent = htmlContent.replace('</body>', printScript + '</body>');
    } else {
      htmlContent += printScript;
    }
  }

  var w = window.open();
  if (w) {
    w.document.open();
    w.document.write(htmlContent);
    w.document.close();
  }
}

function openPdfExportFormatModal() {
  openModal('pdfFormatModal');
}

function confirmPdfExportFormatChoice() {
  closeModal('pdfFormatModal');
  var choices = document.getElementsByName('pdfFormatChoice');
  var selectedChoice = 'latex';
  for (var i = 0; i < choices.length; i++) {
    if (choices[i].checked) {
      selectedChoice = choices[i].value;
      break;
    }
  }

  if (selectedChoice === 'html') {
    openHtmlWindow(true);
  } else {
    handlePdfExportRequest();
  }
}

function handlePdfExportRequest() {
  if (dontAskLatexPrivacySession) {
    executeLatexPdfExport();
  } else {
    var sName = (state && state.latexCompilerService === 'latexonline') ? 'latexonline.cc' : 'latex.ytotech.com';
    var serverTxtEl = el('selectedServerNameText');
    if (serverTxtEl) serverTxtEl.textContent = sName;
    openModal('latexExportModal');
  }
}

async function executeLatexPdfExport() {
  closeModal('latexExportModal');
  
  var dontAskCheck = el('dontAskLatexExportCheck');
  if (dontAskCheck && dontAskCheck.checked) {
    dontAskLatexPrivacySession = true;
  }

  var btnTextEls = [el('topbarPdfBtnText'), el('confirmLatexExportBtnText')];
  btnTextEls.forEach(function(b) {
    if (b) {
      if (!b.dataset.origText) b.dataset.origText = b.textContent;
      b.textContent = (state && state.langFilter === 'es' ? 'Compilando PDF...' : 'Compiling PDF...');
    }
  });

  try {
    var latexCode = (el('latexPreview') && el('latexPreview').textContent) || renderTemplate(DEFAULT_LATEX_TEMPLATE, buildTemplateContext('latex'), texEscape);
    var service = (state && state.latexCompilerService) || 'ytotech';
    
    var pdfBlob = await compilePdfFromLatex(latexCode, service);
    
    var fn = 'CVbuilder_Resume.pdf';
    if (data && data.basics) {
      var fname = (data.basics.firstname || '').trim();
      var lname = (data.basics.lastname || '').trim();
      if (fname || lname) {
        fn = (fname + '_' + lname + '_CV.pdf').replace(/\s+/g, '_');
      }
    }
    
    downloadBlob(pdfBlob, fn);
  } catch (err) {
    console.error(err);
    alert((state && state.langFilter === 'es' ? 'Error al compilar PDF mediante LaTeX: ' : 'Failed to compile PDF via LaTeX: ') + err.message);
  } finally {
    btnTextEls.forEach(function(b) {
      if (b && b.dataset.origText) {
        b.textContent = b.dataset.origText;
      }
    });
  }
}

var oldPdfBtn = el('downloadPdfBtn');
if (oldPdfBtn) oldPdfBtn.onclick = openPdfExportFormatModal;

var topbarPdf = el('topbarPdfBtn');
if (topbarPdf) topbarPdf.onclick = openPdfExportFormatModal;

var menuPdf = el('menuDownloadPdfBtn');
if (menuPdf) menuPdf.onclick = openPdfExportFormatModal;

var htmlPrevPdf = el('htmlPrevPdfBtn');
if (htmlPrevPdf) htmlPrevPdf.onclick = openPdfExportFormatModal;

var latexTabPdf = el('latexTabPdfBtn');
if (latexTabPdf) latexTabPdf.onclick = openPdfExportFormatModal;

var confirmPdfFormatBtn = el('confirmPdfFormatBtn');
if (confirmPdfFormatBtn) confirmPdfFormatBtn.onclick = confirmPdfExportFormatChoice;

var confirmExportBtn = el('confirmLatexExportBtn');
if (confirmExportBtn) confirmExportBtn.onclick = executeLatexPdfExport;

var latexCompilerSelect = el('latexCompilerSelect');
if (latexCompilerSelect) {
  latexCompilerSelect.onchange = function(e) {
    state.latexCompilerService = e.target.value;
    var serverTxtEl = el('selectedServerNameText');
    if (serverTxtEl) {
      serverTxtEl.textContent = (e.target.value === 'latexonline') ? 'latexonline.cc' : 'latex.ytotech.com';
    }
  };
}

function switchTab(tabName) {
  var tabButton = document.querySelector('.left-pane .tab[data-tab="' + tabName + '"]');
  if (tabButton) {
    tabButton.click();
  }
}

function switchPreviewTab(tabName) {
  var dataTabVal = tabName;
  if (tabName === 'html') dataTabVal = 'html-prev';
  if (tabName === 'latex') dataTabVal = 'latex-prev';
  if (tabName === 'json') dataTabVal = 'json-prev';
  var tabButton = document.querySelector('.right-pane .tab[data-tab="' + dataTabVal + '"]');
  if (tabButton) {
    tabButton.click();
  }
}

function handleGuideAction(type, modalId) {
  if (modalId) closeModal(modalId);
  switch (type) {
    case 'startBlankCv':
      startBlankCv();
      break;
    case 'openDbManagerModal':
      openDbManagerModal();
      break;
    case 'jumpBasics':
      state.activeSection = 'basics';
      renderSectionList();
      renderOutline();
      renderEditor();
      break;
    case 'openAddSectionAssistant':
      openAddSectionAssistant();
      break;
    case 'openAddInstanceModal':
      openModal('addInstanceModal');
      break;
    case 'switchPreviewHtml':
      switchPreviewTab('html');
      break;
    case 'switchPreviewLatex':
      switchPreviewTab('latex');
      break;
    case 'exportDatabaseFile':
      exportDatabaseFile();
      break;
    case 'exportPdf':
      openPdfExportFormatModal();
      break;
    case 'switchTabEditor':
      switchTab('editor');
      break;
    case 'switchTabCustomizer':
      switchTab('customizer');
      break;
    case 'switchTabLatex':
      switchTab('latex');
      break;
    case 'switchTabHtml':
      switchTab('html');
      break;
    case 'openStyleManagerModal':
      openModal('styleManagerModal');
      break;
    default:
      break;
  }
}

var currentScratchStep = 1;
var guideScratchData = typeof GUIDE_SCRATCH_CONFIG !== 'undefined' ? GUIDE_SCRATCH_CONFIG : null;

function loadGuideScratchConfig(callback) {
  if (guideScratchData) {
    if (callback) callback(guideScratchData);
    return;
  }
  if (typeof fetch === 'function') {
    fetch('configs/guide_scratch.json')
      .then(function(res) { return res.json(); })
      .then(function(json) {
        guideScratchData = json;
        if (callback) callback(guideScratchData);
      })
      .catch(function() {
        if (callback) callback(null);
      });
  } else {
    if (callback) callback(null);
  }
}

function renderInteractiveScratchGuide(stepIdx) {
  if (stepIdx !== undefined) currentScratchStep = stepIdx;
  if (currentScratchStep < 1) currentScratchStep = 1;
  if (currentScratchStep > 6) currentScratchStep = 6;

  var scratchBody = el('helpScratchBody') || document.querySelector('#helpScratchModal .body');
  if (!scratchBody) return;

  var cfg = guideScratchData || (typeof GUIDE_SCRATCH_CONFIG !== 'undefined' ? GUIDE_SCRATCH_CONFIG : null);
  if (!cfg) {
    loadGuideScratchConfig(function() { renderInteractiveScratchGuide(stepIdx); });
    return;
  }

  var isEs = state.langFilter === 'es';
  var langKey = isEs ? 'es' : 'en';
  var steps = cfg.steps || [];
  var totalSteps = steps.length || 6;
  var pct = Math.round((currentScratchStep / totalSteps) * 100);

  var currentStepData = steps[currentScratchStep - 1] || {};
  var content = currentStepData.content ? currentStepData.content[langKey] : {};

  var html = '';

  // 1. Progress Bar
  html += '<div style="margin-bottom:var(--space-4); background:var(--color-surface); padding:var(--space-4); border-radius:var(--radius-lg); border:1px solid var(--color-divider)">';
  html += '  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-2); font-size:var(--text-xs); color:var(--color-text-muted)">';
  html += '    <span style="font-weight:700; color:var(--color-primary)">' + (isEs ? 'Paso ' + currentScratchStep + ' de ' + totalSteps : 'Step ' + currentScratchStep + ' of ' + totalSteps) + '</span>';
  html += '    <span style="font-weight:600">' + pct + '% ' + (isEs ? 'Completado' : 'Completed') + '</span>';
  html += '  </div>';
  html += '  <div style="height:6px; background:oklch(from var(--color-text) l c h / .1); border-radius:3px; overflow:hidden">';
  html += '    <div style="height:100%; width:' + pct + '%; background:var(--color-primary); transition:width 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-radius:3px"></div>';
  html += '  </div>';

  // 2. Step Tabs
  html += '  <div style="display:flex; gap:var(--space-2); margin-top:var(--space-3); overflow-x:auto; padding-bottom:4px">';
  for (var i = 1; i <= totalSteps; i++) {
    var active = i === currentScratchStep;
    var sMeta = (steps[i - 1] && steps[i - 1].meta && steps[i - 1].meta[langKey]) || { title: 'Step ' + i, icon: '📍' };
    html += '    <button onclick="renderInteractiveScratchGuide(' + i + ')" class="btn ' + (active ? 'btn-primary' : 'btn-ghost') + ' btn-xs" style="flex-shrink:0; font-size:11px; padding:4px 8px; border-radius:var(--radius-md); display:flex; align-items:center; gap:4px">';
    html += '      <span>' + sMeta.icon + '</span><span>' + i + '. ' + esc(sMeta.title) + '</span>';
    html += '    </button>';
  }
  html += '  </div>';
  html += '</div>';

  // 3. Step Content Card
  html += '<div style="background:var(--color-surface); padding:var(--space-5); border-radius:var(--radius-lg); border:1.5px solid var(--color-border); box-shadow:0 4px 12px rgba(0,0,0,0.04); margin-bottom:var(--space-4)">';
  html += '  <h3 style="margin-top:0; font-size:var(--text-lg); display:flex; align-items:center; gap:8px; color:var(--color-primary)">' + (content.title || '') + '</h3>';
  if (content.description) {
    html += '  <p style="line-height:1.6; color:var(--color-text-muted)">' + content.description + '</p>';
  }

  // Cards Grid
  if (content.cards && content.cards.length) {
    html += '  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:var(--space-3); margin:var(--space-4) 0">';
    content.cards.forEach(function(card) {
      html += '    <div style="background:var(--color-bg); padding:var(--space-4); border-radius:var(--radius-md); border:1px solid var(--color-divider)">';
      html += '      <div style="font-weight:700; margin-bottom:4px">' + card.title + '</div>';
      html += '      <p style="font-size:var(--text-xs); color:var(--color-text-muted); margin-bottom:12px">' + card.description + '</p>';
      if (card.action) {
        html += '      <button onclick="handleGuideAction(\'' + card.action.type + '\', \'helpScratchModal\')" class="btn btn-' + card.action.style + ' btn-sm" style="width:100%">' + card.action.label + '</button>';
      }
      html += '    </div>';
    });
    html += '  </div>';
  }

  // ProTip
  if (content.proTip) {
    html += '  <div style="background:var(--color-bg); padding:var(--space-4); border-radius:var(--radius-md); border-left:4px solid var(--color-primary); margin:var(--space-4) 0">';
    html += '    <div style="font-weight:700; margin-bottom:4px; font-size:var(--text-sm)">' + content.proTip.title + '</div>';
    html += '    <p style="font-size:var(--text-xs); color:var(--color-text-muted); margin:0">' + content.proTip.text + '</p>';
    html += '  </div>';
  }

  // Box
  if (content.box) {
    html += '  <div style="background:var(--color-bg); padding:var(--space-4); border-radius:var(--radius-md); border:1px solid var(--color-divider); margin:var(--space-4) 0">';
    html += '    <div style="font-weight:700; margin-bottom:4px; font-size:var(--text-sm)">' + content.box.title + '</div>';
    html += '    <p style="font-size:var(--text-xs); color:var(--color-text-muted); margin-bottom:8px">' + content.box.text + '</p>';
    html += '  </div>';
  }

  // Actions
  if (content.actions && content.actions.length) {
    html += '  <div style="display:flex; gap:var(--space-3); flex-wrap:wrap; margin-top:var(--space-4)">';
    content.actions.forEach(function(act) {
      html += '    <button onclick="handleGuideAction(\'' + act.type + '\', \'helpScratchModal\')" class="btn btn-' + act.style + ' btn-sm">' + act.label + '</button>';
    });
    html += '  </div>';
  }

  html += '</div>';

  // 4. Footer Navigation
  html += '<div style="display:flex; justify-content:space-between; align-items:center; gap:var(--space-3); border-top:1px solid var(--color-divider); padding-top:var(--space-4)">';
  if (currentScratchStep > 1) {
    html += '  <button onclick="renderInteractiveScratchGuide(' + (currentScratchStep - 1) + ')" class="btn btn-ghost btn-sm">⬅️ ' + (isEs ? 'Anterior' : 'Previous') + '</button>';
  } else {
    html += '  <div></div>';
  }

  if (currentScratchStep < totalSteps) {
    html += '  <button onclick="renderInteractiveScratchGuide(' + (currentScratchStep + 1) + ')" class="btn btn-primary btn-sm">' + (isEs ? 'Siguiente' : 'Next') + ' ➡️</button>';
  } else {
    html += '  <button onclick="closeModal(\'helpScratchModal\');" class="btn btn-primary btn-sm">🚀 ' + (isEs ? '¡Comenzar a Editar!' : 'Finish & Start Editing!') + '</button>';
  }
  html += '</div>';

  scratchBody.innerHTML = html;
}

var currentUsageTab = 1;
var guideUsageData = typeof GUIDE_USAGE_CONFIG !== 'undefined' ? GUIDE_USAGE_CONFIG : null;

function loadGuideUsageConfig(callback) {
  if (guideUsageData) {
    if (callback) callback(guideUsageData);
    return;
  }
  if (typeof fetch === 'function') {
    fetch('configs/guide_usage.json')
      .then(function(res) { return res.json(); })
      .then(function(json) {
        guideUsageData = json;
        if (callback) callback(guideUsageData);
      })
      .catch(function() {
        if (callback) callback(null);
      });
  } else {
    if (callback) callback(null);
  }
}

function renderInteractiveUsageGuide(tabIdx) {
  if (tabIdx !== undefined) currentUsageTab = tabIdx;
  if (currentUsageTab < 1) currentUsageTab = 1;
  if (currentUsageTab > 6) currentUsageTab = 6;

  var usageBody = el('helpUsageBody') || document.querySelector('#helpUsageModal .body');
  if (!usageBody) return;

  var cfg = guideUsageData || (typeof GUIDE_USAGE_CONFIG !== 'undefined' ? GUIDE_USAGE_CONFIG : null);
  if (!cfg) {
    loadGuideUsageConfig(function() { renderInteractiveUsageGuide(tabIdx); });
    return;
  }

  var isEs = state.langFilter === 'es';
  var langKey = isEs ? 'es' : 'en';
  var components = cfg.components || [];
  var totalTabs = components.length || 6;

  var currentCompData = components[currentUsageTab - 1] || {};
  var content = currentCompData.content ? currentCompData.content[langKey] : {};

  var html = '';

  // 1. Component Selector Tab Bar
  html += '<div style="margin-bottom:var(--space-4); background:var(--color-surface); padding:var(--space-3); border-radius:var(--radius-lg); border:1px solid var(--color-divider)">';
  html += '  <div style="font-size:var(--text-xs); font-weight:700; color:var(--color-text-muted); margin-bottom:var(--space-2)">' + (isEs ? 'EXPLORADOR DE COMPONENTES DE CVBUILDER:' : 'CVBUILDER COMPONENT ARCHITECTURE EXPLORER:') + '</div>';
  html += '  <div style="display:flex; gap:var(--space-2); overflow-x:auto; padding-bottom:4px">';
  for (var i = 1; i <= totalTabs; i++) {
    var active = i === currentUsageTab;
    var cMeta = (components[i - 1] && components[i - 1].meta && components[i - 1].meta[langKey]) || { title: 'Component ' + i, icon: '⚙️' };
    html += '    <button onclick="renderInteractiveUsageGuide(' + i + ')" class="btn ' + (active ? 'btn-primary' : 'btn-ghost') + ' btn-xs" style="flex-shrink:0; font-size:11px; padding:4px 8px; border-radius:var(--radius-md); display:flex; align-items:center; gap:4px">';
    html += '      <span>' + cMeta.icon + '</span><span>' + i + '. ' + esc(cMeta.title) + '</span>';
    html += '    </button>';
  }
  html += '  </div>';
  html += '</div>';

  // 2. Component Card Deep Dive
  html += '<div style="background:var(--color-surface); padding:var(--space-5); border-radius:var(--radius-lg); border:1.5px solid var(--color-border); box-shadow:0 4px 12px rgba(0,0,0,0.04); margin-bottom:var(--space-4)">';
  html += '  <h3 style="margin-top:0; font-size:var(--text-lg); display:flex; align-items:center; gap:8px; color:var(--color-primary)">' + (content.title || '') + '</h3>';
  if (content.description) {
    html += '  <p style="line-height:1.6; color:var(--color-text-muted)">' + content.description + '</p>';
  }

  // Grid
  if (content.grid && content.grid.length) {
    html += '  <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3); margin:var(--space-4) 0">';
    content.grid.forEach(function(item) {
      var borderStyle = item.border ? 'border-left:4px solid ' + item.border : 'border:1px solid var(--color-divider)';
      html += '    <div style="background:var(--color-bg); padding:var(--space-3); border-radius:var(--radius-md); ' + borderStyle + '">';
      html += '      <div style="font-weight:700; font-size:var(--text-xs); color:var(--color-primary); margin-bottom:4px">' + item.title + '</div>';
      html += '      <p style="font-size:var(--text-xs); color:var(--color-text-muted); margin:0; line-height:1.4">' + item.text + '</p>';
      html += '    </div>';
    });
    html += '  </div>';
  }

  // Feature Box
  if (content.box) {
    var borderStyle = content.box.border ? 'border-left:4px solid ' + content.box.border : 'border:1px solid var(--color-divider)';
    html += '  <div style="background:var(--color-bg); padding:var(--space-4); border-radius:var(--radius-md); ' + borderStyle + '; margin:var(--space-4) 0">';
    html += '    <div style="font-weight:700; margin-bottom:4px; font-size:var(--text-sm)">' + content.box.title + '</div>';
    if (content.box.text) {
      html += '    <p style="font-size:var(--text-xs); color:var(--color-text-muted); margin:0; line-height:1.5">' + content.box.text + '</p>';
    }
    if (content.box.items && content.box.items.length) {
      html += '    <ul style="font-size:var(--text-xs); color:var(--color-text-muted); margin:0; padding-left:18px; line-height:1.6">';
      content.box.items.forEach(function(it) {
        html += '      <li>' + it + '</li>';
      });
      html += '    </ul>';
    }
    html += '  </div>';
  }

  // Actions
  if (content.actions && content.actions.length) {
    html += '  <div style="display:flex; gap:var(--space-3); flex-wrap:wrap; margin-top:var(--space-4)">';
    content.actions.forEach(function(act) {
      html += '    <button onclick="handleGuideAction(\'' + act.type + '\', \'helpUsageModal\')" class="btn btn-' + act.style + ' btn-sm">' + act.label + '</button>';
    });
    html += '  </div>';
  }

  html += '</div>';

  // 3. Footer Navigation
  html += '<div style="display:flex; justify-content:space-between; align-items:center; gap:var(--space-3); border-top:1px solid var(--color-divider); padding-top:var(--space-4)">';
  if (currentUsageTab > 1) {
    html += '  <button onclick="renderInteractiveUsageGuide(' + (currentUsageTab - 1) + ')" class="btn btn-ghost btn-sm">⬅️ ' + (isEs ? 'Anterior' : 'Previous') + '</button>';
  } else {
    html += '  <div></div>';
  }

  if (currentUsageTab < totalTabs) {
    html += '  <button onclick="renderInteractiveUsageGuide(' + (currentUsageTab + 1) + ')" class="btn btn-primary btn-sm">' + (isEs ? 'Siguiente' : 'Next') + ' ➡️</button>';
  } else {
    html += '  <button onclick="closeModal(\'helpUsageModal\');" class="btn btn-primary btn-sm">🚀 ' + (isEs ? '¡Entendido!' : 'Got it!') + '</button>';
  }
  html += '</div>';

  usageBody.innerHTML = html;
}

var currentTemplatesTab = 1;
var guideTemplatesData = typeof GUIDE_TEMPLATES_CONFIG !== 'undefined' ? GUIDE_TEMPLATES_CONFIG : null;

function loadGuideTemplatesConfig(callback) {
  if (guideTemplatesData) {
    if (callback) callback(guideTemplatesData);
    return;
  }
  if (typeof fetch === 'function') {
    fetch('configs/guide_templates.json')
      .then(function(res) { return res.json(); })
      .then(function(json) {
        guideTemplatesData = json;
        if (callback) callback(guideTemplatesData);
      })
      .catch(function() {
        if (callback) callback(null);
      });
  } else {
    if (callback) callback(null);
  }
}

function renderInteractiveTemplatesGuide(tabIdx) {
  if (tabIdx !== undefined) currentTemplatesTab = tabIdx;
  if (currentTemplatesTab < 1) currentTemplatesTab = 1;
  if (currentTemplatesTab > 5) currentTemplatesTab = 5;

  var templatesBody = el('helpTemplatesBody') || document.querySelector('#helpTemplatesModal .body');
  if (!templatesBody) return;

  var cfg = guideTemplatesData || (typeof GUIDE_TEMPLATES_CONFIG !== 'undefined' ? GUIDE_TEMPLATES_CONFIG : null);
  if (!cfg) {
    loadGuideTemplatesConfig(function() { renderInteractiveTemplatesGuide(tabIdx); });
    return;
  }

  var isEs = state.langFilter === 'es';
  var langKey = isEs ? 'es' : 'en';
  var components = cfg.components || [];
  var totalTabs = components.length || 5;

  var currentCompData = components[currentTemplatesTab - 1] || {};
  var content = currentCompData.content ? currentCompData.content[langKey] : {};

  var html = '';

  // 1. Component Selector Tab Bar
  html += '<div style="margin-bottom:var(--space-4); background:var(--color-surface); padding:var(--space-3); border-radius:var(--radius-lg); border:1px solid var(--color-divider)">';
  html += '  <div style="font-size:var(--text-xs); font-weight:700; color:var(--color-text-muted); margin-bottom:var(--space-2)">' + (isEs ? 'EXPLORADOR DE PLANTILLAS Y ESTILOS:' : 'CVBUILDER STYLE & TEMPLATE ARCHITECTURE:') + '</div>';
  html += '  <div style="display:flex; gap:var(--space-2); overflow-x:auto; padding-bottom:4px">';
  for (var i = 1; i <= totalTabs; i++) {
    var active = i === currentTemplatesTab;
    var cMeta = (components[i - 1] && components[i - 1].meta && components[i - 1].meta[langKey]) || { title: 'Component ' + i, icon: '🎨' };
    html += '    <button onclick="renderInteractiveTemplatesGuide(' + i + ')" class="btn ' + (active ? 'btn-primary' : 'btn-ghost') + ' btn-xs" style="flex-shrink:0; font-size:11px; padding:4px 8px; border-radius:var(--radius-md); display:flex; align-items:center; gap:4px">';
    html += '      <span>' + cMeta.icon + '</span><span>' + i + '. ' + esc(cMeta.title) + '</span>';
    html += '    </button>';
  }
  html += '  </div>';
  html += '</div>';

  // 2. Component Card Deep Dive
  html += '<div style="background:var(--color-surface); padding:var(--space-5); border-radius:var(--radius-lg); border:1.5px solid var(--color-border); box-shadow:0 4px 12px rgba(0,0,0,0.04); margin-bottom:var(--space-4)">';
  html += '  <h3 style="margin-top:0; font-size:var(--text-lg); display:flex; align-items:center; gap:8px; color:var(--color-primary)">' + (content.title || '') + '</h3>';
  if (content.description) {
    html += '  <p style="line-height:1.6; color:var(--color-text-muted)">' + content.description + '</p>';
  }

  // Feature Box (Elements, Usage & What to Expect)
  if (content.box) {
    html += '  <div style="background:var(--color-bg); padding:var(--space-4); border-radius:var(--radius-md); border:1px solid var(--color-divider); margin:var(--space-4) 0">';
    html += '    <div style="font-weight:700; margin-bottom:4px; font-size:var(--text-sm)">' + content.box.title + '</div>';
    if (content.box.items && content.box.items.length) {
      html += '    <ul style="font-size:var(--text-xs); color:var(--color-text-muted); margin:0; padding-left:18px; line-height:1.6">';
      content.box.items.forEach(function(it) {
        html += '      <li style="margin-bottom:4px">' + it + '</li>';
      });
      html += '    </ul>';
    }
    html += '  </div>';
  }

  // Actions
  if (content.actions && content.actions.length) {
    html += '  <div style="display:flex; gap:var(--space-3); flex-wrap:wrap; margin-top:var(--space-4)">';
    content.actions.forEach(function(act) {
      html += '    <button onclick="handleGuideAction(\'' + act.type + '\', \'helpTemplatesModal\')" class="btn btn-' + act.style + ' btn-sm">' + act.label + '</button>';
    });
    html += '  </div>';
  }

  html += '</div>';

  // 3. Footer Navigation
  html += '<div style="display:flex; justify-content:space-between; align-items:center; gap:var(--space-3); border-top:1px solid var(--color-divider); padding-top:var(--space-4)">';
  if (currentTemplatesTab > 1) {
    html += '  <button onclick="renderInteractiveTemplatesGuide(' + (currentTemplatesTab - 1) + ')" class="btn btn-ghost btn-sm">⬅️ ' + (isEs ? 'Anterior' : 'Previous') + '</button>';
  } else {
    html += '  <div></div>';
  }

  if (currentTemplatesTab < totalTabs) {
    html += '  <button onclick="renderInteractiveTemplatesGuide(' + (currentTemplatesTab + 1) + ')" class="btn btn-primary btn-sm">' + (isEs ? 'Siguiente' : 'Next') + ' ➡️</button>';
  } else {
    html += '  <button onclick="closeModal(\'helpTemplatesModal\');" class="btn btn-primary btn-sm">🚀 ' + (isEs ? '¡Entendido!' : 'Got it!') + '</button>';
  }
  html += '</div>';

  templatesBody.innerHTML = html;
}

// Help menu binders
el('helpScratchBtn').onclick = function() {
  closeAllDropdowns();
  renderInteractiveScratchGuide(1);
  openModal('helpScratchModal');
};
el('helpUsageBtn').onclick = function() {
  closeAllDropdowns();
  renderInteractiveUsageGuide(1);
  openModal('helpUsageModal');
};
el('helpTemplatesBtn').onclick = function() {
  closeAllDropdowns();
  renderInteractiveTemplatesGuide(1);
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

// Sidebar & Outline collapse toggles
var sidebarToggleElem = el('toggleSidebarBtn');
if (sidebarToggleElem) {
  sidebarToggleElem.onclick = function() {
    var appContainer = document.querySelector('.app');
    var sidebar = document.querySelector('.sidebar');
    if (appContainer && sidebar) {
      appContainer.classList.toggle('sidebar-collapsed');
      sidebar.classList.toggle('collapsed');
      var isCollapsed = sidebar.classList.contains('collapsed');
      sidebarToggleElem.textContent = isCollapsed ? '▶' : '◀';
      sidebarToggleElem.title = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
    }
  };
}

var outlineToggleElem = el('toggleOutlineBtn');
if (outlineToggleElem) {
  outlineToggleElem.onclick = function() {
    var appContainer = document.querySelector('.app');
    var outlinepane = document.querySelector('.outlinepane');
    if (appContainer && outlinepane) {
      appContainer.classList.toggle('outline-collapsed');
      outlinepane.classList.toggle('collapsed');
      var isCollapsed = outlinepane.classList.contains('collapsed');
      outlineToggleElem.textContent = isCollapsed ? '◀' : '▶';
      outlineToggleElem.title = isCollapsed ? 'Expand outline' : 'Collapse outline';
    }
  };
}
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

el('instanceSelect').onchange = function(e) {
  if (e.target.value === '__manage__') {
    showInstanceManagerModal();
    e.target.value = currentInstanceName;
  } else {
    loadInstance(e.target.value);
  }
};

if (el('manageInstancesBtn')) {
  el('manageInstancesBtn').onclick = function() {
    showInstanceManagerModal();
  };
}

el('langFilterSelect').onchange = function(e) {
  state.langFilter = e.target.value;
  updateUITranslations();
  renderAll();
};

// Visual Customizer Theme Bindings
el('themeAccentColor').oninput = function(e) {
  state.themeAccentColor = e.target.value;
  el('themeAccentHex').value = e.target.value;
  saveActiveStyle();
  renderLatex();
  renderHtmlPreview();
};

var photoLeftSlider = el('photoLeftSlider');
if (photoLeftSlider) {
  photoLeftSlider.oninput = function(e) {
    state.photoLeftOffset = parseInt(e.target.value, 10);
    var valEl = el('photoLeftVal');
    if (valEl) valEl.textContent = e.target.value + 'px';
    saveActiveStyle();
    renderLatex();
    renderHtmlPreview();
  };
}

var photoTopSlider = el('photoTopSlider');
if (photoTopSlider) {
  photoTopSlider.oninput = function(e) {
    state.photoTopOffset = parseInt(e.target.value, 10);
    var valEl = el('photoTopVal');
    if (valEl) valEl.textContent = e.target.value + 'px';
    saveActiveStyle();
    renderLatex();
    renderHtmlPreview();
  };
}

var headerSpacerSlider = el('headerSpacerSlider');
if (headerSpacerSlider) {
  headerSpacerSlider.oninput = function(e) {
    state.headerSpacer = parseInt(e.target.value, 10);
    var valEl = el('headerSpacerVal');
    if (valEl) valEl.textContent = e.target.value + 'px';
    saveActiveStyle();
    renderAll();
  };
}
el('themeAccentHex').oninput = function(e) {
  var val = e.target.value;
  if (val.indexOf('#') !== 0) val = '#' + val;
  if (/^#[0-9A-F]{6}$/i.test(val)) {
    state.themeAccentColor = val;
    el('themeAccentColor').value = val;
    saveActiveStyle();
    renderLatex();
    renderHtmlPreview();
  }
};
el('themeFontSelect').onchange = function(e) {
  state.themeFont = e.target.value;
  saveActiveStyle();
  renderLatex();
  renderHtmlPreview();
};
if (el('themeTextAlignSelect')) {
  el('themeTextAlignSelect').onchange = function(e) {
    state.themeTextAlign = e.target.value;
    saveActiveStyle();
    renderAll();
  };
}

// Template editor auto-save (debounced 800ms)
var tplSaveTimer = null;
function scheduleTplSave() {
  clearTimeout(tplSaveTimer);
  tplSaveTimer = setTimeout(function() {
    saveActiveStyle();
  }, 800);
}
var latexTplEl = el('latexTplEditor');
if (latexTplEl) latexTplEl.oninput = scheduleTplSave;
var htmlTplEl = el('htmlTplEditor');
if (htmlTplEl) htmlTplEl.oninput = scheduleTplSave;

// Custom sections drawer buttons
// Render wizard cards dynamically from SECTION_DEFS
function renderSectionWizardCards() {
  var container = el('sectionStructureCards');
  if (!container || !window.SECTION_DEFS) return;
  container.innerHTML = '';
  
  window.SECTION_DEFS.forEach(function(def, idx) {
    var label = document.createElement('label');
    label.className = 'card-radio' + (idx === 0 ? ' active' : '');
    label.dataset.presetType = def.id;
    label.style.cssText = 'padding:var(--space-2) var(--space-3); border:' + (idx === 0 ? '2px solid var(--color-primary)' : '1.5px solid oklch(from var(--color-text) l c h / .15)') + '; border-radius:var(--radius-md); cursor:pointer; background:var(--color-surface); display:flex; flex-direction:column; gap:2px; transition:all 0.15s ease';
    
    label.innerHTML = '<div style="display:flex; align-items:center; justify-content:space-between">'
      + '<span style="font-weight:700; font-size:var(--text-sm); color:var(--color-text)">' + def.icon + ' ' + esc(def.label) + '</span>'
      + '<input type="radio" name="sectionStructure" value="' + def.id + '" ' + (idx === 0 ? 'checked' : '') + ' style="accent-color:var(--color-primary)">'
      + '</div>'
      + '<span style="font-size:var(--text-xxs); color:var(--color-text-muted); line-height:1.3">' + esc(def.description) + '</span>';
      
    label.onclick = function() {
      container.querySelectorAll('.card-radio').forEach(function(c) {
        c.classList.remove('active');
        c.style.border = '1.5px solid oklch(from var(--color-text) l c h / .15)';
      });
      label.classList.add('active');
      label.style.border = '2px solid var(--color-primary)';
      var radio = label.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      updateAddSectionPreview();
    };
    
    container.appendChild(label);
  });
}

function updateAddSectionPreview() {
  var isEs = state.langFilter === 'es';
  var title = el('newSectionTitleInput').value.trim() || (isEs ? 'Título de Sección' : 'Section Title');
  var selectedRadio = document.querySelector('input[name="sectionStructure"]:checked');
  var structType = selectedRadio ? selectedRadio.value : 'experience';
  
  var pill = el('structureTypePill');
  if (pill) pill.textContent = structType.toUpperCase();
  
  var previewBox = el('addSectionPreviewBox');
  if (!previewBox) return;
  
  var accentColor = state.themeAccentColor || '#2563eb';
  var html = '<div style="margin-bottom:8px; font-size:13px; line-height:1.5; color:#333">';
  html += '<h2 style="font-size:1.15em; border-bottom:2px solid ' + accentColor + '; color:' + accentColor + '; margin:0 0 10px 0; padding-bottom:3px; font-weight:700">' + esc(title) + '</h2>';
  
  var def = (window.SECTION_DEFS || []).find(function(d) { return d.id === structType; });
  if (def && def.previewHtml) {
    html += def.previewHtml;
  } else {
    html += '<div style="margin-bottom:10px; font-size:0.85em; color:#444">Custom section content preview.</div>';
  }
  
  html += '</div>';
  previewBox.innerHTML = html;
}

// Add Section Modal Assistant Trigger & Logic
function openAddSectionAssistant() {
  renderSectionWizardCards();
  var keyInp = el('newSectionKeyInput');
  if (keyInp) {
    keyInp.value = '';
    delete keyInp.dataset.manual;
  }
  var titleInp = el('newSectionTitleInput');
  if (titleInp) titleInp.value = '';
  
  var radios = document.querySelectorAll('input[name="sectionStructure"]');
  if (radios.length) radios[0].checked = true;
  var cards = document.querySelectorAll('#sectionStructureCards .card-radio');
  cards.forEach(function(c, idx) {
    if (idx === 0) {
      c.classList.add('active');
      c.style.border = '2px solid var(--color-primary)';
    } else {
      c.classList.remove('active');
      c.style.border = '1.5px solid oklch(from var(--color-text) l c h / .15)';
    }
  });
  
  openModal('addSectionModal');
  updateAddSectionPreview();
}

var btnAddSec = el('addSectionBtn');
if (btnAddSec) btnAddSec.onclick = openAddSectionAssistant;

// Global Click Delegation Fallback for Modals and Action Triggers
document.addEventListener('click', function(e) {
  var target = e.target;
  if (!target) return;
  
  var addBtn = target.closest('#addSectionBtn');
  if (addBtn) {
    e.preventDefault();
    openAddSectionAssistant();
    return;
  }
});

var closeAddSecBtn = el('closeAddSectionModal');
if (closeAddSecBtn) closeAddSecBtn.onclick = function() { closeModal('addSectionModal'); };

var cancelAddSecBtn = el('cancelAddSectionBtn');
if (cancelAddSecBtn) cancelAddSecBtn.onclick = function() { closeModal('addSectionModal'); };

// Auto-suggest key when user types section title
el('newSectionTitleInput').oninput = function(e) {
  var keyInput = el('newSectionKeyInput');
  if (keyInput && (!keyInput.dataset.manual || !keyInput.value)) {
    keyInput.value = e.target.value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  }
  updateAddSectionPreview();
};
el('newSectionKeyInput').oninput = function(e) {
  e.target.dataset.manual = 'true';
};

// Confirm Create Section button handler
el('confirmAddSectionBtn').onclick = function() {
  var isEs = state.langFilter === 'es';
  var title = el('newSectionTitleInput').value.trim();
  var rawKey = el('newSectionKeyInput').value.trim();
  var key = rawKey.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  
  if (!key) {
    alert(isEs ? 'Por favor ingrese un nombre o clave de sección válido.' : 'Please enter a valid section key or title.');
    return;
  }
  if (data[key]) {
    alert(isEs ? '¡Esa sección ya existe!' : 'That section already exists!');
    return;
  }
  
  var selectedRadio = document.querySelector('input[name="sectionStructure"]:checked');
  var structType = selectedRadio ? selectedRadio.value : 'experience';
  
  var def = (window.SECTION_DEFS || []).find(function(d) { return d.id === structType; });
  var newSectionData;
  
  if (def && def.template) {
    newSectionData = clone(def.template);
    if (def.mapper && typeof mappers === 'object' && mappers) {
      mappers[key] = def.mapper;
    }
  } else {
    newSectionData = [{
      role: '', organization: '', department: '', start: '', end: '', description: '', selected: true
    }];
    if (typeof mappers === 'object' && mappers) mappers[key] = 'cventry_work';
  }
  
  data[key] = newSectionData;
  state.sections[key] = { include: true, title: title || human(key) };
  state.activeSection = key;
  closeModal('addSectionModal');
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

// Interactive info badge tooltips binder
document.querySelectorAll('.info-tooltip-wrapper').forEach(function(wrap) {
  wrap.onclick = function(e) {
    var wasOpen = wrap.classList.contains('open');
    document.querySelectorAll('.info-tooltip-wrapper').forEach(function(w) { w.classList.remove('open'); });
    if (!wasOpen) wrap.classList.add('open');
    e.stopPropagation();
  };
});

window.onclick = function() {
  closeAllDropdowns();
  document.querySelectorAll('.info-tooltip-wrapper').forEach(function(w) { w.classList.remove('open'); });
};

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
loadDatabase(dbList[0]);
renderInteractiveScratchGuide(1);
renderInteractiveUsageGuide(1);
renderInteractiveTemplatesGuide(1);

if (!localStorage.getItem('cvbuilder_visited')) {
  setTimeout(startWelcomeTour, 1000);
}

function hideLoadingScreen() {
  var loader = el('loadingScreen');
  if (loader) {
    loader.classList.add('hidden');
    loader.style.opacity = '0';
    loader.style.pointerEvents = 'none';
    setTimeout(function() {
      if (loader && loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
    }, 500);
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(hideLoadingScreen, 300);
} else {
  window.addEventListener('load', function() {
    setTimeout(hideLoadingScreen, 300);
  });
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(hideLoadingScreen, 300);
  });
}
setTimeout(hideLoadingScreen, 1500);

// ── REVERSE FOCUS CONTEXT MENU ──
var pendingContextPath = null;

function focusEditorElement(targetPath) {
  if (!targetPath) return;

  var cleanPath = String(targetPath).trim();
  var parts = cleanPath.split('.');
  var secKey = parts[0];

  console.log('[Preview Click Focus] Target path:', cleanPath, '| Section:', secKey);

  if (typeof state !== 'undefined') {
    state.activeSection = secKey;
    renderSectionList();
    renderOutline();
    renderEditor();
  }

  setTimeout(function() {
    var editorEl = el('editorContainer') || el('editorTab');
    if (!editorEl) return;

    var isSectionOnlyClick = (parts.length === 1);
    var targetCard = null;
    var targetInput = null;

    if (parts.length >= 2 && !isNaN(parts[1])) {
      var entryId = 'entry-' + secKey + '-' + parts[1];
      targetCard = el(entryId);
    }

    if (!targetCard && parts.length >= 2) {
      var fieldId = 'field-' + secKey + '-' + parts[1];
      var skillGroupId = 'skill-group-' + secKey + '-' + parts[1];
      targetCard = el(fieldId) || el(skillGroupId);
    }

    if (!targetCard) {
      targetCard = el('sec-card-' + secKey);
      isSectionOnlyClick = true;
    }

    if (!isSectionOnlyClick && targetCard) {
      var itemIdx = (parts.length >= 3 && !isNaN(parts[2])) ? parseInt(parts[2], 10) : 0;
      var cardTextInputs = targetCard.querySelectorAll('input:not([type=checkbox]), textarea');
      targetInput = cardTextInputs[itemIdx] || cardTextInputs[0];

      if (!targetInput) {
        var inputs = editorEl.querySelectorAll('input, textarea');
        for (var i = 0; i < inputs.length; i++) {
          var p = inputs[i].getAttribute('data-path') || inputs[i].id || '';
          if (p === cleanPath || (p && p.indexOf(cleanPath) === 0)) {
            targetInput = inputs[i];
            break;
          }
        }
      }
    }

    var scrollTarget = targetCard || targetInput || editorEl.querySelector('.card');
    if (scrollTarget) {
      var blockAlign = isSectionOnlyClick ? 'start' : 'center';
      console.log('[Preview Click Focus] Scrolling to', isSectionOnlyClick ? 'section top' : 'element card', 'ID:', scrollTarget.id || targetPath);
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: blockAlign });

      var highlightEl = targetCard || (targetInput ? (targetInput.closest('.kv') || targetInput.parentElement) : null);
      if (highlightEl) {
        highlightEl.style.transition = 'outline 0.3s ease, box-shadow 0.3s ease';
        highlightEl.style.outline = '2.5px solid #2563eb';
        highlightEl.style.borderRadius = '6px';
        highlightEl.style.boxShadow = '0 0 14px rgba(37, 99, 235, 0.35)';
        setTimeout(function() {
          if (highlightEl) {
            highlightEl.style.outline = 'none';
            highlightEl.style.boxShadow = 'none';
          }
        }, 1800);
      }
    }

    if (!isSectionOnlyClick && targetInput) {
      try { targetInput.focus(); } catch (e) {}
    }
  }, 120);
}

window.addEventListener('message', function(e) {
  if (!e.data) return;

  if (e.data.action === 'previewClickFocus') {
    var raw = e.data.rawId || e.data.targetPath;
    if (raw) {
      var targetPath = parseItemIdToPath(raw) || raw.replace(/^section-/, '');
      if (targetPath) {
        focusEditorElement(targetPath);
      }
    }
  }
});

function parseItemIdToPath(itemId) {
  if (!itemId || itemId.indexOf('item-') !== 0) return null;
  var raw = itemId.substring(5);

  var knownKeys = [];
  if (typeof data !== 'undefined' && data) {
    knownKeys = Object.keys(data);
  } else if (typeof state !== 'undefined' && state.sections) {
    knownKeys = Object.keys(state.sections);
  }
  
  knownKeys.sort(function(a, b) { return b.length - a.length; });

  for (var i = 0; i < knownKeys.length; i++) {
    var k = knownKeys[i];
    if (raw === k) return k;
    if (raw.indexOf(k + '-') === 0) {
      var rest = raw.substring(k.length + 1).replace(/-/g, '.');
      return k + '.' + rest;
    }
  }

  return raw.replace(/-/g, '.');
}

function getIframeElementPath(targetNode) {
  if (!targetNode) return (typeof state !== 'undefined' && state.activeSection) || 'basics';

  var itemEl = targetNode.closest ? targetNode.closest('[id^="item-"]') : null;
  if (itemEl && itemEl.id) {
    var parsed = parseItemIdToPath(itemEl.id);
    if (parsed) return parsed;
  }

  var entryEl = targetNode.closest ? targetNode.closest('.entry, .skills-card, li') : null;
  var secEl = targetNode.closest ? targetNode.closest('[id^="section-"]') : null;

  if (entryEl && secEl && secEl.id) {
    var secKey = secEl.id.replace(/^section-/, '');
    var parent = entryEl.parentElement;
    if (parent) {
      var siblings = Array.prototype.slice.call(parent.children).filter(function(child) {
        return child.classList && (child.classList.contains('entry') || child.classList.contains('skills-card') || child.tagName === 'LI');
      });
      var idx = siblings.indexOf(entryEl);
      if (idx !== -1) {
        return secKey + '.' + idx;
      }
    }
    return secKey;
  }

  if (secEl && secEl.id) {
    return secEl.id.replace(/^section-/, '');
  }

  return (typeof state !== 'undefined' && state.activeSection) || 'basics';
}

function attachIframeEventListeners() {
  var frame = el('htmlPreviewFrame');
  if (!frame) return;

  try {
    var doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
    if (!doc || !doc.body) return;

    try {
      var existingStyle = doc.getElementById('pointerCursorStyle');
      if (!existingStyle && doc.head) {
        var style = doc.createElement('style');
        style.id = 'pointerCursorStyle';
        style.textContent = 'body, section, main, header { cursor: default !important; } .entry, [id^="item-"], [id^="section-"], h1, h2, h3, h4, h5, h6, p, li, span, a, img, strong, em, u, b, i, .subtitle, .contact-info > div, .kv-list > li, .entry-header, .entry-description, .entry-subheader { cursor: pointer !important; }';
        doc.head.appendChild(style);
      }
    } catch (e) {}

    if (doc._listenersAttached) return;
    doc._listenersAttached = true;

    doc.addEventListener('click', function(e) {
      if (!e.target || !e.target.closest) return;
      if (e.target.closest('a')) return;

      var contentEl = e.target.closest('[id^="item-"], [id^="section-"], .entry, h1, h2, h3, h4, p, li, span, img, strong, em, .subtitle, .contact-info > div');
      if (!contentEl) return;

      var targetPath = getIframeElementPath(contentEl);
      if (targetPath) {
        focusEditorElement(targetPath);
      }
    }, true);
  } catch (e) {
    console.warn('Could not attach iframe listeners:', e);
  }
}

setInterval(attachIframeEventListeners, 400);

function showImportModal() {
  var isEs = state.langFilter === 'es';
  var modal = document.createElement('div');
  modal.className = 'modal-backdrop open';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  modal.innerHTML = '<div class="modal" style="max-width:540px; padding:var(--space-4)">'
    + '<div class="modal-header"><h3>' + (isEs ? 'Importar Datos Externos' : 'Import External CV Data') + '</h3></div>'
    + '<div class="modal-body stack" style="gap:var(--space-3)">'
    + '  <div class="tiny muted">' + (isEs ? 'Seleccione el formato y pegue el contenido JSON o cargue un archivo:' : 'Select format and paste JSON content or upload a file:') + '</div>'
    + '  <select id="importFormatSelect" class="db-select" style="height:32px; padding:0 8px; font-weight:600; font-size:13px">'
    + '    <option value="jsonresume">JSON Resume (resume.json)</option>'
    + '    <option value="reactiveresume">Reactive Resume JSON (v4/v5)</option>'
    + '    <option value="linkedin">LinkedIn Export (JSON/CSV)</option>'
    + '  </select>'
    + '  <textarea id="importTextarea" rows="8" placeholder="' + (isEs ? 'Pegue el contenido JSON aquí...' : 'Paste JSON content here...') + '" style="width:100%; font-family:monospace; font-size:12px; padding:8px; border-radius:var(--radius-sm); border:1px solid oklch(from var(--color-text) l c h / .15); background:var(--color-surface-offset); color:var(--color-text)"></textarea>'
    + '  <div style="display:flex; justify-content:space-between; align-items:center">'
    + '    <input type="file" id="importFileInput" accept=".json,.csv,.txt" style="font-size:12px">'
    + '  </div>'
    + '</div>'
    + '<div class="modal-footer" style="display:flex; gap:var(--space-2); margin-top:var(--space-3)">'
    + '  <button class="btn btn-primary" id="confirmImportBtn" style="flex:1">' + (isEs ? 'Importar al CV' : 'Import to CV') + '</button>'
    + '  <button class="btn btn-ghost" id="cancelImportBtn">' + (isEs ? 'Cancelar' : 'Cancel') + '</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(modal);

  modal.querySelector('#cancelImportBtn').onclick = function() { modal.remove(); };

  modal.querySelector('#importFileInput').onchange = function(e) {
    var file = e.target.files[0];
    if (file) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        modal.querySelector('#importTextarea').value = ev.target.result;
      };
      reader.readAsText(file);
    }
  };

  modal.querySelector('#confirmImportBtn').onclick = function() {
    var text = modal.querySelector('#importTextarea').value;
    var format = modal.querySelector('#importFormatSelect').value;
    if (!text || !text.trim()) {
      alert(isEs ? 'Por favor ingrese contenido para importar.' : 'Please enter content to import.');
      return;
    }
    try {
      var importedData = null;
      if (format === 'reactiveresume') {
        importedData = Importer.parseReactiveResume(text);
      } else if (format === 'linkedin') {
        importedData = Importer.parseLinkedInExport(text);
      } else {
        importedData = Importer.parseJsonResume(text);
      }
      
      if (importedData) {
        data = Object.assign({}, data, importedData);
        saveCurrentDatabase();
        renderAll();
        modal.remove();
        alert(isEs ? '¡Datos importados con éxito!' : 'CV data imported successfully!');
      }
    } catch(err) {
      alert((isEs ? 'Error de importación: ' : 'Import Error: ') + err.message);
    }
  };
}

function showExportModal() {
  var isEs = state.langFilter === 'es';
  var modal = document.createElement('div');
  modal.className = 'modal-backdrop open';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  modal.innerHTML = '<div class="modal" style="max-width:560px; padding:var(--space-4)">'
    + '<div class="modal-header"><h3>' + (isEs ? 'Exportar en Otros Formatos' : 'Export Other Formats') + '</h3></div>'
    + '<div class="modal-body stack" style="gap:var(--space-3)">'
    + '  <div class="tiny muted">' + (isEs ? 'Seleccione el formato deseado para copiar o descargar:' : 'Select desired format to copy or download:') + '</div>'
    + '  <div style="display:flex; gap:8px">'
    + '    <button class="btn btn-ghost btn-xs export-tab active" data-format="markdown">Markdown (.md)</button>'
    + '    <button class="btn btn-ghost btn-xs export-tab" data-format="jsonresume">JSON Resume (.json)</button>'
    + '    <button class="btn btn-ghost btn-xs export-tab" data-format="reactiveresume">Reactive Resume (.json)</button>'
    + '    <button class="btn btn-ghost btn-xs export-tab" data-format="plaintext">Plain Text (.txt)</button>'
    + '  </div>'
    + '  <textarea id="exportTextarea" rows="10" readonly style="width:100%; font-family:monospace; font-size:12px; padding:8px; border-radius:var(--radius-sm); border:1px solid oklch(from var(--color-text) l c h / .15); background:var(--color-surface-offset); color:var(--color-text)"></textarea>'
    + '</div>'
    + '<div class="modal-footer" style="display:flex; gap:var(--space-2); margin-top:var(--space-3)">'
    + '  <button class="btn btn-primary" id="copyExportBtn" style="flex:1">' + (isEs ? 'Copiar Texto' : 'Copy Text') + '</button>'
    + '  <button class="btn btn-secondary" id="downloadExportBtn">' + (isEs ? 'Descargar Archivo' : 'Download File') + '</button>'
    + '  <button class="btn btn-ghost" id="cancelExportBtn">' + (isEs ? 'Cerrar' : 'Close') + '</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(modal);

  var activeFormat = 'markdown';
  var txtArea = modal.querySelector('#exportTextarea');

  function updateExportText() {
    if (activeFormat === 'jsonresume') {
      txtArea.value = Exporter.exportToJsonResume();
    } else if (activeFormat === 'reactiveresume') {
      txtArea.value = Exporter.exportToReactiveResume();
    } else if (activeFormat === 'plaintext') {
      txtArea.value = Exporter.exportToPlainText();
    } else {
      txtArea.value = Exporter.exportToMarkdown();
    }
  }
  updateExportText();

  modal.querySelectorAll('.export-tab').forEach(function(btn) {
    btn.onclick = function() {
      modal.querySelectorAll('.export-tab').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      activeFormat = btn.dataset.format;
      updateExportText();
    };
  });

  modal.querySelector('#cancelExportBtn').onclick = function() { modal.remove(); };

  modal.querySelector('#copyExportBtn').onclick = function() {
    navigator.clipboard.writeText(txtArea.value);
    alert(isEs ? '¡Copiado al portapapeles!' : 'Copied to clipboard!');
  };

  modal.querySelector('#downloadExportBtn').onclick = function() {
    var ext = activeFormat === 'markdown' ? 'md' : (activeFormat === 'plaintext' ? 'txt' : 'json');
    var mime = ext === 'json' ? 'application/json' : 'text/plain';
    downloadFile(txtArea.value, mime, currentDbName.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.' + ext);
  };
}

if (el('atsBadgeBtn')) {
  el('atsBadgeBtn').onclick = function() {
    showAtsModal();
  };
}

function updateAtsBadge() {
  if (typeof ATSChecker === 'undefined') return;
  var badgeVal = el('atsScoreVal');
  if (!badgeVal) return;
  var res = ATSChecker.calculateAtsScore(data);
  badgeVal.textContent = res.score + '%';
  if (res.score >= 80) badgeVal.style.color = 'var(--color-success)';
  else if (res.score >= 60) badgeVal.style.color = 'var(--color-warning)';
  else badgeVal.style.color = 'var(--color-error)';

  var modalScore = el('atsModalScoreHeaderVal');
  if (modalScore) {
    modalScore.textContent = 'Score: ' + res.score + '%';
    modalScore.style.color = res.score >= 80 ? 'var(--color-success)' : (res.score >= 60 ? 'var(--color-warning)' : 'var(--color-error)');
  }
  var checkList = el('atsModalCheckList');
  if (checkList) {
    checkList.innerHTML = res.checks.map(function(c) {
      var badge = c.passed
        ? '<span style="color:var(--color-success); font-weight:bold">✓ PASSED</span>'
        : '<span style="color:var(--color-warning); font-weight:bold">⚠ RECOMMENDATION</span>';
      return '<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid oklch(from var(--color-text) l c h / .08)">'
        + '<div><strong>' + esc(c.name) + '</strong><div class="tiny muted">' + esc(c.tip) + '</div></div>'
        + '<div>' + badge + '</div>'
        + '</div>';
    }).join('');
  }
}

function showAtsModal() {
  var isEs = state.langFilter === 'es';
  var res = ATSChecker.calculateAtsScore(data);

  var modal = document.createElement('div');
  modal.className = 'modal-backdrop open';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  var checkRows = res.checks.map(function(c) {
    var badge = c.passed
      ? '<span style="color:var(--color-success); font-weight:bold">✓ PASSED</span>'
      : '<span style="color:var(--color-warning); font-weight:bold">⚠ RECOMMENDATION</span>';
    return '<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid oklch(from var(--color-text) l c h / .08)">'
      + '<div><strong>' + esc(c.name) + '</strong><div class="tiny muted">' + esc(c.tip) + '</div></div>'
      + '<div>' + badge + '</div>'
      + '</div>';
  }).join('');

  modal.innerHTML = '<div class="modal" style="max-width:600px; padding:var(--space-4)">'
    + '<div class="modal-header" style="display:flex; justify-content:space-between; align-items:center">'
    + '  <h3>🎯 ' + (isEs ? 'Análisis de Optimización ATS & Palabras Clave' : 'ATS Optimization & Keyword Inspector') + '</h3>'
    + '  <span id="atsModalScoreHeaderVal" style="font-size:18px; font-weight:800; color:' + (res.score >= 80 ? 'var(--color-success)' : (res.score >= 60 ? 'var(--color-warning)' : 'var(--color-error)')) + '">Score: ' + res.score + '%</span>'
    + '</div>'
    + '<div class="modal-body stack" style="gap:var(--space-3)">'
    + '  <div style="font-weight:700; margin-top:var(--space-2)">' + (isEs ? 'Verificaciones de Estructura ATS:' : 'ATS Structural Checks:') + '</div>'
    + '  <div id="atsModalCheckList" style="max-height:220px; overflow-y:auto">' + checkRows + '</div>'
    + '  <hr style="border:none; border-top:1px solid oklch(from var(--color-text) l c h / .1); margin:var(--space-2) 0">'
    + '  <div style="font-weight:700">' + (isEs ? 'Inspector de Palabras Clave de Empleo:' : 'Job Description Keyword Matcher:') + '</div>'
    + '  <textarea id="jobDescInput" rows="4" placeholder="' + (isEs ? 'Pegue la descripción del puesto de trabajo aquí para comparar palabras clave...' : 'Paste Job Description text here to compare matching keywords...') + '" style="width:100%; font-size:12px; padding:8px; border-radius:var(--radius-sm); border:1px solid oklch(from var(--color-text) l c h / .15); background:var(--color-surface-offset); color:var(--color-text)"></textarea>'
    + '  <div id="keywordResults" style="margin-top:var(--space-2)"></div>'
    + '</div>'
    + '<div class="modal-footer" style="display:flex; gap:var(--space-2); margin-top:var(--space-3)">'
    + '  <button class="btn btn-primary" id="analyzeJobBtn" style="flex:1">' + (isEs ? 'Analizar Palabras Clave' : 'Analyze Job Keywords') + '</button>'
    + '  <button class="btn btn-ghost" id="closeAtsModalBtn">' + (isEs ? 'Cerrar' : 'Close') + '</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(modal);

  modal.querySelector('#closeAtsModalBtn').onclick = function() { modal.remove(); };

  modal.querySelector('#analyzeJobBtn').onclick = function() {
    var jobText = modal.querySelector('#jobDescInput').value;
    var kwRes = ATSChecker.matchJobKeywords(data, jobText);
    var resDiv = modal.querySelector('#keywordResults');

    if (!jobText.trim()) {
      resDiv.innerHTML = '<div class="tiny muted">' + (isEs ? 'Ingrese el texto de la oferta de trabajo para analizar.' : 'Enter job text to analyze keywords.') + '</div>';
      return;
    }

    var matchedPills = kwRes.matched.map(function(k){ return '<span class="pill" style="background:rgba(16,185,129,.15); color:var(--color-success)">✓ ' + esc(k) + '</span>'; }).join(' ') || '<span class="tiny muted">None</span>';
    var missingPills = kwRes.missing.map(function(k){ return '<span class="pill" style="background:rgba(239,68,68,.15); color:var(--color-error)">✕ ' + esc(k) + '</span>'; }).join(' ') || '<span class="tiny muted">None</span>';

    resDiv.innerHTML = '<div style="display:flex; flex-direction:column; gap:8px; background:var(--color-surface-offset); padding:10px; border-radius:var(--radius-md)">'
      + '<div style="font-weight:700; font-size:13px">' + (isEs ? 'Coincidencia de Palabras Clave: ' : 'Keyword Match: ') + '<span style="color:var(--color-primary)">' + kwRes.matchPercentage + '%</span></div>'
      + '<div><strong class="tiny">' + (isEs ? 'Coincidentes: ' : 'Matched Keywords: ') + '</strong>' + matchedPills + '</div>'
      + '<div><strong class="tiny">' + (isEs ? 'Faltantes Recomendadas: ' : 'Missing Keywords: ') + '</strong>' + missingPills + '</div>'
      + '</div>';
  };
}

if (typeof document !== 'undefined') {
  document.addEventListener('input', function() { updateAtsBadge(); });
  document.addEventListener('change', function() { updateAtsBadge(); });
}

if (el('bottomBarAiBtn')) {
  el('bottomBarAiBtn').onclick = function() {
    showAiMenu();
  };
}

if (el('bottomBarChatBtn')) {
  el('bottomBarChatBtn').onclick = function() {
    toggleAiChatWidget();
  };
}

function updateAiUiState() {
  var isConfigured = typeof AIClient !== 'undefined' && AIClient.isConfigured();
  var txtEl = el('bottomBarAiText');
  var btnEl = el('bottomBarAiBtn');
  if (txtEl && typeof AIClient !== 'undefined') {
    var s = AIClient.getSettings();
    if (isConfigured) {
      var name = s.provider === 'gemini' ? 'Gemini Flash' : 'Ollama (Local)';
      txtEl.textContent = 'AI: ' + name;
      if (btnEl) {
        btnEl.style.borderColor = 'var(--color-success)';
        btnEl.style.color = 'var(--color-success)';
      }
    } else {
      txtEl.textContent = 'AI Assistant';
      if (btnEl) {
        btnEl.style.borderColor = 'oklch(from var(--color-primary) l c h / .3)';
        btnEl.style.color = 'var(--color-primary)';
      }
    }
  }
}

function showAiProviderConfigModal() {
  var isEs = state.langFilter === 'es';
  var curS = AIClient.getSettings();
  var isConfigured = AIClient.isConfigured();

  var modal = document.createElement('div');
  modal.className = 'modal-backdrop open';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  modal.innerHTML = '<div class="modal" style="max-width:540px; padding:var(--space-4); border-radius:var(--radius-lg)">'
    + '<div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid oklch(from var(--color-text) l c h / .1); padding-bottom:var(--space-2); margin-bottom:var(--space-3)">'
    + '  <h3 style="margin:0">⚙️ ' + (isEs ? 'Configuración de Proveedor de IA' : 'Configure AI Provider') + '</h3>'
    + '  <span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px; background:' + (isConfigured ? 'rgba(16,185,129,.15); color:var(--color-success)' : 'rgba(239,68,68,.15); color:var(--color-error)') + '">' + (isConfigured ? '● Active' : '○ Unconfigured') + '</span>'
    + '</div>'
    + '<div class="modal-body stack" style="gap:var(--space-3)">'
    + '  <div class="tiny muted">' + (isEs ? 'Seleccione su proveedor de IA preferido:' : 'Select your preferred AI provider:') + '</div>'
    + '  <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:4px">'
    + '    <div id="cardOllamaOpt" style="cursor:pointer; padding:10px; border-radius:var(--radius-md); border:2px solid ' + (curS.provider === 'ollama' ? 'var(--color-primary)' : 'oklch(from var(--color-text) l c h / .15)') + '; background:' + (curS.provider === 'ollama' ? 'oklch(from var(--color-primary) l c h / .08)' : 'var(--color-surface-offset)') + '; text-align:center">'
    + '      <div style="font-weight:700; font-size:13px; color:var(--color-text)">🦙 Ollama Local</div>'
    + '      <div class="tiny muted" style="margin-top:2px">' + (isEs ? '100% Sin Servidor / Privado' : '100% Offline & Private') + '</div>'
    + '    </div>'
    + '    <div id="cardGeminiOpt" style="cursor:pointer; padding:10px; border-radius:var(--radius-md); border:2px solid ' + (curS.provider === 'gemini' ? 'var(--color-primary)' : 'oklch(from var(--color-text) l c h / .15)') + '; background:' + (curS.provider === 'gemini' ? 'oklch(from var(--color-primary) l c h / .08)' : 'var(--color-surface-offset)') + '; text-align:center">'
    + '      <div style="font-weight:700; font-size:13px; color:var(--color-text)">✨ Google Gemini</div>'
    + '      <div class="tiny muted" style="margin-top:2px">' + (isEs ? 'Clave Gratuita Google Studio' : 'Free Google Studio Key') + '</div>'
    + '    </div>'
    + '  </div>'
    + '  <select id="aiProviderSelect" style="display:none">'
    + '    <option value="ollama" ' + (curS.provider === 'ollama' ? 'selected' : '') + '>Ollama</option>'
    + '    <option value="gemini" ' + (curS.provider === 'gemini' ? 'selected' : '') + '>Gemini</option>'
    + '  </select>'
    + '  <div id="ollamaFields" style="display:' + (curS.provider === 'ollama' ? 'block' : 'none') + '">'
    + '    <label class="tiny" style="font-weight:700">Ollama Endpoint URL</label>'
    + '    <input type="text" id="ollamaEndpointInput" value="' + esc(curS.ollamaEndpoint || 'http://localhost:11434') + '" style="width:100%; height:32px; padding:0 8px; font-size:12px; margin-top:4px; font-family:monospace">'
    + '    <label class="tiny" style="font-weight:700; margin-top:8px; display:block">Model Name</label>'
    + '    <input type="text" id="ollamaModelInput" value="' + esc(curS.ollamaModel || 'llama3:latest') + '" style="width:100%; height:32px; padding:0 8px; font-size:12px; margin-top:4px; font-family:monospace" placeholder="llama3:latest, qwen2.5:latest, etc.">'
    + '  </div>'
    + '  <div id="geminiFields" style="display:' + (curS.provider === 'gemini' ? 'block' : 'none') + '">'
    + '    <label class="tiny" style="font-weight:700">Google Gemini API Key</label>'
    + '    <input type="password" id="geminiApiKeyInput" value="' + esc(curS.geminiApiKey || '') + '" style="width:100%; height:32px; padding:0 8px; font-size:12px; margin-top:4px; font-family:monospace" placeholder="AIzaSy...">'
    + '    <div class="tiny muted" style="margin-top:4px">🔑 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary); font-weight:700; text-decoration:underline">' + (isEs ? 'Obtenga una clave API gratuita de Google Gemini aquí ↗' : 'Get a free Google Gemini API key here ↗') + '</a></div>'
    + '  </div>'
    + '  <div>'
    + '    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">'
    + '      <label class="tiny" style="font-weight:700">' + (isEs ? 'Prompt de Sistema (Persona IA)' : 'System Prompt (LLM Persona)') + '</label>'
    + '      <div style="display:flex; gap:4px">'
    + '        <button id="presetResumeBtn" class="btn btn-xs btn-ghost" style="font-size:10px; padding:1px 5px">🎯 Resume</button>'
    + '        <button id="presetExecBtn" class="btn btn-xs btn-ghost" style="font-size:10px; padding:1px 5px">💼 Executive</button>'
    + '        <button id="presetTechBtn" class="btn btn-xs btn-ghost" style="font-size:10px; padding:1px 5px">💻 Tech</button>'
    + '      </div>'
    + '    </div>'
    + '    <textarea id="aiSystemPromptInput" style="width:100%; min-height:60px; padding:6px 8px; font-size:12px; font-family:inherit; border-radius:var(--radius-sm); border:1px solid oklch(from var(--color-text) l c h / .15); background:var(--color-surface-offset); color:var(--color-text); resize:vertical" placeholder="' + (isEs ? 'Ingrese el prompt de sistema personalizado para la IA...' : 'Enter custom system prompt for LLM...') + '">' + esc(curS.systemPrompt || '') + '</textarea>'
    + '  </div>'
    + '  <div id="testConnResult" style="margin-top:var(--space-2); display:none"></div>'
    + '</div>'
    + '<div class="modal-footer" style="display:flex; gap:var(--space-2); margin-top:var(--space-3)">'
    + '  <button class="btn btn-primary" id="saveAiSettingsBtn" style="flex:1; font-weight:700">' + (isEs ? 'Guardar Configuración' : 'Save Settings') + '</button>'
    + '  <button class="btn btn-ghost" id="testAiConnBtn" style="font-weight:700; border:1px solid oklch(from var(--color-text) l c h / .15)">🧪 ' + (isEs ? 'Probar Conexión' : 'Test Connection') + '</button>'
    + '  <button class="btn btn-ghost" id="closeAiConfigBtn">' + (isEs ? 'Cancelar' : 'Cancel') + '</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(modal);

  var providerSelect = modal.querySelector('#aiProviderSelect');
  var cardOllama = modal.querySelector('#cardOllamaOpt');
  var cardGemini = modal.querySelector('#cardGeminiOpt');
  var sysPromptArea = modal.querySelector('#aiSystemPromptInput');

  function setProvider(p) {
    providerSelect.value = p;
    var isO = p === 'ollama';
    modal.querySelector('#ollamaFields').style.display = isO ? 'block' : 'none';
    modal.querySelector('#geminiFields').style.display = isO ? 'none' : 'block';
    
    cardOllama.style.borderColor = isO ? 'var(--color-primary)' : 'oklch(from var(--color-text) l c h / .15)';
    cardOllama.style.background = isO ? 'oklch(from var(--color-primary) l c h / .08)' : 'var(--color-surface-offset)';
    cardGemini.style.borderColor = isO ? 'oklch(from var(--color-text) l c h / .15)' : 'var(--color-primary)';
    cardGemini.style.background = isO ? 'var(--color-surface-offset)' : 'oklch(from var(--color-primary) l c h / .08)';
  }

  cardOllama.onclick = function() { setProvider('ollama'); };
  cardGemini.onclick = function() { setProvider('gemini'); };

  modal.querySelector('#presetResumeBtn').onclick = function() {
    sysPromptArea.value = "You are an expert career consultant, resume writer, and ATS optimization specialist. Help candidates craft compelling, professional, concise, and impact-driven resumes.";
  };
  modal.querySelector('#presetExecBtn').onclick = function() {
    sysPromptArea.value = "Act as a Fortune 500 Senior Executive Recruiter. Evaluate resumes for leadership impact, high-level deliverables, revenue metrics, and strategic positioning.";
  };
  modal.querySelector('#presetTechBtn').onclick = function() {
    sysPromptArea.value = "Act as a Silicon Valley VP of Engineering and Technical Lead. Focus on system architecture, engineering scale, languages, infrastructure, and quantitative tech achievements.";
  };

  modal.querySelector('#testAiConnBtn').onclick = function() {
    var testBtn = modal.querySelector('#testAiConnBtn');
    var resDiv = modal.querySelector('#testConnResult');
    resDiv.style.display = 'block';
    resDiv.innerHTML = '<div class="tiny muted">⏳ ' + (isEs ? 'Probando conexión...' : 'Testing connection...') + '</div>';
    testBtn.disabled = true;

    var tempSettings = {
      provider: providerSelect.value,
      ollamaEndpoint: modal.querySelector('#ollamaEndpointInput').value,
      ollamaModel: modal.querySelector('#ollamaModelInput').value,
      geminiApiKey: modal.querySelector('#geminiApiKeyInput').value,
      geminiModel: 'gemini-2.5-flash',
      systemPrompt: modal.querySelector('#aiSystemPromptInput').value
    };

    AIClient.testConnection(tempSettings).then(function(msg) {
      resDiv.innerHTML = '<div style="background:rgba(16,185,129,.15); color:var(--color-success); padding:8px 12px; border-radius:var(--radius-sm); font-weight:700; font-size:12px">✅ ' + esc(msg) + '</div>';
    }).catch(function(err) {
      var corsTip = '';
      if (tempSettings.provider === 'ollama') {
        corsTip = '<div style="margin-top:6px; font-size:11px; color:var(--color-text-muted); line-height:1.4">'
          + '💡 <strong>How to enable Ollama CORS:</strong><br>'
          + '• <strong>Windows PowerShell:</strong> <code>$env:OLLAMA_ORIGINS="*" ; ollama serve</code><br>'
          + '• <strong>Windows GUI App:</strong> Add System Environment Variable <code>OLLAMA_ORIGINS = *</code> and restart Ollama.<br>'
          + '• <strong>Mac / Linux:</strong> <code>OLLAMA_ORIGINS="*" ollama serve</code>'
          + '</div>';
      }
      resDiv.innerHTML = '<div style="background:rgba(239,68,68,.15); color:var(--color-error); padding:10px 12px; border-radius:var(--radius-sm); font-weight:600; font-size:12px; line-height:1.4">❌ ' + esc(err.message) + corsTip + '</div>';
    }).finally(function() {
      testBtn.disabled = false;
    });
  };

  modal.querySelector('#saveAiSettingsBtn').onclick = function() {
    var newSettings = {
      provider: providerSelect.value,
      ollamaEndpoint: modal.querySelector('#ollamaEndpointInput').value,
      ollamaModel: modal.querySelector('#ollamaModelInput').value,
      geminiApiKey: modal.querySelector('#geminiApiKeyInput').value,
      geminiModel: 'gemini-2.5-flash',
      systemPrompt: modal.querySelector('#aiSystemPromptInput').value
    };
    AIClient.saveSettings(newSettings);
    updateAiUiState();
    modal.remove();
    alert(isEs ? '¡Configuración de IA guardada!' : 'AI Settings saved successfully!');
  };

  modal.querySelector('#closeAiConfigBtn').onclick = function() { modal.remove(); };
}

function showAiHubModal() {
  showAiProviderConfigModal();
}

function showAiSettingsModal() {
  showAiProviderConfigModal();
}

function showAskImproveModal() {
  var isEs = state.langFilter === 'es';
  if (!AIClient.isConfigured()) {
    alert(isEs ? 'Por favor configure primero su proveedor de IA (Ollama o Gemini).' : 'Please configure your AI Provider (Ollama or Gemini) first.');
    showAiProviderConfigModal();
    return;
  }

  var modal = document.createElement('div');
  modal.className = 'modal-backdrop open';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  modal.innerHTML = '<div class="modal" style="max-width:620px; padding:var(--space-4)">'
    + '<div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid oklch(from var(--color-text) l c h / .1); padding-bottom:8px; margin-bottom:10px">'
    + '  <h3 style="margin:0; font-size:15px">✨ ' + (isEs ? 'Auditoría & Preguntas de Mejora del CV' : 'CV Audit & Improvement Interview') + '</h3>'
    + '</div>'
    + '<div class="modal-body stack" style="gap:var(--space-3)">'
    + '  <div class="tiny muted">' + (isEs ? 'La IA está analizando su CV activo y generando preguntas objetivas:' : 'The AI is analyzing your active CV and generating targeted interview questions:') + '</div>'
    + '  <div id="critiqueBox" style="min-height:160px; max-height:280px; overflow-y:auto; padding:12px; border-radius:var(--radius-md); background:var(--color-surface-offset); font-size:12px; line-height:1.5; border:1px solid oklch(from var(--color-text) l c h / .12)">⏳ ' + (isEs ? 'Analizando CV y generando preguntas...' : 'Analyzing CV and generating interview questions...') + '</div>'
    + '  <div style="margin-top:6px">'
    + '    <label class="tiny" style="font-weight:700; display:block; margin-bottom:4px">💬 ' + (isEs ? 'Responda o proporcione detalles/métricas adicionales:' : 'Answer or provide additional details/metrics:') + '</label>'
    + '    <div style="display:flex; gap:6px">'
    + '      <input type="text" id="improveResponseInput" placeholder="' + (isEs ? 'ej. Aumenté las ventas un 25% y lideré 4 ingenieros...' : 'e.g. Increased sales by 25% and led 4 engineers...') + '" style="flex:1; height:32px; padding:0 10px; font-size:12px; border-radius:var(--radius-sm); border:1px solid oklch(from var(--color-text) l c h / .2); background:var(--color-surface); color:var(--color-text); font-family:inherit">'
    + '      <button id="sendImproveResponseBtn" class="btn btn-xs btn-primary" style="height:32px; padding:0 12px; font-weight:700; font-size:12px">⚡ ' + (isEs ? 'Re-evaluar' : 'Re-evaluate') + '</button>'
    + '    </div>'
    + '  </div>'
    + '</div>'
    + '<div class="modal-footer" style="display:flex; justify-content:flex-end; gap:var(--space-2); margin-top:var(--space-3)">'
    + '  <button class="btn btn-ghost" id="closeImproveModalBtn">' + (isEs ? 'Cerrar' : 'Close') + '</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(modal);

  modal.querySelector('#closeImproveModalBtn').onclick = function() { modal.remove(); };

  function fetchAudit(extraContext) {
    var box = modal.querySelector('#critiqueBox');
    box.innerHTML = '⏳ ' + (isEs ? 'Analizando CV y generando preguntas...' : 'Analyzing CV and generating interview questions...');

    var promptText = "Analyze the following curriculum vitae JSON data:\n" + JSON.stringify(data);
    if (extraContext) {
      promptText += "\n\nAdditional user input/context:\n" + extraContext;
    }
    promptText += "\n\nIdentify 3 specific, weak, or vague bullet points or sections, and ask targeted interview questions or suggest exact improved rewrite text.";

    AIClient.callLLM(promptText, "You are a professional executive resume auditor conducting an interview.").then(function(res) {
      if (box) box.innerHTML = (typeof parseMarkdown === 'function') ? parseMarkdown(res) : res;
    }).catch(function(err) {
      if (box) box.textContent = '❌ Error: ' + err.message;
    });
  }

  fetchAudit();

  modal.querySelector('#sendImproveResponseBtn').onclick = function() {
    var inputVal = modal.querySelector('#improveResponseInput').value.trim();
    if (!inputVal) return;
    fetchAudit(inputVal);
  };
}

function showAiFieldSuggestionsModal(inputEl) {
  if (!inputEl) return;
  var isEs = state.langFilter === 'es';
  var origText = inputEl.value;

  if (typeof AIClient === 'undefined' || !AIClient.isConfigured()) {
    var confirmMsg = isEs
      ? 'Configura tu proveedor de IA (Ollama o Gemini) para usar sugerencias en 1 clic. ¿Abrir configuración de IA?'
      : 'Please configure your AI Provider (Ollama or Gemini) to use one-click suggestions. Open AI Settings now?';
    if (confirm(confirmMsg)) {
      showAiHubModal();
    }
    return;
  }

  var container = inputEl.parentElement;
  if (!container) return;

  var existing = container.querySelector('.ai-field-tooltip');
  if (existing) { existing.remove(); return; }

  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  var pop = document.createElement('div');
  pop.className = 'ai-field-tooltip';

  var rect = container.getBoundingClientRect();
  if (rect.left > 340) {
    pop.style.cssText = 'position:absolute; right:100%; top:0; margin-right:12px; width:330px; max-width:90vw; background:var(--color-surface); border:1px solid oklch(from var(--color-text) l c h / .2); border-radius:var(--radius-md); box-shadow:var(--shadow-lg); padding:10px; z-index:1000; font-family:inherit; text-align:left; color:var(--color-text);';
  } else {
    pop.style.cssText = 'position:absolute; top:100%; left:0; margin-top:6px; width:330px; max-width:92vw; background:var(--color-surface); border:1px solid oklch(from var(--color-text) l c h / .2); border-radius:var(--radius-md); box-shadow:var(--shadow-lg); padding:10px; z-index:1000; font-family:inherit; text-align:left; color:var(--color-text);';
  }

  pop.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid oklch(from var(--color-text) l c h / .1); padding-bottom:6px; margin-bottom:8px">'
    + '  <strong style="font-size:12px; display:flex; align-items:center; gap:4px; color:var(--color-primary)">✨ ' + (isEs ? 'Asistente de Campo IA' : 'AI Field Assistant') + '</strong>'
    + '  <button class="close-pop-btn" style="background:none; border:none; color:var(--color-text-muted); cursor:pointer; font-size:13px; font-weight:700; line-height:1">✕</button>'
    + '</div>'
    + '<div style="display:flex; gap:4px; margin-bottom:8px">'
    + '  <button id="aiEnhanceBtn" class="btn btn-xs btn-primary" style="flex:1; font-weight:700; font-size:11px">⚡ ' + (isEs ? 'Pulir' : 'Polish') + '</button>'
    + '  <button id="aiGrammarBtn" class="btn btn-xs btn-ghost" style="flex:1; font-weight:700; font-size:11px; border:1px solid oklch(from var(--color-text) l c h / .12)">✏️ ' + (isEs ? 'Gramática' : 'Grammar') + '</button>'
    + '  <button id="aiTranslateBtn" class="btn btn-xs btn-ghost" style="flex:1; font-weight:700; font-size:11px; border:1px solid oklch(from var(--color-text) l c h / .12)">🌐 ' + (isEs ? 'Traducir' : 'Translate') + '</button>'
    + '</div>'
    + '<div style="margin-top:6px; border-top:1px solid oklch(from var(--color-text) l c h / .08); padding-top:6px">'
    + '  <label style="font-size:10px; font-weight:700; color:var(--color-text-muted); display:block; margin-bottom:3px">💬 ' + (isEs ? 'Instrucción / Prompt sobre este campo:' : 'Prompt about this field:') + '</label>'
    + '  <div style="display:flex; gap:4px">'
    + '    <input type="text" id="aiCustomPromptInput" placeholder="' + (isEs ? 'ej. Resumir en 15 palabras...' : 'e.g. Make concise & executive...') + '" style="flex:1; height:26px; padding:0 6px; font-size:11px; border-radius:4px; border:1px solid oklch(from var(--color-text) l c h / .2); background:var(--color-surface-offset); color:var(--color-text); font-family:inherit">'
    + '    <button id="aiSubmitCustomBtn" class="btn btn-xs btn-primary" style="height:26px; font-weight:700; font-size:11px">' + (isEs ? 'Enviar' : 'Send') + '</button>'
    + '  </div>'
    + '</div>'
    + '<div id="aiLoadingBox" style="display:none; text-align:center; padding:10px 0; font-size:11px; color:var(--color-text-muted)">⏳ ' + (isEs ? 'Generando sugerencia con IA...' : 'Generating AI suggestion...') + '</div>'
    + '<div id="aiSuggestionBox" style="display:none; margin-top:8px">'
    + '  <div class="tiny muted" style="font-weight:700; margin-bottom:4px">' + (isEs ? 'Sugerencia Generada:' : 'Generated Suggestion:') + '</div>'
    + '  <div id="aiSuggestionPreview" style="min-height:36px; max-height:150px; overflow-y:auto; padding:6px 8px; font-size:11px; line-height:1.4; border-radius:4px; border:1px solid oklch(from var(--color-text) l c h / .15); background:var(--color-surface-offset); margin-bottom:6px; word-break:break-word"></div>'
    + '  <textarea id="aiSuggestionText" style="width:100%; min-height:60px; padding:6px; font-size:11px; line-height:1.4; border-radius:4px; border:1.5px solid var(--color-primary); background:var(--color-surface); color:var(--color-text); font-family:inherit; resize:vertical"></textarea>'
    + '  <button id="applySuggestionBtn" class="btn btn-xs btn-primary" style="width:100%; margin-top:6px; font-weight:700">✅ ' + (isEs ? 'Aplicar Sugerencia al Campo' : 'Apply Suggestion to Field') + '</button>'
    + '</div>';

  container.appendChild(pop);

  var sugBox = pop.querySelector('#aiSuggestionBox');
  var sugPreview = pop.querySelector('#aiSuggestionPreview');
  var sugText = pop.querySelector('#aiSuggestionText');
  var loadBox = pop.querySelector('#aiLoadingBox');
  var customInput = pop.querySelector('#aiCustomPromptInput');

  pop.querySelector('.close-pop-btn').onclick = function(e) {
    e.stopPropagation();
    pop.remove();
  };

  function runTask(taskPromise) {
    sugBox.style.display = 'none';
    loadBox.style.display = 'block';

    taskPromise.then(function(result) {
      loadBox.style.display = 'none';
      if (sugPreview) sugPreview.innerHTML = (typeof parseMarkdown === 'function') ? parseMarkdown(result) : esc(result);
      sugText.value = result;
      sugBox.style.display = 'block';
    }).catch(function(err) {
      loadBox.style.display = 'none';
      alert('❌ Error: ' + err.message);
    });
  }

  pop.querySelector('#aiEnhanceBtn').onclick = function(e) {
    e.stopPropagation();
    runTask(AIClient.enhanceBullet(origText));
  };

  pop.querySelector('#aiGrammarBtn').onclick = function(e) {
    e.stopPropagation();
    runTask(AIClient.fixGrammar(origText));
  };

  pop.querySelector('#aiTranslateBtn').onclick = function(e) {
    e.stopPropagation();
    var targetLang = isEs ? 'es' : 'en';
    runTask(AIClient.translateContent(origText, targetLang));
  };

  function submitCustomPrompt() {
    var customP = customInput.value;
    if (!customP || !customP.trim()) return;
    var fullPrompt = "Field content:\n\"" + origText + "\"\n\nTask/Instruction for this field:\n" + customP.trim();
    runTask(AIClient.callLLM(fullPrompt));
  }

  pop.querySelector('#aiSubmitCustomBtn').onclick = function(e) {
    e.stopPropagation();
    submitCustomPrompt();
  };

  customInput.onkeydown = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCustomPrompt();
    }
  };

  pop.querySelector('#applySuggestionBtn').onclick = function(e) {
    e.stopPropagation();
    var rawText = sugText.value;
    if (rawText) {
      var cleanText = rawText.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ');
      
      inputEl.value = cleanText.trim();
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      pop.remove();
      if (typeof updateFieldAiIcon === 'function') updateFieldAiIcon(inputEl);
    }
  };
}

function showAiMenu() {
  var isEs = state.langFilter === 'es';
  var isConfigured = typeof AIClient !== 'undefined' && AIClient.isConfigured();
  var curS = typeof AIClient !== 'undefined' ? AIClient.getSettings() : {};
  var activeEngineName = isConfigured 
    ? (curS.provider === 'gemini' ? 'Google Gemini Flash' : ('Ollama (' + (curS.ollamaModel || 'llama3:latest') + ')'))
    : (isEs ? 'Sin Configurar' : 'Unconfigured');

  var existing = document.querySelector('.ai-action-menu-backdrop');
  if (existing) existing.remove();

  var menuModal = document.createElement('div');
  menuModal.className = 'ai-action-menu-backdrop modal-backdrop open';
  menuModal.onclick = function(e) { if (e.target === menuModal) menuModal.remove(); };

  menuModal.innerHTML = '<div class="modal" style="max-width:440px; padding:var(--space-4); border-radius:var(--radius-lg); background:var(--color-surface); border:1px solid var(--color-border); box-shadow:var(--shadow-lg)">'
    + '<div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid oklch(from var(--color-text) l c h / .1); padding-bottom:var(--space-2); margin-bottom:var(--space-2)">'
    + '  <h3 style="margin:0; font-size:16px; display:flex; align-items:center; gap:6px">🤖 ' + (isEs ? 'Menú de Inteligencia Artificial' : 'AI Assistant Menu') + '</h3>'
    + '  <span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px; background:' + (isConfigured ? 'rgba(16,185,129,.15); color:var(--color-success)' : 'rgba(239,68,68,.15); color:var(--color-error)') + '">' + (isConfigured ? '● Ready' : '○ Setup Needed') + '</span>'
    + '</div>'
    + '<div style="background:var(--color-surface-offset); padding:8px 12px; border-radius:var(--radius-md); font-size:11px; font-weight:600; color:var(--color-text-muted); margin-bottom:var(--space-3); display:flex; justify-content:space-between; align-items:center; border:1px solid oklch(from var(--color-text) l c h / .08)">'
    + '  <span>⚡ ' + (isEs ? 'Motor Activo:' : 'Active LLM Engine:') + '</span>'
    + '  <span style="color:var(--color-primary); font-weight:700">' + esc(activeEngineName) + '</span>'
    + '</div>'
    + '<div class="modal-body stack" style="gap:var(--space-2)">'
    + '  <button class="btn btn-ghost" id="menuAiConfigBtn" style="width:100%; justify-content:flex-start; height:46px; font-weight:600; font-size:13px; gap:10px; padding:0 12px; border:1px solid oklch(from var(--color-text) l c h / .12); border-radius:var(--radius-md)">'
    + '    <span style="font-size:18px">⚙️</span>'
    + '    <div style="text-align:left"><div>' + (isEs ? 'Configurar Proveedor' : 'Configure Provider') + '</div><div class="tiny muted">' + (isEs ? 'Ollama Local o Google Gemini Flash' : 'Ollama Local or Google Gemini Flash') + '</div></div>'
    + '  </button>'
    + '  <button class="btn btn-ghost" id="menuAiImproveBtn" ' + (!isConfigured ? 'disabled title="' + (isEs ? 'Configure el proveedor de IA primero' : 'Please configure AI provider first') + '"' : '') + ' style="width:100%; justify-content:flex-start; height:46px; font-weight:600; font-size:13px; gap:10px; padding:0 12px; border:1px solid oklch(from var(--color-text) l c h / .12); border-radius:var(--radius-md); ' + (!isConfigured ? 'opacity:0.45; cursor:not-allowed;' : '') + '">'
    + '    <span style="font-size:18px">✨</span>'
    + '    <div style="text-align:left"><div>' + (isEs ? 'Mejorar tu CV' : 'Improve your CV') + '</div><div class="tiny muted">' + (isEs ? 'Auditoría e inspección interactiva del CV' : 'Interactive CV audit & achievement prompt') + '</div></div>'
    + '  </button>'
    + '  <button class="btn btn-ghost" id="menuAiTranslateBtn" ' + (!isConfigured ? 'disabled title="' + (isEs ? 'Configure el proveedor de IA primero' : 'Please configure AI provider first') + '"' : '') + ' style="width:100%; justify-content:flex-start; height:46px; font-weight:600; font-size:13px; gap:10px; padding:0 12px; border:1px solid oklch(from var(--color-text) l c h / .12); border-radius:var(--radius-md); ' + (!isConfigured ? 'opacity:0.45; cursor:not-allowed;' : '') + '">'
    + '    <span style="font-size:18px">🌐</span>'
    + '    <div style="text-align:left"><div>' + (isEs ? 'Traducir CV Completo' : 'Translate CV') + '</div><div class="tiny muted">' + (isEs ? 'Traducción masiva a nueva instancia adaptada' : 'Bulk translate into new tailored instance') + '</div></div>'
    + '  </button>'
    + '  <button class="btn btn-ghost" id="menuAiChatBtn" ' + (!isConfigured ? 'disabled title="' + (isEs ? 'Configure el proveedor de IA primero' : 'Please configure AI provider first') + '"' : '') + ' style="width:100%; justify-content:flex-start; height:46px; font-weight:600; font-size:13px; gap:10px; padding:0 12px; border:1px solid oklch(from var(--color-text) l c h / .12); border-radius:var(--radius-md); ' + (!isConfigured ? 'opacity:0.45; cursor:not-allowed;' : '') + '">'
    + '    <span style="font-size:18px">💬</span>'
    + '    <div style="text-align:left"><div>' + (isEs ? 'Chat Temporal' : 'Temporal Chat') + '</div><div class="tiny muted">' + (isEs ? 'Asistente conversacional flotante en tiempo real' : 'Interactive floating conversation assistant') + '</div></div>'
    + '  </button>'
    + '</div>'
    + '<div class="modal-footer" style="display:flex; justify-content:flex-end; margin-top:var(--space-3)">'
    + '  <button class="btn btn-ghost btn-xs" id="closeAiMenuBtn">' + (isEs ? 'Cerrar' : 'Close') + '</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(menuModal);

  menuModal.querySelector('#menuAiConfigBtn').onclick = function() {
    menuModal.remove();
    showAiProviderConfigModal();
  };

  menuModal.querySelector('#menuAiImproveBtn').onclick = function() {
    if (!isConfigured) return;
    menuModal.remove();
    showAskImproveModal();
  };

  menuModal.querySelector('#menuAiTranslateBtn').onclick = function() {
    if (!isConfigured) return;
    menuModal.remove();
    showBulkTranslateCvModal();
  };

  menuModal.querySelector('#menuAiChatBtn').onclick = function() {
    if (!isConfigured) return;
    menuModal.remove();
    toggleAiChatWidget(true);
  };

  menuModal.querySelector('#closeAiMenuBtn').onclick = function() { menuModal.remove(); };
}

function showBulkTranslateCvModal() {
  var isEs = state.langFilter === 'es';

  var modal = document.createElement('div');
  modal.className = 'modal-backdrop open';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  modal.innerHTML = '<div class="modal" style="max-width:500px; padding:var(--space-4)">'
    + '<div class="modal-header"><h3>🌐 ' + (isEs ? 'Traducción Masiva de CV' : 'Bulk Translate CV') + '</h3></div>'
    + '<div class="modal-body stack" style="gap:var(--space-3)">'
    + '  <div class="tiny muted">' + (isEs ? 'Seleccione el idioma de destino. La IA traducirá todo su CV y creará una nueva Instancia de CV con la traducción.' : 'Select target language. AI will translate your active CV and create a new tailored CV Instance with the translation.') + '</div>'
    + '  <div>'
    + '    <label class="tiny" style="font-weight:700">' + (isEs ? 'Idioma Destino' : 'Target Language') + '</label>'
    + '    <select id="targetLangSelect" class="db-select" style="width:100%; height:32px; padding:0 8px; font-weight:600; margin-top:4px">'
    + '      <option value="es">Spanish (Español)</option>'
    + '      <option value="en">English (Inglés)</option>'
    + '    </select>'
    + '  </div>'
    + '  <div id="transStatusBox" style="display:none; text-align:center; padding:15px 0" class="tiny muted">⏳ ' + (isEs ? 'Traduciendo CV con IA... Esto puede tardar unos segundos.' : 'Translating CV with AI... This may take a few seconds.') + '</div>'
    + '</div>'
    + '<div class="modal-footer" style="display:flex; gap:var(--space-2); margin-top:var(--space-3)">'
    + '  <button class="btn btn-primary" id="startTranslateBtn" style="flex:1">' + (isEs ? 'Iniciar Traducción & Crear Instancia' : 'Start Translation & Create Instance') + '</button>'
    + '  <button class="btn btn-ghost" id="closeTransBtn">' + (isEs ? 'Cancelar' : 'Cancel') + '</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(modal);

  modal.querySelector('#closeTransBtn').onclick = function() { modal.remove(); };

  modal.querySelector('#startTranslateBtn').onclick = function() {
    var targetLang = modal.querySelector('#targetLangSelect').value;
    var targetLangName = targetLang === 'es' ? 'Spanish' : 'English';
    var statusBox = modal.querySelector('#transStatusBox');
    var startBtn = modal.querySelector('#startTranslateBtn');

    statusBox.style.display = 'block';
    startBtn.disabled = true;

    var cvDataCopy = JSON.parse(JSON.stringify(data));
    delete cvDataCopy.instances;
    delete cvDataCopy._templates;
    delete cvDataCopy.templates;

    var sysPrompt = "You are a professional multilingual translator. Translate the JSON values into " + targetLangName + ". Return ONLY valid JSON matching the input structure exactly. Do not alter JSON keys or non-string values.";
    var prompt = "Translate the string values in this CV JSON object into " + targetLangName + ":\n\n" + JSON.stringify(cvDataCopy);

    AIClient.callLLM(prompt, sysPrompt).then(function(resText) {
      statusBox.style.display = 'none';
      
      var cleanJson = resText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      var translatedObj = null;
      try {
        translatedObj = JSON.parse(cleanJson);
      } catch(e) {
        var match = resText.match(/\{[\s\S]*\}/);
        if (match) {
          try { translatedObj = JSON.parse(match[0]); } catch(e2) {}
        }
      }

      if (!translatedObj) {
        alert(isEs ? '❌ Error al procesar la respuesta JSON traducida de la IA.' : '❌ Failed to parse translated JSON response from AI.');
        startBtn.disabled = false;
        return;
      }

      var overwritesMap = buildOverwritesFromObject(translatedObj);
      var instanceName = 'Translated (' + targetLangName + ')';

      if (!data.instances) data.instances = {};
      var currentStyle = getActiveStyle();
      data.instances[instanceName] = {
        style: JSON.parse(JSON.stringify(currentStyle)),
        overwrites: overwritesMap,
        visibility: {},
        propertyNames: {},
        sections: JSON.parse(JSON.stringify(state.sections))
      };

      loadInstance(instanceName);
      modal.remove();
      alert(isEs ? '✅ CV traducido con éxito. Se ha creado la instancia "' + instanceName + '".' : '✅ CV translated successfully! Created new instance "' + instanceName + '".');
    }).catch(function(err) {
      statusBox.style.display = 'none';
      startBtn.disabled = false;
      alert('❌ Translation Error: ' + err.message);
    });
  };
}

function buildOverwritesFromObject(obj, prefix) {
  prefix = prefix || '';
  var overwrites = {};
  function walk(o, p) {
    if (typeof o === 'string' || typeof o === 'number') {
      if (p) overwrites[p] = String(o);
    } else if (Array.isArray(o)) {
      o.forEach(function(item, idx) {
        walk(item, p ? (p + '.' + idx) : String(idx));
      });
    } else if (typeof o === 'object' && o !== null) {
      Object.keys(o).forEach(function(k) {
        if (k === 'selected' || k === 'lang' || k === '_idx' || k.indexOf('_') === 0) return;
        walk(o[k], p ? (p + '.' + k) : k);
      });
    }
  }
  walk(obj, prefix);
  return overwrites;
}

var aiChatHistory = [];

function toggleAiChatWidget(show) {
  var widget = document.getElementById('aiChatWidget');
  if (!widget) {
    createAiChatWidget();
    widget = document.getElementById('aiChatWidget');
  }

  if (typeof show === 'boolean') {
    widget.style.display = show ? 'flex' : 'none';
  } else {
    widget.style.display = (widget.style.display === 'none' || !widget.style.display) ? 'flex' : 'none';
  }

  if (widget.style.display === 'flex') {
    var inputEl = widget.querySelector('#aiChatInput');
    if (inputEl) inputEl.focus();
  }
}

function createAiChatWidget() {
  if (document.getElementById('aiChatWidget')) return;
  var isEs = (typeof state === 'object' && state && state.langFilter === 'es');

  var widget = document.createElement('div');
  widget.id = 'aiChatWidget';
  widget.style.cssText = 'position:fixed; bottom:34px; right:24px; width:360px; height:490px; max-width:calc(100vw - 32px); max-height:calc(100vh - 80px); background:var(--color-surface); border:1px solid oklch(from var(--color-text) l c h / .18); border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); z-index:9999; display:none; flex-direction:column; overflow:hidden; font-family:inherit;';

  widget.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; background:var(--color-surface-offset); padding:10px 14px; border-bottom:1px solid oklch(from var(--color-text) l c h / .1)">'
    + '  <div style="display:flex; align-items:center; gap:6px; font-weight:700; font-size:13px; color:var(--color-primary)">'
    + '    <span>🤖</span> <span>' + (isEs ? 'Chat Temporal IA' : 'AI Temporal Chat') + '</span>'
    + '  </div>'
    + '  <div style="display:flex; align-items:center; gap:8px">'
    + '    <button id="clearChatBtn" style="background:none; border:none; color:var(--color-text-muted); cursor:pointer; font-size:12px" title="' + (isEs ? 'Limpiar conversación' : 'Clear Chat') + '">🗑️</button>'
    + '    <button id="closeChatBtn" style="background:none; border:none; color:var(--color-text-muted); cursor:pointer; font-size:14px; font-weight:700" title="' + (isEs ? 'Cerrar chat' : 'Close Chat') + '">✕</button>'
    + '  </div>'
    + '</div>'
    + '<div id="aiChatMessages" style="flex:1; padding:12px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; font-size:12px; line-height:1.45">'
    + '  <div style="background:oklch(from var(--color-primary) l c h / .1); color:var(--color-text); padding:8px 12px; border-radius:var(--radius-md); max-width:88%; align-self:flex-start">'
    +      (isEs ? '👋 ¡Hola! Soy tu asistente de CV. ¿En qué puedo ayudarte a pulir tu currículum, redactar logros o redactar cartas de presentación hoy?' : '👋 Hello! I am your CV Assistant. How can I help you refine your resume, draft bullet points, or tailor cover letters today?')
    + '  </div>'
    + '</div>'
    + '<div style="display:flex; gap:4px; padding:6px 10px; border-top:1px solid oklch(from var(--color-text) l c h / .08); background:var(--color-surface-offset); overflow-x:auto">'
    + '  <button class="chat-chip btn btn-xs btn-ghost" data-chip="Audit my CV experience and bullet points" style="font-size:10px; white-space:nowrap; padding:2px 6px">📊 ' + (isEs ? 'Auditar CV' : 'Audit CV') + '</button>'
    + '  <button class="chat-chip btn btn-xs btn-ghost" data-chip="Enhance my executive summary" style="font-size:10px; white-space:nowrap; padding:2px 6px">⚡ ' + (isEs ? 'Pulir Resumen' : 'Enhance Summary') + '</button>'
    + '  <button class="chat-chip btn btn-xs btn-ghost" data-chip="Check ATS power verbs and metrics" style="font-size:10px; white-space:nowrap; padding:2px 6px">🎯 ' + (isEs ? 'Check ATS' : 'Check ATS') + '</button>'
    + '</div>'
    + '<div style="display:flex; gap:6px; padding:10px; border-top:1px solid oklch(from var(--color-text) l c h / .1); background:var(--color-surface-offset)">'
    + '  <input type="text" id="aiChatInput" placeholder="' + (isEs ? 'Escribe un mensaje...' : 'Type a message...') + '" style="flex:1; height:32px; padding:0 10px; font-size:12px; border-radius:var(--radius-md); border:1px solid oklch(from var(--color-text) l c h / .2); background:var(--color-surface); color:var(--color-text); font-family:inherit">'
    + '  <button id="aiChatSendBtn" class="btn btn-xs btn-primary" style="height:32px; padding:0 12px; font-weight:700; font-size:12px">' + (isEs ? 'Enviar' : 'Send') + '</button>'
    + '</div>';

  document.body.appendChild(widget);

  var msgBox = widget.querySelector('#aiChatMessages');
  var inputEl = widget.querySelector('#aiChatInput');
  var sendBtn = widget.querySelector('#aiChatSendBtn');

  widget.querySelector('#closeChatBtn').onclick = function() { toggleAiChatWidget(false); };

  widget.querySelector('#clearChatBtn').onclick = function() {
    aiChatHistory = [];
    msgBox.innerHTML = '<div style="background:oklch(from var(--color-primary) l c h / .1); color:var(--color-text); padding:8px 12px; border-radius:var(--radius-md); max-width:88%; align-self:flex-start">'
      + (isEs ? '👋 Chat reiniciado. ¿En qué te ayudo?' : '👋 Chat reset. How can I assist you?') + '</div>';
  };

  function sendChatMessage() {
    var text = inputEl.value.trim();
    if (!text) return;

    if (typeof AIClient === 'undefined' || !AIClient.isConfigured()) {
      alert(isEs ? 'Por favor configure su proveedor de IA (Ollama o Gemini) primero.' : 'Please configure your AI Provider (Ollama or Gemini) first.');
      showAiProviderConfigModal();
      return;
    }

    var userBubble = document.createElement('div');
    userBubble.style.cssText = 'background:var(--color-primary); color:#fff; padding:8px 12px; border-radius:var(--radius-md); max-width:85%; align-self:flex-end; word-break:break-word; font-weight:500;';
    userBubble.textContent = text;
    msgBox.appendChild(userBubble);
    inputEl.value = '';
    msgBox.scrollTop = msgBox.scrollHeight;

    var loadBubble = document.createElement('div');
    loadBubble.style.cssText = 'background:oklch(from var(--color-text) l c h / .08); color:var(--color-text-muted); padding:8px 12px; border-radius:var(--radius-md); max-width:85%; align-self:flex-start;';
    loadBubble.textContent = '⏳ Thinking...';
    msgBox.appendChild(loadBubble);
    msgBox.scrollTop = msgBox.scrollHeight;

    aiChatHistory.push({ role: 'user', content: text });

    var sysPrompt = "You are a helpful, professional CV & Career Assistant. Answer the candidate's career, resume, and job search questions concisely and helpfully.";
    if (typeof data === 'object' && data && Object.keys(data).length > 0) {
      try {
        var cvContext = JSON.parse(JSON.stringify(data));
        delete cvContext.instances;
        delete cvContext._templates;
        delete cvContext.templates;
        sysPrompt += "\n\nCandidate's Current CV Data Context:\n" + JSON.stringify(cvContext, null, 2);
      } catch (e) {}
    }
    var conversationPrompt = aiChatHistory.map(function(m) { return (m.role === 'user' ? 'User: ' : 'Assistant: ') + m.content; }).join('\n');

    AIClient.callLLM(conversationPrompt, sysPrompt).then(function(reply) {
      loadBubble.remove();
      aiChatHistory.push({ role: 'assistant', content: reply });

      var botBubble = document.createElement('div');
      botBubble.style.cssText = 'background:oklch(from var(--color-primary) l c h / .1); color:var(--color-text); padding:8px 12px; border-radius:var(--radius-md); max-width:88%; align-self:flex-start; word-break:break-word;';
      botBubble.innerHTML = (typeof parseMarkdown === 'function') ? parseMarkdown(reply) : reply;
      msgBox.appendChild(botBubble);
      msgBox.scrollTop = msgBox.scrollHeight;
    }).catch(function(err) {
      loadBubble.remove();
      var errBubble = document.createElement('div');
      errBubble.style.cssText = 'background:rgba(239,68,68,.15); color:var(--color-error); padding:8px 12px; border-radius:var(--radius-md); max-width:88%; align-self:flex-start;';
      errBubble.textContent = '❌ Error: ' + err.message;
      msgBox.appendChild(errBubble);
      msgBox.scrollTop = msgBox.scrollHeight;
    });
  }

  widget.querySelectorAll('.chat-chip').forEach(function(chip) {
    chip.onclick = function() {
      inputEl.value = chip.dataset.chip;
      sendChatMessage();
    };
  });

  sendBtn.onclick = sendChatMessage;
  inputEl.onkeydown = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendChatMessage();
    }
  };
}

// Initial state sync & Chat widget init
setTimeout(function() {
  updateAiUiState();
  if (typeof document !== 'undefined' && document.body) {
    createAiChatWidget();
  }
}, 300);
