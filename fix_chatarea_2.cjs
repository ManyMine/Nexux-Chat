const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf8');

// Remove from LinkPreview
code = code.replace(
  `  useEffect(() => {
    getCensoredWords().then(words => setCensoredWords(words)).catch(console.error);
  }, []);

  useEffect(() => {
    fetch`,
  `  useEffect(() => {
    fetch`
);

// Add to ChatArea
code = code.replace(
  `  const [showStickers, setShowStickers] = useState(false);
  const [censoredWords, setCensoredWords] = useState<string[]>([]);`,
  `  const [showStickers, setShowStickers] = useState(false);
  const [censoredWords, setCensoredWords] = useState<string[]>([]);
  useEffect(() => {
    getCensoredWords().then(words => setCensoredWords(words)).catch(console.error);
  }, []);
`
);

fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
