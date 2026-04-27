import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hash, Send, PlusCircle, Gift, Sticker, Smile, SmilePlus, Trash2, CheckCheck, Pencil, X, Copy, MessageSquare, Edit3, VolumeX, Users, PlusSquare, Shield, ShieldOff, Search, Languages, CheckSquare, Square, Download, Loader2, Pin, PinOff, Eye, Sparkles, Paperclip, ChevronUp, ChevronDown, Mic, StopCircle } from 'lucide-react';
import { Call, Channel, Message, UserProfile } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { DEFAULT_AVATAR } from '@/src/constants';
import { AudioPlayer } from './AudioPlayer';
import { ChannelHeader } from './ChannelHeader';
import { UserList } from './UserList';
import { ChannelSettings } from './ChannelSettings';
import { CallView } from './CallView';
import { IncomingCallModal } from './IncomingCallModal';
import { UserStatusView } from '../Status/UserStatusView';
import { updateChannel, deleteChannel, deleteMessage, markMessageAsRead, getUsers, editMessage, createPrivateChannel, createChannel, startCall, updateCallStatus, listenForIncomingCalls, toggleChatAccess, togglePinMessage, removeChannelMember, toggleReaction, updateStatusPresence, removeStatusPresence, listenForStatusPresence, saveDraft, getDraft, deleteDraft } from '@/src/services/firebaseService';
import { translateText, chatWithGemini } from '@/src/services/geminiService';
import { useI18n } from '@/src/lib/i18n';
import { Status } from '@/src/types';
import { STATUSES_COLLECTION } from '@/src/constants';
import { db } from '@/src/firebase';
import { onSnapshot, collection, query } from 'firebase/firestore';
import EmojiPicker, { Theme } from 'emoji-picker-react';

import { UserProfileModal } from './UserProfileModal';
import { AddMembersModal } from './AddMembersModal';
import { ConfirmationModal } from '../ConfirmationModal';
import { useAccessibility } from '@/src/contexts/AccessibilityContext';
import { useToast } from '@/src/context/ToastContext';
import { playMorseCode } from '@/src/lib/morse';
import { speakText } from '@/src/lib/tts';

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
  onMuteChannels: (channelIds: string[], mute: boolean) => void;
  channels: Channel[];
}

// Helper to safely handle Firestore timestamps
const getTimestampDate = (ts: any) => {
  if (!ts) return null;
  if (typeof ts === 'number') return new Date(ts);
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  if (ts.seconds !== undefined) return new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000);
  return null;
};

const getTimestampMillis = (ts: any) => {
  const date = getTimestampDate(ts);
  return date ? date.getTime() : 0;
};

const LinkPreview: React.FC<{ url: string }> = ({ url }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success') {
          setData(res.data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  }, [url]);

  if (error || !data) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2 max-w-sm border border-border-primary rounded-lg overflow-hidden hover:bg-bg-secondary transition-colors">
      {data.image?.url && <img src={data.image.url || undefined} alt={data.title} className="w-full h-32 object-cover will-change-transform" referrerPolicy="no-referrer" />}
      <div className="p-3">
        <h4 className="text-sm font-bold text-text-primary line-clamp-1">{data.title}</h4>
        <p className="text-xs text-text-muted line-clamp-2 mt-1">{data.description}</p>
        <span className="text-[10px] text-text-muted mt-2 block">{new URL(url).hostname}</span>
      </div>
    </a>
  );
};

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
  onOpenStatusForUser,
  onMuteChannels,
  channels
}) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUsers, setShowUsers] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [selectedStatusUserId, setSelectedStatusUserId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const { settings } = useAccessibility();
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    if ((settings.morseCode || settings.textToSpeech) && messages.length > prevMessagesLengthRef.current) {
      const newMessages = messages.slice(prevMessagesLengthRef.current);
      newMessages.forEach(msg => {
        if (msg.senderId !== currentUser.uid && msg.content) {
          if (settings.morseCode) playMorseCode(msg.content);
          if (settings.textToSpeech) speakText(`${msg.senderName} disse: ${msg.content}`, settings.ttsVoiceName);
        }
      });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, settings.morseCode, settings.textToSpeech, currentUser.uid]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: Message } | null>(null);
  const [userContextMenu, setUserContextMenu] = useState<{ x: number, y: number, user: UserProfile } | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [lightboxFile, setLightboxFile] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [fullReactionPickerMessageId, setFullReactionPickerMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [hiddenStatusUsers, setHiddenStatusUsers] = useState<Set<string>>(new Set());
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const list = scrollRef.current;
    if (!list) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = list;
      setShowScrollToTop(scrollTop > 100);
      setShowScrollToBottom(scrollTop < scrollHeight - clientHeight - 50);
    };

    list.addEventListener('scroll', handleScroll);
    return () => list.removeEventListener('scroll', handleScroll);
  }, [messages]);

  // Typing timeout
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await getUsers();
        
        // Filter users based on privacy settings
        const conversationUserIds = new Set(
          channels
            .filter(c => c.type === 'private')
            .flatMap(c => c.members || [])
        );

        const filteredUsers = users.filter(u => 
          u.uid === currentUser.uid || 
          !u.isPrivate || 
          conversationUserIds.has(u.uid)
        );

        setAllUsers(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, [channels, currentUser.uid]);

  useEffect(() => {
    const q = query(collection(db, STATUSES_COLLECTION));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedStatuses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Status));
      setStatuses(fetchedStatuses);
    }, (error) => {
      console.error("Error listening to statuses:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeChannel && currentUser) {
      setDraftLoaded(false);
      getDraft(currentUser.uid, activeChannel.id).then(draft => {
        if (draft) {
          setInput(draft.content);
        } else {
          setInput('');
        }
        setDraftLoaded(true);
      });
    }
  }, [activeChannel, currentUser]);

  useEffect(() => {
    if (activeChannel && currentUser && draftLoaded) {
      const handler = setTimeout(() => {
        if (input.trim()) {
          saveDraft(currentUser.uid, activeChannel.id, input);
        } else {
          deleteDraft(currentUser.uid, activeChannel.id);
        }
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [input, activeChannel, currentUser, draftLoaded]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Check for supported mime type
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          console.log("Audio recording stopped, chunks:", audioChunksRef.current.length);
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
          console.log("Audio blob size:", audioBlob.size, "mime:", mediaRecorder.mimeType);
          if (audioBlob.size === 0) {
            // Give it a moment, sometimes it needs time to flush the last chunk
            await new Promise(resolve => setTimeout(resolve, 500));
            // Try finalizing again if still empty
            if (audioChunksRef.current.length === 0) throw new Error("Recorded audio is empty");
          }
          let mimeType = mediaRecorder.mimeType;
          if (!mimeType || mimeType === '' || !mimeType.startsWith('audio/')) {
            mimeType = 'audio/webm';
          }
          const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const file = new File([finalBlob], `audio.${mimeType.split(';')[0].split('/')[1] || 'webm'}`, { type: mimeType });
          
          setPendingAudioFile(file);
        } catch (error) {
          console.error("Error finalizing audio:", error);
          showToast(`Erro ao gravar áudio: ${error instanceof Error ? error.message : String(error)}`, "error");
        } finally {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      // @ts-ignore
      showToast("Não foi possível acessar seu microfone.", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Force finalize the data
      mediaRecorderRef.current.requestData();
      // Small delay to ensure data is processed before stopping
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
      }, 300);
    }
  };

  const sendPendingAudio = async () => {
    if (pendingAudioFile) {
      await onSendMessage('', pendingAudioFile);
      setPendingAudioFile(null);
    }
  };

  const cancelPendingAudio = () => {
    setPendingAudioFile(null);
  };

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
      showToast("Você não tem permissão para enviar mensagens.", "error");
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
      const file = fileInputRef.current?.files?.[0];
      const trimmedInput = input.trim();

      // Handle Slash Commands
      if (trimmedInput.startsWith('/')) {
        const [command, ...args] = trimmedInput.split(' ');
        const cmd = command.toLowerCase();

        switch (cmd) {
          case '/help':
            setShowHelpModal(true);
            setInput('');
            return;
          case '/mute':
            if (activeChannel) {
              onMuteChannels([activeChannel.id], true);
              setInput('');
              return;
            }
            break;
          case '/unmute':
            if (activeChannel) {
              onMuteChannels([activeChannel.id], false);
              setInput('');
              return;
            }
            break;
          case '/pin':
            if (activeChannel && messages.length > 0) {
              const lastMsg = messages[messages.length - 1];
              togglePinMessage(activeChannel.id, lastMsg.id, true, currentUser.uid);
              setInput('');
              return;
            }
            break;
          case '/status':
            onOpenStatusForUser(currentUser.uid);
            setInput('');
            return;
          case '/shrug':
            onSendMessage('¯\\_(ツ)_/¯');
            setInput('');
            return;
          case '/tableflip':
            onSendMessage('(╯°□°）╯︵ ┻━┻');
            setInput('');
            return;
          case '/unflip':
            onSendMessage('┬─┬ノ( º _ ºノ)');
            setInput('');
            return;
          case '/me':
            const action = args.join(' ');
            if (action) {
              onSendMessage(`* ${currentUser.displayName} ${action} *`);
              setInput('');
            }
            return;
          case '/invite':
            setShowAddMembers(true);
            setInput('');
            return;
          case '/settings':
            setShowSettings(true);
            setInput('');
            return;
          case '/search':
            const queryStr = args.join(' ');
            if (queryStr) {
              setSearchQuery(queryStr);
              setIsSearching(true);
            }
            setInput('');
            return;
          case '/leave':
            if (activeChannel && activeChannel.type !== 'private') {
              setShowLeaveConfirm(true);
            } else {
              showToast("Você não pode sair de uma conversa privada.", "warning");
            }
            return;
          case '/clear':
            setInput('');
            return;
          case '/gem':
            const prompt = args.join(' ');
            if (!prompt) {
              showToast("Por favor, forneça um prompt para o Gemini. Ex: /gem como está o tempo?", "info");
              return;
            }
            onSendMessage(input, file).finally(() => setIsUploading(false));
            setInput('');
            onStopTyping();
            chatWithGemini(prompt).then(response => {
              onSendMessage(`Gemini: ${response}`);
            });
            return;
        }
      }

      if (file) setIsUploading(true);
      onSendMessage(input, file).finally(() => setIsUploading(false));
      setInput('');
      onStopTyping();
      if (activeChannel) {
        deleteDraft(currentUser.uid, activeChannel.id);
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

  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);

  const handleUserClick = (userId: string) => {
    const user = allUsers.find(u => u.uid === userId);
    if (user) {
      setSelectedUserProfile(user);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    if (isMultiSelectMode) return;
    const touch = e.touches?.[0];
    if (!touch) return;
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
      'fr': 'Francês',
      'de': 'Alemão',
      'it': 'Italiano',
      'ru': 'Russo',
      'zh': 'Chinês',
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
    
    try {
      for (const id of selectedMessageIds) {
        await deleteMessage(activeChannel.id, id);
      }
      setSelectedMessageIds([]);
      setIsMultiSelectMode(false);
    } catch (error) {
      console.error("Error deleting selected messages:", error);
    }
  };

  const handleBulkPin = async () => {
    if (!activeChannel || selectedMessageIds.length === 0) return;
    try {
      const promises = selectedMessageIds.map(id => {
        const msg = messages.find(m => m.id === id);
        if (msg) return togglePinMessage(activeChannel.id, id, true, currentUser.uid);
        return Promise.resolve();
      });
      await Promise.all(promises);
      setSelectedMessageIds([]);
      setIsMultiSelectMode(false);
    } catch (error) {
      console.error("Error bulk pinning:", error);
    }
  };

  const handleBulkCopy = () => {
    if (selectedMessageIds.length === 0) return;
    const selectedMsgs = messages
      .filter(m => selectedMessageIds.includes(m.id))
      .sort((a, b) => getTimestampMillis(a.timestamp) - getTimestampMillis(b.timestamp));
    
    const transcript = selectedMsgs.map(m => {
      const sender = allUsers.find(u => u.uid === m.senderId)?.displayName || 'Usuário';
      const date = getTimestampDate(m.timestamp);
      return `[${date?.toLocaleString() || ''}] ${sender}: ${m.content}`;
    }).join('\n');

    navigator.clipboard.writeText(transcript);
    setSelectedMessageIds([]);
    setIsMultiSelectMode(false);
  };

  const handleBulkExport = () => {
    if (selectedMessageIds.length === 0) return;
    const selectedMsgs = messages
      .filter(m => selectedMessageIds.includes(m.id))
      .sort((a, b) => getTimestampMillis(a.timestamp) - getTimestampMillis(b.timestamp));
    
    const transcript = selectedMsgs.map(m => {
      const sender = allUsers.find(u => u.uid === m.senderId)?.displayName || 'Usuário';
      const date = getTimestampDate(m.timestamp);
      return `[${date?.toLocaleString() || ''}] ${sender}: ${m.content}`;
    }).join('\n');

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noton-nexus-export-${activeChannel?.name || 'chat'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSelectedMessageIds([]);
    setIsMultiSelectMode(false);
  };

  const handleBulkTranslate = async () => {
    if (selectedMessageIds.length === 0) return;
    const targetLang = currentUser.language || 'pt';
    const langNames: Record<string, string> = {
      'pt': 'Português',
      'en': 'Inglês',
      'es': 'Espanhol',
      'fr': 'Francês',
      'de': 'Alemão',
      'it': 'Italiano',
      'ru': 'Russo',
      'zh': 'Chinês',
      'ja': 'Japonês'
    };

    try {
      const promises = selectedMessageIds.map(async (id) => {
        const msg = messages.find(m => m.id === id);
        if (msg && !translatedMessages[id]) {
          const translation = await translateText(msg.content, langNames[targetLang] || 'Português');
          return { id, translation };
        }
        return null;
      });

      const results = await Promise.all(promises);
      const newTranslations = { ...translatedMessages };
      results.forEach(res => {
        if (res) newTranslations[res.id] = res.translation;
      });
      setTranslatedMessages(newTranslations);
      setSelectedMessageIds([]);
      setIsMultiSelectMode(false);
    } catch (error) {
      console.error("Error bulk translating:", error);
    }
  };

  const handleBulkForward = () => {
    if (selectedMessageIds.length === 0) return;
    const selectedMsgs = messages
      .filter(m => selectedMessageIds.includes(m.id))
      .sort((a, b) => getTimestampMillis(a.timestamp) - getTimestampMillis(b.timestamp));
    
    const content = selectedMsgs.map(m => m.content).join('\n');
    setInput(prev => (prev ? prev + '\n' : '') + content);
    setSelectedMessageIds([]);
    setIsMultiSelectMode(false);
    
    // Focus input
    const inputEl = document.getElementById('chat-input');
    if (inputEl) inputEl.focus();
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

  const channelBgStyles = React.useMemo(() => {
    if (!activeChannel?.background) return {};
    
    const bg = activeChannel.background;
    const styles: any = {};
    
    if (bg.type === 'color') {
      styles['backgroundColor'] = bg.value;
    } else if (bg.type === 'gradient') {
      styles['background'] = bg.value;
    } else if (bg.type === 'pattern') {
      const patterns: Record<string, string> = {
        'dots': 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        'lines': 'linear-gradient(45deg, currentColor 1px, transparent 1px)',
        'grid': 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)'
      };
      styles['backgroundImage'] = patterns[bg.patternId || 'dots'];
      styles['backgroundSize'] = '20px 20px';
      styles['color'] = bg.patternColor || '#ffffff11';
      styles['backgroundColor'] = 'transparent';
    }

    const filters = [];
    if (bg.brightness !== undefined) {
      filters.push(`brightness(${bg.brightness}%)`);
    }
    if (bg.contrast !== undefined) {
      filters.push(`contrast(${bg.contrast}%)`);
    }
    if (filters.length > 0) {
      styles['filter'] = filters.join(' ');
    }
    
    if (bg.opacity !== undefined) {
      styles['opacity'] = bg.opacity / 100;
    } else {
      styles['opacity'] = 0.3;
    }

    return styles;
  }, [activeChannel?.background]);

  const otherUser = getOtherUser();

  if (!activeChannel) {
    return (
      <div className="flex-1 bg-transparent flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="bg-color-brand p-6 rounded-full shadow-2xl">
          <Hash className="w-16 h-16 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary">Bem-vindo ao Noton Nexus!</h2>
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
    <div 
      className={cn("flex-1 flex flex-col h-full overflow-hidden relative", activeChannel?.background ? "bg-transparent" : "bg-bg-primary")}
      onClick={() => {
        setContextMenu(null);
        setUserContextMenu(null);
        setShowEmojiPicker(false);
        setShowGifPicker(false);
        setShowGiftPicker(false);
        setReactionPickerMessageId(null);
      }}
    >
      {/* Channel Background Layer */}
      {activeChannel?.background && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={channelBgStyles}
        >
          {['video', 'gif', 'image'].includes(activeChannel.background.type) && activeChannel.background.value?.trim() && (
            activeChannel.background.type === 'video' ? (
              <video 
                key={activeChannel.background.value}
                autoPlay 
                muted 
                loop 
                playsInline 
                className="w-full h-full"
                style={{ objectFit: activeChannel.background.objectFit || 'cover' }}
              >
                <source src={activeChannel.background.value || undefined} />
              </video>
            ) : (
              <img 
                src={activeChannel.background.value || undefined} 
                alt="channel background" 
                className="w-full h-full"
                style={{ objectFit: activeChannel.background.objectFit || 'cover' }}
                referrerPolicy="no-referrer"
              />
            )
          )}
        </div>
      )}

      {/* Header */}
      <div className="relative z-10">
        <ChannelHeader 
          channel={activeChannel}
          otherUser={otherUser}
          onShowUsers={() => setShowUsers(!showUsers)}
          onShowSettings={() => setShowSettings(true)}
          onAddMembers={() => setShowAddMembers(true)}
          showUsers={showUsers}
          onToggleSidebar={onToggleSidebar}
          onStartCall={onStartCall}
          onSearch={(query) => {
            setSearchQuery(query);
            setIsSearching(!!query);
          }}
          onShowPinned={() => setShowPinned(!showPinned)}
          onToggleMultiSelect={() => {
            setIsMultiSelectMode(!isMultiSelectMode);
            setSelectedMessageIds([]);
          }}
          isMultiSelectMode={isMultiSelectMode}
        />
      </div>

      <div className="flex flex-1 overflow-hidden flex-col relative z-10">
        {/* Status Row */}
        {statuses.length > 0 && Array.from(new Set(statuses.map(s => s.userId))).filter(userId => !hiddenStatusUsers.has(userId)).length > 0 && (
          <div className="flex items-center space-x-4 p-4 bg-bg-secondary border-b border-border-primary overflow-x-auto shrink-0">
            {Array.from(new Set(statuses.map(s => s.userId)))
              .filter(userId => !hiddenStatusUsers.has(userId))
              .map(userId => {
                const userStatuses = statuses.filter(s => s.userId === userId);
                if (userStatuses.length === 0) return null;
                const latestStatus = userStatuses[userStatuses.length - 1];
                const user = allUsers.find(u => u.uid === userId) || currentUser;
                
                return (
                  <button
                    key={userId}
                    onClick={() => setSelectedStatusUserId(userId)}
                    className="flex flex-col items-center space-y-1 shrink-0 group"
                  >
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-2 border-color-brand p-0.5 overflow-hidden group-hover:scale-105 transition-transform">
                        <img 
                          src={user?.photoURL || latestStatus.userPhoto || DEFAULT_AVATAR} 
                          className="w-full h-full rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                    <span className="text-xs text-text-secondary font-medium truncate w-16 text-center">
                      {userId === currentUser.uid ? 'Seu Status' : (user?.displayName || latestStatus.userName || 'User').split(' ')[0]}
                    </span>
                  </button>
                );
            })}
          </div>
        )}

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
                            {getTimestampDate(msg.timestamp)?.toLocaleString() || ''}
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
                        <p className="text-[10px] text-text-muted mt-2">{getTimestampDate(msg.timestamp)?.toLocaleString() || ''}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages List Area */}
          <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          <div className="absolute bottom-24 right-6 flex flex-col space-y-2 z-20">
            <button 
              onClick={() => scrollRef.current?.scrollTo({top: 0, behavior: 'smooth'})}
              className={cn("p-2 bg-bg-secondary border border-border-primary rounded-full hover:bg-bg-tertiary shadow-lg text-text-primary transition-opacity duration-200", showScrollToTop ? "opacity-100" : "opacity-0 pointer-events-none")}
              title="Ir para o topo"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button 
              onClick={() => scrollRef.current?.scrollTo({top: scrollRef.current.scrollHeight, behavior: 'smooth'})}
              className={cn("p-2 bg-bg-secondary border border-border-primary rounded-full hover:bg-bg-tertiary shadow-lg text-text-primary transition-opacity duration-200", showScrollToBottom ? "opacity-100" : "opacity-0 pointer-events-none")}
              title="Ir para o fim"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
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
                    : `${typingUsers.join(' e ')} ${typingUsers.length === 1 ? 'está' : 'estão'} digitando...`}
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
                          <p className="text-text-secondary break-words leading-relaxed whitespace-pre-wrap flex items-end gap-2">
                            {msg.isPinned && <Pin className="w-3 h-3 text-color-brand inline-block mr-1 -mt-1" />}
                            {msg.content}
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
                    </div>

                    {msg.fileUrl && (
                        msg.fileType?.startsWith('image/') ? (
                          <img 
                            src={msg.fileUrl} 
                            alt="attachment" 
                            className="max-w-xs rounded-lg mt-2 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxFile({ url: msg.fileUrl!, type: 'image' })}
                            referrerPolicy="no-referrer" 
                          />
                        ) : (msg.fileType?.includes('audio') || msg.fileUrl.includes('audio.')) ? (
                          <AudioPlayer url={msg.fileUrl!} />
                        ) : msg.fileType?.startsWith('video/') ? (
                          <video 
                            controls 
                            src={msg.fileUrl} 
                            className="max-w-xs rounded-lg mt-2 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxFile({ url: msg.fileUrl!, type: 'video' })}
                          />
                        ) : (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[#5865f2] hover:underline mt-2 block">
                            Download File
                          </a>
                        )
                      )}

                      {msg.statusReply && (
                        <div 
                          className="mt-2 p-3 bg-bg-tertiary rounded-lg border-l-4 border-color-brand flex items-start space-x-3 cursor-pointer hover:bg-bg-secondary transition-colors"
                          onClick={() => onOpenStatusForUser(msg.statusReply?.userId || msg.senderId)}
                        >
                          {msg.statusReply.mediaType === 'image' || msg.statusReply.mediaType === 'video' ? (
                            <img src={msg.statusReply.mediaUrl || undefined} className="w-12 h-12 rounded object-cover will-change-transform" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-bg-primary flex items-center justify-center">
                              <Eye className="w-5 h-5 text-text-muted" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-text-secondary">Respondeu ao status</p>
                            {msg.statusReply.caption && (
                              <p className="text-sm text-text-primary line-clamp-1 mt-0.5">{msg.statusReply.caption}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {currentUser.linkPreviewsEnabled !== false && (
                        <>
                          {msg.content.match(/(https?:\/\/[^\s]+)/g)?.map((url, i) => (
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
          <div className="p-4 pt-0 shrink-0 min-w-0 w-full">
            {pendingAudioFile && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-bg-secondary rounded-lg border border-border-primary/50">
                 <AudioPlayer url={URL.createObjectURL(pendingAudioFile)} />
                 <button onClick={sendPendingAudio} className="p-2 text-green-500 hover:text-green-600 transition-colors"><Send className="w-5 h-5"/></button>
                 <button onClick={cancelPendingAudio} className="p-2 text-red-500 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5"/></button>
              </div>
            )}
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
                "bg-bg-tertiary px-3 py-2 md:px-4 md:py-2.5 flex items-center space-x-2 md:space-x-4 shadow-sm rounded-2xl md:rounded-xl border border-border-primary/50 focus-within:border-color-brand/50 transition-all overflow-hidden",
                editingMessageId ? "rounded-t-none" : ""
              )}
            >
              {!editingMessageId && (
                <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                  <button 
                    type="button" 
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={() => isRecording && stopRecording()}
                    onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                    onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                    className={cn(
                      "p-1.5 rounded-full transition-colors shadow-sm",
                      isRecording ? "bg-red-500 text-white animate-pulse" : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setInput(prev => prev + '/gem')}
                    className="bg-blue-600 p-1.5 rounded-full text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  </button>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    let file = e.target.files[0];
                    setIsUploading(true);
                    
                    try {
                      // Convert image to PNG if it's an image
                      if (file.type.startsWith('image/') && file.type !== 'image/png') {
                        file = await new Promise<File>((resolve) => {
                          const img = new Image();
                          img.onload = () => {
                            const MAX_WIDTH = 1280;
                            const MAX_HEIGHT = 1280;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                              if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                              }
                            } else {
                              if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                              }
                            }

                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.drawImage(img, 0, 0, width, height);
                              canvas.toBlob((blob) => {
                                if (blob) {
                                  resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".png", { type: 'image/png' }));
                                } else {
                                  resolve(file);
                                }
                              }, 'image/png');
                            } else {
                              resolve(file);
                            }
                          };
                          img.onerror = () => resolve(file);
                          img.src = URL.createObjectURL(file);
                        });
                      }

                      await onSendMessage('', file);
                    } finally {
                      setIsUploading(false);
                      e.target.value = ''; // Reset input
                    }
                  }
                }}
              />
              <textarea
                id="chat-input"
                disabled={currentUser.canChat === false && currentUser.role !== 'admin'}
                value={editingMessageId ? editContent : input}
                onChange={editingMessageId ? (e) => {
                  setEditContent(e.target.value);
                } : (e) => {
                  handleInputChange(e as any);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!e.currentTarget.disabled) handleSubmit(e);
                  }
                }}
                placeholder={currentUser.canChat === false && currentUser.role !== 'admin' ? "Chat desativado para você" : (editingMessageId ? "Editar mensagem..." : `Conversar em #${activeChannel.name}`)}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-text-secondary placeholder-text-muted text-base md:text-sm disabled:opacity-50 disabled:cursor-not-allowed py-1 resize-none overflow-hidden"
                autoComplete="off"
                aria-label={editingMessageId ? "Editar mensagem" : `Conversar em ${activeChannel.name}`}
                rows={1}
                onInput={(e) => {
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                }}
              />
              <div className="flex items-center space-x-2 md:space-x-4 text-text-muted relative flex-shrink-0">
                {!editingMessageId && (
                  <>
                    <div className="relative hidden sm:block">
                      <button 
                        type="button" 
                        onClick={() => setShowGiftPicker(!showGiftPicker)}
                        className={cn("hover:text-text-primary transition-colors p-1", showGiftPicker && "text-[#f2bc1b]")}
                      >
                        <Gift className="w-6 h-6 md:w-5 md:h-5" />
                      </button>
                      <AnimatePresence>
                        {showGiftPicker && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full right-0 mb-4 bg-bg-overlay border border-border-primary rounded-2xl shadow-2xl p-4 w-72 z-50"
                          >
                            <h4 className="text-text-primary font-bold text-sm mb-3">Enviar Presente</h4>
                            <div className="grid grid-cols-3 gap-3">
                              {['🎁', '💎', '⭐', '🎈', '🍰', '🍫'].map(gift => (
                                <button 
                                  key={gift}
                                  type="button"
                                  onClick={() => {
                                    onSendMessage(`Enviou um presente: ${gift}`);
                                    setShowGiftPicker(false);
                                  }}
                                  className="text-3xl p-3 hover:bg-bg-tertiary rounded-xl transition-colors"
                                >
                                  {gift}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative hidden xs:block">
                      <button 
                        type="button" 
                        onClick={() => setShowGifPicker(!showGifPicker)}
                        className={cn("hover:text-text-primary transition-colors p-1", showGifPicker && "text-[#23a559]")}
                      >
                        <Sticker className="w-6 h-6 md:w-5 md:h-5" />
                      </button>
                      <AnimatePresence>
                        {showGifPicker && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full right-0 mb-4 bg-bg-overlay border border-border-primary rounded-2xl shadow-2xl p-4 w-80 z-50"
                          >
                            <h4 className="text-text-primary font-bold text-sm mb-3">GIFs Populares</h4>
                            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 scrollbar-hide">
                              {[
                                'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxx6fG/giphy.gif',
                                'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l0HlHFRbmaZtBRhXG/giphy.gif',
                                'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKVUn7iM8FMEU24/giphy.gif'
                              ].map((url, i) => (
                                <img 
                                  key={i}
                                  src={url || undefined} 
                                  alt="gif" 
                                  className="w-full h-28 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity will-change-transform"
                                  referrerPolicy="no-referrer"
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
                        onClick={handleFileClick}
                        className="hover:text-text-primary transition-colors p-1"
                      >
                        <Paperclip className="w-6 h-6 md:w-5 md:h-5" />
                      </button>
                    </div>

                    <div className="relative">
                      <button 
                        type="button" 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={cn("hover:text-text-primary transition-colors p-1", showEmojiPicker && "text-[#f2bc1b]")}
                      >
                        <Smile className="w-6 h-6 md:w-5 md:h-5" />
                      </button>
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full right-0 mb-4 bg-bg-overlay border border-border-primary rounded-2xl shadow-2xl p-4 w-72 z-50"
                          >
                            <div className="grid grid-cols-6 gap-3">
                              {['😀', '😂', '😍', '🤔', '😎', '😭', '👍', '🔥', '❤️', '✨', '🚀', '🎉'].map(emoji => (
                                <button 
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    if (editingMessageId) setEditContent(prev => prev + emoji);
                                    else setInput(prev => prev + emoji);
                                    setShowEmojiPicker(false);
                                  }}
                                  className="text-2xl p-2 hover:bg-bg-tertiary rounded-xl transition-colors"
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
                  disabled={isUploading || (editingMessageId ? !editContent.trim() : !input.trim())}
                  className={cn(
                    "p-2 md:p-1.5 rounded-full transition-all",
                    (editingMessageId ? editContent.trim() : input.trim()) ? "bg-color-brand text-white" : "text-text-muted",
                    isUploading && "bg-bg-tertiary"
                  )}
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 md:w-4 md:h-4 animate-spin text-color-brand" />
                  ) : (
                    <Send className="w-5 h-5 md:w-4 md:h-4" />
                  )}
                </button>
              </div>
            </form>
            {typingUsers.length > 0 && (
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
                onUserClick={(user) => setSelectedStatusUserId(user.uid)}
                hiddenStatusUsers={hiddenStatusUsers}
                onToggleStatusVisibility={(userId) => {
                  setHiddenStatusUsers(prev => {
                    const next = new Set(prev);
                    if (next.has(userId)) next.delete(userId);
                    else next.add(userId);
                    return next;
                  });
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {selectedStatusUserId && (
        <UserStatusView
          userId={selectedStatusUserId}
          currentUser={currentUser}
          allStatuses={statuses}
          onClose={() => setSelectedStatusUserId(null)}
        />
      )}

      <ConfirmationModal
        isOpen={showLeaveConfirm}
        title="Sair do Canal"
        message={`Tem certeza que deseja sair do canal #${activeChannel?.name}?`}
        onConfirm={() => {
          if (activeChannel) {
            removeChannelMember(activeChannel.id, currentUser.uid);
            setInput('');
          }
          setShowLeaveConfirm(false);
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

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
                    .map(m => `[${getTimestampDate(m.timestamp)?.toLocaleString() || ''}] ${m.senderName}: ${m.content}`)
                    .join('\n');
                  navigator.clipboard.writeText(content);
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

            {settings.morseCode && (
              <button 
                onClick={() => {
                  playMorseCode(contextMenu.message.content);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors flex items-center space-x-2"
              >
                <span className="w-4 h-4 flex items-center justify-center">🔊</span>
                <span>Ouvir em Morse</span>
              </button>
            )}

            {settings.textToSpeech && (
              <button 
                onClick={() => {
                  speakText(contextMenu.message.content, settings.ttsVoiceName);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors flex items-center space-x-2"
              >
                <span className="w-4 h-4 flex items-center justify-center">🗣️</span>
                <span>Ler em Voz Alta</span>
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
            
            {contextMenu.message.senderId !== currentUser.uid && allUsers.find(u => u.uid === contextMenu.message.senderId)?.role !== 'admin' && (
              <button 
                onClick={() => { 
                  showToast(`Mensagem de ${contextMenu.message.senderName} denunciada.`, "success"); 
                  setContextMenu(null); 
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-[#f23f42] hover:text-white transition-colors group"
              >
                <span>Denunciar</span>
                <Shield className="w-4 h-4" />
              </button>
            )}
            
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
                showToast(`Notificações de ${activeChannel?.name} silenciadas localmente.`, "info"); 
                setContextMenu(null); 
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-color-brand hover:text-white transition-colors group"
            >
              <span>Silenciar</span>
              <VolumeX className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => { 
                // Redirect to sidebar for channel creation or just close
                setContextMenu(null); 
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-color-brand hover:text-white transition-colors group"
            >
              <span>Criar grupo</span>
              <Users className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => { 
                // Redirect to sidebar for channel creation or just close
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
            {(contextMenu.message.senderId === currentUser.uid || currentUser.role === 'admin') && (
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
                handleUserClick(userContextMenu.user.uid);
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
                  showToast(`Usuário ${userContextMenu.user.displayName} silenciado localmente.`, "info"); 
                  setUserContextMenu(null); 
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-[#5865f2] hover:text-white transition-colors group"
              >
                <span>Silenciar</span>
                <VolumeX className="w-4 h-4" />
              </button>
            )}
            {userContextMenu.user.uid !== currentUser.uid && userContextMenu.user.role !== 'admin' && (
              <button 
                onClick={() => { 
                  showToast(`Usuário ${userContextMenu.user.displayName} denunciado.`, "success"); 
                  setUserContextMenu(null); 
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-text-secondary hover:bg-[#f23f42] hover:text-white transition-colors group"
              >
                <span>Denunciar</span>
                <Shield className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* User Profile Modal */}
      {/* Multi-Select Toolbar */}
      <AnimatePresence>
        {isMultiSelectMode && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-bg-overlay border border-border-primary rounded-full shadow-2xl px-6 py-3 flex items-center space-x-4 z-[60]"
          >
            <div className="flex items-center space-x-2 mr-4 border-r border-border-primary pr-4">
              <CheckSquare className="w-5 h-5 text-color-brand" />
              <span className="text-sm font-bold text-text-primary">{selectedMessageIds.length} selecionadas</span>
            </div>
            
            <button 
              onClick={handleBulkPin}
              disabled={selectedMessageIds.length === 0}
              className="p-2 hover:bg-bg-tertiary rounded-full text-text-muted hover:text-text-primary transition-colors disabled:opacity-30"
              title="Fixar Selecionadas"
            >
              <Pin className="w-5 h-5" />
            </button>
            
            <button 
              onClick={handleBulkCopy}
              disabled={selectedMessageIds.length === 0}
              className="p-2 hover:bg-bg-tertiary rounded-full text-text-muted hover:text-text-primary transition-colors disabled:opacity-30"
              title="Copiar Transcrição"
            >
              <Copy className="w-5 h-5" />
            </button>

            <button 
              onClick={handleBulkTranslate}
              disabled={selectedMessageIds.length === 0}
              className="p-2 hover:bg-bg-tertiary rounded-full text-text-muted hover:text-text-primary transition-colors disabled:opacity-30"
              title="Traduzir Selecionadas"
            >
              <Languages className="w-5 h-5" />
            </button>

            <button 
              onClick={handleBulkForward}
              disabled={selectedMessageIds.length === 0}
              className="p-2 hover:bg-bg-tertiary rounded-full text-text-muted hover:text-text-primary transition-colors disabled:opacity-30"
              title="Encaminhar para Input"
            >
              <PlusSquare className="w-5 h-5" />
            </button>

            <button 
              onClick={handleBulkExport}
              disabled={selectedMessageIds.length === 0}
              className="p-2 hover:bg-bg-tertiary rounded-full text-text-muted hover:text-text-primary transition-colors disabled:opacity-30"
              title="Exportar como .txt"
            >
              <Download className="w-5 h-5" />
            </button>

            <button 
              onClick={handleDeleteSelected}
              disabled={selectedMessageIds.length === 0}
              className="p-2 hover:bg-bg-tertiary rounded-full text-text-muted hover:text-color-error transition-colors disabled:opacity-30"
              title="Excluir Selecionadas"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-border-primary mx-2" />

            <button 
              onClick={() => {
                setIsMultiSelectMode(false);
                setSelectedMessageIds([]);
              }}
              className="p-2 hover:bg-bg-tertiary rounded-full text-text-muted hover:text-text-primary transition-colors"
              title="Cancelar"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedUserProfile && (
        <UserProfileModal 
          user={selectedUserProfile}
          currentUser={currentUser}
          isOpen={!!selectedUserProfile}
          onClose={() => setSelectedUserProfile(null)}
          channels={channels}
          onSendMessage={() => {
            if (selectedUserProfile.uid !== currentUser.uid) {
              createPrivateChannel(currentUser.uid, selectedUserProfile.uid).then(channel => {
                // This is a bit tricky since we need to update the parent state
                // but for now let's just close the modal
                setSelectedUserProfile(null);
              });
            }
          }}
        />
      )}

      {showAddMembers && activeChannel && (
        <AddMembersModal 
          channel={activeChannel}
          allUsers={allUsers}
          isOpen={showAddMembers}
          onClose={() => setShowAddMembers(false)}
        />
      )}

      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelpModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-bg-primary w-full max-w-md rounded-2xl shadow-2xl border border-border-primary overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-border-primary flex items-center justify-between bg-bg-secondary">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-color-brand/20 rounded-lg">
                    <Sparkles className="w-5 h-5 text-color-brand" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">Comandos Disponíveis</h3>
                </div>
                <button onClick={() => setShowHelpModal(false)} className="p-1 hover:bg-bg-tertiary rounded-full transition-colors">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/help</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Ajuda</p>
                      <p className="text-xs text-text-muted">Mostra esta lista de comandos disponíveis.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/mute</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Silenciar</p>
                      <p className="text-xs text-text-muted">Silencia as notificações do canal atual.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/unmute</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Reativar Som</p>
                      <p className="text-xs text-text-muted">Reativa as notificações do canal atual.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/pin</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Fixar</p>
                      <p className="text-xs text-text-muted">Fixa a mensagem mais recente deste canal no topo.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/status</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Status</p>
                      <p className="text-xs text-text-muted">Abre o menu de status para postar ou ver atualizações.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/shrug</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Shrug</p>
                      <p className="text-xs text-text-muted">Envia o emoji ¯\_(ツ)_/¯.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/tableflip</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Tableflip</p>
                      <p className="text-xs text-text-muted">Envia o emoji (╯°□°）╯︵ ┻━┻.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/unflip</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Unflip</p>
                      <p className="text-xs text-text-muted">Envia o emoji ┬─┬ノ( º _ ºノ).</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/me</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Ação</p>
                      <p className="text-xs text-text-muted">Envia uma mensagem de ação. Ex: /me está pensando.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/invite</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Convidar</p>
                      <p className="text-xs text-text-muted">Abre o menu para convidar membros para o canal.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/settings</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Configurações</p>
                      <p className="text-xs text-text-muted">Abre as configurações do canal atual.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/search</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Buscar</p>
                      <p className="text-xs text-text-muted">Busca mensagens no canal. Ex: /search oi.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/leave</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Sair</p>
                      <p className="text-xs text-text-muted">Sai do canal atual (não funciona em DMs).</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/clear</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Limpar</p>
                      <p className="text-xs text-text-muted">Limpa o campo de digitação.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-bg-secondary rounded-xl border border-border-primary/50">
                    <code className="text-color-brand font-bold bg-color-brand/10 px-2 py-1 rounded text-sm shrink-0">/gem</code>
                    <div>
                      <p className="text-sm font-bold text-text-primary">Gemini AI</p>
                      <p className="text-xs text-text-muted">Conversa com a inteligência artificial Gemini. Ex: /gem resuma este chat.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-bg-secondary border-t border-border-primary text-center">
                <button 
                  onClick={() => setShowHelpModal(false)}
                  className="w-full py-2 bg-color-brand hover:bg-color-brand-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-color-brand/20"
                >
                  Entendido!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {lightboxFile && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxFile(null)}>
          {lightboxFile.type === 'image' ? (
            <img src={lightboxFile.url} className="max-w-full max-h-full rounded-lg" alt="preview" />
          ) : (
            <video src={lightboxFile.url} controls autoPlay className="max-w-full max-h-full rounded-lg" />
          )}
        </div>
      )}
    </div>
  );
};


