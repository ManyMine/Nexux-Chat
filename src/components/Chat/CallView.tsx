import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Settings, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Channel, UserProfile } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';
import { cn } from '@/src/lib/utils';
import { 
  saveOffer, 
  saveAnswer, 
  addIceCandidate, 
  listenForSignaling, 
  listenForIceCandidates,
  updateCallStatus
} from '@/src/services/firebaseService';

interface CallViewProps {
  callId: string;
  channel: Channel;
  currentUser: UserProfile;
  allUsers?: UserProfile[];
  onClose: () => void;
  type: 'voice' | 'video';
}

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export const CallView: React.FC<CallViewProps> = ({ callId, channel, currentUser, allUsers = [], onClose, type }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(type === 'video');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed' | 'syncing'>('syncing');
  const [speakingUsers, setSpeakingUsers] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // Initialize WebRTC
  useEffect(() => {
    let pc: RTCPeerConnection | null = null;
    let unsubscribeSignaling: (() => void) | null = null;
    let unsubscribeIce: (() => void) | null = null;

    const initWebRTC = async () => {
      if (pcRef.current) return; // Already initialized

      // Pre-access media before signaling
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video',
          audio: true
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setConnectionStatus('connecting');
      } catch (err) {
        console.error("Error accessing media devices:", err);
        setConnectionStatus('failed');
        return;
      }

      pc = new RTCPeerConnection(servers);
      pcRef.current = pc;

      // Add tracks to peer connection
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          if (pcRef.current && pcRef.current.signalingState !== 'closed') {
            pcRef.current.addTrack(track, streamRef.current!);
          }
        });
      }

      // Remote Stream
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          remoteStream.addTrack(track);
        });
        setConnectionStatus('connected');
      };

      pc.oniceconnectionstatechange = () => {
        const currentPc = pcRef.current;
        if (!currentPc || currentPc.signalingState === 'closed') return;
        console.log("ICE Connection State:", currentPc.iceConnectionState);
        if (currentPc.iceConnectionState === 'connected') setConnectionStatus('connected');
        if (currentPc.iceConnectionState === 'disconnected') setConnectionStatus('disconnected');
        if (currentPc.iceConnectionState === 'failed') setConnectionStatus('failed');
      };

      pc.onicecandidate = (event) => {
        const currentPc = pcRef.current;
        if (event.candidate && currentPc && currentPc.localDescription && currentPc.signalingState !== 'closed') {
          const role = currentPc.localDescription.type === 'offer' ? 'caller' : 'callee';
          addIceCandidate(callId, event.candidate, role);
        }
      };

      // Signaling
      unsubscribeSignaling = listenForSignaling(callId, async (data) => {
        const currentPc = pcRef.current;
        if (!currentPc || currentPc.signalingState === 'closed') return;

        try {
          // If I am the caller and I get an answer
          if (data.callerId === currentUser.uid) {
            if (!data.offer) {
              const offerDescription = await currentPc.createOffer();
              if (currentPc.signalingState === 'closed') return;
              await currentPc.setLocalDescription(offerDescription);
              await saveOffer(callId, {
                type: offerDescription.type,
                sdp: offerDescription.sdp
              });

              // Start listening for callee candidates
              unsubscribeIce = listenForIceCandidates(callId, 'callee', (candidate) => {
                const pcNow = pcRef.current;
                if (pcNow && pcNow.signalingState !== 'closed' && candidate) {
                  pcNow.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding ICE candidate:", e));
                }
              });
            } else if (data.answer && !currentPc.currentRemoteDescription) {
              const answerDescription = new RTCSessionDescription(data.answer);
              await currentPc.setRemoteDescription(answerDescription);
            }
          }

          // If I am NOT the caller and I get an offer
          if (data.callerId !== currentUser.uid && data.offer && !currentPc.currentRemoteDescription) {
            const offerDescription = new RTCSessionDescription(data.offer);
            await currentPc.setRemoteDescription(offerDescription);

            const answerDescription = await currentPc.createAnswer();
            if (currentPc.signalingState === 'closed') return;
            await currentPc.setLocalDescription(answerDescription);
            await saveAnswer(callId, {
              type: answerDescription.type,
              sdp: answerDescription.sdp
            });

            // Start listening for caller candidates
            unsubscribeIce = listenForIceCandidates(callId, 'caller', (candidate) => {
              const pcNow = pcRef.current;
              if (pcNow && pcNow.signalingState !== 'closed' && candidate) {
                pcNow.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding ICE candidate:", e));
              }
            });
          }
        } catch (err) {
          console.error("Signaling error:", err);
        }
      });
    };

    initWebRTC();

    return () => {
      if (unsubscribeSignaling) unsubscribeSignaling();
      if (unsubscribeIce) unsubscribeIce();
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [callId, currentUser.uid, type]);

  // Handle mute/video toggles on stream
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => track.enabled = !isMuted);
      streamRef.current.getVideoTracks().forEach(track => track.enabled = isVideoOn);
    }
  }, [isMuted, isVideoOn]);

  // Handle screen sharing
  useEffect(() => {
    const startScreenShare = async () => {
      if (isScreenSharing) {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: true,
            audio: true
          });
          screenStreamRef.current = stream;
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = stream;
          }
          
          // In a real app, we would replace the video track in the peer connection
          if (pcRef.current) {
            const videoTrack = stream.getVideoTracks()[0];
            const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
          }

          stream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
          };
        } catch (err) {
          console.error("Error accessing screen share:", err);
          setIsScreenSharing(false);
        }
      } else {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
          
          // Revert to camera track
          if (pcRef.current && streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
          }
        }
      }
    };

    startScreenShare();
  }, [isScreenSharing]);

  // For visual purposes, show current user and the other participant
  const otherParticipantId = channel.members.find(id => id !== currentUser.uid);
  const otherUser = allUsers.find(u => u.uid === otherParticipantId);
  const callParticipants = [currentUser];
  if (otherUser) callParticipants.push(otherUser);

  return (
    <div className="flex flex-col h-full bg-black border-b border-border-primary relative overflow-hidden">
      {connectionStatus === 'syncing' && (
        <div className="absolute inset-0 z-50 bg-bg-tertiary/90 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#5865f2] animate-spin" />
          <p className="text-text-primary font-bold text-lg">Sincronizando chamada...</p>
          <p className="text-text-muted text-sm">Aguardando acesso à câmera e microfone</p>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            connectionStatus === 'connected' ? "bg-[#23a559]" : 
            connectionStatus === 'connecting' ? "bg-[#f2bc1b]" : "bg-[#f23f42]"
          )} />
          <span className="text-white font-medium text-sm drop-shadow-md flex items-center space-x-2">
            <span>Chamada de {type === 'video' ? 'Vídeo' : 'Voz'} - {channel.name}</span>
            <span className="text-[10px] opacity-70 uppercase tracking-widest bg-white/10 px-1.5 py-0.5 rounded">
              {connectionStatus === 'connected' ? 'Conectado' : 
               connectionStatus === 'connecting' ? 'Conectando...' : 'Erro de Conexão'}
            </span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {connectionStatus === 'connecting' && <Loader2 className="w-4 h-4 text-white animate-spin" />}
          {connectionStatus === 'connected' ? <Wifi className="w-4 h-4 text-[#23a559]" /> : <WifiOff className="w-4 h-4 text-[#f23f42]" />}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center gap-4 mt-8 overflow-y-auto">
        {isScreenSharing && (
          <div className="w-full max-w-[800px] aspect-video bg-bg-tertiary rounded-xl flex items-center justify-center overflow-hidden ring-2 ring-[#5865f2] relative group">
            <video 
              ref={screenVideoRef}
              autoPlay 
              playsInline 
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 left-3 bg-[#5865f2] text-white text-xs font-bold px-2 py-1 rounded flex items-center space-x-2">
              <MonitorUp className="w-4 h-4" />
              <span>Você está compartilhando a tela</span>
            </div>
            <button 
              onClick={() => setIsScreenSharing(false)}
              className="absolute top-3 right-3 bg-[#f23f42] hover:bg-[#d83c3e] text-white text-xs font-bold px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Parar Compartilhamento
            </button>
          </div>
        )}

        <div className={cn(
          "flex flex-wrap items-center justify-center gap-4 w-full",
          isScreenSharing ? "max-w-[600px]" : "max-w-[1000px]"
        )}>
          {callParticipants.map(user => {
            const isMe = user.uid === currentUser.uid;
            
            return (
              <div 
                key={user.uid} 
                className={cn(
                  "relative flex-1 min-w-[200px] max-w-[400px] aspect-video bg-bg-tertiary rounded-xl flex items-center justify-center overflow-hidden transition-all duration-200",
                  "ring-1 ring-border-primary"
                )}
              >
              {/* Avatar or Video */}
              <div className="relative w-full h-full flex items-center justify-center">
                {isMe ? (
                  isVideoOn ? (
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover mirror"
                    />
                  ) : (
                    <div className="relative">
                      <img 
                        src={user.photoURL || DEFAULT_AVATAR} 
                        alt={user.displayName}
                        className="w-24 h-24 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )
                ) : (
                  connectionStatus === 'connected' && type === 'video' ? (
                    <video 
                      ref={remoteVideoRef}
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative">
                      <img 
                        src={user.photoURL || DEFAULT_AVATAR} 
                        alt={user.displayName}
                        className="w-24 h-24 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {connectionStatus === 'connecting' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
              
              {/* Name Tag */}
              <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-white text-xs font-medium flex items-center space-x-2">
                <span>{user.displayName}</span>
                {isMe && isMuted && <MicOff className="w-3 h-3 text-[#f23f42]" />}
                {!isMe && connectionStatus !== 'connected' && <span className="text-[10px] text-[#f2bc1b]">Conectando...</span>}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Controls */}
      <div className="h-20 bg-bg-overlay flex items-center justify-center space-x-4 px-4">
        <button 
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={cn(
            "p-3 rounded-full transition-colors",
            isVideoOn ? "bg-bg-secondary hover:bg-bg-tertiary text-white" : "bg-[#f23f42] hover:bg-[#d83c3e] text-white"
          )}
          title={isVideoOn ? "Desativar Câmera" : "Ativar Câmera"}
        >
          {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </button>
        
        <button 
          onClick={() => setIsScreenSharing(!isScreenSharing)}
          className={cn(
            "p-3 rounded-full transition-colors",
            isScreenSharing ? "bg-[#23a559] hover:bg-[#1f8f4c] text-white" : "bg-bg-secondary hover:bg-bg-tertiary text-white"
          )}
          title="Compartilhar Tela"
        >
          <MonitorUp className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={cn(
            "p-3 rounded-full transition-colors",
            isMuted ? "bg-[#f23f42] hover:bg-[#d83c3e] text-white" : "bg-bg-secondary hover:bg-bg-tertiary text-white"
          )}
          title={isMuted ? "Ativar Microfone" : "Silenciar"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <div className="w-px h-8 bg-border-primary mx-2" />

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
