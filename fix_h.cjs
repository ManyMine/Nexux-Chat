const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace('minHeight: `${10000 / zoom}vh`', 'height: `${10000 / zoom}vh`');
fs.writeFileSync('src/App.tsx', code);

let layout = fs.readFileSync('src/components/Chat/ChatLayout.tsx', 'utf-8');
layout = layout.replace('flex flex-1 bg-transparent', 'flex h-full bg-transparent');
fs.writeFileSync('src/components/Chat/ChatLayout.tsx', layout);
