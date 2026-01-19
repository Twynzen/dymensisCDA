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
            <span class="stat-abbr">[{{ abbreviation() }}]</span>
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
      margin-bottom: 16px;
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .stat-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-info ion-icon {
      font-size: 16px;
      color: var(--qdt-text-muted);
    }

    .stat-name {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.1em;
      color: var(--qdt-text-secondary);
      text-transform: uppercase;
    }

    .stat-abbr {
      font-size: 9px;
      letter-spacing: 0.05em;
      color: var(--qdt-text-subtle);
    }

    .stat-value {
      font-family: var(--qdt-font-mono);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      transition: all 0.3s ease;
    }

    .stat-value.highlight {
      transform: scale(1.1);
      color: var(--qdt-text-primary);
      text-shadow: 0 0 8px var(--qdt-border-focus);
    }

    .stat-value .current {
      color: var(--qdt-text-primary);
      font-weight: 500;
    }

    .stat-value .separator,
    .stat-value .max {
      color: var(--qdt-text-subtle);
    }

    .bar-container {
      position: relative;
      height: 6px;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-border-subtle);
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      transition: width 0.3s ease;
      opacity: 0.8;
    }

    .bar-fill.animated {
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .change-indicator {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.05em;
      padding: 1px 4px;
      animation: fadeInOut 2s ease-in-out;
    }

    .change-indicator.positive {
      background: rgba(22, 163, 74, 0.3);
      color: var(--qdt-accent-green);
    }

    .change-indicator.negative {
      background: rgba(220, 38, 38, 0.3);
      color: var(--qdt-accent-red);
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
  color = signal('#71717a');
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
