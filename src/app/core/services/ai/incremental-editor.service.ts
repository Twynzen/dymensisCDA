import { Injectable, signal, computed, inject } from '@angular/core';
import {
  FieldChange,
  EntityChangeset,
  EditHistory,
  EntityDiff,
  DiffSummary,
  ChangeDetectionRequest,
  ChangeDetectionResult,
  ChangeOperation,
  ChangeSource,
  IncrementalEditorConfig,
  DEFAULT_INCREMENTAL_EDITOR_CONFIG,
  createEmptyHistory,
  generateChangesetId
} from '../../models';
import { IntentDetectorService } from './intent-detector.service';
import { FormSchemaService } from './form-schema.service';

/**
 * IncrementalEditorService
 * Handles partial entity changes without full regeneration
 * Provides undo/redo functionality with changeset history
 */
@Injectable({ providedIn: 'root' })
export class IncrementalEditorService {
  private intentDetector = inject(IntentDetectorService);
  private formSchemaService = inject(FormSchemaService);

  private config: IncrementalEditorConfig = DEFAULT_INCREMENTAL_EDITOR_CONFIG;

  /** Current edit history */
  private _history = signal<EditHistory>(createEmptyHistory(this.config.maxHistorySize));

  /** Computed: Can undo */
  readonly canUndo = computed(() => this._history().currentIndex >= 0);

  /** Computed: Can redo */
  readonly canRedo = computed(() => {
    const history = this._history();
    return history.currentIndex < history.changesets.length - 1;
  });

  /** Computed: Current changeset count */
  readonly changesetCount = computed(() => this._history().changesets.length);

  /**
   * Updates configuration
   */
  configure(config: Partial<IncrementalEditorConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.maxHistorySize) {
      this.trimHistory();
    }
  }

  /**
   * Resets the edit history
   */
  resetHistory(): void {
    this._history.set(createEmptyHistory(this.config.maxHistorySize));
  }

  /**
   * Detects changes from user request
   */
  detectChanges(request: ChangeDetectionRequest): ChangeDetectionResult {
    const { userMessage, currentEntity, entityType, context } = request;

    // Use intent detector to extract fields
    const extractedFields = this.intentDetector.extractFields(
      userMessage,
      entityType,
      (context?.['language'] as 'es' | 'en') || 'es'
    );

    const changes: FieldChange[] = [];
    const affectedFields: string[] = [];
    let overallConfidence = 0;

    for (const field of extractedFields) {
      const currentValue = this.getNestedValue(currentEntity, field.field);
      const newValue = field.value;

      // Determine operation type
      let operation: ChangeOperation = 'update';
      if (currentValue === undefined || currentValue === null) {
        operation = 'add';
      } else if (newValue === null || newValue === undefined) {
        operation = 'delete';
      }

      // Only add change if values are different
      if (!this.valuesEqual(currentValue, newValue)) {
        changes.push({
          path: field.field,
          operation,
          oldValue: currentValue,
          newValue,
          reason: `Extracted from user input: "${userMessage.substring(0, 50)}..."`,
          confidence: field.confidence
        });
        overallConfidence += field.confidence;
      }
    }

    // Calculate average confidence
    if (changes.length > 0) {
      overallConfidence /= changes.length;
    }

    // Detect secondary effects
    let hasSecondaryEffects = false;
    if (this.config.detectSecondaryEffects) {
      const secondary = this.detectSecondaryEffects(changes, currentEntity, entityType);
      if (secondary.length > 0) {
        hasSecondaryEffects = true;
        affectedFields.push(...secondary);
      }
    }

    return {
      changes,
      confidence: overallConfidence,
      hasSecondaryEffects,
      affectedFields: affectedFields.length > 0 ? affectedFields : undefined
    };
  }

  /**
   * Applies a set of changes to an entity
   */
  applyChanges<T extends Record<string, unknown>>(
    entity: T,
    changes: FieldChange[],
    source: ChangeSource = 'user',
    description?: string
  ): T {
    const cloned = this.deepClone(entity);

    for (const change of changes) {
      switch (change.operation) {
        case 'add':
        case 'update':
          this.setNestedValue(cloned, change.path, change.newValue);
          break;
        case 'delete':
          this.deleteNestedValue(cloned, change.path);
          break;
        case 'move':
          // Handle move by delete + add
          const value = this.getNestedValue(cloned, change.path);
          this.deleteNestedValue(cloned, change.path);
          if (change.newValue && typeof change.newValue === 'string') {
            this.setNestedValue(cloned, change.newValue, value);
          }
          break;
      }
    }

    // Record changeset in history
    const changeset: EntityChangeset = {
      id: generateChangesetId(),
      entityType: 'universe', // Will be refined based on context
      timestamp: new Date(),
      changes,
      source,
      description: description || this.generateDescription(changes),
      applied: true
    };

    this.addToHistory(changeset);

    return cloned as T;
  }

  /**
   * Applies a single field change
   */
  applyFieldChange<T extends Record<string, unknown>>(
    entity: T,
    path: string,
    newValue: unknown,
    source: ChangeSource = 'user'
  ): T {
    const oldValue = this.getNestedValue(entity, path);

    const change: FieldChange = {
      path,
      operation: oldValue === undefined ? 'add' : 'update',
      oldValue,
      newValue
    };

    return this.applyChanges(entity, [change], source);
  }

  /**
   * Generates a diff between two entity states
   */
  generateDiff<T extends Record<string, unknown>>(
    oldEntity: T,
    newEntity: T
  ): EntityDiff {
    const changes: FieldChange[] = [];
    const affectedKeys = new Set<string>();

    // Recursively compare objects
    this.compareObjects(oldEntity, newEntity, '', changes, affectedKeys);

    const summary: DiffSummary = {
      added: changes.filter(c => c.operation === 'add').length,
      updated: changes.filter(c => c.operation === 'update').length,
      deleted: changes.filter(c => c.operation === 'delete').length,
      affectedKeys: Array.from(affectedKeys)
    };

    return {
      hasChanges: changes.length > 0,
      changes,
      summary
    };
  }

  /**
   * Undoes the last change
   */
  undo<T extends Record<string, unknown>>(entity: T): T | null {
    const history = this._history();

    if (history.currentIndex < 0) {
      return null;
    }

    const changeset = history.changesets[history.currentIndex];
    const cloned = this.deepClone(entity);

    // Reverse the changes
    for (const change of [...changeset.changes].reverse()) {
      switch (change.operation) {
        case 'add':
          // Undo add = delete
          this.deleteNestedValue(cloned, change.path);
          break;
        case 'update':
          // Undo update = restore old value
          this.setNestedValue(cloned, change.path, change.oldValue);
          break;
        case 'delete':
          // Undo delete = restore old value
          this.setNestedValue(cloned, change.path, change.oldValue);
          break;
      }
    }

    // Move history index back
    this._history.update(h => ({
      ...h,
      currentIndex: h.currentIndex - 1
    }));

    return cloned as T;
  }

  /**
   * Redoes the last undone change
   */
  redo<T extends Record<string, unknown>>(entity: T): T | null {
    const history = this._history();

    if (history.currentIndex >= history.changesets.length - 1) {
      return null;
    }

    const nextIndex = history.currentIndex + 1;
    const changeset = history.changesets[nextIndex];
    const cloned = this.deepClone(entity);

    // Reapply the changes
    for (const change of changeset.changes) {
      switch (change.operation) {
        case 'add':
        case 'update':
          this.setNestedValue(cloned, change.path, change.newValue);
          break;
        case 'delete':
          this.deleteNestedValue(cloned, change.path);
          break;
      }
    }

    // Move history index forward
    this._history.update(h => ({
      ...h,
      currentIndex: nextIndex
    }));

    return cloned as T;
  }

  /**
   * Gets the current history state
   */
  getHistory(): EditHistory {
    return this._history();
  }

  /**
   * Gets a specific changeset by ID
   */
  getChangeset(id: string): EntityChangeset | null {
    return this._history().changesets.find(cs => cs.id === id) || null;
  }

  /**
   * Creates a changeset from changes
   */
  createChangeset(
    changes: FieldChange[],
    entityType: 'universe' | 'character',
    source: ChangeSource,
    description?: string,
    userMessage?: string
  ): EntityChangeset {
    return {
      id: generateChangesetId(),
      entityType,
      timestamp: new Date(),
      changes,
      source,
      description: description || this.generateDescription(changes),
      applied: false,
      userMessage
    };
  }

  /**
   * Adds a changeset to history
   */
  private addToHistory(changeset: EntityChangeset): void {
    this._history.update(history => {
      // Remove any future changesets if we're not at the end
      const newChangesets = history.changesets.slice(0, history.currentIndex + 1);
      newChangesets.push(changeset);

      // Trim if exceeds max size
      while (newChangesets.length > history.maxHistorySize) {
        newChangesets.shift();
      }

      return {
        ...history,
        changesets: newChangesets,
        currentIndex: newChangesets.length - 1
      };
    });
  }

  /**
   * Trims history to max size
   */
  private trimHistory(): void {
    this._history.update(history => {
      if (history.changesets.length <= this.config.maxHistorySize) {
        return history;
      }

      const trimmed = history.changesets.slice(-this.config.maxHistorySize);
      const indexOffset = history.changesets.length - trimmed.length;

      return {
        ...history,
        changesets: trimmed,
        currentIndex: Math.max(-1, history.currentIndex - indexOffset)
      };
    });
  }

  /**
   * Detects secondary effects of changes
   */
  private detectSecondaryEffects(
    changes: FieldChange[],
    entity: Record<string, unknown>,
    entityType: string
  ): string[] {
    const affected: string[] = [];

    for (const change of changes) {
      // If changing statDefinitions, progression rules may be affected
      if (change.path.startsWith('statDefinitions.') && entityType === 'universe') {
        affected.push('progressionRules');
      }

      // If changing race system, character races may be affected
      if (change.path.startsWith('raceSystem.') && entityType === 'universe') {
        affected.push('characters (race selections)');
      }

      // If changing awakening system thresholds
      if (change.path.startsWith('awakeningSystem.') && entityType === 'universe') {
        affected.push('character awakening levels');
      }
    }

    return [...new Set(affected)];
  }

  /**
   * Compares two objects recursively
   */
  private compareObjects(
    oldObj: Record<string, unknown>,
    newObj: Record<string, unknown>,
    basePath: string,
    changes: FieldChange[],
    affectedKeys: Set<string>
  ): void {
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

    for (const key of allKeys) {
      const path = basePath ? `${basePath}.${key}` : key;
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];

      // Track top-level affected key
      const topKey = path.split('.')[0];
      affectedKeys.add(topKey);

      if (oldValue === undefined && newValue !== undefined) {
        changes.push({ path, operation: 'add', newValue });
      } else if (oldValue !== undefined && newValue === undefined) {
        changes.push({ path, operation: 'delete', oldValue });
      } else if (typeof oldValue === 'object' && typeof newValue === 'object' && oldValue !== null && newValue !== null) {
        // Recursively compare nested objects
        if (!Array.isArray(oldValue) && !Array.isArray(newValue)) {
          this.compareObjects(
            oldValue as Record<string, unknown>,
            newValue as Record<string, unknown>,
            path,
            changes,
            affectedKeys
          );
        } else if (!this.valuesEqual(oldValue, newValue)) {
          changes.push({ path, operation: 'update', oldValue, newValue });
        }
      } else if (!this.valuesEqual(oldValue, newValue)) {
        changes.push({ path, operation: 'update', oldValue, newValue });
      }
    }
  }

  /**
   * Checks if two values are equal
   */
  private valuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a === undefined || b === undefined) return false;

    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    return false;
  }

  /**
   * Gets a nested value from an object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Sets a nested value in an object
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || current[part] === null || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Deletes a nested value from an object
   */
  private deleteNestedValue(obj: Record<string, unknown>, path: string): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined || typeof current[part] !== 'object') {
        return; // Path doesn't exist
      }
      current = current[part] as Record<string, unknown>;
    }

    delete current[parts[parts.length - 1]];
  }

  /**
   * Deep clones an object
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Generates a human-readable description for changes
   */
  private generateDescription(changes: FieldChange[]): string {
    if (changes.length === 0) return 'No changes';
    if (changes.length === 1) {
      const c = changes[0];
      switch (c.operation) {
        case 'add': return `Added ${c.path}`;
        case 'update': return `Updated ${c.path}`;
        case 'delete': return `Removed ${c.path}`;
        default: return `Changed ${c.path}`;
      }
    }
    return `${changes.length} changes: ${changes.map(c => c.path).join(', ')}`;
  }
}
