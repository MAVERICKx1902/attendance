import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// (msg =>, (f =>, (row =>, (rec, i), (s, i)
content = content.replace(/\(msg =>/g, '((msg: any) =>');
content = content.replace(/\(f =>/g, '((f: any) =>');
content = content.replace(/\(row =>/g, '((row: any) =>');
content = content.replace(/\(rec, i\)/g, '(rec: any, i: any)');
content = content.replace(/\(s, i\)/g, '(s: any, i: any)');
content = content.replace(/\(l, i\)/g, '(l: any, i: any)');
content = content.replace(/\(r, idx\)/g, '(r: any, idx: any)');
content = content.replace(/\(prev =>/g, '((prev: any) =>');

// colSpan="4", colSpan="6"
content = content.replace(/colSpan="4"/g, 'colSpan={4}');
content = content.replace(/colSpan="6"/g, 'colSpan={6}');

// window.pywebview
content = content.replace(/window\.pywebview/g, '(window as any).pywebview');

// window.showDirectoryPicker
content = content.replace(/window\.showDirectoryPicker/g, '(window as any).showDirectoryPicker');

// err.message
content = content.replace(/err\.message/g, '(err as any).message');

// config.excel_path, config.python_path
content = content.replace(/config\.excel_path/g, '(config as any).excel_path');
content = content.replace(/config\.python_path/g, '(config as any).python_path');

// empDetails properties
content = content.replace(/empDetails\.trackedDaysCount/g, '(empDetails as any).trackedDaysCount');
content = content.replace(/empDetails\.limits/g, '(empDetails as any).limits');
content = content.replace(/empDetails\.leavesList/g, '(empDetails as any).leavesList');
content = content.replace(/empDetails\?\.leavesList/g, '(empDetails as any)?.leavesList');

// .value on never (rawPreview / availableCols mapping)
content = content.replace(/c\.value/g, '(c as any).value');
content = content.replace(/col\.value/g, '(col as any).value');
content = content.replace(/f\.value/g, '(f as any).value');
content = content.replace(/h\.click/g, '(h as any).click');

// leaveBalances indexing
content = content.replace(/leaveBalances\[idStr\]/g, '(leaveBalances as any)[idStr]');
content = content.replace(/leaveBalances\[codeStr\]/g, '(leaveBalances as any)[codeStr]');

// dept as key/value
content = content.replace(/key=\{dept\}/g, 'key={dept as any}');
content = content.replace(/value=\{dept\}/g, 'value={dept as any}');
content = content.replace(/>\{dept\}<\/option>/g, '>{dept as any}</option>');

fs.writeFileSync(file, content);

console.log("Applied final regex fixes 3");
