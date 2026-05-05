import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { Conversation } from '../../models/conversation.model';
import { MessageModel } from '../../models/message.model';

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  private apiUrl = `${API_BASE_URL}/api/conversations`;

  constructor(private http: HttpClient) {}

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(this.apiUrl);
  }

  createConversation(payload: {
    participantIds: string[];
    name?: string;
  }): Observable<Conversation> {
    return this.http.post<Conversation>(this.apiUrl, payload);
  }

  getMessages(conversationId: string): Observable<MessageModel[]> {
    return this.http.get<MessageModel[]>(`${this.apiUrl}/${conversationId}/messages`);
  }

  deleteConversation(conversationId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${conversationId}`);
  }
}
