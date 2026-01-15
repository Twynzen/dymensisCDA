import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule, AlertController, ActionSheetController } from '@ionic/angular';
import { CharacterStore } from '../data-access/character.store';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { CharacterCardComponent } from '../../../shared/ui/character-card/character-card.component';
import { fadeInAnimation } from '../../../shared/animations/stat-animations';

@Component({
  selector: 'app-character-list',
  standalone: true,
  imports: [CommonModule, IonicModule, CharacterCardComponent],
  animations: [fadeInAnimation],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Mis Personajes</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="createCharacter()">
            <ion-icon slot="icon-only" name="add"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (characterStore.loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Cargando personajes...</p>
        </div>
      } @else if (characterStore.characters().length === 0) {
        <div class="empty-state">
          <ion-icon name="people-outline" class="empty-icon"></ion-icon>
          <h2>No tienes personajes</h2>
          <p>Crea tu primer personaje para comenzar tu aventura</p>
          <ion-button (click)="createCharacter()">
            <ion-icon slot="start" name="add"></ion-icon>
            Crear Personaje
          </ion-button>
        </div>
      } @else {
        <ion-list>
          @for (character of characterStore.characters(); track character.id) {
            <app-character-card
              @fadeIn
              [character]="character"
              [statDefinitions]="getStatDefinitions(character.universeId)"
              (cardClick)="viewCharacter(character.id!)"
              (moreClick)="showActions(character)"
            ></app-character-card>
          }
        </ion-list>
      }

      @if (characterStore.error()) {
        <ion-toast
          [isOpen]="true"
          [message]="characterStore.error()!"
          duration="3000"
          color="danger"
          (didDismiss)="characterStore.setError(null)"
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

    ion-list {
      padding: 8px;
      background: transparent;
    }
  `]
})
export class CharacterListComponent implements OnInit {
  characterStore = inject(CharacterStore);
  universeStore = inject(UniverseStore);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private actionSheetController = inject(ActionSheetController);

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    await Promise.all([
      this.characterStore.loadCharacters(),
      this.universeStore.loadUniverses()
    ]);
  }

  async onRefresh(event: any): Promise<void> {
    await this.loadData();
    event.target.complete();
  }

  getStatDefinitions(universeId: string): Record<string, any> {
    const universe = this.universeStore.allUniverses().find(u => u.id === universeId);
    return universe?.statDefinitions ?? {};
  }

  viewCharacter(characterId: string): void {
    this.router.navigate(['/tabs/characters', characterId]);
  }

  async createCharacter(): Promise<void> {
    const universes = this.universeStore.allUniverses();

    if (universes.length === 0) {
      const alert = await this.alertController.create({
        header: 'Sin Universos',
        message: 'Primero debes crear o seleccionar un universo de reglas.',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Crear Universo',
            handler: () => {
              this.router.navigate(['/tabs/universes/new']);
            }
          }
        ]
      });
      await alert.present();
      return;
    }

    this.router.navigate(['/tabs/characters/new']);
  }

  async showActions(character: any): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      header: character.name,
      buttons: [
        {
          text: 'Ver Detalles',
          icon: 'eye',
          handler: () => this.viewCharacter(character.id)
        },
        {
          text: 'Editar',
          icon: 'create',
          handler: () => this.router.navigate(['/tabs/characters', character.id, 'edit'])
        },
        {
          text: 'Compartir Ficha',
          icon: 'share',
          handler: () => this.router.navigate(['/tabs/characters', character.id, 'share'])
        },
        {
          text: 'Eliminar',
          icon: 'trash',
          role: 'destructive',
          handler: () => this.confirmDelete(character)
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async confirmDelete(character: any): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar Personaje',
      message: `¿Estás seguro de eliminar a "${character.name}"? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.characterStore.deleteCharacter(character.id)
        }
      ]
    });
    await alert.present();
  }
}
