const fs = require('fs');

const diff = `
          </div>
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border-primary scrollbar-track-transparent"
            role="log"
            aria-live="polite"
            aria-atomic="false"
          >
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center space-x-2 px-4 py-2 text-xs text-text-muted animate-in fade-in slide-in-from-bottom-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-color-brand rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-color-brand rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-color-brand rounded-full animate-bounce"></div>
                </div>
                <span className="font-medium">
                  {typingUsers.length > 2 
                    ? 'Vários usuários estão digitando...' 
                    : \`\${typingUsers.join(' e ')} \${typingUsers.length === 1 ? 'está' : 'estão'} digitando...\`}
                </span>
              </div>
            )}
            {/* Recording Indicator */}
            {recordingUsers.length > 0 && (
              <div className="flex items-center space-x-2 px-4 py-2 text-xs text-green-500 animate-in fade-in slide-in-from-bottom-2">
                <Mic className="w-3 h-3 animate-pulse" />
                <span className="font-medium">
                  {recordingUsers.length > 2 
                    ? 'Vários usuários estão gravando áudio...' 
                    : \`\${recordingUsers.join(' e ')} \${recordingUsers.length === 1 ? 'está' : 'estão'} gravando áudio...\`}
                </span>
              </div>
            )}
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-muted space-y-4">
                 {activeChannel.type === 'private' && otherUser ? (
                   <>
                     <img 
                       src={otherUser.photoURL || DEFAULT_AVATAR} 
                       alt={otherUser.displayName}
                       className="w-24 h-24 rounded-full object-cover mb-2"
                       referrerPolicy="no-referrer"
                     />
                     <p className="text-lg font-bold text-text-primary">Privado ({currentUser.displayName} com {otherUser.displayName})</p>
                     <p className="text-sm">Este é o começo do seu histórico de mensagens diretas com @{otherUser.displayName}.</p>
                   </>
                 ) : (
                   <>
                     <div className="bg-bg-tertiary p-4 rounded-full">
                        <Hash className="w-12 h-12 text-text-secondary" />
                     </div>
                     <p className="text-lg font-bold text-text-primary">Este é o começo do canal #{activeChannel.name}</p>
                     <p className="text-sm">Envie uma mensagem para começar!</p>
                   </>
                 )}
              </div>
            ) : (
              messages.map((msg, idx) => {
                
                const isSameUserAsPrev = idx > 0 && messages[idx-1].senderId === msg.senderId;
                const date = getTimestampDate(msg.timestamp);
                const prevMsg = idx > 0 ? messages[idx-1] : null;
                const prevDate = prevMsg ? getTimestampDate(prevMsg.timestamp) : null;
                const isNewDay = !(!date || !prevDate) && date.toDateString() !== prevDate.toDateString();
                const time = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const isMyMessage = msg.senderId === currentUser.uid;
                const readByUsers = allUsers.filter(u => msg.readBy?.includes(u.uid));

                return (
                  <div key={msg.id}>
                    {(idx === 0 || isNewDay) && date && (
                      <div className="text-center text-xs text-text-muted my-4">
                        {date.toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                    )}
                    <div 
                      id={\`message-\${msg.id}\`}
                      onClick={() => {
                      if (isMultiSelectMode) {
                        toggleMessageSelection(msg.id);
                      } else if (contextMenu && contextMenu.message.id !== msg.id) {
                        // Start multi-select if clicking another message while context menu is open
                        setIsMultiSelectMode(true);
                        setSelectedMessageIds([contextMenu.message.id, msg.id]);
                        setContextMenu(null);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (isMultiSelectMode) return;
                      setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
                    }}
                    onTouchStart={(e) => handleTouchStart(e, msg)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    className={cn(
                      "flex items-start space-x-4 group hover:bg-bg-secondary/50 -mx-4 px-4 py-1 transition-colors relative cursor-default",
                      !isSameUserAsPrev && "mt-4",
                      (contextMenu?.message.id === msg.id || selectedMessageIds.includes(msg.id)) && "bg-bg-secondary",
                      isMultiSelectMode && "cursor-pointer"
                    )}
                  >
                    {isMultiSelectMode && (
                      <div className="mt-2 shrink-0">
                        {selectedMessageIds.includes(msg.id) ? (
                          <CheckSquare className="w-5 h-5 text-color-brand" />
                        ) : (
                          <Square className="w-5 h-5 text-text-muted" />
                        )}
                      </div>
                    )}
                    {!isSameUserAsPrev ? (
                      <img 
                        src={msg.senderPhoto || DEFAULT_AVATAR} 
                        alt={msg.senderName}
                        onClick={() => handleUserClick(msg.senderId)}
                        className="w-10 h-10 rounded-full object-cover mt-1 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 flex-shrink-0 flex justify-center opacity-0 group-hover:opacity-100">
                    </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col">
                      {!isSameUserAsPrev && (
                        <div className="flex items-center space-x-2 mb-0.5">
                          <span 
                            onClick={() => handleUserClick(msg.senderId)}
                            className="font-bold text-text-primary hover:underline cursor-pointer"
                          >
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-text-muted">{time}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between group/msg">
                        <div className="flex-1 min-w-0">
                          {msg.replyTo && (
                            <div 
                              className="flex items-center text-xs text-text-muted mb-1 space-x-1 bg-bg-secondary p-1 rounded cursor-pointer hover:bg-bg-tertiary"
                              onClick={() => {
                                const element = document.getElementById(\`message-\${msg.replyTo.messageId}\`);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }}
                            >
                              <CornerDownRight className="w-3 h-3" />
                              <img src={msg.replyTo.senderPhoto || DEFAULT_AVATAR} className="w-4 h-4 rounded-full" />
                              <span className="font-bold">{msg.replyTo.senderName}</span>
                              <span className="truncate max-w-[200px]">{msg.replyTo.content}</span>
                            </div>
                          )}
                          <p className="text-text-secondary break-words leading-relaxed whitespace-pre-wrap flex items-end gap-2">
                            {msg.isPinned && <Pin className="w-3 h-3 text-color-brand inline-block mr-1 -mt-1" />}
                            {censorText(msg.content)}
                            {msg.isEdited && <span className="text-[10px] text-text-muted">(editado)</span>}
                            {isSameUserAsPrev && <span className="text-[10px] text-text-muted">{time}</span>}
                          </p>
                          
                          {translatedMessages[msg.id] && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-2 p-2 bg-bg-tertiary rounded border-l-2 border-color-brand text-sm italic text-text-primary"
                            >
                              <div className="flex items-center text-[10px] text-color-brand font-bold uppercase mb-1">
                                <Languages className="w-3 h-3 mr-1" />
                                Tradução ({currentUser.language || 'pt'})
                              </div>
                              {translatedMessages[msg.id]}
                            </motion.div>
                          )}

                          {isTranslating === msg.id && (
                            <div className="flex items-center space-x-2 mt-2 text-xs text-text-muted">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Traduzindo...</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Actions on hover */}
                        {!isMultiSelectMode && (
                          <div className="hidden group-hover:flex items-center space-x-2 bg-bg-primary border border-border-primary rounded-md px-2 py-1 shadow-lg absolute right-4 top-0 -translate-y-1/2 z-10">
                            <button
                              onClick={() => setReplyingToMessage(msg)}
                              className="text-text-muted hover:text-text-secondary transition-colors p-1"
                              title="Responder mensagem"
                            >
                              <CornerDownRight className="w-4 h-4" />
                            </button>
                          {(isMyMessage || currentUser.role === 'admin') && (
                            <>
                              {isMyMessage && (
                                <button 
                                  onClick={() => handleEditClick(msg)}
                                  className="text-text-muted hover:text-text-secondary transition-colors p-1"
                                  title="Editar mensagem"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => setDeletingMessageId(msg.id)}
                                className="text-text-muted hover:text-[#f23f42] transition-colors p-1"
                                title="Excluir mensagem"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <div className="relative group/read">
                            <CheckCheck className={cn(
                              "w-4 h-4",
                              msg.readBy && msg.readBy.length > 0 ? "text-color-accent" : "text-text-muted"
                            )} />
                            {msg.readBy && msg.readBy.length > 0 && (
                              <div className="absolute bottom-full right-0 mb-2 hidden group-hover/read:block bg-bg-overlay text-text-primary text-[10px] p-2 rounded shadow-xl whitespace-nowrap z-20">
                                <p className="font-bold mb-1">Lido por:</p>
                                {readByUsers.map(u => (
                                  <div key={u.uid} className="flex items-center space-x-1 mb-0.5">
                                    <div className="w-1 h-1 bg-color-accent rounded-full" />
                                    <span>{u.displayName}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {msg.fileUrl && (
                      (() => {
                        const cleanUrl = msg.fileUrl.split('?')[0].split('#')[0].toLowerCase();
                        const isImage = !!(
                          msg.fileType?.startsWith('image/') ||
                          msg.fileUrl?.startsWith('data:image/') ||
                          cleanUrl.match(/\\.(jpg|jpeg|png|gif|webp|svg|bmp)$/)
                        );
                        const isVideo = !!(
                          msg.fileType?.startsWith('video/') ||
                          msg.fileUrl?.startsWith('data:video/') ||
                          cleanUrl.match(/\\.(mp4|webm|ogg|mov|avi|mkv|wmv|flv|3gp)$/)
                        );
                        const isAudio = !!(
                          msg.fileType?.startsWith('audio/') ||
                          msg.fileUrl?.startsWith('data:audio/') ||
                          cleanUrl.match(/\\.(mp3|wav|ogg|webm|mpeg|aac|m4a)$/)
                        );

                        if (isImage) {
                          return (
                            <img 
                              src={msg.fileUrl} 
                              alt="Anexo de Imagem" 
                              className="max-w-xs md:max-w-md rounded-lg mt-2 cursor-pointer hover:opacity-90 transition-opacity max-h-[300px] object-contain border border-border-primary/50 shadow-sm"
                              onClick={() => setLightboxFile({ url: msg.fileUrl!, type: 'image' })}
                              referrerPolicy="no-referrer" 
                            />
                          );
                        } else if (isAudio) {
                          return (
                            <div className="mt-2">
                              <AudioPlayer url={msg.fileUrl!} isSent={msg.senderId === currentUser.uid} showDuration={true} />
                            </div>
                          );
                        } else if (isVideo) {
                          return (
                            <video 
                              controls 
                              src={msg.fileUrl} 
                              className="max-w-xs md:max-w-md rounded-lg mt-2 cursor-pointer hover:opacity-95 transition-opacity max-h-[300px] border border-border-primary/50 shadow-sm bg-black"
                              onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                  setLightboxFile({ url: msg.fileUrl!, type: 'video' });
                                }
                              }}
                            />
                          );
                        } else {
                          return (
                            <a 
                              href={msg.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center space-x-2 text-[#5865f2] dark:text-[#7289da] hover:underline mt-2 bg-bg-secondary hover:bg-bg-tertiary transition-colors px-4 py-2.5 rounded-lg border border-border-primary/50 shadow-sm select-none"
                            >
                              <FileText className="w-5 h-5 text-text-muted" />
                              <span className="text-sm font-medium">Download do Arquivo</span>
                              <Download className="w-4 h-4 text-text-muted" />
                            </a>
                          );
                        }
                      })()
                    )}

                      {msg.statusReply && (
                        <div 
                          className="mt-2 p-2.5 bg-black/50 hover:bg-black/60 border border-white/10 rounded-xl flex items-center space-x-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] select-none"
                          onClick={() => onOpenStatusForUser(msg.statusReply?.userId || msg.senderId)}
                        >
                          <div className="relative flex-shrink-0 w-11 h-16 rounded-lg overflow-hidden border border-white/20 bg-gradient-to-br from-[#8a3ab9] via-[#e95950] to-[#fccc63] flex items-center justify-center shadow-inner">
                            {msg.statusReply.mediaType === 'image' || msg.statusReply.mediaType === 'video' || msg.statusReply.mediaType === 'drawing' ? (
                              <img src={msg.statusReply.mediaUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : msg.statusReply.mediaType === 'text' ? (
                              <div className="p-1 text-[8px] font-bold text-white text-center line-clamp-3 leading-tight">
                                {msg.statusReply.mediaUrl || msg.statusReply.caption}
                              </div>
                            ) : (
                              <Eye className="w-4 h-4 text-white" />
                            )}
                            <div className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
                              <Sparkles className="w-2 h-2 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1">
                              <span className="text-[9px] font-semibold text-white/50 tracking-wider uppercase">Status</span>
                              <span className="w-1 h-1 bg-white/30 rounded-full" />
                              <span className="text-[9px] font-medium text-white/70">Instagram Style</span>
                            </div>
                            <p className="text-xs font-bold text-white mt-0.5">
                              Respondeu ao status
                            </p>
                            {msg.statusReply.caption && (
                              <p className="text-[11px] text-white/75 line-clamp-1 mt-0.5 italic">
                                "{msg.statusReply.caption}"
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {currentUser.linkPreviewsEnabled !== false && (
                        <>
                          {censorText(msg.content).match(/(https?:\\/\\/[^\\s]+)/g)?.map((url, i) => (
                            <LinkPreview key={i} url={url} />
                          ))}
                        </>
                      )}

                      {/* Reactions Display */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(msg.reactions).map(([emoji, users]) => {
                            const hasReacted = users.includes(currentUser.uid);
                            return (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeChannel) {
                                    toggleReaction(activeChannel.id, msg.id, emoji, currentUser.uid);
                                  }
                                }}
                                className={cn(
                                  "flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-xs border transition-colors",
                                  hasReacted 
                                    ? "bg-color-brand/20 border-color-brand/50 text-color-brand" 
                                    : "bg-bg-secondary border-transparent text-text-muted hover:border-border-primary"
                                )}
                              >
                                <span>{emoji}</span>
                                <span className="font-bold">{users.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Read receipts indicator below message (Discord style) */}
                      {isMyMessage && msg.readBy && msg.readBy.length > 0 && (
                        <div className="flex items-center space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CheckCheck className="w-3 h-3 text-color-accent" />
                          <span className="text-[10px] text-text-muted">
                            Lido por {msg.readBy.length} {msg.readBy.length === 1 ? 'pessoa' : 'pessoas'}
                          </span>
                        </div>
                      )}
                    </div>
                    </div>

                    {/* Quick Action Bar (Hover) */}
                    {!isMultiSelectMode && !deletingMessageId && !editingMessageId && (
                      <div className="absolute top-0 right-4 -mt-3 hidden group-hover:flex items-center bg-bg-primary border border-border-primary rounded shadow-sm z-10 overflow-hidden">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setReactionPickerMessageId(msg.id); }}
                          className="p-1.5 hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-colors"
                          title="Adicionar reação"
                        >
                          <SmilePlus className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleTogglePin(msg); }}
                          className="p-1.5 hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-colors"
                          title={msg.isPinned ? "Desafixar" : "Fixar"}
                        >
                          {msg.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>
                        {msg.senderId === currentUser.uid && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEditClick(msg); }}
                            className="p-1.5 hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {(msg.senderId === currentUser.uid || currentUser.role === 'admin') && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeletingMessageId(msg.id); }}
                            className="p-1.5 hover:bg-bg-secondary text-text-muted hover:text-color-danger transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Reaction Picker Popover */}
                    {reactionPickerMessageId === msg.id && (
                      <div 
                        className="absolute top-0 right-12 -mt-10 bg-bg-primary border border-border-primary rounded-lg shadow-xl z-30 flex items-center p-1 space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '🎉'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (activeChannel) {
                                await toggleReaction(activeChannel.id, msg.id, emoji, currentUser.uid);
                                setReactionPickerMessageId(null);
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-bg-secondary rounded text-lg transition-transform hover:scale-110"
                          >
                            {emoji}
                          </button>
                        ))}
                        <div className="w-px h-6 bg-border-primary mx-1" />
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setFullReactionPickerMessageId(msg.id);
                            setReactionPickerMessageId(null);
                          }}
                          className="w-8 h-8 flex items-center justify-center hover:bg-bg-secondary rounded text-text-muted"
                          title="Mais emojis"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setReactionPickerMessageId(null); }}
                          className="w-8 h-8 flex items-center justify-center hover:bg-bg-secondary rounded text-text-muted"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Full Reaction Picker */}
                    {fullReactionPickerMessageId === msg.id && (
                      <div 
                        className="absolute top-0 right-12 -mt-10 z-40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setFullReactionPickerMessageId(null); }}
                            className="absolute -top-2 -right-2 bg-bg-secondary border border-border-primary rounded-full p-1 z-50 hover:bg-bg-tertiary"
                          >
                            <X className="w-3 h-3 text-text-muted" />
                          </button>
                          <EmojiPicker 
                            theme={currentUser.theme === 'light' ? Theme.LIGHT : Theme.DARK}
                            onEmojiClick={async (emojiData) => {
                              if (activeChannel) {
                                await toggleReaction(activeChannel.id, msg.id, emojiData.emoji, currentUser.uid);
                                setFullReactionPickerMessageId(null);
                              }
                            }}
                            lazyLoadEmojis={true}
                            searchPlaceHolder="Buscar emoji..."
                            width={300}
                            height={400}
                          />
                        </div>
                      </div>
                    )}
`;

let source = fs.readFileSync('src/components/Chat/ChatArea.tsx', 'utf-8');

const target = `
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border-primary scrollbar-track-transparent"
            role="log"
            aria-live="polite"
            aria-atomic="false"
          >
            {/* ... Rest of message rendering logic ... */}
          </div>
`;

source = source.replace(target, diff);

fs.writeFileSync('src/components/Chat/ChatArea.tsx', source);
console.log('Restored deleted content');
