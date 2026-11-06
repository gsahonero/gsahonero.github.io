/**
 * assets/js/main.js
 * Editorial interactions: Wheel-snapping scroll-spy, Single-stage interactive switcher,
 * Minimalist Publications search & filter, Theme switcher, and Clipboard.
 */

(function () {
  'use strict';

  // --- 1. Theme Management ---
  const THEME_KEY = 'gsahonero-theme';

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeToggleLabel(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    updateThemeToggleLabel(next);
  }

  function updateThemeToggleLabel(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.innerHTML = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
  }

  // --- 2. Minimalist Toast ---
  function showToast(message) {
    let toast = document.getElementById('site-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'site-toast';
      toast.className = 'site-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // --- 3. Clipboard Actions ---
  function initClipboardActions() {
    document.addEventListener('click', function (e) {
      const bibtexBtn = e.target.closest('[data-copy-bibtex]');
      if (bibtexBtn) {
        const bibtex = bibtexBtn.getAttribute('data-copy-bibtex');
        if (bibtex && navigator.clipboard) {
          navigator.clipboard.writeText(bibtex).then(() => {
            showToast('BibTeX citation copied to clipboard');
          });
        }
      }

      const emailBtn = e.target.closest('#copy-email-btn, #stage-copy-email-btn, [data-email]');
      if (emailBtn) {
        const email = emailBtn.getAttribute('data-email') || 'gsahonero@uc.cl';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(email).then(() => {
            showToast(`Copied ${email}`);
          });
        }
      }
    });
  }

  // --- 4. Publications Filtering & Type Toggling ---
  function initPubFilters() {
    const typeBtns = document.querySelectorAll('.type-toggle-btn');
    const topicTabs = document.querySelectorAll('.filter-tab');
    const searchInput = document.getElementById('pubs-search');
    const papersFeed = document.getElementById('papers-feed');
    const abstractsFeed = document.getElementById('abstracts-feed');
    const noPubsMsg = document.getElementById('no-pubs-msg');

    let currentType = 'papers'; // 'papers' or 'abstracts'
    let currentTopic = 'All';
    let searchQuery = '';

    function applyFilters() {
      // 1. Switch active feed container
      if (papersFeed && abstractsFeed) {
        if (currentType === 'papers') {
          papersFeed.style.display = 'block';
          abstractsFeed.style.display = 'none';
        } else {
          papersFeed.style.display = 'none';
          abstractsFeed.style.display = 'block';
        }
      }

      const activeFeed = currentType === 'papers' ? papersFeed : abstractsFeed;
      if (!activeFeed) return;

      let totalVisible = 0;
      const yearGroups = activeFeed.querySelectorAll('.year-group');

      yearGroups.forEach(yearGroup => {
        const items = yearGroup.querySelectorAll('.publication-item');
        let visibleInYear = 0;

        items.forEach(item => {
          const topic = item.getAttribute('data-topic') || '';
          const text = (item.textContent || '').toLowerCase();
          const matchesTopic = currentTopic === 'All' || topic.toLowerCase().includes(currentTopic.toLowerCase());
          const matchesSearch = !searchQuery || text.includes(searchQuery);

          if (matchesTopic && matchesSearch) {
            item.style.display = 'block';
            visibleInYear++;
            totalVisible++;
          } else {
            item.style.display = 'none';
          }
        });

        // HIDE EMPTY YEAR: if no papers match in this year, hide the whole year group!
        if (visibleInYear > 0) {
          yearGroup.style.display = 'block';
          if (currentTopic !== 'All' || searchQuery) {
            yearGroup.open = true;
          }
        } else {
          yearGroup.style.display = 'none';
        }
      });

      // Show/hide empty state message
      if (noPubsMsg) {
        noPubsMsg.style.display = totalVisible === 0 ? 'block' : 'none';
      }
    }

    // Bind Type Toggle Buttons (Papers vs Abstracts)
    typeBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        typeBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentType = this.getAttribute('data-type') || 'papers';
        applyFilters();
      });
    });

    // Bind Topic Filter Tabs
    topicTabs.forEach(tab => {
      tab.addEventListener('click', function () {
        topicTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentTopic = this.getAttribute('data-filter') || 'All';
        applyFilters();
      });
    });

    // Bind Search Input
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchQuery = this.value.trim().toLowerCase();
        applyFilters();
      });
    }

    // Run initial filter check
    applyFilters();
  }

  // --- 5. Navigation & Single-Stage Visual Switcher ---
  const STAGE_MAP = {
    'home': 'stage-home',
    'bio': 'stage-bio',
    'blog': 'stage-blog',
    'teaching': 'stage-teaching',
    'publications': 'stage-publications',
    'contact': 'stage-contact'
  };

  function switchStagePanel(sectionId) {
    const targetStageId = STAGE_MAP[sectionId] || 'stage-home';
    const panels = document.querySelectorAll('.stage-panel');
    panels.forEach(panel => {
      if (panel.id === targetStageId) {
        panel.classList.add('is-active');
      } else {
        panel.classList.remove('is-active');
      }
    });
  }

  function initScrollSpy() {
    const sections = document.querySelectorAll('.snap-section');
    const menuLinks = document.querySelectorAll('.menu a');
    const wheel = document.getElementById('wheel');

    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;

          // Update active state on sections
          sections.forEach(s => s.classList.remove('is-active'));
          entry.target.classList.add('is-active');

          // Update Menu Active Link
          menuLinks.forEach(link => {
            if (link.getAttribute('data-target') === id) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });

          // Toggle single editorial reading canvas on Home
          if (id === 'home') {
            document.body.classList.add('is-home');
          } else {
            document.body.classList.remove('is-home');
          }

          // Switch Right Interactive Stage Panel
          switchStagePanel(id);

          // Update URL hash smoothly
          if (history.replaceState) {
            const newHash = id === 'home' ? '' : `#${id}`;
            history.replaceState(null, null, window.location.pathname + newHash);
          }
        }
      });
    }, {
      root: (window.innerWidth > 900 ? wheel : null),
      threshold: 0.5
    });

    sections.forEach(sec => observer.observe(sec));

    // Menu click smooth scroll
    menuLinks.forEach(link => {
      link.addEventListener('click', function (e) {
        const targetId = this.getAttribute('data-target');
        if (!targetId) {
          // Normal link navigation (e.g. to /posts/introducing-mrijs/)
          closeMobileNav();
          return;
        }
        e.preventDefault();
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          closeMobileNav();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  // --- 6. Mobile Drawer ---
  function initMobileNav() {
    const burgerBtn = document.getElementById('burger-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');

    if (burgerBtn && sidebar && overlay) {
      burgerBtn.addEventListener('click', function () {
        sidebar.classList.toggle('nav-open');
        overlay.classList.toggle('nav-open');
      });

      overlay.addEventListener('click', closeMobileNav);
    }
  }

  function closeMobileNav() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar) sidebar.classList.remove('nav-open');
    if (overlay) overlay.classList.remove('nav-open');
  }

  // --- 7. Deep Linking & Initial Route ---
  function handleInitialRoute() {
    let targetId = '';
    if (window.location.hash) {
      targetId = window.location.hash.replace('#', '');
    } else {
      const path = window.location.pathname.replace(/^\/|\/$/g, '');
      if (path && document.getElementById(path)) {
        targetId = path;
      }
    }

    if (!targetId || targetId === 'home') {
      document.body.classList.add('is-home');
    } else {
      document.body.classList.remove('is-home');
    }

    if (targetId && document.getElementById(targetId)) {
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  // --- 8. Keyboard Shortcuts (J / K / T) ---
  function initKeyboardNav() {
    const sectionIds = ['home', 'bio', 'blog', 'teaching', 'publications', 'contact'];
    document.addEventListener('keydown', function (e) {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 't' || e.key === 'T') {
        toggleTheme();
      } else if (e.key === 'j' || e.key === 'J') {
        navigateDelta(1);
      } else if (e.key === 'k' || e.key === 'K') {
        navigateDelta(-1);
      }
    });

    function navigateDelta(delta) {
      const activeLink = document.querySelector('.menu a.active');
      const currentId = activeLink ? activeLink.getAttribute('data-target') : 'home';
      const idx = sectionIds.indexOf(currentId);
      const nextIdx = Math.max(0, Math.min(sectionIds.length - 1, idx + delta));
      const nextId = sectionIds[nextIdx];
      const targetEl = document.getElementById(nextId);
      if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // --- Bootstrap ---
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initScrollSpy();
    initPubFilters();
    initClipboardActions();
    initMobileNav();
    initKeyboardNav();
    handleInitialRoute();

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }

    // In-page navigation for contact links
    document.querySelectorAll('a[href="https://gsahonero.github.io/contact"], a[href="/contact"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const contactSection = document.getElementById('contact');
        if (contactSection) {
          e.preventDefault();
          contactSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (history.replaceState) {
            history.replaceState(null, null, window.location.pathname + '#contact');
          }
          switchStagePanel('contact');
        }
      });
    });

    // Smooth page transitions for internal article links
    document.querySelectorAll('a[href^="/posts/"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href.startsWith('#') || this.target === '_blank') return;
        e.preventDefault();
        document.body.classList.add('page-is-exiting');
        setTimeout(() => {
          window.location.href = href;
        }, 180);
      });
    });

    // Inline Author Expansion Toggle
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.authors-toggle-btn');
      if (!btn) return;
      e.preventDefault();
      const wrap = btn.closest('.authors-wrap');
      if (!wrap) return;
      const shortSpan = wrap.querySelector('.authors-short');
      const fullSpan = wrap.querySelector('.authors-full');
      const isExpanded = btn.classList.toggle('is-expanded');
      if (isExpanded) {
        if (shortSpan) shortSpan.style.display = 'none';
        if (fullSpan) fullSpan.style.display = 'inline';
        btn.textContent = 'show less';
      } else {
        if (shortSpan) shortSpan.style.display = 'inline';
        if (fullSpan) fullSpan.style.display = 'none';
        const rem = btn.getAttribute('data-remaining') || 'more';
        btn.textContent = `+${rem} more`;
      }
    });

    // Make blog entry cards clickable in their entirety
    document.querySelectorAll('.blog-entry-card').forEach(card => {
      card.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        const targetUrl = this.getAttribute('data-url');
        if (targetUrl) {
          document.body.classList.add('page-is-exiting');
          setTimeout(() => {
            window.location.href = targetUrl;
          }, 180);
        }
      });
    });
  });

})();
