export interface UserProfile {
  uid: string;
  email?: string;
  displayName: string;
  photoURL?: string;
  status?: 'online' | 'offline' | 'away';
  createdAt: number;
  role?: 'admin' | 'user';
  isBlocked?: boolean;
  isDeactivated?: boolean;
  isPrivate?: boolean;
  canChat?: boolean;
  securityQuestion?: string;
  securityAnswer?: string;
  cpf?: string;
  phone?: string;
  username?: string; // For "@" handle
  background?: {
    type: 'color' | 'video' | 'gif' | 'image' | 'gradient' | 'pattern';
    value: string; // hex color, URL, or CSS gradient string
    opacity?: number; // 0 to 100
    patternId?: string; // For specific pattern selection
    patternColor?: string; // Hex color for the pattern
    brightness?: number; // 0 to 200 (percentage)
    contrast?: number; // 0 to 200 (percentage)
  };
  theme?: 'dark' | 'light';
  primaryColor?: string; // Hex for brand color
  accentColor?: string; // Hex for secondary accents
  isAnonymous?: boolean;
  expiresAt?: number;
  phoneNumber?: string;
  language?: 'pt' | 'en' | 'es';
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'category' | 'private_group';
  createdBy: string;
  createdAt: number;
  members: string[]; // Array of UIDs
  parentId?: string; // ID of the category channel
  order?: number;
  isMuted?: boolean;
  mutedBy?: string[]; // Array of UIDs
  background?: {
    type: 'color' | 'video' | 'gif' | 'image' | 'gradient' | 'pattern';
    value: string;
    opacity?: number;
    patternId?: string;
    patternColor?: string;
    brightness?: number;
    contrast?: number;
  } | null;
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
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: number;
}

export interface Status {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  mediaUrl: string;
  mediaType: 'video' | 'image' | 'audio' | 'drawing' | 'link';
  caption?: string;
  timestamp: number;
  likes: string[]; // Array of UIDs
  comments: StatusComment[];
  views?: string[]; // Array of UIDs who viewed the status
  pinned?: boolean;
}

export interface StatusComment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  timestamp: number;
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

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  timestamp: number;
  status: 'pending' | 'resolved' | 'dismissed';
}
