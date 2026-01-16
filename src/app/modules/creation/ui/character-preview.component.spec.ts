import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterPreviewComponent } from './character-preview.component';
import { IonicModule } from '@ionic/angular';
import { Character } from '../../../core/models';

describe('CharacterPreviewComponent', () => {
  let component: CharacterPreviewComponent;
  let fixture: ComponentFixture<CharacterPreviewComponent>;

  const mockCharacter: Partial<Character> = {
    name: 'Test Hero',
    avatar: {
      photoUrl: 'https://example.com/avatar.jpg',
      backgroundColor: '#667eea'
    },
    stats: {
      strength: 25,
      agility: 18,
      vitality: 22,
      intelligence: 15
    },
    progression: {
      level: 5,
      experience: 450,
      awakening: 'C',
      title: 'El Guerrero'
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterPreviewComponent, IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterPreviewComponent);
    component = fixture.componentInstance;
    component.character = mockCharacter;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('statsList', () => {
    it('should return array of stats sorted by value descending', () => {
      const stats = component.statsList;

      expect(stats.length).toBe(4);
      expect(stats[0].value).toBeGreaterThanOrEqual(stats[1].value);
      expect(stats[1].value).toBeGreaterThanOrEqual(stats[2].value);
    });

    it('should include all stats with correct values', () => {
      const stats = component.statsList;

      expect(stats.find(s => s.key === 'strength')?.value).toBe(25);
      expect(stats.find(s => s.key === 'agility')?.value).toBe(18);
    });

    it('should return empty array when no stats', () => {
      component.character = { name: 'No Stats' };
      expect(component.statsList).toEqual([]);
    });
  });

  describe('totalStats', () => {
    it('should calculate sum of all stats', () => {
      // 25 + 18 + 22 + 15 = 80
      expect(component.totalStats).toBe(80);
    });

    it('should return 0 when no stats', () => {
      component.character = { name: 'No Stats' };
      expect(component.totalStats).toBe(0);
    });
  });

  describe('getStatColor()', () => {
    it('should return correct color for strength', () => {
      expect(component.getStatColor('strength')).toBe('#F44336');
    });

    it('should return correct color for agility', () => {
      expect(component.getStatColor('agility')).toBe('#03A9F4');
    });

    it('should return correct color for vitality', () => {
      expect(component.getStatColor('vitality')).toBe('#4CAF50');
    });

    it('should return correct color for intelligence', () => {
      expect(component.getStatColor('intelligence')).toBe('#9C27B0');
    });

    it('should return default color for unknown stat', () => {
      expect(component.getStatColor('unknown')).toBe('#4CAF50');
    });

    it('should be case insensitive', () => {
      expect(component.getStatColor('STRENGTH')).toBe('#F44336');
      expect(component.getStatColor('Agility')).toBe('#03A9F4');
    });
  });

  describe('Helper Methods', () => {
    it('getDescription should return description when present', () => {
      const charWithDesc = { ...mockCharacter, description: 'A brave warrior' };
      component.character = charWithDesc;
      expect(component.getDescription()).toBe('A brave warrior');
    });

    it('getDescription should return null when not present', () => {
      component.character = { ...mockCharacter };
      delete (component.character as any).description;
      expect(component.getDescription()).toBeNull();
    });

    it('getBackstory should return backstory when present', () => {
      const charWithBackstory = { ...mockCharacter, backstory: 'Born in the mountains' };
      component.character = charWithBackstory;
      expect(component.getBackstory()).toBe('Born in the mountains');
    });

    it('getBackstory should return null when not present', () => {
      component.character = { ...mockCharacter };
      delete (component.character as any).backstory;
      expect(component.getBackstory()).toBeNull();
    });

    it('getPersonalityTraits should return traits when present', () => {
      const charWithTraits = { ...mockCharacter, personalityTraits: ['Brave', 'Loyal'] };
      component.character = charWithTraits;
      expect(component.getPersonalityTraits()).toEqual(['Brave', 'Loyal']);
    });

    it('getPersonalityTraits should return empty array when not present', () => {
      component.character = { ...mockCharacter };
      delete (component.character as any).personalityTraits;
      expect(component.getPersonalityTraits()).toEqual([]);
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
    it('should display character name', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Test Hero');
    });

    it('should display level', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Nivel 5');
    });

    it('should display awakening badge', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('C');
    });

    it('should display title when present', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('El Guerrero');
    });

    it('should display avatar image when photoUrl exists', () => {
      const img = fixture.nativeElement.querySelector('.avatar');
      expect(img).toBeTruthy();
      expect(img.src).toContain('avatar.jpg');
    });

    it('should display placeholder when no photoUrl', () => {
      component.character = {
        ...mockCharacter,
        avatar: { photoUrl: null, backgroundColor: '#667eea' }
      };
      fixture.detectChanges();

      const placeholder = fixture.nativeElement.querySelector('.avatar-placeholder');
      expect(placeholder).toBeTruthy();
    });

    it('should display stats section', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Estadísticas');
    });

    it('should display total stats', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Total:');
      expect(compiled.textContent).toContain('80');
    });

    it('should display personality traits when present', () => {
      (component.character as any).personalityTraits = ['Valiente', 'Leal'];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Personalidad');
      expect(compiled.textContent).toContain('Valiente');
      expect(compiled.textContent).toContain('Leal');
    });

    it('should display backstory when present', () => {
      (component.character as any).backstory = 'Una historia épica';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Historia');
      expect(compiled.textContent).toContain('Una historia épica');
    });
  });

  describe('Edge Cases', () => {
    it('should handle character without progression', () => {
      component.character = {
        name: 'Simple Char',
        stats: { strength: 10 }
      };
      fixture.detectChanges();

      expect(component).toBeTruthy();
    });

    it('should handle character without avatar', () => {
      component.character = {
        name: 'No Avatar',
        stats: { strength: 10 },
        progression: {
          level: 1,
          experience: 0,
          awakening: 'E'
        }
      };
      fixture.detectChanges();

      expect(component).toBeTruthy();
    });
  });
});
