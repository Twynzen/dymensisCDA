import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareService } from '../../core/services/share.service';

@Component({
  selector: 'app-shared-view',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Ficha Compartida</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Cargando ficha...</p>
        </div>
      } @else if (error()) {
        <div class="error-container">
          <ion-icon name="alert-circle-outline" color="danger"></ion-icon>
          <h2>{{ error() }}</h2>
          <p>El enlace puede haber expirado o ser inválido.</p>
        </div>
      } @else if (imageUrl()) {
        <div class="image-container">
          <img [src]="imageUrl()" alt="Ficha de personaje" class="character-card-image" />
        </div>
        <div class="cta-section">
          <p>¿Quieres crear tu propio personaje?</p>
          <ion-button expand="block" href="/auth/login">
            <ion-icon slot="start" name="game-controller"></ion-icon>
            Crear Cuenta Gratis
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
      text-align: center;
    }

    .error-container ion-icon {
      font-size: 80px;
      margin-bottom: 20px;
    }

    .error-container h2 {
      margin: 0 0 8px 0;
    }

    .error-container p {
      opacity: 0.6;
    }

    .image-container {
      display: flex;
      justify-content: center;
      padding: 20px;
    }

    .character-card-image {
      max-width: 100%;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }

    .cta-section {
      text-align: center;
      padding: 30px 20px;
    }

    .cta-section p {
      margin-bottom: 16px;
      opacity: 0.7;
    }
  `]
})
export class SharedViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private shareService = inject(ShareService);

  loading = signal(true);
  error = signal<string | null>(null);
  imageUrl = signal<string | null>(null);

  ngOnInit(): void {
    const shareId = this.route.snapshot.paramMap.get('shareId');
    if (shareId) {
      this.loadSharedContent(shareId);
    } else {
      this.error.set('Enlace inválido');
      this.loading.set(false);
    }
  }

  async loadSharedContent(shareId: string): Promise<void> {
    try {
      const content = await this.shareService.getSharedContent(shareId);

      if (!content) {
        this.error.set('Enlace no encontrado');
      } else if (content.expired) {
        this.error.set('Este enlace ha expirado');
      } else {
        this.imageUrl.set(content.downloadUrl);
      }
    } catch (e) {
      this.error.set('Error al cargar la ficha');
    } finally {
      this.loading.set(false);
    }
  }
}
