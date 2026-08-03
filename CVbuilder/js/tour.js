var tourActiveStep = 0;
var activeTourId = 'welcome';

var DEFAULT_TOURS_CONFIG = {
  defaultTour: 'welcome',
  tours: {
    welcome: {
      id: 'welcome',
      title: {
        en: 'Welcome Tour Guide',
        es: 'Guía de bienvenida'
      },
      steps: [
        {
          target: '.db-selector',
          title: {
            en: 'Manage CV Databases',
            es: 'Administrar bases de datos de CV'
          },
          content: {
            en: 'Select, rename, duplicate, or import different CV profiles here. All data is saved automatically in your browser.',
            es: 'Selecciona, renombra, duplica o importa diferentes perfiles de CV aquí. Todos los datos se guardan automáticamente en tu navegador.'
          }
        },
        {
          target: '.instance-selector',
          title: {
            en: 'Tailored CV Instances',
            es: 'Instancias de CV personalizadas'
          },
          content: {
            en: 'Create and switch between tailored instances of your CV for specific job applications without modifying your master CV data.',
            es: 'Crea y cambia entre versiones personalizadas de tu CV para ofertas específicas sin modificar tu base de datos principal.'
          }
        },
        {
          target: '#addSectionBtn',
          title: {
            en: 'Add & Delete Sections',
            es: 'Añadir y eliminar secciones'
          },
          content: {
            en: 'Click here to add new predefined or custom sections. You can delete empty sections from their edit cards.',
            "es": 'Haz clic aquí para añadir secciones personalizadas o predefinidas. Puedes eliminar secciones vacías desde sus tarjetas de edición.'
          }
        },
        {
          target: '.left-pane',
          title: {
            en: 'Workspace Editors',
            es: 'Editores del espacio de trabajo'
          },
          content: {
            en: 'Edit form fields, modify the LaTeX preamble, or edit live HTML code in this left-hand workspace.',
            es: 'Modifica los campos del formulario, edita el preámbulo de LaTeX o cambia el código HTML directamente en este panel izquierdo.'
          }
        },
        {
          target: '.right-pane',
          title: {
            en: 'Live Previews & Downloads',
            es: 'Vista previa en vivo y descargas'
          },
          content: {
            en: 'Switch tabs to preview the HTML view, check the generated LaTeX code, or click "Download PDF" to compile your document!',
            es: 'Cambia de pestaña para ver la previsualización en HTML, comprobar el código LaTeX generado o haz clic en "Descargar PDF" para compilar tu documento.'
          }
        },
        {
          target: '#langFilterSelect',
          title: {
            en: 'Bilingual Resumes',
            es: 'Currículums bilingües'
          },
          content: {
            en: 'Tag entries as English or Spanish, then toggle the global output language filter to instantly render either version. If you want to take this tour again, just click on the "Welcome Tour Guide" option inside the Help menu!',
            es: 'Etiqueta elementos como inglés o español, y cambia el filtro de idioma global para renderizar al instante cualquiera de las versiones. Si quieres volver a realizar la guía, haz clic en la opción "Guía de bienvenida" dentro del menú de Ayuda.'
          }
        }
      ]
    }
  }
};

var toursConfig = (typeof window !== 'undefined' && window.TOURS_CONFIG) ? window.TOURS_CONFIG : JSON.parse(JSON.stringify(DEFAULT_TOURS_CONFIG));
var TOUR_STEPS = (toursConfig.tours && toursConfig.tours.welcome && toursConfig.tours.welcome.steps) ? toursConfig.tours.welcome.steps : [];

// Attempt to load scalable tour configuration from external JSON if on HTTP server
(function loadToursConfig() {
  if (typeof window !== 'undefined' && window.TOURS_CONFIG) {
    toursConfig = window.TOURS_CONFIG;
    if (toursConfig.tours && toursConfig.tours.welcome && toursConfig.tours.welcome.steps) {
      TOUR_STEPS = toursConfig.tours.welcome.steps;
    }
    return;
  }
  
  if (typeof fetch === 'function' && typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:') {
    fetch('presets/tours.json')
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP error ' + res.status);
        return res.json();
      })
      .then(function(json) {
        if (json && json.tours) {
          toursConfig = json;
          if (toursConfig.tours && toursConfig.tours.welcome && toursConfig.tours.welcome.steps) {
            TOUR_STEPS = toursConfig.tours.welcome.steps;
          }
        }
      })
      .catch(function(err) {
        // Silent fallback
      });
  }
})();

function startTour(tourId) {
  tourId = tourId || 'welcome';
  activeTourId = tourId;
  
  var tour = toursConfig.tours && toursConfig.tours[tourId];
  if (!tour) {
    tour = DEFAULT_TOURS_CONFIG.tours.welcome;
  }
  
  TOUR_STEPS = tour.steps || [];
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

function startWelcomeTour() {
  startTour('welcome');
}

function endWelcomeTour() {
  removeTourDom();
  localStorage.setItem('cvbuilder_visited', 'true');
}

function removeTourDom() {
  var b = el('tourBackdrop');
  if (b) {
    if (typeof b.remove === 'function') b.remove();
    else if (b.parentNode) b.parentNode.removeChild(b);
  }
  var p = el('tourPopover');
  if (p) {
    if (typeof p.remove === 'function') p.remove();
    else if (p.parentNode) p.parentNode.removeChild(p);
  }
  document.querySelectorAll('.tour-highlight').forEach(function(x) {
    x.classList.remove('tour-highlight');
  });
}

function getLocalizedText(obj, lang) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj['en'] || Object.values(obj)[0] || '';
}

function showTourStep() {
  document.querySelectorAll('.tour-highlight').forEach(function(x) {
    x.classList.remove('tour-highlight');
  });
  
  if (!TOUR_STEPS || tourActiveStep >= TOUR_STEPS.length) {
    endWelcomeTour();
    return;
  }
  
  var lang = (state && state.langFilter === 'es') ? 'es' : 'en';
  var step = TOUR_STEPS[tourActiveStep];
  var targetEl = document.querySelector(step.target);
  
  var popover = el('tourPopover');
  if (!popover) return;
  
  popover.innerHTML = '';
  
  var titleText = getLocalizedText(step.title, lang);
  var contentText = getLocalizedText(step.content, lang);
  
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
  skipBtn.textContent = lang === 'es' ? 'Omitir' : 'Skip';
  skipBtn.onclick = endWelcomeTour;
  leftGroup.appendChild(skipBtn);
  
  if (tourActiveStep > 0) {
    var prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-ghost btn-xs';
    prevBtn.textContent = lang === 'es' ? 'Anterior' : 'Prev';
    prevBtn.onclick = function() {
      tourActiveStep--;
      showTourStep();
    };
    leftGroup.appendChild(prevBtn);
  }
  footer.appendChild(leftGroup);
  
  var nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-primary btn-xs';
  nextBtn.textContent = (tourActiveStep === TOUR_STEPS.length - 1) ? (lang === 'es' ? 'Finalizar' : 'Finish') : (lang === 'es' ? 'Siguiente' : 'Next');
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
