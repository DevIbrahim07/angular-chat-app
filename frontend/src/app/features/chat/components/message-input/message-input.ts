import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface OutgoingMessagePayload {
  text: string;
  file: File | null;
}

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './message-input.html',
})
export class MessageInput {
  message: string = '';
  selectedFile: File | null = null;

  @Output() sendMessage = new EventEmitter<OutgoingMessagePayload>();
  @Output() userTyping = new EventEmitter<void>();
  @Output() stopTyping = new EventEmitter<void>();

  private typingTimeout?: ReturnType<typeof setTimeout>;

  onSend() {
    if (!this.message.trim() && !this.selectedFile) return;

    this.sendMessage.emit({
      text: this.message,
      file: this.selectedFile,
    });
    this.message = '';
    this.selectedFile = null;
    this.clearTypingTimeout();
    this.stopTyping.emit();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
    input.value = '';
  }

  clearSelectedFile(): void {
    this.selectedFile = null;
  }

  onInputKeydown() {
    // Emit typing event
    this.userTyping.emit();

    // Reset typing timeout
    this.clearTypingTimeout();
  }

  onInputBlur() {
    // Emit stop typing on blur
    this.stopTyping.emit();
    this.clearTypingTimeout();
  }

  private clearTypingTimeout() {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = undefined;
    }
  }
}
