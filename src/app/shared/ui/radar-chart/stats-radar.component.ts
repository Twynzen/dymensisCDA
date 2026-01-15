import { Component, Input, OnChanges, ElementRef, ViewChild, AfterViewInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StatPoint {
  key: string;
  label: string;
  value: number;
  normalizedValue: number;
  x: number;
  y: number;
}

@Component({
  selector: 'app-stats-radar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="radar-container" [style.width.px]="size()" [style.height.px]="size()">
      <svg [attr.viewBox]="viewBox()" class="radar-svg">
        <!-- Background grid -->
        @for (level of gridLevels; track level) {
          <polygon
            [attr.points]="getGridPoints(level)"
            class="grid-polygon"
            [style.opacity]="0.1 + level * 0.1"
          />
        }

        <!-- Axis lines -->
        @for (point of statPoints(); track point.key) {
          <line
            [attr.x1]="center()"
            [attr.y1]="center()"
            [attr.x2]="point.x"
            [attr.y2]="point.y"
            class="axis-line"
          />
        }

        <!-- Data polygon -->
        <polygon
          [attr.points]="dataPoints()"
          class="data-polygon"
          [style.fill]="fillColor()"
          [style.stroke]="strokeColor()"
        />

        <!-- Data points -->
        @for (point of statPoints(); track point.key) {
          <circle
            [attr.cx]="getDataPointX(point)"
            [attr.cy]="getDataPointY(point)"
            r="4"
            class="data-point"
            [style.fill]="strokeColor()"
          />
        }

        <!-- Labels -->
        @for (point of statPoints(); track point.key) {
          <text
            [attr.x]="getLabelX(point)"
            [attr.y]="getLabelY(point)"
            class="stat-label"
            [attr.text-anchor]="getTextAnchor(point)"
          >
            {{ point.label }}
          </text>
          <text
            [attr.x]="getLabelX(point)"
            [attr.y]="getLabelY(point) + 14"
            class="stat-value"
            [attr.text-anchor]="getTextAnchor(point)"
          >
            {{ point.value }}
          </text>
        }
      </svg>
    </div>
  `,
  styles: [`
    .radar-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .radar-svg {
      width: 100%;
      height: 100%;
    }

    .grid-polygon {
      fill: none;
      stroke: rgba(255, 255, 255, 0.3);
      stroke-width: 1;
    }

    .axis-line {
      stroke: rgba(255, 255, 255, 0.2);
      stroke-width: 1;
    }

    .data-polygon {
      fill-opacity: 0.3;
      stroke-width: 2;
      transition: all 0.3s ease;
    }

    .data-point {
      stroke: #fff;
      stroke-width: 2;
      transition: all 0.3s ease;
    }

    .stat-label {
      fill: rgba(255, 255, 255, 0.9);
      font-size: 12px;
      font-weight: 600;
    }

    .stat-value {
      fill: rgba(255, 255, 255, 0.7);
      font-size: 11px;
      font-family: 'Roboto Mono', monospace;
    }
  `]
})
export class StatsRadarComponent implements OnChanges {
  @Input() stats: Record<string, number> = {};
  @Input() labels: Record<string, string> = {};
  @Input() maxValue: number = 100;
  @Input() chartSize: number = 300;
  @Input() chartFillColor: string = '#4CAF50';
  @Input() chartStrokeColor: string = '#81C784';

  size = signal(300);
  fillColor = signal('#4CAF50');
  strokeColor = signal('#81C784');
  max = signal(100);

  gridLevels = [0.25, 0.5, 0.75, 1];

  center = computed(() => this.size() / 2);
  radius = computed(() => (this.size() / 2) * 0.7);
  viewBox = computed(() => `0 0 ${this.size()} ${this.size()}`);

  statPoints = signal<StatPoint[]>([]);

  ngOnChanges(): void {
    this.size.set(this.chartSize);
    this.fillColor.set(this.chartFillColor);
    this.strokeColor.set(this.chartStrokeColor);
    this.max.set(this.maxValue);
    this.calculatePoints();
  }

  private calculatePoints(): void {
    const entries = Object.entries(this.stats);
    const count = entries.length;
    if (count === 0) {
      this.statPoints.set([]);
      return;
    }

    const angleStep = (2 * Math.PI) / count;
    const startAngle = -Math.PI / 2; // Start from top

    const points: StatPoint[] = entries.map(([key, value], index) => {
      const angle = startAngle + index * angleStep;
      const normalizedValue = Math.min(1, value / this.max());

      return {
        key,
        label: this.labels[key] || key.toUpperCase(),
        value,
        normalizedValue,
        x: this.center() + this.radius() * Math.cos(angle),
        y: this.center() + this.radius() * Math.sin(angle)
      };
    });

    this.statPoints.set(points);
  }

  getGridPoints(level: number): string {
    const points = this.statPoints();
    if (points.length === 0) return '';

    const count = points.length;
    const angleStep = (2 * Math.PI) / count;
    const startAngle = -Math.PI / 2;
    const r = this.radius() * level;

    return Array.from({ length: count })
      .map((_, i) => {
        const angle = startAngle + i * angleStep;
        const x = this.center() + r * Math.cos(angle);
        const y = this.center() + r * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');
  }

  dataPoints = computed(() => {
    const points = this.statPoints();
    if (points.length === 0) return '';

    return points
      .map((point) => {
        const x = this.getDataPointX(point);
        const y = this.getDataPointY(point);
        return `${x},${y}`;
      })
      .join(' ');
  });

  getDataPointX(point: StatPoint): number {
    const angle = this.getAngle(point);
    return this.center() + this.radius() * point.normalizedValue * Math.cos(angle);
  }

  getDataPointY(point: StatPoint): number {
    const angle = this.getAngle(point);
    return this.center() + this.radius() * point.normalizedValue * Math.sin(angle);
  }

  getLabelX(point: StatPoint): number {
    const angle = this.getAngle(point);
    const offset = 20;
    return this.center() + (this.radius() + offset) * Math.cos(angle);
  }

  getLabelY(point: StatPoint): number {
    const angle = this.getAngle(point);
    const offset = 20;
    return this.center() + (this.radius() + offset) * Math.sin(angle);
  }

  getTextAnchor(point: StatPoint): string {
    const angle = this.getAngle(point);
    const cos = Math.cos(angle);
    if (cos > 0.3) return 'start';
    if (cos < -0.3) return 'end';
    return 'middle';
  }

  private getAngle(point: StatPoint): number {
    const points = this.statPoints();
    const index = points.findIndex((p) => p.key === point.key);
    const count = points.length;
    const angleStep = (2 * Math.PI) / count;
    return -Math.PI / 2 + index * angleStep;
  }
}
