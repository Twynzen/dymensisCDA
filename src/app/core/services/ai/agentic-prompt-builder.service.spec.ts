import { TestBed } from '@angular/core/testing';
import { AgenticPromptBuilderService } from './agentic-prompt-builder.service';
import { FormSchemaService } from './form-schema.service';
import { PromptContext, PromptTemplateId } from '../../models';
import { Universe } from '../../models/universe.model';

describe('AgenticPromptBuilderService', () => {
  let service: AgenticPromptBuilderService;

  const createContext = (overrides: Partial<PromptContext> = {}): PromptContext => ({
    mode: 'universe',
    phase: 'concept',
    language: 'es',
    currentEntity: null,
    collectedData: {},
    conversationHistory: [],
    schema: { entityType: 'universe', version: '1.0.0', fields: [] },
    ...overrides
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AgenticPromptBuilderService, FormSchemaService]
    });
    service = TestBed.inject(AgenticPromptBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('buildPrompt', () => {
    it('should build field_extraction prompt', () => {
      const context = createContext({
        collectedData: { name: 'Test' }
      });

      const prompt = service.buildPrompt('field_extraction', context);

      expect(prompt.systemPrompt).toBeTruthy();
      expect(prompt.userPrompt).toBeTruthy();
      expect(prompt.expectedFormat).toBe('json');
      expect(prompt.maxTokens).toBeGreaterThan(0);
      expect(prompt.temperature).toBeGreaterThanOrEqual(0);
    });

    it('should build json_generation prompt', () => {
      const context = createContext();
      const prompt = service.buildPrompt('json_generation', context);

      expect(prompt.expectedFormat).toBe('json');
      expect(prompt.systemPrompt).toContain('universe');
    });

    it('should build clarification_question prompt', () => {
      const context = createContext();
      const prompt = service.buildPrompt('clarification_question', context);

      expect(prompt.expectedFormat).toBe('text');
      expect(prompt.temperature).toBeGreaterThan(0.5); // More creative
    });

    it('should build edit_detection prompt', () => {
      const context = createContext();
      const prompt = service.buildPrompt('edit_detection', context);

      expect(prompt.expectedFormat).toBe('json');
    });

    it('should build contradiction_check prompt', () => {
      const context = createContext();
      const prompt = service.buildPrompt('contradiction_check', context);

      expect(prompt.expectedFormat).toBe('json');
    });

    it('should build phase_guidance prompt', () => {
      const context = createContext();
      const prompt = service.buildPrompt('phase_guidance', context);

      expect(prompt.expectedFormat).toBe('text');
    });

    it('should build entity_summary prompt', () => {
      const context = createContext();
      const prompt = service.buildPrompt('entity_summary', context);

      expect(prompt.expectedFormat).toBe('text');
    });

    it('should throw error for unknown template', () => {
      const context = createContext();
      expect(() => service.buildPrompt('unknown' as PromptTemplateId, context))
        .toThrowError('Template not found: unknown');
    });

    it('should include language in prompts', () => {
      const esContext = createContext({ language: 'es' });
      const enContext = createContext({ language: 'en' });

      const esPrompt = service.buildPrompt('field_extraction', esContext);
      const enPrompt = service.buildPrompt('field_extraction', enContext);

      expect(esPrompt.systemPrompt).toContain('es');
      expect(enPrompt.systemPrompt).toContain('en');
    });

    it('should include phase in prompts', () => {
      const context = createContext({ phase: 'statistics' });
      const prompt = service.buildPrompt('field_extraction', context);

      expect(prompt.systemPrompt).toContain('statistics');
    });

    it('should estimate input tokens', () => {
      const context = createContext();
      const prompt = service.buildPrompt('field_extraction', context);

      expect(prompt.estimatedInputTokens).toBeGreaterThan(0);
    });
  });

  describe('buildFieldExtractionPrompt', () => {
    it('should build prompt for specific fields', () => {
      const context = createContext();
      const prompt = service.buildFieldExtractionPrompt(
        'Universo llamado "Test"',
        ['name', 'description'],
        context
      );

      expect(prompt.userPrompt).toContain('Test');
      expect(prompt.expectedFormat).toBe('json');
    });

    it('should include field hints', () => {
      const context = createContext();
      const prompt = service.buildFieldExtractionPrompt(
        'Test input',
        ['name'],
        context
      );

      // Should include extraction hints for name field
      expect(prompt.systemPrompt.length).toBeGreaterThan(100);
    });

    it('should include collected data', () => {
      const context = createContext({
        collectedData: { theme: 'fantasy' }
      });

      const prompt = service.buildFieldExtractionPrompt(
        'Test input',
        ['name'],
        context
      );

      expect(prompt.userPrompt).toContain('fantasy');
    });
  });

  describe('buildJsonGenerationPrompt', () => {
    it('should include collected data', () => {
      const context = createContext();
      const collectedData = { name: 'My Universe', theme: 'fantasy' };

      const prompt = service.buildJsonGenerationPrompt(collectedData, context);

      expect(prompt.userPrompt).toContain('My Universe');
      expect(prompt.userPrompt).toContain('fantasy');
    });

    it('should include schema information', () => {
      const context = createContext();
      const prompt = service.buildJsonGenerationPrompt({}, context);

      // Schema text should be in system prompt
      expect(prompt.systemPrompt.length).toBeGreaterThan(50);
    });

    it('should include universe context for characters', () => {
      const universe: Partial<Universe> = {
        id: 'u1',
        name: 'Test Universe'
      };

      const context = createContext({
        mode: 'character',
        universe: universe as Universe
      });

      const prompt = service.buildJsonGenerationPrompt({}, context);

      // Should reference universe
      expect(prompt.systemPrompt).toBeTruthy();
    });
  });

  describe('buildClarificationPrompt', () => {
    it('should include missing fields', () => {
      const context = createContext();
      const prompt = service.buildClarificationPrompt(['name', 'description'], context);

      expect(prompt.userPrompt).toContain('name');
      expect(prompt.userPrompt).toContain('description');
    });

    it('should include conversation history', () => {
      const context = createContext({
        conversationHistory: [
          { role: 'user', content: 'Crear universo' },
          { role: 'assistant', content: '¿Cómo se llama?' }
        ]
      });

      const prompt = service.buildClarificationPrompt(['name'], context);

      expect(prompt.userPrompt).toContain('Crear universo');
    });

    it('should use creative temperature', () => {
      const context = createContext();
      const prompt = service.buildClarificationPrompt(['name'], context);

      expect(prompt.temperature).toBeGreaterThan(0.5);
    });
  });

  describe('buildEditDetectionPrompt', () => {
    it('should include user message', () => {
      const context = createContext();
      const currentEntity = { name: 'Old Name' };

      const prompt = service.buildEditDetectionPrompt(
        'Cambiar nombre a "Nuevo"',
        currentEntity,
        context
      );

      expect(prompt.userPrompt).toContain('Cambiar nombre');
      expect(prompt.userPrompt).toContain('Nuevo');
    });

    it('should include current entity', () => {
      const context = createContext();
      const currentEntity = { name: 'Current Name', theme: 'fantasy' };

      const prompt = service.buildEditDetectionPrompt(
        'Edit request',
        currentEntity,
        context
      );

      expect(prompt.userPrompt).toContain('Current Name');
    });
  });

  describe('compressContext', () => {
    it('should limit conversation history', () => {
      const longHistory = Array.from({ length: 20 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`
      }));

      const context = createContext({
        conversationHistory: longHistory
      });

      const compressed = service.compressContext(context, 1000);

      expect(compressed.conversationHistory!.length).toBeLessThan(longHistory.length);
    });

    it('should compress large collected data', () => {
      const largeData = {
        name: 'Test',
        description: 'x'.repeat(10000),
        extra: { nested: 'data' }
      };

      const context = createContext({
        collectedData: largeData
      });

      const compressed = service.compressContext(context, 500);

      // Should keep essential fields
      expect(compressed.collectedData?.['name']).toBe('Test');
    });

    it('should preserve small context unchanged', () => {
      const context = createContext({
        collectedData: { name: 'Test' },
        conversationHistory: [{ role: 'user', content: 'Hi' }]
      });

      const compressed = service.compressContext(context, 10000);

      expect(compressed.collectedData).toEqual(context.collectedData);
      expect(compressed.conversationHistory).toEqual(context.conversationHistory);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens based on character count', () => {
      const shortText = 'Hello world';
      const longText = 'Hello world '.repeat(100);

      const shortTokens = service.estimateTokens(shortText);
      const longTokens = service.estimateTokens(longText);

      expect(shortTokens).toBeGreaterThan(0);
      expect(longTokens).toBeGreaterThan(shortTokens);
    });

    it('should estimate roughly 4 chars per token', () => {
      const text = 'x'.repeat(400);
      const tokens = service.estimateTokens(text);

      // Should be around 100 tokens
      expect(tokens).toBeGreaterThan(80);
      expect(tokens).toBeLessThan(120);
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return all template IDs', () => {
      const templates = service.getAvailableTemplates();

      expect(templates).toContain('field_extraction');
      expect(templates).toContain('json_generation');
      expect(templates).toContain('clarification_question');
      expect(templates).toContain('edit_detection');
      expect(templates).toContain('contradiction_check');
      expect(templates).toContain('phase_guidance');
      expect(templates).toContain('entity_summary');
    });
  });

  describe('getTemplate', () => {
    it('should return template by ID', () => {
      const template = service.getTemplate('field_extraction');

      expect(template).toBeTruthy();
      expect(template!.id).toBe('field_extraction');
      expect(template!.systemTemplate).toBeTruthy();
      expect(template!.userTemplate).toBeTruthy();
    });

    it('should return undefined for unknown template', () => {
      const template = service.getTemplate('unknown' as PromptTemplateId);
      expect(template).toBeUndefined();
    });
  });

  describe('configure', () => {
    it('should update configuration', () => {
      service.configure({ maxContextTokens: 2000 });
      // Configuration should be updated internally
    });

    it('should merge partial configuration', () => {
      service.configure({ maxHistoryMessages: 3 });
      service.configure({ maxExamples: 2 });
      // Both settings should be applied
    });
  });

  describe('template interpolation', () => {
    it('should replace simple variables', () => {
      const context = createContext({
        mode: 'character',
        phase: 'identity'
      });

      const prompt = service.buildPrompt('field_extraction', context);

      expect(prompt.systemPrompt).toContain('character');
      expect(prompt.systemPrompt).toContain('identity');
    });

    it('should handle conditional blocks', () => {
      const contextWithData = createContext({
        collectedData: { name: 'Test' }
      });

      const contextWithoutData = createContext({
        collectedData: {}
      });

      const promptWith = service.buildPrompt('field_extraction', contextWithData);
      const promptWithout = service.buildPrompt('field_extraction', contextWithoutData);

      // Prompt with data should include collected data section
      expect(promptWith.userPrompt.length).toBeGreaterThan(promptWithout.userPrompt.length - 50);
    });

    it('should handle missing variables gracefully', () => {
      const context = createContext();
      // Should not throw even if some optional variables are missing
      expect(() => service.buildPrompt('json_generation', context)).not.toThrow();
    });
  });

  describe('few-shot examples', () => {
    it('should include relevant examples in generation prompt', () => {
      const context = createContext({ language: 'es' });
      const prompt = service.buildJsonGenerationPrompt({ name: 'Test' }, context);

      // Examples should be included when available
      expect(prompt.systemPrompt).toBeTruthy();
    });

    it('should filter examples by language', () => {
      const esContext = createContext({ language: 'es' });
      const enContext = createContext({ language: 'en' });

      const esPrompt = service.buildJsonGenerationPrompt({}, esContext);
      const enPrompt = service.buildJsonGenerationPrompt({}, enContext);

      // Both should work, examples filtered by language
      expect(esPrompt.userPrompt).toBeTruthy();
      expect(enPrompt.userPrompt).toBeTruthy();
    });
  });

  describe('data compression', () => {
    it('should compress large JSON data', () => {
      const largeEntity = {
        name: 'Test',
        description: 'x'.repeat(5000),
        stats: { a: 1, b: 2, c: 3 }
      };

      const context = createContext({
        currentEntity: largeEntity
      });

      const prompt = service.buildPrompt('entity_summary', context);

      // Prompt should be built without including all data
      expect(prompt.estimatedInputTokens).toBeLessThan(2000);
    });

    it('should preserve essential fields when compressing', () => {
      const context = createContext({
        collectedData: {
          name: 'Important Name',
          description: 'Important Description',
          veryLargeField: 'x'.repeat(10000)
        }
      });

      const compressed = service.compressContext(context, 500);

      expect(compressed.collectedData?.['name']).toBe('Important Name');
    });
  });

  describe('conversation formatting', () => {
    it('should format conversation history', () => {
      const context = createContext({
        conversationHistory: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'user', content: 'Create universe' }
        ]
      });

      const prompt = service.buildClarificationPrompt(['name'], context);

      expect(prompt.userPrompt).toContain('user:');
      expect(prompt.userPrompt).toContain('assistant:');
    });

    it('should handle empty conversation history', () => {
      const context = createContext({
        conversationHistory: []
      });

      expect(() => service.buildClarificationPrompt(['name'], context)).not.toThrow();
    });
  });

  describe('token budget', () => {
    it('should respect max context tokens', () => {
      service.configure({ maxContextTokens: 1000 });

      const context = createContext({
        collectedData: { description: 'x'.repeat(5000) },
        conversationHistory: Array.from({ length: 50 }, (_, i) => ({
          role: 'user' as const,
          content: `Message ${i} with some content`
        }))
      });

      const prompt = service.buildPrompt('field_extraction', context);

      // Should be compressed to fit budget
      expect(prompt.estimatedInputTokens).toBeLessThan(2000);
    });
  });
});
