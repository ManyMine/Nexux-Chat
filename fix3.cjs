const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

const target = `            {/* ... */}
          </div>
        </div>
      </div>
    </AnimatePresence>`;

const replacement = `            {typingUsers.length > 0 && (
              <div className="px-4 py-2 text-xs text-text-muted animate-pulse">
                {activeChannel?.type === 'private' ? (
                  <div className="flex items-center space-x-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce delay-75">.</span>
                    <span className="animate-bounce delay-150">.</span>
                  </div>
                ) : (
                  <div>
                    {typingUsers.map(uid => allUsers.find(u => u.uid === uid)?.displayName || 'Alguém').join(', ')} está(ão) digitando...
                  </div>
                )}
              </div>
            )}
            {recordingUsers.length > 0 && (
              <div className="px-4 py-2 text-xs text-green-500 flex items-center gap-1 animate-pulse">
                <Mic className="w-3 h-3 h-3" />
                {recordingUsers.map(uid => allUsers.find(u => u.uid === uid)?.displayName || 'Alguém').join(', ')} está(ão) gravando áudio...
              </div>
            )}
            <p className="text-[10px] text-text-muted mt-1 ml-4 pb-2">
              {editingMessageId ? (
                <>Pressione <span className="font-bold">Enter</span> para salvar • <span className="font-bold cursor-pointer hover:underline" onClick={handleCancelEdit}>Esc</span> para cancelar</>
              ) : (
                <>Pressione <span className="font-bold">Enter</span> para enviar</>
              )}
            </p>
          </div>
        </div>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/Chat/ChatArea.tsx', code);
