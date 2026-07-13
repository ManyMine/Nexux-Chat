const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/AdminPanel.tsx', 'utf8');

if (!code.includes('getCensoredWords')) {
  code = code.replace(
    /import { getUsers,/, 
    'import { getUsers, getCensoredWords, updateCensoredWords,'
  );
}

if (!code.includes('activeTab')) {
  code = code.replace(
    /const \[users, setUsers\] = useState<UserProfile\[\]>\(\[\]\);/,
    `const [activeTab, setActiveTab] = useState<'users' | 'censorship'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [censoredWords, setCensoredWords] = useState<string[]>([]);
  const [newCensoredWord, setNewCensoredWord] = useState('');`
  );
}

if (!code.includes('loadCensoredWords')) {
  code = code.replace(
    /const loadUsers = async \(\) => \{/,
    `const loadCensoredWords = async () => {
    try {
      const words = await getCensoredWords();
      setCensoredWords(words);
    } catch (error) {
      console.error(error);
    }
  };

  const loadUsers = async () => {`
  );
  
  code = code.replace(
    /loadUsers\(\);/,
    `loadUsers();
    loadCensoredWords();`
  );
}

if (!code.includes('handleAddCensoredWord')) {
  code = code.replace(
    /const handleSearch = \(e: React.ChangeEvent<HTMLInputElement>\) => \{/,
    `const handleAddCensoredWord = async (e: React.FormEvent) => {
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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {`
  );
}

const uiTabs = `
      <div className="flex space-x-2 border-b border-border-primary p-2">
        <button 
          onClick={() => setActiveTab('users')}
          className={cn("px-4 py-2 rounded-md text-sm font-bold transition-colors", activeTab === 'users' ? "bg-bg-tertiary text-text-primary" : "text-text-muted hover:bg-bg-tertiary")}
        >
          Usuários
        </button>
        <button 
          onClick={() => setActiveTab('censorship')}
          className={cn("px-4 py-2 rounded-md text-sm font-bold transition-colors", activeTab === 'censorship' ? "bg-bg-tertiary text-text-primary" : "text-text-muted hover:bg-bg-tertiary")}
        >
          Palavras Censuradas
        </button>
      </div>
`;

if (!code.includes('Palavras Censuradas')) {
  code = code.replace(
    /<div className="p-4 border-b border-border-primary bg-bg-tertiary\/50">/,
    uiTabs + `
      <div className="p-4 border-b border-border-primary bg-bg-tertiary/50">`
  );
  
  code = code.replace(
    /\{loading \? \(/,
    `{activeTab === 'censorship' ? (
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <form onSubmit={handleAddCensoredWord} className="flex space-x-2">
            <input
              type="text"
              value={newCensoredWord}
              onChange={(e) => setNewCensoredWord(e.target.value)}
              placeholder="Digite a palavra para censurar..."
              className="flex-1 bg-bg-tertiary text-text-primary px-4 py-2 rounded border border-border-primary focus:outline-none focus:border-color-brand"
            />
            <button
              type="submit"
              disabled={actionLoading === 'add-word' || !newCensoredWord.trim()}
              className="bg-color-brand hover:brightness-110 text-white px-4 py-2 rounded font-bold disabled:opacity-50 flex items-center"
            >
              {actionLoading === 'add-word' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
            </button>
          </form>
          <div className="flex flex-wrap gap-2 mt-4">
            {censoredWords.map(word => (
              <div key={word} className="bg-bg-tertiary border border-border-primary rounded-full px-3 py-1 flex items-center space-x-2">
                <span className="text-text-primary text-sm font-medium">{word}</span>
                <button 
                  onClick={() => handleRemoveCensoredWord(word)}
                  disabled={actionLoading === 'remove-word-' + word}
                  className="text-text-muted hover:text-[#f23f42] transition-colors"
                >
                  {actionLoading === 'remove-word-' + word ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                </button>
              </div>
            ))}
            {censoredWords.length === 0 && (
              <p className="text-text-muted text-sm italic w-full text-center py-4">Nenhuma palavra censurada configurada.</p>
            )}
          </div>
        </div>
      ) : loading ? (`
  );
}

fs.writeFileSync('src/components/Chat/AdminPanel.tsx', code);
