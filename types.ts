// FIX: Add the missing 'User' interface.
export interface User {
  email: string;
  password?: string;
  name: string;
  phone: string;
  address: string;
  securityQuestion: string;
  securityAnswer: string;
  isVerified: boolean;
  isAdmin: boolean;
}

export interface ChatMessage {
  sender: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface LiveHistoryItem {
  user: string;
  model: string;
  timestamp: number;
}

export interface ImageHistoryItem {
  imageDataUrl: string;
  analysis: string;
  timestamp: number;
  fileName: string;
}

export type View = 'chat' | 'live' | 'image' | 'profile';

export interface History {
  chat: ChatMessage[];
  live: LiveHistoryItem[];
  image: ImageHistoryItem[];
}
