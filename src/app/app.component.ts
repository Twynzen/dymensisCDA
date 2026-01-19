import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { QdtEffectsComponent } from './shared/ui/qdt-effects/qdt-effects.component';
// Icons are registered in main.ts - SINGLE SOURCE OF TRUTH

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, QdtEffectsComponent],
  template: `
    <ion-app>
      <!-- QDT VHS Effects Overlay -->
      <app-qdt-effects></app-qdt-effects>

      <!-- Main Router Outlet -->
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `
})
export class AppComponent {
  // Icons are registered in main.ts before bootstrap
}
