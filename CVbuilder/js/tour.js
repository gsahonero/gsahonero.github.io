var tourActiveStep = 0;
var TOUR_STEPS = [
  {
    target: '#dbSelect',
    title: 'Manage CV Databases',
    content: 'Select, rename, duplicate, or import different CV profiles here. All data is saved automatically in your browser.'
  },
  {
    target: '#styleSelect',
    title: 'Choose Layout Styles',
    content: 'Select different layout styles or open the Style Manager to load presets, configure section mappers, or import/export styles.'
  },
  {
    target: '#addSectionBtn',
    title: 'Add & Delete Sections',
    content: 'Click here to add new predefined or custom sections. You can delete empty sections from their edit cards.'
  },
  {
    target: '.left-pane',
    title: 'Workspace Editors',
    content: 'Edit form fields, modify the LaTeX preamble, or edit live HTML code in this left-hand workspace.'
  },
  {
    target: '.right-pane',
    title: 'Live Previews & Downloads',
    content: 'Switch tabs to preview the HTML view, check the generated LaTeX code, or click "Download PDF" to compile your document!'
  },
  {
    target: '#langFilterSelect',
    title: 'Bilingual Resumes',
    content: 'Tag entries as English or Spanish, then toggle the global output language filter to instantly render either version. If you want to take this tour again, just click on the "Welcome Tour Guide" option inside the Help menu!'
  }
];

function startWelcomeTour() {
  tourActiveStep = 0;
  removeTourDom();
  
  var backdrop = document.createElement('div');
  backdrop.id = 'tourBackdrop';
  backdrop.className = 'tour-backdrop';
  backdrop.onclick = endWelcomeTour;
  document.body.appendChild(backdrop);
  
  var popover = document.createElement('div');
  popover.id = 'tourPopover';
  popover.className = 'tour-popover';
  document.body.appendChild(popover);
  
  showTourStep();
}

function endWelcomeTour() {
  removeTourDom();
  localStorage.setItem('cvbuilder_visited', 'true');
}

function removeTourDom() {
  var b = el('tourBackdrop');
  if (b) b.remove();
  var p = el('tourPopover');
  if (p) p.remove();
  document.querySelectorAll('.tour-highlight').forEach(function(x) {
    x.classList.remove('tour-highlight');
  });
}

function showTourStep() {
  document.querySelectorAll('.tour-highlight').forEach(function(x) {
    x.classList.remove('tour-highlight');
  });
  
  if (tourActiveStep >= TOUR_STEPS.length) {
    endWelcomeTour();
    return;
  }
  
  var isEs = state.langFilter === 'es';
  var step = TOUR_STEPS[tourActiveStep];
  var targetEl = document.querySelector(step.target);
  
  var popover = el('tourPopover');
  if (!popover) return;
  
  popover.innerHTML = '';
  
  var titleText = step.title;
  var contentText = step.content;
  if (isEs) {
    if (step.target === '#dbSelect') {
      titleText = 'Administrar bases de datos de CV';
      contentText = 'Selecciona, renombra, duplica o importa diferentes perfiles de CV aquí. Todos los datos se guardan automáticamente en tu navegador.';
    } else if (step.target === '#styleSelect') {
      titleText = 'Elegir estilos de diseño';
      contentText = 'Selecciona diferentes estilos o abre el Administrador de Estilos para cargar plantillas, configurar mapeos de secciones o importar/exportar estilos.';
    } else if (step.target === '#addSectionBtn') {
      titleText = 'Añadir y eliminar secciones';
      contentText = 'Haz clic aquí para añadir secciones personalizadas o predefinidas. Puedes eliminar secciones vacías desde sus tarjetas de edición.';
    } else if (step.target === '.left-pane') {
      titleText = 'Editores del espacio de trabajo';
      contentText = 'Modifica los campos del formulario, edita el preámbulo de LaTeX o cambia el código HTML directamente en este panel izquierdo.';
    } else if (step.target === '.right-pane') {
      titleText = 'Vista previa en vivo y descargas';
      contentText = 'Cambia de pestaña para ver la previsualización en HTML, comprobar el código LaTeX generado o haz clic en "Descargar PDF" para compilar tu documento.';
    } else if (step.target === '#langFilterSelect') {
      titleText = 'Currículums bilingües';
      contentText = 'Etiqueta elementos como inglés o español, y cambia el filtro de idioma global para renderizar al instante cualquiera de las versiones. Si quieres volver a realizar la guía, haz clic en la opción "Guía de bienvenida" dentro del menú de Ayuda.';
    }
  }
  
  var title = document.createElement('h4');
  title.textContent = (tourActiveStep + 1) + '/' + TOUR_STEPS.length + ': ' + titleText;
  popover.appendChild(title);
  
  var text = document.createElement('p');
  text.textContent = contentText;
  popover.appendChild(text);
  
  var footer = document.createElement('div');
  footer.className = 'footer';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.alignItems = 'center';
  footer.style.width = '100%';
  
  var leftGroup = document.createElement('div');
  leftGroup.style.display = 'flex';
  leftGroup.style.gap = 'var(--space-2)';
  
  var skipBtn = document.createElement('button');
  skipBtn.className = 'btn btn-ghost btn-xs';
  skipBtn.textContent = isEs ? 'Omitir' : 'Skip';
  skipBtn.onclick = endWelcomeTour;
  leftGroup.appendChild(skipBtn);
  
  if (tourActiveStep > 0) {
    var prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-ghost btn-xs';
    prevBtn.textContent = isEs ? 'Anterior' : 'Prev';
    prevBtn.onclick = function() {
      tourActiveStep--;
      showTourStep();
    };
    leftGroup.appendChild(prevBtn);
  }
  footer.appendChild(leftGroup);
  
  var nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-primary btn-xs';
  nextBtn.textContent = (tourActiveStep === TOUR_STEPS.length - 1) ? (isEs ? 'Finalizar' : 'Finish') : (isEs ? 'Siguiente' : 'Next');
  nextBtn.onclick = function() {
    tourActiveStep++;
    showTourStep();
  };
  footer.appendChild(nextBtn);
  popover.appendChild(footer);
  
  if (targetEl) {
    targetEl.classList.add('tour-highlight');
    targetEl.scrollIntoView({ behavior: 'auto', block: 'center' });
    popover.style.transform = '';
    
    setTimeout(function() {
      var rect = targetEl.getBoundingClientRect();
      var popRect = popover.getBoundingClientRect();
      
      var top = rect.bottom + 12;
      var left = rect.left;
      
      if (top + popRect.height > window.innerHeight) {
        top = rect.top - popRect.height - 12;
      }
      if (left + popRect.width > window.innerWidth) {
        left = window.innerWidth - popRect.width - 20;
      }
      if (left < 10) left = 10;
      if (top < 10) top = 10;
      
      popover.style.top = top + 'px';
      popover.style.left = left + 'px';
    }, 100);
  } else {
    popover.style.top = '50%';
    popover.style.left = '50%';
    popover.style.transform = 'translate(-50%, -50%)';
  }
}
