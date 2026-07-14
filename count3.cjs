const fs = require('fs');
const code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');
const lines = code.split('\\n');
let opens = 0;
let started = false;
for (let i = 894; i < lines.length; i++) { // 894 is 'return ('
  const line = lines[i];
  
  // match tags <Foo and </Foo>
  // ignore <br/>, <img/>, <input/>, <hr/>, and SelfClosing
  let m;
  const lineRegex = /<\/?([a-zA-Z0-9_.-]+)(?:\s+[^>]*?)?(\/?)>/g;
  while ((m = lineRegex.exec(line)) !== null) {
    const isClosing = m[0].startsWith('</');
    const isSelfClosing = m[2] === '/';
    const tag = m[1];
    if (['br', 'img', 'input', 'hr', 'link', 'meta'].includes(tag) || isSelfClosing) continue;
    
    if (isClosing) {
      opens--;
    } else {
      opens++;
    }
  }
  
  if (opens === 0 && i > 895) {
    console.log('Balance reached at line', i + 1);
  }
}
console.log('Final open count:', opens);
