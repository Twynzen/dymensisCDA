import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { UniverseStore } from '../data-access/universe.store';
import { Universe, StatDefinition } from '../../../core/models';

@Component({
  selector: 'app-universe-detail',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/universes"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ universe()?.name || 'Universo' }}</ion-title>
        @if (isOwner()) {
          <ion-buttons slot="end">
            <ion-button (click)="editUniverse()" fill="solid" size="small">
              Editar
            </ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Cargando universo...</p>
        </div>
      } @else if (!universe()) {
        <div class="error-container">
          <ion-icon name="alert-circle-outline" color="danger"></ion-icon>
          <h2>Universo no encontrado</h2>
          <p>El universo que buscas no existe o no tienes acceso.</p>
          <ion-button fill="outline" routerLink="/tabs/universes">
            <ion-icon slot="start" name="arrow-back"></ion-icon>
            Volver a Universos
          </ion-button>
        </div>
      } @else {
        <!-- Header Card -->
        <ion-card class="header-card">
          @if (universe()!.coverImage) {
            <div class="header-image">
              <img [src]="universe()!.coverImage" [alt]="universe()!.name" />
            </div>
          } @else {
            <div class="header-gradient" [style.background]="getGradient()">
              <ion-icon name="planet-outline" class="header-icon"></ion-icon>
            </div>
          }
          <ion-card-content>
            <h1>{{ universe()!.name }}</h1>
            <p class="description">{{ universe()!.description || 'Sin descripción' }}</p>
            <div class="badges">
              <ion-chip [color]="universe()!.isPublic ? 'primary' : 'medium'">
                <ion-icon [name]="universe()!.isPublic ? 'globe-outline' : 'lock-closed-outline'"></ion-icon>
                <ion-label>{{ universe()!.isPublic ? 'Público' : 'Privado' }}</ion-label>
              </ion-chip>
              <ion-chip color="tertiary">
                <ion-icon name="stats-chart"></ion-icon>
                <ion-label>{{ statsCount() }} stats</ion-label>
              </ion-chip>
              @if (universe()!.raceSystem?.enabled && universe()!.raceSystem!.races.length > 0) {
                <ion-chip color="success">
                  <ion-icon name="people"></ion-icon>
                  <ion-label>{{ universe()!.raceSystem!.races.length }} razas</ion-label>
                </ion-chip>
              }
              @if (universe()!.awakeningSystem?.enabled === true) {
                <ion-chip color="warning">
                  <ion-icon name="trophy"></ion-icon>
                  <ion-label>{{ universe()!.awakeningSystem!.levels.length }} rangos</ion-label>
                </ion-chip>
              }
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Stats Section -->
        <ion-list-header>
          <ion-label>Estadísticas ({{ statsCount() }})</ion-label>
        </ion-list-header>
        <div class="stats-grid">
          @for (stat of statsList(); track stat.key) {
            <div class="stat-card" [style.borderColor]="stat.color">
              <div class="stat-header" [style.background]="stat.color + '20'">
                <span class="stat-abbr" [style.color]="stat.color">{{ stat.abbreviation }}</span>
              </div>
              <div class="stat-body">
                <h3>{{ stat.name }}</h3>
                <div class="stat-meta">
                  <span>Rango: {{ stat.minValue }} - {{ stat.maxValue }}</span>
                  @if (stat.isDerived) {
                    <ion-badge color="secondary">Derivado</ion-badge>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Progression Rules Section -->
        @if (universe()!.progressionRules.length > 0) {
          <ion-list-header>
            <ion-label>Reglas de Progresión ({{ universe()!.progressionRules.length }})</ion-label>
          </ion-list-header>
          <ion-list>
            @for (rule of universe()!.progressionRules; track rule.id) {
              <ion-item>
                <ion-icon name="trending-up" slot="start" color="success"></ion-icon>
                <ion-label>
                  <h2>{{ rule.description }}</h2>
                  <p>Stats: {{ rule.affectedStats.join(', ') }} (máx +{{ rule.maxChangePerAction }})</p>
                </ion-label>
              </ion-item>
            }
          </ion-list>
        }

        <!-- Race System Section -->
        @if (universe()!.raceSystem?.enabled && universe()!.raceSystem!.races.length > 0) {
          <ion-list-header>
            <ion-label>Razas Disponibles ({{ universe()!.raceSystem!.races.length }})</ion-label>
          </ion-list-header>
          <div class="races-grid">
            @for (race of universe()!.raceSystem!.races; track race.id) {
              <div class="race-card">
                @if (race.image) {
                  <div class="race-image">
                    <img [src]="race.image" [alt]="race.name" />
                  </div>
                } @else {
                  <div class="race-image race-image-placeholder">
                    <ion-icon name="person-outline"></ion-icon>
                  </div>
                }
                <div class="race-info">
                  <h3>{{ race.name }}</h3>
                  <p class="race-description">{{ race.description }}</p>
                  <div class="race-stats">
                    <span class="stat-label">Stats base:</span>
                    <div class="stat-chips">
                      @for (stat of getBaseStatsArray(race.baseStats); track stat.key) {
                        <ion-chip [color]="stat.value > 0 ? 'primary' : 'medium'" class="stat-chip">
                          <ion-label>{{ stat.key }}: {{ stat.value }}</ion-label>
                        </ion-chip>
                      }
                    </div>
                  </div>
                  <div class="race-free-points">
                    <ion-icon name="sparkles"></ion-icon>
                    <span>{{ race.freePoints }} puntos libres</span>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Awakening System Section -->
        @if (universe()!.awakeningSystem?.enabled === true) {
          <ion-list-header>
            <ion-label>Sistema de Rangos</ion-label>
          </ion-list-header>
          <div class="ranks-list">
            @for (level of universe()!.awakeningSystem!.levels; track level; let i = $index) {
              <div class="rank-item">
                <div class="rank-number">{{ i + 1 }}</div>
                <div class="rank-info">
                  <h3>{{ level }}</h3>
                  <p>Umbral: {{ universe()!.awakeningSystem!.thresholds[i] }} puntos totales</p>
                </div>
              </div>
            }
          </div>
        }

        <!-- Action Buttons -->
        <div class="actions">
          <ion-button expand="block" (click)="createCharacter()">
            <ion-icon slot="start" name="person-add"></ion-icon>
            Crear Personaje con este Universo
          </ion-button>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .loading-container, .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      padding: 20px;
      text-align: center;
    }

    .error-container ion-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .error-container h2 {
      margin: 0 0 8px 0;
    }

    .error-container p {
      margin: 0 0 24px 0;
      opacity: 0.7;
    }

    .header-card {
      margin: 16px;
      overflow: hidden;
    }

    .header-image {
      width: 120px;
      height: 120px;
      margin: 20px auto;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .header-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .header-gradient {
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px 8px 0 0;
    }

    .header-icon {
      font-size: 64px;
      color: rgba(255, 255, 255, 0.8);
    }

    .header-card h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
    }

    .description {
      margin: 0 0 16px 0;
      opacity: 0.8;
      line-height: 1.5;
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    ion-list-header {
      margin-top: 24px;
      font-weight: 600;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
      padding: 0 16px;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border-left: 4px solid;
      overflow: hidden;
    }

    .stat-header {
      padding: 8px 12px;
    }

    .stat-abbr {
      font-weight: bold;
      font-size: 18px;
    }

    .stat-body {
      padding: 12px;
    }

    .stat-body h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
    }

    .stat-body p {
      margin: 0 0 8px 0;
      font-size: 13px;
      opacity: 0.7;
    }

    .stat-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      opacity: 0.6;
    }

    .ranks-list {
      padding: 0 16px;
    }

    .rank-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      margin-bottom: 12px;
    }

    .rank-number {
      width: 40px;
      height: 40px;
      background: var(--ion-color-warning);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 18px;
      flex-shrink: 0;
    }

    .rank-info h3 {
      margin: 0 0 4px 0;
      font-size: 18px;
    }

    .rank-info p {
      margin: 0 0 8px 0;
      font-size: 14px;
      opacity: 0.7;
    }

    .rank-requirements {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    /* Races Section */
    .races-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      padding: 0 16px;
    }

    .race-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .race-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .race-image {
      width: 100%;
      height: 160px;
      overflow: hidden;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
    }

    .race-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .race-image-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .race-image-placeholder ion-icon {
      font-size: 64px;
      color: rgba(255, 255, 255, 0.3);
    }

    .race-info {
      padding: 16px;
    }

    .race-info h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .race-description {
      margin: 0 0 12px 0;
      font-size: 14px;
      opacity: 0.7;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .race-stats {
      margin-bottom: 12px;
    }

    .stat-label {
      font-size: 12px;
      opacity: 0.6;
      display: block;
      margin-bottom: 6px;
    }

    .stat-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .stat-chip {
      --padding-start: 8px;
      --padding-end: 8px;
      height: 24px;
      font-size: 11px;
    }

    .race-free-points {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(var(--ion-color-warning-rgb), 0.15);
      border-radius: 8px;
      font-size: 13px;
      color: var(--ion-color-warning);
    }

    .race-free-points ion-icon {
      font-size: 16px;
    }

    .actions {
      padding: 24px 16px 40px;
    }
  `]
})
export class UniverseDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private universeStore = inject(UniverseStore);

  loading = signal(true);
  universeId = signal<string | null>(null);

  universe = computed(() => {
    const id = this.universeId();
    if (!id) return null;
    const found = this.universeStore.allUniverses().find(u => u.id === id) ?? null;

    // Debug logging
    if (found) {
      console.log('[UniverseDetail] Universe loaded:', {
        id: found.id,
        name: found.name,
        hasCoverImage: !!found.coverImage,
        coverImageLength: found.coverImage?.length,
        awakeningSystem: found.awakeningSystem,
        awakeningEnabled: found.awakeningSystem?.enabled,
        raceSystem: found.raceSystem,
        raceSystemEnabled: found.raceSystem?.enabled,
        racesCount: found.raceSystem?.races?.length
      });
    }

    return found;
  });

  isOwner = computed(() => {
    const u = this.universe();
    if (!u) return false;
    return this.universeStore.userUniverses().some(uu => uu.id === u.id);
  });

  statsCount = computed(() => {
    const u = this.universe();
    if (!u) return 0;
    return Object.keys(u.statDefinitions).filter(
      key => !u.statDefinitions[key].isDerived
    ).length;
  });

  statsList = computed(() => {
    const u = this.universe();
    if (!u) return [];
    return Object.entries(u.statDefinitions).map(([key, def]) => ({
      key,
      ...def
    }));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.universeId.set(id);
    this.loadUniverse();
  }

  async loadUniverse(): Promise<void> {
    this.loading.set(true);
    try {
      await this.universeStore.loadUniverses();
    } finally {
      this.loading.set(false);
    }
  }

  getGradient(): string {
    const u = this.universe();
    if (!u) return 'linear-gradient(135deg, #667eea, #764ba2)';

    const colors = Object.values(u.statDefinitions)
      .slice(0, 2)
      .map(d => d.color || '#667eea');

    if (colors.length < 2) {
      return 'linear-gradient(135deg, #667eea, #764ba2)';
    }
    return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
  }

  editUniverse(): void {
    const id = this.universeId();
    if (id) {
      this.router.navigate(['/tabs/universes', id, 'edit']);
    }
  }

  createCharacter(): void {
    this.router.navigate(['/tabs/creation'], {
      queryParams: { universeId: this.universeId() }
    });
  }

  getBaseStatsArray(baseStats: Record<string, number>): { key: string; value: number }[] {
    if (!baseStats) return [];
    return Object.entries(baseStats).map(([key, value]) => ({ key, value }));
  }
}
