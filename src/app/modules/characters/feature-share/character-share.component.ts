import { Component, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { CharacterStore } from '../data-access/character.store';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { ShareService } from '../../../core/services/share.service';
import { AuthService } from '../../../core/services/auth.service';
import { PrintableCardComponent } from '../../../shared/ui/printable-card/printable-card.component';

@Component({
  selector: 'app-character-share',
  standalone: true,
  imports: [CommonModule, IonicModule, PrintableCardComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="'/tabs/characters/' + characterId()"></ion-back-button>
        </ion-buttons>
        <ion-title>Compartir Ficha</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (characterStore.loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
      } @else if (character()) {
        <div class="preview-section">
          <h2>Vista Previa</h2>

          <div class="card-preview">
            <app-printable-card
              #printableCard
              [character]="character()!"
              [statDefinitions]="statDefinitions()"
              [cardUniverseName]="universeName()"
              [cardShareUrl]="shareUrl()"
              [cardMaxStatValue]="200"
            ></app-printable-card>
          </div>
        </div>

        <div class="actions-section">
          <ion-list-header>
            <ion-label>Opciones de Compartir</ion-label>
          </ion-list-header>

          <ion-list>
            <ion-item button (click)="shareAsImage()">
              <ion-icon name="share-social" slot="start" color="primary"></ion-icon>
              <ion-label>
                <h2>Compartir como Imagen</h2>
                <p>Envía la ficha por WhatsApp, Telegram, etc.</p>
              </ion-label>
            </ion-item>

            <ion-item button (click)="downloadImage()">
              <ion-icon name="download" slot="start" color="secondary"></ion-icon>
              <ion-label>
                <h2>Descargar Imagen</h2>
                <p>Guarda la ficha como PNG</p>
              </ion-label>
            </ion-item>

            <!-- Enlace temporal deshabilitado (requiere Firebase Storage / plan Blaze)
            <ion-item button (click)="createLink()">
              <ion-icon name="link" slot="start" color="tertiary"></ion-icon>
              <ion-label>
                <h2>Crear Enlace Temporal</h2>
                <p>Genera un link que expira en 1 hora</p>
              </ion-label>
            </ion-item>
            -->
          </ion-list>
        </div>

        <div class="info-section">
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="information-circle"></ion-icon>
                Información
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ul>
                <li>La ficha incluye las estadísticas actuales del personaje</li>
                <li>El código QR permite escanear y ver los detalles</li>
                <li>Los enlaces temporales son seguros y expiran automáticamente</li>
              </ul>
            </ion-card-content>
          </ion-card>
        </div>
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

    .preview-section {
      padding: 16px;
      text-align: center;
    }

    .preview-section h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      opacity: 0.8;
    }

    .card-preview {
      display: flex;
      justify-content: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 16px;
      overflow-x: auto;
    }

    .actions-section {
      padding: 16px;
    }

    ion-list {
      background: transparent;
    }

    ion-item {
      --background: rgba(255, 255, 255, 0.05);
      margin-bottom: 8px;
      border-radius: 8px;
    }

    .link-section {
      margin-top: 16px;
      padding: 0 8px;
    }

    .link-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      opacity: 0.6;
      padding: 8px 16px;
    }

    .info-section {
      padding: 16px;
    }

    .info-section ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
    }

    .info-section ul {
      margin: 0;
      padding-left: 20px;
    }

    .info-section li {
      margin-bottom: 8px;
      font-size: 14px;
      opacity: 0.8;
    }
  `]
})
export class CharacterShareComponent implements OnInit {
  @ViewChild('printableCard') printableCard!: PrintableCardComponent;

  characterStore = inject(CharacterStore);
  universeStore = inject(UniverseStore);
  shareService = inject(ShareService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);

  characterId = signal('');
  generatedLink = signal('');
  shareUrl = signal('');

  character = computed(() => this.characterStore.selectedCharacter());

  statDefinitions = computed(() => {
    const character = this.character();
    if (!character) return {};
    const universe = this.universeStore.allUniverses().find(u => u.id === character.universeId);
    return universe?.statDefinitions ?? {};
  });

  universeName = computed(() => {
    const character = this.character();
    if (!character) return '';
    const universe = this.universeStore.allUniverses().find(u => u.id === character.universeId);
    return universe?.name ?? '';
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.characterId.set(id);
      this.loadData(id);
    }
  }

  async loadData(characterId: string): Promise<void> {
    await Promise.all([
      this.characterStore.selectCharacter(characterId),
      this.universeStore.loadUniverses()
    ]);

    // Generate share URL for QR code
    this.shareUrl.set(`${window.location.origin}/shared/preview/${characterId}`);
  }

  async shareAsImage(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Preparando imagen...'
    });
    await loading.present();

    try {
      const imageBase64 = await this.printableCard.captureAsImage();
      const character = this.character();

      if (character) {
        await this.shareService.shareAsImage({
          title: `Ficha de ${character.name}`,
          text: `Mira mi personaje ${character.name} de nivel ${character.progression.level}!`,
          imageBase64,
          characterName: character.name
        });
      }
    } catch (error) {
      await this.showToast('Error al compartir', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async downloadImage(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Generando imagen...'
    });
    await loading.present();

    try {
      const imageBase64 = await this.printableCard.captureAsImage();
      const character = this.character();

      if (character) {
        const fileName = `${character.name.replace(/\s+/g, '-')}-ficha.png`;
        this.shareService.downloadImage(imageBase64, fileName);
        await this.showToast('Imagen descargada', 'success');
      }
    } catch (error) {
      await this.showToast('Error al descargar', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async createLink(): Promise<void> {
    const userId = this.authService.userId();
    const character = this.character();

    if (!userId || !character) return;

    const loading = await this.loadingController.create({
      message: 'Generando enlace...'
    });
    await loading.present();

    try {
      const imageBase64 = await this.printableCard.captureAsImage();
      const link = await this.shareService.createTemporaryLink(
        userId,
        character.id!,
        imageBase64,
        60 // 1 hour expiration
      );

      this.generatedLink.set(link);
      await this.showToast('Enlace generado', 'success');
    } catch (error) {
      await this.showToast('Error al generar enlace', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async copyLink(): Promise<void> {
    const link = this.generatedLink();
    if (!link) return;

    const success = await this.shareService.copyToClipboard(link);
    if (success) {
      await this.showToast('Enlace copiado al portapapeles', 'success');
    } else {
      await this.showToast('Error al copiar', 'danger');
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
