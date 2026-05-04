import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { MessageModel } from '../../models/message.model';
import { Observable } from 'rxjs';
import { User, UserStatusChange } from '../../models/user.model';
import { Conversation } from '../../models/conversation.model';

export interface TypingEvent {
  userId: string;
  username: string;
  conversationId: string;
}

export interface MessageReadEvent {
  messageId: string;
  readBy: Array<{ userId: string; readAt: string }>;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket?: Socket;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io('http://localhost:3000', {
      auth: {
        token,
      },
    });
  }

  sendMessage(data: MessageModel) {
    this.socket?.emit('sendMessage', data);
  }

  joinConversation(conversationId: string): void {
    this.socket?.emit('joinConversation', conversationId);
  }

  leaveConversation(conversationId: string): void {
    this.socket?.emit('leaveConversation', conversationId);
  }

  receiveMessage(): Observable<MessageModel> {
    return new Observable<MessageModel>((observer) => {
      this.socket?.on('receiveMessage', (msg: MessageModel) => {
        observer.next(msg);
      });

      return () => {
        this.socket?.off('receiveMessage');
      };
    });
  }

  requestUsersList(): void {
    this.socket?.emit('getUsersList');
  }

  usersList(): Observable<User[]> {
    return new Observable<User[]>((observer) => {
      this.socket?.on('usersList', (users: User[]) => {
        observer.next(users);
      });

      return () => {
        this.socket?.off('usersList');
      };
    });
  }

  userStatusChanged(): Observable<UserStatusChange> {
    return new Observable<UserStatusChange>((observer) => {
      this.socket?.on('userStatusChanged', (statusChange: UserStatusChange) => {
        observer.next(statusChange);
      });

      return () => {
        this.socket?.off('userStatusChanged');
      };
    });
  }

  conversationUpdated(): Observable<Conversation> {
    return new Observable<Conversation>((observer) => {
      this.socket?.on('conversationUpdated', (conversation: Conversation) => {
        observer.next(conversation);
      });

      return () => {
        this.socket?.off('conversationUpdated');
      };
    });
  }

  emitUserTyping(conversationId: string): void {
    this.socket?.emit('userTyping', { conversationId });
  }

  emitStopTyping(conversationId: string): void {
    this.socket?.emit('stopTyping', { conversationId });
  }

  userIsTyping(): Observable<TypingEvent> {
    return new Observable<TypingEvent>((observer) => {
      this.socket?.on('userIsTyping', (data: TypingEvent) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('userIsTyping');
      };
    });
  }

  userStoppedTyping(): Observable<TypingEvent> {
    return new Observable<TypingEvent>((observer) => {
      this.socket?.on('userStoppedTyping', (data: TypingEvent) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('userStoppedTyping');
      };
    });
  }

  markAsRead(messageId: string): void {
    this.socket?.emit('markAsRead', { messageId });
  }

  messageRead(): Observable<MessageReadEvent> {
    return new Observable<MessageReadEvent>((observer) => {
      this.socket?.on('messageRead', (data: MessageReadEvent) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('messageRead');
      };
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}
