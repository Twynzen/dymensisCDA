import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FirebaseService } from '../../core/services/firebase.service';
import { AuthService } from '../../core/services/auth.service';
import { Universe } from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <div class="logo">
            <ion-icon name="planet-outline"></ion-icon>
            <span>DymensisCDA</span>
          </div>
        </ion-title>
        <ion-buttons slot="end">
          @if (authService.isAuthenticated()) {
            <ion-button routerLink="/tabs/characters">
              <ion-icon slot="start" name="apps"></ion-icon>
              Mi App
            </ion-button>
          } @else {
            <ion-button routerLink="/login" fill="solid" color="primary">
              Iniciar Sesión
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-content">
          <h1>Crea tus propios universos RPG</h1>
          <p>
            Diseña mundos únicos con sistemas de estadísticas personalizados,
            crea personajes memorables y gestiona su progresión.
          </p>
          <div class="hero-actions">
            @if (authService.isAuthenticated()) {
              <ion-button routerLink="/tabs/creation" size="large" expand="block">
                <ion-icon slot="start" name="add-circle"></ion-icon>
                Empezar a Crear
              </ion-button>
            } @else {
              <ion-button routerLink="/login" size="large" expand="block">
                <ion-icon slot="start" name="log-in"></ion-icon>
                Comenzar Gratis
              </ion-button>
            }
          </div>
        </div>
      </div>

      <!-- Features Section -->
      <div class="features-section">
        <h2>¿Qué puedes hacer?</h2>
        <div class="features-grid">
          <div class="feature-card">
            <ion-icon name="planet-outline" color="primary"></ion-icon>
            <h3>Crear Universos</h3>
            <p>Define las reglas de tu mundo: estadísticas, rangos y sistema de progresión</p>
          </div>
          <div class="feature-card">
            <ion-icon name="person-outline" color="secondary"></ion-icon>
            <h3>Diseñar Personajes</h3>
            <p>Crea personajes con stats únicos, trasfondo y personalidad</p>
          </div>
          <div class="feature-card">
            <ion-icon name="color-wand-outline" color="tertiary"></ion-icon>
            <h3>Creación</h3>
            <p>Utiliza herramientas agénticas para generar contenido a partir de tus bocetos de idea</p>
          </div>
          <div class="feature-card">
            <ion-icon name="share-social" color="success"></ion-icon>
            <h3>Compartir</h3>
            <p>Comparte tus creaciones con la comunidad o mantenlas privadas</p>
          </div>
        </div>
      </div>

      <!-- Public Universes Section -->
      <div class="universes-section">
        <div class="section-header">
          <h2>Universos de la Comunidad</h2>
          <p>Explora universos creados por otros usuarios para inspirarte</p>
        </div>

        @if (loading()) {
          <div class="loading-container">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Cargando universos...</p>
          </div>
        } @else if (error()) {
          <div class="error-container">
            <ion-icon name="alert-circle" color="danger"></ion-icon>
            <p>{{ error() }}</p>
            <ion-button fill="outline" (click)="loadPublicUniverses()">
              Reintentar
            </ion-button>
          </div>
        } @else if (publicUniverses().length === 0) {
          <div class="empty-container">
            <ion-icon name="planet-outline"></ion-icon>
            <p>Aún no hay universos públicos</p>
            <p class="sub-text">¡Sé el primero en compartir tu creación!</p>
          </div>
        } @else {
          <div class="universes-grid">
            @for (universe of publicUniverses(); track universe.id) {
              <ion-card class="universe-card">
                @if (universe.coverImage) {
                  <div class="card-header card-header-image" [style.backgroundImage]="'url(' + universe.coverImage + ')'">
                  </div>
                } @else {
                  <div class="card-header" [style.background]="getUniverseGradient(universe)">
                    <ion-icon name="planet-outline"></ion-icon>
                  </div>
                }
                <ion-card-content>
                  <h3>{{ universe.name }}</h3>
                  <p class="description">{{ universe.description | slice:0:100 }}{{ universe.description.length > 100 ? '...' : '' }}</p>

                  <div class="universe-meta">
                    <ion-chip size="small">
                      <ion-icon name="stats-chart"></ion-icon>
                      <ion-label>{{ getStatCount(universe) }} stats</ion-label>
                    </ion-chip>
                    @if (universe.awakeningSystem?.enabled) {
                      <ion-chip size="small" color="primary">
                        <ion-icon name="trophy"></ion-icon>
                        <ion-label>{{ universe.awakeningSystem!.levels.length }} rangos</ion-label>
                      </ion-chip>
                    }
                    @if (universe.raceSystem?.enabled) {
                      <ion-chip size="small" color="secondary">
                        <ion-icon name="people"></ion-icon>
                        <ion-label>{{ universe.raceSystem!.races.length }} razas</ion-label>
                      </ion-chip>
                    }
                  </div>

                  <div class="stats-preview">
                    @for (stat of getTopStats(universe); track stat.key) {
                      <span class="stat-badge" [style.borderColor]="stat.color">
                        {{ stat.abbreviation }}
                      </span>
                    }
                  </div>
                </ion-card-content>
              </ion-card>
            }
          </div>
        }
      </div>

      <!-- CTA Section -->
      <div class="cta-section">
        <h2>¿Listo para crear tu universo?</h2>
        <p>Únete a la comunidad y empieza a dar vida a tus mundos imaginarios</p>
        @if (!authService.isAuthenticated()) {
          <ion-button routerLink="/login" size="large">
            Crear Cuenta Gratis
          </ion-button>
        } @else {
          <ion-button routerLink="/tabs/creation" size="large">
            Ir a Creación
          </ion-button>
        }
      </div>

      <!-- Footer -->
      <footer class="app-footer">
        <p>DymensisCDA - Tu gestor de universos RPG</p>
        <p class="version">v1.0.0</p>
      </footer>
    </ion-content>
  `,
  styles: [`
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: bold;
    }

    .logo ion-icon {
      font-size: 24px;
      color: var(--ion-color-primary);
    }

    .hero-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
      position: relative;
      overflow: hidden;
    }

    .hero-content {
      text-align: center;
      max-width: 600px;
      z-index: 1;
    }

    .hero-content h1 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 16px 0;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-content p {
      font-size: 16px;
      opacity: 0.8;
      margin: 0 0 24px 0;
      line-height: 1.6;
    }

    .hero-actions {
      max-width: 300px;
      margin: 0 auto;
    }

    .features-section {
      padding: 40px 20px;
    }

    .features-section h2 {
      text-align: center;
      margin: 0 0 24px 0;
      font-size: 22px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      max-width: 800px;
      margin: 0 auto;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.05);
      padding: 20px;
      border-radius: 16px;
      text-align: center;
    }

    .feature-card ion-icon {
      font-size: 40px;
      margin-bottom: 12px;
    }

    .feature-card h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
    }

    .feature-card p {
      margin: 0;
      font-size: 13px;
      opacity: 0.7;
      line-height: 1.4;
    }

    .universes-section {
      padding: 40px 20px;
      background: rgba(0, 0, 0, 0.2);
    }

    .section-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .section-header h2 {
      margin: 0 0 8px 0;
      font-size: 22px;
    }

    .section-header p {
      margin: 0;
      opacity: 0.7;
    }

    .loading-container, .error-container, .empty-container {
      text-align: center;
      padding: 40px 20px;
    }

    .loading-container ion-spinner {
      margin-bottom: 12px;
    }

    .error-container ion-icon, .empty-container ion-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .sub-text {
      font-size: 13px;
      opacity: 0.5;
    }

    .universes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .universe-card {
      margin: 0;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .universe-card:hover {
      transform: translateY(-4px);
    }

    .card-header {
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-header ion-icon {
      font-size: 40px;
      color: rgba(255, 255, 255, 0.8);
    }

    .card-header-image {
      background-size: cover;
      background-position: center;
    }

    .universe-card h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
    }

    .universe-card .description {
      font-size: 13px;
      opacity: 0.7;
      margin: 0 0 12px 0;
      line-height: 1.4;
    }

    .universe-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .stats-preview {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .stat-badge {
      font-size: 11px;
      font-weight: bold;
      padding: 4px 8px;
      border-radius: 4px;
      border: 2px solid;
      background: rgba(255, 255, 255, 0.1);
    }

    .cta-section {
      text-align: center;
      padding: 60px 20px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
    }

    .cta-section h2 {
      margin: 0 0 12px 0;
      font-size: 24px;
    }

    .cta-section p {
      margin: 0 0 24px 0;
      opacity: 0.8;
    }

    .app-footer {
      text-align: center;
      padding: 30px 20px;
      opacity: 0.5;
    }

    .app-footer p {
      margin: 0 0 4px 0;
      font-size: 13px;
    }

    .app-footer .version {
      font-size: 11px;
    }

    @media (min-width: 768px) {
      .hero-section {
        flex-direction: row;
        padding: 60px 40px;
      }

      .hero-content {
        text-align: left;
        flex: 1;
      }

      .hero-content h1 {
        font-size: 36px;
      }

      .hero-actions {
        margin: 0;
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
      this.error.set('No se pudieron cargar los universos. Verifica tu conexión.');
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
        color: def.color || '#4CAF50'
      }));
  }

  getUniverseGradient(universe: Universe): string {
    const colors = Object.values(universe.statDefinitions || {})
      .slice(0, 2)
      .map(d => d.color || '#667eea');

    if (colors.length < 2) {
      return 'linear-gradient(135deg, #667eea, #764ba2)';
    }
    return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
  }
}
