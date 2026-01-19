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
    <ion-header class="qdt-header">
      <ion-toolbar>
        <ion-title>
          <div class="header-title">
            <span class="title-prefix">■</span>
            <span class="title-text">PERSONAJES</span>
            <span class="title-count">[{{ characterStore.characters().length }}]</span>
          </div>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="createCharacter()" class="add-btn">
            <ion-icon slot="icon-only" name="add"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="qdt-content">
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (characterStore.loading()) {
        <div class="loading-container">
          <div class="loading-indicator">
            <div class="loading-spinner"></div>
            <span class="loading-text">CARGANDO REGISTROS...</span>
          </div>
        </div>
      } @else if (characterStore.characters().length === 0) {
        <div class="empty-state">
          <div class="empty-icon-container">
            <div class="empty-bracket top-left"></div>
            <div class="empty-bracket top-right"></div>
            <div class="empty-bracket bottom-left"></div>
            <div class="empty-bracket bottom-right"></div>
            <ion-icon name="people-outline" class="empty-icon"></ion-icon>
          </div>
          <h2 class="empty-title">NO HAY REGISTROS</h2>
          <p class="empty-description">Base de datos vacía. Inicie la creación de un nuevo sujeto para comenzar.</p>
          <button class="qdt-button primary" (click)="createCharacter()">
            <ion-icon name="add"></ion-icon>
            <span>CREAR PERSONAJE</span>
          </button>
        </div>
      } @else {
        <div class="list-header">
          <span class="list-label">REGISTROS ACTIVOS</span>
          <span class="list-timestamp">{{ currentTimestamp }}</span>
        </div>

        <div class="character-list">
          @for (character of characterStore.characters(); track character.id) {
            <app-character-card
              @fadeIn
              [character]="character"
              [statDefinitions]="getStatDefinitions(character.universeId)"
              (cardClick)="viewCharacter(character.id!)"
              (moreClick)="showActions(character)"
            ></app-character-card>
          }
        </div>
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
      color: var(--qdt-accent-red);
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

    .add-btn:hover {
      --color: var(--qdt-text-primary);
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

    .empty-bracket.top-left {
      top: 0;
      left: 0;
      border-top-width: 1px;
      border-left-width: 1px;
    }

    .empty-bracket.top-right {
      top: 0;
      right: 0;
      border-top-width: 1px;
      border-right-width: 1px;
    }

    .empty-bracket.bottom-left {
      bottom: 0;
      left: 0;
      border-bottom-width: 1px;
      border-left-width: 1px;
    }

    .empty-bracket.bottom-right {
      bottom: 0;
      right: 0;
      border-bottom-width: 1px;
      border-right-width: 1px;
    }

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
      max-width: 280px;
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

    .qdt-button ion-icon {
      font-size: 14px;
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--qdt-border-subtle);
    }

    .list-label {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-subtle);
    }

    .list-timestamp {
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      letter-spacing: 0.05em;
      color: var(--qdt-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .character-list {
      padding: 8px;
    }
  `]
})
export class CharacterListComponent implements OnInit {
  characterStore = inject(CharacterStore);
  universeStore = inject(UniverseStore);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private actionSheetController = inject(ActionSheetController);

  get currentTimestamp(): string {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace('T', ' ');
  }

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

  createCharacter(): void {
    this.router.navigate(['/tabs/creation']);
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
