import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hash, Send, PlusCircle, Gift, Sticker, Smile, Trash2, CheckCheck, Pencil, X, Copy, MessageSquare, Edit3, VolumeX, Users, PlusSquare, Shield, ShieldOff, Search, Languages, CheckSquare, Square, Download, Loader2, Pin, PinOff, Eye, Sparkles } from 'lucide-react';
import { Call, Channel, Message, UserProfile } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { DEFAULT_AVATAR } from '@/src/constants';
import { ChannelHeader } from './ChannelHeader';
import { UserList } from './UserList';
import { ChannelSettings } from './ChannelSettings';
import { CallView } from './CallView';
import { IncomingCallModal } from './IncomingCallModal';
import { updateChannel, deleteChannel, deleteMessage, markMessageAsRead, getUsers, editMessage, createPrivateChannel, createChannel, startCall, updateCallStatus, listenForIncomingCalls, toggleChatAccess, togglePinMessage } from '@/src/services/firebaseService';
import { translateText, chatWithGemini } from '@/src/services/geminiService';
import { useI18n } from '@/src/lib/i18n';

interface ChatAreaProps {
  activeChannel: Channel | null;
  messages: Message[];
  onSendMessage: (content: string, file?: File) => Promise<void>;
  isLoading?: boolean;
  currentUser: UserProfile;
  typingUsers: string[];
  onStartTyping: () => Promise<void>;
  onStopTyping: () => Promise<void>;
  onToggleSidebar?: () => void;
  activeCall: { id: string, type: 'voice' | 'video', channel: Channel } | null;
  onStartCall: (video: boolean) => void;
  onEndCall: () => void;
  onOpenStatusForUser: (userId: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeChannel,
  messages,
  onSendMessage,
  isLoading,
  currentUser,
  typingUsers,
  onStartTyping,
  onStopTyping,
  onToggleSidebar,
  activeCall,
  onStartCall,
  onEndCall,
  onOpenStatusForUser
}) => {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUsers, setShowUsers] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: Message } | null>(null);
  const [userContextMenu, setUserContextMenu] = useState<{ x: number, y: number, user: UserProfile } | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Typing timeout
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await getUsers();
        setAllUsers(users);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

    // Mark messages as read
    if (activeChannel && messages.length > 0) {
      messages.forEach(msg => {
        if (msg.senderId !== currentUser.uid && (!msg.readBy || !msg.readBy.includes(currentUser.uid))) {
          markMessageAsRead(activeChannel.id, msg.id, currentUser.uid);
        }
      });
    }
  }, [messages, activeChannel, currentUser.uid]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    onStartTyping();
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isAdmin = currentUser.role === 'admin';
    const canChat = currentUser.canChat !== false || isAdmin;

    if (!canChat) {
      alert("Você não tem permissão para enviar mensagens.");
      return;
    }

    if (editingMessageId && activeChannel) {
      if (editContent.trim()) {
        await editMessage(activeChannel.id, editingMessageId, editContent);
      }
      setEditingMessageId(null);
      setEditContent('');
      return;
    }

    if (input.trim() || fileInputRef.current?.files?.[0]) {
      if (input.trim().startsWith('/gem ')) {
        const prompt = input.trim().substring(5);
        onSendMessage(input, fileInputRef.current?.files?.[0]);
        setInput('');
        onStopTyping();
        
        // Call Gemini
        chatWithGemini(prompt).then(response => {
          onSendMessage(`Gemini: ${response}`);
        });
      } else {
        onSendMessage(input, fileInputRef.current?.files?.[0]);
        setInput('');
        onStopTyping();
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEditClick = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
    // Focus the input field after state update
    setTimeout(() => {
      const inputEl = document.getElementById('chat-input');
      if (inputEl) inputEl.focus();
    }, 0);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) setContextMenu(null);
        else if (userContextMenu) setUserContextMenu(null);
        else if (editingMessageId) handleCancelEdit();
      }
    };
    
    const handleClickOutside = () => {
      if (contextMenu) setContextMenu(null);
      if (userContextMenu) setUserContextMenu(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [editingMessageId, contextMenu]);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpdateChannel = async (channelId: string, data: Partial<Channel>) => {
    try {
      await updateChannel(channelId, data);
    } catch (error) {
      console.error("Error updating channel:", error);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    if (isMultiSelectMode) return;
    const touch = e.touches[0];
    touchTimeoutRef.current = setTimeout(() => {
      setContextMenu({ x: touch.clientX, y: touch.clientY, message: msg });
    }, 500);
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessageIds(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId) 
        : [...prev, messageId]
    );
  };

  const handleTranslate = async (msg: Message) => {
    const targetLang = currentUser.language || 'pt';
    const langNames: Record<string, string> = {
      'pt': 'Português',
      'en': 'Inglês',
      'es': 'Espanhol',
      'ja': 'Japonês'
    };

    try {
      setIsTranslating(msg.id);
      setContextMenu(null);
      const translation = await translateText(msg.content, langNames[targetLang] || 'Português');
      setTranslatedMessages(prev => ({ ...prev, [msg.id]: translation }));
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setIsTranslating(null);
    }
  };

  const handleTogglePin = async (msg: Message) => {
    if (!activeChannel) return;
    try {
      await togglePinMessage(activeChannel.id, msg.id, !msg.isPinned, currentUser.uid);
      setContextMenu(null);
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  const handleDeleteSelected = async () => {
    if (!activeChannel || selectedMessageIds.length === 0) return;
    
    if (window.confirm(`Excluir ${selectedMessageIds.length} mensagens selecionadas?`)) {
      try {
        for (const id of selectedMessageIds) {
          await deleteMessage(activeChannel.id, id);
        }
        setSelectedMessageIds([]);
        setIsMultiSelectMode(false);
      } catch (error) {
        console.error("Error deleting selected messages:", error);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
  };

  const handleCreateDM = async (userId: string) => {
    if (userId === currentUser.uid) return;
    try {
      await createPrivateChannel(currentUser.uid, userId);
      setContextMenu(null);
    } catch (error) {
      console.error("Error creating DM:", error);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      await deleteChannel(channelId);
    } catch (error) {
      console.error("Error deleting channel:", error);
    }
  };

  const getOtherUser = () => {
    if (!activeChannel || activeChannel.type !== 'private') return null;
    const otherUserId = activeChannel.members.find(id => id !== currentUser.uid);
    return allUsers.find(u => u.uid === otherUserId);
  };

  const otherUser = getOtherUser();

  if (!activeChannel) {
    return (
      <div className="flex-1 bg-bg-primary flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="bg-color-brand p-6 rounded-full shadow-2xl">
          <Hash className="w-16 h-16 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary">Bem-vindo ao Nexus Chat!</h2>
        <p className="text-text-muted max-w-md">
          Selecione um canal na barra lateral para começar a conversar ou crie um novo para reunir seus amigos.
        </p>
      </div>
    );
  }

  const filteredMessages = searchQuery.trim() 
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="flex-1 bg-bg-primary flex flex-col h-full overflow-hidden relative">
      {/* Header */}
      <ChannelHeader 
        channel={activeChannel}
        otherUser={otherUser}
        onShowUsers={() => setShowUsers(!showUsers)}
        onShowSettings={() => setShowSettings(true)}
        showUsers={showUsers}
        onToggleSidebar={onToggleSidebar}
        onStartCall={onStartCall}
        onSearch={(query) => {
          setSearchQuery(query);
          setIsSearching(!!query);
        }}
        onShowPinned={() => setShowPinned(!showPinned)}
      />

      <div className="flex flex-1 overflow-hidden flex-col relative">
        {/* Search Results Overlay */}
        <AnimatePresence>
          {isSearching && searchQuery && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-x-0 top-0 z-30 bg-bg-secondary border-b border-border-primary shadow-2xl max-h-[60%] overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-text-secondary font-bold flex items-center">
                    <Search className="w-4 h-4 mr-2" />
                    Resultados para "{searchQuery}" ({filteredMessages.length})
                  </h3>
                  <button 
                    onClick={() => {
                      setIsSearching(false);
                      setSearchQuery('');
                    }}
                    className="text-text-muted hover:text-text-primary"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    Nenhuma mensagem encontrada.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMessages.map(msg => (
                      <div 
                        key={msg.id}
                        className="p-3 bg-bg-primary rounded hover:bg-bg-tertiary cursor-pointer transition-colors group"
                        onClick={() => {
                          setIsSearching(false);
                          setSearchQuery('');
                          // In a real app, we'd scroll to the message
                        }}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-bold text-text-primary text-sm">{msg.senderName}</span>
                          <span className="text-[10px] text-text-muted">
                            {new Date(msg.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary break-words">
                          {msg.content.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => 
                            part.toLowerCase() === searchQuery.toLowerCase() 
                              ? <span key={i} className="bg-color-accent/30 text-color-accent rounded px-0.5">{part}</span>
                              : part
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeCall && activeCall.channel.id === activeChannel.id && (
          <div className="h-[40vh] min-h-[300px] w-full shrink-0">
            <CallView 
              callId={activeCall.id}
              channel={activeCall.channel} 
              currentUser={currentUser} 
              allUsers={allUsers}
              type={activeCall.type}
              onClose={onEndCall} 
            />
          </div>
        )}
        <div className="flex flex-1 overflow-hidden">
          {/* Pinned Messages Drawer */}
          <AnimatePresence>
            {showPinned && (
              <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                className="absolute left-0 top-0 bottom-0 w-80 bg-bg-secondary border-r border-border-primary z-40 shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-border-primary flex items-center justify-between bg-bg-tertiary">
                  <h3 className="font-bold text-text-primary flex items-center">
                    <Pin className="w-4 h-4 mr-2" />
                    {t('pinnedMessages')}
                  </h3>
                  <button onClick={() => setShowPinned(false)} className="p-1 hover:bg-bg-secondary rounded">
                    <X className="w-5 h-5 text-text-muted" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.filter(m => m.isPinned).length === 0 ? (
                    <div className="text-center py-8 text-text-muted italic">
                      {t('noPinnedMessages')}
                    </div>
                  ) : (
                    messages.filter(m => m.isPinned).map(msg => (
                      <div key={msg.id} className="p-3 bg-bg-primary rounded-lg border border-border-primary hover:border-color-brand transition-colors group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <img src={msg.senderPhoto || DEFAULT_AVATAR} className="w-6 h-6 rounded-full" />
                            <span className="text-xs font-bold text-text-primary">{msg.senderName}</span>
                          </div>
                          <button 
                            onClick={() => handleTogglePin(msg)}
                            className="text-text-muted hover:text-color-brand opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <PinOff className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-3">{msg.content}</p>
                        <p className="text-[10px] text-text-muted mt-2">{new Date(msg.timestamp).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages List Area */}
          <div className="flex-1 flex flex-col h-full min-w-0">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border-primary scrollbar-track-transparent"
          >
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="text-xs text-text-muted italic px-4 py-1">
                {typingUsers.length > 2 
                  ? 'Vários usuários estão digitando...' 
                  : `${typingUsers.join(' e ')} ${typingUsers.length === 1 ? 'está' : 'estão'} digitando...`}
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
                const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isMyMessage = msg.senderId === currentUser.uid;
                const readByUsers = allUsers.filter(u => msg.readBy?.includes(u.uid));

                return (
                  <div 
                    key={msg.id} 
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
                        className="w-10 h-10 rounded-full object-cover mt-1 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 flex-shrink-0 flex justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-[10px] text-text-muted mt-1.5">{time}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {!isSameUserAsPrev && (
                        <div className="flex items-center space-x-2 mb-0.5">
                          <span className="font-bold text-text-primary hover:underline cursor-pointer">{msg.senderName}</span>
                          <span className="text-[10px] text-text-muted">{time}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between group/msg">
                        <div className="flex-1 min-w-0">
                          <p className="text-text-secondary break-words leading-relaxed whitespace-pre-wrap">
                            {msg.isPinned && <Pin className="w-3 h-3 text-color-brand inline-block mr-1 -mt-1" />}
                            {msg.content}
                            {msg.isEdited && <span className="text-[10px] text-text-muted ml-1">(editado)</span>}
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
                        msg.fileType?.startsWith('image/') ? (
                          <img src={msg.fileUrl} alt="attachment" className="max-w-xs rounded-lg mt-2" />
                        ) : msg.fileType?.startsWith('audio/') ? (
                          <audio controls src={msg.fileUrl} className="mt-2" />
                        ) : msg.fileType?.startsWith('video/') ? (
                          <video controls src={msg.fileUrl} className="max-w-xs rounded-lg mt-2" />
                        ) : (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[#5865f2] hover:underline mt-2 block">
                            Download File
                          </a>
                        )
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

                    {/* Quick Action Bar (Hover) */}
                    {!isMultiSelectMode && !deletingMessageId && !editingMessageId && (
                      <div className="absolute top-0 right-4 -mt-3 hidden group-hover:flex items-center bg-bg-primary border border-border-primary rounded shadow-sm z-10 overflow-hidden">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleTogglePin(msg); }}
                          className="p-1.5 hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-colors"
                          title={msg.isPinned ? "Desafixar" : "Fixar"}
                        >
                          {msg.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>
                        {msg.senderId === currentUser.uid && (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleEditClick(msg); }}
                              className="p-1.5 hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeletingMessageId(msg.id); }}
                              className="p-1.5 hover:bg-bg-secondary text-text-muted hover:text-color-danger transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Deletion Confirmation Overlay */}
                    {deletingMessageId === msg.id && (
                      <div className="absolute inset-0 bg-bg-primary/90 flex items-center justify-center z-20 rounded-lg border border-[#f23f42]/30">
                        <div className="flex items-center space-x-4 px-4">
                          <span className="text-sm font-medium text-text-primary">Excluir esta mensagem?</span>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => setDeletingMessageId(null)}
                              className="text-xs text-text-primary hover:underline px-2 py-1"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={async () => {
                                if (activeChannel) {
                                  await deleteMessage(activeChannel.id, msg.id);
                                  setDeletingMessageId(null);
                                }
                              }}
                              className="bg-[#f23f42] text-white text-xs px-3 py-1 rounded hover:bg-[#d83c3e] transition-colors"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 pt-0">
            {editingMessageId && (
              <div className="flex items-center justify-between bg-bg-secondary px-4 py-2 rounded-t-lg border-b border-border-primary">
                <span className="text-xs text-text-secondary">Editando mensagem...</span>
                <button onClick={handleCancelEdit} className="text-text-muted hover:text-text-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <form 
              onSubmit={handleSubmit}
              className={cn(
                "bg-bg-tertiary px-4 py-2.5 flex items-center space-x-4 shadow-sm",
                editingMessageId ? "rounded-b-lg" : "rounded-lg"
              )}
            >
              {!editingMessageId && (
                <div className="flex items-center space-x-2">
                  <button type="button" onClick={handleFileClick} className="text-text-muted hover:text-text-primary transition-colors">
                    <PlusCircle className="w-6 h-6" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setInput(prev => prev + '/gem')}
                    className="bg-blue-600 p-1 rounded-full text-white hover:bg-blue-700 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    // Optional: handle file selection preview
                  }
                }}
              />
              <input
                id="chat-input"
                disabled={currentUser.canChat === false && currentUser.role !== 'admin'}
                value={editingMessageId ? editContent : input}
                onChange={editingMessageId ? (e) => setEditContent(e.target.value) : handleInputChange}
                placeholder={currentUser.canChat === false && currentUser.role !== 'admin' ? "Chat desativado para você" : (editingMessageId ? "Editar mensagem..." : `Conversar em #${activeChannel.name}`)}
                className="flex-1 bg-transparent border-none outline-none text-text-secondary placeholder-text-muted text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                autoComplete="off"
              />
              <div className="flex items-center space-x-3 text-text-muted relative">
                {!editingMessageId && (
                  <>
                    <div className="relative">
                      <button 
                        type="button" 
                        onClick={() => setShowGiftPicker(!showGiftPicker)}
                        className={cn("hover:text-text-primary transition-colors", showGiftPicker && "text-[#f2bc1b]")}
                      >
                        <Gift className="w-5 h-5" />
                      </button>
                      <AnimatePresence>
                        {showGiftPicker && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full right-0 mb-4 bg-bg-overlay border border-border-primary rounded-lg shadow-2xl p-4 w-64 z-50"
                          >
                            <h4 className="text-text-primary font-bold text-sm mb-2">Enviar Presente</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {['🎁', '💎', '⭐', '🎈', '🍰', '🍫'].map(gift => (
                                <button 
                                  key={gift}
                                  type="button"
                                  onClick={() => {
                                    onSendMessage(`Enviou um presente: ${gift}`);
                                    setShowGiftPicker(false);
                                  }}
                                  className="text-2xl p-2 hover:bg-bg-tertiary rounded transition-colors"
                                >
                                  {gift}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative">
                      <button 
                        type="button" 
                        onClick={() => setShowGifPicker(!showGifPicker)}
                        className={cn("hover:text-text-primary transition-colors", showGifPicker && "text-[#23a559]")}
                      >
                        <Sticker className="w-5 h-5" />
                      </button>
                      <AnimatePresence>
                        {showGifPicker && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full right-0 mb-4 bg-bg-overlay border border-border-primary rounded-lg shadow-2xl p-4 w-72 z-50"
                          >
                            <h4 className="text-text-primary font-bold text-sm mb-2">GIFs Populares</h4>
                            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                              {[
                                'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxx6fG/giphy.gif',
                                'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l0HlHFRbmaZtBRhXG/giphy.gif',
                                'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKVUn7iM8FMEU24/giphy.gif'
                              ].map((url, i) => (
                                <img 
                                  key={i}
                                  src={url} 
                                  alt="gif" 
                                  className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => {
                                    onSendMessage(url);
                                    setShowGifPicker(false);
                                  }}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative">
                      <button 
                        type="button" 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={cn("hover:text-text-primary transition-colors", showEmojiPicker && "text-[#f2bc1b]")}
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full right-0 mb-4 bg-bg-overlay border border-border-primary rounded-lg shadow-2xl p-4 w-64 z-50"
                          >
                            <div className="grid grid-cols-6 gap-2">
                              {['😀', '😂', '😍', '🤔', '😎', '😭', '👍', '🔥', '❤️', '✨', '🚀', '🎉'].map(emoji => (
                                <button 
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    if (editingMessageId) setEditContent(prev => prev + emoji);
                                    else setInput(prev => prev + emoji);
                                    setShowEmojiPicker(false);
                                  }}
                                  className="text-xl p-1 hover:bg-bg-tertiary rounded transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
                <button 
                  type="submit" 
                  disabled={editingMessageId ? !editContent.trim() : !input.trim()}
                  className={cn(
                    "p-1.5 rounded-full transition-all",
                    (editingMessageId ? editContent.trim() : input.trim()) ? "bg-color-brand text-white" : "text-text-muted"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
            <p className="text-[10px] text-text-muted mt-1 ml-4">
              {editingMessageId ? (
                <>Pressione <span className="font-bold">Enter</span> para salvar • <span className="font-bold cursor-pointer hover:underline" onClick={handleCancelEdit}>Esc</span> para cancelar</>
              ) : (
                <>Pressione <span className="font-bold">Enter</span> para enviar</>
              )}
            </p>
          </div>
        </div>

          {/* User List Sidebar */}
          <AnimatePresence>
            {showUsers && (
              <UserList 
                users={[currentUser, ...allUsers.filter(u => u.uid !== currentUser.uid)].filter(u => activeChannel.type === 'public' || activeChannel.members.includes(u.uid))} 
                isOpen={showUsers} 
                currentUser={currentUser}
                onContextMenu={(e, user) => {
                  e.preventDefault();
                  setUserContextMenu({ x: e.clientX, y: e.clientY, user });
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Multi-select Floating Bar */}
      <AnimatePresence>
        {isMultiSelectMode && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-bg-overlay border border-border-primary rounded-full shadow-2xl px-6 py-3 flex items-center space-x-6"
          >
            <div className="flex items-center space-x-2 border-r border-border-primary pr-6">
              <span className="text-sm font-bold text-text-primary">{selectedMessageIds.length} selecionadas</span>
              <button 
                onClick={() => {
                  setIsMultiSelectMode(false);
                  setSelectedMessageIds([]);
                }}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={handleDeleteSelected}
                disabled={selectedMessageIds.length === 0}
                className="flex items-center space-x-2 text-[#f23f42] hover:bg-[#f23f42]/10 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-bold">Excluir</span>
              </button>
              
              <button 
                onClick={() => {
                  const content = messages
                    .filter(m => selectedMessageIds.includes(m.id))
                    .map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.senderName}: ${m.content}`)
                    .join('\n');
                  navigator.clipboard.writeText(content);
                  alert("Mensagens copiadas!");
                }}
                className="flex items-center space-x-2 text-text-secondary hover:bg-bg-tertiary px-3 py-1.5 rounded-full transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span className="text-sm font-bold">Copiar</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Channel Settings Modal */}
      <ChannelSettings 
        channel={activeChannel}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onDelete={handleDeleteChannel}
        onUpdate={handleUpdateChannel}
        isOwner={activeChannel.createdBy === currentUser.uid}
        isAdmin={currentUser.role === 'admin'}
      />

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ 
              top: Math.min(contextMenu.y, window.innerHeight - 300), 
              left: Math.min(contextMenu.x, window.innerWidth - 260) 
            }}
            className="fixed z-50 w-64 bg-bg-overlay border border-border-primary rounded-md shadow-2xl py-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.message.senderId !== currentUser.uid && (
              <button 
                onClick={() => handleCreateDM(contextMenu.message.senderId)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-color-brand hover:text-white transition-colors group"
              >
                <span>Converter em Mensagem direta</span>
                <MessageSquare className="w-4 h-4" />
              </button>
            )}

            <button 
              onClick={() => handleTranslate(contextMenu.message)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-color-brand hover:text-white transition-colors group"
            >
              <span>Traduzir</span>
              <Languages className="w-4 h-4" />
            </button>

            <button 
              onClick={() => handleTogglePin(contextMenu.message)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-color-brand hover:text-white transition-colors group"
            >
              <span>{contextMenu.message.isPinned ? 'Desafixar' : 'Fixar'}</span>
              <Pin className="w-4 h-4" />
            </button>

            <button 
              onClick={() => {
                setIsMultiSelectMode(true);
                setSelectedMessageIds([contextMenu.message.id]);
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-color-brand hover:text-white transition-colors group"
            >
              <span>Selecionar mensagens</span>
              <CheckSquare className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => { 
                setShowSettings(true); 
                setContextMenu(null); 
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-color-brand hover:text-white transition-colors group"
            >
              <span>Renomear</span>
              <Edit3 className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => { 
                alert(`Notificações de ${activeChannel?.name} silenciadas localmente.`); 
                setContextMenu(null); 
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-color-brand hover:text-white transition-colors group"
            >
              <span>Silenciar</span>
              <VolumeX className="w-4 h-4" />
            </button>
            
            <button 
              onClick={async () => { 
                const name = prompt("Nome do novo grupo:");
                if (name) {
                  await createChannel(name, 'public', currentUser.uid);
                }
                setContextMenu(null); 
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-color-brand hover:text-white transition-colors group"
            >
              <span>Criar grupo</span>
              <Users className="w-4 h-4" />
            </button>
            
            <button 
              onClick={async () => { 
                const name = prompt("Nome do novo canal:");
                if (name) {
                  await createChannel(name, 'public', currentUser.uid);
                }
                setContextMenu(null); 
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-color-brand hover:text-white transition-colors group"
            >
              <span>Criar canal</span>
              <PlusSquare className="w-4 h-4" />
            </button>

            <div className="h-px bg-border-primary my-1 mx-2" />

            {contextMenu.message.senderId === currentUser.uid && (
              <>
                <button
                  onClick={() => {
                    handleEditClick(contextMenu.message);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-[#5865f2] hover:text-white transition-colors group"
                >
                  <span>Editar Mensagem</span>
                  <Pencil className="w-4 h-4" />
                </button>
                <div className="h-px bg-border-primary my-1 mx-2" />
              </>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.message.content);
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-[#5865f2] hover:text-white transition-colors group"
            >
              <span>Copiar Texto</span>
              <Copy className="w-4 h-4" />
            </button>
            {contextMenu.message.senderId === currentUser.uid && (
              <>
                <div className="h-px bg-border-primary my-1 mx-2" />
                <button
                  onClick={() => {
                    setDeletingMessageId(contextMenu.message.id);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-[#f23f42] hover:bg-[#f23f42] hover:text-white transition-colors group"
                >
                  <span>Excluir Mensagem</span>
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* User Context Menu */}
      <AnimatePresence>
        {userContextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ 
              top: Math.min(userContextMenu.y, window.innerHeight - 200), 
              left: Math.min(userContextMenu.x, window.innerWidth - 200) 
            }}
            className="fixed z-50 w-48 bg-bg-overlay border border-border-primary rounded-md shadow-2xl py-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-border-primary mb-1">
              <span className="font-bold text-text-primary text-sm">{userContextMenu.user.displayName}</span>
            </div>
            {userContextMenu.user.uid !== currentUser.uid && (
              <button 
                onClick={() => {
                  handleCreateDM(userContextMenu.user.uid);
                  setUserContextMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-[#5865f2] hover:text-white transition-colors group"
              >
                <span>Mensagem Direta</span>
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
            {userContextMenu.user.uid !== currentUser.uid && currentUser.role === 'admin' && (
              <button 
                onClick={async () => {
                  const newStatus = userContextMenu.user.canChat === false;
                  await toggleChatAccess(userContextMenu.user.uid, newStatus);
                  setUserContextMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-[#5865f2] hover:text-white transition-colors group"
              >
                <span>{userContextMenu.user.canChat === false ? 'Liberar Chat' : 'Bloquear Chat'}</span>
                {userContextMenu.user.canChat === false ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
              </button>
            )}
            <button 
              onClick={() => { 
                onOpenStatusForUser(userContextMenu.user.uid);
                setUserContextMenu(null); 
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-[#5865f2] hover:text-white transition-colors group"
            >
              <span>Ver Status</span>
              <Eye className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { 
                alert(`Perfil de ${userContextMenu.user.displayName}\nStatus: ${userContextMenu.user.status}`); 
                setUserContextMenu(null); 
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-[#5865f2] hover:text-white transition-colors group"
            >
              <span>Perfil</span>
              <Users className="w-4 h-4" />
            </button>
            {userContextMenu.user.uid !== currentUser.uid && (
              <button 
                onClick={() => { 
                  alert(`Usuário ${userContextMenu.user.displayName} silenciado localmente.`); 
                  setUserContextMenu(null); 
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-[#5865f2] hover:text-white transition-colors group"
              >
                <span>Silenciar</span>
                <VolumeX className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


