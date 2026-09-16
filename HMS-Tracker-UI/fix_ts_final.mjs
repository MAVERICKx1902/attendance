import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Fix e.target.files
content = content.replace(/e\.target\.files/g, 'e.target.files!');

// Fix MONTH_NAMES
content = content.replace(/MONTH_NAMES\[targetMonth\]/g, '(MONTH_NAMES as any)[targetMonth]');
content = content.replace(/MONTH_NAMES\[config\.month\]/g, '(MONTH_NAMES as any)[config.month]');

// Fix prev
content = content.replace(/\(prev =>/g, '((prev: any) =>');

// Fix renderHrmsProfileCard argument
content = content.replace(/renderHrmsProfileCard\(loggedInPerson, true, \(\) => setShowMyProfileModal\(false\)\)/g, 'renderHrmsProfileCard(loggedInPerson, true, (() => setShowMyProfileModal(false)) as any)');

// Fix config.excel_path
content = content.replace(/!config\.excel_path/g, '!(config as any).excel_path');

fs.writeFileSync(file, content);

console.log("Applied final regex fixes");
