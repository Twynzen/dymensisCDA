import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonButton } from '@ionic/angular/standalone';
import { Universe, Character, StatDefinition } from '../../../core/models';

/**
 * Validation message for confirmation
 */
export interface ValidationMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  action?: string;
}

/**
 * Confirmation Flow Component
 * Shows a complete preview of the entity with validation and action buttons
 */
@Component({
  selector: 'app-confirmation-flow',
  standalone: true,
  imports: [CommonModule, IonIcon, IonButton],
  template: `
    <div class="confirmation-flow" [class.has-errors]="errors.length > 0">
      <!-- Header -->
      <div class="confirmation-header">
        <ion-icon
          [name]="errors.length > 0 ? 'alert-circle' : 'checkmark-circle'"
          [color]="errors.length > 0 ? 'danger' : 'success'"
        ></ion-icon>
        <h2>{{ errors.length > 0 ? 'Revisa los errores' : 'Revisa tu ' + entityType }}</h2>
      </div>

      <!-- Entity Preview Card -->
      <div class="preview-card">
        <!-- Universe Preview -->
        @if (entityType === 'universo' && universe) {
          <div class="entity-header">
            @if (universe.coverImage) {
              <div class="cover-image" [style.backgroundImage]="'url(' + universe.coverImage + ')'"></div>
            }
            <div class="entity-info">
              <h1>{{ universe.name || 'Sin nombre' }}</h1>
              <p class="description">{{ universe.description || 'Sin descripción' }}</p>
            </div>
          </div>

          <div class="entity-details">
            <!-- Stats Summary -->
            <div class="detail-section">
              <h3><ion-icon name="stats-chart-outline"></ion-icon> Estadísticas</h3>
              <div class="stats-grid">
                @for (stat of getUniverseStats(); track stat.key) {
                  <div class="stat-badge" [style.borderColor]="stat.color">
                    <ion-icon [name]="stat.icon"></ion-icon>
                    <span>{{ stat.abbreviation }}</span>
                  </div>
                }
              </div>
              <p class="detail-info">{{ getUniverseStatsCount() }} estadísticas configuradas</p>
            </div>

            <!-- Rank System -->
            @if (universe.awakeningSystem?.enabled && universe.awakeningSystem?.levels) {
              <div class="detail-section">
                <h3><ion-icon name="trophy-outline"></ion-icon> Sistema de Rangos</h3>
                <div class="ranks-row">
                  @for (rank of universe.awakeningSystem!.levels; track rank) {
                    <span class="rank-badge">{{ rank }}</span>
                  }
                </div>
              </div>
            }

            <!-- Progression Rules -->
            @if (universe.progressionRules && universe.progressionRules.length > 0) {
              <div class="detail-section">
                <h3><ion-icon name="trending-up-outline"></ion-icon> Reglas de Progresión</h3>
                <p class="detail-info">{{ universe.progressionRules!.length }} reglas configuradas</p>
              </div>
            }

            <!-- Initial Points -->
            <div class="detail-section">
              <h3><ion-icon name="star-outline"></ion-icon> Puntos Iniciales</h3>
              <p class="detail-info">{{ universe.initialPoints || 60 }} puntos para repartir</p>
            </div>
          </div>
        }

        <!-- Character Preview -->
        @if (entityType === 'personaje' && character) {
          <div class="entity-header">
            @if (character.avatar?.photoUrl) {
              <div class="avatar-image" [style.backgroundImage]="'url(' + character.avatar!.photoUrl + ')'"></div>
            } @else {
              <div class="avatar-placeholder" [style.backgroundColor]="character.avatar?.backgroundColor || '#6366f1'">
                {{ getCharacterInitials() }}
              </div>
            }
            <div class="entity-info">
              <h1>{{ character.name || 'Sin nombre' }}</h1>
              <p class="description">{{ character.backstory || 'Sin historia' }}</p>
            </div>
          </div>

          <div class="entity-details">
            <!-- Stats -->
            @if (character.stats) {
              <div class="detail-section">
                <h3><ion-icon name="stats-chart-outline"></ion-icon> Estadísticas</h3>
                <div class="character-stats">
                  @for (stat of getCharacterStats(); track stat.key) {
                    <div class="char-stat-row">
                      <span class="stat-name">{{ stat.name }}</span>
                      <div class="stat-bar-container">
                        <div class="stat-bar" [style.width.%]="stat.percentage" [style.backgroundColor]="stat.color"></div>
                      </div>
                      <span class="stat-value">{{ stat.value }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Progression -->
            @if (character.progression) {
              <div class="detail-section">
                <h3><ion-icon name="ribbon-outline"></ion-icon> Progresión</h3>
                <div class="progression-info">
                  <span class="rank-badge large">{{ character.progression.awakening || 'E' }}</span>
                  <span>Nivel {{ character.progression.level || 1 }}</span>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Validation Messages -->
      @if (errors.length > 0 || warnings.length > 0) {
        <div class="validation-section">
          @for (error of errors; track error.message) {
            <div class="validation-message error">
              <ion-icon name="close-circle"></ion-icon>
              <span>{{ error.message }}</span>
              @if (error.action) {
                <ion-button fill="clear" size="small" (click)="handleValidationAction(error)">
                  {{ error.action }}
                </ion-button>
              }
            </div>
          }
          @for (warning of warnings; track warning.message) {
            <div class="validation-message warning">
              <ion-icon name="warning"></ion-icon>
              <span>{{ warning.message }}</span>
              @if (warning.action) {
                <ion-button fill="clear" size="small" (click)="handleValidationAction(warning)">
                  {{ warning.action }}
                </ion-button>
              }
            </div>
          }
        </div>
      }

      <!-- Action Buttons -->
      <div class="action-buttons">
        <ion-button
          fill="solid"
          color="success"
          expand="block"
          [disabled]="errors.length > 0"
          (click)="onConfirm()"
        >
          <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
          Confirmar y Guardar
        </ion-button>

        <div class="secondary-actions">
          <ion-button fill="outline" color="primary" (click)="onAdjust()">
            <ion-icon slot="start" name="create-outline"></ion-icon>
            Ajustar
          </ion-button>

          @if (showUploadImage) {
            <ion-button fill="outline" color="tertiary" (click)="triggerImageUpload()">
              <ion-icon slot="start" name="image-outline"></ion-icon>
              Subir imagen
            </ion-button>
          }

          <ion-button fill="outline" color="warning" (click)="onRegenerate()">
            <ion-icon slot="start" name="refresh-outline"></ion-icon>
            Regenerar
          </ion-button>
        </div>

        <ion-button fill="clear" color="medium" expand="block" (click)="onDiscard()">
          <ion-icon slot="start" name="trash-outline"></ion-icon>
          Descartar
        </ion-button>
      </div>

      <!-- Hidden file input -->
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
    .confirmation-flow {
      padding: 16px;
    }

    .confirmation-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .confirmation-header ion-icon {
      font-size: 28px;
    }

    .confirmation-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .preview-card {
      background: rgba(var(--ion-color-primary-rgb), 0.05);
      border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .has-errors .preview-card {
      border-color: rgba(var(--ion-color-danger-rgb), 0.3);
    }

    .entity-header {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: rgba(0, 0, 0, 0.2);
    }

    .cover-image,
    .avatar-image {
      width: 80px;
      height: 80px;
      border-radius: 12px;
      background-size: cover;
      background-position: center;
      flex-shrink: 0;
    }

    .avatar-placeholder {
      width: 80px;
      height: 80px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .entity-info {
      flex: 1;
      min-width: 0;
    }

    .entity-info h1 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .entity-info .description {
      margin: 0;
      font-size: 13px;
      opacity: 0.7;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .entity-details {
      padding: 16px;
    }

    .detail-section {
      margin-bottom: 16px;
    }

    .detail-section:last-child {
      margin-bottom: 0;
    }

    .detail-section h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    .detail-section h3 ion-icon {
      font-size: 16px;
    }

    .stats-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }

    .stat-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
    }

    .stat-badge ion-icon {
      font-size: 14px;
    }

    .detail-info {
      margin: 0;
      font-size: 12px;
      opacity: 0.6;
    }

    .ranks-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .rank-badge {
      padding: 4px 10px;
      background: rgba(var(--ion-color-warning-rgb), 0.15);
      color: var(--ion-color-warning);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
    }

    .rank-badge.large {
      padding: 8px 16px;
      font-size: 18px;
    }

    .character-stats {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .char-stat-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-name {
      width: 80px;
      font-size: 12px;
      font-weight: 500;
    }

    .stat-bar-container {
      flex: 1;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .stat-bar {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .stat-value {
      width: 30px;
      text-align: right;
      font-size: 12px;
      font-weight: 600;
    }

    .progression-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .validation-section {
      margin-bottom: 16px;
    }

    .validation-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .validation-message:last-child {
      margin-bottom: 0;
    }

    .validation-message.error {
      background: rgba(var(--ion-color-danger-rgb), 0.15);
      color: var(--ion-color-danger);
    }

    .validation-message.warning {
      background: rgba(var(--ion-color-warning-rgb), 0.15);
      color: var(--ion-color-warning);
    }

    .validation-message ion-icon {
      font-size: 18px;
      flex-shrink: 0;
    }

    .validation-message span {
      flex: 1;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .secondary-actions {
      display: flex;
      gap: 8px;
    }

    .secondary-actions ion-button {
      flex: 1;
      --padding-start: 8px;
      --padding-end: 8px;
      font-size: 12px;
    }
  `]
})
export class ConfirmationFlowComponent {
  /** Type of entity being confirmed */
  @Input() entityType: 'universo' | 'personaje' = 'universo';

  /** Universe data (if confirming universe) */
  @Input() universe: Partial<Universe> | null = null;

  /** Character data (if confirming character) */
  @Input() character: Partial<Character> | null = null;

  /** Validation errors (block confirmation) */
  @Input() errors: ValidationMessage[] = [];

  /** Validation warnings (allow confirmation) */
  @Input() warnings: ValidationMessage[] = [];

  /** Whether to show upload image button */
  @Input() showUploadImage = true;

  /** Emits when user confirms */
  @Output() confirm = new EventEmitter<void>();

  /** Emits when user wants to adjust */
  @Output() adjust = new EventEmitter<void>();

  /** Emits when user wants to regenerate */
  @Output() regenerate = new EventEmitter<void>();

  /** Emits when user discards */
  @Output() discard = new EventEmitter<void>();

  /** Emits when image is selected */
  @Output() imageUploaded = new EventEmitter<{ base64: string; mimeType: string }>();

  /** Emits when a validation action is clicked */
  @Output() validationAction = new EventEmitter<ValidationMessage>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  getUniverseStats(): Array<{ key: string; name: string; abbreviation: string; icon: string; color: string }> {
    if (!this.universe?.statDefinitions) return [];

    return Object.entries(this.universe.statDefinitions).map(([key, def]) => ({
      key,
      name: def.name,
      abbreviation: def.abbreviation,
      icon: def.icon,
      color: def.color
    }));
  }

  getUniverseStatsCount(): number {
    if (!this.universe?.statDefinitions) return 0;
    return Object.keys(this.universe.statDefinitions).length;
  }

  getCharacterInitials(): string {
    if (!this.character?.name) return '?';
    return this.character.name
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getCharacterStats(): Array<{ key: string; name: string; value: number; percentage: number; color: string }> {
    if (!this.character?.stats) return [];

    // Default max for percentage calculation
    const maxValue = 100;

    return Object.entries(this.character.stats).map(([key, value]) => ({
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value as number,
      percentage: Math.min(((value as number) / maxValue) * 100, 100),
      color: this.getStatColor(key)
    }));
  }

  private getStatColor(statKey: string): string {
    const colors: Record<string, string> = {
      strength: '#FF5722',
      agility: '#4CAF50',
      vitality: '#E91E63',
      intelligence: '#2196F3',
      perception: '#9C27B0',
      charisma: '#FF9800',
      luck: '#FFEB3B'
    };
    return colors[statKey.toLowerCase()] || '#6366f1';
  }

  onConfirm(): void {
    if (this.errors.length === 0) {
      this.confirm.emit();
    }
  }

  onAdjust(): void {
    this.adjust.emit();
  }

  onRegenerate(): void {
    this.regenerate.emit();
  }

  onDiscard(): void {
    this.discard.emit();
  }

  triggerImageUpload(): void {
    this.fileInput.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imageUploaded.emit({
        base64: reader.result as string,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);

    input.value = '';
  }

  handleValidationAction(message: ValidationMessage): void {
    this.validationAction.emit(message);
  }
}
