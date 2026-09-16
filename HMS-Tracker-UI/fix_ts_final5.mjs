import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Fix implicitly any arrays (const)
content = content.replace(/const daily = \[\]/g, 'const daily: any[] = []');
content = content.replace(/const matrix = \[\]/g, 'const matrix: any[] = []');
content = content.replace(/const summary = \[\]/g, 'const summary: any[] = []');
content = content.replace(/const sampleRows = \[\]/g, 'const sampleRows: any[] = []');
content = content.replace(/const bubbles = \[\]/g, 'const bubbles: any[] = []');

// punches is unknown
content = content.replace(/punches\.length/g, '(punches as any).length');
content = content.replace(/punches\[0\]/g, '(punches as any)[0]');
content = content.replace(/punches\[1\]/g, '(punches as any)[1]');
content = content.replace(/punches\.sort\(\(a, b\)/g, '(punches as any).sort((a: any, b: any)');
content = content.replace(/punches\.map/g, '(punches as any).map');
content = content.replace(/punches\.filter/g, '(punches as any).filter');
content = content.replace(/punches\.forEach/g, '(punches as any).forEach');

// parameter h
content = content.replace(/\(h =>/g, '((h: any) =>');
content = content.replace(/\(a, b\)/g, '(a: any, b: any)');

// Date arithmetic and argument types
content = content.replace(/new Date\((row\[\d+\])\)/g, '(new Date($1) as any)');
content = content.replace(/new Date\((r\.date)\)/g, '(new Date($1) as any)');
content = content.replace(/new Date\(val\)/g, '(new Date(val) as any)');

// More .value and .click
content = content.replace(/downloadLinkRef\.current\.click\(\)/g, '(downloadLinkRef.current as any).click()');
content = content.replace(/fileInputRef\.current\.click\(\)/g, '(fileInputRef.current as any).click()');
content = content.replace(/pythonInputRef\.current\.click\(\)/g, '(pythonInputRef.current as any).click()');
content = content.replace(/leaveFileInputRef\.current\.click\(\)/g, '(leaveFileInputRef.current as any).click()');

// ReactNode issue
content = content.replace(/>\{dept\}<\/span>/g, '>{dept as any}</span>');

// empDetails properties
content = content.replace(/empDetails\.trackedDaysCount/g, '(empDetails as any).trackedDaysCount');
content = content.replace(/empDetails\.limits/g, '(empDetails as any).limits');
content = content.replace(/empDetails\.leavesList/g, '(empDetails as any).leavesList');

fs.writeFileSync(file, content);

console.log("Applied final regex fixes 5");
