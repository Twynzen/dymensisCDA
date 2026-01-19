/**
 * Orchestration Models
 * Types for coordinating the agentic AI system
 */

import { Universe, Character } from './index';
import { ExtractedField, DetectedIntent } from './ai-intent.model';
import { ValidationError, ValidationWarning } from './form-schema.model';
import { EditHistory, FieldChange } from './incremental-edit.model';

/** Orchestration mode */
export type OrchestrationMode = 'universe' | 'character' | 'edit';

/** Orchestration phase state */
export type OrchestrationPhase = 'gathering' | 'generating' | 'reviewing' | 'adjusting' | 'confirmed' | 'error';

/**
 * State of an orchestration session
 */
export interface OrchestrationState {
  /** Unique session identifier */
  sessionId: string;
  /** Current mode */
  mode: OrchestrationMode;
  /** Current phase */
  phase: OrchestrationPhase;
  /** Current creation phase ID (from creation-phases) */
  creationPhaseId: string;
  /** Confidence threshold for auto-advancing */
  confidenceThreshold: number;
  /** Data extracted from user inputs */
  extractedData: Record<string, ExtractedField>;
  /** Questions waiting to be asked */
  pendingQuestions: string[];
  /** Current validation errors */
  validationErrors: ValidationError[];
  /** Current validation warnings */
  validationWarnings: ValidationWarning[];
  /** Edit history for undo/redo */
  history: EditHistory;
  /** Last detected intent */
  lastIntent: DetectedIntent | null;
  /** Generated entity (partial during creation) */
  generatedEntity: Partial<Universe> | Partial<Character> | null;
  /** Selected universe (for character creation) */
  selectedUniverse: Universe | null;
  /** Session creation time */
  createdAt: Date;
  /** Last activity time */
  lastActivityAt: Date;
  /** Number of clarification rounds */
  clarificationRounds: number;
  /** Whether the session is active */
  isActive: boolean;
}

/**
 * Result of an orchestration step
 */
export interface OrchestrationResult {
  /** Whether the step was successful */
  success: boolean;
  /** Response message to show user */
  response: string;
  /** Suggested quick actions */
  suggestedActions: string[];
  /** State updates to apply */
  stateUpdates: Partial<OrchestrationState>;
  /** Generated/updated entity (if any) */
  generatedEntity?: Partial<Universe> | Partial<Character>;
  /** Whether user confirmation is needed */
  requiresConfirmation: boolean;
  /** Type of confirmation needed */
  confirmationType?: 'save' | 'overwrite' | 'delete' | 'proceed';
  /** Fields that changed in this step */
  changedFields?: string[];
  /** Next phase to transition to (if any) */
  nextPhase?: string;
  /** Errors that occurred */
  errors?: string[];
}

/**
 * Configuration for orchestrator behavior
 */
export interface OrchestratorConfig {
  /** Minimum confidence to accept extractions (default: 0.7) */
  confidenceThreshold: number;
  /** Maximum clarification rounds before proceeding (default: 3) */
  maxClarificationRounds: number;
  /** Whether to auto-advance when phase is complete (default: true) */
  autoAdvanceOnComplete: boolean;
  /** Whether to check for contradictions (default: true) */
  enableContradictionCheck: boolean;
  /** Maximum context tokens for LLM (default: 3000) */
  maxContextTokens: number;
  /** Session timeout in milliseconds (default: 30 minutes) */
  sessionTimeoutMs: number;
  /** Whether to use LLM for ambiguous cases (default: true) */
  useLLMFallback: boolean;
  /** Whether to auto-fix validation errors (default: true) */
  autoFixValidationErrors: boolean;
}

/**
 * Default orchestrator configuration
 */
export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  confidenceThreshold: 0.7,
  maxClarificationRounds: 3,
  autoAdvanceOnComplete: true,
  enableContradictionCheck: true,
  maxContextTokens: 3000,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  useLLMFallback: true,
  autoFixValidationErrors: true
};

/**
 * Quick edit request
 */
export interface QuickEditRequest {
  /** Session ID */
  sessionId: string;
  /** Edit request text */
  editRequest: string;
  /** Specific field to edit (if known) */
  targetField?: string;
  /** Expected new value (if known) */
  expectedValue?: unknown;
}

/**
 * Session summary for display
 */
export interface SessionSummary {
  /** Session ID */
  sessionId: string;
  /** Mode */
  mode: OrchestrationMode;
  /** Current phase */
  phase: OrchestrationPhase;
  /** Progress percentage */
  progressPercent: number;
  /** Entity name (if available) */
  entityName?: string;
  /** Number of fields collected */
  fieldsCollected: number;
  /** Number of validation errors */
  errorCount: number;
  /** Last activity */
  lastActivity: Date;
}

/**
 * Orchestration event for logging/analytics
 */
export interface OrchestrationEvent {
  /** Event type */
  type: 'session_start' | 'message_processed' | 'phase_advance' | 'entity_generated' | 'validation_error' | 'session_end';
  /** Session ID */
  sessionId: string;
  /** Timestamp */
  timestamp: Date;
  /** Event-specific data */
  data: Record<string, unknown>;
}

/**
 * Creates an initial orchestration state
 */
export function createInitialState(
  sessionId: string,
  mode: OrchestrationMode,
  config: OrchestratorConfig = DEFAULT_ORCHESTRATOR_CONFIG
): OrchestrationState {
  return {
    sessionId,
    mode,
    phase: 'gathering',
    creationPhaseId: mode === 'universe' ? 'concept' : mode === 'character' ? 'universe_selection' : 'edit',
    confidenceThreshold: config.confidenceThreshold,
    extractedData: {},
    pendingQuestions: [],
    validationErrors: [],
    validationWarnings: [],
    history: { changesets: [], currentIndex: -1, maxHistorySize: 50 },
    lastIntent: null,
    generatedEntity: null,
    selectedUniverse: null,
    createdAt: new Date(),
    lastActivityAt: new Date(),
    clarificationRounds: 0,
    isActive: true
  };
}

/**
 * Generates a unique session ID
 */
export function generateSessionId(): string {
  return `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
