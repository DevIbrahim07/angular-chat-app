export interface ReadByEntry {
  userId: string;
  readAt: string;
}

export interface MessageModel {
  _id?: string;
  clientId?: string;
  conversationId?: string;
  senderId?: string;
  sender: string;
  message: string;
  status?: 'sent' | 'delivered' | 'read';
  readBy?: ReadByEntry[];
  createdAt?: string;
}
