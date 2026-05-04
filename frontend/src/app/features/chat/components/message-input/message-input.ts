import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './message-input.html',
})
export class MessageInput {
  message: string = '';

  @Output() sendMessage = new EventEmitter<string>();
  @Output() userTyping = new EventEmitter<void>();
  @Output() stopTyping = new EventEmitter<void>();

  private typingTimeout?: ReturnType<typeof setTimeout>;

  onSend() {
    if (!this.message.trim()) return;

    this.sendMessage.emit(this.message);
    this.message = '';
    this.clearTypingTimeout();
    this.stopTyping.emit();
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
