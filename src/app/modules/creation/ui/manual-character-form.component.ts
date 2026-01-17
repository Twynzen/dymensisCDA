import { Component, Output, EventEmitter, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Character, Universe, Race } from '../../../core/models';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { StatValidationService } from '../../../core/services';
import { ImageUploadComponent } from '../../../shared';

@Component({
  selector: 'app-manual-character-form',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ImageUploadComponent],
  template: `
    <div class="form-container">
      <!-- Step indicator -->
      <div class="step-indicator">
        @for (step of steps; track step.id; let i = $index) {
          <div
            class="step"
            [class.active]="currentStep() === i"
            [class.completed]="currentStep() > i"
            (click)="goToStep(i)"
          >
            <div class="step-number">{{ i + 1 }}</div>
            <span class="step-label">{{ step.label }}</span>
          </div>
          @if (i < steps.length - 1) {
            <div class="step-line" [class.completed]="currentStep() > i"></div>
          }
        }
      </div>

      <!-- No universes warning -->
      @if (universes().length === 0) {
        <div class="no-universes">
          <ion-icon name="planet-outline" class="warning-icon"></ion-icon>
          <h3>No tienes universos</h3>
          <p>Para crear un personaje, primero necesitas crear un universo que defina las estadísticas y reglas.</p>
          <ion-button (click)="goToCreateUniverse.emit()">
            <ion-icon slot="start" name="add"></ion-icon>
            Crear Universo
          </ion-button>
        </div>
      } @else {
        <!-- Step Content -->
        <div class="step-content">
          <!-- Step 1: Select Universe -->
          @if (currentStep() === 0) {
            <div class="form-section">
              <h2>Selecciona Universo</h2>
              <p class="section-desc">Elige en qué universo vivirá tu personaje</p>

              <div class="universe-grid">
                @for (universe of universes(); track universe.id) {
                  <ion-card
                    button
                    [class.selected]="selectedUniverse()?.id === universe.id"
                    (click)="selectUniverse(universe)"
                  >
                    <div class="universe-card-layout">
                      <div class="universe-image-container">
                        @if (universe.coverImage) {
                          <img [src]="universe.coverImage" [alt]="universe.name" class="universe-cover-img" />
                        } @else {
                          <div class="universe-image-placeholder">
                            <ion-icon name="planet-outline"></ion-icon>
                          </div>
                        }
                        <div class="visibility-badge" [class.public]="universe.isPublic">
                          <ion-icon [name]="universe.isPublic ? 'globe-outline' : 'lock-closed-outline'"></ion-icon>
                        </div>
                      </div>
                      <div class="universe-info">
                        <h3>{{ universe.name }}</h3>
                        <p class="universe-desc">{{ universe.description | slice:0:60 }}{{ universe.description.length > 60 ? '...' : '' }}</p>
                        <div class="universe-stats">
                          <ion-chip size="small">
                            {{ getStatCount(universe) }} stats
                          </ion-chip>
                          @if (universe.awakeningSystem?.enabled) {
                            <ion-chip size="small" color="primary">
                              {{ universe.awakeningSystem!.levels[0] }}-{{ universe.awakeningSystem!.levels[universe.awakeningSystem!.levels.length - 1] }}
                            </ion-chip>
                          }
                          @if (universe.raceSystem?.enabled) {
                            <ion-chip size="small" color="secondary">
                              {{ universe.raceSystem!.races.length }} razas
                            </ion-chip>
                          }
                        </div>
                      </div>
                    </div>
                  </ion-card>
                }
              </div>

              <!-- Race Selection (shown when universe has races) -->
              @if (selectedUniverse()?.raceSystem?.enabled && selectedUniverse()!.raceSystem!.races.length > 0) {
                <div class="race-selection-section">
                  <h3>Selecciona una Raza</h3>
                  <p class="section-desc">Cada raza tiene estadísticas base predefinidas y puntos libres para personalizar</p>

                  <div class="race-grid">
                    @for (race of selectedUniverse()!.raceSystem!.races; track race.id) {
                      <ion-card
                        button
                        [class.selected]="selectedRace()?.id === race.id"
                        (click)="selectRace(race)"
                      >
                        @if (race.image) {
                          <div class="race-image-container">
                            <img [src]="race.image" [alt]="race.name" class="race-image">
                          </div>
                        }
                        <ion-card-content>
                          <div class="race-card-header">
                            @if (!race.image) {
                              <ion-icon name="person-outline" class="race-icon"></ion-icon>
                            }
                            <h4>{{ race.name }}</h4>
                          </div>
                          <p class="race-desc">{{ race.description }}</p>

                          <div class="race-stats-preview">
                            @if (getRaceUsedPoints(race) > 0) {
                              <div class="base-stats-preview">
                                @for (statKey of getStatKeysWithValue(race); track statKey) {
                                  <span class="stat-badge">
                                    {{ getStatAbbr(statKey) }}: {{ race.baseStats[statKey] }}
                                  </span>
                                }
                              </div>
                            }
                            <div class="free-points-badge" [class.full-freedom]="race.freePoints === selectedUniverse()!.initialPoints">
                              <ion-icon [name]="race.freePoints === selectedUniverse()!.initialPoints ? 'infinite-outline' : 'star-outline'"></ion-icon>
                              <span>{{ race.freePoints }} puntos libres</span>
                            </div>
                          </div>
                        </ion-card-content>
                      </ion-card>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- Step 2: Basic Info -->
          @if (currentStep() === 1) {
            <div class="form-section">
              <h2>Información Básica</h2>
              <p class="section-desc">Dale identidad a tu personaje</p>

              <ion-item>
                <ion-input
                  label="Nombre del Personaje *"
                  labelPlacement="stacked"
                  [(ngModel)]="character.name"
                  placeholder="Ej: Sung Jin-Woo"
                  [counter]="true"
                  maxlength="50"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-textarea
                  label="Descripción"
                  labelPlacement="stacked"
                  [(ngModel)]="character.description"
                  placeholder="Describe brevemente a tu personaje..."
                  [rows]="2"
                  [counter]="true"
                  maxlength="300"
                ></ion-textarea>
              </ion-item>

              <ion-item>
                <ion-textarea
                  label="Historia de Fondo"
                  labelPlacement="stacked"
                  [(ngModel)]="character.backstory"
                  placeholder="¿Cuál es su origen? ¿Qué lo motiva?"
                  [rows]="3"
                  [counter]="true"
                  maxlength="500"
                ></ion-textarea>
              </ion-item>

              <div class="traits-section">
                <ion-label>Rasgos de Personalidad</ion-label>
                <div class="traits-chips">
                  @for (trait of availableTraits; track trait) {
                    <ion-chip
                      [color]="character.personalityTraits.includes(trait) ? 'primary' : 'medium'"
                      (click)="toggleTrait(trait)"
                    >{{ trait }}</ion-chip>
                  }
                </div>
                <ion-item>
                  <ion-input
                    label="Agregar rasgo personalizado"
                    labelPlacement="stacked"
                    [(ngModel)]="customTrait"
                    placeholder="Escribe y presiona Enter"
                    (keydown.enter)="addCustomTrait()"
                  ></ion-input>
                </ion-item>
              </div>
            </div>
          }

          <!-- Step 3: Statistics -->
          @if (currentStep() === 2) {
            <div class="form-section">
              <h2>Estadísticas</h2>
              @if (selectedRace()) {
                <p class="section-desc">
                  Tu raza ({{ selectedRace()!.name }}) tiene estadísticas base.
                  Tienes {{ selectedRace()!.freePoints }} puntos libres para distribuir.
                </p>
              } @else {
                <p class="section-desc">
                  Distribuye los {{ totalAvailablePoints }} puntos iniciales entre tus estadísticas.
                </p>
              }

              <div class="points-counter" [class.over-budget]="remainingPoints() < 0">
                <span>Puntos libres restantes:</span>
                <strong [class.negative]="remainingPoints() < 0">{{ remainingPoints() }}</strong>
              </div>

              <div class="stats-sliders">
                @for (statKey of getStatKeys(); track statKey) {
                  <div class="stat-slider">
                    <div class="stat-info">
                      <ion-icon
                        [name]="getStatDef(statKey).icon || 'stats-chart'"
                        [style.color]="getStatDef(statKey).color"
                      ></ion-icon>
                      <span class="stat-name">{{ getStatDef(statKey).name }}</span>
                      @if (getBaseStatValue(statKey) > 0) {
                        <span class="base-value">(base: {{ getBaseStatValue(statKey) }})</span>
                      }
                      <span class="stat-value">{{ character.stats[statKey] }}</span>
                    </div>
                    <ion-range
                      [(ngModel)]="character.bonusStats[statKey]"
                      [min]="0"
                      [max]="getMaxBonusForStat(statKey)"
                      [step]="1"
                      [pin]="true"
                      [style.--bar-background-active]="getStatDef(statKey).color"
                      (ionChange)="recalculateTotalStat(statKey)"
                    ></ion-range>
                  </div>
                }
              </div>

              @if (!selectedRace()) {
                <div class="stat-presets">
                  <p>Distribución rápida:</p>
                  <ion-chip (click)="distributeEvenly()">Equilibrado</ion-chip>
                  <ion-chip (click)="distributeWarrior()">Guerrero</ion-chip>
                  <ion-chip (click)="distributeMage()">Mago</ion-chip>
                  <ion-chip (click)="distributeRogue()">Pícaro</ion-chip>
                </div>
              }
            </div>
          }

          <!-- Step 4: Progression -->
          @if (currentStep() === 3) {
            <div class="form-section">
              <h2>Rango y Título</h2>
              <p class="section-desc">Tu rango se calcula según tus estadísticas</p>

              @if (selectedUniverse()?.awakeningSystem?.enabled) {
                <div class="calculated-awakening-section">
                  <ion-label>Rango Calculado (basado en tus stats)</ion-label>
                  <div class="awakening-display">
                    <div class="rank-badge-large" [class]="'rank-' + getCalculatedAwakening()">
                      {{ getCalculatedAwakening() }}
                    </div>
                    <div class="awakening-info">
                      <p class="total-stats-info">Total de Stats: <strong>{{ getTotalStats() }}</strong></p>
                      <p class="threshold-info">
                        @for (level of selectedUniverse()!.awakeningSystem!.levels; track level; let i = $index) {
                          @if (i < selectedUniverse()!.awakeningSystem!.thresholds.length) {
                            <span class="threshold-item" [class.active]="getCalculatedAwakening() === level">
                              {{ level }}: {{ selectedUniverse()!.awakeningSystem!.thresholds[i] }}+
                            </span>
                          }
                        }
                      </p>
                    </div>
                  </div>
                  <p class="rank-note">El rango se calcula automáticamente según el total de tus estadísticas</p>
                </div>
              }

              <ion-item>
                <ion-input
                  label="Título (opcional)"
                  labelPlacement="stacked"
                  [(ngModel)]="character.title"
                  placeholder="Ej: El Novato, El Despertar"
                ></ion-input>
              </ion-item>
            </div>
          }

          <!-- Step 5: Appearance -->
          @if (currentStep() === 4) {
            <div class="form-section">
              <h2>Apariencia</h2>
              <p class="section-desc">Personaliza el avatar de tu personaje</p>

              <div class="avatar-upload-section">
                <label class="section-label">Avatar del Personaje</label>
                <app-image-upload
                  placeholder="Avatar del Personaje"
                  [value]="character.avatarUrl"
                  [maxSizeKB]="400"
                  [maxWidth]="400"
                  [maxHeight]="400"
                  (imageChange)="character.avatarUrl = $event || ''"
                ></app-image-upload>
              </div>

              <div class="background-color-section">
                <label class="section-label">Color de Fondo (usado si no hay imagen)</label>
                <div class="color-presets">
                  @for (color of colorPresets; track color) {
                    <div
                      class="color-dot"
                      [style.background]="color"
                      [class.selected]="character.backgroundColor === color"
                      (click)="character.backgroundColor = color"
                    ></div>
                  }
                </div>
                <ion-item>
                  <ion-label>Color personalizado</ion-label>
                  <input
                    type="color"
                    [(ngModel)]="character.backgroundColor"
                    slot="end"
                    style="width: 50px; height: 40px; border: none; border-radius: 8px;"
                  >
                </ion-item>
              </div>
            </div>
          }

          <!-- Step 6: Review -->
          @if (currentStep() === 5) {
            <div class="form-section review-section">
              <h2>Revisión Final</h2>
              <p class="section-desc">Revisa tu personaje antes de crearlo</p>

              <ion-card class="character-preview-card">
                <div class="preview-header" [style.background]="character.backgroundColor">
                  <div class="avatar-container">
                    @if (character.avatarUrl) {
                      <img [src]="character.avatarUrl" class="preview-avatar">
                    } @else {
                      <div class="preview-avatar-placeholder">
                        <ion-icon name="person-outline"></ion-icon>
                      </div>
                    }
                    @if (character.awakening) {
                      <span class="rank-badge" [class]="'rank-' + character.awakening">
                        {{ character.awakening }}
                      </span>
                    }
                  </div>
                  <div class="preview-info">
                    <h3>{{ character.name || 'Sin nombre' }}</h3>
                    <p class="universe-name">{{ selectedUniverse()?.name }}</p>
                    @if (character.title) {
                      <span class="title">{{ character.title }}</span>
                    }
                    @if (selectedUniverse()?.awakeningSystem?.enabled) {
                      <span class="level">Rango {{ getCalculatedAwakening() }}</span>
                    }
                  </div>
                </div>

                <ion-card-content>
                  @if (character.description) {
                    <p class="description">{{ character.description }}</p>
                  }

                  <div class="preview-stats">
                    <h4>Estadísticas</h4>
                    @for (statKey of getStatKeys(); track statKey) {
                      <div class="stat-bar-row">
                        <span class="stat-label">{{ getStatDef(statKey).abbreviation }}</span>
                        <div class="stat-bar-bg">
                          <div
                            class="stat-bar-fill"
                            [style.width.%]="(character.stats[statKey] / getStatDef(statKey).maxValue) * 100"
                            [style.background]="getStatDef(statKey).color"
                          ></div>
                        </div>
                        <span class="stat-num">{{ character.stats[statKey] }}</span>
                      </div>
                    }
                    <div class="total-row">
                      <span>Total:</span>
                      <strong>{{ getTotalStats() }}</strong>
                    </div>
                  </div>

                  @if (character.personalityTraits.length > 0) {
                    <div class="preview-traits">
                      <h4>Personalidad</h4>
                      <div class="traits-list">
                        @for (trait of character.personalityTraits; track trait) {
                          <ion-chip size="small">{{ trait }}</ion-chip>
                        }
                      </div>
                    </div>
                  }
                </ion-card-content>
              </ion-card>

              @if (validationErrors().length > 0) {
                <ion-card color="danger" class="error-card">
                  <ion-card-content>
                    <h4>Errores a corregir:</h4>
                    <ul>
                      @for (error of validationErrors(); track error) {
                        <li>{{ error }}</li>
                      }
                    </ul>
                  </ion-card-content>
                </ion-card>
              }
            </div>
          }
        </div>

        <!-- Navigation Buttons -->
        <div class="nav-buttons">
          <ion-button
            fill="outline"
            (click)="previousStep()"
            [disabled]="currentStep() === 0"
          >
            <ion-icon slot="start" name="arrow-back"></ion-icon>
            Anterior
          </ion-button>

          @if (currentStep() < steps.length - 1) {
            <ion-button
              fill="solid"
              (click)="nextStep()"
              [disabled]="!canProceed()"
            >
              Siguiente
              <ion-icon slot="end" name="arrow-forward"></ion-icon>
            </ion-button>
          } @else {
            <ion-button
              fill="solid"
              color="success"
              (click)="submitForm()"
              [disabled]="validationErrors().length > 0"
            >
              <ion-icon slot="start" name="checkmark"></ion-icon>
              Crear Personaje
            </ion-button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .form-container {
      padding: 16px;
      max-width: 600px;
      margin: 0 auto;
    }

    .step-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 4px;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.2s;
    }

    .step.active, .step.completed { opacity: 1; }

    .step-number {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--ion-color-medium);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
    }

    .step.active .step-number { background: var(--ion-color-primary); }
    .step.completed .step-number { background: var(--ion-color-success); }

    .step-label {
      font-size: 9px;
      margin-top: 4px;
      text-align: center;
      max-width: 50px;
    }

    .step-line {
      width: 16px;
      height: 2px;
      background: var(--ion-color-medium);
      margin: 0 2px;
    }

    .step-line.completed { background: var(--ion-color-success); }

    .no-universes {
      text-align: center;
      padding: 40px 20px;
    }

    .warning-icon {
      font-size: 64px;
      color: var(--ion-color-warning);
      margin-bottom: 16px;
    }

    .form-section h2 {
      margin: 0 0 4px 0;
      font-size: 20px;
    }

    .section-desc {
      color: var(--ion-color-medium);
      margin: 0 0 16px 0;
      font-size: 14px;
    }

    .universe-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }

    .universe-grid ion-card {
      margin: 0;
      cursor: pointer;
      transition: transform 0.2s, border-color 0.2s;
      border: 2px solid transparent;
    }

    .universe-grid ion-card.selected {
      border-color: var(--ion-color-primary);
      transform: scale(1.02);
    }

    .universe-card-layout {
      display: flex;
      gap: 12px;
      padding: 12px;
    }

    .universe-image-container {
      position: relative;
      width: 72px;
      height: 72px;
      flex-shrink: 0;
    }

    .universe-cover-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 12px;
    }

    .universe-image-placeholder {
      width: 100%;
      height: 100%;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .universe-image-placeholder ion-icon {
      font-size: 32px;
      color: rgba(255, 255, 255, 0.6);
    }

    .visibility-badge {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--ion-color-medium);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--ion-background-color);
    }

    .visibility-badge.public {
      background: var(--ion-color-success);
    }

    .visibility-badge ion-icon {
      font-size: 12px;
      color: white;
    }

    .universe-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .universe-info h3 {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .universe-desc {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 0 0 8px 0;
      line-height: 1.3;
    }

    .universe-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .universe-stats ion-chip {
      height: 22px;
      font-size: 10px;
    }

    .traits-section {
      margin-top: 16px;
    }

    .traits-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0;
    }

    .points-counter {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .points-counter.over-budget {
      background: rgba(var(--ion-color-danger-rgb), 0.2);
    }

    .points-counter strong {
      font-size: 24px;
      color: var(--ion-color-primary);
    }

    .points-counter strong.negative {
      color: var(--ion-color-danger);
    }

    .stats-sliders {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .stat-slider {
      background: rgba(255,255,255,0.05);
      padding: 12px;
      border-radius: 8px;
    }

    .stat-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .stat-info ion-icon {
      font-size: 20px;
    }

    .stat-name {
      flex: 1;
      font-size: 14px;
    }

    .stat-value {
      font-weight: bold;
      font-size: 16px;
      min-width: 30px;
      text-align: right;
    }

    .stat-presets {
      margin-top: 16px;
      text-align: center;
    }

    .stat-presets p {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
    }

    .level-label {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 8px 0;
    }

    .rank-selection {
      margin: 16px 0;
    }

    .rank-options {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0;
    }

    .rank-note {
      font-size: 12px;
      color: var(--ion-color-medium);
    }

    /* Calculated Awakening Styles */
    .calculated-awakening-section {
      margin: 16px 0;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
    }

    .calculated-awakening-section ion-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--ion-color-medium);
      display: block;
      margin-bottom: 12px;
    }

    .awakening-display {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .rank-badge-large {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
      border: 3px solid;
    }

    .awakening-info {
      flex: 1;
    }

    .total-stats-info {
      margin: 0 0 8px 0;
      font-size: 16px;
    }

    .total-stats-info strong {
      color: var(--ion-color-primary);
      font-size: 20px;
    }

    .threshold-info {
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .threshold-item {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      opacity: 0.6;
    }

    .threshold-item.active {
      background: rgba(var(--ion-color-primary-rgb), 0.3);
      color: var(--ion-color-primary);
      opacity: 1;
      font-weight: 600;
    }

    .avatar-upload-section, .background-color-section {
      margin: 16px 0;
    }

    .section-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--ion-color-medium);
    }

    .color-presets {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin: 12px 0;
    }

    .color-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: transform 0.2s;
    }

    .color-dot.selected {
      border-color: white;
      transform: scale(1.2);
    }

    .character-preview-card {
      overflow: hidden;
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }

    .avatar-container {
      position: relative;
    }

    .preview-avatar, .preview-avatar-placeholder {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid rgba(255,255,255,0.3);
    }

    .preview-avatar-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.2);
    }

    .preview-avatar-placeholder ion-icon {
      font-size: 36px;
      color: rgba(255,255,255,0.6);
    }

    .rank-badge {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      background: var(--ion-color-medium);
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

    .preview-info h3 {
      margin: 0;
      font-size: 20px;
    }

    .universe-name {
      font-size: 12px;
      color: rgba(255,255,255,0.7);
      margin: 2px 0;
    }

    .title {
      font-style: italic;
      font-size: 12px;
      opacity: 0.8;
    }

    .level {
      display: block;
      font-size: 14px;
      margin-top: 4px;
    }

    .description {
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 16px;
    }

    .preview-stats h4, .preview-traits h4 {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0 0 8px 0;
    }

    .stat-bar-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .stat-label {
      width: 32px;
      font-size: 11px;
      font-weight: bold;
    }

    .stat-bar-bg {
      flex: 1;
      height: 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .stat-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }

    .stat-num {
      width: 28px;
      text-align: right;
      font-size: 12px;
    }

    .total-row {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .preview-traits {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .traits-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .error-card {
      margin-top: 16px;
    }

    .error-card ul {
      margin: 8px 0 0 0;
      padding-left: 20px;
    }

    .nav-buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    /* Race selection styles */
    .race-selection-section {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .race-selection-section h3 {
      font-size: 18px;
      margin: 0 0 4px 0;
    }

    .race-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }

    .race-grid ion-card {
      margin: 0;
      cursor: pointer;
      transition: transform 0.2s, border-color 0.2s;
      border: 2px solid transparent;
    }

    .race-grid ion-card.selected {
      border-color: var(--ion-color-secondary);
      transform: scale(1.02);
    }

    .race-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .race-icon {
      font-size: 24px;
      color: var(--ion-color-secondary);
    }

    .race-card-header h4 {
      margin: 0;
      flex: 1;
      font-size: 16px;
    }

    .race-desc {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 0 0 8px 0;
    }

    .race-modifiers {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .modifier-badge {
      font-size: 11px;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
    }

    .modifier-badge.positive {
      background: rgba(var(--ion-color-success-rgb), 0.2);
      color: var(--ion-color-success);
    }

    .modifier-badge.negative {
      background: rgba(var(--ion-color-danger-rgb), 0.2);
      color: var(--ion-color-danger);
    }

    .no-modifiers {
      font-size: 12px;
      color: var(--ion-color-medium);
      font-style: italic;
      margin: 0;
    }

    /* Race stats preview styles */
    .race-stats-preview {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .base-stats-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .stat-badge {
      font-size: 11px;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 8px;
      background: rgba(var(--ion-color-primary-rgb), 0.2);
      color: var(--ion-color-primary);
    }

    .free-points-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--ion-color-success);
      font-weight: 600;
    }

    .free-points-badge ion-icon {
      font-size: 14px;
    }

    .free-points-badge.full-freedom {
      color: var(--ion-color-tertiary);
    }

    /* Base value display */
    .base-value {
      font-size: 11px;
      color: var(--ion-color-medium);
      margin-left: 4px;
    }

    /* Race image styles */
    .race-image-container {
      width: 100%;
      height: 120px;
      overflow: hidden;
      border-radius: 8px 8px 0 0;
    }

    .race-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .race-grid ion-card.selected .race-image-container {
      border: 2px solid var(--ion-color-secondary);
      border-bottom: none;
    }
  `]
})
export class ManualCharacterFormComponent implements OnInit {
  @Output() created = new EventEmitter<Partial<Character>>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() goToCreateUniverse = new EventEmitter<void>();

  private universeStore = inject(UniverseStore);
  private statValidation = inject(StatValidationService);

  currentStep = signal(0);
  selectedUniverse = signal<Universe | null>(null);
  selectedRace = signal<Race | null>(null);
  validationErrors = signal<string[]>([]);

  universes = this.universeStore.allUniverses;

  Math = Math;

  steps = [
    { id: 'universe', label: 'Universo' },
    { id: 'basic', label: 'Básico' },
    { id: 'stats', label: 'Stats' },
    { id: 'rank', label: 'Rango' },
    { id: 'appearance', label: 'Avatar' },
    { id: 'review', label: 'Revisar' }
  ];

  character = {
    name: '',
    description: '',
    backstory: '',
    personalityTraits: [] as string[],
    stats: {} as Record<string, number>,
    bonusStats: {} as Record<string, number>, // Points distributed by user
    level: 1,
    awakening: 'E',
    title: '',
    avatarUrl: '',
    backgroundColor: '#667eea'
  };

  totalAvailablePoints = 60; // Total from universe or freePoints from race
  customTrait = '';

  availableTraits = [
    'Valiente', 'Cauteloso', 'Leal', 'Independiente',
    'Compasivo', 'Frío', 'Curioso', 'Reservado',
    'Líder', 'Solitario', 'Optimista', 'Realista'
  ];

  colorPresets = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#fa709a',
    '#1a1a2e', '#16213e', '#0f3460', '#533483'
  ];

  ngOnInit(): void {
    this.universeStore.loadUniverses();
  }

  selectUniverse(universe: Universe): void {
    this.selectedUniverse.set(universe);

    // Set total available points from universe
    this.totalAvailablePoints = universe.initialPoints || 60;

    // Initialize stats and bonusStats with 0
    this.character.stats = {};
    this.character.bonusStats = {};
    Object.keys(universe.statDefinitions).forEach(key => {
      this.character.stats[key] = 0;
      this.character.bonusStats[key] = 0;
    });

    // Set initial awakening
    if (universe.awakeningSystem?.enabled && universe.awakeningSystem.levels.length > 0) {
      this.character.awakening = universe.awakeningSystem.levels[0];
    }

    // Reset race selection
    this.selectedRace.set(null);

    // If no race system or no races, stats start at 0 and all points are distributable
    // If race system enabled with races, user must select a race first
  }

  selectRace(race: Race): void {
    this.selectedRace.set(race);

    const universe = this.selectedUniverse();
    if (!universe) return;

    // Set available points to race's freePoints
    this.totalAvailablePoints = race.freePoints;

    // Initialize stats with race's base values + reset bonus stats
    this.character.bonusStats = {};
    this.character.stats = {};
    Object.keys(universe.statDefinitions).forEach(key => {
      const baseValue = race.baseStats?.[key] || 0;
      this.character.bonusStats[key] = 0;
      this.character.stats[key] = baseValue;
    });
  }

  getStatAbbr(statKey: string): string {
    const universe = this.selectedUniverse();
    if (!universe) return statKey;
    return universe.statDefinitions[statKey]?.abbreviation || statKey;
  }

  getStatCount(universe: Universe): number {
    return Object.keys(universe.statDefinitions).length;
  }

  getStatKeys(): string[] {
    return Object.keys(this.selectedUniverse()?.statDefinitions || {});
  }

  getStatDef(key: string): any {
    return this.selectedUniverse()?.statDefinitions[key] || {};
  }

  remainingPoints = (): number => {
    const usedBonus = Object.values(this.character.bonusStats).reduce((sum, val) => sum + (val || 0), 0);
    return this.totalAvailablePoints - usedBonus;
  };

  getTotalStats(): number {
    return Object.values(this.character.stats).reduce((sum, val) => sum + val, 0);
  }

  // Calculate awakening based on total stats and universe thresholds
  getCalculatedAwakening(): string {
    const universe = this.selectedUniverse();
    if (!universe?.awakeningSystem?.enabled) {
      return this.character.awakening;
    }
    return this.statValidation.calculateAwakening(
      this.character.stats,
      universe.awakeningSystem
    );
  }

  // Get the base stat value from race (or 0 if no race)
  getBaseStatValue(statKey: string): number {
    const race = this.selectedRace();
    if (!race) return 0;
    return race.baseStats?.[statKey] || 0;
  }

  // Get max bonus points that can be added to a stat (based on remaining + current bonus)
  getMaxBonusForStat(statKey: string): number {
    const remaining = this.remainingPoints();
    const currentBonus = this.character.bonusStats[statKey] || 0;
    return remaining + currentBonus;
  }

  // Recalculate total stat value (base + bonus) with validation against universe limits
  recalculateTotalStat(statKey: string): void {
    const statDef = this.getStatDef(statKey);
    const baseValue = this.getBaseStatValue(statKey);
    const bonusValue = this.character.bonusStats[statKey] || 0;

    // Calculate raw total
    const rawTotal = baseValue + bonusValue;

    // Validate against minValue and maxValue from universe stat definition
    const minVal = statDef.minValue ?? 0;
    const maxVal = statDef.maxValue ?? 999;
    this.character.stats[statKey] = Math.max(minVal, Math.min(rawTotal, maxVal));
  }

  // Get used points for a race (sum of baseStats)
  getRaceUsedPoints(race: Race): number {
    if (!race.baseStats) return 0;
    return Object.values(race.baseStats).reduce((sum, val) => sum + (val || 0), 0);
  }

  // Get stat keys that have a value > 0 for a race
  getStatKeysWithValue(race: Race): string[] {
    if (!race.baseStats) return [];
    return Object.keys(race.baseStats).filter(key => (race.baseStats[key] || 0) > 0);
  }

  toggleTrait(trait: string): void {
    const index = this.character.personalityTraits.indexOf(trait);
    if (index > -1) {
      this.character.personalityTraits.splice(index, 1);
    } else if (this.character.personalityTraits.length < 5) {
      this.character.personalityTraits.push(trait);
    }
  }

  addCustomTrait(): void {
    if (this.customTrait.trim() && this.character.personalityTraits.length < 5) {
      this.character.personalityTraits.push(this.customTrait.trim());
      this.customTrait = '';
    }
  }

  distributeEvenly(): void {
    const keys = this.getStatKeys();
    const perStat = Math.floor(this.totalAvailablePoints / keys.length);
    keys.forEach(key => {
      this.character.bonusStats[key] = perStat;
      this.recalculateTotalStat(key);
    });
  }

  distributeWarrior(): void {
    const keys = this.getStatKeys();
    // Focus on physical stats (first 2 stats)
    keys.forEach((key, i) => {
      if (i < 2) {
        this.character.bonusStats[key] = Math.floor(this.totalAvailablePoints * 0.3);
      } else {
        this.character.bonusStats[key] = Math.floor(this.totalAvailablePoints * 0.1);
      }
      this.recalculateTotalStat(key);
    });
  }

  distributeMage(): void {
    const keys = this.getStatKeys();
    // Focus on mental stats (last 2 stats)
    keys.forEach((key, i) => {
      if (i >= keys.length - 2) {
        this.character.bonusStats[key] = Math.floor(this.totalAvailablePoints * 0.3);
      } else {
        this.character.bonusStats[key] = Math.floor(this.totalAvailablePoints * 0.1);
      }
      this.recalculateTotalStat(key);
    });
  }

  distributeRogue(): void {
    const keys = this.getStatKeys();
    // Focus on agility/dex (index 1 and 4)
    keys.forEach((key, i) => {
      if (i === 1 || i === 4) {
        this.character.bonusStats[key] = Math.floor(this.totalAvailablePoints * 0.25);
      } else {
        this.character.bonusStats[key] = Math.floor(this.totalAvailablePoints * 0.125);
      }
      this.recalculateTotalStat(key);
    });
  }

  nextStep(): void {
    if (this.canProceed() && this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(v => v + 1);
      if (this.currentStep() === this.steps.length - 1) {
        this.validate();
      }
    }
  }

  previousStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(v => v - 1);
    }
  }

  goToStep(index: number): void {
    if (index <= this.currentStep() || this.canProceed()) {
      this.currentStep.set(index);
    }
  }

  canProceed(): boolean {
    switch (this.currentStep()) {
      case 0:
        const universe = this.selectedUniverse();
        if (!universe) return false;
        // If universe has race system, require race selection
        if (universe.raceSystem?.enabled) {
          return this.selectedRace() !== null;
        }
        return true;
      case 1:
        return this.character.name.trim().length >= 2;
      case 2:
        return this.remainingPoints() >= 0;
      case 3:
        return this.character.level >= 1;
      case 4:
        return true;
      default:
        return true;
    }
  }

  validate(): void {
    const errors: string[] = [];

    if (!this.selectedUniverse()) {
      errors.push('Debes seleccionar un universo');
    }

    if (!this.character.name || this.character.name.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }

    if (this.remainingPoints() < 0) {
      errors.push('Has excedido el límite de puntos disponibles');
    }

    this.validationErrors.set(errors);
  }

  submitForm(): void {
    this.validate();
    if (this.validationErrors().length > 0) return;

    const universe = this.selectedUniverse();
    if (!universe) return;

    const race = this.selectedRace();

    // Final stats = base (from race) + bonus (distributed by user)
    // character.stats already contains this total after recalculateTotalStat calls
    const finalStats = { ...this.character.stats };

    // Store the base stats separately (from race or 0)
    const baseStats: Record<string, number> = {};
    Object.keys(universe.statDefinitions).forEach(key => {
      baseStats[key] = race?.baseStats?.[key] || 0;
    });

    // Calculate awakening automatically based on stats and universe thresholds
    const calculatedAwakening = this.getCalculatedAwakening();

    // Calculate derived stats if universe has any
    const derivedStats: Record<string, number> = {};
    Object.entries(universe.statDefinitions).forEach(([key, def]) => {
      if (def.isDerived && def.formula) {
        derivedStats[key] = this.statValidation.evaluateFormula(def.formula, finalStats);
      }
    });

    const characterData: Partial<Character> = {
      name: this.character.name.trim(),
      universeId: universe.id,
      raceId: race?.id,
      stats: finalStats,
      baseStats, // Base stats from race
      bonusStats: { ...this.character.bonusStats }, // Points distributed by user
      derivedStats: Object.keys(derivedStats).length > 0 ? derivedStats : undefined,
      description: this.character.description || undefined,
      backstory: this.character.backstory || undefined,
      personalityTraits: this.character.personalityTraits.length > 0 ? [...this.character.personalityTraits] : undefined,
      avatar: {
        photoUrl: this.character.avatarUrl || null,
        backgroundColor: this.character.backgroundColor
      },
      progression: {
        level: 1, // Always start at level 1
        experience: 0,
        awakening: calculatedAwakening,
        title: this.character.title || undefined
      }
    };

    this.created.emit(characterData);
  }
}
