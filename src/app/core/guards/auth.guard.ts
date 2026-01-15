import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to finish loading, then check if authenticated
  return toObservable(authService.loading).pipe(
    filter(loading => !loading),
    take(1),
    map(() => {
      if (authService.isAuthenticated()) {
        return true;
      }
      router.navigate(['/auth/login']);
      return false;
    })
  );
};

export const publicOnlyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Redirect to home if already authenticated
  return toObservable(authService.loading).pipe(
    filter(loading => !loading),
    take(1),
    map(() => {
      if (!authService.isAuthenticated()) {
        return true;
      }
      router.navigate(['/tabs/characters']);
      return false;
    })
  );
};
