import { Injectable } from '@angular/core';
import { StatDefinition, AwakeningSystem } from '../models/universe.model';

@Injectable({ providedIn: 'root' })
export class StatValidationService {

  /**
   * Validates a stat value against its definition limits (minValue/maxValue)
   */
  validateStatValue(value: number, statDef: StatDefinition): number {
    const min = statDef.minValue ?? 0;
    const max = statDef.maxValue ?? 999;
    return Math.max(min, Math.min(value, max));
  }

  /**
   * Validates all stats against their definitions
   */
  validateAllStats(
    stats: Record<string, number>,
    statDefs: Record<string, StatDefinition>
  ): Record<string, number> {
    const validated: Record<string, number> = {};
    for (const [key, value] of Object.entries(stats)) {
      const def = statDefs[key];
      if (def) {
        validated[key] = this.validateStatValue(value, def);
      } else {
        validated[key] = value;
      }
    }
    return validated;
  }

  /**
   * Calculates derived stats based on formulas in stat definitions
   */
  calculateDerivedStats(
    stats: Record<string, number>,
    statDefs: Record<string, StatDefinition>
  ): Record<string, number> {
    const derived: Record<string, number> = {};
    for (const [key, def] of Object.entries(statDefs)) {
      if (def.isDerived && def.formula) {
        derived[key] = this.evaluateFormula(def.formula, stats);
      }
    }
    return derived;
  }

  /**
   * Calculates awakening level based on total stats and thresholds
   */
  calculateAwakening(
    stats: Record<string, number>,
    awakeningSystem: AwakeningSystem
  ): string {
    if (!awakeningSystem.enabled) {
      return awakeningSystem.levels[0] || 'E';
    }

    const total = Object.values(stats).reduce((sum, v) => sum + v, 0);

    for (let i = awakeningSystem.thresholds.length - 1; i >= 0; i--) {
      if (total >= awakeningSystem.thresholds[i]) {
        return awakeningSystem.levels[i];
      }
    }

    return awakeningSystem.levels[0] || 'E';
  }

  /**
   * Get the total of all stats
   */
  getTotalStats(stats: Record<string, number>): number {
    return Object.values(stats).reduce((sum, v) => sum + v, 0);
  }

  /**
   * Evaluates a simple formula string with stat values
   * Supports: +, -, *, /, parentheses, and stat keys
   * Example: "(strength + agility) / 2"
   */
  evaluateFormula(formula: string, stats: Record<string, number>): number {
    try {
      // Replace stat keys with their values
      let expression = formula;
      for (const [key, value] of Object.entries(stats)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        expression = expression.replace(regex, value.toString());
      }

      // Basic sanitization - only allow numbers, operators, parentheses, spaces, and dots
      if (!/^[\d\s+\-*/().]+$/.test(expression)) {
        console.warn('Invalid formula expression:', expression);
        return 0;
      }

      // Evaluate the expression
      const result = Function(`"use strict"; return (${expression})`)();
      return Math.round(result);
    } catch (error) {
      console.error('Error evaluating formula:', formula, error);
      return 0;
    }
  }
}
