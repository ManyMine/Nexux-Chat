import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Call, UserProfile, Channel, Message } from './types';
import { USERS_COLLECTION, CHANNELS_COLLECTION, MESSAGES_COLLECTION, DEFAULT_AVATAR } from './constants';
import { Login } from './components/Auth/Login';
import { SignUp } from './components/Auth/SignUp';
import { ForgotPassword } from './components/Auth/ForgotPassword';
import { ChatLayout } from './components/Chat/ChatLayout';
import { Onboarding } from './components/Onboarding';
import { IncomingCallModal } from './components/Chat/IncomingCallModal';
import { AdhdReminders } from './components/AdhdReminders';
import { useAccessibility } from './contexts/AccessibilityContext';
import { useToast } from './context/ToastContext';
import { 
  signUp, 
  signIn, 
  logOut, 
  resetPassword, 
  getChannels, 
  getMessages, 
  sendMessage,
  createChannel,
  createPrivateChannel,
  getUsers,
  signInWithGoogle,
  signInAnonymously,
  updateUserStatus,
  uploadFile,
  startTyping,
  stopTyping,
  getTypingUsers,
  startCall,
  updateCallStatus,
  listenForIncomingCalls,
  setupRecaptcha,
  requestPhoneCode,
  verifyPhoneCode,
  clearRecaptcha,
  updateChannel
} from './services/firebaseService';
import { Loader2 } from 'lucide-react';
import { ConfirmationResult } from 'firebase/auth';

type View = 'login' | 'signup' | 'forgot-password' | 'chat';

export default function App() {
  const { settings } = useAccessibility();
  const { showToast } = useToast();
  const [view, setView] = useState<View>('login');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Only show onboarding for users who created their account in the last 10 minutes
    // and haven't completed it yet (checked via Firestore and localStorage)
    const isNewAccount = currentUser && (Date.now() - currentUser.createdAt < 600000);
    if (currentUser && !currentUser.onboardingCompleted && !localStorage.getItem('onboardingCompleted') && isNewAccount) {
      setShowOnboarding(true);
    }
  }, [currentUser]);

  const handleOnboardingCallback = async (data: any) => {
    if (data.status === 'finished' || data.status === 'skipped') {
      setShowOnboarding(false);
      localStorage.setItem('onboardingCompleted', 'true');
      if (currentUser) {
        try {
          await setDoc(doc(db, USERS_COLLECTION, currentUser.uid), { onboardingCompleted: true }, { merge: true });
        } catch (error) {
          console.error("Error updating onboarding status:", error);
        }
      }
    }
  };
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isResetSuccess, setIsResetSuccess] = useState(false);
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Call State
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<{ id: string, type: 'voice' | 'video', channel: Channel } | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Theme persistence
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // Keep localStorage in sync with theme state
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Zoom persistence
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('zoom');
    return saved ? parseInt(saved) : 100;
  });

  // Keep localStorage in sync with zoom state
  useEffect(() => {
    localStorage.setItem('zoom', zoom.toString());
  }, [zoom]);

  // Sync zoom from currentUser
  useEffect(() => {
    if (currentUser?.zoom) {
      setZoom(currentUser.zoom);
    }
  }, [currentUser?.zoom]);

  // Auth Listener
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Set up real-time listener for user profile
        unsubscribeProfile = onSnapshot(doc(db, USERS_COLLECTION, user.uid), async (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.data() as UserProfile;
            
            // Force admin role for belepuff@gmail.com if not already set
            if (user.email === 'belepuff@gmail.com' && userData.role !== 'admin') {
              await setDoc(doc(db, USERS_COLLECTION, user.uid), { role: 'admin' }, { merge: true });
              return; // The listener will trigger again
            }

            if (userData.isBlocked) {
              setAuthError("Sua conta foi bloqueada por um administrador.");
              await logOut();
              setView('login');
              setIsLoading(false);
              return;
            }

            if (userData.isDeactivated) {
              setAuthError("Sua conta está desativada. Entre em contato com o suporte.");
              await logOut();
              setView('login');
              setIsLoading(false);
              return;
            }

            const currentTheme = userData.theme || 'dark';
            setTheme(currentTheme);
            localStorage.setItem('theme', currentTheme);

            setCurrentUser(userData);
            await updateUserStatus(user.uid, 'online');
            setView('chat');
          } else {
            // Create profile if missing
            const profile: UserProfile = {
              uid: user.uid,
              email: user.email || undefined,
              displayName: user.displayName || 'Usuário',
              photoURL: user.photoURL || undefined,
              status: 'online',
              createdAt: Date.now(),
              role: user.email === 'belepuff@gmail.com' ? 'admin' : 'user',
              isBlocked: false
            };
            await setDoc(doc(db, USERS_COLLECTION, user.uid), profile);
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setAuthError("Erro ao carregar perfil do usuário.");
          setIsLoading(false);
        });
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setCurrentUser(null);
        setView('login');
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Channels Listener
  useEffect(() => {
    if (currentUser && view === 'chat') {
      const unsubscribe = getChannels((fetchedChannels) => {
        // Filter channels: show public ones, categories, OR private ones where user is a member
        const filtered = fetchedChannels.filter(c => 
          c.type === 'public' || 
          c.type === 'category' || 
          (c.members && c.members.includes(currentUser.uid))
        );
        
        setChannels(filtered);
        
        // Auto-select first channel if none active
        if (filtered.length > 0 && !activeChannel) {
          setActiveChannel(filtered[0]);
        }
        
        // If no channels exist, create a default one
        if (fetchedChannels.length === 0) {
          createChannel('geral', 'public', currentUser.uid);
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser, view, activeChannel]);

  // Update activeChannel if it changes in the channels list
  useEffect(() => {
    if (activeChannel && channels.length > 0) {
      const updatedChannel = channels.find(c => c.id === activeChannel.id);
      if (updatedChannel && JSON.stringify(updatedChannel) !== JSON.stringify(activeChannel)) {
        setActiveChannel(updatedChannel);
      }
    }
  }, [channels, activeChannel]);

  // Messages Listener
  useEffect(() => {
    if (activeChannel && currentUser) {
      setIsLoadingMessages(true);
      
      // Clear unread for this channel
      setUnreadChannels(prev => {
        const next = new Set(prev);
        next.delete(activeChannel.id);
        return next;
      });

      const unsubscribe = getMessages(activeChannel.id, (fetchedMessages) => {
        setMessages(fetchedMessages);
        setIsLoadingMessages(false);
      });
      return () => unsubscribe();
    }
  }, [activeChannel, currentUser]);

  // Global Messages Listener for Notifications
  useEffect(() => {
    if (!currentUser || channels.length === 0) return;

    const mountTime = Date.now();

    const unsubscribes = channels.map(channel => {
      const q = query(
        collection(db, CHANNELS_COLLECTION, channel.id, MESSAGES_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      let isFirstRun = true;

      return onSnapshot(q, (snapshot) => {
        if (isFirstRun) {
          isFirstRun = false;
          return;
        }
        
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const msg = change.doc.data() as Message;
            if (msg.senderId !== currentUser.uid && msg.timestamp > mountTime) {
              const isWatchingActiveChannel = activeChannel?.id === channel.id && !document.hidden;
              
              if (!isWatchingActiveChannel) {
                // Add to unread set
                setUnreadChannels(prev => new Set(prev).add(channel.id));

                // Internal toast notification instead of browser notification
                showToast(
                  `Nova mensagem em ${channel.type === 'private' ? 'Mensagem Direta' : channel.name}: ${msg.content}`,
                  'info'
                );
              }
            }
          }
        });
      }, (error) => {
        console.error(`Error listening to messages in channel ${channel.id}:`, error);
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [channels, currentUser, activeChannel, showToast]);

  // Users Listener
  useEffect(() => {
    if (currentUser && view === 'chat') {
      const q = query(collection(db, USERS_COLLECTION));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
        
        // Filter users: hide private accounts unless they share a channel with the current user
        const conversingUserIds = new Set(channels.flatMap(c => c.members || []));
        
        setAllUsers(usersData.filter(u => {
          if (u.uid === currentUser.uid) return false;
          if (u.isPrivate && !conversingUserIds.has(u.uid)) return false;
          return true;
        }));
      });
      return () => unsubscribe();
    }
  }, [currentUser, view, channels]);

  // Incoming Calls Listener
  useEffect(() => {
    if (currentUser && view === 'chat') {
      const unsubscribe = listenForIncomingCalls(currentUser.uid, (call) => {
        if (call.callerId !== currentUser.uid) {
          setIncomingCall(call);
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser, view]);

  // Typing Listener
  useEffect(() => {
    if (activeChannel && currentUser) {
      const unsubscribe = getTypingUsers(activeChannel.id, (users) => {
        setTypingUsers(users.filter(u => u !== currentUser.displayName));
      });
      return () => unsubscribe();
    } else {
      setTypingUsers([]);
    }
  }, [activeChannel, currentUser]);


  const handleLogin = async (values: any) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const userProfile = await signIn(values.identifier, values.password);
      if (userProfile.isBlocked) {
        setAuthError("Sua conta foi bloqueada por um administrador.");
        await logOut();
      }
    } catch (error: any) {
      setAuthError(error.message || "Erro ao fazer login.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const userProfile = await signInWithGoogle();
      if (userProfile.isBlocked) {
        setAuthError("Sua conta foi bloqueada por um administrador.");
        await logOut();
      }
    } catch (error: any) {
      console.error("Google Login Error:", error);
      setAuthError('Ocorreu um erro ao fazer login com o Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async (phoneNumber: string, code: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (!confirmationResult) {
        // Step 1: Request code
        let appVerifier = (window as any).recaptchaVerifier;
        if (!appVerifier) {
          appVerifier = await setupRecaptcha('recaptcha-container');
        }
        const result = await requestPhoneCode(phoneNumber.trim(), appVerifier);
        setConfirmationResult(result);
      } else {
        // Step 2: Verify code
        const userProfile = await verifyPhoneCode(confirmationResult, code);
        if (userProfile.isBlocked) {
          setAuthError("Sua conta foi bloqueada por um administrador.");
          await logOut();
        }
        setConfirmationResult(null);
      }
    } catch (error: any) {
      console.error("Phone Login Error:", error);
      if (error.code === 'auth/invalid-phone-number') {
        setAuthError('Número de telefone inválido.');
      } else if (error.code === 'auth/too-many-requests') {
        setAuthError('Muitas solicitações. Tente novamente mais tarde.');
      } else if (error.code === 'auth/invalid-verification-code') {
        setAuthError('Código de verificação inválido.');
      } else if (error.code === 'auth/internal-error') {
        setAuthError('Erro interno do Firebase. Isso geralmente ocorre por número mal formatado ou se o domínio não está autorizado. Tente recarregar a página.');
      } else if (error.code === 'auth/network-request-failed') {
        setAuthError('Erro de rede. Verifique sua conexão ou desative bloqueadores de anúncios (AdBlock) que podem estar impedindo o carregamento do reCAPTCHA.');
      } else {
        setAuthError('Ocorreu um erro ao fazer login com o telefone.');
      }
      // Reset recaptcha if error
      clearRecaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInAnonymously();
    } catch (error: any) {
      console.error("Anonymous Login Error:", error);
      if (error.code === 'auth/admin-restricted-operation') {
        setAuthError('O Login Anônimo não está ativado no Console do Firebase. Por favor, ative-o em Authentication > Sign-in method.');
      } else {
        setAuthError('Ocorreu um erro ao entrar como visitante.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (values: any) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const { email, password, displayName, ...extra } = values;
      await signUp(email, password, displayName, extra);
    } catch (error: any) {
      console.error("Sign Up Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('Este e-mail já está em uso.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError('O registro com e-mail e senha não está habilitado. Por favor, use o login com Google ou habilite no console do Firebase.');
      } else {
        setAuthError(error.message || "Erro ao criar conta.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (values: any) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await resetPassword(values.email);
      setIsResetSuccess(true);
    } catch (error: any) {
      setAuthError(error.message || "Erro ao enviar e-mail de recuperação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTyping = async () => {
    if (activeChannel && currentUser) {
      await startTyping(activeChannel.id, currentUser.uid, currentUser.displayName);
    }
  };

  const handleStopTyping = async () => {
    if (activeChannel && currentUser) {
      await stopTyping(activeChannel.id, currentUser.uid);
    }
  };

  const handleSelectUser = async (selectedUser: UserProfile) => {
    if (!currentUser) return;
    const newChannel = await createPrivateChannel(currentUser.uid, selectedUser.uid);
    setActiveChannel(newChannel);
  };

  const handleStartCall = async (video: boolean) => {
    if (!activeChannel || !currentUser) return;
    
    try {
      // Ensure participants include both users for private channels
      const participants = activeChannel.type === 'private' 
        ? activeChannel.members 
        : [currentUser.uid]; // For public channels, just the caller for now

      const callId = await startCall(
        activeChannel.id, 
        currentUser, 
        participants, 
        video ? 'video' : 'voice'
      );
      setActiveCall({ id: callId, type: video ? 'video' : 'voice', channel: activeChannel });
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    
    try {
      await updateCallStatus(incomingCall.id, 'ongoing');
      const channel = channels.find(c => c.id === incomingCall.channelId);
      if (channel) {
        setActiveCall({ id: incomingCall.id, type: incomingCall.type, channel });
        setActiveChannel(channel);
      }
      setIncomingCall(null);
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    
    try {
      await updateCallStatus(incomingCall.id, 'declined');
      setIncomingCall(null);
    } catch (error) {
      console.error("Error declining call:", error);
    }
  };

  const handleEndCall = async () => {
    if (activeCall) {
      try {
        await updateCallStatus(activeCall.id, 'ended');
      } catch (error) {
        console.error("Error ending call:", error);
      }
    }
    setActiveCall(null);
  };

  const handleSendMessage = async (content: string, file?: File) => {
    if (activeChannel && currentUser) {
      try {
        let fileUrl: string | undefined;
        let fileType: string | undefined;
        if (file) {
          console.log("Sending file:", file.name, file.type, file.size);
          fileUrl = await uploadFile(file, `messages/${activeChannel.id}/${Date.now()}_${file.name}`);
          fileType = file.type;
          console.log("File uploaded:", fileUrl, fileType);
        }
        // Replace newlines with <br/> or ensure whitespace is preserved in CSS
        await sendMessage(activeChannel.id, currentUser, content, fileUrl, fileType);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const handleClearUnreads = (channelIds: string[]) => {
    setUnreadChannels(prev => {
      const next = new Set(prev);
      channelIds.forEach(id => next.delete(id));
      return next;
    });
  };

  const handleMuteChannels = async (channelIds: string[], mute: boolean) => {
    if (!currentUser) return;
    try {
      for (const id of channelIds) {
        const channel = channels.find(c => c.id === id);
        if (channel) {
          const mutedBy = channel.mutedBy || [];
          const newMutedBy = mute 
            ? [...new Set([...mutedBy, currentUser.uid])]
            : mutedBy.filter(uid => uid !== currentUser.uid);
          
          await updateChannel(id, { mutedBy: newMutedBy });
        }
      }
    } catch (error) {
      console.error("Error muting channels:", error);
    }
  };

  // Anonymous session timer
  useEffect(() => {
    if (currentUser?.isAnonymous && currentUser.expiresAt) {
      const checkExpiration = () => {
        const now = Date.now();
        if (now >= currentUser.expiresAt!) {
          logOut();
          setAuthError("Sua sessão de visitante de 30 minutos expirou.");
          setView('login');
        }
      };

      const interval = setInterval(checkExpiration, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Dynamic Styles
  const { customStyles, backgroundStyles, currentBg } = React.useMemo(() => {
    if (!currentUser) return { customStyles: {}, backgroundStyles: {}, currentBg: null };
    
    const uiStyles: any = {};
    const bgStyles: any = {};
    
    if (currentUser.primaryColor) {
      uiStyles['--brand'] = currentUser.primaryColor;
      uiStyles['--brand-hover'] = currentUser.primaryColor + 'dd';
    }

    if (currentUser.accentColor) {
      uiStyles['--accent'] = currentUser.accentColor;
    }
    
    const activeBg = currentUser.background;

    if (activeBg) {
      const isDark = theme === 'dark';
      const hasMediaBg = activeBg.type === 'video' || activeBg.type === 'gif' || activeBg.type === 'image';
      const isGradientOrPattern = activeBg.type === 'gradient' || activeBg.type === 'pattern';
      
      if (activeBg.type === 'color') {
        bgStyles['backgroundColor'] = activeBg.value;
      } else if (activeBg.type === 'gradient') {
        bgStyles['background'] = activeBg.value;
      } else if (activeBg.type === 'pattern') {
        // Simple CSS patterns
        const patterns: Record<string, string> = {
          'dots': 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          'lines': 'linear-gradient(45deg, currentColor 1px, transparent 1px)',
          'grid': 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)'
        };
        const patternBase = patterns[activeBg.patternId || 'dots'];
        bgStyles['backgroundImage'] = patternBase;
        bgStyles['backgroundSize'] = '20px 20px';
        bgStyles['color'] = activeBg.patternColor || (isDark ? '#ffffff11' : '#00000011'); // Pattern color
        bgStyles['backgroundColor'] = isDark ? '#313338' : '#ffffff'; // Base color for pattern
      }

      // If there's a custom background, make the UI elements semi-transparent
      const baseAlpha = hasMediaBg || activeBg.type === 'color' || isGradientOrPattern ? 'cc' : ''; // 80% opacity
      
      if (baseAlpha) {
        if (isDark) {
          uiStyles['--bg-primary'] = '#313338' + baseAlpha;
          uiStyles['--bg-secondary'] = '#2b2d31' + baseAlpha;
          uiStyles['--bg-tertiary'] = '#1e1f22' + baseAlpha;
          uiStyles['--bg-overlay'] = '#111214' + baseAlpha;
        } else {
          uiStyles['--bg-primary'] = '#ffffff' + baseAlpha;
          uiStyles['--bg-secondary'] = '#f2f3f5' + baseAlpha;
          uiStyles['--bg-tertiary'] = '#e3e5e8' + baseAlpha;
          uiStyles['--bg-overlay'] = '#ebedef' + baseAlpha;
        }
      }

      // Apply brightness and contrast to the background layer
      const filters = [];
      if (activeBg.brightness !== undefined) {
        filters.push(`brightness(${activeBg.brightness}%)`);
      }
      if (activeBg.contrast !== undefined) {
        filters.push(`contrast(${activeBg.contrast}%)`);
      }
      if (filters.length > 0) {
        bgStyles['filter'] = filters.join(' ');
      }
      
      // Apply opacity to the background layer
      if (activeBg.opacity !== undefined) {
        bgStyles['opacity'] = activeBg.opacity / 100;
      } else {
        bgStyles['opacity'] = 0.3; // Default opacity
      }
    }
    
    return { customStyles: uiStyles, backgroundStyles: bgStyles, currentBg: activeBg };
  }, [currentUser, theme]);

  const themeClass = theme === 'light' ? 'light' : '';

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  if (isLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#5865f2] animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ ...customStyles, zoom: `${zoom}%`, minHeight: `${10000 / zoom}vh` }} className={`min-h-screen ${themeClass} transition-colors duration-300`}>
      <AdhdReminders />
      {settings.autismTheme && (
        <div className="fixed inset-0 z-[9999] pointer-events-none opacity-20 overflow-hidden">
          <img 
            src="https://estimated-peach-vlbu9z5ryi.edgeone.app/copilot_image_1776130502581.jpeg" 
            alt="Autism Theme Overlay" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      {currentBg?.type && (
        <div 
          className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none"
          style={backgroundStyles}
        >
          {['video', 'gif', 'image'].includes(currentBg.type) && currentBg.value?.trim() && (
            currentBg.type === 'video' ? (
              <video 
                key={currentBg.value}
                autoPlay 
                muted 
                loop 
                playsInline 
                className="w-full h-full object-cover"
              >
                <source src={currentBg.value || undefined} />
              </video>
            ) : (
              <img 
                src={currentBg.value || undefined} 
                alt="background" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )
          )}
        </div>
      )}
      {view === 'login' && (
        <Login 
          onLogin={handleLogin}
          onSignUpClick={() => setView('signup')}
          onForgotPasswordClick={() => setView('forgot-password')}
          onGoogleLogin={handleGoogleLogin}
          onPhoneLogin={handlePhoneLogin}
          onAnonymousLogin={handleAnonymousLogin}
          isLoading={isLoading}
          error={authError}
          step={confirmationResult ? 'code' : 'phone'}
        />
      )}
      {view === 'signup' && (
        <SignUp 
          onSignUp={handleSignUp}
          onLoginClick={() => setView('login')}
          onGoogleLogin={handleGoogleLogin}
          isLoading={isLoading}
          error={authError}
        />
      )}
      {view === 'forgot-password' && (
        <ForgotPassword 
          onReset={handleResetPassword}
          onBackToLogin={() => {
            setView('login');
            setIsResetSuccess(false);
          }}
          isLoading={isLoading}
          error={authError}
          success={isResetSuccess}
        />
      )}
      {view === 'chat' && currentUser && (
        <>
          <Onboarding run={showOnboarding} onCallback={handleOnboardingCallback} />
          <ChatLayout 
            currentUser={currentUser}
            channels={channels}
            activeChannel={activeChannel}
            unreadChannels={unreadChannels}
            onChannelSelect={setActiveChannel}
            onLogout={logOut}
            onSendMessage={handleSendMessage}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            allUsers={allUsers}
            typingUsers={typingUsers}
            onStartTyping={handleStartTyping}
            onStopTyping={handleStopTyping}
            onSelectUser={handleSelectUser}
            activeCall={activeCall}
            onStartCall={handleStartCall}
            onEndCall={handleEndCall}
            onClearUnreads={handleClearUnreads}
            onMuteChannels={handleMuteChannels}
          />
        </>
      )}
      
      <IncomingCallModal 
        call={incomingCall}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    </div>
  );
}

