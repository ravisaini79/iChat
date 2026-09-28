import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const profileGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isProfileComplete()) {
    return true;
  }

  const restored = await authService.restoreSession();
  if (restored && authService.isProfileComplete()) {
    return true;
  }

  router.navigate(['/profile-setup'], { replaceUrl: true });
  return false;
};
