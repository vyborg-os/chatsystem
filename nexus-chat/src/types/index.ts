// Shared types for the application

export interface Reaction {
  emoji: string;
  userId: string;
  username: string;
}

export interface Message {
  id: string;
  type: 'text' | 'file' | 'voice' | 'system';
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  voiceUrl?: string;
  duration?: number;
  userId: string;
  username: string;
  recipientId?: string;
  recipientUsername?: string;
  timestamp: string;
  readBy: string[];
  edited: boolean;
  editedAt?: string;
  deleted: boolean;
  replyTo?: {
    id: string;
    type: 'text' | 'file' | 'voice';
    text?: string;
    username: string;
  } | null;
  reactions?: Record<string, Reaction[]>;
}

export interface ChatUser {
  id: string;
  username: string;
  profilePic?: string;
  role?: 'user' | 'manager' | 'superadmin';
  isTyping?: boolean;
  isRecording?: boolean;
  status?: 'online' | 'away' | 'offline';
  lastSeen?: string;
  badge?: string;
  unreadCount?: number;
  systemInfo?: {
    os: string;
    hostname: string;
    platform: string;
    cpuCores: number;
    totalMemory: string;
    ipAddress: string;
  };
  joinedAt?: Date;
}
