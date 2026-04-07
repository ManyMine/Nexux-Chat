import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { GeminiAssistant } from './GeminiAssistant';
import { UserSearch } from './UserSearch';
import { UserSettings } from './UserSettings';
import { UserProfile, Channel, Message } from '@/src/types';
import { Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ChatLayoutProps {
  currentUser: UserProfile;
  channels: Channel[];
  activeChannel: Channel | null;
  unreadChannels: Set<string>;
  onChannelSelect: (channel: Channel) => void;
  onLogout: () => void;
  onSendMessage: (content: string, file?: File) => Promise<void>;
  messages: Message[];
  isLoadingMessages?: boolean;
  allUsers: UserProfile[];
  typingUsers: string[];
  onStartTyping: () => Promise<void>;
  onStopTyping: () => Promise<void>;
  onSelectUser: (user: UserProfile) => void;
  activeCall: { id: string, type: 'voice' | 'video', channel: Channel } | null;
  onStartCall: (video: boolean) => void;
  onEndCall: () => void;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  currentUser,
  channels,
  activeChannel,
  unreadChannels,
  onChannelSelect,
  onLogout,
  onSendMessage,
  messages,
  isLoadingMessages,
  allUsers,
  typingUsers,
  onStartTyping,
  onStopTyping,
  onSelectUser,
  activeCall,
  onStartCall,
  onEndCall
}) => {
  const [showGemini, setShowGemini] = useState(false);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#313338] text-[#dbdee1] overflow-hidden font-sans relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar 
          currentUser={currentUser}
          channels={channels}
          activeChannel={activeChannel}
          unreadChannels={unreadChannels}
          onChannelSelect={(channel) => {
            onChannelSelect(channel);
            setIsSidebarOpen(false);
          }}
          onLogout={onLogout}
          onOpenUserSearch={() => setIsUserSearchOpen(true)}
          onOpenUserSettings={() => setIsUserSettingsOpen(true)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden w-full">
        <ChatArea 
          activeChannel={activeChannel}
          messages={messages}
          onSendMessage={onSendMessage}
          isLoading={isLoadingMessages}
          currentUser={currentUser}
          typingUsers={typingUsers}
          onStartTyping={onStartTyping}
          onStopTyping={onStopTyping}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          activeCall={activeCall}
          onStartCall={onStartCall}
          onEndCall={onEndCall}
        />
        
        {/* Gemini Toggle Button (Floating) */}
        {!showGemini && activeChannel && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setShowGemini(true)}
            className="absolute top-14 right-4 bg-[#5865f2] hover:bg-[#4752c4] text-white p-2.5 rounded-full shadow-2xl z-10 transition-all group"
            title="Assistente Gemini"
          >
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          </motion.button>
        )}
      </div>

      {/* Gemini Assistant Panel */}
      <AnimatePresence>
        {showGemini && (
          <GeminiAssistant 
            messages={messages} 
            onClose={() => setShowGemini(false)} 
          />
        )}
      </AnimatePresence>

      <UserSearch 
        isOpen={isUserSearchOpen}
        onClose={() => setIsUserSearchOpen(false)}
        allUsers={allUsers}
        onSelectUser={onSelectUser}
      />

      <UserSettings 
        isOpen={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
        currentUser={currentUser}
        onLogout={onLogout}
      />
    </div>
  );
};



