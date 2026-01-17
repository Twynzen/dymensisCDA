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
    <ion-header>
      <ion-toolbar>
        <ion-title>Universos</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="createUniverse()">
            <ion-icon slot="icon-only" name="add"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (universeStore.loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Cargando universos...</p>
        </div>
      } @else {
        <!-- User Universes -->
        @if (universeStore.userUniverses().length > 0) {
          <ion-list-header>
            <ion-label>Mis Universos</ion-label>
          </ion-list-header>

          <ion-list>
            @for (universe of universeStore.userUniverses(); track universe.id) {
              <ion-item-sliding @fadeIn>
                <ion-item (click)="viewUniverse(universe)" button class="universe-item">
                  <div class="universe-thumb" slot="start">
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
                  </div>
                  <ion-label>
                    <h2>{{ universe.name }}</h2>
                    <p>{{ universe.description }}</p>
                    <p class="stats-count">
                      {{ getStatsCount(universe) }} stats
                      <ion-icon name="ellipse" class="dot"></ion-icon>
                      {{ universe.progressionRules.length }} reglas
                    </p>
                  </ion-label>
                </ion-item>
                <ion-item-options side="end">
                  <ion-item-option (click)="editUniverse(universe)">
                    <ion-icon slot="icon-only" name="create"></ion-icon>
                  </ion-item-option>
                  <ion-item-option color="danger" (click)="confirmDelete(universe)">
                    <ion-icon slot="icon-only" name="trash"></ion-icon>
                  </ion-item-option>
                </ion-item-options>
              </ion-item-sliding>
            }
          </ion-list>
        }

        <!-- Public Universes -->
        @if (publicUniverses().length > 0) {
          <ion-list-header>
            <ion-label>Universos Públicos</ion-label>
          </ion-list-header>

          <ion-list>
            @for (universe of publicUniverses(); track universe.id) {
              <ion-item @fadeIn (click)="viewUniverse(universe)" button class="universe-item">
                <div class="universe-thumb" slot="start">
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
                </div>
                <ion-label>
                  <h2>{{ universe.name }}</h2>
                  <p>{{ universe.description }}</p>
                  <p class="stats-count">
                    {{ getStatsCount(universe) }} stats
                    <ion-icon name="ellipse" class="dot"></ion-icon>
                    {{ universe.progressionRules.length }} reglas
                  </p>
                </ion-label>
              </ion-item>
            }
          </ion-list>
        }

        <!-- Empty State - No universes yet -->
        @if (universeStore.allUniverses().length === 0 && !universeStore.loading()) {
          <div class="empty-state">
            <ion-icon name="planet-outline" class="empty-icon"></ion-icon>
            <h2>No tienes universos</h2>
            <p>Los universos definen las reglas, estadísticas y razas para tus personajes. Crea tu primer universo para comenzar.</p>
            <ion-button (click)="createUniverse()" size="large">
              <ion-icon slot="start" name="add"></ion-icon>
              Crear mi primer Universo
            </ion-button>
            <ion-button fill="clear" (click)="loadData()" class="refresh-btn">
              <ion-icon slot="start" name="refresh"></ion-icon>
              Recargar
            </ion-button>
          </div>
        }
      }
    </ion-content>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 50vh;
      opacity: 0.7;
    }

    .loading-container p {
      margin-top: 16px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 70vh;
      padding: 20px;
      text-align: center;
    }

    .empty-icon {
      font-size: 80px;
      opacity: 0.3;
      margin-bottom: 20px;
    }

    .empty-state h2 {
      margin: 0 0 8px 0;
      font-size: 22px;
    }

    .empty-state p {
      margin: 0 0 24px 0;
      opacity: 0.6;
      max-width: 300px;
      line-height: 1.5;
    }

    .refresh-btn {
      margin-top: 12px;
      opacity: 0.7;
    }

    ion-list-header {
      margin-top: 16px;
    }

    .stats-count {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      opacity: 0.6;
    }

    .dot {
      font-size: 4px;
    }

    .universe-item {
      --padding-start: 12px;
    }

    .universe-thumb {
      position: relative;
      width: 56px;
      height: 56px;
      flex-shrink: 0;
      margin-right: 12px;
    }

    .universe-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 10px;
    }

    .thumb-placeholder {
      width: 100%;
      height: 100%;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.4), rgba(118, 75, 162, 0.4));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .thumb-placeholder ion-icon {
      font-size: 28px;
      color: rgba(255, 255, 255, 0.7);
    }

    .visibility-badge {
      position: absolute;
      bottom: -3px;
      right: -3px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--ion-color-medium);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--ion-background-color);
    }

    .visibility-badge.public {
      background: var(--ion-color-success);
    }

    .visibility-badge ion-icon {
      font-size: 10px;
      color: white;
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
