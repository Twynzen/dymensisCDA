import { computed, Injectable, signal } from '@angular/core';
import { Universe, Character } from '../../../core/models';

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type CreationMode = 'idle' | 'universe' | 'character' | 'action';
export type CreationPhase = 'gathering' | 'generating' | 'reviewing' | 'adjusting' | 'confirmed';

@Injectable({ providedIn: 'root' })
export class CreationStore {
  // State signals
  private _mode = signal<CreationMode>('idle');
  private _phase = signal<CreationPhase>('gathering');
  private _messages = signal<ChatMessage[]>([]);
  private _isGenerating = signal(false);
  private _generatedUniverse = signal<Partial<Universe> | null>(null);
  private _generatedCharacter = signal<Partial<Character> | null>(null);
  private _selectedUniverseId = signal<string | null>(null);
  private _suggestedActions = signal<string[]>([]);
  private _conversationContext = signal<Record<string, any>>({});

  // Public computed signals
  mode = computed(() => this._mode());
  phase = computed(() => this._phase());
  messages = computed(() => this._messages());
  isGenerating = computed(() => this._isGenerating());
  generatedUniverse = computed(() => this._generatedUniverse());
  generatedCharacter = computed(() => this._generatedCharacter());
  selectedUniverseId = computed(() => this._selectedUniverseId());
  suggestedActions = computed(() => this._suggestedActions());
  conversationContext = computed(() => this._conversationContext());

  // Computed derived state
  hasGeneratedContent = computed(() =>
    this._generatedUniverse() !== null || this._generatedCharacter() !== null
  );

  messageCount = computed(() => this._messages().length);

  // Actions
  setMode(mode: CreationMode): void {
    this._mode.set(mode);
    if (mode === 'idle') {
      this.reset();
    }
  }

  setPhase(phase: CreationPhase): void {
    this._phase.set(phase);
  }

  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };
    this._messages.update(messages => [...messages, newMessage]);
  }

  updateLastAssistantMessage(content: string): void {
    this._messages.update(messages => {
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
        const updated = [...messages];
        updated[lastIndex] = { ...updated[lastIndex], content };
        return updated;
      }
      return messages;
    });
  }

  setGenerating(value: boolean): void {
    this._isGenerating.set(value);
  }

  setGeneratedUniverse(universe: Partial<Universe> | null): void {
    this._generatedUniverse.set(universe);
  }

  setGeneratedCharacter(character: Partial<Character> | null): void {
    this._generatedCharacter.set(character);
  }

  setSelectedUniverseId(id: string | null): void {
    this._selectedUniverseId.set(id);
  }

  setSuggestedActions(actions: string[]): void {
    this._suggestedActions.set(actions);
  }

  updateContext(key: string, value: any): void {
    this._conversationContext.update(ctx => ({ ...ctx, [key]: value }));
  }

  clearContext(): void {
    this._conversationContext.set({});
  }

  reset(): void {
    this._mode.set('idle');
    this._phase.set('gathering');
    this._messages.set([]);
    this._isGenerating.set(false);
    this._generatedUniverse.set(null);
    this._generatedCharacter.set(null);
    this._selectedUniverseId.set(null);
    this._suggestedActions.set([]);
    this._conversationContext.set({});
  }

  // Serialize conversation for AI context
  getConversationHistory(): Array<{ role: string; content: string }> {
    return this._messages().map(m => ({
      role: m.role,
      content: m.content
    }));
  }
}
