let template = '\\title{{{basics.title}}}';
let data = { basics: { title: 'Engineer' } };
function getPathValue(p, d) { return d.basics.title; }

var rendered = template;
console.log('1. Initial:', rendered);

var rawRegex = /\{\{\&([a-zA-Z0-9_\\.-]+)\}\}/g;
rendered = rendered.replace(rawRegex, function(match, path) {
  var val = getPathValue(path, data);
  return val !== undefined && val !== null ? String(val) : '';
});
console.log('2. After rawRegex without triple braces:', rendered);

var valRegex = /\{\{([a-zA-Z0-9_\\.-]+)\}\}/g;
rendered = rendered.replace(valRegex, function(match, path) {
  var val = getPathValue(path, data);
  return val !== null && val !== undefined ? String(val) : '';
});
console.log('3. After valRegex:', rendered);
