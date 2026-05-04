import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MessageModel } from '../../../../models/message.model';
import { MessageItem } from '../message-item/message-item';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [CommonModule, MessageItem],
  templateUrl: './message-list.html',
})
export class MessageList {
  @Input() messages: MessageModel[] = [];
  @Input() currentUser = '';
}
