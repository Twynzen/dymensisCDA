import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statModifier',
  standalone: true
})
export class StatModifierPipe implements PipeTransform {
  /**
   * Converts a stat value to a D&D-style modifier
   * Formula: floor((stat - 10) / 2)
   */
  transform(value: number, format: 'number' | 'signed' = 'signed'): string | number {
    const modifier = Math.floor((value - 10) / 2);

    if (format === 'number') {
      return modifier;
    }

    // Signed format
    if (modifier >= 0) {
      return `+${modifier}`;
    }
    return modifier.toString();
  }
}

@Pipe({
  name: 'statPercentage',
  standalone: true
})
export class StatPercentagePipe implements PipeTransform {
  /**
   * Calculates percentage of stat relative to max
   */
  transform(value: number, max: number = 100, decimals: number = 0): string {
    if (max <= 0) return '0%';
    const percentage = (value / max) * 100;
    return `${percentage.toFixed(decimals)}%`;
  }
}

@Pipe({
  name: 'abbreviateStat',
  standalone: true
})
export class AbbreviateStatPipe implements PipeTransform {
  private readonly abbreviations: Record<string, string> = {
    strength: 'STR',
    agility: 'AGI',
    vitality: 'VIT',
    intelligence: 'INT',
    perception: 'PER',
    sense: 'SEN',
    dexterity: 'DEX',
    constitution: 'CON',
    wisdom: 'WIS',
    charisma: 'CHA',
    luck: 'LCK',
    endurance: 'END',
    mana: 'MP',
    health: 'HP',
    stamina: 'STA'
  };

  transform(statName: string): string {
    const lower = statName.toLowerCase();
    return this.abbreviations[lower] || statName.substring(0, 3).toUpperCase();
  }
}

@Pipe({
  name: 'formatLargeNumber',
  standalone: true
})
export class FormatLargeNumberPipe implements PipeTransform {
  transform(value: number): string {
    if (value < 1000) return value.toString();
    if (value < 1000000) return `${(value / 1000).toFixed(1)}K`;
    if (value < 1000000000) return `${(value / 1000000).toFixed(1)}M`;
    return `${(value / 1000000000).toFixed(1)}B`;
  }
}
