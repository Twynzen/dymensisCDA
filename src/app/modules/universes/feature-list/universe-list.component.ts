import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule, AlertController, ActionSheetController } from '@ionic/angular';
import { UniverseStore } from '../data-access/universe.store';
import { AuthService } from '../../../core/services/auth.service';
import { fadeInAnimation } from '../../../shared/animations/stat-animations';
import { Universe } from '../../../core/models';

@Component({
  selector: 'app-universe-list',
  standalone: true,
  imports: [CommonModule, IonicModule],
  animations: [fadeInAnimation],
  template: `
    <ion-header class="qdt-header">
      <ion-toolbar>
        <ion-title>
          <div class="header-title">
            <span class="title-prefix">◈</span>
            <span class="title-text">UNIVERSOS</span>
            <span class="title-count">[{{ universeStore.allUniverses().length }}]</span>
          </div>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="createUniverse()" class="add-btn">
            <ion-icon slot="icon-only" name="add"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="qdt-content">
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (universeStore.loading()) {
        <div class="loading-container">
          <div class="loading-indicator">
            <div class="loading-spinner"></div>
            <span class="loading-text">CARGANDO ARCHIVOS...</span>
          </div>
        </div>
      } @else {
        <!-- User Universes -->
        @if (universeStore.userUniverses().length > 0) {
          <div class="section-header">
            <span class="section-icon">▸</span>
            <span class="section-label">MIS UNIVERSOS</span>
            <span class="section-count">[{{ universeStore.userUniverses().length }}]</span>
          </div>

          <div class="universe-list">
            @for (universe of universeStore.userUniverses(); track universe.id) {
              <div class="universe-card" @fadeIn (click)="viewUniverse(universe)">
                <div class="card-content">
                  <div class="universe-thumb">
                    @if (universe.coverImage) {
                      <img [src]="universe.coverImage" [alt]="universe.name" />
                    } @else {
                      <div class="thumb-placeholder">
                        <ion-icon name="planet-outline"></ion-icon>
                      </div>
                    }
                    <div class="visibility-badge" [class.public]="universe.isPublic">
                      <ion-icon [name]="universe.isPublic ? 'globe-outline' : 'lock-closed-outline'"></ion-icon>
                    </div>
                    <div class="thumb-scanline"></div>
                  </div>

                  <div class="universe-info">
                    <h2 class="universe-name">{{ universe.name }}</h2>
                    <p class="universe-description">{{ universe.description || 'Sin descripción' }}</p>
                    <div class="universe-stats">
                      <span class="stat-item">
                        <span class="stat-label">STATS</span>
                        <span class="stat-value">{{ getStatsCount(universe) }}</span>
                      </span>
                      <span class="stat-divider">|</span>
                      <span class="stat-item">
                        <span class="stat-label">REGLAS</span>
                        <span class="stat-value">{{ universe.progressionRules.length }}</span>
                      </span>
                    </div>
                  </div>

                  <div class="card-actions">
                    <button class="action-btn" (click)="editUniverse(universe); $event.stopPropagation()">
                      <ion-icon name="create-outline"></ion-icon>
                    </button>
                    <button class="action-btn danger" (click)="confirmDelete(universe); $event.stopPropagation()">
                      <ion-icon name="trash-outline"></ion-icon>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Public Universes -->
        @if (publicUniverses().length > 0) {
          <div class="section-header">
            <span class="section-icon">◇</span>
            <span class="section-label">UNIVERSOS PÚBLICOS</span>
            <span class="section-count">[{{ publicUniverses().length }}]</span>
          </div>

          <div class="universe-list">
            @for (universe of publicUniverses(); track universe.id) {
              <div class="universe-card public" @fadeIn (click)="viewUniverse(universe)">
                <div class="card-content">
                  <div class="universe-thumb">
                    @if (universe.coverImage) {
                      <img [src]="universe.coverImage" [alt]="universe.name" />
                    } @else {
                      <div class="thumb-placeholder">
                        <ion-icon name="planet-outline"></ion-icon>
                      </div>
                    }
                    <div class="visibility-badge public">
                      <ion-icon name="globe-outline"></ion-icon>
                    </div>
                    <div class="thumb-scanline"></div>
                  </div>

                  <div class="universe-info">
                    <h2 class="universe-name">{{ universe.name }}</h2>
                    <p class="universe-description">{{ universe.description || 'Sin descripción' }}</p>
                    <div class="universe-stats">
                      <span class="stat-item">
                        <span class="stat-label">STATS</span>
                        <span class="stat-value">{{ getStatsCount(universe) }}</span>
                      </span>
                      <span class="stat-divider">|</span>
                      <span class="stat-item">
                        <span class="stat-label">REGLAS</span>
                        <span class="stat-value">{{ universe.progressionRules.length }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Empty State -->
        @if (universeStore.allUniverses().length === 0 && !universeStore.loading()) {
          <div class="empty-state">
            <div class="empty-icon-container">
              <div class="empty-bracket top-left"></div>
              <div class="empty-bracket top-right"></div>
              <div class="empty-bracket bottom-left"></div>
              <div class="empty-bracket bottom-right"></div>
              <ion-icon name="planet-outline" class="empty-icon"></ion-icon>
            </div>
            <h2 class="empty-title">NO HAY UNIVERSOS</h2>
            <p class="empty-description">Los universos definen las reglas, estadísticas y razas para tus personajes. Crea tu primer universo para comenzar.</p>
            <button class="qdt-button primary" (click)="createUniverse()">
              <ion-icon name="add"></ion-icon>
              <span>CREAR MI PRIMER UNIVERSO</span>
            </button>
            <button class="qdt-button secondary" (click)="loadData()">
              <ion-icon name="refresh"></ion-icon>
              <span>RECARGAR</span>
            </button>
          </div>
        }
      }
    </ion-content>
  `,
  styles: [`
    .qdt-header ion-toolbar {
      --background: var(--qdt-bg-primary);
      --border-color: var(--qdt-border-subtle);
      --color: var(--qdt-text-primary);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--qdt-font-mono);
      font-size: 12px;
      letter-spacing: 0.15em;
    }

    .title-prefix {
      color: var(--qdt-accent-amber);
    }

    .title-text {
      color: var(--qdt-text-primary);
      font-weight: 500;
    }

    .title-count {
      color: var(--qdt-text-subtle);
      font-size: 10px;
    }

    .add-btn {
      --color: var(--qdt-text-muted);
    }

    .qdt-content {
      --background: var(--qdt-bg-primary);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 50vh;
    }

    .loading-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 2px solid var(--qdt-border-subtle);
      border-top-color: var(--qdt-accent-amber);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      letter-spacing: 0.2em;
      color: var(--qdt-text-muted);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Section Header */
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 16px 8px;
      border-bottom: 1px solid var(--qdt-border-subtle);
      margin-bottom: 8px;
    }

    .section-icon {
      color: var(--qdt-accent-amber);
      font-size: 10px;
    }

    .section-label {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-muted);
    }

    .section-count {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      color: var(--qdt-text-subtle);
    }

    /* Universe List */
    .universe-list {
      padding: 8px 16px;
    }

    .universe-card {
      position: relative;
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
      margin-bottom: 12px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .universe-card:hover {
      border-color: var(--qdt-border-default);
      background: var(--qdt-bg-tertiary);
    }

    .card-corner {
      position: absolute;
      width: 10px;
      height: 10px;
      border-color: var(--qdt-text-subtle);
      border-style: solid;
      border-width: 0;
      opacity: 0.4;
    }

    .card-corner.tl { top: 4px; left: 4px; border-top-width: 1px; border-left-width: 1px; }
    .card-corner.tr { top: 4px; right: 4px; border-top-width: 1px; border-right-width: 1px; }
    .card-corner.bl { bottom: 4px; left: 4px; border-bottom-width: 1px; border-left-width: 1px; }
    .card-corner.br { bottom: 4px; right: 4px; border-bottom-width: 1px; border-right-width: 1px; }

    .card-header {
      position: absolute;
      top: 8px;
      right: 80px;
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

    .card-type.public {
      color: var(--qdt-accent-green);
    }

    .card-id {
      color: var(--qdt-text-subtle);
    }

    .card-content {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .universe-thumb {
      position: relative;
      width: 56px;
      height: 56px;
      flex-shrink: 0;
    }

    .universe-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border: 1px solid var(--qdt-border-default);
      filter: grayscale(20%) contrast(1.1);
    }

    .thumb-placeholder {
      width: 100%;
      height: 100%;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-border-default);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .thumb-placeholder ion-icon {
      font-size: 24px;
      color: var(--qdt-text-subtle);
    }

    .thumb-scanline {
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

    .visibility-badge {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-border-default);
    }

    .visibility-badge.public {
      border-color: var(--qdt-accent-green);
    }

    .visibility-badge ion-icon {
      font-size: 10px;
      color: var(--qdt-text-muted);
    }

    .visibility-badge.public ion-icon {
      color: var(--qdt-accent-green);
    }

    .universe-info {
      flex: 1;
      min-width: 0;
    }

    .universe-name {
      font-family: var(--qdt-font-mono);
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.05em;
      color: var(--qdt-text-primary);
      margin: 0 0 4px 0;
      text-transform: uppercase;
    }

    .universe-description {
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      color: var(--qdt-text-muted);
      margin: 0 0 8px 0;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .universe-stats {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--qdt-font-mono);
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stat-label {
      font-size: 8px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-subtle);
    }

    .stat-value {
      font-size: 10px;
      font-weight: 600;
      color: var(--qdt-text-secondary);
    }

    .stat-divider {
      color: var(--qdt-text-subtle);
      font-size: 10px;
    }

    .card-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .action-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--qdt-border-subtle);
      color: var(--qdt-text-muted);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn:hover {
      background: var(--qdt-bg-tertiary);
      border-color: var(--qdt-border-default);
      color: var(--qdt-text-primary);
    }

    .action-btn.danger:hover {
      border-color: var(--qdt-accent-red);
      color: var(--qdt-accent-red);
    }

    .action-btn ion-icon {
      font-size: 14px;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 70vh;
      padding: 20px;
      text-align: center;
    }

    .empty-icon-container {
      position: relative;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }

    .empty-bracket {
      position: absolute;
      width: 20px;
      height: 20px;
      border-color: var(--qdt-text-subtle);
      border-style: solid;
      border-width: 0;
    }

    .empty-bracket.top-left { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
    .empty-bracket.top-right { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
    .empty-bracket.bottom-left { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }
    .empty-bracket.bottom-right { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }

    .empty-icon {
      font-size: 48px;
      color: var(--qdt-text-subtle);
    }

    .empty-title {
      font-family: var(--qdt-font-mono);
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.2em;
      color: var(--qdt-text-primary);
      margin: 0 0 8px 0;
    }

    .empty-description {
      font-family: var(--qdt-font-mono);
      font-size: 11px;
      letter-spacing: 0.05em;
      color: var(--qdt-text-muted);
      margin: 0 0 24px 0;
      max-width: 300px;
      line-height: 1.6;
    }

    .qdt-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      font-family: var(--qdt-font-mono);
      font-size: 11px;
      letter-spacing: 0.1em;
      font-weight: 500;
      border: 1px solid var(--qdt-border-default);
      background: var(--qdt-bg-secondary);
      color: var(--qdt-text-primary);
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 8px;
    }

    .qdt-button:hover {
      background: var(--qdt-bg-tertiary);
      border-color: var(--qdt-text-subtle);
    }

    .qdt-button.primary {
      border-color: var(--qdt-accent-amber);
      color: var(--qdt-accent-amber);
    }

    .qdt-button.primary:hover {
      background: rgba(217, 119, 6, 0.1);
    }

    .qdt-button.secondary {
      opacity: 0.7;
    }

    .qdt-button ion-icon {
      font-size: 14px;
    }
  `]
})
export class UniverseListComponent implements OnInit {
  universeStore = inject(UniverseStore);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertController = inject(AlertController);

  publicUniverses = () => {
    const userId = this.authService.userId();
    return this.universeStore.publicUniverses().filter(u => u.createdBy !== userId);
  };

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    await this.universeStore.loadUniverses();
  }

  async onRefresh(event: any): Promise<void> {
    await this.loadData();
    event.target.complete();
  }

  getStatsCount(universe: Universe): number {
    return Object.keys(universe.statDefinitions).filter(
      key => !universe.statDefinitions[key].isDerived
    ).length;
  }

  viewUniverse(universe: Universe): void {
    this.router.navigate(['/tabs/universes', universe.id]);
  }

  editUniverse(universe: Universe): void {
    this.router.navigate(['/tabs/universes', universe.id, 'edit']);
  }

  createUniverse(): void {
    this.router.navigate(['/tabs/creation']);
  }

  async confirmDelete(universe: Universe): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar Universo',
      message: `¿Estás seguro de eliminar "${universe.name}"? Los personajes que usen este universo podrían verse afectados.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            if (universe.id) {
              this.universeStore.deleteUniverse(universe.id);
            }
          }
        }
      ]
    });

    await alert.present();
  }
}
