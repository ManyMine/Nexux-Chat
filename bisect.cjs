const fs = require('fs');
const babel = require('@babel/core');

const originalCode = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');
const lines = originalCode.split('\\n');

function check(code) {
  try {
    babel.transformSync(code, {
      presets: ['@babel/preset-typescript', '@babel/preset-react'],
      filename: 'test.tsx'
    });
    return true;
  } catch (e) {
    return false;
  }
}

// let's try replacing a chunk of lines with null to see if it fixes the parse
// We'll replace 100 lines at a time
let found = false;
for (let i = 895; i < lines.length - 10; i += 50) {
  const newLines = [...lines];
  // replace lines i to i+100 with a simple <div></div>
  newLines.splice(i, 100, '<div></div>');
  const code = newLines.join('\\n');
  if (check(code)) {
    console.log('Error is around lines', i, 'to', i+100);
    found = true;
  }
}
if (!found) console.log('Could not localize by deleting 100-line chunks.');
