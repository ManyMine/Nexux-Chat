const fs = require('fs');

// Fix CallView title
let callView = fs.readFileSync('src/components/Chat/CallView.tsx', 'utf8');
callView = callView.replace(
  /<MonitorUp className="w-3 h-3 text-\[#23a559\]" title="Compartilhando Tela" \/>/g,
  '<span title="Compartilhando Tela"><MonitorUp className="w-3 h-3 text-[#23a559]" /></span>'
);
fs.writeFileSync('src/components/Chat/CallView.tsx', callView);

// Fix ChatArea
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

if (!chatArea.includes('censorText =')) {
  chatArea = chatArea.replace(
    /const handleSend = async/,
    censorTextFn + '\n  const handleSend = async'
  );
}

// Ensure displayContent is accessible. The map had issues because I only added it to the main messages.map, what about the other ones?
// Let's just create a helper component or just replace all msg.content uses inside ChatArea.
// Actually, it's easier to just censor before rendering.
// Wait, TS says (144, 76): Cannot find name 'displayContent'.
// Line 144 is probably inside some OTHER map or function (maybe editMessage?)
// Let's just undo the displayContent thing and use censorText(msg.content) everywhere.

chatArea = chatArea.replace(/displayContent\.match/g, 'censorText(msg.content).match');
chatArea = chatArea.replace(/\{displayContent\}/g, '{censorText(msg.content)}');
chatArea = chatArea.replace(/const displayContent = censorText\(msg\.content\);/g, '');

fs.writeFileSync('src/components/Chat/ChatArea.tsx', chatArea);
