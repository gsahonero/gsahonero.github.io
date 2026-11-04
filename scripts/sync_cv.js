/**
 * scripts/sync_cv.js
 * Ingests CVbuilder format (.cv / .cvdata) from _data/cv_source.json
 * and generates clean, validated, quote-safe JSON files for Jekyll:
 *   - _data/publications.json
 *   - _data/abstracts.json
 *   - _data/teaching.json
 *   - _data/skills.json
 *   - _data/talks.json
 *   - _data/awards.json
 *   - _data/experience.json
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_PATH = path.join(ROOT_DIR, '_data', 'cv_source.json');
const PAPERS_DIR = path.join(ROOT_DIR, 'assets', 'papers');

// Helper to sanitize strings from LaTeX formatting, curly quotes, and backticks
function cleanString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\textbf\{([^}]+)\}/g, '$1')
    .replace(/\\textit\{([^}]+)\}/g, '$1')
    .replace(/\\emph\{([^}]+)\}/g, '$1')
    .replace(/\\&/g, '&')
    .replace(/`/g, "'")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\\/g, '')
    .trim();
}

function cleanHtmlAuthors(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
    .replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>')
    .replace(/\\&/g, '&amp;')
    .replace(/`/g, "'")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\\/g, '')
    .trim();
}

// Smart author truncation: preserves lead authors, Guillermo Sahonero, and cleanly truncates long lists
function formatAuthorsSmart(authorsFormatted) {
  if (!authorsFormatted || typeof authorsFormatted !== 'string') {
    return { short: '', full: '', isTruncated: false, remainingCount: 0, totalCount: 0 };
  }

  const tagMap = [];
  let s = authorsFormatted.replace(/<strong>(.*?)<\/strong>/g, (m) => {
    const key = `__TAG_${tagMap.length}__`;
    tagMap.push(m);
    return key;
  });

  let parts;
  if (/^[A-Za-z\u00C0-\u017F\-]+,\s+[A-Z]\.\s*,/i.test(s)) {
    parts = s.split(/(?<=\.\s*),\s*/);
  } else {
    parts = s.split(/,\s*(?:and\s+)?|\s+and\s+/i);
  }

  parts = parts.map(p => {
    tagMap.forEach((orig, idx) => {
      p = p.replace(`__TAG_${idx}__`, orig);
    });
    return p.trim();
  }).filter(Boolean);

  const totalCount = parts.length;
  if (totalCount <= 3) {
    return {
      short: authorsFormatted,
      full: authorsFormatted,
      isTruncated: false,
      remainingCount: 0,
      totalCount
    };
  }

  const gIdx = parts.findIndex(a => a.toLowerCase().includes('sahonero'));
  let displayParts = [];

  if (gIdx === -1 || gIdx <= 2) {
    displayParts = parts.slice(0, Math.max(gIdx + 1, 2));
  } else {
    displayParts = [parts[0], '...', parts[gIdx]];
  }

  const shownCount = displayParts.filter(x => x !== '...').length;
  const remainingCount = totalCount - shownCount;

  return {
    short: displayParts.join(', '),
    full: authorsFormatted,
    isTruncated: true,
    remainingCount,
    totalCount
  };
}

// Classify research topic for filtering
function classifyTopic(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('mri') || lower.includes('despot') || lower.includes('spgr') || 
      lower.includes('bloch') || lower.includes('halbach') || lower.includes('phantom') || 
      lower.includes('low-field') || lower.includes('pulse sequence') || lower.includes('komamri')) {
    return 'MRI';
  }
  if (lower.includes('brain-computer') || lower.includes('bci') || lower.includes('p2731') || 
      lower.includes('eeg') || lower.includes('p300') || lower.includes('transducer')) {
    return 'BCI';
  }
  if (lower.includes('deep learning') || lower.includes('neural network') || lower.includes('u-net') || 
      lower.includes('machine learning') || lower.includes('ai') || lower.includes('llm')) {
    return 'Deep Learning & AI';
  }
  if (lower.includes('fpga') || lower.includes('edge computing') || lower.includes('embedded') || 
      lower.includes('sdsoc') || lower.includes('hardware accelerator') || lower.includes('robot')) {
    return 'Hardware & Edge';
  }
  return 'Biomedical & Engineering';
}

// Generate valid BibTeX with curly braces for all values to avoid quote collisions
function generateBibtex(entry, citeKey) {
  const author = cleanString(entry.authors || '');
  const title = cleanString(entry.title || '');
  const venue = cleanString(entry.venue || '');
  const year = cleanString(entry.year ? String(entry.year) : '');
  const doi = entry.doi ? cleanString(entry.doi) : '';

  let bib = `@article{${citeKey},\n`;
  bib += `  author = {${author}},\n`;
  bib += `  title = {${title}},\n`;
  bib += `  journal = {${venue}},\n`;
  bib += `  year = {${year}}`;
  if (doi) {
    bib += `,\n  doi = {${doi}}`;
  }
  bib += `\n}`;
  return bib;
}

function runSync() {
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`Error: Source CV file not found at ${SOURCE_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(SOURCE_PATH, 'utf-8');
  let cv;
  try {
    cv = JSON.parse(rawData);
  } catch (err) {
    console.error(`Error parsing ${SOURCE_PATH}: ${err.message}`);
    process.exit(1);
  }

  // Load existing papers to preserve DOIs, PDFs, or manual metadata
  const existingPubsPath = path.join(ROOT_DIR, '_data', 'publications.json');
  const existingDoiMap = new Map();
  const existingPdfMap = new Map();
  if (fs.existsSync(existingPubsPath)) {
    try {
      const prevData = JSON.parse(fs.readFileSync(existingPubsPath, 'utf-8'));
      if (Array.isArray(prevData)) {
        prevData.forEach(p => {
          const titleKey = cleanString(p.title || '').toLowerCase();
          if (p.DOI) existingDoiMap.set(titleKey, p.DOI);
          if (p.doi) existingDoiMap.set(titleKey, p.doi);
          if (p.id) existingPdfMap.set(titleKey, p.id);
        });
      }
    } catch (_) {}
  }

  // Check which PDFs actually exist in assets/papers
  const existingPdfFiles = new Set();
  if (fs.existsSync(PAPERS_DIR)) {
    fs.readdirSync(PAPERS_DIR).forEach(f => {
      if (f.toLowerCase().endsWith('.pdf')) {
        existingPdfFiles.add(f);
      }
    });
  }

  // 1. Process Publications
  const rawPubs = Array.isArray(cv.publications) ? cv.publications : [];
  const processedPubs = rawPubs.map((pub, idx) => {
    const title = cleanString(pub.title);
    const titleKey = title.toLowerCase();
    const authorsClean = cleanString(pub.authors);
    const authorsHtml = cleanHtmlAuthors(pub.authors);
    const venue = cleanString(pub.venue);
    const year = parseInt(pub.year, 10) || (pub.year ? cleanString(String(pub.year)) : 2024);
    
    // Look up DOI if available
    let doi = pub.doi || existingDoiMap.get(titleKey) || '';
    if (doi && doi.startsWith('https://doi.org/')) {
      doi = doi.replace('https://doi.org/', '');
    }

    // Determine ID / citeKey
    let id = pub.id || existingPdfMap.get(titleKey) || `pub_${idx + 1}`;
    let pdfFilename = `${id}.pdf`;
    let hasPdf = existingPdfFiles.has(pdfFilename);

    // Also check if existingPdfMap matched an existing PDF file
    if (!hasPdf && existingPdfMap.has(titleKey)) {
      const altId = existingPdfMap.get(titleKey);
      if (existingPdfFiles.has(`${altId}.pdf`)) {
        id = altId;
        pdfFilename = `${altId}.pdf`;
        hasPdf = true;
      }
    }

    const topic = classifyTopic(`${title} ${venue}`);
    const bibtex = generateBibtex({ authors: authorsClean, title, venue, year, doi }, id);
    const authorInfo = formatAuthorsSmart(authorsHtml);

    return {
      id,
      title,
      authors_formatted: authorsHtml,
      authors_plain: authorsClean,
      authors_short: authorInfo.short,
      is_truncated: authorInfo.isTruncated,
      remaining_authors: authorInfo.remainingCount,
      total_authors: authorInfo.totalCount,
      venue,
      year,
      doi: doi || null,
      topic,
      selected: pub.selected !== false,
      has_pdf: hasPdf,
      pdf_url: hasPdf ? `/assets/papers/${pdfFilename}` : null,
      bibtex
    };
  });

  // Sort publications by year descending
  processedPubs.sort((a, b) => b.year - a.year);

  // 2. Process Conference Abstracts
  const rawAbstracts = Array.isArray(cv.abstracts) ? cv.abstracts : [];
  const processedAbstracts = rawAbstracts.map((ab, idx) => {
    const title = cleanString(ab.title);
    const authorsClean = cleanString(ab.authors);
    const authorsHtml = cleanHtmlAuthors(ab.authors);
    const venue = cleanString(ab.venue);
    const year = parseInt(ab.year, 10) || 2026;
    const type = cleanString(ab.type || 'Conference Abstract');
    const topic = classifyTopic(`${title} ${venue}`);
    const id = ab.id || `abstract_${idx + 1}`;
    const bibtex = generateBibtex({ authors: authorsClean, title, venue, year }, id);
    const authorInfo = formatAuthorsSmart(authorsHtml);

    return {
      id,
      title,
      authors_formatted: authorsHtml,
      authors_plain: authorsClean,
      authors_short: authorInfo.short,
      is_truncated: authorInfo.isTruncated,
      remaining_authors: authorInfo.remainingCount,
      total_authors: authorInfo.totalCount,
      venue,
      year,
      type,
      topic,
      selected: ab.selected !== false,
      bibtex
    };
  });

  processedAbstracts.sort((a, b) => b.year - a.year);

  // 3. Process Teaching Experience
  const rawTeaching = Array.isArray(cv.teaching_experience) ? cv.teaching_experience : [];
  const processedTeaching = rawTeaching.map(t => {
    return {
      course_area: cleanString(t.course_area),
      institution: cleanString(t.institution),
      level: cleanString(t.level || 'Course'),
      courses: (t.courses || []).map(c => {
        if (typeof c === 'object' && c !== null) {
          return {
            name: cleanString(c.name || ''),
            description: cleanString(c.description || '')
          };
        }
        return cleanString(c);
      }),
      selected: t.selected !== false
    };
  });

  // 4. Process Skills
  const rawSkills = cv.skills || {};
  const processedSkills = {
    mri: (rawSkills.mri || []).map(s => cleanString(s.name || s)),
    programming: (rawSkills.programming || []).map(s => cleanString(s.name || s)),
    domains: (rawSkills.domains || []).map(s => cleanString(s.name || s)),
    hardware: (rawSkills.hardware_and_embedded || []).map(s => cleanString(s.name || s)),
    frameworks: (rawSkills.frameworks_and_libraries || []).map(s => cleanString(s.name || s))
  };

  // 5. Process Talks & Invited Lectures
  const rawTalks = Array.isArray(cv.talks) ? cv.talks : [];
  const processedTalks = rawTalks.map(tk => ({
    title: cleanString(tk.category),
    description: cleanString(tk.description),
    year: cleanString(String(tk.year)),
    selected: tk.selected !== false
  }));

  // 6. Process Awards & Fellowships
  const rawAwards = Array.isArray(cv.awards) ? cv.awards : [];
  const processedAwards = rawAwards.map(aw => ({
    category: cleanString(aw.category),
    description: cleanString(aw.description),
    year: cleanString(String(aw.year)),
    selected: aw.selected !== false
  }));

  // 7. Process Research & Work Experience
  const rawResearchExp = Array.isArray(cv.research_experience) ? cv.research_experience : [];
  const processedResearchExp = rawResearchExp.map(r => ({
    organization: cleanString(r.organization),
    role: cleanString(r.role),
    period: `${cleanString(r.start)} - ${cleanString(r.end)}`,
    description: cleanString(r.description),
    selected: r.selected !== false
  }));

  // Write all processed datasets to _data
  const outputs = [
    { file: 'publications.json', data: processedPubs },
    { file: 'abstracts.json', data: processedAbstracts },
    { file: 'teaching.json', data: processedTeaching },
    { file: 'skills.json', data: processedSkills },
    { file: 'talks.json', data: processedTalks },
    { file: 'awards.json', data: processedAwards },
    { file: 'experience.json', data: processedResearchExp }
  ];

  outputs.forEach(({ file, data }) => {
    const dest = path.join(ROOT_DIR, '_data', file);
    fs.writeFileSync(dest, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Synced: _data/${file} (${Array.isArray(data) ? data.length + ' items' : 'object'})`);
  });

  console.log('CV sync completed successfully.');
}

if (require.main === module) {
  runSync();
}

module.exports = { runSync, cleanString, cleanHtmlAuthors, formatAuthorsSmart, classifyTopic, generateBibtex };
