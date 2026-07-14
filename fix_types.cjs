const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');

// Undo the mess
code = code.replace(
`  senderId: string;
  senderName: string;
    senderId?: string;`, 
`  senderId: string;
  senderName: string;`
);

fs.writeFileSync('src/types.ts', code);
