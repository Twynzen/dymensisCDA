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
import { WebLLMService } from '../../../core/services/webllm.service';

export type CreationMode = 'idle' | 'universe' | 'character' | 'action';

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
    PhaseProgressComponent
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
        @if (creationStore.mode() !== 'idle') {
          <ion-buttons slot="end">
            <ion-button (click)="resetConversation()">
              <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
      @if (creationStore.mode() !== 'idle') {
        <app-phase-progress
          [progress]="creationService.getPhaseProgress()"
        ></app-phase-progress>
      }
    </ion-header>

    <ion-content #contentArea>
      @if (creationStore.mode() === 'idle') {
        <!-- Pantalla inicial con opciones -->
        <div class="idle-container">
          <div class="welcome-section">
            <ion-icon name="color-wand-outline" class="welcome-icon"></ion-icon>
            <h1>¿Qué quieres crear?</h1>
            <p>La IA te guiará paso a paso para crear contenido personalizado</p>
          </div>

          <div class="options-grid">
            <ion-card button (click)="startCreation('universe')" class="option-card">
              <ion-card-content>
                <ion-icon name="planet" color="primary"></ion-icon>
                <h2>Nuevo Universo</h2>
                <p>Crea un mundo con sus propias reglas, estadísticas y sistema de progresión</p>
                <div class="phase-count">6 fases guiadas</div>
              </ion-card-content>
            </ion-card>

            <ion-card button (click)="startCreation('character')" class="option-card">
              <ion-card-content>
                <ion-icon name="person" color="secondary"></ion-icon>
                <h2>Nuevo Personaje</h2>
                <p>Crea un personaje con trasfondo, stats y habilidades únicas</p>
                <div class="phase-count">7 fases guiadas</div>
              </ion-card-content>
            </ion-card>

            <ion-card button (click)="startCreation('action')" class="option-card">
              <ion-card-content>
                <ion-icon name="sparkles" color="tertiary"></ion-icon>
                <h2>Analizar Acción</h2>
                <p>Describe una acción y la IA ajustará las estadísticas del personaje</p>
                <div class="phase-count">Análisis instantáneo</div>
              </ion-card-content>
            </ion-card>
          </div>

          @if (!webLLMService.isReady()) {
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
          } @else {
            <div class="model-ready">
              <ion-chip color="success">
                <ion-icon name="checkmark-circle"></ion-icon>
                <ion-label>Modelo de IA listo</ion-label>
              </ion-chip>
            </div>
          }
        </div>
      } @else {
        <!-- Chat conversacional -->
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

    @if (creationStore.mode() !== 'idle') {
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
  `,
  styles: [`
    .idle-container {
      display: flex;
      flex-direction: column;
      padding: 20px;
      min-height: 100%;
    }

    .welcome-section {
      text-align: center;
      padding: 40px 20px;
    }

    .welcome-icon {
      font-size: 64px;
      color: var(--ion-color-primary);
      margin-bottom: 16px;
    }

    .welcome-section h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    .welcome-section p {
      opacity: 0.7;
      margin: 0;
    }

    .options-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
    }

    .option-card {
      margin: 0;
      --background: rgba(var(--ion-color-primary-rgb), 0.05);
      transition: transform 0.2s ease;
    }

    .option-card:active {
      transform: scale(0.98);
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

  @ViewChild('contentArea') contentArea!: ElementRef;
  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  userInput = signal('');
  private shouldScroll = false;

  ngOnInit(): void {
    // Auto-load model if not ready
    if (!this.webLLMService.isReady() && !this.webLLMService.isLoading()) {
      // Optionally auto-load
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scrollAnchor) {
      this.scrollAnchor.nativeElement.scrollIntoView({ behavior: 'smooth' });
      this.shouldScroll = false;
    }
  }

  getTitle(): string {
    switch (this.creationStore.mode()) {
      case 'universe': return 'Creando Universo';
      case 'character': return 'Creando Personaje';
      case 'action': return 'Analizando Acción';
      default: return 'Creación';
    }
  }

  async loadModel(): Promise<void> {
    try {
      await this.webLLMService.initialize();
    } catch (e) {
      console.error('Error loading model:', e);
    }
  }

  startCreation(mode: 'universe' | 'character' | 'action'): void {
    this.creationService.startCreation(mode);
    this.shouldScroll = true;
  }

  resetToIdle(): void {
    this.creationStore.reset();
  }

  resetConversation(): void {
    const currentMode = this.creationStore.mode();
    this.creationStore.reset();
    if (currentMode !== 'idle') {
      this.startCreation(currentMode as 'universe' | 'character' | 'action');
    }
  }

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

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await this.creationService.processImage(base64, file.type);
      this.shouldScroll = true;
    };
    reader.readAsDataURL(file);

    // Limpiar el input para permitir subir la misma imagen de nuevo
    input.value = '';
  }
}
