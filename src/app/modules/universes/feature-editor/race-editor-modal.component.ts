import { Component, Input, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons, IonButton, IonTitle,
  IonContent, IonItem, IonInput, IonTextarea, IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { ImageUploadComponent } from '../../../shared/ui/image-upload/image-upload.component';
import { Race, StatDefinition } from '../../../core/models';

@Component({
  selector: 'app-race-editor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonItem, IonInput, IonTextarea, IonIcon, ImageUploadComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">Cancelar</ion-button>
        </ion-buttons>
        <ion-title>{{ isNew ? 'Nueva Raza' : 'Editar Raza' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="save()" [strong]="true" [disabled]="!canSave()">
            Guardar
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Image -->
      <div class="form-section">
        <label class="section-label">Imagen de la Raza</label>
        <app-image-upload
          placeholder="Imagen de la raza"
          [value]="raceImage()"
          [maxSizeKB]="80"
          (imageChange)="raceImage.set($event)"
        ></app-image-upload>
      </div>

      <!-- Basic Info -->
      <div class="form-section">
        <ion-item>
          <ion-input
            [(ngModel)]="raceName"
            label="Nombre de la raza *"
            labelPlacement="stacked"
            placeholder="Ej: Humano, Elfo, Orco"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-textarea
            [(ngModel)]="raceDescription"
            label="Descripción"
            labelPlacement="stacked"
            placeholder="Describe las características de esta raza"
            [rows]="3"
          ></ion-textarea>
        </ion-item>
      </div>

      <!-- Points Budget -->
      <div class="budget-section" [class.over-budget]="isOverBudget()">
        <div class="budget-header">
          <span class="budget-title">Presupuesto de Puntos</span>
          <span class="budget-total">Total: {{ initialPoints }}</span>
        </div>
        <div class="budget-bar">
          <div
            class="budget-used"
            [style.width.%]="Math.min(100, (getTotalBaseStats() / initialPoints) * 100)"
          ></div>
        </div>
        <div class="budget-details">
          <div class="budget-item">
            <span>Stats base:</span>
            <strong [class.over]="isOverBudget()">{{ getTotalBaseStats() }}</strong>
          </div>
          <div class="budget-item">
            <span>Puntos libres:</span>
            <strong [class.zero]="calculatedFreePoints() === 0">{{ calculatedFreePoints() }}</strong>
          </div>
        </div>
        @if (isOverBudget()) {
          <p class="budget-warning">
            <ion-icon name="warning"></ion-icon>
            Excedes el presupuesto por {{ getTotalBaseStats() - initialPoints }} puntos
          </p>
        }
      </div>

      <!-- Stats -->
      <div class="form-section">
        <label class="section-label">Estadísticas Base</label>
        <p class="section-hint">Asigna puntos a los stats. Los puntos restantes serán libres para el jugador.</p>

        <div class="stats-grid">
          @for (statKey of statKeys; track statKey) {
            <div class="stat-input-group">
              <div class="stat-label" [style.color]="statDefinitions[statKey].color">
                {{ statDefinitions[statKey].abbreviation || statKey }}
              </div>
              <div class="stat-controls">
                <ion-button
                  fill="clear"
                  size="small"
                  (click)="decrementStat(statKey)"
                  [disabled]="baseStats[statKey] <= 0"
                >
                  <ion-icon slot="icon-only" name="remove"></ion-icon>
                </ion-button>
                <span class="stat-value">{{ baseStats[statKey] }}</span>
                <ion-button
                  fill="clear"
                  size="small"
                  (click)="incrementStat(statKey)"
                  [disabled]="isOverBudget()"
                >
                  <ion-icon slot="icon-only" name="add"></ion-icon>
                </ion-button>
              </div>
            </div>
          }
        </div>

        <div class="quick-actions">
          <ion-button fill="outline" size="small" (click)="resetStats()">
            <ion-icon slot="start" name="refresh"></ion-icon>
            Reiniciar
          </ion-button>
          <ion-button fill="outline" size="small" (click)="distributeEvenly()">
            <ion-icon slot="start" name="apps"></ion-icon>
            Distribuir
          </ion-button>
          <ion-button fill="outline" size="small" (click)="maxFreePoints()">
            <ion-icon slot="start" name="sparkles"></ion-icon>
            Todo libre
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .form-section {
      margin-bottom: 24px;
    }

    .section-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--ion-color-primary);
    }

    .section-hint {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 0 0 12px 0;
    }

    /* Budget Section */
    .budget-section {
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .budget-section.over-budget {
      background: rgba(var(--ion-color-danger-rgb), 0.15);
    }

    .budget-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .budget-title {
      font-weight: 600;
      font-size: 14px;
    }

    .budget-total {
      font-weight: 700;
      color: var(--ion-color-primary);
    }

    .over-budget .budget-total {
      color: var(--ion-color-danger);
    }

    .budget-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .budget-used {
      height: 100%;
      background: var(--ion-color-primary);
      border-radius: 4px;
      transition: width 0.2s ease;
    }

    .over-budget .budget-used {
      background: var(--ion-color-danger);
    }

    .budget-details {
      display: flex;
      justify-content: space-between;
    }

    .budget-item {
      display: flex;
      gap: 8px;
      font-size: 14px;
    }

    .budget-item strong {
      color: var(--ion-color-primary);
    }

    .budget-item strong.over {
      color: var(--ion-color-danger);
    }

    .budget-item strong.zero {
      color: var(--ion-color-warning);
    }

    .budget-warning {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 12px 0 0 0;
      font-size: 13px;
      color: var(--ion-color-danger);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 12px;
      margin-top: 8px;
    }

    .stat-input-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 12px 4px;
    }

    .stat-label {
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .stat-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stat-controls ion-button {
      --padding-start: 6px;
      --padding-end: 6px;
      margin: 0;
    }

    .stat-value {
      min-width: 28px;
      text-align: center;
      font-size: 18px;
      font-weight: 700;
    }

    .quick-actions {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    .quick-actions ion-button {
      --padding-start: 12px;
      --padding-end: 12px;
    }
  `]
})
export class RaceEditorModalComponent implements OnInit {
  @Input() race?: Race;
  @Input() statDefinitions: Record<string, StatDefinition> = {};
  @Input() initialPoints: number = 60;
  @Input() isNew = true;

  private modalController = inject(ModalController);

  Math = Math; // For template

  raceImage = signal<string | null>(null);
  raceName = '';
  raceDescription = '';
  baseStats: Record<string, number> = {};
  statKeys: string[] = [];

  // Computed free points based on budget
  calculatedFreePoints = computed(() => {
    return Math.max(0, this.initialPoints - this.getTotalBaseStats());
  });

  ngOnInit(): void {
    // Get stat keys (excluding derived stats)
    this.statKeys = Object.keys(this.statDefinitions).filter(
      key => !this.statDefinitions[key].isDerived
    );

    // Initialize baseStats with 0
    this.statKeys.forEach(key => {
      this.baseStats[key] = 0;
    });

    // Load existing race data if editing
    if (this.race) {
      this.isNew = false;
      this.raceName = this.race.name;
      this.raceDescription = this.race.description || '';
      this.raceImage.set(this.race.image || null);

      // Load base stats
      if (this.race.baseStats) {
        this.statKeys.forEach(key => {
          this.baseStats[key] = this.race!.baseStats[key] || 0;
        });
      }
    }
  }

  getTotalBaseStats(): number {
    return Object.values(this.baseStats).reduce((sum, val) => sum + (val || 0), 0);
  }

  isOverBudget(): boolean {
    return this.getTotalBaseStats() > this.initialPoints;
  }

  incrementStat(statKey: string): void {
    if (!this.isOverBudget()) {
      this.baseStats[statKey] = (this.baseStats[statKey] || 0) + 1;
    }
  }

  decrementStat(statKey: string): void {
    if (this.baseStats[statKey] > 0) {
      this.baseStats[statKey]--;
    }
  }

  resetStats(): void {
    this.statKeys.forEach(key => {
      this.baseStats[key] = 0;
    });
  }

  distributeEvenly(): void {
    const perStat = Math.floor(this.initialPoints / this.statKeys.length);
    this.statKeys.forEach(key => {
      this.baseStats[key] = perStat;
    });
  }

  maxFreePoints(): void {
    // Set all base stats to 0, giving all points as free
    this.resetStats();
  }

  canSave(): boolean {
    return this.raceName.trim().length > 0 && !this.isOverBudget();
  }

  cancel(): void {
    this.modalController.dismiss(null, 'cancel');
  }

  save(): void {
    if (!this.canSave()) return;

    const raceData: Race = {
      id: this.race?.id || `race_${Date.now()}`,
      name: this.raceName.trim(),
      description: this.raceDescription.trim() || '',
      image: this.raceImage() || undefined,
      baseStats: { ...this.baseStats },
      freePoints: this.calculatedFreePoints()
    };

    this.modalController.dismiss(raceData, 'save');
  }
}
