const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

// I will insert a helper at the beginning of the component
// to get the current user data
