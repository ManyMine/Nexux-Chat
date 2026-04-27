import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { UserProfile } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';
import { cn } from '@/src/lib/utils';
import { UserProfileModal } from './UserProfileModal';

interface UserListProps {
  users: UserProfile[];
  isOpen: boolean;
  currentUser?: UserProfile;
  onContextMenu?: (e: React.MouseEvent, user: UserProfile) => void;
  onUserClick?: (user: UserProfile) => void;
  hiddenStatusUsers?: Set<string>;
  onToggleStatusVisibility?: (userId: string) => void;
}

export const UserList: React.FC<UserListProps> = ({ users, isOpen, currentUser, onContextMenu, onUserClick, hiddenStatusUsers, onToggleStatusVisibility }) => {
  const [selectedUserProfile, setSelectedUserProfile] = React.useState<UserProfile | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  if (!isOpen) return null;

  const visibleUsers = users;
  const onlineUsers = visibleUsers.filter(u => u.status === 'online' || u.status === 'auto');
  const dndUsers = visibleUsers.filter(u => u.status === 'dnd');
  const awayUsers = visibleUsers.filter(u => u.status === 'away');
  const offlineUsers = visibleUsers.filter(u => !u.status || u.status === 'offline' || u.status === 'invisible');

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 240, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="bg-bg-secondary border-l border-border-primary/50 flex flex-col h-full overflow-hidden relative z-20"
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {onlineUsers.length > 0 && (
          <div>
            <button 
              onClick={() => toggleGroup('online')}
              className="flex items-center w-full text-xs font-bold uppercase text-text-muted mb-2 px-2 hover:text-text-primary transition-colors"
            >
              {collapsedGroups['online'] ? <ChevronRight className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              Online — {onlineUsers.length}
            </button>
            <AnimatePresence>
              {!collapsedGroups['online'] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  {onlineUsers.map(user => (
                    <UserItem 
                      key={user.uid} 
                      user={user} 
                      onContextMenu={onContextMenu} 
                      onUserClick={(u) => {
                        setSelectedUserProfile(u);
                        onUserClick?.(u);
                      }} 
                      isHidden={hiddenStatusUsers?.has(user.uid)}
                      onToggleVisibility={() => onToggleStatusVisibility?.(user.uid)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {dndUsers.length > 0 && (
          <div>
            <button 
              onClick={() => toggleGroup('dnd')}
              className="flex items-center w-full text-xs font-bold uppercase text-text-muted mb-2 px-2 hover:text-text-primary transition-colors"
            >
              {collapsedGroups['dnd'] ? <ChevronRight className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              Não incomodar — {dndUsers.length}
            </button>
            <AnimatePresence>
              {!collapsedGroups['dnd'] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  {dndUsers.map(user => (
                    <UserItem 
                      key={user.uid} 
                      user={user} 
                      onContextMenu={onContextMenu} 
                      onUserClick={(u) => {
                        setSelectedUserProfile(u);
                        onUserClick?.(u);
                      }} 
                      isHidden={hiddenStatusUsers?.has(user.uid)}
                      onToggleVisibility={() => onToggleStatusVisibility?.(user.uid)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {awayUsers.length > 0 && (
          <div>
            <button 
              onClick={() => toggleGroup('away')}
              className="flex items-center w-full text-xs font-bold uppercase text-text-muted mb-2 px-2 hover:text-text-primary transition-colors"
            >
              {collapsedGroups['away'] ? <ChevronRight className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              Ausente — {awayUsers.length}
            </button>
            <AnimatePresence>
              {!collapsedGroups['away'] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  {awayUsers.map(user => (
                    <UserItem 
                      key={user.uid} 
                      user={user} 
                      onContextMenu={onContextMenu} 
                      onUserClick={(u) => {
                        setSelectedUserProfile(u);
                        onUserClick?.(u);
                      }} 
                      isHidden={hiddenStatusUsers?.has(user.uid)}
                      onToggleVisibility={() => onToggleStatusVisibility?.(user.uid)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {offlineUsers.length > 0 && (
          <div>
            <button 
              onClick={() => toggleGroup('offline')}
              className="flex items-center w-full text-xs font-bold uppercase text-text-muted mb-2 px-2 hover:text-text-primary transition-colors"
            >
              {collapsedGroups['offline'] ? <ChevronRight className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              Offline — {offlineUsers.length}
            </button>
            <AnimatePresence>
              {!collapsedGroups['offline'] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  {offlineUsers.map(user => (
                    <UserItem 
                      key={user.uid} 
                      user={user} 
                      onContextMenu={onContextMenu} 
                      onUserClick={(u) => {
                        setSelectedUserProfile(u);
                        onUserClick?.(u);
                      }} 
                      isHidden={hiddenStatusUsers?.has(user.uid)}
                      onToggleVisibility={() => onToggleStatusVisibility?.(user.uid)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {selectedUserProfile && currentUser && (
        <UserProfileModal 
          user={selectedUserProfile}
          currentUser={currentUser}
          isOpen={!!selectedUserProfile}
          onClose={() => setSelectedUserProfile(null)}
          onSendMessage={() => {
            if (selectedUserProfile.uid !== currentUser.uid) {
              onUserClick?.(selectedUserProfile);
              setSelectedUserProfile(null);
            }
          }}
        />
      )}
    </motion.div>
  );
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'online': return 'bg-color-success';
    case 'away': return 'bg-color-warning';
    case 'dnd': return 'bg-color-danger';
    case 'invisible': return 'bg-text-muted';
    case 'auto': return 'bg-color-brand';
    default: return 'bg-text-muted';
  }
};

const getStatusText = (status?: string) => {
  switch (status) {
    case 'online': return 'Online';
    case 'away': return 'Ausente';
    case 'dnd': return 'Não incomodar';
    case 'invisible': return 'Invisível';
    case 'auto': return 'Automático';
    default: return 'Offline';
  }
};

const UserItem: React.FC<{ 
  user: UserProfile, 
  onContextMenu?: (e: React.MouseEvent, user: UserProfile) => void, 
  onUserClick?: (user: UserProfile) => void,
  isHidden?: boolean,
  onToggleVisibility?: () => void
}> = ({ user, onContextMenu, onUserClick, isHidden, onToggleVisibility }) => (
  <div className="flex items-center w-full group">
    <button 
      onContextMenu={(e) => onContextMenu?.(e, user)}
      onClick={() => onUserClick?.(user)}
      onDoubleClick={() => onUserClick?.(user)}
      className="flex-1 flex items-center p-2 rounded-md hover:bg-bg-tertiary transition-colors"
    >
      <div className="relative mr-3">
        <img 
          src={user.photoURL || DEFAULT_AVATAR} 
          alt={user.displayName}
          className={cn(
            "w-8 h-8 rounded-full object-cover",
            (user.status === 'offline' || user.status === 'invisible') && "grayscale opacity-50"
          )}
          referrerPolicy="no-referrer"
        />
        <div className={cn(
          "absolute bottom-0 right-0 w-3 h-3 border-2 border-bg-secondary rounded-full",
          getStatusColor(user.status)
        )}>
          {user.status === 'dnd' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-bg-secondary rounded-full" />
            </div>
          )}
          {user.status === 'invisible' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-bg-secondary rounded-full" />
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-start min-w-0">
        <span className={cn(
          "text-sm font-medium truncate",
          (user.status === 'offline' || user.status === 'invisible') ? "text-text-muted" : "text-text-secondary"
        )}>
          {user.displayName}
        </span>
        <span className="text-[10px] text-text-muted capitalize">
          {getStatusText(user.status)}
        </span>
      </div>
    </button>
    {onToggleVisibility && (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility();
        }}
        className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary"
        title={isHidden ? "Mostrar Status" : "Ocultar Status"}
      >
        {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    )}
  </div>
);
