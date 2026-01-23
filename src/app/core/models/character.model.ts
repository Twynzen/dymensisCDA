export interface CharacterAvatar {
  photoUrl: string | null;
  backgroundColor: string;
}

export interface CharacterProgression {
  level: number;
  experience: number;
  awakening: string;
  title?: string;
}

export interface CharacterSharing {
  isShared: boolean;
  shareToken: string | null;
  shareExpiration: Date | null;
}

export interface Character {
  id?: string;
  name: string;
  universeId: string;
  ownerId: string;
  raceId?: string;
  createdAt: Date;
  updatedAt: Date;
  avatar: CharacterAvatar;
  stats: Record<string, number>;
  baseStats?: Record<string, number>; // Stats before race modifiers
  bonusStats?: Record<string, number>; // Points distributed manually by user
  derivedStats?: Record<string, number>;
  // Sistema de crecimiento: puntos ganados por evolución (separados de stats base)
  // Solo se usa cuando el universo tiene hasGrowthSystem: true
  growthStats?: Record<string, number>;
  progression: CharacterProgression;
  sharing: CharacterSharing;
  // Optional character details
  description?: string;
  backstory?: string;
  personalityTraits?: string[];
}

export interface SkillEffect {
  description: string;
  mechanicValue?: string; // Ej: "+1 de daño", "2 turnos", "15 metros"
}

export interface CharacterSkill {
  id?: string;
  // Identidad
  name: string;              // Ej: "Monóculo de Escaneo Analógico K-1"
  subtitle?: string;         // Ej: "El Ojo del Ingeniero"
  icon?: string;             // Emoji o nombre de ion-icon
  quote?: string;            // Ej: "Todo tiene un punto débil..."

  // Contenido
  description: string;       // Descripción detallada
  effects?: SkillEffect[];   // Lista de efectos
  limitations?: string[];    // Limitaciones

  // Metadata
  category: string;          // Ej: "Equipo", "Magia", "Pasiva", "Activa"
  level: number;
  acquiredAt: Date;

  // Opcionales para sistemas de combate
  cooldown?: number;         // Tiempo de recarga en turnos
  manaCost?: number;         // Costo de maná/energía
  usesPerDay?: number;       // Usos por día
}

export interface StatChange {
  stat: string;
  change: number;
  reason?: string;
}

export interface AIAnalysis {
  suggestedChanges: StatChange[];
  confidence: number;
}

export interface HistoryEntry {
  id?: string;
  action: string;
  timestamp: Date;
  aiAnalysis: AIAnalysis;
  appliedChanges: StatChange[];
  approved: boolean;
}

export function createDefaultCharacter(
  name: string,
  universeId: string,
  ownerId: string,
  defaultStats: Record<string, number>,
  options?: {
    raceId?: string;
    baseStats?: Record<string, number>;
    bonusStats?: Record<string, number>;
    derivedStats?: Record<string, number>;
    growthStats?: Record<string, number>;
    description?: string;
    backstory?: string;
    personalityTraits?: string[];
    awakening?: string;
    avatar?: CharacterAvatar;
  }
): Character {
  return {
    name,
    universeId,
    ownerId,
    raceId: options?.raceId,
    createdAt: new Date(),
    updatedAt: new Date(),
    avatar: options?.avatar ?? {
      photoUrl: null,
      backgroundColor: '#1a1a2e'
    },
    stats: { ...defaultStats },
    baseStats: options?.baseStats,
    bonusStats: options?.bonusStats,
    derivedStats: options?.derivedStats,
    growthStats: options?.growthStats,
    description: options?.description,
    backstory: options?.backstory,
    personalityTraits: options?.personalityTraits,
    progression: {
      level: 1,
      experience: 0,
      awakening: options?.awakening ?? 'E'
    },
    sharing: {
      isShared: false,
      shareToken: null,
      shareExpiration: null
    }
  };
}

export function calculateAwakening(
  stats: Record<string, number>,
  thresholds: number[],
  levels: string[]
): string {
  const totalStats = Object.values(stats).reduce((sum, val) => sum + val, 0);

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalStats >= thresholds[i]) {
      return levels[i];
    }
  }

  return levels[0];
}

/**
 * Calcula el valor total de un stat específico (base + crecimiento)
 * @param character El personaje
 * @param statKey La clave del stat
 * @returns El valor total del stat
 */
export function calculateTotalStat(
  character: Character,
  statKey: string
): number {
  const baseValue = character.stats[statKey] ?? 0;
  const growthValue = character.growthStats?.[statKey] ?? 0;
  return baseValue + growthValue;
}

/**
 * Calcula todos los stats totales del personaje (base + crecimiento)
 * @param character El personaje
 * @returns Record con el valor total de cada stat
 */
export function calculateAllTotalStats(
  character: Character
): Record<string, number> {
  const result: Record<string, number> = {};
  const allStatKeys = new Set([
    ...Object.keys(character.stats),
    ...Object.keys(character.growthStats ?? {})
  ]);

  allStatKeys.forEach(key => {
    result[key] = calculateTotalStat(character, key);
  });

  return result;
}

/**
 * Obtiene el desglose de un stat (base y crecimiento separados)
 * @param character El personaje
 * @param statKey La clave del stat
 * @returns Objeto con base, growth y total
 */
export function getStatBreakdown(
  character: Character,
  statKey: string
): { base: number; growth: number; total: number } {
  const base = character.stats[statKey] ?? 0;
  const growth = character.growthStats?.[statKey] ?? 0;
  return { base, growth, total: base + growth };
}
