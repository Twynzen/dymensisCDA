import { TestBed } from '@angular/core/testing';
import { CreationStore, CreationMode, CreationPhase, ChatMessage } from './creation.store';

describe('CreationStore', () => {
  let store: CreationStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CreationStore]
    });
    store = TestBed.inject(CreationStore);
  });

  afterEach(() => {
    store.reset();
  });

  describe('Initial State', () => {
    it('should have idle mode by default', () => {
      expect(store.mode()).toBe('idle');
    });

    it('should have gathering phase by default', () => {
      expect(store.phase()).toBe('gathering');
    });

    it('should have empty messages by default', () => {
      expect(store.messages()).toEqual([]);
    });

    it('should not be generating by default', () => {
      expect(store.isGenerating()).toBeFalse();
    });

    it('should have null generated universe', () => {
      expect(store.generatedUniverse()).toBeNull();
    });

    it('should have null generated character', () => {
      expect(store.generatedCharacter()).toBeNull();
    });

    it('should have null selected universe id', () => {
      expect(store.selectedUniverseId()).toBeNull();
    });

    it('should have empty suggested actions', () => {
      expect(store.suggestedActions()).toEqual([]);
    });

    it('should have empty conversation context', () => {
      expect(store.conversationContext()).toEqual({});
    });
  });

  describe('setMode()', () => {
    it('should set mode to universe', () => {
      store.setMode('universe');
      expect(store.mode()).toBe('universe');
    });

    it('should set mode to character', () => {
      store.setMode('character');
      expect(store.mode()).toBe('character');
    });

    it('should set mode to action', () => {
      store.setMode('action');
      expect(store.mode()).toBe('action');
    });

    it('should reset state when setting mode to idle', () => {
      // Setup some state first
      store.setMode('universe');
      store.addMessage({ role: 'user', content: 'test message' });
      store.setGenerating(true);

      // Set to idle
      store.setMode('idle');

      expect(store.mode()).toBe('idle');
      expect(store.messages()).toEqual([]);
      expect(store.isGenerating()).toBeFalse();
    });
  });

  describe('setPhase()', () => {
    it('should set phase to generating', () => {
      store.setPhase('generating');
      expect(store.phase()).toBe('generating');
    });

    it('should set phase to reviewing', () => {
      store.setPhase('reviewing');
      expect(store.phase()).toBe('reviewing');
    });

    it('should set phase to adjusting', () => {
      store.setPhase('adjusting');
      expect(store.phase()).toBe('adjusting');
    });

    it('should set phase to confirmed', () => {
      store.setPhase('confirmed');
      expect(store.phase()).toBe('confirmed');
    });
  });

  describe('addMessage()', () => {
    it('should add a user message', () => {
      store.addMessage({ role: 'user', content: 'Hello' });

      const messages = store.messages();
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello');
    });

    it('should add an assistant message', () => {
      store.addMessage({ role: 'assistant', content: 'Hi there!' });

      const messages = store.messages();
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe('assistant');
      expect(messages[0].content).toBe('Hi there!');
    });

    it('should add a system message', () => {
      store.addMessage({ role: 'system', content: 'System prompt' });

      const messages = store.messages();
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe('system');
    });

    it('should generate unique id for each message', () => {
      store.addMessage({ role: 'user', content: 'First' });
      store.addMessage({ role: 'user', content: 'Second' });

      const messages = store.messages();
      expect(messages[0].id).not.toBe(messages[1].id);
    });

    it('should set timestamp for each message', () => {
      const before = new Date();
      store.addMessage({ role: 'user', content: 'Test' });
      const after = new Date();

      const message = store.messages()[0];
      expect(message.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(message.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should preserve message order', () => {
      store.addMessage({ role: 'user', content: 'First' });
      store.addMessage({ role: 'assistant', content: 'Second' });
      store.addMessage({ role: 'user', content: 'Third' });

      const messages = store.messages();
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
      expect(messages[2].content).toBe('Third');
    });
  });

  describe('updateLastAssistantMessage()', () => {
    it('should update the last assistant message content', () => {
      store.addMessage({ role: 'assistant', content: 'Initial' });
      store.updateLastAssistantMessage('Updated content');

      expect(store.messages()[0].content).toBe('Updated content');
    });

    it('should only update if last message is assistant', () => {
      store.addMessage({ role: 'assistant', content: 'Assistant message' });
      store.addMessage({ role: 'user', content: 'User message' });
      store.updateLastAssistantMessage('This should not change anything');

      const messages = store.messages();
      expect(messages[0].content).toBe('Assistant message');
      expect(messages[1].content).toBe('User message');
    });

    it('should not fail on empty messages', () => {
      expect(() => store.updateLastAssistantMessage('Test')).not.toThrow();
    });

    it('should preserve message id and timestamp when updating', () => {
      store.addMessage({ role: 'assistant', content: 'Initial' });
      const original = store.messages()[0];

      store.updateLastAssistantMessage('Updated');
      const updated = store.messages()[0];

      expect(updated.id).toBe(original.id);
      expect(updated.timestamp).toEqual(original.timestamp);
    });
  });

  describe('setGenerating()', () => {
    it('should set generating to true', () => {
      store.setGenerating(true);
      expect(store.isGenerating()).toBeTrue();
    });

    it('should set generating to false', () => {
      store.setGenerating(true);
      store.setGenerating(false);
      expect(store.isGenerating()).toBeFalse();
    });
  });

  describe('setGeneratedUniverse()', () => {
    it('should set generated universe', () => {
      const universe = { name: 'Test Universe', description: 'A test' };
      store.setGeneratedUniverse(universe);

      expect(store.generatedUniverse()).toEqual(universe);
    });

    it('should clear generated universe with null', () => {
      store.setGeneratedUniverse({ name: 'Test' });
      store.setGeneratedUniverse(null);

      expect(store.generatedUniverse()).toBeNull();
    });
  });

  describe('setGeneratedCharacter()', () => {
    it('should set generated character', () => {
      const character = { name: 'Test Character' };
      store.setGeneratedCharacter(character);

      expect(store.generatedCharacter()).toEqual(character);
    });

    it('should clear generated character with null', () => {
      store.setGeneratedCharacter({ name: 'Test' });
      store.setGeneratedCharacter(null);

      expect(store.generatedCharacter()).toBeNull();
    });
  });

  describe('setSelectedUniverseId()', () => {
    it('should set selected universe id', () => {
      store.setSelectedUniverseId('universe-123');
      expect(store.selectedUniverseId()).toBe('universe-123');
    });

    it('should clear selected universe id with null', () => {
      store.setSelectedUniverseId('universe-123');
      store.setSelectedUniverseId(null);
      expect(store.selectedUniverseId()).toBeNull();
    });
  });

  describe('setSuggestedActions()', () => {
    it('should set suggested actions', () => {
      const actions = ['Action 1', 'Action 2', 'Action 3'];
      store.setSuggestedActions(actions);

      expect(store.suggestedActions()).toEqual(actions);
    });

    it('should replace previous actions', () => {
      store.setSuggestedActions(['Old 1', 'Old 2']);
      store.setSuggestedActions(['New 1']);

      expect(store.suggestedActions()).toEqual(['New 1']);
    });
  });

  describe('updateContext()', () => {
    it('should add key to context', () => {
      store.updateContext('theme', 'fantasy');
      expect(store.conversationContext()['theme']).toBe('fantasy');
    });

    it('should update existing key', () => {
      store.updateContext('theme', 'fantasy');
      store.updateContext('theme', 'sci-fi');
      expect(store.conversationContext()['theme']).toBe('sci-fi');
    });

    it('should preserve other keys when updating', () => {
      store.updateContext('theme', 'fantasy');
      store.updateContext('races', 5);

      const context = store.conversationContext();
      expect(context['theme']).toBe('fantasy');
      expect(context['races']).toBe(5);
    });
  });

  describe('clearContext()', () => {
    it('should clear all context', () => {
      store.updateContext('key1', 'value1');
      store.updateContext('key2', 'value2');
      store.clearContext();

      expect(store.conversationContext()).toEqual({});
    });
  });

  describe('reset()', () => {
    it('should reset all state to initial values', () => {
      // Setup various state
      store.setMode('universe');
      store.setPhase('generating');
      store.addMessage({ role: 'user', content: 'test' });
      store.setGenerating(true);
      store.setGeneratedUniverse({ name: 'Test' });
      store.setGeneratedCharacter({ name: 'Char' });
      store.setSelectedUniverseId('uni-123');
      store.setSuggestedActions(['action']);
      store.updateContext('key', 'value');

      // Reset
      store.reset();

      // Verify all reset
      expect(store.mode()).toBe('idle');
      expect(store.phase()).toBe('gathering');
      expect(store.messages()).toEqual([]);
      expect(store.isGenerating()).toBeFalse();
      expect(store.generatedUniverse()).toBeNull();
      expect(store.generatedCharacter()).toBeNull();
      expect(store.selectedUniverseId()).toBeNull();
      expect(store.suggestedActions()).toEqual([]);
      expect(store.conversationContext()).toEqual({});
    });
  });

  describe('Computed Properties', () => {
    describe('hasGeneratedContent', () => {
      it('should be false when no content generated', () => {
        expect(store.hasGeneratedContent()).toBeFalse();
      });

      it('should be true when universe is generated', () => {
        store.setGeneratedUniverse({ name: 'Test' });
        expect(store.hasGeneratedContent()).toBeTrue();
      });

      it('should be true when character is generated', () => {
        store.setGeneratedCharacter({ name: 'Test' });
        expect(store.hasGeneratedContent()).toBeTrue();
      });
    });

    describe('messageCount', () => {
      it('should return 0 for empty messages', () => {
        expect(store.messageCount()).toBe(0);
      });

      it('should return correct count', () => {
        store.addMessage({ role: 'user', content: '1' });
        store.addMessage({ role: 'assistant', content: '2' });
        store.addMessage({ role: 'user', content: '3' });

        expect(store.messageCount()).toBe(3);
      });
    });
  });

  describe('getConversationHistory()', () => {
    it('should return empty array for no messages', () => {
      expect(store.getConversationHistory()).toEqual([]);
    });

    it('should return serialized messages without id and timestamp', () => {
      store.addMessage({ role: 'user', content: 'Hello' });
      store.addMessage({ role: 'assistant', content: 'Hi' });

      const history = store.getConversationHistory();

      expect(history.length).toBe(2);
      expect(history[0]).toEqual({ role: 'user', content: 'Hello' });
      expect(history[1]).toEqual({ role: 'assistant', content: 'Hi' });
      expect((history[0] as any).id).toBeUndefined();
      expect((history[0] as any).timestamp).toBeUndefined();
    });
  });
});
