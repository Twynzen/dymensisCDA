import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonChip, IonButton } from '@ionic/angular/standalone';
import { Character } from '../../../core/models';

@Component({
  selector: 'app-character-preview',
  standalone: true,
  imports: [CommonModule, IonIcon, IonChip, IonButton],
  template: `
    <div class="preview-card">
      <div class="preview-header">
        <div class="avatar-section">
          @if (character.avatar?.photoUrl) {
            <img [src]="character.avatar!.photoUrl" class="avatar" alt="Avatar">
          } @else {
            <div class="avatar-placeholder" [style.background]="character.avatar?.backgroundColor || '#667eea'">
              <ion-icon name="person-outline"></ion-icon>
            </div>
          }
          @if (character.progression?.awakening) {
            <div class="awakening-badge" [class]="'rank-' + character.progression!.awakening">
              {{ character.progression!.awakening }}
            </div>
          }
        </div>
        <div class="info-section">
          <h2>{{ character.name }}</h2>
          @if (character.progression) {
            <div class="level-info">
              <ion-icon name="star" color="warning"></ion-icon>
              <span>Nivel {{ character.progression.level }}</span>
            </div>
          }
          @if (character.progression?.title) {
            <span class="title">{{ character.progression?.title }}</span>
          }
        </div>
      </div>

      <div class="preview-content">
        @if (getDescription()) {
          <p class="description">{{ getDescription() }}</p>
        }

        @if (getBackstory()) {
          <div class="section">
            <h3>
              <ion-icon name="book"></ion-icon>
              Historia
            </h3>
            <p class="backstory">{{ getBackstory() }}</p>
          </div>
        }

        @if (character.stats) {
          <div class="section">
            <h3>
              <ion-icon name="stats-chart"></ion-icon>
              Estadísticas
            </h3>
            <div class="stats-list">
              @for (stat of statsList; track stat.key) {
                <div class="stat-row">
                  <span class="stat-name">{{ stat.key }}</span>
                  <div class="stat-bar-container">
                    <div
                      class="stat-bar"
                      [style.width.%]="(stat.value / 100) * 100"
                      [style.background]="getStatColor(stat.key)"
                    ></div>
                  </div>
                  <span class="stat-value">{{ stat.value }}</span>
                </div>
              }
            </div>
            <div class="total-stats">
              <span>Total:</span>
              <strong>{{ totalStats }}</strong>
            </div>
          </div>
        }

        @if (getPersonalityTraits().length > 0) {
          <div class="section">
            <h3>
              <ion-icon name="heart"></ion-icon>
              Personalidad
            </h3>
            <div class="traits-container">
              @for (trait of getPersonalityTraits(); track trait) {
                <ion-chip outline="true">{{ trait }}</ion-chip>
              }
            </div>
          </div>
        }
      </div>

      <div class="preview-actions">
        <ion-button fill="solid" color="primary" (click)="confirm.emit()">
          <ion-icon slot="start" name="checkmark"></ion-icon>
          Confirmar
        </ion-button>
        <ion-button fill="outline" (click)="adjust.emit()">
          <ion-icon slot="start" name="create"></ion-icon>
          Ajustar
        </ion-button>
        <ion-button fill="clear" (click)="regenerate.emit()">
          <ion-icon slot="icon-only" name="refresh"></ion-icon>
        </ion-button>
      </div>
    </div>
  `,
  styles: [`
    .preview-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      overflow: hidden;
      margin: 16px 0;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
    }

    .avatar-section {
      position: relative;
      flex-shrink: 0;
    }

    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid rgba(255, 255, 255, 0.2);
    }

    .avatar-placeholder {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid rgba(255, 255, 255, 0.2);
    }

    .avatar-placeholder ion-icon {
      font-size: 36px;
      color: white;
      opacity: 0.8;
    }

    .awakening-badge {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      border: 2px solid rgba(0, 0, 0, 0.3);
    }

    .rank-E { background: #9E9E9E; }
    .rank-D { background: #8BC34A; }
    .rank-C { background: #03A9F4; }
    .rank-B { background: #9C27B0; }
    .rank-A { background: #FF5722; }
    .rank-S, .rank-SS, .rank-SSS {
      background: linear-gradient(135deg, #FFD700, #FFA500);
      color: #000;
    }

    .info-section h2 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 600;
    }

    .level-info {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
    }

    .title {
      font-size: 12px;
      opacity: 0.7;
      font-style: italic;
    }

    .preview-content {
      padding: 16px;
    }

    .description {
      font-size: 14px;
      opacity: 0.8;
      margin: 0 0 16px 0;
      line-height: 1.5;
    }

    .section {
      margin-bottom: 16px;
    }

    .section h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 10px 0;
      opacity: 0.9;
    }

    .section h3 ion-icon {
      font-size: 16px;
      color: var(--ion-color-primary);
    }

    .backstory {
      font-size: 13px;
      opacity: 0.7;
      line-height: 1.6;
      margin: 0;
    }

    .stats-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stat-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-name {
      width: 60px;
      font-size: 12px;
      text-transform: uppercase;
      opacity: 0.7;
    }

    .stat-bar-container {
      flex: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .stat-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .stat-value {
      width: 32px;
      text-align: right;
      font-size: 13px;
      font-weight: 600;
      font-family: 'Roboto Mono', monospace;
    }

    .total-stats {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 14px;
    }

    .total-stats strong {
      color: var(--ion-color-primary);
    }

    .traits-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .traits-container ion-chip {
      --background: transparent;
      height: 28px;
      font-size: 12px;
    }

    .preview-actions {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .preview-actions ion-button {
      flex: 1;
    }

    .preview-actions ion-button:last-child {
      flex: 0;
    }
  `]
})
export class CharacterPreviewComponent {
  @Input() character!: Partial<Character>;
  @Output() confirm = new EventEmitter<void>();
  @Output() adjust = new EventEmitter<void>();
  @Output() regenerate = new EventEmitter<void>();

  private statColors: Record<string, string> = {
    strength: '#F44336',
    agility: '#03A9F4',
    vitality: '#4CAF50',
    intelligence: '#9C27B0',
    perception: '#FF9800',
    sense: '#00BCD4',
    charisma: '#E91E63',
    luck: '#FFEB3B'
  };

  get statsList(): Array<{ key: string; value: number }> {
    if (!this.character.stats) return [];
    return Object.entries(this.character.stats)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }

  get totalStats(): number {
    if (!this.character.stats) return 0;
    return Object.values(this.character.stats).reduce((sum, val) => sum + val, 0);
  }

  getStatColor(key: string): string {
    return this.statColors[key.toLowerCase()] || '#4CAF50';
  }

  // Helper methods for accessing optional properties from the AI-generated character
  getDescription(): string | null {
    return (this.character as any)?.description || null;
  }

  getBackstory(): string | null {
    return (this.character as any)?.backstory || null;
  }

  getPersonalityTraits(): string[] {
    return (this.character as any)?.personalityTraits || [];
  }
}
