import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { profileGuard } from './core/guards/profile.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full',
  },
  {
    path: 'splash',
    loadComponent: () => import('./pages/splash/splash.page').then((m) => m.SplashPage),
  },
  {
    path: 'welcome',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./pages/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    path: 'phone',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./pages/phone/phone.page').then((m) => m.PhoneNumberPage),
  },
  {
    path: 'otp',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./pages/otp/otp.page').then((m) => m.OtpVerificationPage),
  },
  {
    path: 'profile-setup',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile-setup/profile-setup.page').then((m) => m.ProfileSetupPage),
  },
  {
    path: 'home',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'new-chat',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./pages/new-chat/new-chat.page').then((m) => m.NewChatPage),
  },
  {
    path: 'create-group',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./pages/create-group/create-group.page').then((m) => m.CreateGroupPage),
  },
  {
    path: 'group-details/:id',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./pages/group-details/group-details.page').then((m) => m.GroupDetailsPage),
  },
  {
    path: 'chat/:id',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./pages/chat/chat.page').then((m) => m.ChatPage),
  },
  {
    path: 'call-screen/:id',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./pages/call-screen/call-screen.page').then((m) => m.CallScreenPage),
  },
  {
    path: 'user/:id',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./pages/user-profile/user-profile.page').then((m) => m.UserProfilePage),
  },
  {
    path: 'contacts',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./pages/new-chat/new-chat.page').then((m) => m.NewChatPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./pages/profile-setup/profile-setup.page').then((m) => m.ProfileSetupPage),
  },
  {
    path: 'my-media',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./pages/my-media/my-media.page').then((m) => m.MyMediaPage),
  },
  {
    path: 'backup-settings',
    canActivate: [authGuard, profileGuard],
    loadComponent: () => import('./pages/backup-settings/backup-settings.page').then((m) => m.BackupSettingsPage),
  },
  {
    path: '**',
    redirectTo: 'splash',
  },
];
