import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * QDT HUD Component
 * Displays VHS surveillance-style HUD with:
 * - REC indicator
 * - Camera ID
 * - Timestamp
 * - Sector info
 * - Status indicators
 */
@Component({
  selector: 'app-qdt-hud',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="qdt-hud">
      <div class="qdt-hud-left">
        <div class="date">{{ formattedDate() }}</div>
        <div class="time">{{ formattedTime() }}</div>
      </div>

      <div class="qdt-hud-right">
        <div class="sector">{{ sector() }}</div>
      </div>
    </div>
  `,
  styles: [`
    .qdt-hud {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 12px 16px;
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-muted);
    }

    .qdt-hud-left,
    .qdt-hud-right {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .qdt-hud-right {
      text-align: right;
      align-items: flex-end;
    }

    .rec-line {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .rec-dot {
      width: 8px;
      height: 8px;
      background: var(--qdt-accent-red);
      border-radius: 50%;
      animation: qdt-pulse 1s ease-in-out infinite;
    }

    .rec-text {
      color: var(--qdt-accent-red);
      font-weight: 700;
    }

    .separator {
      color: var(--qdt-text-subtle);
    }

    .cam-id {
      color: var(--qdt-text-muted);
    }

    .date {
      color: var(--qdt-text-subtle);
    }

    .time {
      color: var(--qdt-text-secondary);
      font-variant-numeric: tabular-nums;
    }

    .sector {
      color: var(--qdt-text-subtle);
    }

    .mode {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--qdt-text-muted);
    }

    .mode-icon {
      font-size: 8px;
    }

    .restricted {
      color: var(--qdt-accent-amber);
      font-weight: 500;
      font-size: 9px;
    }
  `]
})
export class QdtHudComponent implements OnInit, OnDestroy {
  @Input() camera: string = 'CAM-01';
  @Input() sectorName: string = 'SECTOR A';
  @Input() modeName: string = 'ARCHIVE MODE';
  @Input() isRestricted: boolean = false;
  @Input() recording: boolean = true;

  private time = signal(new Date());
  private timerInterval: any;

  cameraId = computed(() => this.camera);
  sector = computed(() => this.sectorName);
  mode = computed(() => this.modeName);
  restricted = computed(() => this.isRestricted);
  isRecording = computed(() => this.recording);

  formattedDate = computed(() => {
    const d = this.time();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  });

  formattedTime = computed(() => {
    const d = this.time();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0').slice(0, 2);
    return `${hours}:${minutes}:${seconds}:${ms}`;
  });

  ngOnInit(): void {
    this.timerInterval = setInterval(() => {
      this.time.set(new Date());
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
