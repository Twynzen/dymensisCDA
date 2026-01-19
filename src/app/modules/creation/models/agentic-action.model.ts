/**
 * Agentic Action Models
 * Types for dynamic actions that the agent can show/execute based on context
 */

import { Universe, Character } from '../../../core/models';

/** Types of agentic actions */
export type AgenticActionType =
  | 'text_input'      // User types text
  | 'image_upload'    // Upload image
  | 'quick_select'    // Quick option selection
  | 'confirm_preview' // Confirm generated entity
  | 'edit_field'      // Edit specific field
  | 'generate_more'   // Generate additional content
  | 'undo'            // Undo last change
  | 'skip_phase'      // Skip current phase
  | 'regenerate';     // Regenerate current entity

/** Component types for rendering actions */
export type ActionComponentType = 'chip' | 'button' | 'input' | 'upload' | 'card';

/** Visibility modes for actions */
export type ActionVisibility = 'always' | 'contextual' | 'hidden';

/**
 * Context for evaluating action visibility and behavior
 */
export interface AgenticContext {
  /** Current creation mode */
  mode: 'idle' | 'universe' | 'character' | 'action';
  /** Current phase ID */
  currentPhase: string;
  /** Phase index (0-based) */
  phaseIndex: number;
  /** Total phases */
  totalPhases: number;
  /** Completeness percentage (0-100) */
  completenessScore: number;
  /** Fields that have been filled */
  filledFields: string[];
  /** Fields that are still pending */
  pendingFields: string[];
  /** Whether an entity has been generated */
  hasGeneratedEntity: boolean;
  /** The generated entity (if any) */
  generatedEntity: Partial<Universe> | Partial<Character> | null;
  /** Available universes for character creation */
  availableUniverses: Universe[];
  /** Selected universe ID (for character creation) */
  selectedUniverseId: string | null;
  /** Whether user has mentioned images */
  mentionedImage: boolean;
  /** Whether user is in confirmation mode */
  isConfirmationMode: boolean;
  /** Last user message */
  lastUserMessage: string;
  /** Validation warnings */
  validationWarnings: string[];
  /** Validation errors */
  validationErrors: string[];
}

/**
 * An agentic action that can be displayed and executed
 */
export interface AgenticAction {
  /** Unique identifier */
  id: string;
  /** Type of action */
  type: AgenticActionType;
  /** Display label */
  label: string;
  /** Optional icon (Ionicon name) */
  icon?: string;
  /** Component type for rendering */
  component: ActionComponentType;
  /** Visibility mode */
  visibility: ActionVisibility;
  /** Condition for showing this action */
  showCondition?: (context: AgenticContext) => boolean;
  /** Handler function when action is triggered */
  handler?: () => Promise<void>;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Color for the action (Ionic color) */
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger';
  /** Whether action is disabled */
  disabled?: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Priority for sorting (higher = first) */
  priority?: number;
}

/**
 * State for the dynamic phase engine
 */
export interface DynamicPhaseState {
  /** Current phase ID */
  currentPhaseId: string;
  /** Current phase index */
  currentPhaseIndex: number;
  /** Total phases */
  totalPhases: number;
  /** Completeness score (0-100) */
  completenessScore: number;
  /** Fields that have been filled */
  filledFields: string[];
  /** Fields that are still pending */
  pendingFields: string[];
  /** Can skip to confirmation */
  canSkipToConfirmation: boolean;
  /** Suggested next phase ID (may skip phases) */
  suggestedNextPhase: string | null;
  /** Phases that can be skipped */
  skippablePhases: string[];
}

/**
 * Bulk extraction result from user input
 */
export interface BulkExtraction {
  /** Extracted fields with values */
  fields: Record<string, unknown>;
  /** Completeness score (0-100) */
  completenessScore: number;
  /** Fields that were extracted */
  extractedFieldNames: string[];
  /** Fields that are still missing */
  missingRequiredFields: string[];
  /** Optional fields that are missing */
  missingOptionalFields: string[];
  /** Confidence score for the extraction */
  confidence: number;
  /** Detected target type */
  detectedTarget: 'universe' | 'character' | 'unknown';
  /** Suggested follow-up question */
  suggestedQuestion?: string;
}

/**
 * Field definition for extraction
 */
export interface ExtractableField {
  /** Field key */
  key: string;
  /** Display name */
  name: string;
  /** Whether field is required */
  required: boolean;
  /** Field type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Extraction patterns (regex) */
  patterns: RegExp[];
  /** Keywords that indicate this field */
  keywords: {
    es: string[];
    en: string[];
  };
  /** Transform function for extracted value */
  transform?: (value: string) => unknown;
  /** Validation function */
  validate?: (value: unknown) => boolean;
  /** Default value if not extracted */
  defaultValue?: unknown;
  /** Weight for completeness calculation (default 1) */
  weight?: number;
}

/**
 * Universe extractable fields
 */
export const UNIVERSE_EXTRACTABLE_FIELDS: ExtractableField[] = [
  {
    key: 'name',
    name: 'Nombre',
    required: true,
    type: 'string',
    weight: 2,
    patterns: [
      /(?:llama(?:do|rá|r)?|nombre(?:d)?|call(?:ed)?)\s*["']?([^"'\n,]+)["']?/i,
      /["']([A-Z][^"']+)["']/,
      /universo\s+(?:de\s+)?["']?([^"'\n,]+)["']?/i
    ],
    keywords: {
      es: ['nombre', 'llamado', 'llamar', 'llamará', 'titulado'],
      en: ['name', 'called', 'named', 'titled']
    }
  },
  {
    key: 'theme',
    name: 'Tema',
    required: true,
    type: 'string',
    weight: 1.5,
    patterns: [
      /(?:tema|temática|género|tipo|style)\s*(?:de|es|:)?\s*["']?(\w+)["']?/i,
      /\b(fantas[ií]a|sci-?fi|ciencia\s*ficci[oó]n|cyberpunk|steampunk|post-?apocal[ií]ptico|medieval|moderno)\b/i
    ],
    keywords: {
      es: ['fantasía', 'ciencia ficción', 'cyberpunk', 'steampunk', 'medieval', 'moderno', 'post-apocalíptico', 'terror', 'horror'],
      en: ['fantasy', 'sci-fi', 'science fiction', 'cyberpunk', 'steampunk', 'medieval', 'modern', 'post-apocalyptic', 'horror']
    }
  },
  {
    key: 'statCount',
    name: 'Número de stats',
    required: false,
    type: 'number',
    weight: 1,
    patterns: [
      /(\d+)\s*(?:stats?|estad[ií]sticas?|atributos?)/i,
      /(?:stats?|estad[ií]sticas?|atributos?)\s*(?::|son|hay|tendr[áa])?\s*(\d+)/i
    ],
    keywords: {
      es: ['stats', 'estadísticas', 'atributos', 'características'],
      en: ['stats', 'statistics', 'attributes', 'characteristics']
    },
    transform: (val: string) => parseInt(val, 10)
  },
  {
    key: 'statNames',
    name: 'Nombres de stats',
    required: false,
    type: 'array',
    weight: 2,
    patterns: [
      /(?:stats?|estad[ií]sticas?|atributos?)(?:\s*(?:son|:))?\s*([^.]+)/i,
      /(?:fuerza|agilidad|vitalidad|inteligencia|percepci[oó]n|carisma|suerte)/gi
    ],
    keywords: {
      es: ['fuerza', 'agilidad', 'vitalidad', 'inteligencia', 'percepción', 'carisma', 'suerte', 'resistencia', 'destreza'],
      en: ['strength', 'agility', 'vitality', 'intelligence', 'perception', 'charisma', 'luck', 'endurance', 'dexterity']
    },
    transform: (val: string) => val.split(/[,;y&and]+/).map(s => s.trim()).filter(s => s.length > 0)
  },
  {
    key: 'rankSystem',
    name: 'Sistema de rangos',
    required: false,
    type: 'string',
    weight: 1.5,
    patterns: [
      /(?:rangos?|niveles?|ranks?)\s*(?:de|desde|:)?\s*([A-Z])\s*(?:a|hasta|to|-)\s*([A-Z]+)/i,
      /\b(E|D|C|B|A|S|SS|SSS)\b.*\b(E|D|C|B|A|S|SS|SSS)\b/i,
      /(?:sistema\s+de\s+)?(?:rangos?|niveles?)\s+(?:estilo\s+)?(?:solo\s+leveling|d&d|dnd)/i
    ],
    keywords: {
      es: ['rangos', 'niveles', 'rango E', 'rango S', 'SSS', 'solo leveling'],
      en: ['ranks', 'levels', 'rank E', 'rank S', 'SSS', 'solo leveling']
    }
  },
  {
    key: 'initialPoints',
    name: 'Puntos iniciales',
    required: false,
    type: 'number',
    weight: 0.5,
    patterns: [
      /(\d+)\s*puntos?\s*(?:iniciales?|para\s+repartir|base)/i,
      /(?:puntos?\s+iniciales?|starting\s+points?)\s*(?::|de|son)?\s*(\d+)/i
    ],
    keywords: {
      es: ['puntos iniciales', 'puntos base', 'puntos para repartir'],
      en: ['initial points', 'starting points', 'base points']
    },
    transform: (val: string) => parseInt(val, 10),
    defaultValue: 60
  },
  {
    key: 'description',
    name: 'Descripción',
    required: false,
    type: 'string',
    weight: 1,
    patterns: [
      /(?:descripci[oó]n|trata\s+de|es\s+sobre|about)\s*(?::|es)?\s*["']?(.{20,})["']?/i
    ],
    keywords: {
      es: ['descripción', 'trata de', 'es sobre', 'acerca de'],
      en: ['description', 'about', 'is about', 'concerning']
    }
  }
];

/**
 * Character extractable fields
 */
export const CHARACTER_EXTRACTABLE_FIELDS: ExtractableField[] = [
  {
    key: 'name',
    name: 'Nombre',
    required: true,
    type: 'string',
    weight: 2,
    patterns: [
      /(?:llama(?:do|rá|r)?|nombre(?:d)?|call(?:ed)?)\s*["']?([^"'\n,]+)["']?/i,
      /["']([A-Z][^"']+)["']/,
      /personaje\s+(?:llamado\s+)?["']?([^"'\n,]+)["']?/i
    ],
    keywords: {
      es: ['nombre', 'llamado', 'llamar'],
      en: ['name', 'called', 'named']
    }
  },
  {
    key: 'class',
    name: 'Clase/Rol',
    required: false,
    type: 'string',
    weight: 1.5,
    patterns: [
      /(?:es\s+un[oa]?|clase|rol|type)\s*["']?(\w+)["']?/i,
      /\b(guerrero|mago|arquero|asesino|tanque|sanador|paladín|nigromante|cazador|druida)\b/i,
      /\b(warrior|mage|archer|assassin|tank|healer|paladin|necromancer|hunter|druid)\b/i
    ],
    keywords: {
      es: ['guerrero', 'mago', 'arquero', 'asesino', 'tanque', 'sanador', 'cazador'],
      en: ['warrior', 'mage', 'archer', 'assassin', 'tank', 'healer', 'hunter']
    }
  },
  {
    key: 'backstory',
    name: 'Historia',
    required: false,
    type: 'string',
    weight: 1,
    patterns: [
      /(?:historia|trasfondo|backstory|pasado)\s*(?::|es)?\s*["']?(.{30,})["']?/i
    ],
    keywords: {
      es: ['historia', 'trasfondo', 'pasado', 'origen'],
      en: ['history', 'backstory', 'past', 'origin']
    }
  },
  {
    key: 'specialty',
    name: 'Especialidad',
    required: false,
    type: 'string',
    weight: 1,
    patterns: [
      /(?:especializa|destaca|enfoca|specialty)\s*(?:en|:)?\s*["']?(\w+)["']?/i,
      /\b(combate|magia|sigilo|liderazgo|curación|tanqueo)\b/i
    ],
    keywords: {
      es: ['especializa', 'destaca', 'enfoca', 'combate', 'magia', 'sigilo'],
      en: ['specializes', 'excels', 'focuses', 'combat', 'magic', 'stealth']
    }
  },
  {
    key: 'startingLevel',
    name: 'Nivel inicial',
    required: false,
    type: 'string',
    weight: 0.5,
    patterns: [
      /(?:nivel|level|rango|rank)\s*(?:inicial|starting)?\s*(?::|es|de)?\s*(\w+)/i,
      /(?:es\s+un\s+)?(?:novato|veterano|experto|maestro|leyenda)/i
    ],
    keywords: {
      es: ['novato', 'principiante', 'veterano', 'experto', 'maestro'],
      en: ['novice', 'beginner', 'veteran', 'expert', 'master']
    }
  }
];

/**
 * Default agentic actions available in the system
 */
export const DEFAULT_AGENTIC_ACTIONS: AgenticAction[] = [
  {
    id: 'upload_image',
    type: 'image_upload',
    label: 'Subir imagen',
    icon: 'image-outline',
    component: 'button',
    visibility: 'contextual',
    color: 'tertiary',
    priority: 80,
    showCondition: (ctx) =>
      ctx.currentPhase === 'appearance' ||
      ctx.mentionedImage ||
      ctx.filledFields.length >= 3
  },
  {
    id: 'skip_phase',
    type: 'skip_phase',
    label: 'Saltar fase',
    icon: 'arrow-forward-outline',
    component: 'chip',
    visibility: 'contextual',
    color: 'warning',
    priority: 50,
    showCondition: (ctx) =>
      ctx.completenessScore >= 50 &&
      ctx.phaseIndex < ctx.totalPhases - 1
  },
  {
    id: 'go_to_preview',
    type: 'confirm_preview',
    label: 'Ver preview',
    icon: 'eye-outline',
    component: 'button',
    visibility: 'contextual',
    color: 'success',
    priority: 90,
    showCondition: (ctx) =>
      ctx.completenessScore >= 70 &&
      !ctx.isConfirmationMode
  },
  {
    id: 'confirm_save',
    type: 'confirm_preview',
    label: 'Confirmar y guardar',
    icon: 'checkmark-circle-outline',
    component: 'button',
    visibility: 'contextual',
    color: 'success',
    priority: 100,
    showCondition: (ctx) =>
      ctx.isConfirmationMode &&
      ctx.validationErrors.length === 0
  },
  {
    id: 'edit_entity',
    type: 'edit_field',
    label: 'Ajustar',
    icon: 'create-outline',
    component: 'chip',
    visibility: 'contextual',
    color: 'primary',
    priority: 70,
    showCondition: (ctx) => ctx.hasGeneratedEntity
  },
  {
    id: 'regenerate',
    type: 'regenerate',
    label: 'Regenerar',
    icon: 'refresh-outline',
    component: 'chip',
    visibility: 'contextual',
    color: 'warning',
    priority: 60,
    showCondition: (ctx) => ctx.hasGeneratedEntity
  },
  {
    id: 'undo_last',
    type: 'undo',
    label: 'Deshacer',
    icon: 'arrow-undo-outline',
    component: 'chip',
    visibility: 'contextual',
    color: 'medium' as any,
    priority: 30,
    showCondition: (ctx) => ctx.filledFields.length > 0
  }
];

/**
 * Helper function to evaluate visible actions based on context
 */
export function getVisibleActions(
  actions: AgenticAction[],
  context: AgenticContext
): AgenticAction[] {
  return actions
    .filter(action => {
      if (action.visibility === 'hidden') return false;
      if (action.visibility === 'always') return true;
      if (action.visibility === 'contextual' && action.showCondition) {
        return action.showCondition(context);
      }
      return false;
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Helper to create an agentic context from current state
 */
export function createAgenticContext(
  mode: 'idle' | 'universe' | 'character' | 'action',
  phaseState: DynamicPhaseState | null,
  entity: Partial<Universe> | Partial<Character> | null,
  options: {
    availableUniverses?: Universe[];
    selectedUniverseId?: string | null;
    lastUserMessage?: string;
    isConfirmationMode?: boolean;
    validationWarnings?: string[];
    validationErrors?: string[];
  } = {}
): AgenticContext {
  const filledFields = phaseState?.filledFields || [];

  return {
    mode,
    currentPhase: phaseState?.currentPhaseId || '',
    phaseIndex: phaseState?.currentPhaseIndex || 0,
    totalPhases: phaseState?.totalPhases || 0,
    completenessScore: phaseState?.completenessScore || 0,
    filledFields,
    pendingFields: phaseState?.pendingFields || [],
    hasGeneratedEntity: entity !== null,
    generatedEntity: entity,
    availableUniverses: options.availableUniverses || [],
    selectedUniverseId: options.selectedUniverseId || null,
    mentionedImage: /imagen|image|foto|picture|subir|upload/i.test(options.lastUserMessage || ''),
    isConfirmationMode: options.isConfirmationMode || false,
    lastUserMessage: options.lastUserMessage || '',
    validationWarnings: options.validationWarnings || [],
    validationErrors: options.validationErrors || []
  };
}
