import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
  IonProgressBar, IonChip, IonLabel, IonListHeader, IonItem, IonSelect, IonSelectOption,
  IonTextarea, IonSpinner, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonBadge, AlertController, ToastController
} from '@ionic/angular/standalone';
import { WebLLMService, AIAnalysisResult, StatSuggestion } from '../../../core/services/webllm.service';
import { AIFallbackService, AIProvider } from '../../../core/services/ai-fallback.service';
import { CharacterStore } from '../../characters/data-access/character.store';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { fadeInAnimation } from '../../../shared/animations/stat-animations';

@Component({
  selector: 'app-action-analyzer',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
    IonProgressBar, IonChip, IonLabel, IonListHeader, IonItem, IonSelect, IonSelectOption,
    IonTextarea, IonSpinner, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonBadge
  ],
  animations: [fadeInAnimation],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Asistente IA</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="showInfo()">
            <ion-icon slot="icon-only" name="information-circle"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- AI Status Section -->
      <div class="ai-status-section">
        <div class="status-card" [class.ready]="webLLMService.isReady()" [class.loading]="webLLMService.isLoading()">
          <div class="status-header">
            <ion-icon [name]="getStatusIcon()"></ion-icon>
            <span class="status-text">{{ getStatusText() }}</span>
          </div>

          @if (webLLMService.isLoading()) {
            <div class="loading-progress">
              <ion-progress-bar [value]="webLLMService.loadingProgress() / 100"></ion-progress-bar>
              <span class="progress-text">{{ webLLMService.loadingText() }}</span>
            </div>
          }

          @if (!webLLMService.isReady() && !webLLMService.isLoading()) {
            <ion-button
              expand="block"
              (click)="initializeAI()"
              [disabled]="!canUseWebLLM()"
            >
              <ion-icon slot="start" name="download"></ion-icon>
              Cargar Modelo IA (~2GB)
            </ion-button>

            @if (!canUseWebLLM()) {
              <p class="warning-text">
                <ion-icon name="warning"></ion-icon>
                {{ webLLMService.error() || 'WebGPU no disponible' }}
              </p>
            }
          }

          @if (webLLMService.isReady()) {
            <div class="model-info">
              <ion-chip color="success">
                <ion-icon name="checkmark-circle"></ion-icon>
                <ion-label>{{ webLLMService.getModelInfo().id }}</ion-label>
              </ion-chip>
            </div>
          }
        </div>
      </div>

      <!-- Character Selection -->
      <div class="character-section">
        <ion-list-header>
          <ion-label>Personaje Activo</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-select
            [(ngModel)]="selectedCharacterId"
            label="Seleccionar Personaje"
            labelPlacement="floating"
            placeholder="Elige un personaje"
            (ionChange)="onCharacterChange()"
          >
            @for (char of characterStore.characters(); track char.id) {
              <ion-select-option [value]="char.id">
                {{ char.name }} (Nv. {{ char.progression.level }})
              </ion-select-option>
            }
          </ion-select>
        </ion-item>
      </div>

      <!-- Action Input -->
      @if (selectedCharacter()) {
        <div class="action-section" @fadeIn>
          <ion-list-header>
            <ion-label>Describir Acción</ion-label>
          </ion-list-header>

          <ion-item>
            <ion-textarea
              [(ngModel)]="actionText"
              label="¿Qué hizo tu personaje?"
              labelPlacement="floating"
              placeholder="Ej: Entrené toda la mañana levantando rocas pesadas..."
              [rows]="4"
              [maxlength]="500"
            ></ion-textarea>
          </ion-item>

          <div class="action-buttons">
            <ion-button
              expand="block"
              (click)="analyzeAction()"
              [disabled]="!canAnalyze() || analyzing()"
            >
              @if (analyzing()) {
                <ion-spinner name="crescent"></ion-spinner>
              } @else {
                <ion-icon slot="start" name="sparkles-outline"></ion-icon>
                Analizar Acción
              }
            </ion-button>

            <p class="provider-hint">
              Usando: {{ currentProvider() === 'webllm' ? 'IA Local (Phi-3)' : 'Análisis por Reglas' }}
            </p>
          </div>
        </div>
      }

      <!-- Analysis Results -->
      @if (analysisResult()) {
        <div class="results-section" @fadeIn>
          <ion-list-header>
            <ion-label>Resultado del Análisis</ion-label>
            <ion-chip [color]="getConfidenceColor()">
              {{ (analysisResult()!.confidence * 100).toFixed(0) }}% confianza
            </ion-chip>
          </ion-list-header>

          <ion-card>
            <ion-card-header>
              <ion-card-title>Análisis</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>{{ analysisResult()!.analysis }}</p>
            </ion-card-content>
          </ion-card>

          @if (analysisResult()!.stat_changes.length > 0) {
            <ion-list-header>
              <ion-label>Cambios Sugeridos</ion-label>
            </ion-list-header>

            <ion-list>
              @for (change of analysisResult()!.stat_changes; track change.stat) {
                <ion-item>
                  <ion-icon name="trending-up" slot="start" color="success"></ion-icon>
                  <ion-label>
                    <h2>{{ getStatName(change.stat) }}</h2>
                    <p>{{ change.reason }}</p>
                  </ion-label>
                  <ion-badge slot="end" color="success">+{{ change.change }}</ion-badge>
                </ion-item>
              }
            </ion-list>

            <div class="apply-section">
              <ion-button expand="block" color="success" (click)="applyChanges()">
                <ion-icon slot="start" name="checkmark-circle"></ion-icon>
                Aplicar Cambios
              </ion-button>
              <ion-button expand="block" fill="outline" (click)="discardAnalysis()">
                Descartar
              </ion-button>
            </div>
          } @else {
            <div class="no-changes">
              <ion-icon name="information-circle"></ion-icon>
              <p>No se detectaron cambios de estadísticas para esta acción</p>
            </div>
          }
        </div>
      }

      @if (characterStore.characters().length === 0) {
        <div class="empty-state">
          <ion-icon name="person-add-outline"></ion-icon>
          <h2>Sin personajes</h2>
          <p>Crea un personaje para usar el asistente IA</p>
          <ion-button (click)="goToCharacters()">
            <ion-icon slot="start" name="add"></ion-icon>
            Crear Personaje
          </ion-button>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .ai-status-section {
      padding: 16px;
    }

    .status-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .status-card.ready {
      border-color: var(--ion-color-success);
      background: rgba(var(--ion-color-success-rgb), 0.1);
    }

    .status-card.loading {
      border-color: var(--ion-color-primary);
    }

    .status-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .status-header ion-icon {
      font-size: 24px;
    }

    .status-text {
      font-weight: 600;
      font-size: 16px;
    }

    .loading-progress {
      margin-top: 12px;
    }

    .progress-text {
      font-size: 12px;
      opacity: 0.7;
      display: block;
      margin-top: 6px;
    }

    .warning-text {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--ion-color-warning);
      margin-top: 12px;
    }

    .model-info {
      margin-top: 12px;
    }

    .character-section, .action-section {
      padding: 0 16px;
    }

    .action-buttons {
      padding: 16px 0;
    }

    .provider-hint {
      text-align: center;
      font-size: 12px;
      opacity: 0.6;
      margin-top: 8px;
    }

    .results-section {
      padding: 16px;
    }

    .apply-section {
      padding: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .no-changes {
      text-align: center;
      padding: 30px 20px;
      opacity: 0.6;
    }

    .no-changes ion-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      padding: 20px;
      text-align: center;
    }

    .empty-state ion-icon {
      font-size: 80px;
      opacity: 0.3;
      margin-bottom: 20px;
    }

    .empty-state h2 {
      margin: 0 0 8px 0;
    }

    .empty-state p {
      opacity: 0.6;
      margin-bottom: 20px;
    }
  `]
})
export class ActionAnalyzerComponent implements OnInit {
  webLLMService = inject(WebLLMService);
  aiFallbackService = inject(AIFallbackService);
  characterStore = inject(CharacterStore);
  universeStore = inject(UniverseStore);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  selectedCharacterId = '';
  actionText = '';
  analyzing = signal(false);
  analysisResult = signal<AIAnalysisResult | null>(null);
  currentProvider = signal<AIProvider>('rules-only');
  webGPUSupported = signal(false);

  selectedCharacter = computed(() =>
    this.characterStore.characters().find(c => c.id === this.selectedCharacterId)
  );

  selectedUniverse = computed(() => {
    const character = this.selectedCharacter();
    if (!character) return null;
    return this.universeStore.allUniverses().find(u => u.id === character.universeId);
  });

  ngOnInit(): void {
    this.loadData();
    this.checkWebGPU();
  }

  async loadData(): Promise<void> {
    await Promise.all([
      this.characterStore.loadCharacters(),
      this.universeStore.loadUniverses()
    ]);

    // Auto-select first character
    if (this.characterStore.characters().length > 0 && !this.selectedCharacterId) {
      this.selectedCharacterId = this.characterStore.characters()[0].id!;
    }
  }

  async checkWebGPU(): Promise<void> {
    const status = await this.webLLMService.checkWebGPUSupport();
    this.webGPUSupported.set(status.supported);

    const provider = await this.aiFallbackService.getAvailableProvider();
    this.currentProvider.set(provider);
  }

  canUseWebLLM(): boolean {
    return this.webGPUSupported() && !this.webLLMService.error();
  }

  canAnalyze(): boolean {
    return (
      this.selectedCharacterId.length > 0 &&
      this.actionText.trim().length > 10
    );
  }

  getStatusIcon(): string {
    if (this.webLLMService.isLoading()) return 'cloud-download';
    if (this.webLLMService.isReady()) return 'checkmark-circle';
    if (this.webLLMService.error()) return 'alert-circle';
    return 'cloud-offline';
  }

  getStatusText(): string {
    if (this.webLLMService.isLoading()) return 'Descargando modelo...';
    if (this.webLLMService.isReady()) return 'IA Lista';
    if (this.webLLMService.error()) return 'Error de IA';
    return 'IA no cargada';
  }

  async initializeAI(): Promise<void> {
    try {
      await this.webLLMService.initialize();
      this.currentProvider.set('webllm');
      await this.showToast('Modelo de IA cargado correctamente', 'success');
    } catch (error) {
      await this.showToast('Error al cargar el modelo', 'danger');
    }
  }

  onCharacterChange(): void {
    this.analysisResult.set(null);
    this.actionText = '';
  }

  async analyzeAction(): Promise<void> {
    const character = this.selectedCharacter();
    const universe = this.selectedUniverse();

    if (!character || !universe) return;

    this.analyzing.set(true);
    this.analysisResult.set(null);

    try {
      const { result, provider } = await this.aiFallbackService.analyzeAction(
        this.actionText,
        {
          name: character.name,
          stats: character.stats,
          progression: character.progression
        },
        universe.progressionRules
      );

      this.analysisResult.set(result);
      this.currentProvider.set(provider);
    } catch (error) {
      await this.showToast('Error al analizar la acción', 'danger');
    } finally {
      this.analyzing.set(false);
    }
  }

  getStatName(statKey: string): string {
    const universe = this.selectedUniverse();
    return universe?.statDefinitions[statKey]?.name ?? statKey;
  }

  getConfidenceColor(): string {
    const confidence = this.analysisResult()?.confidence ?? 0;
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'danger';
  }

  async applyChanges(): Promise<void> {
    const result = this.analysisResult();
    const character = this.selectedCharacter();

    if (!result || !character || result.stat_changes.length === 0) return;

    const alert = await this.alertController.create({
      header: 'Aplicar Cambios',
      message: '¿Confirmas aplicar estos cambios de estadísticas?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aplicar',
          handler: async () => {
            await this.characterStore.applyStatChanges(
              character.id!,
              result.stat_changes,
              this.actionText,
              {
                suggestedChanges: result.stat_changes,
                confidence: result.confidence
              }
            );

            await this.showToast('Cambios aplicados correctamente', 'success');
            this.discardAnalysis();
          }
        }
      ]
    });

    await alert.present();
  }

  discardAnalysis(): void {
    this.analysisResult.set(null);
    this.actionText = '';
  }

  goToCharacters(): void {
    this.router.navigate(['/tabs/characters']);
  }

  async showInfo(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Asistente IA',
      message: `
        <p>El asistente de IA analiza las acciones de tus personajes y sugiere aumentos de estadísticas basados en las reglas del universo.</p>
        <p><strong>IA Local (Phi-3):</strong> Requiere WebGPU y ~2GB de descarga. Análisis más preciso.</p>
        <p><strong>Análisis por Reglas:</strong> Funciona sin IA, usando coincidencia de palabras clave.</p>
      `,
      buttons: ['Entendido']
    });

    await alert.present();
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
