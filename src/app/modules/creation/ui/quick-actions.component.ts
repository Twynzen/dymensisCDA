import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { QuickAction, isQuickAction, stringsToQuickActions } from '../models/quick-action.model';

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="quick-actions-container">
      <div class="actions-scroll">
        @for (action of normalizedActions; track action.id) {
          <ion-chip
            [color]="action.color || 'primary'"
            [outline]="!action.color || action.color === 'primary'"
            [disabled]="action.disabled"
            (click)="handleAction(action)"
          >
            @if (action.icon) {
              <ion-icon [name]="action.icon" class="action-icon"></ion-icon>
            }
            {{ action.label }}
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

    ion-chip[color="success"] {
      --color: var(--ion-color-success);
    }

    ion-chip[color="warning"] {
      --color: var(--ion-color-warning);
    }

    ion-chip[color="tertiary"] {
      --color: var(--ion-color-tertiary);
    }

    ion-chip:hover {
      --background: rgba(var(--ion-color-primary-rgb), 0.1);
      transform: scale(1.02);
    }

    ion-chip:active {
      transform: scale(0.98);
    }

    ion-chip[disabled] {
      opacity: 0.5;
      pointer-events: none;
    }

    .action-icon {
      margin-right: 4px;
      font-size: 16px;
    }
  `]
})
export class QuickActionsComponent {
  /** Accepts both string[] (legacy) and QuickAction[] */
  @Input() actions: (string | QuickAction)[] = [];

  /** Emits when a text input should be sent */
  @Output() actionSelected = new EventEmitter<string>();

  /** Emits when any action is executed */
  @Output() actionExecuted = new EventEmitter<QuickAction>();

  /**
   * Normalize actions to QuickAction[] format
   */
  get normalizedActions(): QuickAction[] {
    if (!this.actions || this.actions.length === 0) {
      return [];
    }

    // Check if it's a string array (legacy format)
    if (typeof this.actions[0] === 'string') {
      return stringsToQuickActions(this.actions as string[]);
    }

    // Already QuickAction[]
    return this.actions as QuickAction[];
  }

  /**
   * Handle action execution based on action type
   */
  async handleAction(action: QuickAction): Promise<void> {
    if (action.disabled) return;

    switch (action.type) {
      case 'input':
        // Send as text input (original behavior)
        this.actionSelected.emit(action.inputText ?? action.label);
        break;

      case 'execute':
      case 'confirm':
      case 'generate':
        // Execute the handler function
        if (action.handler) {
          try {
            await action.handler();
          } catch (error) {
            console.error('[QuickActions] Handler error:', error);
          }
        }
        break;

      case 'navigate':
        // Navigation would be handled by parent component
        this.actionExecuted.emit(action);
        break;

      case 'edit':
        // Edit mode would be handled by parent component
        this.actionExecuted.emit(action);
        break;

      default:
        // Default to input behavior
        this.actionSelected.emit(action.label);
    }

    // Always emit the action for tracking/analytics
    this.actionExecuted.emit(action);
  }
}
