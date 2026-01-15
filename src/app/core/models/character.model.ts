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
  createdAt: Date;
  updatedAt: Date;
  avatar: CharacterAvatar;
  stats: Record<string, number>;
  derivedStats?: Record<string, number>;
  progression: CharacterProgression;
  sharing: CharacterSharing;
}

export interface CharacterSkill {
  id?: string;
  name: string;
  description: string;
  level: number;
  acquiredAt: Date;
  category: string;
  cooldown?: number;
  manaCost?: number;
  icon?: string;
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
  defaultStats: Record<string, number>
): Character {
  return {
    name,
    universeId,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
    avatar: {
      photoUrl: null,
      backgroundColor: '#1a1a2e'
    },
    stats: { ...defaultStats },
    progression: {
      level: 1,
      experience: 0,
      awakening: 'E'
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
