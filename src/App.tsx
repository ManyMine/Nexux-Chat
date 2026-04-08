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
import { IncomingCallModal } from './components/Chat/IncomingCallModal';
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
  updateUserStatus,
  uploadFile,
  startTyping,
  stopTyping,
  getTypingUsers,
  startCall,
  updateCallStatus,
  listenForIncomingCalls
} from './services/firebaseService';
import { Loader2 } from 'lucide-react';

type View = 'login' | 'signup' | 'forgot-password' | 'chat';

export default function App() {
  const [view, setView] = useState<View>('login');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
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

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            
            // Force admin role for belepuff@gmail.com if not already set
            if (user.email === 'belepuff@gmail.com' && userData.role !== 'admin') {
              userData.role = 'admin';
              await setDoc(doc(db, USERS_COLLECTION, user.uid), { role: 'admin' }, { merge: true });
            }

            if (userData.isBlocked) {
              setAuthError("Sua conta foi bloqueada por um administrador.");
              await logOut();
              setView('login');
              setIsLoading(false);
              return;
            }
            setCurrentUser(userData);
            await updateUserStatus(user.uid, 'online');
            const users = await getUsers();
            setAllUsers(users.filter(u => u.uid !== user.uid));
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
            setCurrentUser(profile);
          }
          setView('chat');
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setAuthError("Erro ao carregar perfil do usuário.");
        }
      } else {
        setCurrentUser(null);
        setView('login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Channels Listener
  useEffect(() => {
    if (currentUser && view === 'chat') {
      const unsubscribe = getChannels((fetchedChannels) => {
        // Filter channels: show public ones OR private ones where user is a member
        const filtered = fetchedChannels.filter(c => 
          c.type === 'public' || (c.members && c.members.includes(currentUser.uid))
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

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

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

                // Browser notification
                if (Notification.permission === 'granted') {
                  new Notification(`Nova mensagem em ${channel.type === 'private' ? 'Mensagem Direta' : channel.name}`, {
                    body: `${msg.senderName}: ${msg.content}`,
                    icon: msg.senderPhoto || DEFAULT_AVATAR
                  });
                }
              }
            }
          }
        });
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [channels, currentUser, activeChannel]);

  // Users Listener
  useEffect(() => {
    if (currentUser && view === 'chat') {
      const q = query(collection(db, USERS_COLLECTION));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
        setAllUsers(usersData.filter(u => u.uid !== currentUser.uid));
      });
      return () => unsubscribe();
    }
  }, [currentUser, view]);

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
          fileUrl = await uploadFile(file, `messages/${activeChannel.id}/${Date.now()}_${file.name}`);
          fileType = file.type;
        }
        // Replace newlines with <br/> or ensure whitespace is preserved in CSS
        await sendMessage(activeChannel.id, currentUser, content, fileUrl, fileType);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const backgroundStyle = currentUser?.background?.type === 'color' 
    ? { backgroundColor: currentUser.background.value } 
    : {};

  const themeClass = currentUser?.theme === 'light' ? 'light' : '';

  if (isLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#5865f2] animate-spin" />
      </div>
    );
  }

  return (
    <div style={backgroundStyle} className={`min-h-screen ${themeClass}`}>
      {currentUser?.background?.type === 'video' || currentUser?.background?.type === 'gif' ? (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
          {currentUser.background.type === 'video' ? (
            <video 
              autoPlay 
              muted 
              loop 
              playsInline 
              className="w-full h-full object-cover opacity-30"
            >
              <source src={currentUser.background.value} />
            </video>
          ) : (
            <img 
              src={currentUser.background.value} 
              alt="background" 
              className="w-full h-full object-cover opacity-30"
            />
          )}
        </div>
      ) : null}
      {view === 'login' && (
        <Login 
          onLogin={handleLogin}
          onSignUpClick={() => setView('signup')}
          onForgotPasswordClick={() => setView('forgot-password')}
          onGoogleLogin={handleGoogleLogin}
          isLoading={isLoading}
          error={authError}
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
        />
      )}
      
      <IncomingCallModal 
        call={incomingCall}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    </div>
  );
}

