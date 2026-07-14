const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatLayout.tsx', 'utf-8');
if (code.includes('flex h-screen')) {
  console.log('Replacing h-screen');
  code = code.replace('flex h-screen', 'flex flex-1');
  fs.writeFileSync('src/components/Chat/ChatLayout.tsx', code);
}
