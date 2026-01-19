import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { CreationService } from './creation.service';
import { CreationStore, CreationMode } from '../data-access/creation.store';
import { RagContextService } from './rag-context.service';
import { WebLLMService } from '../../../core/services/webllm.service';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { CharacterStore } from '../../characters/data-access/character.store';
import { UNIVERSE_CREATION_PHASES, CHARACTER_CREATION_PHASES } from './creation-phases';
import { signal } from '@angular/core';
import { Universe, StatDefinition, AwakeningSystem } from '../../../core/models/universe.model';

// Helper to create minimal valid Universe for testing
function createMockUniverse(overrides: Partial<Universe> & { id: string; name: string }): Universe {
  const { id, name, ...rest } = overrides;
  return {
    id,
    name,
    description: rest.description || 'Test description',
    createdBy: rest.createdBy || 'test-user',
    createdAt: rest.createdAt || new Date(),
    isPublic: rest.isPublic ?? false,
    statDefinitions: rest.statDefinitions || {},
    initialPoints: rest.initialPoints ?? 100,
    progressionRules: rest.progressionRules || [],
    awakeningSystem: rest.awakeningSystem
  };
}

// Helper to create minimal stat definition
function createStatDef(overrides: Partial<StatDefinition> & { name: string }): StatDefinition {
  return {
    name: overrides.name,
    abbreviation: overrides.abbreviation || overrides.name.substring(0, 3).toUpperCase(),
    icon: overrides.icon || 'barbell-outline',
    minValue: overrides.minValue ?? 0,
    maxValue: overrides.maxValue ?? 999,
    category: overrides.category || 'primary',
    color: overrides.color || '#FF5722',
    isDerived: overrides.isDerived || false,
    formula: overrides.formula
  };
}

describe('CreationService', () => {
  let service: CreationService;
  let mockCreationStore: jasmine.SpyObj<CreationStore>;
  let mockRagContext: jasmine.SpyObj<RagContextService>;
  let mockWebLLM: jasmine.SpyObj<WebLLMService>;
  let mockUniverseStore: jasmine.SpyObj<InstanceType<typeof UniverseStore>>;
  let mockCharacterStore: jasmine.SpyObj<InstanceType<typeof CharacterStore>>;

  // Use real signals for dynamic tracking
  let modeSignal: ReturnType<typeof signal<CreationMode>>;
  let generatedUniverseSignal: ReturnType<typeof signal<any>>;
  let generatedCharacterSignal: ReturnType<typeof signal<any>>;

  beforeEach(() => {
    // Initialize signals
    modeSignal = signal<CreationMode>('universe');
    generatedUniverseSignal = signal<any>(null);
    generatedCharacterSignal = signal<any>(null);
    mockCreationStore = jasmine.createSpyObj('CreationStore', [
      'reset',
      'setMode',
      'setPhase',
      'addMessage',
      'updateContext',
      'setSuggestedActions',
      'setGenerating',
      'setGeneratedUniverse',
      'setGeneratedCharacter',
      'setSelectedUniverseId',
      'getConversationHistory',
      'mode',
      'generatedUniverse',
      'generatedCharacter'
    ]);

    mockRagContext = jasmine.createSpyObj('RagContextService', [
      'getSystemKnowledge',
      'getUniverseCreationKnowledge',
      'getCharacterCreationKnowledge'
    ]);

    mockWebLLM = jasmine.createSpyObj('WebLLMService', [
      'isReady',
      'chat'
    ]);

    mockUniverseStore = jasmine.createSpyObj('UniverseStore', [
      'createUniverse',
      'updateUniverse',
      'allUniverses'
    ]);

    mockCharacterStore = jasmine.createSpyObj('CharacterStore', [
      'createCharacter',
      'updateCharacter'
    ]);

    // Setup default mock returns with dynamic signal tracking
    mockCreationStore.setMode.and.callFake((mode: CreationMode) => {
      modeSignal.set(mode);
    });
    (mockCreationStore as any).mode = modeSignal;
    mockCreationStore.setGeneratedUniverse.and.callFake((data: any) => {
      generatedUniverseSignal.set(data);
    });
    (mockCreationStore as any).generatedUniverse = generatedUniverseSignal;
    mockCreationStore.setGeneratedCharacter.and.callFake((data: any) => {
      generatedCharacterSignal.set(data);
    });
    (mockCreationStore as any).generatedCharacter = generatedCharacterSignal;
    mockCreationStore.getConversationHistory.and.returnValue([]);
    mockWebLLM.isReady.and.returnValue(true);
    mockWebLLM.chat.and.returnValue(Promise.resolve('AI response'));
    mockRagContext.getSystemKnowledge.and.returnValue('System knowledge');
    mockUniverseStore.allUniverses.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        CreationService,
        { provide: CreationStore, useValue: mockCreationStore },
        { provide: RagContextService, useValue: mockRagContext },
        { provide: WebLLMService, useValue: mockWebLLM },
        { provide: UniverseStore, useValue: mockUniverseStore },
        { provide: CharacterStore, useValue: mockCharacterStore }
      ]
    });

    service = TestBed.inject(CreationService);
  });

  describe('Initial State', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('startCreation', () => {
    describe('Universe Mode', () => {
      it('should start universe creation with welcome phase', () => {
        service.startCreation('universe');

        expect(mockCreationStore.reset).toHaveBeenCalled();
        expect(mockCreationStore.setMode).toHaveBeenCalledWith('universe');
        expect(mockCreationStore.setPhase).toHaveBeenCalledWith('gathering');
      });

      it('should add welcome message for universe creation', () => {
        service.startCreation('universe');

        expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
          jasmine.objectContaining({
            role: 'assistant',
            content: jasmine.stringMatching(/universo/)
          })
        );
      });

      it('should update context with first phase', () => {
        service.startCreation('universe');

        expect(mockCreationStore.updateContext).toHaveBeenCalledWith(
          'currentPhase',
          UNIVERSE_CREATION_PHASES[0].id
        );
      });

      it('should set suggested actions for first phase', () => {
        service.startCreation('universe');

        expect(mockCreationStore.setSuggestedActions).toHaveBeenCalled();
      });
    });

    describe('Character Mode', () => {
      it('should start character creation with universe selection', () => {
        mockUniverseStore.allUniverses.and.returnValue([
          createMockUniverse({ id: '1', name: 'Test Universe' })
        ]);

        service.startCreation('character');

        expect(mockCreationStore.setMode).toHaveBeenCalledWith('character');
      });

      it('should warn when no universes exist', () => {
        mockUniverseStore.allUniverses.and.returnValue([]);

        service.startCreation('character');

        expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
          jasmine.objectContaining({
            content: jasmine.stringMatching(/No tienes universos/)
          })
        );
      });

      it('should list available universes', () => {
        mockUniverseStore.allUniverses.and.returnValue([
          createMockUniverse({ id: '1', name: 'Fantasy World' }),
          createMockUniverse({ id: '2', name: 'Sci-Fi Universe' })
        ]);

        service.startCreation('character');

        expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
          jasmine.objectContaining({
            content: jasmine.stringMatching(/Fantasy World/)
          })
        );
      });
    });

    describe('Action Mode', () => {
      it('should handle action mode with empty phases', () => {
        service.startCreation('action');

        expect(mockCreationStore.setMode).toHaveBeenCalledWith('action');
        expect(mockCreationStore.reset).toHaveBeenCalled();
      });
    });
  });

  describe('processUserMessage', () => {
    beforeEach(() => {
      service.startCreation('universe');
    });

    it('should add user message to store', async () => {
      await service.processUserMessage('Test message');

      expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          role: 'user',
          content: 'Test message'
        })
      );
    });

    it('should warn if WebLLM is not ready', async () => {
      mockWebLLM.isReady.and.returnValue(false);

      await service.processUserMessage('Test message');

      expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          content: jasmine.stringMatching(/cargues el modelo/)
        })
      );
    });

    it('should set generating state during processing', async () => {
      await service.processUserMessage('Test message');

      expect(mockCreationStore.setGenerating).toHaveBeenCalledWith(true);
      expect(mockCreationStore.setGenerating).toHaveBeenCalledWith(false);
    });

    it('should add AI response to store', async () => {
      mockWebLLM.chat.and.returnValue(Promise.resolve('AI analysis response'));

      await service.processUserMessage('Test message');

      expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          role: 'assistant',
          content: 'AI analysis response'
        })
      );
    });

    it('should handle WebLLM errors gracefully', async () => {
      mockWebLLM.chat.and.returnValue(Promise.reject(new Error('LLM error')));

      await service.processUserMessage('Test message');

      expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          content: jasmine.stringMatching(/error/)
        })
      );
    });

    describe('Data Extraction', () => {
      it('should extract universe name from message', async () => {
        mockWebLLM.chat.and.returnValue(Promise.resolve('Great name!'));
        modeSignal.set('universe');

        await service.processUserMessage('Mi universo se llama "Mundo Oscuro"');

        const collectedData = service.getCollectedData();
        expect(collectedData['name']).toBe('Mundo Oscuro');
      });

      it('should detect theme from message', async () => {
        mockWebLLM.chat.and.returnValue(Promise.resolve('Fantasy theme detected'));
        modeSignal.set('universe');

        await service.processUserMessage('Quiero un universo de fantasía');

        const collectedData = service.getCollectedData();
        expect(collectedData['theme']).toBe('fantasía');
      });
    });
  });

  describe('advanceToNextPhase', () => {
    beforeEach(() => {
      service.startCreation('universe');
    });

    it('should advance to next phase', async () => {
      await service.advanceToNextPhase();

      expect(mockCreationStore.updateContext).toHaveBeenCalledWith(
        'currentPhase',
        UNIVERSE_CREATION_PHASES[1].id
      );
    });

    it('should update phase progress', async () => {
      await service.advanceToNextPhase();

      expect(mockCreationStore.updateContext).toHaveBeenCalledWith(
        'phaseProgress',
        jasmine.any(Number)
      );
    });

    it('should add phase intro message', async () => {
      await service.advanceToNextPhase();

      expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          role: 'assistant',
          content: jasmine.stringMatching(/Fase/)
        })
      );
    });
  });

  describe('goToPreviousPhase', () => {
    beforeEach(async () => {
      service.startCreation('universe');
      await service.advanceToNextPhase();
    });

    it('should go back to previous phase', () => {
      service.goToPreviousPhase();

      expect(mockCreationStore.updateContext).toHaveBeenCalledWith(
        'currentPhase',
        UNIVERSE_CREATION_PHASES[0].id
      );
    });

    it('should add back navigation message', () => {
      service.goToPreviousPhase();

      expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          content: jasmine.stringMatching(/Volviendo/)
        })
      );
    });

    it('should not go back if at first phase', () => {
      service.startCreation('universe');
      const initialCalls = mockCreationStore.updateContext.calls.count();

      service.goToPreviousPhase();

      // Should not add more calls
      expect(mockCreationStore.updateContext.calls.count()).toBe(initialCalls);
    });
  });

  describe('processImage', () => {
    beforeEach(() => {
      service.startCreation('universe');
    });

    it('should process image for universe cover', async () => {
      modeSignal.set('universe');

      await service.processImage('base64data', 'image/png');

      expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          content: jasmine.stringMatching(/imagen/i)
        })
      );
    });

    it('should update context with pending image', async () => {
      await service.processImage('base64data', 'image/png');

      expect(mockCreationStore.updateContext).toHaveBeenCalledWith('pendingImage', true);
    });

    it('should offer image assignment options', async () => {
      await service.processImage('base64data', 'image/png');

      expect(mockCreationStore.setSuggestedActions).toHaveBeenCalled();
    });
  });

  describe('assignPendingImage', () => {
    beforeEach(async () => {
      service.startCreation('universe');
      await service.processImage('base64data', 'image/png');
    });

    it('should assign image as cover', () => {
      service.assignPendingImage('cover');

      const data = service.getCollectedData();
      expect(data['coverImage']).toBe('base64data');
    });

    it('should assign image as location', () => {
      service.assignPendingImage('location', {
        name: 'Test Location',
        description: 'A test place'
      });

      const data = service.getCollectedData();
      expect(data['locations']).toBeDefined();
      expect(data['locations'].length).toBe(1);
      expect(data['locations'][0].name).toBe('Test Location');
    });

    it('should assign image as avatar', () => {
      service.assignPendingImage('avatar');

      const data = service.getCollectedData();
      expect(data['avatarUrl']).toBe('base64data');
    });

    it('should clear pending image after assignment', () => {
      service.assignPendingImage('cover');

      expect(mockCreationStore.updateContext).toHaveBeenCalledWith('pendingImage', false);
    });
  });

  describe('requestAdjustment', () => {
    it('should set phase to adjusting', () => {
      service.requestAdjustment('universe');

      expect(mockCreationStore.setPhase).toHaveBeenCalledWith('adjusting');
    });

    it('should add adjustment options message', () => {
      service.requestAdjustment('universe');

      expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          content: jasmine.stringMatching(/ajustar/i)
        })
      );
    });

    it('should set adjustment suggested actions', () => {
      service.requestAdjustment('universe');

      expect(mockCreationStore.setSuggestedActions).toHaveBeenCalledWith(
        jasmine.arrayContaining([
          jasmine.stringMatching(/estadísticas/i)
        ])
      );
    });
  });

  describe('regenerate', () => {
    it('should clear generated content', async () => {
      await service.regenerate();

      expect(mockCreationStore.setGeneratedUniverse).toHaveBeenCalledWith(null);
      expect(mockCreationStore.setGeneratedCharacter).toHaveBeenCalledWith(null);
    });

    it('should reset phase to gathering', async () => {
      await service.regenerate();

      expect(mockCreationStore.setPhase).toHaveBeenCalledWith('gathering');
    });

    it('should add regeneration message', async () => {
      await service.regenerate();

      expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          content: jasmine.stringMatching(/generar/)
        })
      );
    });
  });

  describe('confirmCreation', () => {
    describe('Universe Confirmation', () => {
      beforeEach(() => {
        modeSignal.set('universe');
        generatedUniverseSignal.set({
          name: 'Test Universe',
          description: 'A test universe',
          statDefinitions: {
            strength: {
              name: 'Fuerza',
              abbreviation: 'FUE',
              icon: 'barbell-outline',
              minValue: 1,
              maxValue: 100,
              category: 'primary',
              color: '#FF5722',
              isDerived: false
            }
          },
          progressionRules: [],
          awakeningSystem: { enabled: true, levels: [], thresholds: [] }
        });
        mockUniverseStore.createUniverse.and.returnValue(Promise.resolve('universe-id'));
        mockUniverseStore.updateUniverse.and.returnValue(Promise.resolve());
      });

      it('should create universe with name and description', async () => {
        await service.confirmCreation();

        expect(mockUniverseStore.createUniverse).toHaveBeenCalledWith(
          'Test Universe',
          'A test universe',
          false
        );
      });

      it('should update universe with additional data', async () => {
        await service.confirmCreation();

        expect(mockUniverseStore.updateUniverse).toHaveBeenCalledWith(
          'universe-id',
          jasmine.objectContaining({
            statDefinitions: jasmine.any(Object)
          })
        );
      });

      it('should set phase to confirmed', async () => {
        await service.confirmCreation();

        expect(mockCreationStore.setPhase).toHaveBeenCalledWith('confirmed');
      });

      it('should add success message', async () => {
        await service.confirmCreation();

        expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
          jasmine.objectContaining({
            content: jasmine.stringMatching(/exitosamente/)
          })
        );
      });
    });

    describe('Character Confirmation', () => {
      beforeEach(() => {
        modeSignal.set('character');
        generatedCharacterSignal.set({
          name: 'Test Character',
          universeId: 'universe-1',
          stats: { strength: 50 },
          avatar: { photoUrl: 'test.jpg', backgroundColor: '#FFFFFF' },
          progression: { level: 1, experience: 0, awakening: 'E' }
        });
        mockCharacterStore.createCharacter.and.returnValue(Promise.resolve('char-id'));
        mockCharacterStore.updateCharacter.and.returnValue(Promise.resolve());
      });

      it('should create character with required fields', async () => {
        await service.confirmCreation();

        expect(mockCharacterStore.createCharacter).toHaveBeenCalledWith(
          'Test Character',
          'universe-1',
          { strength: 50 }
        );
      });

      it('should update character with additional data', async () => {
        await service.confirmCreation();

        expect(mockCharacterStore.updateCharacter).toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should handle save errors gracefully', async () => {
        modeSignal.set('universe');
        generatedUniverseSignal.set({
          name: 'Test',
          description: 'Test'
        });
        mockUniverseStore.createUniverse.and.returnValue(Promise.reject(new Error('Save failed')));

        await service.confirmCreation();

        expect(mockCreationStore.addMessage).toHaveBeenCalledWith(
          jasmine.objectContaining({
            content: jasmine.stringMatching(/error/i)
          })
        );
      });
    });
  });

  describe('getPhaseProgress', () => {
    it('should return correct progress for first phase', () => {
      service.startCreation('universe');

      const progress = service.getPhaseProgress();

      expect(progress.current).toBe(1);
      expect(progress.total).toBe(UNIVERSE_CREATION_PHASES.length);
      expect(progress.phaseName).toBe(UNIVERSE_CREATION_PHASES[0].name);
    });

    it('should update progress after advancing', async () => {
      service.startCreation('universe');
      await service.advanceToNextPhase();

      const progress = service.getPhaseProgress();

      expect(progress.current).toBe(2);
      expect(progress.percentage).toBeGreaterThan(0);
    });
  });

  describe('getCollectedData', () => {
    it('should return copy of collected data', () => {
      service.startCreation('universe');

      const data1 = service.getCollectedData();
      const data2 = service.getCollectedData();

      expect(data1).toEqual(data2);
      expect(data1).not.toBe(data2); // Different object reference
    });

    it('should contain extracted data after processing messages', async () => {
      service.startCreation('universe');
      mockWebLLM.chat.and.returnValue(Promise.resolve('OK'));
      modeSignal.set('universe');

      await service.processUserMessage('El universo se llama "Mi Mundo"');

      const data = service.getCollectedData();
      expect(data['name']).toBeDefined();
    });
  });

  describe('Phase Completion Detection', () => {
    beforeEach(() => {
      service.startCreation('universe');
    });

    it('should detect JSON in response and parse it', async () => {
      const jsonResponse = 'Here is the result: ```json\n{"name": "Test", "statDefinitions": {"str": {}}, "description": "Desc"}\n```';
      mockWebLLM.chat.and.returnValue(Promise.resolve(jsonResponse));
      modeSignal.set('universe');

      await service.processUserMessage('Generate it');

      expect(mockCreationStore.setGeneratedUniverse).toHaveBeenCalled();
    });

    it('should transition to review phase when JSON detected', async () => {
      const jsonResponse = '```json\n{"name": "Test", "statDefinitions": {"str": {}}, "description": "D"}\n```';
      mockWebLLM.chat.and.returnValue(Promise.resolve(jsonResponse));
      modeSignal.set('universe');

      await service.processUserMessage('Generate');

      expect(mockCreationStore.setPhase).toHaveBeenCalledWith('reviewing');
    });

    it('should handle malformed JSON gracefully', async () => {
      const badJson = '```json\n{invalid json}\n```';
      mockWebLLM.chat.and.returnValue(Promise.resolve(badJson));

      await service.processUserMessage('Generate');

      // Should not throw
      expect(mockCreationStore.setGeneratedUniverse).not.toHaveBeenCalled();
    });
  });

  describe('Universe Selection for Characters', () => {
    beforeEach(() => {
      mockUniverseStore.allUniverses.and.returnValue([
        createMockUniverse({
          id: 'uni-1',
          name: 'Fantasy World',
          statDefinitions: {
            strength: createStatDef({ name: 'strength' }),
            agility: createStatDef({ name: 'agility' })
          },
          awakeningSystem: { enabled: true, levels: ['E', 'D', 'C'], thresholds: [0, 50, 100] }
        })
      ]);
      service.startCreation('character');
    });

    it('should detect universe selection from message', async () => {
      mockWebLLM.chat.and.returnValue(Promise.resolve('OK'));
      modeSignal.set('character');

      await service.processUserMessage('Quiero crear en Fantasy World');

      const data = service.getCollectedData();
      expect(data['universeId']).toBe('uni-1');
    });

    it('should store selected universe data', async () => {
      mockWebLLM.chat.and.returnValue(Promise.resolve('OK'));
      modeSignal.set('character');

      await service.processUserMessage('Fantasy World');

      expect(mockCreationStore.setSelectedUniverseId).toHaveBeenCalledWith('uni-1');
    });
  });

  describe('Conversation History', () => {
    it('should maintain conversation history in prompts', async () => {
      service.startCreation('universe');
      mockCreationStore.getConversationHistory.and.returnValue([
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' }
      ]);

      await service.processUserMessage('Second message');

      expect(mockWebLLM.chat).toHaveBeenCalledWith(
        jasmine.arrayContaining([
          jasmine.objectContaining({ content: 'First message' }),
          jasmine.objectContaining({ content: 'First response' }),
          jasmine.objectContaining({ content: 'Second message' })
        ])
      );
    });

    it('should limit history to last 10 messages', async () => {
      service.startCreation('universe');

      const longHistory = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      }));
      mockCreationStore.getConversationHistory.and.returnValue(longHistory);

      await service.processUserMessage('New message');

      const chatCall = mockWebLLM.chat.calls.mostRecent();
      const messages = chatCall.args[0];

      // System prompt + 10 history + 1 user message
      expect(messages.length).toBeLessThanOrEqual(12);
    });
  });
});

// Phase utility tests
describe('Creation Phase Utilities', () => {
  describe('UNIVERSE_CREATION_PHASES', () => {
    it('should have required phases', () => {
      const phaseIds = UNIVERSE_CREATION_PHASES.map(p => p.id);

      expect(phaseIds).toContain('concept');
      expect(phaseIds).toContain('statistics');
      expect(phaseIds).toContain('progression');
      expect(phaseIds).toContain('review');
    });

    it('should have validation rules for required phases', () => {
      const conceptPhase = UNIVERSE_CREATION_PHASES.find(p => p.id === 'concept');
      expect(conceptPhase?.validationRules).toContain('name');
    });
  });

  describe('CHARACTER_CREATION_PHASES', () => {
    it('should have required phases', () => {
      const phaseIds = CHARACTER_CREATION_PHASES.map(p => p.id);

      expect(phaseIds).toContain('universe_selection');
      expect(phaseIds).toContain('identity');
      expect(phaseIds).toContain('statistics');
      expect(phaseIds).toContain('review');
    });

    it('should require universe selection first', () => {
      expect(CHARACTER_CREATION_PHASES[0].id).toBe('universe_selection');
    });
  });
});
