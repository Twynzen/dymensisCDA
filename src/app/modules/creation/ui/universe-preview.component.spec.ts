import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UniversePreviewComponent } from './universe-preview.component';
import { IonicModule } from '@ionic/angular';
import { Universe } from '../../../core/models';

describe('UniversePreviewComponent', () => {
  let component: UniversePreviewComponent;
  let fixture: ComponentFixture<UniversePreviewComponent>;

  const mockUniverse: Partial<Universe> = {
    name: 'Test Universe',
    description: 'A test universe for testing purposes',
    statDefinitions: {
      strength: {
        name: 'Fuerza',
        abbreviation: 'STR',
        icon: 'barbell',
        minValue: 1,
        maxValue: 100,
        defaultValue: 10,
        category: 'primary',
        color: '#FF5722'
      },
      agility: {
        name: 'Agilidad',
        abbreviation: 'AGI',
        icon: 'flash',
        minValue: 1,
        maxValue: 100,
        defaultValue: 10,
        category: 'primary',
        color: '#03A9F4'
      }
    },
    progressionRules: [
      {
        id: 'rule-1',
        keywords: ['entrenar'],
        affectedStats: ['strength'],
        maxChangePerAction: 3,
        description: 'Entrenamiento aumenta fuerza'
      }
    ],
    awakeningSystem: {
      enabled: true,
      levels: ['E', 'D', 'C', 'B', 'A', 'S'],
      thresholds: [0, 50, 100, 200, 350, 500]
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UniversePreviewComponent, IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(UniversePreviewComponent);
    component = fixture.componentInstance;
    component.universe = mockUniverse;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('statsCount', () => {
    it('should return correct count of stats', () => {
      expect(component.statsCount).toBe(2);
    });

    it('should return 0 when no statDefinitions', () => {
      component.universe = { name: 'Empty' };
      expect(component.statsCount).toBe(0);
    });
  });

  describe('statsList', () => {
    it('should return array of stats with correct structure', () => {
      const stats = component.statsList;

      expect(stats.length).toBe(2);
      expect(stats[0].key).toBeDefined();
      expect(stats[0].abbreviation).toBeDefined();
      expect(stats[0].icon).toBeDefined();
      expect(stats[0].color).toBeDefined();
    });

    it('should include strength stat', () => {
      const stats = component.statsList;
      const strength = stats.find(s => s.key === 'strength');

      expect(strength).toBeDefined();
      expect(strength?.abbreviation).toBe('STR');
      expect(strength?.icon).toBe('barbell');
      expect(strength?.color).toBe('#FF5722');
    });

    it('should return empty array when no statDefinitions', () => {
      component.universe = { name: 'Empty' };
      expect(component.statsList).toEqual([]);
    });

    it('should use default icon when not provided', () => {
      component.universe = {
        ...mockUniverse,
        statDefinitions: {
          test: {
            name: 'Test',
            abbreviation: 'TST',
            minValue: 1,
            maxValue: 100,
            defaultValue: 10,
            category: 'primary',
            color: '#000000'
          } as any
        }
      };

      const stats = component.statsList;
      expect(stats[0].icon).toBe('stats-chart');
    });

    it('should use default color when not provided', () => {
      component.universe = {
        ...mockUniverse,
        statDefinitions: {
          test: {
            name: 'Test',
            abbreviation: 'TST',
            icon: 'star',
            minValue: 1,
            maxValue: 100,
            defaultValue: 10,
            category: 'primary'
          } as any
        }
      };

      const stats = component.statsList;
      expect(stats[0].color).toBe('#4CAF50');
    });
  });

  describe('getHeaderBackground()', () => {
    it('should return default gradient when no cover image', () => {
      component.universe = { ...mockUniverse };
      delete (component.universe as any).coverImage;
      const bg = component.getHeaderBackground();

      expect(bg).toContain('linear-gradient');
      expect(bg).toContain('135deg');
    });

    it('should return image background when coverImage exists', () => {
      component.universe = { ...mockUniverse, coverImage: 'https://example.com/image.jpg' } as any;
      const bg = component.getHeaderBackground();

      expect(bg).toContain('url(https://example.com/image.jpg)');
      expect(bg).toContain('center/cover');
    });
  });

  describe('Output Events', () => {
    it('should emit confirm event', () => {
      spyOn(component.confirm, 'emit');

      component.confirm.emit();

      expect(component.confirm.emit).toHaveBeenCalled();
    });

    it('should emit adjust event', () => {
      spyOn(component.adjust, 'emit');

      component.adjust.emit();

      expect(component.adjust.emit).toHaveBeenCalled();
    });

    it('should emit regenerate event', () => {
      spyOn(component.regenerate, 'emit');

      component.regenerate.emit();

      expect(component.regenerate.emit).toHaveBeenCalled();
    });
  });

  describe('Template Rendering', () => {
    it('should display universe name', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Test Universe');
    });

    it('should display universe description', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('A test universe for testing purposes');
    });

    it('should display stats count', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Estadísticas (2)');
    });

    it('should display awakening system when enabled', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Sistema de Rangos');
    });

    it('should display progression rules', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Reglas de Progresión');
      expect(compiled.textContent).toContain('Entrenamiento aumenta fuerza');
    });

    it('should hide awakening section when disabled', () => {
      component.universe = {
        ...mockUniverse,
        awakeningSystem: { enabled: false, levels: [], thresholds: [] }
      };
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Sistema de Rangos');
    });

    it('should hide rules section when no rules', () => {
      component.universe = {
        ...mockUniverse,
        progressionRules: []
      };
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Reglas de Progresión');
    });
  });
});
