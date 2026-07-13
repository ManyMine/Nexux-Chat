const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf8');

if (!code.includes('const displayContent = censorText(msg.content);')) {
  code = code.replace(
    /messages\.map\(\(msg, idx\) => \{/,
    `messages.map((msg, idx) => {
                const displayContent = censorText(msg.content);`
  );
  
  // Replace msg.content with displayContent in the render area
  code = code.replace(
    /\{msg\.content\}/g,
    '{displayContent}'
  );
  
  // Also link previews should use displayContent
  code = code.replace(
    /msg\.content\.match/g,
    'displayContent.match'
  );
}

fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
