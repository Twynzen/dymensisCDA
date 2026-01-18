import { Component, Input, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';
import html2canvas from 'html2canvas';
import { Character, StatDefinition } from '../../../core/models';

@Component({
  selector: 'app-printable-card',
  standalone: true,
  imports: [CommonModule, QRCodeComponent],
  template: `
    <div
      #cardElement
      class="character-card"
      [style.background]="backgroundColor()"
    >
      <div class="card-header">
        @if (avatarUrl()) {
          <img [src]="avatarUrl()" class="avatar" alt="Avatar">
        } @else {
          <div class="avatar-placeholder">
            <span>{{ initials() }}</span>
          </div>
        }
        <div class="info">
          <h1 class="name">{{ characterName() }}</h1>
          @if (showLevelDisplay()) {
            <div class="meta">
              <span class="level">Nivel {{ level() }}</span>
              <span class="awakening" [class]="'rank-' + awakening()">
                Rango {{ awakening() }}
              </span>
            </div>
          }
          @if (title()) {
            <span class="title">{{ title() }}</span>
          }
        </div>
      </div>

      <div class="stats-grid">
        @for (stat of mainStats(); track stat.key) {
          <div class="stat-item">
            <div class="stat-header">
              <span class="stat-name">{{ stat.name }}</span>
              <span class="stat-value">{{ stat.value }}</span>
            </div>
            <div class="stat-bar">
              <div
                class="stat-fill"
                [style.width.%]="(stat.value / maxStatValue()) * 100"
                [style.background]="stat.color"
              ></div>
            </div>
          </div>
        }
      </div>

      <div class="qr-section">
        <qrcode
          [qrdata]="shareUrl()"
          [width]="80"
          [errorCorrectionLevel]="'M'"
          [colorDark]="'#ffffff'"
          [colorLight]="'transparent'"
        ></qrcode>
        <span class="scan-text">Escanea para ver</span>
      </div>

      <div class="footer">
        <span class="universe">{{ universeName() }}</span>
        <span class="date">{{ generatedDate | date:'shortDate' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .character-card {
      width: 350px;
      padding: 20px;
      border-radius: 16px;
      color: white;
      font-family: 'Roboto', sans-serif;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }

    .card-header {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }

    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 3px solid gold;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 3px solid gold;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 700;
    }

    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .name {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 6px 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .meta {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 4px;
    }

    .level {
      font-size: 14px;
      opacity: 0.8;
    }

    .awakening {
      font-size: 12px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .rank-E { background: #9E9E9E; }
    .rank-D { background: #8BC34A; }
    .rank-C { background: #03A9F4; }
    .rank-B { background: #9C27B0; }
    .rank-A { background: #FF5722; }
    .rank-S, .rank-SS, .rank-SSS {
      background: linear-gradient(45deg, gold, orange);
      color: #000;
    }

    .title {
      font-size: 12px;
      font-style: italic;
      opacity: 0.7;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }

    .stat-item {
      background: rgba(0, 0, 0, 0.2);
      padding: 8px 10px;
      border-radius: 8px;
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .stat-name {
      font-size: 12px;
      opacity: 0.8;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 600;
      font-family: 'Roboto Mono', monospace;
    }

    .stat-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      overflow: hidden;
    }

    .stat-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .qr-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 10px;
    }

    .scan-text {
      font-size: 10px;
      opacity: 0.6;
      margin-top: 4px;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      opacity: 0.5;
    }
  `]
})
export class PrintableCardComponent {
  @ViewChild('cardElement') cardElement!: ElementRef;

  generatedDate = new Date();

  private _character = signal<Character | null>(null);
  private _statDefinitions = signal<Record<string, StatDefinition>>({});
  private _universeName = signal('');
  private _shareUrl = signal('');
  private _maxStatValue = signal(200);
  private _showLevel = signal(true);

  characterName = computed(() => this._character()?.name ?? '');
  avatarUrl = computed(() => this._character()?.avatar?.photoUrl ?? '');
  backgroundColor = computed(() => this._character()?.avatar?.backgroundColor ?? '#1a1a2e');
  level = computed(() => this._character()?.progression?.level ?? 1);
  awakening = computed(() => this._character()?.progression?.awakening ?? 'E');
  title = computed(() => this._character()?.progression?.title ?? '');
  universeName = computed(() => this._universeName());
  shareUrl = computed(() => this._shareUrl());
  maxStatValue = computed(() => this._maxStatValue());
  showLevelDisplay = computed(() => this._showLevel());

  initials = computed(() => {
    const name = this.characterName();
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  });

  mainStats = computed(() => {
    const character = this._character();
    const definitions = this._statDefinitions();
    if (!character) return [];

    return Object.entries(character.stats)
      .filter(([key]) => {
        const def = definitions[key];
        return !def?.isDerived;
      })
      .map(([key, value]) => {
        const def = definitions[key];
        return {
          key,
          name: def?.name ?? key,
          value,
          color: def?.color ?? '#4CAF50'
        };
      })
      .sort((a, b) => b.value - a.value);
  });

  @Input() set character(value: Character | null) {
    this._character.set(value);
  }

  @Input() set statDefinitions(value: Record<string, StatDefinition>) {
    this._statDefinitions.set(value);
  }

  @Input() set cardUniverseName(value: string) {
    this._universeName.set(value);
  }

  @Input() set cardShareUrl(value: string) {
    this._shareUrl.set(value);
  }

  @Input() set cardMaxStatValue(value: number) {
    this._maxStatValue.set(value);
  }

  @Input() set showLevel(value: boolean) {
    this._showLevel.set(value);
  }

  async captureAsImage(): Promise<string> {
    const canvas = await html2canvas(this.cardElement.nativeElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false
    });
    return canvas.toDataURL('image/png');
  }
}
