import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';

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
          <ion-icon name="planet"></ion-icon>
          <ion-label>Universos</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="creation">
          <ion-icon name="create-outline"></ion-icon>
          <ion-label>Creación</ion-label>
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
export class TabsComponent {}
