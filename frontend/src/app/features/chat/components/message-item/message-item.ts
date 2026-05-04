import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageModel } from '../../../../models/message.model';

@Component({
  selector: 'app-message-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-item.html',
})
export class MessageItem {
  @Input() currentUser = '';
  @Input() message!: MessageModel;

  getStatusIcon(): string {
    switch (this.message.status) {
      case 'read':
        return '✓✓';
      case 'delivered':
        return '✓✓';
      case 'sent':
        return '✓';
      default:
        return '';
    }
  }

  isStatusRead(): boolean {
    return this.message.status === 'read';
  }

  getReadByLabel(): string {
    if (!this.message.readBy || this.message.readBy.length === 0) {
      return '';
    }

    const readEntries = this.message.readBy;
    if (readEntries.length === 1) {
      const readAt = new Date(readEntries[0].readAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `Read at ${readAt}`;
    } else {
      const readAt = new Date(readEntries[readEntries.length - 1].readAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `Read by ${readEntries.length} users at ${readAt}`;
    }
  }
}
