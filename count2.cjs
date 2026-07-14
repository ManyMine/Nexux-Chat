const fs = require('fs');
const code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');
const lines = code.split('\\n').slice(1320, 1716); // adjusted zero-indexed later if needed
let opens = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const openMatch = line.match(/<div/g);
  const closeMatch = line.match(/<\/div>/g);
  if (openMatch) opens += openMatch.length;
  if (closeMatch) opens -= closeMatch.length;
  if (opens < 0) {
    console.log('Negative open div at line', 1320 + i + 1, ':', line);
  }
}
console.log('Final open count:', opens);
