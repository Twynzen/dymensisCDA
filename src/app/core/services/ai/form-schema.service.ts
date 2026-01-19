import { Injectable } from '@angular/core';
import {
  EntityFormSchema,
  FormFieldSchema,
  FormFieldOption,
  ValidationContext,
  ValidationResult,
  SchemaEntityType,
  FieldValidation,
  FIREBASE_DOC_SIZE_LIMIT,
  RECOMMENDED_DOC_SIZE,
  SizeValidationResult,
  PhaseFieldMapping
} from '../../models';

/**
 * FormSchemaService
 * Defines and manages JSON schemas for all entity types
 * Provides validation rules, dynamic options, and phase-field mappings
 */
@Injectable({ providedIn: 'root' })
export class FormSchemaService {
  private schemas: Map<SchemaEntityType, EntityFormSchema> = new Map();

  constructor() {
    this.initializeSchemas();
  }

  /**
   * Gets the complete schema for an entity type
   */
  getSchema(entityType: SchemaEntityType): EntityFormSchema {
    const schema = this.schemas.get(entityType);
    if (!schema) {
      throw new Error(`Schema not found for entity type: ${entityType}`);
    }
    return schema;
  }

  /**
   * Gets schema fields relevant to a specific creation phase
   */
  getSchemaForPhase(entityType: 'universe' | 'character', phaseId: string): FormFieldSchema[] {
    const schema = this.getSchema(entityType);
    const phaseMapping = this.getPhaseFieldMapping(entityType, phaseId);

    if (!phaseMapping) {
      return [];
    }

    const allFields = [...phaseMapping.requiredFields, ...phaseMapping.optionalFields];
    return schema.fields.filter(f => allFields.includes(f.name));
  }

  /**
   * Resolves dynamic options based on context
   */
  resolveDynamicOptions(field: FormFieldSchema, context: ValidationContext): FormFieldOption[] {
    if (!field.dynamicOptions) {
      return field.options || [];
    }

    const { source, customResolver, filter } = field.dynamicOptions;

    let options: FormFieldOption[] = [];

    switch (source) {
      case 'universe.races':
        if (context.universe?.raceSystem?.races) {
          options = context.universe.raceSystem.races.map(race => ({
            value: race.id,
            label: { en: race.name, es: race.name },
            icon: race.image ? 'image' : undefined
          }));
        }
        break;

      case 'universe.stats':
        if (context.universe?.statDefinitions) {
          options = Object.entries(context.universe.statDefinitions).map(([key, stat]) => ({
            value: key,
            label: { en: stat.name, es: stat.name },
            icon: stat.icon,
            color: stat.color
          }));
        }
        break;

      case 'universe.awakeningLevels':
        if (context.universe?.awakeningSystem?.levels) {
          options = context.universe.awakeningSystem.levels.map((level, idx) => ({
            value: level,
            label: { en: `Rank ${level}`, es: `Rango ${level}` }
          }));
        }
        break;

      case 'universe.rules':
        if (context.universe?.progressionRules) {
          options = context.universe.progressionRules.map(rule => ({
            value: rule.id,
            label: { en: rule.description, es: rule.description }
          }));
        }
        break;

      case 'custom':
        if (customResolver) {
          options = customResolver(context);
        }
        break;
    }

    // Apply filter if provided
    if (filter) {
      options = options.filter(opt => filter(opt, context));
    }

    return options;
  }

  /**
   * Gets fields that depend on a given field value
   */
  getDependentFields(schema: EntityFormSchema, fieldName: string, fieldValue: unknown): FormFieldSchema[] {
    return schema.fields.filter(field => {
      if (!field.dependsOn) return false;

      return field.dependsOn.some(dep => {
        if (dep.field !== fieldName) return false;

        switch (dep.condition) {
          case 'equals':
            return fieldValue === dep.value;
          case 'notEquals':
            return fieldValue !== dep.value;
          case 'exists':
            return fieldValue !== null && fieldValue !== undefined;
          case 'notExists':
            return fieldValue === null || fieldValue === undefined;
          case 'contains':
            return Array.isArray(fieldValue) && fieldValue.includes(dep.value);
          case 'greaterThan':
            return typeof fieldValue === 'number' && fieldValue > (dep.value as number);
          case 'lessThan':
            return typeof fieldValue === 'number' && fieldValue < (dep.value as number);
          default:
            return false;
        }
      });
    });
  }

  /**
   * Validates a single field value against its schema
   */
  validateField(field: FormFieldSchema, value: unknown, context: ValidationContext): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];
    const validation = field.validation;

    // Required check
    if (validation.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field: field.name,
        code: 'REQUIRED',
        message: `${field.label.en} is required`,
        messageEs: `${field.label.es} es requerido`,
        value
      });
    }

    if (value === null || value === undefined) {
      return { valid: errors.length === 0, errors, warnings };
    }

    // Type-specific validations
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        errors.push({
          field: field.name,
          code: 'MIN_LENGTH',
          message: `${field.label.en} must be at least ${validation.minLength} characters`,
          messageEs: `${field.label.es} debe tener al menos ${validation.minLength} caracteres`,
          value
        });
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        errors.push({
          field: field.name,
          code: 'MAX_LENGTH',
          message: `${field.label.en} must be at most ${validation.maxLength} characters`,
          messageEs: `${field.label.es} debe tener máximo ${validation.maxLength} caracteres`,
          value
        });
      }
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: field.name,
            code: 'PATTERN',
            message: validation.patternMessage?.en || `${field.label.en} format is invalid`,
            messageEs: validation.patternMessage?.es || `${field.label.es} tiene formato inválido`,
            value
          });
        }
      }
    }

    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push({
          field: field.name,
          code: 'MIN_VALUE',
          message: `${field.label.en} must be at least ${validation.min}`,
          messageEs: `${field.label.es} debe ser al menos ${validation.min}`,
          value
        });
      }
      if (validation.max !== undefined && value > validation.max) {
        errors.push({
          field: field.name,
          code: 'MAX_VALUE',
          message: `${field.label.en} must be at most ${validation.max}`,
          messageEs: `${field.label.es} debe ser máximo ${validation.max}`,
          value
        });
      }
    }

    // oneOf validation
    if (validation.oneOf && !validation.oneOf.includes(value as string | number)) {
      errors.push({
        field: field.name,
        code: 'ONE_OF',
        message: `${field.label.en} must be one of: ${validation.oneOf.join(', ')}`,
        messageEs: `${field.label.es} debe ser uno de: ${validation.oneOf.join(', ')}`,
        value
      });
    }

    // Custom validation
    if (validation.custom) {
      const customResult = validation.custom(value, context);
      errors.push(...customResult.errors);
      warnings.push(...customResult.warnings);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Gets required fields that are still missing from collected data
   */
  getMissingRequiredFields(
    schema: EntityFormSchema,
    collectedData: Record<string, unknown>,
    phase?: string
  ): FormFieldSchema[] {
    let fieldsToCheck = schema.fields;

    // If phase specified, only check fields for that phase
    if (phase && (schema.entityType === 'universe' || schema.entityType === 'character')) {
      fieldsToCheck = this.getSchemaForPhase(schema.entityType as 'universe' | 'character', phase);
    }

    return fieldsToCheck.filter(field => {
      if (!field.validation.required) return false;

      const value = collectedData[field.name];
      return value === null || value === undefined || value === '';
    });
  }

  /**
   * Generates AI extraction hints for a field
   */
  getExtractionHintsForField(field: FormFieldSchema, language: 'es' | 'en'): string[] {
    const hints: string[] = [];

    // Add configured hints
    if (field.aiExtractionHints) {
      hints.push(...field.aiExtractionHints);
    }

    // Add keywords
    if (field.aiKeywords) {
      const keywords = language === 'es' ? field.aiKeywords.es : field.aiKeywords.en;
      if (keywords) {
        hints.push(`Keywords: ${keywords.join(', ')}`);
      }
    }

    // Add type hint
    hints.push(`Type: ${field.type}`);

    // Add validation hints
    if (field.validation.min !== undefined || field.validation.max !== undefined) {
      hints.push(`Range: ${field.validation.min ?? 'any'} to ${field.validation.max ?? 'any'}`);
    }

    return hints;
  }

  /**
   * Validates document size
   */
  validateSize(entity: unknown): SizeValidationResult {
    const jsonString = JSON.stringify(entity);
    const sizeBytes = new Blob([jsonString]).size;

    const result: SizeValidationResult = {
      sizeBytes,
      withinLimit: sizeBytes < FIREBASE_DOC_SIZE_LIMIT,
      limit: FIREBASE_DOC_SIZE_LIMIT
    };

    if (sizeBytes > RECOMMENDED_DOC_SIZE) {
      result.recommendations = [];
      if (sizeBytes > FIREBASE_DOC_SIZE_LIMIT) {
        result.recommendations.push('Document exceeds Firebase limit. Remove large images or reduce content.');
      } else {
        result.recommendations.push('Document is large. Consider optimizing images or reducing description length.');
      }
    }

    return result;
  }

  /**
   * Gets phase to field mapping
   */
  private getPhaseFieldMapping(entityType: 'universe' | 'character', phaseId: string): PhaseFieldMapping | null {
    const mappings: Record<string, Record<string, PhaseFieldMapping>> = {
      universe: {
        concept: {
          phaseId: 'concept',
          requiredFields: ['name', 'description'],
          optionalFields: ['theme', 'inspiration']
        },
        races: {
          phaseId: 'races',
          requiredFields: [],
          optionalFields: ['raceSystemEnabled', 'races']
        },
        statistics: {
          phaseId: 'statistics',
          requiredFields: ['statDefinitions'],
          optionalFields: ['initialPoints']
        },
        progression: {
          phaseId: 'progression',
          requiredFields: ['progressionRules'],
          optionalFields: ['awakeningSystemEnabled', 'awakeningLevels', 'awakeningThresholds']
        },
        appearance: {
          phaseId: 'appearance',
          requiredFields: [],
          optionalFields: ['coverImage', 'locations']
        },
        review: {
          phaseId: 'review',
          requiredFields: ['name', 'description', 'statDefinitions', 'progressionRules'],
          optionalFields: []
        }
      },
      character: {
        universe_selection: {
          phaseId: 'universe_selection',
          requiredFields: ['universeId'],
          optionalFields: []
        },
        identity: {
          phaseId: 'identity',
          requiredFields: ['name'],
          optionalFields: ['raceId', 'description']
        },
        backstory: {
          phaseId: 'backstory',
          requiredFields: [],
          optionalFields: ['backstory', 'origin', 'motivation']
        },
        statistics: {
          phaseId: 'statistics',
          requiredFields: ['stats'],
          optionalFields: ['bonusStats']
        },
        appearance: {
          phaseId: 'appearance',
          requiredFields: [],
          optionalFields: ['avatarUrl', 'avatarBackgroundColor', 'physicalDescription']
        },
        personality: {
          phaseId: 'personality',
          requiredFields: [],
          optionalFields: ['personalityTraits', 'title']
        },
        review: {
          phaseId: 'review',
          requiredFields: ['name', 'universeId', 'stats'],
          optionalFields: []
        }
      }
    };

    return mappings[entityType]?.[phaseId] || null;
  }

  /**
   * Initialize all entity schemas
   */
  private initializeSchemas(): void {
    this.schemas.set('universe', this.buildUniverseSchema());
    this.schemas.set('character', this.buildCharacterSchema());
    this.schemas.set('stat', this.buildStatSchema());
    this.schemas.set('race', this.buildRaceSchema());
    this.schemas.set('skill', this.buildSkillSchema());
    this.schemas.set('rule', this.buildRuleSchema());
  }

  private buildUniverseSchema(): EntityFormSchema {
    return {
      entityType: 'universe',
      version: '1.0.0',
      fields: [
        {
          name: 'name',
          type: 'string',
          label: { en: 'Universe Name', es: 'Nombre del Universo' },
          description: { en: 'The name of your universe', es: 'El nombre de tu universo' },
          validation: { required: true, minLength: 2, maxLength: 100 },
          aiExtractionHints: ['Look for quoted text or phrases after "llamar", "nombre", "called", "named"'],
          aiKeywords: { es: ['nombre', 'llamar', 'llamarse', 'título'], en: ['name', 'called', 'titled'] },
          order: 1,
          group: 'basic'
        },
        {
          name: 'description',
          type: 'string',
          label: { en: 'Description', es: 'Descripción' },
          validation: { required: true, minLength: 10, maxLength: 1000 },
          aiKeywords: { es: ['descripción', 'trata de', 'es sobre'], en: ['description', 'about', 'is about'] },
          order: 2,
          group: 'basic'
        },
        {
          name: 'theme',
          type: 'select',
          label: { en: 'Theme', es: 'Temática' },
          validation: { required: false },
          options: [
            { value: 'fantasy', label: { en: 'Fantasy', es: 'Fantasía' } },
            { value: 'scifi', label: { en: 'Science Fiction', es: 'Ciencia Ficción' } },
            { value: 'modern', label: { en: 'Modern', es: 'Moderno' } },
            { value: 'postapocalyptic', label: { en: 'Post-Apocalyptic', es: 'Post-Apocalíptico' } },
            { value: 'horror', label: { en: 'Horror', es: 'Terror' } },
            { value: 'steampunk', label: { en: 'Steampunk', es: 'Steampunk' } },
            { value: 'cyberpunk', label: { en: 'Cyberpunk', es: 'Cyberpunk' } },
            { value: 'custom', label: { en: 'Custom', es: 'Personalizado' } }
          ],
          aiKeywords: { es: ['fantasía', 'ciencia ficción', 'moderno', 'terror', 'cyberpunk'], en: ['fantasy', 'sci-fi', 'modern', 'horror'] },
          order: 3,
          group: 'basic'
        },
        {
          name: 'inspiration',
          type: 'string',
          label: { en: 'Inspiration', es: 'Inspiración' },
          description: { en: 'Similar works or references', es: 'Obras similares o referencias' },
          validation: { required: false, maxLength: 500 },
          aiKeywords: { es: ['como', 'similar', 'inspirado', 'estilo'], en: ['like', 'similar', 'inspired', 'style'] },
          order: 4,
          group: 'basic'
        },
        {
          name: 'coverImage',
          type: 'image',
          label: { en: 'Cover Image', es: 'Imagen de Portada' },
          validation: { required: false },
          order: 5,
          group: 'appearance'
        },
        {
          name: 'isPublic',
          type: 'boolean',
          label: { en: 'Public Universe', es: 'Universo Público' },
          validation: { required: false },
          defaultValue: false,
          order: 6,
          group: 'settings'
        },
        {
          name: 'initialPoints',
          type: 'number',
          label: { en: 'Initial Points', es: 'Puntos Iniciales' },
          description: { en: 'Points available for character creation', es: 'Puntos disponibles para crear personajes' },
          validation: { required: false, min: 0, max: 1000 },
          defaultValue: 100,
          aiKeywords: { es: ['puntos', 'puntos iniciales'], en: ['points', 'initial points'] },
          order: 7,
          group: 'statistics'
        },
        {
          name: 'statDefinitions',
          type: 'object',
          label: { en: 'Statistics', es: 'Estadísticas' },
          validation: { required: true },
          order: 8,
          group: 'statistics'
        },
        {
          name: 'progressionRules',
          type: 'array',
          label: { en: 'Progression Rules', es: 'Reglas de Progresión' },
          validation: { required: true },
          order: 9,
          group: 'progression'
        },
        {
          name: 'awakeningSystemEnabled',
          type: 'boolean',
          label: { en: 'Enable Awakening System', es: 'Habilitar Sistema de Rangos' },
          validation: { required: false },
          defaultValue: true,
          order: 10,
          group: 'progression'
        },
        {
          name: 'raceSystemEnabled',
          type: 'boolean',
          label: { en: 'Enable Race System', es: 'Habilitar Sistema de Razas' },
          validation: { required: false },
          defaultValue: false,
          order: 11,
          group: 'races'
        }
      ],
      groups: [
        { name: 'basic', label: { en: 'Basic Information', es: 'Información Básica' }, fields: ['name', 'description', 'theme', 'inspiration'] },
        { name: 'statistics', label: { en: 'Statistics', es: 'Estadísticas' }, fields: ['initialPoints', 'statDefinitions'] },
        { name: 'progression', label: { en: 'Progression', es: 'Progresión' }, fields: ['progressionRules', 'awakeningSystemEnabled'] },
        { name: 'races', label: { en: 'Races', es: 'Razas' }, fields: ['raceSystemEnabled'] },
        { name: 'appearance', label: { en: 'Appearance', es: 'Apariencia' }, fields: ['coverImage'] },
        { name: 'settings', label: { en: 'Settings', es: 'Configuración' }, fields: ['isPublic'] }
      ],
      phases: ['concept', 'races', 'statistics', 'progression', 'appearance', 'review']
    };
  }

  private buildCharacterSchema(): EntityFormSchema {
    return {
      entityType: 'character',
      version: '1.0.0',
      fields: [
        {
          name: 'universeId',
          type: 'select',
          label: { en: 'Universe', es: 'Universo' },
          validation: { required: true },
          dynamicOptions: { source: 'custom' },
          aiKeywords: { es: ['universo', 'mundo'], en: ['universe', 'world'] },
          order: 1,
          group: 'identity'
        },
        {
          name: 'name',
          type: 'string',
          label: { en: 'Character Name', es: 'Nombre del Personaje' },
          validation: { required: true, minLength: 1, maxLength: 100 },
          aiExtractionHints: ['Look for names after "llamar", "nombre", "called"'],
          aiKeywords: { es: ['nombre', 'llamar', 'personaje'], en: ['name', 'called', 'character'] },
          order: 2,
          group: 'identity'
        },
        {
          name: 'raceId',
          type: 'select',
          label: { en: 'Race', es: 'Raza' },
          validation: { required: false },
          dynamicOptions: { source: 'universe.races' },
          aiKeywords: { es: ['raza', 'especie'], en: ['race', 'species'] },
          order: 3,
          group: 'identity'
        },
        {
          name: 'description',
          type: 'string',
          label: { en: 'Description', es: 'Descripción' },
          validation: { required: false, maxLength: 500 },
          order: 4,
          group: 'identity'
        },
        {
          name: 'backstory',
          type: 'string',
          label: { en: 'Backstory', es: 'Historia' },
          validation: { required: false, maxLength: 2000 },
          aiKeywords: { es: ['historia', 'pasado', 'origen'], en: ['backstory', 'history', 'origin'] },
          order: 5,
          group: 'backstory'
        },
        {
          name: 'stats',
          type: 'object',
          label: { en: 'Statistics', es: 'Estadísticas' },
          validation: { required: true },
          order: 6,
          group: 'statistics'
        },
        {
          name: 'bonusStats',
          type: 'object',
          label: { en: 'Bonus Stats', es: 'Stats Bonus' },
          validation: { required: false },
          order: 7,
          group: 'statistics'
        },
        {
          name: 'avatarUrl',
          type: 'image',
          label: { en: 'Avatar', es: 'Avatar' },
          validation: { required: false },
          order: 8,
          group: 'appearance'
        },
        {
          name: 'avatarBackgroundColor',
          type: 'color',
          label: { en: 'Avatar Background Color', es: 'Color de Fondo del Avatar' },
          validation: { required: false },
          defaultValue: '#1a1a2e',
          order: 9,
          group: 'appearance'
        },
        {
          name: 'personalityTraits',
          type: 'array',
          label: { en: 'Personality Traits', es: 'Rasgos de Personalidad' },
          validation: { required: false },
          aiKeywords: { es: ['personalidad', 'carácter', 'actitud'], en: ['personality', 'traits', 'character'] },
          order: 10,
          group: 'personality'
        },
        {
          name: 'title',
          type: 'string',
          label: { en: 'Title', es: 'Título' },
          validation: { required: false, maxLength: 100 },
          aiKeywords: { es: ['título', 'apodo', 'conocido como'], en: ['title', 'nickname', 'known as'] },
          order: 11,
          group: 'personality'
        }
      ],
      groups: [
        { name: 'identity', label: { en: 'Identity', es: 'Identidad' }, fields: ['universeId', 'name', 'raceId', 'description'] },
        { name: 'backstory', label: { en: 'Backstory', es: 'Historia' }, fields: ['backstory'] },
        { name: 'statistics', label: { en: 'Statistics', es: 'Estadísticas' }, fields: ['stats', 'bonusStats'] },
        { name: 'appearance', label: { en: 'Appearance', es: 'Apariencia' }, fields: ['avatarUrl', 'avatarBackgroundColor'] },
        { name: 'personality', label: { en: 'Personality', es: 'Personalidad' }, fields: ['personalityTraits', 'title'] }
      ],
      phases: ['universe_selection', 'identity', 'backstory', 'statistics', 'appearance', 'personality', 'review']
    };
  }

  private buildStatSchema(): EntityFormSchema {
    return {
      entityType: 'stat',
      version: '1.0.0',
      fields: [
        {
          name: 'name',
          type: 'string',
          label: { en: 'Stat Name', es: 'Nombre de Stat' },
          validation: { required: true, minLength: 1, maxLength: 50 },
          order: 1
        },
        {
          name: 'abbreviation',
          type: 'string',
          label: { en: 'Abbreviation', es: 'Abreviación' },
          validation: { required: true, minLength: 1, maxLength: 5 },
          order: 2
        },
        {
          name: 'icon',
          type: 'icon',
          label: { en: 'Icon', es: 'Icono' },
          validation: { required: true },
          options: this.getAvailableIcons(),
          order: 3
        },
        {
          name: 'color',
          type: 'color',
          label: { en: 'Color', es: 'Color' },
          validation: { required: true },
          order: 4
        },
        {
          name: 'minValue',
          type: 'number',
          label: { en: 'Minimum Value', es: 'Valor Mínimo' },
          validation: { required: true, min: 0 },
          defaultValue: 0,
          order: 5
        },
        {
          name: 'maxValue',
          type: 'number',
          label: { en: 'Maximum Value', es: 'Valor Máximo' },
          validation: { required: true, min: 1 },
          defaultValue: 999,
          order: 6
        },
        {
          name: 'category',
          type: 'select',
          label: { en: 'Category', es: 'Categoría' },
          validation: { required: true },
          options: [
            { value: 'primary', label: { en: 'Primary', es: 'Primaria' } },
            { value: 'secondary', label: { en: 'Secondary', es: 'Secundaria' } },
            { value: 'derived', label: { en: 'Derived', es: 'Derivada' } }
          ],
          defaultValue: 'primary',
          order: 7
        },
        {
          name: 'isDerived',
          type: 'boolean',
          label: { en: 'Is Derived', es: 'Es Derivada' },
          validation: { required: false },
          defaultValue: false,
          order: 8
        },
        {
          name: 'formula',
          type: 'string',
          label: { en: 'Formula', es: 'Fórmula' },
          validation: { required: false },
          dependsOn: [{ field: 'isDerived', condition: 'equals', value: true, action: 'show' }],
          order: 9
        }
      ]
    };
  }

  private buildRaceSchema(): EntityFormSchema {
    return {
      entityType: 'race',
      version: '1.0.0',
      fields: [
        {
          name: 'name',
          type: 'string',
          label: { en: 'Race Name', es: 'Nombre de Raza' },
          validation: { required: true, minLength: 1, maxLength: 50 },
          order: 1
        },
        {
          name: 'description',
          type: 'string',
          label: { en: 'Description', es: 'Descripción' },
          validation: { required: false, maxLength: 500 },
          order: 2
        },
        {
          name: 'image',
          type: 'image',
          label: { en: 'Image', es: 'Imagen' },
          validation: { required: false },
          order: 3
        },
        {
          name: 'baseStats',
          type: 'object',
          label: { en: 'Base Stats', es: 'Stats Base' },
          validation: { required: true },
          order: 4
        },
        {
          name: 'freePoints',
          type: 'number',
          label: { en: 'Free Points', es: 'Puntos Libres' },
          validation: { required: true, min: 0 },
          defaultValue: 50,
          order: 5
        }
      ]
    };
  }

  private buildSkillSchema(): EntityFormSchema {
    return {
      entityType: 'skill',
      version: '1.0.0',
      fields: [
        {
          name: 'name',
          type: 'string',
          label: { en: 'Skill Name', es: 'Nombre de Habilidad' },
          validation: { required: true, minLength: 1, maxLength: 100 },
          order: 1
        },
        {
          name: 'subtitle',
          type: 'string',
          label: { en: 'Subtitle', es: 'Subtítulo' },
          validation: { required: false, maxLength: 100 },
          order: 2
        },
        {
          name: 'icon',
          type: 'string',
          label: { en: 'Icon', es: 'Icono' },
          validation: { required: false },
          order: 3
        },
        {
          name: 'description',
          type: 'string',
          label: { en: 'Description', es: 'Descripción' },
          validation: { required: true, maxLength: 1000 },
          order: 4
        },
        {
          name: 'category',
          type: 'select',
          label: { en: 'Category', es: 'Categoría' },
          validation: { required: true },
          options: [
            { value: 'combat', label: { en: 'Combat', es: 'Combate' } },
            { value: 'magic', label: { en: 'Magic', es: 'Magia' } },
            { value: 'utility', label: { en: 'Utility', es: 'Utilidad' } },
            { value: 'passive', label: { en: 'Passive', es: 'Pasiva' } },
            { value: 'special', label: { en: 'Special', es: 'Especial' } }
          ],
          order: 5
        },
        {
          name: 'level',
          type: 'number',
          label: { en: 'Level', es: 'Nivel' },
          validation: { required: true, min: 1, max: 100 },
          defaultValue: 1,
          order: 6
        }
      ]
    };
  }

  private buildRuleSchema(): EntityFormSchema {
    return {
      entityType: 'rule',
      version: '1.0.0',
      fields: [
        {
          name: 'description',
          type: 'string',
          label: { en: 'Description', es: 'Descripción' },
          validation: { required: true, minLength: 1, maxLength: 200 },
          order: 1
        },
        {
          name: 'keywords',
          type: 'array',
          label: { en: 'Keywords', es: 'Palabras Clave' },
          validation: { required: true },
          order: 2
        },
        {
          name: 'affectedStats',
          type: 'multiselect',
          label: { en: 'Affected Stats', es: 'Stats Afectadas' },
          validation: { required: true },
          dynamicOptions: { source: 'universe.stats' },
          order: 3
        },
        {
          name: 'maxChangePerAction',
          type: 'number',
          label: { en: 'Max Change Per Action', es: 'Cambio Máximo por Acción' },
          validation: { required: true, min: 1, max: 100 },
          defaultValue: 3,
          order: 4
        }
      ]
    };
  }

  private getAvailableIcons(): FormFieldOption[] {
    return [
      { value: 'barbell-outline', label: { en: 'Barbell', es: 'Pesa' } },
      { value: 'flash-outline', label: { en: 'Flash', es: 'Rayo' } },
      { value: 'heart-outline', label: { en: 'Heart', es: 'Corazón' } },
      { value: 'bulb-outline', label: { en: 'Bulb', es: 'Bombilla' } },
      { value: 'eye-outline', label: { en: 'Eye', es: 'Ojo' } },
      { value: 'pulse-outline', label: { en: 'Pulse', es: 'Pulso' } },
      { value: 'shield-outline', label: { en: 'Shield', es: 'Escudo' } },
      { value: 'flame-outline', label: { en: 'Flame', es: 'Llama' } },
      { value: 'snow-outline', label: { en: 'Snow', es: 'Nieve' } },
      { value: 'leaf-outline', label: { en: 'Leaf', es: 'Hoja' } },
      { value: 'water-outline', label: { en: 'Water', es: 'Agua' } },
      { value: 'planet-outline', label: { en: 'Planet', es: 'Planeta' } },
      { value: 'skull-outline', label: { en: 'Skull', es: 'Calavera' } },
      { value: 'star-outline', label: { en: 'Star', es: 'Estrella' } },
      { value: 'diamond-outline', label: { en: 'Diamond', es: 'Diamante' } }
    ];
  }
}
