import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Universe } from '../../../core/models';

@Component({
  selector: 'app-universe-preview',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="preview-card">
      <div class="preview-header" [style.background]="getHeaderBackground()">
        <ion-icon name="planet" class="preview-icon"></ion-icon>
        <h2>{{ universe.name }}</h2>
      </div>

      <div class="preview-content">
        <p class="description">{{ universe.description }}</p>

        <div class="section">
          <h3>
            <ion-icon name="stats-chart"></ion-icon>
            Estadísticas ({{ statsCount }})
          </h3>
          <div class="stats-grid">
            @for (stat of statsList; track stat.key) {
              <div class="stat-chip" [style.borderColor]="stat.color">
                <ion-icon [name]="stat.icon"></ion-icon>
                <span>{{ stat.abbreviation }}</span>
              </div>
            }
          </div>
        </div>

        @if (universe.awakeningSystem?.enabled) {
          <div class="section">
            <h3>
              <ion-icon name="trending-up"></ion-icon>
              Sistema de Rangos
            </h3>
            <div class="ranks-display">
              @for (rank of universe.awakeningSystem!.levels; track rank; let last = $last) {
                <span class="rank" [class]="'rank-' + rank">{{ rank }}</span>
                @if (!last) {
                  <ion-icon name="chevron-forward" class="rank-arrow"></ion-icon>
                }
              }
            </div>
          </div>
        }

        @if (universe.progressionRules && universe.progressionRules.length > 0) {
          <div class="section">
            <h3>
              <ion-icon name="flash"></ion-icon>
              Reglas de Progresión ({{ universe.progressionRules.length }})
            </h3>
            <ion-list lines="none" class="rules-list">
              @for (rule of universe.progressionRules.slice(0, 4); track rule.id) {
                <ion-item>
                  <ion-icon name="chevron-forward" slot="start" color="primary"></ion-icon>
                  <ion-label>
                    <p>{{ rule.description }}</p>
                  </ion-label>
                </ion-item>
              }
              @if (universe.progressionRules.length > 4) {
                <ion-item>
                  <ion-label color="medium">
                    <p>+{{ universe.progressionRules.length - 4 }} reglas más...</p>
                  </ion-label>
                </ion-item>
              }
            </ion-list>
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
      gap: 12px;
      padding: 20px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
    }

    .preview-icon {
      font-size: 32px;
      color: var(--ion-color-primary);
    }

    .preview-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
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
      margin: 0 0 8px 0;
      opacity: 0.9;
    }

    .section h3 ion-icon {
      font-size: 16px;
      color: var(--ion-color-primary);
    }

    .stats-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .stat-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      border-left: 3px solid;
      font-size: 13px;
    }

    .stat-chip ion-icon {
      font-size: 14px;
      opacity: 0.8;
    }

    .ranks-display {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
    }

    .rank {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.1);
    }

    .rank-arrow {
      font-size: 12px;
      opacity: 0.5;
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

    .rules-list {
      background: transparent;
      padding: 0;
    }

    .rules-list ion-item {
      --background: transparent;
      --padding-start: 0;
      --inner-padding-end: 0;
      --min-height: 32px;
    }

    .rules-list ion-item ion-icon {
      font-size: 14px;
      margin-right: 8px;
    }

    .rules-list ion-item p {
      font-size: 13px;
      margin: 0;
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
export class UniversePreviewComponent {
  @Input() universe!: Partial<Universe>;
  @Output() confirm = new EventEmitter<void>();
  @Output() adjust = new EventEmitter<void>();
  @Output() regenerate = new EventEmitter<void>();

  get statsCount(): number {
    return this.universe.statDefinitions
      ? Object.keys(this.universe.statDefinitions).length
      : 0;
  }

  get statsList(): Array<{ key: string; abbreviation: string; icon: string; color: string }> {
    if (!this.universe.statDefinitions) return [];
    return Object.entries(this.universe.statDefinitions).map(([key, def]) => ({
      key,
      abbreviation: def.abbreviation,
      icon: def.icon || 'stats-chart',
      color: def.color || '#4CAF50'
    }));
  }

  getHeaderBackground(): string {
    const coverImage = (this.universe as any)?.coverImage;
    if (coverImage) {
      return `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${coverImage}) center/cover`;
    }
    return 'linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3))';
  }
}
