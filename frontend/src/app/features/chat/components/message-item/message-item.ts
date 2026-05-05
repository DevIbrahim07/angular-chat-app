import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { resolveBackendUrl } from '../../../../core/config/app-config';
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
  previewImageDownloadUrl: string | null = null;

  attachmentUrl(url: string): string {
    return resolveBackendUrl(url);
  }

  isImageAttachment(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  openImagePreview(url: string, name: string, downloadUrl?: string): void {
    this.previewImageUrl = this.attachmentUrl(url);
    this.previewImageName = name;
    this.previewImageDownloadUrl = this.attachmentUrl(downloadUrl || url);
  }

  closeImagePreview(): void {
    this.previewImageUrl = null;
    this.previewImageName = '';
    this.previewImageDownloadUrl = null;
  }

  downloadAttachment(url: string, name: string): void {
    const link = document.createElement('a');
    link.href = this.attachmentUrl(url);
    link.download = name || 'attachment';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
