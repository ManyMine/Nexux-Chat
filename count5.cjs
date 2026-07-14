const fs = require('fs');
const code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');
const lines = code.split('\\n');
let opens = 0;
for (let i = 894; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('//')) continue;
  
  for (let c of line) {
    if (c === '(') opens++;
    if (c === ')') opens--;
  }
}
console.log('Final () balance:', opens);
