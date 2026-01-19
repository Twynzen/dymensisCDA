import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { CreationStore } from '../data-access/creation.store';
import { CreationService } from '../services/creation.service';
import { ChatMessageComponent } from '../ui/chat-message.component';
import { TypingIndicatorComponent } from '../ui/typing-indicator.component';
import { StreamingMessageComponent } from '../ui/streaming-message.component';
import { UniversePreviewComponent } from '../ui/universe-preview.component';
import { CharacterPreviewComponent } from '../ui/character-preview.component';
import { QuickActionsComponent } from '../ui/quick-actions.component';
import { PhaseProgressComponent } from '../ui/phase-progress.component';
import { ManualUniverseFormComponent } from '../ui/manual-universe-form.component';
import { ManualCharacterFormComponent } from '../ui/manual-character-form.component';
import { AgenticWelcomeComponent, WelcomeOption } from '../ui/agentic-welcome.component';
import { AgenticActionsComponent } from '../ui/agentic-actions.component';
import { ConfirmationFlowComponent, ValidationMessage } from '../ui/confirmation-flow.component';
import { HelpTooltipComponent, HelpExample } from '../../../shared/ui/help-tooltip.component';
import { WebLLMService } from '../../../core/services/webllm.service';
import { AuthService } from '../../../core/services/auth.service';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { CharacterStore } from '../../characters/data-access/character.store';
import { Universe, Character, CharacterSkill } from '../../../core/models';
import { AgenticAction } from '../models/agentic-action.model';
import { LiveCharacterCardComponent, LivePreviewData } from '../ui/live-character-card.component';
import { UniverseSelectorComponent } from '../ui/universe-selector.component';

export type CreationMode = 'idle' | 'universe' | 'character' | 'action';
export type CreationApproach = 'manual' | 'ai';

@Component({
  selector: 'app-creation-hub',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChatMessageComponent,
    TypingIndicatorComponent,
    StreamingMessageComponent,
    UniversePreviewComponent,
    CharacterPreviewComponent,
    QuickActionsComponent,
    PhaseProgressComponent,
    ManualUniverseFormComponent,
    ManualCharacterFormComponent,
    AgenticWelcomeComponent,
    AgenticActionsComponent,
    ConfirmationFlowComponent,
    HelpTooltipComponent,
    LiveCharacterCardComponent,
    UniverseSelectorComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        @if (creationStore.mode() !== 'idle') {
          <ion-buttons slot="start">
            <ion-button (click)="resetToIdle()">
              <ion-icon slot="icon-only" name="close"></ion-icon>
            </ion-button>
          </ion-buttons>
        }
        <ion-title>{{ getTitle() }}</ion-title>
        @if (creationStore.mode() !== 'idle' && creationApproach() === 'ai') {
          <ion-buttons slot="end">
            <ion-button (click)="resetConversation()">
              <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
      @if (creationStore.mode() !== 'idle' && creationApproach() === 'ai') {
        <app-phase-progress
          [progress]="creationService.getPhaseProgress()"
        ></app-phase-progress>
      }
    </ion-header>

    <ion-content #contentArea>
      @if (creationStore.mode() === 'idle') {
        <!-- Pantalla inicial con opciones -->
        <div class="idle-container">
          <!-- Debug: Auth status indicator -->
          <div class="auth-debug-indicator">
            @if (authService.loading()) {
              <ion-chip color="warning">
                <ion-spinner name="crescent"></ion-spinner>
                <ion-label>Verificando sesión...</ion-label>
              </ion-chip>
            } @else if (authService.isAuthenticated()) {
              <ion-chip color="success">
                <ion-icon name="checkmark-circle"></ion-icon>
                <ion-label>{{ authService.user()?.email }}</ion-label>
              </ion-chip>
            } @else {
              <ion-chip color="danger">
                <ion-icon name="alert-circle"></ion-icon>
                <ion-label>No autenticado</ion-label>
              </ion-chip>
            }
          </div>

          <div class="welcome-section">
            <ion-icon name="color-wand-outline" class="welcome-icon"></ion-icon>
            <h1>¿Qué quieres crear?</h1>
            <p>Elige cómo quieres crear tu contenido</p>
          </div>

          <!-- Selector de modo -->
          <div class="approach-selector">
            <ion-segment [(ngModel)]="selectedApproach" (ionChange)="onApproachChange()">
              <ion-segment-button value="manual">
                <ion-icon name="create-outline"></ion-icon>
                <ion-label>Formularios</ion-label>
              </ion-segment-button>
              <ion-segment-button value="ai">
                <ion-icon name="sparkles-outline"></ion-icon>
                <ion-label>Asistente IA</ion-label>
              </ion-segment-button>
            </ion-segment>

            <div class="approach-info">
              @if (selectedApproach === 'manual') {
                <ion-chip color="success">
                  <ion-icon name="checkmark-circle"></ion-icon>
                  <ion-label>Siempre disponible</ion-label>
                </ion-chip>
                <p>Completa formularios paso a paso para crear universos y personajes de forma estructurada.</p>
              } @else {
                @if (webLLMService.isReady()) {
                  <ion-chip color="success">
                    <ion-icon name="checkmark-circle"></ion-icon>
                    <ion-label>Modelo IA listo</ion-label>
                  </ion-chip>
                  <p>La IA te guiará con una conversación natural para crear contenido personalizado.</p>
                  <ion-note color="warning" class="experimental-warning">
                    <ion-icon name="warning-outline"></ion-icon>
                    <strong>Experimental:</strong> Esta funcion usa IA local y esta en desarrollo activo.
                    Es posible que las respuestas no siempre sean las esperadas.
                  </ion-note>
                } @else {
                  <ion-chip color="warning">
                    <ion-icon name="alert-circle"></ion-icon>
                    <ion-label>Requiere cargar modelo</ion-label>
                  </ion-chip>
                  <p>Necesitas cargar el modelo de IA (~2GB) para usar este modo.</p>
                }
              }
            </div>
          </div>

          <div class="options-grid">
            <ion-card button (click)="startCreation('universe')" class="option-card">
              <ion-card-content>
                <ion-icon name="planet-outline" color="primary"></ion-icon>
                <h2>Nuevo Universo</h2>
                <p>Crea un mundo con sus propias reglas, estadísticas y sistema de progresión</p>
                <div class="phase-count">
                  {{ selectedApproach === 'manual' ? '5 pasos' : '6 fases guiadas' }}
                </div>
              </ion-card-content>
            </ion-card>

            <ion-card button (click)="startCreation('character')" class="option-card">
              <ion-card-content>
                <ion-icon name="person-outline" color="secondary"></ion-icon>
                <h2>Nuevo Personaje</h2>
                <p>Crea un personaje con trasfondo, stats y habilidades únicas</p>
                <div class="phase-count">
                  {{ selectedApproach === 'manual' ? '7 pasos' : '7 fases guiadas' }}
                </div>
              </ion-card-content>
            </ion-card>

            @if (selectedApproach === 'ai') {
              <ion-card button (click)="startCreation('action')" class="option-card" [disabled]="!webLLMService.isReady()">
                <ion-card-content>
                  <ion-icon name="sparkles-outline" color="tertiary"></ion-icon>
                  <h2>Analizar Acción</h2>
                  <p>Describe una acción y la IA ajustará las estadísticas del personaje</p>
                  <div class="phase-count">Análisis instantáneo</div>
                </ion-card-content>
              </ion-card>
            }
          </div>

          @if (selectedApproach === 'ai' && !webLLMService.isReady()) {
            <div class="model-status">
              @if (webLLMService.isLoading()) {
                <ion-progress-bar [value]="webLLMService.loadingProgress() / 100"></ion-progress-bar>
                <p>{{ webLLMService.loadingText() }}</p>
              } @else if (webLLMService.error()) {
                <ion-chip color="danger">
                  <ion-icon name="alert-circle"></ion-icon>
                  <ion-label>{{ webLLMService.error() }}</ion-label>
                </ion-chip>
              } @else {
                <ion-button (click)="loadModel()" expand="block" fill="outline">
                  <ion-icon slot="start" name="cloud-download"></ion-icon>
                  Cargar Modelo de IA
                </ion-button>
                <p class="model-note">Primera vez: ~2GB de descarga</p>
              }
            </div>
          }
        </div>
      } @else if (creationApproach() === 'manual') {
        <!-- Modo Manual (Formularios) -->
        @if (creationStore.mode() === 'universe') {
          <app-manual-universe-form
            (created)="onUniverseCreated($event)"
            (cancelled)="resetToIdle()"
          ></app-manual-universe-form>
        } @else if (creationStore.mode() === 'character') {
          <app-manual-character-form
            (created)="onCharacterCreated($event)"
            (cancelled)="resetToIdle()"
            (goToCreateUniverse)="switchToUniverseCreation()"
          ></app-manual-character-form>
        }
      } @else {
        <!-- Modo IA (Chat conversacional) -->

        <!-- Agentic Welcome Screen (when idle in AI mode) -->
        @if (creationStore.mode() === 'idle' && !creationStore.agenticWelcomeShown()) {
          <app-agentic-welcome
            [availableUniverses]="universeStore.allUniverses()"
            [showUniverseSelection]="false"
            (optionSelected)="onAgenticOptionSelected($event)"
            (freeInputSubmitted)="onAgenticFreeInput($event)"
            (universeSelected)="onUniverseSelectedForCharacter($event)"
            (exampleInserted)="onExampleInserted($event)"
          ></app-agentic-welcome>
        } @else {
          <!-- Chat Interface -->
          <div class="chat-container">
            @for (message of creationStore.messages(); track message.id) {
              <app-chat-message
                [message]="message"
                [isTyping]="false"
              ></app-chat-message>
            }

            <!-- Mensaje en streaming -->
            @if (creationStore.isStreaming()) {
              <app-streaming-message
                [content]="creationStore.streamingMessage()"
                [speed]="creationStore.streamingSpeed()"
              ></app-streaming-message>
            }

            @if (creationStore.isGenerating() && !creationStore.isStreaming()) {
              <app-typing-indicator></app-typing-indicator>
            }

            <!-- Confirmation Flow (replaces individual previews) -->
            @if (creationStore.confirmationMode()) {
              <app-confirmation-flow
                [entityType]="creationStore.mode() === 'universe' ? 'universo' : 'personaje'"
                [universe]="creationStore.generatedUniverse()"
                [character]="creationStore.generatedCharacter()"
                [errors]="getValidationErrors()"
                [warnings]="getValidationWarnings()"
                (confirm)="confirmCreation()"
                (adjust)="requestAdjustment(creationStore.mode() === 'universe' ? 'universe' : 'character')"
                (regenerate)="regenerate()"
                (discard)="discardCreation()"
                (imageUploaded)="onConfirmationImageUploaded($event)"
              ></app-confirmation-flow>
            } @else {
              <!-- Legacy previews for non-confirmation mode -->
              @if (creationStore.generatedUniverse() && !creationStore.confirmationMode()) {
                <app-universe-preview
                  [universe]="creationStore.generatedUniverse()!"
                  (confirm)="confirmUniverse()"
                  (adjust)="requestAdjustment('universe')"
                  (regenerate)="regenerate()"
                ></app-universe-preview>
              }

              @if (creationStore.generatedCharacter() && !creationStore.confirmationMode()) {
                <app-character-preview
                  [character]="creationStore.generatedCharacter()!"
                  (confirm)="confirmCharacter()"
                  (adjust)="requestAdjustment('character')"
                  (regenerate)="regenerate()"
                ></app-character-preview>
              }
            }

            <div class="scroll-anchor" #scrollAnchor></div>
          </div>
        }
      }
    </ion-content>

    @if (creationStore.mode() !== 'idle' && creationApproach() === 'ai') {
      <ion-footer>
        <ion-toolbar>
          <!-- Live Character Card (shows when we have name + universe) -->
          @if (shouldShowLiveCard()) {
            <app-live-character-card
              [data]="getLivePreviewData()"
              [completenessPercent]="creationStore.extractionProgress()"
            ></app-live-character-card>
          }

          <!-- Universe Selector (shows when character needs universe) -->
          @if (creationStore.showUniverseSelector()) {
            <app-universe-selector
              [universes]="creationStore.availableUniverses()"
              [title]="'Elige un universo para tu personaje:'"
              [showCreateOption]="true"
              (universeSelected)="onUniverseSelected($event)"
              (createNew)="onCreateUniverseRequested()"
            ></app-universe-selector>
          }

          <!-- Agentic Actions (replaces quick actions with smarter actions) -->
          @if (creationStore.visibleActions().length > 0) {
            <app-agentic-actions
              [allActions]="creationStore.visibleActions()"
              [showProgress]="true"
              [completenessScore]="creationStore.completenessScore()"
              (actionTriggered)="onAgenticAction($event)"
              (imageSelected)="onAgenticImageSelected($event)"
              (textInputRequested)="onQuickAction($event)"
            ></app-agentic-actions>
          } @else if (creationStore.suggestedActions().length > 0) {
            <app-quick-actions
              [actions]="creationStore.suggestedActions()"
              (actionSelected)="onQuickAction($event)"
            ></app-quick-actions>
          }

          <div class="input-container">
            <!-- Help tooltip -->
            <app-help-tooltip
              title="Tip de creación"
              message="Mientras más detalles des, más campos se llenarán automáticamente."
              (exampleSelected)="onHelpExampleSelected($event)"
            ></app-help-tooltip>

            <!-- Botón de imagen o preview de imagen subida -->
            @if (creationStore.uploadedImage()) {
              <div class="uploaded-image-preview">
                <img [src]="creationStore.uploadedImage()?.base64" alt="Preview" />
                <div class="image-preview-actions">
                  <ion-button fill="clear" size="small" (click)="triggerImageUpload()">
                    <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
                  </ion-button>
                  <ion-button fill="clear" size="small" color="danger" (click)="clearUploadedImage()">
                    <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                  </ion-button>
                </div>
              </div>
            } @else {
              <ion-button fill="clear" class="attach-button" (click)="triggerImageUpload()">
                <ion-icon slot="icon-only" name="image-outline"></ion-icon>
              </ion-button>
            }
            <input
              type="file"
              #fileInput
              accept="image/*"
              (change)="onImageSelected($event)"
              style="display: none"
            >

            <ion-textarea
              [(ngModel)]="userInput"
              placeholder="Escribe tu mensaje..."
              [autoGrow]="true"
              [rows]="1"
              [maxlength]="1000"
              (keydown.enter)="onEnterKey($any($event))"
            ></ion-textarea>

            <ion-button
              fill="clear"
              [disabled]="!userInput().trim() || creationStore.isGenerating()"
              (click)="sendMessage()"
            >
              <ion-icon slot="icon-only" name="send"></ion-icon>
            </ion-button>
          </div>
        </ion-toolbar>
      </ion-footer>
    }

    <!-- Toast (success or error) -->
    <ion-toast
      [isOpen]="showSuccessToast()"
      [message]="successMessage()"
      [duration]="4000"
      position="top"
      [color]="toastColor()"
      (didDismiss)="showSuccessToast.set(false)"
    ></ion-toast>
  `,
  styles: [`
    .idle-container {
      display: flex;
      flex-direction: column;
      padding: 20px;
      min-height: 100%;
    }

    .auth-debug-indicator {
      display: flex;
      justify-content: center;
      margin-bottom: 8px;
    }

    .auth-debug-indicator ion-chip {
      font-size: 12px;
    }

    .auth-debug-indicator ion-spinner {
      width: 14px;
      height: 14px;
      margin-right: 4px;
    }

    .welcome-section {
      text-align: center;
      padding: 30px 20px 20px 20px;
    }

    .welcome-icon {
      font-size: 56px;
      color: var(--ion-color-primary);
      margin-bottom: 12px;
    }

    .welcome-section h1 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 6px 0;
    }

    .welcome-section p {
      opacity: 0.7;
      margin: 0;
      font-size: 14px;
    }

    .approach-selector {
      margin: 16px 0;
    }

    .approach-selector ion-segment {
      margin-bottom: 12px;
    }

    .approach-info {
      text-align: center;
      padding: 12px;
      background: rgba(var(--ion-color-primary-rgb), 0.05);
      border-radius: 12px;
    }

    .approach-info p {
      margin: 8px 0 0 0;
      font-size: 13px;
      opacity: 0.8;
    }

    .experimental-warning {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-top: 12px;
      padding: 10px 12px;
      background: rgba(var(--ion-color-warning-rgb), 0.15);
      border-radius: 8px;
      font-size: 12px;
      text-align: left;
      line-height: 1.4;
    }

    .experimental-warning ion-icon {
      font-size: 16px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .options-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }

    .option-card {
      margin: 0;
      --background: rgba(var(--ion-color-primary-rgb), 0.05);
      transition: transform 0.2s ease;
    }

    .option-card:active {
      transform: scale(0.98);
    }

    .option-card[disabled] {
      opacity: 0.5;
      pointer-events: none;
    }

    .option-card ion-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px;
    }

    .option-card ion-icon {
      font-size: 40px;
      margin-bottom: 12px;
    }

    .option-card h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .option-card p {
      font-size: 14px;
      opacity: 0.7;
      margin: 0 0 8px 0;
    }

    .phase-count {
      font-size: 12px;
      color: var(--ion-color-primary);
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      padding: 4px 12px;
      border-radius: 12px;
      margin-top: 4px;
    }

    .model-status {
      margin-top: auto;
      padding: 20px;
      text-align: center;
    }

    .model-status p {
      margin-top: 8px;
      opacity: 0.7;
      font-size: 14px;
    }

    .model-note {
      font-size: 12px !important;
      opacity: 0.5 !important;
    }

    .model-ready {
      margin-top: auto;
      padding: 20px;
      text-align: center;
    }

    .chat-container {
      display: flex;
      flex-direction: column;
      padding: 16px;
      padding-bottom: 20px;
      min-height: 100%;
    }

    .scroll-anchor {
      height: 1px;
      flex-shrink: 0;
    }

    ion-footer {
      --background: var(--ion-background-color);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    ion-footer ion-toolbar {
      padding: 8px 12px;
      --min-height: auto;
      --padding-top: 0;
      --padding-bottom: 0;
    }

    .input-container {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 24px;
      padding: 4px 4px 4px 8px;
      max-height: 150px;
      overflow: hidden;
    }

    .attach-button {
      --padding-start: 8px;
      --padding-end: 8px;
      margin: 0;
      opacity: 0.7;
    }

    .attach-button:hover {
      opacity: 1;
    }

    .input-container ion-textarea {
      --padding-top: 8px;
      --padding-bottom: 8px;
      font-size: 15px;
      max-height: 100px;
      min-height: 36px;
      flex: 1;
      overflow-y: auto;
    }

    .input-container ion-button {
      --padding-start: 8px;
      --padding-end: 8px;
      margin: 0;
    }

    /* Uploaded image preview styles */
    .uploaded-image-preview {
      position: relative;
      width: 48px;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .uploaded-image-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .uploaded-image-preview .image-preview-actions {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 2px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .uploaded-image-preview:hover .image-preview-actions {
      opacity: 1;
    }

    .uploaded-image-preview .image-preview-actions ion-button {
      --padding-start: 4px;
      --padding-end: 4px;
      --color: white;
    }
  `]
})
export class CreationHubComponent implements OnInit, AfterViewChecked {
  creationStore = inject(CreationStore);
  creationService = inject(CreationService);
  webLLMService = inject(WebLLMService);
  authService = inject(AuthService);
  universeStore = inject(UniverseStore);
  private characterStore = inject(CharacterStore);
  private alertController = inject(AlertController);

  @ViewChild('contentArea') contentArea!: ElementRef;
  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  userInput = signal('');
  selectedApproach: CreationApproach = 'manual';
  creationApproach = signal<CreationApproach>('manual');

  showSuccessToast = signal(false);
  successMessage = signal('');
  toastColor = signal<'success' | 'danger' | 'warning'>('success');

  private shouldScroll = false;

  ngOnInit(): void {
    // Check if WebLLM is ready to suggest AI mode
    if (this.webLLMService.isReady()) {
      this.selectedApproach = 'ai';
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scrollAnchor) {
      this.scrollAnchor.nativeElement.scrollIntoView({ behavior: 'smooth' });
      this.shouldScroll = false;
    }
  }

  getTitle(): string {
    const mode = this.creationStore.mode();
    const approach = this.creationApproach();

    if (mode === 'idle') return 'Creación';

    const prefix = approach === 'manual' ? '' : '';
    switch (mode) {
      case 'universe': return `${prefix}Crear Universo`;
      case 'character': return `${prefix}Crear Personaje`;
      case 'action': return 'Analizando Acción';
      default: return 'Creación';
    }
  }

  onApproachChange(): void {
    // Just update UI, don't start anything yet
  }

  async loadModel(): Promise<void> {
    try {
      await this.webLLMService.initialize();
    } catch (e) {
      console.error('Error loading model:', e);
    }
  }

  async startCreation(mode: 'universe' | 'character' | 'action'): Promise<void> {
    // Set the approach based on selection
    this.creationApproach.set(this.selectedApproach);

    if (this.selectedApproach === 'ai') {
      // Show beta warning modal first
      const shouldContinue = await this.showAIBetaWarning();
      if (!shouldContinue) {
        return;
      }

      // AI mode - check if model is ready
      if (!this.webLLMService.isReady() && mode !== 'action') {
        // Fallback to manual mode if AI not ready
        this.creationApproach.set('manual');
      }
      this.creationService.startCreation(mode);
    } else {
      // Manual mode - just set the mode in the store
      this.creationStore.reset();
      this.creationStore.setMode(mode);
    }

    this.shouldScroll = true;
  }

  /**
   * Shows a beta warning alert for AI creation mode
   */
  private async showAIBetaWarning(): Promise<boolean> {
    // Check if user has already dismissed the warning this session
    const dismissedKey = 'ai_beta_warning_dismissed';
    if (sessionStorage.getItem(dismissedKey)) {
      return true;
    }

    const alert = await this.alertController.create({
      header: 'Modo IA en Desarrollo',
      subHeader: 'Funcionalidad Experimental',
      message: `
        <div style="text-align: left;">
          <p>Este flujo de creación con <strong>Asistente IA</strong> está actualmente en desarrollo activo.</p>
          <br>
          <p><strong>Es posible que encuentres:</strong></p>
          <ul style="margin-left: 16px;">
            <li>Respuestas inesperadas</li>
            <li>Errores de extracción de datos</li>
            <li>Comportamientos inconsistentes</li>
          </ul>
          <br>
          <p>Por favor, <strong>reporta cualquier error</strong> que encuentres para ayudarnos a mejorar.</p>
          <br>
          <p style="color: var(--ion-color-medium);">Gracias por probar esta funcionalidad experimental.</p>
        </div>
      `,
      cssClass: 'beta-warning-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Entendido, continuar',
          role: 'confirm',
          handler: () => {
            // Remember that user has seen the warning this session
            sessionStorage.setItem(dismissedKey, 'true');
          }
        }
      ]
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  resetToIdle(): void {
    this.creationStore.reset();
    this.creationApproach.set(this.selectedApproach);
  }

  resetConversation(): void {
    const currentMode = this.creationStore.mode();
    this.creationStore.reset();
    if (currentMode !== 'idle') {
      this.startCreation(currentMode as 'universe' | 'character' | 'action');
    }
  }

  switchToUniverseCreation(): void {
    this.creationStore.reset();
    this.creationStore.setMode('universe');
  }

  // Manual Mode Handlers
  async onUniverseCreated(universeData: Partial<Universe>): Promise<void> {
    try {
      console.log('=== onUniverseCreated START ===');
      console.log('Auth state at submit time:', {
        loading: this.authService.loading(),
        isAuthenticated: this.authService.isAuthenticated(),
        userId: this.authService.userId(),
        user: this.authService.user()
      });
      console.log('Creating universe with ALL data:', universeData.name);
      console.log('Data includes:', {
        statDefinitions: Object.keys(universeData.statDefinitions || {}),
        initialPoints: universeData.initialPoints,
        hasProgressionRules: !!universeData.progressionRules?.length,
        hasAwakeningSystem: !!universeData.awakeningSystem,
        hasRaceSystem: !!universeData.raceSystem,
        isPublic: universeData.isPublic
      });

      // Pass ALL data at once - atomic operation, no two-step process
      const universeId = await this.universeStore.createUniverse(universeData);

      if (!universeId) {
        // Failed to create - check store error for details
        const storeError = this.universeStore.error();
        console.error('Failed to create universe - no universeId returned.', storeError);
        this.toastColor.set('danger');
        this.successMessage.set(storeError || 'Error: No se pudo crear el universo');
        this.showSuccessToast.set(true);
        return;
      }

      console.log('Universe created successfully with ID:', universeId);
      this.toastColor.set('success');
      this.successMessage.set(`¡${universeData.name} creado exitosamente!`);
      this.showSuccessToast.set(true);
      this.resetToIdle();
    } catch (error) {
      console.error('Error creating universe:', error);
      this.toastColor.set('danger');
      this.successMessage.set('Error al crear el universo. Revisa la consola.');
      this.showSuccessToast.set(true);
    }
  }

  async onCharacterCreated(characterData: Partial<Character> & { initialSkills?: Omit<CharacterSkill, 'id'>[] }): Promise<void> {
    try {
      console.log('Creating character:', characterData.name);

      if (!characterData.name || !characterData.universeId || !characterData.stats) {
        throw new Error('Missing required character data');
      }

      // Extract initialSkills before passing to store (not part of Character model)
      const { initialSkills, ...characterDataWithoutSkills } = characterData;

      // Pass the complete character data to the store
      // This includes: raceId, baseStats, bonusStats, derivedStats, awakening (calculated), etc.
      const characterId = await this.characterStore.createCharacter(characterDataWithoutSkills);

      if (!characterId) {
        console.error('Failed to create character - no characterId returned. User may not be authenticated.');
        this.toastColor.set('danger');
        this.successMessage.set('Error: Debes iniciar sesión para crear personajes');
        this.showSuccessToast.set(true);
        return;
      }

      console.log('Character created with ID:', characterId);

      // Add initial skills if any were provided
      if (initialSkills && initialSkills.length > 0) {
        console.log(`Adding ${initialSkills.length} initial skills...`);
        for (const skill of initialSkills) {
          try {
            await this.characterStore.addSkill(characterId, skill);
            console.log(`Added skill: ${skill.name}`);
          } catch (skillError) {
            console.error(`Error adding skill ${skill.name}:`, skillError);
            // Continue with other skills even if one fails
          }
        }
      }

      this.toastColor.set('success');
      const skillsMsg = initialSkills?.length ? ` con ${initialSkills.length} habilidad${initialSkills.length > 1 ? 'es' : ''}` : '';
      this.successMessage.set(`¡${characterData.name} creado exitosamente${skillsMsg}!`);
      this.showSuccessToast.set(true);
      this.resetToIdle();
    } catch (error) {
      console.error('Error creating character:', error);
      this.toastColor.set('danger');
      this.successMessage.set('Error al crear el personaje. Revisa la consola.');
      this.showSuccessToast.set(true);
    }
  }

  // AI Mode Handlers
  async sendMessage(): Promise<void> {
    const message = this.userInput().trim();
    if (!message) return;

    this.userInput.set('');

    // Use agentic processing for smart extraction and responses
    console.log('[CreationHub] Sending message with agentic processing:', message.substring(0, 50));
    await this.creationService.processUserMessageAgentic(message);
    this.shouldScroll = true;
  }

  onEnterKey(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onQuickAction(action: string): void {
    this.userInput.set(action);
    this.sendMessage();
  }

  async confirmUniverse(): Promise<void> {
    await this.creationService.confirmCreation();
    this.shouldScroll = true;
  }

  async confirmCharacter(): Promise<void> {
    await this.creationService.confirmCreation();
    this.shouldScroll = true;
  }

  requestAdjustment(type: 'universe' | 'character'): void {
    this.creationService.requestAdjustment(type);
    this.shouldScroll = true;
  }

  regenerate(): void {
    this.creationService.regenerate();
    this.shouldScroll = true;
  }

  // Image handling
  triggerImageUpload(): void {
    this.fileInput.nativeElement.click();
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      // Store the uploaded image for preview
      this.creationStore.setUploadedImage({ base64, mimeType: file.type });
      // Also update live preview data
      this.creationStore.updateLivePreviewData('avatar', base64);
      await this.creationService.processImage(base64, file.type);
      this.shouldScroll = true;
    };
    reader.readAsDataURL(file);

    input.value = '';
  }

  clearUploadedImage(): void {
    this.creationStore.clearUploadedImage();
    this.creationStore.updateLivePreviewData('avatar', null);
  }

  // ============================================
  // LIVE PREVIEW CARD METHODS
  // ============================================

  /**
   * Determines if the live character card should be shown
   * Only show when we have a name AND either a selected universe or we're in character mode
   */
  shouldShowLiveCard(): boolean {
    const mode = this.creationStore.mode();
    if (mode !== 'character') return false;

    const previewData = this.creationStore.livePreviewData();
    const context = this.creationStore.conversationContext();

    // Show if we have name and universe
    const hasName = !!(previewData['name'] || context['collectedData']?.name);
    const hasUniverse = !!(previewData['selectedUniverse'] ||
                          context['collectedData']?.selectedUniverse ||
                          this.creationStore.selectedUniverseId());

    return hasName && hasUniverse;
  }

  /**
   * Gets the data for the live preview card
   */
  getLivePreviewData(): LivePreviewData {
    const previewData = this.creationStore.livePreviewData();
    const context = this.creationStore.conversationContext();
    const collectedData = context['collectedData'] || {};

    // Merge data from multiple sources, giving priority to livePreviewData
    const selectedUniverseId = this.creationStore.selectedUniverseId();
    let selectedUniverse = previewData['selectedUniverse'] || collectedData.selectedUniverse;

    // If we have an ID but no universe object, try to find it
    if (!selectedUniverse && selectedUniverseId) {
      selectedUniverse = this.universeStore.allUniverses().find(u => u.id === selectedUniverseId);
    }

    return {
      name: previewData['name'] || collectedData.name,
      avatar: previewData['avatar'] || collectedData.avatarUrl || this.creationStore.uploadedImage()?.base64,
      description: previewData['description'] || collectedData.description,
      backstory: previewData['backstory'] || collectedData.backstory,
      class: previewData['class'] || collectedData.class,
      stats: previewData['stats'] || collectedData.stats,
      selectedUniverse,
      universeId: selectedUniverseId || collectedData.universeId
    };
  }

  // ============================================
  // UNIVERSE SELECTOR HANDLERS
  // ============================================

  onUniverseSelected(universe: Universe): void {
    this.creationService.onUniverseSelectedFromSelector(universe);
    this.shouldScroll = true;
  }

  onCreateUniverseRequested(): void {
    this.creationService.onCreateUniverseRequested();
    this.shouldScroll = true;
  }

  // ============================================
  // AGENTIC MODE HANDLERS
  // ============================================

  /**
   * Handle option selection from agentic welcome screen
   */
  onAgenticOptionSelected(option: WelcomeOption): void {
    if (option.id === 'universe') {
      this.startCreation('universe');
    } else if (option.id === 'character') {
      this.startCreation('character');
    }
  }

  /**
   * Handle free-form input from agentic welcome screen
   */
  async onAgenticFreeInput(message: string): Promise<void> {
    await this.creationService.processInitialMessage(message);
    this.shouldScroll = true;
  }

  /**
   * Handle universe selection for character creation
   */
  onUniverseSelectedForCharacter(universe: Universe): void {
    this.creationStore.setSelectedUniverseId(universe.id ?? null);
    this.creationStore.updateContext('selectedUniverse', universe);
    this.startCreation('character');
  }

  /**
   * Handle example insertion from help tooltip
   */
  onExampleInserted(text: string): void {
    this.userInput.set(text);
  }

  /**
   * Handle help example selection
   */
  onHelpExampleSelected(example: HelpExample): void {
    this.userInput.set(example.text);
  }

  /**
   * Handle agentic action execution
   */
  async onAgenticAction(action: AgenticAction): Promise<void> {
    switch (action.type) {
      case 'confirm_preview':
        if (action.id === 'confirm_save') {
          await this.confirmCreation();
        } else {
          this.creationService.skipToConfirmation();
        }
        break;

      case 'edit_field':
        this.requestAdjustment(this.creationStore.mode() === 'universe' ? 'universe' : 'character');
        break;

      case 'regenerate':
        this.regenerate();
        break;

      case 'skip_phase':
        this.creationService.advanceToNextPhase();
        break;

      case 'undo':
        // TODO: Implement undo functionality
        break;

      case 'quick_select':
        this.onQuickAction(action.label);
        break;
    }

    this.shouldScroll = true;
  }

  /**
   * Handle image selection from agentic actions
   */
  async onAgenticImageSelected(data: { base64: string; mimeType: string; action: AgenticAction }): Promise<void> {
    await this.creationService.processImage(data.base64, data.mimeType);
    this.shouldScroll = true;
  }

  /**
   * Handle confirmation from confirmation flow
   */
  async confirmCreation(): Promise<void> {
    await this.creationService.confirmCreation();
    this.shouldScroll = true;
  }

  /**
   * Handle discard from confirmation flow
   */
  discardCreation(): void {
    this.creationStore.setGeneratedUniverse(null);
    this.creationStore.setGeneratedCharacter(null);
    this.creationStore.exitConfirmationMode();
    this.creationStore.addMessage({
      role: 'assistant',
      content: '¿Qué te gustaría cambiar? Puedo ajustar cualquier detalle.'
    });
    this.shouldScroll = true;
  }

  /**
   * Handle image upload from confirmation flow
   */
  async onConfirmationImageUploaded(data: { base64: string; mimeType: string }): Promise<void> {
    const mode = this.creationStore.mode();
    if (mode === 'universe') {
      const universe = this.creationStore.generatedUniverse();
      if (universe) {
        this.creationStore.setGeneratedUniverse({
          ...universe,
          coverImage: data.base64
        });
      }
    } else if (mode === 'character') {
      const character = this.creationStore.generatedCharacter();
      if (character) {
        this.creationStore.setGeneratedCharacter({
          ...character,
          avatar: { ...character.avatar, photoUrl: data.base64 }
        } as Partial<Character>);
      }
    }

    // Re-validate after image upload
    const { warnings } = this.validateAfterImageUpload();
    this.creationStore.setValidationWarnings(warnings);
  }

  /**
   * Get validation errors for confirmation flow
   */
  getValidationErrors(): ValidationMessage[] {
    return this.creationStore.validationErrors().map(msg => ({
      type: 'error' as const,
      message: msg
    }));
  }

  /**
   * Get validation warnings for confirmation flow
   */
  getValidationWarnings(): ValidationMessage[] {
    return this.creationStore.validationWarnings().map(msg => ({
      type: 'warning' as const,
      message: msg
    }));
  }

  /**
   * Validate after image upload
   */
  private validateAfterImageUpload(): { warnings: string[] } {
    const warnings: string[] = [];
    const mode = this.creationStore.mode();

    if (mode === 'universe') {
      const universe = this.creationStore.generatedUniverse();
      if (!universe?.statDefinitions || Object.keys(universe.statDefinitions).length === 0) {
        warnings.push('Sin estadísticas definidas - se usarán las predeterminadas');
      }
    } else {
      const character = this.creationStore.generatedCharacter();
      if (!character?.stats || Object.keys(character.stats).length === 0) {
        warnings.push('Sin estadísticas asignadas');
      }
    }

    return { warnings };
  }
}
