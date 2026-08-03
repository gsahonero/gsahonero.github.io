/**
 * CVbuilder Exporter Engine
 * Converts native CVbuilder state into standard export formats
 * (JSON Resume, Reactive Resume, Markdown, and Plain Text).
 */

var Exporter = (function() {

  function getActiveData() {
    return (typeof data !== 'undefined' && data) ? data : {};
  }

  function exportToJsonResume(customData) {
    var d = customData || getActiveData();
    var b = d.basics || {};

    var jsonResume = {
      $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
      basics: {
        name: [b.firstname, b.lastname].filter(Boolean).join(' '),
        label: b.title || '',
        image: b.photo || '',
        email: b.email || '',
        phone: '',
        url: b.homepage || '',
        summary: b.research_interests || '',
        location: {
          address: b.location || '',
          postalCode: '',
          city: b.location || '',
          countryCode: '',
          region: ''
        },
        profiles: []
      },
      work: Array.isArray(d.work) ? d.work.filter(function(w){ return w.selected !== false; }).map(function(w) {
        return {
          name: w.organization || '',
          position: w.role || '',
          url: '',
          startDate: w.start || '',
          endDate: w.end || '',
          summary: w.description || '',
          highlights: []
        };
      }) : [],
      education: Array.isArray(d.education) ? d.education.filter(function(e){ return e.selected !== false; }).map(function(e) {
        return {
          institution: e.institution || '',
          url: '',
          area: '',
          studyType: e.degree || '',
          startDate: e.start || '',
          endDate: e.end || '',
          score: '',
          courses: []
        };
      }) : [],
      publications: Array.isArray(d.publications) ? d.publications.filter(function(p){ return p.selected !== false; }).map(function(p) {
        return {
          name: p.title || '',
          publisher: p.venue || '',
          releaseDate: p.year || '',
          url: '',
          summary: p.authors || ''
        };
      }) : [],
      projects: Array.isArray(d.projects) ? d.projects.filter(function(pr){ return pr.selected !== false; }).map(function(pr) {
        return {
          name: pr.title || '',
          description: pr.description || '',
          highlights: [],
          startDate: pr.start || '',
          endDate: pr.end || '',
          url: ''
        };
      }) : [],
      skills: [],
      languages: Array.isArray(d.languages) ? d.languages.filter(function(l){ return l.selected !== false; }).map(function(l) {
        return {
          language: l.language || '',
          fluency: typeof l.proficiency === 'string' ? l.proficiency : ''
        };
      }) : [],
      awards: Array.isArray(d.awards) ? d.awards.filter(function(a){ return a.selected !== false; }).map(function(a) {
        return {
          title: a.category || '',
          date: a.year || '',
          awarder: '',
          summary: a.description || ''
        };
      }) : []
    };

    if (d.skills && typeof d.skills === 'object') {
      Object.keys(d.skills).forEach(function(g) {
        var items = d.skills[g];
        if (Array.isArray(items)) {
          var names = items.filter(function(x){ return x.selected !== false; }).map(function(x){ return typeof x === 'string' ? x : (x.name || ''); }).filter(Boolean);
          if (names.length > 0) {
            jsonResume.skills.push({ name: g, level: '', keywords: names });
          }
        }
      });
    }

    return JSON.stringify(jsonResume, null, 2);
  }

  function exportToReactiveResume(customData) {
    var d = customData || getActiveData();
    var b = d.basics || {};

    var reactive = {
      basics: {
        name: [b.firstname, b.lastname].filter(Boolean).join(' '),
        headline: b.title || '',
        email: b.email || '',
        phone: '',
        location: b.location || '',
        url: { label: '', href: b.homepage || '' },
        picture: { url: b.photo || '', size: 80, aspectRatio: 1, borderRadius: 0, effects: { hidden: false } },
        summary: b.research_interests || ''
      },
      sections: {
        work: { name: "Work Experience", items: Array.isArray(d.work) ? d.work.map(function(w){ return { company: w.organization, position: w.role, date: w.start + (w.end ? ' - ' + w.end : ''), summary: w.description }; }) : [] },
        education: { name: "Education", items: Array.isArray(d.education) ? d.education.map(function(e){ return { institution: e.institution, studyType: e.degree, date: e.start + (e.end ? ' - ' + e.end : '') }; }) : [] },
        publications: { name: "Publications", items: Array.isArray(d.publications) ? d.publications.map(function(p){ return { name: p.title, publisher: p.venue, date: p.year, summary: p.authors }; }) : [] },
        projects: { name: "Projects", items: Array.isArray(d.projects) ? d.projects.map(function(pr){ return { name: pr.title, date: pr.start + (pr.end ? ' - ' + pr.end : ''), summary: pr.description }; }) : [] }
      }
    };

    return JSON.stringify(reactive, null, 2);
  }

  function exportToMarkdown(customData) {
    var d = customData || getActiveData();
    var b = d.basics || {};
    var lines = [];

    lines.push('# ' + [b.firstname, b.lastname].filter(Boolean).join(' '));
    if (b.title) lines.push('**' + b.title + '**');
    
    var contact = [b.email, b.homepage, b.location].filter(Boolean).join(' | ');
    if (contact) lines.push('*' + contact + '*\n');

    if (b.research_interests) {
      lines.push('## About / Summary');
      lines.push(b.research_interests + '\n');
    }

    if (Array.isArray(d.work) && d.work.length > 0) {
      lines.push('## Work Experience');
      d.work.filter(function(w){ return w.selected !== false; }).forEach(function(w) {
        lines.push('### ' + (w.role || 'Role') + ' - ' + (w.organization || 'Company'));
        if (w.start || w.end) lines.push('*' + w.start + (w.end ? ' - ' + w.end : '') + '*');
        if (w.description) lines.push(w.description);
        lines.push('');
      });
    }

    if (Array.isArray(d.education) && d.education.length > 0) {
      lines.push('## Education');
      d.education.filter(function(e){ return e.selected !== false; }).forEach(function(e) {
        lines.push('### ' + (e.degree || 'Degree') + ' - ' + (e.institution || 'Institution'));
        if (e.start || e.end) lines.push('*' + e.start + (e.end ? ' - ' + e.end : '') + '*');
        lines.push('');
      });
    }

    if (Array.isArray(d.publications) && d.publications.length > 0) {
      lines.push('## Publications');
      d.publications.filter(function(p){ return p.selected !== false; }).forEach(function(p) {
        lines.push('- **' + p.title + '** (' + p.year + '). *' + p.venue + '*. ' + p.authors);
      });
      lines.push('');
    }

    if (d.skills && typeof d.skills === 'object') {
      lines.push('## Skills');
      Object.keys(d.skills).forEach(function(g) {
        var items = d.skills[g];
        if (Array.isArray(items)) {
          var names = items.filter(function(x){ return x.selected !== false; }).map(function(x){ return typeof x === 'string' ? x : (x.name || ''); }).filter(Boolean);
          if (names.length > 0) {
            lines.push('- **' + g + '**: ' + names.join(', '));
          }
        }
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  function exportToPlainText(customData) {
    var md = exportToMarkdown(customData);
    return md.replace(/[#*`_]/g, '');
  }

  return {
    exportToJsonResume: exportToJsonResume,
    exportToReactiveResume: exportToReactiveResume,
    exportToMarkdown: exportToMarkdown,
    exportToPlainText: exportToPlainText
  };

})();
