import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState
} from '@ngrx/signals';
import { FirebaseService } from '../../../core/services/firebase.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  Character,
  CharacterSkill,
  HistoryEntry,
  StatChange,
  createDefaultCharacter,
  calculateAwakening
} from '../../../core/models';

interface CharacterState {
  characters: Character[];
  selectedCharacter: Character | null;
  selectedCharacterSkills: CharacterSkill[];
  selectedCharacterHistory: HistoryEntry[];
  loading: boolean;
  error: string | null;
}

const initialState: CharacterState = {
  characters: [],
  selectedCharacter: null,
  selectedCharacterSkills: [],
  selectedCharacterHistory: [],
  loading: false,
  error: null
};

export const CharacterStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    characterCount: computed(() => store.characters().length),
    hasSelectedCharacter: computed(() => store.selectedCharacter() !== null),
    totalStats: computed(() => {
      const character = store.selectedCharacter();
      if (!character) return 0;
      return Object.values(character.stats).reduce((sum, val) => sum + val, 0);
    }),
    sortedStats: computed(() => {
      const character = store.selectedCharacter();
      if (!character) return [];
      return Object.entries(character.stats)
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => b.value - a.value);
    })
  })),
  withMethods((store) => {
    const firebaseService = inject(FirebaseService);
    const authService = inject(AuthService);

    return {
      async loadCharacters(): Promise<void> {
        const userId = authService.userId();
        if (!userId) return;

        patchState(store, { loading: true, error: null });
        try {
          const characters = await firebaseService.getUserCharacters(userId);
          patchState(store, { characters, loading: false });
        } catch (error) {
          patchState(store, {
            error: 'Error al cargar personajes',
            loading: false
          });
        }
      },

      async selectCharacter(characterId: string): Promise<void> {
        const userId = authService.userId();
        if (!userId) return;

        patchState(store, { loading: true, error: null });
        try {
          const [character, skills, history] = await Promise.all([
            firebaseService.getCharacter(userId, characterId),
            firebaseService.getCharacterSkills(userId, characterId),
            firebaseService.getCharacterHistory(userId, characterId)
          ]);

          patchState(store, {
            selectedCharacter: character,
            selectedCharacterSkills: skills,
            selectedCharacterHistory: history,
            loading: false
          });
        } catch (error) {
          patchState(store, {
            error: 'Error al cargar el personaje',
            loading: false
          });
        }
      },

      clearSelectedCharacter(): void {
        patchState(store, {
          selectedCharacter: null,
          selectedCharacterSkills: [],
          selectedCharacterHistory: []
        });
      },

      async createCharacter(
        nameOrData: string | Partial<Character>,
        universeId?: string,
        defaultStats?: Record<string, number>
      ): Promise<string | null> {
        // Wait for auth to be ready before checking userId
        console.log('[CharacterStore] createCharacter: Waiting for auth to be ready...');
        const isAuth = await authService.waitForAuthReady();
        console.log('[CharacterStore] createCharacter: Auth ready, isAuthenticated:', isAuth);

        const userId = authService.userId();
        console.log('[CharacterStore] createCharacter: Auth state -', {
          loading: authService.loading(),
          isAuthenticated: authService.isAuthenticated(),
          userId: userId,
          userEmail: authService.user()?.email
        });

        if (!userId) {
          console.error('[CharacterStore] createCharacter: No userId - user not authenticated');
          patchState(store, { error: 'Debes iniciar sesión para crear personajes' });
          return null;
        }

        patchState(store, { loading: true, error: null });
        try {
          let character: Character;

          // Support both old (string, string, stats) and new (Partial<Character>) signatures
          if (typeof nameOrData === 'string') {
            // Legacy call: createCharacter(name, universeId, stats)
            character = createDefaultCharacter(
              nameOrData,
              universeId!,
              userId,
              defaultStats || {}
            );
          } else {
            // New call: createCharacter(Partial<Character>) with all data
            const data = nameOrData;
            character = createDefaultCharacter(
              data.name || 'Sin nombre',
              data.universeId || '',
              userId,
              data.stats || {},
              {
                raceId: data.raceId,
                baseStats: data.baseStats,
                bonusStats: data.bonusStats,
                derivedStats: data.derivedStats,
                description: data.description,
                backstory: data.backstory,
                personalityTraits: data.personalityTraits,
                awakening: data.progression?.awakening,
                avatar: data.avatar
              }
            );

            // Apply progression data if provided
            if (data.progression) {
              character.progression = {
                ...character.progression,
                ...data.progression
              };
            }
          }

          const characterId = await firebaseService.createCharacter(
            userId,
            character
          );

          const newCharacter = { ...character, id: characterId };
          patchState(store, {
            characters: [newCharacter, ...store.characters()],
            loading: false
          });

          return characterId;
        } catch (error) {
          patchState(store, {
            error: 'Error al crear el personaje',
            loading: false
          });
          return null;
        }
      },

      async updateCharacter(
        characterId: string,
        updates: Partial<Character>
      ): Promise<void> {
        const userId = authService.userId();
        if (!userId) return;

        patchState(store, { loading: true, error: null });
        try {
          await firebaseService.updateCharacter(userId, characterId, updates);

          // Update local state
          const updatedCharacters = store.characters().map((c) =>
            c.id === characterId ? { ...c, ...updates } : c
          );
          patchState(store, {
            characters: updatedCharacters,
            selectedCharacter:
              store.selectedCharacter()?.id === characterId
                ? { ...store.selectedCharacter()!, ...updates }
                : store.selectedCharacter(),
            loading: false
          });
        } catch (error) {
          patchState(store, {
            error: 'Error al actualizar el personaje',
            loading: false
          });
        }
      },

      async applyStatChanges(
        characterId: string,
        changes: StatChange[],
        action: string,
        aiAnalysis: { suggestedChanges: StatChange[]; confidence: number }
      ): Promise<void> {
        const userId = authService.userId();
        if (!userId) return;

        const character = store.selectedCharacter();
        if (!character) return;

        patchState(store, { loading: true, error: null });
        try {
          // Calculate new stats
          const newStats = { ...character.stats };
          changes.forEach(({ stat, change }) => {
            if (stat in newStats) {
              newStats[stat] = Math.max(1, newStats[stat] + change);
            }
          });

          // Update character
          await firebaseService.updateCharacter(userId, characterId, {
            stats: newStats
          });

          // Add history entry
          await firebaseService.addHistoryEntry(userId, characterId, {
            action,
            timestamp: new Date(),
            aiAnalysis,
            appliedChanges: changes,
            approved: true
          });

          // Reload character data
          await this.selectCharacter(characterId);
        } catch (error) {
          patchState(store, {
            error: 'Error al aplicar cambios',
            loading: false
          });
        }
      },

      async deleteCharacter(characterId: string): Promise<void> {
        const userId = authService.userId();
        if (!userId) return;

        patchState(store, { loading: true, error: null });
        try {
          await firebaseService.deleteCharacter(userId, characterId);
          patchState(store, {
            characters: store.characters().filter((c) => c.id !== characterId),
            selectedCharacter:
              store.selectedCharacter()?.id === characterId
                ? null
                : store.selectedCharacter(),
            loading: false
          });
        } catch (error) {
          patchState(store, {
            error: 'Error al eliminar el personaje',
            loading: false
          });
        }
      },

      async addSkill(
        characterId: string,
        skill: Omit<CharacterSkill, 'id'>
      ): Promise<void> {
        const userId = authService.userId();
        if (!userId) return;

        try {
          const skillId = await firebaseService.addSkill(
            userId,
            characterId,
            skill
          );
          const newSkill = { ...skill, id: skillId };
          patchState(store, {
            selectedCharacterSkills: [newSkill, ...store.selectedCharacterSkills()]
          });
        } catch (error) {
          patchState(store, { error: 'Error al añadir habilidad' });
        }
      },

      async updateAwakening(
        characterId: string,
        thresholds: number[],
        levels: string[]
      ): Promise<void> {
        const character = store.selectedCharacter();
        if (!character) return;

        const newAwakening = calculateAwakening(
          character.stats,
          thresholds,
          levels
        );

        if (newAwakening !== character.progression.awakening) {
          await this.updateCharacter(characterId, {
            progression: {
              ...character.progression,
              awakening: newAwakening
            }
          });
        }
      },

      setError(error: string | null): void {
        patchState(store, { error });
      }
    };
  })
);
