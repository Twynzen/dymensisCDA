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
