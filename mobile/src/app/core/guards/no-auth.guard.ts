import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  let isLoggedIn = authService.isAuthenticated();
  if (!isLoggedIn) {
    isLoggedIn = await authService.initSession();
  }

  if (isLoggedIn) {
    if (authService.isProfileComplete()) {
      router.navigate(['/home'], { replaceUrl: true });
    } else {
      router.navigate(['/profile-setup'], { replaceUrl: true });
    }
    return false;
  }
  return true;
};
