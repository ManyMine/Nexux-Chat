const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/AdminPanel.tsx', 'utf8');

code = code.replace(/showMessage/g, 'setMessage');
fs.writeFileSync('src/components/Chat/AdminPanel.tsx', code);
