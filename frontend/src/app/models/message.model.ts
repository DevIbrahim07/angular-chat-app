export interface ReadByEntry {
  userId: string;
  readAt: string;
}

export interface MessageAttachment {
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  storageProvider?: 'local' | 'tigris';
  storageKey?: string;
  bucket?: string;
}

export interface MessageModel {
  _id?: string;
  clientId?: string;
  conversationId?: string;
  senderId?: string;
  sender: string;
  message: string;
  attachments?: MessageAttachment[];
  status?: 'sent' | 'delivered' | 'read';
  readBy?: ReadByEntry[];
  createdAt?: string;
}
