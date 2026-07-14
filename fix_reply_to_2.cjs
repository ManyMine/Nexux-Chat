const fs = require('fs');

let types = fs.readFileSync('src/types.ts', 'utf-8');
types = types.replace(
`  replyTo?: {
    messageId: string;
    senderName: string;`,
`  replyTo?: {
    messageId: string;
    senderId: string;
    senderName: string;`
);
fs.writeFileSync('src/types.ts', types);
