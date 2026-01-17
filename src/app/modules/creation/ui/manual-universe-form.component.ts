import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Universe, StatDefinition, ProgressionRule, AwakeningSystem, Race, RaceSystem, DEFAULT_INITIAL_POINTS } from '../../../core/models';
import { ImageUploadComponent } from '../../../shared';

interface StatEntry {
  key: string;
  name: string;
  abbreviation: string;
  icon: string;
  color: string;
  maxValue: number;
}

interface RuleEntry {
  id: string;
  description: string;
  keywords: string;
  affectedStats: string[];
  maxChange: number;
}

interface RaceEntry {
  id: string;
  name: string;
  description: string;
  image?: string; // Imagen opcional de la raza
  baseStats: Record<string, number>; // Valores base para cada stat
  freePoints: number; // Puntos libres para que el jugador reparta
}

@Component({
  selector: 'app-manual-universe-form',
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

      <!-- Step Content -->
      <div class="step-content">
        <!-- Step 1: Basic Info -->
        @if (currentStep() === 0) {
          <div class="form-section">
            <h2>Información Básica</h2>
            <p class="section-desc">Dale nombre y descripción a tu universo</p>

            <ion-item>
              <ion-input
                label="Nombre del Universo *"
                labelPlacement="stacked"
                [(ngModel)]="universe.name"
                placeholder="Ej: Mundo de Cazadores"
                [counter]="true"
                maxlength="50"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-textarea
                label="Descripción"
                labelPlacement="stacked"
                [(ngModel)]="universe.description"
                placeholder="Describe brevemente tu universo..."
                [rows]="3"
                [counter]="true"
                maxlength="500"
              ></ion-textarea>
            </ion-item>

            <ion-item>
              <ion-select
                label="Temática"
                labelPlacement="stacked"
                [(ngModel)]="selectedTheme"
                placeholder="Selecciona una temática"
              >
                @for (theme of themes; track theme.value) {
                  <ion-select-option [value]="theme.value">{{ theme.label }}</ion-select-option>
                }
              </ion-select>
            </ion-item>

            <div class="cover-image-section">
              <label class="section-label">Imagen de Portada <span class="required">*</span></label>
              <app-image-upload
                placeholder="Portada del Universo"
                [value]="universe.coverImage"
                [maxSizeKB]="500"
                (imageChange)="universe.coverImage = $event || ''"
              ></app-image-upload>
            </div>

            <ion-item class="toggle-item">
              <ion-toggle [(ngModel)]="universe.isPublic" [enableOnOffLabels]="true">
                <div class="toggle-content">
                  <ion-icon [name]="universe.isPublic ? 'globe-outline' : 'lock-closed-outline'"></ion-icon>
                  <span>{{ universe.isPublic ? 'Universo Público' : 'Universo Privado' }}</span>
                </div>
              </ion-toggle>
            </ion-item>
            <p class="toggle-hint">
              {{ universe.isPublic ? 'Otros usuarios podrán ver y usar este universo' : 'Solo tú podrás ver y usar este universo' }}
            </p>
          </div>
        }

        <!-- Step 2: Statistics -->
        @if (currentStep() === 1) {
          <div class="form-section">
            <h2>Estadísticas</h2>
            <p class="section-desc">Define las estadísticas de tu universo (mínimo 4, máximo 10)</p>

            <!-- Puntos iniciales -->
            <div class="initial-points-section">
              <ion-card class="points-card">
                <ion-card-content>
                  <div class="points-header">
                    <ion-icon name="star" color="warning"></ion-icon>
                    <h3>Puntos Iniciales para Repartir</h3>
                  </div>
                  <p class="points-desc">
                    Al crear un personaje, el jugador tendrá estos puntos para distribuir entre las estadísticas.
                  </p>
                  <ion-item lines="none">
                    <ion-input
                      type="number"
                      [(ngModel)]="initialPoints"
                      [min]="0"
                      [max]="500"
                      class="points-input"
                    ></ion-input>
                    <span slot="end" class="points-label">puntos</span>
                  </ion-item>
                  <div class="points-presets">
                    <ion-chip (click)="initialPoints = 40" [color]="initialPoints === 40 ? 'primary' : 'medium'">40</ion-chip>
                    <ion-chip (click)="initialPoints = 60" [color]="initialPoints === 60 ? 'primary' : 'medium'">60</ion-chip>
                    <ion-chip (click)="initialPoints = 100" [color]="initialPoints === 100 ? 'primary' : 'medium'">100</ion-chip>
                  </div>
                </ion-card-content>
              </ion-card>
            </div>

            @if (stats.length <= 4) {
              <div class="stats-note">
                <ion-icon name="information-circle"></ion-icon>
                <span>Mínimo 4 estadísticas requeridas. No se pueden eliminar más.</span>
              </div>
            }

            <div class="stats-list">
              @for (stat of stats; track stat.key; let i = $index) {
                <ion-card class="stat-card">
                  <ion-card-content>
                    <div class="stat-header">
                      <ion-icon [name]="stat.icon + ''" [style.color]="stat.color"></ion-icon>
                      <ion-input
                        [(ngModel)]="stat.name"
                        placeholder="Nombre del stat"
                        class="stat-name-input"
                      ></ion-input>
                      <ion-button fill="clear" color="danger" (click)="removeStat(i)" [disabled]="stats.length <= 4">
                        <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                      </ion-button>
                    </div>
                    <div class="stat-details">
                      <ion-item lines="none">
                        <ion-input
                          label="Abrev."
                          labelPlacement="stacked"
                          [(ngModel)]="stat.abbreviation"
                          [maxlength]="3"
                          style="width: 80px"
                        ></ion-input>
                      </ion-item>
                      <ion-item lines="none">
                        <ion-select
                          label="Icono"
                          labelPlacement="stacked"
                          [(ngModel)]="stat.icon"
                          (ionChange)="onStatIconChange(i, $event)"
                        >
                          @for (icon of availableIcons; track icon.name) {
                            <ion-select-option [value]="icon.name">{{ icon.label }}</ion-select-option>
                          }
                        </ion-select>
                      </ion-item>
                      <ion-item lines="none">
                        <ion-input
                          type="color"
                          label="Color"
                          labelPlacement="stacked"
                          [(ngModel)]="stat.color"
                          style="width: 60px"
                        ></ion-input>
                      </ion-item>
                      <ion-item lines="none">
                        <ion-input
                          type="number"
                          label="Máximo"
                          labelPlacement="stacked"
                          [(ngModel)]="stat.maxValue"
                          [min]="10"
                          [max]="9999"
                          style="width: 80px"
                        ></ion-input>
                      </ion-item>
                    </div>
                  </ion-card-content>
                </ion-card>
              }
            </div>

            @if (stats.length < 10) {
              <ion-button expand="block" fill="outline" (click)="addStat()">
                <ion-icon slot="start" name="add"></ion-icon>
                Agregar Estadística
              </ion-button>
            }

            <div class="presets">
              <p>Presets rápidos:</p>
              <ion-chip (click)="loadPreset('solo-leveling')">Solo Leveling</ion-chip>
              <ion-chip (click)="loadPreset('dnd')">D&D Clásico</ion-chip>
              <ion-chip (click)="loadPreset('cyberpunk')">Cyberpunk</ion-chip>
            </div>
          </div>
        }

        <!-- Step 3: Races -->
        @if (currentStep() === 2) {
          <div class="form-section">
            <h2>Sistema de Razas</h2>
            <p class="section-desc">Define razas o clases con estadísticas base predefinidas</p>

            <ion-item class="toggle-item">
              <ion-toggle [(ngModel)]="raceSystemEnabled" [enableOnOffLabels]="true">
                <div class="toggle-content">
                  <ion-icon [name]="raceSystemEnabled ? 'people' : 'people-outline'"></ion-icon>
                  <span>{{ raceSystemEnabled ? 'Sistema de Razas Activo' : 'Sin Sistema de Razas' }}</span>
                </div>
              </ion-toggle>
            </ion-item>
            <p class="toggle-hint">
              {{ raceSystemEnabled
                ? 'Los personajes elegirán una raza que define sus stats iniciales'
                : 'Los personajes repartirán libremente los ' + initialPoints + ' puntos' }}
            </p>

            @if (raceSystemEnabled) {
              <div class="race-info-card">
                <ion-icon name="information-circle"></ion-icon>
                <div>
                  <strong>Puntos del universo: {{ initialPoints }}</strong>
                  <p>Cada raza puede usar parte o todos estos puntos. Los puntos no usados quedan libres para que el jugador los reparta.</p>
                </div>
              </div>

              <div class="race-presets">
                <p class="presets-label">Agregar presets:</p>
                <div class="preset-chips">
                  <ion-chip (click)="loadRacePreset('warrior')" color="danger">
                    <ion-icon name="shield-outline"></ion-icon>
                    <ion-label>Guerrero</ion-label>
                  </ion-chip>
                  <ion-chip (click)="loadRacePreset('mage')" color="primary">
                    <ion-icon name="sparkles-outline"></ion-icon>
                    <ion-label>Mago</ion-label>
                  </ion-chip>
                  <ion-chip (click)="loadRacePreset('rogue')" color="success">
                    <ion-icon name="flash-outline"></ion-icon>
                    <ion-label>Pícaro</ion-label>
                  </ion-chip>
                  <ion-chip (click)="loadRacePreset('free')" color="tertiary">
                    <ion-icon name="infinite-outline"></ion-icon>
                    <ion-label>Libre</ion-label>
                  </ion-chip>
                </div>
              </div>

              @if (races.length === 0) {
                <div class="empty-races-message">
                  <ion-icon name="people-outline"></ion-icon>
                  <p>No hay razas definidas</p>
                  <span>Agrega al menos una raza usando los presets o el botón de abajo</span>
                </div>
              }

              <div class="races-list">
                @for (race of races; track race.id; let i = $index) {
                  <ion-card class="race-card">
                    <ion-card-content>
                      <div class="race-header">
                        <ion-input
                          [(ngModel)]="race.name"
                          placeholder="Nombre de la raza *"
                          class="race-name-input"
                        ></ion-input>
                        <ion-button fill="clear" color="danger" (click)="removeRace(i)">
                          <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                        </ion-button>
                      </div>

                      <ion-item lines="none">
                        <ion-textarea
                          [(ngModel)]="race.description"
                          placeholder="Descripción de la raza *"
                          [rows]="2"
                        ></ion-textarea>
                      </ion-item>

                      <div class="race-image-section">
                        <label class="race-image-label">Imagen de la raza <span class="required">*</span></label>
                        <app-image-upload
                          placeholder="Imagen de raza"
                          [value]="race.image"
                          [maxSizeKB]="300"
                          [maxWidth]="300"
                          [maxHeight]="300"
                          (imageChange)="race.image = $event || undefined"
                        ></app-image-upload>
                      </div>

                      <div class="base-stats-section">
                        <div class="base-stats-header">
                          <p class="base-stats-label">Estadísticas Base:</p>
                          <div class="points-summary" [class.over-budget]="getRaceUsedPoints(race) > initialPoints">
                            <span>Usados: {{ getRaceUsedPoints(race) }}/{{ initialPoints }}</span>
                            <span class="free-points">Libres: {{ race.freePoints }}</span>
                          </div>
                        </div>
                        <div class="base-stats-grid">
                          @for (stat of stats; track stat.key) {
                            <div class="base-stat-item">
                              <div class="stat-label" [style.color]="stat.color">
                                <ion-icon [name]="stat.icon"></ion-icon>
                                <span>{{ stat.abbreviation }}</span>
                              </div>
                              <ion-input
                                type="number"
                                [(ngModel)]="race.baseStats[stat.key]"
                                [min]="0"
                                [max]="initialPoints"
                                (ionChange)="updateRaceFreePoints(race)"
                                class="base-stat-input"
                              ></ion-input>
                            </div>
                          }
                        </div>
                      </div>

                      <div class="race-summary">
                        @if (getRaceUsedPoints(race) === initialPoints) {
                          <ion-chip color="success">
                            <ion-icon name="checkmark-circle"></ion-icon>
                            <ion-label>Stats completos (sin puntos libres)</ion-label>
                          </ion-chip>
                        } @else if (getRaceUsedPoints(race) === 0) {
                          <ion-chip color="tertiary">
                            <ion-icon name="infinite-outline"></ion-icon>
                            <ion-label>Libertad total ({{ initialPoints }} puntos para repartir)</ion-label>
                          </ion-chip>
                        } @else {
                          <ion-chip color="primary">
                            <ion-icon name="options-outline"></ion-icon>
                            <ion-label>{{ race.freePoints }} puntos libres para el jugador</ion-label>
                          </ion-chip>
                        }
                      </div>
                    </ion-card-content>
                  </ion-card>
                }
              </div>

              <ion-button
                expand="block"
                fill="outline"
                (click)="addRace()"
                [disabled]="races.length >= MAX_RACES"
              >
                <ion-icon slot="start" name="add"></ion-icon>
                {{ races.length >= MAX_RACES ? 'Límite de razas alcanzado (' + MAX_RACES + ')' : 'Agregar Raza' }}
              </ion-button>
            }
          </div>
        }

        <!-- Step 4: Progression Rules -->
        @if (currentStep() === 3) {
          <div class="form-section">
            <h2>Reglas de Progresión</h2>
            <p class="section-desc">Define cómo las acciones afectan las estadísticas</p>

            @if (rules.length === 0) {
              <div class="empty-rules-message">
                <ion-icon name="trending-up-outline"></ion-icon>
                <p>No hay reglas definidas</p>
                <span>Agrega al menos una regla para definir cómo progresan los personajes</span>
              </div>
            }

            <div class="rules-list">
              @for (rule of rules; track rule.id; let i = $index) {
                <ion-card class="rule-card" [class.invalid]="!isRuleValid(rule)">
                  <ion-card-content>
                    <div class="rule-header">
                      <span class="rule-number">Regla {{ i + 1 }}</span>
                      <ion-button fill="clear" color="danger" (click)="removeRule(i)">
                        <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                      </ion-button>
                    </div>

                    <ion-item lines="none" [class.item-invalid]="!rule.description.trim()">
                      <ion-input
                        label="Descripción *"
                        labelPlacement="stacked"
                        [(ngModel)]="rule.description"
                        placeholder="Ej: Entrenamiento físico"
                      ></ion-input>
                    </ion-item>
                    @if (!rule.description.trim()) {
                      <p class="field-error">La descripción es obligatoria</p>
                    }

                    <ion-item lines="none" [class.item-invalid]="!rule.keywords.trim()">
                      <ion-input
                        label="Palabras clave (separadas por coma) *"
                        labelPlacement="stacked"
                        [(ngModel)]="rule.keywords"
                        placeholder="entrenar, ejercicio, gimnasio"
                      ></ion-input>
                    </ion-item>
                    @if (!rule.keywords.trim()) {
                      <p class="field-error">Las palabras clave son obligatorias</p>
                    }

                    <ion-item lines="none" [class.item-invalid]="rule.affectedStats.length === 0">
                      <ion-select
                        label="Stats afectados *"
                        labelPlacement="stacked"
                        [(ngModel)]="rule.affectedStats"
                        [multiple]="true"
                        placeholder="Selecciona al menos uno"
                      >
                        @for (stat of stats; track stat.key) {
                          <ion-select-option [value]="stat.key">{{ stat.name }}</ion-select-option>
                        }
                      </ion-select>
                    </ion-item>
                    @if (rule.affectedStats.length === 0) {
                      <p class="field-error">Selecciona al menos un stat afectado</p>
                    }

                    <ion-item lines="none">
                      <ion-range
                        label="Cambio máximo: {{ rule.maxChange }}"
                        labelPlacement="stacked"
                        [(ngModel)]="rule.maxChange"
                        [min]="1"
                        [max]="10"
                        [snaps]="true"
                        [ticks]="true"
                      ></ion-range>
                    </ion-item>
                  </ion-card-content>
                </ion-card>
              }
            </div>

            <ion-button expand="block" fill="outline" (click)="addRule()">
              <ion-icon slot="start" name="add"></ion-icon>
              Agregar Regla
            </ion-button>
          </div>
        }

        <!-- Step 5: Ranking System -->
        @if (currentStep() === 4) {
          <div class="form-section">
            <h2>Sistema de Rangos</h2>
            <p class="section-desc">Configura el sistema de poder/awakening</p>

            <ion-item>
              <ion-toggle [(ngModel)]="awakening.enabled">
                Activar sistema de rangos
              </ion-toggle>
            </ion-item>

            @if (awakening.enabled) {
              <div class="ranking-config">
                <p class="config-label">Selecciona un preset o personaliza:</p>

                <div class="ranking-presets">
                  <ion-chip
                    [color]="selectedRankingPreset === 'solo-leveling' ? 'primary' : 'medium'"
                    (click)="loadRankingPreset('solo-leveling')"
                  >E-S-SS-SSS</ion-chip>
                  <ion-chip
                    [color]="selectedRankingPreset === 'levels' ? 'primary' : 'medium'"
                    (click)="loadRankingPreset('levels')"
                  >Niveles 1-100</ion-chip>
                  <ion-chip
                    [color]="selectedRankingPreset === 'tiers' ? 'primary' : 'medium'"
                    (click)="loadRankingPreset('tiers')"
                  >Bronce-Plata-Oro</ion-chip>
                </div>

                <div class="ranks-display">
                  <p>Rangos actuales:</p>
                  <div class="ranks-flow">
                    @for (rank of awakening.levels; track rank; let i = $index; let last = $last) {
                      <span class="rank-badge">{{ rank }}</span>
                      @if (!last) {
                        <ion-icon name="arrow-forward"></ion-icon>
                      }
                    }
                  </div>
                </div>

                <ion-item>
                  <ion-input
                    label="Rangos personalizados (separados por coma)"
                    labelPlacement="stacked"
                    [(ngModel)]="customRanks"
                    placeholder="E, D, C, B, A, S, SS, SSS"
                    (ionChange)="updateCustomRanks()"
                  ></ion-input>
                </ion-item>
              </div>
            }
          </div>
        }

        <!-- Step 6: Review -->
        @if (currentStep() === 5) {
          <div class="form-section review-section">
            <h2>Revisión Final</h2>
            <p class="section-desc">Revisa tu universo antes de crearlo</p>

            <ion-card class="review-card">
              <ion-card-header>
                <ion-card-title>{{ universe.name || 'Sin nombre' }}</ion-card-title>
                <ion-card-subtitle>{{ selectedTheme || 'Sin temática' }}</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <p>{{ universe.description || 'Sin descripción' }}</p>

                <div class="review-section-block">
                  <h4>Estadísticas ({{ stats.length }})</h4>
                  <div class="stats-chips">
                    @for (stat of stats; track stat.key) {
                      <ion-chip [style.borderColor]="stat.color">
                        <ion-icon [name]="stat.icon" [style.color]="stat.color"></ion-icon>
                        <ion-label>{{ stat.abbreviation }}</ion-label>
                      </ion-chip>
                    }
                  </div>
                </div>

                <div class="review-section-block">
                  <h4>Reglas de Progresión ({{ rules.length }})</h4>
                  <ion-list lines="none">
                    @for (rule of rules; track rule.id) {
                      <ion-item>
                        <ion-icon name="chevron-forward" slot="start" color="primary"></ion-icon>
                        <ion-label>{{ rule.description }}</ion-label>
                      </ion-item>
                    }
                  </ion-list>
                </div>

                @if (awakening.enabled) {
                  <div class="review-section-block">
                    <h4>Sistema de Rangos</h4>
                    <div class="ranks-flow">
                      @for (rank of awakening.levels; track rank; let last = $last) {
                        <span class="rank-badge">{{ rank }}</span>
                        @if (!last) {
                          <ion-icon name="arrow-forward"></ion-icon>
                        }
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
            Crear Universo
          </ion-button>
        }
      </div>
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

    .step.active, .step.completed {
      opacity: 1;
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--ion-color-medium);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
    }

    .step.active .step-number {
      background: var(--ion-color-primary);
    }

    .step.completed .step-number {
      background: var(--ion-color-success);
    }

    .step-label {
      font-size: 10px;
      margin-top: 4px;
      text-align: center;
      max-width: 60px;
    }

    .step-line {
      width: 20px;
      height: 2px;
      background: var(--ion-color-medium);
      margin: 0 4px;
    }

    .step-line.completed {
      background: var(--ion-color-success);
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

    .stat-card, .rule-card {
      margin: 8px 0;
    }

    .rule-card.invalid {
      border-left: 3px solid var(--ion-color-danger);
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .rule-number {
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-color-primary);
    }

    .item-invalid {
      --border-color: var(--ion-color-danger);
    }

    .field-error {
      font-size: 12px;
      color: var(--ion-color-danger);
      margin: 2px 0 8px 0;
      padding-left: 16px;
    }

    .empty-rules-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 16px;
      text-align: center;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      margin: 16px 0;
    }

    .empty-rules-message ion-icon {
      font-size: 48px;
      color: var(--ion-color-medium);
      margin-bottom: 12px;
    }

    .empty-rules-message p {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }

    .empty-rules-message span {
      margin-top: 4px;
      font-size: 13px;
      color: var(--ion-color-medium);
    }

    .stat-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-header ion-icon {
      font-size: 24px;
    }

    .stat-name-input {
      flex: 1;
    }

    .stat-details, .stat-values {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .stat-details ion-item, .stat-values ion-item {
      --padding-start: 0;
      flex: 1;
    }

    .presets {
      margin-top: 16px;
      text-align: center;
    }

    .presets p {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
    }

    .ranking-config {
      margin-top: 16px;
    }

    .config-label {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
    }

    .ranking-presets {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .ranks-display {
      margin: 16px 0;
    }

    .ranks-display p {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
    }

    .ranks-flow {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
    }

    .rank-badge {
      background: rgba(var(--ion-color-primary-rgb), 0.2);
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: bold;
      font-size: 12px;
    }

    .ranks-flow ion-icon {
      font-size: 12px;
      color: var(--ion-color-medium);
    }

    .review-card {
      margin-top: 16px;
    }

    .review-section-block {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .review-section-block h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: var(--ion-color-medium);
    }

    .stats-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .stats-chips ion-chip {
      border-left: 3px solid;
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

    /* Cover image section */
    .cover-image-section {
      margin: 16px 0;
    }

    .section-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--ion-color-medium);
    }

    .required {
      color: var(--ion-color-danger);
      font-weight: 600;
    }

    /* Toggle styling */
    .toggle-item {
      --background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      margin-top: 16px;
    }

    .toggle-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toggle-hint {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 8px 0 0 0;
      padding-left: 8px;
    }

    /* Active step enhancement */
    .step.active .step-number {
      box-shadow: 0 0 15px rgba(var(--ion-color-primary-rgb), 0.6);
    }

    /* Stats minimum note */
    .stats-note {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(var(--ion-color-warning-rgb), 0.15);
      border-radius: 8px;
      font-size: 13px;
      color: var(--ion-color-warning);
      margin-bottom: 12px;
    }

    /* Race system styles */
    .race-presets {
      margin: 16px 0;
    }

    .presets-label {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
    }

    .preset-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .races-list {
      margin: 16px 0;
    }

    .empty-races-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 16px;
      text-align: center;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      margin: 16px 0;
    }

    .empty-races-message ion-icon {
      font-size: 48px;
      color: var(--ion-color-medium);
      margin-bottom: 12px;
    }

    .empty-races-message p {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }

    .empty-races-message span {
      margin-top: 4px;
      font-size: 13px;
      color: var(--ion-color-medium);
    }

    .race-card {
      margin: 12px 0;
    }

    .race-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .race-name-input {
      flex: 1;
      font-size: 18px;
      font-weight: 600;
    }

    .modifiers-section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modifiers-label {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
    }

    .modifiers-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }

    .modifier-item {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      padding: 8px;
      border-radius: 8px;
    }

    .stat-select {
      min-width: 80px;
    }

    .modifier-input {
      width: 80px;
      text-align: center;
    }

    .modifier-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }

    .mod-badge {
      font-size: 12px;
      font-weight: bold;
      padding: 4px 10px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
    }

    .mod-badge.positive {
      background: rgba(var(--ion-color-success-rgb), 0.2);
      color: var(--ion-color-success);
    }

    .mod-badge.negative {
      background: rgba(var(--ion-color-danger-rgb), 0.2);
      color: var(--ion-color-danger);
    }

    /* Initial points section */
    .initial-points-section {
      margin-bottom: 20px;
    }

    .points-card {
      margin: 0;
      background: rgba(var(--ion-color-primary-rgb), 0.08);
      border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
    }

    .points-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    .points-header ion-icon {
      font-size: 24px;
    }

    .points-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .points-desc {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin: 0 0 12px 0;
    }

    .points-input {
      --background: rgba(255, 255, 255, 0.1);
      --padding-start: 12px;
      --padding-end: 12px;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      max-width: 120px;
    }

    .points-label {
      font-size: 14px;
      color: var(--ion-color-medium);
    }

    .points-presets {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    /* Race info card */
    .race-info-card {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: 8px;
      margin: 16px 0;
    }

    .race-info-card ion-icon {
      font-size: 20px;
      color: var(--ion-color-primary);
      flex-shrink: 0;
    }

    .race-info-card strong {
      display: block;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .race-info-card p {
      margin: 0;
      font-size: 12px;
      color: var(--ion-color-medium);
    }

    /* Base stats section */
    .base-stats-section {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .base-stats-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .base-stats-label {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .points-summary {
      display: flex;
      gap: 12px;
      font-size: 12px;
    }

    .points-summary.over-budget {
      color: var(--ion-color-danger);
    }

    .free-points {
      color: var(--ion-color-success);
      font-weight: 600;
    }

    .base-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 8px;
    }

    .base-stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }

    .stat-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .stat-label ion-icon {
      font-size: 16px;
    }

    .base-stat-input {
      --background: rgba(255, 255, 255, 0.1);
      --padding-start: 8px;
      --padding-end: 8px;
      width: 60px;
      text-align: center;
      font-weight: bold;
    }

    /* Race summary */
    .race-summary {
      margin-top: 12px;
      display: flex;
      justify-content: center;
    }

    /* Race image section */
    .race-image-section {
      margin: 12px 0;
      padding: 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
    }

    .race-image-label {
      display: block;
      font-size: 12px;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
    }

    .race-image-section app-image-upload {
      --min-height: 80px;
    }
  `]
})
export class ManualUniverseFormComponent {
  @Output() created = new EventEmitter<Partial<Universe>>();
  @Output() cancelled = new EventEmitter<void>();

  currentStep = signal(0);

  steps = [
    { id: 'basic', label: 'Básico' },
    { id: 'stats', label: 'Stats' },
    { id: 'races', label: 'Razas' },
    { id: 'rules', label: 'Reglas' },
    { id: 'ranks', label: 'Rangos' },
    { id: 'review', label: 'Revisar' }
  ];

  themes = [
    { value: 'fantasy', label: 'Fantasía' },
    { value: 'scifi', label: 'Ciencia Ficción' },
    { value: 'cyberpunk', label: 'Cyberpunk' },
    { value: 'postapocalyptic', label: 'Post-Apocalíptico' },
    { value: 'steampunk', label: 'Steampunk' },
    { value: 'medieval', label: 'Medieval' },
    { value: 'modern', label: 'Moderno' },
    { value: 'custom', label: 'Personalizado' }
  ];

  availableIcons = [
    { name: 'barbell-outline', label: 'Fuerza' },
    { name: 'flash-outline', label: 'Velocidad' },
    { name: 'heart-outline', label: 'Vida' },
    { name: 'bulb-outline', label: 'Inteligencia' },
    { name: 'eye-outline', label: 'Percepción' },
    { name: 'shield-outline', label: 'Defensa' },
    { name: 'flame-outline', label: 'Fuego' },
    { name: 'water-outline', label: 'Agua' },
    { name: 'leaf-outline', label: 'Naturaleza' },
    { name: 'sparkles-outline', label: 'Magia' },
    { name: 'cube-outline', label: 'Suerte' },
    { name: 'chatbubbles-outline', label: 'Carisma' }
  ];

  universe = {
    name: '',
    description: '',
    coverImage: '',
    isPublic: false
  };

  selectedTheme = '';
  initialPoints = DEFAULT_INITIAL_POINTS;

  stats: StatEntry[] = [
    { key: 'strength', name: 'Fuerza', abbreviation: 'STR', icon: 'barbell-outline', color: '#F44336', maxValue: 100 },
    { key: 'agility', name: 'Agilidad', abbreviation: 'AGI', icon: 'flash-outline', color: '#03A9F4', maxValue: 100 },
    { key: 'vitality', name: 'Vitalidad', abbreviation: 'VIT', icon: 'heart-outline', color: '#4CAF50', maxValue: 100 },
    { key: 'intelligence', name: 'Inteligencia', abbreviation: 'INT', icon: 'bulb-outline', color: '#9C27B0', maxValue: 100 }
  ];

  rules: RuleEntry[] = [
    { id: '1', description: 'Entrenamiento físico', keywords: 'entrenar, ejercicio, gimnasio', affectedStats: ['strength', 'vitality'], maxChange: 3 },
    { id: '2', description: 'Combate', keywords: 'pelear, luchar, batalla', affectedStats: ['strength', 'agility'], maxChange: 2 }
  ];

  awakening: AwakeningSystem = {
    enabled: true,
    levels: ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'],
    thresholds: [0, 50, 100, 200, 350, 500, 700, 900]
  };

  // Race system
  raceSystemEnabled = false;
  readonly MAX_RACES = 8; // Límite de razas por universo (para no exceder 1MB en Firestore)
  races: RaceEntry[] = [];

  selectedRankingPreset = 'solo-leveling';
  customRanks = '';

  validationErrors = signal<string[]>([]);

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
      case 0: // Básico - nombre y portada obligatorios
        return this.universe.name.trim().length >= 3 &&
               !!this.universe.coverImage && this.universe.coverImage.trim().length > 0;
      case 1: // Stats
        return this.stats.length >= 4 && this.stats.every(s => s.name.trim().length > 0);
      case 2: // Razas - si está habilitado, imagen de raza obligatoria
        if (!this.raceSystemEnabled) return true;
        return this.races.length >= 1 &&
               this.races.length <= this.MAX_RACES &&
               this.races.every(r =>
                 r.name.trim().length > 0 &&
                 r.description.trim().length > 0 &&
                 !!r.image && r.image.trim().length > 0 // Imagen obligatoria
               );
      case 3: // Reglas
        return this.rules.length >= 1 && this.rules.every(r =>
          r.description.trim().length > 0 &&
          r.keywords.trim().length > 0 &&
          r.affectedStats.length > 0
        );
      case 4: // Rangos
        return true;
      default:
        return true;
    }
  }

  addStat(): void {
    const newKey = `stat_${Date.now()}`;
    this.stats.push({
      key: newKey,
      name: '',
      abbreviation: '',
      icon: 'sparkles-outline',
      color: '#4CAF50',
      maxValue: 100
    });
    // Update existing races to include the new stat with value 0
    this.races.forEach(race => {
      if (!race.baseStats[newKey]) {
        race.baseStats[newKey] = 0;
        this.updateRaceFreePoints(race);
      }
    });
  }

  removeStat(index: number): void {
    if (this.stats.length > 4) {
      this.stats.splice(index, 1);
    }
  }

  onStatIconChange(index: number, event: any): void {
    // Forzar re-renderizado del icono creando una nueva referencia del stat
    const newIcon = event.detail.value;
    this.stats[index] = { ...this.stats[index], icon: newIcon };
  }

  addRule(): void {
    this.rules.push({
      id: Date.now().toString(),
      description: '',
      keywords: '',
      affectedStats: [],
      maxChange: 2
    });
  }

  removeRule(index: number): void {
    this.rules.splice(index, 1);
  }

  // Race management methods
  addRace(): void {
    // Initialize baseStats with 0 for each stat
    const baseStats: Record<string, number> = {};
    this.stats.forEach(stat => {
      baseStats[stat.key] = 0;
    });

    this.races.push({
      id: `race_${Date.now()}`,
      name: '',
      description: '',
      baseStats,
      freePoints: this.initialPoints
    });
  }

  removeRace(index: number): void {
    this.races.splice(index, 1);
  }

  getRaceUsedPoints(race: RaceEntry): number {
    return Object.values(race.baseStats).reduce((sum, val) => sum + (val || 0), 0);
  }

  updateRaceFreePoints(race: RaceEntry): void {
    const usedPoints = this.getRaceUsedPoints(race);
    race.freePoints = Math.max(0, this.initialPoints - usedPoints);
  }

  loadRacePreset(preset: string): void {
    // Initialize baseStats with 0 for each current stat
    const createBaseStats = (overrides: Record<string, number> = {}): Record<string, number> => {
      const baseStats: Record<string, number> = {};
      this.stats.forEach(stat => {
        baseStats[stat.key] = overrides[stat.key] || 0;
      });
      return baseStats;
    };

    const calculateFreePoints = (baseStats: Record<string, number>): number => {
      const usedPoints = Object.values(baseStats).reduce((sum, val) => sum + val, 0);
      return Math.max(0, this.initialPoints - usedPoints);
    };

    switch (preset) {
      case 'warrior': {
        const baseStats = createBaseStats({
          strength: Math.round(this.initialPoints * 0.4),  // 40% en fuerza
          vitality: Math.round(this.initialPoints * 0.3),  // 30% en vitalidad
          agility: Math.round(this.initialPoints * 0.2)    // 20% en agilidad
        });
        this.races.push({
          id: `warrior_${Date.now()}`,
          name: 'Guerrero',
          description: 'Especialista en combate cuerpo a cuerpo',
          baseStats,
          freePoints: calculateFreePoints(baseStats)
        });
        break;
      }
      case 'mage': {
        const baseStats = createBaseStats({
          intelligence: Math.round(this.initialPoints * 0.5), // 50% en inteligencia
          vitality: Math.round(this.initialPoints * 0.2)      // 20% en vitalidad
        });
        this.races.push({
          id: `mage_${Date.now()}`,
          name: 'Mago',
          description: 'Maestro de las artes arcanas',
          baseStats,
          freePoints: calculateFreePoints(baseStats)
        });
        break;
      }
      case 'rogue': {
        const baseStats = createBaseStats({
          agility: Math.round(this.initialPoints * 0.4),     // 40% en agilidad
          strength: Math.round(this.initialPoints * 0.2),    // 20% en fuerza
          intelligence: Math.round(this.initialPoints * 0.1) // 10% en inteligencia
        });
        this.races.push({
          id: `rogue_${Date.now()}`,
          name: 'Pícaro',
          description: 'Ágil y sigiloso',
          baseStats,
          freePoints: calculateFreePoints(baseStats)
        });
        break;
      }
      case 'free': {
        const baseStats = createBaseStats(); // All zeros
        this.races.push({
          id: `free_${Date.now()}`,
          name: 'Libre',
          description: 'Sin estadísticas predefinidas - libertad total',
          baseStats,
          freePoints: this.initialPoints
        });
        break;
      }
    }
  }

  getStatName(statKey: string): string {
    const stat = this.stats.find(s => s.key === statKey);
    return stat?.abbreviation || statKey;
  }

  isRuleValid(rule: RuleEntry): boolean {
    return rule.description.trim().length > 0 &&
           rule.keywords.trim().length > 0 &&
           rule.affectedStats.length > 0;
  }

  loadPreset(preset: string): void {
    switch (preset) {
      case 'solo-leveling':
        this.stats = [
          { key: 'strength', name: 'Fuerza', abbreviation: 'STR', icon: 'barbell-outline', color: '#F44336', maxValue: 999 },
          { key: 'agility', name: 'Agilidad', abbreviation: 'AGI', icon: 'flash-outline', color: '#03A9F4', maxValue: 999 },
          { key: 'vitality', name: 'Vitalidad', abbreviation: 'VIT', icon: 'heart-outline', color: '#4CAF50', maxValue: 999 },
          { key: 'intelligence', name: 'Inteligencia', abbreviation: 'INT', icon: 'bulb-outline', color: '#9C27B0', maxValue: 999 },
          { key: 'perception', name: 'Percepción', abbreviation: 'PER', icon: 'eye-outline', color: '#FF9800', maxValue: 999 },
          { key: 'sense', name: 'Sentido', abbreviation: 'SEN', icon: 'sparkles-outline', color: '#00BCD4', maxValue: 999 }
        ];
        this.initialPoints = 60;
        break;
      case 'dnd':
        this.stats = [
          { key: 'str', name: 'Strength', abbreviation: 'STR', icon: 'barbell-outline', color: '#F44336', maxValue: 20 },
          { key: 'dex', name: 'Dexterity', abbreviation: 'DEX', icon: 'flash-outline', color: '#03A9F4', maxValue: 20 },
          { key: 'con', name: 'Constitution', abbreviation: 'CON', icon: 'heart-outline', color: '#4CAF50', maxValue: 20 },
          { key: 'int', name: 'Intelligence', abbreviation: 'INT', icon: 'bulb-outline', color: '#9C27B0', maxValue: 20 },
          { key: 'wis', name: 'Wisdom', abbreviation: 'WIS', icon: 'eye-outline', color: '#FF9800', maxValue: 20 },
          { key: 'cha', name: 'Charisma', abbreviation: 'CHA', icon: 'chatbubbles-outline', color: '#E91E63', maxValue: 20 }
        ];
        this.initialPoints = 27; // Point buy system
        break;
      case 'cyberpunk':
        this.stats = [
          { key: 'body', name: 'Cuerpo', abbreviation: 'BOD', icon: 'barbell-outline', color: '#F44336', maxValue: 10 },
          { key: 'reflexes', name: 'Reflejos', abbreviation: 'REF', icon: 'flash-outline', color: '#03A9F4', maxValue: 10 },
          { key: 'tech', name: 'Tecnología', abbreviation: 'TEC', icon: 'hardware-chip-outline', color: '#4CAF50', maxValue: 10 },
          { key: 'cool', name: 'Sangre Fría', abbreviation: 'COO', icon: 'snow-outline', color: '#00BCD4', maxValue: 10 },
          { key: 'intelligence', name: 'Inteligencia', abbreviation: 'INT', icon: 'bulb-outline', color: '#9C27B0', maxValue: 10 },
          { key: 'empathy', name: 'Empatía', abbreviation: 'EMP', icon: 'heart-outline', color: '#E91E63', maxValue: 10 }
        ];
        this.initialPoints = 40;
        break;
    }
    // Update existing races to reflect new stats
    this.races.forEach(race => {
      const newBaseStats: Record<string, number> = {};
      this.stats.forEach(stat => {
        newBaseStats[stat.key] = race.baseStats[stat.key] || 0;
      });
      race.baseStats = newBaseStats;
      this.updateRaceFreePoints(race);
    });
  }

  loadRankingPreset(preset: string): void {
    this.selectedRankingPreset = preset;
    switch (preset) {
      case 'solo-leveling':
        this.awakening.levels = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
        this.awakening.thresholds = [0, 50, 100, 200, 350, 500, 700, 900];
        break;
      case 'levels':
        this.awakening.levels = ['Nivel 1-10', 'Nivel 11-25', 'Nivel 26-50', 'Nivel 51-75', 'Nivel 76-100'];
        this.awakening.thresholds = [0, 100, 250, 500, 750];
        break;
      case 'tiers':
        this.awakening.levels = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Maestro', 'Gran Maestro', 'Leyenda'];
        this.awakening.thresholds = [0, 50, 100, 200, 350, 500, 700, 1000];
        break;
    }
    this.customRanks = this.awakening.levels.join(', ');
  }

  updateCustomRanks(): void {
    if (this.customRanks.trim()) {
      const ranks = this.customRanks.split(',').map(r => r.trim()).filter(r => r);
      if (ranks.length >= 2) {
        this.awakening.levels = ranks;
        this.selectedRankingPreset = '';
        // Auto-generate thresholds
        const step = Math.floor(1000 / ranks.length);
        this.awakening.thresholds = ranks.map((_, i) => i * step);
      }
    }
  }

  validate(): void {
    const errors: string[] = [];

    if (!this.universe.name || this.universe.name.trim().length < 3) {
      errors.push('El nombre del universo debe tener al menos 3 caracteres');
    }

    if (this.stats.length < 4) {
      errors.push('Debes tener al menos 4 estadísticas');
    }

    const invalidStats = this.stats.filter(s => !s.name.trim() || !s.abbreviation.trim());
    if (invalidStats.length > 0) {
      errors.push('Todas las estadísticas deben tener nombre y abreviación');
    }

    if (this.rules.length === 0) {
      errors.push('Debes tener al menos una regla de progresión');
    }

    const invalidRules = this.rules.filter(r => !r.description.trim() || r.affectedStats.length === 0);
    if (invalidRules.length > 0) {
      errors.push('Todas las reglas deben tener descripción y al menos un stat afectado');
    }

    this.validationErrors.set(errors);
  }

  submitForm(): void {
    this.validate();
    if (this.validationErrors().length > 0) return;

    // Build statDefinitions
    const statDefinitions: Record<string, StatDefinition> = {};
    this.stats.forEach(stat => {
      const key = stat.key || stat.name.toLowerCase().replace(/\s+/g, '_');
      statDefinitions[key] = {
        name: stat.name,
        abbreviation: stat.abbreviation.toUpperCase(),
        icon: stat.icon,
        minValue: 0,
        maxValue: stat.maxValue,
        category: 'primary',
        color: stat.color
      };
    });

    // Build progressionRules
    const progressionRules: ProgressionRule[] = this.rules.map(rule => ({
      id: rule.id,
      keywords: rule.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k),
      affectedStats: rule.affectedStats,
      maxChangePerAction: rule.maxChange,
      description: rule.description
    }));

    // Build raceSystem if enabled
    let raceSystem: RaceSystem | undefined;
    if (this.raceSystemEnabled && this.races.length > 0) {
      raceSystem = {
        enabled: true,
        races: this.races.map(race => ({
          id: race.id,
          name: race.name,
          description: race.description,
          image: race.image, // Imagen opcional de la raza
          baseStats: race.baseStats,
          freePoints: race.freePoints
        }))
      };
    }

    const universeData: Partial<Universe> = {
      name: this.universe.name.trim(),
      description: this.universe.description.trim() || `Universo de ${this.selectedTheme || 'fantasía'}`,
      coverImage: this.universe.coverImage?.trim() || undefined,
      statDefinitions,
      initialPoints: this.initialPoints,
      progressionRules,
      awakeningSystem: this.awakening.enabled
        ? this.awakening
        : { enabled: false, levels: [], thresholds: [] },
      raceSystem,
      isPublic: this.universe.isPublic
    };

    // Log detallado para debug - mostrar toda la estructura del universo
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║           UNIVERSO A CREAR - DATOS COMPLETOS                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('📦 Nombre:', universeData.name);
    console.log('📝 Descripción:', universeData.description);
    console.log('🖼️ Portada:', universeData.coverImage ? `${Math.round(universeData.coverImage.length / 1024)}KB` : 'Sin portada');
    console.log('🎯 Puntos iniciales:', universeData.initialPoints);
    console.log('📊 Stats:', Object.keys(statDefinitions).length, '-', Object.keys(statDefinitions).join(', '));
    console.log('📜 Reglas de progresión:', progressionRules.length);
    console.log('🏆 Sistema de Rangos:', universeData.awakeningSystem?.enabled ? 'Activo' : 'Inactivo');
    if (raceSystem) {
      console.log('👥 Sistema de Razas: Activo -', raceSystem.races.length, 'razas');
      raceSystem.races.forEach((race, i) => {
        const imgSize = race.image ? Math.round(race.image.length / 1024) : 0;
        console.log(`   ${i + 1}. ${race.name} - Imagen: ${imgSize}KB - FreePoints: ${race.freePoints}`);
      });
    } else {
      console.log('👥 Sistema de Razas: Inactivo');
    }
    console.log('🌐 Público:', universeData.isPublic);
    console.log('────────────────────────────────────────────────────────────────');
    console.log('📄 OBJETO COMPLETO (para copiar):');
    console.log(JSON.stringify(universeData, null, 2));
    console.log('════════════════════════════════════════════════════════════════');

    this.created.emit(universeData);
  }
}
