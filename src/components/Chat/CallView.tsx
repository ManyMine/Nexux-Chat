import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Settings, Wifi, WifiOff, Loader2, Sparkles, UserPlus } from 'lucide-react';
import { Channel, UserProfile, Call } from '@/src/types';
import { DEFAULT_AVATAR } from '@/src/constants';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/context/ToastContext';
import { InviteMemberModal } from './InviteMemberModal';
import { UserProfileModal } from './UserProfileModal';
import { 
  saveOffer, 
  saveAnswer, 
  addIceCandidate, 
  listenForSignaling, 
  listenForIceCandidates,
  updateCallStatus,
  inviteMemberToCall
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
  const { showToast } = useToast();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(type === 'video');
  const [videoEffect, setVideoEffect] = useState('none');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed' | 'syncing'>('syncing');
  const [speakingUsers, setSpeakingUsers] = useState<string[]>([]);
  const [call, setCall] = useState<Call | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [viewingProfileUser, setViewingProfileUser] = useState<UserProfile | null>(null);
  const [previousParticipants, setPreviousParticipants] = useState<string[]>([]);
  const [remoteHasVideo, setRemoteHasVideo] = useState(type === 'video');
  
  useEffect(() => {
    if (call?.participants) {
      const joined = call.participants.filter(p => !previousParticipants.includes(p) && p !== currentUser.uid);
      if (joined.length > 0) {
        joined.forEach(userId => {
          const user = allUsers.find(u => u.uid === userId);
          if (user) {
            showToast(`${user.displayName} entrou na chamada`, "info");
          }
        });
      }
      setPreviousParticipants(call.participants);
    }
  }, [call?.participants]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const processingRef = useRef<boolean>(false);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  // Sync local stream to video element
  useEffect(() => {
    if (videoRef.current && streamRef.current && isVideoOn) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isVideoOn, connectionStatus]);

  // Sync remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current && connectionStatus === 'connected') {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [connectionStatus, type]);

  // Initialize WebRTC
  useEffect(() => {
    let pc: RTCPeerConnection | null = null;
    let unsubscribeSignaling: (() => void) | null = null;
    let unsubscribeIce: (() => void) | null = null;

    const initWebRTC = async () => {
      if (pcRef.current) return; // Already initialized

      let stream: MediaStream;
      try {
        const videoConstraints = type === 'video' ? { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        } : false;
        
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: true
        });
        streamRef.current = stream;
        setConnectionStatus('connecting');
      } catch (err: any) {
        console.warn("First getUserMedia attempt failed, retrying with fallbacks:", err);
        try {
          // Fallback to basic audio/video or just audio if video fails
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
          streamRef.current = stream;
          setIsVideoOn(false);
          setConnectionStatus('connecting');
          showToast("A câmera não pôde ser iniciada. Conectando com áudio apenas.", "info");
        } catch (innerErr: any) {
          console.error("Error accessing media devices after fallback:", innerErr);
          let errorMessage = "Erro ao acessar a câmera ou microfone.";
          if (innerErr.name === 'NotAllowedError') {
            errorMessage = "Permissão negada. Por favor, permita o acesso à câmera e microfone.";
          } else if (innerErr.name === 'NotFoundError') {
            errorMessage = "Câmera ou microfone não encontrados.";
          }
          showToast(errorMessage, "error");
          setConnectionStatus('failed');
          return;
        }
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

      // Ensure there's a video transceiver even for voice calls so screen sharing works
      if (pcRef.current && pcRef.current.signalingState !== 'closed') {
        const hasVideo = streamRef.current ? streamRef.current.getVideoTracks().length > 0 : false;
        if (!hasVideo) {
          pcRef.current.addTransceiver('video', { direction: 'sendrecv' });
        }
      }

      // Remote Stream
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;

      pc.ontrack = (event) => {
        console.log("Remote track received:", event.track.kind);
        if (event.track.kind === 'video') {
           setRemoteHasVideo(true);
           event.track.onunmute = () => setRemoteHasVideo(true);
           event.track.onmute = () => setRemoteHasVideo(false);
        }

        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        } else {
          // Fallback if streams are not provided
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
          }
          remoteStreamRef.current.addTrack(event.track);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
        setConnectionStatus('connected');
      };

      pc.oniceconnectionstatechange = () => {
        const currentPc = pcRef.current;
        if (!currentPc) return;
        console.log("ICE Connection State:", currentPc.iceConnectionState);
        if (currentPc.iceConnectionState === 'connected' || currentPc.iceConnectionState === 'completed') {
          setConnectionStatus('connected');
        } else if (currentPc.iceConnectionState === 'disconnected') {
          setConnectionStatus('disconnected');
        } else if (currentPc.iceConnectionState === 'failed' || currentPc.iceConnectionState === 'closed') {
          setConnectionStatus('failed');
        }
      };

      pc.onicecandidate = (event) => {
        const currentPc = pcRef.current;
        if (event.candidate && currentPc && currentPc.localDescription) {
          const role = currentPc.localDescription.type === 'offer' ? 'caller' : 'callee';
          addIceCandidate(callId, event.candidate.toJSON(), role);
        }
      };

      // Signaling
      unsubscribeSignaling = listenForSignaling(callId, async (data) => {
        setCall({ id: callId, ...data } as Call);
        const currentPc = pcRef.current;
        if (!currentPc || currentPc.signalingState === 'closed' || processingRef.current) return;

        try {
          processingRef.current = true;
          // If I am the caller and I get an answer
          if (data.callerId === currentUser.uid) {
            if (!data.offer && currentPc.signalingState === 'stable') {
              const offerDescription = await currentPc.createOffer();
              await currentPc.setLocalDescription(offerDescription);
              await saveOffer(callId, {
                type: offerDescription.type,
                sdp: offerDescription.sdp
              });

              // Start listening for callee candidates
              if (!unsubscribeIce) {
                unsubscribeIce = listenForIceCandidates(callId, 'callee', (candidate) => {
                  const pcNow = pcRef.current;
                  if (pcNow && pcNow.signalingState !== 'closed' && candidate) {
                    if (pcNow.remoteDescription) {
                      pcNow.addIceCandidate(candidate).catch(e => console.error("Error adding callee ICE candidate:", e));
                    } else {
                      iceCandidatesQueue.current.push(candidate);
                    }
                  }
                });
              }
            } else if (data.answer && currentPc.signalingState === 'have-local-offer') {
              const answerDescription = new RTCSessionDescription(data.answer);
              await currentPc.setRemoteDescription(answerDescription);
              
              // Process queued candidates
              while (iceCandidatesQueue.current.length > 0) {
                const cand = iceCandidatesQueue.current.shift();
                if (cand) currentPc.addIceCandidate(cand).catch(e => console.error("Error adding queued callee ICE candidate:", e));
              }
            }
          }

          // If I am NOT the caller and I get an offer
          if (data.callerId !== currentUser.uid && data.offer && currentPc.signalingState === 'stable') {
            const offerDescription = new RTCSessionDescription(data.offer);
            await currentPc.setRemoteDescription(offerDescription);

            const answerDescription = await currentPc.createAnswer();
            await currentPc.setLocalDescription(answerDescription);
            await saveAnswer(callId, {
              type: answerDescription.type,
              sdp: answerDescription.sdp
            });

            // Process queued candidates
            while (iceCandidatesQueue.current.length > 0) {
              const cand = iceCandidatesQueue.current.shift();
              if (cand) currentPc.addIceCandidate(cand).catch(e => console.error("Error adding queued caller ICE candidate:", e));
            }

            // Start listening for caller candidates
            if (!unsubscribeIce) {
              unsubscribeIce = listenForIceCandidates(callId, 'caller', (candidate) => {
                const pcNow = pcRef.current;
                if (pcNow && pcNow.signalingState !== 'closed' && candidate) {
                  if (pcNow.remoteDescription) {
                    pcNow.addIceCandidate(candidate).catch(e => console.error("Error adding caller ICE candidate:", e));
                  } else {
                    iceCandidatesQueue.current.push(candidate);
                  }
                }
              });
            }
          }
        } catch (err) {
          console.error("Signaling error:", err);
        } finally {
          processingRef.current = false;
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
          if (!navigator.mediaDevices.getDisplayMedia) {
            console.error("Compartilhamento de tela não é suportado neste navegador ou dispositivo.");
            setIsScreenSharing(false);
            return;
          }
          const stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: true,
            audio: true
          });
          screenStreamRef.current = stream;
          if (screenVideoRef.current && stream) {
            screenVideoRef.current.srcObject = stream;
          }
          
          // In a real app, we would replace the video track in the peer connection
          if (pcRef.current) {
            const videoTrack = stream.getVideoTracks()[0];
            const transceiver = pcRef.current.getTransceivers().find(t => t.receiver.track.kind === 'video');
            if (transceiver && transceiver.sender) {
              transceiver.sender.replaceTrack(videoTrack);
            }
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
          if (pcRef.current) {
            const videoTrack = streamRef.current ? streamRef.current.getVideoTracks()[0] : null;
            const transceiver = pcRef.current.getTransceivers().find(t => t.receiver.track.kind === 'video');
            if (transceiver && transceiver.sender) {
              transceiver.sender.replaceTrack(videoTrack || null);
            }
          }
        }
      }
    };

    startScreenShare();
  }, [isScreenSharing]);

  // For visual purposes, show all participants
  const callParticipants = React.useMemo(() => {
    if (!call?.participants) return [currentUser];
    return call.participants
      .map(uid => allUsers.find(u => u.uid === uid))
      .filter((u): u is UserProfile => !!u);
  }, [call?.participants, allUsers, currentUser]);
  
  const totalParticipants = callParticipants.length;

  const channelMembers = (allUsers || []).filter(u => channel.members.includes(u.uid));
  const currentParticipantsIds = call?.participants || [];

  const handleInvite = async (userId: string) => {
    try {
      await inviteMemberToCall(callId, userId);
      showToast("Convite enviado!", "success");
      setShowInviteModal(false);
    } catch (err) {
      console.error("Error inviting member:", err);
      showToast("Erro ao convidar membro.", "error");
    }
  };

  return (
    <div className="flex flex-col h-full bg-black border-b border-border-primary relative overflow-hidden">
      {viewingProfileUser && (
        <UserProfileModal
          user={viewingProfileUser}
          currentUser={currentUser}
          isOpen={!!viewingProfileUser}
          onClose={() => setViewingProfileUser(null)}
        />
      )}
      {showInviteModal && (
        <InviteMemberModal
          members={channelMembers}
          currentParticipants={currentParticipantsIds}
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInvite}
        />
      )}
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
            <span>Chamada de {type === 'video' ? 'Vídeo' : 'Voz'} - {channel.name} ({totalParticipants} participantes)</span>
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
              ref={(el) => {
                if (el && screenStreamRef.current) {
                  el.srcObject = screenStreamRef.current;
                }
              }}
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
            const otherParticipants = (call?.participants || []).filter(p => p !== currentUser.uid);
            const isRemotePeer = !!(call && (
               user.uid === call.calleeId || 
               (currentUser.uid === call.calleeId && user.uid === call.callerId) ||
               (otherParticipants.length === 1 && otherParticipants[0] === user.uid)
            ));
            
            return (
              <div 
                key={user.uid} 
                onClick={() => setViewingProfileUser(user)}
                className={cn(
                  "relative flex-1 min-w-[200px] max-w-[400px] aspect-video bg-bg-tertiary rounded-xl flex items-center justify-center overflow-hidden transition-all duration-200",
                  "ring-1 ring-border-primary cursor-pointer hover:ring-color-brand"
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
                      style={{ filter: videoEffect }}
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
                  isRemotePeer && connectionStatus === 'connected' && (type === 'video' || remoteHasVideo) ? (
                    <video 
                      ref={(el) => {
                        if (el && remoteStreamRef.current) {
                          el.srcObject = remoteStreamRef.current;
                        }
                      }}
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
                      {!isRemotePeer && (
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/60 py-0.5">
                          <span className="text-[9px] text-white opacity-85">Sem vídeo</span>
                        </div>
                      )}
                      {isRemotePeer && connectionStatus !== 'connected' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                          <span className="text-[10px] text-white bg-black/50 px-1 py-0.5 rounded">Conectando...</span>
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
                {isMe && isScreenSharing && screenStreamRef.current?.active && <span title="Compartilhando Tela"><MonitorUp className="w-3 h-3 text-[#23a559]" /></span>}
                {!isMe && isRemotePeer && remoteHasVideo && remoteStreamRef.current?.getVideoTracks().some(t => t.label.toLowerCase().includes('screen') || t.label.toLowerCase().includes('monitor')) && <span title="Compartilhando Tela"><MonitorUp className="w-3 h-3 text-[#23a559]" /></span>}
                {!isMe && connectionStatus !== 'connected' && <span className="text-[10px] text-[#f2bc1b]">Conectando...</span>}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Controls */}
      <div className="h-20 bg-bg-overlay flex items-center justify-center space-x-4 px-4">
        {isVideoOn && (
          <button
            onClick={() => {
              const effects = ['none', 'grayscale(100%)', 'sepia(100%)', 'invert(100%)', 'hue-rotate(90deg)'];
              const nextEffect = effects[(effects.indexOf(videoEffect) + 1) % effects.length];
              setVideoEffect(nextEffect);
            }}
            className="p-3 bg-bg-secondary hover:bg-bg-tertiary text-white rounded-full transition-colors"
            title="Alternar Efeitos"
          >
            <Sparkles className="w-6 h-6" />
          </button>
        )}
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
        
        <button
          onClick={() => setShowInviteModal(true)}
          className="p-3 bg-bg-secondary hover:bg-bg-tertiary text-white rounded-full transition-colors"
          title="Convidar Membros"
        >
          <UserPlus className="w-6 h-6" />
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
