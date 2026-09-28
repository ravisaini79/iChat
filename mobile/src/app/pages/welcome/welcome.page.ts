import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon],
  template: `
    <ion-content class="welcome-content">
      <div class="welcome-container">
        <div class="header-section">
          <h1 class="welcome-title">Welcome to IChat</h1>
          <p class="welcome-subtitle">Simple, secure, real-time messaging</p>
        </div>

        <div class="hero-section">
          <div class="illustration-circle">
            <img src="assets/logo.svg" alt="IChat Hero" class="hero-image" />
          </div>
        </div>

        <div class="footer-section">
          <p class="terms-text">
            Read our <span class="link">Privacy Policy</span>. Tap "Agree & Continue" to accept the <span class="link">Terms of Service</span>.
          </p>

          <ion-button expand="block" class="btn-primary main-btn" (click)="continue()">
            AGREE & CONTINUE
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .welcome-content {
      --background: var(--ichat-bg-primary);
    }
    .welcome-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 40px 24px 32px 24px;
      text-align: center;
    }
    .welcome-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--ichat-text-primary);
      margin: 0 0 8px 0;
    }
    .welcome-subtitle {
      font-size: 1rem;
      color: var(--ichat-text-secondary);
      margin: 0;
    }
    .hero-section {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 32px 0;
    }
    .illustration-circle {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: rgba(0, 168, 132, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0, 168, 132, 0.15);
    }
    .hero-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .terms-text {
      font-size: 0.85rem;
      color: var(--ichat-text-secondary);
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .link {
      color: var(--ion-color-secondary);
      font-weight: 600;
      cursor: pointer;
    }
    .main-btn {
      --padding-top: 16px;
      --padding-bottom: 16px;
      font-size: 1rem;
      letter-spacing: 0.5px;
    }
  `],
})
export class WelcomePage {
  constructor(private router: Router) {}

  continue() {
    this.router.navigate(['/phone']);
  }
}
