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
  DEFAULT_INITIAL_POINTS,
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
        patchState(store, { loading: true, error: null });

        try {
          // Wait for auth to be ready before checking userId
          console.log('[UniverseStore] loadUniverses: Waiting for auth to be ready...');
          await authService.waitForAuthReady();

          const userId = authService.userId();
          console.log('[UniverseStore] loadUniverses: Auth state -', {
            isAuthenticated: authService.isAuthenticated(),
            userId: userId
          });

          const [publicUniverses, userUniverses] = await Promise.all([
            firebaseService.getPublicUniverses(),
            userId ? firebaseService.getUserUniverses(userId) : Promise.resolve([])
          ]);

          console.log('[UniverseStore] loadUniverses: Loaded -', {
            publicCount: publicUniverses.length,
            userCount: userUniverses.length,
            publicNames: publicUniverses.map(u => u.name),
            userNames: userUniverses.map(u => u.name)
          });

          patchState(store, {
            publicUniverses,
            userUniverses,
            loading: false
          });
        } catch (error) {
          console.error('[UniverseStore] loadUniverses: Error -', error);
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
        nameOrData: string | Partial<Universe>,
        description?: string,
        isPublic: boolean = false
      ): Promise<string | null> {
        // Wait for auth to be ready before checking userId
        console.log('[UniverseStore] createUniverse: Waiting for auth to be ready...');
        const isAuth = await authService.waitForAuthReady();
        console.log('[UniverseStore] createUniverse: Auth ready, isAuthenticated:', isAuth);

        const userId = authService.userId();
        console.log('[UniverseStore] createUniverse: Auth state -', {
          loading: authService.loading(),
          isAuthenticated: authService.isAuthenticated(),
          userId: userId,
          userEmail: authService.user()?.email
        });

        if (!userId) {
          console.error('[UniverseStore] createUniverse: No userId - user not authenticated');
          patchState(store, { error: 'Debes iniciar sesión para crear universos' });
          return null;
        }

        patchState(store, { loading: true, error: null });
        try {
          let universe: Omit<Universe, 'id'>;

          // Helper to estimate document size
          const estimateDocSize = (obj: object): number => {
            return new Blob([JSON.stringify(obj)]).size;
          };

          if (typeof nameOrData === 'string') {
            // Legacy call: createUniverse(name, description, isPublic)
            universe = {
              name: nameOrData,
              description: description || '',
              createdBy: userId,
              createdAt: new Date(),
              isPublic,
              statDefinitions: { ...DEFAULT_STAT_DEFINITIONS },
              initialPoints: DEFAULT_INITIAL_POINTS,
              progressionRules: [...DEFAULT_PROGRESSION_RULES],
              awakeningSystem: { ...DEFAULT_AWAKENING_SYSTEM }
            };
          } else {
            // New call: createUniverse(Partial<Universe>) with ALL data at once
            const data = nameOrData;
            universe = {
              name: data.name || 'Sin nombre',
              description: data.description || '',
              createdBy: userId,
              createdAt: new Date(),
              isPublic: data.isPublic ?? false,
              statDefinitions: data.statDefinitions || { ...DEFAULT_STAT_DEFINITIONS },
              initialPoints: data.initialPoints ?? DEFAULT_INITIAL_POINTS,
              progressionRules: data.progressionRules || [...DEFAULT_PROGRESSION_RULES],
              awakeningSystem: data.awakeningSystem || { ...DEFAULT_AWAKENING_SYSTEM },
              // Optional fields
              ...(data.raceSystem && { raceSystem: data.raceSystem }),
              ...(data.coverImage && { coverImage: data.coverImage })
            };
          }

          // Validate document size before saving (Firestore limit is 1MB = 1,048,576 bytes)
          const FIRESTORE_MAX_SIZE = 1_000_000; // Using 1MB with some margin
          const docSize = estimateDocSize(universe);
          console.log(`[UniverseStore] Estimated document size: ${Math.round(docSize / 1024)}KB`);

          if (docSize > FIRESTORE_MAX_SIZE) {
            const sizeKB = Math.round(docSize / 1024);
            const maxKB = Math.round(FIRESTORE_MAX_SIZE / 1024);
            console.error(`[UniverseStore] Document too large: ${sizeKB}KB > ${maxKB}KB limit`);
            patchState(store, {
              error: `El universo contiene demasiados datos. Intenta con menos imágenes o razas más simples.`,
              loading: false
            });
            return null;
          }

          console.log('Creating universe in Firebase:', universe.name);
          const universeId = await firebaseService.createUniverse(universe);
          console.log('Universe created with ID:', universeId);

          const newUniverse = { ...universe, id: universeId };

          patchState(store, {
            userUniverses: [newUniverse, ...store.userUniverses()],
            loading: false
          });

          return universeId;
        } catch (error) {
          console.error('Error in createUniverse:', error);
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
            (acc, [key]) => {
              acc[key] = 0; // Stats start at 0, points are distributed by user
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
