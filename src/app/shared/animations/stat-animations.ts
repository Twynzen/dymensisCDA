import {
  trigger,
  state,
  style,
  animate,
  transition,
  keyframes
} from '@angular/animations';

export const statChangeAnimation = trigger('statChange', [
  transition(':increment', [
    animate(
      '400ms ease-out',
      keyframes([
        style({ transform: 'scale(1)', offset: 0 }),
        style({ transform: 'scale(1.3)', color: '#4CAF50', textShadow: '0 0 10px #4CAF50', offset: 0.3 }),
        style({ transform: 'scale(1)', color: '*', textShadow: 'none', offset: 1 })
      ])
    )
  ]),
  transition(':decrement', [
    animate(
      '400ms ease-out',
      keyframes([
        style({ transform: 'scale(1)', offset: 0 }),
        style({ transform: 'scale(0.7)', color: '#F44336', textShadow: '0 0 10px #F44336', offset: 0.3 }),
        style({ transform: 'scale(1)', color: '*', textShadow: 'none', offset: 1 })
      ])
    )
  ])
]);

export const awakeningAnimation = trigger('awakening', [
  state('normal', style({ boxShadow: 'none' })),
  state('awakened', style({ boxShadow: '0 0 30px gold, 0 0 60px rgba(255,215,0,0.5)' })),
  transition('normal => awakened', [
    animate(
      '1.5s ease-in-out',
      keyframes([
        style({ boxShadow: 'none', offset: 0 }),
        style({ boxShadow: '0 0 50px gold, 0 0 100px rgba(255,215,0,0.8)', offset: 0.5 }),
        style({ boxShadow: '0 0 30px gold, 0 0 60px rgba(255,215,0,0.5)', offset: 1 })
      ])
    )
  ]),
  transition('awakened => normal', [
    animate('0.5s ease-out', style({ boxShadow: 'none' }))
  ])
]);

export const progressBarAnimation = trigger('progressFill', [
  transition('* => *', [
    animate('600ms cubic-bezier(0.4, 0, 0.2, 1)')
  ])
]);

export const fadeInAnimation = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(10px)' }),
    animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
  ])
]);

export const slideInAnimation = trigger('slideIn', [
  transition(':enter', [
    style({ transform: 'translateX(-100%)' }),
    animate('300ms ease-out', style({ transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ transform: 'translateX(100%)' }))
  ])
]);

export const pulseAnimation = trigger('pulse', [
  state('inactive', style({ transform: 'scale(1)' })),
  state('active', style({ transform: 'scale(1)' })),
  transition('inactive => active', [
    animate(
      '600ms ease-in-out',
      keyframes([
        style({ transform: 'scale(1)', offset: 0 }),
        style({ transform: 'scale(1.05)', offset: 0.5 }),
        style({ transform: 'scale(1)', offset: 1 })
      ])
    )
  ])
]);

export const listAnimation = trigger('listAnimation', [
  transition('* => *', [
    animate(
      '300ms ease-out',
      keyframes([
        style({ opacity: 0, transform: 'translateY(20px)', offset: 0 }),
        style({ opacity: 1, transform: 'translateY(0)', offset: 1 })
      ])
    )
  ])
]);
