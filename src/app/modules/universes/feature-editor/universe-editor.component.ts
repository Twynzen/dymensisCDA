import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { UniverseStore } from '../data-access/universe.store';
import {
  Universe,
  StatDefinition,
  ProgressionRule,
  DEFAULT_STAT_DEFINITIONS,
  DEFAULT_PROGRESSION_RULES
} from '../../../core/models';

@Component({
  selector: 'app-universe-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/universes"></ion-back-button>
        </ion-buttons>
        <ion-title>Editar Universo</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="save()" [disabled]="saving()">
            @if (saving()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              <ion-icon slot="icon-only" name="checkmark"></ion-icon>
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (universeStore.loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
      } @else if (universe()) {
        <ion-segment [(ngModel)]="activeTab" class="editor-segment">
          <ion-segment-button value="info">
            <ion-label>Info</ion-label>
          </ion-segment-button>
          <ion-segment-button value="stats">
            <ion-label>Stats</ion-label>
          </ion-segment-button>
          <ion-segment-button value="rules">
            <ion-label>Reglas</ion-label>
          </ion-segment-button>
        </ion-segment>

        @switch (activeTab()) {
          @case ('info') {
            <div class="section-content">
              <ion-item>
                <ion-input
                  [(ngModel)]="universeName"
                  label="Nombre"
                  labelPlacement="floating"
                  placeholder="Nombre del universo"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-textarea
                  [(ngModel)]="universeDescription"
                  label="Descripción"
                  labelPlacement="floating"
                  placeholder="Describe las reglas de este universo"
                  [rows]="4"
                ></ion-textarea>
              </ion-item>

              <ion-item>
                <ion-toggle [(ngModel)]="isPublic">Universo Público</ion-toggle>
              </ion-item>
              <p class="hint">
                Los universos públicos pueden ser usados por otros jugadores
              </p>
            </div>
          }

          @case ('stats') {
            <div class="section-content">
              <ion-list-header>
                <ion-label>Estadísticas ({{ statsArray().length }})</ion-label>
                <ion-button (click)="addStat()">
                  <ion-icon slot="icon-only" name="add"></ion-icon>
                </ion-button>
              </ion-list-header>

              @for (stat of statsArray(); track stat.key) {
                <ion-item-sliding>
                  <ion-item>
                    <ion-icon [name]="stat.icon" slot="start" [style.color]="stat.color"></ion-icon>
                    <ion-label>
                      <h2>{{ stat.name }} ({{ stat.abbreviation }})</h2>
                      <p>
                        Rango: {{ stat.minValue }} - {{ stat.maxValue }}
                        | Default: {{ stat.defaultValue }}
                      </p>
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
                  <ion-button fill="outline" (click)="loadDefaultStats()">
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
                <ion-button (click)="addRule()">
                  <ion-icon slot="icon-only" name="add"></ion-icon>
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
                      <p>
                        Stats afectados: {{ rule.affectedStats.join(', ') }}
                        | Max: +{{ rule.maxChangePerAction }}
                      </p>
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
                  <p>No hay reglas de progresión definidas</p>
                  <ion-button fill="outline" (click)="loadDefaultRules()">
                    Cargar Reglas por Defecto
                  </ion-button>
                </div>
              }
            </div>
          }
        }
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
      padding: 0 16px 40px;
    }

    .hint {
      font-size: 12px;
      opacity: 0.6;
      padding: 8px 16px;
      margin: 0;
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
  `]
})
export class UniverseEditorComponent implements OnInit {
  universeStore = inject(UniverseStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  activeTab = signal<'info' | 'stats' | 'rules'>('info');
  saving = signal(false);
  universeId = signal<string | null>(null);

  // Form fields
  universeName = '';
  universeDescription = '';
  isPublic = false;
  statDefinitions = signal<Record<string, StatDefinition>>({});
  progressionRules = signal<ProgressionRule[]>([]);

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
    }
  }

  loadDefaultStats(): void {
    this.statDefinitions.set({ ...DEFAULT_STAT_DEFINITIONS });
  }

  loadDefaultRules(): void {
    this.progressionRules.set([...DEFAULT_PROGRESSION_RULES]);
  }

  async addStat(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Nueva Estadística',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Nombre (ej: Fuerza)' },
        { name: 'abbreviation', type: 'text', placeholder: 'Abreviación (ej: STR)' },
        { name: 'defaultValue', type: 'number', placeholder: 'Valor inicial (ej: 10)', value: '10' },
        { name: 'maxValue', type: 'number', placeholder: 'Valor máximo (ej: 999)', value: '999' },
        { name: 'color', type: 'text', placeholder: 'Color hex (ej: #FF5722)', value: '#4CAF50' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Añadir',
          handler: (data) => {
            if (!data.name?.trim()) return false;

            const key = data.name.toLowerCase().replace(/\s+/g, '_');
            this.statDefinitions.update(stats => ({
              ...stats,
              [key]: {
                name: data.name.trim(),
                abbreviation: data.abbreviation?.trim() || data.name.substring(0, 3).toUpperCase(),
                icon: 'stats-chart',
                minValue: 1,
                maxValue: parseInt(data.maxValue) || 999,
                defaultValue: parseInt(data.defaultValue) || 10,
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
        { name: 'name', type: 'text', placeholder: 'Nombre', value: stat.name },
        { name: 'abbreviation', type: 'text', placeholder: 'Abreviación', value: stat.abbreviation },
        { name: 'defaultValue', type: 'number', placeholder: 'Valor inicial', value: stat.defaultValue.toString() },
        { name: 'maxValue', type: 'number', placeholder: 'Valor máximo', value: stat.maxValue.toString() },
        { name: 'color', type: 'text', placeholder: 'Color hex', value: stat.color }
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
                defaultValue: parseInt(data.defaultValue) || 10,
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

  async addRule(): Promise<void> {
    const statKeys = Object.keys(this.statDefinitions());

    const alert = await this.alertController.create({
      header: 'Nueva Regla',
      inputs: [
        { name: 'description', type: 'text', placeholder: 'Descripción de la regla' },
        { name: 'keywords', type: 'textarea', placeholder: 'Keywords (separadas por coma)' },
        { name: 'affectedStats', type: 'text', placeholder: `Stats afectados (${statKeys.slice(0, 3).join(', ')})` },
        { name: 'maxChange', type: 'number', placeholder: 'Cambio máximo (1-10)', value: '3' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Añadir',
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
        { name: 'description', type: 'text', placeholder: 'Descripción', value: rule.description },
        { name: 'keywords', type: 'textarea', placeholder: 'Keywords', value: rule.keywords.join(', ') },
        { name: 'affectedStats', type: 'text', placeholder: 'Stats afectados', value: rule.affectedStats.join(', ') },
        { name: 'maxChange', type: 'number', placeholder: 'Cambio máximo', value: rule.maxChangePerAction.toString() }
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

  async save(): Promise<void> {
    if (!this.universeName.trim()) {
      await this.showToast('El nombre es requerido', 'warning');
      return;
    }

    this.saving.set(true);

    try {
      await this.universeStore.updateUniverse(this.universeId()!, {
        name: this.universeName.trim(),
        description: this.universeDescription.trim(),
        isPublic: this.isPublic,
        statDefinitions: this.statDefinitions(),
        progressionRules: this.progressionRules()
      });

      await this.showToast('Universo guardado', 'success');
      this.router.navigate(['/tabs/universes']);
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
