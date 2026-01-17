import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take, tap } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('[AuthGuard] Checking auth for route:', state.url);
  console.log('[AuthGuard] Current auth state:', {
    loading: authService.loading(),
    isAuthenticated: authService.isAuthenticated(),
    userId: authService.userId()
  });

  // Wait for auth to finish loading, then check if authenticated
  return toObservable(authService.loading).pipe(
    tap(loading => console.log('[AuthGuard] Loading state:', loading)),
    filter(loading => !loading),
    take(1),
    map(() => {
      const isAuth = authService.isAuthenticated();
      console.log('[AuthGuard] Auth loaded. isAuthenticated:', isAuth, 'userId:', authService.userId());

      if (isAuth) {
        return true;
      }

      console.log('[AuthGuard] Not authenticated, redirecting to /login');
      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
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
