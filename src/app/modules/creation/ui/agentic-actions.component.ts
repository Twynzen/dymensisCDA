import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AgenticAction, AgenticActionType } from '../models/agentic-action.model';

/**
 * Agentic Actions Component
 * Displays contextual actions based on the current creation state
 */
@Component({
  selector: 'app-agentic-actions',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="agentic-actions-container" [class.expanded]="isExpanded">
      <!-- Main actions bar -->
      <div class="actions-bar">
        <div class="actions-scroll">
          @for (action of visibleActions; track action.id) {
            @switch (action.component) {
              @case ('chip') {
                <ion-chip
                  [color]="action.color || 'primary'"
                  [outline]="action.color !== 'success' && action.color !== 'danger'"
                  [disabled]="action.disabled"
                  (click)="handleAction(action)"
                  class="action-chip"
                >
                  @if (action.icon) {
                    <ion-icon [name]="action.icon"></ion-icon>
                  }
                  {{ action.label }}
                </ion-chip>
              }
              @case ('button') {
                <ion-button
                  [color]="action.color || 'primary'"
                  [disabled]="action.disabled"
                  fill="solid"
                  size="small"
                  (click)="handleAction(action)"
                  class="action-button"
                >
                  @if (action.icon) {
                    <ion-icon slot="start" [name]="action.icon"></ion-icon>
                  }
                  {{ action.label }}
                </ion-button>
              }
              @case ('upload') {
                <ion-button
                  [color]="action.color || 'tertiary'"
                  [disabled]="action.disabled"
                  fill="outline"
                  size="small"
                  (click)="triggerImageUpload(action)"
                  class="action-button upload-button"
                >
                  <ion-icon slot="start" [name]="action.icon || 'image-outline'"></ion-icon>
                  {{ action.label }}
                </ion-button>
              }
            }
          }
        </div>

        <!-- Expand/collapse button if many actions -->
        @if (allActions.length > maxVisibleActions) {
          <ion-button
            fill="clear"
            size="small"
            class="expand-button"
            (click)="toggleExpanded()"
          >
            <ion-icon
              slot="icon-only"
              [name]="isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'"
            ></ion-icon>
          </ion-button>
        }
      </div>

      <!-- Progress indicator -->
      @if (showProgress && completenessScore > 0) {
        <div class="progress-section">
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="completenessScore"
              [class.complete]="completenessScore >= 70"
            ></div>
          </div>
          <span class="progress-label">
            {{ completenessScore }}% completado
            @if (completenessScore >= 70) {
              <ion-icon name="checkmark-circle" color="success"></ion-icon>
            }
          </span>
        </div>
      }

      <!-- Hidden file input for image upload -->
      <input
        type="file"
        #fileInput
        accept="image/*"
        (change)="onImageSelected($event)"
        style="display: none"
      >
    </div>
  `,
  styles: [`
    .agentic-actions-container {
      padding: 8px 0;
    }

    .actions-bar {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .actions-scroll {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 4px 0;
      flex: 1;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .actions-scroll::-webkit-scrollbar {
      display: none;
    }

    .action-chip {
      flex-shrink: 0;
      cursor: pointer;
      transition: all 0.2s ease;
      height: 32px;
    }

    .action-chip:hover:not([disabled]) {
      transform: scale(1.02);
    }

    .action-chip ion-icon {
      font-size: 16px;
      margin-right: 4px;
    }

    .action-button {
      flex-shrink: 0;
      --border-radius: 16px;
      height: 32px;
      font-size: 13px;
    }

    .action-button ion-icon {
      font-size: 16px;
    }

    .upload-button {
      --border-style: dashed;
    }

    .expand-button {
      --padding-start: 4px;
      --padding-end: 4px;
      margin: 0;
      flex-shrink: 0;
    }

    .progress-section {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 0 4px;
    }

    .progress-bar {
      flex: 1;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--ion-color-primary);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .progress-fill.complete {
      background: var(--ion-color-success);
    }

    .progress-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      opacity: 0.7;
      white-space: nowrap;
    }

    .progress-label ion-icon {
      font-size: 14px;
    }

    /* Expanded state shows all actions in a grid */
    .agentic-actions-container.expanded .actions-scroll {
      flex-wrap: wrap;
      overflow-x: visible;
    }
  `]
})
export class AgenticActionsComponent {
  /** All available actions */
  @Input() allActions: AgenticAction[] = [];

  /** Maximum actions to show before expanding */
  @Input() maxVisibleActions = 4;

  /** Whether to show progress indicator */
  @Input() showProgress = true;

  /** Completeness score (0-100) */
  @Input() completenessScore = 0;

  /** Emits when an action is triggered */
  @Output() actionTriggered = new EventEmitter<AgenticAction>();

  /** Emits when an image is selected */
  @Output() imageSelected = new EventEmitter<{ base64: string; mimeType: string; action: AgenticAction }>();

  /** Emits when text input is requested (for chips that act as input) */
  @Output() textInputRequested = new EventEmitter<string>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  /** Whether actions are expanded */
  isExpanded = false;

  /** Action pending image upload */
  private pendingUploadAction: AgenticAction | null = null;

  /**
   * Get visible actions based on expansion state
   */
  get visibleActions(): AgenticAction[] {
    if (this.isExpanded) {
      return this.allActions;
    }
    return this.allActions.slice(0, this.maxVisibleActions);
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  async handleAction(action: AgenticAction): Promise<void> {
    if (action.disabled) return;

    // Emit the action for parent to handle
    this.actionTriggered.emit(action);

    // If action has a handler, execute it
    if (action.handler) {
      try {
        await action.handler();
      } catch (error) {
        console.error('[AgenticActions] Handler error:', error);
      }
    }

    // Special handling for certain action types
    switch (action.type) {
      case 'image_upload':
        this.triggerImageUpload(action);
        break;
      case 'quick_select':
        // Emit as text input
        this.textInputRequested.emit(action.label);
        break;
    }
  }

  triggerImageUpload(action: AgenticAction): void {
    this.pendingUploadAction = action;
    this.fileInput.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || !this.pendingUploadAction) {
      this.pendingUploadAction = null;
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.pendingUploadAction = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.imageSelected.emit({
        base64,
        mimeType: file.type,
        action: this.pendingUploadAction!
      });
      this.pendingUploadAction = null;
    };
    reader.readAsDataURL(file);

    // Reset input
    input.value = '';
  }
}
