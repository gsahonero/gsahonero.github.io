var DICTIONARY = {
  en: {
    "import_success": "Imported CV \"{name}\" successfully and saved to local storage.",
    "no_data": "No data loaded yet.",
    "invalid_json": "Invalid JSON: ",
    "preset_applied": "Active style preset applied: {name}",
    "confirm_delete_db": "Are you sure you want to delete database \"{name}\"?",
    "confirm_delete_style": "Are you sure you want to delete style preset \"{name}\"?",
    "confirm_delete_instance": "Are you sure you want to delete tailored instance override profiles for \"{name}\"?",
    "enter_style_name": "Enter name for the new style template:",
    "enter_db_name": "Enter new name for database \"{name}\":",
    "enter_style_rename": "Enter new name for style preset \"{name}\":",
    "enter_instance_rename": "Enter new name for instance \"{name}\":",
    "style_created": "Style template \"{name}\" created successfully.",
    "instance_saved": "Instance saved successfully.",
    "enter_cv_name": "Enter name for the new CV database:",
    "cv_exists": "A database named \"{name}\" already exists.",
    "confirm_override_master": "Are you sure you want to apply this override to the master database?",
    "no_overrides": "No overrides saved in this tailored instance yet.",
    "diagnostics_idle": "Idle. Click \"Run Tests\" to execute unit assertions.",
    "unsaved_changes": "Unsaved changes",
    "changes_saved": "Saved (Clean)"
  },
  es: {
    "import_success": "Base de datos de CV \"{name}\" importada con éxito y guardada en el almacenamiento local.",
    "no_data": "No se han cargado datos todavía.",
    "invalid_json": "JSON no válido: ",
    "preset_applied": "Estilo preestablecido activo aplicado: {name}",
    "confirm_delete_db": "¿Está seguro de que desea eliminar la base de datos \"{name}\"?",
    "confirm_delete_style": "¿Está seguro de que desea eliminar el estilo preestablecido \"{name}\"?",
    "confirm_delete_instance": "¿Está seguro de que desea eliminar los perfiles de instancia personalizados para \"{name}\"?",
    "enter_style_name": "Ingrese el nombre para la nueva plantilla de estilo:",
    "enter_db_name": "Ingrese el nuevo nombre para la base de datos \"{name}\":",
    "enter_style_rename": "Ingrese el nuevo nombre para la plantilla de estilo \"{name}\":",
    "enter_instance_rename": "Ingrese el nuevo nombre para la instancia \"{name}\":",
    "style_created": "Plantilla de estilo \"{name}\" creada con éxito.",
    "instance_saved": "Instancia guardada con éxito.",
    "enter_cv_name": "Ingrese el nombre para la nueva base de datos de CV:",
    "cv_exists": "Ya existe una base de datos llamada \"{name}\".",
    "confirm_override_master": "¿Está seguro de que desea aplicar este cambio a la base de datos principal?",
    "no_overrides": "Aún no se han guardado cambios personalizados en esta instancia.",
    "diagnostics_idle": "Inactivo. Presione \"Ejecutar pruebas\" para iniciar las comprobaciones.",
    "unsaved_changes": "Cambios sin guardar",
    "changes_saved": "Guardado (Limpio)"
  }
};

function t(key, replacements) {
  var isEs = state.langFilter === 'es';
  var dict = DICTIONARY[isEs ? 'es' : 'en'] || {};
  var str = dict[key] || key;
  if (replacements) {
    Object.keys(replacements).forEach(function(k) {
      str = str.replace('{' + k + '}', replacements[k]);
    });
  }
  return str;
}

function updateUITranslations() {
  var isEs = state.langFilter === 'es';
  
  // 1. Top Menus
  el('fileMenuBtn').firstChild.textContent = isEs ? 'Archivo ' : 'File ';
  el('newCvBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>' + (isEs ? 'Nuevo CV...' : 'New CV Database...');
  el('saveCvAsBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2v5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>' + (isEs ? 'Descargar Base de Datos CV' : 'Download CV Database');
  el('downloadInstanceBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' + (isEs ? 'Descargar Instancia...' : 'Download Instance...');
  el('renameCvBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' + (isEs ? 'Renombrar CV...' : 'Rename Current CV...');
  el('deleteCvBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2v-6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>' + (isEs ? 'Eliminar CV...' : 'Delete Current CV...');
  el('downloadTexBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' + (isEs ? 'Descargar archivo .tex' : 'Download .tex file');
 
  el('helpMenuBtn').firstChild.textContent = isEs ? 'Ayuda ' : 'Help ';
  el('helpScratchBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' + (isEs ? 'Cómo crear tu CV desde cero' : 'How to create your CV from scratch');
  el('helpUsageBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' + (isEs ? 'Cómo usar CV Builder' : 'How to use CV Builder');
  el('helpTemplatesBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' + (isEs ? 'Cómo usar Estilos' : 'How to use Styles');
  el('helpTourBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0V21h2v-5.464"/></svg>' + (isEs ? 'Guía de bienvenida' : 'Welcome Tour Guide');
  el('helpDiagnosticsBtn').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' + (isEs ? 'Ejecutar diagnósticos' : 'Run Diagnostics');
 
  // 2. Select box labels
  var dbLbl = document.querySelector('.db-selector span');
  if (dbLbl) dbLbl.textContent = isEs ? 'CV:' : 'CV:';
  var styleLbl = document.querySelector('.style-selector span');
  if (styleLbl) styleLbl.textContent = isEs ? 'Estilo:' : 'Style:';
  var instLbl = document.querySelector('.instance-selector span');
  if (instLbl) instLbl.textContent = isEs ? 'Instancia:' : 'Instance:';
  var langLbl = document.querySelector('.topbar-right span');
  if (langLbl) langLbl.textContent = isEs ? 'Idioma:' : 'Lang:';
 
  // 3. Left tabs
  document.querySelectorAll('.left-pane .tab').forEach(function(btn) {
    var t = btn.dataset.tab;
    if (t === 'editor') btn.textContent = isEs ? 'Editor' : 'Form Editor';
    if (t === 'customizer') btn.textContent = isEs ? 'Personalizador' : 'Visual Customizer';
    if (t === 'latex') btn.textContent = isEs ? 'Plantilla LaTeX' : 'LaTeX Template';
    if (t === 'html') btn.textContent = isEs ? 'Plantilla HTML' : 'HTML Template';
  });
 
  // 4. Right tabs
  document.querySelectorAll('.right-pane .tab').forEach(function(btn) {
    var t = btn.dataset.tab;
    if (t === 'html-prev') btn.textContent = isEs ? 'Vista Previa HTML' : 'HTML Preview';
    if (t === 'latex-prev') btn.textContent = isEs ? 'Código LaTeX' : 'LaTeX Code';
    if (t === 'json-prev') btn.textContent = isEs ? 'Base JSON' : 'JSON Database';
  });
 
  // 5. Sidebar and Outline headers
  var sidebarTitle = document.querySelector('.sidebar .sectiontitle');
  if (sidebarTitle) sidebarTitle.textContent = isEs ? 'Secciones' : 'Sections';
  el('addSectionBtn').textContent = isEs ? 'Añadir sección' : 'Add section';
  var outlineTitle = document.querySelector('.outlinepane .outline-title');
  if (outlineTitle) outlineTitle.textContent = isEs ? 'Esquema' : 'Document Outline';
 
  // 6. Action buttons
  el('downloadPdfBtn').textContent = isEs ? 'Descargar PDF' : 'Download PDF';
 
  // 7. Options of langFilterSelect
  var select = el('langFilterSelect');
  if (select && select.options.length >= 2) {
    select.options[0].textContent = isEs ? 'Inglés' : 'English';
    select.options[1].textContent = isEs ? 'Español' : 'Spanish';
  }
 
  // 8. Donation Text
  var donateLink = document.querySelector('.statusbar .donate-link');
  if (donateLink) {
    donateLink.innerHTML = (isEs ? 'Dona si te gusta ' : 'Donate if you like ') + '<span class="coffee-icon">☕</span>';
  }

  // 9. Style Manager Modal Buttons
  el('modalEditMappersBtn').textContent = isEs ? 'Editar mapeos' : 'Edit Mappers';
  el('modalStylePresetsBtn').textContent = isEs ? 'Galería de estilos' : 'Presets Gallery';
  el('modalImportStyleBtn').textContent = isEs ? 'Importar estilo (.cvstyle)' : 'Import Style (.cvstyle)';
  el('modalCreateStyleBtn').textContent = isEs ? '+ Crear nuevo estilo' : '+ Create New Style';
  el('styleManagerTitleLbl').textContent = isEs ? 'Administrar estilos de CV' : 'Manage CV Styles';
  el('presetGalleryTitleLbl').textContent = isEs ? 'Galería de estilos' : 'Style Presets Gallery';

  // 10. Database Manager Modal Buttons
  el('dbManagerTitleLbl').textContent = isEs ? 'Administrar bases de datos de CV' : 'Manage CV Databases';
  el('modalImportCvBtn').textContent = isEs ? 'Importar CV (.cv)' : 'Import CV (.cv)';
  el('modalCreateDbBtn').textContent = isEs ? '+ Crear nuevo CV' : '+ Create New CV';

  // 11. Help Modals HTML Content
  var scratchTitle = el('helpScratchTitleLbl');
  if (scratchTitle) scratchTitle.textContent = isEs ? 'Cómo crear tu CV desde cero' : 'How to create your CV from scratch';
  var scratchBody = document.querySelector('#helpScratchModal .body');
  if (scratchBody) {
    if (isEs) {
      scratchBody.innerHTML = '<div class="help-section">'
        +'<h3>Paso 1 — Comienza con una plantilla en blanco</h3>'
        +'<p>Ve a <strong>Archivo &rarr; Nuevo CV...</strong> y haz clic en <strong>Crear CV vacío</strong>. Esto carga una plantilla JSON básica con las secciones de CV más comunes ya definidas (datos básicos, educación, publicaciones, habilidades, idiomas, etc.).</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Paso 2 — Llena tus datos básicos</h3>'
        +'<p>Haz clic en la sección <strong>basics</strong> en la barra lateral izquierda. Completa tu nombre, apellido, correo, sitio web, ubicación y, opcionalmente, una imagen de perfil. Estos completan los comandos correspondientes de moderncv en LaTeX.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Paso 3 — Agrega entradas a cada sección</h3>'
        +'<p>Haz clic en cualquier sección (ej. <em>education</em>) en la barra lateral. Utiliza el botón <strong>Añadir entrada</strong> para crear un nuevo elemento. Llena los campos — cada uno se asigna a una columna en un comando de LaTeX.</p>'
        +'<ul>'
        +'<li>Activa o desactiva <strong>Included</strong> en cada entrada para decidir si se muestra o se oculta en el CV compilado.</li>'
        +'<li>Usa <strong>Duplicar</strong> para copiar una entrada y usarla como base para otra similar.</li>'
        +'<li>Usa <strong>Eliminar</strong> para borrar una entrada de forma permanente.</li>'
        +'</ul>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Paso 4 — Renombra etiquetas y títulos de sección</h3>'
        +'<p>Cada campo en el editor tiene una etiqueta a la izquierda (ej. <code>degree</code>). Puedes renombrarla — esto controla cómo aparece en la salida de LaTeX. También puedes establecer un <strong>Título de salida</strong> personalizado para cada sección (ej. cambiar <em>education</em> a <em>Formación Académica</em>).</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Paso 5 — Previsualiza el resultado</h3>'
        +'<p>Haz clic en la pestaña <strong>Vista Previa HTML</strong> o <strong>Código LaTeX</strong> en el panel derecho para ver el código generado en tiempo real. Usa la pestaña <strong>Base JSON</strong> para inspeccionar la estructura de datos sin procesar.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Paso 6 — Guarda tu progreso</h3>'
        +'<p>Usa <strong>Descargar Base de Datos CV</strong> en el menú de archivo para guardar tu progreso de forma local. El banner en la parte inferior se volverá rojo cuando tengas cambios sin guardar y verde al guardar.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Paso 7 — Descarga tu CV</h3>'
        +'<p>Cuando tu CV esté listo, ve a <strong>Archivo &rarr; Descargar archivo .tex</strong> para obtener el código LaTeX o utiliza <strong>Descargar PDF</strong> en el panel derecho para obtener el PDF compilado directamente.</p>'
        +'</div>';
    } else {
      scratchBody.innerHTML = '<div class="help-section">'
        +'<h3>Step 1 — Start with a blank template</h3>'
        +'<p>Go to <strong>File &rarr; New CV&hellip;</strong> and click <strong>Start blank CV</strong>. This loads a minimal JSON template with the most common CV sections already defined (basics, education, publications, skills, languages, etc.).</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Step 2 — Fill in your basics</h3>'
        +'<p>Click the <strong>basics</strong> section in the left sidebar. Fill in your first name, last name, email, homepage, location, and optionally a photo path. These populate the <code>\\firstname</code>, <code>\\familyname</code>, <code>\\email</code>, and <code>\\homepage</code> commands in moderncv.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Step 3 — Add entries to each section</h3>'
        +'<p>Click any section (e.g., <em>education</em>) in the sidebar. Use the <strong>Add entry</strong> button to create a new item. Fill in the fields — each field maps to a column in a <code>\\cventry</code> command or equivalent LaTeX macro.</p>'
        +'<ul>'
        +'<li>Toggle <strong>Included</strong> on each entry to include or exclude it from the LaTeX output.</li>'
        +'<li>Use <strong>Duplicate</strong> to copy a filled-in entry as a starting point for a similar one.</li>'
        +'<li>Use <strong>Delete</strong> to remove an entry permanently.</li>'
        +'</ul>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Step 4 — Rename labels and section titles</h3>'
        +'<p>Each field in the editor has a label on the left (e.g., <code>degree</code>). You can rename it — this controls how it appears in the LaTeX output. You can also set a custom <strong>Output title</strong> for each section (e.g., rename <em>education</em> to <em>Academic Training</em>).</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Step 5 — Preview the LaTeX</h3>'
        +'<p>Click the <strong>LaTeX</strong> tab at the top of the workspace to see the generated <code>.tex</code> source in real time. Use the <strong>JSON</strong> tab to inspect the raw data structure.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Step 6 — Save your progress</h3>'
        +'<p>Use <strong>File &rarr; Download CV Database</strong> regularly to save your CV data as a <code>.cv</code> file. The banner at the top of the sidebar turns <span style="color:var(--color-error);font-weight:700">red</span> whenever there are unsaved changes — it turns <span style="color:var(--color-success);font-weight:700">green</span> once you download.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Step 7 — Download the LaTeX file</h3>'
        +'<p>When your CV is ready, go to <strong>File &rarr; Download .tex</strong> to get the compiled LaTeX file. Open it in <a href="https://www.overleaf.com" target="_blank" rel="noopener">Overleaf</a> or compile locally with TeX Live / MiKTeX. The document requires the <code>moderncv</code> package.</p>'
        +'</div>';
    }
  }

  var usageTitle = el('helpUsageTitleLbl');
  if (usageTitle) usageTitle.textContent = isEs ? 'Cómo usar CV Builder' : 'How to use CV Builder';
  var usageBody = document.querySelector('#helpUsageModal .body');
  if (usageBody) {
    if (isEs) {
      usageBody.innerHTML = '<div class="help-section">'
        +'<h3>1. Carga los datos de tu CV</h3>'
        +'<p>Ve a la ventana de <strong>Bases de Datos</strong> e importa un archivo <code>.cv</code> (JSON) o crea uno nuevo. La aplicación cargará automáticamente todas las secciones.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>2. Navega por las secciones</h3>'
        +'<p>La barra lateral izquierda muestra las secciones disponibles (ej. <em>basics</em>, <em>education</em>, <em>publications</em>). Haz clic en una sección para ver sus campos.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>3. Edita las entradas</h3>'
        +'<ul>'
        +'<li>Modifica cualquier valor en el formulario.</li>'
        +'<li>Usa la casilla <strong>Include</strong> para decidir si se muestra o se oculta en el CV compilado.</li>'
        +'<li>Usa <strong>Duplicar</strong> o <strong>Eliminar</strong> según necesites.</li>'
        +'<li>Puedes renombrar las etiquetas de los campos para cambiar cómo se etiquetan en LaTeX.</li>'
        +'</ul>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>4. Títulos de sección</h3>'
        +'<p>Puedes desactivar secciones enteras o reescribir su título de salida (ej. cambiar <em>education</em> a <em>Estudios realizados</em>).</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>5. Previsualización y descarga</h3>'
        +'<ul>'
        +'<li><strong>Vista Previa HTML</strong> y <strong>Código LaTeX</strong> en tiempo real en el panel derecho.</li>'
        +'<li><strong>Descargar Base de Datos CV</strong> en el menú de archivo para guardar tu progreso de forma local.</li>'
        +'</ul>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Estructura básica del JSON de CV</h3>'
        +'<p>El formato <code>.cv</code> es un objeto JSON simple. Contiene:</p>'
        +'<ul>'
        +'<li><code>basics</code>: Objeto con datos de contacto, foto y perfil.</li>'
        +'<li><code>education</code>, <code>work_experience</code>: Listados ordenados de logros y puestos de trabajo.</li>'
        +'<li><code>skills</code>: Grupos de habilidades y sus elementos.</li>'
        +'</ul>'
        +'</div>';
    } else {
      usageBody.innerHTML = '<div class="help-section">'
        +'<h3>1. Upload your CV data</h3>'
        +'<p>Go to <strong>File → Manage CVs...</strong> and click <strong>Import CV (.cv)</strong> to upload a JSON database, or create a blank one. The app loads all sections automatically.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>2. Navigate sections</h3>'
        +'<p>The left sidebar lists every section (e.g., <em>basics</em>, <em>education</em>, <em>publications</em>). Click a section to open its editor.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>3. Edit entries</h3>'
        +'<ul>'
        +'<li>Use the form fields to edit any value directly.</li>'
        +'<li>Toggle the <strong>Include</strong> checkbox on each entry to include or exclude it from LaTeX.</li>'
        +'<li>Use <strong>Duplicate</strong> to copy an entry, or <strong>Delete</strong> to remove it.</li>'
        +'<li>Rename property labels in the left column to control their LaTeX output label.</li>'
        +'</ul>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>4. Include/exclude sections</h3>'
        +'<p>Open a section and uncheck the <strong>Include</strong> toggle to hide the entire section from LaTeX. You can also rename the output section title.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>5. Preview and export</h3>'
        +'<ul>'
        +'<li><strong>HTML Preview</strong> tab — live preview of the CV.</li>'
        +'<li><strong>LaTeX Code</strong> tab — view the generated <code>.tex</code> source code.</li>'
        +'<li><strong>File → Download .tex</strong> — download the compiled LaTeX source file.</li>'
        +'<li><strong>File → Download CV Database</strong> — save your database to your disk as a <code>.cv</code> file. Do this regularly to prevent data loss.</li>'
        +'</ul>'
        +'</div>';
    }
  }

  var templatesTitle = el('helpTemplatesTitleLbl');
  if (templatesTitle) templatesTitle.textContent = isEs ? 'Cómo usar Estilos' : 'How to use Styles';
  var templatesBody = document.querySelector('#helpTemplatesModal .body');
  if (templatesBody) {
    if (isEs) {
      templatesBody.innerHTML = '<div class="help-section">'
        +'<h3>¿Qué es un Estilo?</h3>'
        +'<p>Un <em>estilo</em> en CV Builder controla la apariencia del documento final: la fuente tipográfica, el color de acento, el diseño de moderncv, y las reglas (mapeos) que determinan el formato de LaTeX de cada sección.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Personalización Visual</h3>'
        +'<p>Usa la pestaña <strong>Personalizador Visual</strong> en el editor para cambiar el color de acento (ej. Azul, Verde, Burdeos) y la tipografía de forma interactiva.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Administración de Estilos</h3>'
        +'<p>Accede a <strong>Administrar estilos...</strong> en el selector de estilos para:</p>'
        +'<ul>'
        +'<li>Cargar, duplicar o renombrar estilos guardados.</li>'
        +'<li>Importar (<code>.cvstyle</code>) o exportar tus estilos para compartirlos.</li>'
        +'<li>Editar los <strong>mapeos</strong> que enlazan las secciones de datos con comandos específicos de LaTeX.</li>'
        +'</ul>'
        +'</div>';
    } else {
      templatesBody.innerHTML = '<div class="help-section">'
        +'<h3>What is a CV Style?</h3>'
        +'<p>A <em>style</em> configuration controls how the final LaTeX document looks: the main moderncv style theme, colors, typography fonts, custom headers, footers, and mappers.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Visual Theme Customizer</h3>'
        +'<p>Open the <strong>Visual Customizer</strong> tab in the editor panel to select accent colors and body typography dynamically.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Style Manager Modal</h3>'
        +'<p>Click on the style selector and select <strong>Manage Styles...</strong> to open the style configuration manager:</p>'
        +'<ul>'
        +'<li>Load, duplicate, rename, or delete styles.</li>'
        +'<li>Import (<code>.cvstyle</code>) and export files.</li>'
        +'<li>Edit <strong>mappers</strong> that map CV database fields to LaTeX commands.</li>'
        +'</ul>'
        +'</div>';
    }
  }
}
