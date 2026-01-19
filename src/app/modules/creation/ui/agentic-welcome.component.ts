import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Universe } from '../../../core/models';
import { HelpTooltipComponent, HelpExample } from '../../../shared/ui/help-tooltip.component';

/**
 * Welcome option for agentic creation
 */
export interface WelcomeOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  color?: string;
}

/**
 * Agentic Welcome Component
 * Contextual welcome screen with dynamic options and free input
 */
@Component({
  selector: 'app-agentic-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HelpTooltipComponent],
  template: `
    <div class="agentic-welcome">
      <!-- Header with help -->
      <div class="welcome-header">
        <div class="header-content">
          <ion-icon name="sparkles-outline" class="welcome-icon"></ion-icon>
          <h1>{{ title }}</h1>
        </div>
        <app-help-tooltip
          title="Tip de creación"
          [message]="helpMessage"
          [examples]="helpExamples"
          [tips]="helpTips"
          (exampleSelected)="onExampleSelected($event)"
        ></app-help-tooltip>
      </div>

      <!-- Context info (available universes) -->
      @if (availableUniverses.length > 0) {
        <div class="context-info">
          <ion-icon name="planet-outline"></ion-icon>
          <span>
            Tienes {{ availableUniverses.length }}
            {{ availableUniverses.length === 1 ? 'universo disponible' : 'universos disponibles' }}
          </span>
        </div>
      }

      <!-- Subtitle -->
      <p class="welcome-subtitle">{{ subtitle }}</p>

      <!-- Quick options -->
      <div class="options-grid">
        @for (option of options; track option.id) {
          <div
            class="option-card"
            [class.selected]="selectedOption() === option.id"
            (click)="selectOption(option)"
          >
            <ion-icon [name]="option.icon" [style.color]="option.color || 'var(--ion-color-primary)'"></ion-icon>
            <div class="option-content">
              <h3>{{ option.label }}</h3>
              <p>{{ option.description }}</p>
            </div>
            <ion-icon name="chevron-forward-outline" class="chevron"></ion-icon>
          </div>
        }
      </div>

      <!-- Free input section -->
      <div class="free-input-section">
        <div class="input-divider">
          <span>o describe lo que tienes en mente</span>
        </div>

        <div class="input-container">
          <ion-textarea
            [(ngModel)]="freeInput"
            [placeholder]="inputPlaceholder"
            [autoGrow]="true"
            [rows]="2"
            [maxlength]="1000"
            class="free-input"
            (keydown.enter)="onEnterKey($any($event))"
          ></ion-textarea>
          <ion-button
            fill="solid"
            [disabled]="!freeInput().trim()"
            (click)="submitFreeInput()"
            class="submit-button"
          >
            <ion-icon slot="icon-only" name="arrow-forward-outline"></ion-icon>
          </ion-button>
        </div>

        <p class="input-hint">
          <ion-icon name="bulb-outline"></ion-icon>
          Tip: Mientras más detalles des, más campos se llenarán automáticamente
        </p>
      </div>

      <!-- Universe selection (if creating character) -->
      @if (showUniverseSelection && availableUniverses.length > 0) {
        <div class="universe-selection">
          <h3>Universos disponibles</h3>
          <div class="universe-list">
            @for (universe of availableUniverses; track universe.id) {
              <ion-chip
                [color]="selectedUniverseId === universe.id ? 'primary' : 'medium'"
                [outline]="selectedUniverseId !== universe.id"
                (click)="selectUniverse(universe)"
              >
                <ion-icon name="planet-outline"></ion-icon>
                <ion-label>{{ universe.name }}</ion-label>
              </ion-chip>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .agentic-welcome {
      padding: 20px;
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    .welcome-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .welcome-icon {
      font-size: 32px;
      color: var(--ion-color-primary);
    }

    .welcome-header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
    }

    .context-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 13px;
    }

    .context-info ion-icon {
      color: var(--ion-color-primary);
    }

    .welcome-subtitle {
      margin: 0 0 20px 0;
      opacity: 0.7;
      font-size: 14px;
    }

    .options-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .option-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(var(--ion-color-primary-rgb), 0.05);
      border: 1px solid rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .option-card:hover {
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-color: rgba(var(--ion-color-primary-rgb), 0.3);
    }

    .option-card.selected {
      background: rgba(var(--ion-color-primary-rgb), 0.15);
      border-color: var(--ion-color-primary);
    }

    .option-card > ion-icon:first-child {
      font-size: 28px;
      flex-shrink: 0;
    }

    .option-content {
      flex: 1;
    }

    .option-content h3 {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 600;
    }

    .option-content p {
      margin: 0;
      font-size: 12px;
      opacity: 0.7;
    }

    .chevron {
      font-size: 18px;
      opacity: 0.5;
    }

    .free-input-section {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .input-divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin-bottom: 16px;
    }

    .input-divider::before,
    .input-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
    }

    .input-divider span {
      padding: 0 12px;
      font-size: 12px;
      opacity: 0.6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .input-container {
      display: flex;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 8px 8px 8px 16px;
      align-items: flex-end;
    }

    .free-input {
      flex: 1;
      --background: transparent;
      --padding-top: 8px;
      --padding-bottom: 8px;
      font-size: 14px;
    }

    .submit-button {
      --padding-start: 12px;
      --padding-end: 12px;
      --border-radius: 12px;
      margin: 0;
    }

    .input-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 12px 0 0 0;
      font-size: 12px;
      opacity: 0.6;
    }

    .input-hint ion-icon {
      font-size: 14px;
      color: var(--ion-color-warning);
    }

    .universe-selection {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .universe-selection h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
    }

    .universe-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .universe-list ion-chip {
      cursor: pointer;
    }
  `]
})
export class AgenticWelcomeComponent {
  /** Title for the welcome screen */
  @Input() title = '¿Qué quieres crear?';

  /** Subtitle/prompt */
  @Input() subtitle = 'Elige una opción o describe directamente lo que tienes en mente';

  /** Available options */
  @Input() options: WelcomeOption[] = [
    {
      id: 'universe',
      label: 'Crear Universo',
      description: 'Un mundo con sus propias reglas, stats y sistema de rangos',
      icon: 'planet-outline',
      color: 'var(--ion-color-primary)'
    },
    {
      id: 'character',
      label: 'Crear Personaje',
      description: 'Un personaje con trasfondo, stats y habilidades',
      icon: 'person-outline',
      color: 'var(--ion-color-secondary)'
    }
  ];

  /** Available universes for context */
  @Input() availableUniverses: Universe[] = [];

  /** Whether to show universe selection chips */
  @Input() showUniverseSelection = false;

  /** Selected universe ID */
  @Input() selectedUniverseId: string | null = null;

  /** Placeholder for free input */
  @Input() inputPlaceholder = 'Ej: "Quiero un universo de fantasía con 6 stats y sistema de rangos E-SSS"';

  /** Help message */
  @Input() helpMessage = 'Entre más detalles proveas en tu descripción, más campos se llenarán automáticamente.';

  /** Help examples */
  @Input() helpExamples: HelpExample[] = [
    {
      label: 'Universo completo',
      text: 'Quiero un universo de fantasía llamado Shadowrealm con 6 stats: fuerza, agilidad, vitalidad, inteligencia, percepción y carisma. Sistema de rangos E hasta SSS.',
      description: 'Descripción detallada'
    },
    {
      label: 'Personaje rápido',
      text: 'Crear un guerrero llamado Aldric, especializado en combate cuerpo a cuerpo, nivel novato',
      description: 'Personaje básico'
    }
  ];

  /** Help tips */
  @Input() helpTips = [
    'Puedes mencionar todo de una vez',
    'Incluye stats, rangos, y reglas juntos',
    'Sube imágenes cuando quieras'
  ];

  /** Emits when an option is selected */
  @Output() optionSelected = new EventEmitter<WelcomeOption>();

  /** Emits when free input is submitted */
  @Output() freeInputSubmitted = new EventEmitter<string>();

  /** Emits when a universe is selected */
  @Output() universeSelected = new EventEmitter<Universe>();

  /** Emits when an example is selected from help */
  @Output() exampleInserted = new EventEmitter<string>();

  /** Free input value */
  freeInput = signal('');

  /** Currently selected option */
  selectedOption = signal<string | null>(null);

  selectOption(option: WelcomeOption): void {
    this.selectedOption.set(option.id);
    this.optionSelected.emit(option);
  }

  submitFreeInput(): void {
    const input = this.freeInput().trim();
    if (input) {
      this.freeInputSubmitted.emit(input);
    }
  }

  onEnterKey(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault();
      this.submitFreeInput();
    }
  }

  selectUniverse(universe: Universe): void {
    this.universeSelected.emit(universe);
  }

  onExampleSelected(example: HelpExample): void {
    this.freeInput.set(example.text);
    this.exampleInserted.emit(example.text);
  }
}
