import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hash, Send, PlusCircle, Gift, Sticker, Smile, Trash2, CheckCheck, Pencil, X, Copy, MessageSquare, Edit3, VolumeX, Users, PlusSquare } from 'lucide-react';
import { Call, Channel, Message, UserProfile } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { DEFAULT_AVATAR } from '@/src/constants';
import { ChannelHeader } from './ChannelHeader';
import { UserList } from './UserList';
import { ChannelSettings } from './ChannelSettings';
import { CallView } from './CallView';
import { IncomingCallModal } from './IncomingCallModal';
import { updateChannel, deleteChannel, deleteMessage, markMessageAsRead, getUsers, editMessage, createPrivateChannel, createChannel, startCall, updateCallStatus, listenForIncomingCalls } from '@/src/services/firebaseService';

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
  onEndCall
}) => {
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUsers, setShowUsers] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: Message } | null>(null);
  const [userContextMenu, setUserContextMenu] = useState<{ x: number, y: number, user: UserProfile } | null>(null);
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
    if (editingMessageId && activeChannel) {
      if (editContent.trim()) {
        await editMessage(activeChannel.id, editingMessageId, editContent);
      }
      setEditingMessageId(null);
      setEditContent('');
      return;
    }

    if (input.trim() || fileInputRef.current?.files?.[0]) {
      onSendMessage(input, fileInputRef.current?.files?.[0]);
      setInput('');
      onStopTyping();
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
    const touch = e.touches[0];
    touchTimeoutRef.current = setTimeout(() => {
      setContextMenu({ x: touch.clientX, y: touch.clientY, message: msg });
    }, 500);
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
      <div className="flex-1 bg-[#313338] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="bg-[#5865f2] p-6 rounded-full shadow-2xl">
          <Hash className="w-16 h-16 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Bem-vindo ao Nexus Chat!</h2>
        <p className="text-[#b5bac1] max-w-md">
          Selecione um canal na barra lateral para começar a conversar ou crie um novo para reunir seus amigos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#313338] flex flex-col h-full overflow-hidden relative">
      {/* Header */}
      <ChannelHeader 
        channel={activeChannel}
        otherUser={otherUser}
        onShowUsers={() => setShowUsers(!showUsers)}
        onShowSettings={() => setShowSettings(true)}
        showUsers={showUsers}
        onToggleSidebar={onToggleSidebar}
        onStartCall={onStartCall}
      />

      <div className="flex flex-1 overflow-hidden flex-col">
        {activeCall && activeCall.channel.id === activeChannel.id && (
          <div className="h-[40vh] min-h-[300px] w-full shrink-0">
            <CallView 
              channel={activeCall.channel} 
              currentUser={currentUser} 
              allUsers={allUsers}
              type={activeCall.type}
              onClose={onEndCall} 
            />
          </div>
        )}
        <div className="flex flex-1 overflow-hidden">
          {/* Messages List Area */}
          <div className="flex-1 flex flex-col h-full min-w-0">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#1e1f22] scrollbar-track-transparent"
          >
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="text-xs text-[#949ba4] italic px-4">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'está' : 'estão'} digitando...
              </div>
            )}
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#b5bac1] space-y-4">
                 {activeChannel.type === 'private' && otherUser ? (
                   <>
                     <img 
                       src={otherUser.photoURL || DEFAULT_AVATAR} 
                       alt={otherUser.displayName}
                       className="w-24 h-24 rounded-full object-cover mb-2"
                       referrerPolicy="no-referrer"
                     />
                     <p className="text-lg font-bold text-white">Privado ({currentUser.displayName} com {otherUser.displayName})</p>
                     <p className="text-sm">Este é o começo do seu histórico de mensagens diretas com @{otherUser.displayName}.</p>
                   </>
                 ) : (
                   <>
                     <div className="bg-[#4e5058] p-4 rounded-full">
                        <Hash className="w-12 h-12 text-[#dbdee1]" />
                     </div>
                     <p className="text-lg font-bold text-white">Este é o começo do canal #{activeChannel.name}</p>
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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
                    }}
                    onTouchStart={(e) => handleTouchStart(e, msg)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    className={cn(
                      "flex items-start space-x-4 group hover:bg-[#2e3035]/50 -mx-4 px-4 py-1 transition-colors relative",
                      !isSameUserAsPrev && "mt-4",
                      contextMenu?.message.id === msg.id && "bg-[#2e3035]"
                    )}
                  >
                    {!isSameUserAsPrev ? (
                      <img 
                        src={msg.senderPhoto || DEFAULT_AVATAR} 
                        alt={msg.senderName}
                        className="w-10 h-10 rounded-full object-cover mt-1 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 flex-shrink-0 flex justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-[10px] text-[#949ba4] mt-1.5">{time}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {!isSameUserAsPrev && (
                        <div className="flex items-center space-x-2 mb-0.5">
                          <span className="font-bold text-white hover:underline cursor-pointer">{msg.senderName}</span>
                          <span className="text-[10px] text-[#949ba4]">{time}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between group/msg">
                        <p className="text-[#dbdee1] break-words leading-relaxed flex-1">
                          {msg.content}
                          {msg.isEdited && <span className="text-[10px] text-[#949ba4] ml-1">(editado)</span>}
                        </p>
                        
                        {/* Actions on hover */}
                        <div className="hidden group-hover:flex items-center space-x-2 bg-[#313338] border border-[#1e1f22] rounded-md px-2 py-1 shadow-lg absolute right-4 top-0 -translate-y-1/2 z-10">
                          {isMyMessage && (
                            <>
                              <button 
                                onClick={() => handleEditClick(msg)}
                                className="text-[#949ba4] hover:text-[#dbdee1] transition-colors p-1"
                                title="Editar mensagem"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setDeletingMessageId(msg.id)}
                                className="text-[#949ba4] hover:text-[#f23f42] transition-colors p-1"
                                title="Excluir mensagem"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <div className="relative group/read">
                            <CheckCheck className={cn(
                              "w-4 h-4",
                              msg.readBy && msg.readBy.length > 0 ? "text-[#5865f2]" : "text-[#949ba4]"
                            )} />
                            {msg.readBy && msg.readBy.length > 0 && (
                              <div className="absolute bottom-full right-0 mb-2 hidden group-hover/read:block bg-[#111214] text-white text-[10px] p-2 rounded shadow-xl whitespace-nowrap z-20">
                                <p className="font-bold mb-1">Lido por:</p>
                                {readByUsers.map(u => (
                                  <div key={u.uid} className="flex items-center space-x-1 mb-0.5">
                                    <div className="w-1 h-1 bg-[#23a559] rounded-full" />
                                    <span>{u.displayName}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
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
                          <CheckCheck className="w-3 h-3 text-[#5865f2]" />
                          <span className="text-[10px] text-[#949ba4]">
                            Lido por {msg.readBy.length} {msg.readBy.length === 1 ? 'pessoa' : 'pessoas'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Deletion Confirmation Overlay */}
                    {deletingMessageId === msg.id && (
                      <div className="absolute inset-0 bg-[#313338]/90 flex items-center justify-center z-20 rounded-lg border border-[#f23f42]/30">
                        <div className="flex items-center space-x-4 px-4">
                          <span className="text-sm font-medium text-white">Excluir esta mensagem?</span>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => setDeletingMessageId(null)}
                              className="text-xs text-white hover:underline px-2 py-1"
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
              <div className="flex items-center justify-between bg-[#2b2d31] px-4 py-2 rounded-t-lg border-b border-[#1e1f22]">
                <span className="text-xs text-[#dbdee1]">Editando mensagem...</span>
                <button onClick={handleCancelEdit} className="text-[#949ba4] hover:text-[#dbdee1]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <form 
              onSubmit={handleSubmit}
              className={cn(
                "bg-[#383a40] px-4 py-2.5 flex items-center space-x-4 shadow-sm",
                editingMessageId ? "rounded-b-lg" : "rounded-lg"
              )}
            >
              {!editingMessageId && (
                <button type="button" onClick={handleFileClick} className="text-[#b5bac1] hover:text-white transition-colors">
                  <PlusCircle className="w-6 h-6" />
                </button>
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
                value={editingMessageId ? editContent : input}
                onChange={editingMessageId ? (e) => setEditContent(e.target.value) : handleInputChange}
                placeholder={editingMessageId ? "Editar mensagem..." : `Conversar em #${activeChannel.name}`}
                className="flex-1 bg-transparent border-none outline-none text-[#dbdee1] placeholder-[#949ba4] text-sm"
                autoComplete="off"
              />
              <div className="flex items-center space-x-3 text-[#b5bac1]">
                {!editingMessageId && (
                  <>
                    <button type="button" className="hover:text-white transition-colors"><Gift className="w-5 h-5" /></button>
                    <button type="button" className="hover:text-white transition-colors"><Sticker className="w-5 h-5" /></button>
                    <button type="button" className="hover:text-white transition-colors"><Smile className="w-5 h-5" /></button>
                  </>
                )}
                <button 
                  type="submit" 
                  disabled={editingMessageId ? !editContent.trim() : !input.trim()}
                  className={cn(
                    "p-1.5 rounded-full transition-all",
                    (editingMessageId ? editContent.trim() : input.trim()) ? "bg-[#5865f2] text-white" : "text-[#b5bac1]"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
            <p className="text-[10px] text-[#949ba4] mt-1 ml-4">
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

      {/* Channel Settings Modal */}
      <ChannelSettings 
        channel={activeChannel}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onDelete={handleDeleteChannel}
        onUpdate={handleUpdateChannel}
        isOwner={activeChannel.createdBy === currentUser.uid}
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
            className="fixed z-50 w-64 bg-[#111214] border border-[#1e1f22] rounded-md shadow-2xl py-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.message.senderId !== currentUser.uid && (
              <button 
                onClick={() => handleCreateDM(contextMenu.message.senderId)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white transition-colors group"
              >
                <span>Converter em Mensagem direta</span>
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
            
            <button 
              onClick={() => { 
                setShowSettings(true); 
                setContextMenu(null); 
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white transition-colors group"
            >
              <span>Renomear</span>
              <Edit3 className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => { 
                alert(`Notificações de ${activeChannel?.name} silenciadas localmente.`); 
                setContextMenu(null); 
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white transition-colors group"
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
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white transition-colors group"
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
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white transition-colors group"
            >
              <span>Criar canal</span>
              <PlusSquare className="w-4 h-4" />
            </button>

            <div className="h-px bg-[#1e1f22] my-1 mx-2" />

            {contextMenu.message.senderId === currentUser.uid && (
              <>
                <button
                  onClick={() => {
                    handleEditClick(contextMenu.message);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white transition-colors group"
                >
                  <span>Editar Mensagem</span>
                  <Pencil className="w-4 h-4" />
                </button>
                <div className="h-px bg-[#1e1f22] my-1 mx-2" />
              </>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.message.content);
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white transition-colors group"
            >
              <span>Copiar Texto</span>
              <Copy className="w-4 h-4" />
            </button>
            {contextMenu.message.senderId === currentUser.uid && (
              <>
                <div className="h-px bg-[#1e1f22] my-1 mx-2" />
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
            className="fixed z-50 w-48 bg-[#111214] border border-[#1e1f22] rounded-md shadow-2xl py-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-[#1e1f22] mb-1">
              <span className="font-bold text-white text-sm">{userContextMenu.user.displayName}</span>
            </div>
            {userContextMenu.user.uid !== currentUser.uid && (
              <button 
                onClick={() => {
                  handleCreateDM(userContextMenu.user.uid);
                  setUserContextMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white transition-colors group"
              >
                <span>Mensagem Direta</span>
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={() => { 
                alert(`Perfil de ${userContextMenu.user.displayName}\nStatus: ${userContextMenu.user.status}`); 
                setUserContextMenu(null); 
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white transition-colors group"
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
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865f2] hover:text-white transition-colors group"
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


