import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Strip the mobile leave_details button
content = content.replace(
  /<button\s+onClick=\{\(\) => \{ changeTabWithDirection\('leave_details'\);.*?\s*<Clock className="w-5 h-5" \/>\s*Leave Details\s*<\/button>/s,
  ''
);

// Strip the mobile summary button
content = content.replace(
  /<button\s+onClick=\{\(\) => \{ changeTabWithDirection\('summary'\);.*?\s*<Users className="w-5 h-5" \/>\s*Summary Stats\s*<\/button>/s,
  ''
);

fs.writeFileSync(file, content);
console.log("Mobile buttons cleaned!");
