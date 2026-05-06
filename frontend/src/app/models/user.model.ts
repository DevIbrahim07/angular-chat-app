export interface User {
  _id: string;
  email: string;
  username: string;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  status: 'online' | 'offline';
  lastSeen: string | null;
  profile?: {
    avatar?: string;
    bio?: string;
    displayName?: string;
  };
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface ProfileUpdateResponse {
  user: User;
  publicUser: User;
}

export interface UserStatusChange {
  userId: string;
  status: 'online' | 'offline';
  lastSeen: string | null;
  user: User;
}
