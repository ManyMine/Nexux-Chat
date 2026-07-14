const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

code = code.replace(
`  const getSenderName = (msg) => {
    if (msg.senderId === currentUser.uid) return currentUser.displayName || getSenderName(msg);
    const user = allUsers.find(u => u.uid === msg.senderId);
    return user?.displayName || getSenderName(msg);
  };`, 
`  const getSenderName = (msg: any) => {
    if (msg.senderId === currentUser.uid) return currentUser.displayName || msg.senderName;
    const user = allUsers.find(u => u.uid === msg.senderId);
    return user?.displayName || msg.senderName;
  };`
);

code = code.replace(
`  const getSenderPhoto = (msg) => {
    if (msg.senderId === currentUser.uid) return currentUser.photoURL || getSenderPhoto(msg);
    const user = allUsers.find(u => u.uid === msg.senderId);
    return user?.photoURL || getSenderPhoto(msg);
  };`,
`  const getSenderPhoto = (msg: any) => {
    if (msg.senderId === currentUser.uid) return currentUser.photoURL || msg.senderPhoto;
    const user = allUsers.find(u => u.uid === msg.senderId);
    return user?.photoURL || msg.senderPhoto;
  };`
);

fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
