import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-stat-bar',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="stat-bar-container">
      <div class="stat-header">
        <div class="stat-info">
          @if (icon()) {
            <ion-icon [name]="icon()"></ion-icon>
          }
          <span class="stat-name">{{ name() }}</span>
          @if (abbreviation()) {
            <span class="stat-abbr">({{ abbreviation() }})</span>
          }
        </div>
        <div class="stat-value" [class.highlight]="highlight()">
          <span class="current">{{ value() }}</span>
          @if (maxValue() > 0) {
            <span class="separator">/</span>
            <span class="max">{{ maxValue() }}</span>
          }
        </div>
      </div>
      <div class="bar-container">
        <div
          class="bar-fill"
          [style.width.%]="percentage()"
          [style.backgroundColor]="color()"
          [class.animated]="animated()"
        ></div>
        @if (showChange() && change() !== 0) {
          <div class="change-indicator" [class.positive]="change() > 0" [class.negative]="change() < 0">
            {{ change() > 0 ? '+' : '' }}{{ change() }}
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .stat-bar-container {
      margin-bottom: 12px;
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .stat-info {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .stat-info ion-icon {
      font-size: 18px;
      opacity: 0.8;
    }

    .stat-name {
      font-weight: 500;
      font-size: 14px;
    }

    .stat-abbr {
      font-size: 12px;
      opacity: 0.6;
    }

    .stat-value {
      font-family: 'Roboto Mono', monospace;
      font-size: 14px;
      transition: all 0.3s ease;
    }

    .stat-value.highlight {
      transform: scale(1.1);
      color: var(--ion-color-primary);
      text-shadow: 0 0 8px var(--ion-color-primary);
    }

    .stat-value .current {
      font-weight: 600;
    }

    .stat-value .separator,
    .stat-value .max {
      opacity: 0.5;
    }

    .bar-container {
      position: relative;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .bar-fill.animated {
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .change-indicator {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 11px;
      font-weight: 600;
      padding: 1px 4px;
      border-radius: 3px;
      animation: fadeInOut 2s ease-in-out;
    }

    .change-indicator.positive {
      background: rgba(76, 175, 80, 0.3);
      color: #4CAF50;
    }

    .change-indicator.negative {
      background: rgba(244, 67, 54, 0.3);
      color: #F44336;
    }

    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateY(-50%) scale(0.8); }
      20% { opacity: 1; transform: translateY(-50%) scale(1.1); }
      80% { opacity: 1; transform: translateY(-50%) scale(1); }
      100% { opacity: 0; transform: translateY(-50%) scale(0.8); }
    }
  `]
})
export class StatBarComponent {
  // Input signals
  name = signal('');
  abbreviation = signal('');
  icon = signal('');
  value = signal(0);
  maxValue = signal(100);
  color = signal('#4CAF50');
  animated = signal(true);
  showChange = signal(false);
  change = signal(0);
  highlight = signal(false);

  // Computed
  percentage = computed(() => {
    const max = this.maxValue();
    if (max <= 0) return 0;
    return Math.min(100, (this.value() / max) * 100);
  });

  @Input() set statName(value: string) {
    this.name.set(value);
  }

  @Input() set statAbbreviation(value: string) {
    this.abbreviation.set(value);
  }

  @Input() set statIcon(value: string) {
    this.icon.set(value);
  }

  @Input() set statValue(value: number) {
    this.value.set(value);
  }

  @Input() set statMaxValue(value: number) {
    this.maxValue.set(value);
  }

  @Input() set statColor(value: string) {
    this.color.set(value);
  }

  @Input() set isAnimated(value: boolean) {
    this.animated.set(value);
  }

  @Input() set showStatChange(value: boolean) {
    this.showChange.set(value);
  }

  @Input() set statChange(value: number) {
    this.change.set(value);
  }

  @Input() set isHighlighted(value: boolean) {
    this.highlight.set(value);
  }
}
