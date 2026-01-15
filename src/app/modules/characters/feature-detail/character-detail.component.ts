import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CharacterStore } from '../data-access/character.store';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { StatBarComponent } from '../../../shared/ui/stat-bar/stat-bar.component';
import { StatsRadarComponent } from '../../../shared/ui/radar-chart/stats-radar.component';
import { fadeInAnimation, statChangeAnimation } from '../../../shared/animations/stat-animations';

@Component({
  selector: 'app-character-detail',
  standalone: true,
  imports: [CommonModule, IonicModule, StatBarComponent, StatsRadarComponent],
  animations: [fadeInAnimation, statChangeAnimation],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/characters"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ characterStore.selectedCharacter()?.name || 'Personaje' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="editCharacter()">
            <ion-icon slot="icon-only" name="create"></ion-icon>
          </ion-button>
          <ion-button (click)="shareCharacter()">
            <ion-icon slot="icon-only" name="share"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (characterStore.loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
      } @else if (character()) {
        <div class="character-header" [style.background]="character()!.avatar?.backgroundColor">
          <div class="avatar-container">
            @if (character()!.avatar?.photoUrl) {
              <img [src]="character()!.avatar?.photoUrl" class="avatar" alt="Avatar">
            } @else {
              <div class="avatar-placeholder">
                <ion-icon name="person"></ion-icon>
              </div>
            }
            <div class="awakening-badge" [class]="'rank-' + character()!.progression.awakening">
              {{ character()!.progression.awakening }}
            </div>
          </div>

          <div class="character-info">
            <h1>{{ character()!.name }}</h1>
            <div class="level-section">
              <ion-icon name="star" color="warning"></ion-icon>
              <span>Nivel {{ character()!.progression.level }}</span>
            </div>
            @if (character()!.progression.title) {
              <span class="title">{{ character()!.progression.title }}</span>
            }
          </div>
        </div>

        <ion-segment [(ngModel)]="viewMode" class="view-segment">
          <ion-segment-button value="stats">
            <ion-label>Estadísticas</ion-label>
          </ion-segment-button>
          <ion-segment-button value="radar">
            <ion-label>Radar</ion-label>
          </ion-segment-button>
          <ion-segment-button value="skills">
            <ion-label>Habilidades</ion-label>
          </ion-segment-button>
          <ion-segment-button value="history">
            <ion-label>Historial</ion-label>
          </ion-segment-button>
        </ion-segment>

        @switch (viewMode()) {
          @case ('stats') {
            <div class="stats-section" @fadeIn>
              <div class="total-stats">
                <span class="label">Total de Estadísticas</span>
                <span class="value">{{ characterStore.totalStats() }}</span>
              </div>

              @for (stat of sortedStats(); track stat.key) {
                <app-stat-bar
                  [statName]="getStatName(stat.key)"
                  [statAbbreviation]="getStatAbbreviation(stat.key)"
                  [statIcon]="getStatIcon(stat.key)"
                  [statValue]="stat.value"
                  [statMaxValue]="getStatMax(stat.key)"
                  [statColor]="getStatColor(stat.key)"
                ></app-stat-bar>
              }
            </div>
          }
          @case ('radar') {
            <div class="radar-section" @fadeIn>
              <app-stats-radar
                [stats]="character()!.stats"
                [labels]="statLabels()"
                [maxValue]="200"
                [chartSize]="300"
              ></app-stats-radar>
            </div>
          }
          @case ('skills') {
            <div class="skills-section" @fadeIn>
              @if (characterStore.selectedCharacterSkills().length === 0) {
                <div class="empty-section">
                  <ion-icon name="flash-outline"></ion-icon>
                  <p>Sin habilidades registradas</p>
                  <ion-button fill="outline" (click)="addSkill()">
                    Añadir Habilidad
                  </ion-button>
                </div>
              } @else {
                <ion-list>
                  @for (skill of characterStore.selectedCharacterSkills(); track skill.id) {
                    <ion-item>
                      <ion-icon [name]="skill.icon || 'flash'" slot="start" color="primary"></ion-icon>
                      <ion-label>
                        <h2>{{ skill.name }}</h2>
                        <p>{{ skill.description }}</p>
                      </ion-label>
                      <ion-badge slot="end">Nv. {{ skill.level }}</ion-badge>
                    </ion-item>
                  }
                </ion-list>
                <ion-button expand="block" fill="outline" (click)="addSkill()">
                  <ion-icon slot="start" name="add"></ion-icon>
                  Añadir Habilidad
                </ion-button>
              }
            </div>
          }
          @case ('history') {
            <div class="history-section" @fadeIn>
              @if (characterStore.selectedCharacterHistory().length === 0) {
                <div class="empty-section">
                  <ion-icon name="time-outline"></ion-icon>
                  <p>Sin historial de acciones</p>
                </div>
              } @else {
                <ion-list>
                  @for (entry of characterStore.selectedCharacterHistory(); track entry.id) {
                    <ion-item>
                      <ion-icon name="chevron-forward" slot="start" color="medium"></ion-icon>
                      <ion-label>
                        <h3>{{ entry.action }}</h3>
                        <p>
                          @for (change of entry.appliedChanges; track change.stat) {
                            <span class="change-badge positive">
                              {{ change.stat }}: +{{ change.change }}
                            </span>
                          }
                        </p>
                      </ion-label>
                      <ion-note slot="end">
                        {{ entry.timestamp | date:'short' }}
                      </ion-note>
                    </ion-item>
                  }
                </ion-list>
              }
            </div>
          }
        }

        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button (click)="analyzeAction()">
            <ion-icon name="sparkles"></ion-icon>
          </ion-fab-button>
        </ion-fab>
      }
    </ion-content>
  `,
  styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 50vh;
    }

    .character-header {
      display: flex;
      align-items: center;
      padding: 24px 16px;
      gap: 16px;
    }

    .avatar-container {
      position: relative;
    }

    .avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.3);
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid rgba(255, 255, 255, 0.3);
    }

    .avatar-placeholder ion-icon {
      font-size: 48px;
      opacity: 0.5;
    }

    .awakening-badge {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      background: #333;
      border: 3px solid;
    }

    .rank-E { background: #9E9E9E; border-color: #757575; }
    .rank-D { background: #8BC34A; border-color: #689F38; }
    .rank-C { background: #03A9F4; border-color: #0288D1; }
    .rank-B { background: #9C27B0; border-color: #7B1FA2; }
    .rank-A { background: #FF5722; border-color: #E64A19; }
    .rank-S, .rank-SS, .rank-SSS {
      background: linear-gradient(135deg, #FFD700, #FFA500);
      border-color: #FFD700;
      color: #000;
    }

    .character-info h1 {
      margin: 0 0 8px 0;
      font-size: 26px;
      font-weight: 700;
    }

    .level-section {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 16px;
    }

    .title {
      font-size: 14px;
      opacity: 0.7;
      font-style: italic;
      display: block;
      margin-top: 4px;
    }

    .view-segment {
      margin: 16px;
    }

    .stats-section, .skills-section, .history-section, .radar-section {
      padding: 16px;
    }

    .total-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .total-stats .label {
      font-size: 14px;
      opacity: 0.8;
    }

    .total-stats .value {
      font-size: 24px;
      font-weight: 700;
      color: var(--ion-color-primary);
    }

    .radar-section {
      display: flex;
      justify-content: center;
      padding-top: 20px;
    }

    .empty-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }

    .empty-section ion-icon {
      font-size: 64px;
      opacity: 0.3;
      margin-bottom: 16px;
    }

    .empty-section p {
      opacity: 0.6;
      margin-bottom: 16px;
    }

    .change-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      margin-right: 4px;
    }

    .change-badge.positive {
      background: rgba(76, 175, 80, 0.2);
      color: #4CAF50;
    }

    ion-fab-button {
      --background: linear-gradient(135deg, #667eea, #764ba2);
    }
  `]
})
export class CharacterDetailComponent implements OnInit {
  characterStore = inject(CharacterStore);
  universeStore = inject(UniverseStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastController = inject(ToastController);

  viewMode = signal<'stats' | 'radar' | 'skills' | 'history'>('stats');

  character = computed(() => this.characterStore.selectedCharacter());

  sortedStats = computed(() => {
    const character = this.character();
    if (!character) return [];
    return Object.entries(character.stats)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  });

  statLabels = computed(() => {
    const universe = this.getUniverse();
    if (!universe) return {};
    return Object.entries(universe.statDefinitions).reduce(
      (acc, [key, def]) => {
        acc[key] = def.abbreviation;
        return acc;
      },
      {} as Record<string, string>
    );
  });

  ngOnInit(): void {
    const characterId = this.route.snapshot.paramMap.get('id');
    if (characterId) {
      this.characterStore.selectCharacter(characterId);
    }
  }

  private getUniverse() {
    const character = this.character();
    if (!character) return null;
    return this.universeStore.allUniverses().find(u => u.id === character.universeId);
  }

  getStatName(key: string): string {
    const universe = this.getUniverse();
    return universe?.statDefinitions[key]?.name ?? key;
  }

  getStatAbbreviation(key: string): string {
    const universe = this.getUniverse();
    return universe?.statDefinitions[key]?.abbreviation ?? key.substring(0, 3).toUpperCase();
  }

  getStatIcon(key: string): string {
    const universe = this.getUniverse();
    return universe?.statDefinitions[key]?.icon ?? 'stats-chart';
  }

  getStatMax(key: string): number {
    const universe = this.getUniverse();
    return universe?.statDefinitions[key]?.maxValue ?? 999;
  }

  getStatColor(key: string): string {
    const universe = this.getUniverse();
    return universe?.statDefinitions[key]?.color ?? '#4CAF50';
  }

  editCharacter(): void {
    const character = this.character();
    if (character?.id) {
      this.router.navigate(['/tabs/characters', character.id, 'edit']);
    }
  }

  shareCharacter(): void {
    const character = this.character();
    if (character?.id) {
      this.router.navigate(['/tabs/characters', character.id, 'share']);
    }
  }

  analyzeAction(): void {
    this.router.navigate(['/tabs/ai']);
  }

  async addSkill(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Función de añadir habilidad próximamente',
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
