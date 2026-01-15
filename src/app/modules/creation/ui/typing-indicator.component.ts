import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-typing-indicator',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="typing-wrapper">
      <div class="avatar">
        <ion-icon name="sparkles"></ion-icon>
      </div>
      <div class="typing-bubble">
        <div class="typing-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .typing-wrapper {
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

    .typing-bubble {
      background: rgba(255, 255, 255, 0.08);
      padding: 16px 20px;
      border-radius: 18px;
      border-bottom-left-radius: 4px;
    }

    .typing-dots {
      display: flex;
      gap: 4px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ion-color-primary);
      animation: typingDot 1.4s ease-in-out infinite;
    }

    .dot:nth-child(1) {
      animation-delay: 0s;
    }

    .dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typingDot {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.4;
      }
      30% {
        transform: translateY(-8px);
        opacity: 1;
      }
    }
  `]
})
export class TypingIndicatorComponent {}
