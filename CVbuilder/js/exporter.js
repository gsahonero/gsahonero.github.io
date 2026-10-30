/**
 * CVbuilder Exporter Engine
 * Converts native CVbuilder state into standard export formats
 * (JSON Resume, Reactive Resume, Markdown, and Plain Text).
 */

var Exporter = (function() {

  function getActiveData() {
    return (typeof data !== 'undefined' && data) ? data : {};
  }

  function getWorkList(d) {
    if (Array.isArray(d.work_experience)) return d.work_experience;
    if (Array.isArray(d.work)) return d.work;
    if (Array.isArray(d.experience)) return d.experience;
    return [];
  }

  function getPubList(d) {
    if (Array.isArray(d.publications)) return d.publications;
    if (Array.isArray(d.publication)) return d.publication;
    return [];
  }

  function exportToJsonResume(customData) {
    var d = customData || getActiveData();
    var b = d.basics || {};
    var workEntries = getWorkList(d);
    var pubEntries = getPubList(d);

    var jsonResume = {
      $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
      basics: {
        name: [b.firstname, b.lastname].filter(Boolean).join(' '),
        label: b.title || '',
        image: b.photo || '',
        email: b.email || '',
        phone: b.phone || '',
        url: b.homepage || '',
        summary: b.research_interests || b.summary || '',
        location: {
          address: b.location || '',
          postalCode: '',
          city: b.location || '',
          countryCode: '',
          region: ''
        },
        profiles: []
      },
      work: workEntries.filter(function(w){ return w.selected !== false; }).map(function(w) {
        var hls = Array.isArray(w.highlights) ? w.highlights.filter(Boolean) : [];
        if (!hls.length && w.description && w.description.indexOf('\n') !== -1) {
          hls = w.description.split(/\r?\n/).map(function(l){ return l.replace(/^[-*•]\s*/, '').trim(); }).filter(Boolean);
        }
        return {
          name: w.organization || w.company || '',
          position: w.role || '',
          url: w.url || '',
          startDate: w.start || '',
          endDate: w.end || '',
          summary: w.description || '',
          highlights: hls
        };
      }),
      education: Array.isArray(d.education) ? d.education.filter(function(e){ return e.selected !== false; }).map(function(e) {
        return {
          institution: e.institution || '',
          url: '',
          area: e.area || '',
          studyType: e.degree || '',
          startDate: e.start || '',
          endDate: e.end || '',
          score: e.gpa || e.score || '',
          courses: Array.isArray(e.courses) ? e.courses.map(function(c){ return typeof c === 'string' ? c : (c.name || ''); }).filter(Boolean) : []
        };
      }) : [],
      publications: pubEntries.filter(function(p){ return p.selected !== false; }).map(function(p) {
        return {
          name: p.title || '',
          publisher: p.venue || p.publisher || '',
          releaseDate: p.year || p.date || '',
          url: p.url || '',
          summary: p.authors || p.description || ''
        };
      }),
      projects: Array.isArray(d.projects) ? d.projects.filter(function(pr){ return pr.selected !== false; }).map(function(pr) {
        return {
          name: pr.title || '',
          description: pr.description || '',
          highlights: Array.isArray(pr.highlights) ? pr.highlights : [],
          startDate: pr.start || '',
          endDate: pr.end || '',
          url: pr.url || ''
        };
      }) : [],
      skills: [],
      languages: Array.isArray(d.languages) ? d.languages.filter(function(l){ return l.selected !== false; }).map(function(l) {
        return {
          language: l.language || l.name || '',
          fluency: typeof l.proficiency === 'string' ? l.proficiency : ''
        };
      }) : [],
      awards: Array.isArray(d.awards) ? d.awards.filter(function(a){ return a.selected !== false; }).map(function(a) {
        return {
          title: a.category || a.title || '',
          date: a.year || a.date || '',
          awarder: a.organization || '',
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
        work: { name: "Work Experience", items: getWorkList(d).map(function(w){ return { company: w.organization || w.company || '', position: w.role || '', date: w.start + (w.end ? ' - ' + w.end : ''), summary: w.description || '' }; }) },
        education: { name: "Education", items: Array.isArray(d.education) ? d.education.map(function(e){ return { institution: e.institution || '', studyType: e.degree || '', date: e.start + (e.end ? ' - ' + e.end : '') }; }) : [] },
        publications: { name: "Publications", items: getPubList(d).map(function(p){ return { name: p.title || '', publisher: p.venue || p.publisher || '', date: p.year || p.date || '', summary: p.authors || '' }; }) },
        projects: { name: "Projects", items: Array.isArray(d.projects) ? d.projects.map(function(pr){ return { name: pr.title || '', date: pr.start + (pr.end ? ' - ' + pr.end : ''), summary: pr.description || '' }; }) : [] }
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

    var workEntries = getWorkList(d);
    if (workEntries.length > 0) {
      lines.push('## Work Experience');
      workEntries.filter(function(w){ return w.selected !== false; }).forEach(function(w) {
        lines.push('### ' + (w.role || 'Role') + ' - ' + (w.organization || w.company || 'Company'));
        if (w.start || w.end) lines.push('*' + w.start + (w.end ? ' - ' + w.end : '') + '*');
        if (w.description || w.summary) lines.push(w.description || w.summary);
        if (Array.isArray(w.highlights) && w.highlights.length > 0) {
          w.highlights.forEach(function(hl) {
            lines.push('- ' + hl);
          });
        }
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

if (typeof window !== 'undefined') {
  window.exportMarkdown = Exporter.exportToMarkdown;
  window.exportPlainText = Exporter.exportToPlainText;
  window.exportJsonResume = Exporter.exportToJsonResume;
}
