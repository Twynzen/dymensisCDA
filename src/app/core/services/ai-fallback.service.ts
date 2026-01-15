import { Injectable, inject } from '@angular/core';
import { WebLLMService, AIAnalysisResult, StatSuggestion } from './webllm.service';
import { ProgressionRule } from '../models';

export type AIProvider = 'webllm' | 'rules-only';

@Injectable({ providedIn: 'root' })
export class AIFallbackService {
  private webLLMService = inject(WebLLMService);

  async getAvailableProvider(): Promise<AIProvider> {
    const gpuStatus = await this.webLLMService.checkWebGPUSupport();
    return gpuStatus.supported ? 'webllm' : 'rules-only';
  }

  /**
   * Analyzes an action using simple keyword matching.
   * This is a fallback for browsers without WebGPU support.
   */
  analyzeWithRulesOnly(
    action: string,
    rules: ProgressionRule[]
  ): AIAnalysisResult {
    const actionLower = action.toLowerCase();
    const changes: StatSuggestion[] = [];
    const matchedRules: string[] = [];

    rules.forEach((rule) => {
      const matchedKeyword = rule.keywords.find((keyword) =>
        actionLower.includes(keyword.toLowerCase())
      );

      if (matchedKeyword) {
        matchedRules.push(rule.description);

        // Add stats from this rule that haven't been added yet
        rule.affectedStats.forEach((stat, index) => {
          const existingChange = changes.find((c) => c.stat === stat);
          if (!existingChange) {
            // First stat gets higher change, others get less
            const changeAmount = Math.max(1, rule.maxChangePerAction - index);
            changes.push({
              stat,
              change: Math.min(changeAmount, rule.maxChangePerAction),
              reason: `Keyword detectada: "${matchedKeyword}"`
            });
          } else {
            // If stat already exists, increase its change (cap at max)
            existingChange.change = Math.min(
              existingChange.change + 1,
              rule.maxChangePerAction
            );
          }
        });
      }
    });

    // Limit to top 4 changes
    const topChanges = changes
      .sort((a, b) => b.change - a.change)
      .slice(0, 4);

    const analysis =
      matchedRules.length > 0
        ? `Análisis basado en reglas: ${matchedRules.join(', ')}`
        : 'No se encontraron coincidencias con las reglas de progresión';

    return {
      analysis,
      stat_changes: topChanges,
      confidence: matchedRules.length > 0 ? 0.6 : 0
    };
  }

  /**
   * Main analysis method that tries WebLLM first, then falls back to rules-only
   */
  async analyzeAction(
    action: string,
    characterContext: {
      name: string;
      stats: Record<string, number>;
      progression: { level: number };
    },
    progressionRules: ProgressionRule[],
    forceProvider?: AIProvider
  ): Promise<{ result: AIAnalysisResult; provider: AIProvider }> {
    const provider = forceProvider || (await this.getAvailableProvider());

    if (provider === 'webllm' && this.webLLMService.isReady()) {
      try {
        const result = await this.webLLMService.analyzeAction(
          action,
          characterContext,
          progressionRules
        );
        return { result, provider: 'webllm' };
      } catch (error) {
        console.warn('WebLLM analysis failed, falling back to rules-only:', error);
        return {
          result: this.analyzeWithRulesOnly(action, progressionRules),
          provider: 'rules-only'
        };
      }
    }

    return {
      result: this.analyzeWithRulesOnly(action, progressionRules),
      provider: 'rules-only'
    };
  }
}
