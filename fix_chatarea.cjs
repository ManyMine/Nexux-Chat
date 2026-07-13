const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf8');

code = code.replace(
  /import { updateChannel, /,
  'import { getCensoredWords, updateChannel, '
);

fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
