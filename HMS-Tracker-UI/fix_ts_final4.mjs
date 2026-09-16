import fs from 'fs';

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Fix variable declarations
content = content.replace(/let daily = \[\]/g, 'let daily: any[] = []');
content = content.replace(/let matrix = \[\]/g, 'let matrix: any[] = []');
content = content.replace(/let summary = \[\]/g, 'let summary: any[] = []');
content = content.replace(/let sampleRows = \[\]/g, 'let sampleRows: any[] = []');
content = content.replace(/let bubbles = \[\]/g, 'let bubbles: any[] = []');
content = content.replace(/let animationId;/g, 'let animationId: any;');
content = content.replace(/let animationId\n/g, 'let animationId: any;\n');

// Fix parameters
content = content.replace(/\(data, config, fileName\)/g, '(data: any, config: any, fileName: any)');
content = content.replace(/\(ds\)/g, '(ds: any)');
content = content.replace(/\(dc, i\)/g, '(dc: any, i: any)');
content = content.replace(/\(row, idx\)/g, '(row: any, idx: any)');
content = content.replace(/\(callback\)/g, '(callback: any)');
content = content.replace(/\(targetTab\)/g, '(targetTab: any)');
content = content.replace(/\(event, info\)/g, '(event: any, info: any)');
content = content.replace(/const showToast = \(msg, type/g, 'const showToast = (msg: any, type');

// Fix property access on refs
content = content.replace(/canvasRef\.current\.getContext/g, '(canvasRef.current as any).getContext');
content = content.replace(/canvasRef\.current\.width/g, '(canvasRef.current as any).width');
content = content.replace(/canvasRef\.current\.height/g, '(canvasRef.current as any).height');
content = content.replace(/canvasRef\.current\.offsetWidth/g, '(canvasRef.current as any).offsetWidth');
content = content.replace(/canvasRef\.current\.offsetHeight/g, '(canvasRef.current as any).offsetHeight');

content = content.replace(/fileInputRef\.current\.value/g, '(fileInputRef.current as any).value');
content = content.replace(/pythonInputRef\.current\.value/g, '(pythonInputRef.current as any).value');
content = content.replace(/leaveFileInputRef\.current\.value/g, '(leaveFileInputRef.current as any).value');
content = content.replace(/folderInputRef\.current\.value/g, '(folderInputRef.current as any).value');

content = content.replace(/downloadLinkRef\.current\.click/g, '(downloadLinkRef.current as any).click');
content = content.replace(/fileInputRef\.current\.click/g, '(fileInputRef.current as any).click');
content = content.replace(/pythonInputRef\.current\.click/g, '(pythonInputRef.current as any).click');
content = content.replace(/leaveFileInputRef\.current\.click/g, '(leaveFileInputRef.current as any).click');

// ReactNode fix
content = content.replace(/<span className=\{`px-3 py-1 rounded-full text-\[10px\] font-bold uppercase tracking-wider \$\{deptColors\[dept\]\}\`\}>\n\s*\{dept\}\n\s*<\/span>/g, '<span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${deptColors[dept as string]}`}>\n{dept as any}\n</span>');

fs.writeFileSync(file, content);

console.log("Applied final regex fixes 4");
