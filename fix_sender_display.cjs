const fs = require('fs');

let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

const helpers = `
  const getSenderName = (msg) => {
    if (msg.senderId === currentUser.uid) return currentUser.displayName || msg.senderName;
    const user = allUsers.find(u => u.uid === msg.senderId);
    return user?.displayName || msg.senderName;
  };

  const getSenderPhoto = (msg) => {
    if (msg.senderId === currentUser.uid) return currentUser.photoURL || msg.senderPhoto;
    const user = allUsers.find(u => u.uid === msg.senderId);
    return user?.photoURL || msg.senderPhoto;
  };
`;

// Insert after `const { settings } = useAccessibility();`
code = code.replace(
  'const { settings } = useAccessibility();', 
  'const { settings } = useAccessibility();' + helpers
);

// Replace occurrences
code = code.replace(/msg\.senderName/g, 'getSenderName(msg)');
code = code.replace(/msg\.senderPhoto/g, 'getSenderPhoto(msg)');

// Fix a case where getSenderName(msg) inside template literal string could be an issue if there are conflicts,
// but let's just let regex do it.

fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
