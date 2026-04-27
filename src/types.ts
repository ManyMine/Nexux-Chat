export interface UserProfile {
  uid: string;
  email?: string;
  displayName: string;
  photoURL?: string;
  status?: 'online' | 'offline' | 'away' | 'dnd' | 'invisible' | 'auto';
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
  about?: string;
  background?: {
    type: 'color' | 'video' | 'gif' | 'image' | 'gradient' | 'pattern';
    value: string; // hex color, URL, or CSS gradient string
    opacity?: number; // 0 to 100
    patternId?: string; // For specific pattern selection
    patternColor?: string; // Hex color for the pattern
    brightness?: number; // 0 to 200 (percentage)
    contrast?: number; // 0 to 200 (percentage)
    size?: 'cover' | 'contain' | 'fill' | 'auto';
  };
  theme?: 'dark' | 'light';
  primaryColor?: string; // Hex for brand color
  accentColor?: string; // Hex for secondary accents
  isAnonymous?: boolean;
  expiresAt?: number;
  phoneNumber?: string;
  language?: 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'ru' | 'zh';
  zoom?: number; // 50 to 150 (percentage)
  onboardingCompleted?: boolean;
  linkPreviewsEnabled?: boolean;
  statusSettings?: {
    duration: '12h' | '24h' | '48h' | 'never';
    privacy: 'all' | 'contacts' | 'private';
    allowReplies?: boolean;
    allowStatusChat?: boolean;
    statusNotifications?: boolean;
  };
}

export type ObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'category' | 'private_group' | 'community' | 'project' | 'server' | 'topic';
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
    objectFit?: ObjectFit;
    size?: 'cover' | 'contain' | 'fill' | 'auto';
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
  iv?: string; // For encryption
  readBy?: string[]; // Array of UIDs who read the message
  isEdited?: boolean;
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: number;
  reactions?: Record<string, string[]>; // emoji -> array of user UIDs
  statusReply?: {
    statusId: string;
    userId: string;
    mediaUrl: string;
    mediaType: string;
    caption?: string;
  };
}

export interface Status {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  mediaUrl: string;
  mediaType: 'video' | 'image' | 'audio' | 'drawing' | 'link' | 'text';
  caption?: string;
  timestamp: number;
  expiresAt?: number; // -1 for never, or timestamp
  likes: string[]; // Array of UIDs
  comments: StatusComment[];
  views?: string[]; // Array of UIDs who viewed the status
  pinned?: boolean;
  allowReplies?: boolean;
  allowStatusChat?: boolean;
  privacy?: 'all' | 'contacts' | 'private';
}

export interface StatusComment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  timestamp: number;
  parentId?: string;
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
