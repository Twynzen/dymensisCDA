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
    if (!navigator.gpu) {
      return {
        supported: false,
        reason: 'WebGPU no disponible en este navegador. Usa Chrome, Edge o Firefox actualizado.'
      };
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
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
    const gpuCheck = await this.checkWebGPUSupport();
    if (!gpuCheck.supported) {
      this.error.set(gpuCheck.reason ?? 'WebGPU no soportado');
      throw new Error(gpuCheck.reason);
    }

    if (this.isReady() || this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.loadingProgress.set(0);
    this.loadingText.set('Iniciando descarga del modelo...');

    try {
      this.engine = await webllm.CreateMLCEngine(this.MODEL_ID, {
        initProgressCallback: (progress) => {
          this.loadingProgress.set(Math.round(progress.progress * 100));
          this.loadingText.set(progress.text);
        }
      });

      this.isReady.set(true);
      this.loadingText.set('Modelo listo');
    } catch (e) {
      const errorMessage = `Error inicializando modelo: ${e instanceof Error ? e.message : String(e)}`;
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
    if (!this.engine) {
      throw new Error('El motor de IA no está inicializado');
    }

    const response = await this.engine.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0]?.message?.content || '';
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
