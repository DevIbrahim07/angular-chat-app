import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { resolveBackendUrl } from '../../../../core/config/app-config';
import { User } from '../../../../models/user.model';
import { Contact } from '../../../../models/contact.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-list.html',
})
export class UserList implements OnChanges {
  @Input() currentUser?: User | null;
  @Input() contacts: Contact[] = [];
  @Input() unreadCountsByUser: Record<string, number> = {};
  @Input() isSavingContact = false;
  @Input() contactFeedback = '';
  @Input() contactFeedbackTone: 'success' | 'error' = 'success';
  @Output() startConversation = new EventEmitter<Contact>();
  @Output() addContact = new EventEmitter<{ contactName: string; phoneNumber: string }>();
  showAddContactForm = false;
  contactName = '';
  phoneNumber = '';
  private previousFeedback = '';

  displayName(contact: Contact): string {
    return (
      contact.contactName ||
      contact.matchedUser?.profile?.displayName ||
      contact.matchedUser?.username ||
      contact.phoneNumber ||
      'Unknown contact'
    );
  }

  secondaryLabel(contact: Contact): string {
    if (!contact.matchedUser) {
      return contact.phoneNumber
        ? `${contact.phoneNumber} · Not on Talkora yet`
        : 'Not on Talkora yet';
    }

    if (contact.matchedUser.status === 'online') {
      return 'Online';
    }

    if (!contact.matchedUser.lastSeen) {
      return 'Offline';
    }

    return `Last seen ${new Date(contact.matchedUser.lastSeen).toLocaleString()}`;
  }

  avatarUrl(contact: Contact): string {
    const avatar = contact.matchedUser?.profile?.avatar || '/uploads/default-avatar.svg';
    return resolveBackendUrl(avatar);
  }

  currentUserAvatarUrl(): string {
    const avatar = this.currentUser?.profile?.avatar || '/uploads/default-avatar.svg';
    return resolveBackendUrl(avatar);
  }

  openConversation(contact: Contact): void {
    if (!contact.matchedUser || this.isCurrentUser(contact.matchedUser)) {
      return;
    }

    this.startConversation.emit(contact);
  }

  onRowKeydown(event: KeyboardEvent, contact: Contact): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openConversation(contact);
  }

  isCurrentUser(user: User): boolean {
    return Boolean(this.currentUser && user._id === this.currentUser._id);
  }

  unreadCount(contact: Contact): number {
    if (!contact.matchedUser) {
      return 0;
    }

    return this.unreadCountsByUser[contact.matchedUser._id] || 0;
  }

  canOpenConversation(contact: Contact): boolean {
    return Boolean(contact.matchedUser && !this.isCurrentUser(contact.matchedUser));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['contactFeedback'] &&
      this.contactFeedback &&
      this.contactFeedback !== this.previousFeedback &&
      this.contactFeedbackTone === 'success' &&
      !this.isSavingContact
    ) {
      this.resetContactForm();
    }

    this.previousFeedback = this.contactFeedback;
  }

  submitContact(): void {
    const contactName = this.contactName.trim();
    const phoneNumber = this.phoneNumber.trim();

    if (!contactName || !phoneNumber || this.isSavingContact) {
      return;
    }

    this.addContact.emit({ contactName, phoneNumber });
  }

  resetContactForm(): void {
    this.contactName = '';
    this.phoneNumber = '';
    this.showAddContactForm = false;
  }
}
