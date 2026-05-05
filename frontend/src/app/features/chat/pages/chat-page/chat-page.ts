import { Component, OnDestroy, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Conversation } from '../../../../models/conversation.model';
import { MessageModel } from '../../../../models/message.model';
import { User } from '../../../../models/user.model';
import { ConversationService } from '../../../../core/services/conversation.service';
import { SocketService } from '../../../../core/services/socket-service';
import { FormsModule } from '@angular/forms';
import { MessageList } from '../../components/message-list/message-list';
import { MessageInput } from '../../components/message-input/message-input';
import { UserList } from '../../components/user-list/user-list';
import { AuthService } from '../../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { UsersService } from '../../../../core/services/users.service';
import {
  OutgoingMessagePayload,
} from '../../components/message-input/message-input';
import { UploadService } from '../../../../core/services/upload.service';
import { resolveBackendUrl } from '../../../../core/config/app-config';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [FormsModule, RouterLink, MessageList, MessageInput, UserList],
  templateUrl: './chat-page.html',
})
export class ChatPage implements OnInit, OnDestroy {
  messages = signal<MessageModel[]>([]);
  users = signal<User[]>([]);
  conversations = signal<Conversation[]>([]);
  activeConversationId = signal('');
  typingUsers = signal<Set<string>>(new Set()); // Track users typing in current conversation
  showLogoutModal = signal(false);
  currentUser: AuthService['currentUser'];
  private subscriptions = new Subscription();
  private messagesSubscription?: Subscription;
  private intersectionObserver?: IntersectionObserver;
  private markedMessagesAsRead = new Set<string>();
  private browserNotification?: Notification;

  constructor(
    private conversationService: ConversationService,
    private socketService: SocketService,
    private authService: AuthService,
    private usersService: UsersService,
    private uploadService: UploadService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.currentUser = this.authService.currentUser;
  }

  ngOnInit() {
    const token = this.authService.getToken();

    if (!token) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.loadConversations();
    this.subscriptions.add(
      this.usersService.getUsers().subscribe((users) => {
        this.users.set(users);
      }),
    );

    this.socketService.connect(token);
    this.requestNotificationPermission();

    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        this.openConversation(params.get('conversationId') || '');
      }),
    );

    // listen for new messages
    this.subscriptions.add(
      this.socketService.receiveMessage().subscribe((msg) => {
        if (msg.conversationId && msg.conversationId !== this.activeConversationId()) {
          return;
        }

        this.messages.update((list) => {
          const index = list.findIndex((item) => item.clientId && item.clientId === msg.clientId);

          if (index === -1) {
            return [...list, msg];
          }

          const next = [...list];
          next[index] = msg;
          return next;
        });

        // scroll to bottom after receiving new message
        setTimeout(() => {
          this.scrollToBottom();
          this.setupMessageReadObserver();
        }, 0);
      }),
    );

    this.subscriptions.add(
      this.socketService.usersList().subscribe((users) => {
        this.users.set(users);
      }),
    );

    this.subscriptions.add(
      this.socketService.userStatusChanged().subscribe((statusChange) => {
        this.users.update((users) =>
          users.map((user) => (user._id === statusChange.userId ? statusChange.user : user)),
        );
      }),
    );

    this.subscriptions.add(
      this.socketService.conversationUpdated().subscribe((conversation) => {
        this.maybeNotifyForConversation(conversation);
        this.upsertConversation(conversation);
      }),
    );

    this.subscriptions.add(
      this.socketService.userIsTyping().subscribe((typingEvent) => {
        // Only show typing from other users in current conversation
        if (
          typingEvent.conversationId === this.activeConversationId() &&
          typingEvent.userId !== this.currentUser()?._id
        ) {
          this.typingUsers.update((set) => {
            const newSet = new Set(set);
            newSet.add(typingEvent.userId);
            return newSet;
          });
        }
      }),
    );

    this.subscriptions.add(
      this.socketService.userStoppedTyping().subscribe((typingEvent) => {
        if (typingEvent.conversationId === this.activeConversationId()) {
          this.typingUsers.update((set) => {
            const newSet = new Set(set);
            newSet.delete(typingEvent.userId);
            return newSet;
          });
        }
      }),
    );

    // Listen for message read receipts
    this.subscriptions.add(
      this.socketService.messageRead().subscribe((readEvent) => {
        // Update message status when other users have read it
        this.messages.update((list) =>
          list.map((msg) =>
            msg._id === readEvent.messageId
              ? {
                  ...msg,
                  status: readEvent.status as 'sent' | 'delivered' | 'read',
                  readBy: readEvent.readBy,
                }
              : msg,
          ),
        );
      }),
    );

    this.socketService.requestUsersList();
  }

  /**
   * Setup Intersection Observer to mark messages as read when they become visible
   */
  private setupMessageReadObserver(): void {
    // Clean up previous observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            const isOwnMessage = entry.target.getAttribute('data-is-own') === 'true';

            // Only mark others' messages as read, not our own
            if (messageId && !isOwnMessage && !this.markedMessagesAsRead.has(messageId)) {
              this.markedMessagesAsRead.add(messageId);
              this.socketService.markAsRead(messageId);
            }
          }
        });
      },
      {
        root: this.scrollContainer?.nativeElement,
        threshold: 0.5,
      },
    );

    // Observe all message items
    setTimeout(() => {
      const messageItems =
        this.scrollContainer?.nativeElement.querySelectorAll('[data-message-id]');
      messageItems?.forEach((item: HTMLElement) => {
        this.intersectionObserver?.observe(item);
      });
    }, 0);
  }

  loadConversations(): void {
    this.subscriptions.add(
      this.conversationService.getConversations().subscribe((conversations) => {
        this.conversations.set(conversations);
      }),
    );
  }

  openConversation(conversationId: string): void {
    const previousConversationId = this.activeConversationId();

    if (previousConversationId && previousConversationId !== conversationId) {
      this.socketService.leaveConversation(previousConversationId);
    }

    // Clear typing users when opening new conversation
    this.typingUsers.set(new Set());
    this.markedMessagesAsRead.clear();

    this.activeConversationId.set(conversationId);
    this.messages.set([]);
    this.messagesSubscription?.unsubscribe();

    if (!conversationId) {
      return;
    }

    this.socketService.joinConversation(conversationId);
    this.socketService.markConversationRead(conversationId);
    this.messagesSubscription = this.conversationService
      .getMessages(conversationId)
      .subscribe((messages) => {
        this.messages.set(messages);

        setTimeout(() => {
          this.scrollToBottom();
          this.setupMessageReadObserver();
        }, 0);
      });
  }

  onUserTyping(): void {
    this.socketService.emitUserTyping(this.activeConversationId());
  }

  onStopTyping(): void {
    this.socketService.emitStopTyping(this.activeConversationId());
  }

  getTypingUsersLabel(): string {
    const typingUserIds = Array.from(this.typingUsers());
    if (typingUserIds.length === 0) return '';

    const typingUserNames = typingUserIds
      .map((userId) => {
        const user = this.users().find((u) => u._id === userId);
        return user?.profile?.displayName || user?.username || 'User';
      })
      .filter((name) => name);

    if (typingUserNames.length === 0) return '';
    if (typingUserNames.length === 1) return `${typingUserNames[0]} is typing...`;
    return `${typingUserNames.join(', ')} are typing...`;
  }

  send(payload: OutgoingMessagePayload) {
    const user = this.currentUser();
    const conversationId = this.activeConversationId();

    if (!user) {
      this.logout();
      return;
    }

    if (!conversationId) {
      return;
    }

    const clientId = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const sendMessage = (attachments: MessageModel['attachments'] = []) => {
      const text = payload.text.trim();
      const message: MessageModel = {
        clientId,
        conversationId,
        senderId: user._id,
        sender: user.username,
        message: text,
        attachments,
      };

      this.messages.update((list) => [...list, message]);
      this.socketService.sendMessage(message);
      this.onStopTyping();
    };

    if (!payload.file) {
      if (!payload.text.trim()) {
        return;
      }

      sendMessage();
      return;
    }

    this.uploadService.uploadAttachment(payload.file).subscribe({
      next: ({ attachment }) => {
        sendMessage([attachment]);
      },
      error: (error) => {
        console.error(error.error?.message || 'Unable to upload attachment.');
      },
    });
  }

  startConversation(user: User): void {
    this.conversationService
      .createConversation({
        participantIds: [user._id],
      })
      .subscribe((conversation) => {
        this.upsertConversation(conversation);
        this.router.navigate(['/chat', conversation._id]);
      });
  }

  backToUsers(): void {
    this.router.navigate(['/chat']);
  }

  openLogoutModal(): void {
    this.showLogoutModal.set(true);
  }

  closeLogoutModal(): void {
    this.showLogoutModal.set(false);
  }

  confirmLogout(): void {
    this.showLogoutModal.set(false);
    this.logout();
  }

  unreadCountsByUser(): Record<string, number> {
    const currentUser = this.currentUser();

    if (!currentUser) {
      return {};
    }

    return this.conversations().reduce<Record<string, number>>((acc, conversation) => {
      if (conversation.unreadCount <= 0) {
        return acc;
      }

      const otherParticipant = conversation.participants.find(
        (participant) => participant._id !== currentUser._id,
      );

      if (!otherParticipant) {
        return acc;
      }

      acc[otherParticipant._id] = conversation.unreadCount;
      return acc;
    }, {});
  }

  upsertConversation(conversation: Conversation): void {
    this.conversations.update((conversations) => {
      const index = conversations.findIndex((item) => item._id === conversation._id);

      if (index === -1) {
        return [conversation, ...conversations];
      }

      const next = [...conversations];
      next[index] = conversation;
      return next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
  }

  // Return the active conversation object if available
  activeConversation(): Conversation | undefined {
    const id = this.activeConversationId();
    if (!id) return undefined;
    return this.conversations().find((c) => c._id === id);
  }

  // Return the other participant for the active conversation
  selectedUser(): User | undefined {
    const conv = this.activeConversation();
    if (!conv) return undefined;
    const currentUser = this.currentUser();
    if (!currentUser) return conv.participants[0];
    return conv.participants.find((p) => p._id !== currentUser._id) || conv.participants[0];
  }

  avatarUrl(user: User | undefined): string {
    const avatar = user?.profile?.avatar || '/uploads/default-avatar.svg';
    return resolveBackendUrl(avatar);
  }

  statusLabel(user: User | undefined): string {
    if (!user) return '';
    if (user.status === 'online') return 'Online';
    if (!user.lastSeen) return 'Offline';
    return `Last seen ${new Date(user.lastSeen).toLocaleString()}`;
  }

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  scrollToBottom() {
    try {
      this.scrollContainer.nativeElement.scrollTop =
        this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  private requestNotificationPermission(): void {
    if (typeof Notification === 'undefined') {
      return;
    }

    if (Notification.permission !== 'default') {
      return;
    }

    void Notification.requestPermission();
  }

  private maybeNotifyForConversation(conversation: Conversation): void {
    const currentUser = this.currentUser();

    if (!currentUser || typeof Notification === 'undefined') {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const previousConversation = this.conversations().find((item) => item._id === conversation._id);
    const previousUnread = previousConversation?.unreadCount || 0;
    const nextUnread = conversation.unreadCount || 0;
    const isOwnMessage = conversation.lastMessage?.senderId === currentUser._id;
    const isActiveConversation = this.activeConversationId() === conversation._id;

    if (isOwnMessage || nextUnread <= previousUnread || isActiveConversation || !document.hidden) {
      return;
    }

    const sender =
      conversation.participants.find((participant) => participant._id !== currentUser._id) ||
      this.selectedUser();
    const senderName = sender?.profile?.displayName || sender?.username || 'New message';
    const body = conversation.lastMessage?.message || 'You have a new unread message.';
    const icon = sender ? this.avatarUrl(sender) : undefined;

    this.browserNotification?.close();
    this.browserNotification = new Notification(senderName, {
      body,
      icon,
      tag: conversation._id,
    });
  }

  logout(): void {
    const conversationId = this.activeConversationId();

    if (conversationId) {
      this.socketService.leaveConversation(conversationId);
    }

    this.messagesSubscription?.unsubscribe();
    this.subscriptions.unsubscribe();
    this.socketService.disconnect();
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  ngOnDestroy(): void {
    const conversationId = this.activeConversationId();

    if (conversationId) {
      this.socketService.leaveConversation(conversationId);
    }

    // Clean up Intersection Observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    this.messagesSubscription?.unsubscribe();
    this.subscriptions.unsubscribe();
    this.socketService.disconnect();
  }
}
