import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Universe } from '../../../core/models';

@Component({
  selector: 'app-universe-selector',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="universe-selector">
      <p class="selector-title">{{ title }}</p>

      <div class="universes-grid">
        @for (universe of universes; track universe.id) {
          <div
            class="universe-card"
            [class.selected]="selectedId === universe.id"
            (click)="selectUniverse(universe)"
          >
            <div class="universe-icon">
              <ion-icon name="planet-outline"></ion-icon>
            </div>
            <div class="universe-info">
              <h4>{{ universe.name }}</h4>
              <p class="stats-count">
                <ion-icon name="stats-chart-outline"></ion-icon>
                {{ getStatsCount(universe) }} stats
              </p>
            </div>
            <ion-icon name="chevron-forward" class="chevron"></ion-icon>
          </div>
        }
      </div>

      @if (showCreateOption) {
        <div class="create-option" (click)="createNew.emit()">
          <ion-icon name="add-circle-outline"></ion-icon>
          <span>Crear un nuevo universo</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .universe-selector {
      padding: 12px;
    }

    .selector-title {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin: 0 0 12px 0;
      text-align: center;
    }

    .universes-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .universe-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border: 2px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .universe-card:hover {
      background: rgba(var(--ion-color-primary-rgb), 0.2);
      border-color: rgba(var(--ion-color-primary-rgb), 0.3);
    }

    .universe-card:active {
      transform: scale(0.98);
    }

    .universe-card.selected {
      border-color: var(--ion-color-primary);
      background: rgba(var(--ion-color-primary-rgb), 0.25);
    }

    .universe-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(var(--ion-color-primary-rgb), 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .universe-icon ion-icon {
      font-size: 24px;
      color: var(--ion-color-primary);
    }

    .universe-info {
      flex: 1;
      min-width: 0;
    }

    .universe-info h4 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stats-count {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .stats-count ion-icon {
      font-size: 14px;
    }

    .chevron {
      font-size: 20px;
      color: var(--ion-color-medium);
    }

    .create-option {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      margin-top: 12px;
      border: 2px dashed rgba(var(--ion-color-primary-rgb), 0.3);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--ion-color-primary);
    }

    .create-option:hover {
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-color: var(--ion-color-primary);
    }

    .create-option ion-icon {
      font-size: 20px;
    }

    .create-option span {
      font-size: 14px;
      font-weight: 500;
    }
  `]
})
export class UniverseSelectorComponent {
  @Input() universes: Universe[] = [];
  @Input() selectedId: string | null = null;
  @Input() title: string = 'Elige un universo:';
  @Input() showCreateOption: boolean = true;

  @Output() universeSelected = new EventEmitter<Universe>();
  @Output() createNew = new EventEmitter<void>();

  selectUniverse(universe: Universe): void {
    this.universeSelected.emit(universe);
  }

  getStatsCount(universe: Universe): number {
    return Object.keys(universe.statDefinitions || {}).length;
  }
}
