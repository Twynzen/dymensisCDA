/**
 * AI Intent Detection Models
 * Types for semantic understanding of user intentions
 */

/** Supported user intent actions */
export type IntentAction = 'create' | 'edit' | 'query' | 'delete' | 'confirm' | 'cancel' | 'navigate' | 'unknown';

/** Supported target entity types */
export type IntentTarget = 'universe' | 'character' | 'stat' | 'skill' | 'race' | 'rule' | 'awakening' | 'unknown';

/** Source of field extraction */
export type ExtractionSource = 'explicit' | 'inferred' | 'default' | 'context';

/** Alias for ExtractionSource for backward compatibility */
export type FieldSource = ExtractionSource;

/** Supported languages */
export type SupportedLanguage = 'es' | 'en';

/**
 * Extracted field from user input with confidence scoring
 */
export interface ExtractedField {
  /** Field key (e.g., 'name', 'description', 'strength') */
  field: string;
  /** Extracted value */
  value: string | number | boolean | string[] | number[];
  /** Confidence score (0.0 to 1.0) */
  confidence: number;
  /** How the value was obtained */
  source: ExtractionSource;
  /** Original text that led to this extraction */
  sourceText?: string;
}

/**
 * Result of intent detection
 */
export interface DetectedIntent {
  /** What action the user wants to perform */
  action: IntentAction;
  /** What entity type the action targets */
  target: IntentTarget;
  /** Specific entity ID for edit/delete operations */
  targetId?: string;
  /** Extracted fields from the input */
  fields: ExtractedField[];
  /** Original user input */
  rawInput: string;
  /** Detected language */
  language: SupportedLanguage;
  /** Overall confidence score */
  confidence: number;
  /** Whether clarification is needed */
  needsClarification: boolean;
  /** Suggested clarification questions */
  clarificationQuestions?: string[];
  /** Matched keywords that led to this detection */
  matchedKeywords?: string[];
}

/**
 * Pattern for field extraction via regex
 */
export interface FieldPattern {
  /** Target field name */
  field: string;
  /** Regex patterns to match (first match wins) */
  patterns: RegExp[];
  /** Transform function for matched value */
  transform?: (match: string) => string | number | boolean;
  /** Validation function */
  validation?: (value: unknown) => boolean;
  /** Base confidence for this pattern */
  baseConfidence?: number;
}

/**
 * Simple intent pattern for regex-based detection
 */
export interface IntentPattern {
  /** Regex pattern to match */
  pattern: RegExp;
  /** Target action */
  action: IntentAction;
  /** Target entity type */
  target: IntentTarget;
  /** Language this pattern is for */
  language: SupportedLanguage;
  /** Priority (higher = checked first) */
  priority?: number;
}

/**
 * Advanced intent pattern definition for rule-based detection
 */
export interface AdvancedIntentPattern {
  /** Target action */
  action: IntentAction;
  /** Target entity type */
  target: IntentTarget;
  /** Keywords in different languages */
  keywords: {
    es: string[];
    en: string[];
  };
  /** Field extraction patterns */
  fieldPatterns: FieldPattern[];
  /** Priority (higher = checked first) */
  priority?: number;
  /** Minimum confidence threshold */
  minConfidence?: number;
}

/**
 * Contradiction detection result
 */
export interface ContradictionResult {
  /** Whether contradictions were found */
  hasContradictions: boolean;
  /** Fields that have contradictions */
  contradictingFields: ContradictingField[];
  /** Suggested resolution */
  resolution?: 'ask_user' | 'use_new' | 'keep_old';
  /** Explanation of contradictions */
  explanation?: string;
}

/**
 * Details of a contradicting field
 */
export interface ContradictingField {
  /** Field name */
  field: string;
  /** Previous value */
  existingValue: unknown;
  /** New conflicting value */
  newValue: unknown;
  /** Severity of contradiction */
  severity: 'high' | 'medium' | 'low';
}

/**
 * Configuration for intent detection
 */
export interface IntentDetectorConfig {
  /** Minimum confidence to accept intent (default: 0.5) */
  minConfidence: number;
  /** Whether to use LLM for ambiguous cases (default: true) */
  useLLMFallback: boolean;
  /** Maximum fields to extract per message (default: 10) */
  maxFieldsPerMessage: number;
  /** Languages to support (default: ['es', 'en']) */
  supportedLanguages: SupportedLanguage[];
}

/**
 * Default intent detector configuration
 */
export const DEFAULT_INTENT_DETECTOR_CONFIG: IntentDetectorConfig = {
  minConfidence: 0.5,
  useLLMFallback: true,
  maxFieldsPerMessage: 10,
  supportedLanguages: ['es', 'en']
};
