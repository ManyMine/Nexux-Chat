const babel = require('@babel/core');
const fs = require('fs');

const code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');
try {
  babel.transformSync(code, {
    presets: ['@babel/preset-typescript', '@babel/preset-react'],
    filename: 'src/components/Chat/ChatArea.tsx'
  });
  console.log('Babel parsed successfully!');
} catch (e) {
  console.log('Babel parse error:');
  console.log(e.message);
}
