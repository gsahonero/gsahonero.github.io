/**
 * CVbuilder Importer Engine
 * Parses external resume schemas (JSON Resume, Reactive Resume, LinkedIn)
 * into CVbuilder's native database structure.
 */

var Importer = (function() {

  function parseJsonResume(jsonString) {
    var raw = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    if (!raw || typeof raw !== 'object') throw new Error("Invalid JSON data");

    var basics = raw.basics || {};
    var nameParts = (basics.name || '').trim().split(' ');
    var firstname = nameParts[0] || '';
    var lastname = nameParts.slice(1).join(' ') || '';

    var locationStr = '';
    if (basics.location) {
      if (typeof basics.location === 'string') {
        locationStr = basics.location;
      } else {
        var locArr = [basics.location.city, basics.location.region, basics.location.countryCode].filter(Boolean);
        locationStr = locArr.join(', ');
      }
    }

    var result = {
      basics: {
        firstname: firstname,
        lastname: lastname,
        title: basics.label || basics.title || '',
        email: basics.email || '',
        homepage: basics.url || basics.website || basics.homepage || '',
        location: locationStr,
        photo: basics.picture || basics.image || basics.photo || '',
        research_interests: basics.summary || ''
      },
      work: [],
      education: [],
      publications: [],
      projects: [],
      skills: {},
      languages: [],
      awards: [],
      instances: {},
      _style: typeof DEFAULT_STYLE !== 'undefined' ? JSON.parse(JSON.stringify(DEFAULT_STYLE)) : {}
    };

    // Work
    if (Array.isArray(raw.work)) {
      result.work = raw.work.map(function(w) {
        var desc = w.summary || '';
        if (Array.isArray(w.highlights) && w.highlights.length > 0) {
          desc += (desc ? '\n' : '') + w.highlights.map(function(h) { return '• ' + h; }).join('\n');
        }
        return {
          role: w.position || w.role || '',
          organization: w.name || w.company || w.organization || '',
          start: w.startDate || w.start || '',
          end: w.endDate || w.end || (w.isCurrent ? 'Present' : ''),
          description: desc,
          selected: true
        };
      });
    }

    // Education
    if (Array.isArray(raw.education)) {
      result.education = raw.education.map(function(e) {
        var deg = [e.studyType, e.area].filter(Boolean).join(' in ');
        return {
          degree: deg || e.degree || '',
          institution: e.institution || e.school || '',
          start: e.startDate || e.start || '',
          end: e.endDate || e.end || '',
          selected: true
        };
      });
    }

    // Publications
    if (Array.isArray(raw.publications)) {
      result.publications = raw.publications.map(function(p) {
        return {
          authors: p.authors || p.publisher || '',
          title: p.name || p.title || '',
          venue: p.publisher || p.venue || '',
          year: p.releaseDate || p.year || '',
          selected: true
        };
      });
    }

    // Projects
    if (Array.isArray(raw.projects)) {
      result.projects = raw.projects.map(function(pr) {
        var desc = pr.description || '';
        if (Array.isArray(pr.highlights) && pr.highlights.length > 0) {
          desc += (desc ? '\n' : '') + pr.highlights.map(function(h) { return '• ' + h; }).join('\n');
        }
        return {
          title: pr.name || pr.title || '',
          organization: pr.entity || pr.company || '',
          start: pr.startDate || pr.start || '',
          end: pr.endDate || pr.end || '',
          description: desc,
          selected: true
        };
      });
    }

    // Skills
    if (Array.isArray(raw.skills)) {
      result.skills = { technical: [] };
      raw.skills.forEach(function(s) {
        if (typeof s === 'string') {
          result.skills.technical.push({ name: s, selected: true });
        } else if (s && typeof s === 'object') {
          var group = (s.name || 'technical').toLowerCase().replace(/[^a-z0-9_]/g, '_');
          if (!result.skills[group]) result.skills[group] = [];
          if (Array.isArray(s.keywords)) {
            s.keywords.forEach(function(kw) {
              result.skills[group].push({ name: kw, selected: true });
            });
          } else if (s.name) {
            result.skills[group].push({ name: s.name, selected: true });
          }
        }
      });
    }

    // Languages
    if (Array.isArray(raw.languages)) {
      result.languages = raw.languages.map(function(l) {
        return {
          language: l.language || (typeof l === 'string' ? l : ''),
          proficiency: l.fluency || l.proficiency || '',
          selected: true
        };
      });
    }

    // Awards
    if (Array.isArray(raw.awards)) {
      result.awards = raw.awards.map(function(a) {
        return {
          category: a.title || a.category || 'Award',
          description: a.summary || a.awarder || a.description || '',
          year: a.date || a.year || '',
          selected: true
        };
      });
    }

    return result;
  }

  function parseReactiveResume(jsonString) {
    var raw = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    if (!raw || typeof raw !== 'object') throw new Error("Invalid Reactive Resume JSON");

    var basics = raw.basics || {};
    var nameParts = (basics.name || '').trim().split(' ');
    var firstname = nameParts[0] || '';
    var lastname = nameParts.slice(1).join(' ') || '';

    var result = {
      basics: {
        firstname: firstname,
        lastname: lastname,
        title: basics.headline || basics.title || '',
        email: basics.email || '',
        homepage: (basics.url && basics.url.href) ? basics.url.href : (basics.url || ''),
        location: basics.location || '',
        photo: (basics.picture && basics.picture.url) ? basics.picture.url : (basics.picture || ''),
        research_interests: basics.summary || ''
      },
      work: [],
      education: [],
      publications: [],
      projects: [],
      skills: {},
      languages: [],
      awards: [],
      instances: {},
      _style: typeof DEFAULT_STYLE !== 'undefined' ? JSON.parse(JSON.stringify(DEFAULT_STYLE)) : {}
    };

    var sec = raw.sections || {};

    if (sec.work && Array.isArray(sec.work.items)) {
      result.work = sec.work.items.map(function(w) {
        return {
          role: w.position || w.role || '',
          organization: w.company || w.name || '',
          start: w.date || w.startDate || '',
          end: w.endDate || '',
          description: w.summary || w.description || '',
          selected: true
        };
      });
    }

    if (sec.education && Array.isArray(sec.education.items)) {
      result.education = sec.education.items.map(function(e) {
        return {
          degree: [e.studyType, e.area].filter(Boolean).join(' in ') || e.degree || '',
          institution: e.institution || e.school || '',
          start: e.date || e.startDate || '',
          end: e.endDate || '',
          selected: true
        };
      });
    }

    if (sec.publications && Array.isArray(sec.publications.items)) {
      result.publications = sec.publications.items.map(function(p) {
        return {
          authors: p.publisher || p.authors || '',
          title: p.name || p.title || '',
          venue: p.publisher || p.venue || '',
          year: p.date || p.year || '',
          selected: true
        };
      });
    }

    if (sec.projects && Array.isArray(sec.projects.items)) {
      result.projects = sec.projects.items.map(function(pr) {
        return {
          title: pr.name || pr.title || '',
          organization: pr.description || '',
          start: pr.date || pr.startDate || '',
          end: pr.endDate || '',
          description: pr.summary || pr.description || '',
          selected: true
        };
      });
    }

    if (sec.skills && Array.isArray(sec.skills.items)) {
      result.skills = { technical: [] };
      sec.skills.items.forEach(function(s) {
        if (s.name) {
          result.skills.technical.push({ name: s.name, selected: true });
        }
      });
    }

    if (sec.languages && Array.isArray(sec.languages.items)) {
      result.languages = sec.languages.items.map(function(l) {
        return {
          language: l.name || l.language || '',
          proficiency: l.description || l.level || '',
          selected: true
        };
      });
    }

    return result;
  }

  function parseLinkedInExport(dataInput) {
    var raw = typeof dataInput === 'string' ? (dataInput.startsWith('{') ? JSON.parse(dataInput) : dataInput) : dataInput;
    if (typeof raw === 'object' && raw !== null) {
      return parseJsonResume(raw);
    }
    // Minimal CSV/Text parser fallback
    var lines = String(dataInput).split('\n');
    var result = {
      basics: { firstname: "LinkedIn", lastname: "User", title: "Professional", email: "", homepage: "", location: "", photo: "", research_interests: "" },
      work: [],
      education: [],
      publications: [],
      projects: [],
      skills: { technical: [] },
      languages: [],
      awards: [],
      instances: {},
      _style: typeof DEFAULT_STYLE !== 'undefined' ? JSON.parse(JSON.stringify(DEFAULT_STYLE)) : {}
    };
    lines.forEach(function(line) {
      var parts = line.split(',');
      if (parts.length >= 2) {
        result.work.push({ role: parts[0].trim(), organization: parts[1].trim(), start: '', end: '', description: '', selected: true });
      }
    });
    return result;
  }

  return {
    parseJsonResume: parseJsonResume,
    parseReactiveResume: parseReactiveResume,
    parseLinkedInExport: parseLinkedInExport
  };

})();
