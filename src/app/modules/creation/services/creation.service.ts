import { Injectable, inject, signal } from '@angular/core';
import { CreationStore, CreationMode } from '../data-access/creation.store';
import { RagContextService } from './rag-context.service';
import { WebLLMService } from '../../../core/services/webllm.service';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { CharacterStore } from '../../characters/data-access/character.store';
import { Universe, Character } from '../../../core/models';
import {
  CreationPhase,
  UNIVERSE_CREATION_PHASES,
  CHARACTER_CREATION_PHASES,
  getNextPhase,
  getPreviousPhase,
  isPhaseComplete,
  calculatePhaseProgress
} from './creation-phases';
import { AIOrchestratorService, IntentDetectorService, DynamicPhaseEngineService } from '../../../core/services/ai';
import {
  AgenticAction,
  AgenticContext,
  DynamicPhaseState,
  DEFAULT_AGENTIC_ACTIONS,
  getVisibleActions,
  createAgenticContext,
  BulkExtraction
} from '../models/agentic-action.model';

// Logger prefix for easy filtering in console
const LOG_PREFIX = '[CreationService]';

@Injectable({ providedIn: 'root' })
export class CreationService {
  private creationStore = inject(CreationStore);
  private ragContext = inject(RagContextService);
  private webLLM = inject(WebLLMService);
  private universeStore = inject(UniverseStore);
  private characterStore = inject(CharacterStore);
  private aiOrchestrator = inject(AIOrchestratorService);
  private intentDetector = inject(IntentDetectorService);
  private dynamicPhaseEngine = inject(DynamicPhaseEngineService);

  private pendingImage: { base64: string; mimeType: string } | null = null;
  private collectedData: Record<string, any> = {};

  // Agentic mode state
  private _filledFields: string[] = [];

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

  // Current phase tracking
  private currentPhases: CreationPhase[] = [];
  private currentPhaseIndex = 0;

  // Agentic mode flag - enabled by default for streaming experience
  private _useAgenticMode = signal<boolean>(true);
  private _agenticSessionId: string | null = null;

  /**
   * Whether agentic mode is enabled
   */
  readonly useAgenticMode = this._useAgenticMode.asReadonly();

  /**
   * Enables or disables agentic AI mode
   */
  setAgenticMode(enabled: boolean): void {
    this._useAgenticMode.set(enabled);
  }

  /**
   * Gets the current agentic session ID
   */
  getAgenticSessionId(): string | null {
    return this._agenticSessionId;
  }

  /**
   * Gets the AI orchestrator service for direct access
   */
  getOrchestrator(): AIOrchestratorService {
    return this.aiOrchestrator;
  }

  /**
   * Inicia un nuevo flujo de creación con sistema de fases
   */
  startCreation(mode: 'universe' | 'character' | 'action'): void {
    this.log(`========== STARTING CREATION ==========`);
    this.log(`Mode: ${mode}`);
    this.log(`Agentic mode enabled: ${this._useAgenticMode()}`);
    this.log(`WebLLM ready: ${this.webLLM.isReady()}`);

    this.creationStore.reset();
    this.creationStore.setMode(mode);
    this.creationStore.setPhase('gathering');
    this.collectedData = {};
    this.currentPhaseIndex = 0;

    // If agentic mode is enabled, start orchestrator session
    if (this._useAgenticMode() && (mode === 'universe' || mode === 'character')) {
      this._agenticSessionId = this.aiOrchestrator.startSession(mode);

      // If character mode and we have universes, we need to let user select
      if (mode === 'character') {
        const universes = this.universeStore.allUniverses();
        if (universes.length > 0) {
          this.creationStore.setSuggestedActions(universes.map(u => u.name));
        }
      }
    }

    // Seleccionar las fases según el modo
    if (mode === 'universe') {
      this.currentPhases = UNIVERSE_CREATION_PHASES;
    } else if (mode === 'character') {
      this.currentPhases = CHARACTER_CREATION_PHASES;
      // Pre-llenar opciones de universos
      this.populateUniverseOptions();
    } else {
      this.currentPhases = [];
    }

    // Mensaje inicial con información de la fase
    const welcomeMessage = this.buildPhaseWelcomeMessage();
    this.creationStore.addMessage({
      role: 'assistant',
      content: welcomeMessage
    });

    // Actualizar contexto con fase actual
    this.creationStore.updateContext('currentPhase', this.currentPhases[0]?.id);
    this.creationStore.updateContext('phaseProgress', 0);
    this.setSuggestedActionsForPhase();
  }

  /**
   * Procesa un mensaje del usuario con contexto de fase
   */
  async processUserMessage(message: string): Promise<void> {
    this.log(`========== PROCESSING USER MESSAGE ==========`);
    this.log(`Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
    this.log(`Current mode: ${this.creationStore.mode()}`);
    this.log(`Current phase: ${this.currentPhases[this.currentPhaseIndex]?.id || 'none'}`);
    this.log(`Agentic mode: ${this._useAgenticMode()}, Session: ${this._agenticSessionId}`);

    // Agregar mensaje del usuario
    this.creationStore.addMessage({
      role: 'user',
      content: message
    });

    // If agentic mode is enabled and we have a session, delegate to orchestrator
    if (this._useAgenticMode() && this._agenticSessionId) {
      this.log(`Delegating to orchestrator (session: ${this._agenticSessionId})`);
      await this.processWithOrchestrator(message);
      return;
    }

    // Verificar si tenemos el modelo cargado
    if (!this.webLLM.isReady()) {
      this.logWarn(`WebLLM not ready - cannot process message`);
      this.creationStore.addMessage({
        role: 'assistant',
        content: '⚠️ Para continuar, necesito que cargues el modelo de IA primero. Vuelve a la pantalla inicial y presiona "Cargar Modelo de IA".'
      });
      return;
    }

    this.log(`WebLLM is ready - starting generation`);
    this.creationStore.setGenerating(true);

    try {
      // Extraer datos del mensaje según la fase actual
      this.log(`Extracting data from message...`);
      await this.extractDataFromMessage(message);
      this.log(`Collected data after extraction:`, this.collectedData);

      // Generar respuesta con contexto de fase
      this.log(`Generating phase-aware response...`);
      const startTime = Date.now();
      const response = await this.generatePhaseAwareResponse(message);
      const elapsed = Date.now() - startTime;
      this.log(`Response generated in ${elapsed}ms`);
      this.log(`Response length: ${response.length} chars`);
      this.log(`Response preview: "${response.substring(0, 200)}${response.length > 200 ? '...' : ''}"`);

      // Check if response contains system prompt (bug detection)
      if (response.includes('###CONOCIMIENTO DEL SISTEMA') || response.includes('###INSTRUCCIONES###')) {
        this.logError(`BUG DETECTED: Response contains system prompt!`);
        this.logError(`Full response:`, response);
      }

      this.creationStore.addMessage({
        role: 'assistant',
        content: response
      });

      // Verificar si la fase está completa
      this.log(`Checking phase completion...`);
      await this.checkPhaseCompletion(response);

      // Actualizar sugerencias
      this.setSuggestedActionsForPhase();
      this.log(`========== MESSAGE PROCESSING COMPLETE ==========`);

    } catch (error) {
      this.logError('Error generating response:', error);
      this.creationStore.addMessage({
        role: 'assistant',
        content: '❌ Hubo un error al procesar tu mensaje. ¿Podrías intentarlo de nuevo?'
      });
    } finally {
      this.creationStore.setGenerating(false);
    }
  }

  /**
   * Procesa un mensaje del usuario con streaming visual de tokens
   */
  async processUserMessageWithStreaming(message: string): Promise<void> {
    this.log(`========== PROCESSING USER MESSAGE WITH STREAMING ==========`);
    this.log(`Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
    this.log(`Current mode: ${this.creationStore.mode()}`);
    this.log(`Current phase: ${this.currentPhases[this.currentPhaseIndex]?.id || 'none'}`);

    // Add user message
    this.creationStore.addMessage({
      role: 'user',
      content: message
    });

    // Check if WebLLM is ready
    if (!this.webLLM.isReady()) {
      this.logWarn(`WebLLM not ready - cannot process message`);
      this.creationStore.addMessage({
        role: 'assistant',
        content: '⚠️ Para continuar, necesito que cargues el modelo de IA primero. Vuelve a la pantalla inicial y presiona "Cargar Modelo de IA".'
      });
      return;
    }

    // Start streaming
    this.creationStore.startStreaming();

    try {
      // Extract data from message according to current phase
      this.log(`Extracting data from message...`);
      await this.extractDataFromMessage(message);
      this.log(`Collected data after extraction:`, this.collectedData);

      // Build messages for the AI
      const messages = this.buildStreamingMessages(message);
      this.log(`Calling WebLLM.chatWithStreaming()...`);
      const startTime = Date.now();

      // Call streaming chat
      const finalContent = await this.webLLM.chatWithStreaming(
        messages,
        (token, fullContent) => {
          this.creationStore.appendStreamingToken(token);
        }
      );

      const elapsed = Date.now() - startTime;
      this.log(`Response generated in ${elapsed}ms`);
      this.log(`Response length: ${finalContent.length} chars`);

      // Check if response contains system prompt (bug detection)
      if (finalContent.includes('###CONOCIMIENTO DEL SISTEMA') || finalContent.includes('###INSTRUCCIONES###')) {
        this.logError(`BUG DETECTED: Response contains system prompt!`);
      }

      // Finish streaming (this adds the message to the store)
      this.creationStore.finishStreaming();

      // Check phase completion
      this.log(`Checking phase completion...`);
      await this.checkPhaseCompletion(finalContent);

      // Update suggestions
      this.setSuggestedActionsForPhase();
      this.log(`========== STREAMING MESSAGE PROCESSING COMPLETE ==========`);

    } catch (error) {
      this.logError('Error generating streaming response:', error);
      this.creationStore.cancelStreaming();
      this.creationStore.addMessage({
        role: 'assistant',
        content: '❌ Hubo un error al procesar tu mensaje. ¿Podrías intentarlo de nuevo?'
      });
    }
  }

  /**
   * Builds messages array for streaming chat
   */
  private buildStreamingMessages(userMessage: string): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const mode = this.creationStore.mode();
    const currentPhase = this.currentPhases[this.currentPhaseIndex];
    const history = this.creationStore.getConversationHistory();

    // Build phase-specific system prompt
    let systemPrompt = this.ragContext.getSystemKnowledge();

    // Add phase-specific RAG knowledge
    systemPrompt += `\n\n${currentPhase?.ragPrompt || ''}`;

    // Add collected data
    if (Object.keys(this.collectedData).length > 0) {
      systemPrompt += `\n\n###DATOS YA RECOLECTADOS###\n${JSON.stringify(this.collectedData, null, 2)}`;
    }

    // For characters, add selected universe info
    if (mode === 'character' && this.collectedData['selectedUniverse']) {
      const universe = this.collectedData['selectedUniverse'] as Universe;
      systemPrompt += `\n\n###UNIVERSO SELECCIONADO###\n`;
      systemPrompt += `Nombre: ${universe.name}\n`;
      systemPrompt += `Stats disponibles: ${Object.keys(universe.statDefinitions).join(', ')}\n`;
      systemPrompt += `Rangos: ${universe.awakeningSystem?.levels.join(' → ')}\n`;
    }

    // Phase instructions - very concise
    systemPrompt += `\n\nFASE: ${currentPhase?.name || 'General'} (${this.currentPhaseIndex + 1}/${this.currentPhases.length})`;

    if (currentPhase?.questions.length) {
      const pendingQuestions = currentPhase.questions.filter(
        q => !this.collectedData[q.field]
      );
      if (pendingQuestions.length > 0) {
        systemPrompt += `\nPREGUNTA A HACER: "${pendingQuestions[0].question}"`;
        systemPrompt += `\nResponde breve y haz SOLO esta pregunta.`;
      } else {
        systemPrompt += `\nFase completa. Di "¡Perfecto!" y pregunta si quiere continuar.`;
      }
    }

    // Final reminder
    systemPrompt += `\n\nRECUERDA: Máximo 2 oraciones. 1 pregunta. No repitas instrucciones.`;

    // Build messages array
    return [
      { role: 'system' as const, content: systemPrompt },
      ...history.slice(-6).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: userMessage }
    ];
  }

  /**
   * Processes a message using the agentic AI orchestrator
   */
  private async processWithOrchestrator(message: string): Promise<void> {
    if (!this._agenticSessionId) return;

    this.creationStore.setGenerating(true);

    try {
      const result = await this.aiOrchestrator.processMessage(this._agenticSessionId, message);

      // Add response to conversation
      this.creationStore.addMessage({
        role: 'assistant',
        content: result.response
      });

      // Update suggested actions
      if (result.suggestedActions.length > 0) {
        this.creationStore.setSuggestedActions(result.suggestedActions);
      }

      // If entity was generated, store it
      if (result.generatedEntity) {
        const mode = this.creationStore.mode();
        if (mode === 'universe') {
          this.creationStore.setGeneratedUniverse(result.generatedEntity as Partial<Universe>);
        } else if (mode === 'character') {
          this.creationStore.setGeneratedCharacter(result.generatedEntity as Partial<Character>);
        }
      }

      // Handle phase changes
      if (result.stateUpdates.phase) {
        this.creationStore.setPhase(result.stateUpdates.phase as any);
      }

      // Handle confirmation requests
      if (result.requiresConfirmation) {
        this.creationStore.setPhase('reviewing');
      }

      // Update progress from session summary
      const summary = this.aiOrchestrator.getSessionSummary(this._agenticSessionId);
      if (summary) {
        this.creationStore.updateContext('phaseProgress', summary.progressPercent);
        this.creationStore.updateContext('currentPhase', summary.phase);
      }

    } catch (error) {
      console.error('Error in agentic processing:', error);
      this.creationStore.addMessage({
        role: 'assistant',
        content: '❌ Hubo un error al procesar tu mensaje. ¿Podrías intentarlo de nuevo?'
      });
    } finally {
      this.creationStore.setGenerating(false);
    }
  }

  /**
   * Avanza a la siguiente fase manualmente
   */
  async advanceToNextPhase(): Promise<void> {
    const nextPhase = getNextPhase(this.currentPhases, this.currentPhases[this.currentPhaseIndex].id);

    if (nextPhase) {
      this.currentPhaseIndex++;
      this.creationStore.updateContext('currentPhase', nextPhase.id);
      this.creationStore.updateContext('phaseProgress', calculatePhaseProgress(this.currentPhases, nextPhase.id));

      // Si es la fase de revisión, generar el contenido final
      if (nextPhase.id === 'review') {
        await this.generateFinalContent();
      } else {
        const phaseIntro = this.buildPhaseIntroMessage(nextPhase);
        this.creationStore.addMessage({
          role: 'assistant',
          content: phaseIntro
        });
      }

      this.setSuggestedActionsForPhase();
    }
  }

  /**
   * Retrocede a la fase anterior
   */
  goToPreviousPhase(): void {
    const prevPhase = getPreviousPhase(this.currentPhases, this.currentPhases[this.currentPhaseIndex].id);

    if (prevPhase) {
      this.currentPhaseIndex--;
      this.creationStore.updateContext('currentPhase', prevPhase.id);
      this.creationStore.updateContext('phaseProgress', calculatePhaseProgress(this.currentPhases, prevPhase.id));

      this.creationStore.addMessage({
        role: 'assistant',
        content: `Volviendo a la fase: **${prevPhase.name}**\n\n¿Qué te gustaría modificar?`
      });

      this.setSuggestedActionsForPhase();
    }
  }

  /**
   * Procesa una imagen subida por el usuario
   */
  async processImage(base64: string, mimeType: string): Promise<void> {
    this.pendingImage = { base64, mimeType };

    const mode = this.creationStore.mode();
    const currentPhase = this.currentPhases[this.currentPhaseIndex];
    let imagePrompt = '';

    if (mode === 'universe') {
      if (currentPhase?.id === 'appearance') {
        imagePrompt = '📸 ¡Imagen recibida! ¿Esta imagen es para:\n\n' +
          '1️⃣ **Portada del universo** (imagen principal)\n' +
          '2️⃣ **Un lugar específico** (dungeon, ciudad, etc.)\n\n' +
          '¿Cuál prefieres?';
      } else {
        imagePrompt = '📸 Has subido una imagen. La guardaré para la fase de Apariencia. ¿Continuamos con la información actual?';
        this.collectedData['pendingCoverImage'] = base64;
      }
    } else if (mode === 'character') {
      imagePrompt = '📸 ¡Genial! Esta imagen será el **avatar** de tu personaje. ¿Te parece bien?';
      this.collectedData['avatarUrl'] = base64;
    }

    this.creationStore.addMessage({
      role: 'assistant',
      content: imagePrompt
    });

    this.creationStore.updateContext('pendingImage', true);
    this.creationStore.setSuggestedActions([
      'Sí, usar como portada/avatar',
      'Es un lugar del universo',
      'Cancelar'
    ]);
  }

  /**
   * Confirma la asignación de imagen
   */
  assignPendingImage(type: 'cover' | 'location' | 'avatar', metadata?: { name?: string; description?: string }): void {
    if (!this.pendingImage) return;

    if (type === 'cover') {
      this.collectedData['coverImage'] = this.pendingImage.base64;
    } else if (type === 'location') {
      const locations = this.collectedData['locations'] || [];
      locations.push({
        name: metadata?.name || 'Lugar sin nombre',
        description: metadata?.description || '',
        imageUrl: this.pendingImage.base64
      });
      this.collectedData['locations'] = locations;
    } else if (type === 'avatar') {
      this.collectedData['avatarUrl'] = this.pendingImage.base64;
    }

    this.pendingImage = null;
    this.creationStore.updateContext('pendingImage', false);
  }

  /**
   * Solicita ajustes al contenido generado
   */
  requestAdjustment(type: 'universe' | 'character'): void {
    this.creationStore.setPhase('adjusting');
    this.creationStore.addMessage({
      role: 'assistant',
      content: '✏️ ¿Qué te gustaría ajustar? Puedo modificar:\n\n' +
        '• **Estadísticas** - Valores o definiciones\n' +
        '• **Descripción** - Textos y nombres\n' +
        '• **Reglas** - Sistema de progresión\n' +
        '• **Apariencia** - Colores e imágenes\n\n' +
        'Dime específicamente qué cambiar.'
    });
    this.creationStore.setSuggestedActions([
      'Cambiar estadísticas',
      'Modificar descripción',
      'Ajustar reglas de progresión',
      'Cambiar apariencia'
    ]);
  }

  /**
   * Regenera el contenido
   */
  async regenerate(): Promise<void> {
    this.creationStore.setGeneratedUniverse(null);
    this.creationStore.setGeneratedCharacter(null);
    this.creationStore.setPhase('gathering');

    // Volver a la fase de revisión pero pedir regeneración
    this.creationStore.addMessage({
      role: 'assistant',
      content: '🔄 Voy a generar una nueva versión basándome en la información que tengo. ¿Hay algo específico que quieras cambiar o genero otra versión similar?'
    });
    this.creationStore.setSuggestedActions([
      'Genera otra versión similar',
      'Quiero cambiar el concepto',
      'Modifica las estadísticas',
      'Empezar completamente de nuevo'
    ]);
  }

  /**
   * Confirma y guarda la creación
   */
  async confirmCreation(): Promise<void> {
    const mode = this.creationStore.mode();

    try {
      if (mode === 'universe') {
        const universeData = this.creationStore.generatedUniverse();
        if (universeData && universeData.name) {
          // Create the universe with name and description
          const universeId = await this.universeStore.createUniverse(
            universeData.name,
            universeData.description || 'Universo creado con IA',
            false
          );

          // If we have additional data, update the universe
          if (universeId && (universeData.statDefinitions || universeData.progressionRules || universeData.awakeningSystem)) {
            await this.universeStore.updateUniverse(universeId, {
              statDefinitions: universeData.statDefinitions,
              progressionRules: universeData.progressionRules,
              awakeningSystem: universeData.awakeningSystem
            });
          }

          this.creationStore.addMessage({
            role: 'assistant',
            content: `✅ ¡**${universeData.name}** ha sido creado exitosamente!\n\n` +
              `Ya puedes verlo en la sección de **Universos** y crear personajes en él.`
          });
        }
      } else if (mode === 'character') {
        const characterData = this.creationStore.generatedCharacter();
        if (characterData && characterData.name && characterData.universeId && characterData.stats) {
          const characterId = await this.characterStore.createCharacter(
            characterData.name,
            characterData.universeId,
            characterData.stats
          );

          // If we have additional data, update the character
          if (characterId) {
            const updates: Partial<Character> = {};
            if (characterData.avatar) updates.avatar = characterData.avatar as any;
            if (characterData.progression) updates.progression = characterData.progression as any;
            if (Object.keys(updates).length > 0) {
              await this.characterStore.updateCharacter(characterId, updates);
            }
          }

          this.creationStore.addMessage({
            role: 'assistant',
            content: `✅ ¡**${characterData.name}** ha sido creado exitosamente!\n\n` +
              `Ya puedes verlo en la sección de **Personajes**.`
          });
        }
      }

      this.creationStore.setPhase('confirmed');
      this.creationStore.setSuggestedActions([
        'Crear otro universo',
        'Crear un personaje',
        'Volver al inicio'
      ]);

    } catch (error) {
      console.error('Error saving creation:', error);
      this.creationStore.addMessage({
        role: 'assistant',
        content: '❌ Hubo un error al guardar. ¿Quieres intentarlo de nuevo?'
      });
    }
  }

  /**
   * Obtiene el progreso actual de las fases
   */
  getPhaseProgress(): { current: number; total: number; percentage: number; phaseName: string } {
    return {
      current: this.currentPhaseIndex + 1,
      total: this.currentPhases.length,
      percentage: calculatePhaseProgress(this.currentPhases, this.currentPhases[this.currentPhaseIndex]?.id || ''),
      phaseName: this.currentPhases[this.currentPhaseIndex]?.name || ''
    };
  }

  /**
   * Obtiene los datos recolectados hasta ahora
   */
  getCollectedData(): Record<string, any> {
    return { ...this.collectedData };
  }

  // ============================================
  // AGENTIC MODE METHODS
  // ============================================

  /**
   * Initializes the agentic welcome screen with context
   */
  initializeAgenticWelcome(): void {
    this.log('Initializing agentic welcome screen');

    // Get available universes for context
    const universes = this.universeStore.allUniverses();
    this.creationStore.setAvailableUniverses(universes);

    // Mark welcome as shown
    this.creationStore.setAgenticWelcomeShown(true);

    this.log(`Found ${universes.length} available universes`);
  }

  /**
   * Processes user message in agentic mode with bulk extraction
   */
  async processUserMessageAgentic(message: string): Promise<void> {
    this.log(`========== AGENTIC PROCESSING ==========`);
    this.log(`Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);

    // Store last user message
    this.creationStore.setLastUserMessage(message);

    // Add user message to store
    this.creationStore.addMessage({
      role: 'user',
      content: message
    });

    // Detect target type if not already set
    const currentMode = this.creationStore.mode();
    let targetType: 'universe' | 'character' = 'universe';

    if (currentMode === 'idle' || currentMode === 'action') {
      // Detect from message
      const detected = this.intentDetector.detectTargetFromInput(message, 'es');
      if (detected !== 'unknown') {
        targetType = detected;
        this.creationStore.setMode(targetType);
        this.log(`Detected target type: ${targetType}`);
      }
    } else {
      targetType = currentMode as 'universe' | 'character';
    }

    // Perform bulk extraction
    this.log('Performing bulk extraction...');
    const extraction = this.intentDetector.extractAllFields(message, targetType, 'es');
    this.log(`Extraction result:`, extraction);

    // Update collected data and filled fields
    this.updateCollectedDataFromExtraction(extraction);

    // Update extraction progress
    this.creationStore.setExtractionProgress(extraction.completenessScore);

    // Calculate phase state
    const phaseState = this.dynamicPhaseEngine.calculatePhaseState(
      targetType,
      this._filledFields,
      this.currentPhaseIndex
    );
    this.creationStore.setDynamicPhaseState(phaseState);

    this.log(`Phase state:`, phaseState);

    // Update visible actions
    this.updateVisibleActions(targetType, phaseState, extraction);

    // Check if we should go directly to confirmation
    if (extraction.completenessScore >= 70 && extraction.missingRequiredFields.length === 0) {
      this.log('High completeness - generating preview');
      await this.generateAndShowPreview(targetType);
      return;
    }

    // Generate intelligent response
    await this.generateAgenticResponse(message, extraction, phaseState);
  }

  /**
   * Updates collected data from bulk extraction
   */
  private updateCollectedDataFromExtraction(extraction: BulkExtraction): void {
    for (const [key, value] of Object.entries(extraction.fields)) {
      if (value !== null && value !== undefined) {
        this.collectedData[key] = value;
        if (!this._filledFields.includes(key)) {
          this._filledFields.push(key);
        }
      }
    }
    this.creationStore.updateContext('collectedData', this.collectedData);
    this.log(`Collected data updated:`, this.collectedData);
    this.log(`Filled fields:`, this._filledFields);
  }

  /**
   * Updates visible actions based on current context
   */
  private updateVisibleActions(
    mode: 'universe' | 'character',
    phaseState: DynamicPhaseState,
    extraction: BulkExtraction
  ): void {
    const entity = mode === 'universe'
      ? this.creationStore.generatedUniverse()
      : this.creationStore.generatedCharacter();

    const context = createAgenticContext(mode, phaseState, entity, {
      availableUniverses: this.universeStore.allUniverses(),
      selectedUniverseId: this.creationStore.selectedUniverseId(),
      lastUserMessage: this.creationStore.lastUserMessage(),
      isConfirmationMode: this.creationStore.confirmationMode(),
      validationWarnings: this.creationStore.validationWarnings(),
      validationErrors: this.creationStore.validationErrors()
    });

    const visibleActions = getVisibleActions(DEFAULT_AGENTIC_ACTIONS, context);

    // Add smart suggestions as quick select actions
    const suggestions = this.dynamicPhaseEngine.getSmartSuggestions(
      mode,
      phaseState.currentPhaseId,
      this._filledFields,
      this.creationStore.lastUserMessage()
    );

    const suggestionActions: AgenticAction[] = suggestions.map((label, i) => ({
      id: `suggestion_${i}`,
      type: 'quick_select' as const,
      label,
      component: 'chip' as const,
      visibility: 'always' as const,
      priority: 40 - i
    }));

    this.creationStore.setVisibleActions([...visibleActions, ...suggestionActions]);
  }

  /**
   * Generates and shows preview when completeness is high
   */
  private async generateAndShowPreview(targetType: 'universe' | 'character'): Promise<void> {
    this.log('Generating preview from collected data');
    this.creationStore.setGenerating(true);

    try {
      // Build entity from collected data
      if (targetType === 'universe') {
        const universeData = this.buildUniverseFromCollectedData();
        this.creationStore.setGeneratedUniverse(universeData);
        this.log('Generated universe preview:', universeData);
      } else {
        const characterData = this.buildCharacterFromCollectedData();
        this.creationStore.setGeneratedCharacter(characterData);
        this.log('Generated character preview:', characterData);
      }

      // Validate and enter confirmation mode
      const { warnings, errors } = this.validateGeneratedEntity(targetType);
      this.creationStore.enterConfirmationMode(warnings, errors);

      // Add confirmation message
      this.creationStore.addMessage({
        role: 'assistant',
        content: this.buildConfirmationMessage(targetType, warnings, errors)
      });

    } catch (error) {
      this.logError('Error generating preview:', error);
      this.creationStore.addMessage({
        role: 'assistant',
        content: 'Hubo un error al generar la vista previa. ¿Podrías intentarlo de nuevo?'
      });
    } finally {
      this.creationStore.setGenerating(false);
    }
  }

  /**
   * Generates intelligent response based on extraction and phase
   */
  private async generateAgenticResponse(
    message: string,
    extraction: BulkExtraction,
    phaseState: DynamicPhaseState
  ): Promise<void> {
    this.creationStore.setGenerating(true);

    try {
      // Build prompt for LLM
      const systemPrompt = this.buildAgenticSystemPrompt(extraction, phaseState);

      // Get history but FILTER OUT problematic messages
      // The Phi-3 model tends to repeat structured content, so we clean it
      const rawHistory = this.creationStore.getConversationHistory().slice(-4);
      const cleanHistory = rawHistory
        .filter(m => {
          // Remove messages that contain phase structure indicators
          const hasPhaseStructure = m.content.includes('FASE ') &&
                                    (m.content.includes('RECUERDA:') || m.content.includes('---'));
          const hasInstructions = m.content.includes('###') || m.content.includes('INSTRUCCIONES');
          return !hasPhaseStructure && !hasInstructions;
        })
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          // Truncate very long messages to avoid context issues
          content: m.content.length > 500 ? m.content.substring(0, 500) + '...' : m.content
        }));

      this.log(`History: ${rawHistory.length} messages, after cleaning: ${cleanHistory.length}`);

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...cleanHistory,
        { role: 'user' as const, content: message }
      ];

      this.log(`Sending ${messages.length} messages to LLM`);
      this.log(`System prompt preview: "${systemPrompt.substring(0, 200)}..."`);
      this.log(`User message: "${message}"`);


      // Use streaming for visual feedback
      this.creationStore.startStreaming();

      const response = await this.webLLM.chatWithStreaming(
        messages,
        (token) => {
          this.creationStore.appendStreamingToken(token);
        }
      );

      this.creationStore.finishStreaming();

      // Check if response contains JSON (generated entity)
      await this.checkForGeneratedEntity(response);

      // Update phase if needed
      this.maybeAdvancePhase(extraction);

    } catch (error) {
      this.logError('Error generating agentic response:', error);
      this.creationStore.cancelStreaming();
      this.creationStore.addMessage({
        role: 'assistant',
        content: 'Hubo un problema al procesar tu mensaje. ¿Podrías intentarlo de nuevo?'
      });
    } finally {
      this.creationStore.setGenerating(false);
    }
  }

  /**
   * Builds agentic system prompt with extraction context
   */
  private buildAgenticSystemPrompt(
    extraction: BulkExtraction,
    phaseState: DynamicPhaseState
  ): string {
    const mode = this.creationStore.mode();
    const completeness = extraction.completenessScore;

    // Construir lista de lo que ya tenemos de forma natural
    const collectedItems: string[] = [];
    if (this.collectedData['name']) collectedItems.push(`nombre: "${this.collectedData['name']}"`);
    if (this.collectedData['theme']) collectedItems.push(`tema: ${this.collectedData['theme']}`);
    if (this.collectedData['statNames']?.length) collectedItems.push(`${this.collectedData['statNames'].length} stats`);
    if (this.collectedData['description']) collectedItems.push('descripción');

    const collectedSummary = collectedItems.length > 0
      ? `Ya tengo: ${collectedItems.join(', ')}.`
      : 'Aún no tengo información.';

    // Determinar qué preguntar según lo que falta
    let nextQuestion = '';
    if (!this.collectedData['name']) {
      nextQuestion = mode === 'universe'
        ? '¿Cómo se llama tu universo?'
        : '¿Cómo se llama tu personaje?';
    } else if (!this.collectedData['theme'] && mode === 'universe') {
      nextQuestion = '¿Qué temática tiene? (fantasía, sci-fi, etc.)';
    } else if (!this.collectedData['statNames'] && mode === 'universe') {
      nextQuestion = '¿Qué estadísticas quieres? (fuerza, agilidad, etc.)';
    } else if (extraction.missingRequiredFields.length > 0) {
      nextQuestion = extraction.suggestedQuestion || `¿Me cuentas más sobre ${extraction.missingRequiredFields[0]}?`;
    } else {
      nextQuestion = '¿Quieres agregar más detalles o generamos el preview?';
    }

    // Prompt SIMPLE y conversacional
    let prompt = `Eres un asistente amigable que ayuda a crear ${mode === 'universe' ? 'universos' : 'personajes'} de RPG.

TU OBJETIVO: Responder en máximo 2 oraciones y hacer 1 pregunta.

${collectedSummary}
Progreso: ${completeness}%

RESPONDE ASÍ:
- Si el usuario dio info nueva: "¡Genial! [reconoce lo que dijo]." + tu pregunta
- Si pidió algo: Respóndele directamente
- Pregunta sugerida: "${nextQuestion}"

NO incluyas listas, bullets, fases ni estructuras. Solo conversa naturalmente.`;

    // Agregar contexto del universo si es personaje
    if (mode === 'character' && this.collectedData['selectedUniverse']) {
      const universe = this.collectedData['selectedUniverse'] as Universe;
      prompt += `\n\nEl personaje pertenece al universo "${universe.name}".`;
    }

    return prompt;
  }

  /**
   * Checks if response contains a generated entity
   */
  private async checkForGeneratedEntity(response: string): Promise<void> {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) return;

    try {
      const jsonContent = JSON.parse(jsonMatch[1]);
      const mode = this.creationStore.mode();

      if (mode === 'universe' && jsonContent.name && jsonContent.statDefinitions) {
        this.creationStore.setGeneratedUniverse(jsonContent);
        const { warnings, errors } = this.validateGeneratedEntity('universe');
        this.creationStore.enterConfirmationMode(warnings, errors);
      } else if (mode === 'character' && jsonContent.name && jsonContent.stats) {
        this.creationStore.setGeneratedCharacter(jsonContent);
        const { warnings, errors } = this.validateGeneratedEntity('character');
        this.creationStore.enterConfirmationMode(warnings, errors);
      }
    } catch (e) {
      this.logWarn('Could not parse JSON from response:', e);
    }
  }

  /**
   * Advances phase if appropriate
   */
  private maybeAdvancePhase(extraction: BulkExtraction): void {
    if (extraction.missingRequiredFields.length === 0 &&
        this.currentPhaseIndex < this.currentPhases.length - 1) {
      const suggestion = this.dynamicPhaseEngine.suggestNextPhase(
        this.creationStore.mode() as 'universe' | 'character',
        this.currentPhaseIndex,
        this._filledFields
      );

      if (suggestion) {
        this.currentPhaseIndex = suggestion.phaseIndex;
        this.creationStore.updateContext('currentPhase', suggestion.phaseId);
      }
    }
  }

  /**
   * Builds universe from collected data
   */
  private buildUniverseFromCollectedData(): Partial<Universe> {
    const data = this.collectedData;

    // Build stat definitions if we have stat names
    let statDefinitions: Record<string, any> = {};
    if (data['statNames'] && Array.isArray(data['statNames'])) {
      const colors = ['#FF5722', '#4CAF50', '#E91E63', '#2196F3', '#9C27B0', '#00BCD4', '#FF9800', '#FFEB3B'];
      const icons = ['barbell-outline', 'flash-outline', 'heart-outline', 'bulb-outline', 'eye-outline', 'pulse-outline', 'star-outline', 'sparkles-outline'];

      (data['statNames'] as string[]).forEach((name, i) => {
        const key = name.toLowerCase().replace(/\s+/g, '_');
        statDefinitions[key] = {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          abbreviation: name.substring(0, 3).toUpperCase(),
          icon: icons[i % icons.length],
          minValue: 0,
          maxValue: 999,
          category: 'primary',
          color: colors[i % colors.length]
        };
      });
    }

    // Build awakening system if we have rank info
    let awakeningSystem = undefined;
    const rankInfo = this.intentDetector.extractRankSystem(
      JSON.stringify(data['rankSystem'] || '') + ' ' + (data['description'] || '')
    );
    if (rankInfo) {
      awakeningSystem = {
        enabled: true,
        levels: rankInfo.levels,
        thresholds: this.generateThresholds(rankInfo.levels.length)
      };
    }

    return {
      name: data['name'] || 'Nuevo Universo',
      description: data['description'] || `Un universo de ${data['theme'] || 'fantasía'}`,
      statDefinitions: Object.keys(statDefinitions).length > 0 ? statDefinitions : undefined,
      initialPoints: data['initialPoints'] || 60,
      awakeningSystem,
      progressionRules: [],
      isPublic: false
    };
  }

  /**
   * Builds character from collected data
   */
  private buildCharacterFromCollectedData(): Partial<Character> {
    const data = this.collectedData;
    const universe = data['selectedUniverse'] as Universe | undefined;

    // Build initial stats from universe
    const stats: Record<string, number> = {};
    if (universe?.statDefinitions) {
      const statCount = Object.keys(universe.statDefinitions).length;
      const pointsPerStat = Math.floor((universe.initialPoints || 60) / statCount);

      for (const key of Object.keys(universe.statDefinitions)) {
        stats[key] = pointsPerStat;
      }
    }

    return {
      name: data['name'] || 'Nuevo Personaje',
      universeId: universe?.id || data['universeId'],
      stats,
      backstory: data['backstory'] || data['description'],
      progression: {
        level: 1,
        experience: 0,
        awakening: universe?.awakeningSystem?.levels[0] || 'E',
        title: data['class'] || null
      }
    };
  }

  /**
   * Validates generated entity
   */
  private validateGeneratedEntity(type: 'universe' | 'character'): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (type === 'universe') {
      const universe = this.creationStore.generatedUniverse();
      if (!universe?.name) {
        errors.push('El universo necesita un nombre');
      }
      if (!universe?.statDefinitions || Object.keys(universe.statDefinitions).length === 0) {
        warnings.push('Sin estadísticas definidas - se usarán las predeterminadas');
      }
      if (!universe?.coverImage) {
        warnings.push('Sin imagen de portada');
      }
    } else {
      const character = this.creationStore.generatedCharacter();
      if (!character?.name) {
        errors.push('El personaje necesita un nombre');
      }
      if (!character?.universeId) {
        errors.push('El personaje necesita pertenecer a un universo');
      }
      if (!character?.stats || Object.keys(character.stats).length === 0) {
        warnings.push('Sin estadísticas asignadas');
      }
    }

    return { warnings, errors };
  }

  /**
   * Builds confirmation message
   */
  private buildConfirmationMessage(
    type: 'universe' | 'character',
    warnings: string[],
    errors: string[]
  ): string {
    let message = '';

    if (errors.length > 0) {
      message = `Hay algunos problemas que necesitan resolverse antes de guardar:\n\n`;
      message += errors.map(e => `- ${e}`).join('\n');
    } else if (warnings.length > 0) {
      message = `Tu ${type === 'universe' ? 'universo' : 'personaje'} está casi listo. `;
      message += `Hay ${warnings.length} ${warnings.length === 1 ? 'advertencia' : 'advertencias'}:\n\n`;
      message += warnings.map(w => `- ${w}`).join('\n');
      message += '\n\nPuedes continuar o ajustar estos detalles.';
    } else {
      message = `¡Excelente! Tu ${type === 'universe' ? 'universo' : 'personaje'} está completo. `;
      message += 'Revisa los detalles y confirma para guardarlo.';
    }

    return message;
  }

  /**
   * Generates thresholds for rank levels
   */
  private generateThresholds(count: number): number[] {
    const thresholds = [0];
    let current = 50;
    for (let i = 1; i < count; i++) {
      thresholds.push(current);
      current = Math.round(current * 1.8);
    }
    return thresholds;
  }

  /**
   * Skips to confirmation/preview phase
   */
  skipToConfirmation(): void {
    const mode = this.creationStore.mode() as 'universe' | 'character';
    this.generateAndShowPreview(mode);
  }

  /**
   * Processes a free-form initial message (from welcome screen)
   */
  async processInitialMessage(message: string): Promise<void> {
    // First detect what the user wants to create
    const detected = this.intentDetector.detectTargetFromInput(message, 'es');

    if (detected !== 'unknown') {
      // Start creation in detected mode
      this.startCreation(detected);
    } else {
      // Default to universe if unclear
      this.startCreation('universe');
    }

    // Process the message
    await this.processUserMessageAgentic(message);
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  private buildPhaseWelcomeMessage(): string {
    const mode = this.creationStore.mode();

    // Mensajes SIMPLES sin listas de fases para evitar que el modelo las repita
    if (mode === 'universe') {
      return `¡Vamos a crear tu universo! Cuéntame, ¿cómo se llama y qué tipo de mundo es?`;
    } else if (mode === 'character') {
      const universes = this.universeStore.allUniverses();
      if (universes.length === 0) {
        return `Para crear un personaje primero necesitas un universo. ¿Quieres crear uno?`;
      }
      const universeNames = universes.map(u => u.name).join(', ');
      return `¡Vamos a crear tu personaje! Tienes estos universos: ${universeNames}. ¿En cuál quieres crearlo?`;
    } else if (mode === 'action') {
      return `¿Qué quieres crear hoy? Puedo ayudarte con universos o personajes.`;
    }

    return '¿En qué puedo ayudarte hoy?';
  }

  private buildPhaseIntroMessage(phase: CreationPhase): string {
    // Mensaje simple sin estructura de fases
    const question = phase.questions.length > 0
      ? phase.questions[0].question
      : '¿Qué más quieres agregar?';
    return `Genial! ${question}`;
  }

  private populateUniverseOptions(): void {
    const universes = this.universeStore.allUniverses();
    const universePhase = this.currentPhases.find(p => p.id === 'universe_selection');
    if (universePhase) {
      const universeQuestion = universePhase.questions.find(q => q.id === 'universeId');
      if (universeQuestion) {
        universeQuestion.options = universes.map(u => u.name);
      }
      universePhase.suggestedResponses = universes.slice(0, 4).map(u => u.name);
    }
  }

  private setSuggestedActionsForPhase(): void {
    const currentPhase = this.currentPhases[this.currentPhaseIndex];
    if (currentPhase?.suggestedResponses.length > 0) {
      this.creationStore.setSuggestedActions(currentPhase.suggestedResponses);
    }
  }

  private async extractDataFromMessage(message: string): Promise<void> {
    const currentPhase = this.currentPhases[this.currentPhaseIndex];
    if (!currentPhase) return;

    // Extracción simple basada en el contexto de la fase
    // En producción, esto podría usar NER o el propio modelo para extraer

    // Para universos
    if (this.creationStore.mode() === 'universe') {
      if (currentPhase.id === 'concept') {
        // Detectar nombre si parece un nombre
        if (!this.collectedData['name'] && message.length < 50 && !message.includes('?')) {
          // Podría ser el nombre
          if (message.toLowerCase().includes('se llama') || message.toLowerCase().includes('llamo')) {
            const match = message.match(/(?:se llama|llamo)\s+["']?([^"']+)["']?/i);
            if (match) this.collectedData['name'] = match[1].trim();
          }
        }
        // Detectar temática
        const themes = ['fantasía', 'ciencia ficción', 'sci-fi', 'post-apocalíptico', 'cyberpunk', 'steampunk', 'medieval'];
        for (const theme of themes) {
          if (message.toLowerCase().includes(theme)) {
            this.collectedData['theme'] = theme;
            break;
          }
        }
      }
      if (currentPhase.id === 'races') {
        // Detectar número de razas
        const numberMatch = message.match(/(\d+)\s*raza/i);
        if (numberMatch) {
          this.collectedData['raceCount'] = parseInt(numberMatch[1]);
        }
      }
      if (currentPhase.id === 'statistics') {
        // Detectar número de stats
        const statMatch = message.match(/(\d+)\s*(?:stats?|estadísticas?)/i);
        if (statMatch) {
          this.collectedData['statCount'] = parseInt(statMatch[1]);
        }
      }
    }

    // Para personajes
    if (this.creationStore.mode() === 'character') {
      if (currentPhase.id === 'universe_selection') {
        // Detectar selección de universo
        const universes = this.universeStore.allUniverses();
        for (const universe of universes) {
          if (message.toLowerCase().includes(universe.name.toLowerCase())) {
            this.collectedData['universeId'] = universe.id;
            this.collectedData['selectedUniverse'] = universe;
            this.creationStore.setSelectedUniverseId(universe.id ?? null);
            break;
          }
        }
      }
    }

    // Actualizar contexto con datos recolectados
    this.creationStore.updateContext('collectedData', this.collectedData);
  }

  private async generatePhaseAwareResponse(userMessage: string): Promise<string> {
    const mode = this.creationStore.mode();
    const currentPhase = this.currentPhases[this.currentPhaseIndex];
    const history = this.creationStore.getConversationHistory();

    this.log(`--- Building system prompt ---`);
    this.log(`Mode: ${mode}, Phase: ${currentPhase?.id || 'none'}`);

    // Construir prompt específico de la fase
    let systemPrompt = this.ragContext.getSystemKnowledge();

    // Agregar conocimiento específico de la fase
    systemPrompt += `\n\n${currentPhase?.ragPrompt || ''}`;

    // Agregar datos ya recolectados
    if (Object.keys(this.collectedData).length > 0) {
      systemPrompt += `\n\n###DATOS YA RECOLECTADOS###\n${JSON.stringify(this.collectedData, null, 2)}`;
    }

    // Para personajes, agregar info del universo seleccionado
    if (mode === 'character' && this.collectedData['selectedUniverse']) {
      const universe = this.collectedData['selectedUniverse'] as Universe;
      systemPrompt += `\n\n###UNIVERSO SELECCIONADO###\n`;
      systemPrompt += `Nombre: ${universe.name}\n`;
      systemPrompt += `Stats disponibles: ${Object.keys(universe.statDefinitions).join(', ')}\n`;
      systemPrompt += `Rangos: ${universe.awakeningSystem?.levels.join(' → ')}\n`;
    }

    // Instrucciones de fase - MUY CONCISAS
    systemPrompt += `\n\nFASE: ${currentPhase?.name || 'General'} (${this.currentPhaseIndex + 1}/${this.currentPhases.length})`;

    if (currentPhase?.questions.length) {
      const pendingQuestions = currentPhase.questions.filter(
        q => !this.collectedData[q.field]
      );
      if (pendingQuestions.length > 0) {
        // Solo la primera pregunta pendiente
        systemPrompt += `\nPREGUNTA A HACER: "${pendingQuestions[0].question}"`;
        systemPrompt += `\nResponde breve y haz SOLO esta pregunta.`;
      } else {
        systemPrompt += `\nFase completa. Di "¡Perfecto!" y pregunta si quiere continuar.`;
      }
    }

    // Recordatorio final muy corto
    systemPrompt += `\n\nRECUERDA: Máximo 2 oraciones. 1 pregunta. No repitas instrucciones.`;

    this.log(`System prompt length: ${systemPrompt.length} chars`);
    this.log(`System prompt preview: "${systemPrompt.substring(0, 300)}..."`);

    // Preparar mensajes
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.slice(-6).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: userMessage }
    ];

    this.log(`Total messages to send: ${messages.length}`);
    this.log(`History messages included: ${Math.min(history.length, 6)}`);

    // Enviar al modelo
    this.log(`Calling WebLLM.chat()...`);
    const response = await this.webLLM.chat(messages);

    // Limpiar respuesta si contiene prompts del sistema
    let cleanedResponse = response;
    if (response.includes('###CONOCIMIENTO') || response.includes('###INSTRUCCIONES') || response.includes('###HABILIDADES')) {
      this.logWarn(`Response contains system prompt markers - cleaning...`);
      // Intentar extraer solo la parte útil
      const parts = response.split('---');
      if (parts.length > 1) {
        cleanedResponse = parts[0].trim();
      } else {
        // Buscar el inicio de la respuesta real
        const markers = ['###CONOCIMIENTO', '###INSTRUCCIONES', '###HABILIDADES', '###MANEJO'];
        let firstMarkerIndex = response.length;
        for (const marker of markers) {
          const idx = response.indexOf(marker);
          if (idx > 0 && idx < firstMarkerIndex) {
            firstMarkerIndex = idx;
          }
        }
        if (firstMarkerIndex > 50) {
          cleanedResponse = response.substring(0, firstMarkerIndex).trim();
        }
      }
      this.log(`Cleaned response length: ${cleanedResponse.length} (original: ${response.length})`);
    }

    return cleanedResponse;
  }

  private async checkPhaseCompletion(response: string): Promise<void> {
    const currentPhase = this.currentPhases[this.currentPhaseIndex];
    if (!currentPhase) return;

    // Verificar si la fase está completa
    if (isPhaseComplete(currentPhase, this.collectedData)) {
      // Si no es la última fase y la respuesta sugiere avanzar
      if (this.currentPhaseIndex < this.currentPhases.length - 1) {
        const shouldAdvance =
          response.toLowerCase().includes('siguiente fase') ||
          response.toLowerCase().includes('pasemos a') ||
          response.toLowerCase().includes('continuemos con');

        if (shouldAdvance) {
          await this.advanceToNextPhase();
        }
      }
    }

    // Detectar si hay JSON en la respuesta (contenido generado)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const jsonContent = JSON.parse(jsonMatch[1]);
        const mode = this.creationStore.mode();

        if (mode === 'universe' && jsonContent.name && jsonContent.statDefinitions) {
          this.creationStore.setGeneratedUniverse(jsonContent);
          this.creationStore.setPhase('reviewing');
        } else if (mode === 'character' && jsonContent.name && jsonContent.stats) {
          this.creationStore.setGeneratedCharacter(jsonContent);
          this.creationStore.setPhase('reviewing');
        }
      } catch (e) {
        console.error('Error parsing JSON:', e);
      }
    }
  }

  private async generateFinalContent(): Promise<void> {
    const mode = this.creationStore.mode();

    this.creationStore.addMessage({
      role: 'assistant',
      content: '⏳ Generando tu ' + (mode === 'universe' ? 'universo' : 'personaje') + ' basado en toda la información recopilada...'
    });

    this.creationStore.setGenerating(true);

    try {
      // Construir prompt de generación final
      let systemPrompt = this.ragContext.getSystemKnowledge();
      systemPrompt += `\n\n###TAREA: GENERACIÓN FINAL###\n`;
      systemPrompt += `Genera el JSON completo del ${mode === 'universe' ? 'universo' : 'personaje'} con TODA la información recolectada.\n\n`;
      systemPrompt += `###DATOS RECOLECTADOS###\n${JSON.stringify(this.collectedData, null, 2)}\n\n`;

      if (mode === 'universe') {
        systemPrompt += this.ragContext.getUniverseCreationKnowledge();
        systemPrompt += `\n\nGENERA UN JSON COMPLETO Y VÁLIDO dentro de bloques \`\`\`json\`\`\``;
      } else if (mode === 'character') {
        const universe = this.collectedData['selectedUniverse'] as Universe;
        if (universe) {
          systemPrompt += this.ragContext.getCharacterCreationKnowledge(universe);
        }
        systemPrompt += `\n\nGENERA UN JSON COMPLETO Y VÁLIDO dentro de bloques \`\`\`json\`\`\``;
      }

      const response = await this.webLLM.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Genera el JSON final con toda la información.' }
      ]);

      this.creationStore.addMessage({
        role: 'assistant',
        content: response
      });

      // Extraer y guardar el JSON
      await this.checkPhaseCompletion(response);

    } catch (error) {
      console.error('Error generating final content:', error);
      this.creationStore.addMessage({
        role: 'assistant',
        content: '❌ Hubo un error al generar. ¿Quieres que lo intente de nuevo?'
      });
    } finally {
      this.creationStore.setGenerating(false);
    }
  }
}
