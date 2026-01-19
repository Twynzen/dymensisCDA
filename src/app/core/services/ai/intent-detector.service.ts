import { Injectable, inject } from '@angular/core';
import {
  DetectedIntent,
  ExtractedField,
  IntentAction,
  IntentTarget,
  IntentPattern,
  ContradictionResult,
  SupportedLanguage,
  FieldSource
} from '../../models';
import { FormSchemaService } from './form-schema.service';
import { FormFieldSchema } from '../../models';
import {
  BulkExtraction,
  UNIVERSE_EXTRACTABLE_FIELDS,
  CHARACTER_EXTRACTABLE_FIELDS,
  ExtractableField
} from '../../../modules/creation/models/agentic-action.model';

/**
 * Intent detection configuration
 */
export interface IntentDetectorConfig {
  /** Default confidence threshold */
  defaultConfidenceThreshold: number;
  /** Minimum confidence for field extraction */
  minFieldConfidence: number;
  /** Whether to detect language automatically */
  autoDetectLanguage: boolean;
  /** Default language if not detected */
  defaultLanguage: SupportedLanguage;
}

/**
 * Default configuration
 */
export const DEFAULT_INTENT_DETECTOR_CONFIG: IntentDetectorConfig = {
  defaultConfidenceThreshold: 0.7,
  minFieldConfidence: 0.5,
  autoDetectLanguage: true,
  defaultLanguage: 'es'
};

/**
 * IntentDetectorService
 * Detects user intent and extracts field values from natural language input
 */
@Injectable({ providedIn: 'root' })
export class IntentDetectorService {
  private formSchemaService = inject(FormSchemaService);
  private config: IntentDetectorConfig = DEFAULT_INTENT_DETECTOR_CONFIG;

  /**
   * Intent patterns for action detection
   */
  private readonly intentPatterns: IntentPattern[] = [
    // Create patterns - Spanish
    { pattern: /\b(crear|crea|quiero|hagamos|nuevo|nueva)\b.*\b(universo|mundo)\b/i, action: 'create', target: 'universe', language: 'es' },
    { pattern: /\b(universo|mundo)\b.*\b(llamad[oa]|nombre)\b/i, action: 'create', target: 'universe', language: 'es' },
    { pattern: /\b(crear|crea|quiero|hagamos|nuevo|nueva)\b.*\b(personaje|héroe|protagonista)\b/i, action: 'create', target: 'character', language: 'es' },
    { pattern: /\b(personaje|héroe)\b.*\b(llamad[oa]|nombre)\b/i, action: 'create', target: 'character', language: 'es' },
    { pattern: /\b(añadir|agregar|nueva)\b.*\b(estadística|stat|atributo)\b/i, action: 'create', target: 'stat', language: 'es' },
    { pattern: /\b(añadir|agregar|nueva)\b.*\b(raza|especie)\b/i, action: 'create', target: 'race', language: 'es' },
    { pattern: /\b(añadir|agregar|nueva)\b.*\b(habilidad|skill|poder)\b/i, action: 'create', target: 'skill', language: 'es' },
    { pattern: /\b(añadir|agregar|nueva)\b.*\b(regla|norma)\b/i, action: 'create', target: 'rule', language: 'es' },

    // Create patterns - English
    { pattern: /\b(create|make|i want|let's make|new)\b.*\b(universe|world)\b/i, action: 'create', target: 'universe', language: 'en' },
    { pattern: /\b(universe|world)\b.*\b(called|named)\b/i, action: 'create', target: 'universe', language: 'en' },
    { pattern: /\b(create|make|i want|new)\b.*\b(character|hero|protagonist)\b/i, action: 'create', target: 'character', language: 'en' },
    { pattern: /\b(character|hero)\b.*\b(called|named)\b/i, action: 'create', target: 'character', language: 'en' },
    { pattern: /\b(add|new)\b.*\b(stat|statistic|attribute)\b/i, action: 'create', target: 'stat', language: 'en' },
    { pattern: /\b(add|new)\b.*\b(race|species)\b/i, action: 'create', target: 'race', language: 'en' },
    { pattern: /\b(add|new)\b.*\b(skill|ability|power)\b/i, action: 'create', target: 'skill', language: 'en' },
    { pattern: /\b(add|new)\b.*\b(rule)\b/i, action: 'create', target: 'rule', language: 'en' },

    // Edit patterns - Spanish
    { pattern: /\b(cambia|cambiar|modifica|modificar|edita|editar|actualiza|actualizar)\b/i, action: 'edit', target: 'universe', language: 'es' },
    { pattern: /\b(en vez de|en lugar de|mejor|prefiero|quiero que sea)\b/i, action: 'edit', target: 'universe', language: 'es' },
    { pattern: /\b(el nombre|la descripción|el tema)\b.*\b(debería|debe|sea|será)\b/i, action: 'edit', target: 'universe', language: 'es' },

    // Edit patterns - English
    { pattern: /\b(change|modify|edit|update|alter)\b/i, action: 'edit', target: 'universe', language: 'en' },
    { pattern: /\b(instead of|rather than|i prefer|i want it to be)\b/i, action: 'edit', target: 'universe', language: 'en' },
    { pattern: /\b(the name|the description|the theme)\b.*\b(should|must|will be)\b/i, action: 'edit', target: 'universe', language: 'en' },

    // Query patterns - Spanish
    { pattern: /\b(qué|cuál|cómo|cuánto|dónde|por qué)\b.*\?$/i, action: 'query', target: 'universe', language: 'es' },
    { pattern: /\b(mostrar|muestra|ver|dame|cuéntame)\b/i, action: 'query', target: 'universe', language: 'es' },

    // Query patterns - English
    { pattern: /\b(what|which|how|where|why)\b.*\?$/i, action: 'query', target: 'universe', language: 'en' },
    { pattern: /\b(show|display|tell me|give me)\b/i, action: 'query', target: 'universe', language: 'en' },

    // Confirm patterns - Spanish
    { pattern: /\b(sí|si|ok|vale|correcto|exacto|confirmo|acepto|de acuerdo|perfecto)\b/i, action: 'confirm', target: 'universe', language: 'es' },
    { pattern: /\b(está bien|me parece bien|adelante)\b/i, action: 'confirm', target: 'universe', language: 'es' },

    // Confirm patterns - English
    { pattern: /\b(yes|ok|okay|correct|right|confirm|accept|agree|perfect)\b/i, action: 'confirm', target: 'universe', language: 'en' },
    { pattern: /\b(sounds good|looks good|go ahead)\b/i, action: 'confirm', target: 'universe', language: 'en' },

    // Cancel patterns - Spanish
    { pattern: /\b(no|cancelar|cancela|deshacer|atrás|volver|olvidalo|olvídalo)\b/i, action: 'cancel', target: 'universe', language: 'es' },
    { pattern: /\b(no quiero|no me gusta|empezar de nuevo)\b/i, action: 'cancel', target: 'universe', language: 'es' },

    // Cancel patterns - English
    { pattern: /\b(no|cancel|undo|back|nevermind|forget it)\b/i, action: 'cancel', target: 'universe', language: 'en' },
    { pattern: /\b(i don't want|i dislike|start over)\b/i, action: 'cancel', target: 'universe', language: 'en' },

    // Delete patterns - Spanish
    { pattern: /\b(elimina|eliminar|borra|borrar|quita|quitar|remueve|remover)\b/i, action: 'delete', target: 'universe', language: 'es' },

    // Delete patterns - English
    { pattern: /\b(delete|remove|erase)\b/i, action: 'delete', target: 'universe', language: 'en' }
  ];

  /**
   * Updates configuration
   */
  configure(config: Partial<IntentDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Detects intent from user input
   */
  detectIntent(input: string, context?: { currentTarget?: IntentTarget }): DetectedIntent {
    const normalizedInput = this.normalizeInput(input);
    const language = this.detectLanguage(normalizedInput);

    // Find matching intent patterns
    const matches = this.findMatchingPatterns(normalizedInput, language);
    let action: IntentAction = 'query';
    let target: IntentTarget = context?.currentTarget || 'universe';
    let confidence = 0.3;

    if (matches.length > 0) {
      const bestMatch = matches[0];
      action = bestMatch.action;
      target = bestMatch.target;
      confidence = 0.8;
    }

    // Refine target based on keywords
    target = this.refineTarget(normalizedInput, target, language);

    // Extract fields
    const fields = this.extractFields(input, target, language);

    // Determine if clarification is needed
    const needsClarification = this.needsClarification(action, fields, confidence);
    const clarificationQuestions = needsClarification
      ? this.generateClarificationQuestions(action, target, fields, language)
      : undefined;

    return {
      action,
      target,
      fields,
      rawInput: input,
      language,
      confidence,
      needsClarification,
      clarificationQuestions
    };
  }

  /**
   * Extracts fields from user input based on target type
   */
  extractFields(
    input: string,
    targetType: IntentTarget,
    language: SupportedLanguage = 'es'
  ): ExtractedField[] {
    const fields: ExtractedField[] = [];

    // Get schema for target type
    let schemaType = targetType;
    if (!['universe', 'character', 'stat', 'race', 'skill', 'rule'].includes(targetType)) {
      schemaType = 'universe';
    }

    try {
      const schema = this.formSchemaService.getSchema(schemaType as any);

      for (const field of schema.fields) {
        const extracted = this.extractFieldValue(input, field, language);
        if (extracted) {
          fields.push(extracted);
        }
      }
    } catch {
      // Schema not found, continue with basic extraction
    }

    // Always try to extract name
    const nameField = this.extractName(input, language);
    if (nameField && !fields.find(f => f.field === 'name')) {
      fields.push(nameField);
    }

    // Try to extract description
    const descField = this.extractDescription(input, language);
    if (descField && !fields.find(f => f.field === 'description')) {
      fields.push(descField);
    }

    // Try to extract theme
    const themeField = this.extractTheme(input, language);
    if (themeField && !fields.find(f => f.field === 'theme')) {
      fields.push(themeField);
    }

    return fields;
  }

  /**
   * Detects contradictions between new input and existing data
   */
  detectContradictions(
    newInput: string,
    existingData: Record<string, unknown>,
    language: SupportedLanguage = 'es'
  ): ContradictionResult {
    const contradictingFields: ContradictionResult['contradictingFields'] = [];
    const extractedFields = this.extractFields(newInput, 'universe', language);

    for (const field of extractedFields) {
      const existingValue = existingData[field.field];

      if (existingValue !== undefined && existingValue !== null && existingValue !== '') {
        // Check if values are different
        if (this.valuesContradict(existingValue, field.value)) {
          contradictingFields.push({
            field: field.field,
            existingValue,
            newValue: field.value,
            severity: 'medium'
          });
        }
      }
    }

    return {
      hasContradictions: contradictingFields.length > 0,
      contradictingFields
    };
  }

  /**
   * Detects the language of the input
   */
  detectLanguage(input: string): SupportedLanguage {
    if (!this.config.autoDetectLanguage) {
      return this.config.defaultLanguage;
    }

    const spanishPatterns = [
      /\b(el|la|los|las|un|una|unos|unas)\b/i,
      /\b(que|qué|quiero|crear|hacer|con|para|por|como|cómo)\b/i,
      /\b(universo|personaje|mundo|nombre|descripción|historia)\b/i,
      /[áéíóúñü]/i
    ];

    const englishPatterns = [
      /\b(the|a|an|of|to|in|for|with)\b/i,
      /\b(that|which|want|create|make|like|about)\b/i,
      /\b(universe|character|world|name|description|story)\b/i
    ];

    let spanishScore = 0;
    let englishScore = 0;

    for (const pattern of spanishPatterns) {
      if (pattern.test(input)) spanishScore++;
    }

    for (const pattern of englishPatterns) {
      if (pattern.test(input)) englishScore++;
    }

    return spanishScore >= englishScore ? 'es' : 'en';
  }

  /**
   * Gets confidence score for a detected field
   */
  getFieldConfidence(field: ExtractedField): number {
    let confidence = 0.5;

    // Increase confidence for explicit sources
    if (field.source === 'explicit') {
      confidence += 0.3;
    } else if (field.source === 'inferred') {
      confidence += 0.1;
    }

    // Increase confidence for longer values (more specific)
    if (typeof field.value === 'string' && field.value.length > 10) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Normalizes input for pattern matching
   */
  private normalizeInput(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics for matching
  }

  /**
   * Finds matching intent patterns
   */
  private findMatchingPatterns(input: string, language: SupportedLanguage): IntentPattern[] {
    return this.intentPatterns
      .filter(p => p.pattern.test(input))
      .filter(p => !p.language || p.language === language)
      .sort((a, b) => {
        // Prefer patterns matching the detected language
        if (a.language === language && b.language !== language) return -1;
        if (b.language === language && a.language !== language) return 1;
        return 0;
      });
  }

  /**
   * Refines target based on keywords in input
   */
  private refineTarget(input: string, defaultTarget: IntentTarget, language: SupportedLanguage): IntentTarget {
    const targetKeywords: Partial<Record<IntentTarget, { es: RegExp[]; en: RegExp[] }>> = {
      universe: {
        es: [/\buniverso\b/i, /\bmundo\b/i],
        en: [/\buniverse\b/i, /\bworld\b/i]
      },
      character: {
        es: [/\bpersonaje\b/i, /\bhéroe\b/i, /\bprotagonista\b/i],
        en: [/\bcharacter\b/i, /\bhero\b/i, /\bprotagonist\b/i]
      },
      stat: {
        es: [/\bestad[ií]stica\b/i, /\bstat\b/i, /\batributo\b/i],
        en: [/\bstat\b/i, /\bstatistic\b/i, /\battribute\b/i]
      },
      race: {
        es: [/\braza\b/i, /\bespecie\b/i],
        en: [/\brace\b/i, /\bspecies\b/i]
      },
      skill: {
        es: [/\bhabilidad\b/i, /\bskill\b/i, /\bpoder\b/i],
        en: [/\bskill\b/i, /\bability\b/i, /\bpower\b/i]
      },
      rule: {
        es: [/\bregla\b/i, /\bnorma\b/i],
        en: [/\brule\b/i]
      },
      awakening: {
        es: [/\bdespertar\b/i, /\bawakening\b/i],
        en: [/\bawakening\b/i, /\bawaken\b/i]
      }
    };

    for (const [target, patterns] of Object.entries(targetKeywords)) {
      const langPatterns = patterns[language] || patterns.es;
      for (const pattern of langPatterns) {
        if (pattern.test(input)) {
          return target as IntentTarget;
        }
      }
    }

    return defaultTarget;
  }

  /**
   * Extracts a field value from input
   */
  private extractFieldValue(
    input: string,
    field: FormFieldSchema,
    language: SupportedLanguage
  ): ExtractedField | null {
    const keywords = field.aiKeywords?.[language] || [];
    const hints = field.aiExtractionHints || [];

    // Try keyword-based extraction
    for (const keyword of keywords) {
      const pattern = new RegExp(`${keyword}\\s*[:\\s]\\s*["']?([^"'\\n,]+)["']?`, 'i');
      const match = input.match(pattern);
      if (match) {
        return {
          field: field.name,
          value: this.cleanValue(match[1], field.type),
          confidence: 0.8,
          source: 'explicit' as FieldSource
        };
      }
    }

    // Try hint-based extraction for specific patterns
    for (const hint of hints) {
      if (hint.includes('quoted text')) {
        const quotedMatch = input.match(/["']([^"']+)["']/);
        if (quotedMatch) {
          return {
            field: field.name,
            value: quotedMatch[1],
            confidence: 0.7,
            source: 'inferred' as FieldSource
          };
        }
      }
    }

    return null;
  }

  /**
   * Extracts name field
   */
  private extractName(input: string, language: SupportedLanguage): ExtractedField | null {
    const patterns = language === 'es'
      ? [
          /(?:llamad[oa]|nombre|se llama|llamar[áa])\s*["']?([^"'\n,]+)["']?/i,
          /["']([^"']+)["']/
        ]
      : [
          /(?:called|named|name is|name:)\s*["']?([^"'\n,]+)["']?/i,
          /["']([^"']+)["']/
        ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1].trim().length > 0) {
        return {
          field: 'name',
          value: match[1].trim(),
          confidence: 0.85,
          source: 'explicit' as FieldSource
        };
      }
    }

    return null;
  }

  /**
   * Extracts description field
   */
  private extractDescription(input: string, language: SupportedLanguage): ExtractedField | null {
    const patterns = language === 'es'
      ? [
          /(?:descripci[oó]n|trata de|es sobre|acerca de)\s*[:\s]*(.+)/i,
          /(?:es un|es una)\s+(.+?)(?:\.|$)/i
        ]
      : [
          /(?:description|about|is about)\s*[:\s]*(.+)/i,
          /(?:it's a|it is a)\s+(.+?)(?:\.|$)/i
        ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1].trim().length > 10) {
        return {
          field: 'description',
          value: match[1].trim(),
          confidence: 0.7,
          source: 'inferred' as FieldSource
        };
      }
    }

    return null;
  }

  /**
   * Extracts theme field
   */
  private extractTheme(input: string, language: SupportedLanguage): ExtractedField | null {
    const themeKeywords: Record<string, { es: RegExp; en: RegExp }> = {
      fantasy: { es: /\b(fantas[íi]a|m[aá]gico|medieval)\b/i, en: /\b(fantasy|magical|medieval)\b/i },
      scifi: { es: /\b(ciencia ficci[oó]n|sci-fi|espacial|futurista)\b/i, en: /\b(sci-fi|science fiction|space|futuristic)\b/i },
      horror: { es: /\b(terror|horror|miedo|oscuro)\b/i, en: /\b(horror|scary|dark)\b/i },
      cyberpunk: { es: /\bcyberpunk\b/i, en: /\bcyberpunk\b/i },
      steampunk: { es: /\bsteampunk\b/i, en: /\bsteampunk\b/i },
      modern: { es: /\b(moderno|contempor[aá]neo|actual)\b/i, en: /\b(modern|contemporary|present day)\b/i },
      postapocalyptic: { es: /\b(post-apocal[íi]ptico|apocalipsis)\b/i, en: /\b(post-apocalyptic|apocalypse)\b/i }
    };

    for (const [theme, patterns] of Object.entries(themeKeywords)) {
      const pattern = patterns[language] || patterns.es;
      if (pattern.test(input)) {
        return {
          field: 'theme',
          value: theme,
          confidence: 0.9,
          source: 'explicit' as FieldSource
        };
      }
    }

    return null;
  }

  /**
   * Cleans and converts extracted value to appropriate type
   */
  private cleanValue(value: string, type: string): string | number | boolean {
    const trimmed = value.trim();

    switch (type) {
      case 'number':
        const num = parseFloat(trimmed);
        return isNaN(num) ? trimmed : num;
      case 'boolean':
        return /^(s[íi]|yes|true|1)$/i.test(trimmed);
      default:
        return trimmed;
    }
  }

  /**
   * Checks if clarification is needed
   */
  private needsClarification(
    action: IntentAction,
    fields: ExtractedField[],
    confidence: number
  ): boolean {
    // Low confidence always needs clarification
    if (confidence < this.config.defaultConfidenceThreshold) {
      return true;
    }

    // Create actions need at least a name
    if (action === 'create' && !fields.find(f => f.field === 'name')) {
      return true;
    }

    // Edit actions need at least one field to change
    if (action === 'edit' && fields.length === 0) {
      return true;
    }

    // Check for low-confidence fields
    const lowConfidenceFields = fields.filter(f => f.confidence < this.config.minFieldConfidence);
    return lowConfidenceFields.length > fields.length / 2;
  }

  /**
   * Generates clarification questions
   */
  private generateClarificationQuestions(
    action: IntentAction,
    target: IntentTarget,
    fields: ExtractedField[],
    language: SupportedLanguage
  ): string[] {
    const questions: string[] = [];

    if (action === 'create') {
      if (!fields.find(f => f.field === 'name')) {
        questions.push(
          language === 'es'
            ? `¿Cómo te gustaría llamar a este ${this.getTargetLabel(target, language)}?`
            : `What would you like to name this ${this.getTargetLabel(target, language)}?`
        );
      }
    }

    if (action === 'edit') {
      if (fields.length === 0) {
        questions.push(
          language === 'es'
            ? '¿Qué te gustaría cambiar?'
            : 'What would you like to change?'
        );
      }
    }

    return questions;
  }

  /**
   * Gets localized label for target
   */
  private getTargetLabel(target: IntentTarget, language: SupportedLanguage): string {
    const labels: Partial<Record<IntentTarget, { es: string; en: string }>> = {
      universe: { es: 'universo', en: 'universe' },
      character: { es: 'personaje', en: 'character' },
      stat: { es: 'estadística', en: 'stat' },
      race: { es: 'raza', en: 'race' },
      skill: { es: 'habilidad', en: 'skill' },
      rule: { es: 'regla', en: 'rule' },
      awakening: { es: 'despertar', en: 'awakening' },
      unknown: { es: 'desconocido', en: 'unknown' }
    };

    return labels[target]?.[language] || target;
  }

  /**
   * Checks if two values contradict each other
   */
  private valuesContradict(existing: unknown, newValue: unknown): boolean {
    // Null/undefined doesn't contradict
    if (existing === null || existing === undefined) return false;
    if (newValue === null || newValue === undefined) return false;

    // Same value doesn't contradict
    if (existing === newValue) return false;

    // For strings, check if they're substantially different
    if (typeof existing === 'string' && typeof newValue === 'string') {
      const normalizedExisting = existing.toLowerCase().trim();
      const normalizedNew = newValue.toLowerCase().trim();

      // Empty strings don't contradict
      if (normalizedExisting === '' || normalizedNew === '') return false;

      // If new value contains old, it might be an elaboration
      if (normalizedNew.includes(normalizedExisting)) return false;

      return normalizedExisting !== normalizedNew;
    }

    return existing !== newValue;
  }

  // ============================================
  // BULK EXTRACTION METHODS (Agentic Mode)
  // ============================================

  /**
   * Extracts ALL possible fields from user input at once
   * Used for agentic mode when user provides lots of information
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
      const value = this.extractBulkFieldValue(input, fieldDef, language);
      if (value !== null) {
        extractedFields[fieldDef.key] = value;
        extractedFieldNames.push(fieldDef.key);
        totalConfidence += 0.8;
        matchCount++;
      }
    }

    // Calculate completeness score
    const completenessScore = this.calculateBulkCompletenessScore(targetType, extractedFieldNames);

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
        suggestedQuestion = this.generateBulkQuestionForField(missingField, language);
      }
    } else if (completenessScore < 70 && missingOptionalFields.length > 0) {
      const importantOptional = fields
        .filter(f => missingOptionalFields.includes(f.key))
        .sort((a, b) => (b.weight || 1) - (a.weight || 1))[0];
      if (importantOptional) {
        suggestedQuestion = this.generateBulkQuestionForField(importantOptional, language);
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
   * Detects the likely target type from user input for agentic mode
   */
  detectTargetFromInput(input: string, language: SupportedLanguage = 'es'): 'universe' | 'character' | 'unknown' {
    const universeKeywords = language === 'es'
      ? ['universo', 'mundo', 'stats', 'estadísticas', 'rangos', 'reglas', 'sistema']
      : ['universe', 'world', 'stats', 'statistics', 'ranks', 'rules', 'system'];

    const characterKeywords = language === 'es'
      ? ['personaje', 'héroe', 'protagonista', 'guerrero', 'mago', 'cazador', 'nivel']
      : ['character', 'hero', 'protagonist', 'warrior', 'mage', 'hunter', 'level'];

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
   * Extract stats list from user input
   * Handles various formats: comma-separated, numbered lists, etc.
   */
  extractStatsList(input: string, language: SupportedLanguage = 'es'): string[] {
    const statKeywords = language === 'es'
      ? ['fuerza', 'agilidad', 'vitalidad', 'inteligencia', 'percepción', 'carisma',
         'suerte', 'resistencia', 'destreza', 'sabiduría', 'sentido', 'velocidad',
         'magia', 'espíritu', 'constitución']
      : ['strength', 'agility', 'vitality', 'intelligence', 'perception', 'charisma',
         'luck', 'endurance', 'dexterity', 'wisdom', 'sense', 'speed',
         'magic', 'spirit', 'constitution'];

    const foundStats: string[] = [];
    const lowerInput = input.toLowerCase();

    for (const keyword of statKeywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        foundStats.push(keyword);
      }
    }

    // Also try to extract from patterns like "1. fuerza 2. agilidad" or "fuerza, agilidad, ..."
    const listPattern = /(?:\d+[\.\)]\s*)?(\w+)(?:\s*[,;]\s*|\s+(?:y|and)\s+)/gi;
    let match;
    while ((match = listPattern.exec(input)) !== null) {
      const word = match[1].toLowerCase();
      if (statKeywords.some(k => k.toLowerCase() === word) && !foundStats.includes(word)) {
        foundStats.push(word);
      }
    }

    return foundStats;
  }

  /**
   * Extract rank system from user input
   */
  extractRankSystem(input: string): { type: string; levels: string[] } | null {
    const lowerInput = input.toLowerCase();

    // Solo Leveling style
    if (lowerInput.includes('solo leveling') || /\b[e-s]\b.*\b(sss?)\b/i.test(input)) {
      return {
        type: 'solo-leveling',
        levels: ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS']
      };
    }

    // Simple letter ranks
    const letterMatch = input.match(/([A-Z])\s*(?:a|hasta|to|-)\s*([A-Z]+)/i);
    if (letterMatch) {
      return {
        type: 'letters',
        levels: this.generateLetterRange(letterMatch[1].toUpperCase(), letterMatch[2].toUpperCase())
      };
    }

    // Numeric levels
    const numericMatch = input.match(/(?:niveles?|levels?)\s*(\d+)\s*(?:a|hasta|to|-)\s*(\d+)/i);
    if (numericMatch) {
      const start = parseInt(numericMatch[1], 10);
      const end = parseInt(numericMatch[2], 10);
      return {
        type: 'numeric',
        levels: Array.from({ length: end - start + 1 }, (_, i) => (start + i).toString())
      };
    }

    return null;
  }

  // Private bulk extraction helpers

  private extractBulkFieldValue(
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
        const keywordIndex = lowerInput.indexOf(keyword.toLowerCase());
        const afterKeyword = input.substring(keywordIndex + keyword.length);

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

  private calculateBulkCompletenessScore(
    targetType: 'universe' | 'character',
    filledFields: string[]
  ): number {
    const fields = targetType === 'universe' ? UNIVERSE_EXTRACTABLE_FIELDS : CHARACTER_EXTRACTABLE_FIELDS;

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

  private generateBulkQuestionForField(
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
        es: '¿Puedes describirlo brevemente?',
        en: 'Can you describe it briefly?'
      },
      statCount: {
        es: '¿Cuántas estadísticas tendrá?',
        en: 'How many stats will it have?'
      },
      statNames: {
        es: '¿Qué estadísticas tendrá?',
        en: 'What stats will it have?'
      },
      rankSystem: {
        es: '¿Qué sistema de rangos usará?',
        en: 'What ranking system will it use?'
      },
      class: {
        es: '¿Qué tipo de personaje es?',
        en: 'What type of character is it?'
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

    return language === 'es'
      ? `¿Cuál es ${field.name.toLowerCase()}?`
      : `What is the ${field.name.toLowerCase()}?`;
  }

  private generateLetterRange(start: string, end: string): string[] {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const startIndex = alphabet.indexOf(start);
    const endIndex = alphabet.indexOf(end[0]); // Handle 'SS', 'SSS'

    if (startIndex === -1 || endIndex === -1) {
      return ['E', 'D', 'C', 'B', 'A', 'S']; // Default
    }

    const levels = alphabet.slice(startIndex, endIndex + 1).split('');

    // Handle special cases like SS, SSS
    if (end.length > 1) {
      if (end.includes('SS')) levels.push('SS');
      if (end.includes('SSS')) levels.push('SSS');
    }

    return levels;
  }
}
