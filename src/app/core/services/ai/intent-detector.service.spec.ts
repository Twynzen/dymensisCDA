import { TestBed } from '@angular/core/testing';
import { IntentDetectorService, DEFAULT_INTENT_DETECTOR_CONFIG } from './intent-detector.service';
import { FormSchemaService } from './form-schema.service';

describe('IntentDetectorService', () => {
  let service: IntentDetectorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IntentDetectorService, FormSchemaService]
    });
    service = TestBed.inject(IntentDetectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('detectIntent - create actions', () => {
    describe('Spanish', () => {
      it('should detect universe creation intent', () => {
        const result = service.detectIntent('Quiero crear un universo de fantasía');
        expect(result.action).toBe('create');
        expect(result.target).toBe('universe');
        expect(result.language).toBe('es');
      });

      it('should detect character creation intent', () => {
        const result = service.detectIntent('Crear un nuevo personaje llamado Arthas');
        expect(result.action).toBe('create');
        expect(result.target).toBe('character');
      });

      it('should detect stat creation intent', () => {
        const result = service.detectIntent('Añadir una nueva estadística de inteligencia');
        expect(result.action).toBe('create');
        expect(result.target).toBe('stat');
      });

      it('should detect race creation intent', () => {
        const result = service.detectIntent('Agregar una nueva raza de elfos');
        expect(result.action).toBe('create');
        expect(result.target).toBe('race');
      });

      it('should detect skill creation intent', () => {
        const result = service.detectIntent('Añadir una nueva habilidad de combate');
        expect(result.action).toBe('create');
        expect(result.target).toBe('skill');
      });

      it('should detect rule creation intent', () => {
        const result = service.detectIntent('Agregar una regla de progresión');
        expect(result.action).toBe('create');
        expect(result.target).toBe('rule');
      });
    });

    describe('English', () => {
      it('should detect universe creation intent', () => {
        const result = service.detectIntent('I want to create a fantasy universe');
        expect(result.action).toBe('create');
        expect(result.target).toBe('universe');
        expect(result.language).toBe('en');
      });

      it('should detect character creation intent', () => {
        const result = service.detectIntent('Create a new character named Arthas');
        expect(result.action).toBe('create');
        expect(result.target).toBe('character');
      });

      it('should detect stat creation intent', () => {
        const result = service.detectIntent('Add a new stat for intelligence');
        expect(result.action).toBe('create');
        expect(result.target).toBe('stat');
      });
    });
  });

  describe('detectIntent - edit actions', () => {
    describe('Spanish', () => {
      it('should detect edit intent with cambiar', () => {
        const result = service.detectIntent('Cambiar el nombre del universo a "Nuevo Mundo"');
        expect(result.action).toBe('edit');
      });

      it('should detect edit intent with modificar', () => {
        const result = service.detectIntent('Modificar la descripción del personaje');
        expect(result.action).toBe('edit');
      });

      it('should detect edit intent with en vez de', () => {
        const result = service.detectIntent('En vez de fantasía, prefiero ciencia ficción');
        expect(result.action).toBe('edit');
      });
    });

    describe('English', () => {
      it('should detect edit intent with change', () => {
        const result = service.detectIntent('Change the universe name to "New World"');
        expect(result.action).toBe('edit');
      });

      it('should detect edit intent with modify', () => {
        const result = service.detectIntent('Modify the character description');
        expect(result.action).toBe('edit');
      });

      it('should detect edit intent with instead of', () => {
        const result = service.detectIntent('Instead of fantasy, I prefer sci-fi');
        expect(result.action).toBe('edit');
      });
    });
  });

  describe('detectIntent - confirm actions', () => {
    it('should detect confirm intent in Spanish', () => {
      expect(service.detectIntent('Sí, perfecto').action).toBe('confirm');
      expect(service.detectIntent('Vale, me parece bien').action).toBe('confirm');
      expect(service.detectIntent('Correcto, adelante').action).toBe('confirm');
    });

    it('should detect confirm intent in English', () => {
      expect(service.detectIntent('Yes, perfect').action).toBe('confirm');
      expect(service.detectIntent('Ok, sounds good').action).toBe('confirm');
      expect(service.detectIntent('Go ahead').action).toBe('confirm');
    });
  });

  describe('detectIntent - cancel actions', () => {
    it('should detect cancel intent in Spanish', () => {
      expect(service.detectIntent('No, cancelar').action).toBe('cancel');
      expect(service.detectIntent('Olvídalo, empezar de nuevo').action).toBe('cancel');
    });

    it('should detect cancel intent in English', () => {
      expect(service.detectIntent('No, cancel that').action).toBe('cancel');
      expect(service.detectIntent('Nevermind, start over').action).toBe('cancel');
    });
  });

  describe('detectIntent - delete actions', () => {
    it('should detect delete intent in Spanish', () => {
      expect(service.detectIntent('Eliminar este personaje').action).toBe('delete');
      expect(service.detectIntent('Borrar la raza de elfos').action).toBe('delete');
    });

    it('should detect delete intent in English', () => {
      expect(service.detectIntent('Delete this character').action).toBe('delete');
      expect(service.detectIntent('Remove the elf race').action).toBe('delete');
    });
  });

  describe('detectIntent - query actions', () => {
    it('should detect query intent in Spanish', () => {
      expect(service.detectIntent('¿Qué estadísticas tiene?').action).toBe('query');
      expect(service.detectIntent('Muestra el personaje').action).toBe('query');
    });

    it('should detect query intent in English', () => {
      expect(service.detectIntent('What stats does it have?').action).toBe('query');
      expect(service.detectIntent('Show me the character').action).toBe('query');
    });
  });

  describe('extractFields', () => {
    it('should extract name from quoted text in Spanish', () => {
      const fields = service.extractFields('Crear universo llamado "Tierra Media"', 'universe', 'es');
      const nameField = fields.find(f => f.field === 'name');
      expect(nameField).toBeTruthy();
      expect(nameField!.value).toBe('Tierra Media');
    });

    it('should extract name from quoted text in English', () => {
      const fields = service.extractFields('Create universe called "Middle Earth"', 'universe', 'en');
      const nameField = fields.find(f => f.field === 'name');
      expect(nameField).toBeTruthy();
      expect(nameField!.value).toBe('Middle Earth');
    });

    it('should extract theme from keywords in Spanish', () => {
      const fields = service.extractFields('Quiero un universo de fantasía medieval', 'universe', 'es');
      const themeField = fields.find(f => f.field === 'theme');
      expect(themeField).toBeTruthy();
      expect(themeField!.value).toBe('fantasy');
    });

    it('should extract theme from keywords in English', () => {
      const fields = service.extractFields('I want a sci-fi universe', 'universe', 'en');
      const themeField = fields.find(f => f.field === 'theme');
      expect(themeField).toBeTruthy();
      expect(themeField!.value).toBe('scifi');
    });

    it('should extract multiple themes correctly', () => {
      const fields = service.extractFields('Un universo cyberpunk con elementos de terror', 'universe', 'es');
      const themeField = fields.find(f => f.field === 'theme');
      expect(themeField).toBeTruthy();
      // Should pick first match (cyberpunk comes first in input)
    });

    it('should extract description from context', () => {
      const fields = service.extractFields('Es un mundo de fantasía donde la magia es común', 'universe', 'es');
      const descField = fields.find(f => f.field === 'description');
      expect(descField).toBeTruthy();
      expect((descField!.value as string).length).toBeGreaterThan(10);
    });

    it('should set confidence based on extraction source', () => {
      const fields = service.extractFields('Universo llamado "Test"', 'universe', 'es');
      const nameField = fields.find(f => f.field === 'name');
      expect(nameField!.source).toBe('explicit');
      expect(nameField!.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('detectContradictions', () => {
    it('should detect contradiction when name changes', () => {
      const existingData = { name: 'Tierra Media' };
      const result = service.detectContradictions(
        'El universo se llama "Nuevo Mundo"',
        existingData,
        'es'
      );
      expect(result.hasContradictions).toBe(true);
      expect(result.contradictingFields[0].field).toBe('name');
      expect(result.contradictingFields[0].existingValue).toBe('Tierra Media');
    });

    it('should not detect contradiction for same value', () => {
      const existingData = { name: 'Tierra Media' };
      const result = service.detectContradictions(
        'El universo llamado "Tierra Media"',
        existingData,
        'es'
      );
      expect(result.hasContradictions).toBe(false);
    });

    it('should not detect contradiction for empty existing value', () => {
      const existingData = { name: '' };
      const result = service.detectContradictions(
        'Universo llamado "Test"',
        existingData,
        'es'
      );
      expect(result.hasContradictions).toBe(false);
    });

    it('should detect theme contradiction', () => {
      const existingData = { theme: 'fantasy' };
      const result = service.detectContradictions(
        'Prefiero ciencia ficción',
        existingData,
        'es'
      );
      expect(result.hasContradictions).toBe(true);
      expect(result.contradictingFields[0].field).toBe('theme');
    });
  });

  describe('detectLanguage', () => {
    it('should detect Spanish from common words', () => {
      expect(service.detectLanguage('quiero crear un universo')).toBe('es');
      expect(service.detectLanguage('el personaje se llama Juan')).toBe('es');
    });

    it('should detect English from common words', () => {
      expect(service.detectLanguage('I want to create a universe')).toBe('en');
      expect(service.detectLanguage('the character is named John')).toBe('en');
    });

    it('should detect Spanish from accented characters', () => {
      expect(service.detectLanguage('descripción del héroe')).toBe('es');
      expect(service.detectLanguage('fantasía mágica')).toBe('es');
    });

    it('should default to Spanish for ambiguous input', () => {
      expect(service.detectLanguage('test')).toBe('es');
    });
  });

  describe('getFieldConfidence', () => {
    it('should increase confidence for explicit source', () => {
      const field = { field: 'name', value: 'Test', confidence: 0.5, source: 'explicit' as const };
      const confidence = service.getFieldConfidence(field);
      expect(confidence).toBeGreaterThan(0.7);
    });

    it('should moderately increase confidence for inferred source', () => {
      const field = { field: 'name', value: 'Test', confidence: 0.5, source: 'inferred' as const };
      const confidence = service.getFieldConfidence(field);
      expect(confidence).toBeGreaterThan(0.5);
      expect(confidence).toBeLessThan(0.9);
    });

    it('should cap confidence at 1.0', () => {
      const field = { field: 'name', value: 'Very long value here', confidence: 0.9, source: 'explicit' as const };
      const confidence = service.getFieldConfidence(field);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('needsClarification', () => {
    it('should request clarification for create without name', () => {
      const result = service.detectIntent('Crear un universo');
      // No explicit name provided
      expect(result.needsClarification).toBe(true);
    });

    it('should not request clarification when name is provided', () => {
      const result = service.detectIntent('Crear universo llamado "Test Universe"');
      // Name is explicit
      expect(result.needsClarification).toBe(false);
    });

    it('should include clarification questions', () => {
      const result = service.detectIntent('Crear un personaje');
      expect(result.clarificationQuestions).toBeDefined();
      if (result.clarificationQuestions) {
        expect(result.clarificationQuestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('configure', () => {
    it('should update configuration', () => {
      service.configure({ defaultLanguage: 'en', autoDetectLanguage: false });

      const result = service.detectIntent('crear universo');
      // Should use English as default despite Spanish input
      expect(result.language).toBe('en');
    });

    it('should merge partial configuration', () => {
      service.configure({ minFieldConfidence: 0.3 });
      // Other settings should remain default
    });
  });

  describe('context awareness', () => {
    it('should use context target when no explicit target', () => {
      const result = service.detectIntent('sí, correcto', { currentTarget: 'character' });
      expect(result.target).toBe('character');
    });

    it('should override context target when explicit target found', () => {
      const result = service.detectIntent('crear un universo nuevo', { currentTarget: 'character' });
      expect(result.target).toBe('universe');
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      const result = service.detectIntent('');
      expect(result.action).toBe('query');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle very long input', () => {
      const longInput = 'Quiero crear un universo de fantasía ' + 'muy detallado '.repeat(100);
      const result = service.detectIntent(longInput);
      expect(result.action).toBe('create');
      expect(result.target).toBe('universe');
    });

    it('should handle mixed language input', () => {
      const result = service.detectIntent('Quiero create a universe');
      expect(result.action).toBe('create');
      expect(result.target).toBe('universe');
    });

    it('should handle special characters', () => {
      const result = service.detectIntent('Crear universo llamado "El Señor de los Anillos!!!"');
      const nameField = result.fields.find(f => f.field === 'name');
      expect(nameField).toBeTruthy();
    });

    it('should handle numeric values in fields', () => {
      const fields = service.extractFields('Establecer puntos iniciales: 150', 'universe', 'es');
      // Should handle numeric extraction
      expect(fields).toBeDefined();
    });
  });

  describe('intent pattern matching', () => {
    it('should match universe with mundo keyword', () => {
      const result = service.detectIntent('Crear un nuevo mundo de ciencia ficción');
      expect(result.target).toBe('universe');
    });

    it('should match character with héroe keyword', () => {
      const result = service.detectIntent('Nuevo héroe llamado Gandalf');
      expect(result.target).toBe('character');
    });

    it('should prioritize more specific patterns', () => {
      // "crear universo" should match universe, not just "crear"
      const result = service.detectIntent('Quiero crear un universo nuevo');
      expect(result.target).toBe('universe');
    });
  });
});
