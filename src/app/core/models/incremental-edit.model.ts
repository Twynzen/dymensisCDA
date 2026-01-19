/**
 * Incremental Edit Models
 * Types for applying partial changes without full regeneration
 */

/** Type of change operation */
export type ChangeOperation = 'add' | 'update' | 'delete' | 'move';

/** Source of the change */
export type ChangeSource = 'user' | 'ai' | 'system' | 'validation';

/**
 * Single field change
 */
export interface FieldChange {
  /** JSON path to the field (e.g., 'statDefinitions.strength.maxValue') */
  path: string;
  /** Type of operation */
  operation: ChangeOperation;
  /** Previous value (for update/delete) */
  oldValue?: unknown;
  /** New value (for add/update) */
  newValue?: unknown;
  /** Reason for this change */
  reason?: string;
  /** Confidence if AI-generated */
  confidence?: number;
}

/**
 * Complete changeset for an entity
 */
export interface EntityChangeset {
  /** Unique identifier */
  id: string;
  /** Entity type being changed */
  entityType: 'universe' | 'character';
  /** Entity ID if updating existing */
  entityId?: string;
  /** When the changeset was created */
  timestamp: Date;
  /** All changes in this set */
  changes: FieldChange[];
  /** Source of changes */
  source: ChangeSource;
  /** Human-readable description */
  description: string;
  /** Whether this changeset has been applied */
  applied: boolean;
  /** User message that triggered this (if any) */
  userMessage?: string;
}

/**
 * Edit history for undo/redo functionality
 */
export interface EditHistory {
  /** All changesets in order */
  changesets: EntityChangeset[];
  /** Current position in history (-1 means no changesets) */
  currentIndex: number;
  /** Maximum number of changesets to keep */
  maxHistorySize: number;
}

/**
 * Diff result between two entity states
 */
export interface EntityDiff {
  /** Whether there are any changes */
  hasChanges: boolean;
  /** All detected changes */
  changes: FieldChange[];
  /** Summary of changes */
  summary: DiffSummary;
}

/**
 * Summary of changes in a diff
 */
export interface DiffSummary {
  /** Number of added fields */
  added: number;
  /** Number of updated fields */
  updated: number;
  /** Number of deleted fields */
  deleted: number;
  /** Affected top-level keys */
  affectedKeys: string[];
}

/**
 * Request to detect changes from user input
 */
export interface ChangeDetectionRequest {
  /** User's edit request */
  userMessage: string;
  /** Current entity state */
  currentEntity: Record<string, unknown>;
  /** Entity type */
  entityType: 'universe' | 'character';
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Result of change detection
 */
export interface ChangeDetectionResult {
  /** Detected changes */
  changes: FieldChange[];
  /** Overall confidence */
  confidence: number;
  /** Whether changes affect other fields */
  hasSecondaryEffects: boolean;
  /** Fields that might be affected secondarily */
  affectedFields?: string[];
  /** Warnings about the changes */
  warnings?: string[];
}

/**
 * Configuration for incremental editor
 */
export interface IncrementalEditorConfig {
  /** Maximum history size (default: 50) */
  maxHistorySize: number;
  /** Whether to auto-detect secondary effects (default: true) */
  detectSecondaryEffects: boolean;
  /** Whether to validate changes before applying (default: true) */
  validateBeforeApply: boolean;
}

/**
 * Default incremental editor configuration
 */
export const DEFAULT_INCREMENTAL_EDITOR_CONFIG: IncrementalEditorConfig = {
  maxHistorySize: 50,
  detectSecondaryEffects: true,
  validateBeforeApply: true
};

/**
 * Creates an empty edit history
 */
export function createEmptyHistory(maxSize: number = 50): EditHistory {
  return {
    changesets: [],
    currentIndex: -1,
    maxHistorySize: maxSize
  };
}

/**
 * Generates a unique changeset ID
 */
export function generateChangesetId(): string {
  return `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
