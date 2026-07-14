const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

code = code.replace(/replyingToMessage\.senderName/g, 'getSenderName(replyingToMessage)');
code = code.replace(/msg\.replyTo\.senderName/g, '(allUsers.find(u => u.uid === msg.replyTo.senderId)?.displayName || msg.replyTo.senderName)');
code = code.replace(/m\.senderName/g, 'getSenderName(m)');
code = code.replace(/contextMenu\.message\.senderName/g, 'getSenderName(contextMenu.message)');

fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);

// For GeminiAssistant.tsx
let gemini = fs.readFileSync('src/components/Chat/GeminiAssistant.tsx', 'utf-8');
gemini = gemini.replace(/m\.senderName/g, 'm.senderName'); // Wait, GeminiAssistant only has messages array, not allUsers.
// Actually, sending static name to Gemini is fine.
