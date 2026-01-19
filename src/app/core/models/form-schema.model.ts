/**
 * Form Schema Models
 * Types for defining entity schemas with validation rules
 */

import { Universe, Character } from './index';

/** Field types supported in schemas */
export type FormFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'select' | 'multiselect' | 'color' | 'icon' | 'image';

/** Entity types that have schemas */
export type SchemaEntityType = 'universe' | 'character' | 'stat' | 'race' | 'skill' | 'rule' | 'awakening';

/**
 * Validation rule for a field
 */
export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: { en: string; es: string };
  oneOf?: (string | number)[];
  custom?: (value: unknown, context: ValidationContext) => ValidationResult;
}

/**
 * Context for validation with related entities
 */
export interface ValidationContext {
  universe?: Universe;
  character?: Character;
  existingEntities?: Map<string, unknown>;
  phase?: string;
  collectedData?: Record<string, unknown>;
  language?: 'es' | 'en';
}

/**
 * Result of validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  code: string;
  message: string;
  messageEs: string;
  value?: unknown;
}

/**
 * Validation warning (non-blocking)
 */
export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  messageEs: string;
  suggestion?: string;
}

/**
 * Option for select/multiselect fields
 */
export interface FormFieldOption {
  value: string | number;
  label: { en: string; es: string };
  disabled?: boolean;
  icon?: string;
  color?: string;
}

/**
 * Configuration for dynamic options
 */
export interface DynamicOptionsConfig {
  source: 'universe.races' | 'universe.stats' | 'universe.awakeningLevels' | 'universe.rules' | 'custom';
  customResolver?: (context: ValidationContext) => FormFieldOption[];
  filter?: (option: FormFieldOption, context: ValidationContext) => boolean;
}

/**
 * Field dependency definition
 */
export interface FieldDependency {
  /** Field that this depends on */
  field: string;
  /** Condition type */
  condition: 'equals' | 'notEquals' | 'exists' | 'notExists' | 'contains' | 'greaterThan' | 'lessThan';
  /** Value to compare against */
  value?: unknown;
  /** Action when condition is met */
  action: 'show' | 'hide' | 'require' | 'unrequire' | 'enable' | 'disable';
}

/**
 * Field definition in a form schema
 */
export interface FormFieldSchema {
  /** Field identifier (matches entity property) */
  name: string;
  /** Field type */
  type: FormFieldType;
  /** Display labels */
  label: { en: string; es: string };
  /** Help text */
  description?: { en: string; es: string };
  /** Placeholder text */
  placeholder?: { en: string; es: string };
  /** Validation rules */
  validation: FieldValidation;
  /** Default value */
  defaultValue?: unknown;
  /** Static options for select/multiselect */
  options?: FormFieldOption[];
  /** Dynamic options configuration */
  dynamicOptions?: DynamicOptionsConfig;
  /** Dependencies on other fields */
  dependsOn?: FieldDependency[];
  /** Hints to help AI extract this field */
  aiExtractionHints?: string[];
  /** Keywords that indicate this field in user input */
  aiKeywords?: { es: string[]; en: string[] };
  /** Whether this field should be shown in UI */
  hidden?: boolean;
  /** Order in form (lower = first) */
  order?: number;
  /** Group this field belongs to */
  group?: string;
}

/**
 * Grouping of fields for UI organization
 */
export interface FormFieldGroup {
  /** Group identifier */
  name: string;
  /** Display labels */
  label: { en: string; es: string };
  /** Fields in this group */
  fields: string[];
  /** Whether group is collapsible */
  collapsible?: boolean;
  /** Whether group starts collapsed */
  startCollapsed?: boolean;
  /** Icon for the group */
  icon?: string;
}

/**
 * Cross-field validation rule
 */
export interface CrossFieldValidation {
  /** Fields involved in validation */
  fields: string[];
  /** Validation function */
  validate: (values: Record<string, unknown>, context: ValidationContext) => ValidationResult;
  /** Error code */
  errorCode: string;
  /** Error messages */
  message: { en: string; es: string };
}

/**
 * Complete form schema for an entity type
 */
export interface EntityFormSchema {
  /** Entity type */
  entityType: SchemaEntityType;
  /** Schema version */
  version: string;
  /** All field definitions */
  fields: FormFieldSchema[];
  /** Field groups */
  groups?: FormFieldGroup[];
  /** Cross-field validations */
  crossFieldValidations?: CrossFieldValidation[];
  /** Phases this schema applies to (for creation flows) */
  phases?: string[];
}

/**
 * Mapping of phases to required fields
 */
export interface PhaseFieldMapping {
  phaseId: string;
  requiredFields: string[];
  optionalFields: string[];
}

/**
 * Size validation result
 */
export interface SizeValidationResult {
  sizeBytes: number;
  withinLimit: boolean;
  limit: number;
  recommendations?: string[];
}

/**
 * Firebase document size limit (1MB)
 */
export const FIREBASE_DOC_SIZE_LIMIT = 1024 * 1024; // 1MB

/**
 * Recommended max size for performance
 */
export const RECOMMENDED_DOC_SIZE = 900 * 1024; // 900KB
