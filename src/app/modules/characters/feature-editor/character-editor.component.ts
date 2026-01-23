import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonIcon, IonSpinner,
  IonContent, IonListHeader, IonLabel, IonItem, IonInput, IonTextarea, IonSelect, IonSelectOption, IonBadge,
  ToastController, AlertController
} from '@ionic/angular/standalone';
import { CharacterStore } from '../data-access/character.store';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { FirebaseService } from '../../../core/services/firebase.service';
import { StatBarComponent } from '../../../shared/ui/stat-bar/stat-bar.component';
import { ImageUploadComponent } from '../../../shared/ui/image-upload/image-upload.component';
import { Character, StatDefinition } from '../../../core/models';

interface EditableStat {
  key: string;
  name: string;
  abbreviation: string;
  icon: string;
  value: number;
  minValue: number;
  maxValue: number;
  color: string;
}

interface StatJustification {
  stat: string;
  oldValue: number;
  newValue: number;
  reason: string;
}

@Component({
  selector: 'app-character-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonIcon, IonSpinner, IonContent, IonListHeader, IonLabel, IonItem, IonInput, IonTextarea, IonSelect, IonSelectOption, IonBadge, StatBarComponent, ImageUploadComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="backUrl()"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEditing() ? 'Editar' : 'Nuevo' }} Personaje</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="save()" [disabled]="!canSave() || saving()">
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
      <form class="editor-form">
        <!-- Basic Info -->
        <ion-list-header>
          <ion-label>Información Básica</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-input
            [(ngModel)]="characterName"
            name="name"
            label="Nombre del Personaje"
            labelPlacement="floating"
            placeholder="Ej: Sung Jin-Woo"
            [maxlength]="50"
            required
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-textarea
            [(ngModel)]="characterDescription"
            name="description"
            label="Descripción"
            labelPlacement="floating"
            placeholder="Breve descripción del personaje, su historia o personalidad..."
            [rows]="3"
            [autoGrow]="true"
            [maxlength]="500"
          ></ion-textarea>
        </ion-item>

        @if (!isEditing()) {
          <ion-item>
            <ion-select
              [(ngModel)]="selectedUniverseId"
              name="universe"
              label="Universo"
              labelPlacement="floating"
              placeholder="Selecciona un universo"
              (ionChange)="onUniverseChange()"
            >
              @for (universe of universeStore.allUniverses(); track universe.id) {
                <ion-select-option [value]="universe.id">
                  {{ universe.name }}
                </ion-select-option>
              }
            </ion-select>
          </ion-item>
        }

        <!-- Avatar -->
        <ion-list-header>
          <ion-label>Avatar</ion-label>
        </ion-list-header>

        <div class="avatar-section">
          <app-image-upload
            placeholder="Arrastra una imagen o haz clic para seleccionar"
            [value]="avatarImage()"
            [maxSizeKB]="200"
            [maxWidth]="400"
            [maxHeight]="400"
            (imageChange)="avatarImage.set($event)"
          ></app-image-upload>

          <ion-item class="color-item">
            <ion-label>Color de Fondo</ion-label>
            <input
              type="color"
              [(ngModel)]="backgroundColor"
              name="backgroundColor"
              class="color-picker"
            />
          </ion-item>
        </div>

        <!-- Stats -->
        @if (editableStats().length > 0) {
          <ion-list-header>
            <ion-label>Estadísticas</ion-label>
            @if (hasStatChanges()) {
              <ion-badge color="warning">{{ changedStatsCount() }} cambios</ion-badge>
            }
          </ion-list-header>

          <!-- Growth System Notice -->
          @if (isEditing() && universeHasGrowthSystem()) {
            <div class="growth-notice">
              <ion-icon name="trending-up" color="success"></ion-icon>
              <div class="growth-notice-content">
                <strong>Sistema de Crecimiento Activo</strong>
                <p>Los cambios se agregan como puntos de crecimiento, sin modificar los stats base.</p>
              </div>
            </div>
          }

          <div class="stats-editor">
            @for (stat of editableStats(); track stat.key) {
              <div class="stat-editor-item" [class.stat-changed]="statHasChanged(stat.key)">
                <div class="stat-header">
                  <div class="stat-info">
                    <ion-icon [name]="stat.icon" [style.color]="stat.color"></ion-icon>
                    <span class="stat-name">{{ stat.name }}</span>
                    <span class="stat-abbr">({{ stat.abbreviation }})</span>
                  </div>
                  <div class="stat-controls">
                    <ion-button
                      fill="clear"
                      size="small"
                      (click)="decrementStat(stat.key)"
                      [disabled]="getStatValue(stat.key) <= stat.minValue"
                    >
                      <ion-icon slot="icon-only" name="remove-circle" color="danger"></ion-icon>
                    </ion-button>
                    <span class="stat-value-display" [style.color]="stat.color">
                      {{ getStatValue(stat.key) }}
                    </span>
                    @if (isEditing() && universeHasGrowthSystem()) {
                      <span class="stat-breakdown-mini">
                        ({{ getBaseStatValue(stat.key) }}+{{ getGrowthStatValue(stat.key) }})
                      </span>
                    }
                    <ion-button
                      fill="clear"
                      size="small"
                      (click)="incrementStat(stat.key)"
                      [disabled]="getStatValue(stat.key) >= stat.maxValue"
                    >
                      <ion-icon slot="icon-only" name="add-circle" color="success"></ion-icon>
                    </ion-button>
                  </div>
                </div>

                <!-- Justification field when stat changed -->
                @if (statHasChanged(stat.key)) {
                  <div class="stat-change-info">
                    <span class="change-indicator" [class.positive]="getStatChange(stat.key) > 0" [class.negative]="getStatChange(stat.key) < 0">
                      {{ getStatChange(stat.key) > 0 ? '+' : '' }}{{ getStatChange(stat.key) }}
                    </span>
                    <ion-item class="justification-item">
                      <ion-textarea
                        [ngModel]="getJustification(stat.key)"
                        (ngModelChange)="setJustification(stat.key, $event)"
                        [name]="'justification_' + stat.key"
                        label="¿Por qué cambia esta estadística?"
                        labelPlacement="floating"
                        placeholder="Ej: Entrenamiento intensivo, batalla reciente, nuevo equipo..."
                        [rows]="2"
                        [autoGrow]="true"
                        [maxlength]="200"
                      ></ion-textarea>
                    </ion-item>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Stats Summary -->
          <div class="stats-summary">
            <div class="summary-item">
              <span class="summary-label">Total actual:</span>
              <span class="summary-value">{{ totalStats() }}</span>
            </div>
            @if (hasStatChanges()) {
              <div class="summary-item">
                <span class="summary-label">Cambio total:</span>
                <span class="summary-value" [class.positive]="totalStatChange() > 0" [class.negative]="totalStatChange() < 0">
                  {{ totalStatChange() > 0 ? '+' : '' }}{{ totalStatChange() }}
                </span>
              </div>
            }
          </div>
        }

        <!-- Progression (only if universe has awakening) -->
        @if (isEditing() && universeHasAwakening()) {
          <ion-list-header>
            <ion-label>Progresión</ion-label>
          </ion-list-header>

          <ion-item>
            <ion-input
              [(ngModel)]="title"
              name="title"
              label="Título"
              labelPlacement="floating"
              placeholder="Ej: Shadow Monarch, El Destructor"
              [maxlength]="50"
            ></ion-input>
          </ion-item>

          <div class="awakening-display">
            <span class="awakening-label">Rango actual:</span>
            <span class="awakening-badge" [class]="'rank-' + currentAwakening()">
              {{ currentAwakening() }}
            </span>
          </div>
        }

        <!-- Save Button (visible when editing) -->
        @if (isEditing()) {
          <div class="save-section">
            <ion-button expand="block" color="success" (click)="save()" [disabled]="!canSave() || saving()">
              @if (saving()) {
                <ion-spinner name="crescent"></ion-spinner>
              } @else {
                <ion-icon slot="start" name="checkmark-circle"></ion-icon>
                Guardar Cambios
              }
            </ion-button>
            @if (hasStatChanges() && !allJustificationsProvided()) {
              <p class="save-hint warning">⚠️ Escribe la razón de cada cambio de estadística para poder guardar</p>
            } @else if (hasStatChanges()) {
              <p class="save-hint">Se registrarán {{ changedStatsCount() }} cambio(s) de estadísticas con sus justificaciones</p>
            }
          </div>
        }

        <!-- Delete Button (only when editing) -->
        @if (isEditing()) {
          <div class="danger-zone">
            <p class="danger-label">Zona de peligro</p>
            <ion-button expand="block" color="danger" fill="outline" (click)="confirmDelete()">
              <ion-icon slot="start" name="trash"></ion-icon>
              Eliminar Personaje
            </ion-button>
          </div>
        }
      </form>
    </ion-content>
  `,
  styles: [`
    .editor-form {
      padding-bottom: 40px;
    }

    ion-list-header {
      margin-top: 16px;
    }

    .avatar-section {
      padding: 16px;
    }

    .color-item {
      margin-top: 16px;
      --background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }

    .color-picker {
      width: 50px;
      height: 40px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      background: transparent;
    }

    .stats-editor {
      padding: 16px;
    }

    .stat-editor-item {
      margin-bottom: 16px;
      background: rgba(255, 255, 255, 0.05);
      padding: 12px;
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    .stat-editor-item.stat-changed {
      background: rgba(255, 193, 7, 0.1);
      border: 1px solid rgba(255, 193, 7, 0.3);
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-info ion-icon {
      font-size: 24px;
    }

    .stat-name {
      font-weight: 500;
    }

    .stat-abbr {
      font-size: 12px;
      opacity: 0.5;
    }

    .stat-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stat-controls ion-button {
      --padding-start: 4px;
      --padding-end: 4px;
      margin: 0;
    }

    .stat-controls ion-icon {
      font-size: 32px;
    }

    .stat-value-display {
      font-size: 28px;
      font-weight: 700;
      font-family: 'Roboto Mono', monospace;
      min-width: 50px;
      text-align: center;
    }

    .stat-change-info {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .change-indicator {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .change-indicator.positive {
      background: rgba(76, 175, 80, 0.2);
      color: #4CAF50;
    }

    .change-indicator.negative {
      background: rgba(244, 67, 54, 0.2);
      color: #F44336;
    }

    .justification-item {
      --background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      margin-top: 8px;
    }

    .stats-summary {
      display: flex;
      justify-content: space-around;
      padding: 16px;
      margin: 0 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }

    .summary-item {
      text-align: center;
    }

    .summary-label {
      font-size: 12px;
      opacity: 0.7;
      display: block;
    }

    .summary-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--ion-color-primary);
    }

    .summary-value.positive {
      color: #4CAF50;
    }

    .summary-value.negative {
      color: #F44336;
    }

    .awakening-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px;
      margin: 0 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }

    .awakening-label {
      font-size: 14px;
      opacity: 0.7;
    }

    .awakening-badge {
      padding: 6px 16px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 700;
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

    .save-section {
      padding: 16px;
      margin-top: 24px;
      background: rgba(var(--ion-color-success-rgb), 0.1);
      border-radius: 12px;
      margin-left: 16px;
      margin-right: 16px;
    }

    .save-hint {
      font-size: 12px;
      text-align: center;
      opacity: 0.7;
      margin: 8px 0 0 0;
    }

    .save-hint.warning {
      color: var(--ion-color-warning);
      opacity: 1;
      font-weight: 500;
    }

    .danger-zone {
      padding: 16px;
      margin-top: 32px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .danger-label {
      font-size: 12px;
      color: var(--ion-color-danger);
      text-transform: uppercase;
      margin-bottom: 12px;
      opacity: 0.8;
    }

    /* Growth System Styles */
    .growth-notice {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      margin: 8px 16px 16px;
      background: rgba(var(--ion-color-success-rgb), 0.1);
      border: 1px solid rgba(var(--ion-color-success-rgb), 0.3);
      border-radius: 8px;
    }

    .growth-notice ion-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .growth-notice-content strong {
      display: block;
      font-size: 14px;
      color: var(--ion-color-success);
    }

    .growth-notice-content p {
      margin: 4px 0 0;
      font-size: 12px;
      opacity: 0.8;
    }

    .stat-breakdown-mini {
      font-size: 11px;
      color: var(--ion-color-success);
      margin-left: 4px;
      opacity: 0.8;
    }
  `]
})
export class CharacterEditorComponent implements OnInit {
  characterStore = inject(CharacterStore);
  universeStore = inject(UniverseStore);
  private firebaseService = inject(FirebaseService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  isEditing = signal(false);
  saving = signal(false);
  characterId = signal<string | null>(null);

  // Form fields
  characterName = '';
  characterDescription = '';
  selectedUniverseId = '';
  avatarImage = signal<string | null>(null);
  backgroundColor = '#1a1a2e';
  stats = signal<Record<string, number>>({});
  originalStats = signal<Record<string, number>>({});
  // Growth stats: puntos de crecimiento separados (solo se usa con hasGrowthSystem)
  growthStats = signal<Record<string, number>>({});
  originalGrowthStats = signal<Record<string, number>>({});
  justifications = signal<Record<string, string>>({});
  title = '';

  backUrl = computed(() =>
    this.isEditing() ? `/tabs/characters/${this.characterId()}` : '/tabs/characters'
  );

  editableStats = computed<EditableStat[]>(() => {
    const universeId = this.isEditing()
      ? this.characterStore.selectedCharacter()?.universeId
      : this.selectedUniverseId;

    if (!universeId) return [];

    const universe = this.universeStore.allUniverses().find(u => u.id === universeId);
    if (!universe) return [];

    return Object.entries(universe.statDefinitions)
      .filter(([, def]) => !def.isDerived)
      .map(([key, def]) => ({
        key,
        name: def.name,
        abbreviation: def.abbreviation,
        icon: def.icon,
        value: 0,
        minValue: def.minValue,
        maxValue: def.maxValue,
        color: def.color
      }));
  });

  universeHasAwakening = computed(() => {
    const universeId = this.isEditing()
      ? this.characterStore.selectedCharacter()?.universeId
      : this.selectedUniverseId;
    const universe = this.universeStore.allUniverses().find(u => u.id === universeId);
    return universe?.awakeningSystem?.enabled === true;
  });

  // Detecta si el universo tiene sistema de crecimiento habilitado
  universeHasGrowthSystem = computed(() => {
    const universeId = this.isEditing()
      ? this.characterStore.selectedCharacter()?.universeId
      : this.selectedUniverseId;
    const universe = this.universeStore.allUniverses().find(u => u.id === universeId);
    return universe?.hasGrowthSystem === true;
  });

  currentAwakening = computed(() => {
    return this.characterStore.selectedCharacter()?.progression?.awakening ?? 'E';
  });

  totalStats = computed(() => {
    return Object.values(this.stats()).reduce((sum, val) => sum + val, 0);
  });

  totalStatChange = computed(() => {
    // Si tiene growth system y estamos editando, calcular cambio en growthStats
    if (this.isEditing() && this.universeHasGrowthSystem()) {
      const current = this.growthStats();
      const original = this.originalGrowthStats();
      let change = 0;
      const allKeys = new Set([...Object.keys(current), ...Object.keys(original)]);
      for (const key of allKeys) {
        change += (current[key] ?? 0) - (original[key] ?? 0);
      }
      return change;
    }

    const current = this.stats();
    const original = this.originalStats();
    let change = 0;
    for (const key of Object.keys(current)) {
      change += (current[key] ?? 0) - (original[key] ?? 0);
    }
    return change;
  });

  hasStatChanges = computed(() => {
    return this.changedStatsCount() > 0;
  });

  allJustificationsProvided = computed(() => {
    if (!this.hasStatChanges()) return true;
    const justifs = this.justifications();
    return this.editableStats()
      .filter(stat => this.statHasChanged(stat.key))
      .every(stat => justifs[stat.key]?.trim());
  });

  changedStatsCount = computed(() => {
    // Si tiene growth system y estamos editando, contar cambios en growthStats
    if (this.isEditing() && this.universeHasGrowthSystem()) {
      const current = this.growthStats();
      const original = this.originalGrowthStats();
      let count = 0;
      const allKeys = new Set([...Object.keys(current), ...Object.keys(original)]);
      for (const key of allKeys) {
        if ((current[key] ?? 0) !== (original[key] ?? 0)) count++;
      }
      return count;
    }

    const current = this.stats();
    const original = this.originalStats();
    let count = 0;
    for (const key of Object.keys(current)) {
      if (current[key] !== original[key]) count++;
    }
    return count;
  });

  canSave = computed(() => {
    const nameValid = this.characterName.trim().length > 0;
    const universeValid = this.isEditing() || this.selectedUniverseId.length > 0;
    const statsExist = Object.keys(this.stats()).length > 0;

    // If editing and stats changed, require justifications
    if (this.isEditing() && this.hasStatChanges()) {
      return nameValid && universeValid && statsExist && this.allJustificationsProvided();
    }

    return nameValid && universeValid && statsExist;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id && id !== 'new') {
      this.isEditing.set(true);
      this.characterId.set(id);
      this.loadExistingCharacter(id);
    }

    // Load universes if not already loaded
    if (this.universeStore.allUniverses().length === 0) {
      this.universeStore.loadUniverses();
    }
  }

  async loadExistingCharacter(id: string): Promise<void> {
    await this.characterStore.selectCharacter(id);
    const character = this.characterStore.selectedCharacter();

    if (character) {
      this.characterName = character.name;
      this.characterDescription = character.description ?? '';
      this.selectedUniverseId = character.universeId;
      this.avatarImage.set(character.avatar?.photoUrl ?? null);
      this.backgroundColor = character.avatar?.backgroundColor ?? '#1a1a2e';
      this.stats.set({ ...character.stats });
      this.originalStats.set({ ...character.stats });
      // Cargar growthStats si existen
      this.growthStats.set({ ...(character.growthStats ?? {}) });
      this.originalGrowthStats.set({ ...(character.growthStats ?? {}) });
      this.title = character.progression?.title ?? '';
    }
  }

  onUniverseChange(): void {
    const universe = this.universeStore.allUniverses().find(
      u => u.id === this.selectedUniverseId
    );

    if (universe) {
      const defaultStats: Record<string, number> = {};
      Object.entries(universe.statDefinitions)
        .filter(([, def]) => !def.isDerived)
        .forEach(([key]) => {
          defaultStats[key] = 0;
        });
      this.stats.set(defaultStats);
      this.originalStats.set({ ...defaultStats });
    }
  }

  getStatValue(key: string): number {
    const baseValue = this.stats()[key] ?? 0;
    // Si tiene growth system y estamos editando, mostrar base + growth
    if (this.isEditing() && this.universeHasGrowthSystem()) {
      const growthValue = this.growthStats()[key] ?? 0;
      return baseValue + growthValue;
    }
    return baseValue;
  }

  // Obtiene solo el valor base del stat (sin crecimiento)
  getBaseStatValue(key: string): number {
    return this.stats()[key] ?? 0;
  }

  // Obtiene el valor de crecimiento de un stat
  getGrowthStatValue(key: string): number {
    return this.growthStats()[key] ?? 0;
  }

  getJustification(key: string): string {
    return this.justifications()[key] ?? '';
  }

  setJustification(key: string, value: string): void {
    this.justifications.update(j => ({ ...j, [key]: value }));
  }

  statHasChanged(key: string): boolean {
    // Si tiene growth system y estamos editando, comparar growthStats
    if (this.isEditing() && this.universeHasGrowthSystem()) {
      return (this.growthStats()[key] ?? 0) !== (this.originalGrowthStats()[key] ?? 0);
    }
    return this.stats()[key] !== this.originalStats()[key];
  }

  getStatChange(key: string): number {
    // Si tiene growth system y estamos editando, calcular cambio en growthStats
    if (this.isEditing() && this.universeHasGrowthSystem()) {
      return (this.growthStats()[key] ?? 0) - (this.originalGrowthStats()[key] ?? 0);
    }
    return (this.stats()[key] ?? 0) - (this.originalStats()[key] ?? 0);
  }

  incrementStat(key: string): void {
    const stat = this.editableStats().find(s => s.key === key);
    if (!stat) return;

    // Si tiene growth system y estamos editando, modificar growthStats
    if (this.isEditing() && this.universeHasGrowthSystem()) {
      const totalValue = this.getStatValue(key);
      if (totalValue < stat.maxValue) {
        const currentGrowth = this.growthStats()[key] ?? 0;
        this.growthStats.update(g => ({ ...g, [key]: currentGrowth + 1 }));
      }
    } else {
      const current = this.stats()[key] ?? 0;
      if (current < stat.maxValue) {
        this.stats.update(s => ({ ...s, [key]: current + 1 }));
      }
    }
  }

  decrementStat(key: string): void {
    const stat = this.editableStats().find(s => s.key === key);
    if (!stat) return;

    // Si tiene growth system y estamos editando, modificar growthStats
    if (this.isEditing() && this.universeHasGrowthSystem()) {
      const currentGrowth = this.growthStats()[key] ?? 0;
      // Solo permitir decrementar si hay crecimiento que quitar
      if (currentGrowth > 0) {
        this.growthStats.update(g => ({ ...g, [key]: currentGrowth - 1 }));
      }
    } else {
      const current = this.stats()[key] ?? 0;
      if (current > stat.minValue) {
        this.stats.update(s => ({ ...s, [key]: current - 1 }));
      }
    }
  }

  async confirmDelete(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar Personaje',
      message: '¿Estás seguro? Esta acción no se puede deshacer. Se perderán todas las habilidades e historial del personaje.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.characterStore.deleteCharacter(this.characterId()!);
            await this.showToast('Personaje eliminado', 'success');
            this.router.navigate(['/tabs/characters']);
          }
        }
      ]
    });
    await alert.present();
  }

  async save(): Promise<void> {
    if (!this.canSave()) return;

    this.saving.set(true);

    try {
      if (this.isEditing()) {
        // Collect stat changes with justifications for history
        const justifs = this.justifications();
        const hasGrowthSystem = this.universeHasGrowthSystem();
        const statChanges = this.editableStats()
          .filter(stat => this.statHasChanged(stat.key))
          .map(stat => ({
            stat: stat.key,
            change: this.getStatChange(stat.key),
            reason: justifs[stat.key]
          }));

        // Preparar actualizaciones base
        const updates: any = {
          name: this.characterName.trim(),
          description: this.characterDescription.trim() || undefined,
          avatar: {
            photoUrl: this.avatarImage() || null,
            backgroundColor: this.backgroundColor
          },
          progression: {
            level: this.characterStore.selectedCharacter()?.progression?.level ?? 1,
            experience: this.characterStore.selectedCharacter()?.progression?.experience ?? 0,
            awakening: this.characterStore.selectedCharacter()?.progression?.awakening ?? 'E',
            title: this.title || undefined
          }
        };

        // Si tiene growth system, actualizar growthStats; si no, actualizar stats
        if (hasGrowthSystem) {
          updates.growthStats = this.growthStats();
          // Los stats base NO cambian con growth system
        } else {
          updates.stats = this.stats();
        }

        await this.characterStore.updateCharacter(this.characterId()!, updates);

        // If there were stat changes, add to history
        if (statChanges.length > 0) {
          const userId = this.characterStore.selectedCharacter()?.ownerId;
          if (userId && this.characterId()) {
            const actionDescription = hasGrowthSystem
              ? 'Puntos de crecimiento agregados'
              : 'Edición manual de estadísticas';

            await this.firebaseService.addHistoryEntry(userId, this.characterId()!, {
              action: actionDescription,
              timestamp: new Date(),
              aiAnalysis: {
                suggestedChanges: statChanges,
                confidence: 1
              },
              appliedChanges: statChanges,
              approved: true
            });
          }
        }

        await this.showToast('Personaje actualizado', 'success');
        this.router.navigate(['/tabs/characters', this.characterId()]);
      } else {
        const newId = await this.characterStore.createCharacter(
          this.characterName.trim(),
          this.selectedUniverseId,
          this.stats()
        );

        if (newId) {
          // Update avatar and description if provided
          const hasAvatar = this.avatarImage() || this.backgroundColor !== '#1a1a2e';
          const hasDescription = this.characterDescription.trim();

          if (hasAvatar || hasDescription) {
            const updates: any = {};
            if (hasAvatar) {
              updates.avatar = {
                photoUrl: this.avatarImage() || null,
                backgroundColor: this.backgroundColor
              };
            }
            if (hasDescription) {
              updates.description = this.characterDescription.trim();
            }
            await this.characterStore.updateCharacter(newId, updates);
          }

          await this.showToast('Personaje creado', 'success');
          this.router.navigate(['/tabs/characters', newId]);
        }
      }
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
