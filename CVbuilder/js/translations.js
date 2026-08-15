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
    "merge_instance_master": "Merge Instance into Master CV",
    "confirm_merge_master": "Are you sure you want to permanently merge all tailored overrides from instance \"{name}\" into your Master CV?",
    "duplicate_instance": "Duplicate Instance",
    "enter_duplicate_instance_name": "Enter a name for the duplicated CV Instance:",
    "instance_duplicated": "Instance \"{name}\" duplicated successfully.",
    "diagnostics_idle": "Idle. Click \"Run Tests\" to execute unit assertions.",
    "unsaved_changes": "Unsaved changes",
    "changes_saved": "Saved (Clean)",
    "editing_tailored_instance": "Editing Tailored Instance: {name}",
    "changes_apply_this_only": "Edits made in this mode apply to this tailored version only.",
    "switch_to_master": "Switch to Master CV",
    "merge_all_to_master": "Merge All to Master",
    "save_to_master": "Save to Master",
    "original_master_value": "Original (Master CV):"
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
    "merge_instance_master": "Fusionar instancia en CV maestro",
    "confirm_merge_master": "¿Está seguro de que desea fusionar permanentemente todas las anulaciones adaptadas de la instancia \"{name}\" en su CV Maestro?",
    "duplicate_instance": "Duplicar Instancia",
    "enter_duplicate_instance_name": "Ingrese el nombre para la nueva instancia duplicada:",
    "instance_duplicated": "Instancia \"{name}\" duplicada con éxito.",
    "diagnostics_idle": "Inactivo. Presione \"Ejecutar pruebas\" para iniciar las comprobaciones.",
    "unsaved_changes": "Cambios sin guardar",
    "changes_saved": "Guardado (Limpio)",
    "editing_tailored_instance": "Editando Instancia Adaptada: {name}",
    "changes_apply_this_only": "Los cambios en este modo se aplican solo a esta versión adaptada.",
    "switch_to_master": "Cambiar al CV Maestro",
    "merge_all_to_master": "Fusionar Todo al Maestro",
    "save_to_master": "Guardar al Maestro",
    "original_master_value": "Original (CV Maestro):"
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
 
  // 2. Select box labels & Tooltip guidance
  var dbLbl = document.querySelector('.db-selector span');
  if (dbLbl) dbLbl.textContent = isEs ? 'CV:' : 'CV:';
  var cvTitle = el('cvTipTitle');
  var cvDesc = el('cvTipDesc');
  if (cvTitle && cvDesc) {
    cvTitle.textContent = isEs ? 'Perfil Principal (CV)' : 'Master CV Profile';
    cvDesc.textContent = isEs ? 'Contiene todo tu historial laboral y académico completo. Es tu expediente maestro.' : 'Contains all your full career history (education, jobs, skills). This is your master record.';
  }

  var styleLbl = document.querySelector('.style-selector span');
  if (styleLbl) styleLbl.textContent = isEs ? 'Estilo:' : 'Style:';
  var styleTitle = el('styleTipTitle');
  var styleDesc = el('styleTipDesc');
  if (styleTitle && styleDesc) {
    styleTitle.textContent = isEs ? 'Estilo Visual' : 'Visual Style';
    styleDesc.textContent = isEs ? 'Controla el diseño gráfico, la tipografía y los colores de tu documento.' : 'Controls the graphic template, typography, and accent colors for your CV.';
  }

  var instLbl = document.querySelector('.instance-selector span');
  if (instLbl) instLbl.textContent = isEs ? 'Instancia:' : 'Instance:';
  var instTitle = el('instanceTipTitle');
  var instDesc = el('instanceTipDesc');
  if (instTitle && instDesc) {
    instTitle.textContent = isEs ? 'Instancia Adaptada' : 'Tailored Instance';
    instDesc.textContent = isEs ? 'Una versión personalizada para un empleo específico sin alterar tus datos principales.' : 'A customized version created for a specific job application without changing your master CV data.';
  }

  var langLbl = document.querySelector('.topbar-right span');
  if (langLbl) langLbl.textContent = isEs ? 'Idioma:' : 'Lang:';

  var topbarPdfText = el('topbarPdfBtnText');
  if (topbarPdfText) topbarPdfText.textContent = isEs ? 'Exportar PDF' : 'Export PDF';

  var menuPdf = el('menuDownloadPdfBtn');
  if (menuPdf) menuPdf.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' + (isEs ? 'Exportar a PDF...' : 'Export to PDF...');

  var htmlPdfBtn = el('htmlPrevPdfBtn');
  if (htmlPdfBtn) htmlPdfBtn.textContent = isEs ? 'Exportar PDF' : 'Export PDF';
 
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
  var addBtn = el('addSectionBtn');
  if (addBtn) addBtn.textContent = isEs ? '+ Añadir' : '+ Add';
  var outlineTitle = document.querySelector('.outlinepane .outline-title');
  if (outlineTitle) outlineTitle.textContent = isEs ? 'Esquema' : 'Document Outline';
 
  // 6. Action buttons
  var dlPdfBtn = el('downloadPdfBtn');
  if (dlPdfBtn) dlPdfBtn.textContent = isEs ? 'Descargar PDF' : 'Download PDF';
 
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
  var edMapBtn = el('modalEditMappersBtn');
  if (edMapBtn) edMapBtn.textContent = isEs ? 'Editar mapeos' : 'Edit Mappers';
  var stPreBtn = el('modalStylePresetsBtn');
  if (stPreBtn) stPreBtn.textContent = isEs ? 'Galería de estilos' : 'Presets Gallery';
  var impStBtn = el('modalImportStyleBtn');
  if (impStBtn) impStBtn.textContent = isEs ? 'Importar estilo' : 'Import Style';
  var crStBtn = el('modalCreateStyleBtn');
  if (crStBtn) crStBtn.textContent = isEs ? '+ Crear nuevo estilo' : '+ Create New Style';
  var stMgrTitle = el('styleManagerTitleLbl');
  if (stMgrTitle) stMgrTitle.textContent = isEs ? 'Administrar estilos de CV' : 'Manage CV Styles';
  var preGalTitle = el('presetGalleryTitleLbl');
  if (preGalTitle) preGalTitle.textContent = isEs ? 'Galería de estilos' : 'Style Presets Gallery';

  // 10. Database Manager Modal Buttons
  var dbMgrTitle = el('dbManagerTitleLbl');
  if (dbMgrTitle) dbMgrTitle.textContent = isEs ? 'Administrar bases de datos de CV' : 'Manage CV Databases';
  var impCvBtn = el('modalImportCvBtn');
  if (impCvBtn) impCvBtn.textContent = isEs ? 'Importar CV (.cv)' : 'Import CV (.cv)';
  var crDbBtn = el('modalCreateDbBtn');
  if (crDbBtn) crDbBtn.textContent = isEs ? '+ Crear nuevo CV' : '+ Create New CV';

  // 11. Visual Customizer Controls
  var themeTitle = el('visualThemeTitleLbl');
  if (themeTitle) themeTitle.textContent = isEs ? 'Configuración de Tema Visual' : 'Visual Theme Settings';
  var accentLbl = el('themeAccentColorLbl');
  if (accentLbl) accentLbl.textContent = isEs ? 'Color de Acento Principal' : 'Primary Accent Color';
  var fontLbl = el('themeFontSelectLbl');
  if (fontLbl) fontLbl.textContent = isEs ? 'Selección de Fuente de Tema' : 'Font Theme Selection';
  var alignLbl = el('themeTextAlignSelectLbl');
  if (alignLbl) alignLbl.textContent = isEs ? 'Alineación de Texto' : 'Text Alignment';
  var alignSelect = el('themeTextAlignSelect');
  if (alignSelect && alignSelect.options.length >= 4) {
    alignSelect.options[0].textContent = isEs ? 'Alineado a la Izquierda' : 'Left Aligned';
    alignSelect.options[1].textContent = isEs ? 'Justificado' : 'Justified';
    alignSelect.options[2].textContent = isEs ? 'Centrado' : 'Center Aligned';
    alignSelect.options[3].textContent = isEs ? 'Alineado a la Derecha' : 'Right Aligned';
  }
  var photoPosTitle = el('photoPosSectionTitle');
  if (photoPosTitle) photoPosTitle.textContent = isEs ? 'Posición de Foto de Perfil' : 'Profile Photo Positioning';
  var photoLeftLbl = el('photoLeftSliderLbl');
  if (photoLeftLbl) photoLeftLbl.textContent = isEs ? 'Desplazamiento Izquierdo (Distancia del Nombre)' : 'Left Offset (Gap from Name)';
  var photoTopLbl = el('photoTopSliderLbl');
  if (photoTopLbl) photoTopLbl.textContent = isEs ? 'Desplazamiento Superior (Alineación Vertical)' : 'Top Offset (Vertical Alignment)';

  var headerSpacingTitle = el('headerSpacingSectionTitle');
  if (headerSpacingTitle) headerSpacingTitle.textContent = isEs ? 'Espaciado de Encabezados' : 'Header & Layout Spacing';
  var headerSpacerLbl = el('headerSpacerSliderLbl');
  if (headerSpacerLbl) headerSpacerLbl.textContent = isEs ? 'Separador de Encabezado (Espacio Título y Fecha)' : 'Header Spacer (Gap between Title & Date)';

  // 12. PDF Export Format Selection Modal Labels
  var pdfFmtTitle = el('pdfFormatTitleLbl');
  if (pdfFmtTitle) pdfFmtTitle.textContent = isEs ? 'Exportar Documento PDF' : 'Export PDF Document';
  var pdfFmtDesc = el('pdfFormatDesc');
  if (pdfFmtDesc) pdfFmtDesc.textContent = isEs ? 'Selecciona tu formato de exportación PDF y motor de compilación preferido:' : 'Select your preferred PDF export format and compilation engine:';
  var latexFmtTitle = el('pdfFormatLatexTitle');
  if (latexFmtTitle) latexFmtTitle.textContent = isEs ? 'Motor LaTeX (PDF Tipografiado)' : 'LaTeX Engine (Typeset PDF)';
  var latexFmtDesc = el('pdfFormatLatexDesc');
  if (latexFmtDesc) latexFmtDesc.textContent = isEs ? 'Compila tu documento en un PDF profesional de calidad editorial mediante un compilador LaTeX en línea.' : 'Compiles your document into a professional, publication-quality PDF via an online LaTeX compiler.';
  var htmlFmtTitle = el('pdfFormatHtmlTitle');
  if (htmlFmtTitle) htmlFmtTitle.textContent = isEs ? 'Impresión del Navegador (HTML)' : 'HTML Browser Print';
  var htmlFmtDesc = el('pdfFormatHtmlDesc');
  if (htmlFmtDesc) htmlFmtDesc.textContent = isEs ? 'Abre la vista previa HTML en una ventana independiente lista para imprimir o guardar en PDF.' : 'Opens your live HTML preview in a new window ready for browser printing or saving to PDF.';
  var cancelFmtBtn = el('cancelPdfFormatBtn');
  if (cancelFmtBtn) cancelFmtBtn.textContent = isEs ? 'Cancelar' : 'Cancel';
  var confFmtBtn = el('confirmPdfFormatBtnText');
  if (confFmtBtn) confFmtBtn.textContent = isEs ? 'Continuar' : 'Continue';

  // 13. Remote LaTeX Export Privacy Modal Labels
  var rLatexTitle = el('renderedLatexTitleLbl');
  if (rLatexTitle) rLatexTitle.textContent = isEs ? 'Código LaTeX Generado' : 'Rendered LaTeX Code';
  var expTitle = el('latexExportTitleLbl');
  if (expTitle) expTitle.textContent = isEs ? 'Aviso de Privacidad: Exportación PDF por LaTeX' : 'Remote LaTeX PDF Export Privacy Notice';
  var dontAskLbl = el('dontAskLatexExportLbl');
  if (dontAskLbl) dontAskLbl.textContent = isEs ? 'No volver a preguntar durante esta sesión' : 'Don\'t ask again during this session';
  var cancelExpBtn = el('cancelLatexExportBtn');
  if (cancelExpBtn) cancelExpBtn.textContent = isEs ? 'Cancelar' : 'Cancel';
  var confExpBtn = el('confirmLatexExportBtnText');
  if (confExpBtn) confExpBtn.textContent = isEs ? 'Continuar y Exportar PDF' : 'Proceed & Export PDF';

  // 12. Add Section Modal Assistant Labels
  var addSecTitle = el('addSectionModalTitle');
  if (addSecTitle) addSecTitle.textContent = isEs ? 'Asistente para Añadir Nueva Sección' : 'Add New CV Section Assistant';
  var addSecKey = el('addSectionKeyLbl');
  if (addSecKey) addSecKey.textContent = isEs ? 'Clave de Sección (Identificador)' : 'Section Key (Identifier)';
  var addSecTitleLbl = el('addSectionTitleLbl');
  if (addSecTitleLbl) addSecTitleLbl.textContent = isEs ? 'Título de Salida (Encabezado)' : 'Display Title (Header)';
  var selectStructLbl = el('selectStructureLbl');
  if (selectStructLbl) selectStructLbl.textContent = isEs ? 'Seleccionar Plantilla de Estructura' : 'Select Section Structure Template';
  var confirmAddSec = el('confirmAddSectionBtn');
  if (confirmAddSec) confirmAddSec.textContent = isEs ? 'Crear Sección' : 'Create Section';
  var cancelAddSec = el('cancelAddSectionBtn');
  if (cancelAddSec) cancelAddSec.textContent = isEs ? 'Cancelar' : 'Cancel';

  // 11. Help Modals HTML Content
  var scratchTitle = el('helpScratchTitleLbl');
  if (scratchTitle) scratchTitle.textContent = isEs ? 'Cómo crear tu CV desde cero' : 'How to create your CV from scratch';
  if (typeof renderInteractiveScratchGuide === 'function') {
    renderInteractiveScratchGuide();
  }

  var usageTitle = el('helpUsageTitleLbl');
  if (usageTitle) usageTitle.textContent = isEs ? 'Cómo usar CV Builder' : 'How to use CV Builder';
  if (typeof renderInteractiveUsageGuide === 'function') {
    renderInteractiveUsageGuide();
  }
  var usageBody = document.querySelector('#helpUsageModal .body');
  if (usageBody) {
    if (isEs) {
      usageBody.innerHTML = '<div class="help-section">'
        +'<h3>¿Para quién es CV Builder?</h3>'
        +'<p>CV Builder está diseñado para <strong>todo tipo de profesionales y estudiantes</strong> (educadores, salud, negocios, ingeniería, creativos y más) que buscan crear un Currículum Vitae profesional, limpio e impecable.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Conceptos Clave explicados fácil:</h3>'
        +'<ul>'
        +'<li><strong>Perfil de CV (Base de Datos):</strong> Tu historial completo (estudios, empleos, habilidades). Es tu expediente maestro.</li>'
        +'<li><strong>Estilo Visual (Style):</strong> El diseño gráfico (colores, tipografía y estructura) con el que se generará tu documento.</li>'
        +'<li><strong>Instancia Adaptada (Instance):</strong> Una versión de tu CV personalizada para una oferta de empleo específica (ej. "Postulación Docente" o "Gerente Comercial"). Te permite ocultar o modificar ciertos datos para esa postulación sin alterar tu expediente principal.</li>'
        +'</ul>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>1. Cómo editar tu información</h3>'
        +'<p>Selecciona una sección en la barra lateral (ej. <em>Formación Académica</em> o <em>Experiencia Laboral</em>) e ingresa tus datos en los campos. Los cambios se actualizan en tiempo real en la Vista Previa.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>2. Foto de Perfil</h3>'
        +'<p>Puedes subir tu fotografía en la sección <em>basics</em>. Recomendamos una foto de formato cuadrado (1:1), en formato JPG o PNG, menor a 2MB.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>3. Exportar tu CV a PDF</h3>'
        +'<p>Para obtener tu documento final en formato PDF, haz clic en el botón azul <strong>Exportar PDF</strong> ubicado en la barra superior o en el menú de Archivo. También puedes descargar la base de datos de tu CV (<code>.cv</code>) para guardarla en tu computadora.</p>'
        +'</div>';
    } else {
      usageBody.innerHTML = '<div class="help-section">'
        +'<h3>Who is CV Builder for?</h3>'
        +'<p>CV Builder is designed for <strong>all professionals, academics, and students</strong> (teachers, healthcare workers, business managers, engineers, creatives, and more) looking for a clean, professional, and elegant resume.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>Key Concepts Explained Simply:</h3>'
        +'<ul>'
        +'<li><strong>CV Profile (Database):</strong> Your complete career history (education, work experience, skills). This is your master record.</li>'
        +'<li><strong>Visual Style:</strong> The graphic template (colors, fonts, and layout) used to render your document.</li>'
        +'<li><strong>Tailored Instance:</strong> A customized version of your CV created for a specific job application (e.g., "Teaching Position" or "Sales Director"). It lets you adjust or hide specific items for that application without modifying your master profile.</li>'
        +'</ul>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>1. Editing your information</h3>'
        +'<p>Click any section in the sidebar (e.g., <em>Education</em> or <em>Work Experience</em>) and enter your details. Changes update instantly in the Live Preview.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>2. Profile Photo</h3>'
        +'<p>Upload a profile photo under the <em>basics</em> section. We recommend a square aspect ratio (1:1), JPG or PNG format, under 2MB.</p>'
        +'</div>'
        +'<div class="help-section">'
        +'<h3>3. Exporting to PDF</h3>'
        +'<p>To generate your final document, click the blue <strong>Export PDF</strong> button on the top bar or inside the File menu. You can also download your CV profile (<code>.cv</code> file) to back up your data on your computer.</p>'
        +'</div>';
    }
  }

  var templatesTitle = el('helpTemplatesTitleLbl');
  if (templatesTitle) templatesTitle.textContent = isEs ? 'Cómo usar Estilos' : 'How to use Styles';
  if (typeof renderInteractiveTemplatesGuide === 'function') {
    renderInteractiveTemplatesGuide();
  }
}
