import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { GeminiAssistant } from './GeminiAssistant';
import { UserSearch } from './UserSearch';
import { UserSettings } from './UserSettings';
import { StatusMenu } from '../Status/StatusMenu';
import { ReportsModal } from './ReportsModal';
import { DevTools } from './DevTools';
import { Browser } from './Browser';
import { UserProfile, Channel, Message, Report, Status } from '@/src/types';
import { db } from '@/src/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { REPORTS_COLLECTION, NOTIFICATIONS_COLLECTION } from '@/src/constants';
import { getStatuses } from '@/src/services/firebaseService';
import { Sparkles, Hand, Globe } from 'lucide-react';
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
  onClearUnreads: (channelIds: string[]) => void;
  onMuteChannels: (channelIds: string[], mute: boolean) => void;
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
  onEndCall,
  onClearUnreads,
  onMuteChannels
}) => {
  const [showGemini, setShowGemini] = useState(false);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [isDevMode, setIsDevMode] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isLeftHanded, setIsLeftHanded] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const filteredUsers = React.useMemo(() => {
    // Filter users based on privacy settings
    const conversationUserIds = new Set(
      channels
        .filter(c => c.type === 'private')
        .flatMap(c => c.members || [])
    );

    return allUsers.filter(u => 
      u.uid === currentUser.uid || 
      !u.isPrivate || 
      conversationUserIds.has(u.uid)
    );
  }, [allUsers, channels, currentUser.uid]);

  const hasUnreadStatuses = useMemo(() => {
    return statuses.some(s => 
      s.userId !== currentUser.uid && 
      (!s.views || !s.views.includes(currentUser.uid))
    );
  }, [statuses, currentUser.uid]);

  // Statuses Listener
  useEffect(() => {
    if (currentUser) {
      console.log("ChatLayout: Setting up statuses listener for user:", currentUser.uid);
      const unsubscribe = getStatuses(currentUser, channels, (newStatuses) => {
        console.log("ChatLayout: Received new statuses:", newStatuses.length);
        setStatuses(prev => {
          const tempStatuses = prev.filter(s => s.id.startsWith('temp-'));
          // Combine temp statuses with new ones from Firestore
          // We keep temp statuses until they are explicitly removed or replaced
          return [...tempStatuses, ...newStatuses];
        });
      });
      return () => unsubscribe();
    }
  }, [currentUser, channels]);

  // Notifications Listener
  useEffect(() => {
    if (currentUser && currentUser.statusSettings?.statusNotifications !== false) {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const notification = change.doc.data();
            if (notification.userId !== currentUser.uid) {
              console.log("New status notification:", notification);
              // Optionally, show a toast or alert
            }
          }
        });
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  // Reports Listener for Admins
  useEffect(() => {
    if (currentUser.role === 'admin') {
      const q = query(
        collection(db, REPORTS_COLLECTION),
        where('status', '==', 'pending')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingReportsCount(snapshot.size);
      }, (error) => {
        console.error("Error listening to reports:", error);
      });
      
      return () => unsubscribe();
    }
  }, [currentUser.role]);

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

  return (
    <div className={cn("flex h-screen bg-transparent text-text-secondary overflow-hidden font-sans relative", isLeftHanded ? "flex-row-reverse" : "flex-row")}>
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
      <div 
        className={cn(
          "fixed inset-y-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          isLeftHanded ? (isSidebarOpen ? "right-0" : "right-0 translate-x-full") : (isSidebarOpen ? "left-0" : "left-0 -translate-x-full"),
          "w-[240px] flex-shrink-0"
        )}
        style={channelBgStyles}
      >
        <Sidebar 
          currentUser={currentUser}
          channels={channels}
          activeChannel={activeChannel}
          unreadChannels={unreadChannels}
          allUsers={filteredUsers}
          onChannelSelect={(channel) => {
            onChannelSelect(channel);
            setIsSidebarOpen(false);
          }}
          onLogout={onLogout}
          onOpenUserSearch={() => setIsUserSearchOpen(true)}
          onOpenUserSettings={() => setIsUserSettingsOpen(true)}
          onOpenStatus={() => { setSelectedUserId(undefined); setShowStatus(true); }}
          onOpenReports={() => setIsReportsOpen(true)}
          pendingReportsCount={pendingReportsCount}
          onClearUnreads={onClearUnreads}
          onMuteChannels={onMuteChannels}
          hasUnreadStatuses={hasUnreadStatuses}
          onToggleDevMode={() => setIsDevMode(!isDevMode)}
          onOpenDevTools={() => setIsDevToolsOpen(true)}
          isDevMode={isDevMode}
          isLeftHanded={isLeftHanded}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden w-full gpu-accelerated">
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
          onOpenStatusForUser={(userId) => { setSelectedUserId(userId); setShowStatus(true); }}
          onMuteChannels={onMuteChannels}
          channels={channels}
        />
        
        {/* Gemini Toggle Button (Floating) */}
        {!showGemini && activeChannel && (
          <div className={cn("absolute top-14 flex items-center gap-2 z-10", isLeftHanded ? "left-4" : "right-4")}>
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => setShowGemini(true)}
              className="bg-color-brand hover:bg-color-brand-hover text-white p-2.5 rounded-full shadow-2xl transition-all group"
              title="Assistente Gemini"
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </motion.button>
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => setIsBrowserOpen(true)}
              className="bg-bg-secondary hover:bg-bg-tertiary text-text-muted p-2.5 rounded-full shadow-2xl transition-all group border border-border-primary"
              title="Abrir Navegador"
            >
              <Globe className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </motion.button>
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => setIsLeftHanded(!isLeftHanded)}
              className={cn("p-2.5 rounded-full shadow-2xl transition-all group", isLeftHanded ? "bg-color-brand text-white" : "bg-gray-500 hover:bg-gray-600 text-white")}
              title="Modo Canhoto"
            >
              <Hand className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </motion.button>
          </div>
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

      <AnimatePresence>
        {isBrowserOpen && (
          <Browser onClose={() => setIsBrowserOpen(false)} />
        )}
      </AnimatePresence>

      <UserSearch 
        isOpen={isUserSearchOpen}
        onClose={() => setIsUserSearchOpen(false)}
        allUsers={filteredUsers}
        onSelectUser={onSelectUser}
      />

      <UserSettings 
        isOpen={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      <ReportsModal 
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
      />

      <AnimatePresence>
        {isDevMode && (
          <DevTools 
            user={currentUser}
            isOpen={isDevToolsOpen}
            onClose={() => setIsDevToolsOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStatus && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative z-10"
            >
              <StatusMenu 
                currentUser={currentUser} 
                onClose={() => setShowStatus(false)} 
                initialUserId={selectedUserId}
                statuses={statuses}
                setStatuses={setStatuses}
                channels={channels}
                onChannelSelect={onChannelSelect}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};



