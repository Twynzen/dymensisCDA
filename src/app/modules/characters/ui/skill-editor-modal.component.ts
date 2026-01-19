import { Component, Input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons, IonButton, IonTitle,
  IonContent, IonList, IonListHeader, IonLabel, IonItem, IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonIcon, IonNote, IonBadge, IonItemSliding, IonItemOptions, IonItemOption,
  ModalController, AlertController
} from '@ionic/angular/standalone';
import { CharacterSkill, SkillEffect } from '../../../core/models';
import { SkillIconComponent, SkillIconName } from '../../../shared/ui/skill-icon/skill-icon.component';

@Component({
  selector: 'app-skill-editor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonList, IonListHeader, IonLabel, IonItem, IonInput, IonTextarea, IonSelect, IonSelectOption, IonIcon, IonNote, IonBadge, IonItemSliding, IonItemOptions, IonItemOption, SkillIconComponent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">Cancelar</ion-button>
        </ion-buttons>
        <ion-title>{{ isEditing ? 'Editar' : 'Nueva' }} Habilidad</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="save()" [strong]="true" [disabled]="!isValid()">
            Guardar
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <!-- Identidad -->
        <ion-list-header>
          <ion-label>Identidad</ion-label>
        </ion-list-header>

        <div class="icon-selector-section">
          <ion-label class="section-label">Icono</ion-label>
          <div class="icon-grid">
            @for (iconName of availableIcons; track iconName) {
              <div
                class="icon-option"
                [class.selected]="skillData.icon === iconName"
                (click)="skillData.icon = iconName"
              >
                <app-skill-icon [icon]="iconName" [size]="24"></app-skill-icon>
              </div>
            }
          </div>
        </div>

        <ion-item>
          <ion-input
            [(ngModel)]="skillData.name"
            label="Nombre de la habilidad *"
            labelPlacement="floating"
            placeholder="Ej: Monóculo de Escaneo Analógico K-1"
            [maxlength]="100"
            required
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-input
            [(ngModel)]="skillData.subtitle"
            label="Subtítulo / Apodo"
            labelPlacement="floating"
            placeholder="Ej: El Ojo del Ingeniero"
            [maxlength]="60"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-input
            [(ngModel)]="skillData.quote"
            label="Frase / Lema"
            labelPlacement="floating"
            placeholder="Ej: Todo tiene un punto débil. Solo hace falta enfocar bien."
            [maxlength]="150"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-select
            [(ngModel)]="skillData.category"
            label="Categoría *"
            labelPlacement="floating"
            placeholder="Selecciona una categoría"
          >
            <ion-select-option value="Pasiva">Pasiva</ion-select-option>
            <ion-select-option value="Activa">Activa</ion-select-option>
            <ion-select-option value="Equipo">Equipo / Objeto</ion-select-option>
            <ion-select-option value="Magia">Magia / Hechizo</ion-select-option>
            <ion-select-option value="Combate">Combate</ion-select-option>
            <ion-select-option value="Soporte">Soporte</ion-select-option>
            <ion-select-option value="Especial">Especial / Única</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Descripción -->
        <ion-list-header>
          <ion-label>Descripción</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-textarea
            [(ngModel)]="skillData.description"
            label="Descripción detallada *"
            labelPlacement="floating"
            placeholder="Describe cómo funciona la habilidad, su origen, mecanismos, apariencia..."
            [rows]="5"
            [autoGrow]="true"
            [maxlength]="1000"
            required
          ></ion-textarea>
        </ion-item>

        <!-- Efectos -->
        <ion-list-header>
          <ion-label>Efectos ({{ effects().length }})</ion-label>
          <ion-button size="small" fill="clear" (click)="addEffect()">
            <ion-icon slot="icon-only" name="add-circle"></ion-icon>
          </ion-button>
        </ion-list-header>

        <div class="effects-hint" *ngIf="effects().length === 0">
          <p>Describe los efectos mecánicos de la habilidad</p>
          <ion-button size="small" fill="outline" (click)="addEffect()">
            <ion-icon slot="start" name="add"></ion-icon>
            Agregar efecto
          </ion-button>
        </div>

        @for (effect of effects(); track $index; let i = $index) {
          <ion-item-sliding>
            <ion-item class="effect-item">
              <ion-icon name="checkmark-circle" slot="start" color="success"></ion-icon>
              <ion-textarea
                [(ngModel)]="effect.description"
                [label]="'Efecto ' + (i + 1)"
                labelPlacement="floating"
                placeholder="Ej: Revela el punto débil visible a todos los aliados"
                [rows]="2"
                [autoGrow]="true"
                [maxlength]="300"
              ></ion-textarea>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="danger" (click)="removeEffect(i)">
                <ion-icon slot="icon-only" name="trash"></ion-icon>
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        }

        <!-- Limitaciones -->
        <ion-list-header>
          <ion-label>Limitaciones ({{ limitations().length }})</ion-label>
          <ion-button size="small" fill="clear" (click)="addLimitation()">
            <ion-icon slot="icon-only" name="add-circle"></ion-icon>
          </ion-button>
        </ion-list-header>

        <div class="limitations-hint" *ngIf="limitations().length === 0">
          <p>Define restricciones o requisitos de uso</p>
          <ion-button size="small" fill="outline" (click)="addLimitation()">
            <ion-icon slot="start" name="add"></ion-icon>
            Agregar limitación
          </ion-button>
        </div>

        @for (limitation of limitations(); track $index; let i = $index) {
          <ion-item-sliding>
            <ion-item class="limitation-item">
              <ion-icon name="warning" slot="start" color="warning"></ion-icon>
              <ion-input
                [(ngModel)]="limitations()[i]"
                (ngModelChange)="updateLimitation(i, $event)"
                [label]="'Limitación ' + (i + 1)"
                labelPlacement="floating"
                placeholder="Ej: Requiere mantener visión directa durante 3 segundos"
                [maxlength]="200"
              ></ion-input>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="danger" (click)="removeLimitation(i)">
                <ion-icon slot="icon-only" name="trash"></ion-icon>
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        }

        <!-- Parámetros de Combate (Opcional) -->
        <ion-list-header>
          <ion-label>Parámetros de Combate</ion-label>
          <ion-note>Opcional</ion-note>
        </ion-list-header>

        <ion-item>
          <ion-input
            [(ngModel)]="skillData.cooldown"
            type="number"
            label="Tiempo de recarga (turnos)"
            labelPlacement="floating"
            placeholder="Ej: 3"
            [min]="0"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-input
            [(ngModel)]="skillData.manaCost"
            type="number"
            label="Costo de maná / energía"
            labelPlacement="floating"
            placeholder="Ej: 20"
            [min]="0"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-input
            [(ngModel)]="skillData.usesPerDay"
            type="number"
            label="Usos máximos por día"
            labelPlacement="floating"
            placeholder="Ej: 5 (dejar vacío = ilimitado)"
            [min]="1"
          ></ion-input>
        </ion-item>

        <!-- Vista Previa -->
        <ion-list-header>
          <ion-label>Vista Previa</ion-label>
        </ion-list-header>

        <div class="skill-preview">
          <div class="preview-header">
            <div class="preview-icon">
              <app-skill-icon [icon]="$any(skillData.icon) || 'sparkle'" [size]="36"></app-skill-icon>
            </div>
            <div class="preview-titles">
              <h3>{{ skillData.name || 'Nombre de la habilidad' }}</h3>
              @if (skillData.subtitle) {
                <span class="preview-subtitle">"{{ skillData.subtitle }}"</span>
              }
            </div>
            @if (skillData.category) {
              <ion-badge [color]="getCategoryColor(skillData.category)">
                {{ skillData.category }}
              </ion-badge>
            }
          </div>

          @if (skillData.quote) {
            <p class="preview-quote">"{{ skillData.quote }}"</p>
          }

          <p class="preview-description">
            {{ skillData.description || 'Descripción de la habilidad...' }}
          </p>

          @if (effects().length > 0) {
            <div class="preview-effects">
              <strong>Efectos:</strong>
              <ul>
                @for (effect of effects(); track $index) {
                  @if (effect.description) {
                    <li>{{ effect.description }}</li>
                  }
                }
              </ul>
            </div>
          }

          @if (limitations().length > 0) {
            <div class="preview-limitations">
              <strong>Limitaciones:</strong>
              <ul>
                @for (limitation of limitations(); track $index) {
                  @if (limitation) {
                    <li>{{ limitation }}</li>
                  }
                }
              </ul>
            </div>
          }
        </div>

        <!-- Delete button (only when editing) -->
        @if (isEditing && skill?.id) {
          <div class="danger-zone">
            <p class="danger-label">Zona de peligro</p>
            <ion-button expand="block" color="danger" fill="outline" (click)="confirmDelete()">
              <ion-icon slot="start" name="trash"></ion-icon>
              Eliminar Habilidad
            </ion-button>
          </div>
        }
      </ion-list>
    </ion-content>
  `,
  styles: [`
    ion-list-header {
      margin-top: 16px;
    }

    .icon-selector-section {
      padding: 0 16px 16px 16px;
    }

    .section-label {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      display: block;
      opacity: 0.8;
    }

    .icon-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .icon-option {
      width: 100%;
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }

    .icon-option:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .icon-option.selected {
      background: rgba(var(--ion-color-primary-rgb), 0.2);
      border-color: var(--ion-color-primary);
    }

    .custom-icon-item {
      --background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
    }

    .effects-hint, .limitations-hint {
      padding: 16px;
      text-align: center;
      opacity: 0.7;
    }

    .effects-hint p, .limitations-hint p {
      margin-bottom: 12px;
      font-size: 14px;
    }

    .effect-item, .limitation-item {
      --background: rgba(255, 255, 255, 0.03);
    }

    .skill-preview {
      margin: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .preview-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }

    .preview-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      color: var(--ion-color-primary);
    }

    .preview-titles {
      flex: 1;
    }

    .preview-titles h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .preview-subtitle {
      font-size: 13px;
      opacity: 0.7;
      font-style: italic;
    }

    .preview-quote {
      font-size: 13px;
      font-style: italic;
      opacity: 0.7;
      margin: 8px 0;
      padding-left: 12px;
      border-left: 2px solid var(--ion-color-primary);
    }

    .preview-description {
      font-size: 14px;
      line-height: 1.5;
      margin: 12px 0;
    }

    .preview-effects, .preview-limitations {
      margin-top: 12px;
      font-size: 13px;
    }

    .preview-effects strong {
      color: var(--ion-color-success);
    }

    .preview-limitations strong {
      color: var(--ion-color-warning);
    }

    .preview-effects ul, .preview-limitations ul {
      margin: 4px 0 0 0;
      padding-left: 20px;
    }

    .preview-effects li, .preview-limitations li {
      margin-bottom: 4px;
    }

    .danger-zone {
      padding: 16px;
      margin-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .danger-label {
      font-size: 12px;
      color: var(--ion-color-danger);
      text-transform: uppercase;
      margin-bottom: 12px;
      opacity: 0.8;
    }
  `]
})
export class SkillEditorModalComponent {
  private modalController = inject(ModalController);
  private alertController = inject(AlertController);

  @Input() skill?: Partial<CharacterSkill>;
  @Input() isEditing = false;

  // Available icons for skill selection (SVG icons)
  availableIcons: SkillIconName[] = [
    'sword', 'shield', 'fire', 'ice', 'lightning', 'skull', 'sparkle', 'star',
    'search', 'eye', 'gem', 'dagger', 'bow', 'wand', 'amulet', 'muscle',
    'brain', 'heart', 'blood', 'moon', 'sun', 'water', 'leaf', 'rock',
    'ghost', 'eagle', 'dragon', 'lion', 'wolf', 'spider', 'orb', 'book'
  ];

  skillData: Partial<CharacterSkill> = {
    name: '',
    subtitle: '',
    icon: '',
    quote: '',
    description: '',
    category: '',
    level: 1,
    cooldown: undefined,
    manaCost: undefined,
    usesPerDay: undefined
  };

  effects = signal<SkillEffect[]>([]);
  limitations = signal<string[]>([]);

  ngOnInit(): void {
    if (this.skill) {
      this.skillData = { ...this.skill };
      this.effects.set(this.skill.effects ? [...this.skill.effects] : []);
      this.limitations.set(this.skill.limitations ? [...this.skill.limitations] : []);
    }
  }

  isValid(): boolean {
    return !!(
      this.skillData.name?.trim() &&
      this.skillData.description?.trim() &&
      this.skillData.category
    );
  }

  addEffect(): void {
    this.effects.update(effects => [...effects, { description: '' }]);
  }

  removeEffect(index: number): void {
    this.effects.update(effects => effects.filter((_, i) => i !== index));
  }

  addLimitation(): void {
    this.limitations.update(limitations => [...limitations, '']);
  }

  removeLimitation(index: number): void {
    this.limitations.update(limitations => limitations.filter((_, i) => i !== index));
  }

  updateLimitation(index: number, value: string): void {
    this.limitations.update(limitations => {
      const updated = [...limitations];
      updated[index] = value;
      return updated;
    });
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Pasiva': 'medium',
      'Activa': 'primary',
      'Equipo': 'tertiary',
      'Magia': 'secondary',
      'Combate': 'danger',
      'Soporte': 'success',
      'Especial': 'warning'
    };
    return colors[category] || 'medium';
  }

  dismiss(): void {
    this.modalController.dismiss();
  }

  save(): void {
    if (!this.isValid()) return;

    // Filter out empty effects and limitations
    const cleanEffects = this.effects().filter(e => e.description?.trim());
    const cleanLimitations = this.limitations().filter(l => l?.trim());

    // Build result object, only including fields with actual values
    // Firebase doesn't accept undefined values
    const result: Partial<CharacterSkill> = {
      name: this.skillData.name?.trim() || '',
      category: this.skillData.category || '',
      description: this.skillData.description?.trim() || '',
      level: this.skillData.level || 1
    };

    // Only add optional fields if they have values
    if (this.skillData.subtitle?.trim()) {
      result.subtitle = this.skillData.subtitle.trim();
    }
    if (this.skillData.icon?.trim()) {
      result.icon = this.skillData.icon.trim();
    }
    if (this.skillData.quote?.trim()) {
      result.quote = this.skillData.quote.trim();
    }
    if (cleanEffects.length > 0) {
      result.effects = cleanEffects;
    }
    if (cleanLimitations.length > 0) {
      result.limitations = cleanLimitations;
    }
    if (this.skillData.cooldown && this.skillData.cooldown > 0) {
      result.cooldown = this.skillData.cooldown;
    }
    if (this.skillData.manaCost && this.skillData.manaCost > 0) {
      result.manaCost = this.skillData.manaCost;
    }
    if (this.skillData.usesPerDay && this.skillData.usesPerDay > 0) {
      result.usesPerDay = this.skillData.usesPerDay;
    }

    this.modalController.dismiss(result, 'save');
  }

  async confirmDelete(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar Habilidad',
      message: `¿Estás seguro de que deseas eliminar "${this.skillData.name}"? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            // Dismiss with 'delete' role and the skill id
            this.modalController.dismiss({ skillId: this.skill?.id }, 'delete');
          }
        }
      ]
    });
    await alert.present();
  }
}
