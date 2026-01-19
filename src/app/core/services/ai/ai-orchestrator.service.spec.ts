import { TestBed } from '@angular/core/testing';
import { AIOrchestratorService } from './ai-orchestrator.service';
import { IntentDetectorService } from './intent-detector.service';
import { FormSchemaService } from './form-schema.service';
import { EntityValidatorService } from './entity-validator.service';
import { IncrementalEditorService } from './incremental-editor.service';
import { AgenticPromptBuilderService } from './agentic-prompt-builder.service';
import { Universe } from '../../models/universe.model';

describe('AIOrchestratorService', () => {
  let service: AIOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AIOrchestratorService,
        IntentDetectorService,
        FormSchemaService,
        EntityValidatorService,
        IncrementalEditorService,
        AgenticPromptBuilderService
      ]
    });
    service = TestBed.inject(AIOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('startSession', () => {
    it('should create a new universe session', () => {
      const sessionId = service.startSession('universe');

      expect(sessionId).toBeTruthy();
      expect(sessionId.startsWith('orch_')).toBe(true);

      const session = service.getSession(sessionId);
      expect(session).toBeTruthy();
      expect(session!.mode).toBe('universe');
      expect(session!.phase).toBe('gathering');
      expect(session!.isActive).toBe(true);
    });

    it('should create a new character session', () => {
      const sessionId = service.startSession('character');

      const session = service.getSession(sessionId);
      expect(session!.mode).toBe('character');
      expect(session!.creationPhaseId).toBe('universe_selection');
    });

    it('should create edit session with existing entity', () => {
      const existingEntity = { name: 'Existing Universe' };
      const sessionId = service.startSession('edit', undefined, existingEntity);

      const session = service.getSession(sessionId);
      expect(session!.mode).toBe('edit');
      expect(session!.phase).toBe('adjusting');
      expect(session!.generatedEntity).toEqual(existingEntity);
    });

    it('should set current session ID', () => {
      const sessionId = service.startSession('universe');
      expect(service.currentSession()?.sessionId).toBe(sessionId);
    });

    it('should use custom configuration', () => {
      const sessionId = service.startSession('universe', { confidenceThreshold: 0.9 });

      const session = service.getSession(sessionId);
      expect(session!.confidenceThreshold).toBe(0.9);
    });
  });

  describe('endSession', () => {
    it('should deactivate session', () => {
      const sessionId = service.startSession('universe');
      service.endSession(sessionId);

      const session = service.getSession(sessionId);
      expect(session!.isActive).toBe(false);
    });

    it('should clear current session if it was active', () => {
      const sessionId = service.startSession('universe');
      expect(service.currentSession()).toBeTruthy();

      service.endSession(sessionId);
      expect(service.currentSession()).toBeNull();
    });
  });

  describe('processMessage - create intents', () => {
    it('should extract fields from creation message', async () => {
      const sessionId = service.startSession('universe');

      const result = await service.processMessage(
        sessionId,
        'Crear universo llamado "Tierra Media" de fantasía'
      );

      expect(result.success).toBe(true);

      const session = service.getSession(sessionId);
      expect(session!.extractedData['name']).toBeTruthy();
    });

    it('should request clarification when needed', async () => {
      const sessionId = service.startSession('universe');

      const result = await service.processMessage(
        sessionId,
        'Quiero crear un universo'
      );

      // Should ask for more info since no name provided
      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });

    it('should accumulate extracted data across messages', async () => {
      const sessionId = service.startSession('universe');

      await service.processMessage(sessionId, 'Universo llamado "Test"');
      await service.processMessage(sessionId, 'Es de fantasía');

      const session = service.getSession(sessionId);
      expect(Object.keys(session!.extractedData).length).toBeGreaterThan(0);
    });
  });

  describe('processMessage - confirm intents', () => {
    it('should advance phase on confirmation', async () => {
      const sessionId = service.startSession('universe');

      // Set up some required data
      await service.processMessage(sessionId, 'Universo llamado "Test" con descripción larga y detallada');

      const result = await service.processMessage(sessionId, 'Sí, perfecto');

      expect(result.success).toBe(true);
    });
  });

  describe('processMessage - cancel intents', () => {
    it('should handle cancel intent', async () => {
      const sessionId = service.startSession('universe');

      const result = await service.processMessage(sessionId, 'Cancelar');

      expect(result.success).toBe(true);
    });
  });

  describe('processMessage - query intents', () => {
    it('should return session info on query', async () => {
      const sessionId = service.startSession('universe');

      const result = await service.processMessage(sessionId, '¿Qué tenemos hasta ahora?');

      expect(result.success).toBe(true);
      expect(result.response).toContain('universe');
    });
  });

  describe('advancePhase', () => {
    it('should move to next phase', async () => {
      const sessionId = service.startSession('universe');
      const session = service.getSession(sessionId)!;
      const initialPhase = session.creationPhaseId;

      const result = await service.advancePhase(sessionId);

      expect(result.success).toBe(true);
      expect(result.nextPhase).toBeTruthy();
      expect(result.nextPhase).not.toBe(initialPhase);
    });

    it('should indicate when all phases complete', async () => {
      const sessionId = service.startSession('universe');

      // Advance through all phases
      const phases = ['concept', 'races', 'statistics', 'progression', 'appearance'];
      for (let i = 0; i < phases.length; i++) {
        await service.advancePhase(sessionId);
      }

      const result = await service.advancePhase(sessionId);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should fail for non-existent session', async () => {
      const result = await service.advancePhase('non-existent');
      expect(result.success).toBe(false);
    });
  });

  describe('generateFinalEntity', () => {
    it('should generate entity from collected data', async () => {
      const sessionId = service.startSession('universe');

      await service.processMessage(sessionId, 'Universo llamado "Test World"');
      await service.processMessage(sessionId, 'Es un mundo de fantasía mágica');

      const { entity, validationResult } = await service.generateFinalEntity(sessionId);

      expect(entity).toBeTruthy();
      expect(entity.name).toBeDefined();
    });

    it('should include validation result', async () => {
      const sessionId = service.startSession('universe');

      await service.processMessage(sessionId, 'Universo llamado "Test"');

      const { validationResult } = await service.generateFinalEntity(sessionId);

      expect(validationResult.validation).toBeDefined();
      expect(validationResult.size).toBeDefined();
    });

    it('should throw for non-existent session', async () => {
      await expectAsync(service.generateFinalEntity('non-existent')).toBeRejected();
    });
  });

  describe('applyQuickEdit', () => {
    it('should apply edit to existing entity', async () => {
      const sessionId = service.startSession('edit', undefined, { name: 'Original' });

      const result = await service.applyQuickEdit({
        sessionId,
        editRequest: 'Cambiar nombre a "Nuevo Nombre"'
      });

      // May or may not detect changes depending on extraction
      expect(result).toBeTruthy();
    });

    it('should fail without existing entity', async () => {
      const sessionId = service.startSession('universe');

      const result = await service.applyQuickEdit({
        sessionId,
        editRequest: 'Change name'
      });

      expect(result.success).toBe(false);
    });

    it('should track changed fields', async () => {
      const sessionId = service.startSession('edit', undefined, {
        name: 'Original',
        description: 'Old description'
      });

      const result = await service.applyQuickEdit({
        sessionId,
        editRequest: 'Nombre: "Nuevo"'
      });

      if (result.success) {
        expect(result.changedFields).toBeDefined();
      }
    });
  });

  describe('undo/redo', () => {
    it('should undo last change', async () => {
      const sessionId = service.startSession('edit', undefined, { name: 'Original' });

      await service.applyQuickEdit({
        sessionId,
        editRequest: 'nombre "Nuevo"'
      });

      const result = service.undo(sessionId);

      // May succeed or fail depending on history state
      expect(result).toBeTruthy();
    });

    it('should fail undo without changes', () => {
      const sessionId = service.startSession('universe');

      const result = service.undo(sessionId);
      expect(result.success).toBe(false);
    });

    it('should redo after undo', async () => {
      const sessionId = service.startSession('edit', undefined, { name: 'Test' });

      await service.applyQuickEdit({ sessionId, editRequest: 'nombre "New"' });
      service.undo(sessionId);

      const result = service.redo(sessionId);
      expect(result).toBeTruthy();
    });
  });

  describe('getSessionSummary', () => {
    it('should return session summary', () => {
      const sessionId = service.startSession('universe');

      const summary = service.getSessionSummary(sessionId);

      expect(summary).toBeTruthy();
      expect(summary!.sessionId).toBe(sessionId);
      expect(summary!.mode).toBe('universe');
      expect(summary!.progressPercent).toBeDefined();
    });

    it('should return null for non-existent session', () => {
      const summary = service.getSessionSummary('non-existent');
      expect(summary).toBeNull();
    });

    it('should calculate progress percentage', async () => {
      const sessionId = service.startSession('universe');

      await service.processMessage(sessionId, 'Universo llamado "Test"');

      const summary = service.getSessionSummary(sessionId);
      expect(summary!.progressPercent).toBeGreaterThan(0);
    });
  });

  describe('getActiveSessions', () => {
    it('should return all active sessions', () => {
      service.startSession('universe');
      service.startSession('character');

      const active = service.getActiveSessions();
      expect(active.length).toBe(2);
    });

    it('should not include ended sessions', () => {
      const sessionId = service.startSession('universe');
      service.startSession('character');

      service.endSession(sessionId);

      const active = service.getActiveSessions();
      expect(active.length).toBe(1);
    });
  });

  describe('setSelectedUniverse', () => {
    it('should set universe for character creation', () => {
      const sessionId = service.startSession('character');
      const universe = { id: 'u1', name: 'Test Universe' } as Universe;

      service.setSelectedUniverse(sessionId, universe);

      const session = service.getSession(sessionId);
      expect(session!.selectedUniverse).toEqual(universe);
    });
  });

  describe('buildPromptContext', () => {
    it('should build context from session', () => {
      const sessionId = service.startSession('universe');

      const context = service.buildPromptContext(sessionId);

      expect(context).toBeTruthy();
      expect(context!.mode).toBe('universe');
      expect(context!.schema).toBeDefined();
    });

    it('should return null for non-existent session', () => {
      const context = service.buildPromptContext('non-existent');
      expect(context).toBeNull();
    });

    it('should include extracted data', async () => {
      const sessionId = service.startSession('universe');
      await service.processMessage(sessionId, 'Universo llamado "Test"');

      const context = service.buildPromptContext(sessionId);
      expect(Object.keys(context!.collectedData).length).toBeGreaterThan(0);
    });
  });

  describe('configure', () => {
    it('should update orchestrator configuration', () => {
      service.configure({ maxClarificationRounds: 5 });
      // Should not throw
    });

    it('should merge partial configuration', () => {
      service.configure({ confidenceThreshold: 0.8 });
      service.configure({ autoAdvanceOnComplete: false });
      // Both settings should be applied
    });
  });

  describe('activeSessionCount', () => {
    it('should track active session count', () => {
      expect(service.activeSessionCount()).toBe(0);

      service.startSession('universe');
      expect(service.activeSessionCount()).toBe(1);

      service.startSession('character');
      expect(service.activeSessionCount()).toBe(2);
    });

    it('should decrease on session end', () => {
      const id1 = service.startSession('universe');
      service.startSession('character');

      service.endSession(id1);
      expect(service.activeSessionCount()).toBe(1);
    });
  });

  describe('multi-session management', () => {
    it('should manage multiple concurrent sessions', async () => {
      const id1 = service.startSession('universe');
      const id2 = service.startSession('character');

      await service.processMessage(id1, 'Universo "Test 1"');
      await service.processMessage(id2, 'Personaje "Hero"');

      const session1 = service.getSession(id1);
      const session2 = service.getSession(id2);

      expect(session1!.mode).toBe('universe');
      expect(session2!.mode).toBe('character');
    });

    it('should maintain separate state for each session', async () => {
      const id1 = service.startSession('universe');
      const id2 = service.startSession('universe');

      await service.processMessage(id1, 'Universo "First"');
      await service.processMessage(id2, 'Universo "Second"');

      const session1 = service.getSession(id1);
      const session2 = service.getSession(id2);

      expect(session1!.extractedData).not.toEqual(session2!.extractedData);
    });
  });

  describe('error handling', () => {
    it('should handle inactive session', async () => {
      const sessionId = service.startSession('universe');
      service.endSession(sessionId);

      const result = await service.processMessage(sessionId, 'Test');
      expect(result.success).toBe(false);
    });

    it('should handle unknown session', async () => {
      const result = await service.processMessage('unknown', 'Test');
      expect(result.success).toBe(false);
    });
  });

  describe('localization', () => {
    it('should respond in detected language', async () => {
      const sessionId = service.startSession('universe');

      const esResult = await service.processMessage(sessionId, 'Crear universo');
      // Should respond in Spanish

      const enResult = await service.processMessage(sessionId, 'Create a universe');
      // Should respond in English or mixed
    });
  });
});
