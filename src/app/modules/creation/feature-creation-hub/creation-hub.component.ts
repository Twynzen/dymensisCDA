import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CreationStore } from '../data-access/creation.store';
import { CreationService } from '../services/creation.service';
import { ChatMessageComponent } from '../ui/chat-message.component';
import { TypingIndicatorComponent } from '../ui/typing-indicator.component';
import { UniversePreviewComponent } from '../ui/universe-preview.component';
import { CharacterPreviewComponent } from '../ui/character-preview.component';
import { QuickActionsComponent } from '../ui/quick-actions.component';
import { PhaseProgressComponent } from '../ui/phase-progress.component';
import { ManualUniverseFormComponent } from '../ui/manual-universe-form.component';
import { ManualCharacterFormComponent } from '../ui/manual-character-form.component';
import { WebLLMService } from '../../../core/services/webllm.service';
import { AuthService } from '../../../core/services/auth.service';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { CharacterStore } from '../../characters/data-access/character.store';
import { Universe, Character } from '../../../core/models';

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
    UniversePreviewComponent,
    CharacterPreviewComponent,
    QuickActionsComponent,
    PhaseProgressComponent,
    ManualUniverseFormComponent,
    ManualCharacterFormComponent
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
                  {{ selectedApproach === 'manual' ? '6 pasos' : '7 fases guiadas' }}
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
        <div class="chat-container">
          @for (message of creationStore.messages(); track message.id) {
            <app-chat-message
              [message]="message"
              [isTyping]="false"
            ></app-chat-message>
          }

          @if (creationStore.isGenerating()) {
            <app-typing-indicator></app-typing-indicator>
          }

          @if (creationStore.generatedUniverse()) {
            <app-universe-preview
              [universe]="creationStore.generatedUniverse()!"
              (confirm)="confirmUniverse()"
              (adjust)="requestAdjustment('universe')"
              (regenerate)="regenerate()"
            ></app-universe-preview>
          }

          @if (creationStore.generatedCharacter()) {
            <app-character-preview
              [character]="creationStore.generatedCharacter()!"
              (confirm)="confirmCharacter()"
              (adjust)="requestAdjustment('character')"
              (regenerate)="regenerate()"
            ></app-character-preview>
          }

          <div class="scroll-anchor" #scrollAnchor></div>
        </div>
      }
    </ion-content>

    @if (creationStore.mode() !== 'idle' && creationApproach() === 'ai') {
      <ion-footer>
        <ion-toolbar>
          <div class="input-container">
            <!-- Botón de imagen -->
            <ion-button fill="clear" class="attach-button" (click)="triggerImageUpload()">
              <ion-icon slot="icon-only" name="image-outline"></ion-icon>
            </ion-button>
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
          @if (creationStore.suggestedActions().length > 0) {
            <app-quick-actions
              [actions]="creationStore.suggestedActions()"
              (actionSelected)="onQuickAction($event)"
            ></app-quick-actions>
          }
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
    }

    .scroll-anchor {
      height: 1px;
    }

    ion-footer ion-toolbar {
      padding: 8px 12px;
    }

    .input-container {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 24px;
      padding: 4px 4px 4px 8px;
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
      max-height: 120px;
      flex: 1;
    }

    .input-container ion-button {
      --padding-start: 8px;
      --padding-end: 8px;
      margin: 0;
    }
  `]
})
export class CreationHubComponent implements OnInit, AfterViewChecked {
  creationStore = inject(CreationStore);
  creationService = inject(CreationService);
  webLLMService = inject(WebLLMService);
  authService = inject(AuthService);
  private universeStore = inject(UniverseStore);
  private characterStore = inject(CharacterStore);

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

  startCreation(mode: 'universe' | 'character' | 'action'): void {
    // Set the approach based on selection
    this.creationApproach.set(this.selectedApproach);

    if (this.selectedApproach === 'ai') {
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

  async onCharacterCreated(characterData: Partial<Character>): Promise<void> {
    try {
      console.log('Creating character:', characterData.name);

      if (!characterData.name || !characterData.universeId || !characterData.stats) {
        throw new Error('Missing required character data');
      }

      // Pass the complete character data to the store
      // This includes: raceId, baseStats, bonusStats, derivedStats, awakening (calculated), etc.
      const characterId = await this.characterStore.createCharacter(characterData);

      if (!characterId) {
        console.error('Failed to create character - no characterId returned. User may not be authenticated.');
        this.toastColor.set('danger');
        this.successMessage.set('Error: Debes iniciar sesión para crear personajes');
        this.showSuccessToast.set(true);
        return;
      }

      console.log('Character created with ID:', characterId);
      this.toastColor.set('success');
      this.successMessage.set(`¡${characterData.name} creado exitosamente!`);
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
    await this.creationService.processUserMessage(message);
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
      await this.creationService.processImage(base64, file.type);
      this.shouldScroll = true;
    };
    reader.readAsDataURL(file);

    input.value = '';
  }
}
