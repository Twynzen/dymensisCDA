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
  Universe,
  DEFAULT_STAT_DEFINITIONS,
  DEFAULT_PROGRESSION_RULES,
  DEFAULT_AWAKENING_SYSTEM
} from '../../../core/models';

interface UniverseState {
  publicUniverses: Universe[];
  userUniverses: Universe[];
  selectedUniverse: Universe | null;
  loading: boolean;
  error: string | null;
}

const initialState: UniverseState = {
  publicUniverses: [],
  userUniverses: [],
  selectedUniverse: null,
  loading: false,
  error: null
};

export const UniverseStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    allUniverses: computed(() => [
      ...store.userUniverses(),
      ...store.publicUniverses().filter(
        (pu) => !store.userUniverses().some((uu) => uu.id === pu.id)
      )
    ]),
    hasSelectedUniverse: computed(() => store.selectedUniverse() !== null),
    selectedUniverseStats: computed(() => {
      const universe = store.selectedUniverse();
      if (!universe) return [];
      return Object.entries(universe.statDefinitions)
        .filter(([, def]) => !def.isDerived)
        .map(([key, def]) => ({ key, ...def }));
    }),
    selectedUniverseRules: computed(() => {
      return store.selectedUniverse()?.progressionRules ?? [];
    })
  })),
  withMethods((store) => {
    const firebaseService = inject(FirebaseService);
    const authService = inject(AuthService);

    return {
      async loadUniverses(): Promise<void> {
        const userId = authService.userId();

        patchState(store, { loading: true, error: null });
        try {
          const [publicUniverses, userUniverses] = await Promise.all([
            firebaseService.getPublicUniverses(),
            userId ? firebaseService.getUserUniverses(userId) : Promise.resolve([])
          ]);

          patchState(store, {
            publicUniverses,
            userUniverses,
            loading: false
          });
        } catch (error) {
          patchState(store, {
            error: 'Error al cargar universos',
            loading: false
          });
        }
      },

      async selectUniverse(universeId: string): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const universe = await firebaseService.getUniverse(universeId);
          patchState(store, { selectedUniverse: universe, loading: false });
        } catch (error) {
          patchState(store, {
            error: 'Error al cargar el universo',
            loading: false
          });
        }
      },

      clearSelectedUniverse(): void {
        patchState(store, { selectedUniverse: null });
      },

      async createUniverse(
        name: string,
        description: string,
        isPublic: boolean = false
      ): Promise<string | null> {
        const userId = authService.userId();
        if (!userId) return null;

        patchState(store, { loading: true, error: null });
        try {
          const universe: Omit<Universe, 'id'> = {
            name,
            description,
            createdBy: userId,
            createdAt: new Date(),
            isPublic,
            statDefinitions: { ...DEFAULT_STAT_DEFINITIONS },
            progressionRules: [...DEFAULT_PROGRESSION_RULES],
            awakeningSystem: { ...DEFAULT_AWAKENING_SYSTEM }
          };

          const universeId = await firebaseService.createUniverse(universe);
          const newUniverse = { ...universe, id: universeId };

          patchState(store, {
            userUniverses: [newUniverse, ...store.userUniverses()],
            loading: false
          });

          return universeId;
        } catch (error) {
          patchState(store, {
            error: 'Error al crear el universo',
            loading: false
          });
          return null;
        }
      },

      async updateUniverse(
        universeId: string,
        updates: Partial<Universe>
      ): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          await firebaseService.updateUniverse(universeId, updates);

          const updateUniverseInList = (universes: Universe[]) =>
            universes.map((u) =>
              u.id === universeId ? { ...u, ...updates } : u
            );

          patchState(store, {
            userUniverses: updateUniverseInList(store.userUniverses()),
            publicUniverses: updateUniverseInList(store.publicUniverses()),
            selectedUniverse:
              store.selectedUniverse()?.id === universeId
                ? { ...store.selectedUniverse()!, ...updates }
                : store.selectedUniverse(),
            loading: false
          });
        } catch (error) {
          patchState(store, {
            error: 'Error al actualizar el universo',
            loading: false
          });
        }
      },

      async deleteUniverse(universeId: string): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          await firebaseService.deleteUniverse(universeId);

          patchState(store, {
            userUniverses: store.userUniverses().filter((u) => u.id !== universeId),
            publicUniverses: store.publicUniverses().filter((u) => u.id !== universeId),
            selectedUniverse:
              store.selectedUniverse()?.id === universeId
                ? null
                : store.selectedUniverse(),
            loading: false
          });
        } catch (error) {
          patchState(store, {
            error: 'Error al eliminar el universo',
            loading: false
          });
        }
      },

      getDefaultStats(): Record<string, number> {
        const universe = store.selectedUniverse();
        if (!universe) return {};

        return Object.entries(universe.statDefinitions)
          .filter(([, def]) => !def.isDerived)
          .reduce(
            (acc, [key, def]) => {
              acc[key] = def.defaultValue;
              return acc;
            },
            {} as Record<string, number>
          );
      },

      setError(error: string | null): void {
        patchState(store, { error });
      }
    };
  })
);
