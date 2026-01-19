import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-streaming-message',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="message-wrapper assistant">
      <div class="avatar">
        <ion-icon name="sparkles-outline"></ion-icon>
      </div>
      <div class="message-bubble assistant-bubble">
        <div class="message-content">
          <span [innerHTML]="formattedContent()"></span>
          <span class="cursor" [class.blinking]="isActive()">|</span>
        </div>
        @if (speed > 0) {
          <div class="speed-indicator">
            <ion-icon name="speedometer-outline"></ion-icon>
            {{ speed }} tok/s
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .message-wrapper {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      align-items: flex-end;
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

    .cursor {
      display: inline-block;
      font-weight: bold;
      color: var(--ion-color-primary);
      margin-left: 2px;
    }

    .cursor.blinking {
      animation: blink 0.8s infinite;
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    .speed-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      opacity: 0.6;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .speed-indicator ion-icon {
      font-size: 14px;
    }
  `]
})
export class StreamingMessageComponent {
  @Input() content: string | null = '';
  @Input() speed: number = 0;

  isActive = signal(true);

  formattedContent(): string {
    let text = this.content ?? '';

    // Convert basic markdown to HTML
    // Bold: **text** or __text__
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Lists: - item or * item
    text = text.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Numbered lists: 1. item
    text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Code blocks: ```code```
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Inline code: `code`
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Line breaks
    text = text.replace(/\n/g, '<br>');

    return text;
  }
}
