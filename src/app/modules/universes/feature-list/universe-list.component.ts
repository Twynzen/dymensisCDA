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
                <ion-item (click)="viewUniverse(universe)" button>
                  <ion-icon
                    [name]="universe.isPublic ? 'globe-outline' : 'lock-closed-outline'"
                    slot="start"
                    [color]="universe.isPublic ? 'primary' : 'medium'"
                  ></ion-icon>
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
              <ion-item @fadeIn (click)="viewUniverse(universe)" button>
                <ion-icon name="globe-outline" slot="start" color="primary"></ion-icon>
                <ion-label>
                  <h2>{{ universe.name }}</h2>
                  <p>{{ universe.description }}</p>
                  <p class="stats-count">
                    {{ getStatsCount(universe) }} stats
                    <ion-icon name="ellipse" class="dot"></ion-icon>
                    {{ universe.progressionRules.length }} reglas
                  </p>
                </ion-label>
                <ion-badge slot="end" color="primary">Público</ion-badge>
              </ion-item>
            }
          </ion-list>
        }

        @if (universeStore.allUniverses().length === 0) {
          <div class="empty-state">
            <ion-icon name="planet-outline" class="empty-icon"></ion-icon>
            <h2>Sin universos</h2>
            <p>Crea tu primer universo de reglas para comenzar</p>
            <ion-button (click)="createUniverse()">
              <ion-icon slot="start" name="add"></ion-icon>
              Crear Universo
            </ion-button>
          </div>
        }
      }

      @if (universeStore.error()) {
        <ion-toast
          [isOpen]="true"
          [message]="universeStore.error()!"
          duration="3000"
          color="danger"
          (didDismiss)="universeStore.setError(null)"
        ></ion-toast>
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

  async createUniverse(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Nuevo Universo',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre del universo'
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Descripción (opcional)'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: async (data) => {
            if (!data.name?.trim()) return false;

            const universeId = await this.universeStore.createUniverse(
              data.name.trim(),
              data.description?.trim() || '',
              false
            );

            if (universeId) {
              this.router.navigate(['/tabs/universes', universeId, 'edit']);
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
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
