const fs = require('fs');

const sampleCv = JSON.parse(fs.readFileSync('guillermo_sahonero.cv', 'utf8'));

let data = sampleCv;

function moveSectionOrder(key, direction) {
  var keys = Object.keys(data);
  var idx = keys.indexOf(key);
  if (idx === -1) return;
  var targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= keys.length) return;
  
  var temp = keys[idx];
  keys[idx] = keys[targetIdx];
  keys[targetIdx] = temp;
  
  var newData = {};
  keys.forEach(function(k) { newData[k] = data[k]; });
  data = newData;
}

function reorderSectionTo(srcKey, targetKey) {
  var keys = Object.keys(data);
  var srcIdx = keys.indexOf(srcKey);
  var targetIdx = keys.indexOf(targetKey);
  if (srcIdx === -1 || targetIdx === -1 || srcIdx === targetIdx) return;
  
  keys.splice(srcIdx, 1);
  keys.splice(targetIdx, 0, srcKey);
  
  var newData = {};
  keys.forEach(function(k) { newData[k] = data[k]; });
  data = newData;
}

console.log("Original order:", Object.keys(data));

moveSectionOrder('education', 'up');
console.log("After moving 'education' UP:", Object.keys(data));

reorderSectionTo('publications', 'education');
console.log("After dragging 'publications' before 'education':", Object.keys(data));
