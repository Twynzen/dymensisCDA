import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CharacterStore } from '../data-access/character.store';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { StatBarComponent } from '../../../shared/ui/stat-bar/stat-bar.component';
import { StatsRadarComponent } from '../../../shared/ui/radar-chart/stats-radar.component';
import { SkillEditorModalComponent } from '../ui/skill-editor-modal.component';
import { fadeInAnimation, statChangeAnimation } from '../../../shared/animations/stat-animations';
import { CharacterSkill } from '../../../core/models';
import { SkillIconComponent, SkillIconName } from '../../../shared/ui/skill-icon/skill-icon.component';

@Component({
  selector: 'app-character-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, StatBarComponent, StatsRadarComponent, SkillIconComponent],
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
                <ion-icon name="person-outline"></ion-icon>
              </div>
            }
            <!-- Only show awakening badge if universe has awakening enabled -->
            @if (universeHasAwakening()) {
              <div class="awakening-badge" [class]="'rank-' + character()!.progression.awakening">
                {{ character()!.progression.awakening }}
              </div>
            }
          </div>

          <div class="character-info">
            <h1>{{ character()!.name }}</h1>
            <!-- Only show level if universe has awakening enabled -->
            @if (universeHasAwakening()) {
              <div class="level-section">
                <ion-icon name="star" color="warning"></ion-icon>
                <span>Nivel {{ character()!.progression.level }}</span>
              </div>
            }
            @if (character()!.progression.title) {
              <span class="title">{{ character()!.progression.title }}</span>
            }
          </div>
        </div>

        <!-- Character Description (not shown in shareable card) -->
        @if (character()!.description) {
          <div class="description-section">
            <p>{{ character()!.description }}</p>
          </div>
        }

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
                @for (skill of characterStore.selectedCharacterSkills(); track skill.id) {
                  <div class="skill-card" (click)="viewSkill(skill)">
                    <div class="skill-header">
                      <div class="skill-icon">
                        <app-skill-icon [icon]="$any(skill.icon) || 'sparkle'" [size]="32"></app-skill-icon>
                      </div>
                      <div class="skill-titles">
                        <h3>{{ skill.name }}</h3>
                        @if (skill.subtitle) {
                          <span class="skill-subtitle">"{{ skill.subtitle }}"</span>
                        }
                      </div>
                      <ion-badge [color]="getCategoryColor(skill.category)">
                        {{ skill.category }}
                      </ion-badge>
                    </div>

                    @if (skill.quote) {
                      <p class="skill-quote">"{{ skill.quote }}"</p>
                    }

                    <p class="skill-description">
                      {{ skill.description.length > 150 ? (skill.description | slice:0:150) + '...' : skill.description }}
                    </p>

                    @if (skill.effects && skill.effects.length > 0) {
                      <div class="skill-effects">
                        @for (effect of skill.effects.slice(0, 2); track $index) {
                          @if (effect.description) {
                            <span class="effect-badge">
                              <ion-icon name="checkmark-circle"></ion-icon>
                              {{ effect.description.length > 50 ? (effect.description | slice:0:50) + '...' : effect.description }}
                            </span>
                          }
                        }
                        @if (skill.effects.length > 2) {
                          <span class="more-effects">+{{ skill.effects.length - 2 }} más</span>
                        }
                      </div>
                    }

                    @if (skill.limitations && skill.limitations.length > 0) {
                      <div class="skill-limitations">
                        <ion-icon name="warning" color="warning"></ion-icon>
                        <span>{{ skill.limitations.length }} limitación{{ skill.limitations.length > 1 ? 'es' : '' }}</span>
                      </div>
                    }
                  </div>
                }

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
                            <span class="change-badge" [class.positive]="change.change > 0" [class.negative]="change.change < 0">
                              {{ change.stat }}: {{ change.change > 0 ? '+' : '' }}{{ change.change }}
                            </span>
                          }
                        </p>
                        @if (entry.appliedChanges[0]?.reason) {
                          <p class="change-reason">{{ entry.appliedChanges[0].reason }}</p>
                        }
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
            <ion-icon name="sparkles-outline"></ion-icon>
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

    .description-section {
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .description-section p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      opacity: 0.85;
      font-style: italic;
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

    /* Skill Cards */
    .skill-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: transform 0.2s, background 0.2s;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .skill-card:hover {
      transform: translateY(-2px);
      background: rgba(255, 255, 255, 0.08);
    }

    .skill-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 8px;
    }

    .skill-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      color: var(--ion-color-primary);
      flex-shrink: 0;
    }

    .skill-titles {
      flex: 1;
    }

    .skill-titles h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .skill-subtitle {
      font-size: 12px;
      opacity: 0.6;
      font-style: italic;
      display: block;
      margin-top: 2px;
    }

    .skill-quote {
      font-size: 13px;
      font-style: italic;
      opacity: 0.7;
      margin: 8px 0;
      padding-left: 12px;
      border-left: 2px solid var(--ion-color-primary);
    }

    .skill-description {
      font-size: 14px;
      opacity: 0.8;
      margin: 8px 0;
      line-height: 1.4;
    }

    .skill-effects {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .effect-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 4px 8px;
      background: rgba(var(--ion-color-success-rgb), 0.2);
      color: var(--ion-color-success);
      border-radius: 4px;
    }

    .effect-badge ion-icon {
      font-size: 12px;
    }

    .more-effects {
      font-size: 11px;
      opacity: 0.5;
      padding: 4px 8px;
    }

    .skill-limitations {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      font-size: 12px;
      opacity: 0.7;
    }

    .skill-limitations ion-icon {
      font-size: 14px;
    }

    /* History */
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

    .change-badge.negative {
      background: rgba(244, 67, 54, 0.2);
      color: #F44336;
    }

    .change-reason {
      font-size: 12px;
      font-style: italic;
      opacity: 0.6;
      margin-top: 4px;
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
  private modalController = inject(ModalController);
  private toastController = inject(ToastController);

  viewMode = signal<'stats' | 'radar' | 'skills' | 'history'>('stats');

  character = computed(() => this.characterStore.selectedCharacter());

  universeHasAwakening = computed(() => {
    const character = this.character();
    if (!character) return false;
    const universe = this.universeStore.allUniverses().find(u => u.id === character.universeId);
    return universe?.awakeningSystem?.enabled === true;
  });

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

    // Load universes if needed
    if (this.universeStore.allUniverses().length === 0) {
      this.universeStore.loadUniverses();
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

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Pasiva': 'medium',
      'Activa': 'primary',
      'Equipo': 'tertiary',
      'Magia': 'secondary',
      'Combate': 'danger',
      'Soporte': 'success',
      'Especial': 'warning'
    };
    return colors[category] || 'medium';
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
    console.log('[CharacterDetail] addSkill: Opening modal');
    const modal = await this.modalController.create({
      component: SkillEditorModalComponent
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    console.log('[CharacterDetail] addSkill: Modal dismissed with role:', role, 'data:', data?.name);

    if (role === 'save' && data) {
      const character = this.character();
      console.log('[CharacterDetail] addSkill: Character id:', character?.id);
      if (character?.id) {
        try {
          console.log('[CharacterDetail] addSkill: Calling store.addSkill...');
          await this.characterStore.addSkill(character.id, {
            ...data,
            level: 1,
            acquiredAt: new Date()
          } as CharacterSkill);
          console.log('[CharacterDetail] addSkill: Store updated. Skills count:', this.characterStore.selectedCharacterSkills().length);

          const toast = await this.toastController.create({
            message: 'Habilidad añadida',
            duration: 2000,
            color: 'success',
            position: 'bottom'
          });
          await toast.present();
        } catch (error) {
          console.error('[CharacterDetail] addSkill: Error:', error);
          const toast = await this.toastController.create({
            message: 'Error al añadir habilidad',
            duration: 2000,
            color: 'danger',
            position: 'bottom'
          });
          await toast.present();
        }
      }
    } else {
      console.log('[CharacterDetail] addSkill: Modal dismissed without saving');
    }
  }

  async viewSkill(skill: CharacterSkill): Promise<void> {
    const modal = await this.modalController.create({
      component: SkillEditorModalComponent,
      componentProps: {
        skill,
        isEditing: true
      }
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();

    const character = this.character();

    if (role === 'save' && data) {
      if (character?.id && skill.id) {
        try {
          await this.characterStore.updateSkill(character.id, skill.id, data);

          const toast = await this.toastController.create({
            message: 'Habilidad actualizada',
            duration: 2000,
            color: 'success',
            position: 'bottom'
          });
          await toast.present();
        } catch (error) {
          const toast = await this.toastController.create({
            message: 'Error al actualizar habilidad',
            duration: 2000,
            color: 'danger',
            position: 'bottom'
          });
          await toast.present();
        }
      }
    } else if (role === 'delete' && data?.skillId) {
      if (character?.id) {
        try {
          await this.characterStore.deleteSkill(character.id, data.skillId);

          const toast = await this.toastController.create({
            message: 'Habilidad eliminada',
            duration: 2000,
            color: 'success',
            position: 'bottom'
          });
          await toast.present();
        } catch (error) {
          const toast = await this.toastController.create({
            message: 'Error al eliminar habilidad',
            duration: 2000,
            color: 'danger',
            position: 'bottom'
          });
          await toast.present();
        }
      }
    }
  }
}
