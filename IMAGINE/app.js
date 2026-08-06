/**
 * IMAGINE - Hands On Ernie Scanner Workshop Website
 * JavaScript Interactivity & Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.imagineInitialized) return;
  window.imagineInitialized = true;

  // --- Setup and State ---
  const WORKSHOP_START_DATE = new Date('2026-08-10T00:00:00-04:00'); // Chile local time (Aug 10, 2026)
  const WORKSHOP_END_DATE = new Date('2026-08-14T23:59:59-04:00');

  // --- Initialize Components ---
  initNavigation();
  initTimelineTabs();
  initRouteSelector();
  initThemeToggle();
  initMap();
});

/**
 * Navigation Bar Scroll & Mobile Menu Toggle
 */
function initNavigation() {
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  // Scroll effect on Navbar background
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // ScrollSpy: highlight active nav link
    let currentSectionId = '';
    const scrollPosition = window.scrollY + 100; // Offset for navbar height

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  });

  // Mobile Hamburguer Toggle
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const icon = navToggle.querySelector('i');
      if (navMenu.classList.contains('active')) {
        icon.className = 'fas fa-times';
      } else {
        icon.className = 'fas fa-bars';
      }
    });

    // Close menu when clicking a link
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const icon = navToggle.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
      });
    });
  }
}

/**
 * Helper to calculate which workshop day corresponds to a given date
 * @param {Date} date
 * @returns {number|null} 0-4 for Days 1-5, or null if outside range
 */
function getActiveDayIndex(date) {
  // Check year, month (7 = August), and date (10 to 14)
  const isCorrectYear = date.getFullYear() === 2026;
  const isCorrectMonth = date.getMonth() === 7; // August is 7

  if (isCorrectYear && isCorrectMonth) {
    const dayOfMonth = date.getDate();
    if (dayOfMonth >= 10 && dayOfMonth <= 14) {
      return dayOfMonth - 10; // 0 for Aug 10, 1 for Aug 11... 4 for Aug 14
    }
  }
  return null;
}

/**
 * Setup Day Selector Tabs & Auto-detection of "Today's Day"
 */
function initTimelineTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  if (tabBtns.length === 0) return;

  // Determine active day based on device date
  const today = new Date();
  const activeDayIndex = getActiveDayIndex(today);

  // Set default tab: if during workshop, auto-select current day. Else, default to Day 1 (index 0).
  let targetIndex = 0;
  if (activeDayIndex !== null) {
    targetIndex = activeDayIndex;
    
    // Add "today" class to the current day button
    const currentBtn = document.getElementById(`tab-btn-day-${targetIndex + 1}`);
    if (currentBtn) {
      currentBtn.classList.add('today');
    }
  }

  // Switch to the target tab
  switchTab(targetIndex);

  // Set up click handlers
  tabBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      switchTab(index);
    });
  });

  function switchTab(index) {
    tabBtns.forEach(btn => btn.classList.remove('active'));
    tabPanels.forEach(panel => panel.classList.remove('active'));

    tabBtns[index].classList.add('active');
    tabPanels[index].classList.add('active');
  }
}

/**
 * Route instructions switcher (Metro vs Auto/Uber)
 */
function initRouteSelector() {
  const routeBtns = document.querySelectorAll('.route-tab-btn');
  const routePanels = document.querySelectorAll('.route-panel');

  if (routeBtns.length === 0) return;

  routeBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      routeBtns.forEach(b => b.classList.remove('active'));
      routePanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      routePanels[index].classList.add('active');
    });
  });
}

/**
 * Light/Dark Theme Switcher Logic
 */
function initThemeToggle() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (!themeToggleBtn) return;

  const icon = themeToggleBtn.querySelector('i');

  // Safe check for localStorage availability (crucial for JSDOM/SSR)
  const hasLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  
  // Default to light theme if no preference has been saved
  const savedTheme = hasLocalStorage ? (window.localStorage.getItem('theme') || 'light') : 'light';

  if (savedTheme === 'dark') {
    document.body.classList.remove('light-theme');
    if (icon) icon.className = 'fas fa-sun';
  } else {
    document.body.classList.add('light-theme');
    if (icon) icon.className = 'fas fa-moon';
  }

  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    
    // Save theme preference safely
    if (hasLocalStorage) {
      window.localStorage.setItem('theme', isLight ? 'light' : 'dark');
    }
    
    // Update icon
    if (icon) {
      icon.className = isLight ? 'fas fa-moon' : 'fas fa-sun';
    }
  });
}

/**
 * Initialize Leaflet.js Map with CartoDB Dark Matter tiles
 */
function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  const lat = -33.49993828070976;
  const lng = -70.61378494590551;

  // Initialize map
  const map = L.map('map', {
    scrollWheelZoom: false
  }).setView([lat, lng], 16);

  // Enable Ctrl + Scroll to zoom map and prevent browser page zoom
  const mapDiv = document.getElementById('map');
  if (mapDiv) {
    mapDiv.addEventListener('wheel', function(e) {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          map.zoomIn();
        } else {
          map.zoomOut();
        }
      }
    }, { passive: false });
  }

  // Add light themed tiles matching our design
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // Custom marker icon using FontAwesome SVG styles or standard Leaflet icon
  const ucMarker = L.marker([lat, lng]).addTo(map);

  // Set up popup content
  const popupContent = `
    <div style="font-family: 'Inter', sans-serif; color: #1e293b; font-size: 0.9rem; line-height: 1.4;">
      <strong style="font-family: 'Outfit', sans-serif; color: #002b5c; font-size: 1.05rem; display: block; margin-bottom: 4px;">
        Departamento de Ingeniería Eléctrica UC
      </strong>
      <div style="font-weight: 500; margin-bottom: 4px;">Edificio 126 (San Agustín)</div>
      <div>Campus San Joaquín, Macul</div>
      <div style="margin-top: 8px; font-weight: 600; color: #b58e2e; display: flex; align-items: center; gap: 4px;">
        <i class="fas fa-microscope"></i> Build Lab: 2° Piso, Lab. Low Cost MRI
      </div>
    </div>
  `;

  ucMarker.bindPopup(popupContent).openPopup();
}

// Export functions for unit testing under Node environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getActiveDayIndex
  };
}
