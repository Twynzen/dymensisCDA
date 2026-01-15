export interface StatDefinition {
  name: string;
  abbreviation: string;
  icon: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
  category: 'primary' | 'secondary' | 'derived';
  color: string;
  isDerived?: boolean;
  formula?: string;
}

export interface ProgressionRule {
  id: string;
  keywords: string[];
  affectedStats: string[];
  maxChangePerAction: number;
  description: string;
}

export interface AwakeningLevel {
  level: string;
  threshold: number;
}

export interface AwakeningSystem {
  enabled: boolean;
  levels: string[];
  thresholds: number[];
}

export interface Universe {
  id?: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
  statDefinitions: Record<string, StatDefinition>;
  progressionRules: ProgressionRule[];
  awakeningSystem?: AwakeningSystem;
}

export const DEFAULT_STAT_DEFINITIONS: Record<string, StatDefinition> = {
  strength: {
    name: 'Fuerza',
    abbreviation: 'STR',
    icon: 'barbell-outline',
    minValue: 1,
    maxValue: 999,
    defaultValue: 10,
    category: 'primary',
    color: '#FF5722'
  },
  agility: {
    name: 'Agilidad',
    abbreviation: 'AGI',
    icon: 'flash-outline',
    minValue: 1,
    maxValue: 999,
    defaultValue: 10,
    category: 'primary',
    color: '#4CAF50'
  },
  vitality: {
    name: 'Vitalidad',
    abbreviation: 'VIT',
    icon: 'heart-outline',
    minValue: 1,
    maxValue: 999,
    defaultValue: 10,
    category: 'primary',
    color: '#E91E63'
  },
  intelligence: {
    name: 'Inteligencia',
    abbreviation: 'INT',
    icon: 'bulb-outline',
    minValue: 1,
    maxValue: 999,
    defaultValue: 10,
    category: 'primary',
    color: '#2196F3'
  },
  perception: {
    name: 'Percepción',
    abbreviation: 'PER',
    icon: 'eye-outline',
    minValue: 1,
    maxValue: 999,
    defaultValue: 10,
    category: 'primary',
    color: '#9C27B0'
  },
  sense: {
    name: 'Sentido',
    abbreviation: 'SEN',
    icon: 'pulse-outline',
    minValue: 1,
    maxValue: 999,
    defaultValue: 10,
    category: 'primary',
    color: '#00BCD4'
  }
};

export const DEFAULT_PROGRESSION_RULES: ProgressionRule[] = [
  {
    id: 'physical_training',
    keywords: ['entrenar', 'correr', 'pelear', 'levantar', 'golpear', 'ejercicio', 'flexiones', 'abdominales'],
    affectedStats: ['strength', 'vitality', 'agility'],
    maxChangePerAction: 3,
    description: 'Acciones físicas aumentan stats físicos'
  },
  {
    id: 'mental_training',
    keywords: ['estudiar', 'meditar', 'analizar', 'planear', 'leer', 'magia', 'hechizo', 'investigar'],
    affectedStats: ['intelligence', 'perception', 'sense'],
    maxChangePerAction: 2,
    description: 'Acciones mentales aumentan stats mentales'
  },
  {
    id: 'combat_experience',
    keywords: ['combate', 'batalla', 'dungeon', 'monstruo', 'boss', 'raid', 'derrotar', 'enemigo'],
    affectedStats: ['strength', 'agility', 'vitality', 'intelligence'],
    maxChangePerAction: 5,
    description: 'Combate real da más experiencia'
  },
  {
    id: 'stealth_actions',
    keywords: ['esconderse', 'sigilo', 'robar', 'espiar', 'infiltrar', 'evadir', 'esquivar'],
    affectedStats: ['agility', 'perception', 'sense'],
    maxChangePerAction: 3,
    description: 'Acciones de sigilo mejoran agilidad y percepción'
  }
];

export const DEFAULT_AWAKENING_SYSTEM: AwakeningSystem = {
  enabled: true,
  levels: ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'],
  thresholds: [0, 50, 100, 200, 400, 800, 1500, 3000]
};
