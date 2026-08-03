/**
 * CVbuilder ATS Optimization & Keyword Inspector Engine
 * Calculates ATS score (0-100%) and evaluates target Job Description keyword density.
 */

var ATSChecker = (function() {

  var ACTION_VERBS = [
    'achieved', 'engineered', 'developed', 'designed', 'built', 'led', 'managed',
    'increased', 'improved', 'optimized', 'reduced', 'implemented', 'orchestrated',
    'launched', 'published', 'spearheaded', 'integrated', 'delivered', 'accelerated',
    'created', 'executed', 'established', 'formulated', 'generated', 'transformed'
  ];

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

    var checks = [];
    var score = 0;

    // 1. Email check (Mandatory) +15
    if (emailVal && String(emailVal).trim()) {
      checks.push({ name: 'Email Address Provided', passed: true, weight: 15, tip: 'Valid email address present.' });
      score += 15;
    } else {
      checks.push({ name: 'Email Address Missing', passed: false, weight: 15, tip: 'Add a professional email address under Basics.' });
    }

    // 2. Location check (Mandatory) +15
    if (locationVal && String(locationVal).trim()) {
      checks.push({ name: 'Location / City Provided', passed: true, weight: 15, tip: 'Location present.' });
      score += 15;
    } else {
      checks.push({ name: 'Location Missing', passed: false, weight: 15, tip: 'Add your city/country location under Basics.' });
    }

    // 3. Optional Phone rule: Phone does NOT deduct points! +10 bonus if present or optional badge
    checks.push({ name: 'Phone Number (Optional)', passed: true, weight: 10, tip: 'Phone numbers are optional for modern ATS.' });
    score += 10;

    // 4. Work Experience check +25
    var workEntries = getSectionEntries(d, ['work_experience', 'work', 'experience', 'research_experience', 'teaching_experience', 'professional_experience', 'projects']);
    if (workEntries.length > 0) {
      checks.push({ name: 'Work Experience Listed (' + workEntries.length + ' entries)', passed: true, weight: 25, tip: 'Work entries present.' });
      score += 25;
    } else {
      checks.push({ name: 'Work Experience Missing', passed: false, weight: 25, tip: 'Add work experience or professional projects.' });
    }

    // 5. Education check +20
    var eduEntries = getSectionEntries(d, ['education', 'academic', 'studies', 'academic_background', 'continuing_education']);
    if (eduEntries.length > 0) {
      checks.push({ name: 'Education Listed (' + eduEntries.length + ' entries)', passed: true, weight: 20, tip: 'Education entries present.' });
      score += 20;
    } else {
      checks.push({ name: 'Education Section Missing', passed: false, weight: 20, tip: 'Add degree or institutional education.' });
    }

    // 6. Action Verbs Check +15
    var fullText = (JSON.stringify(d) || '').toLowerCase();
    if (typeof activeInstance !== 'undefined' && activeInstance && activeInstance.overwrites) {
      fullText += ' ' + (JSON.stringify(activeInstance.overwrites) || '').toLowerCase();
    }
    var verbCount = 0;
    ACTION_VERBS.forEach(function(v) {
      if (fullText.indexOf(v) !== -1) verbCount++;
    });

    if (verbCount >= 3) {
      checks.push({ name: 'Action Verbs Usage (' + verbCount + ' found)', passed: true, weight: 15, tip: 'Strong action verbs detected.' });
      score += 15;
    } else {
      checks.push({ name: 'Action Verbs Low (' + verbCount + ' found)', passed: false, weight: 15, tip: 'Include verbs like Engineered, Developed, Spearheaded, Built.' });
    }

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
