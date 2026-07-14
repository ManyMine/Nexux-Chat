const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(
  "link.href = '/vite.svg'; // Default favicon",
  "link.href = 'https://www.image2url.com/r2/default/images/1783957698206-a4bc0933-1da2-42af-9e0b-dcb9118a5b5d.png';"
);
fs.writeFileSync('src/App.tsx', code);
