import { Injectable, signal } from '@angular/core';
import * as webllm from '@mlc-ai/web-llm';
import { ProgressionRule } from '../models';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StatSuggestion {
  stat: string;
  change: number;
  reason: string;
}

export interface AIAnalysisResult {
  analysis: string;
  stat_changes: StatSuggestion[];
  confidence: number;
}

export interface WebGPUStatus {
  supported: boolean;
  reason?: string;
}

// Logger prefix for filtering
const LOG_PREFIX = '[WebLLM]';

@Injectable({ providedIn: 'root' })
export class WebLLMService {
  private engine: webllm.MLCEngineInterface | null = null;

  // Signals for reactive state
  isLoading = signal(false);
  isReady = signal(false);
  loadingProgress = signal(0);
  loadingText = signal('');
  error = signal<string | null>(null);

  private readonly MODEL_ID = 'Phi-3-mini-4k-instruct-q4f16_1-MLC-1k';

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

  private readonly FEW_SHOT_EXAMPLES = `
###EJEMPLO 1 - Entrenamiento Físico###
Acción: "Pasé la mañana levantando rocas y corriendo por la montaña."
{"analysis": "Entrenamiento físico combinando fuerza y resistencia", "stat_changes": [{"stat": "strength", "change": 2, "reason": "Levantar rocas desarrolla fuerza"}, {"stat": "vitality", "change": 1, "reason": "Cardio mejora resistencia"}], "confidence": 0.9}

###EJEMPLO 2 - Combate Real###
Acción: "Derroté a 5 goblins en el dungeon de rango E."
{"analysis": "Combate contra enemigos débiles, experiencia moderada", "stat_changes": [{"stat": "strength", "change": 1, "reason": "Práctica de combate"}, {"stat": "agility", "change": 1, "reason": "Esquivar múltiples enemigos"}], "confidence": 0.85}

###EJEMPLO 3 - Sin Aplicación###
Acción: "Descansé todo el día en la posada."
{"analysis": "Actividad de descanso sin impacto en estadísticas", "stat_changes": [], "confidence": 0.95}

###EJEMPLO 4 - Estudio y Magia###
Acción: "Estudié grimorios antiguos toda la noche."
{"analysis": "Entrenamiento mental intensivo", "stat_changes": [{"stat": "intelligence", "change": 2, "reason": "Estudio de conocimiento arcano"}, {"stat": "perception", "change": 1, "reason": "Atención a detalles mágicos"}], "confidence": 0.88}
`;

  async checkWebGPUSupport(): Promise<WebGPUStatus> {
    const nav = navigator as any;
    if (!nav.gpu) {
      return {
        supported: false,
        reason: 'WebGPU no disponible en este navegador. Usa Chrome, Edge o Firefox actualizado.'
      };
    }

    try {
      const adapter = await nav.gpu.requestAdapter();
      if (!adapter) {
        return {
          supported: false,
          reason: 'No se encontró adaptador GPU compatible. Verifica los drivers de tu tarjeta gráfica.'
        };
      }

      const device = await adapter.requestDevice();
      if (!device) {
        return {
          supported: false,
          reason: 'No se pudo inicializar el dispositivo GPU.'
        };
      }

      return { supported: true };
    } catch (e) {
      return {
        supported: false,
        reason: `Error al verificar WebGPU: ${e instanceof Error ? e.message : String(e)}`
      };
    }
  }

  async initialize(): Promise<void> {
    this.log(`========== INITIALIZING MODEL ==========`);
    this.log(`Model ID: ${this.MODEL_ID}`);

    const gpuCheck = await this.checkWebGPUSupport();
    this.log(`WebGPU supported: ${gpuCheck.supported}`);
    if (!gpuCheck.supported) {
      this.logError(`WebGPU not supported: ${gpuCheck.reason}`);
      this.error.set(gpuCheck.reason ?? 'WebGPU no soportado');
      throw new Error(gpuCheck.reason);
    }

    if (this.isReady()) {
      this.log(`Model already ready - skipping initialization`);
      return;
    }

    if (this.isLoading()) {
      this.log(`Model already loading - skipping`);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.loadingProgress.set(0);
    this.loadingText.set('Iniciando descarga del modelo...');

    try {
      this.log(`Creating MLC Engine...`);
      const startTime = Date.now();

      this.engine = await webllm.CreateMLCEngine(this.MODEL_ID, {
        initProgressCallback: (progress) => {
          const percent = Math.round(progress.progress * 100);
          this.loadingProgress.set(percent);
          this.loadingText.set(progress.text);
          // Log every 10%
          if (percent % 10 === 0) {
            this.log(`Loading: ${percent}% - ${progress.text}`);
          }
        }
      });

      const elapsed = Date.now() - startTime;
      this.log(`Model loaded successfully in ${elapsed}ms`);
      this.isReady.set(true);
      this.loadingText.set('Modelo listo');
    } catch (e) {
      const errorMessage = `Error inicializando modelo: ${e instanceof Error ? e.message : String(e)}`;
      this.logError(`Initialization failed:`, e);
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  async analyzeAction(
    actionText: string,
    characterContext: {
      name: string;
      stats: Record<string, number>;
      progression: { level: number };
    },
    progressionRules: ProgressionRule[]
  ): Promise<AIAnalysisResult> {
    if (!this.engine) {
      throw new Error('El motor de IA no está inicializado. Carga el modelo primero.');
    }

    const systemPrompt = this.buildSystemPrompt(progressionRules);
    const userPrompt = this.buildUserPrompt(actionText, characterContext);

    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseAndValidateResponse(content, progressionRules);
    } catch (e) {
      console.error('Error analyzing action:', e);
      return {
        analysis: 'Error al procesar la solicitud',
        stat_changes: [],
        confidence: 0
      };
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    this.log(`========== CHAT REQUEST ==========`);
    this.log(`Total messages: ${messages.length}`);

    if (!this.engine) {
      this.logError(`Engine not initialized!`);
      throw new Error('El motor de IA no está inicializado');
    }

    // Log each message summary
    messages.forEach((msg, i) => {
      const preview = msg.content.substring(0, 150).replace(/\n/g, ' ');
      this.log(`  [${i}] ${msg.role}: "${preview}${msg.content.length > 150 ? '...' : ''}" (${msg.content.length} chars)`);
    });

    // Calculate total tokens estimate (rough: 4 chars per token)
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);
    this.log(`Estimated input tokens: ~${estimatedTokens}`);

    if (estimatedTokens > 3000) {
      this.logWarn(`Input may be too long for model context window!`);
    }

    this.log(`🧠 Starting generation (streaming mode)...`);
    const startTime = Date.now();
    let tokenCount = 0;
    let content = '';
    let lastLogTime = startTime;
    let lastTokenCount = 0;

    try {
      // Use streaming to see tokens as they're generated
      // max_tokens reducido para forzar respuestas cortas
      const stream = await this.engine.chat.completions.create({
        messages,
        temperature: 0.6, // Un poco menos de creatividad para ser más directo
        max_tokens: 150,  // Máximo ~3-4 oraciones
        stream: true // Enable streaming!
      });

      this.log(`🧠 Stream started - generating tokens...`);

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          content += delta;
          tokenCount++;

          // Log progress every 500ms or every 20 tokens
          const now = Date.now();
          if (now - lastLogTime >= 500 || tokenCount - lastTokenCount >= 20) {
            const elapsed = (now - startTime) / 1000;
            const tokensPerSec = tokenCount / elapsed;
            const preview = content.slice(-50).replace(/\n/g, ' ');

            this.log(`🧠 [${tokenCount} tokens | ${tokensPerSec.toFixed(1)} tok/s | ${elapsed.toFixed(1)}s] ...${preview}`);

            lastLogTime = now;
            lastTokenCount = tokenCount;
          }
        }
      }

      const elapsed = Date.now() - startTime;
      const tokensPerSecond = tokenCount / (elapsed / 1000);

      this.log(`✅ Generation complete!`);
      this.log(`   📊 Total tokens: ${tokenCount}`);
      this.log(`   ⏱️ Time: ${elapsed}ms (${(elapsed/1000).toFixed(2)}s)`);
      this.log(`   🚀 Speed: ${tokensPerSecond.toFixed(2)} tokens/sec`);
      this.log(`   📝 Response length: ${content.length} chars`);

      // Try to get runtime stats from engine
      try {
        const stats = await this.engine.runtimeStatsText();
        if (stats) {
          this.log(`   📈 Runtime stats:`);
          stats.split('\n').filter(line => line.trim()).forEach(line => {
            this.log(`      ${line.trim()}`);
          });
        }
      } catch {
        // Stats not available, skip
      }

      this.log(`   📄 Full response:`);
      // Log full response in chunks for readability
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.trim()) {
          this.log(`      ${i + 1}: ${line}`);
        }
      });

      // Check for common issues
      if (content.includes('###') && content.includes('CONOCIMIENTO')) {
        this.logWarn(`⚠️ Response may contain leaked system prompt!`);
        this.logWarn(`⚠️ This indicates the model is confused and repeating instructions`);
      }

      if (content.length < 10) {
        this.logWarn(`⚠️ Response suspiciously short`);
      }

      this.log(`========== CHAT COMPLETE ==========`);
      return content;

    } catch (error) {
      this.logError(`Chat completion failed:`, error);
      throw error;
    }
  }

  /**
   * Chat with streaming callback for real-time UI updates
   */
  async chatWithStreaming(
    messages: ChatMessage[],
    onToken: (token: string, fullContent: string) => void
  ): Promise<string> {
    this.log(`========== STREAMING CHAT REQUEST ==========`);
    this.log(`Messages count: ${messages.length}`);

    // Log each message for debugging
    messages.forEach((msg, i) => {
      const preview = msg.content.substring(0, 200).replace(/\n/g, '\\n');
      this.log(`[${i}] ${msg.role.toUpperCase()}: "${preview}${msg.content.length > 200 ? '...' : ''}" (${msg.content.length} chars)`);
    });

    if (!this.engine) {
      throw new Error('El motor de IA no está inicializado');
    }

    const startTime = Date.now();
    let tokenCount = 0;
    let content = '';

    try {
      // IMPORTANTE: max_tokens reducido para forzar respuestas CORTAS
      // El modelo Phi-3 mini tiende a divagar con valores altos
      const stream = await this.engine.chat.completions.create({
        messages,
        temperature: 0.6, // Más bajo = más consistente
        max_tokens: 150,  // Máximo ~2-3 oraciones cortas
        stream: true
      });
      this.log(`Stream started with max_tokens=150, temperature=0.6`);

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          content += delta;
          tokenCount++;
          onToken(delta, content);
        }
      }

      const elapsed = Date.now() - startTime;
      this.log(`Streaming complete: ${tokenCount} tokens in ${elapsed}ms`);

      return content;

    } catch (error) {
      this.logError(`Streaming chat failed:`, error);
      throw error;
    }
  }

  private buildSystemPrompt(rules: ProgressionRule[]): string {
    const rulesText = rules
      .map(
        (r) =>
          `- ${r.description}: keywords [${r.keywords.join(', ')}] → stats [${r.affectedStats.join(', ')}] (max +${r.maxChangePerAction})`
      )
      .join('\n');

    return `Eres un Maestro de Juego RPG que analiza acciones de personajes.
Tu tarea es ANALIZAR el texto y SUGERIR aumentos de estadísticas siguiendo ESTRICTAMENTE estas reglas:

###REGLAS DE PROGRESIÓN###
${rulesText}

###EJEMPLOS DE ANÁLISIS###
${this.FEW_SHOT_EXAMPLES}

###INSTRUCCIONES###
1. Lee la acción del usuario
2. Identifica keywords que coincidan con las reglas
3. Sugiere aumentos SOLO para stats permitidos por las reglas coincidentes
4. NO excedas el máximo de cambio por regla
5. El cambio mínimo es 1, máximo según la regla
6. Responde ÚNICAMENTE en formato JSON válido

###FORMATO DE RESPUESTA###
{
  "analysis": "breve análisis de la acción (máx 50 palabras)",
  "stat_changes": [
    {"stat": "nombre_stat", "change": numero_1_a_5, "reason": "razón breve"}
  ],
  "confidence": 0.0_a_1.0
}

Si la acción no coincide con ninguna regla:
{"analysis": "No aplicable", "stat_changes": [], "confidence": 0}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.`;
  }

  private buildUserPrompt(
    action: string,
    character: {
      name: string;
      stats: Record<string, number>;
      progression: { level: number };
    }
  ): string {
    const statsText = Object.entries(character.stats)
      .map(([key, val]) => `${key}: ${val}`)
      .join(', ');

    return `###PERSONAJE###
Nombre: ${character.name}
Nivel: ${character.progression.level}
Stats actuales: ${statsText}

###ACCIÓN A ANALIZAR###
"${action}"

Analiza esta acción y sugiere aumentos de stats siguiendo las reglas.`;
  }

  private parseAndValidateResponse(
    content: string,
    rules: ProgressionRule[]
  ): AIAnalysisResult {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!result.analysis || !Array.isArray(result.stat_changes)) {
        throw new Error('Invalid response structure');
      }

      // Validate and cap changes according to rules
      const validatedChanges = result.stat_changes
        .filter((change: StatSuggestion) => {
          // Check if stat is in any rule
          const applicableRule = rules.find((r) =>
            r.affectedStats.includes(change.stat)
          );
          return applicableRule !== undefined;
        })
        .map((change: StatSuggestion) => {
          // Find the rule and cap the change
          const applicableRule = rules.find((r) =>
            r.affectedStats.includes(change.stat)
          );
          const maxChange = applicableRule?.maxChangePerAction ?? 1;

          return {
            stat: change.stat,
            change: Math.min(Math.max(1, change.change), maxChange),
            reason: change.reason || 'Sin razón especificada'
          };
        });

      return {
        analysis: result.analysis,
        stat_changes: validatedChanges,
        confidence: Math.min(1, Math.max(0, result.confidence || 0.5))
      };
    } catch (e) {
      console.error('Error parsing AI response:', e, 'Raw content:', content);
      return {
        analysis: 'Error al procesar la respuesta del modelo',
        stat_changes: [],
        confidence: 0
      };
    }
  }

  async unload(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
      this.isReady.set(false);
      this.loadingProgress.set(0);
      this.loadingText.set('');
    }
  }

  getModelInfo(): { id: string; loaded: boolean } {
    return {
      id: this.MODEL_ID,
      loaded: this.isReady()
    };
  }
}
