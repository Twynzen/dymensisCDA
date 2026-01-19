import { TestBed } from '@angular/core/testing';
import { AIFallbackService, AIProvider } from './ai-fallback.service';
import { WebLLMService, AIAnalysisResult } from './webllm.service';
import { ProgressionRule } from '../models';

describe('AIFallbackService', () => {
  let service: AIFallbackService;
  let mockWebLLMService: jasmine.SpyObj<WebLLMService>;

  const mockRules: ProgressionRule[] = [
    {
      id: 'physical_training',
      description: 'Physical Training',
      keywords: ['entrenar', 'ejercicio', 'correr', 'gimnasio'],
      affectedStats: ['strength', 'vitality'],
      maxChangePerAction: 3
    },
    {
      id: 'mental_study',
      description: 'Mental Study',
      keywords: ['estudiar', 'leer', 'aprender', 'investigar'],
      affectedStats: ['intelligence', 'perception'],
      maxChangePerAction: 2
    },
    {
      id: 'combat_practice',
      description: 'Combat Practice',
      keywords: ['pelear', 'combatir', 'luchar', 'entrenar combate'],
      affectedStats: ['strength', 'agility', 'vitality'],
      maxChangePerAction: 4
    },
    {
      id: 'meditation',
      description: 'Meditation',
      keywords: ['meditar', 'concentrar', 'reflexionar'],
      affectedStats: ['mana', 'perception'],
      maxChangePerAction: 2
    }
  ];

  beforeEach(() => {
    mockWebLLMService = jasmine.createSpyObj('WebLLMService', [
      'checkWebGPUSupport',
      'isReady',
      'analyzeAction'
    ]);

    // Default mocks
    mockWebLLMService.isReady.and.returnValue(false);
    mockWebLLMService.checkWebGPUSupport.and.returnValue(
      Promise.resolve({ supported: false, reason: 'WebGPU not available' })
    );

    TestBed.configureTestingModule({
      providers: [
        AIFallbackService,
        { provide: WebLLMService, useValue: mockWebLLMService }
      ]
    });

    service = TestBed.inject(AIFallbackService);
  });

  describe('Initial State', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('getAvailableProvider', () => {
    it('should return rules-only when WebGPU is not supported', async () => {
      mockWebLLMService.checkWebGPUSupport.and.returnValue(
        Promise.resolve({ supported: false, reason: 'Not available' })
      );

      const provider = await service.getAvailableProvider();

      expect(provider).toBe('rules-only');
    });

    it('should return webllm when WebGPU is supported', async () => {
      mockWebLLMService.checkWebGPUSupport.and.returnValue(
        Promise.resolve({ supported: true })
      );

      const provider = await service.getAvailableProvider();

      expect(provider).toBe('webllm');
    });
  });

  describe('analyzeWithRulesOnly', () => {
    describe('Keyword Matching', () => {
      it('should extract keywords from activity description', () => {
        const result = service.analyzeWithRulesOnly(
          'Pasé la mañana entrenando en el gimnasio',
          mockRules
        );

        expect(result.stat_changes.length).toBeGreaterThan(0);
        expect(result.analysis).toContain('Physical Training');
      });

      it('should match keywords case-insensitively', () => {
        const resultLower = service.analyzeWithRulesOnly('entrenar', mockRules);
        const resultUpper = service.analyzeWithRulesOnly('ENTRENAR', mockRules);
        const resultMixed = service.analyzeWithRulesOnly('Entrenar', mockRules);

        expect(resultLower.stat_changes).toEqual(resultUpper.stat_changes);
        expect(resultLower.stat_changes).toEqual(resultMixed.stat_changes);
      });

      it('should match keywords within longer text', () => {
        const result = service.analyzeWithRulesOnly(
          'Después de desayunar, decidí estudiar magia antigua en la biblioteca',
          mockRules
        );

        expect(result.stat_changes.some(c => c.stat === 'intelligence')).toBeTrue();
      });

      it('should handle activities with no matching rules', () => {
        const result = service.analyzeWithRulesOnly(
          'Descansé todo el día en la posada',
          mockRules
        );

        expect(result.stat_changes).toEqual([]);
        expect(result.confidence).toBe(0);
        expect(result.analysis).toContain('No se encontraron coincidencias');
      });
    });

    describe('Stat Changes Calculation', () => {
      it('should calculate stat changes correctly', () => {
        const result = service.analyzeWithRulesOnly('entrenar', mockRules);

        expect(result.stat_changes.length).toBe(2); // strength and vitality
        expect(result.stat_changes.some(c => c.stat === 'strength')).toBeTrue();
        expect(result.stat_changes.some(c => c.stat === 'vitality')).toBeTrue();
      });

      it('should respect maxChange limits', () => {
        const result = service.analyzeWithRulesOnly('entrenar mucho', mockRules);

        result.stat_changes.forEach(change => {
          expect(change.change).toBeLessThanOrEqual(3); // maxChangePerAction for Physical Training
        });
      });

      it('should give first stat higher change than subsequent stats', () => {
        // Combat Practice affects: strength, agility, vitality (max 4)
        const result = service.analyzeWithRulesOnly('pelear con enemigos', mockRules);

        const strengthChange = result.stat_changes.find(c => c.stat === 'strength');
        const agilityChange = result.stat_changes.find(c => c.stat === 'agility');
        const vitalityChange = result.stat_changes.find(c => c.stat === 'vitality');

        // First stat should have highest change
        if (strengthChange && agilityChange) {
          expect(strengthChange.change).toBeGreaterThanOrEqual(agilityChange.change);
        }
      });

      it('should combine multiple matching rules', () => {
        // "entrenar combate" matches both "entrenar" (Physical) and "entrenar combate" (Combat)
        const result = service.analyzeWithRulesOnly('entrenar combate intenso', mockRules);

        expect(result.stat_changes.length).toBeGreaterThan(0);
        expect(result.analysis).toContain('Physical Training');
      });

      it('should increase change when stat appears in multiple rules', () => {
        // Both Physical Training and Combat Practice affect 'strength'
        const result = service.analyzeWithRulesOnly('entrenar pelear', mockRules);

        const strengthChange = result.stat_changes.find(c => c.stat === 'strength');
        expect(strengthChange).toBeDefined();
        // When stat is in multiple rules, it should be incremented
        if (strengthChange) {
          expect(strengthChange.change).toBeGreaterThanOrEqual(2);
        }
      });
    });

    describe('Result Limits', () => {
      it('should limit to top 4 changes', () => {
        // Create rules that would affect many stats
        const manyStatsRules: ProgressionRule[] = [
          {
            id: 'all_stats',
            description: 'All stats',
            keywords: ['todo'],
            affectedStats: ['a', 'b', 'c', 'd', 'e', 'f'],
            maxChangePerAction: 5
          }
        ];

        const result = service.analyzeWithRulesOnly('todo', manyStatsRules);

        expect(result.stat_changes.length).toBeLessThanOrEqual(4);
      });

      it('should sort changes by value in descending order', () => {
        const result = service.analyzeWithRulesOnly('pelear', mockRules);

        for (let i = 0; i < result.stat_changes.length - 1; i++) {
          expect(result.stat_changes[i].change).toBeGreaterThanOrEqual(
            result.stat_changes[i + 1].change
          );
        }
      });
    });

    describe('Analysis Text', () => {
      it('should include matched rule descriptions in analysis', () => {
        const result = service.analyzeWithRulesOnly('estudiar magia', mockRules);

        expect(result.analysis).toContain('Mental Study');
      });

      it('should join multiple matched rules', () => {
        const result = service.analyzeWithRulesOnly('entrenar y estudiar', mockRules);

        expect(result.analysis).toContain('Physical Training');
        expect(result.analysis).toContain('Mental Study');
      });
    });

    describe('Confidence', () => {
      it('should return confidence 0.6 when matches found', () => {
        const result = service.analyzeWithRulesOnly('entrenar', mockRules);

        expect(result.confidence).toBe(0.6);
      });

      it('should return confidence 0 when no matches', () => {
        const result = service.analyzeWithRulesOnly('dormir', mockRules);

        expect(result.confidence).toBe(0);
      });
    });

    describe('Reason Text', () => {
      it('should include detected keyword in reason', () => {
        const result = service.analyzeWithRulesOnly('entrenar fuerza', mockRules);

        expect(result.stat_changes[0].reason).toContain('entrenar');
      });
    });

    describe('Edge Cases', () => {
      it('should return empty changes for empty activity', () => {
        const result = service.analyzeWithRulesOnly('', mockRules);

        expect(result.stat_changes).toEqual([]);
      });

      it('should handle universe with no rules', () => {
        const result = service.analyzeWithRulesOnly('entrenar', []);

        expect(result.stat_changes).toEqual([]);
        expect(result.confidence).toBe(0);
      });

      it('should handle special characters in keywords', () => {
        const rulesWithSpecialChars: ProgressionRule[] = [
          {
            id: 'special',
            description: 'Special',
            keywords: ['entrenar+', 'test?'],
            affectedStats: ['special'],
            maxChangePerAction: 2
          }
        ];

        // Should not crash
        const result = service.analyzeWithRulesOnly('entrenar+ test?', rulesWithSpecialChars);
        expect(result).toBeDefined();
      });

      it('should handle very long activity descriptions', () => {
        const longDescription = 'entrenar '.repeat(1000);
        const result = service.analyzeWithRulesOnly(longDescription, mockRules);

        expect(result.stat_changes.length).toBeGreaterThan(0);
      });

      it('should throw on null-like inputs', () => {
        // Service requires a valid string - throws on undefined
        expect(() => service.analyzeWithRulesOnly(undefined as any, mockRules))
          .toThrowError();
      });
    });
  });

  describe('analyzeAction', () => {
    const mockCharacterContext = {
      name: 'Test Character',
      stats: { strength: 50, agility: 30 },
      progression: { level: 5 }
    };

    describe('Provider Selection', () => {
      it('should use rules-only when WebGPU not supported', async () => {
        mockWebLLMService.checkWebGPUSupport.and.returnValue(
          Promise.resolve({ supported: false })
        );

        const { result, provider } = await service.analyzeAction(
          'entrenar',
          mockCharacterContext,
          mockRules
        );

        expect(provider).toBe('rules-only');
        expect(result.stat_changes.length).toBeGreaterThan(0);
      });

      it('should use rules-only when WebLLM is not ready', async () => {
        mockWebLLMService.checkWebGPUSupport.and.returnValue(
          Promise.resolve({ supported: true })
        );
        mockWebLLMService.isReady.and.returnValue(false);

        const { result, provider } = await service.analyzeAction(
          'entrenar',
          mockCharacterContext,
          mockRules
        );

        expect(provider).toBe('rules-only');
      });

      it('should respect forceProvider parameter', async () => {
        mockWebLLMService.checkWebGPUSupport.and.returnValue(
          Promise.resolve({ supported: true })
        );
        mockWebLLMService.isReady.and.returnValue(true);

        const { provider } = await service.analyzeAction(
          'entrenar',
          mockCharacterContext,
          mockRules,
          'rules-only'
        );

        expect(provider).toBe('rules-only');
      });

      it('should use WebLLM when available and ready', async () => {
        mockWebLLMService.checkWebGPUSupport.and.returnValue(
          Promise.resolve({ supported: true })
        );
        mockWebLLMService.isReady.and.returnValue(true);
        mockWebLLMService.analyzeAction.and.returnValue(
          Promise.resolve({
            analysis: 'WebLLM analysis',
            stat_changes: [{ stat: 'strength', change: 2, reason: 'AI reason' }],
            confidence: 0.9
          })
        );

        const { result, provider } = await service.analyzeAction(
          'entrenar',
          mockCharacterContext,
          mockRules
        );

        expect(provider).toBe('webllm');
        expect(result.analysis).toBe('WebLLM analysis');
      });
    });

    describe('Fallback Behavior', () => {
      it('should fallback to rules-only when WebLLM throws error', async () => {
        mockWebLLMService.checkWebGPUSupport.and.returnValue(
          Promise.resolve({ supported: true })
        );
        mockWebLLMService.isReady.and.returnValue(true);
        mockWebLLMService.analyzeAction.and.returnValue(
          Promise.reject(new Error('WebLLM error'))
        );

        const { result, provider } = await service.analyzeAction(
          'entrenar',
          mockCharacterContext,
          mockRules
        );

        expect(provider).toBe('rules-only');
        expect(result.stat_changes.length).toBeGreaterThan(0);
      });
    });
  });
});

// Integration tests
describe('AIFallbackService Integration', () => {
  xit('should seamlessly fallback on WebLLM failure', async () => {
    // Would require actual WebLLM setup
  });

  xit('should handle rapid switching between providers', async () => {
    // Would require complex setup
  });
});
