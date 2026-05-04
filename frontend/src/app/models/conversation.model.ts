import { MessageModel } from './message.model';
import { User } from './user.model';

export interface Conversation {
  _id: string;
  participants: User[];
  name?: string;
  lastMessage?: MessageModel | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}
