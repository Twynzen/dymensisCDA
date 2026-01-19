import { Injectable, inject, signal, computed } from '@angular/core';
import {
  OrchestrationState,
  OrchestrationResult,
  OrchestratorConfig,
  DEFAULT_ORCHESTRATOR_CONFIG,
  OrchestrationMode,
  OrchestrationPhase,
  OrchestrationEvent,
  SessionSummary,
  QuickEditRequest,
  createInitialState,
  generateSessionId
} from '../../models';
import { Universe, Character } from '../../models';
import { ExtractedField, DetectedIntent } from '../../models';
import { IntentDetectorService } from './intent-detector.service';
import { FormSchemaService } from './form-schema.service';
import { EntityValidatorService } from './entity-validator.service';
import { IncrementalEditorService } from './incremental-editor.service';
import { AgenticPromptBuilderService } from './agentic-prompt-builder.service';
import { PromptContext, ConversationMessage } from '../../models';

// Logger prefix for filtering
const LOG_PREFIX = '[AIOrchestrator]';

/**
 * AIOrchestratorService
 * Main coordinator for the agentic AI system
 * Manages sessions, processes messages, and coordinates all AI services
 */
@Injectable({ providedIn: 'root' })
export class AIOrchestratorService {
  private intentDetector = inject(IntentDetectorService);
  private formSchema = inject(FormSchemaService);
  private validator = inject(EntityValidatorService);
  private editor = inject(IncrementalEditorService);
  private promptBuilder = inject(AgenticPromptBuilderService);

  private config: OrchestratorConfig = DEFAULT_ORCHESTRATOR_CONFIG;

  // Logging helpers
  private log(message: string, data?: unknown): void {
    console.log(`${LOG_PREFIX} ${message}`, data !== undefined ? data : '');
  }
  private logWarn(message: string, data?: unknown): void {
    console.warn(`${LOG_PREFIX} ⚠️ ${message}`, data !== undefined ? data : '');
  }
  private logError(message: string, data?: unknown): void {
    console.error(`${LOG_PREFIX} ❌ ${message}`, data !== undefined ? data : '');
  }

  /** Active sessions */
  private sessions = signal<Map<string, OrchestrationState>>(new Map());

  /** Current active session ID */
  private _currentSessionId = signal<string | null>(null);

  /** Event log for analytics */
  private eventLog: OrchestrationEvent[] = [];

  /** Computed: Current session state */
  readonly currentSession = computed(() => {
    const id = this._currentSessionId();
    return id ? this.sessions().get(id) ?? null : null;
  });

  /** Computed: Active session count */
  readonly activeSessionCount = computed(() => {
    return Array.from(this.sessions().values()).filter(s => s.isActive).length;
  });

  /**
   * Updates configuration
   */
  configure(config: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Starts a new orchestration session
   */
  startSession(
    mode: OrchestrationMode,
    config?: Partial<OrchestratorConfig>,
    existingEntity?: Partial<Universe> | Partial<Character>
  ): string {
    this.log(`========== STARTING SESSION ==========`);
    this.log(`Mode: ${mode}`);
    this.log(`Existing entity: ${existingEntity ? 'yes' : 'no'}`);

    const sessionConfig = { ...this.config, ...config };
    const sessionId = generateSessionId();
    const state = createInitialState(sessionId, mode, sessionConfig);

    this.log(`Session ID: ${sessionId}`);
    this.log(`Initial phase: ${state.phase}`);
    this.log(`Creation phase ID: ${state.creationPhaseId}`);

    if (existingEntity) {
      state.generatedEntity = existingEntity;
      state.phase = 'adjusting';
      this.log(`Entity provided - setting phase to 'adjusting'`);
    }

    this.sessions.update(sessions => {
      const updated = new Map(sessions);
      updated.set(sessionId, state);
      return updated;
    });

    this._currentSessionId.set(sessionId);
    this.logEvent('session_start', sessionId, { mode });

    this.log(`Session started successfully`);
    return sessionId;
  }

  /**
   * Ends a session
   */
  endSession(sessionId: string): void {
    const session = this.sessions().get(sessionId);
    if (!session) return;

    this.sessions.update(sessions => {
      const updated = new Map(sessions);
      const state = updated.get(sessionId);
      if (state) {
        state.isActive = false;
      }
      return updated;
    });

    this.logEvent('session_end', sessionId, {});

    if (this._currentSessionId() === sessionId) {
      this._currentSessionId.set(null);
    }
  }

  /**
   * Gets a session by ID
   */
  getSession(sessionId: string): OrchestrationState | null {
    return this.sessions().get(sessionId) ?? null;
  }

  /**
   * Processes a user message
   */
  async processMessage(sessionId: string, message: string): Promise<OrchestrationResult> {
    this.log(`========== PROCESSING MESSAGE ==========`);
    this.log(`Session ID: ${sessionId}`);
    this.log(`Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);

    const session = this.sessions().get(sessionId);
    if (!session) {
      this.logError(`Session not found: ${sessionId}`);
      return this.errorResult('Session not found or inactive');
    }
    if (!session.isActive) {
      this.logError(`Session inactive: ${sessionId}`);
      return this.errorResult('Session not found or inactive');
    }

    this.log(`Session mode: ${session.mode}`);
    this.log(`Session phase: ${session.phase}`);
    this.log(`Creation phase: ${session.creationPhaseId}`);

    // Update last activity
    this.updateSession(sessionId, { lastActivityAt: new Date() });

    // Detect intent
    this.log(`Detecting intent...`);
    const intent = this.intentDetector.detectIntent(message, {
      currentTarget: session.mode === 'edit' ? 'universe' : session.mode as any
    });

    this.log(`Detected intent: ${intent.action}`);
    this.log(`Intent confidence: ${intent.confidence}`);
    this.log(`Detected fields: ${intent.fields.map(f => f.field).join(', ') || 'none'}`);
    this.log(`Needs clarification: ${intent.needsClarification}`);

    // Update session with intent
    this.updateSession(sessionId, { lastIntent: intent });

    // Route based on intent action
    this.log(`Routing to handler: ${intent.action}`);
    let result: OrchestrationResult;

    switch (intent.action) {
      case 'create':
        result = await this.handleCreateIntent(sessionId, intent, message);
        break;
      case 'edit':
        result = this.handleEditIntent(sessionId, intent, message);
        break;
      case 'confirm':
        result = await this.handleConfirmIntent(sessionId);
        break;
      case 'cancel':
        result = this.handleCancelIntent(sessionId);
        break;
      case 'query':
        result = this.handleQueryIntent(sessionId, intent, message);
        break;
      case 'delete':
        result = this.handleDeleteIntent(sessionId, intent);
        break;
      default:
        result = await this.handleUnknownIntent(sessionId, message);
    }

    this.log(`Handler result: success=${result.success}`);
    this.log(`Response: "${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}"`);
    this.log(`Suggested actions: ${result.suggestedActions.join(', ') || 'none'}`);
    this.log(`========== MESSAGE PROCESSED ==========`);

    return result;
  }

  /**
   * Advances to the next phase
   */
  async advancePhase(sessionId: string): Promise<OrchestrationResult> {
    const session = this.sessions().get(sessionId);
    if (!session) {
      return this.errorResult('Session not found');
    }

    const phaseOrder = this.getPhaseOrder(session.mode);
    const currentIndex = phaseOrder.indexOf(session.creationPhaseId);

    if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) {
      // Already at last phase
      return {
        success: true,
        response: this.getLocalizedText('allPhasesComplete', session),
        suggestedActions: [this.getLocalizedText('reviewEntity', session)],
        stateUpdates: { phase: 'reviewing' },
        requiresConfirmation: true,
        confirmationType: 'save'
      };
    }

    const nextPhase = phaseOrder[currentIndex + 1];

    // Validate current phase before advancing
    if (this.config.autoFixValidationErrors) {
      const missingFields = this.formSchema.getMissingRequiredFields(
        this.formSchema.getSchema(session.mode === 'edit' ? 'universe' : session.mode as any),
        session.extractedData,
        session.creationPhaseId
      );

      if (missingFields.length > 0) {
        return {
          success: false,
          response: this.getLocalizedText('missingFields', session, {
            fields: missingFields.map(f => f.label[session.lastIntent?.language || 'es']).join(', ')
          }),
          suggestedActions: missingFields.map(f => f.label[session.lastIntent?.language || 'es']),
          stateUpdates: {},
          requiresConfirmation: false
        };
      }
    }

    this.updateSession(sessionId, {
      creationPhaseId: nextPhase,
      phase: 'gathering'
    });

    this.logEvent('phase_advance', sessionId, { from: session.creationPhaseId, to: nextPhase });

    return {
      success: true,
      response: this.getPhaseGuidance(nextPhase, session),
      suggestedActions: this.getSuggestedActionsForPhase(nextPhase, session),
      stateUpdates: { creationPhaseId: nextPhase },
      requiresConfirmation: false,
      nextPhase
    };
  }

  /**
   * Generates the final entity
   */
  async generateFinalEntity(sessionId: string): Promise<{
    entity: Partial<Universe> | Partial<Character>;
    validationResult: ReturnType<EntityValidatorService['validateComplete']>;
  }> {
    const session = this.sessions().get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Build entity from extracted data
    const entity = this.buildEntityFromData(session);

    // Validate
    const validationResult = this.validator.validateComplete(
      entity as Record<string, unknown>,
      session.mode === 'edit' ? 'universe' : session.mode as any,
      { universe: session.selectedUniverse ?? undefined }
    );

    // Update session
    this.updateSession(sessionId, {
      generatedEntity: entity,
      validationErrors: validationResult.validation.errors,
      validationWarnings: validationResult.validation.warnings
    });

    this.logEvent('entity_generated', sessionId, {
      valid: validationResult.overallValid,
      errorCount: validationResult.validation.errors.length
    });

    return { entity, validationResult };
  }

  /**
   * Applies a quick edit
   */
  async applyQuickEdit(request: QuickEditRequest): Promise<OrchestrationResult> {
    const session = this.sessions().get(request.sessionId);
    if (!session || !session.generatedEntity) {
      return this.errorResult('No entity to edit');
    }

    // Detect changes
    const detectionResult = this.editor.detectChanges({
      userMessage: request.editRequest,
      currentEntity: session.generatedEntity as Record<string, unknown>,
      entityType: session.mode === 'edit' ? 'universe' : session.mode as any
    });

    if (detectionResult.changes.length === 0) {
      return {
        success: false,
        response: this.getLocalizedText('noChangesDetected', session),
        suggestedActions: [],
        stateUpdates: {},
        requiresConfirmation: false
      };
    }

    // Apply changes
    const updatedEntity = this.editor.applyChanges(
      session.generatedEntity as Record<string, unknown>,
      detectionResult.changes,
      'user',
      request.editRequest
    );

    this.updateSession(request.sessionId, {
      generatedEntity: updatedEntity as Partial<Universe> | Partial<Character>,
      history: this.editor.getHistory()
    });

    return {
      success: true,
      response: this.getLocalizedText('changesApplied', session, {
        count: detectionResult.changes.length
      }),
      suggestedActions: [
        this.getLocalizedText('undoChanges', session),
        this.getLocalizedText('confirmChanges', session)
      ],
      stateUpdates: { generatedEntity: updatedEntity },
      generatedEntity: updatedEntity as Partial<Universe> | Partial<Character>,
      requiresConfirmation: true,
      confirmationType: 'save',
      changedFields: detectionResult.changes.map(c => c.path)
    };
  }

  /**
   * Undoes the last change
   */
  undo(sessionId: string): OrchestrationResult {
    const session = this.sessions().get(sessionId);
    if (!session || !session.generatedEntity) {
      return this.errorResult('No entity to undo');
    }

    const undone = this.editor.undo(session.generatedEntity as Record<string, unknown>);

    if (!undone) {
      return {
        success: false,
        response: this.getLocalizedText('nothingToUndo', session),
        suggestedActions: [],
        stateUpdates: {},
        requiresConfirmation: false
      };
    }

    this.updateSession(sessionId, {
      generatedEntity: undone as Partial<Universe> | Partial<Character>,
      history: this.editor.getHistory()
    });

    return {
      success: true,
      response: this.getLocalizedText('undoSuccess', session),
      suggestedActions: [this.getLocalizedText('redoChanges', session)],
      stateUpdates: { generatedEntity: undone },
      generatedEntity: undone as Partial<Universe> | Partial<Character>,
      requiresConfirmation: false
    };
  }

  /**
   * Redoes the last undone change
   */
  redo(sessionId: string): OrchestrationResult {
    const session = this.sessions().get(sessionId);
    if (!session || !session.generatedEntity) {
      return this.errorResult('No entity to redo');
    }

    const redone = this.editor.redo(session.generatedEntity as Record<string, unknown>);

    if (!redone) {
      return {
        success: false,
        response: this.getLocalizedText('nothingToRedo', session),
        suggestedActions: [],
        stateUpdates: {},
        requiresConfirmation: false
      };
    }

    this.updateSession(sessionId, {
      generatedEntity: redone as Partial<Universe> | Partial<Character>,
      history: this.editor.getHistory()
    });

    return {
      success: true,
      response: this.getLocalizedText('redoSuccess', session),
      suggestedActions: [this.getLocalizedText('undoChanges', session)],
      stateUpdates: { generatedEntity: redone },
      generatedEntity: redone as Partial<Universe> | Partial<Character>,
      requiresConfirmation: false
    };
  }

  /**
   * Gets session summary
   */
  getSessionSummary(sessionId: string): SessionSummary | null {
    const session = this.sessions().get(sessionId);
    if (!session) return null;

    const totalFields = Object.keys(session.extractedData).length;
    const schema = this.formSchema.getSchema(session.mode === 'edit' ? 'universe' : session.mode as any);
    const requiredFields = schema.fields.filter(f => f.validation.required).length;

    return {
      sessionId,
      mode: session.mode,
      phase: session.phase,
      progressPercent: Math.min(100, Math.round((totalFields / Math.max(requiredFields, 1)) * 100)),
      entityName: session.extractedData['name']?.value as string | undefined,
      fieldsCollected: totalFields,
      errorCount: session.validationErrors.length,
      lastActivity: session.lastActivityAt
    };
  }

  /**
   * Gets all active sessions
   */
  getActiveSessions(): SessionSummary[] {
    return Array.from(this.sessions().entries())
      .filter(([_, s]) => s.isActive)
      .map(([id]) => this.getSessionSummary(id)!)
      .filter(Boolean);
  }

  /**
   * Sets the selected universe for character creation
   */
  setSelectedUniverse(sessionId: string, universe: Universe): void {
    this.updateSession(sessionId, { selectedUniverse: universe });
  }

  /**
   * Builds prompt context from session
   */
  buildPromptContext(sessionId: string): PromptContext | null {
    const session = this.sessions().get(sessionId);
    if (!session) return null;

    const schema = this.formSchema.getSchema(session.mode === 'edit' ? 'universe' : session.mode as any);

    return {
      mode: session.mode === 'edit' ? 'edit' : session.mode as any,
      phase: session.creationPhaseId,
      language: session.lastIntent?.language || 'es',
      currentEntity: session.generatedEntity,
      collectedData: Object.fromEntries(
        Object.entries(session.extractedData).map(([k, v]) => [k, v.value])
      ),
      extractedFields: session.extractedData,
      conversationHistory: [], // Would be populated from message history
      schema,
      universe: session.selectedUniverse ?? undefined
    };
  }

  // ==================== Private Methods ====================

  private async handleCreateIntent(
    sessionId: string,
    intent: DetectedIntent,
    message: string
  ): Promise<OrchestrationResult> {
    const session = this.sessions().get(sessionId)!;

    // Extract and store fields
    const extractedData = { ...session.extractedData };
    for (const field of intent.fields) {
      extractedData[field.field] = field;
    }

    this.updateSession(sessionId, { extractedData });

    // Check if we need clarification
    if (intent.needsClarification) {
      return {
        success: true,
        response: intent.clarificationQuestions?.[0] || this.getLocalizedText('needMoreInfo', session),
        suggestedActions: this.getSuggestedActionsForPhase(session.creationPhaseId, session),
        stateUpdates: { extractedData, clarificationRounds: session.clarificationRounds + 1 },
        requiresConfirmation: false
      };
    }

    // Check if phase is complete
    const missingFields = this.formSchema.getMissingRequiredFields(
      this.formSchema.getSchema(session.mode === 'edit' ? 'universe' : session.mode as any),
      Object.fromEntries(Object.entries(extractedData).map(([k, v]) => [k, v.value])),
      session.creationPhaseId
    );

    if (missingFields.length === 0 && this.config.autoAdvanceOnComplete) {
      // Auto-advance to next phase
      return await this.advancePhase(sessionId);
    }

    return {
      success: true,
      response: this.getLocalizedText('dataCollected', session, {
        fields: intent.fields.map(f => f.field).join(', ')
      }),
      suggestedActions: missingFields.map(f => f.label[intent.language]),
      stateUpdates: { extractedData },
      requiresConfirmation: false
    };
  }

  private handleEditIntent(
    sessionId: string,
    intent: DetectedIntent,
    message: string
  ): OrchestrationResult {
    const session = this.sessions().get(sessionId)!;

    if (!session.generatedEntity) {
      return {
        success: false,
        response: this.getLocalizedText('noEntityToEdit', session),
        suggestedActions: [],
        stateUpdates: {},
        requiresConfirmation: false
      };
    }

    // Use quick edit
    return this.applyQuickEdit({
      sessionId,
      editRequest: message
    }) as unknown as OrchestrationResult;
  }

  private async handleConfirmIntent(sessionId: string): Promise<OrchestrationResult> {
    const session = this.sessions().get(sessionId)!;

    if (session.phase === 'reviewing') {
      this.updateSession(sessionId, { phase: 'confirmed' });

      return {
        success: true,
        response: this.getLocalizedText('entityConfirmed', session),
        suggestedActions: [],
        stateUpdates: { phase: 'confirmed' },
        requiresConfirmation: false
      };
    }

    // Confirm current phase and advance
    return await this.advancePhase(sessionId);
  }

  private handleCancelIntent(sessionId: string): OrchestrationResult {
    const session = this.sessions().get(sessionId)!;

    if (this.editor.canUndo()) {
      return this.undo(sessionId);
    }

    return {
      success: true,
      response: this.getLocalizedText('operationCancelled', session),
      suggestedActions: [this.getLocalizedText('startOver', session)],
      stateUpdates: {},
      requiresConfirmation: false
    };
  }

  private handleQueryIntent(
    sessionId: string,
    intent: DetectedIntent,
    message: string
  ): OrchestrationResult {
    const session = this.sessions().get(sessionId)!;

    // Provide information about current state
    const summary = this.getSessionSummary(sessionId);

    return {
      success: true,
      response: this.formatSessionInfo(session, summary),
      suggestedActions: this.getSuggestedActionsForPhase(session.creationPhaseId, session),
      stateUpdates: {},
      requiresConfirmation: false
    };
  }

  private handleDeleteIntent(sessionId: string, intent: DetectedIntent): OrchestrationResult {
    const session = this.sessions().get(sessionId)!;

    return {
      success: false,
      response: this.getLocalizedText('deleteNotSupported', session),
      suggestedActions: [],
      stateUpdates: {},
      requiresConfirmation: false
    };
  }

  private async handleUnknownIntent(sessionId: string, message: string): Promise<OrchestrationResult> {
    const session = this.sessions().get(sessionId)!;

    // Try to extract any useful data
    const intent = this.intentDetector.detectIntent(message);

    if (intent.fields.length > 0) {
      return await this.handleCreateIntent(sessionId, intent, message);
    }

    return {
      success: true,
      response: this.getLocalizedText('didntUnderstand', session),
      suggestedActions: this.getSuggestedActionsForPhase(session.creationPhaseId, session),
      stateUpdates: {},
      requiresConfirmation: false
    };
  }

  private updateSession(sessionId: string, updates: Partial<OrchestrationState>): void {
    this.sessions.update(sessions => {
      const updated = new Map(sessions);
      const session = updated.get(sessionId);
      if (session) {
        updated.set(sessionId, { ...session, ...updates });
      }
      return updated;
    });
  }

  private errorResult(message: string): OrchestrationResult {
    return {
      success: false,
      response: message,
      suggestedActions: [],
      stateUpdates: {},
      requiresConfirmation: false,
      errors: [message]
    };
  }

  private getPhaseOrder(mode: OrchestrationMode): string[] {
    if (mode === 'universe') {
      return ['concept', 'races', 'statistics', 'progression', 'appearance', 'review'];
    }
    if (mode === 'character') {
      return ['universe_selection', 'identity', 'backstory', 'statistics', 'appearance', 'personality', 'review'];
    }
    return ['edit'];
  }

  private getPhaseGuidance(phase: string, session: OrchestrationState): string {
    const lang = session.lastIntent?.language || 'es';
    const guidance: Record<string, { es: string; en: string }> = {
      concept: {
        es: '¡Perfecto! Ahora cuéntame sobre tu universo. ¿Cómo se llama? ¿Cuál es su tema principal?',
        en: "Great! Now tell me about your universe. What's it called? What's the main theme?"
      },
      races: {
        es: '¿Quieres añadir razas a tu universo? Puedes describir las razas que existirán.',
        en: 'Would you like to add races to your universe? You can describe the races that will exist.'
      },
      statistics: {
        es: 'Ahora definamos las estadísticas. ¿Qué atributos tendrán los personajes?',
        en: "Now let's define the statistics. What attributes will characters have?"
      },
      progression: {
        es: '¿Cómo progresarán los personajes? Define las reglas de progresión.',
        en: 'How will characters progress? Define the progression rules.'
      },
      appearance: {
        es: '¿Quieres añadir una imagen de portada o describir la apariencia del universo?',
        en: 'Would you like to add a cover image or describe the universe appearance?'
      },
      review: {
        es: '¡Ya casi terminamos! Revisa el universo y confirma para guardarlo.',
        en: "We're almost done! Review the universe and confirm to save it."
      },
      universe_selection: {
        es: '¿En qué universo quieres crear este personaje?',
        en: 'Which universe do you want to create this character in?'
      },
      identity: {
        es: 'Cuéntame sobre tu personaje. ¿Cómo se llama? ¿Cuál es su raza?',
        en: "Tell me about your character. What's their name? What's their race?"
      },
      backstory: {
        es: '¿Cuál es la historia de tu personaje? ¿De dónde viene?',
        en: "What's your character's backstory? Where do they come from?"
      },
      personality: {
        es: '¿Cómo es la personalidad de tu personaje?',
        en: "What's your character's personality like?"
      }
    };

    return guidance[phase]?.[lang] || guidance[phase]?.es || 'Continúa con la siguiente fase.';
  }

  private getSuggestedActionsForPhase(phase: string, session: OrchestrationState): string[] {
    const lang = session.lastIntent?.language || 'es';
    const actions: Record<string, { es: string[]; en: string[] }> = {
      concept: {
        es: ['Nombrar universo', 'Describir tema', 'Añadir inspiración'],
        en: ['Name universe', 'Describe theme', 'Add inspiration']
      },
      statistics: {
        es: ['Añadir estadística', 'Definir rangos', 'Siguiente fase'],
        en: ['Add stat', 'Define ranges', 'Next phase']
      },
      review: {
        es: ['Confirmar', 'Editar', 'Cancelar'],
        en: ['Confirm', 'Edit', 'Cancel']
      }
    };

    return actions[phase]?.[lang] || actions[phase]?.es || [];
  }

  private buildEntityFromData(session: OrchestrationState): Partial<Universe> | Partial<Character> {
    const data = Object.fromEntries(
      Object.entries(session.extractedData).map(([k, v]) => [k, v.value])
    );

    if (session.mode === 'universe') {
      return {
        name: data['name'] as string,
        description: data['description'] as string,
        theme: data['theme'] as string,
        ...data
      } as Partial<Universe>;
    }

    return {
      name: data['name'] as string,
      universeId: session.selectedUniverse?.id || data['universeId'] as string,
      ...data
    } as Partial<Character>;
  }

  private formatSessionInfo(session: OrchestrationState, summary: SessionSummary | null): string {
    const lang = session.lastIntent?.language || 'es';

    if (lang === 'es') {
      return `Modo: ${session.mode}, Fase: ${session.creationPhaseId}, Progreso: ${summary?.progressPercent || 0}%`;
    }
    return `Mode: ${session.mode}, Phase: ${session.creationPhaseId}, Progress: ${summary?.progressPercent || 0}%`;
  }

  private getLocalizedText(key: string, session: OrchestrationState, params: Record<string, unknown> = {}): string {
    const lang = session.lastIntent?.language || 'es';
    const texts: Record<string, { es: string; en: string }> = {
      allPhasesComplete: {
        es: '¡Todas las fases están completas! ¿Deseas guardar?',
        en: 'All phases are complete! Would you like to save?'
      },
      reviewEntity: { es: 'Revisar entidad', en: 'Review entity' },
      missingFields: {
        es: `Faltan campos requeridos: ${params['fields']}`,
        en: `Missing required fields: ${params['fields']}`
      },
      noChangesDetected: {
        es: 'No detecté cambios en tu solicitud.',
        en: "I didn't detect any changes in your request."
      },
      changesApplied: {
        es: `Se aplicaron ${params['count']} cambio(s).`,
        en: `Applied ${params['count']} change(s).`
      },
      undoChanges: { es: 'Deshacer cambios', en: 'Undo changes' },
      redoChanges: { es: 'Rehacer cambios', en: 'Redo changes' },
      confirmChanges: { es: 'Confirmar cambios', en: 'Confirm changes' },
      nothingToUndo: { es: 'No hay nada que deshacer.', en: 'Nothing to undo.' },
      nothingToRedo: { es: 'No hay nada que rehacer.', en: 'Nothing to redo.' },
      undoSuccess: { es: 'Cambio deshecho.', en: 'Change undone.' },
      redoSuccess: { es: 'Cambio rehecho.', en: 'Change redone.' },
      needMoreInfo: {
        es: 'Necesito más información. ¿Puedes darme más detalles?',
        en: 'I need more information. Can you give me more details?'
      },
      dataCollected: {
        es: `Entendido. He registrado: ${params['fields']}`,
        en: `Got it. I've recorded: ${params['fields']}`
      },
      noEntityToEdit: {
        es: 'No hay entidad para editar aún.',
        en: 'No entity to edit yet.'
      },
      entityConfirmed: {
        es: '¡Perfecto! La entidad ha sido confirmada.',
        en: 'Perfect! The entity has been confirmed.'
      },
      operationCancelled: {
        es: 'Operación cancelada.',
        en: 'Operation cancelled.'
      },
      startOver: { es: 'Empezar de nuevo', en: 'Start over' },
      deleteNotSupported: {
        es: 'La eliminación no está soportada en esta sesión.',
        en: 'Deletion is not supported in this session.'
      },
      didntUnderstand: {
        es: 'No entendí bien. ¿Puedes reformular?',
        en: "I didn't quite understand. Can you rephrase?"
      }
    };

    return texts[key]?.[lang] || texts[key]?.es || key;
  }

  private logEvent(type: OrchestrationEvent['type'], sessionId: string, data: Record<string, unknown>): void {
    this.eventLog.push({
      type,
      sessionId,
      timestamp: new Date(),
      data
    });

    // Keep only last 1000 events
    if (this.eventLog.length > 1000) {
      this.eventLog = this.eventLog.slice(-1000);
    }
  }
}
