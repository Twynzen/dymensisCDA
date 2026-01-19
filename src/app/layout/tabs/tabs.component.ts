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
          <ion-icon name="people-outline"></ion-icon>
          <ion-label>SUJETOS</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="universes">
          <ion-icon name="planet-outline"></ion-icon>
          <ion-label>MUNDOS</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="creation">
          <ion-icon name="terminal-outline"></ion-icon>
          <ion-label>CREAR</ion-label>
        </ion-tab-button>

        <ion-tab-button (click)="showProfileMenu($event)">
          <ion-icon name="person-circle-outline"></ion-icon>
          <ion-label>PERFIL</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    ion-tab-bar {
      --background: rgba(9, 9, 11, 0.95);
      --border: 1px solid var(--qdt-border-subtle);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      height: 56px;
    }

    ion-tab-button {
      --color: var(--qdt-text-subtle);
      --color-selected: var(--qdt-text-primary);
      font-family: var(--qdt-font-mono);
      font-size: 9px;
      letter-spacing: 0.1em;
    }

    ion-tab-button ion-icon {
      font-size: 20px;
      margin-bottom: 2px;
    }

    ion-tab-button ion-label {
      font-size: 9px;
      letter-spacing: 0.08em;
    }

    ion-tab-button.tab-selected {
      --color: var(--qdt-text-primary);
    }

    ion-tab-button.tab-selected ion-icon {
      color: var(--qdt-text-primary);
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
      header: 'PERFIL DE USUARIO',
      subHeader: user?.email || '',
      message: user?.displayName || 'Usuario sin nombre',
      buttons: [
        {
          text: 'IR AL INICIO',
          handler: () => {
            this.router.navigate(['/home']);
          }
        },
        {
          text: 'CERRAR SESION',
          role: 'destructive',
          handler: async () => {
            await this.authService.signOut();
            this.router.navigate(['/home']);
          }
        },
        {
          text: 'CANCELAR',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }
}
