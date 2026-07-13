const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/AdminPanel.tsx', 'utf8');

code = code.replace(/setMessage\('success', '([^']+)'\)/g, "setMessage({ type: 'success', text: '$1' })");
code = code.replace(/setMessage\('error', '([^']+)'\)/g, "setMessage({ type: 'error', text: '$1' })");

fs.writeFileSync('src/components/Chat/AdminPanel.tsx', code);
