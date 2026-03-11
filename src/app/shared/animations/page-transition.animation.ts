import {
  trigger,
  transition,
  style,
  animate,
  query,
  group,
} from '@angular/animations';

/**
 * Transición de página tipo "pase de balón".
 * Usa position:absolute con un wrapper con position:relative para evitar layout shifts.
 * Las duraciones se controlan con CSS variables (--dur-slow etc) vía inline styles.
 */
export const pageTransition = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
      }),
    ], { optional: true }),

    group([
      // Página que SALE: fade + slide izquierda
      query(':leave', [
        animate(
          '250ms cubic-bezier(0.4, 0, 1, 1)',
          style({ opacity: 0, transform: 'translateX(-24px) scale(0.98)' })
        ),
      ], { optional: true }),

      // Página que ENTRA: llega desde la derecha suavemente
      query(':enter', [
        style({ opacity: 0, transform: 'translateX(24px) scale(0.98)' }),
        animate(
          '380ms 60ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateX(0) scale(1)' })
        ),
      ], { optional: true }),
    ]),
  ]),
]);

/** Alias exportado para mobile (mismo trigger — duración más corta controlada por CSS vars) */
export const pageTransitionMobile = pageTransition;
