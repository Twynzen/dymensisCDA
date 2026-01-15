import { Injectable, inject } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class CreationService {
  private creationStore = inject(CreationStore);
  private ragContext = inject(RagContextService);
  private webLLM = inject(WebLLMService);
  private universeStore = inject(UniverseStore);
  private characterStore = inject(CharacterStore);

  private pendingImage: { base64: string; mimeType: string } | null = null;
  private collectedData: Record<string, any> = {};

  // Current phase tracking
  private currentPhases: CreationPhase[] = [];
  private currentPhaseIndex = 0;

  /**
   * Inicia un nuevo flujo de creación con sistema de fases
   */
  startCreation(mode: 'universe' | 'character' | 'action'): void {
    this.creationStore.reset();
    this.creationStore.setMode(mode);
    this.creationStore.setPhase('gathering');
    this.collectedData = {};
    this.currentPhaseIndex = 0;

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
    // Agregar mensaje del usuario
    this.creationStore.addMessage({
      role: 'user',
      content: message
    });

    // Verificar si tenemos el modelo cargado
    if (!this.webLLM.isReady()) {
      this.creationStore.addMessage({
        role: 'assistant',
        content: '⚠️ Para continuar, necesito que cargues el modelo de IA primero. Vuelve a la pantalla inicial y presiona "Cargar Modelo de IA".'
      });
      return;
    }

    this.creationStore.setGenerating(true);

    try {
      // Extraer datos del mensaje según la fase actual
      await this.extractDataFromMessage(message);

      // Generar respuesta con contexto de fase
      const response = await this.generatePhaseAwareResponse(message);
      this.creationStore.addMessage({
        role: 'assistant',
        content: response
      });

      // Verificar si la fase está completa
      await this.checkPhaseCompletion(response);

      // Actualizar sugerencias
      this.setSuggestedActionsForPhase();

    } catch (error) {
      console.error('Error generating response:', error);
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
  // MÉTODOS PRIVADOS
  // ============================================

  private buildPhaseWelcomeMessage(): string {
    const mode = this.creationStore.mode();
    const firstPhase = this.currentPhases[0];

    if (mode === 'universe') {
      return `🌟 **¡Vamos a crear tu universo!**\n\n` +
        `Te guiaré paso a paso a través de **${this.currentPhases.length} fases**:\n\n` +
        this.currentPhases.map((p, i) => `${i + 1}. ${p.icon ? '📍' : ''} ${p.name}`).join('\n') +
        `\n\n---\n\n` +
        `📍 **Fase 1: ${firstPhase.name}**\n` +
        `${firstPhase.description}\n\n` +
        `Empecemos: **¿Cómo se llama tu universo?**\n\n` +
        `💡 También puedes **subir imágenes** en cualquier momento para usarlas como portada o lugares.`;
    } else if (mode === 'character') {
      const universes = this.universeStore.allUniverses();
      if (universes.length === 0) {
        return `⚠️ **No tienes universos creados**\n\n` +
          `Los personajes necesitan pertenecer a un universo que defina sus estadísticas y reglas.\n\n` +
          `¿Te gustaría **crear un universo primero**?`;
      }
      return `🌟 **¡Vamos a crear tu personaje!**\n\n` +
        `Te guiaré paso a paso a través de **${this.currentPhases.length} fases**:\n\n` +
        this.currentPhases.map((p, i) => `${i + 1}. ${p.name}`).join('\n') +
        `\n\n---\n\n` +
        `📍 **Fase 1: ${firstPhase.name}**\n\n` +
        `Tienes ${universes.length} universo${universes.length > 1 ? 's' : ''} disponible${universes.length > 1 ? 's' : ''}:\n` +
        universes.map(u => `• **${u.name}**`).join('\n') +
        `\n\n**¿En cuál quieres crear tu personaje?**`;
    }

    return '¿En qué puedo ayudarte hoy?';
  }

  private buildPhaseIntroMessage(phase: CreationPhase): string {
    const progress = this.getPhaseProgress();
    return `---\n\n` +
      `📍 **Fase ${progress.current}/${progress.total}: ${phase.name}** (${Math.round(progress.percentage)}%)\n` +
      `${phase.description}\n\n` +
      (phase.questions.length > 0
        ? `${phase.questions[0].question}`
        : 'Revisemos lo que tenemos...');
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

    // Instrucciones de fase
    systemPrompt += `\n\n###INSTRUCCIONES###\n`;
    systemPrompt += `Estás en la fase "${currentPhase?.name}".\n`;
    systemPrompt += `Progreso: ${this.currentPhaseIndex + 1}/${this.currentPhases.length}\n\n`;

    if (currentPhase?.questions.length) {
      const pendingQuestions = currentPhase.questions.filter(
        q => !this.collectedData[q.field]
      );
      if (pendingQuestions.length > 0) {
        systemPrompt += `Preguntas pendientes de esta fase:\n`;
        pendingQuestions.forEach(q => {
          systemPrompt += `- ${q.question}\n`;
        });
      } else {
        systemPrompt += `Todas las preguntas de esta fase han sido respondidas.\n`;
        systemPrompt += `Confirma la información y sugiere pasar a la siguiente fase.\n`;
      }
    }

    // Enviar al modelo
    const response = await this.webLLM.chat([
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: userMessage }
    ]);

    return response;
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
