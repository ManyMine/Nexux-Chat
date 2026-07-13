const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/AdminPanel.tsx', 'utf8');

const handlers = `
  const handleAddCensoredWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCensoredWord.trim()) return;
    const word = newCensoredWord.trim().toLowerCase();
    if (censoredWords.includes(word)) return;
    
    setActionLoading('add-word');
    try {
      const newWords = [...censoredWords, word];
      await updateCensoredWords(newWords);
      setCensoredWords(newWords);
      setNewCensoredWord('');
      showMessage('success', 'Palavra adicionada com sucesso.');
    } catch (error) {
      showMessage('error', 'Erro ao adicionar palavra.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveCensoredWord = async (wordToRemove: string) => {
    setActionLoading('remove-word-' + wordToRemove);
    try {
      const newWords = censoredWords.filter(w => w !== wordToRemove);
      await updateCensoredWords(newWords);
      setCensoredWords(newWords);
      showMessage('success', 'Palavra removida com sucesso.');
    } catch (error) {
      showMessage('error', 'Erro ao remover palavra.');
    } finally {
      setActionLoading(null);
    }
  };
`;

code = code.replace(
  /const filteredUsers = users.filter/,
  handlers + '\n  const filteredUsers = users.filter'
);

fs.writeFileSync('src/components/Chat/AdminPanel.tsx', code);
