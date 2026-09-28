import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Attempt session restore
  const restored = await authService.initSession();
  if (restored) {
    return true;
  }

  router.navigate(['/welcome'], { replaceUrl: true });
  return false;
};
