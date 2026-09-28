import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, ApiResponse } from './api.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';
import { firstValueFrom } from 'rxjs';

export interface UserProfile {
  displayName: string;
  about: string;
  avatarUrl?: string | null;
}

export interface User {
  _id: string;
  phoneNumber: string;
  countryCode?: string;
  isProfileComplete: boolean;
  profile?: UserProfile | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isProfileComplete = computed(() => !!this.currentUser()?.isProfileComplete);

  constructor(
    private apiService: ApiService,
    private storageService: StorageService,
    private toastService: ToastService,
    private router: Router,
  ) {
    this.initSession();
  }

  async initSession(): Promise<boolean> {
    return this.restoreSession();
  }

  async restoreSession(): Promise<boolean> {
    const token = await this.storageService.get<string>('accessToken');
    if (!token) return false;

    try {
      const res = await firstValueFrom(this.apiService.get<User>('users/me'));
      if (res && res.data) {
        this.currentUser.set(res.data);
        return true;
      }
    } catch (e) {
      // Try refresh token before giving up
      const refreshed = await this.refreshToken();
      if (refreshed) {
        try {
          const res = await firstValueFrom(this.apiService.get<User>('users/me'));
          if (res && res.data) {
            this.currentUser.set(res.data);
            return true;
          }
        } catch (err) {}
      }
      await this.logout();
    }
    return false;
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = await this.storageService.get<string>('refreshToken');
    if (!refreshToken) return false;

    try {
      const res = await firstValueFrom(
        this.apiService.post<{ accessToken: string; refreshToken: string }>('auth/refresh', {
          refreshToken,
        }),
      );
      if (res.success && res.data) {
        await this.storageService.set('accessToken', res.data.accessToken);
        await this.storageService.set('refreshToken', res.data.refreshToken);
        return true;
      }
    } catch (e) {}
    return false;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }

  async sendOtp(phoneNumber: string, countryCode: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.apiService.post<{ message: string; devOtp?: string }>('auth/send-otp', {
          phoneNumber,
          countryCode,
        }),
      );
      if (res.success) {
        this.toastService.showSuccess(res.message || 'OTP sent successfully!');
        if (res.data?.devOtp) {
          this.toastService.showInfo(`Development OTP Code: ${res.data.devOtp}`, 6000);
        }
        return true;
      }
    } catch (e) {
      // Error handled in ApiService
    }
    return false;
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.apiService.post<{
          tokens: { accessToken: string; refreshToken: string };
          user: User;
        }>('auth/verify-otp', { phoneNumber, code }),
      );

      if (res.success && res.data) {
        await this.storageService.set('accessToken', res.data.tokens.accessToken);
        await this.storageService.set('refreshToken', res.data.tokens.refreshToken);
        this.currentUser.set(res.data.user);
        this.toastService.showSuccess('Phone number verified!');

        if (res.data.user.isProfileComplete) {
          this.router.navigate(['/home'], { replaceUrl: true });
        } else {
          this.router.navigate(['/profile-setup'], { replaceUrl: true });
        }
        return true;
      }
    } catch (e) {
      // Error handled in ApiService
    }
    return false;
  }

  async setupProfile(displayName: string, about?: string, avatarUrl?: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.apiService.post<User>('users/profile-setup', {
          displayName,
          about,
          avatarUrl,
        }),
      );

      if (res.success && res.data) {
        this.currentUser.set(res.data);
        this.toastService.showSuccess('Profile setup complete!');
        return true;
      }
    } catch (e) {
      // Error handled in ApiService
    }
    return false;
  }

  async logout(): Promise<void> {
    await this.storageService.remove('accessToken');
    await this.storageService.remove('refreshToken');
    this.currentUser.set(null);
    this.router.navigate(['/welcome'], { replaceUrl: true });
  }
}
