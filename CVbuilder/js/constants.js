var APP_VERSION = '0.7.0';
var CHANGELOG = [
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
{{#basics.photo}}\\photo[70pt][0.4pt]{{{basics.photo}}}{{/basics.photo}}
\\hyphenation{Universidad}

\\begin{document}
\\makecvtitle
\\vspace{-1em}

{{#has_research_interests}}
\\section{{{labels.basics.research_interests}}}
\\cvlistitem{{{basics.research_interests}}}
{{/has_research_interests}}

\\renewcommand{\\listitemsymbol}{}

{{#has_education}}
\\section{{{sections.education.title}}}
{{#education}}
\\cventry{{{date_paren}}}{{{degree}}}{{{institution}}}{}{ {{#dissertation}}\\textbf{Dissertation: } {{{dissertation}}}{{/dissertation}} }{{{description}}}
{{/education}}
{{/has_education}}

{{#has_work_experience}}
\\section{{{sections.work_experience.title}}}
{{#work_experience}}
\\cventry{{{date_dash}}}{{{role}}}{{{department}}}{{{organization}}}{}{{{description}}}
{{/work_experience}}
{{/has_work_experience}}

{{#has_publications}}
\\section{{{sections.publications.title}}}
{{#publications}}
\\cvitem{-}{{{authors}}}. \\textquotedblleft {{{title}}}.\\textquotedblright\\ \\textit{{{venue}}}. {{{year}}}.}
{{/publications}}
{{/has_publications}}

{{#has_skills}}
\\section{{{sections.skills.title}}}
{{#skills}}
\\cvitemwithcomment{{{group}}}{\\parbox[t]{0.85\\textwidth}{{{{items_csv}}}}}{}
{{/skills}}
{{/has_skills}}

{{#has_languages}}
\\section{{{sections.languages.title}}}
{{#languages}}
\\cvitemwithcomment{{{language}}}{{{proficiency_desc}}}{}
{{/languages}}
{{/has_languages}}

\\end{document}`;

// ── DEFAULT HTML TEMPLATE ──
var DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{basics.firstname}} {{basics.lastname}} - CV</title>
<style>
  body {
    {{&theme.fontCss}}
    line-height: 1.6;
    color: #333;
    max-width: 800px;
    margin: 40px auto;
    padding: 0 20px;
    background: #fff;
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
    font-weight: bold;
  }
  .entry-subheader {
    font-style: italic;
    color: #555;
  }
  .entry-description {
    margin-top: 5px;
    font-size: 0.95em;
  }
  .skills-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .skills-list li {
    margin-bottom: 8px;
  }
</style>
</head>
<body>

  <header>
    <h1>{{basics.firstname}} {{basics.lastname}}</h1>
    <div class="subtitle">{{basics.title}}</div>
    <div class="contact-info">
      {{#basics.email}}<div>{{labels.basics.email}}: <a href="mailto:{{basics.email}}">{{basics.email}}</a></div>{{/basics.email}}
      {{#basics.homepage}}<div>{{labels.basics.homepage}}: <a href="{{basics.homepage}}" target="_blank">{{basics.homepage}}</a></div>{{/basics.homepage}}
      {{#basics.location}}<div>{{labels.basics.location}}: {{basics.location}}</div>{{/basics.location}}
    </div>
  </header>

  {{#basics.research_interests}}
  <section>
    <h2>{{labels.basics.research_interests}}</h2>
    <p>{{basics.research_interests}}</p>
  </section>
  {{/basics.research_interests}}

  {{#has_education}}
  <section>
    <h2>{{sections.education.title}}</h2>
    {{#education}}
    <div class="entry">
      <div class="entry-header">
        <span>{{degree}} - {{institution}}</span>
        <span>{{date_paren}}</span>
      </div>
      {{#dissertation}}<div class="entry-subheader">Dissertation: {{dissertation}}</div>{{/dissertation}}
      <div class="entry-description">{{description}}</div>
    </div>
    {{/education}}
  </section>
  {{/has_education}}

  {{#has_work_experience}}
  <section>
    <h2>{{sections.work_experience.title}}</h2>
    {{#work_experience}}
    <div class="entry">
      <div class="entry-header">
        <span>{{role}} - {{organization}}</span>
        <span>{{date_dash}}</span>
      </div>
      {{#department}}<div class="entry-subheader">{{department}}</div>{{/department}}
      <div class="entry-description">{{description}}</div>
    </div>
    {{/work_experience}}
  </section>
  {{/has_work_experience}}

  {{#has_publications}}
  <section>
    <h2>{{sections.publications.title}}</h2>
    <ul>
      {{#publications}}
      <li>{{authors}}. "{{title}}." <em>{{venue}}</em>, {{year}}.</li>
      {{/publications}}
    </ul>
  </section>
  {{/has_publications}}

  {{#has_skills}}
  <section>
    <h2>{{sections.skills.title}}</h2>
    <ul class="skills-list">
      {{#skills}}
      <li><strong>{{group}}:</strong> {{items_csv}}</li>
      {{/skills}}
    </ul>
  </section>
  {{/has_skills}}

  {{#has_languages}}
  <section>
    <h2>{{sections.languages.title}}</h2>
    <ul>
      {{#languages}}
      <li>{{language}}: {{proficiency_desc}}</li>
      {{/languages}}
    </ul>
  </section>
  {{/has_languages}}

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
  ]
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
  ]
};

var MINIMAL_CV = {
  "basics": {"firstname":"","lastname":"","title":"","email":"","homepage":"","location":"","photo":"","research_interests":""}
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
\\section{Summary}
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
  <div class="header-banner">
    <h1>{{basics.firstname}} {{basics.lastname}}</h1>
    <div class="subtitle">{{basics.title}}</div>
    <div class="contact-info">
      {{#basics.email}}<div>Email: <a href="mailto:{{basics.email}}">{{basics.email}}</a></div>{{/basics.email}}
      {{#basics.homepage}}<div>Web: <a href="{{basics.homepage}}" target="_blank">{{basics.homepage}}</a></div>{{/basics.homepage}}
      {{#basics.location}}<div>Location: {{basics.location}}</div>{{/basics.location}}
    </div>
  </div>

  <div class="container">
    {{#basics.research_interests}}
    <section>
      <h2>Executive Summary</h2>
      <p>{{basics.research_interests}}</p>
    </section>
    {{/basics.research_interests}}

    <section>
      <h2>Education</h2>
      {{#education}}
      <div class="entry">
        <div class="entry-header">
          <span>{{degree}} - {{institution}}</span>
          <span>{{date_paren}}</span>
        </div>
        {{#dissertation}}<div class="entry-subheader">Dissertation: {{dissertation}}</div>{{/dissertation}}
        <div class="entry-description">{{description}}</div>
      </div>
      {{/education}}
    </section>

    <section>
      <h2>Professional Experience</h2>
      {{#work_experience}}
      <div class="entry">
        <div class="entry-header">
          <span>{{role}} - {{organization}}</span>
          <span>{{date_dash}}</span>
        </div>
        {{#department}}<div class="entry-subheader">{{department}}</div>{{/department}}
        <div class="entry-description">{{description}}</div>
      </div>
      {{/work_experience}}
    </section>

    <section>
      <h2>Key Skills</h2>
      <div class="skills-grid">
        {{#skills}}
        <div class="skills-card">
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

