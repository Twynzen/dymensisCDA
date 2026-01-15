import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from '../../../core/services/auth.service';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-content class="login-content">
      <div class="login-container">
        <div class="logo-section">
          <ion-icon name="game-controller" class="logo-icon"></ion-icon>
          <h1 class="app-title">RPG Character Manager</h1>
          <p class="app-subtitle">Gestiona tus personajes con IA local</p>
        </div>

        <ion-segment [(ngModel)]="mode" class="auth-segment">
          <ion-segment-button value="login">
            <ion-label>Iniciar Sesión</ion-label>
          </ion-segment-button>
          <ion-segment-button value="register">
            <ion-label>Registrarse</ion-label>
          </ion-segment-button>
        </ion-segment>

        <form (ngSubmit)="onSubmit()" class="auth-form">
          @if (mode() === 'register') {
            <ion-item>
              <ion-input
                type="text"
                [(ngModel)]="displayName"
                name="displayName"
                label="Nombre"
                labelPlacement="floating"
                placeholder="Tu nombre de usuario"
              ></ion-input>
            </ion-item>
          }

          <ion-item>
            <ion-input
              type="email"
              [(ngModel)]="email"
              name="email"
              label="Correo electrónico"
              labelPlacement="floating"
              placeholder="tu@email.com"
              required
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-input
              [type]="showPassword() ? 'text' : 'password'"
              [(ngModel)]="password"
              name="password"
              label="Contraseña"
              labelPlacement="floating"
              placeholder="••••••••"
              required
            ></ion-input>
            <ion-button fill="clear" slot="end" (click)="togglePassword()">
              <ion-icon [name]="showPassword() ? 'eye-off' : 'eye'"></ion-icon>
            </ion-button>
          </ion-item>

          @if (authService.error()) {
            <ion-text color="danger" class="error-message">
              <p>{{ authService.error() }}</p>
            </ion-text>
          }

          <ion-button
            type="submit"
            expand="block"
            class="submit-btn"
            [disabled]="authService.loading()"
          >
            @if (authService.loading()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              {{ mode() === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta' }}
            }
          </ion-button>
        </form>

        <div class="divider">
          <span>o continúa con</span>
        </div>

        <ion-button
          expand="block"
          fill="outline"
          class="google-btn"
          (click)="signInWithGoogle()"
          [disabled]="authService.loading()"
        >
          <ion-icon name="logo-google" slot="start"></ion-icon>
          Google
        </ion-button>

        @if (mode() === 'login') {
          <ion-button
            fill="clear"
            class="forgot-btn"
            (click)="resetPassword()"
          >
            ¿Olvidaste tu contraseña?
          </ion-button>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .login-content {
      --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }

    .login-container {
      max-width: 400px;
      margin: 0 auto;
      padding: 40px 20px;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .logo-section {
      text-align: center;
      margin-bottom: 40px;
    }

    .logo-icon {
      font-size: 64px;
      color: var(--ion-color-primary);
      margin-bottom: 16px;
    }

    .app-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #fff;
    }

    .app-subtitle {
      font-size: 14px;
      opacity: 0.7;
      margin: 0;
    }

    .auth-segment {
      margin-bottom: 24px;
    }

    .auth-form {
      margin-bottom: 20px;
    }

    ion-item {
      --background: rgba(255, 255, 255, 0.05);
      --border-color: rgba(255, 255, 255, 0.1);
      margin-bottom: 12px;
      border-radius: 8px;
    }

    .error-message {
      display: block;
      text-align: center;
      margin: 12px 0;
      font-size: 14px;
    }

    .submit-btn {
      margin-top: 20px;
      --border-radius: 8px;
      height: 48px;
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 20px 0;
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.2);
    }

    .divider span {
      padding: 0 16px;
    }

    .google-btn {
      --border-radius: 8px;
      --border-color: rgba(255, 255, 255, 0.3);
      height: 48px;
    }

    .forgot-btn {
      width: 100%;
      margin-top: 16px;
      --color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
    }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  private router = inject(Router);
  private toastController = inject(ToastController);

  mode = signal<AuthMode>('login');
  email = '';
  password = '';
  displayName = '';
  showPassword = signal(false);

  togglePassword(): void {
    this.showPassword.update(show => !show);
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) {
      await this.showToast('Por favor completa todos los campos', 'warning');
      return;
    }

    try {
      if (this.mode() === 'login') {
        await this.authService.signInWithEmail(this.email, this.password);
      } else {
        await this.authService.signUpWithEmail(this.email, this.password, this.displayName);
      }
      this.router.navigate(['/tabs/characters']);
    } catch {
      // Error is handled by the service and displayed in the template
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
      this.router.navigate(['/tabs/characters']);
    } catch {
      // Error is handled by the service
    }
  }

  async resetPassword(): Promise<void> {
    if (!this.email) {
      await this.showToast('Ingresa tu correo electrónico', 'warning');
      return;
    }

    try {
      await this.authService.resetPassword(this.email);
      await this.showToast('Se envió un correo para restablecer tu contraseña', 'success');
    } catch {
      // Error is handled by the service
    }
  }

  private async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
