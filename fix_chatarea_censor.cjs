const fs = require('fs');
let chatArea = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf8');

const censorTextFn = `
  const censorText = (text: string) => {
    if (!text || censoredWords.length === 0) return text;
    let censored = text;
    censoredWords.forEach(word => {
      if (!word) return;
      const regex = new RegExp(\`\\\\b\${word}\\\\b\`, 'gi');
      censored = censored.replace(regex, '***');
    });
    return censored;
  };
`;

chatArea = chatArea.replace(
  /const handleEditClick = \(msg: Message\) => \{/,
  censorTextFn + '\n  const handleEditClick = (msg: Message) => {'
);

fs.writeFileSync('src/components/Chat/ChatArea.tsx', chatArea);
