import React, { useState, useEffect } from 'react';
import { X, Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Settings } from 'lucide-react';
import { Channel, UserProfile } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';
import { cn } from '@/src/lib/utils';

interface CallViewProps {
  channel: Channel;
  currentUser: UserProfile;
  allUsers?: UserProfile[];
  onClose: () => void;
  type: 'voice' | 'video';
}

export const CallView: React.FC<CallViewProps> = ({ channel, currentUser, allUsers = [], onClose, type }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(type === 'video');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<string[]>([]);

  // Simulate speaking
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMuted && Math.random() > 0.5) {
        setSpeakingUsers([currentUser.uid]);
      } else {
        setSpeakingUsers([]);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isMuted, currentUser.uid]);

  // For visual purposes, show current user and maybe 1 other member if private
  const callParticipants = [currentUser];
  if (channel.type === 'private') {
    const otherId = channel.members.find(id => id !== currentUser.uid);
    const otherUser = allUsers.find(u => u.uid === otherId);
    if (otherUser) callParticipants.push(otherUser);
  }

  return (
    <div className="flex flex-col h-full bg-[#000000] border-b border-[#1e1f22] relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-[#23a559] rounded-full animate-pulse" />
          <span className="text-white font-medium text-sm drop-shadow-md">
            Chamada de {type === 'video' ? 'Vídeo' : 'Voz'} - {channel.name}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-4 flex items-center justify-center gap-4 mt-8">
        {callParticipants.map(user => {
          const isSpeaking = speakingUsers.includes(user.uid);
          return (
            <div 
              key={user.uid} 
              className={cn(
                "relative flex-1 max-w-[400px] aspect-video bg-[#1e1f22] rounded-xl flex items-center justify-center overflow-hidden transition-all duration-200",
                isSpeaking ? "ring-2 ring-[#23a559]" : "ring-1 ring-[#1e1f22]"
              )}
            >
              {/* Avatar or Video */}
              <div className="relative w-full h-full flex items-center justify-center">
                {isVideoOn ? (
                  <div className="w-full h-full bg-[#2b2d31] flex items-center justify-center relative">
                    <img 
                      src={user.photoURL || DEFAULT_AVATAR} 
                      alt={user.displayName}
                      className="w-full h-full object-cover opacity-50 blur-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img 
                        src={user.photoURL || DEFAULT_AVATAR} 
                        alt={user.displayName}
                        className={cn(
                          "w-32 h-32 rounded-full object-cover border-4 border-[#5865f2]",
                          isSpeaking && "ring-4 ring-[#23a559]"
                        )}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute top-3 right-3 bg-[#f23f42] text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-1 animate-pulse">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      <span>LIVE</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <img 
                      src={user.photoURL || DEFAULT_AVATAR} 
                      alt={user.displayName}
                      className={cn(
                        "w-24 h-24 rounded-full object-cover transition-all duration-200",
                        isSpeaking ? "ring-4 ring-[#23a559]" : ""
                      )}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
              
              {/* Name Tag */}
              <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-white text-xs font-medium flex items-center space-x-2">
                <span>{user.displayName}</span>
                {user.uid === currentUser.uid && isMuted && <MicOff className="w-3 h-3 text-[#f23f42]" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="h-20 bg-[#111214] flex items-center justify-center space-x-4 px-4">
        <button 
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={cn(
            "p-3 rounded-full transition-colors",
            isVideoOn ? "bg-[#2b2d31] hover:bg-[#35373c] text-white" : "bg-[#2b2d31] hover:bg-[#35373c] text-white"
          )}
          title={isVideoOn ? "Desativar Câmera" : "Ativar Câmera"}
        >
          {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>
        
        <button 
          onClick={() => setIsScreenSharing(!isScreenSharing)}
          className={cn(
            "p-3 rounded-full transition-colors",
            isScreenSharing ? "bg-[#23a559] hover:bg-[#1f8f4c] text-white" : "bg-[#2b2d31] hover:bg-[#35373c] text-white"
          )}
          title="Compartilhar Tela"
        >
          <MonitorUp className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={cn(
            "p-3 rounded-full transition-colors",
            isMuted ? "bg-[#f23f42] hover:bg-[#d83c3e] text-white" : "bg-[#2b2d31] hover:bg-[#35373c] text-white"
          )}
          title={isMuted ? "Ativar Microfone" : "Silenciar"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <div className="w-px h-8 bg-[#3f4147] mx-2" />

        <button 
          onClick={onClose}
          className="p-3 bg-[#f23f42] hover:bg-[#d83c3e] text-white rounded-full transition-colors"
          title="Desconectar"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
