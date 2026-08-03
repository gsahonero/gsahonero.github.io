var APP_VERSION = '0.8.0';
var CHANGELOG = [
  {version:'0.8.0', changes:[
    'AI Engine Integration (Ollama + Gemini): Added 100% free and offline local LLM support via Ollama (http://localhost:11434) and free Google Gemini Flash API key support (BYOK) for bullet point polishing, grammar correction, translation, and an interactive "Ask me to improve" critique wizard.',
    'ATS Score & Job Keyword Inspector: Real-time ATS compliance score calculator with live input updates, optional phone number rules, multi-schema section detection (work_experience, education), and job description keyword matcher.',
    'Data Importer & Exporter Engine: Support for importing and exporting JSON Resume (resume.json), Reactive Resume (v4/v5), LinkedIn exports, Markdown (.md), and Plain Text (.txt).',
    'Customized Field Renaming: Enabled field property label customization (e.g. basics.research_interests -> Personal Profile) across master CV and tailored instances in HTML & LaTeX previews.',
    'Drag-and-Drop Reordering & Page-Break Guides: Added HTML5 drag handles (⋮⋮) for entry reordering and visual A4 page boundary lines in live previews.',
    'Markdown Syntax Support: Write **bold**, *italic*, and [link](url) in description fields, compiled automatically into LaTeX (\\textbf, \\textit, \\href) and HTML.'
  ]},
  {version:'0.7.1', changes:[
    'Collapsible Sidebars & Outline Tree: Added panel collapse buttons for both the left sidebar (52px strip) and right outline pane (42px strip), as well as interactive section item tree expand/collapse chevrons (▼ / ▶).',
    'Interactive Guided Help System: Built interactive 6-step/card guided wizards for "How to create your CV from scratch", "How to use CV Builder" (Component Architecture), and "How to use Templates" (Style & Theme Architecture) with direct action triggers.',
    'Dynamic Config Engine: Powered interactive help guides using standalone JSON configuration files (guide_scratch.json, guide_usage.json, guide_templates.json) with fallback pre-loaders supporting offline file:// and HTTP execution.',
    'Deprecation of .cvstyle Files: Consolidated all visual theme settings, ModernCV layout choices, accent colors, typography fonts, HTML templates, and LaTeX preambles directly inside the self-contained .cv database format.',
    'Full-Width Research Interests in LaTeX: Updated ModernCV LaTeX compiler to render Research Interests summaries as clean, unindented full-width text directly under section headers.',
    'Generalizable Property Include Checkboxes: Fixed data-field-include checkboxes across all entry levels (including dates, courses, and dissertations) in both HTML and LaTeX renderers.'
  ]},
  {version:'0.7.0', changes:[
    'Modular Architectural Split: Separated the monolithic index.html file into distinct stylesheet and script layers (main.css, constants.js, translations.js, compiler.js, database.js, editor.js, tour.js, and app.js).',
    'Embedded System Diagnostics: Added an in-app system unit test dashboard accessible via Help -> Run Diagnostics, fully compatible with local file:// executions.'
  ]},
  {version:'0.6.0', changes:[
    'CV Instances: Decoupled master career profiles from tailored application resumes. Custom CV Instances (.cvinstance) let users save context-specific field overwrites, adjust section item visibilities, and apply styling rules without modifying their master databases.',
    'Language Auto-Detection & FAB Toggler: Auto-detects Spanish or English browser languages on launch, and renders a floating circle action button in the bottom-right for instant, responsive language switching.',
    'Base64 Profile Photos: Introduced a drag-and-drop/upload image loader under the Basics editor. Images are encoded as Base64 to keep JSON databases self-contained, and are compiled dynamically as binary file attachments in LaTeX compiler POST requests.',
    'Visual Customizer Tab: Created a visual theme customizer sidebar that lets users select accent colors (color picker) and font families (sans, serif, monospace, garamond, palatino) that automatically bind to LaTeX packages and HTML CSS properties.'
  ]},
  {version:'0.5.1', changes:[
    'Conditional Layout Section Headers: Integrated `has_<sectionName>` helper flags inside the rendering context to wrap HTML sections and LaTeX templates. This ensures empty or deleted sections do not display section headers, and avoids duplicate section headers in LaTeX output when multiple items are present.'
  ]},
  {version:'0.5.0', changes:[
    'LaTeX Education Entry Fix: Re-structured the `\\cventry` layout in the classic template so that optional dissertation fields are properly nested inside braces. This guarantees that exactly 6 parameters are always supplied, resolving TeX syntax errors when compiling.'
  ]},
  {version:'0.4.9', changes:[
    'LaTeX Address Linebreak Fix: Removed the invalid trailing forced linebreak (`\\\\`) from the address command in the classic template, and added an automatic migration layer inside style loader to clean up existing cached user styles.'
  ]},
  {version:'0.4.8', changes:[
    'LaTeX Brace Collision Fix: Changed raw template variable token prefix to `{{&` to prevent the parser from colliding with LaTeX command brackets (e.g. `\\title{...}`), resolving compilation failures.'
  ]},
  {version:'0.4.7', changes:[
    'Default Database Robust Overwrite: Configured automatic migration check to overwrite existing cached Default CV profiles if they are completely empty, ensuring the professional preset displays immediately on load.'
  ]},
  {version:'0.4.6', changes:[
    'Fictional Preset Data: Replaced personal Guillermo Sahonero profile references with a fictional Alex Morgan profile in default presets, and added an automatic database migration layer for existing local storage Default CV profiles.'
  ]},
  {version:'0.4.5', changes:[
    'Ko-fi Donation Integrations: Added donation hyperlinks linking to Ko-fi (https://ko-fi.com/thepolygon) in the loading screen and top-left header logo text with an animated sway-float coffee cup icon.'
  ]},
  {version:'0.4.4', changes:[
    'Help Menu Tour Restart Option: Renamed the Help menu option to "Welcome Tour Guide" and updated the last step instructions of the tour guide so users can easily rerun the tour.'
  ]},
  {version:'0.4.3', changes:[
    'LaTeX CGI Compiler Integration: Replaced latexonline.cc POST endpoint with a robust texlive.net multipart/form-data cgi-bin POST compiler to fix pdf export.',
    'Welcome Tour Prev Navigation: Added a Prev button to the welcome tour floating wizard popover card.',
    'Pre-populated Professional Defaults: Configured basic (professional) CV preset with realistic details as the default database on first launch.'
  ]},
  {version:'0.4.2', changes:[
    'Premium Loading Screen: Added a custom coffee cup steam-rising animation loading screen on initial load.',
    'Radio Button Size Fix: Fixed a CSS selector bug that was stretching radio inputs to 100% width, making preset labels readable.',
    'Modal Overlap Correction: Fixed modal stacking by closing the Manage CV Databases dialog before opening the Create New CV modal.'
  ]},
  {version:'0.4.1', changes:[
    'Welcome Guided Tour Assistant: Interactive floating popover wizard highlighting key interface components for first-time users (auto-runs on first load, manually triggerable from the Help menu).'
  ]},
  {version:'0.4.0', changes:[
    'Split-Pane Workspace Layout: Real-time side-by-side editing Form Editor (left) and previews (right) on desktop viewports.',
    'Style Presets Gallery: Instantly apply Classic Academic, Corporate Blue, or Minimalist Tech layouts to style configurations.',
    'Live LaTeX PDF Compiler: Integrates with latexonline.cc API to compile and download PDF document streams instantly in-app.',
    'List Entry Sorting: Added Up (↑) and Down (↓) reordering buttons to list entry cards for sorting list items.',
    'Bilingual Multi-Language Support: Added a Language dropdown per entry (All, EN, ES) and a global Language filter selector in the header.'
  ]},
  {version:'0.3.1', changes:[
    'Fixed live HTML template rendering bug with dot path sections (e.g. basics.email) and parent context resolution.',
    'Streamlined Style definition to strictly LaTeX and HTML templates (removing confusing metadata modal).',
    'Added Import CV button directly inside the Manage CV Databases dialog.',
    'Redesigned radio buttons in New CV modal with a premium custom card-based alignment and hover effects.'
  ]},
  {version:'0.3.0', changes:[
    'Predefined CV presets: Choose Researcher (full), Basic (essential), or Minimal (basics only) when creating a database.',
    'Section Management: Add predefined or custom sections from the sidebar, and delete sections directly from the editor.',
    'Decoupled Files: strictly separated CV data (.cv extension) and Style templates (.cvstyle extension) for independent imports/exports.',
    'Decoupled Storage: profiles for CV data and Style templates are stored and loaded independently in localStorage with matching selector dropdowns in the header.'
  ]}
];

// ── DEFAULT LATEX TEMPLATE ──
var DEFAULT_LATEX_TEMPLATE = `\\documentclass[11pt,a4paper,sans]{moderncv}
\\usepackage[utf8]{inputenc}
\\moderncvstyle{classic}
%\\moderncvcolor{grey}
\\definecolor{color2}{RGB}{60,60,60}
\\definecolor{color1}{HTML}{{{theme.accentColor}}}
{{&theme.fontLatex}}
\\usepackage{lipsum}
\\usepackage{xstring}
\\usepackage[scale=0.93]{geometry}

\\firstname{\\Huge {{basics.firstname}} \\vspace{10pt}}
\\familyname{\\\\\\Huge {{basics.lastname}}}
\\title{{{basics.title}}}
{{#basics.location}}\\address{{{basics.location}}}{{/basics.location}}
{{#basics.email}}\\email{{{basics.email}}}{{/basics.email}}
{{#basics.homepage}}\\homepage{{{basics.homepage}}}{{/basics.homepage}}
{{#has_photo}}\\photo[70pt][0.4pt]{{{photo_filename}}}{{/has_photo}}
\\hyphenation{Universidad}

\\begin{document}
{{&theme.textAlignLatex}}
\\makecvtitle
\\vspace{-1em}

{{#has_research_interests}}
\\section{{{labels.basics.research_interests}}}
{{{basics.research_interests}}}
{{/has_research_interests}}

\\renewcommand{\\listitemsymbol}{}

{{&all_sections}}

\\end{document}`;

// ── DEFAULT HTML TEMPLATE ──
var DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{basics.firstname}} {{basics.lastname}} - CV</title>
<style>
  body, h1, h2, h3, p, section, .entry, .entry-description, .entry-subheader, .contact-info, .kv-list, ul, li {
    {{&theme.textAlignCss}}
  }
  body {
    {{&theme.fontCss}}
    line-height: 1.6;
    color: #333;
    max-width: 800px;
    margin: 40px auto;
    padding: 0 20px;
    background: #fff;
  }
  .contact-info {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 30px;
    padding-bottom: 15px;
    border-bottom: 2px solid #eee;
    font-size: 0.9em;
    {{&theme.textAlignFlexCss}}
  }
  h1 {
    font-size: 2.5em;
    margin-bottom: 5px;
    color: #111;
  }
  .subtitle {
    font-size: 1.2em;
    color: #666;
    margin-bottom: 20px;
  }
  .contact-info {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 30px;
    padding-bottom: 15px;
    border-bottom: 2px solid #eee;
    font-size: 0.9em;
  }
  .contact-info a {
    color: #{{{theme.accentColor}}};
    text-decoration: none;
  }
  section {
    margin-bottom: 30px;
  }
  h2 {
    font-size: 1.5em;
    border-bottom: 2px solid #{{{theme.accentColor}}};
    padding-bottom: 5px;
    color: #{{{theme.accentColor}}};
    margin-bottom: 15px;
  }
  .entry {
    margin-bottom: 15px;
  }
  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: {{&theme.headerSpacer}}px;
    font-weight: bold;
    {{&theme.textAlignFlexCss}}
  }
  .entry-subheader {
    font-style: italic;
    color: #555;
  }
  .entry-description {
    margin-top: 5px;
    font-size: 0.95em;
    white-space: pre-wrap;
  }
  .skills-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  body, section, main, header {
    cursor: default !important;
  }
  .entry, [id^="item-"], [id^="section-"], h1, h2, h3, h4, h5, h6, p, li, span, a, img, strong, em, u, b, i, .subtitle, .contact-info > div, .kv-list > li, .entry-header, .entry-description, .entry-subheader {
    cursor: pointer !important;
  }
</style>
<script>
function getElementPath(el) {
  if (!el) return 'basics';
  
  var itemEl = el.closest('[id^="item-"]');
  if (itemEl && itemEl.id) {
    return itemEl.id.replace(/^item-/, '').replace(/-/g, '.');
  }

  var secEl = el.closest('[id^="section-"]');
  if (secEl && secEl.id) {
    return secEl.id.replace(/^section-/, '');
  }

  var anySec = el.closest('section, header, .entry, .contact-info, body');
  if (anySec && anySec.id) {
    return anySec.id.replace(/^(item|section)-/, '').replace(/-/g, '.');
  }

  return 'basics';
}

window.addEventListener('message', function(e) {
  if (!e.data) return;
  var action = e.data.action;
  
  if (action === 'scrollToItem' || action === 'scrollToSection') {
    var path = String(e.data.propPath || e.data.sectionId || '');
    var parts = path.replace(/^section-/, '').split(/[\.\-]/);
    var sectionKey = parts[0];
    
    var target = null;
    if (e.data.propPath) {
      var sanitized = 'item-' + e.data.propPath.replace(/\./g, '-');
      target = document.getElementById(sanitized);
      if (!target && parts.length >= 2) {
        target = document.getElementById('item-' + parts[0] + '-' + parts[1]);
      }
    }
    
    if (!target) {
      var secId = 'section-' + sectionKey;
      target = document.getElementById(secId) || document.getElementById(sectionKey);
    }
    
    if (!target) {
      var headings = document.querySelectorAll('h1, h2, h3, header, section');
      for (var i = 0; i < headings.length; i++) {
        var txt = (headings[i].textContent || '').trim().toLowerCase();
        if (txt && (txt.indexOf(sectionKey.toLowerCase()) !== -1)) {
          target = headings[i].closest('section') || headings[i].closest('header') || headings[i];
          break;
        }
      }
    }

    if (target) {
      var rect = target.getBoundingClientRect();
      var viewH = window.innerHeight || document.documentElement.clientHeight;
      var viewW = window.innerWidth || document.documentElement.clientWidth;
      var isVisible = (rect.top >= 0 && rect.bottom <= viewH && rect.left >= 0 && rect.right <= viewW);

      if (!e.data.force && isVisible) {
        return;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.style.transition = 'outline 0.3s ease, box-shadow 0.3s ease';
      target.style.outline = '2.5px solid #2563eb';
      target.style.borderRadius = '6px';
      target.style.boxShadow = '0 0 12px rgba(37, 99, 235, 0.3)';
      setTimeout(function() {
        if (target) {
          target.style.outline = 'none';
          target.style.boxShadow = 'none';
        }
      }, 1800);
    }
  }
});

document.addEventListener('click', function(e) {
  if (e.target && e.target.closest && e.target.closest('a')) return;
  var contentEl = e.target && e.target.closest ? e.target.closest('[id^="item-"], .entry, h1, h2, h3, p, li, span, img, .subtitle, .contact-info > div, section, header') : null;
  if (!contentEl) return;

  var rawId = '';
  var itemEl = contentEl.closest('[id^="item-"]');
  if (itemEl && itemEl.id) {
    rawId = itemEl.id;
  } else {
    var secEl = contentEl.closest('[id^="section-"]');
    if (secEl && secEl.id) {
      rawId = secEl.id;
    }
  }

  if (rawId) {
    window.parent.postMessage({
      action: 'previewClickFocus',
      rawId: rawId
    }, '*');
  }
});
</script>
</head>
<body>

  <header id="section-basics" style="display:flex; align-items:center; margin-bottom:15px">
    <div>
      <h1 id="item-basics-firstname" style="margin:0">{{basics.firstname}} {{basics.lastname}}</h1>
      <div id="item-basics-title" class="subtitle" style="margin-top:4px; margin-bottom:0">{{basics.title}}</div>
    </div>
    {{#basics.photo}}
    <img id="item-basics-photo" src="{{basics.photo}}" alt="Profile photo" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:2px solid #{{{theme.accentColor}}}; flex-shrink:0; margin-left:{{theme.photoLeftOffset}}px; margin-top:{{theme.photoTopOffset}}px;">
    {{/basics.photo}}
  </header>
  <div class="contact-info">
    {{#basics.email}}<div id="item-basics-email">{{labels.basics.email}}: <a href="mailto:{{basics.email}}">{{basics.email}}</a></div>{{/basics.email}}
    {{#basics.homepage}}<div id="item-basics-homepage">{{labels.basics.homepage}}: <a href="{{basics.homepage}}" target="_blank">{{basics.homepage}}</a></div>{{/basics.homepage}}
    {{#basics.location}}<div id="item-basics-location">{{labels.basics.location}}: {{basics.location}}</div>{{/basics.location}}
  </div>

  {{#basics.research_interests}}
  <section id="section-research_interests">
    <h2>{{labels.basics.research_interests}}</h2>
    <p id="item-basics-research_interests">{{basics.research_interests}}</p>
  </section>
  {{/basics.research_interests}}

  <style>
    body { position: relative; }
    .page-break-guide {
      position: absolute;
      left: -20px;
      right: -20px;
      height: 0;
      border-bottom: 2px dashed #38bdf8;
      pointer-events: none;
      z-index: 9999;
    }
    .page-break-guide::after {
      content: attr(data-label);
      position: absolute;
      right: 10px;
      top: -10px;
      background: #38bdf8;
      color: #fff;
      font-size: 10px;
      font-weight: bold;
      padding: 1px 6px;
      border-radius: 4px;
      font-family: sans-serif;
    }
  </style>
  <script>
  function renderPageBreakGuides() {
    document.querySelectorAll('.page-break-guide').forEach(function(el){ el.remove(); });
    var bodyH = document.body.scrollHeight;
    var pageH = 1050;
    var pageNum = 1;
    var top = pageH;
    while (top < bodyH) {
      var guide = document.createElement('div');
      guide.className = 'page-break-guide';
      guide.style.top = top + 'px';
      guide.setAttribute('data-label', 'End of Page ' + pageNum + ' (A4)');
      document.body.appendChild(guide);
      pageNum++;
      top += pageH;
    }
  }
  window.addEventListener('load', renderPageBreakGuides);
  window.addEventListener('resize', renderPageBreakGuides);
  setTimeout(renderPageBreakGuides, 300);
  </script>
 </body>
</html>`;

// ── PRESETS & LOCAL STORAGE DATABASES ──
var RESEARCHER_CV = {
  "basics": {
    "firstname": "Alex",
    "lastname": "Morgan",
    "title": "Computer Science Researcher",
    "email": "alex.morgan@example.com",
    "homepage": "alexmorgan.dev",
    "location": "San Francisco, CA",
    "photo": "",
    "research_interests": "Focusing on distributed databases, decentralized consensus algorithms, and web application scalability."
  },
  "education": [
    {
      "degree": "Ph.D. in Computer Science",
      "institution": "Stanford University",
      "start": "2018",
      "end": "2022",
      "description": "Conducted research on decentralized state machine replication.",
      "dissertation": "Scalability Limits in Distributed Consensus Systems",
      "selected": true
    }
  ],
  "research_experience": [
    {
      "organization": "Pacific Northwest Lab",
      "role": "Postdoctoral Researcher",
      "start": "2023",
      "end": "Present",
      "description": "Investigating high-throughput peer-to-peer messaging topologies.",
      "selected": true
    }
  ],
  "work_experience": [
    {
      "role": "Software Research Engineer",
      "department": "R&D Lab",
      "organization": "Skyward Innovations",
      "start": "2022",
      "end": "2023",
      "description": "Implemented prototypes for transactional key-value databases.",
      "selected": true
    }
  ],
  "teaching_experience": [
    {
      "course_area": "Distributed Systems",
      "institution": "Stanford University",
      "level": "Graduate course",
      "courses": ["Advanced Systems Lab", "Consensus Protocols Seminar"],
      "selected": true
    }
  ],
  "publications": [
    {
      "authors": "A. Morgan, J. Doe",
      "title": "Scalable Consensus via Optimistic Lock-Free Transactions",
      "venue": "IEEE Transactions on Parallel & Distributed Systems",
      "year": "2022",
      "selected": true
    }
  ],
  "abstracts": [
    {
      "authors": "A. Morgan",
      "title": "On-chain scaling boundaries for distributed ledgers",
      "venue": "ACM SIGCOMM Poster Session",
      "year": "2021",
      "type": "Poster",
      "selected": true
    }
  ],
  "awards": [
    {
      "category": "Best Paper Award",
      "description": "Received at IEEE TPDS for outstanding paper contributions.",
      "year": "2022",
      "selected": true
    }
  ],
  "continuing_education": [
    {
      "type": "Summer School",
      "title": "Decentralized Systems & Cryptography",
      "year": "2020",
      "details": "Selected attendee for a 2-week intensive course.",
      "selected": true
    }
  ],
  "skills": {
    "programming": ["Python", "C++", "JavaScript", "Go", "LaTeX"],
    "tools": ["Git", "Linux", "Docker", "Kubernetes"]
  },
  "languages": [
    {
      "language": "English",
      "proficiency": "Native speaker",
      "selected": true
    },
    {
      "language": "Spanish",
      "proficiency": "Fluent / Professional",
      "selected": true
    }
  ],
  "_style": {
    "cvTitle": "Curriculum Vitae",
    "style": "classic",
    "preamble": "",
    "footer": "",
    "latexTemplate": "",
    "htmlTemplate": "",
    "mappers": {},
    "theme": { "accentColor": "#2563eb", "font": "sans", "photoLeftOffset": 40, "photoTopOffset": 0 }
  },
  "instances": {}
};

var BASIC_CV = {
  "basics": {
    "firstname": "Alex",
    "lastname": "Morgan",
    "title": "Senior Software Architect",
    "email": "alex.morgan@example.com",
    "homepage": "alexmorgan.dev",
    "location": "San Francisco, CA",
    "photo": "",
    "research_interests": "Experienced software architect specialized in web technologies, distributed systems, and agentic workflows."
  },
  "education": [
    {
      "degree": "M.S. in Computer Science",
      "institution": "Stanford University",
      "start": "2018",
      "end": "2020",
      "description": "Graduated with honors. Focused on software engineering and cloud systems.",
      "dissertation": "Decoupled Web Architectures using Distributed Message Brokers",
      "selected": true
    }
  ],
  "work_experience": [
    {
      "role": "Lead Architect",
      "department": "Engineering Team",
      "organization": "Skyward Innovations",
      "start": "2021",
      "end": "Present",
      "description": "Led the development of a real-time collaborative workspace platform. Streamlined production deployments and improved response times by 40%. Managed a cross-functional team of 12 engineers.",
      "selected": true
    }
  ],
  "skills": {
    "programming": ["JavaScript", "TypeScript", "Python", "Go", "LaTeX"],
    "tools": ["Docker", "Kubernetes", "Git", "GitHub Actions", "Vite"]
  },
  "languages": [
    {
      "language": "English",
      "proficiency": "Native speaker",
      "selected": true
    },
    {
      "language": "Spanish",
      "proficiency": "Fluent / Professional",
      "selected": true
    }
  ],
  "_style": {
    "cvTitle": "Curriculum Vitae",
    "style": "classic",
    "preamble": "",
    "footer": "",
    "latexTemplate": "",
    "htmlTemplate": "",
    "mappers": {},
    "theme": { "accentColor": "#2563eb", "font": "sans", "photoLeftOffset": 40, "photoTopOffset": 0 }
  },
  "instances": {}
};

var MINIMAL_CV = {
  "basics": {"firstname":"","lastname":"","title":"","email":"","homepage":"","location":"","photo":"","research_interests":""},
  "_style": {
    "cvTitle": "Curriculum Vitae",
    "style": "classic",
    "preamble": "",
    "footer": "",
    "latexTemplate": "",
    "htmlTemplate": "",
    "mappers": {},
    "theme": { "accentColor": "#2563eb", "font": "sans", "photoLeftOffset": 40, "photoTopOffset": 0 }
  },
  "instances": {}
};

var STYLE_PRESETS = {
  classic: {
    name: "Classic Academic",
    desc: "The default classic moderncv template with blue accents, ideal for academia and research roles.",
    latexTemplate: DEFAULT_LATEX_TEMPLATE,
    htmlTemplate: DEFAULT_HTML_TEMPLATE
  },
  corporate: {
    name: "Corporate Blue",
    desc: "A clean, modern corporate format with horizontal dividers, side-by-side section labels, and prominent contact details.",
    latexTemplate: `\\documentclass[11pt,a4paper,sans]{moderncv}
\\usepackage[utf8]{inputenc}
\\moderncvstyle{banking}
\\moderncvcolor{blue}
\\usepackage[scale=0.9]{geometry}
\\firstname{{{basics.firstname}}}
\\familyname{{{basics.lastname}}}
\\title{{{basics.title}}}
{{#basics.location}}\\address{{{basics.location}}}{{/basics.location}}
{{#basics.email}}\\email{{{basics.email}}}{{/basics.email}}
{{#basics.homepage}}\\homepage{{{basics.homepage}}}{{/basics.homepage}}

\\begin{document}
\\makecvtitle
\\vspace{-1.5em}

{{#has_research_interests}}
\\section{{{labels.basics.research_interests}}}
\\cvitem{}{{{basics.research_interests}}}
{{/has_research_interests}}

{{#has_education}}
\\section{Education}
{{#education}}
\\cventry{{{date_paren}}}{{{degree}}}{{{institution}}}{}{}{{{description}}}
{{/education}}
{{/has_education}}

{{#has_work_experience}}
\\section{Experience}
{{#work_experience}}
\\cventry{{{date_dash}}}{{{role}}}{{{organization}}}{{{department}}}{}{{{description}}}
{{/work_experience}}
{{/has_work_experience}}

{{#has_publications}}
\\section{Publications}
{{#publications}}
\\cvitem{-}{{{{authors}}}. \\textquotedblleft {{{title}}}.\textquotedblright\\ \\textit{{{{venue}}}}. {{{year}}}.}
{{/publications}}
{{/has_publications}}

{{#has_skills}}
\\section{Skills}
{{#skills}}
\\cvitem{{{group}}}{{{items_csv}}}
{{/skills}}
{{/has_skills}}

{{#has_languages}}
\\section{Languages}
{{#languages}}
\\cvitem{{{language}}}{{{proficiency_desc}}}
{{/languages}}
{{/has_languages}}

\\end{document}`,
    htmlTemplate: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{basics.firstname}} {{basics.lastname}} - Resume</title>
<style>
  body {
    font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
    color: #1e293b;
    background: #f8fafc;
    margin: 0;
    padding: 0;
    line-height: 1.5;
  }
  .header-banner {
    background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
    color: white;
    padding: 40px 20px;
    text-align: center;
    border-bottom: 5px solid #3b82f6;
  }
  .header-banner h1 {
    font-size: 2.8em;
    margin: 0 0 10px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .header-banner .subtitle {
    font-size: 1.3em;
    color: #93c5fd;
    font-weight: 500;
  }
  .contact-info {
    display: flex;
    justify-content: center;
    gap: 20px;
    flex-wrap: wrap;
    margin-top: 20px;
    font-size: 0.9em;
  }
  .contact-info a {
    color: #60a5fa;
    text-decoration: none;
  }
  .container {
    max-width: 850px;
    margin: 30px auto;
    padding: 20px;
  }
  section {
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1);
    margin-bottom: 24px;
    border: 1px solid #e2e8f0;
  }
  h2 {
    font-size: 1.4em;
    color: #0f172a;
    margin-top: 0;
    margin-bottom: 20px;
    border-bottom: 2px solid #f1f5f9;
    padding-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .entry {
    margin-bottom: 20px;
    border-left: 3px solid #3b82f6;
    padding-left: 15px;
  }
  .entry:last-child {
    margin-bottom: 0;
  }
  .entry-header {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    color: #0f172a;
  }
  .entry-subheader {
    font-style: italic;
    color: #475569;
    margin-top: 2px;
  }
  .entry-description {
    margin-top: 8px;
    font-size: 0.95em;
    color: #334155;
  }
  .skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }
  .skills-card {
    background: #f8fafc;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }
  .skills-card strong {
    color: #1e3a8a;
  }
</style>
</head>
<body>
  <div class="header-banner" id="section-basics">
    <h1 id="item-basics-firstname">{{basics.firstname}} {{basics.lastname}}</h1>
    <div id="item-basics-title" class="subtitle">{{basics.title}}</div>
    <div class="contact-info">
      {{#basics.email}}<div id="item-basics-email">Email: <a href="mailto:{{basics.email}}">{{basics.email}}</a></div>{{/basics.email}}
      {{#basics.homepage}}<div id="item-basics-homepage">Web: <a href="{{basics.homepage}}" target="_blank">{{basics.homepage}}</a></div>{{/basics.homepage}}
      {{#basics.location}}<div id="item-basics-location">Location: {{basics.location}}</div>{{/basics.location}}
    </div>
  </div>

  <div class="container">
    {{#basics.research_interests}}
    <section id="section-research_interests">
      <h2>Executive Summary</h2>
      <p id="item-basics-research_interests">{{basics.research_interests}}</p>
    </section>
    {{/basics.research_interests}}

    <section id="section-education">
      <h2>Education</h2>
      {{#education}}
      <div class="entry" id="item-education-{{_idx}}">
        <div class="entry-header">
          <span>{{degree}} - {{institution}}</span>
          <span>{{date_paren}}</span>
        </div>
        {{#dissertation}}<div class="entry-subheader">Dissertation: {{dissertation}}</div>{{/dissertation}}
        <div class="entry-description">{{description}}</div>
      </div>
      {{/education}}
    </section>

    <section id="section-work_experience">
      <h2>Professional Experience</h2>
      {{#work_experience}}
      <div class="entry" id="item-work_experience-{{_idx}}">
        <div class="entry-header">
          <span>{{role}} - {{organization}}</span>
          <span>{{date_dash}}</span>
        </div>
        {{#department}}<div class="entry-subheader">{{department}}</div>{{/department}}
        <div class="entry-description">{{description}}</div>
      </div>
      {{/work_experience}}
    </section>

    <section id="section-skills">
      <h2>Key Skills</h2>
      <div class="skills-grid">
        {{#skills}}
        <div class="skills-card" id="item-skills-{{_idx}}">
          <strong>{{group}}</strong>
          <div style="margin-top: 5px; font-size:0.9em; color:#475569">{{items_csv}}</div>
        </div>
        {{/skills}}
      </div>
    </section>
  </div>
</body>
</html>`
  },
  tech: {
    name: "Minimalist Tech",
    desc: "A developer portfolio layout with monospaced accents, dark mode styling, emerald highlights, and item tags.",
    latexTemplate: `\\documentclass[11pt,a4paper,sans]{moderncv}
\\usepackage[utf8]{inputenc}
\\moderncvstyle{casual}
\\moderncvcolor{emerald}
\\usepackage[scale=0.92]{geometry}
\\firstname{{{basics.firstname}}}
\\familyname{{{basics.lastname}}}
\\title{{{basics.title}}}
{{#basics.location}}\\address{{{basics.location}}}{{/basics.location}}
{{#basics.email}}\\email{{{basics.email}}}{{/basics.email}}
{{#basics.homepage}}\\homepage{{{basics.homepage}}}{{/basics.homepage}}

\\begin{document}
\\makecvtitle

{{#has_education}}
\\section{Education}
{{#education}}
\\cventry{{{date_paren}}}{{{degree}}}{{{institution}}}{}{}{{{description}}}
{{/education}}
{{/has_education}}

{{#has_work_experience}}
\\section{Experience}
{{#work_experience}}
\\cventry{{{date_dash}}}{{{role}}}{{{organization}}}{}{}{{{description}}}
{{/work_experience}}
{{/has_work_experience}}

{{#has_skills}}
\\section{Skills}
{{#skills}}
\\cvitem{{{group}}}{{{items_csv}}}
{{/skills}}
{{/has_skills}}

\\end{document}`,
    htmlTemplate: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{basics.firstname}} {{basics.lastname}} - Portfolio</title>
<style>
  body {
    font-family: 'Fira Code', 'Courier New', monospace;
    background: #0f172a;
    color: #e2e8f0;
    max-width: 800px;
    margin: 40px auto;
    padding: 0 20px;
    line-height: 1.6;
  }
  header {
    border-bottom: 1px dashed #334155;
    padding-bottom: 20px;
    margin-bottom: 30px;
  }
  h1 {
    color: #10b981;
    font-size: 2em;
    margin: 0;
  }
  .subtitle {
    color: #94a3b8;
    font-size: 1.1em;
  }
  .contact {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    font-size: 0.9em;
    margin-top: 10px;
    color: #94a3b8;
  }
  .contact a {
    color: #34d399;
  }
  h2 {
    color: #10b981;
    font-size: 1.3em;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 5px;
    margin-top: 40px;
  }
  .entry {
    margin-bottom: 20px;
  }
  .entry-header {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    color: #f8fafc;
  }
  .entry-description {
    color: #94a3b8;
    margin-top: 5px;
  }
  .tag {
    background: #064e3b;
    color: #34d399;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.85em;
    display: inline-block;
    margin: 3px;
  }
</style>
</head>
<body>
  <header>
    <h1>> {{basics.firstname}} {{basics.lastname}}</h1>
    <div class="subtitle">{{basics.title}}</div>
    <div class="contact">
      {{#basics.email}}<div>Email: <a href="mailto:{{basics.email}}">{{basics.email}}</a></div>{{/basics.email}}
      {{#basics.homepage}}<div>Web: <a href="{{basics.homepage}}" target="_blank">{{basics.homepage}}</a></div>{{/basics.homepage}}
      {{#basics.location}}<div>Location: {{basics.location}}</div>{{/basics.location}}
    </div>
  </header>

  <section>
    <h2># Education</h2>
    {{#education}}
    <div class="entry">
      <div class="entry-header">
        <span>{{degree}} @ {{institution}}</span>
        <span>[{{date_paren}}]</span>
      </div>
      <div class="entry-description">{{description}}</div>
    </div>
    {{/education}}
  </section>

  <section>
    <h2># Experience</h2>
    {{#work_experience}}
    <div class="entry">
      <div class="entry-header">
        <span>{{role}} @ {{organization}}</span>
        <span>[{{date_dash}}]</span>
      </div>
      <div class="entry-description">{{description}}</div>
    </div>
    {{/work_experience}}
  </section>

  <section>
    <h2># Skills</h2>
    {{#skills}}
    <div style="margin-bottom: 15px">
      <strong>{{group}}:</strong>
      <div style="margin-top: 5px">
        {{#items}}
        <span class="tag">{{name}}</span>
        {{/items}}
      </div>
    </div>
    {{/skills}}
  </section>
</body>
</html>`
  }
};

var DEFAULT_MAPPERS = {
  education:'cventry_education', research_experience:'cventry_research',
  work_experience:'cventry_work', teaching_experience:'cventry_teaching',
  publications:'publications', abstracts:'abstracts', awards:'awards',
  continuing_education:'continuing_education', skills:'skills', languages:'languages'
};

function parseMarkdown(text) {
  if (!text) return '';
  var str = String(text);

  var html = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/```([a-z]*)\n?([\s\S]*?)```/gi, function(match, lang, code) {
    return '<pre style="background:var(--color-surface-offset); padding:8px 10px; border-radius:var(--radius-sm); font-family:monospace; font-size:11px; overflow-x:auto; margin:6px 0; border:1px solid oklch(from var(--color-text) l c h / .1)"><code>' + code.trim() + '</code></pre>';
  });

  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--color-surface-offset); padding:2px 5px; border-radius:3px; font-family:monospace; font-size:11px; color:var(--color-primary)">$1</code>');

  html = html.replace(/^### (.*$)/gim, '<h4 style="margin:8px 0 4px 0; font-size:13px; font-weight:700">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 style="margin:10px 0 4px 0; font-size:14px; font-weight:700">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 style="margin:12px 0 6px 0; font-size:15px; font-weight:700">$1</h2>');

  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-left:16px; list-style-type:disc">$1</li>');

  html = html.replace(/\n/g, '<br>');

  return html;
}

