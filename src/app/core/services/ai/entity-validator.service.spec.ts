import { TestBed } from '@angular/core/testing';
import { EntityValidatorService } from './entity-validator.service';
import { FormSchemaService } from './form-schema.service';
import { ValidationContext, FIREBASE_DOC_SIZE_LIMIT } from '../../models';
import { Universe } from '../../models/universe.model';

describe('EntityValidatorService', () => {
  let service: EntityValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EntityValidatorService, FormSchemaService]
    });
    service = TestBed.inject(EntityValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateEntity', () => {
    it('should validate a valid universe entity', () => {
      const universe = {
        name: 'My Universe',
        description: 'A fantasy world with magic',
        statDefinitions: {
          strength: { name: 'Strength', abbreviation: 'STR', icon: 'barbell', color: '#ff0000', minValue: 0, maxValue: 100, category: 'primary' }
        },
        progressionRules: [
          { id: 'r1', description: 'Training', keywords: ['train'], affectedStats: ['strength'], maxChangePerAction: 3 }
        ]
      };

      const result = service.validateEntity(universe, 'universe');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should return errors for missing required fields', () => {
      const universe = {
        description: 'A universe without a name'
      };

      const result = service.validateEntity(universe, 'universe');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should return errors for invalid field values', () => {
      const universe = {
        name: 'X', // Too short (minLength: 2)
        description: 'Valid description here'
      };

      const result = service.validateEntity(universe, 'universe');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MIN_LENGTH')).toBe(true);
    });

    it('should validate character entity with context', () => {
      const character = {
        name: 'Hero',
        universeId: 'u1',
        stats: { strength: 50 }
      };

      const context: ValidationContext = {
        universe: {
          id: 'u1',
          statDefinitions: {
            strength: { name: 'Strength', abbreviation: 'STR', icon: 'barbell', color: '#ff0000', minValue: 0, maxValue: 100, category: 'primary' }
          }
        } as unknown as Universe
      };

      const result = service.validateEntity(character, 'character', context);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateForPhase', () => {
    it('should validate only phase-specific fields', () => {
      const universe = {
        name: 'My Universe',
        description: 'A great fantasy world'
        // Missing statDefinitions and progressionRules - but those are for later phases
      };

      const result = service.validateForPhase(universe, 'universe', 'concept');
      expect(result.valid).toBe(true);
    });

    it('should fail if phase-required fields are missing', () => {
      const universe = {
        name: 'X' // Too short
      };

      const result = service.validateForPhase(universe, 'universe', 'concept');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
      expect(result.errors.some(e => e.field === 'description')).toBe(true);
    });

    it('should validate character identity phase', () => {
      const character = {
        name: 'Hero'
      };

      const result = service.validateForPhase(character, 'character', 'identity');
      expect(result.valid).toBe(true);
    });

    it('should validate statistics phase for universe', () => {
      const universe = {
        statDefinitions: {
          strength: { name: 'Strength', abbreviation: 'STR', icon: 'barbell', color: '#ff0000', minValue: 0, maxValue: 100 }
        }
      };

      const result = service.validateForPhase(universe, 'universe', 'statistics');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCrossReferences', () => {
    it('should validate character race reference', () => {
      const character = {
        universeId: 'u1',
        raceId: 'human',
        stats: {}
      };

      const context: ValidationContext = {
        universe: {
          id: 'u1',
          raceSystem: {
            enabled: true,
            races: [{ id: 'human', name: 'Human', baseStats: {}, freePoints: 50 }]
          }
        } as unknown as Universe
      };

      const result = service.validateCrossReferences(character, context);
      expect(result.valid).toBe(true);
      expect(result.missingReferences.length).toBe(0);
    });

    it('should detect invalid race reference', () => {
      const character = {
        universeId: 'u1',
        raceId: 'nonexistent',
        stats: {}
      };

      const context: ValidationContext = {
        universe: {
          id: 'u1',
          raceSystem: {
            enabled: true,
            races: [{ id: 'human', name: 'Human', baseStats: {}, freePoints: 50 }]
          }
        } as unknown as Universe
      };

      const result = service.validateCrossReferences(character, context);
      expect(result.valid).toBe(false);
      expect(result.missingReferences.length).toBe(1);
      expect(result.missingReferences[0].field).toBe('raceId');
      expect(result.errors.some(e => e.code === 'INVALID_REFERENCE')).toBe(true);
    });

    it('should warn about unknown stats in character', () => {
      const character = {
        universeId: 'u1',
        stats: {
          strength: 50,
          unknownStat: 30
        }
      };

      const context: ValidationContext = {
        universe: {
          id: 'u1',
          statDefinitions: {
            strength: { name: 'Strength', abbreviation: 'STR', icon: 'barbell', color: '#ff0000', minValue: 0, maxValue: 100 }
          }
        } as unknown as Universe
      };

      const result = service.validateCrossReferences(character, context);
      expect(result.warnings.some(w => w.code === 'UNKNOWN_STAT')).toBe(true);
      expect(result.missingReferences.some(m => m.referencedId === 'unknownStat')).toBe(true);
    });

    it('should warn about progression rules referencing unknown stats', () => {
      const universe = {
        statDefinitions: {
          strength: { name: 'Strength' }
        },
        progressionRules: [
          { id: 'r1', affectedStats: ['strength', 'unknownStat'] }
        ]
      };

      const result = service.validateCrossReferences(universe, {});
      expect(result.warnings.some(w => w.code === 'RULE_REFERENCES_UNKNOWN_STAT')).toBe(true);
    });

    it('should pass when no context provided', () => {
      const character = {
        universeId: 'u1',
        name: 'Hero'
      };

      const result = service.validateCrossReferences(character, {});
      expect(result.valid).toBe(true);
    });
  });

  describe('validateConsistency', () => {
    it('should detect negative stat values', () => {
      const character = {
        stats: {
          strength: -5,
          agility: 50
        }
      };

      const result = service.validateConsistency(character);
      expect(result.consistent).toBe(false);
      expect(result.issues.some(i => i.type === 'imbalance' && i.field.includes('strength'))).toBe(true);
    });

    it('should detect duplicate race IDs', () => {
      const universe = {
        raceSystem: {
          enabled: true,
          races: [
            { id: 'human', name: 'Human' },
            { id: 'human', name: 'Human Duplicate' }
          ]
        }
      };

      const result = service.validateConsistency(universe);
      expect(result.consistent).toBe(false);
      expect(result.issues.some(i => i.type === 'duplicate')).toBe(true);
    });

    it('should detect duplicate rule IDs', () => {
      const universe = {
        progressionRules: [
          { id: 'rule1', description: 'First' },
          { id: 'rule1', description: 'Duplicate' }
        ]
      };

      const result = service.validateConsistency(universe);
      expect(result.consistent).toBe(false);
      expect(result.issues.some(i => i.type === 'duplicate' && i.field === 'progressionRules')).toBe(true);
    });

    it('should detect missing awakening thresholds', () => {
      const universe = {
        awakeningSystem: {
          enabled: true,
          levels: ['E', 'D', 'C'],
          thresholds: { E: 0, D: 100 } // Missing C
        }
      };

      const result = service.validateConsistency(universe);
      expect(result.consistent).toBe(false);
      expect(result.issues.some(i => i.type === 'orphan')).toBe(true);
    });

    it('should warn about enabled race system without races', () => {
      const universe = {
        raceSystem: {
          enabled: true,
          races: []
        }
      };

      const result = service.validateConsistency(universe);
      expect(result.issues.some(i => i.type === 'imbalance' && i.severity === 'warning')).toBe(true);
    });

    it('should pass for consistent entity', () => {
      const universe = {
        raceSystem: {
          enabled: true,
          races: [{ id: 'human', name: 'Human' }]
        },
        awakeningSystem: {
          enabled: true,
          levels: ['E', 'D'],
          thresholds: { E: 0, D: 100 }
        },
        progressionRules: [
          { id: 'r1', description: 'Rule 1' }
        ]
      };

      const result = service.validateConsistency(universe);
      expect(result.consistent).toBe(true);
    });
  });

  describe('validateSize', () => {
    it('should pass for small entities', () => {
      const entity = { name: 'Test' };
      const result = service.validateSize(entity);
      expect(result.withinLimit).toBe(true);
    });

    it('should fail for entities exceeding limit', () => {
      const hugeEntity = {
        data: 'x'.repeat(FIREBASE_DOC_SIZE_LIMIT + 1000)
      };
      const result = service.validateSize(hugeEntity);
      expect(result.withinLimit).toBe(false);
    });
  });

  describe('autoFix', () => {
    it('should truncate strings exceeding max length', () => {
      const entity = {
        name: 'x'.repeat(200) // Exceeds maxLength of 100
      };

      const errors = [{
        field: 'name',
        code: 'MAX_LENGTH',
        message: 'Too long',
        messageEs: 'Muy largo',
        value: entity.name
      }];

      const result = service.autoFix(entity, errors, 'universe');
      expect(result.appliedFixes.length).toBe(1);
      expect((result.fixed.name as string).length).toBe(100);
      expect(result.remainingErrors.length).toBe(0);
    });

    it('should set minimum value for numbers below min', () => {
      const entity = {
        initialPoints: -50
      };

      const errors = [{
        field: 'initialPoints',
        code: 'MIN_VALUE',
        message: 'Below minimum',
        messageEs: 'Por debajo del mínimo',
        value: -50
      }];

      const result = service.autoFix(entity, errors, 'universe');
      expect(result.appliedFixes.length).toBe(1);
      expect(result.fixed.initialPoints).toBe(0);
    });

    it('should set maximum value for numbers above max', () => {
      const entity = {
        initialPoints: 2000
      };

      const errors = [{
        field: 'initialPoints',
        code: 'MAX_VALUE',
        message: 'Above maximum',
        messageEs: 'Por encima del máximo',
        value: 2000
      }];

      const result = service.autoFix(entity, errors, 'universe');
      expect(result.appliedFixes.length).toBe(1);
      expect(result.fixed.initialPoints).toBe(1000);
    });

    it('should apply default value for required fields', () => {
      const entity = {
        name: 'Test'
      };

      const errors = [{
        field: 'isPublic',
        code: 'REQUIRED',
        message: 'Required',
        messageEs: 'Requerido',
        value: undefined
      }];

      const result = service.autoFix(entity, errors, 'universe');
      expect(result.appliedFixes.length).toBe(1);
      expect((result.fixed as Record<string, unknown>)['isPublic']).toBe(false);
    });

    it('should not fix MIN_LENGTH errors', () => {
      const entity = {
        name: 'X'
      };

      const errors = [{
        field: 'name',
        code: 'MIN_LENGTH',
        message: 'Too short',
        messageEs: 'Muy corto',
        value: 'X'
      }];

      const result = service.autoFix(entity, errors, 'universe');
      expect(result.appliedFixes.length).toBe(0);
      expect(result.remainingErrors.length).toBe(1);
    });

    it('should handle multiple errors', () => {
      const entity = {
        name: 'x'.repeat(200),
        initialPoints: 2000
      };

      const errors = [
        { field: 'name', code: 'MAX_LENGTH', message: 'Too long', messageEs: '', value: entity.name },
        { field: 'initialPoints', code: 'MAX_VALUE', message: 'Above max', messageEs: '', value: 2000 }
      ];

      const result = service.autoFix(entity, errors, 'universe');
      expect(result.appliedFixes.length).toBe(2);
      expect((result.fixed.name as string).length).toBe(100);
      expect(result.fixed.initialPoints).toBe(1000);
    });

    it('should provide fix reasons', () => {
      const entity = {
        name: 'x'.repeat(200)
      };

      const errors = [{
        field: 'name',
        code: 'MAX_LENGTH',
        message: 'Too long',
        messageEs: '',
        value: entity.name
      }];

      const result = service.autoFix(entity, errors, 'universe');
      expect(result.appliedFixes[0].reason).toContain('Truncated');
    });
  });

  describe('validateComplete', () => {
    it('should perform all validation checks', () => {
      const universe = {
        name: 'My Universe',
        description: 'A complete fantasy world',
        statDefinitions: {
          strength: { name: 'Strength', abbreviation: 'STR', icon: 'barbell', color: '#ff0000', minValue: 0, maxValue: 100, category: 'primary' }
        },
        progressionRules: [
          { id: 'r1', description: 'Training', keywords: ['train'], affectedStats: ['strength'], maxChangePerAction: 3 }
        ]
      };

      const result = service.validateComplete(universe, 'universe');

      expect(result.validation).toBeDefined();
      expect(result.crossReferences).toBeDefined();
      expect(result.consistency).toBeDefined();
      expect(result.size).toBeDefined();
      expect(result.overallValid).toBe(true);
    });

    it('should return overall invalid if any check fails', () => {
      const universe = {
        name: 'X', // Too short
        description: 'Valid'
      };

      const result = service.validateComplete(universe, 'universe');
      expect(result.overallValid).toBe(false);
      expect(result.validation.valid).toBe(false);
    });

    it('should include cross-reference errors in overall result', () => {
      const character = {
        name: 'Hero',
        universeId: 'u1',
        raceId: 'nonexistent',
        stats: {}
      };

      const context: ValidationContext = {
        universe: {
          id: 'u1',
          raceSystem: {
            enabled: true,
            races: [{ id: 'human', name: 'Human', baseStats: {}, freePoints: 50 }]
          }
        } as unknown as Universe
      };

      const result = service.validateComplete(character, 'character', context);
      expect(result.crossReferences.valid).toBe(false);
      expect(result.overallValid).toBe(false);
    });

    it('should include consistency issues in overall result', () => {
      const universe = {
        name: 'Valid Name',
        description: 'Valid description here',
        raceSystem: {
          enabled: true,
          races: [
            { id: 'dup', name: 'First' },
            { id: 'dup', name: 'Duplicate' }
          ]
        }
      };

      const result = service.validateComplete(universe, 'universe');
      expect(result.consistency.consistent).toBe(false);
      expect(result.overallValid).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty entity', () => {
      const result = service.validateEntity({}, 'universe');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle nested field paths', () => {
      const entity = {
        stats: {
          strength: 50
        }
      };

      const result = service.validateCrossReferences(entity, {
        universe: {
          id: 'u1',
          statDefinitions: {
            strength: { name: 'Strength' }
          }
        } as unknown as Universe
      });

      expect(result.valid).toBe(true);
    });

    it('should handle null values gracefully', () => {
      const entity = {
        name: null,
        description: null
      };

      const result = service.validateEntity(entity, 'universe');
      expect(result.valid).toBe(false);
    });

    it('should handle undefined universe in context', () => {
      const character = {
        name: 'Hero',
        universeId: 'u1'
      };

      const result = service.validateCrossReferences(character, { universe: undefined });
      expect(result.valid).toBe(true);
    });
  });
});
