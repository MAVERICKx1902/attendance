import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Fix statusColKey
content = content.replace(
  /const statusColKey = cols\.find\(c => c\.toLowerCase\(\)\.includes\('status'\)\)/,
  "const statusColKey = cols.find(c => c.toLowerCase() === 'status code' || c.toLowerCase() === 'att status') || cols.find(c => c.toLowerCase().includes('status'))"
);

// Fix parseLeaveSummary for exact match '-balance'
content = content.replace(
  /if \(val\.includes\('pl'\) \|\| val\.includes\('privilege'\) \|\| val\.includes\('earned'\)\) cols\.pl = ci/,
  "if (val.includes('pl-balance') || val.includes('privilege') || val.includes('earned')) cols.pl = ci"
);
content = content.replace(
  /if \(val\.includes\('cl'\) \|\| val\.includes\('casual'\)\) cols\.cl = ci/,
  "if (val.includes('cl-balance') || val.includes('casual')) cols.cl = ci"
);
content = content.replace(
  /if \(val\.includes\('sl'\) \|\| val\.includes\('sick'\) \|\| val\.includes\('medical'\)\) cols\.sl = ci/,
  "if (val.includes('sl-balance') || val.includes('sick') || val.includes('medical')) cols.sl = ci"
);

fs.writeFileSync(file, content);
console.log("Calibration successful.");
