import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="quick-actions-container">
      <div class="actions-scroll">
        @for (action of actions; track action) {
          <ion-chip
            color="primary"
            outline="true"
            (click)="selectAction(action)"
          >
            {{ action }}
          </ion-chip>
        }
      </div>
    </div>
  `,
  styles: [`
    .quick-actions-container {
      padding: 8px 0;
      overflow: hidden;
    }

    .actions-scroll {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 4px 0;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .actions-scroll::-webkit-scrollbar {
      display: none;
    }

    ion-chip {
      flex-shrink: 0;
      --background: transparent;
      --color: var(--ion-color-primary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    ion-chip:hover {
      --background: rgba(var(--ion-color-primary-rgb), 0.1);
      transform: scale(1.02);
    }

    ion-chip:active {
      transform: scale(0.98);
    }
  `]
})
export class QuickActionsComponent {
  @Input() actions: string[] = [];
  @Output() actionSelected = new EventEmitter<string>();

  selectAction(action: string): void {
    this.actionSelected.emit(action);
  }
}
