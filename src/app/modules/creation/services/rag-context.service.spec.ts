import { TestBed } from '@angular/core/testing';
import { RagContextService } from './rag-context.service';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { Universe, Character } from '../../../core/models';

describe('RagContextService', () => {
  let service: RagContextService;
  let mockUniverseStore: jasmine.SpyObj<typeof UniverseStore.prototype & { allUniverses: jasmine.Spy }>;

  // Test data
  const mockUniverse: Universe = {
    id: 'universe-1',
    name: 'Test Universe',
    description: 'A test universe for unit tests',
    createdBy: 'user-1',
    createdAt: new Date(),
    isPublic: false,
    statDefinitions: {
      strength: {
        name: 'Fuerza',
        abbreviation: 'STR',
        icon: 'barbell',
        minValue: 1,
        maxValue: 100,
        defaultValue: 10,
        category: 'primary',
        color: '#FF5722'
      },
      agility: {
        name: 'Agilidad',
        abbreviation: 'AGI',
        icon: 'flash',
        minValue: 1,
        maxValue: 100,
        defaultValue: 10,
        category: 'primary',
        color: '#03A9F4'
      }
    },
    progressionRules: [
      {
        id: 'rule-1',
        keywords: ['entrenar', 'pelear'],
        affectedStats: ['strength'],
        maxChangePerAction: 3,
        description: 'Entrenamiento físico'
      }
    ],
    awakeningSystem: {
      enabled: true,
      levels: ['E', 'D', 'C', 'B', 'A', 'S'],
      thresholds: [0, 50, 100, 200, 350, 500]
    }
  };

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Test Character',
    universeId: 'universe-1',
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    avatar: {
      photoUrl: null,
      backgroundColor: '#667eea'
    },
    stats: {
      strength: 15,
      agility: 12
    },
    progression: {
      level: 1,
      experience: 0,
      awakening: 'E'
    },
    sharing: {
      isShared: false,
      shareToken: null,
      shareExpiration: null
    }
  };

  beforeEach(() => {
    mockUniverseStore = jasmine.createSpyObj('UniverseStore', ['allUniverses']);
    mockUniverseStore.allUniverses.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        RagContextService,
        { provide: UniverseStore, useValue: mockUniverseStore }
      ]
    });

    service = TestBed.inject(RagContextService);
  });

  describe('getSystemKnowledge()', () => {
    it('should return system knowledge string', () => {
      const knowledge = service.getSystemKnowledge();

      expect(knowledge).toContain('DYMENSIS CDA');
      expect(knowledge).toContain('universos');
      expect(knowledge).toContain('personajes');
    });

    it('should include image handling instructions', () => {
      const knowledge = service.getSystemKnowledge();

      expect(knowledge).toContain('IMÁGENES');
      expect(knowledge).toContain('avatar');
    });

    it('should include conversation style guidelines', () => {
      const knowledge = service.getSystemKnowledge();

      expect(knowledge).toContain('ESTILO DE CONVERSACIÓN');
      expect(knowledge).toContain('Game Master');
    });
  });

  describe('getUniverseCreationKnowledge()', () => {
    it('should return universe creation knowledge', () => {
      const knowledge = service.getUniverseCreationKnowledge();

      expect(knowledge).toContain('CREAR UNIVERSOS');
      expect(knowledge).toContain('statDefinitions');
      expect(knowledge).toContain('progressionRules');
    });

    it('should include default examples when no universes exist', () => {
      mockUniverseStore.allUniverses.and.returnValue([]);
      const knowledge = service.getUniverseCreationKnowledge();

      expect(knowledge).toContain('Solo Leveling');
      expect(knowledge).toContain('D&D Style');
      expect(knowledge).toContain('Cyberpunk');
    });

    it('should include existing universes when available', () => {
      mockUniverseStore.allUniverses.and.returnValue([mockUniverse]);
      const knowledge = service.getUniverseCreationKnowledge();

      expect(knowledge).toContain('Test Universe');
      expect(knowledge).toContain('UNIVERSOS EXISTENTES');
    });

    it('should include available icons', () => {
      const knowledge = service.getUniverseCreationKnowledge();

      expect(knowledge).toContain('barbell');
      expect(knowledge).toContain('flash');
      expect(knowledge).toContain('heart');
    });

    it('should include color suggestions', () => {
      const knowledge = service.getUniverseCreationKnowledge();

      expect(knowledge).toContain('#F44336');
      expect(knowledge).toContain('#4CAF50');
      expect(knowledge).toContain('#2196F3');
    });

    it('should include conversation flow steps', () => {
      const knowledge = service.getUniverseCreationKnowledge();

      expect(knowledge).toContain('INICIO');
      expect(knowledge).toContain('TEMÁTICA');
      expect(knowledge).toContain('ESTADÍSTICAS');
      expect(knowledge).toContain('RANGOS');
      expect(knowledge).toContain('GENERACIÓN');
    });
  });

  describe('getCharacterCreationKnowledge()', () => {
    it('should return character creation knowledge without universe', () => {
      const knowledge = service.getCharacterCreationKnowledge();

      expect(knowledge).toContain('CREAR PERSONAJES');
      expect(knowledge).toContain('stats');
      expect(knowledge).toContain('progression');
    });

    it('should show available universes when there are some', () => {
      mockUniverseStore.allUniverses.and.returnValue([mockUniverse]);
      const knowledge = service.getCharacterCreationKnowledge();

      expect(knowledge).toContain('UNIVERSOS DISPONIBLES');
      expect(knowledge).toContain('Test Universe');
    });

    it('should show warning when no universes exist', () => {
      mockUniverseStore.allUniverses.and.returnValue([]);
      const knowledge = service.getCharacterCreationKnowledge();

      expect(knowledge).toContain('SIN UNIVERSOS');
    });

    it('should include specific universe details when provided', () => {
      const knowledge = service.getCharacterCreationKnowledge(mockUniverse);

      expect(knowledge).toContain('UNIVERSO SELECCIONADO: Test Universe');
      expect(knowledge).toContain('Fuerza (STR)');
      expect(knowledge).toContain('Agilidad (AGI)');
      expect(knowledge).toContain('strength, agility');
    });

    it('should include conversation flow for characters', () => {
      const knowledge = service.getCharacterCreationKnowledge();

      expect(knowledge).toContain('UNIVERSO');
      expect(knowledge).toContain('CONCEPTO');
      expect(knowledge).toContain('TRASFONDO');
      expect(knowledge).toContain('ESPECIALIDAD');
    });
  });

  describe('getActionAnalysisKnowledge()', () => {
    it('should include character details', () => {
      const knowledge = service.getActionAnalysisKnowledge(mockCharacter, mockUniverse);

      expect(knowledge).toContain('Test Character');
      expect(knowledge).toContain('Nivel: 1');
      expect(knowledge).toContain('Rango: E');
    });

    it('should include current stats', () => {
      const knowledge = service.getActionAnalysisKnowledge(mockCharacter, mockUniverse);

      expect(knowledge).toContain('Fuerza: 15');
      expect(knowledge).toContain('Agilidad: 12');
    });

    it('should include progression rules', () => {
      const knowledge = service.getActionAnalysisKnowledge(mockCharacter, mockUniverse);

      expect(knowledge).toContain('REGLAS DE PROGRESIÓN');
      expect(knowledge).toContain('Entrenamiento físico');
      expect(knowledge).toContain('entrenar, pelear');
    });

    it('should include JSON response format', () => {
      const knowledge = service.getActionAnalysisKnowledge(mockCharacter, mockUniverse);

      expect(knowledge).toContain('analysis');
      expect(knowledge).toContain('stat_changes');
      expect(knowledge).toContain('confidence');
    });
  });

  describe('getImageHandlingInstructions()', () => {
    it('should return image handling instructions', () => {
      const instructions = service.getImageHandlingInstructions();

      expect(instructions).toContain('MANEJO DE IMÁGENES');
      expect(instructions).toContain('coverImage');
      expect(instructions).toContain('avatar');
      expect(instructions).toContain('locations');
    });

    it('should include example dialogue', () => {
      const instructions = service.getImageHandlingInstructions();

      expect(instructions).toContain('EJEMPLO DE DIÁLOGO');
      expect(instructions).toContain('bosque');
    });
  });

  describe('buildUniverseGenerationPrompt()', () => {
    it('should combine all universe-related knowledge', () => {
      const prompt = service.buildUniverseGenerationPrompt();

      // Should contain system knowledge
      expect(prompt).toContain('DYMENSIS CDA');

      // Should contain universe creation knowledge
      expect(prompt).toContain('CREAR UNIVERSOS');

      // Should contain image instructions
      expect(prompt).toContain('MANEJO DE IMÁGENES');

      // Should contain task instructions
      expect(prompt).toContain('TU TAREA');
      expect(prompt).toContain('JSON');
    });
  });

  describe('buildCharacterGenerationPrompt()', () => {
    it('should combine all character-related knowledge without universe', () => {
      const prompt = service.buildCharacterGenerationPrompt();

      expect(prompt).toContain('DYMENSIS CDA');
      expect(prompt).toContain('CREAR PERSONAJES');
      expect(prompt).toContain('TU TAREA');
    });

    it('should include universe details when provided', () => {
      const prompt = service.buildCharacterGenerationPrompt(mockUniverse);

      expect(prompt).toContain('UNIVERSO SELECCIONADO: Test Universe');
      expect(prompt).toContain('strength, agility');
    });
  });

  describe('Edge Cases', () => {
    it('should handle universe with minimal data', () => {
      const minimalUniverse: Universe = {
        id: 'min-1',
        name: 'Minimal',
        description: '',
        createdBy: 'user',
        createdAt: new Date(),
        isPublic: false,
        statDefinitions: {},
        progressionRules: []
      };

      mockUniverseStore.allUniverses.and.returnValue([minimalUniverse]);
      const knowledge = service.getUniverseCreationKnowledge();

      expect(knowledge).toContain('Minimal');
    });

    it('should handle character with missing optional fields', () => {
      const minimalCharacter: Character = {
        id: 'char-min',
        name: 'Minimal Char',
        universeId: 'universe-1',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: { photoUrl: null, backgroundColor: '#000' },
        stats: {},
        progression: {
          level: 1,
          experience: 0,
          awakening: 'E'
        },
        sharing: { isShared: false, shareToken: null, shareExpiration: null }
      };

      const knowledge = service.getActionAnalysisKnowledge(minimalCharacter, mockUniverse);
      expect(knowledge).toContain('Minimal Char');
    });

    it('should handle universe without awakening system', () => {
      const noAwakeningUniverse: Universe = {
        ...mockUniverse,
        awakeningSystem: undefined
      };

      const knowledge = service.getCharacterCreationKnowledge(noAwakeningUniverse);
      expect(knowledge).toContain('Test Universe');
    });
  });
});
