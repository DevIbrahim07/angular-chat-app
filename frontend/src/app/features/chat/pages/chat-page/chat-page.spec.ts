import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';

import { ChatPage } from './chat-page';
import { ConversationService } from '../../../../core/services/conversation.service';
import { ContactsService } from '../../../../core/services/contacts.service';
import { SocketService } from '../../../../core/services/socket-service';
import { AuthService } from '../../../../core/services/auth.service';
import { UploadService } from '../../../../core/services/upload.service';

describe('ChatPage', () => {
  let component: ChatPage;
  let fixture: ComponentFixture<ChatPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatPage],
      providers: [
        provideRouter([]),
        {
          provide: ConversationService,
          useValue: {
            getConversations: () => of([]),
            getMessages: () => of([]),
            createConversation: () =>
              of({
                _id: 'conversation-1',
                participants: [],
                lastMessage: null,
                unreadCount: 0,
                createdAt: '2026-05-02T00:00:00.000Z',
                updatedAt: '2026-05-02T00:00:00.000Z',
              }),
          },
        },
        {
          provide: SocketService,
          useValue: {
            connect: () => undefined,
            receiveMessage: () => EMPTY,
            joinConversation: () => undefined,
            leaveConversation: () => undefined,
            markConversationRead: () => undefined,
            conversationUpdated: () => EMPTY,
            usersList: () => EMPTY,
            userStatusChanged: () => EMPTY,
            userIsTyping: () => EMPTY,
            userStoppedTyping: () => EMPTY,
            messageRead: () => EMPTY,
            requestUsersList: () => undefined,
            sendMessage: () => undefined,
            emitUserTyping: () => undefined,
            emitStopTyping: () => undefined,
            markAsRead: () => undefined,
            disconnect: () => undefined,
          },
        },
        {
          provide: ContactsService,
          useValue: {
            getContacts: () => of([]),
            createContact: () =>
              of({
                message: 'Contact added successfully.',
                contact: {
                  _id: 'contact-1',
                  contactName: 'Bilal',
                  phoneNumber: '+923001234567',
                  source: 'manual',
                  matchedUser: null,
                  createdAt: '2026-05-02T00:00:00.000Z',
                  updatedAt: '2026-05-02T00:00:00.000Z',
                },
              }),
          },
        },
        {
          provide: UploadService,
          useValue: {
            uploadAttachment: () =>
              of({
                attachment: {
                  originalName: 'file.txt',
                  url: '/uploads/attachments/file.txt',
                  mimeType: 'text/plain',
                  size: 128,
                },
              }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({
              _id: 'user-1',
              email: 'ibrahim@example.com',
              username: 'Ibrahim',
              status: 'online',
              lastSeen: null,
              createdAt: '2026-05-02T00:00:00.000Z',
            }),
            getToken: () => 'test-token',
            logout: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
