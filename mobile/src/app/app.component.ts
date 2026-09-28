import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet, NavController } from '@ionic/angular/standalone';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private navCtrl = inject(NavController);
  private authService = inject(AuthService);

  ngOnInit() {
    if (Capacitor.isNativePlatform()) {
      App.addListener('backButton', (state) => {
        const url = this.router.url;

        // If user is on root screens (Home, Welcome), minimize app (like WhatsApp!)
        if (url.includes('/home') || url.includes('/welcome') || url === '/' || url.includes('/splash')) {
          App.minimizeApp();
          return;
        }

        // If user is on auth/register pages and logged in, redirect to home or minimize
        if ((url.includes('/phone') || url.includes('/otp') || url.includes('/profile-setup')) && this.authService.isLoggedIn()) {
          if (this.authService.isProfileComplete()) {
            this.navCtrl.navigateRoot('/home');
          } else {
            App.minimizeApp();
          }
          return;
        }

        // If inside chat, new-chat, profile, details -> navigate back to home
        if (url.includes('/chat/') || url.includes('/user/') || url.includes('/new-chat') || url.includes('/create-group') || url.includes('/group-details')) {
          this.navCtrl.navigateBack('/home');
          return;
        }

        // Fallback: navigate back safely
        if (state.canGoBack) {
          window.history.back();
        } else {
          App.minimizeApp();
        }
      });
    }
  }
}
