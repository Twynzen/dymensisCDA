import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonicModule],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="characters">
          <ion-icon name="people"></ion-icon>
          <ion-label>Personajes</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="universes">
          <ion-icon name="planet-outline"></ion-icon>
          <ion-label>Universos</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="creation">
          <ion-icon name="create-outline"></ion-icon>
          <ion-label>Creación</ion-label>
        </ion-tab-button>

        <ion-tab-button (click)="showProfileMenu($event)">
          <ion-icon name="person-circle"></ion-icon>
          <ion-label>Perfil</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    ion-tab-bar {
      --background: rgba(26, 26, 46, 0.95);
      --border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }

    ion-tab-button {
      --color: rgba(255, 255, 255, 0.5);
      --color-selected: var(--ion-color-primary);
    }

    ion-tab-button ion-icon {
      font-size: 24px;
    }
  `]
})
export class TabsComponent {
  private authService = inject(AuthService);
  private alertController = inject(AlertController);
  private router = inject(Router);

  async showProfileMenu(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const user = this.authService.user();

    const alert = await this.alertController.create({
      header: user?.displayName || 'Mi Perfil',
      subHeader: user?.email || '',
      buttons: [
        {
          text: 'Ir al Inicio',
          handler: () => {
            this.router.navigate(['/home']);
          }
        },
        {
          text: 'Cerrar Sesión',
          role: 'destructive',
          handler: async () => {
            await this.authService.signOut();
            this.router.navigate(['/home']);
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }
}
