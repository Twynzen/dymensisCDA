import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FirebaseService } from '../../core/services/firebase.service';
import { AuthService } from '../../core/services/auth.service';
import { Universe } from '../../core/models';
import { QdtHudComponent } from '../../shared/ui/qdt-hud/qdt-hud.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink, QdtHudComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <div class="logo">
            <ion-icon name="terminal-outline"></ion-icon>
            <span>DYMENSIS//CDA</span>
          </div>
        </ion-title>
        <ion-buttons slot="end">
          @if (authService.isAuthenticated()) {
            <ion-button routerLink="/tabs/characters">
              <ion-icon slot="start" name="apps-outline"></ion-icon>
              SISTEMA
            </ion-button>
          } @else {
            <ion-button routerLink="/login" fill="outline">
              <ion-icon slot="start" name="key-outline"></ion-icon>
              ACCESO
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- QDT HUD -->
      <app-qdt-hud
        camera="CAM-01"
        sectorName="HOME SECTOR"
        modeName="SURVEILLANCE"
        [isRestricted]="false"
        [recording]="true"
      ></app-qdt-hud>

      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-content">
          <div class="hero-badge">SISTEMA DE GESTION RPG</div>
          <h1>CREACION DE UNIVERSOS</h1>
          <p class="hero-description">
            Diseña mundos unicos con sistemas de estadisticas personalizados.
            Crea personajes memorables y gestiona su progresion.
          </p>

          <div class="hero-status">
            <div class="status-item">
              <span class="status-dot connected"></span>
              <span>SISTEMA OPERATIVO</span>
            </div>
            <div class="status-item">
              <span class="status-dot"></span>
              <span>IA LOCAL DISPONIBLE</span>
            </div>
          </div>

          <div class="hero-actions">
            @if (authService.isAuthenticated()) {
              <ion-button routerLink="/tabs/creation" size="large" expand="block">
                <ion-icon slot="start" name="add-circle-outline"></ion-icon>
                INICIAR CREACION
              </ion-button>
            } @else {
              <ion-button routerLink="/login" size="large" expand="block">
                <ion-icon slot="start" name="key-outline"></ion-icon>
                ACCEDER AL SISTEMA
              </ion-button>
            }
          </div>
        </div>
      </div>

      <!-- Features Section -->
      <div class="features-section">
        <div class="section-header">
          <span class="section-marker">01</span>
          <h2>FUNCIONES DEL SISTEMA</h2>
          <div class="section-line"></div>
        </div>

        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <ion-icon name="planet-outline"></ion-icon>
            </div>
            <div class="feature-content">
              <h3>UNIVERSOS</h3>
              <p>Define las reglas de tu mundo: estadisticas, rangos y sistema de progresion</p>
            </div>
            <div class="feature-code">UNV-001</div>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <ion-icon name="person-circle-outline"></ion-icon>
            </div>
            <div class="feature-content">
              <h3>PERSONAJES</h3>
              <p>Crea personajes con stats unicos, trasfondo y personalidad</p>
            </div>
            <div class="feature-code">CHR-002</div>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <ion-icon name="sparkles-outline"></ion-icon>
            </div>
            <div class="feature-content">
              <h3>CREACION IA</h3>
              <p>Utiliza herramientas agénticas para generar contenido</p>
            </div>
            <div class="feature-code">AGN-003</div>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <ion-icon name="share-outline"></ion-icon>
            </div>
            <div class="feature-content">
              <h3>COMPARTIR</h3>
              <p>Comparte tus creaciones con la comunidad o mantenlas privadas</p>
            </div>
            <div class="feature-code">SHR-004</div>
          </div>
        </div>
      </div>

      <!-- Public Universes Section -->
      <div class="universes-section">
        <div class="section-header">
          <span class="section-marker">02</span>
          <h2>ARCHIVOS PUBLICOS</h2>
          <div class="section-line"></div>
        </div>

        <div class="section-subheader">
          <span>UNIVERSOS DE LA COMUNIDAD</span>
          <span class="record-count">{{ publicUniverses().length }} REGISTROS</span>
        </div>

        @if (loading()) {
          <div class="loading-container">
            <ion-spinner name="crescent"></ion-spinner>
            <p>CARGANDO DATOS...</p>
          </div>
        } @else if (error()) {
          <div class="error-container">
            <ion-icon name="alert-circle-outline"></ion-icon>
            <p>{{ error() }}</p>
            <ion-button fill="outline" (click)="loadPublicUniverses()">
              <ion-icon slot="start" name="refresh-outline"></ion-icon>
              REINTENTAR
            </ion-button>
          </div>
        } @else if (publicUniverses().length === 0) {
          <div class="empty-container">
            <ion-icon name="server-outline"></ion-icon>
            <p>SIN REGISTROS</p>
            <p class="sub-text">Base de datos vacia - Se el primero en contribuir</p>
          </div>
        } @else {
          <div class="universes-grid">
            @for (universe of publicUniverses(); track universe.id) {
              <div class="universe-card">
                <div class="card-header">
                  @if (universe.coverImage) {
                    <div class="card-image" [style.backgroundImage]="'url(' + universe.coverImage + ')'"></div>
                  } @else {
                    <div class="card-placeholder" [style.background]="getUniverseGradient(universe)">
                      <ion-icon name="planet-outline"></ion-icon>
                    </div>
                  }
                  <div class="card-badge">UNV</div>
                </div>

                <div class="card-content">
                  <h3>{{ universe.name }}</h3>
                  <p class="description">{{ universe.description | slice:0:80 }}{{ universe.description.length > 80 ? '...' : '' }}</p>

                  <div class="card-meta">
                    <div class="meta-item">
                      <ion-icon name="stats-chart-outline"></ion-icon>
                      <span>{{ getStatCount(universe) }} STATS</span>
                    </div>
                    @if (universe.awakeningSystem?.enabled) {
                      <div class="meta-item">
                        <ion-icon name="trophy-outline"></ion-icon>
                        <span>{{ universe.awakeningSystem!.levels.length }} RANGOS</span>
                      </div>
                    }
                    @if (universe.raceSystem?.enabled) {
                      <div class="meta-item">
                        <ion-icon name="people-outline"></ion-icon>
                        <span>{{ universe.raceSystem!.races.length }} RAZAS</span>
                      </div>
                    }
                  </div>

                  <div class="stats-preview">
                    @for (stat of getTopStats(universe); track stat.key) {
                      <span class="stat-badge" [style.borderColor]="stat.color">
                        {{ stat.abbreviation }}
                      </span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- CTA Section -->
      <div class="cta-section">
        <div class="cta-content">
          <h2>ACCESO AL SISTEMA</h2>
          <p>Unete al sistema y comienza a crear tus propios universos</p>
          <div class="cta-status">
            <span class="status-dot connected"></span>
            <span>REGISTRO ABIERTO</span>
          </div>
          @if (!authService.isAuthenticated()) {
            <ion-button routerLink="/login" size="large">
              <ion-icon slot="start" name="key-outline"></ion-icon>
              CREAR CUENTA
            </ion-button>
          } @else {
            <ion-button routerLink="/tabs/creation" size="large">
              <ion-icon slot="start" name="terminal-outline"></ion-icon>
              IR A CREACION
            </ion-button>
          }
        </div>
      </div>

      <!-- Footer -->
      <footer class="app-footer">
        <div class="qdt-divider">END OF TRANSMISSION</div>
        <p class="footer-title">DYMENSIS//CDA - SISTEMA DE GESTION RPG</p>
        <p class="footer-version">VERSION 1.0.0 // BUILD 2024</p>
        <p class="footer-ref">DOC-REF: QDT-{{ generateRef() }}</p>
      </footer>
    </ion-content>
  `,
  styles: [`
    /* Logo */
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-primary);
    }

    .logo ion-icon {
      font-size: 18px;
      color: var(--qdt-text-muted);
    }

    /* Hero Section */
    .hero-section {
      padding: 32px 20px 48px;
      border-bottom: 1px solid var(--qdt-border-subtle);
    }

    .hero-content {
      max-width: 600px;
      margin: 0 auto;
    }

    .hero-badge {
      display: inline-block;
      font-size: 10px;
      letter-spacing: 0.2em;
      color: var(--qdt-accent-amber);
      padding: 4px 12px;
      border: 1px solid var(--qdt-accent-amber-dim);
      background: rgba(217, 119, 6, 0.1);
      margin-bottom: 16px;
    }

    .hero-content h1 {
      font-size: 24px;
      font-weight: 400;
      letter-spacing: 0.15em;
      color: var(--qdt-text-primary);
      margin: 0 0 16px 0;
    }

    .hero-description {
      font-size: 13px;
      letter-spacing: 0.05em;
      color: var(--qdt-text-muted);
      line-height: 1.6;
      margin: 0 0 24px 0;
    }

    .hero-status {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 24px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-secondary);
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

    .hero-actions {
      max-width: 280px;
    }

    /* Section Header */
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 20px;
      margin-bottom: 24px;
    }

    .section-marker {
      font-size: 10px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-subtle);
      padding: 4px 8px;
      border: 1px solid var(--qdt-border-subtle);
    }

    .section-header h2 {
      font-size: 14px;
      font-weight: 400;
      letter-spacing: 0.15em;
      color: var(--qdt-text-primary);
      margin: 0;
    }

    .section-line {
      flex: 1;
      height: 1px;
      background: var(--qdt-border-subtle);
    }

    /* Features Section */
    .features-section {
      padding: 40px 0;
      border-bottom: 1px solid var(--qdt-border-subtle);
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
      padding: 0 20px;
      max-width: 900px;
      margin: 0 auto;
    }

    .feature-card {
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
      padding: 16px;
      position: relative;
      transition: all 0.2s ease;
    }

    .feature-card:hover {
      border-color: var(--qdt-border-default);
      background: var(--qdt-bg-tertiary);
    }

    .feature-icon {
      margin-bottom: 12px;
    }

    .feature-icon ion-icon {
      font-size: 24px;
      color: var(--qdt-text-muted);
    }

    .feature-content h3 {
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.15em;
      color: var(--qdt-text-primary);
      margin: 0 0 8px 0;
    }

    .feature-content p {
      font-size: 11px;
      letter-spacing: 0.05em;
      color: var(--qdt-text-muted);
      line-height: 1.5;
      margin: 0;
    }

    .feature-code {
      position: absolute;
      top: 12px;
      right: 12px;
      font-size: 9px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-subtle);
    }

    /* Universes Section */
    .universes-section {
      padding: 40px 0;
      background: rgba(0, 0, 0, 0.2);
    }

    .section-subheader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 20px;
      margin-bottom: 20px;
      font-size: 10px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-muted);
    }

    .record-count {
      color: var(--qdt-text-subtle);
    }

    .loading-container, .error-container, .empty-container {
      text-align: center;
      padding: 40px 20px;
    }

    .loading-container ion-spinner {
      margin-bottom: 12px;
      --color: var(--qdt-text-muted);
    }

    .loading-container p,
    .error-container p,
    .empty-container p {
      font-size: 11px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-muted);
      margin: 0;
    }

    .error-container ion-icon,
    .empty-container ion-icon {
      font-size: 40px;
      color: var(--qdt-text-subtle);
      margin-bottom: 12px;
    }

    .sub-text {
      font-size: 10px;
      color: var(--qdt-text-subtle);
      margin-top: 4px !important;
    }

    .universes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
      padding: 0 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .universe-card {
      background: var(--qdt-bg-secondary);
      border: 1px solid var(--qdt-border-subtle);
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .universe-card:hover {
      border-color: var(--qdt-border-default);
      transform: translateY(-2px);
    }

    .card-header {
      height: 80px;
      position: relative;
      overflow: hidden;
    }

    .card-image {
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
    }

    .card-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--qdt-bg-tertiary), var(--qdt-bg-secondary));
    }

    .card-placeholder ion-icon {
      font-size: 32px;
      color: var(--qdt-text-subtle);
    }

    .card-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 9px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-subtle);
      padding: 2px 6px;
      background: var(--qdt-bg-primary);
      border: 1px solid var(--qdt-border-subtle);
    }

    .card-content {
      padding: 12px 16px 16px;
    }

    .card-content h3 {
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.1em;
      color: var(--qdt-text-primary);
      margin: 0 0 8px 0;
      text-transform: uppercase;
    }

    .card-content .description {
      font-size: 11px;
      letter-spacing: 0.03em;
      color: var(--qdt-text-muted);
      line-height: 1.5;
      margin: 0 0 12px 0;
    }

    .card-meta {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 9px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-muted);
    }

    .meta-item ion-icon {
      font-size: 12px;
    }

    .stats-preview {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .stat-badge {
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.1em;
      padding: 2px 8px;
      border: 1px solid;
      background: var(--qdt-bg-tertiary);
      color: var(--qdt-text-secondary);
    }

    /* CTA Section */
    .cta-section {
      padding: 60px 20px;
      border-bottom: 1px solid var(--qdt-border-subtle);
    }

    .cta-content {
      max-width: 400px;
      margin: 0 auto;
      text-align: center;
    }

    .cta-content h2 {
      font-size: 18px;
      font-weight: 400;
      letter-spacing: 0.2em;
      color: var(--qdt-text-primary);
      margin: 0 0 12px 0;
    }

    .cta-content p {
      font-size: 12px;
      letter-spacing: 0.05em;
      color: var(--qdt-text-muted);
      margin: 0 0 20px 0;
    }

    .cta-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 10px;
      letter-spacing: 0.1em;
      color: var(--qdt-accent-green);
      margin-bottom: 24px;
    }

    /* Footer */
    .app-footer {
      padding: 40px 20px;
      text-align: center;
    }

    .footer-title {
      font-size: 11px;
      letter-spacing: 0.15em;
      color: var(--qdt-text-muted);
      margin: 16px 0 4px 0;
    }

    .footer-version {
      font-size: 10px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-subtle);
      margin: 0 0 4px 0;
    }

    .footer-ref {
      font-size: 9px;
      letter-spacing: 0.1em;
      color: var(--qdt-text-subtle);
      margin: 0;
    }

    /* Responsive */
    @media (min-width: 768px) {
      .hero-section {
        padding: 48px 40px 64px;
      }

      .hero-content h1 {
        font-size: 32px;
      }

      .features-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1024px) {
      .features-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);

  publicUniverses = signal<Universe[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPublicUniverses();
  }

  async loadPublicUniverses(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const universes = await this.firebaseService.getPublicUniverses();
      this.publicUniverses.set(universes);
    } catch (err: any) {
      console.error('Error loading public universes:', err);
      this.error.set('ERROR: No se pudieron cargar los universos. Verifica tu conexion.');
    } finally {
      this.loading.set(false);
    }
  }

  getStatCount(universe: Universe): number {
    return Object.keys(universe.statDefinitions || {}).length;
  }

  getTopStats(universe: Universe): Array<{ key: string; abbreviation: string; color: string }> {
    return Object.entries(universe.statDefinitions || {})
      .slice(0, 4)
      .map(([key, def]) => ({
        key,
        abbreviation: def.abbreviation,
        color: def.color || '#71717a'
      }));
  }

  getUniverseGradient(universe: Universe): string {
    const colors = Object.values(universe.statDefinitions || {})
      .slice(0, 2)
      .map(d => d.color || '#3f3f46');

    if (colors.length < 2) {
      return 'linear-gradient(135deg, #27272a, #18181b)';
    }
    return `linear-gradient(135deg, ${colors[0]}33, ${colors[1]}33)`;
  }

  generateRef(): string {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  }
}
