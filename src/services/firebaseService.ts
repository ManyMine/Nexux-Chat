import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  updateDoc,
  deleteDoc,
  deleteField
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { UserProfile, Channel, Message, Call } from '../types';
import { CHANNELS_COLLECTION, MESSAGES_COLLECTION, USERS_COLLECTION, TYPING_COLLECTION, CALLS_COLLECTION } from '../constants';

export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

export const startTyping = async (channelId: string, userId: string, displayName: string) => {
  try {
    await setDoc(doc(db, TYPING_COLLECTION, channelId), { [userId]: displayName }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${TYPING_COLLECTION}/${channelId}`);
    throw error;
  }
};

export const stopTyping = async (channelId: string, userId: string) => {
  try {
    await updateDoc(doc(db, TYPING_COLLECTION, channelId), { [userId]: deleteField() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${TYPING_COLLECTION}/${channelId}`);
    throw error;
  }
};

export const getTypingUsers = (channelId: string, callback: (users: string[]) => void) => {
  return onSnapshot(doc(db, TYPING_COLLECTION, channelId), (snapshot) => {
    const data = snapshot.data();
    if (data) {
      callback(Object.values(data));
    } else {
      callback([]);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `${TYPING_COLLECTION}/${channelId}`);
  });
};

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Auth ---

export const signUp = async (email: string, password: string, displayName: string, extra?: { securityQuestion?: string; securityAnswer?: string; cpf?: string; phone?: string; username?: string }) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await updateProfile(user, { displayName });
    
    const userProfile: Partial<UserProfile> = {
      uid: user.uid,
      email: user.email!,
      displayName: displayName,
      status: 'online',
      createdAt: Date.now(),
      role: user.email === 'belepuff@gmail.com' ? 'admin' : 'user',
      isBlocked: false,
      isPrivate: false,
      canChat: true,
      ...extra
    };

    if (user.photoURL) {
      userProfile.photoURL = user.photoURL;
    }
    
    await setDoc(doc(db, USERS_COLLECTION, user.uid), userProfile);
    return userProfile as UserProfile;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Este e-mail já está em uso.');
    }
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.WRITE, USERS_COLLECTION);
    }
    throw error;
  }
};

export const signIn = async (identifier: string, password: string) => {
  let email = identifier;

  // If identifier is not an email, try to find the user by CPF, Phone, or Username
  if (!identifier.includes('@')) {
    const fields = ['cpf', 'phone', 'username'];
    for (const field of fields) {
      const q = query(collection(db, USERS_COLLECTION), where(field, '==', identifier), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        email = snapshot.docs[0].data().email;
        break;
      }
    }
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      if (user.email === 'belepuff@gmail.com' && userData.role !== 'admin') {
        userData.role = 'admin';
        await setDoc(doc(db, USERS_COLLECTION, user.uid), { role: 'admin' }, { merge: true });
      }
      return userData;
    }
    
    // Fallback if profile doesn't exist
    const userProfile: Partial<UserProfile> = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || 'Usuário',
      status: 'online',
      createdAt: Date.now(),
      role: user.email === 'belepuff@gmail.com' ? 'admin' : 'user',
      isBlocked: false,
      isPrivate: false,
      canChat: true
    };

    if (user.photoURL) {
      userProfile.photoURL = user.photoURL;
    }

    await setDoc(doc(db, USERS_COLLECTION, user.uid), userProfile);
    return userProfile as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, USERS_COLLECTION);
    throw error;
  }
};

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      if (user.email === 'belepuff@gmail.com' && userData.role !== 'admin') {
        userData.role = 'admin';
        await setDoc(doc(db, USERS_COLLECTION, user.uid), { role: 'admin' }, { merge: true });
      }
      return userData;
    }
    
    // Create profile if it doesn't exist
    const userProfile: Partial<UserProfile> = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || 'Usuário',
      status: 'online',
      createdAt: Date.now(),
      role: user.email === 'belepuff@gmail.com' ? 'admin' : 'user',
      isBlocked: false,
      isPrivate: false,
      canChat: true
    };

    if (user.photoURL) {
      userProfile.photoURL = user.photoURL;
    }

    await setDoc(doc(db, USERS_COLLECTION, user.uid), userProfile);
    return userProfile as UserProfile;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export const logOut = async () => {
  if (auth.currentUser) {
    try {
      await updateDoc(doc(db, USERS_COLLECTION, auth.currentUser.uid), { status: 'offline' });
    } catch (e) {
      console.error("Failed to set offline status", e);
    }
  }
  await signOut(auth);
};

export const updateUserStatus = async (userId: string, status: 'online' | 'offline' | 'away') => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
    throw error;
  }
};

export const toggleChatAccess = async (userId: string, canChat: boolean) => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), { canChat });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// --- Admin Functions ---

export const toggleUserBlock = async (userId: string, isBlocked: boolean) => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), { isBlocked });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
    throw error;
  }
};

export const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), { role });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
    throw error;
  }
};

export const updateUserPrivacy = async (userId: string, isPrivate: boolean) => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), { isPrivate });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, data: Partial<UserProfile>) => {
  try {
    const user = auth.currentUser;
    if (user && userId === user.uid) {
      if (data.displayName) {
        await updateProfile(user, { displayName: data.displayName });
      }
      if (data.photoURL) {
        await updateProfile(user, { photoURL: data.photoURL });
      }
    }
    await updateDoc(doc(db, USERS_COLLECTION, userId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
    throw error;
  }
};

export const updateUserPassword = async (password: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  try {
    const { updatePassword } = await import('firebase/auth');
    await updatePassword(user, password);
  } catch (error: any) {
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Esta operação requer um login recente. Por favor, saia e entre novamente.');
    }
    throw error;
  }
};

export const updateUserEmail = async (email: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  try {
    const { updateEmail } = await import('firebase/auth');
    await updateEmail(user, email);
    await updateDoc(doc(db, USERS_COLLECTION, user.uid), { email });
  } catch (error: any) {
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Esta operação requer um login recente. Por favor, saia e entre novamente.');
    }
    throw error;
  }
};

// --- Channels ---

export const getChannels = (callback: (channels: Channel[]) => void) => {
  const q = query(collection(db, CHANNELS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const channels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Channel));
    callback(channels);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, CHANNELS_COLLECTION);
  });
};

export const getUsers = async () => {
  const q = query(collection(db, USERS_COLLECTION));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
};

export const createPrivateChannel = async (user1Id: string, user2Id: string) => {
  const channelData: Omit<Channel, 'id'> = {
    name: `Private Chat`,
    type: 'private',
    createdBy: user1Id,
    createdAt: Date.now(),
    members: [user1Id, user2Id]
  };
  
  try {
    const docRef = await addDoc(collection(db, CHANNELS_COLLECTION), channelData);
    return { id: docRef.id, ...channelData } as Channel;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, CHANNELS_COLLECTION);
    throw error;
  }
};

export const createChannel = async (name: string, type: 'public' | 'private', creatorId: string) => {
  const channelData: Omit<Channel, 'id'> = {
    name,
    type,
    createdBy: creatorId,
    createdAt: Date.now(),
    members: [creatorId]
  };
  
  try {
    const docRef = await addDoc(collection(db, CHANNELS_COLLECTION), channelData);
    return { id: docRef.id, ...channelData } as Channel;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, CHANNELS_COLLECTION);
    throw error;
  }
};

export const updateChannel = async (channelId: string, data: Partial<Channel>) => {
  try {
    await updateDoc(doc(db, CHANNELS_COLLECTION, channelId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CHANNELS_COLLECTION}/${channelId}`);
    throw error;
  }
};

export const deleteChannel = async (channelId: string) => {
  try {
    await deleteDoc(doc(db, CHANNELS_COLLECTION, channelId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CHANNELS_COLLECTION}/${channelId}`);
    throw error;
  }
};

export const joinChannel = async (channelId: string, userId: string) => {
  const channelRef = doc(db, CHANNELS_COLLECTION, channelId);
  try {
    await updateDoc(channelRef, {
      members: arrayUnion(userId)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CHANNELS_COLLECTION}/${channelId}`);
    throw error;
  }
};

// --- Messages ---

export const getMessages = (channelId: string, callback: (messages: Message[]) => void) => {
  const q = query(
    collection(db, CHANNELS_COLLECTION, channelId, MESSAGES_COLLECTION),
    orderBy('timestamp', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    callback(messages);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, `${CHANNELS_COLLECTION}/${channelId}/${MESSAGES_COLLECTION}`);
  });
};

export const sendMessage = async (channelId: string, sender: UserProfile, content: string, fileUrl?: string, fileType?: string) => {
  const messageData: any = {
    channelId,
    senderId: sender.uid,
    senderName: sender.displayName,
    senderPhoto: sender.photoURL,
    content,
    timestamp: Date.now(),
  };

  if (fileUrl) messageData.fileUrl = fileUrl;
  if (fileType) messageData.fileType = fileType;
  
  try {
    await addDoc(collection(db, CHANNELS_COLLECTION, channelId, MESSAGES_COLLECTION), messageData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${CHANNELS_COLLECTION}/${channelId}/${MESSAGES_COLLECTION}`);
    throw error;
  }
};

export const deleteMessage = async (channelId: string, messageId: string) => {
  try {
    await deleteDoc(doc(db, CHANNELS_COLLECTION, channelId, MESSAGES_COLLECTION, messageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CHANNELS_COLLECTION}/${channelId}/${MESSAGES_COLLECTION}/${messageId}`);
    throw error;
  }
};

export const editMessage = async (channelId: string, messageId: string, newContent: string) => {
  try {
    await updateDoc(doc(db, CHANNELS_COLLECTION, channelId, MESSAGES_COLLECTION, messageId), {
      content: newContent,
      isEdited: true
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CHANNELS_COLLECTION}/${channelId}/${MESSAGES_COLLECTION}/${messageId}`);
    throw error;
  }
};

export const markMessageAsRead = async (channelId: string, messageId: string, userId: string) => {
  try {
    await updateDoc(doc(db, CHANNELS_COLLECTION, channelId, MESSAGES_COLLECTION, messageId), {
      readBy: arrayUnion(userId)
    });
  } catch (error) {
    // Silently fail or log for read receipts as they are non-critical
    console.error("Error marking message as read:", error);
  }
};

// --- Calls ---

export const startCall = async (channelId: string, caller: UserProfile, participants: string[], type: 'voice' | 'video') => {
  const callData: Omit<Call, 'id'> = {
    channelId,
    callerId: caller.uid,
    callerName: caller.displayName,
    callerPhoto: caller.photoURL,
    participants,
    status: 'calling',
    type,
    timestamp: Date.now()
  };
  
  try {
    const docRef = await addDoc(collection(db, CALLS_COLLECTION), callData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, CALLS_COLLECTION);
    throw error;
  }
};

export const updateCallStatus = async (callId: string, status: Call['status']) => {
  try {
    await updateDoc(doc(db, CALLS_COLLECTION, callId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CALLS_COLLECTION}/${callId}`);
    throw error;
  }
};

export const saveOffer = async (callId: string, offer: RTCSessionDescriptionInit) => {
  try {
    await updateDoc(doc(db, CALLS_COLLECTION, callId), { offer });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CALLS_COLLECTION}/${callId}`);
    throw error;
  }
};

export const saveAnswer = async (callId: string, answer: RTCSessionDescriptionInit) => {
  try {
    await updateDoc(doc(db, CALLS_COLLECTION, callId), { answer });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CALLS_COLLECTION}/${callId}`);
    throw error;
  }
};

export const addIceCandidate = async (callId: string, candidate: RTCIceCandidate, type: 'caller' | 'callee') => {
  try {
    const colName = type === 'caller' ? 'callerCandidates' : 'calleeCandidates';
    await addDoc(collection(db, CALLS_COLLECTION, callId, colName), candidate.toJSON());
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${CALLS_COLLECTION}/${callId}`);
    throw error;
  }
};

export const listenForSignaling = (callId: string, callback: (data: any) => void) => {
  return onSnapshot(doc(db, CALLS_COLLECTION, callId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    }
  });
};

export const listenForIceCandidates = (callId: string, type: 'caller' | 'callee', callback: (candidate: RTCIceCandidateInit) => void) => {
  const colName = type === 'caller' ? 'callerCandidates' : 'calleeCandidates';
  const q = query(collection(db, CALLS_COLLECTION, callId, colName));
  
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        callback(change.doc.data() as RTCIceCandidateInit);
      }
    });
  });
};

export const getUserByEmail = async (email: string) => {
  const q = query(collection(db, USERS_COLLECTION), where('email', '==', email), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { uid: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserProfile;
};

export const verifySecurityAnswer = async (email: string, answer: string) => {
  const user = await getUserByEmail(email);
  if (!user) return false;
  return user.securityAnswer?.toLowerCase() === answer.toLowerCase();
};

export const listenForIncomingCalls = (userId: string, callback: (call: Call) => void) => {
  const q = query(
    collection(db, CALLS_COLLECTION),
    where('participants', 'array-contains', userId),
    where('status', '==', 'calling'),
    orderBy('timestamp', 'desc'),
    limit(1)
  );
  
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const call = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Call;
      // Only notify if call is recent (last 30 seconds)
      if (Date.now() - call.timestamp < 30000) {
        callback(call);
      }
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, CALLS_COLLECTION);
  });
};

