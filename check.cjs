const fs = require('fs');
const code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

// simple regex to find all <tag> and </tag>
const regex = /<\/?([a-zA-Z0-9_.-]+)[^>]*>/g;
let match;
const stack = [];

const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (i < 890) continue; // skip before main return
  let m;
  const lineRegex = /<\/?([a-zA-Z0-9_.-]+)(?:\s+[^>]*?)?(\/?)>/g;
  while ((m = lineRegex.exec(line)) !== null) {
    const isClosing = m[0].startsWith('</');
    const isSelfClosing = m[2] === '/';
    const tag = m[1];
    if (tag === 'br' || tag === 'img' || tag === 'input' || tag === 'hr' || isSelfClosing) continue;
    
    if (isClosing) {
      if (stack.length === 0) {
        console.log(`Line ${i + 1}: Unexpected closing tag </${tag}>`);
      } else {
        const last = stack.pop();
        if (last.tag !== tag && last.tag !== 'motion.div' && tag !== 'motion.div') {
          // console.log(`Line ${i + 1}: Expected </${last.tag}> but found </${tag}>. Opened at line ${last.line}`);
        }
      }
    } else {
      stack.push({ tag, line: i + 1 });
    }
  }
}
if (stack.length > 0) {
  console.log('Unclosed tags:');
  stack.forEach(s => console.log(`  <${s.tag}> opened at line ${s.line}`));
} else {
  console.log('All tags balanced.');
}
