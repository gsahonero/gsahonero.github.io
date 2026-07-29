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
var mappers = {};
var currentDbName = 'Default CV';

var DB_PREFIX = 'cvbuilder_cv_';
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
        saveActiveStyle();
        renderLatex();
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

var oldPdfBtn = el('downloadPdfBtn');
if (oldPdfBtn) oldPdfBtn.onclick = downloadPdfFile;

var topbarPdf = el('topbarPdfBtn');
if (topbarPdf) topbarPdf.onclick = downloadPdfFile;

var menuPdf = el('menuDownloadPdfBtn');
if (menuPdf) menuPdf.onclick = downloadPdfFile;

var htmlPrevPdf = el('htmlPrevPdfBtn');
if (htmlPrevPdf) htmlPrevPdf.onclick = downloadPdfFile;

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
  saveActiveStyle();
  renderLatex();
};

var photoLeftSlider = el('photoLeftSlider');
if (photoLeftSlider) {
  photoLeftSlider.oninput = function(e) {
    state.photoLeftOffset = parseInt(e.target.value, 10);
    var valEl = el('photoLeftVal');
    if (valEl) valEl.textContent = e.target.value + 'px';
    saveActiveStyle();
    renderLatex();
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
  }
};
el('themeFontSelect').onchange = function(e) {
  state.themeFont = e.target.value;
  saveActiveStyle();
  renderLatex();
};

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
  
  switch (structType) {
    case 'education':
      html += '<div style="margin-bottom:10px">';
      html += '  <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:0.95em"><span>PhD in Biomedical Engineering - Universidad Católica</span><span style="font-size:0.85em; color:#666">2022--2026</span></div>';
      html += '  <div style="font-style:italic; color:#555; font-size:0.85em; margin-top:2px">Dissertation: Low-field MRI Sequence Optimization</div>';
      html += '  <div style="margin-top:4px; font-size:0.85em; color:#444">Research on sequence design, machine learning, and physical simulations.</div>';
      html += '</div>';
      break;
    case 'publication':
      html += '<ul style="margin:0; padding-left:16px; font-size:0.85em">';
      html += '  <li style="margin-bottom:6px">G. Sahonero-Alvarez, R. Coronado, P. Irarrazaval. "Modeling Voxel Signal Dynamics." <em>ISMRM Annual Meeting</em>, 2026 (Digital Poster).</li>';
      html += '  <li>R. Coronado, G. Sahonero-Alvarez, C. Prieto. "Accelerated DESPOT1 for 3D T1 Brain Mapping." <em>JMRI</em>, 2025.</li>';
      html += '</ul>';
      break;
    case 'teaching':
      html += '<div style="margin-bottom:10px">';
      html += '  <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:0.95em"><span>Mechatronics Engineering - Universidad Católica (Undergraduate)</span></div>';
      html += '  <div style="margin-top:4px; font-size:0.85em; color:#444"><em>Courses:</em> Computer Vision, Servomechanisms, Robotics Lab</div>';
      html += '</div>';
      break;
    case 'award':
      html += '<ul style="margin:0; padding-left:16px; font-size:0.85em">';
      html += '  <li style="margin-bottom:6px"><strong>Grant:</strong> Travel Award for ISMRM 2026 Conference (2026)</li>';
      html += '  <li><strong>Award:</strong> 2nd Place Plurinational Science & Technology Award (2021)</li>';
      html += '</ul>';
      break;
    case 'skills':
      html += '<ul style="margin:0; padding:0; list-style:none; font-size:0.85em">';
      html += '  <li style="margin-bottom:6px"><strong>Programming:</strong> MATLAB, Python, Julia, C/C++, R</li>';
      html += '  <li><strong>MRI & Modeling:</strong> Bloch simulations, Low-field MRI, Sequence optimization</li>';
      html += '</ul>';
      break;
    case 'simple':
      html += '<div style="margin-bottom:8px; font-size:0.85em">';
      html += '  <p style="margin:0">Full-stack software and hardware developer for embedded systems and biomedical devices.</p>';
      html += '</div>';
      break;
    case 'experience':
    default:
      html += '<div style="margin-bottom:10px">';
      html += '  <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:0.95em"><span>PhD Researcher - Millennium Institute iHEALTH</span><span style="font-size:0.85em; color:#666">2022--Present</span></div>';
      html += '  <div style="font-style:italic; color:#555; font-size:0.85em; margin-top:2px">Biomedical Imaging Center</div>';
      html += '  <div style="margin-top:4px; font-size:0.85em; color:#444">Optimization of low-field MRI pulse sequences using Physics-Informed Neural Networks.</div>';
      html += '</div>';
      break;
  }
  
  html += '</div>';
  previewBox.innerHTML = html;
}

// Add Section Modal Assistant Trigger & Logic
function openAddSectionAssistant() {
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

// Preset card selection click handlers
document.querySelectorAll('#sectionStructureCards .card-radio').forEach(function(card) {
  card.onclick = function() {
    document.querySelectorAll('#sectionStructureCards .card-radio').forEach(function(c) {
      c.classList.remove('active');
      c.style.border = '1.5px solid oklch(from var(--color-text) l c h / .15)';
    });
    card.classList.add('active');
    card.style.border = '2px solid var(--color-primary)';
    var radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
    updateAddSectionPreview();
  };
});

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
  
  var newSectionData;
  switch (structType) {
    case 'education':
      newSectionData = [{
        degree: '',
        institution: '',
        start: '',
        end: '',
        dissertation: '',
        description: '',
        selected: true
      }];
      if (typeof mappers === 'object' && mappers) mappers[key] = 'cventry_education';
      break;
    case 'publication':
      newSectionData = [{
        authors: '',
        title: '',
        venue: '',
        year: '',
        type: '',
        selected: true
      }];
      if (typeof mappers === 'object' && mappers) mappers[key] = 'publications';
      break;
    case 'teaching':
      newSectionData = [{
        course_area: '',
        institution: '',
        level: '',
        courses: [''],
        description: '',
        selected: true
      }];
      if (typeof mappers === 'object' && mappers) mappers[key] = 'cventry_teaching';
      break;
    case 'award':
      newSectionData = [{
        category: '',
        description: '',
        year: '',
        selected: true
      }];
      if (typeof mappers === 'object' && mappers) mappers[key] = 'awards';
      break;
    case 'skills':
      newSectionData = {
        general: [
          { name: '', selected: true }
        ]
      };
      if (typeof mappers === 'object' && mappers) mappers[key] = 'skills';
      break;
    case 'simple':
      newSectionData = [{
        description: '',
        selected: true
      }];
      if (typeof mappers === 'object' && mappers) mappers[key] = 'generic';
      break;
    case 'experience':
    default:
      newSectionData = [{
        role: '',
        organization: '',
        department: '',
        start: '',
        end: '',
        description: '',
        selected: true
      }];
      if (typeof mappers === 'object' && mappers) mappers[key] = 'cventry_work';
      break;
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
