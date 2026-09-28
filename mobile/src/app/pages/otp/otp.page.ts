import { Component, OnInit, signal, inject, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonSpinner,
  IonButtons,
  IonBackButton,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-otp-verification',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonSpinner,
    IonButtons,
    IonBackButton,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/phone"></ion-back-button>
        </ion-buttons>
        <ion-title>Verify {{ fullPhone() }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="otp-content ion-padding">
      <div class="otp-container">
        <p class="instruction-text">
          Waiting to automatically detect an SMS sent to <strong class="phone-highlight">{{ fullPhone() }}</strong>.
          <span class="edit-link" (click)="goBack()">Wrong number?</span>
        </p>

        <!-- 6-Digit PIN Boxes -->
        <div class="otp-boxes-container">
          @for (box of otpDigits; track $index) {
            <input
              #otpInput
              type="tel"
              maxlength="1"
              class="otp-box"
              [value]="box"
              (input)="onDigitInput($event, $index)"
              (keydown)="onKeyDown($event, $index)"
            />
          }
        </div>

        <p class="dev-hint">
          💡 <em>Dev Test Code: Enter <strong>123456</strong></em>
        </p>

        <div class="resend-section">
          @if (resendTimer() > 0) {
            <p class="timer-text">Resend SMS in <strong>{{ resendTimer() }}s</strong></p>
          } @else {
            <ion-button fill="clear" color="primary" (click)="resendOtp()" [disabled]="loading()">
              Resend SMS
            </ion-button>
          }
        </div>

        <div class="action-section">
          <ion-button
            expand="block"
            class="btn-primary submit-btn"
            [disabled]="loading() || getCombinedCode().length !== 6"
            (click)="submitOtp()"
          >
            @if (loading()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              VERIFY
            }
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .otp-content {
      --background: var(--ichat-bg-primary);
    }
    .otp-container {
      max-width: 480px;
      margin: 0 auto;
      padding: 16px 8px;
      text-align: center;
    }
    .instruction-text {
      color: var(--ichat-text-secondary);
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 32px;
    }
    .phone-highlight {
      color: var(--ichat-text-primary);
    }
    .edit-link {
      color: var(--ion-color-secondary);
      font-weight: 600;
      cursor: pointer;
      margin-left: 6px;
    }
    .otp-boxes-container {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 24px;
    }
    .otp-box {
      width: 48px;
      height: 56px;
      border-radius: 12px;
      border: 2px solid var(--ichat-border-color);
      background: var(--ichat-bg-card);
      font-size: 1.5rem;
      font-weight: 700;
      text-align: center;
      color: var(--ion-color-primary);
      outline: none;
      transition: all 0.2s ease;
    }
    .otp-box:focus {
      border-color: var(--ion-color-primary);
      box-shadow: 0 0 0 3px rgba(0, 168, 132, 0.2);
    }
    .dev-hint {
      font-size: 0.85rem;
      color: var(--ion-color-primary);
      margin-bottom: 24px;
    }
    .resend-section {
      margin-bottom: 32px;
    }
    .timer-text {
      font-size: 0.9rem;
      color: var(--ichat-text-secondary);
    }
    .submit-btn {
      --padding-top: 16px;
      --padding-bottom: 16px;
      font-size: 1rem;
    }
  `],
})
export class OtpVerificationPage implements OnInit {
  fullPhone = signal<string>('');
  countryCode = signal<string>('+91');
  otpDigits: string[] = ['', '', '', '', '', ''];
  resendTimer = signal<number>(60);
  loading = signal<boolean>(false);

  @ViewChildren('otpInput') inputs!: QueryList<ElementRef>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  private timerInterval: any;

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['phone']) {
        this.fullPhone.set(params['phone']);
        this.countryCode.set(params['code'] || '+91');
      }
    });
    this.startTimer();
  }

  startTimer() {
    this.resendTimer.set(60);
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.resendTimer() > 0) {
        this.resendTimer.update((v) => v - 1);
      } else {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  onDigitInput(event: any, index: number) {
    const val = event.target.value.replace(/\D/g, '');
    this.otpDigits[index] = val ? val.charAt(0) : '';

    if (val && index < 5) {
      const inputArray = this.inputs.toArray();
      inputArray[index + 1].nativeElement.focus();
    }

    if (this.getCombinedCode().length === 6) {
      this.submitOtp();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const inputArray = this.inputs.toArray();
      inputArray[index - 1].nativeElement.focus();
    }
  }

  getCombinedCode(): string {
    return this.otpDigits.join('');
  }

  async submitOtp() {
    const code = this.getCombinedCode();
    if (code.length !== 6) {
      this.toastService.showError('Please enter the full 6-digit OTP code');
      return;
    }

    this.loading.set(true);
    const success = await this.authService.verifyOtp(this.fullPhone(), code);
    this.loading.set(false);
  }

  async resendOtp() {
    this.loading.set(true);
    const success = await this.authService.sendOtp(this.fullPhone(), this.countryCode());
    this.loading.set(false);
    if (success) {
      this.startTimer();
    }
  }

  goBack() {
    this.router.navigate(['/phone']);
  }
}
