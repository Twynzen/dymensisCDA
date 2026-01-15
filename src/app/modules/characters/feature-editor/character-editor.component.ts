import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { CharacterStore } from '../data-access/character.store';
import { UniverseStore } from '../../universes/data-access/universe.store';
import { StatBarComponent } from '../../../shared/ui/stat-bar/stat-bar.component';
import { Character, StatDefinition } from '../../../core/models';

interface EditableStat {
  key: string;
  name: string;
  abbreviation: string;
  icon: string;
  value: number;
  minValue: number;
  maxValue: number;
  color: string;
}

@Component({
  selector: 'app-character-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, StatBarComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="backUrl()"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEditing() ? 'Editar' : 'Nuevo' }} Personaje</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="save()" [disabled]="!isValid() || saving()">
            @if (saving()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              <ion-icon slot="icon-only" name="checkmark"></ion-icon>
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <form class="editor-form">
        <!-- Basic Info -->
        <ion-list-header>
          <ion-label>Información Básica</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-input
            [(ngModel)]="characterName"
            name="name"
            label="Nombre del Personaje"
            labelPlacement="floating"
            placeholder="Ej: Sung Jin-Woo"
            [maxlength]="50"
            required
          ></ion-input>
        </ion-item>

        @if (!isEditing()) {
          <ion-item>
            <ion-select
              [(ngModel)]="selectedUniverseId"
              name="universe"
              label="Universo"
              labelPlacement="floating"
              placeholder="Selecciona un universo"
              (ionChange)="onUniverseChange()"
            >
              @for (universe of universeStore.allUniverses(); track universe.id) {
                <ion-select-option [value]="universe.id">
                  {{ universe.name }}
                </ion-select-option>
              }
            </ion-select>
          </ion-item>
        }

        <!-- Avatar -->
        <ion-list-header>
          <ion-label>Avatar</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-input
            [(ngModel)]="avatarUrl"
            name="avatarUrl"
            label="URL de Avatar"
            labelPlacement="floating"
            placeholder="https://..."
            type="url"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-label>Color de Fondo</ion-label>
          <input
            type="color"
            [(ngModel)]="backgroundColor"
            name="backgroundColor"
            class="color-picker"
          />
        </ion-item>

        <!-- Stats -->
        @if (editableStats().length > 0) {
          <ion-list-header>
            <ion-label>Estadísticas</ion-label>
          </ion-list-header>

          <div class="stats-editor">
            @for (stat of editableStats(); track stat.key) {
              <div class="stat-editor-item">
                <div class="stat-header">
                  <div class="stat-info">
                    <ion-icon [name]="stat.icon"></ion-icon>
                    <span class="stat-name">{{ stat.name }}</span>
                    <span class="stat-abbr">({{ stat.abbreviation }})</span>
                  </div>
                  <div class="stat-value-display" [style.color]="stat.color">
                    {{ getStatValue(stat.key) }}
                  </div>
                </div>
                <ion-range
                  [min]="stat.minValue"
                  [max]="stat.maxValue"
                  [value]="getStatValue(stat.key)"
                  (ionInput)="updateStat(stat.key, $event)"
                  [pin]="true"
                  [ticks]="false"
                  [style.--bar-background-active]="stat.color"
                ></ion-range>
              </div>
            }
          </div>
        }

        <!-- Progression -->
        @if (isEditing()) {
          <ion-list-header>
            <ion-label>Progresión</ion-label>
          </ion-list-header>

          <ion-item>
            <ion-input
              [(ngModel)]="level"
              name="level"
              type="number"
              label="Nivel"
              labelPlacement="floating"
              [min]="1"
              [max]="9999"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-input
              [(ngModel)]="title"
              name="title"
              label="Título"
              labelPlacement="floating"
              placeholder="Ej: Shadow Monarch"
              [maxlength]="50"
            ></ion-input>
          </ion-item>
        }
      </form>
    </ion-content>
  `,
  styles: [`
    .editor-form {
      padding-bottom: 40px;
    }

    ion-list-header {
      margin-top: 16px;
    }

    .color-picker {
      width: 50px;
      height: 40px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      background: transparent;
    }

    .stats-editor {
      padding: 16px;
    }

    .stat-editor-item {
      margin-bottom: 20px;
      background: rgba(255, 255, 255, 0.05);
      padding: 12px;
      border-radius: 12px;
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .stat-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-info ion-icon {
      font-size: 20px;
      opacity: 0.7;
    }

    .stat-name {
      font-weight: 500;
    }

    .stat-abbr {
      font-size: 12px;
      opacity: 0.5;
    }

    .stat-value-display {
      font-size: 24px;
      font-weight: 700;
      font-family: 'Roboto Mono', monospace;
    }

    ion-range {
      --bar-height: 8px;
      --bar-border-radius: 4px;
      --knob-size: 24px;
    }
  `]
})
export class CharacterEditorComponent implements OnInit {
  characterStore = inject(CharacterStore);
  universeStore = inject(UniverseStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastController = inject(ToastController);

  isEditing = signal(false);
  saving = signal(false);
  characterId = signal<string | null>(null);

  // Form fields
  characterName = '';
  selectedUniverseId = '';
  avatarUrl = '';
  backgroundColor = '#1a1a2e';
  stats = signal<Record<string, number>>({});
  level = 1;
  title = '';

  backUrl = computed(() =>
    this.isEditing() ? `/tabs/characters/${this.characterId()}` : '/tabs/characters'
  );

  editableStats = computed<EditableStat[]>(() => {
    const universeId = this.isEditing()
      ? this.characterStore.selectedCharacter()?.universeId
      : this.selectedUniverseId;

    if (!universeId) return [];

    const universe = this.universeStore.allUniverses().find(u => u.id === universeId);
    if (!universe) return [];

    return Object.entries(universe.statDefinitions)
      .filter(([, def]) => !def.isDerived)
      .map(([key, def]) => ({
        key,
        name: def.name,
        abbreviation: def.abbreviation,
        icon: def.icon,
        value: def.defaultValue,
        minValue: def.minValue,
        maxValue: def.maxValue,
        color: def.color
      }));
  });

  isValid = computed(() => {
    return (
      this.characterName.trim().length > 0 &&
      (this.isEditing() || this.selectedUniverseId.length > 0) &&
      Object.keys(this.stats()).length > 0
    );
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id && id !== 'new') {
      this.isEditing.set(true);
      this.characterId.set(id);
      this.loadExistingCharacter(id);
    }

    // Load universes if not already loaded
    if (this.universeStore.allUniverses().length === 0) {
      this.universeStore.loadUniverses();
    }
  }

  async loadExistingCharacter(id: string): Promise<void> {
    await this.characterStore.selectCharacter(id);
    const character = this.characterStore.selectedCharacter();

    if (character) {
      this.characterName = character.name;
      this.selectedUniverseId = character.universeId;
      this.avatarUrl = character.avatar?.photoUrl ?? '';
      this.backgroundColor = character.avatar?.backgroundColor ?? '#1a1a2e';
      this.stats.set({ ...character.stats });
      this.level = character.progression?.level ?? 1;
      this.title = character.progression?.title ?? '';
    }
  }

  onUniverseChange(): void {
    const universe = this.universeStore.allUniverses().find(
      u => u.id === this.selectedUniverseId
    );

    if (universe) {
      const defaultStats: Record<string, number> = {};
      Object.entries(universe.statDefinitions)
        .filter(([, def]) => !def.isDerived)
        .forEach(([key, def]) => {
          defaultStats[key] = def.defaultValue;
        });
      this.stats.set(defaultStats);
    }
  }

  getStatValue(key: string): number {
    return this.stats()[key] ?? 0;
  }

  updateStat(key: string, event: any): void {
    const value = event.detail.value;
    this.stats.update(stats => ({
      ...stats,
      [key]: value
    }));
  }

  async save(): Promise<void> {
    if (!this.isValid()) return;

    this.saving.set(true);

    try {
      if (this.isEditing()) {
        await this.characterStore.updateCharacter(this.characterId()!, {
          name: this.characterName.trim(),
          avatar: {
            photoUrl: this.avatarUrl || null,
            backgroundColor: this.backgroundColor
          },
          stats: this.stats(),
          progression: {
            level: this.level,
            experience: 0,
            awakening: this.characterStore.selectedCharacter()?.progression?.awakening ?? 'E',
            title: this.title || undefined
          }
        });

        await this.showToast('Personaje actualizado', 'success');
        this.router.navigate(['/tabs/characters', this.characterId()]);
      } else {
        const newId = await this.characterStore.createCharacter(
          this.characterName.trim(),
          this.selectedUniverseId,
          this.stats()
        );

        if (newId) {
          // Update avatar if provided
          if (this.avatarUrl || this.backgroundColor !== '#1a1a2e') {
            await this.characterStore.updateCharacter(newId, {
              avatar: {
                photoUrl: this.avatarUrl || null,
                backgroundColor: this.backgroundColor
              }
            });
          }

          await this.showToast('Personaje creado', 'success');
          this.router.navigate(['/tabs/characters', newId]);
        }
      }
    } catch (error) {
      await this.showToast('Error al guardar', 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
