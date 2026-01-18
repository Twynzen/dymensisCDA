import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkillIconName =
  | 'sword' | 'shield' | 'fire' | 'ice' | 'lightning' | 'skull' | 'sparkle' | 'star'
  | 'eye' | 'search' | 'gem' | 'dagger' | 'bow' | 'wand' | 'amulet' | 'muscle'
  | 'brain' | 'heart' | 'blood' | 'moon' | 'sun' | 'water' | 'leaf' | 'rock'
  | 'ghost' | 'eagle' | 'dragon' | 'lion' | 'wolf' | 'spider' | 'orb' | 'book';

@Component({
  selector: 'app-skill-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @switch (icon) {
        @case ('sword') {
          <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
          <path d="M13 19l6-6"/>
          <path d="M16 16l4 4"/>
          <path d="M19 21l2-2"/>
        }
        @case ('shield') {
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        }
        @case ('fire') {
          <path d="M12 2c.5 2.5 2.5 4.5 3 6.5.5 3-1.5 6-3 7.5-1.5-1.5-3.5-4.5-3-7.5.5-2 2.5-4 3-6.5z"/>
          <path d="M12 22c-3-2-5-5.5-5-9 0-2 1-4 2-5.5 1 1 2 2.5 3 4.5 1-2 2-3.5 3-4.5 1 1.5 2 3.5 2 5.5 0 3.5-2 7-5 9z"/>
        }
        @case ('ice') {
          <path d="M12 2v20"/>
          <path d="M2 12h20"/>
          <path d="m4.93 4.93 14.14 14.14"/>
          <path d="m19.07 4.93-14.14 14.14"/>
          <circle cx="12" cy="12" r="3"/>
        }
        @case ('lightning') {
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        }
        @case ('skull') {
          <circle cx="12" cy="10" r="7"/>
          <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="9" r="1.5" fill="currentColor"/>
          <path d="M9 21v-4h6v4"/>
          <path d="M12 17v4"/>
        }
        @case ('sparkle') {
          <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/>
          <path d="M19 3l.5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5z"/>
          <path d="M5 19l.5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5z"/>
        }
        @case ('star') {
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        }
        @case ('eye') {
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        }
        @case ('search') {
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
          <circle cx="11" cy="11" r="3"/>
        }
        @case ('gem') {
          <path d="M6 3h12l4 6-10 12L2 9z"/>
          <path d="M2 9h20"/>
          <path d="M12 21L8 9l4-6 4 6z"/>
        }
        @case ('dagger') {
          <path d="M12 2l2 7h-4l2-7z"/>
          <path d="M10 9h4v8l-2 5-2-5V9z"/>
          <path d="M8 12h8"/>
        }
        @case ('bow') {
          <path d="M2 12C2 6.5 6.5 2 12 2c0 5.5-4.5 10-10 10z"/>
          <path d="M22 12c0 5.5-4.5 10-10 10 0-5.5 4.5-10 10-10z"/>
          <path d="M12 2v20"/>
          <path d="M4 20L20 4"/>
        }
        @case ('wand') {
          <path d="M3 21l12-12"/>
          <path d="M11 5l4 4"/>
          <path d="M15 9l6-6"/>
          <path d="M19 3l2 2"/>
          <circle cx="17" cy="5" r="1" fill="currentColor"/>
        }
        @case ('amulet') {
          <circle cx="12" cy="14" r="6"/>
          <path d="M12 8V2"/>
          <path d="M9 2h6"/>
          <circle cx="12" cy="14" r="2"/>
        }
        @case ('muscle') {
          <path d="M7 12c-2-2-3-4-3-6s1-4 4-4c2 0 3 1 4 2 1-1 2-2 4-2 3 0 4 2 4 4s-1 4-3 6"/>
          <path d="M7 12c-1 2-1 4 0 6 1 3 5 4 5 4s4-1 5-4c1-2 1-4 0-6"/>
        }
        @case ('brain') {
          <path d="M12 2a6 6 0 0 0-6 6c0 2 1 3 2 4-1 1-2 2-2 4a6 6 0 0 0 6 6 6 6 0 0 0 6-6c0-2-1-3-2-4 1-1 2-2 2-4a6 6 0 0 0-6-6z"/>
          <path d="M12 2v20"/>
          <path d="M6 8c3 0 6 2 6 4"/>
          <path d="M18 8c-3 0-6 2-6 4"/>
          <path d="M6 16c3 0 6-2 6-4"/>
          <path d="M18 16c-3 0-6-2-6-4"/>
        }
        @case ('heart') {
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        }
        @case ('blood') {
          <path d="M12 2c-4 6-7 10-7 14a7 7 0 0 0 14 0c0-4-3-8-7-14z"/>
          <path d="M12 16v2"/>
          <path d="M10 18h4"/>
        }
        @case ('moon') {
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2"/>
          <path d="M12 21v2"/>
          <path d="M4.22 4.22l1.42 1.42"/>
          <path d="M18.36 18.36l1.42 1.42"/>
          <path d="M1 12h2"/>
          <path d="M21 12h2"/>
          <path d="M4.22 19.78l1.42-1.42"/>
          <path d="M18.36 5.64l1.42-1.42"/>
        }
        @case ('water') {
          <path d="M12 2c-4 6-7 10-7 14a7 7 0 0 0 14 0c0-4-3-8-7-14z"/>
          <path d="M8 16c1 2 3 3 4 3s3-1 4-3"/>
        }
        @case ('leaf') {
          <path d="M6 21c4-4 8-4 12-8 0 0-4-2-8 2s-4 6-4 6z"/>
          <path d="M6 21c0-6 4-10 12-12"/>
          <path d="M12 14c-2 2-3 4-3 6"/>
        }
        @case ('rock') {
          <path d="M2 17l5-10 4 6 5-8 6 12z"/>
          <path d="M2 17h20"/>
        }
        @case ('ghost') {
          <path d="M9 10h.01"/>
          <path d="M15 10h.01"/>
          <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2 2 3-3 3 3 2-2 3 3V10a8 8 0 0 0-8-8z"/>
        }
        @case ('eagle') {
          <path d="M12 4c-4 0-7 3-7 7 0 5 7 11 7 11s7-6 7-11c0-4-3-7-7-7z"/>
          <path d="M12 4V2"/>
          <path d="M8 8l-4-2"/>
          <path d="M16 8l4-2"/>
          <circle cx="10" cy="9" r="1" fill="currentColor"/>
          <circle cx="14" cy="9" r="1" fill="currentColor"/>
          <path d="M12 12v3"/>
        }
        @case ('dragon') {
          <path d="M3 8c0-2 1-4 3-4 1 0 2 1 2 2s-1 2-2 3c3-1 6-1 8 1"/>
          <path d="M21 8c0-2-1-4-3-4-1 0-2 1-2 2s1 2 2 3c-3-1-6-1-8 1"/>
          <path d="M12 10v6"/>
          <path d="M8 20c0-4 4-6 4-6s4 2 4 6"/>
          <circle cx="10" cy="8" r="1" fill="currentColor"/>
          <circle cx="14" cy="8" r="1" fill="currentColor"/>
        }
        @case ('lion') {
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v4"/>
          <path d="M12 18v4"/>
          <path d="M4.93 4.93l2.83 2.83"/>
          <path d="M16.24 16.24l2.83 2.83"/>
          <path d="M2 12h4"/>
          <path d="M18 12h4"/>
          <path d="M4.93 19.07l2.83-2.83"/>
          <path d="M16.24 7.76l2.83-2.83"/>
        }
        @case ('wolf') {
          <path d="M4 8c0-3 2-5 4-5l2 4 2-4 2 4 2-4c2 0 4 2 4 5"/>
          <path d="M4 8v6c0 4 3 7 8 8 5-1 8-4 8-8V8"/>
          <circle cx="9" cy="11" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="11" r="1.5" fill="currentColor"/>
          <path d="M12 14v2"/>
          <path d="M10 18l2 2 2-2"/>
        }
        @case ('spider') {
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 8V2"/>
          <path d="M12 22v-6"/>
          <path d="M8 12H2"/>
          <path d="M22 12h-6"/>
          <path d="M9 9L4 4"/>
          <path d="M20 20l-5-5"/>
          <path d="M9 15l-5 5"/>
          <path d="M20 4l-5 5"/>
        }
        @case ('orb') {
          <circle cx="12" cy="12" r="8"/>
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 4v2"/>
          <path d="M12 18v2"/>
          <path d="M4 12h2"/>
          <path d="M18 12h2"/>
        }
        @case ('book') {
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <path d="M8 7h8"/>
          <path d="M8 11h6"/>
        }
        @default {
          <circle cx="12" cy="12" r="8"/>
          <path d="M12 8v4l2 2"/>
        }
      }
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--icon-color, #9ca3af);
    }
  `]
})
export class SkillIconComponent {
  @Input() icon: SkillIconName = 'sparkle';
  @Input() size: number = 24;

  @HostBinding('style.--icon-color')
  @Input() color?: string;
}
