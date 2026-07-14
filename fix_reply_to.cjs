const fs = require('fs');

let types = fs.readFileSync('src/types.ts', 'utf-8');
types = types.replace('senderName: string;', 'senderName: string;\n    senderId?: string;');
fs.writeFileSync('src/types.ts', types);

let service = fs.readFileSync('src/services/firebaseService.ts', 'utf-8');
service = service.replace(
  'replyTo: {',
  'replyTo: {\n      senderId: replyTo.senderId,'
);
fs.writeFileSync('src/services/firebaseService.ts', service);

