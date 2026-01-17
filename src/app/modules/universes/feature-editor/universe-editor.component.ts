import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController, ToastController, ModalController } from '@ionic/angular';
import { UniverseStore } from '../data-access/universe.store';
import { ImageUploadComponent } from '../../../shared/ui/image-upload/image-upload.component';
import { RaceEditorModalComponent } from './race-editor-modal.component';
import {
  Universe,
  StatDefinition,
  ProgressionRule,
  Race,
  DEFAULT_STAT_DEFINITIONS,
  DEFAULT_PROGRESSION_RULES
} from '../../../core/models';

@Component({
  selector: 'app-universe-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ImageUploadComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/universes"></ion-back-button>
        </ion-buttons>
        <ion-title>Editar Universo</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (universeStore.loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
      } @else if (universe()) {
        <ion-segment [(ngModel)]="activeTabValue" class="editor-segment" [scrollable]="true">
          <ion-segment-button value="info">
            <ion-label>Info</ion-label>
          </ion-segment-button>
          <ion-segment-button value="stats">
            <ion-label>Stats</ion-label>
          </ion-segment-button>
          <ion-segment-button value="rules">
            <ion-label>Reglas</ion-label>
          </ion-segment-button>
          <ion-segment-button value="ranks">
            <ion-label>Rangos</ion-label>
          </ion-segment-button>
          <ion-segment-button value="races">
            <ion-label>Razas</ion-label>
          </ion-segment-button>
        </ion-segment>

        @switch (activeTabValue) {
          @case ('info') {
            <div class="section-content">
              <div class="form-group">
                <label class="form-label">Imagen del Universo</label>
                <app-image-upload
                  placeholder="Foto del universo"
                  [value]="coverImage()"
                  [maxSizeKB]="80"
                  (imageChange)="coverImage.set($event)"
                ></app-image-upload>
              </div>

              <div class="form-group">
                <ion-item>
                  <ion-input
                    [(ngModel)]="universeName"
                    label="Nombre del universo"
                    labelPlacement="stacked"
                    placeholder="Ej: Mundo de Fantasía"
                  ></ion-input>
                </ion-item>
              </div>

              <div class="form-group">
                <ion-item>
                  <ion-textarea
                    [(ngModel)]="universeDescription"
                    label="Descripción"
                    labelPlacement="stacked"
                    placeholder="Describe las reglas y ambientación"
                    [rows]="4"
                  ></ion-textarea>
                </ion-item>
              </div>

              <div class="form-group">
                <ion-item>
                  <ion-toggle [(ngModel)]="isPublic">
                    <ion-label>
                      <h3>Universo Público</h3>
                      <p>Otros jugadores podrán usar este universo</p>
                    </ion-label>
                  </ion-toggle>
                </ion-item>
              </div>

              <!-- Danger Zone - Solo en Info -->
              <div class="danger-zone">
                <p class="danger-label">Zona de peligro</p>
                <ion-button expand="block" color="danger" fill="outline" (click)="confirmDeleteUniverse()">
                  <ion-icon slot="start" name="trash"></ion-icon>
                  Eliminar Universo
                </ion-button>
              </div>
            </div>
          }

          @case ('stats') {
            <div class="section-content">
              <!-- Initial Points -->
              <div class="form-group initial-points-group">
                <ion-item button (click)="changeInitialPoints()">
                  <ion-icon name="cellular-outline" slot="start" color="primary"></ion-icon>
                  <ion-label>
                    <h2>Puntos base del universo</h2>
                    <p>Total que cada raza puede distribuir</p>
                  </ion-label>
                  <ion-badge slot="end" color="primary">{{ initialPoints }}</ion-badge>
                </ion-item>
              </div>

              <ion-list-header>
                <ion-label>Estadísticas ({{ statsArray().length }})</ion-label>
                <ion-button size="small" (click)="addStat()">
                  <ion-icon slot="start" name="add"></ion-icon>
                  Agregar
                </ion-button>
              </ion-list-header>

              @for (stat of statsArray(); track stat.key) {
                <ion-item-sliding>
                  <ion-item>
                    <ion-icon [name]="stat.icon || 'stats-chart'" slot="start" [style.color]="stat.color"></ion-icon>
                    <ion-label>
                      <h2>{{ stat.name }} ({{ stat.abbreviation }})</h2>
                      <p>Rango: {{ stat.minValue }} - {{ stat.maxValue }}</p>
                    </ion-label>
                    <ion-button fill="clear" slot="end" (click)="editStat(stat)">
                      <ion-icon slot="icon-only" name="create"></ion-icon>
                    </ion-button>
                  </ion-item>
                  <ion-item-options side="end">
                    <ion-item-option color="danger" (click)="deleteStat(stat.key)">
                      <ion-icon slot="icon-only" name="trash"></ion-icon>
                    </ion-item-option>
                  </ion-item-options>
                </ion-item-sliding>
              }

              @if (statsArray().length === 0) {
                <div class="empty-hint">
                  <p>No hay estadísticas definidas</p>
                  <ion-button fill="outline" size="small" (click)="loadDefaultStats()">
                    Cargar Stats por Defecto
                  </ion-button>
                </div>
              }
            </div>
          }

          @case ('rules') {
            <div class="section-content">
              <ion-list-header>
                <ion-label>Reglas de Progresión ({{ rulesArray().length }})</ion-label>
                <ion-button size="small" (click)="addRule()">
                  <ion-icon slot="start" name="add"></ion-icon>
                  Agregar
                </ion-button>
              </ion-list-header>

              @for (rule of rulesArray(); track rule.id) {
                <ion-item-sliding>
                  <ion-item>
                    <ion-label>
                      <h2>{{ rule.description }}</h2>
                      <p class="keywords">
                        Keywords: {{ rule.keywords.slice(0, 3).join(', ') }}
                        @if (rule.keywords.length > 3) {
                          <span>+{{ rule.keywords.length - 3 }} más</span>
                        }
                      </p>
                      <p>Stats: {{ rule.affectedStats.join(', ') }} | Max: +{{ rule.maxChangePerAction }}</p>
                    </ion-label>
                    <ion-button fill="clear" slot="end" (click)="editRule(rule)">
                      <ion-icon slot="icon-only" name="create"></ion-icon>
                    </ion-button>
                  </ion-item>
                  <ion-item-options side="end">
                    <ion-item-option color="danger" (click)="deleteRule(rule.id)">
                      <ion-icon slot="icon-only" name="trash"></ion-icon>
                    </ion-item-option>
                  </ion-item-options>
                </ion-item-sliding>
              }

              @if (rulesArray().length === 0) {
                <div class="empty-hint">
                  <p>No hay reglas de progresión</p>
                  <ion-button fill="outline" size="small" (click)="loadDefaultRules()">
                    Cargar Reglas por Defecto
                  </ion-button>
                </div>
              }
            </div>
          }

          @case ('ranks') {
            <div class="section-content">
              <div class="form-group">
                <ion-item>
                  <ion-toggle [(ngModel)]="awakeningEnabledValue">
                    <ion-label>
                      <h3>Sistema de Rangos</h3>
                      <p>Niveles de poder basados en stats totales</p>
                    </ion-label>
                  </ion-toggle>
                </ion-item>
              </div>

              @if (awakeningEnabledValue) {
                <ion-list-header>
                  <ion-label>Niveles de Rango ({{ awakeningLevels().length }})</ion-label>
                  <ion-button size="small" (click)="addRank()">
                    <ion-icon slot="start" name="add"></ion-icon>
                    Agregar
                  </ion-button>
                </ion-list-header>

                @for (level of awakeningLevels(); track $index; let i = $index) {
                  <ion-item-sliding>
                    <ion-item>
                      <ion-icon name="trophy" slot="start" color="warning"></ion-icon>
                      <ion-label>
                        <h2>{{ level }}</h2>
                        <p>Requiere {{ awakeningThresholds()[i] }} puntos totales</p>
                      </ion-label>
                      <ion-button fill="clear" slot="end" (click)="editRank(i)">
                        <ion-icon slot="icon-only" name="create"></ion-icon>
                      </ion-button>
                    </ion-item>
                    <ion-item-options side="end">
                      <ion-item-option color="danger" (click)="deleteRank(i)">
                        <ion-icon slot="icon-only" name="trash"></ion-icon>
                      </ion-item-option>
                    </ion-item-options>
                  </ion-item-sliding>
                }

                @if (awakeningLevels().length === 0) {
                  <div class="empty-hint">
                    <p>No hay rangos definidos</p>
                    <ion-button fill="outline" size="small" (click)="loadDefaultRanks()">
                      Cargar rangos por defecto
                    </ion-button>
                  </div>
                }
              }
            </div>
          }

          @case ('races') {
            <div class="section-content">
              <ion-list-header>
                <ion-label>Razas del Universo ({{ races().length }})</ion-label>
                <ion-button size="small" (click)="addRace()">
                  <ion-icon slot="start" name="add"></ion-icon>
                  Agregar
                </ion-button>
              </ion-list-header>

              @if (races().length === 0) {
                <div class="empty-hint">
                  <ion-icon name="people-outline" class="empty-icon"></ion-icon>
                  <p>Este universo no tiene razas definidas</p>
                  <p class="hint-small">Agrega razas para dar opciones a tus jugadores</p>
                </div>
              } @else {
                @for (race of races(); track race.id; let i = $index) {
                  <ion-item-sliding>
                    <ion-item (click)="editRace(i)" button>
                      @if (race.image) {
                        <ion-thumbnail slot="start" class="race-thumb">
                          <img [src]="race.image" [alt]="race.name" />
                        </ion-thumbnail>
                      } @else {
                        <div class="race-placeholder" slot="start">
                          <ion-icon name="person-outline"></ion-icon>
                        </div>
                      }
                      <ion-label>
                        <h2>{{ race.name }}</h2>
                        <p>{{ race.description || 'Sin descripción' }}</p>
                        <p class="race-meta">
                          <ion-icon name="sparkles"></ion-icon>
                          {{ race.freePoints }} puntos libres
                          @if (getRaceBaseStatsTotal(race) > 0) {
                            <span class="base-stats-info">
                              · {{ getRaceBaseStatsTotal(race) }} en stats base
                            </span>
                          }
                        </p>
                      </ion-label>
                    </ion-item>
                    <ion-item-options side="end">
                      <ion-item-option color="danger" (click)="deleteRace(i)">
                        <ion-icon slot="icon-only" name="trash"></ion-icon>
                      </ion-item-option>
                    </ion-item-options>
                  </ion-item-sliding>
                }
              }
            </div>
          }
        }

        <!-- Save Button -->
        <div class="action-buttons">
          <ion-button expand="block" (click)="save()" [disabled]="saving()" class="save-btn">
            @if (saving()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              <ion-icon slot="start" name="checkmark-circle"></ion-icon>
              Guardar Cambios
            }
          </ion-button>
        </div>

      }
    </ion-content>
  `,
  styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 50vh;
    }

    .editor-segment {
      margin: 16px;
    }

    .section-content {
      padding: 0 16px 20px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      padding-left: 4px;
      opacity: 0.8;
    }

    ion-list-header {
      margin-top: 8px;
    }

    .keywords {
      font-size: 12px;
      color: var(--ion-color-primary);
    }

    .empty-hint {
      text-align: center;
      padding: 40px 20px;
      opacity: 0.6;
    }

    .empty-hint p {
      margin-bottom: 16px;
    }

    .empty-icon {
      font-size: 64px;
      opacity: 0.3;
      margin-bottom: 16px;
    }

    .hint-small {
      font-size: 12px;
      opacity: 0.5;
    }

    .race-thumb {
      --size: 56px;
      --border-radius: 8px;
    }

    .race-icon {
      font-size: 56px;
      color: var(--ion-color-medium);
    }

    .race-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--ion-color-warning);
    }

    .race-meta ion-icon {
      font-size: 14px;
    }

    .race-placeholder {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
    }

    .race-placeholder ion-icon {
      font-size: 28px;
      color: rgba(255, 255, 255, 0.5);
    }

    .base-stats-info {
      opacity: 0.7;
    }

    .initial-points-group {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .field-hint {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 4px 16px 0;
    }

    .action-buttons {
      padding: 16px;
      padding-top: 24px;
    }

    .save-btn {
      --background: var(--ion-color-success);
      --background-hover: var(--ion-color-success-shade);
    }

    .danger-zone {
      padding: 16px;
      padding-bottom: 40px;
      margin-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .danger-label {
      font-size: 12px;
      color: var(--ion-color-danger);
      text-transform: uppercase;
      margin-bottom: 12px;
      opacity: 0.8;
      text-align: center;
    }
  `]
})
export class UniverseEditorComponent implements OnInit {
  universeStore = inject(UniverseStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private modalController = inject(ModalController);

  activeTabValue: 'info' | 'stats' | 'rules' | 'ranks' | 'races' = 'info';
  saving = signal(false);
  universeId = signal<string | null>(null);

  // Form fields
  universeName = '';
  universeDescription = '';
  isPublic = false;
  statDefinitions = signal<Record<string, StatDefinition>>({});
  progressionRules = signal<ProgressionRule[]>([]);

  // New fields
  coverImage = signal<string | null>(null);
  awakeningEnabledValue = false;
  awakeningLevels = signal<string[]>([]);
  awakeningThresholds = signal<number[]>([]);
  races = signal<Race[]>([]);
  initialPoints = 60; // Points budget for races

  universe = computed(() => this.universeStore.selectedUniverse());

  statsArray = computed(() =>
    Object.entries(this.statDefinitions())
      .filter(([, def]) => !def.isDerived)
      .map(([key, def]) => ({ key, ...def }))
  );

  rulesArray = computed(() => this.progressionRules());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.universeId.set(id);
      this.loadUniverse(id);
    }
  }

  async loadUniverse(id: string): Promise<void> {
    await this.universeStore.selectUniverse(id);
    const universe = this.universe();

    if (universe) {
      this.universeName = universe.name;
      this.universeDescription = universe.description;
      this.isPublic = universe.isPublic;
      this.statDefinitions.set({ ...universe.statDefinitions });
      this.progressionRules.set([...universe.progressionRules]);

      // Load new fields
      this.coverImage.set(universe.coverImage || null);
      this.awakeningEnabledValue = universe.awakeningSystem?.enabled === true;
      this.awakeningLevels.set(universe.awakeningSystem?.levels || []);
      this.awakeningThresholds.set(universe.awakeningSystem?.thresholds || []);
      this.races.set(universe.raceSystem?.races || []);
      this.initialPoints = universe.initialPoints || 60;
    }
  }

  loadDefaultStats(): void {
    this.statDefinitions.set({ ...DEFAULT_STAT_DEFINITIONS });
  }

  async changeInitialPoints(): Promise<void> {
    // Check affected races first
    const racesCount = this.races().length;

    const alert = await this.alertController.create({
      header: 'Puntos base',
      message: racesCount > 0
        ? `Valor actual: ${this.initialPoints}. Si reduces el valor, las razas que excedan se reiniciarán.`
        : `Valor actual: ${this.initialPoints}`,
      inputs: [
        {
          name: 'points',
          type: 'number',
          value: this.initialPoints.toString(),
          min: 1,
          max: 999,
          placeholder: 'Puntos totales'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aplicar',
          handler: (data) => {
            const newValue = parseInt(data.points) || this.initialPoints;
            if (newValue === this.initialPoints || newValue < 1) return true;

            // Check affected races
            const affectedRaces = this.races().filter(race => {
              const total = Object.values(race.baseStats || {}).reduce((sum, val) => sum + (val || 0), 0);
              return total > newValue;
            });

            if (affectedRaces.length > 0) {
              // Show confirmation for affected races
              this.confirmInitialPointsChange(newValue, affectedRaces.length);
            } else {
              // Apply directly
              this.applyInitialPointsChange(newValue);
            }
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private async confirmInitialPointsChange(newValue: number, affectedCount: number): Promise<void> {
    const confirm = await this.alertController.create({
      header: 'Confirmar cambio',
      message: `${affectedCount} raza(s) exceden ${newValue} puntos. Sus stats se reiniciarán a 0 y tendrán ${newValue} puntos libres.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          role: 'destructive',
          handler: () => {
            this.applyInitialPointsChange(newValue);
          }
        }
      ]
    });
    await confirm.present();
  }

  private applyInitialPointsChange(newValue: number): void {
    this.initialPoints = newValue;

    if (this.races().length > 0) {
      this.races.update(races =>
        races.map(race => {
          const total = Object.values(race.baseStats || {}).reduce((sum, val) => sum + (val || 0), 0);

          if (total > newValue) {
            // Reset stats for races that exceed
            const resetStats: Record<string, number> = {};
            Object.keys(race.baseStats || {}).forEach(key => {
              resetStats[key] = 0;
            });
            return { ...race, baseStats: resetStats, freePoints: newValue };
          }

          // Update freePoints for races within budget
          return { ...race, freePoints: newValue - total };
        })
      );
    }
  }

  loadDefaultRules(): void {
    this.progressionRules.set([...DEFAULT_PROGRESSION_RULES]);
  }

  loadDefaultRanks(): void {
    this.awakeningLevels.set(['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS']);
    this.awakeningThresholds.set([0, 50, 100, 200, 400, 800, 1500, 3000]);
  }

  // Stats methods
  async addStat(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Nueva Estadística',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Nombre (ej: Fuerza)', label: 'Nombre' },
        { name: 'abbreviation', type: 'text', placeholder: 'STR', label: 'Abreviación (3 letras)' },
        { name: 'maxValue', type: 'number', placeholder: '999', value: '999', label: 'Valor máximo' },
        { name: 'color', type: 'text', placeholder: '#4CAF50', value: '#4CAF50', label: 'Color (hex)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: (data) => {
            if (!data.name?.trim()) return false;
            const key = data.name.toLowerCase().replace(/\s+/g, '_');
            this.statDefinitions.update(stats => ({
              ...stats,
              [key]: {
                name: data.name.trim(),
                abbreviation: data.abbreviation?.trim() || data.name.substring(0, 3).toUpperCase(),
                icon: 'stats-chart',
                minValue: 0,
                maxValue: parseInt(data.maxValue) || 999,
                defaultValue: 10,
                category: 'primary',
                color: data.color || '#4CAF50'
              }
            }));
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async editStat(stat: StatDefinition & { key: string }): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Editar Estadística',
      inputs: [
        { name: 'name', type: 'text', value: stat.name, label: 'Nombre' },
        { name: 'abbreviation', type: 'text', value: stat.abbreviation, label: 'Abreviación' },
        { name: 'maxValue', type: 'number', value: stat.maxValue.toString(), label: 'Valor máximo' },
        { name: 'color', type: 'text', value: stat.color, label: 'Color (hex)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            this.statDefinitions.update(stats => ({
              ...stats,
              [stat.key]: {
                ...stats[stat.key],
                name: data.name.trim(),
                abbreviation: data.abbreviation.trim(),
                maxValue: parseInt(data.maxValue) || 999,
                color: data.color
              }
            }));
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  deleteStat(key: string): void {
    this.statDefinitions.update(stats => {
      const newStats = { ...stats };
      delete newStats[key];
      return newStats;
    });
  }

  // Rules methods
  async addRule(): Promise<void> {
    const statKeys = Object.keys(this.statDefinitions());
    const alert = await this.alertController.create({
      header: 'Nueva Regla de Progresión',
      inputs: [
        { name: 'description', type: 'text', placeholder: 'Entrenamiento físico', label: 'Descripción' },
        { name: 'keywords', type: 'textarea', placeholder: 'entrenar, ejercicio', label: 'Palabras clave (separadas por coma)' },
        { name: 'affectedStats', type: 'text', placeholder: statKeys.slice(0, 3).join(', '), label: 'Stats afectados (separados por coma)' },
        { name: 'maxChange', type: 'number', placeholder: '3', value: '3', label: 'Máximo cambio por acción (1-10)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: (data) => {
            if (!data.description?.trim() || !data.keywords?.trim()) return false;
            const newRule: ProgressionRule = {
              id: `rule_${Date.now()}`,
              description: data.description.trim(),
              keywords: data.keywords.split(',').map((k: string) => k.trim().toLowerCase()),
              affectedStats: data.affectedStats.split(',').map((s: string) => s.trim().toLowerCase()),
              maxChangePerAction: Math.min(10, Math.max(1, parseInt(data.maxChange) || 3))
            };
            this.progressionRules.update(rules => [...rules, newRule]);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async editRule(rule: ProgressionRule): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Editar Regla',
      inputs: [
        { name: 'description', type: 'text', value: rule.description, label: 'Descripción' },
        { name: 'keywords', type: 'textarea', value: rule.keywords.join(', '), label: 'Palabras clave' },
        { name: 'affectedStats', type: 'text', value: rule.affectedStats.join(', '), label: 'Stats afectados' },
        { name: 'maxChange', type: 'number', value: rule.maxChangePerAction.toString(), label: 'Máximo cambio (1-10)' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            this.progressionRules.update(rules =>
              rules.map(r =>
                r.id === rule.id
                  ? {
                      ...r,
                      description: data.description.trim(),
                      keywords: data.keywords.split(',').map((k: string) => k.trim().toLowerCase()),
                      affectedStats: data.affectedStats.split(',').map((s: string) => s.trim().toLowerCase()),
                      maxChangePerAction: Math.min(10, Math.max(1, parseInt(data.maxChange) || 3))
                    }
                  : r
              )
            );
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  deleteRule(ruleId: string): void {
    this.progressionRules.update(rules => rules.filter(r => r.id !== ruleId));
  }

  // Ranks methods
  async addRank(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Nuevo Rango',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'S, A, B...', label: 'Nombre del rango' },
        { name: 'threshold', type: 'number', placeholder: '100', label: 'Puntos totales necesarios' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: (data) => {
            if (!data.name?.trim()) return false;
            this.awakeningLevels.update(levels => [...levels, data.name.trim()]);
            this.awakeningThresholds.update(thresholds => [...thresholds, parseInt(data.threshold) || 0]);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async editRank(index: number): Promise<void> {
    const level = this.awakeningLevels()[index];
    const threshold = this.awakeningThresholds()[index];

    const alert = await this.alertController.create({
      header: 'Editar Rango',
      inputs: [
        { name: 'name', type: 'text', value: level, label: 'Nombre del rango' },
        { name: 'threshold', type: 'number', value: threshold.toString(), label: 'Puntos necesarios' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            this.awakeningLevels.update(levels => {
              const newLevels = [...levels];
              newLevels[index] = data.name.trim();
              return newLevels;
            });
            this.awakeningThresholds.update(thresholds => {
              const newThresholds = [...thresholds];
              newThresholds[index] = parseInt(data.threshold) || 0;
              return newThresholds;
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  deleteRank(index: number): void {
    this.awakeningLevels.update(levels => levels.filter((_, i) => i !== index));
    this.awakeningThresholds.update(thresholds => thresholds.filter((_, i) => i !== index));
  }

  // Race methods
  getRaceBaseStatsTotal(race: Race): number {
    if (!race.baseStats) return 0;
    return Object.values(race.baseStats).reduce((sum, val) => sum + (val || 0), 0);
  }

  async addRace(): Promise<void> {
    const modal = await this.modalController.create({
      component: RaceEditorModalComponent,
      componentProps: {
        statDefinitions: this.statDefinitions(),
        initialPoints: this.initialPoints,
        isNew: true
      }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'save' && data) {
      this.races.update(races => [...races, data]);
    }
  }

  async editRace(index: number): Promise<void> {
    const race = this.races()[index];
    if (!race) return;

    const modal = await this.modalController.create({
      component: RaceEditorModalComponent,
      componentProps: {
        race: { ...race },
        statDefinitions: this.statDefinitions(),
        initialPoints: this.initialPoints,
        isNew: false
      }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'save' && data) {
      this.races.update(races => {
        const newRaces = [...races];
        newRaces[index] = data;
        return newRaces;
      });
    }
  }

  deleteRace(index: number): void {
    this.races.update(races => races.filter((_, i) => i !== index));
  }

  // Delete Universe
  async confirmDeleteUniverse(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar Universo',
      message: '¿Estás seguro? Esta acción no se puede deshacer. Los personajes que usen este universo podrían verse afectados.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.universeStore.deleteUniverse(this.universeId()!);
              await this.showToast('Universo eliminado', 'success');
              this.router.navigate(['/tabs/universes']);
            } catch (error) {
              await this.showToast('Error al eliminar', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Save
  async save(): Promise<void> {
    if (!this.universeName.trim()) {
      await this.showToast('El nombre es requerido', 'warning');
      return;
    }

    this.saving.set(true);

    try {
      const updateData: Partial<Universe> = {
        name: this.universeName.trim(),
        description: this.universeDescription.trim(),
        isPublic: this.isPublic,
        coverImage: this.coverImage() || undefined,
        statDefinitions: this.statDefinitions(),
        progressionRules: this.progressionRules(),
        initialPoints: this.initialPoints,
        awakeningSystem: {
          enabled: this.awakeningEnabledValue,
          levels: this.awakeningLevels(),
          thresholds: this.awakeningThresholds()
        }
      };

      // Update race system
      updateData.raceSystem = {
        enabled: this.races().length > 0,
        races: this.races()
      };

      await this.universeStore.updateUniverse(this.universeId()!, updateData);

      await this.showToast('Universo guardado', 'success');
      this.router.navigate(['/tabs/universes', this.universeId()]);
    } catch (error) {
      await this.showToast('Error al guardar', 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
