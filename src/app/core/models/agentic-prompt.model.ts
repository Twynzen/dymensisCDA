/**
 * Agentic Prompt Models
 * Types for building context-aware prompts for LLM interactions
 */

import { Universe, Character } from './index';
import { EntityFormSchema, FormFieldSchema } from './form-schema.model';
import { ExtractedField } from './ai-intent.model';

/** Prompt template identifier */
export type PromptTemplateId =
  | 'field_extraction'
  | 'json_generation'
  | 'validation_correction'
  | 'clarification_question'
  | 'edit_detection'
  | 'contradiction_check'
  | 'phase_guidance'
  | 'entity_summary';

/** Expected response format */
export type ResponseFormat = 'json' | 'text' | 'structured' | 'boolean';

/**
 * Context for building prompts
 */
export interface PromptContext {
  /** Current mode */
  mode: 'universe' | 'character' | 'edit' | 'action';
  /** Current phase ID */
  phase: string;
  /** Language for responses */
  language: 'es' | 'en';
  /** Current entity being created/edited */
  currentEntity: Partial<Universe> | Partial<Character> | null;
  /** Data collected so far */
  collectedData: Record<string, unknown>;
  /** Extracted fields with confidence */
  extractedFields?: Record<string, ExtractedField>;
  /** Conversation history */
  conversationHistory: ConversationMessage[];
  /** Schema for current entity type */
  schema: EntityFormSchema;
  /** Universe context (for character creation) */
  universe?: Universe;
  /** Session metadata */
  sessionId?: string;
  /** User preferences */
  userPreferences?: UserPreferences;
}

/**
 * Conversation message
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

/**
 * User preferences for prompt generation
 */
export interface UserPreferences {
  /** Preferred detail level */
  verbosity: 'concise' | 'normal' | 'detailed';
  /** Whether to include examples */
  includeExamples: boolean;
  /** Custom instructions */
  customInstructions?: string;
}

/**
 * Few-shot example for prompts
 */
export interface FewShotExample {
  /** Example input */
  input: string;
  /** Expected output */
  output: string;
  /** Optional explanation */
  explanation?: string;
  /** Tags for filtering relevant examples */
  tags?: string[];
  /** Language of example */
  language: 'es' | 'en';
}

/**
 * Built prompt ready for LLM
 */
export interface BuiltPrompt {
  /** System prompt with instructions */
  systemPrompt: string;
  /** User prompt with the actual request */
  userPrompt: string;
  /** Expected response format */
  expectedFormat: ResponseFormat;
  /** Maximum tokens for response */
  maxTokens: number;
  /** Temperature for generation */
  temperature: number;
  /** Estimated input tokens */
  estimatedInputTokens: number;
}

/**
 * Template variables for prompt generation
 */
export interface PromptTemplateVariables {
  /** User's message */
  userMessage?: string;
  /** Target fields for extraction */
  targetFields?: FormFieldSchema[];
  /** Target fields formatted as text */
  targetFieldsText?: string;
  /** Collected data as JSON */
  collectedDataJson?: string;
  /** Current entity as JSON */
  currentEntityJson?: string;
  /** Schema as formatted text */
  schemaText?: string;
  /** Recent conversation */
  conversationText?: string;
  /** Few-shot examples */
  examples?: FewShotExample[];
  /** Validation errors to fix */
  validationErrors?: string[];
  /** Missing required fields */
  missingFields?: string;
  /** Phase-specific instructions */
  phaseInstructions?: string;
  /** Universe context for characters */
  universeContext?: string;
  /** Entity type being created/edited */
  entityType?: string;
  /** Current phase ID */
  phase?: string;
  /** Language for responses */
  language?: string;
}

/**
 * Prompt template definition
 */
export interface PromptTemplate {
  /** Template ID */
  id: PromptTemplateId;
  /** Template name */
  name: string;
  /** System prompt template */
  systemTemplate: string;
  /** User prompt template */
  userTemplate: string;
  /** Expected format */
  expectedFormat: ResponseFormat;
  /** Default max tokens */
  defaultMaxTokens: number;
  /** Default temperature */
  defaultTemperature: number;
  /** Required variables */
  requiredVariables: string[];
  /** Optional variables */
  optionalVariables: string[];
}

/**
 * Configuration for prompt builder
 */
export interface PromptBuilderConfig {
  /** Maximum context tokens (default: 3000) */
  maxContextTokens: number;
  /** Maximum conversation history messages (default: 5) */
  maxHistoryMessages: number;
  /** Maximum examples per prompt (default: 3) */
  maxExamples: number;
  /** Whether to compress long content (default: true) */
  compressLongContent: boolean;
  /** Characters per token estimate (default: 4) */
  charsPerToken: number;
}

/**
 * Default prompt builder configuration
 */
export const DEFAULT_PROMPT_BUILDER_CONFIG: PromptBuilderConfig = {
  maxContextTokens: 3000,
  maxHistoryMessages: 5,
  maxExamples: 3,
  compressLongContent: true,
  charsPerToken: 4
};

/**
 * Token budget allocation for different prompt sections
 */
export interface TokenBudget {
  systemPrompt: number;
  schema: number;
  examples: number;
  collectedData: number;
  conversationHistory: number;
  userPrompt: number;
}

/**
 * Default token budget percentages
 */
export const DEFAULT_TOKEN_BUDGET_PERCENTAGES: Record<keyof TokenBudget, number> = {
  systemPrompt: 0.15,
  schema: 0.20,
  examples: 0.15,
  collectedData: 0.20,
  conversationHistory: 0.15,
  userPrompt: 0.15
};
