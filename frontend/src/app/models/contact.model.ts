import { User } from './user.model';

export interface Contact {
  _id: string;
  contactName: string;
  phoneNumber: string | null;
  source: 'manual' | 'conversation';
  matchedUser: User | null;
  createdAt: string;
  updatedAt: string;
}
