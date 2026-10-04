const fs = require('fs');

const sampleCv = JSON.parse(fs.readFileSync('guillermo_sahonero.cv', 'utf8'));

let data = sampleCv;
let state = { sortDirections: {} };

function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }

function getEntryYear(item) {
  if (!isObj(item)) return 0;
  var yrStr = item.start || item.end || item.year || item.date || '';
  var match = String(yrStr).match(/\d{4}/);
  if (match) return parseInt(match[0], 10);
  if (String(yrStr).toLowerCase().indexOf('present') !== -1 || String(yrStr).toLowerCase().indexOf('actual') !== -1) return 9999;
  return 0;
}

function getEntryText(item) {
  if (!isObj(item)) return String(item || '').toLowerCase();
  var txt = item.title || item.degree || item.role || item.authors || item.category || item.language || item.name || item.description || '';
  return String(txt).toLowerCase();
}

function sortSectionEntries(key) {
  var arr = data[key];
  if (!Array.isArray(arr) || arr.length < 2) return;

  var hasYears = arr.some(function(it) {
    return isObj(it) && (it.start || it.end || it.year || it.date);
  });

  if (!state.sortDirections) state.sortDirections = {};
  var currentDir = state.sortDirections[key] || 'none';
  
  var nextDir;
  if (hasYears) {
    nextDir = (currentDir === 'year_desc') ? 'year_asc' : 'year_desc';
  } else {
    nextDir = (currentDir === 'alpha_asc') ? 'alpha_desc' : 'alpha_asc';
  }
  state.sortDirections[key] = nextDir;

  arr.sort(function(a, b) {
    if (nextDir === 'year_desc') {
      return getEntryYear(b) - getEntryYear(a);
    } else if (nextDir === 'year_asc') {
      return getEntryYear(a) - getEntryYear(b);
    } else if (nextDir === 'alpha_asc') {
      return getEntryText(a).localeCompare(getEntryText(b));
    } else if (nextDir === 'alpha_desc') {
      return getEntryText(b).localeCompare(getEntryText(a));
    }
    return 0;
  });
}

console.log("=== AWARDS BEFORE SORT ===");
console.log(data.awards.slice(0, 3).map(a => a.year + ': ' + a.description.substring(0, 30)));

sortSectionEntries('awards');
console.log("\n=== AWARDS AFTER SORT (Year Desc) ===");
console.log(data.awards.slice(0, 3).map(a => a.year + ': ' + a.description.substring(0, 30)));

sortSectionEntries('awards');
console.log("\n=== AWARDS AFTER SORT (Year Asc) ===");
console.log(data.awards.slice(0, 3).map(a => a.year + ': ' + a.description.substring(0, 30)));
