import { TestBed } from '@angular/core/testing';
import { FormSchemaService } from './form-schema.service';
import {
  EntityFormSchema,
  FormFieldSchema,
  ValidationContext,
  FIREBASE_DOC_SIZE_LIMIT,
  RECOMMENDED_DOC_SIZE
} from '../../models';
import { Universe } from '../../models/universe.model';

describe('FormSchemaService', () => {
  let service: FormSchemaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormSchemaService]
    });
    service = TestBed.inject(FormSchemaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSchema', () => {
    it('should return universe schema', () => {
      const schema = service.getSchema('universe');
      expect(schema).toBeTruthy();
      expect(schema.entityType).toBe('universe');
      expect(schema.fields.length).toBeGreaterThan(0);
    });

    it('should return character schema', () => {
      const schema = service.getSchema('character');
      expect(schema).toBeTruthy();
      expect(schema.entityType).toBe('character');
      expect(schema.fields.length).toBeGreaterThan(0);
    });

    it('should return stat schema', () => {
      const schema = service.getSchema('stat');
      expect(schema).toBeTruthy();
      expect(schema.entityType).toBe('stat');
    });

    it('should return race schema', () => {
      const schema = service.getSchema('race');
      expect(schema).toBeTruthy();
      expect(schema.entityType).toBe('race');
    });

    it('should return skill schema', () => {
      const schema = service.getSchema('skill');
      expect(schema).toBeTruthy();
      expect(schema.entityType).toBe('skill');
    });

    it('should return rule schema', () => {
      const schema = service.getSchema('rule');
      expect(schema).toBeTruthy();
      expect(schema.entityType).toBe('rule');
    });

    it('should throw error for unknown entity type', () => {
      expect(() => service.getSchema('unknown' as any)).toThrowError('Schema not found for entity type: unknown');
    });

    it('should include required fields in universe schema', () => {
      const schema = service.getSchema('universe');
      const nameField = schema.fields.find(f => f.name === 'name');
      const descField = schema.fields.find(f => f.name === 'description');

      expect(nameField?.validation.required).toBe(true);
      expect(descField?.validation.required).toBe(true);
    });

    it('should include groups in universe schema', () => {
      const schema = service.getSchema('universe');
      expect(schema.groups).toBeTruthy();
      expect(schema.groups!.length).toBeGreaterThan(0);
      expect(schema.groups!.find(g => g.name === 'basic')).toBeTruthy();
    });

    it('should include phases in universe schema', () => {
      const schema = service.getSchema('universe');
      expect(schema.phases).toBeTruthy();
      expect(schema.phases).toContain('concept');
      expect(schema.phases).toContain('review');
    });
  });

  describe('getSchemaForPhase', () => {
    it('should return fields for universe concept phase', () => {
      const fields = service.getSchemaForPhase('universe', 'concept');
      expect(fields.length).toBeGreaterThan(0);

      const fieldNames = fields.map(f => f.name);
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('description');
    });

    it('should return fields for universe statistics phase', () => {
      const fields = service.getSchemaForPhase('universe', 'statistics');
      const fieldNames = fields.map(f => f.name);
      expect(fieldNames).toContain('statDefinitions');
    });

    it('should return fields for character identity phase', () => {
      const fields = service.getSchemaForPhase('character', 'identity');
      const fieldNames = fields.map(f => f.name);
      expect(fieldNames).toContain('name');
    });

    it('should return fields for character universe_selection phase', () => {
      const fields = service.getSchemaForPhase('character', 'universe_selection');
      const fieldNames = fields.map(f => f.name);
      expect(fieldNames).toContain('universeId');
    });

    it('should return empty array for unknown phase', () => {
      const fields = service.getSchemaForPhase('universe', 'nonexistent');
      expect(fields).toEqual([]);
    });

    it('should return fields for universe review phase', () => {
      const fields = service.getSchemaForPhase('universe', 'review');
      const fieldNames = fields.map(f => f.name);
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('description');
      expect(fieldNames).toContain('statDefinitions');
      expect(fieldNames).toContain('progressionRules');
    });
  });

  describe('resolveDynamicOptions', () => {
    it('should return static options when no dynamicOptions', () => {
      const field: FormFieldSchema = {
        name: 'theme',
        type: 'select',
        label: { en: 'Theme', es: 'Tema' },
        validation: { required: false },
        options: [
          { value: 'fantasy', label: { en: 'Fantasy', es: 'Fantasía' } }
        ],
        order: 1
      };

      const options = service.resolveDynamicOptions(field, {});
      expect(options.length).toBe(1);
      expect(options[0].value).toBe('fantasy');
    });

    it('should resolve universe.races options', () => {
      const field: FormFieldSchema = {
        name: 'raceId',
        type: 'select',
        label: { en: 'Race', es: 'Raza' },
        validation: { required: false },
        dynamicOptions: { source: 'universe.races' },
        order: 1
      };

      const context: ValidationContext = {
        universe: {
          id: 'u1',
          raceSystem: {
            enabled: true,
            races: [
              { id: 'human', name: 'Human', baseStats: {}, freePoints: 50 },
              { id: 'elf', name: 'Elf', baseStats: {}, freePoints: 50 }
            ]
          }
        } as unknown as Universe
      };

      const options = service.resolveDynamicOptions(field, context);
      expect(options.length).toBe(2);
      expect(options[0].value).toBe('human');
      expect(options[1].value).toBe('elf');
    });

    it('should resolve universe.stats options', () => {
      const field: FormFieldSchema = {
        name: 'affectedStats',
        type: 'multiselect',
        label: { en: 'Stats', es: 'Stats' },
        validation: { required: false },
        dynamicOptions: { source: 'universe.stats' },
        order: 1
      };

      const context: ValidationContext = {
        universe: {
          id: 'u1',
          statDefinitions: {
            strength: { name: 'Strength', abbreviation: 'STR', icon: 'barbell', color: '#ff0000', minValue: 0, maxValue: 100, category: 'primary' },
            agility: { name: 'Agility', abbreviation: 'AGI', icon: 'flash', color: '#00ff00', minValue: 0, maxValue: 100, category: 'primary' }
          }
        } as unknown as Universe
      };

      const options = service.resolveDynamicOptions(field, context);
      expect(options.length).toBe(2);
      expect(options.find(o => o.value === 'strength')).toBeTruthy();
      expect(options.find(o => o.value === 'agility')).toBeTruthy();
    });

    it('should resolve universe.awakeningLevels options', () => {
      const field: FormFieldSchema = {
        name: 'awakeningLevel',
        type: 'select',
        label: { en: 'Level', es: 'Nivel' },
        validation: { required: false },
        dynamicOptions: { source: 'universe.awakeningLevels' },
        order: 1
      };

      const context: ValidationContext = {
        universe: {
          id: 'u1',
          awakeningSystem: {
            enabled: true,
            levels: ['E', 'D', 'C', 'B', 'A', 'S'],
            thresholds: { E: 0, D: 100, C: 200, B: 300, A: 400, S: 500 }
          }
        } as unknown as Universe
      };

      const options = service.resolveDynamicOptions(field, context);
      expect(options.length).toBe(6);
      expect(options[0].value).toBe('E');
    });

    it('should resolve universe.rules options', () => {
      const field: FormFieldSchema = {
        name: 'ruleId',
        type: 'select',
        label: { en: 'Rule', es: 'Regla' },
        validation: { required: false },
        dynamicOptions: { source: 'universe.rules' },
        order: 1
      };

      const context: ValidationContext = {
        universe: {
          id: 'u1',
          progressionRules: [
            { id: 'r1', description: 'Training increases stats', keywords: ['train'], affectedStats: ['strength'], maxChangePerAction: 3 }
          ]
        } as unknown as Universe
      };

      const options = service.resolveDynamicOptions(field, context);
      expect(options.length).toBe(1);
      expect(options[0].value).toBe('r1');
    });

    it('should apply filter to dynamic options', () => {
      const field: FormFieldSchema = {
        name: 'primaryStat',
        type: 'select',
        label: { en: 'Stat', es: 'Stat' },
        validation: { required: false },
        dynamicOptions: {
          source: 'universe.stats',
          filter: (opt, ctx) => {
            const stat = ctx.universe?.statDefinitions?.[opt.value as string];
            return stat?.category === 'primary';
          }
        },
        order: 1
      };

      const context: ValidationContext = {
        universe: {
          id: 'u1',
          statDefinitions: {
            strength: { name: 'Strength', abbreviation: 'STR', icon: 'barbell', color: '#ff0000', minValue: 0, maxValue: 100, category: 'primary' },
            derived: { name: 'Derived', abbreviation: 'DER', icon: 'star', color: '#0000ff', minValue: 0, maxValue: 100, category: 'derived' }
          }
        } as unknown as Universe
      };

      const options = service.resolveDynamicOptions(field, context);
      expect(options.length).toBe(1);
      expect(options[0].value).toBe('strength');
    });

    it('should return empty array when context is missing', () => {
      const field: FormFieldSchema = {
        name: 'raceId',
        type: 'select',
        label: { en: 'Race', es: 'Raza' },
        validation: { required: false },
        dynamicOptions: { source: 'universe.races' },
        order: 1
      };

      const options = service.resolveDynamicOptions(field, {});
      expect(options).toEqual([]);
    });
  });

  describe('getDependentFields', () => {
    let schema: EntityFormSchema;

    beforeEach(() => {
      schema = {
        entityType: 'stat',
        version: '1.0.0',
        fields: [
          {
            name: 'isDerived',
            type: 'boolean',
            label: { en: 'Is Derived', es: 'Es Derivada' },
            validation: { required: false },
            order: 1
          },
          {
            name: 'formula',
            type: 'string',
            label: { en: 'Formula', es: 'Fórmula' },
            validation: { required: false },
            dependsOn: [{ field: 'isDerived', condition: 'equals', value: true, action: 'show' }],
            order: 2
          },
          {
            name: 'description',
            type: 'string',
            label: { en: 'Description', es: 'Descripción' },
            validation: { required: false },
            dependsOn: [{ field: 'isDerived', condition: 'notEquals', value: true, action: 'show' }],
            order: 3
          }
        ]
      };
    });

    it('should return dependent fields for equals condition', () => {
      const dependents = service.getDependentFields(schema, 'isDerived', true);
      expect(dependents.length).toBe(1);
      expect(dependents[0].name).toBe('formula');
    });

    it('should return dependent fields for notEquals condition', () => {
      const dependents = service.getDependentFields(schema, 'isDerived', false);
      expect(dependents.length).toBe(1);
      expect(dependents[0].name).toBe('description');
    });

    it('should handle exists condition', () => {
      schema.fields.push({
        name: 'extra',
        type: 'string',
        label: { en: 'Extra', es: 'Extra' },
        validation: { required: false },
        dependsOn: [{ field: 'formula', condition: 'exists', action: 'show' }],
        order: 4
      });

      const dependents = service.getDependentFields(schema, 'formula', 'some value');
      expect(dependents.find(f => f.name === 'extra')).toBeTruthy();

      const noDepends = service.getDependentFields(schema, 'formula', null);
      expect(noDepends.find(f => f.name === 'extra')).toBeFalsy();
    });

    it('should handle notExists condition', () => {
      schema.fields.push({
        name: 'fallback',
        type: 'string',
        label: { en: 'Fallback', es: 'Fallback' },
        validation: { required: false },
        dependsOn: [{ field: 'formula', condition: 'notExists', action: 'show' }],
        order: 4
      });

      const dependents = service.getDependentFields(schema, 'formula', undefined);
      expect(dependents.find(f => f.name === 'fallback')).toBeTruthy();
    });

    it('should handle contains condition', () => {
      schema.fields.push({
        name: 'strengthRelated',
        type: 'string',
        label: { en: 'Strength Related', es: 'Relacionado con Fuerza' },
        validation: { required: false },
        dependsOn: [{ field: 'affectedStats', condition: 'contains', value: 'strength', action: 'show' }],
        order: 4
      });

      const dependents = service.getDependentFields(schema, 'affectedStats', ['strength', 'agility']);
      expect(dependents.find(f => f.name === 'strengthRelated')).toBeTruthy();

      const noDepends = service.getDependentFields(schema, 'affectedStats', ['agility']);
      expect(noDepends.find(f => f.name === 'strengthRelated')).toBeFalsy();
    });

    it('should handle greaterThan condition', () => {
      schema.fields.push({
        name: 'highLevel',
        type: 'string',
        label: { en: 'High Level', es: 'Alto Nivel' },
        validation: { required: false },
        dependsOn: [{ field: 'level', condition: 'greaterThan', value: 50, action: 'show' }],
        order: 4
      });

      const dependents = service.getDependentFields(schema, 'level', 60);
      expect(dependents.find(f => f.name === 'highLevel')).toBeTruthy();

      const noDepends = service.getDependentFields(schema, 'level', 40);
      expect(noDepends.find(f => f.name === 'highLevel')).toBeFalsy();
    });

    it('should handle lessThan condition', () => {
      schema.fields.push({
        name: 'lowLevel',
        type: 'string',
        label: { en: 'Low Level', es: 'Bajo Nivel' },
        validation: { required: false },
        dependsOn: [{ field: 'level', condition: 'lessThan', value: 10, action: 'show' }],
        order: 4
      });

      const dependents = service.getDependentFields(schema, 'level', 5);
      expect(dependents.find(f => f.name === 'lowLevel')).toBeTruthy();

      const noDepends = service.getDependentFields(schema, 'level', 15);
      expect(noDepends.find(f => f.name === 'lowLevel')).toBeFalsy();
    });

    it('should return empty array for unrelated field', () => {
      const dependents = service.getDependentFields(schema, 'unrelated', 'value');
      expect(dependents).toEqual([]);
    });
  });

  describe('validateField', () => {
    describe('required validation', () => {
      const requiredField: FormFieldSchema = {
        name: 'name',
        type: 'string',
        label: { en: 'Name', es: 'Nombre' },
        validation: { required: true },
        order: 1
      };

      it('should fail for null value', () => {
        const result = service.validateField(requiredField, null, {});
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('REQUIRED');
      });

      it('should fail for undefined value', () => {
        const result = service.validateField(requiredField, undefined, {});
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('REQUIRED');
      });

      it('should fail for empty string', () => {
        const result = service.validateField(requiredField, '', {});
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('REQUIRED');
      });

      it('should pass for valid value', () => {
        const result = service.validateField(requiredField, 'Valid Name', {});
        expect(result.valid).toBe(true);
        expect(result.errors.length).toBe(0);
      });
    });

    describe('string validation', () => {
      const stringField: FormFieldSchema = {
        name: 'description',
        type: 'string',
        label: { en: 'Description', es: 'Descripción' },
        validation: { required: false, minLength: 5, maxLength: 100 },
        order: 1
      };

      it('should fail for string below minLength', () => {
        const result = service.validateField(stringField, 'Hi', {});
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('MIN_LENGTH');
      });

      it('should fail for string above maxLength', () => {
        const result = service.validateField(stringField, 'x'.repeat(101), {});
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('MAX_LENGTH');
      });

      it('should pass for valid string length', () => {
        const result = service.validateField(stringField, 'Valid description text', {});
        expect(result.valid).toBe(true);
      });
    });

    describe('pattern validation', () => {
      const patternField: FormFieldSchema = {
        name: 'email',
        type: 'string',
        label: { en: 'Email', es: 'Email' },
        validation: {
          required: false,
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          patternMessage: { en: 'Invalid email format', es: 'Formato de email inválido' }
        },
        order: 1
      };

      it('should fail for invalid pattern', () => {
        const result = service.validateField(patternField, 'not-an-email', {});
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('PATTERN');
        expect(result.errors[0].message).toBe('Invalid email format');
      });

      it('should pass for valid pattern', () => {
        const result = service.validateField(patternField, 'test@example.com', {});
        expect(result.valid).toBe(true);
      });
    });

    describe('number validation', () => {
      const numberField: FormFieldSchema = {
        name: 'level',
        type: 'number',
        label: { en: 'Level', es: 'Nivel' },
        validation: { required: false, min: 1, max: 100 },
        order: 1
      };

      it('should fail for number below min', () => {
        const result = service.validateField(numberField, 0, {});
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('MIN_VALUE');
      });

      it('should fail for number above max', () => {
        const result = service.validateField(numberField, 101, {});
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('MAX_VALUE');
      });

      it('should pass for number within range', () => {
        const result = service.validateField(numberField, 50, {});
        expect(result.valid).toBe(true);
      });

      it('should pass for boundary values', () => {
        expect(service.validateField(numberField, 1, {}).valid).toBe(true);
        expect(service.validateField(numberField, 100, {}).valid).toBe(true);
      });
    });

    describe('oneOf validation', () => {
      const selectField: FormFieldSchema = {
        name: 'category',
        type: 'select',
        label: { en: 'Category', es: 'Categoría' },
        validation: { required: false, oneOf: ['primary', 'secondary', 'derived'] },
        order: 1
      };

      it('should fail for value not in oneOf', () => {
        const result = service.validateField(selectField, 'invalid', {});
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('ONE_OF');
      });

      it('should pass for value in oneOf', () => {
        const result = service.validateField(selectField, 'primary', {});
        expect(result.valid).toBe(true);
      });
    });

    describe('custom validation', () => {
      it('should apply custom validation function', () => {
        const customField: FormFieldSchema = {
          name: 'password',
          type: 'string',
          label: { en: 'Password', es: 'Contraseña' },
          validation: {
            required: false,
            custom: (value) => {
              const errors: { field: string; code: string; message: string; messageEs: string; value: unknown }[] = [];
              const warnings: { field: string; code: string; message: string; messageEs: string }[] = [];
              if (typeof value === 'string' && !value.match(/[A-Z]/)) {
                errors.push({
                  field: 'password',
                  code: 'CUSTOM',
                  message: 'Must contain uppercase',
                  messageEs: 'Debe contener mayúscula',
                  value
                });
              }
              return { valid: errors.length === 0, errors, warnings };
            }
          },
          order: 1
        };

        const failResult = service.validateField(customField, 'lowercase', {});
        expect(failResult.valid).toBe(false);
        expect(failResult.errors[0].message).toBe('Must contain uppercase');

        const passResult = service.validateField(customField, 'HasUpperCase', {});
        expect(passResult.valid).toBe(true);
      });
    });

    it('should include bilingual error messages', () => {
      const field: FormFieldSchema = {
        name: 'name',
        type: 'string',
        label: { en: 'Name', es: 'Nombre' },
        validation: { required: true },
        order: 1
      };

      const result = service.validateField(field, null, {});
      expect(result.errors[0].message).toContain('Name');
      expect(result.errors[0].messageEs).toContain('Nombre');
    });
  });

  describe('getMissingRequiredFields', () => {
    it('should return all missing required fields', () => {
      const schema = service.getSchema('universe');
      const missing = service.getMissingRequiredFields(schema, {});

      const missingNames = missing.map(f => f.name);
      expect(missingNames).toContain('name');
      expect(missingNames).toContain('description');
    });

    it('should not include optional fields', () => {
      const schema = service.getSchema('universe');
      const missing = service.getMissingRequiredFields(schema, {});

      const missingNames = missing.map(f => f.name);
      expect(missingNames).not.toContain('theme');
      expect(missingNames).not.toContain('inspiration');
    });

    it('should not include fields with values', () => {
      const schema = service.getSchema('universe');
      const missing = service.getMissingRequiredFields(schema, {
        name: 'My Universe',
        description: 'A great universe'
      });

      const missingNames = missing.map(f => f.name);
      expect(missingNames).not.toContain('name');
      expect(missingNames).not.toContain('description');
    });

    it('should filter by phase when specified', () => {
      const schema = service.getSchema('universe');
      const missing = service.getMissingRequiredFields(schema, {}, 'concept');

      const missingNames = missing.map(f => f.name);
      expect(missingNames).toContain('name');
      expect(missingNames).toContain('description');
      expect(missingNames).not.toContain('statDefinitions');
    });

    it('should treat empty string as missing', () => {
      const schema = service.getSchema('universe');
      const missing = service.getMissingRequiredFields(schema, { name: '' });

      const missingNames = missing.map(f => f.name);
      expect(missingNames).toContain('name');
    });
  });

  describe('getExtractionHintsForField', () => {
    it('should return configured AI hints', () => {
      const schema = service.getSchema('universe');
      const nameField = schema.fields.find(f => f.name === 'name')!;

      const hints = service.getExtractionHintsForField(nameField, 'en');
      expect(hints.length).toBeGreaterThan(0);
      expect(hints.some(h => h.includes('llamar') || h.includes('nombre'))).toBe(true);
    });

    it('should include keywords for language', () => {
      const schema = service.getSchema('universe');
      const nameField = schema.fields.find(f => f.name === 'name')!;

      const esHints = service.getExtractionHintsForField(nameField, 'es');
      expect(esHints.some(h => h.includes('nombre'))).toBe(true);

      const enHints = service.getExtractionHintsForField(nameField, 'en');
      expect(enHints.some(h => h.includes('name'))).toBe(true);
    });

    it('should include type hint', () => {
      const schema = service.getSchema('universe');
      const nameField = schema.fields.find(f => f.name === 'name')!;

      const hints = service.getExtractionHintsForField(nameField, 'en');
      expect(hints.some(h => h.includes('Type: string'))).toBe(true);
    });

    it('should include range hints for number fields', () => {
      const schema = service.getSchema('universe');
      const pointsField = schema.fields.find(f => f.name === 'initialPoints')!;

      const hints = service.getExtractionHintsForField(pointsField, 'en');
      expect(hints.some(h => h.includes('Range:'))).toBe(true);
    });
  });

  describe('validateSize', () => {
    it('should pass for small entities', () => {
      const entity = { name: 'Test', description: 'Small entity' };
      const result = service.validateSize(entity);

      expect(result.withinLimit).toBe(true);
      expect(result.sizeBytes).toBeLessThan(FIREBASE_DOC_SIZE_LIMIT);
      expect(result.recommendations).toBeUndefined();
    });

    it('should warn for large entities', () => {
      const largeEntity = {
        name: 'Test',
        description: 'x'.repeat(RECOMMENDED_DOC_SIZE + 1000)
      };
      const result = service.validateSize(largeEntity);

      expect(result.withinLimit).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });

    it('should fail for entities exceeding limit', () => {
      const hugeEntity = {
        name: 'Test',
        data: 'x'.repeat(FIREBASE_DOC_SIZE_LIMIT + 1000)
      };
      const result = service.validateSize(hugeEntity);

      expect(result.withinLimit).toBe(false);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.some(r => r.includes('exceeds'))).toBe(true);
    });

    it('should return correct size in bytes', () => {
      const entity = { name: 'Test' };
      const result = service.validateSize(entity);
      const expectedSize = new Blob([JSON.stringify(entity)]).size;

      expect(result.sizeBytes).toBe(expectedSize);
    });

    it('should include limit in result', () => {
      const result = service.validateSize({});
      expect(result.limit).toBe(FIREBASE_DOC_SIZE_LIMIT);
    });
  });

  describe('schema content validation', () => {
    it('should have bilingual labels for all universe fields', () => {
      const schema = service.getSchema('universe');
      schema.fields.forEach(field => {
        expect(field.label.en).toBeTruthy();
        expect(field.label.es).toBeTruthy();
      });
    });

    it('should have bilingual labels for all character fields', () => {
      const schema = service.getSchema('character');
      schema.fields.forEach(field => {
        expect(field.label.en).toBeTruthy();
        expect(field.label.es).toBeTruthy();
      });
    });

    it('should have valid order for all fields', () => {
      const schema = service.getSchema('universe');
      schema.fields.forEach(field => {
        expect(field.order).toBeGreaterThan(0);
      });
    });

    it('should have theme options in universe schema', () => {
      const schema = service.getSchema('universe');
      const themeField = schema.fields.find(f => f.name === 'theme');

      expect(themeField).toBeTruthy();
      expect(themeField!.options).toBeTruthy();
      expect(themeField!.options!.length).toBeGreaterThan(0);
      expect(themeField!.options!.find(o => o.value === 'fantasy')).toBeTruthy();
    });

    it('should have category options in stat schema', () => {
      const schema = service.getSchema('stat');
      const categoryField = schema.fields.find(f => f.name === 'category');

      expect(categoryField).toBeTruthy();
      expect(categoryField!.options).toBeTruthy();
      expect(categoryField!.options!.find(o => o.value === 'primary')).toBeTruthy();
    });

    it('should have skill category options', () => {
      const schema = service.getSchema('skill');
      const categoryField = schema.fields.find(f => f.name === 'category');

      expect(categoryField).toBeTruthy();
      expect(categoryField!.options).toBeDefined();
      expect(categoryField!.options!.find(o => o.value === 'combat')).toBeTruthy();
      expect(categoryField!.options!.find(o => o.value === 'magic')).toBeTruthy();
    });
  });
});
