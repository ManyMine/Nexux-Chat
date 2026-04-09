import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';
import { cn } from '@/src/lib/utils';

interface UserListProps {
  users: UserProfile[];
  isOpen: boolean;
  currentUser?: UserProfile;
  onContextMenu?: (e: React.MouseEvent, user: UserProfile) => void;
}

export const UserList: React.FC<UserListProps> = ({ users, isOpen, currentUser, onContextMenu }) => {
  if (!isOpen) return null;

  const visibleUsers = users.filter(u => !u.isPrivate || u.uid === currentUser?.uid);
  const onlineUsers = visibleUsers.filter(u => u.status === 'online');
  const awayUsers = visibleUsers.filter(u => u.status === 'away');
  const offlineUsers = visibleUsers.filter(u => u.status !== 'online' && u.status !== 'away');

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 240, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="bg-bg-secondary border-l border-border-primary/50 flex flex-col h-full overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {onlineUsers.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase text-text-muted mb-2 px-2">
              Online — {onlineUsers.length}
            </h3>
            <div className="space-y-1">
              {onlineUsers.map(user => (
                <UserItem key={user.uid} user={user} onContextMenu={onContextMenu} />
              ))}
            </div>
          </div>
        )}

        {awayUsers.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase text-text-muted mb-2 px-2">
              Ausente — {awayUsers.length}
            </h3>
            <div className="space-y-1">
              {awayUsers.map(user => (
                <UserItem key={user.uid} user={user} onContextMenu={onContextMenu} />
              ))}
            </div>
          </div>
        )}

        {offlineUsers.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase text-text-muted mb-2 px-2">
              Offline — {offlineUsers.length}
            </h3>
            <div className="space-y-1">
              {offlineUsers.map(user => (
                <UserItem key={user.uid} user={user} onContextMenu={onContextMenu} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const UserItem: React.FC<{ user: UserProfile, onContextMenu?: (e: React.MouseEvent, user: UserProfile) => void }> = ({ user, onContextMenu }) => (
  <button 
    onContextMenu={(e) => onContextMenu?.(e, user)}
    className="w-full flex items-center p-2 rounded-md hover:bg-bg-tertiary transition-colors group"
  >
    <div className="relative mr-3">
      <img 
        src={user.photoURL || DEFAULT_AVATAR} 
        alt={user.displayName}
        className={cn(
          "w-8 h-8 rounded-full object-cover",
          user.status === 'offline' && "grayscale opacity-50"
        )}
        referrerPolicy="no-referrer"
      />
      <div className={cn(
        "absolute bottom-0 right-0 w-3 h-3 border-2 border-bg-secondary rounded-full",
        user.status === 'online' ? "bg-color-success" : 
        user.status === 'away' ? "bg-color-warning" : "bg-text-muted"
      )} />
    </div>
    <div className="flex flex-col items-start min-w-0">
      <span className={cn(
        "text-sm font-medium truncate",
        user.status === 'online' || user.status === 'away' ? "text-text-secondary" : "text-text-muted"
      )}>
        {user.displayName}
      </span>
      <span className="text-[10px] text-text-muted capitalize">
        {user.status || 'offline'}
      </span>
    </div>
  </button>
);
