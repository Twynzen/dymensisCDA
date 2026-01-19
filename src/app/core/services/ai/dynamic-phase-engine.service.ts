/**
 * Dynamic Phase Engine Service
 * Calculates phase progress, determines skippable phases, and manages dynamic flow
 */

import { Injectable, inject } from '@angular/core';
import {
  DynamicPhaseState,
  BulkExtraction,
  UNIVERSE_EXTRACTABLE_FIELDS,
  CHARACTER_EXTRACTABLE_FIELDS,
  ExtractableField
} from '../../../modules/creation/models/agentic-action.model';
import { IntentDetectorService } from './intent-detector.service';
import { SupportedLanguage } from '../../models';

/** Phase definition for dynamic engine */
export interface DynamicPhase {
  id: string;
  name: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  weight: number;
  canSkip: boolean;
  skipCondition?: (filledFields: string[]) => boolean;
}

/** Universe creation phases */
export const UNIVERSE_DYNAMIC_PHASES: DynamicPhase[] = [
  {
    id: 'concept',
    name: 'Concepto',
    description: 'Nombre y temática del universo',
    requiredFields: ['name', 'theme'],
    optionalFields: ['description'],
    weight: 2,
    canSkip: false
  },
  {
    id: 'statistics',
    name: 'Estadísticas',
    description: 'Stats y sistema de atributos',
    requiredFields: [],
    optionalFields: ['statCount', 'statNames'],
    weight: 2,
    canSkip: true,
    skipCondition: (filled) => filled.includes('statNames') || filled.includes('statCount')
  },
  {
    id: 'ranks',
    name: 'Rangos',
    description: 'Sistema de rangos y progresión',
    requiredFields: [],
    optionalFields: ['rankSystem', 'initialPoints'],
    weight: 1.5,
    canSkip: true,
    skipCondition: (filled) => filled.includes('rankSystem')
  },
  {
    id: 'rules',
    name: 'Reglas',
    description: 'Reglas de progresión',
    requiredFields: [],
    optionalFields: ['progressionRules'],
    weight: 1,
    canSkip: true
  },
  {
    id: 'appearance',
    name: 'Apariencia',
    description: 'Imágenes y estilo visual',
    requiredFields: [],
    optionalFields: ['coverImage', 'locations'],
    weight: 0.5,
    canSkip: true
  },
  {
    id: 'review',
    name: 'Revisión',
    description: 'Confirmar y guardar',
    requiredFields: [],
    optionalFields: [],
    weight: 0,
    canSkip: false
  }
];

/** Character creation phases */
export const CHARACTER_DYNAMIC_PHASES: DynamicPhase[] = [
  {
    id: 'universe_selection',
    name: 'Universo',
    description: 'Seleccionar universo',
    requiredFields: ['universeId'],
    optionalFields: [],
    weight: 2,
    canSkip: false
  },
  {
    id: 'identity',
    name: 'Identidad',
    description: 'Nombre y concepto',
    requiredFields: ['name'],
    optionalFields: ['class', 'description'],
    weight: 2,
    canSkip: false
  },
  {
    id: 'backstory',
    name: 'Historia',
    description: 'Trasfondo del personaje',
    requiredFields: [],
    optionalFields: ['backstory'],
    weight: 1,
    canSkip: true
  },
  {
    id: 'stats',
    name: 'Estadísticas',
    description: 'Distribución de stats',
    requiredFields: [],
    optionalFields: ['specialty', 'statDistribution'],
    weight: 1.5,
    canSkip: true,
    skipCondition: (filled) => filled.includes('specialty')
  },
  {
    id: 'level',
    name: 'Nivel',
    description: 'Nivel y rango inicial',
    requiredFields: [],
    optionalFields: ['startingLevel'],
    weight: 0.5,
    canSkip: true
  },
  {
    id: 'appearance',
    name: 'Apariencia',
    description: 'Avatar y estilo',
    requiredFields: [],
    optionalFields: ['avatar'],
    weight: 0.5,
    canSkip: true
  },
  {
    id: 'review',
    name: 'Revisión',
    description: 'Confirmar y guardar',
    requiredFields: [],
    optionalFields: [],
    weight: 0,
    canSkip: false
  }
];

@Injectable({ providedIn: 'root' })
export class DynamicPhaseEngineService {
  private intentDetector = inject(IntentDetectorService);

  /**
   * Calculates the current phase state based on filled fields
   */
  calculatePhaseState(
    mode: 'universe' | 'character',
    filledFields: string[],
    currentPhaseIndex: number = 0
  ): DynamicPhaseState {
    const phases = mode === 'universe' ? UNIVERSE_DYNAMIC_PHASES : CHARACTER_DYNAMIC_PHASES;
    const currentPhase = phases[currentPhaseIndex];

    // Calculate completeness score
    const completenessScore = this.calculateCompletenessScore(mode, filledFields);

    // Determine pending fields
    const allRequiredFields = phases.flatMap(p => p.requiredFields);
    const allOptionalFields = phases.flatMap(p => p.optionalFields);
    const pendingRequired = allRequiredFields.filter(f => !filledFields.includes(f));
    const pendingOptional = allOptionalFields.filter(f => !filledFields.includes(f));

    // Determine skippable phases
    const skippablePhases = phases
      .filter((p, i) => i > currentPhaseIndex && p.canSkip)
      .filter(p => {
        if (p.skipCondition) {
          return p.skipCondition(filledFields);
        }
        return true;
      })
      .map(p => p.id);

    // Determine suggested next phase
    let suggestedNextPhase: string | null = null;
    if (currentPhaseIndex < phases.length - 1) {
      // Check if we can skip to a later phase
      if (completenessScore >= 70) {
        suggestedNextPhase = 'review';
      } else {
        // Find next phase that needs work
        for (let i = currentPhaseIndex + 1; i < phases.length; i++) {
          const phase = phases[i];
          const phaseRequiredMissing = phase.requiredFields.filter(f => !filledFields.includes(f));
          if (phaseRequiredMissing.length > 0 || phase.id === 'review') {
            suggestedNextPhase = phase.id;
            break;
          }
        }
      }
    }

    // Determine if we can skip to confirmation
    const canSkipToConfirmation = completenessScore >= 70 && pendingRequired.length === 0;

    return {
      currentPhaseId: currentPhase?.id || '',
      currentPhaseIndex,
      totalPhases: phases.length,
      completenessScore,
      filledFields,
      pendingFields: [...pendingRequired, ...pendingOptional],
      canSkipToConfirmation,
      suggestedNextPhase,
      skippablePhases
    };
  }

  /**
   * Calculates completeness score (0-100) based on filled fields
   */
  calculateCompletenessScore(
    mode: 'universe' | 'character',
    filledFields: string[]
  ): number {
    const fields = mode === 'universe' ? UNIVERSE_EXTRACTABLE_FIELDS : CHARACTER_EXTRACTABLE_FIELDS;

    let totalWeight = 0;
    let filledWeight = 0;

    for (const field of fields) {
      const weight = field.weight || 1;
      totalWeight += weight;

      if (filledFields.includes(field.key)) {
        filledWeight += weight;
      }
    }

    if (totalWeight === 0) return 0;
    return Math.round((filledWeight / totalWeight) * 100);
  }

  /**
   * Performs bulk extraction of fields from user input
   */
  extractAllFields(
    input: string,
    targetType: 'universe' | 'character',
    language: SupportedLanguage = 'es'
  ): BulkExtraction {
    const fields = targetType === 'universe' ? UNIVERSE_EXTRACTABLE_FIELDS : CHARACTER_EXTRACTABLE_FIELDS;
    const extractedFields: Record<string, unknown> = {};
    const extractedFieldNames: string[] = [];
    let totalConfidence = 0;
    let matchCount = 0;

    for (const fieldDef of fields) {
      const value = this.extractFieldValue(input, fieldDef, language);
      if (value !== null) {
        extractedFields[fieldDef.key] = value;
        extractedFieldNames.push(fieldDef.key);
        totalConfidence += 0.8; // Base confidence for extracted fields
        matchCount++;
      }
    }

    // Calculate completeness
    const completenessScore = this.calculateCompletenessScore(targetType, extractedFieldNames);

    // Determine missing fields
    const requiredFields = fields.filter(f => f.required).map(f => f.key);
    const optionalFields = fields.filter(f => !f.required).map(f => f.key);
    const missingRequiredFields = requiredFields.filter(f => !extractedFieldNames.includes(f));
    const missingOptionalFields = optionalFields.filter(f => !extractedFieldNames.includes(f));

    // Generate suggested question
    let suggestedQuestion: string | undefined;
    if (missingRequiredFields.length > 0) {
      const missingField = fields.find(f => f.key === missingRequiredFields[0]);
      if (missingField) {
        suggestedQuestion = this.generateQuestionForField(missingField, language);
      }
    } else if (completenessScore < 70 && missingOptionalFields.length > 0) {
      // Suggest an important optional field
      const importantOptional = fields
        .filter(f => missingOptionalFields.includes(f.key))
        .sort((a, b) => (b.weight || 1) - (a.weight || 1))[0];
      if (importantOptional) {
        suggestedQuestion = this.generateQuestionForField(importantOptional, language);
      }
    }

    return {
      fields: extractedFields,
      completenessScore,
      extractedFieldNames,
      missingRequiredFields,
      missingOptionalFields,
      confidence: matchCount > 0 ? totalConfidence / matchCount : 0,
      detectedTarget: targetType,
      suggestedQuestion
    };
  }

  /**
   * Detects the likely target type from user input
   */
  detectTargetType(input: string, language: SupportedLanguage = 'es'): 'universe' | 'character' | 'unknown' {
    const universeKeywords = language === 'es'
      ? ['universo', 'mundo', 'stats', 'estadísticas', 'rangos', 'reglas']
      : ['universe', 'world', 'stats', 'statistics', 'ranks', 'rules'];

    const characterKeywords = language === 'es'
      ? ['personaje', 'héroe', 'protagonista', 'guerrero', 'mago', 'cazador']
      : ['character', 'hero', 'protagonist', 'warrior', 'mage', 'hunter'];

    const lowerInput = input.toLowerCase();

    let universeScore = 0;
    let characterScore = 0;

    for (const keyword of universeKeywords) {
      if (lowerInput.includes(keyword)) universeScore++;
    }

    for (const keyword of characterKeywords) {
      if (lowerInput.includes(keyword)) characterScore++;
    }

    if (universeScore > characterScore) return 'universe';
    if (characterScore > universeScore) return 'character';
    return 'unknown';
  }

  /**
   * Determines the best next phase based on current state
   */
  suggestNextPhase(
    mode: 'universe' | 'character',
    currentPhaseIndex: number,
    filledFields: string[]
  ): { phaseId: string; phaseIndex: number; reason: string } | null {
    const phases = mode === 'universe' ? UNIVERSE_DYNAMIC_PHASES : CHARACTER_DYNAMIC_PHASES;

    // Check if we can go to review
    const completeness = this.calculateCompletenessScore(mode, filledFields);
    if (completeness >= 70) {
      const reviewIndex = phases.findIndex(p => p.id === 'review');
      if (reviewIndex > currentPhaseIndex) {
        return {
          phaseId: 'review',
          phaseIndex: reviewIndex,
          reason: `Tienes ${completeness}% completo. Puedes ir directo a la revisión.`
        };
      }
    }

    // Find next phase that needs work
    for (let i = currentPhaseIndex + 1; i < phases.length; i++) {
      const phase = phases[i];

      // Check if phase can be skipped
      if (phase.canSkip && phase.skipCondition && phase.skipCondition(filledFields)) {
        continue;
      }

      // Check if phase has missing required fields
      const missingRequired = phase.requiredFields.filter(f => !filledFields.includes(f));
      if (missingRequired.length > 0 || !phase.canSkip) {
        return {
          phaseId: phase.id,
          phaseIndex: i,
          reason: phase.description
        };
      }
    }

    return null;
  }

  /**
   * Validates if we have enough data to generate an entity
   */
  canGenerate(
    mode: 'universe' | 'character',
    filledFields: string[]
  ): { canGenerate: boolean; missingFields: string[]; warnings: string[] } {
    const phases = mode === 'universe' ? UNIVERSE_DYNAMIC_PHASES : CHARACTER_DYNAMIC_PHASES;
    const warnings: string[] = [];

    // Collect all required fields
    const allRequired = phases.flatMap(p => p.requiredFields);
    const missingFields = allRequired.filter(f => !filledFields.includes(f));

    // Check specific conditions
    if (mode === 'universe') {
      if (!filledFields.includes('name')) {
        missingFields.push('name');
      }
      if (!filledFields.includes('theme') && !filledFields.includes('description')) {
        warnings.push('Sin tema ni descripción, se generará un universo genérico');
      }
    } else {
      if (!filledFields.includes('name')) {
        missingFields.push('name');
      }
      if (!filledFields.includes('universeId')) {
        missingFields.push('universeId');
      }
    }

    return {
      canGenerate: missingFields.length === 0,
      missingFields,
      warnings
    };
  }

  /**
   * Gets intelligent suggestions for quick actions based on context
   */
  getSmartSuggestions(
    mode: 'universe' | 'character',
    currentPhaseId: string,
    filledFields: string[],
    lastMessage: string
  ): string[] {
    const suggestions: string[] = [];
    const phases = mode === 'universe' ? UNIVERSE_DYNAMIC_PHASES : CHARACTER_DYNAMIC_PHASES;
    const currentPhase = phases.find(p => p.id === currentPhaseId);

    if (!currentPhase) return suggestions;

    // Add phase-specific suggestions
    if (mode === 'universe') {
      if (currentPhaseId === 'concept') {
        if (!filledFields.includes('theme')) {
          suggestions.push('Fantasía', 'Ciencia Ficción', 'Cyberpunk', 'Medieval');
        }
      } else if (currentPhaseId === 'statistics') {
        suggestions.push('6 stats clásicos', '4 stats simples', 'Personalizar stats');
      } else if (currentPhaseId === 'ranks') {
        suggestions.push('Estilo Solo Leveling (E-SSS)', 'Niveles 1-100', 'Sin rangos');
      }
    } else {
      if (currentPhaseId === 'identity') {
        if (!filledFields.includes('class')) {
          suggestions.push('Guerrero', 'Mago', 'Arquero', 'Asesino');
        }
      } else if (currentPhaseId === 'level') {
        suggestions.push('Novato (nivel 1)', 'Experimentado', 'Veterano');
      }
    }

    // Add navigation suggestions based on completeness
    const completeness = this.calculateCompletenessScore(mode, filledFields);
    if (completeness >= 70) {
      suggestions.push('Ver preview');
    }
    if (completeness >= 50 && currentPhase.canSkip) {
      suggestions.push('Saltar esta fase');
    }

    return suggestions.slice(0, 4);
  }

  // Private helper methods

  private extractFieldValue(
    input: string,
    fieldDef: ExtractableField,
    language: SupportedLanguage
  ): unknown | null {
    // Try pattern matching first
    for (const pattern of fieldDef.patterns) {
      const match = input.match(pattern);
      if (match) {
        const rawValue = match[1] || match[0];
        if (fieldDef.transform) {
          return fieldDef.transform(rawValue);
        }
        return rawValue.trim();
      }
    }

    // Try keyword matching
    const keywords = fieldDef.keywords[language] || fieldDef.keywords.es;
    const lowerInput = input.toLowerCase();

    for (const keyword of keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        // Found keyword, try to extract value after it
        const keywordIndex = lowerInput.indexOf(keyword.toLowerCase());
        const afterKeyword = input.substring(keywordIndex + keyword.length);

        // Extract next word or quoted string
        const valueMatch = afterKeyword.match(/^\s*["']?([^"'\n,]{2,50})["']?/);
        if (valueMatch) {
          const rawValue = valueMatch[1].trim();
          if (fieldDef.transform) {
            return fieldDef.transform(rawValue);
          }
          return rawValue;
        }
      }
    }

    return null;
  }

  private generateQuestionForField(
    field: ExtractableField,
    language: SupportedLanguage
  ): string {
    const questions: Record<string, { es: string; en: string }> = {
      name: {
        es: '¿Cómo se llama?',
        en: 'What is the name?'
      },
      theme: {
        es: '¿Qué tipo de mundo es? (fantasía, sci-fi, etc.)',
        en: 'What type of world is it? (fantasy, sci-fi, etc.)'
      },
      description: {
        es: '¿Puedes describirlo en unas palabras?',
        en: 'Can you describe it in a few words?'
      },
      statCount: {
        es: '¿Cuántas estadísticas tendrá?',
        en: 'How many stats will it have?'
      },
      statNames: {
        es: '¿Qué estadísticas tendrá? (ej: fuerza, agilidad, inteligencia)',
        en: 'What stats will it have? (e.g., strength, agility, intelligence)'
      },
      rankSystem: {
        es: '¿Qué sistema de rangos usará? (ej: E-SSS, niveles 1-100)',
        en: 'What ranking system will it use? (e.g., E-SSS, levels 1-100)'
      },
      class: {
        es: '¿Qué tipo de personaje es? (guerrero, mago, etc.)',
        en: 'What type of character is it? (warrior, mage, etc.)'
      },
      backstory: {
        es: '¿Cuál es su historia?',
        en: 'What is their story?'
      },
      universeId: {
        es: '¿En qué universo quieres crear el personaje?',
        en: 'In which universe do you want to create the character?'
      }
    };

    const question = questions[field.key];
    if (question) {
      return question[language] || question.es;
    }

    // Default question
    return language === 'es'
      ? `¿Cuál es ${field.name.toLowerCase()}?`
      : `What is the ${field.name.toLowerCase()}?`;
  }
}
