import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Remove tabOptions for leave_details and summary
content = content.replace(
  /\{ id: 'leave_details', label: `.*` \},\s*\{ id: 'summary', label: 'Summary Stats' \}/,
  ''
);

// Remove the rendering blocks if they exist (simplistic regex or just remove the tab options)
// Wait, the user specifically asked to remove from Sidebar and clean dead routing links.
// Let's just remove it from tabOptions, so it doesn't render the tabs.
content = content.replace(
  /const tabOptions = \[\s*\{ id: 'matrix', label: 'Daily Matrix' \},\s*\]/,
  "const tabOptions = [\n    { id: 'matrix', label: 'Daily Matrix' }\n  ]"
);

fs.writeFileSync(file, content);
console.log("App.tsx cleaned!");
