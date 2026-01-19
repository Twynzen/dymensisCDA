import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Character, StatDefinition } from '../../../core/models';

@Component({
  selector: 'app-character-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="character-card" (click)="onCardClick()">
      <div class="card-content">
        <div class="avatar-section">
          @if (_character()?.avatar?.photoUrl) {
            <img [src]="_character()?.avatar?.photoUrl" class="avatar" alt="Avatar">
          } @else {
            <div class="avatar-placeholder">
              <ion-icon name="person-outline"></ion-icon>
            </div>
          }
          <div class="awakening-badge" [class]="'rank-' + awakening()">
            {{ awakening() }}
          </div>
          <div class="avatar-scanline"></div>
        </div>

        <div class="info-section">
          <div class="name-row">
            <h2 class="character-name">{{ characterName() }}</h2>
            <div class="status-dot"></div>
          </div>

          <div class="level-info">
            <span class="level-label">LVL</span>
            <span class="level-value">{{ level() }}</span>
          </div>

          <div class="stats-preview">
            @for (stat of topStats(); track stat.key) {
              <div class="mini-stat">
                <span class="stat-abbr">{{ stat.abbreviation }}</span>
                <span class="stat-val">{{ stat.value }}</span>
              </div>
            }
          </div>

          <div class="card-timestamp">
            {{ timestamp() }}
          </div>
        </div>

        <button
          class="more-btn"
          (click)="onMoreClick($event)"
        >
          <ion-icon name="ellipsis-vertical"></ion-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .character-card {
      position: relative;
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
      margin: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .character-card:hover {
      border-color: var(--qdt-border-default);
      background: var(--qdt-bg-tertiary);
    }

    .character-card:active {
      transform: scale(0.98);
    }

    /* Corner brackets */
    .corner-bracket {
      position: absolute;
      width: 12px;
      height: 12px;
      border-color: var(--qdt-text-subtle);
      border-style: solid;
      border-width: 0;
      opacity: 0.5;
    }

    .corner-bracket.top-left {
      top: 4px;
      left: 4px;
      border-top-width: 1px;
      border-left-width: 1px;
    }

    .corner-bracket.top-right {
      top: 4px;
      right: 4px;
      border-top-width: 1px;
      border-right-width: 1px;
    }

    .corner-bracket.bottom-left {
      bottom: 4px;
      left: 4px;
      border-bottom-width: 1px;
      border-left-width: 1px;
    }

    .corner-bracket.bottom-right {
      bottom: 4px;
      right: 4px;
      border-bottom-width: 1px;
      border-right-width: 1px;
    }

    /* Header badge */
    .card-header-badge {
      position: absolute;
      top: 8px;
      right: 40px;
      display: flex;
      gap: 6px;
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      letter-spacing: 0.1em;
    }

    .card-type {
      color: var(--qdt-accent-amber);
      font-weight: 600;
    }

    .card-id {
      color: var(--qdt-text-subtle);
    }

    .card-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar-section {
      position: relative;
      flex-shrink: 0;
    }

    .avatar {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border: 1px solid var(--qdt-border-default);
      filter: grayscale(20%) contrast(1.1);
    }

    .avatar-placeholder {
      width: 64px;
      height: 64px;
      background: var(--qdt-bg-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--qdt-border-default);
    }

    .avatar-placeholder ion-icon {
      font-size: 28px;
      color: var(--qdt-text-subtle);
    }

    .avatar-scanline {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, 0.1) 2px,
        rgba(0, 0, 0, 0.1) 4px
      );
      pointer-events: none;
    }

    .awakening-badge {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      font-weight: 700;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-border-default);
      letter-spacing: 0;
    }

    .rank-E { background: #52525b; color: #a1a1aa; }
    .rank-D { background: #365314; color: #84cc16; }
    .rank-C { background: #164e63; color: #22d3ee; }
    .rank-B { background: #581c87; color: #a855f7; }
    .rank-A { background: #7c2d12; color: #fb923c; }
    .rank-S, .rank-SS, .rank-SSS {
      background: #78350f;
      color: #fbbf24;
    }

    .info-section {
      flex: 1;
      min-width: 0;
    }

    .name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .character-name {
      font-family: var(--qdt-font-mono);
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.05em;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--qdt-text-primary);
      text-transform: uppercase;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      background: var(--qdt-accent-green);
      border-radius: 50%;
      flex-shrink: 0;
      animation: qdt-pulse 2s ease-in-out infinite;
    }

    .level-info {
      display: flex;
      align-items: center;
      gap: 4px;
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      margin-bottom: 8px;
    }

    .level-label {
      color: var(--qdt-text-subtle);
      letter-spacing: 0.1em;
    }

    .level-value {
      color: var(--qdt-text-secondary);
      font-weight: 600;
    }

    .stats-preview {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .mini-stat {
      display: flex;
      align-items: center;
      gap: 3px;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-border-subtle);
      padding: 2px 6px;
      font-family: var(--qdt-font-mono);
      font-size: 9px;
    }

    .stat-abbr {
      color: var(--qdt-text-subtle);
      letter-spacing: 0.05em;
    }

    .stat-val {
      color: var(--qdt-text-secondary);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }

    .card-timestamp {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      color: var(--qdt-text-subtle);
      letter-spacing: 0.05em;
    }

    .more-btn {
      background: transparent;
      border: 1px solid var(--qdt-border-subtle);
      padding: 8px;
      cursor: pointer;
      color: var(--qdt-text-muted);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .more-btn:hover {
      background: var(--qdt-bg-tertiary);
      border-color: var(--qdt-border-default);
      color: var(--qdt-text-primary);
    }

    .more-btn ion-icon {
      font-size: 18px;
    }

    @keyframes qdt-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `]
})
export class CharacterCardComponent {
  @Output() cardClick = new EventEmitter<void>();
  @Output() moreClick = new EventEmitter<void>();

  _character = signal<Character | null>(null);
  private _statDefinitions = signal<Record<string, StatDefinition>>({});

  characterName = computed(() => this._character()?.name ?? '');
  avatarUrl = computed(() => {
    const char = this._character();
    if (!char) return '';
    // Support both new format (avatar.photoUrl) and legacy formats (avatarUrl, imageUrl)
    return char.avatar?.photoUrl
      || (char as any).avatarUrl
      || (char as any).imageUrl
      || '';
  });
  level = computed(() => this._character()?.progression?.level ?? 1);
  awakening = computed(() => this._character()?.progression?.awakening ?? 'E');

  characterId = computed(() => {
    const id = this._character()?.id ?? '';
    return id.slice(0, 6).toUpperCase();
  });

  timestamp = computed(() => {
    const char = this._character();
    if (!char?.createdAt) return 'NO DATA';
    try {
      // Handle Firestore Timestamp, Date, or string
      let date: Date;
      if (char.createdAt instanceof Date) {
        date = char.createdAt;
      } else if ((char.createdAt as any)?.toDate) {
        // Firestore Timestamp
        date = (char.createdAt as any).toDate();
      } else {
        date = new Date(char.createdAt as any);
      }
      if (isNaN(date.getTime())) return 'NO DATA';
      return date.toISOString().slice(0, 10).replace(/-/g, '.');
    } catch {
      return 'NO DATA';
    }
  });

  topStats = computed(() => {
    const character = this._character();
    const definitions = this._statDefinitions();
    if (!character) return [];

    return Object.entries(character.stats)
      .map(([key, value]) => ({
        key,
        value,
        abbreviation: definitions[key]?.abbreviation ?? key.substring(0, 3).toUpperCase()
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  });

  @Input() set character(value: Character | null) {
    this._character.set(value);
  }

  @Input() set statDefinitions(value: Record<string, StatDefinition>) {
    this._statDefinitions.set(value);
  }

  onCardClick(): void {
    this.cardClick.emit();
  }

  onMoreClick(event: Event): void {
    event.stopPropagation();
    this.moreClick.emit();
  }
}
