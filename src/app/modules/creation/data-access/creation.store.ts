import { computed, Injectable, signal } from '@angular/core';
import { Universe, Character } from '../../../core/models';
import { DynamicPhaseState, AgenticAction } from '../models/agentic-action.model';

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type CreationMode = 'idle' | 'universe' | 'character' | 'action';
export type CreationPhase = 'gathering' | 'generating' | 'reviewing' | 'adjusting' | 'confirmed';

@Injectable({ providedIn: 'root' })
export class CreationStore {
  // State signals
  private _mode = signal<CreationMode>('idle');
  private _phase = signal<CreationPhase>('gathering');
  private _messages = signal<ChatMessage[]>([]);
  private _isGenerating = signal(false);
  private _generatedUniverse = signal<Partial<Universe> | null>(null);
  private _generatedCharacter = signal<Partial<Character> | null>(null);
  private _selectedUniverseId = signal<string | null>(null);
  private _suggestedActions = signal<string[]>([]);
  private _conversationContext = signal<Record<string, any>>({});

  // Streaming state signals
  private _streamingMessage = signal<string | null>(null);
  private _isStreaming = signal(false);
  private _streamingSpeed = signal(0);
  private _streamingStartTime: number | null = null;
  private _streamingTokenCount = 0;

  // Agentic mode signals
  private _dynamicPhaseState = signal<DynamicPhaseState | null>(null);
  private _visibleActions = signal<AgenticAction[]>([]);
  private _confirmationMode = signal(false);
  private _extractionProgress = signal<number>(0);
  private _availableUniverses = signal<Universe[]>([]);
  private _validationWarnings = signal<string[]>([]);
  private _validationErrors = signal<string[]>([]);
  private _lastUserMessage = signal<string>('');
  private _agenticWelcomeShown = signal(false);

  // Image upload signals
  private _uploadedImage = signal<{ base64: string; mimeType: string } | null>(null);

  // Live preview data for character card
  private _livePreviewData = signal<Record<string, any>>({});

  // Universe selection mode
  private _showUniverseSelector = signal(false);
  private _pendingCharacterData = signal<Record<string, any>>({});

  // Public computed signals
  mode = computed(() => this._mode());
  phase = computed(() => this._phase());
  messages = computed(() => this._messages());
  isGenerating = computed(() => this._isGenerating());
  generatedUniverse = computed(() => this._generatedUniverse());
  generatedCharacter = computed(() => this._generatedCharacter());
  selectedUniverseId = computed(() => this._selectedUniverseId());
  suggestedActions = computed(() => this._suggestedActions());
  conversationContext = computed(() => this._conversationContext());

  // Streaming computed signals
  streamingMessage = computed(() => this._streamingMessage());
  isStreaming = computed(() => this._isStreaming());
  streamingSpeed = computed(() => this._streamingSpeed());

  // Agentic mode computed signals
  dynamicPhaseState = computed(() => this._dynamicPhaseState());
  visibleActions = computed(() => this._visibleActions());
  confirmationMode = computed(() => this._confirmationMode());
  extractionProgress = computed(() => this._extractionProgress());
  availableUniverses = computed(() => this._availableUniverses());
  validationWarnings = computed(() => this._validationWarnings());
  validationErrors = computed(() => this._validationErrors());
  lastUserMessage = computed(() => this._lastUserMessage());
  agenticWelcomeShown = computed(() => this._agenticWelcomeShown());

  // Image and live preview computed signals
  uploadedImage = computed(() => this._uploadedImage());
  livePreviewData = computed(() => this._livePreviewData());

  // Universe selector computed signals
  showUniverseSelector = computed(() => this._showUniverseSelector());
  pendingCharacterData = computed(() => this._pendingCharacterData());

  // Computed: whether confirmation is ready (no errors)
  canConfirm = computed(() =>
    this._confirmationMode() &&
    this._validationErrors().length === 0 &&
    (this._generatedUniverse() !== null || this._generatedCharacter() !== null)
  );

  // Computed: completeness percentage
  completenessScore = computed(() =>
    this._dynamicPhaseState()?.completenessScore || 0
  );

  // Computed derived state
  hasGeneratedContent = computed(() =>
    this._generatedUniverse() !== null || this._generatedCharacter() !== null
  );

  messageCount = computed(() => this._messages().length);

  // Actions
  setMode(mode: CreationMode): void {
    this._mode.set(mode);
    if (mode === 'idle') {
      this.reset();
    }
  }

  setPhase(phase: CreationPhase): void {
    this._phase.set(phase);
  }

  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };
    this._messages.update(messages => [...messages, newMessage]);
  }

  updateLastAssistantMessage(content: string): void {
    this._messages.update(messages => {
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
        const updated = [...messages];
        updated[lastIndex] = { ...updated[lastIndex], content };
        return updated;
      }
      return messages;
    });
  }

  setGenerating(value: boolean): void {
    this._isGenerating.set(value);
  }

  setGeneratedUniverse(universe: Partial<Universe> | null): void {
    this._generatedUniverse.set(universe);
  }

  setGeneratedCharacter(character: Partial<Character> | null): void {
    this._generatedCharacter.set(character);
  }

  setSelectedUniverseId(id: string | null): void {
    this._selectedUniverseId.set(id);
  }

  setSuggestedActions(actions: string[]): void {
    this._suggestedActions.set(actions);
  }

  updateContext(key: string, value: any): void {
    this._conversationContext.update(ctx => ({ ...ctx, [key]: value }));
  }

  clearContext(): void {
    this._conversationContext.set({});
  }

  reset(): void {
    this._mode.set('idle');
    this._phase.set('gathering');
    this._messages.set([]);
    this._isGenerating.set(false);
    this._generatedUniverse.set(null);
    this._generatedCharacter.set(null);
    this._selectedUniverseId.set(null);
    this._suggestedActions.set([]);
    this._conversationContext.set({});
    // Reset agentic mode state
    this._dynamicPhaseState.set(null);
    this._visibleActions.set([]);
    this._confirmationMode.set(false);
    this._extractionProgress.set(0);
    this._validationWarnings.set([]);
    this._validationErrors.set([]);
    this._lastUserMessage.set('');
    this._agenticWelcomeShown.set(false);
    // Reset image and live preview
    this._uploadedImage.set(null);
    this._livePreviewData.set({});
    // Reset universe selector
    this._showUniverseSelector.set(false);
    this._pendingCharacterData.set({});
  }

  // ============================================
  // AGENTIC MODE ACTIONS
  // ============================================

  setDynamicPhaseState(state: DynamicPhaseState | null): void {
    this._dynamicPhaseState.set(state);
  }

  setVisibleActions(actions: AgenticAction[]): void {
    this._visibleActions.set(actions);
  }

  setConfirmationMode(value: boolean): void {
    this._confirmationMode.set(value);
  }

  setExtractionProgress(value: number): void {
    this._extractionProgress.set(value);
  }

  setAvailableUniverses(universes: Universe[]): void {
    this._availableUniverses.set(universes);
  }

  setValidationWarnings(warnings: string[]): void {
    this._validationWarnings.set(warnings);
  }

  setValidationErrors(errors: string[]): void {
    this._validationErrors.set(errors);
  }

  setLastUserMessage(message: string): void {
    this._lastUserMessage.set(message);
  }

  setAgenticWelcomeShown(value: boolean): void {
    this._agenticWelcomeShown.set(value);
  }

  // Convenience method to enter confirmation mode with validation
  enterConfirmationMode(warnings: string[] = [], errors: string[] = []): void {
    this._confirmationMode.set(true);
    this._validationWarnings.set(warnings);
    this._validationErrors.set(errors);
    this._phase.set('reviewing');
  }

  // Exit confirmation mode
  exitConfirmationMode(): void {
    this._confirmationMode.set(false);
    this._validationWarnings.set([]);
    this._validationErrors.set([]);
    this._phase.set('adjusting');
  }

  // Image upload methods
  setUploadedImage(image: { base64: string; mimeType: string } | null): void {
    this._uploadedImage.set(image);
  }

  clearUploadedImage(): void {
    this._uploadedImage.set(null);
  }

  // Live preview data methods
  updateLivePreviewData(key: string, value: any): void {
    this._livePreviewData.update(data => ({ ...data, [key]: value }));
  }

  setLivePreviewData(data: Record<string, any>): void {
    this._livePreviewData.set(data);
  }

  clearLivePreviewData(): void {
    this._livePreviewData.set({});
  }

  // Universe selector methods
  setShowUniverseSelector(value: boolean): void {
    this._showUniverseSelector.set(value);
  }

  setPendingCharacterData(data: Record<string, any>): void {
    this._pendingCharacterData.set(data);
  }

  clearPendingCharacterData(): void {
    this._pendingCharacterData.set({});
  }

  // Serialize conversation for AI context
  getConversationHistory(): Array<{ role: string; content: string }> {
    return this._messages().map(m => ({
      role: m.role,
      content: m.content
    }));
  }

  // Streaming actions
  startStreaming(): void {
    this._isStreaming.set(true);
    this._streamingMessage.set('');
    this._streamingSpeed.set(0);
    this._streamingStartTime = Date.now();
    this._streamingTokenCount = 0;
  }

  appendStreamingToken(token: string): void {
    this._streamingMessage.update(current => (current ?? '') + token);
    this._streamingTokenCount++;

    // Update speed every 10 tokens
    if (this._streamingTokenCount % 10 === 0 && this._streamingStartTime) {
      const elapsed = (Date.now() - this._streamingStartTime) / 1000;
      if (elapsed > 0) {
        this._streamingSpeed.set(Math.round(this._streamingTokenCount / elapsed));
      }
    }
  }

  updateStreamingSpeed(tokensPerSec: number): void {
    this._streamingSpeed.set(Math.round(tokensPerSec));
  }

  finishStreaming(): void {
    const finalContent = this._streamingMessage();
    if (finalContent) {
      // Add the completed message to the messages array
      this.addMessage({
        role: 'assistant',
        content: finalContent
      });
    }
    this._isStreaming.set(false);
    this._streamingMessage.set(null);
    this._streamingSpeed.set(0);
    this._streamingStartTime = null;
    this._streamingTokenCount = 0;
  }

  cancelStreaming(): void {
    this._isStreaming.set(false);
    this._streamingMessage.set(null);
    this._streamingSpeed.set(0);
    this._streamingStartTime = null;
    this._streamingTokenCount = 0;
  }
}
