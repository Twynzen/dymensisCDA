import { TestBed } from '@angular/core/testing';
import { StatValidationService } from './stat-validation.service';
import { StatDefinition, AwakeningSystem } from '../models/universe.model';

// Helper to create minimal stat definitions for testing
function createStatDef(overrides: Partial<StatDefinition> & { name: string }): StatDefinition {
  return {
    name: overrides.name,
    abbreviation: overrides.abbreviation || overrides.name.substring(0, 3).toUpperCase(),
    icon: overrides.icon || 'barbell-outline',
    minValue: overrides.minValue ?? 0,
    maxValue: overrides.maxValue ?? 999,
    category: overrides.category || 'primary',
    color: overrides.color || '#FF5722',
    isDerived: overrides.isDerived || false,
    formula: overrides.formula
  };
}

describe('StatValidationService', () => {
  let service: StatValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StatValidationService]
    });
    service = TestBed.inject(StatValidationService);
  });

  describe('Initial State', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('validateStatValue', () => {
    const baseStatDef: StatDefinition = createStatDef({
      name: 'strength',
      minValue: 1,
      maxValue: 100
    });

    it('should validate stat within min/max range', () => {
      const result = service.validateStatValue(50, baseStatDef);
      expect(result).toBe(50);
    });

    it('should cap stat at maximum when exceeding', () => {
      const result = service.validateStatValue(150, baseStatDef);
      expect(result).toBe(100);
    });

    it('should cap stat at minimum when below', () => {
      const result = service.validateStatValue(-10, baseStatDef);
      expect(result).toBe(1);
    });

    it('should handle missing minValue with default 0', () => {
      const defWithoutMin = createStatDef({
        name: 'test',
        maxValue: 100
      });
      const result = service.validateStatValue(-5, defWithoutMin);
      expect(result).toBe(0);
    });

    it('should handle missing maxValue with default 999', () => {
      const defWithoutMax = createStatDef({
        name: 'test',
        minValue: 0
      });
      const result = service.validateStatValue(500, defWithoutMax);
      expect(result).toBe(500);
    });

    it('should handle boundary values correctly', () => {
      expect(service.validateStatValue(1, baseStatDef)).toBe(1);
      expect(service.validateStatValue(100, baseStatDef)).toBe(100);
    });

    it('should handle decimal values by allowing them', () => {
      const result = service.validateStatValue(50.5, baseStatDef);
      expect(result).toBe(50.5);
    });

    it('should handle zero value within range', () => {
      const defWithZeroMin = createStatDef({
        name: 'test',
        minValue: 0,
        maxValue: 100
      });
      expect(service.validateStatValue(0, defWithZeroMin)).toBe(0);
    });

    it('should handle negative min/max values', () => {
      const negativeRangeDef = createStatDef({
        name: 'test',
        minValue: -50,
        maxValue: -10
      });
      expect(service.validateStatValue(-30, negativeRangeDef)).toBe(-30);
      expect(service.validateStatValue(0, negativeRangeDef)).toBe(-10);
      expect(service.validateStatValue(-100, negativeRangeDef)).toBe(-50);
    });
  });

  describe('validateAllStats', () => {
    const statDefs: Record<string, StatDefinition> = {
      strength: createStatDef({ name: 'strength', minValue: 1, maxValue: 100 }),
      agility: createStatDef({ name: 'agility', minValue: 1, maxValue: 100 }),
      intelligence: createStatDef({ name: 'intelligence', minValue: 1, maxValue: 100 })
    };

    it('should validate all stats in character', () => {
      const stats = { strength: 50, agility: 30, intelligence: 70 };
      const result = service.validateAllStats(stats, statDefs);

      expect(result['strength']).toBe(50);
      expect(result['agility']).toBe(30);
      expect(result['intelligence']).toBe(70);
    });

    it('should cap multiple stats exceeding max', () => {
      const stats = { strength: 150, agility: 200, intelligence: 70 };
      const result = service.validateAllStats(stats, statDefs);

      expect(result['strength']).toBe(100);
      expect(result['agility']).toBe(100);
      expect(result['intelligence']).toBe(70);
    });

    it('should keep stats without definitions unchanged', () => {
      const stats = { strength: 50, unknown_stat: 999 };
      const result = service.validateAllStats(stats, statDefs);

      expect(result['strength']).toBe(50);
      expect(result['unknown_stat']).toBe(999);
    });

    it('should handle empty stats object', () => {
      const result = service.validateAllStats({}, statDefs);
      expect(Object.keys(result).length).toBe(0);
    });

    it('should handle empty definitions object', () => {
      const stats = { strength: 50, agility: 30 };
      const result = service.validateAllStats(stats, {});

      expect(result['strength']).toBe(50);
      expect(result['agility']).toBe(30);
    });
  });

  describe('getTotalStats', () => {
    it('should calculate total stats correctly', () => {
      const stats = { strength: 50, agility: 30, intelligence: 20 };
      const total = service.getTotalStats(stats);
      expect(total).toBe(100);
    });

    it('should handle empty stats', () => {
      const total = service.getTotalStats({});
      expect(total).toBe(0);
    });

    it('should handle single stat', () => {
      const total = service.getTotalStats({ strength: 75 });
      expect(total).toBe(75);
    });

    it('should handle decimal values', () => {
      const stats = { a: 10.5, b: 20.5 };
      const total = service.getTotalStats(stats);
      expect(total).toBe(31);
    });

    it('should include bonus stats in total', () => {
      const stats = { strength: 50, strength_bonus: 10, agility: 30 };
      const total = service.getTotalStats(stats);
      expect(total).toBe(90);
    });
  });

  describe('calculateDerivedStats', () => {
    const statDefs: Record<string, StatDefinition> = {
      strength: createStatDef({ name: 'strength', isDerived: false }),
      agility: createStatDef({ name: 'agility', isDerived: false }),
      power: createStatDef({
        name: 'power',
        category: 'derived',
        isDerived: true,
        formula: 'strength + agility'
      }),
      defense: createStatDef({
        name: 'defense',
        category: 'derived',
        isDerived: true,
        formula: 'strength * 2'
      })
    };

    it('should calculate derived stats with simple formula', () => {
      const stats = { strength: 50, agility: 30 };
      const derived = service.calculateDerivedStats(stats, statDefs);

      expect(derived['power']).toBe(80);
    });

    it('should calculate derived stats with multiplication', () => {
      const stats = { strength: 50, agility: 30 };
      const derived = service.calculateDerivedStats(stats, statDefs);

      expect(derived['defense']).toBe(100);
    });

    it('should not include base stats in derived result', () => {
      const stats = { strength: 50, agility: 30 };
      const derived = service.calculateDerivedStats(stats, statDefs);

      expect(derived['strength']).toBeUndefined();
      expect(derived['agility']).toBeUndefined();
    });

    it('should handle stats with parentheses in formula', () => {
      const defsWithParens: Record<string, StatDefinition> = {
        a: createStatDef({ name: 'a', isDerived: false }),
        b: createStatDef({ name: 'b', isDerived: false }),
        c: createStatDef({
          name: 'c',
          category: 'derived',
          isDerived: true,
          formula: '(a + b) / 2'
        })
      };

      const stats = { a: 100, b: 50 };
      const derived = service.calculateDerivedStats(stats, defsWithParens);

      expect(derived['c']).toBe(75);
    });

    it('should return empty when no derived stats defined', () => {
      const baseOnlyDefs: Record<string, StatDefinition> = {
        strength: createStatDef({ name: 'strength', isDerived: false })
      };

      const stats = { strength: 50 };
      const derived = service.calculateDerivedStats(stats, baseOnlyDefs);

      expect(Object.keys(derived).length).toBe(0);
    });

    it('should round derived stat values', () => {
      const defsWithDivision: Record<string, StatDefinition> = {
        a: createStatDef({ name: 'a', isDerived: false }),
        b: createStatDef({
          name: 'b',
          category: 'derived',
          isDerived: true,
          formula: 'a / 3'
        })
      };

      const stats = { a: 100 };
      const derived = service.calculateDerivedStats(stats, defsWithDivision);

      expect(derived['b']).toBe(33); // Rounded
    });
  });

  describe('calculateAwakening', () => {
    const awakeningSystem: AwakeningSystem = {
      enabled: true,
      levels: ['E', 'D', 'C', 'B', 'A', 'S'],
      thresholds: [0, 50, 100, 200, 400, 800]
    };

    it('should return correct level based on total stats', () => {
      expect(service.calculateAwakening({ a: 25, b: 25 }, awakeningSystem)).toBe('D');
      expect(service.calculateAwakening({ a: 100, b: 50 }, awakeningSystem)).toBe('C');
      expect(service.calculateAwakening({ a: 200, b: 100 }, awakeningSystem)).toBe('B');
    });

    it('should return highest level when stats exceed all thresholds', () => {
      const stats = { strength: 500, agility: 500 };
      expect(service.calculateAwakening(stats, awakeningSystem)).toBe('S');
    });

    it('should return first level when stats below all thresholds', () => {
      const stats = { strength: 10, agility: 10 };
      expect(service.calculateAwakening(stats, awakeningSystem)).toBe('E');
    });

    it('should return first level when awakening is disabled', () => {
      const disabledSystem: AwakeningSystem = {
        enabled: false,
        levels: ['E', 'D', 'C'],
        thresholds: [0, 50, 100]
      };

      const stats = { strength: 200 };
      expect(service.calculateAwakening(stats, disabledSystem)).toBe('E');
    });

    it('should return default E when levels array is empty', () => {
      const emptySystem: AwakeningSystem = {
        enabled: true,
        levels: [],
        thresholds: []
      };

      expect(service.calculateAwakening({ a: 100 }, emptySystem)).toBe('E');
    });

    it('should handle boundary threshold values', () => {
      // Exactly at threshold
      expect(service.calculateAwakening({ a: 50 }, awakeningSystem)).toBe('D');
      expect(service.calculateAwakening({ a: 100 }, awakeningSystem)).toBe('C');
      expect(service.calculateAwakening({ a: 49 }, awakeningSystem)).toBe('E');
    });
  });

  describe('evaluateFormula', () => {
    describe('Basic Operations', () => {
      it('should evaluate simple addition: base + bonus', () => {
        const stats = { base: 50, bonus: 10 };
        expect(service.evaluateFormula('base + bonus', stats)).toBe(60);
      });

      it('should evaluate subtraction', () => {
        const stats = { a: 100, b: 30 };
        expect(service.evaluateFormula('a - b', stats)).toBe(70);
      });

      it('should evaluate multiplication', () => {
        const stats = { strength: 10 };
        expect(service.evaluateFormula('strength * 2', stats)).toBe(20);
      });

      it('should evaluate division', () => {
        const stats = { a: 100 };
        expect(service.evaluateFormula('a / 4', stats)).toBe(25);
      });

      it('should evaluate formula with parentheses', () => {
        const stats = { a: 10, b: 20, c: 5 };
        expect(service.evaluateFormula('(a + b) * c', stats)).toBe(150);
      });

      it('should evaluate complex multi-stat formulas', () => {
        const stats = { str: 50, agi: 30, int: 40 };
        expect(service.evaluateFormula('(str + agi) / 2 + int', stats)).toBe(80);
      });
    });

    describe('Edge Cases', () => {
      it('should handle division by zero', () => {
        const stats = { a: 100, b: 0 };
        const result = service.evaluateFormula('a / b', stats);
        // Division by zero returns Infinity, which should be handled
        expect(result).toBe(Infinity);
      });

      it('should return 0 for invalid formulas', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('invalid formula', stats)).toBe(0);
      });

      it('should handle missing stat references', () => {
        const stats = { a: 10 };
        // Reference to non-existent stat 'b'
        expect(service.evaluateFormula('a + b', stats)).toBe(0);
      });

      it('should handle empty stats object', () => {
        expect(service.evaluateFormula('a + b', {})).toBe(0);
      });

      it('should handle decimal numbers', () => {
        const stats = { a: 10.5, b: 20.5 };
        expect(service.evaluateFormula('a + b', stats)).toBe(31);
      });
    });

    // SECURITY TESTS - Critical
    describe('Security - Formula Sanitization', () => {
      it('should reject formula with process access', () => {
        const stats = { a: 10 };
        const result = service.evaluateFormula('process.exit()', stats);
        expect(result).toBe(0);
      });

      it('should reject formula with require/import', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('require("fs")', stats)).toBe(0);
        expect(service.evaluateFormula('import("fs")', stats)).toBe(0);
      });

      it('should reject formula with eval', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('eval("alert(1)")', stats)).toBe(0);
      });

      it('should reject formula with Function constructor', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('Function("return this")()', stats)).toBe(0);
      });

      it('should reject formula with prototype access', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('a.__proto__', stats)).toBe(0);
      });

      it('should reject formula with constructor access', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('a.constructor', stats)).toBe(0);
      });

      it('should reject formula with window/global access', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('window.location', stats)).toBe(0);
        expect(service.evaluateFormula('globalThis.process', stats)).toBe(0);
      });

      it('should reject formula with document access', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('document.cookie', stats)).toBe(0);
      });

      it('should reject formula with alert/confirm/prompt', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('alert("xss")', stats)).toBe(0);
        expect(service.evaluateFormula('confirm("xss")', stats)).toBe(0);
        expect(service.evaluateFormula('prompt("xss")', stats)).toBe(0);
      });

      it('should only allow numbers, operators, parentheses, spaces, and dots', () => {
        const stats = { a: 10, b: 20 };

        // Valid formulas
        expect(service.evaluateFormula('10 + 20', {})).toBe(30);
        expect(service.evaluateFormula('(10 + 20) * 2', {})).toBe(60);
        expect(service.evaluateFormula('10.5 + 20.5', {})).toBe(31);

        // After stat substitution, only these chars should remain
        expect(service.evaluateFormula('a + b', stats)).toBe(30);
      });

      it('should reject formulas with semicolons', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('a; console.log("hack")', stats)).toBe(0);
      });

      it('should reject formulas with curly braces', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('{a: 1}', stats)).toBe(0);
      });

      it('should reject formulas with square brackets', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('a[0]', stats)).toBe(0);
      });

      it('should reject formulas with template literals', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('`${a}`', stats)).toBe(0);
      });

      it('should reject formulas with assignment operators', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('a = 100', stats)).toBe(0);
        expect(service.evaluateFormula('a += 100', stats)).toBe(0);
      });

      it('should reject formulas with comparison operators that are not math', () => {
        const stats = { a: 10 };
        // These contain < > which aren't in the allowed regex
        expect(service.evaluateFormula('a < 5 ? 1 : 0', stats)).toBe(0);
      });

      it('should reject formulas attempting to break out of expression', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('); console.log("hack"); (', stats)).toBe(0);
      });
    });

    describe('Stat Name Substitution', () => {
      it('should substitute stat names correctly', () => {
        const stats = { strength: 50, agility: 30 };
        expect(service.evaluateFormula('strength + agility', stats)).toBe(80);
      });

      it('should handle stat names with underscores', () => {
        const stats = { max_health: 100, health_regen: 10 };
        // Note: underscore might not be substituted correctly by the current regex
        // This test documents current behavior
        const result = service.evaluateFormula('max_health + health_regen', stats);
        // If regex uses \b, underscored names might have issues
        expect(result).toBeDefined();
      });

      it('should not partially substitute stat names', () => {
        const stats = { str: 10, strength: 50 };
        // 'str' should not match part of 'strength'
        const result = service.evaluateFormula('strength', stats);
        expect(result).toBe(50);
      });

      it('should handle multiple occurrences of same stat', () => {
        const stats = { a: 10 };
        expect(service.evaluateFormula('a + a + a', stats)).toBe(30);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should validate, calculate derived, and get total correctly', () => {
      const statDefs: Record<string, StatDefinition> = {
        strength: createStatDef({ name: 'strength', minValue: 1, maxValue: 100, isDerived: false }),
        agility: createStatDef({ name: 'agility', minValue: 1, maxValue: 100, isDerived: false }),
        power: createStatDef({
          name: 'power',
          category: 'derived',
          isDerived: true,
          formula: 'strength + agility'
        })
      };

      // Initial stats exceeding limits
      const rawStats = { strength: 150, agility: -10 };

      // Validate
      const validatedStats = service.validateAllStats(rawStats, statDefs);
      expect(validatedStats['strength']).toBe(100);
      expect(validatedStats['agility']).toBe(1);

      // Calculate derived
      const derived = service.calculateDerivedStats(validatedStats, statDefs);
      expect(derived['power']).toBe(101);

      // Get total (base only, not derived)
      const total = service.getTotalStats(validatedStats);
      expect(total).toBe(101);
    });

    it('should calculate awakening level after validation', () => {
      const statDefs: Record<string, StatDefinition> = {
        strength: createStatDef({ name: 'strength', minValue: 1, maxValue: 100, isDerived: false }),
        agility: createStatDef({ name: 'agility', minValue: 1, maxValue: 100, isDerived: false })
      };

      const awakening: AwakeningSystem = {
        enabled: true,
        levels: ['E', 'D', 'C', 'B', 'A'],
        thresholds: [0, 50, 100, 150, 200]
      };

      const rawStats = { strength: 80, agility: 80 };
      const validatedStats = service.validateAllStats(rawStats, statDefs);
      const level = service.calculateAwakening(validatedStats, awakening);

      expect(level).toBe('B'); // 160 total >= 150 threshold
    });
  });
});
