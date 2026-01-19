import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { WebLLMService, AIAnalysisResult, ChatMessage, StatSuggestion, WebGPUStatus } from './webllm.service';
import { ProgressionRule } from '../models';

// Mock WebLLM engine interface
const mockChatCompletionsCreate = jasmine.createSpy('create');
const mockUnload = jasmine.createSpy('unload');

const mockEngine = {
  chat: {
    completions: {
      create: mockChatCompletionsCreate
    }
  },
  unload: mockUnload
};

// Mock WebGPU navigator
const mockGPUAdapter = {
  requestDevice: jasmine.createSpy('requestDevice').and.returnValue(Promise.resolve({}))
};

describe('WebLLMService', () => {
  let service: WebLLMService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WebLLMService]
    });
    service = TestBed.inject(WebLLMService);

    // Reset spies
    mockChatCompletionsCreate.calls.reset();
    mockUnload.calls.reset();
    if (mockGPUAdapter.requestDevice.calls) {
      mockGPUAdapter.requestDevice.calls.reset();
    }
  });

  describe('Initial State', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with loading state as false', () => {
      expect(service.isLoading()).toBeFalse();
    });

    it('should initialize with ready state as false', () => {
      expect(service.isReady()).toBeFalse();
    });

    it('should initialize with zero loading progress', () => {
      expect(service.loadingProgress()).toBe(0);
    });

    it('should initialize with empty loading text', () => {
      expect(service.loadingText()).toBe('');
    });

    it('should initialize with null error', () => {
      expect(service.error()).toBeNull();
    });
  });

  describe('checkWebGPUSupport', () => {
    it('should return not supported when navigator.gpu is undefined', async () => {
      // Save original
      const originalNavigator = navigator;

      // Mock navigator without gpu
      const mockNav = {} as Navigator;
      Object.defineProperty(window, 'navigator', { value: mockNav, writable: true });

      const result = await service.checkWebGPUSupport();

      expect(result.supported).toBeFalse();
      expect(result.reason).toContain('WebGPU no disponible');

      // Restore
      Object.defineProperty(window, 'navigator', { value: originalNavigator, writable: true });
    });

    it('should return not supported when adapter is null', async () => {
      const mockNav = {
        gpu: {
          requestAdapter: jasmine.createSpy('requestAdapter').and.returnValue(Promise.resolve(null))
        }
      } as any;
      Object.defineProperty(window, 'navigator', { value: mockNav, writable: true });

      const result = await service.checkWebGPUSupport();

      expect(result.supported).toBeFalse();
      expect(result.reason).toContain('adaptador GPU compatible');
    });

    it('should return not supported when device is null', async () => {
      const mockNav = {
        gpu: {
          requestAdapter: jasmine.createSpy('requestAdapter').and.returnValue(
            Promise.resolve({
              requestDevice: jasmine.createSpy('requestDevice').and.returnValue(Promise.resolve(null))
            })
          )
        }
      } as any;
      Object.defineProperty(window, 'navigator', { value: mockNav, writable: true });

      const result = await service.checkWebGPUSupport();

      expect(result.supported).toBeFalse();
      expect(result.reason).toContain('dispositivo GPU');
    });

    it('should return supported when WebGPU is available', async () => {
      const mockNav = {
        gpu: {
          requestAdapter: jasmine.createSpy('requestAdapter').and.returnValue(
            Promise.resolve({
              requestDevice: jasmine.createSpy('requestDevice').and.returnValue(Promise.resolve({}))
            })
          )
        }
      } as any;
      Object.defineProperty(window, 'navigator', { value: mockNav, writable: true });

      const result = await service.checkWebGPUSupport();

      expect(result.supported).toBeTrue();
      expect(result.reason).toBeUndefined();
    });

    it('should handle WebGPU check errors gracefully', async () => {
      const mockNav = {
        gpu: {
          requestAdapter: jasmine.createSpy('requestAdapter').and.returnValue(
            Promise.reject(new Error('GPU initialization failed'))
          )
        }
      } as any;
      Object.defineProperty(window, 'navigator', { value: mockNav, writable: true });

      const result = await service.checkWebGPUSupport();

      expect(result.supported).toBeFalse();
      expect(result.reason).toContain('Error al verificar WebGPU');
    });
  });

  describe('getModelInfo', () => {
    it('should return model info with loaded false when not ready', () => {
      const info = service.getModelInfo();

      expect(info.id).toBe('Phi-3-mini-4k-instruct-q4f16_1-MLC-1k');
      expect(info.loaded).toBeFalse();
    });
  });

  describe('analyzeAction - without engine', () => {
    it('should throw error when engine is not initialized', async () => {
      const characterContext = {
        name: 'Test Character',
        stats: { strength: 10 },
        progression: { level: 1 }
      };

      await expectAsync(
        service.analyzeAction('test action', characterContext, [])
      ).toBeRejectedWithError('El motor de IA no está inicializado. Carga el modelo primero.');
    });
  });

  describe('chat - without engine', () => {
    it('should throw error when engine is not initialized', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expectAsync(
        service.chat(messages)
      ).toBeRejectedWithError('El motor de IA no está inicializado');
    });
  });

  describe('unload', () => {
    it('should handle unload when engine is null', async () => {
      // Should not throw
      await expectAsync(service.unload()).toBeResolved();
    });

    it('should not reset state when engine is null', async () => {
      // Set some state (engine is null by default)
      service.loadingProgress.set(50);
      service.loadingText.set('Some text');
      service.isReady.set(true);

      await service.unload();

      // State is NOT reset because engine was null
      expect(service.isReady()).toBeTrue();
      expect(service.loadingProgress()).toBe(50);
      expect(service.loadingText()).toBe('Some text');
    });
  });

  describe('parseAndValidateResponse - via analyzeAction', () => {
    // These tests use mock engine to test the parsing logic

    const mockRules: ProgressionRule[] = [
      {
        id: 'physical_training',
        description: 'Physical Training',
        keywords: ['training', 'exercise'],
        affectedStats: ['strength', 'vitality'],
        maxChangePerAction: 3
      },
      {
        id: 'study',
        description: 'Study',
        keywords: ['study', 'read'],
        affectedStats: ['intelligence'],
        maxChangePerAction: 2
      }
    ];

    it('should parse valid JSON response correctly', () => {
      // Test the parsing logic directly by accessing private method via any
      const serviceAny = service as any;

      const validResponse = JSON.stringify({
        analysis: 'Physical training session',
        stat_changes: [
          { stat: 'strength', change: 2, reason: 'Lifting weights' }
        ],
        confidence: 0.9
      });

      const result = serviceAny.parseAndValidateResponse(validResponse, mockRules);

      expect(result.analysis).toBe('Physical training session');
      expect(result.stat_changes.length).toBe(1);
      expect(result.stat_changes[0].stat).toBe('strength');
      expect(result.stat_changes[0].change).toBe(2);
      expect(result.confidence).toBe(0.9);
    });

    it('should extract JSON from text with surrounding content', () => {
      const serviceAny = service as any;

      const responseWithText = 'Here is my analysis:\n{"analysis": "Test", "stat_changes": [], "confidence": 0.5}\nEnd of response';

      const result = serviceAny.parseAndValidateResponse(responseWithText, mockRules);

      expect(result.analysis).toBe('Test');
      expect(result.stat_changes).toEqual([]);
      expect(result.confidence).toBe(0.5);
    });

    it('should return error result when no JSON found', () => {
      const serviceAny = service as any;

      const invalidResponse = 'This is just text without any JSON';

      // Method catches error internally and returns error result
      const result = serviceAny.parseAndValidateResponse(invalidResponse, mockRules);

      expect(result.analysis).toContain('Error');
      expect(result.stat_changes).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should filter out stats not in rules', () => {
      const serviceAny = service as any;

      const responseWithInvalidStat = JSON.stringify({
        analysis: 'Test',
        stat_changes: [
          { stat: 'strength', change: 2, reason: 'Valid' },
          { stat: 'unknown_stat', change: 5, reason: 'Invalid' }
        ],
        confidence: 0.8
      });

      const result = serviceAny.parseAndValidateResponse(responseWithInvalidStat, mockRules);

      expect(result.stat_changes.length).toBe(1);
      expect(result.stat_changes[0].stat).toBe('strength');
    });

    it('should cap changes at max defined in rules', () => {
      const serviceAny = service as any;

      const responseWithHighChange = JSON.stringify({
        analysis: 'Test',
        stat_changes: [
          { stat: 'strength', change: 10, reason: 'Very intense' }
        ],
        confidence: 0.9
      });

      const result = serviceAny.parseAndValidateResponse(responseWithHighChange, mockRules);

      expect(result.stat_changes[0].change).toBe(3); // Capped at maxChangePerAction
    });

    it('should ensure minimum change is 1', () => {
      const serviceAny = service as any;

      const responseWithZeroChange = JSON.stringify({
        analysis: 'Test',
        stat_changes: [
          { stat: 'strength', change: 0, reason: 'Zero' }
        ],
        confidence: 0.9
      });

      const result = serviceAny.parseAndValidateResponse(responseWithZeroChange, mockRules);

      expect(result.stat_changes[0].change).toBe(1); // Minimum is 1
    });

    it('should cap confidence between 0 and 1', () => {
      const serviceAny = service as any;

      const responseWithHighConfidence = JSON.stringify({
        analysis: 'Test',
        stat_changes: [],
        confidence: 1.5
      });

      const result = serviceAny.parseAndValidateResponse(responseWithHighConfidence, mockRules);

      expect(result.confidence).toBe(1);
    });

    it('should handle missing confidence with default', () => {
      const serviceAny = service as any;

      const responseWithoutConfidence = JSON.stringify({
        analysis: 'Test',
        stat_changes: []
      });

      const result = serviceAny.parseAndValidateResponse(responseWithoutConfidence, mockRules);

      expect(result.confidence).toBe(0.5); // Default value
    });

    it('should add default reason when missing', () => {
      const serviceAny = service as any;

      const responseWithoutReason = JSON.stringify({
        analysis: 'Test',
        stat_changes: [
          { stat: 'strength', change: 2 }
        ],
        confidence: 0.9
      });

      const result = serviceAny.parseAndValidateResponse(responseWithoutReason, mockRules);

      expect(result.stat_changes[0].reason).toBe('Sin razón especificada');
    });

    it('should return error result for malformed JSON', () => {
      const serviceAny = service as any;

      const malformedJson = '{"analysis": "Test", "stat_changes": [, "confidence": 0.9}';

      // Method catches JSON parse error internally and returns error result
      const result = serviceAny.parseAndValidateResponse(malformedJson, mockRules);

      expect(result.analysis).toContain('Error');
      expect(result.stat_changes).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should return error result when missing analysis field', () => {
      const serviceAny = service as any;

      const responseWithoutAnalysis = JSON.stringify({
        stat_changes: [
          { stat: 'strength', change: 2, reason: 'Test' }
        ],
        confidence: 0.9
      });

      // Method catches validation error internally and returns error result
      const result = serviceAny.parseAndValidateResponse(responseWithoutAnalysis, mockRules);

      expect(result.analysis).toContain('Error');
      expect(result.stat_changes).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should return error result when stat_changes not being an array', () => {
      const serviceAny = service as any;

      const responseWithInvalidChanges = JSON.stringify({
        analysis: 'Test',
        stat_changes: 'not an array',
        confidence: 0.9
      });

      // Method catches validation error internally and returns error result
      const result = serviceAny.parseAndValidateResponse(responseWithInvalidChanges, mockRules);

      expect(result.analysis).toContain('Error');
      expect(result.stat_changes).toEqual([]);
      expect(result.confidence).toBe(0);
    });
  });

  describe('buildSystemPrompt', () => {
    it('should include progression rules in prompt', () => {
      const serviceAny = service as any;

      const rules: ProgressionRule[] = [
        {
          id: 'physical_training',
          description: 'Physical Training',
          keywords: ['training', 'exercise'],
          affectedStats: ['strength', 'vitality'],
          maxChangePerAction: 3
        }
      ];

      const prompt = serviceAny.buildSystemPrompt(rules);

      expect(prompt).toContain('Physical Training');
      expect(prompt).toContain('training, exercise');
      expect(prompt).toContain('strength, vitality');
      expect(prompt).toContain('max +3');
    });

    it('should include few-shot examples', () => {
      const serviceAny = service as any;
      const prompt = serviceAny.buildSystemPrompt([]);

      expect(prompt).toContain('EJEMPLO 1');
      expect(prompt).toContain('EJEMPLO 2');
      expect(prompt).toContain('EJEMPLO 3');
      expect(prompt).toContain('EJEMPLO 4');
    });

    it('should include JSON format instructions', () => {
      const serviceAny = service as any;
      const prompt = serviceAny.buildSystemPrompt([]);

      expect(prompt).toContain('"analysis"');
      expect(prompt).toContain('"stat_changes"');
      expect(prompt).toContain('"confidence"');
    });
  });

  describe('buildUserPrompt', () => {
    it('should include character information', () => {
      const serviceAny = service as any;

      const character = {
        name: 'Test Hero',
        stats: { strength: 50, agility: 30 },
        progression: { level: 5 }
      };

      const prompt = serviceAny.buildUserPrompt('Training session', character);

      expect(prompt).toContain('Test Hero');
      expect(prompt).toContain('5');
      expect(prompt).toContain('strength: 50');
      expect(prompt).toContain('agility: 30');
      expect(prompt).toContain('Training session');
    });

    it('should format all stats correctly', () => {
      const serviceAny = service as any;

      const character = {
        name: 'Mage',
        stats: { intelligence: 100, mana: 200, wisdom: 75 },
        progression: { level: 10 }
      };

      const prompt = serviceAny.buildUserPrompt('Studying', character);

      expect(prompt).toContain('intelligence: 100');
      expect(prompt).toContain('mana: 200');
      expect(prompt).toContain('wisdom: 75');
    });
  });

  describe('Signal reactivity', () => {
    it('should update loading state correctly', () => {
      expect(service.isLoading()).toBeFalse();

      service.isLoading.set(true);
      expect(service.isLoading()).toBeTrue();

      service.isLoading.set(false);
      expect(service.isLoading()).toBeFalse();
    });

    it('should update progress correctly', () => {
      service.loadingProgress.set(25);
      expect(service.loadingProgress()).toBe(25);

      service.loadingProgress.set(75);
      expect(service.loadingProgress()).toBe(75);

      service.loadingProgress.set(100);
      expect(service.loadingProgress()).toBe(100);
    });

    it('should update error state correctly', () => {
      expect(service.error()).toBeNull();

      service.error.set('Test error');
      expect(service.error()).toBe('Test error');

      service.error.set(null);
      expect(service.error()).toBeNull();
    });
  });

  describe('Model configuration', () => {
    it('should have correct model ID', () => {
      const info = service.getModelInfo();
      expect(info.id).toBe('Phi-3-mini-4k-instruct-q4f16_1-MLC-1k');
    });
  });
});

// Integration tests placeholder
describe('WebLLMService Integration', () => {
  // These tests would require actual WebGPU support
  // and would be run in a browser environment with GPU

  xit('should initialize and load model successfully', async () => {
    // Requires actual WebGPU browser environment
  });

  xit('should analyze action with real model', async () => {
    // Requires loaded model
  });

  xit('should handle concurrent requests', async () => {
    // Requires loaded model
  });

  xit('should recover from model crash', async () => {
    // Requires ability to simulate crash
  });
});
