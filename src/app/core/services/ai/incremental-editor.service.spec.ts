import { TestBed } from '@angular/core/testing';
import { IncrementalEditorService } from './incremental-editor.service';
import { IntentDetectorService } from './intent-detector.service';
import { FormSchemaService } from './form-schema.service';
import { FieldChange, ChangeDetectionRequest } from '../../models';

describe('IncrementalEditorService', () => {
  let service: IncrementalEditorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IncrementalEditorService, IntentDetectorService, FormSchemaService]
    });
    service = TestBed.inject(IncrementalEditorService);
    service.resetHistory();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('applyChanges', () => {
    it('should apply add change to entity', () => {
      const entity: Record<string, unknown> = { name: 'Test' };
      const changes: FieldChange[] = [
        { path: 'description', operation: 'add', newValue: 'New description' }
      ];

      const result = service.applyChanges(entity, changes);
      expect(result['description']).toBe('New description');
      expect(result['name']).toBe('Test'); // Original unchanged
    });

    it('should apply update change to entity', () => {
      const entity: Record<string, unknown> = { name: 'Old Name' };
      const changes: FieldChange[] = [
        { path: 'name', operation: 'update', oldValue: 'Old Name', newValue: 'New Name' }
      ];

      const result = service.applyChanges(entity, changes);
      expect(result['name']).toBe('New Name');
    });

    it('should apply delete change to entity', () => {
      const entity: Record<string, unknown> = { name: 'Test', description: 'To be deleted' };
      const changes: FieldChange[] = [
        { path: 'description', operation: 'delete', oldValue: 'To be deleted' }
      ];

      const result = service.applyChanges(entity, changes);
      expect(result['description']).toBeUndefined();
      expect(result['name']).toBe('Test');
    });

    it('should apply multiple changes', () => {
      const entity: Record<string, unknown> = { name: 'Old', value: 10 };
      const changes: FieldChange[] = [
        { path: 'name', operation: 'update', newValue: 'New' },
        { path: 'value', operation: 'update', newValue: 20 },
        { path: 'extra', operation: 'add', newValue: 'Added' }
      ];

      const result = service.applyChanges(entity, changes);
      expect(result['name']).toBe('New');
      expect(result['value']).toBe(20);
      expect(result['extra']).toBe('Added');
    });

    it('should apply nested changes', () => {
      const entity: Record<string, unknown> = {
        stats: {
          strength: 10,
          agility: 20
        }
      };
      const changes: FieldChange[] = [
        { path: 'stats.strength', operation: 'update', newValue: 15 }
      ];

      const result = service.applyChanges(entity, changes);
      expect((result['stats'] as Record<string, unknown>)['strength']).toBe(15);
      expect((result['stats'] as Record<string, unknown>)['agility']).toBe(20);
    });

    it('should create nested path if not exists', () => {
      const entity: Record<string, unknown> = { name: 'Test' };
      const changes: FieldChange[] = [
        { path: 'stats.strength', operation: 'add', newValue: 10 }
      ];

      const result = service.applyChanges(entity, changes);
      expect((result['stats'] as Record<string, unknown>)['strength']).toBe(10);
    });

    it('should not mutate original entity', () => {
      const entity = { name: 'Original' };
      const changes: FieldChange[] = [
        { path: 'name', operation: 'update', newValue: 'Changed' }
      ];

      service.applyChanges(entity, changes);
      expect(entity.name).toBe('Original');
    });

    it('should record changeset in history', () => {
      const entity = { name: 'Test' };
      const changes: FieldChange[] = [
        { path: 'name', operation: 'update', newValue: 'New' }
      ];

      service.applyChanges(entity, changes);
      expect(service.changesetCount()).toBe(1);
    });
  });

  describe('applyFieldChange', () => {
    it('should apply single field change', () => {
      const entity: Record<string, unknown> = { name: 'Old' };
      const result = service.applyFieldChange(entity, 'name', 'New');
      expect(result['name']).toBe('New');
    });

    it('should detect add operation for new field', () => {
      const entity: Record<string, unknown> = { name: 'Test' };
      const result = service.applyFieldChange(entity, 'newField', 'value');
      expect(result['newField']).toBe('value');
    });
  });

  describe('generateDiff', () => {
    it('should detect added fields', () => {
      const oldEntity = { name: 'Test' };
      const newEntity = { name: 'Test', description: 'New' };

      const diff = service.generateDiff(oldEntity, newEntity);
      expect(diff.hasChanges).toBe(true);
      expect(diff.summary.added).toBe(1);
      expect(diff.changes.find(c => c.path === 'description')).toBeTruthy();
    });

    it('should detect updated fields', () => {
      const oldEntity = { name: 'Old' };
      const newEntity = { name: 'New' };

      const diff = service.generateDiff(oldEntity, newEntity);
      expect(diff.hasChanges).toBe(true);
      expect(diff.summary.updated).toBe(1);
    });

    it('should detect deleted fields', () => {
      const oldEntity = { name: 'Test', extra: 'value' };
      const newEntity = { name: 'Test' };

      const diff = service.generateDiff(oldEntity, newEntity);
      expect(diff.hasChanges).toBe(true);
      expect(diff.summary.deleted).toBe(1);
    });

    it('should detect nested changes', () => {
      const oldEntity = { stats: { strength: 10 } };
      const newEntity = { stats: { strength: 20 } };

      const diff = service.generateDiff(oldEntity, newEntity);
      expect(diff.hasChanges).toBe(true);
      expect(diff.changes.find(c => c.path === 'stats.strength')).toBeTruthy();
    });

    it('should return no changes for identical entities', () => {
      const entity = { name: 'Test', value: 10 };

      const diff = service.generateDiff(entity, { ...entity });
      expect(diff.hasChanges).toBe(false);
      expect(diff.changes.length).toBe(0);
    });

    it('should track affected top-level keys', () => {
      const oldEntity = { name: 'Test', stats: { str: 10 } };
      const newEntity = { name: 'New', stats: { str: 20 } };

      const diff = service.generateDiff(oldEntity, newEntity);
      expect(diff.summary.affectedKeys).toContain('name');
      expect(diff.summary.affectedKeys).toContain('stats');
    });
  });

  describe('undo/redo', () => {
    it('should undo last change', () => {
      const entity: Record<string, unknown> = { name: 'Original' };
      const changed = service.applyFieldChange(entity, 'name', 'Changed');

      expect(changed['name']).toBe('Changed');

      const undone = service.undo(changed);
      expect(undone).toBeTruthy();
      expect(undone!['name']).toBe('Original');
    });

    it('should redo undone change', () => {
      const entity: Record<string, unknown> = { name: 'Original' };
      const changed = service.applyFieldChange(entity, 'name', 'Changed');
      const undone = service.undo(changed)!;
      const redone = service.redo(undone);

      expect(redone).toBeTruthy();
      expect(redone!['name']).toBe('Changed');
    });

    it('should return null when nothing to undo', () => {
      const entity: Record<string, unknown> = { name: 'Test' };
      const result = service.undo(entity);
      expect(result).toBeNull();
    });

    it('should return null when nothing to redo', () => {
      const entity: Record<string, unknown> = { name: 'Test' };
      const result = service.redo(entity);
      expect(result).toBeNull();
    });

    it('should update canUndo signal', () => {
      expect(service.canUndo()).toBe(false);

      const entity: Record<string, unknown> = { name: 'Test' };
      service.applyFieldChange(entity, 'name', 'New');

      expect(service.canUndo()).toBe(true);
    });

    it('should update canRedo signal after undo', () => {
      const entity: Record<string, unknown> = { name: 'Test' };
      const changed = service.applyFieldChange(entity, 'name', 'New');

      expect(service.canRedo()).toBe(false);

      service.undo(changed);
      expect(service.canRedo()).toBe(true);
    });

    it('should handle multiple undo operations', () => {
      let entity: Record<string, unknown> = { name: 'Original' };
      entity = service.applyFieldChange(entity, 'name', 'First');
      entity = service.applyFieldChange(entity, 'name', 'Second');
      entity = service.applyFieldChange(entity, 'name', 'Third');

      expect(entity['name']).toBe('Third');

      entity = service.undo(entity)!;
      expect(entity['name']).toBe('Second');

      entity = service.undo(entity)!;
      expect(entity['name']).toBe('First');

      entity = service.undo(entity)!;
      expect(entity['name']).toBe('Original');
    });

    it('should clear redo history when new change is made', () => {
      let entity: Record<string, unknown> = { name: 'Original' };
      entity = service.applyFieldChange(entity, 'name', 'First');
      entity = service.applyFieldChange(entity, 'name', 'Second');

      entity = service.undo(entity)!;
      expect(service.canRedo()).toBe(true);

      // Make new change - should clear redo history
      entity = service.applyFieldChange(entity, 'name', 'NewBranch');
      expect(service.canRedo()).toBe(false);
    });

    it('should undo add operation by deleting', () => {
      const entity: Record<string, unknown> = { name: 'Test' };
      const changed = service.applyFieldChange(entity, 'newField', 'value');
      expect(changed['newField']).toBe('value');

      const undone = service.undo(changed)!;
      expect(undone['newField']).toBeUndefined();
    });

    it('should undo delete operation by restoring', () => {
      const entity: Record<string, unknown> = { name: 'Test', extra: 'value' };
      const changes: FieldChange[] = [
        { path: 'extra', operation: 'delete', oldValue: 'value' }
      ];
      const changed = service.applyChanges(entity, changes);
      expect(changed['extra']).toBeUndefined();

      const undone = service.undo(changed)!;
      expect(undone['extra']).toBe('value');
    });
  });

  describe('detectChanges', () => {
    it('should detect changes from user message', () => {
      const request: ChangeDetectionRequest = {
        userMessage: 'Cambiar el nombre a "Nuevo Universo"',
        currentEntity: { name: 'Viejo Universo' },
        entityType: 'universe'
      };

      const result = service.detectChanges(request);
      expect(result.changes.length).toBeGreaterThan(0);
      const nameChange = result.changes.find(c => c.path === 'name');
      expect(nameChange).toBeTruthy();
    });

    it('should include confidence scores', () => {
      const request: ChangeDetectionRequest = {
        userMessage: 'Universo llamado "Test"',
        currentEntity: {},
        entityType: 'universe'
      };

      const result = service.detectChanges(request);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect secondary effects', () => {
      const request: ChangeDetectionRequest = {
        userMessage: 'Cambiar la estadística de fuerza',
        currentEntity: {
          statDefinitions: { strength: { name: 'Strength' } }
        },
        entityType: 'universe',
        context: { language: 'es' }
      };

      const result = service.detectChanges(request);
      // Secondary effects should be detected for stat changes
      if (result.changes.some(c => c.path.startsWith('statDefinitions'))) {
        expect(result.hasSecondaryEffects).toBe(true);
      }
    });

    it('should not create change if value is same', () => {
      const request: ChangeDetectionRequest = {
        userMessage: 'El nombre es "Test"',
        currentEntity: { name: 'Test' },
        entityType: 'universe'
      };

      const result = service.detectChanges(request);
      const nameChange = result.changes.find(c => c.path === 'name');
      // Should not have a change since value is the same
      expect(nameChange).toBeFalsy();
    });
  });

  describe('history management', () => {
    it('should reset history', () => {
      const entity = { name: 'Test' };
      service.applyFieldChange(entity, 'name', 'New');

      expect(service.changesetCount()).toBe(1);

      service.resetHistory();
      expect(service.changesetCount()).toBe(0);
      expect(service.canUndo()).toBe(false);
    });

    it('should get changeset by ID', () => {
      const entity = { name: 'Test' };
      service.applyFieldChange(entity, 'name', 'New');

      const history = service.getHistory();
      const changesetId = history.changesets[0].id;

      const changeset = service.getChangeset(changesetId);
      expect(changeset).toBeTruthy();
      expect(changeset!.id).toBe(changesetId);
    });

    it('should return null for unknown changeset ID', () => {
      const changeset = service.getChangeset('unknown-id');
      expect(changeset).toBeNull();
    });

    it('should limit history size', () => {
      service.configure({ maxHistorySize: 3 });

      let entity: Record<string, unknown> = { counter: 0 };
      for (let i = 1; i <= 5; i++) {
        entity = service.applyFieldChange(entity, 'counter', i);
      }

      expect(service.changesetCount()).toBe(3);
    });

    it('should configure service options', () => {
      service.configure({ detectSecondaryEffects: false });
      // Should not throw
    });
  });

  describe('createChangeset', () => {
    it('should create a changeset object', () => {
      const changes: FieldChange[] = [
        { path: 'name', operation: 'update', newValue: 'New' }
      ];

      const changeset = service.createChangeset(changes, 'universe', 'user', 'Test description');

      expect(changeset.id).toBeTruthy();
      expect(changeset.entityType).toBe('universe');
      expect(changeset.source).toBe('user');
      expect(changeset.description).toBe('Test description');
      expect(changeset.applied).toBe(false);
      expect(changeset.changes).toEqual(changes);
    });

    it('should auto-generate description if not provided', () => {
      const changes: FieldChange[] = [
        { path: 'name', operation: 'update', newValue: 'New' }
      ];

      const changeset = service.createChangeset(changes, 'universe', 'ai');
      expect(changeset.description).toContain('name');
    });

    it('should include user message if provided', () => {
      const changes: FieldChange[] = [
        { path: 'name', operation: 'update', newValue: 'New' }
      ];

      const changeset = service.createChangeset(
        changes,
        'character',
        'user',
        'Description',
        'User typed this'
      );

      expect(changeset.userMessage).toBe('User typed this');
    });
  });

  describe('edge cases', () => {
    it('should handle empty changes array', () => {
      const entity: Record<string, unknown> = { name: 'Test' };
      const result = service.applyChanges(entity, []);
      expect(result).toEqual(entity);
    });

    it('should handle deeply nested paths', () => {
      const entity: Record<string, unknown> = { a: { b: { c: { d: 1 } } } };
      const changes: FieldChange[] = [
        { path: 'a.b.c.d', operation: 'update', newValue: 2 }
      ];

      const result = service.applyChanges(entity, changes);
      expect((((result['a'] as Record<string, unknown>)['b'] as Record<string, unknown>)['c'] as Record<string, unknown>)['d']).toBe(2);
    });

    it('should handle array values', () => {
      const entity: Record<string, unknown> = { tags: ['a', 'b'] };
      const changes: FieldChange[] = [
        { path: 'tags', operation: 'update', newValue: ['a', 'b', 'c'] }
      ];

      const result = service.applyChanges(entity, changes);
      expect(result['tags']).toEqual(['a', 'b', 'c']);
    });

    it('should handle null values', () => {
      const entity: Record<string, unknown> = { name: 'Test', extra: null };
      const changes: FieldChange[] = [
        { path: 'extra', operation: 'update', newValue: 'value' }
      ];

      const result = service.applyChanges(entity, changes);
      expect(result['extra']).toBe('value');
    });

    it('should generate diff for empty old entity', () => {
      const diff = service.generateDiff({}, { name: 'Test' });
      expect(diff.hasChanges).toBe(true);
      expect(diff.summary.added).toBe(1);
    });

    it('should generate diff for empty new entity', () => {
      const diff = service.generateDiff({ name: 'Test' }, {});
      expect(diff.hasChanges).toBe(true);
      expect(diff.summary.deleted).toBe(1);
    });
  });
});
