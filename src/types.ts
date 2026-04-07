export interface UserProfile {
  uid: string;
  email?: string;
  displayName: string;
  photoURL?: string;
  status?: 'online' | 'offline' | 'away';
  createdAt: number;
  role?: 'admin' | 'user';
  isBlocked?: boolean;
  isPrivate?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private';
  createdBy: string;
  createdAt: number;
  members: string[]; // Array of UIDs
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content: string;
  timestamp: number;
  fileUrl?: string;
  fileType?: string;
  readBy?: string[]; // Array of UIDs who read the message
  isEdited?: boolean;
}

export interface Call {
  id: string;
  channelId: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  participants: string[];
  status: 'calling' | 'ongoing' | 'ended' | 'declined';
  type: 'voice' | 'video';
  timestamp: number;
}
