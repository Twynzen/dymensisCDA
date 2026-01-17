import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Character, StatDefinition } from '../../../core/models';

@Component({
  selector: 'app-character-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-card
      class="character-card"
      [style.--card-bg]="backgroundColor()"
      (click)="onCardClick()"
      button
    >
      <div class="card-content">
        <div class="avatar-section">
          @if (avatarUrl()) {
            <img [src]="avatarUrl()" class="avatar" alt="Avatar">
          } @else {
            <div class="avatar-placeholder">
              <ion-icon name="person-outline"></ion-icon>
            </div>
          }
          <div class="awakening-badge" [class]="'rank-' + awakening()">
            {{ awakening() }}
          </div>
        </div>

        <div class="info-section">
          <h2 class="character-name">{{ characterName() }}</h2>
          <div class="level-info">
            <ion-icon name="star"></ion-icon>
            <span>Nivel {{ level() }}</span>
          </div>

          <div class="stats-preview">
            @for (stat of topStats(); track stat.key) {
              <div class="mini-stat">
                <span class="stat-abbr">{{ stat.abbreviation }}</span>
                <span class="stat-val">{{ stat.value }}</span>
              </div>
            }
          </div>
        </div>

        <ion-button
          fill="clear"
          class="more-btn"
          (click)="onMoreClick($event)"
        >
          <ion-icon slot="icon-only" name="ellipsis-vertical"></ion-icon>
        </ion-button>
      </div>
    </ion-card>
  `,
  styles: [`
    .character-card {
      --background: var(--card-bg, #1a1a2e);
      margin: 8px;
      border-radius: 16px;
      overflow: hidden;
    }

    .card-content {
      display: flex;
      align-items: center;
      padding: 12px;
      gap: 12px;
    }

    .avatar-section {
      position: relative;
      flex-shrink: 0;
    }

    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255, 255, 255, 0.2);
    }

    .avatar-placeholder {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255, 255, 255, 0.2);
    }

    .avatar-placeholder ion-icon {
      font-size: 32px;
      opacity: 0.5;
    }

    .awakening-badge {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      background: #333;
      border: 2px solid var(--card-bg, #1a1a2e);
    }

    .rank-E { background: #9E9E9E; }
    .rank-D { background: #8BC34A; }
    .rank-C { background: #03A9F4; }
    .rank-B { background: #9C27B0; }
    .rank-A { background: #FF5722; }
    .rank-S, .rank-SS, .rank-SSS {
      background: linear-gradient(135deg, #FFD700, #FFA500);
      color: #000;
    }

    .info-section {
      flex: 1;
      min-width: 0;
    }

    .character-name {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .level-info {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      opacity: 0.7;
      margin-bottom: 8px;
    }

    .level-info ion-icon {
      font-size: 14px;
      color: #FFD700;
    }

    .stats-preview {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .mini-stat {
      display: flex;
      align-items: center;
      gap: 2px;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
    }

    .stat-abbr {
      font-weight: 600;
      opacity: 0.7;
    }

    .stat-val {
      font-family: 'Roboto Mono', monospace;
    }

    .more-btn {
      --color: rgba(255, 255, 255, 0.5);
      margin: 0;
    }
  `]
})
export class CharacterCardComponent {
  @Output() cardClick = new EventEmitter<void>();
  @Output() moreClick = new EventEmitter<void>();

  private _character = signal<Character | null>(null);
  private _statDefinitions = signal<Record<string, StatDefinition>>({});

  characterName = computed(() => this._character()?.name ?? '');
  avatarUrl = computed(() => this._character()?.avatar?.photoUrl ?? '');
  backgroundColor = computed(() => this._character()?.avatar?.backgroundColor ?? '#1a1a2e');
  level = computed(() => this._character()?.progression?.level ?? 1);
  awakening = computed(() => this._character()?.progression?.awakening ?? 'E');

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
