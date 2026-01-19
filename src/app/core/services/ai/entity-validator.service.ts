import { Injectable, inject } from '@angular/core';
import {
  EntityFormSchema,
  FormFieldSchema,
  ValidationContext,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SchemaEntityType,
  CrossFieldValidation,
  SizeValidationResult
} from '../../models';
import { Universe, Character } from '../../models';
import { FormSchemaService } from './form-schema.service';

/**
 * Result of cross-reference validation
 */
export interface CrossReferenceResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  missingReferences: MissingReference[];
}

/**
 * Missing reference information
 */
export interface MissingReference {
  field: string;
  referencedType: string;
  referencedId: string;
  message: string;
}

/**
 * Consistency check result
 */
export interface ConsistencyResult {
  consistent: boolean;
  issues: ConsistencyIssue[];
}

/**
 * Consistency issue
 */
export interface ConsistencyIssue {
  type: 'contradiction' | 'imbalance' | 'orphan' | 'duplicate';
  field: string;
  message: string;
  messageEs: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

/**
 * Auto-fix result
 */
export interface AutoFixResult<T> {
  fixed: T;
  appliedFixes: AppliedFix[];
  remainingErrors: ValidationError[];
}

/**
 * Applied fix information
 */
export interface AppliedFix {
  field: string;
  originalValue: unknown;
  fixedValue: unknown;
  reason: string;
}

/**
 * EntityValidatorService
 * Validates JSON entities against schemas with comprehensive checks
 */
@Injectable({ providedIn: 'root' })
export class EntityValidatorService {
  private formSchemaService = inject(FormSchemaService);

  /**
   * Validates a complete entity against its schema
   */
  validateEntity(
    entity: Record<string, unknown>,
    entityType: SchemaEntityType,
    context: ValidationContext = {}
  ): ValidationResult {
    const schema = this.formSchemaService.getSchema(entityType);
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate each field
    for (const field of schema.fields) {
      const value = this.getNestedValue(entity, field.name);
      const fieldResult = this.formSchemaService.validateField(field, value, context);
      errors.push(...fieldResult.errors);
      warnings.push(...fieldResult.warnings);
    }

    // Run cross-field validations
    if (schema.crossFieldValidations) {
      const crossResult = this.runCrossFieldValidations(entity, schema.crossFieldValidations, context);
      errors.push(...crossResult.errors);
      warnings.push(...crossResult.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates entity for a specific phase
   */
  validateForPhase(
    entity: Record<string, unknown>,
    entityType: 'universe' | 'character',
    phaseId: string,
    context: ValidationContext = {}
  ): ValidationResult {
    const phaseFields = this.formSchemaService.getSchemaForPhase(entityType, phaseId);
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const field of phaseFields) {
      const value = this.getNestedValue(entity, field.name);
      const fieldResult = this.formSchemaService.validateField(field, value, context);
      errors.push(...fieldResult.errors);
      warnings.push(...fieldResult.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates cross-references between entities
   */
  validateCrossReferences(
    entity: Record<string, unknown>,
    context: ValidationContext
  ): CrossReferenceResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const missingReferences: MissingReference[] = [];

    // Character-specific cross-reference checks
    if (context.universe && entity['universeId']) {
      // Validate race reference
      if (entity['raceId'] && context.universe.raceSystem?.enabled) {
        const raceExists = context.universe.raceSystem.races?.some(
          r => r.id === entity['raceId']
        );
        if (!raceExists) {
          const missing: MissingReference = {
            field: 'raceId',
            referencedType: 'race',
            referencedId: entity['raceId'] as string,
            message: `Race "${entity['raceId']}" not found in universe`
          };
          missingReferences.push(missing);
          errors.push({
            field: 'raceId',
            code: 'INVALID_REFERENCE',
            message: missing.message,
            messageEs: `Raza "${entity['raceId']}" no encontrada en el universo`,
            value: entity['raceId']
          });
        }
      }

      // Validate stats reference universe stat definitions
      if (entity['stats'] && typeof entity['stats'] === 'object') {
        const characterStats = entity['stats'] as Record<string, unknown>;
        const universeStats = context.universe.statDefinitions || {};

        for (const statKey of Object.keys(characterStats)) {
          if (!universeStats[statKey]) {
            const missing: MissingReference = {
              field: `stats.${statKey}`,
              referencedType: 'stat',
              referencedId: statKey,
              message: `Stat "${statKey}" not defined in universe`
            };
            missingReferences.push(missing);
            warnings.push({
              field: `stats.${statKey}`,
              code: 'UNKNOWN_STAT',
              message: missing.message,
              messageEs: `Stat "${statKey}" no definido en el universo`,
              suggestion: 'This stat will be ignored during gameplay'
            });
          }
        }
      }
    }

    // Universe-specific cross-reference checks
    if (entity['progressionRules'] && Array.isArray(entity['progressionRules'])) {
      const statDefs = entity['statDefinitions'] as Record<string, unknown> || {};
      const rules = entity['progressionRules'] as Array<{ affectedStats?: string[] }>;

      for (const rule of rules) {
        if (rule.affectedStats) {
          for (const statKey of rule.affectedStats) {
            if (!statDefs[statKey]) {
              warnings.push({
                field: 'progressionRules',
                code: 'RULE_REFERENCES_UNKNOWN_STAT',
                message: `Progression rule references unknown stat "${statKey}"`,
                messageEs: `Regla de progresión referencia stat desconocido "${statKey}"`,
                suggestion: 'Add the stat to statDefinitions or remove from rule'
              });
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingReferences
    };
  }

  /**
   * Validates internal consistency of an entity
   */
  validateConsistency(entity: Record<string, unknown>): ConsistencyResult {
    const issues: ConsistencyIssue[] = [];

    // Check for stat value consistency in characters
    if (entity['stats'] && typeof entity['stats'] === 'object') {
      const stats = entity['stats'] as Record<string, number>;

      // Check for negative values
      for (const [key, value] of Object.entries(stats)) {
        if (typeof value === 'number' && value < 0) {
          issues.push({
            type: 'imbalance',
            field: `stats.${key}`,
            message: `Stat "${key}" has negative value ${value}`,
            messageEs: `Stat "${key}" tiene valor negativo ${value}`,
            severity: 'error',
            suggestion: 'Set to minimum value 0'
          });
        }
      }
    }

    // Check for duplicate names in arrays
    this.checkDuplicatesInArrays(entity, issues);

    // Check awakening system consistency in universes
    if (entity['awakeningSystem']) {
      const awakening = entity['awakeningSystem'] as { enabled?: boolean; levels?: string[]; thresholds?: Record<string, number> };

      if (awakening.enabled && awakening.levels && awakening.thresholds) {
        for (const level of awakening.levels) {
          if (awakening.thresholds[level] === undefined) {
            issues.push({
              type: 'orphan',
              field: 'awakeningSystem.thresholds',
              message: `Missing threshold for awakening level "${level}"`,
              messageEs: `Falta umbral para nivel de rango "${level}"`,
              severity: 'error',
              suggestion: `Add threshold value for level "${level}"`
            });
          }
        }
      }
    }

    // Check race system consistency
    if (entity['raceSystem']) {
      const raceSystem = entity['raceSystem'] as { enabled?: boolean; races?: Array<{ id: string; name: string }> };

      if (raceSystem.enabled && (!raceSystem.races || raceSystem.races.length === 0)) {
        issues.push({
          type: 'imbalance',
          field: 'raceSystem',
          message: 'Race system is enabled but no races are defined',
          messageEs: 'Sistema de razas habilitado pero sin razas definidas',
          severity: 'warning',
          suggestion: 'Add at least one race or disable the race system'
        });
      }
    }

    return {
      consistent: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }

  /**
   * Validates entity size for Firebase
   */
  validateSize(entity: unknown): SizeValidationResult {
    return this.formSchemaService.validateSize(entity);
  }

  /**
   * Attempts to auto-fix validation errors
   */
  autoFix<T extends Record<string, unknown>>(
    entity: T,
    errors: ValidationError[],
    entityType: SchemaEntityType
  ): AutoFixResult<T> {
    const fixed = { ...entity } as T;
    const appliedFixes: AppliedFix[] = [];
    const remainingErrors: ValidationError[] = [];

    for (const error of errors) {
      const fixApplied = this.tryFixError(fixed, error, entityType);

      if (fixApplied) {
        appliedFixes.push(fixApplied);
      } else {
        remainingErrors.push(error);
      }
    }

    return { fixed, appliedFixes, remainingErrors };
  }

  /**
   * Comprehensive validation combining all checks
   */
  validateComplete(
    entity: Record<string, unknown>,
    entityType: SchemaEntityType,
    context: ValidationContext = {}
  ): {
    validation: ValidationResult;
    crossReferences: CrossReferenceResult;
    consistency: ConsistencyResult;
    size: SizeValidationResult;
    overallValid: boolean;
  } {
    const validation = this.validateEntity(entity, entityType, context);
    const crossReferences = this.validateCrossReferences(entity, context);
    const consistency = this.validateConsistency(entity);
    const size = this.validateSize(entity);

    const overallValid =
      validation.valid &&
      crossReferences.valid &&
      consistency.consistent &&
      size.withinLimit;

    return {
      validation,
      crossReferences,
      consistency,
      size,
      overallValid
    };
  }

  /**
   * Runs cross-field validations
   */
  private runCrossFieldValidations(
    entity: Record<string, unknown>,
    validations: CrossFieldValidation[],
    context: ValidationContext
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const validation of validations) {
      const fieldValues: Record<string, unknown> = {};

      for (const fieldName of validation.fields) {
        fieldValues[fieldName] = this.getNestedValue(entity, fieldName);
      }

      const result = validation.validate(fieldValues, context);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return { errors, warnings };
  }

  /**
   * Gets a nested value from an object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Sets a nested value in an object using dot notation
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Checks for duplicates in array fields
   */
  private checkDuplicatesInArrays(entity: Record<string, unknown>, issues: ConsistencyIssue[]): void {
    // Check races for duplicate IDs
    if (entity['raceSystem']) {
      const raceSystem = entity['raceSystem'] as { races?: Array<{ id: string; name: string }> };
      if (raceSystem.races) {
        const ids = raceSystem.races.map(r => r.id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

        for (const dup of duplicates) {
          issues.push({
            type: 'duplicate',
            field: 'raceSystem.races',
            message: `Duplicate race ID: "${dup}"`,
            messageEs: `ID de raza duplicado: "${dup}"`,
            severity: 'error'
          });
        }
      }
    }

    // Check progression rules for duplicate IDs
    if (entity['progressionRules'] && Array.isArray(entity['progressionRules'])) {
      const rules = entity['progressionRules'] as Array<{ id: string }>;
      const ids = rules.map(r => r.id);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

      for (const dup of duplicates) {
        issues.push({
          type: 'duplicate',
          field: 'progressionRules',
          message: `Duplicate rule ID: "${dup}"`,
          messageEs: `ID de regla duplicado: "${dup}"`,
          severity: 'error'
        });
      }
    }
  }

  /**
   * Attempts to fix a single validation error
   */
  private tryFixError(
    entity: Record<string, unknown>,
    error: ValidationError,
    entityType: SchemaEntityType
  ): AppliedFix | null {
    const schema = this.formSchemaService.getSchema(entityType);
    const field = schema.fields.find(f => f.name === error.field);

    if (!field) {
      return null;
    }

    const originalValue = this.getNestedValue(entity, error.field);

    switch (error.code) {
      case 'MIN_LENGTH':
        // Cannot auto-fix min length issues meaningfully
        return null;

      case 'MAX_LENGTH':
        // Truncate string to max length
        if (typeof originalValue === 'string' && field.validation.maxLength) {
          const fixedValue = originalValue.substring(0, field.validation.maxLength);
          this.setNestedValue(entity, error.field, fixedValue);
          return {
            field: error.field,
            originalValue,
            fixedValue,
            reason: `Truncated to ${field.validation.maxLength} characters`
          };
        }
        return null;

      case 'MIN_VALUE':
        // Set to minimum value
        if (field.validation.min !== undefined) {
          this.setNestedValue(entity, error.field, field.validation.min);
          return {
            field: error.field,
            originalValue,
            fixedValue: field.validation.min,
            reason: `Set to minimum value ${field.validation.min}`
          };
        }
        return null;

      case 'MAX_VALUE':
        // Set to maximum value
        if (field.validation.max !== undefined) {
          this.setNestedValue(entity, error.field, field.validation.max);
          return {
            field: error.field,
            originalValue,
            fixedValue: field.validation.max,
            reason: `Set to maximum value ${field.validation.max}`
          };
        }
        return null;

      case 'REQUIRED':
        // Apply default value if available
        if (field.defaultValue !== undefined) {
          this.setNestedValue(entity, error.field, field.defaultValue);
          return {
            field: error.field,
            originalValue,
            fixedValue: field.defaultValue,
            reason: 'Applied default value'
          };
        }
        return null;

      default:
        return null;
    }
  }
}
