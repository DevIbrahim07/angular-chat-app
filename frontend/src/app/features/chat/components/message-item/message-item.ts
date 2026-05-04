import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
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
  previewImageUrl: string | null = null;
  previewImageName = '';

  attachmentUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }

    return `http://localhost:3000${url}`;
  }

  isImageAttachment(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  openImagePreview(url: string, name: string): void {
    this.previewImageUrl = this.attachmentUrl(url);
    this.previewImageName = name;
  }

  closeImagePreview(): void {
    this.previewImageUrl = null;
    this.previewImageName = '';
  }

  async downloadAttachment(url: string, name: string): Promise<void> {
    const response = await fetch(this.attachmentUrl(url));
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = name || 'attachment';
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  getStatusType(): 'sent' | 'delivered' | 'read' | '' {
    switch (this.message.status) {
      case 'read':
        return 'read';
      case 'delivered':
        return 'delivered';
      case 'sent':
        return 'sent';
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
    }

    const readAt = new Date(readEntries[readEntries.length - 1].readAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Read by ${readEntries.length} users at ${readAt}`;
  }
}
