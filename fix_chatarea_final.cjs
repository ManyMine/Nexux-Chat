const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf8');

// Inject the state and useEffect
const hookCode = `
  const [censoredWords, setCensoredWords] = useState<string[]>([]);
  useEffect(() => {
    getCensoredWords().then(words => setCensoredWords(words)).catch(console.error);
  }, []);
`;

if (!code.includes('setCensoredWords(words)')) {
  code = code.replace(
    /const \[input, setInput\] = useState\(''\);/,
    `const [input, setInput] = useState('');` + hookCode
  );
}

fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
