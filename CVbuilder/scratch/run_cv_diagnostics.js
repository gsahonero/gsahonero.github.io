const fs = require('fs');

global.window = global;
global.state = {
  sections: {},
  propertyNames: {},
  activeSection: '',
  tab: 'editor',
  dirty: false,
  langFilter: 'all',
  themeAccentColor: '#2563eb',
  themeFont: 'sans',
  themeTextAlign: 'left',
  headerSpacer: 20
};
global.activeInstance = null;
global.currentInstanceName = 'None (Master CV)';
global.clone = function(x) { return JSON.parse(JSON.stringify(x)); };
global.isObj = function(x) { return x && typeof x === 'object' && !Array.isArray(x); };
global.human = function(s) {
  if (!s) return '';
  var clean = s.replace(/_/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};
global.esc = function(s) { return String(s || ''); };
global.tpl = {
  cvTitle: 'Curriculum Vitae',
  style: 'classic',
  preamble: '',
  footer: ''
};
global.mappers = {};
global.el = function(id) { return null; };
global.t = function(k) { return k; };

const sectionDefsCode = fs.readFileSync('js/section_defs.js', 'utf8');
eval(sectionDefsCode);

const constantsCode = fs.readFileSync('js/constants.js', 'utf8');
eval(constantsCode);

const integrityCode = fs.readFileSync('js/integrity.js', 'utf8');
eval(integrityCode);

const compilerCode = fs.readFileSync('js/compiler.js', 'utf8');
eval(compilerCode);

const cvRaw = fs.readFileSync('scratch/test_user_cv.json', 'utf8');
const cvData = JSON.parse(cvRaw);

console.log('=== 1. CHECKING INTEGRITY ===');
const integrityReport = CvIntegrityChecker.validate(cvData);
console.log('Integrity totals:', integrityReport.totals);
integrityReport.checks.filter(c => c.status !== 'passed').forEach(iss => {
  console.log(`[${iss.status}] ${iss.name}: ${iss.details}`);
});

console.log('\n=== 2. LOADING STATE & COMPILING LATEX ===');
global.data = cvData;
if (cvData._style && cvData._style.mappers) global.mappers = cvData._style.mappers;
if (cvData._sections) global.state.sections = cvData._sections;
if (cvData._style && cvData._style.theme && cvData._style.theme.accentColor) {
  global.state.themeAccentColor = cvData._style.theme.accentColor;
}

const latexCode = renderLatexCode();
console.log('Compiled LaTeX length:', latexCode.length);
fs.writeFileSync('scratch/output_test_cv.tex', latexCode, 'utf8');
console.log('Saved compiled LaTeX to scratch/output_test_cv.tex');

console.log('\n=== 3. COMPILING HTML ===');
const htmlCode = renderHtmlContent();
console.log('Compiled HTML length:', htmlCode.length);
fs.writeFileSync('scratch/output_test_cv.html', htmlCode, 'utf8');
console.log('Saved compiled HTML to scratch/output_test_cv.html');

console.log('\n=== 4. ANALYZING LATEX CONTENT FOR ERRORS ===');
const lines = latexCode.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('“') || l.includes('”') || l.includes('‘') || l.includes('’')) {
    console.log(`[LATEX UNICODE QUOTE WARNING line ${idx+1}]:`, l);
  }
  if (l.includes('##')) {
    console.log(`[LATEX DOUBLE HASH WARNING line ${idx+1}]:`, l);
  }
  if (l.includes('\\definecolor') && l.includes('#')) {
    console.log(`[LATEX DEFINECOLOR HASH WARNING line ${idx+1}]:`, l);
  }
  if (l.includes('\\cventry{') && l.includes('{}{}{}')) {
    console.log(`[LATEX CVENTRY EMPTY WARNING line ${idx+1}]:`, l);
  }
});
