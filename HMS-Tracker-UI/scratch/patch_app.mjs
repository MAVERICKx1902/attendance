import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Update adapter safe property lookups
content = content.replace(
  /emp_id: e\.emp_id,\s*emp_name: e\.emp_name,/,
  "emp_id: String(e.emp_id || '0'),\n              emp_name: String(e.emp_name || 'Unknown Employee'),"
);

// Update unsafe lowerCase calls in App.tsx matrix search
content = content.replace(
  /s\.emp_name\.toLowerCase\(\)/g,
  "(s.emp_name || '').toLowerCase()"
);
content = content.replace(
  /s\.emp_id\.toLowerCase\(\)/g,
  "(s.emp_id || '').toLowerCase()"
);

fs.writeFileSync(file, content);
console.log("App.tsx patched successfully!");
