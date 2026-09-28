import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule, IonContent, IonSpinner],
  template: `
    <ion-content class="splash-content">
      <div class="splash-container">
        <div class="logo-wrapper">
          <img src="assets/logo.svg" alt="IChat Logo" class="brand-logo" />
        </div>
        <h1 class="brand-title">IChat</h1>
        <p class="brand-tagline">Connect. Chat. Share.</p>
        <span class="version-tag">v1.0.3</span>

        <div class="spinner-container">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .splash-content {
      --background: var(--ichat-bg-primary);
    }
    .splash-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .logo-wrapper {
      width: 120px;
      height: 120px;
      margin-bottom: 24px;
      animation: pulseLogo 2s infinite ease-in-out;
    }
    .brand-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .brand-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--ion-color-primary);
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
    }
    .brand-tagline {
      font-size: 1.1rem;
      color: var(--ichat-text-secondary);
      font-weight: 500;
      margin: 0 0 16px 0;
    }
    .version-tag {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--ion-color-primary);
      background: rgba(0, 168, 132, 0.12);
      padding: 4px 12px;
      border-radius: 12px;
      margin-bottom: 32px;
      display: inline-block;
    }
    .spinner-container {
      margin-top: 24px;
    }
    @keyframes pulseLogo {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }
  `],
})
export class SplashPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  async ngOnInit() {
    setTimeout(async () => {
      const isLoggedIn = await this.authService.initSession();
      if (isLoggedIn) {
        if (this.authService.isProfileComplete()) {
          this.router.navigate(['/home'], { replaceUrl: true });
        } else {
          this.router.navigate(['/profile-setup'], { replaceUrl: true });
        }
      } else {
        this.router.navigate(['/welcome'], { replaceUrl: true });
      }
    }, 1800);
  }
}
