import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon, IonChip } from '@ionic/angular/standalone';

/**
 * Example that can be clicked to insert into input
 */
export interface HelpExample {
  label: string;
  text: string;
  description?: string;
}

/**
 * Help Tooltip Component
 * Shows a (?) icon that reveals helpful information and clickable examples
 */
@Component({
  selector: 'app-help-tooltip',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, IonChip],
  template: `
    <div class="help-tooltip-container">
      <ion-button
        fill="clear"
        size="small"
        class="help-button"
        (click)="toggleTooltip()"
        [class.active]="isOpen"
      >
        <ion-icon slot="icon-only" name="help-circle-outline"></ion-icon>
      </ion-button>

      @if (isOpen) {
        <div class="tooltip-content" [class.position-top]="position === 'top'">
          <div class="tooltip-arrow"></div>

          <div class="tooltip-header">
            <ion-icon name="bulb-outline"></ion-icon>
            <span>{{ title }}</span>
            <ion-button fill="clear" size="small" (click)="toggleTooltip()">
              <ion-icon slot="icon-only" name="close-outline"></ion-icon>
            </ion-button>
          </div>

          <div class="tooltip-body">
            <p class="main-message">{{ message }}</p>

            @if (examples.length > 0) {
              <div class="examples-section">
                <p class="examples-label">Prueba con:</p>
                <div class="examples-list">
                  @for (example of examples; track example.label) {
                    <ion-chip
                      outline
                      class="example-chip"
                      (click)="selectExample(example)"
                    >
                      <ion-icon name="arrow-forward-outline" class="example-icon"></ion-icon>
                      {{ example.label }}
                    </ion-chip>
                  }
                </div>
              </div>
            }

            @if (tips.length > 0) {
              <div class="tips-section">
                <p class="tips-label">Tips:</p>
                <ul class="tips-list">
                  @for (tip of tips; track tip) {
                    <li>{{ tip }}</li>
                  }
                </ul>
              </div>
            }
          </div>
        </div>
      }

      <!-- Backdrop to close tooltip -->
      @if (isOpen) {
        <div class="tooltip-backdrop" (click)="toggleTooltip()"></div>
      }
    </div>
  `,
  styles: [`
    .help-tooltip-container {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .help-button {
      --padding-start: 4px;
      --padding-end: 4px;
      margin: 0;
      opacity: 0.7;
      transition: opacity 0.2s, transform 0.2s;
    }

    .help-button:hover,
    .help-button.active {
      opacity: 1;
    }

    .help-button.active {
      transform: scale(1.1);
    }

    .help-button ion-icon {
      font-size: 20px;
      color: var(--ion-color-primary);
    }

    .tooltip-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999;
    }

    .tooltip-content {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 8px;
      width: 300px;
      max-width: 90vw;
      background: var(--ion-background-color, #1a1a2e);
      border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      overflow: hidden;
    }

    .tooltip-content.position-top {
      top: auto;
      bottom: 100%;
      margin-top: 0;
      margin-bottom: 8px;
    }

    .tooltip-arrow {
      position: absolute;
      top: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 12px;
      height: 12px;
      background: var(--ion-background-color, #1a1a2e);
      border-left: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
      border-top: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
      transform: translateX(-50%) rotate(45deg);
    }

    .position-top .tooltip-arrow {
      top: auto;
      bottom: -6px;
      transform: translateX(-50%) rotate(225deg);
    }

    .tooltip-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 12px 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .tooltip-header ion-icon {
      color: var(--ion-color-warning);
      font-size: 18px;
    }

    .tooltip-header span {
      flex: 1;
      font-weight: 600;
      font-size: 14px;
    }

    .tooltip-header ion-button {
      --padding-start: 4px;
      --padding-end: 4px;
      margin: 0;
    }

    .tooltip-body {
      padding: 12px;
    }

    .main-message {
      margin: 0 0 12px 0;
      font-size: 13px;
      line-height: 1.5;
      opacity: 0.9;
    }

    .examples-section {
      margin-bottom: 12px;
    }

    .examples-label,
    .tips-label {
      font-size: 12px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: var(--ion-color-primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .examples-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .example-chip {
      --background: transparent;
      --color: var(--ion-text-color);
      font-size: 12px;
      height: 28px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .example-chip:hover {
      --background: rgba(var(--ion-color-primary-rgb), 0.15);
      --color: var(--ion-color-primary);
    }

    .example-icon {
      font-size: 12px;
      margin-right: 4px;
    }

    .tips-section {
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .tips-list {
      margin: 0;
      padding-left: 16px;
      font-size: 12px;
      opacity: 0.8;
    }

    .tips-list li {
      margin-bottom: 4px;
    }

    .tips-list li:last-child {
      margin-bottom: 0;
    }
  `]
})
export class HelpTooltipComponent {
  /** Title shown in tooltip header */
  @Input() title = 'Consejo';

  /** Main help message */
  @Input() message = 'Entre más detalles proveas, más datos creará directamente.';

  /** Clickable examples */
  @Input() examples: HelpExample[] = [
    {
      label: 'Universo completo',
      text: 'Quiero un universo de fantasía llamado Shadowrealm con 6 stats: fuerza, agilidad, vitalidad, inteligencia, percepción y carisma. Sistema de rangos E hasta SSS.',
      description: 'Ejemplo de descripción completa'
    },
    {
      label: 'Solo el nombre',
      text: 'Crear un universo llamado "Reinos de Cristal"',
      description: 'Ejemplo minimalista'
    }
  ];

  /** Additional tips to show */
  @Input() tips: string[] = [
    'Puedes dar toda la info de una vez',
    'Menciona stats, rangos, y reglas juntos',
    'Sube imágenes cuando quieras'
  ];

  /** Position of tooltip (top or bottom) */
  @Input() position: 'top' | 'bottom' = 'bottom';

  /** Emits when an example is selected */
  @Output() exampleSelected = new EventEmitter<HelpExample>();

  /** Whether tooltip is currently open */
  isOpen = false;

  toggleTooltip(): void {
    this.isOpen = !this.isOpen;
  }

  selectExample(example: HelpExample): void {
    this.exampleSelected.emit(example);
    this.isOpen = false;
  }
}
