const fs = require('fs');

let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');
code = code.replace(
`          const replyTo = replyingToMessage ? {
            messageId: replyingToMessage.id,
            senderName: getSenderName(replyingToMessage),`,
`          const replyTo = replyingToMessage ? {
            messageId: replyingToMessage.id,
            senderId: replyingToMessage.senderId,
            senderName: getSenderName(replyingToMessage),`
);
fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
