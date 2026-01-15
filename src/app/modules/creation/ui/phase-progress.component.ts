import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export interface PhaseProgress {
  current: number;
  total: number;
  percentage: number;
  phaseName: string;
}

@Component({
  selector: 'app-phase-progress',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="phase-progress-container">
      <div class="phase-info">
        <span class="phase-label">Fase {{ progress.current }} de {{ progress.total }}</span>
        <span class="phase-name">{{ progress.phaseName }}</span>
      </div>
      <div class="progress-bar-container">
        <div
          class="progress-bar"
          [style.width.%]="progress.percentage"
        ></div>
      </div>
      <div class="progress-steps">
        @for (step of steps; track step; let i = $index) {
          <div
            class="step"
            [class.completed]="i < progress.current - 1"
            [class.current]="i === progress.current - 1"
            [class.pending]="i > progress.current - 1"
          >
            @if (i < progress.current - 1) {
              <ion-icon name="checkmark"></ion-icon>
            } @else {
              <span>{{ i + 1 }}</span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .phase-progress-container {
      background: rgba(0, 0, 0, 0.2);
      padding: 12px 16px;
    }

    .phase-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .phase-label {
      font-size: 11px;
      text-transform: uppercase;
      opacity: 0.6;
      letter-spacing: 0.5px;
    }

    .phase-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--ion-color-primary);
    }

    .progress-bar-container {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--ion-color-primary), var(--ion-color-secondary));
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .progress-steps {
      display: flex;
      justify-content: space-between;
    }

    .step {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .step.completed {
      background: var(--ion-color-success);
      color: white;
    }

    .step.completed ion-icon {
      font-size: 14px;
    }

    .step.current {
      background: var(--ion-color-primary);
      color: white;
      transform: scale(1.1);
      box-shadow: 0 0 10px rgba(var(--ion-color-primary-rgb), 0.5);
    }

    .step.pending {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.4);
    }
  `]
})
export class PhaseProgressComponent {
  @Input() progress: PhaseProgress = {
    current: 1,
    total: 6,
    percentage: 0,
    phaseName: ''
  };

  get steps(): number[] {
    return Array.from({ length: this.progress.total }, (_, i) => i);
  }
}
