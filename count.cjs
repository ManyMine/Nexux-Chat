const fs = require('fs');
const code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

const lines = code.split('\n');
let opens = 0;
let closes = 0;
let mapStart = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('return (\\n') || lines[i].includes('messages.map((msg, idx) => {') || lines[i].includes('return (')) {
    if (lines[i].includes('messages.map')) {
      mapStart = i + 1;
      break;
    }
  }
}

let mapEnd = 0;
for (let i = mapStart; i < lines.length; i++) {
  if (lines[i].includes(');')) {
    mapEnd = i + 1;
    break;
  }
}

const mapCode = lines.slice(mapStart, mapEnd).join('\\n');
console.log('Map return block lines:', mapEnd - mapStart);

// Let's print out all divs in the block
let countOpen = 0;
let countClose = 0;
for (const match of mapCode.matchAll(/<div/g)) {
  countOpen++;
}
for (const match of mapCode.matchAll(/<\/div>/g)) {
  countClose++;
}
console.log('Open div:', countOpen, 'Close div:', countClose);
