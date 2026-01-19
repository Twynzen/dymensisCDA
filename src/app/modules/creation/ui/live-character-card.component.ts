import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { Universe } from '../../../core/models';

export interface LivePreviewData {
  name?: string;
  avatar?: string;
  description?: string;
  backstory?: string;
  class?: string;
  stats?: Record<string, number>;
  selectedUniverse?: Universe;
  universeId?: string;
}

@Component({
  selector: 'app-live-character-card',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="live-card" [class.expanded]="isExpanded" (click)="toggleExpand()">
      <!-- Compact view (always visible) -->
      <div class="card-header">
        <div class="avatar-container">
          @if (data.avatar) {
            <img [src]="data.avatar" alt="Avatar" class="avatar-img" />
          } @else {
            <div class="avatar-placeholder">
              <ion-icon name="person-outline"></ion-icon>
            </div>
          }
        </div>

        <div class="basic-info">
          <h3 class="name">{{ data.name || '---' }}</h3>
          <p class="universe-badge">
            <ion-icon name="planet-outline"></ion-icon>
            {{ data.selectedUniverse?.name || 'Sin universo' }}
          </p>
        </div>

        <div class="expand-indicator">
          <ion-icon [name]="isExpanded ? 'chevron-down' : 'chevron-up'"></ion-icon>
        </div>
      </div>

      <!-- Expanded details (shows on click) -->
      @if (isExpanded) {
        <div class="card-details">
          @if (data.class) {
            <div class="detail-row">
              <span class="label">Clase:</span>
              <span class="value">{{ data.class }}</span>
            </div>
          }

          @if (data.backstory || data.description) {
            <div class="detail-row">
              <span class="label">Historia:</span>
              <span class="value">{{ getStoryPreview() }}</span>
            </div>
          }

          <!-- Stats from universe -->
          @if (data.selectedUniverse?.statDefinitions) {
            <div class="stats-section">
              <span class="label">Estadísticas:</span>
              <div class="stats-grid">
                @for (stat of getStatEntries(); track stat.key) {
                  <div class="stat-item">
                    <span class="stat-abbr" [style.color]="stat.color">{{ stat.abbr }}</span>
                    <span class="stat-value">{{ data.stats?.[stat.key] ?? '---' }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <div class="completeness-bar">
            <div class="bar-fill" [style.width.%]="completenessPercent"></div>
          </div>
          <p class="completeness-text">{{ completenessPercent }}% completado</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .live-card {
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .live-card:hover {
      background: rgba(var(--ion-color-primary-rgb), 0.15);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar-container {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      background: rgba(var(--ion-color-medium-rgb), 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar-placeholder ion-icon {
      font-size: 24px;
      color: var(--ion-color-medium);
    }

    .basic-info {
      flex: 1;
      min-width: 0;
    }

    .name {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .universe-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .universe-badge ion-icon {
      font-size: 14px;
    }

    .expand-indicator {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ion-color-medium);
    }

    .card-details {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 8px;
    }

    .label {
      font-size: 11px;
      color: var(--ion-color-medium);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      font-size: 13px;
    }

    .stats-section {
      margin-bottom: 12px;
    }

    .stats-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
      min-width: 40px;
    }

    .stat-abbr {
      font-size: 10px;
      font-weight: 700;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 600;
    }

    .completeness-bar {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 8px;
    }

    .bar-fill {
      height: 100%;
      background: var(--ion-color-primary);
      transition: width 0.3s ease;
    }

    .completeness-text {
      font-size: 11px;
      color: var(--ion-color-medium);
      margin: 4px 0 0 0;
      text-align: center;
    }
  `]
})
export class LiveCharacterCardComponent {
  @Input() data: LivePreviewData = {};
  @Input() completenessPercent: number = 0;

  isExpanded = false;

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }

  getStoryPreview(): string {
    const story = this.data.backstory || this.data.description || '';
    if (story.length > 100) {
      return story.substring(0, 100) + '...';
    }
    return story;
  }

  getStatEntries(): Array<{ key: string; name: string; abbr: string; color: string }> {
    if (!this.data.selectedUniverse?.statDefinitions) {
      return [];
    }

    return Object.entries(this.data.selectedUniverse.statDefinitions).map(([key, def]) => ({
      key,
      name: def.name,
      abbr: def.abbreviation || def.name.substring(0, 3).toUpperCase(),
      color: def.color || '#666'
    }));
  }
}
