import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { User } from '../../../../models/user.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-list.html',
})
export class UserList {
  @Input() users: User[] = [];
  @Input() currentUserId = '';
  @Input() unreadCountsByUser: Record<string, number> = {};
  @Output() startConversation = new EventEmitter<User>();

  displayName(user: User): string {
    return user.profile?.displayName || user.username;
  }

  lastSeenLabel(user: User): string {
    if (user.status === 'online') {
      return 'Online';
    }

    if (!user.lastSeen) {
      return 'Offline';
    }

    return `Last seen ${new Date(user.lastSeen).toLocaleString()}`;
  }

  avatarUrl(user: User): string {
    const avatar = user.profile?.avatar || '/uploads/default-avatar.svg';

    if (avatar.startsWith('http')) {
      return avatar;
    }

    return `http://localhost:3000${avatar}`;
  }

  openConversation(user: User): void {
    if (this.isCurrentUser(user)) {
      return;
    }

    this.startConversation.emit(user);
  }

  onRowKeydown(event: KeyboardEvent, user: User): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openConversation(user);
  }

  isCurrentUser(user: User): boolean {
    return user._id === this.currentUserId;
  }

  unreadCount(user: User): number {
    return this.unreadCountsByUser[user._id] || 0;
  }
}
