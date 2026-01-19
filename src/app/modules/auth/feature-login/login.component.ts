import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
        <!-- Header HUD -->
        <div class="auth-hud">
          <div class="hud-left">
            <div class="rec-indicator">
              <span class="rec-dot"></span>
              <span class="rec-text">SEC</span>
              <span class="separator">|</span>
              <span>AUTH-GATE</span>
            </div>
            <div class="hud-date">{{ currentDate }}</div>
          </div>
          <div class="hud-right">
            <span class="sector">SECURE ZONE</span>
            <span class="restricted">CLEARANCE REQUIRED</span>
          </div>
        </div>

        <!-- Logo Section -->
        <div class="logo-section">
          <div class="logo-icon-container">
            <ion-icon name="shield-outline" class="logo-icon"></ion-icon>
          </div>
          <h1 class="app-title">DYMENSIS//CDA</h1>
          <p class="app-subtitle">SISTEMA DE AUTENTICACION</p>
        </div>

        <!-- Auth Panel -->
        <div class="auth-panel">
          <div class="panel-header">
            <ion-icon name="key-outline"></ion-icon>
            <span class="panel-title">{{ mode() === 'login' ? 'ACCESO AL SISTEMA' : 'NUEVO REGISTRO' }}</span>
            <span class="panel-code">AUTH-{{ mode() === 'login' ? '001' : '002' }}</span>
          </div>

          <!-- Mode Selector -->
          <ion-segment [(ngModel)]="mode" class="auth-segment">
            <ion-segment-button value="login">
              <ion-label>ACCEDER</ion-label>
            </ion-segment-button>
            <ion-segment-button value="register">
              <ion-label>REGISTRAR</ion-label>
            </ion-segment-button>
          </ion-segment>

          <!-- Auth Form -->
          <form (ngSubmit)="onSubmit()" class="auth-form">
            @if (mode() === 'register') {
              <div class="input-group">
                <label>
                  IDENTIFICADOR
                  <span class="optional">[OPCIONAL]</span>
                </label>
                <div class="input-wrapper">
                  <input
                    type="text"
                    [(ngModel)]="displayName"
                    name="displayName"
                    placeholder="INGRESA TU ALIAS..."
                  />
                </div>
              </div>
            }

            <div class="input-group">
              <label>
                CORREO ELECTRONICO
                <span class="required">*</span>
              </label>
              <div class="input-wrapper">
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  placeholder="USUARIO@DOMINIO.COM"
                  required
                />
              </div>
              <div class="input-hint">Formato: usuario&#64;dominio.com</div>
            </div>

            <div class="input-group">
              <label>
                CLAVE DE ACCESO
                <span class="required">*</span>
              </label>
              <div class="input-wrapper has-action">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="••••••••••••"
                  required
                />
                <button type="button" class="input-action" (click)="togglePassword()">
                  <ion-icon [name]="showPassword() ? 'eye-off' : 'eye'"></ion-icon>
                </button>
              </div>
              <div class="input-hint">Minimo 6 caracteres</div>
            </div>

            @if (authService.error()) {
              <div class="error-message">
                <ion-icon name="alert-circle-outline"></ion-icon>
                <span>{{ authService.error() }}</span>
              </div>
            }

            <button
              type="submit"
              class="submit-btn"
              [disabled]="authService.loading()"
            >
              @if (authService.loading()) {
                <ion-spinner name="crescent"></ion-spinner>
                <span>PROCESANDO...</span>
              } @else {
                <ion-icon [name]="mode() === 'login' ? 'log-in-outline' : 'person-add-outline'"></ion-icon>
                <span>{{ mode() === 'login' ? 'INICIAR SESION' : 'CREAR CUENTA' }}</span>
              }
            </button>
          </form>

          @if (showGoogleLogin) {
            <div class="divider">
              <span>METODO ALTERNATIVO</span>
            </div>

            <button
              type="button"
              class="google-btn"
              (click)="signInWithGoogle()"
              [disabled]="authService.loading()"
            >
              <ion-icon name="logo-google"></ion-icon>
              <span>CONTINUAR CON GOOGLE</span>
            </button>
          }

          @if (mode() === 'login') {
            <button
              type="button"
              class="forgot-btn"
              (click)="resetPassword()"
            >
              RECUPERAR ACCESO
            </button>
          }
        </div>

        <!-- Status Footer -->
        <div class="status-footer">
          <div class="status-grid">
            <div class="status-item">
              <span class="status-dot connected"></span>
              <span>SERVIDOR ONLINE</span>
            </div>
            <div class="status-item">
              <span class="status-dot"></span>
              <span>ENCRIPTACION</span>
            </div>
            <div class="status-item">
              <span class="status-dot"></span>
              <span>FIREWALL</span>
            </div>
          </div>
        </div>

        <!-- Document Reference -->
        <div class="doc-footer">
          <div class="qdt-divider">END OF FORM</div>
          <p class="doc-ref">DOC-REF: AUTH-{{ generateRef() }}</p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .login-content {
      --background: var(--qdt-bg-primary);
    }

    .login-container {
      max-width: 420px;
      margin: 0 auto;
      padding: 20px;
      min-height: 100%;
      display: flex;
      flex-direction: column;
    }

    /* HUD */
    .auth-hud {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      font-size: 10px;
      letter-spacing: 0.1em;
    }

    .hud-left, .hud-right {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .hud-right {
      text-align: right;
      align-items: flex-end;
    }

    .rec-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--qdt-text-muted);
    }

    .rec-dot {
      width: 8px;
      height: 8px;
      background: var(--qdt-accent-amber);
      border-radius: 50%;
      animation: qdt-pulse 1.5s ease-in-out infinite;
    }

    .rec-text {
      color: var(--qdt-accent-amber);
      font-weight: 700;
    }

    .separator {
      color: var(--qdt-text-subtle);
    }

    .hud-date {
      color: var(--qdt-text-subtle);
    }

    .sector {
      color: var(--qdt-text-subtle);
    }

    .restricted {
      color: var(--qdt-accent-amber);
      font-weight: 500;
    }

    /* Logo Section */
    .logo-section {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo-icon-container {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--qdt-border-default);
      background: var(--qdt-bg-secondary);
    }

    .logo-icon {
      font-size: 32px;
      color: var(--qdt-text-muted);
    }

    .app-title {
      font-size: 20px;
      font-weight: 400;
      letter-spacing: 0.2em;
      color: var(--qdt-text-primary);
      margin: 0 0 8px 0;
    }

    .app-subtitle {
      font-size: 10px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-muted);
      margin: 0;
    }

    /* Auth Panel */
    .auth-panel {
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
      padding: 20px;
      flex: 1;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--qdt-border-subtle);
      margin-bottom: 20px;
    }

    .panel-header ion-icon {
      font-size: 18px;
      color: var(--qdt-text-muted);
    }

    .panel-title {
      font-size: 12px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-primary);
    }

    .panel-code {
      margin-left: auto;
      font-size: 9px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-subtle);
    }

    /* Segment */
    .auth-segment {
      margin-bottom: 24px;
    }

    /* Form */
    .auth-form {
      margin-bottom: 20px;
    }

    .input-group {
      margin-bottom: 20px;
    }

    .input-group label {
      display: block;
      font-size: 10px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-secondary);
      margin-bottom: 8px;
    }

    .input-group .required {
      color: var(--qdt-accent-red);
      margin-left: 4px;
    }

    .input-group .optional {
      color: var(--qdt-text-subtle);
      margin-left: 4px;
      font-size: 9px;
    }

    .input-wrapper {
      position: relative;
    }

    .input-wrapper input {
      width: 100%;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-border-default);
      color: var(--qdt-text-primary);
      font-family: var(--qdt-font-mono);
      font-size: 13px;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      outline: none;
      transition: all 0.2s ease;
    }

    .input-wrapper input::placeholder {
      color: var(--qdt-text-subtle);
    }

    .input-wrapper input:focus {
      border-color: var(--qdt-border-focus);
      box-shadow: 0 0 0 1px rgba(113, 113, 122, 0.3);
    }

    .input-wrapper.has-action input {
      padding-right: 48px;
    }

    .input-action {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--qdt-text-muted);
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .input-action:hover {
      color: var(--qdt-text-secondary);
    }

    .input-hint {
      font-size: 10px;
      letter-spacing: 0.05em;
      color: var(--qdt-text-subtle);
      margin-top: 6px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(220, 38, 38, 0.1);
      border: 1px solid var(--qdt-accent-red-dim);
      margin-bottom: 20px;
    }

    .error-message ion-icon {
      font-size: 18px;
      color: var(--qdt-accent-red);
      flex-shrink: 0;
    }

    .error-message span {
      font-size: 11px;
      letter-spacing: 0.05em;
      color: var(--qdt-accent-red);
    }

    .submit-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: var(--qdt-bg-tertiary);
      border: 1px solid var(--qdt-border-strong);
      color: var(--qdt-text-primary);
      font-family: var(--qdt-font-mono);
      font-size: 11px;
      letter-spacing: 0.15em;
      padding: 14px 24px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .submit-btn:hover:not(:disabled) {
      background: var(--qdt-bg-elevated);
      border-color: var(--qdt-border-focus);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .submit-btn ion-icon {
      font-size: 16px;
    }

    .submit-btn ion-spinner {
      width: 16px;
      height: 16px;
    }

    /* Divider */
    .divider {
      display: flex;
      align-items: center;
      margin: 24px 0;
      font-size: 9px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-subtle);
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--qdt-border-subtle);
    }

    .divider span {
      padding: 0 12px;
    }

    /* Google Button */
    .google-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: transparent;
      border: 1px solid var(--qdt-border-default);
      color: var(--qdt-text-secondary);
      font-family: var(--qdt-font-mono);
      font-size: 11px;
      letter-spacing: 0.1em;
      padding: 14px 24px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .google-btn:hover:not(:disabled) {
      border-color: var(--qdt-border-focus);
      color: var(--qdt-text-primary);
      background: var(--qdt-bg-tertiary);
    }

    .google-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .google-btn ion-icon {
      font-size: 16px;
    }

    /* Forgot Button */
    .forgot-btn {
      width: 100%;
      background: transparent;
      border: none;
      color: var(--qdt-text-muted);
      font-family: var(--qdt-font-mono);
      font-size: 10px;
      letter-spacing: 0.1em;
      padding: 16px;
      cursor: pointer;
      transition: color 0.2s ease;
      margin-top: 12px;
    }

    .forgot-btn:hover {
      color: var(--qdt-text-secondary);
    }

    /* Status Footer */
    .status-footer {
      margin-top: auto;
      padding-top: 24px;
    }

    .status-grid {
      display: flex;
      justify-content: center;
      gap: 24px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 9px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-muted);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--qdt-text-subtle);
    }

    .status-dot.connected {
      background: var(--qdt-accent-green);
      animation: qdt-pulse 2s ease-in-out infinite;
    }

    /* Doc Footer */
    .doc-footer {
      padding-top: 24px;
      text-align: center;
    }

    .doc-ref {
      font-size: 9px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-subtle);
      margin: 16px 0 0 0;
    }
  `]
})
export class LoginComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastController = inject(ToastController);

  // Flag to show/hide Google button (disabled temporarily)
  showGoogleLogin = false;

  mode = signal<AuthMode>('login');
  email = '';
  password = '';
  displayName = '';
  showPassword = signal(false);
  currentDate = '';
  private returnUrl = '/tabs/characters';

  ngOnInit(): void {
    // Format current date
    const now = new Date();
    this.currentDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '.');

    // Get return URL from query params
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/tabs/characters';

    // Check if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  togglePassword(): void {
    this.showPassword.update(show => !show);
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) {
      await this.showToast('ERROR: Completa todos los campos requeridos', 'warning');
      return;
    }

    try {
      if (this.mode() === 'login') {
        await this.authService.signInWithEmail(this.email, this.password);
      } else {
        await this.authService.signUpWithEmail(this.email, this.password, this.displayName);
      }

      this.router.navigate([this.returnUrl]);
    } catch (error) {
      // Error is handled by the service and displayed in the template
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
      this.router.navigate([this.returnUrl]);
    } catch (error) {
      // Error is handled by the service
    }
  }

  async resetPassword(): Promise<void> {
    if (!this.email) {
      await this.showToast('ERROR: Ingresa tu correo electronico', 'warning');
      return;
    }

    try {
      await this.authService.resetPassword(this.email);
      await this.showToast('Correo de recuperacion enviado', 'success');
    } catch {
      // Error is handled by the service
    }
  }

  generateRef(): string {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
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
