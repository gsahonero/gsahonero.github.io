/**
 * CVbuilder ATS Optimization & Keyword Inspector Engine
 * Calculates ATS score (0-100%) and evaluates target Job Description keyword density.
 */

var ATSChecker = (function() {

  var ACTION_VERBS = [
    'achieved', 'engineered', 'developed', 'designed', 'built', 'led', 'managed',
    'increased', 'improved', 'optimized', 'reduced', 'implemented', 'orchestrated',
    'launched', 'published', 'spearheaded', 'integrated', 'delivered', 'accelerated',
    'created', 'executed', 'established', 'formulated', 'generated', 'transformed',
    'architected', 'negotiated', 'streamlined', 'pioneered', 'quantified', 'overhauled'
  ];

  function isObj(o) {
    return typeof o === 'object' && o !== null;
  }

  function resolveVal(path, masterVal) {
    if (typeof getInstanceValue === 'function') {
      return getInstanceValue(path, masterVal);
    }
    if (typeof activeInstance !== 'undefined' && activeInstance && activeInstance.overwrites && activeInstance.overwrites[path] !== undefined) {
      return activeInstance.overwrites[path];
    }
    return masterVal;
  }

  function getSectionEntries(d, keys) {
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (Array.isArray(d[k]) && d[k].length > 0) {
        var activeItems = d[k].filter(function(x) { return typeof x !== 'object' || x === null || x.selected !== false; });
        if (activeItems.length > 0) return activeItems;
      }
    }
    return [];
  }

  function calculateAtsScore(customData) {
    var d = customData || (typeof data !== 'undefined' ? data : {});
    var b = d.basics || {};

    var emailVal = resolveVal('basics.email', b.email);
    var locationVal = resolveVal('basics.location', b.location);
    var titleVal = resolveVal('basics.title', b.title || b.role || b.headline || b.label);
    var linkVal = resolveVal('basics.homepage', b.homepage || b.website || b.linkedin || b.github);

    var checks = [];
    var score = 0;

    // 1. Email check (10 pts)
    if (emailVal && String(emailVal).indexOf('@') !== -1 && String(emailVal).indexOf('.') !== -1) {
      checks.push({ name: 'Email Address Provided (Valid Format)', passed: true, weight: 10, tip: 'Valid professional email address present.' });
      score += 10;
    } else {
      checks.push({ name: 'Email Address Missing or Invalid', passed: false, weight: 10, tip: 'Add a valid professional email address (e.g. alex@domain.com) under Basics.' });
    }

    // 2. Location check (10 pts)
    if (locationVal && String(locationVal).trim()) {
      checks.push({ name: 'Location / City Provided', passed: true, weight: 10, tip: 'Location present for ATS geographical filtering.' });
      score += 10;
    } else {
      checks.push({ name: 'Location / City Missing', passed: false, weight: 10, tip: 'Add your city/country location under Basics.' });
    }

    // 3. Professional Title / Headline (10 pts)
    if (titleVal && String(titleVal).trim()) {
      checks.push({ name: 'Professional Title / Headline', passed: true, weight: 10, tip: 'Job title / headline present under Basics.' });
      score += 10;
    } else {
      checks.push({ name: 'Professional Title / Headline Missing', passed: false, weight: 10, tip: 'Add a clear target job title (e.g., Senior Software Engineer) under Basics.' });
    }

    // 4. LinkedIn / Portfolio Web Link (10 pts)
    if (linkVal && String(linkVal).trim()) {
      checks.push({ name: 'LinkedIn / Portfolio Web Link', passed: true, weight: 10, tip: 'Professional web link or profile present.' });
      score += 10;
    } else {
      checks.push({ name: 'LinkedIn / Portfolio Link Missing', passed: false, weight: 10, tip: 'Add your LinkedIn or portfolio URL under Basics.' });
    }

    // 5. Work Experience check (15 pts)
    var workEntries = getSectionEntries(d, ['work_experience', 'work', 'experience', 'research_experience', 'teaching_experience', 'professional_experience', 'projects']);
    if (workEntries.length > 0) {
      checks.push({ name: 'Work Experience Listed (' + workEntries.length + ' entries)', passed: true, weight: 15, tip: 'Work history entries present.' });
      score += 15;
    } else {
      checks.push({ name: 'Work Experience Missing', passed: false, weight: 15, tip: 'Add work experience or professional projects.' });
    }

    // 6. Education check (15 pts)
    var eduEntries = getSectionEntries(d, ['education', 'academic', 'studies', 'academic_background', 'continuing_education']);
    if (eduEntries.length > 0) {
      checks.push({ name: 'Education Listed (' + eduEntries.length + ' entries)', passed: true, weight: 15, tip: 'Degree or institutional education present.' });
      score += 15;
    } else {
      checks.push({ name: 'Education Section Missing', passed: false, weight: 15, tip: 'Add degree or institutional education.' });
    }

    // 7. Skills & Technologies Section (10 pts)
    var skillsEntries = getSectionEntries(d, ['skills', 'competencies', 'technologies', 'languages', 'skills_and_technologies']);
    if (skillsEntries.length > 0 || (isObj(d.skills) && Object.keys(d.skills).length > 0)) {
      checks.push({ name: 'Skills & Core Competencies Listed', passed: true, weight: 10, tip: 'Technical & core skill section present.' });
      score += 10;
    } else {
      checks.push({ name: 'Skills Section Missing', passed: false, weight: 10, tip: 'Add technical skills or core competencies to boost keyword indexing.' });
    }

    // 8. Measurable Impact & Metrics ($ / % / numbers) (10 pts)
    var fullText = (JSON.stringify(d) || '').toLowerCase();
    if (typeof activeInstance !== 'undefined' && activeInstance && activeInstance.overwrites) {
      fullText += ' ' + (JSON.stringify(activeInstance.overwrites) || '').toLowerCase();
    }

    var metricMatches = fullText.match(/(\b\d+%\b|\$\d+|\b\d+\s*(k|m|b|percent|users|clients|projects|million|billion)\b|\b\d{2,}\b)/gi) || [];
    var metricCount = metricMatches.length;

    if (metricCount >= 3) {
      checks.push({ name: 'Measurable Impact & Metrics (' + metricCount + ' metrics found)', passed: true, weight: 10, tip: 'Strong use of quantifiable numbers and percentages ($ / %).' });
      score += 10;
    } else if (metricCount >= 1) {
      checks.push({ name: 'Measurable Impact & Metrics (' + metricCount + ' metric found)', passed: true, weight: 5, tip: 'Add more numbers, percentages, or scale metrics ($ / %) to work bullet points.' });
      score += 5;
    } else {
      checks.push({ name: 'Measurable Impact & Metrics Missing', passed: false, weight: 10, tip: 'Include quantifiable metrics (e.g. "Increased sales by 35%", "Managed $2M budget") in your work entries.' });
    }

    // 9. Action Power Verbs Usage (10 pts)
    var verbCount = 0;
    ACTION_VERBS.forEach(function(v) {
      if (fullText.indexOf(v) !== -1) verbCount++;
    });

    if (verbCount >= 3) {
      checks.push({ name: 'Action Power Verbs Usage (' + verbCount + ' found)', passed: true, weight: 10, tip: 'Strong action power verbs detected.' });
      score += 10;
    } else if (verbCount >= 1) {
      checks.push({ name: 'Action Power Verbs Low (' + verbCount + ' found)', passed: true, weight: 5, tip: 'Include more action verbs like Engineered, Spearheaded, Optimized, Orchestrated.' });
      score += 5;
    } else {
      checks.push({ name: 'Action Power Verbs Missing', passed: false, weight: 10, tip: 'Start bullet points with strong action verbs (Engineered, Developed, Spearheaded).' });
    }

    // 10. Bullet Point Length & Readability (10 pts)
    var totalWords = fullText.split(/\s+/).filter(Boolean).length;
    if (totalWords >= 100 && totalWords <= 800) {
      checks.push({ name: 'Content Length & Readability (Optimal: ' + totalWords + ' words)', passed: true, weight: 10, tip: 'Resume length is optimal and scannable by ATS parsers.' });
      score += 10;
    } else {
      checks.push({ name: 'Content Length & Readability (' + totalWords + ' words)', passed: false, weight: 10, tip: 'Aim for a balanced word count between 150 and 700 words.' });
    }

    // 11. Phone Number (Optional - No Penalty)
    checks.push({ name: 'Phone Number (Optional)', passed: true, weight: 0, tip: 'Phone numbers are optional for modern ATS screening.' });

    return {
      score: Math.min(100, score),
      checks: checks
    };
  }

  function matchJobKeywords(customData, jobDescriptionText) {
    if (!jobDescriptionText || !jobDescriptionText.trim()) {
      return { matched: [], missing: [], matchPercentage: 0 };
    }

    var d = customData || (typeof data !== 'undefined' ? data : {});
    var cvText = (JSON.stringify(d) || '').toLowerCase();
    
    // Extract candidate words (3+ chars, excluding common stop words)
    var stopWords = ['and', 'the', 'for', 'with', 'this', 'that', 'from', 'have', 'will', 'your', 'are', 'you', 'our', 'all', 'can'];
    var rawTokens = jobDescriptionText.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').split(/\s+/);
    
    var tokenFreq = {};
    rawTokens.forEach(function(t) {
      t = t.trim();
      if (t.length >= 3 && stopWords.indexOf(t) === -1 && isNaN(t)) {
        tokenFreq[t] = (tokenFreq[t] || 0) + 1;
      }
    });

    // Pick top unique keywords
    var topKeywords = Object.keys(tokenFreq).sort(function(a, b) {
      return tokenFreq[b] - tokenFreq[a];
    }).slice(0, 20);

    var matched = [];
    var missing = [];

    topKeywords.forEach(function(kw) {
      if (cvText.indexOf(kw) !== -1) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    });

    var matchPercentage = topKeywords.length > 0 ? Math.round((matched.length / topKeywords.length) * 100) : 100;

    return {
      matched: matched,
      missing: missing,
      matchPercentage: matchPercentage
    };
  }

  return {
    calculateAtsScore: calculateAtsScore,
    matchJobKeywords: matchJobKeywords
  };

})();
