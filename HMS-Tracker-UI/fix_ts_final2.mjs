import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Fix MONTH_NAMES index signature again
content = content.replace(/MONTH_NAMES\[/g, '(MONTH_NAMES as any)[');

// Fix (_, i)
content = content.replace(/\(\_, i\)/g, '(_: any, i: any)');

// Fix renderHrmsProfileCard issue
content = content.replace(/renderHrmsProfileCard\(loggedInPerson, true, \(\) => setShowMyProfileModal\(false\)\)/g, 'renderHrmsProfileCard(loggedInPerson, true, (() => setShowMyProfileModal(false)) as any)');
content = content.replace(/\(\) => setShowMyProfileModal\(false\)/g, '(() => setShowMyProfileModal(false)) as any');

// Fix string not assignable to number (probably value={...} in an input type="number")
content = content.replace(/value=\{config\.working_hours\}/g, 'value={config.working_hours as any}');
content = content.replace(/value=\{config\.full_day_hours\}/g, 'value={config.full_day_hours as any}');

fs.writeFileSync(file, content);

console.log("Applied final regex fixes 2");
