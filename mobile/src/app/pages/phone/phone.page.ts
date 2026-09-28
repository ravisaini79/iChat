import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonIcon,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  CountryPickerModalComponent,
  Country,
  COUNTRIES,
} from '../../shared/components/country-picker-modal/country-picker-modal.component';

@Component({
  selector: 'app-phone-number',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonItem,
    IonLabel,
    IonInput,
    IonIcon,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-title>Enter phone number</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="phone-content ion-padding">
      <div class="phone-container">
        <p class="instruction-text">
          IChat will send an SMS message to verify your phone number. Enter your country code and phone number.
        </p>

        <div class="form-card">
          <!-- Country Selector Item -->
          <div class="country-selector" (click)="openCountryPicker()">
            <span class="flag">{{ selectedCountry().flag }}</span>
            <span class="country-name">{{ selectedCountry().name }}</span>
            <span class="dropdown-arrow">▼</span>
          </div>

          <!-- Phone Number Input Group -->
          <div class="phone-input-group">
            <div class="dial-code-badge">
              {{ selectedCountry().dialCode }}
            </div>
            <input
              type="tel"
              class="phone-input"
              placeholder="Phone number"
              [value]="phoneNumber()"
              (input)="onPhoneInput($event)"
              maxlength="15"
            />
          </div>
        </div>

        <div class="action-section">
          <ion-button
            expand="block"
            class="btn-primary next-btn"
            [disabled]="loading() || !isValidPhone()"
            (click)="sendOtp()"
          >
            @if (loading()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              NEXT
            }
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .phone-content {
      --background: var(--ichat-bg-primary);
    }
    .phone-container {
      max-width: 480px;
      margin: 0 auto;
      padding: 16px 8px;
    }
    .instruction-text {
      text-align: center;
      color: var(--ichat-text-secondary);
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .form-card {
      background: var(--ichat-bg-card);
      border-radius: 16px;
      padding: 16px;
      border: 1px solid var(--ichat-border-color);
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
      margin-bottom: 32px;
    }
    .country-selector {
      display: flex;
      align-items: center;
      padding: 14px 12px;
      border-bottom: 1.5px solid var(--ichat-border-color);
      cursor: pointer;
      font-weight: 600;
      color: var(--ichat-text-primary);
    }
    .flag {
      font-size: 1.5rem;
      margin-right: 12px;
    }
    .country-name {
      flex: 1;
      font-size: 1.05rem;
    }
    .dropdown-arrow {
      font-size: 0.75rem;
      color: var(--ion-color-primary);
    }
    .phone-input-group {
      display: flex;
      align-items: center;
      padding-top: 14px;
    }
    .dial-code-badge {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--ion-color-primary);
      padding: 8px 12px;
      background: rgba(0, 168, 132, 0.08);
      border-radius: 10px;
      margin-right: 12px;
    }
    .phone-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--ichat-text-primary);
      letter-spacing: 0.5px;
    }
    .phone-input::placeholder {
      color: var(--ichat-text-secondary);
      font-weight: 400;
    }
    .next-btn {
      --padding-top: 16px;
      --padding-bottom: 16px;
      font-size: 1rem;
    }
  `],
})
export class PhoneNumberPage {
  selectedCountry = signal<Country>(COUNTRIES[0]); // India default
  phoneNumber = signal<string>('');
  loading = signal<boolean>(false);

  private modalCtrl = inject(ModalController);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  async openCountryPicker() {
    const modal = await this.modalCtrl.create({
      component: CountryPickerModalComponent,
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      this.selectedCountry.set(data);
    }
  }

  onPhoneInput(event: any) {
    const cleaned = (event.target.value || '').replace(/\D/g, '');
    this.phoneNumber.set(cleaned);
  }

  isValidPhone(): boolean {
    const val = this.phoneNumber();
    return val.length >= 7 && val.length <= 15;
  }

  async sendOtp() {
    if (!this.isValidPhone()) {
      this.toastService.showError('Please enter a valid phone number');
      return;
    }

    const fullPhone = `${this.selectedCountry().dialCode}${this.phoneNumber()}`;
    this.loading.set(true);

    const success = await this.authService.sendOtp(
      fullPhone,
      this.selectedCountry().dialCode,
    );
    this.loading.set(false);

    if (success) {
      this.router.navigate(['/otp'], {
        queryParams: {
          phone: fullPhone,
          code: this.selectedCountry().dialCode,
        },
      });
    }
  }
}
