import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ChatMessage } from '../data-access/creation.store';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="message-wrapper" [class.user]="isUser()" [class.assistant]="!isUser()">
      @if (!isUser()) {
        <div class="avatar">
          <ion-icon name="sparkles-outline"></ion-icon>
        </div>
      }
      <div class="message-bubble" [class.user-bubble]="isUser()" [class.assistant-bubble]="!isUser()">
        <div class="message-content" [innerHTML]="formattedContent()"></div>
        @if (showTimestamp()) {
          <div class="timestamp">{{ message.timestamp | date:'shortTime' }}</div>
        }
      </div>
      @if (isUser()) {
        <div class="avatar user-avatar">
          <ion-icon name="person-outline"></ion-icon>
        </div>
      }
    </div>
  `,
  styles: [`
    .message-wrapper {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      align-items: flex-end;
    }

    .message-wrapper.user {
      flex-direction: row-reverse;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: linear-gradient(135deg, #667eea, #764ba2);
    }

    .user-avatar {
      background: var(--ion-color-primary);
    }

    .avatar ion-icon {
      font-size: 18px;
      color: white;
    }

    .message-bubble {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 18px;
      position: relative;
    }

    .user-bubble {
      background: var(--ion-color-primary);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .assistant-bubble {
      background: rgba(255, 255, 255, 0.08);
      border-bottom-left-radius: 4px;
    }

    .message-content {
      font-size: 15px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .message-content :global(strong) {
      font-weight: 600;
      color: var(--ion-color-primary);
    }

    .assistant-bubble .message-content :global(strong) {
      color: var(--ion-color-primary-tint);
    }

    .message-content :global(ul), .message-content :global(ol) {
      margin: 8px 0;
      padding-left: 20px;
    }

    .message-content :global(li) {
      margin: 4px 0;
    }

    .message-content :global(code) {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Roboto Mono', monospace;
      font-size: 13px;
    }

    .message-content :global(pre) {
      background: rgba(0, 0, 0, 0.3);
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }

    .message-content :global(pre code) {
      background: none;
      padding: 0;
    }

    .timestamp {
      font-size: 11px;
      opacity: 0.5;
      margin-top: 4px;
      text-align: right;
    }
  `]
})
export class ChatMessageComponent {
  @Input() message!: ChatMessage;
  @Input() isTyping = false;

  showTimestamp = signal(false);

  isUser(): boolean {
    return this.message.role === 'user';
  }

  formattedContent(): string {
    let content = this.message.content;

    // Convertir markdown básico a HTML
    // Bold: **text** o __text__
    content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* o _text_
    content = content.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Lists: - item o * item
    content = content.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
    content = content.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Numbered lists: 1. item
    content = content.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Code blocks: ```code```
    content = content.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Inline code: `code`
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Line breaks
    content = content.replace(/\n/g, '<br>');

    return content;
  }
}
