/**
 * Section Definitions for CV Builder
 * Declarative JSON registry describing all supported section types,
 * their data shapes, compiler mappers, and wizard preview templates.
 */

var SECTION_DEFS = [
  {
    id: 'experience',
    icon: '💼',
    label: 'Work Experience',
    description: 'Roles, organizations, employment dates, and detailed bullet descriptions.',
    dataType: 'array',
    mapper: 'cventry_work',
    template: {
      role: '',
      organization: '',
      department: '',
      start: '',
      end: '',
      description: '',
      selected: true
    },
    previewHtml: '<div style="margin-bottom:10px"><div style="display:flex; justify-content:space-between; font-weight:bold; font-size:0.95em"><span>Software Engineer - Tech Corp</span><span style="font-size:0.85em; color:#666">2022–Present</span></div><div style="font-style:italic; color:#555; font-size:0.85em; margin-top:2px">Engineering Division</div><div style="margin-top:4px; font-size:0.85em; color:#444">Developed scalable web applications and cloud services.</div></div>'
  },
  {
    id: 'education',
    icon: '🎓',
    label: 'Education',
    description: 'Degrees, academic institutions, graduation dates, dissertations, and summaries.',
    dataType: 'array',
    mapper: 'cventry_education',
    template: {
      degree: '',
      institution: '',
      start: '',
      end: '',
      dissertation: '',
      description: '',
      selected: true
    },
    previewHtml: '<div style="margin-bottom:10px"><div style="display:flex; justify-content:space-between; font-weight:bold; font-size:0.95em"><span>B.S. in Computer Science - State University</span><span style="font-size:0.85em; color:#666">2018–2022</span></div><div style="font-style:italic; color:#555; font-size:0.85em; margin-top:2px">Thesis: Distributed Consensus Algorithms</div><div style="margin-top:4px; font-size:0.85em; color:#444">Graduated with high honors. Focused on algorithms and network systems.</div></div>'
  },
  {
    id: 'publication',
    icon: '📚',
    label: 'Publications',
    description: 'Research papers, journal articles, books, conference proceedings, and patents.',
    dataType: 'array',
    mapper: 'publications',
    template: {
      authors: '',
      title: '',
      venue: '',
      year: '',
      type: '',
      selected: true
    },
    previewHtml: '<ul style="margin:0; padding-left:16px; font-size:0.85em"><li style="margin-bottom:6px">J. Doe, A. Smith. "Optimizing Graph Partitioning." <em>ACM SIGMOD</em>, 2024.</li><li>A. Smith. "Low-Latency Data Pipelines." <em>IEEE TPDS</em>, 2023.</li></ul>'
  },
  {
    id: 'teaching',
    icon: '🏫',
    label: 'Teaching Experience',
    description: 'Courses taught, academic institutions, course levels, and list of subjects.',
    dataType: 'array',
    mapper: 'cventry_teaching',
    template: {
      course_area: '',
      institution: '',
      level: '',
      courses: [''],
      description: '',
      selected: true
    },
    previewHtml: '<div style="margin-bottom:10px"><div style="display:flex; justify-content:space-between; font-weight:bold; font-size:0.95em"><span>Computer Science Department - State University</span></div><div style="margin-top:4px; font-size:0.85em; color:#444"><em>Courses:</em> Data Structures, Operating Systems, Web Engineering</div></div>'
  },
  {
    id: 'award',
    icon: '🏆',
    label: 'Awards & Honors',
    description: 'Grants, scholarships, competitions, honors, and recognitions.',
    dataType: 'array',
    mapper: 'awards',
    template: {
      category: '',
      description: '',
      year: '',
      selected: true
    },
    previewHtml: '<ul style="margin:0; padding-left:16px; font-size:0.85em"><li style="margin-bottom:6px"><strong>Best Paper Award:</strong> ACM SIGMOD Conference (2024)</li><li><strong>Excellence Fellowship:</strong> National Science Foundation (2022)</li></ul>'
  },
  {
    id: 'skills',
    icon: '🛠️',
    label: 'Categorized Skills',
    description: 'Grouped skill categories (e.g. Languages, Frameworks, Tools) with editable items.',
    dataType: 'object',
    itemType: 'skills',
    mapper: 'skills',
    defaultCategory: 'general',
    template: {
      general: [
        { name: '', selected: true }
      ]
    },
    previewHtml: '<ul style="margin:0; padding:0; list-style:none; font-size:0.85em"><li style="margin-bottom:6px"><strong>Programming:</strong> Python, JavaScript, C++, Go</li><li><strong>Tools:</strong> Git, Docker, Kubernetes, Linux</li></ul>'
  },
  {
    id: 'simple',
    icon: '📝',
    label: 'Simple Text Section',
    description: 'Freeform text, summary paragraphs, or custom unformatted section content.',
    dataType: 'array',
    mapper: 'generic',
    template: {
      description: '',
      selected: true
    },
    previewHtml: '<div style="margin-bottom:8px; font-size:0.85em"><p style="margin:0">Passionate software professional with a strong foundation in systems engineering and distributed computing.</p></div>'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SECTION_DEFS: SECTION_DEFS };
}
