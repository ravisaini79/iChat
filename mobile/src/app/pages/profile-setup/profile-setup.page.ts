import { Component, OnInit, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonInput,
  IonButtons,
  NavController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { MediaService } from '../../core/services/media.service';
import { ContactsService } from '../../core/services/contacts.service';
import { ToastService } from '../../core/services/toast.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-profile-setup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonInput,
    IonButtons,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-title>Profile info</ion-title>
        <ion-buttons slot="end">
          <span style="font-size: 0.75rem; font-weight: 700; background: rgba(255,255,255,0.25); padding: 3px 8px; border-radius: 8px; margin-right: 12px; color: #fff;">v1.0.9</span>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="profile-content ion-padding">
      <div class="profile-container">
        <p class="instruction-text">
          Please provide your display name and an optional profile picture.
        </p>

        <!-- Avatar Picker Section -->
        <div class="avatar-section" (click)="selectAvatar()">
          <div class="avatar-circle">
            @if (uploadingAvatar()) {
              <ion-spinner name="crescent" color="primary"></ion-spinner>
            } @else if (avatarPreview()) {
              <img [src]="avatarPreview()" alt="Avatar Preview" class="avatar-img" />
            } @else {
              <div class="avatar-placeholder">
                <span class="camera-icon">📷</span>
                <span class="add-photo-label">ADD PHOTO</span>
              </div>
            }
          </div>
          <input
            #fileInput
            type="file"
            accept="image/*"
            style="display: none"
            (change)="onFileSelected($event)"
          />
        </div>

        <div class="form-card">
          <!-- Display Name -->
          <div class="input-group">
            <label class="input-label">Display Name *</label>
            <input
              type="text"
              class="custom-input"
              placeholder="Type your name here..."
              [value]="displayName()"
              (input)="displayName.set($any($event.target).value)"
              maxlength="50"
            />
          </div>

          <!-- About Status -->
          <div class="input-group" style="margin-top: 20px;">
            <label class="input-label">About Status</label>
            <input
              type="text"
              class="custom-input"
              placeholder="Hey there! I am using IChat."
              [value]="about()"
              (input)="about.set($any($event.target).value)"
              maxlength="140"
            />
          </div>
        </div>

        <div class="action-section">
          <ion-button
            expand="block"
            class="btn-primary finish-btn"
            [disabled]="loading() || uploadingAvatar() || !displayName().trim()"
            (click)="saveProfile()"
          >
            @if (loading()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              FINISH SETUP
            }
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .profile-content {
      --background: var(--ichat-bg-primary);
    }
    .profile-container {
      max-width: 480px;
      margin: 0 auto;
      padding: 16px 8px;
    }
    .instruction-text {
      text-align: center;
      color: var(--ichat-text-secondary);
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 32px;
    }
    .avatar-section {
      display: flex;
      justify-content: center;
      margin-bottom: 32px;
      cursor: pointer;
    }
    .avatar-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: var(--ichat-bg-card);
      border: 3px solid var(--ion-color-primary);
      box-shadow: 0 8px 24px rgba(0, 168, 132, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      transition: transform 0.2s ease;
    }
    .avatar-circle:hover {
      transform: scale(1.05);
    }
    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--ion-color-primary);
    }
    .camera-icon {
      font-size: 2rem;
      margin-bottom: 4px;
    }
    .add-photo-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .form-card {
      background: var(--ichat-bg-card);
      border-radius: 16px;
      padding: 20px;
      border: 1px solid var(--ichat-border-color);
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
      margin-bottom: 32px;
    }
    .input-group {
      display: flex;
      flex-direction: column;
    }
    .input-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--ichat-text-secondary);
      margin-bottom: 8px;
    }
    .custom-input {
      border: 1.5px solid var(--ichat-border-color);
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 1rem;
      font-weight: 500;
      color: var(--ichat-text-primary);
      background: transparent;
      outline: none;
      transition: border-color 0.2s ease;
    }
    .custom-input:focus {
      border-color: var(--ion-color-primary);
    }
    .finish-btn {
      --padding-top: 16px;
      --padding-bottom: 16px;
      font-size: 1rem;
    }
  `],
})
export class ProfileSetupPage implements OnInit {
  displayName = signal<string>('');
  about = signal<string>('Hey there! I am using IChat.');
  avatarPreview = signal<string | null>(null);
  avatarCloudinaryUrl = signal<string | null>(null);
  uploadingAvatar = signal<boolean>(false);
  loading = signal<boolean>(false);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private authService = inject(AuthService);
  private mediaService = inject(MediaService);
  private contactsService = inject(ContactsService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private navCtrl = inject(NavController);

  async ngOnInit() {
    // Silently request photo/media permissions in native background if applicable
    if (Capacitor.isNativePlatform()) {
      try {
        await this.mediaService.requestMediaPermissions();
      } catch (e) {}
    }
  }

  async selectAvatar() {
    if (Capacitor.isNativePlatform()) {
      try {
        const file = await this.mediaService.pickMediaFromDevice('photos');
        if (file) {
          this.uploadFileForAvatar(file);
          return;
        }
      } catch (e) {
        console.warn('Native photo pick error, falling back to file input:', e);
      }
    }
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.click();
    } else {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) input.click();
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.uploadFileForAvatar(file);
    }
  }

  private async uploadFileForAvatar(file: File) {
    this.uploadingAvatar.set(true);

    // Instant local base64 preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const localUrl = e.target.result as string;
        this.avatarPreview.set(localUrl);
        if (!this.avatarCloudinaryUrl()) {
          this.avatarCloudinaryUrl.set(localUrl);
        }
      }
    };
    reader.readAsDataURL(file);

    try {
      const res = await firstValueFrom(this.mediaService.uploadProfilePicture(file));
      if (res && res.data) {
        const avatarUrl = res.data.profile?.avatarUrl || res.data.secureUrl;
        if (avatarUrl) {
          this.avatarPreview.set(avatarUrl);
          this.avatarCloudinaryUrl.set(avatarUrl);
        }
      }
      this.toastService.showSuccess('Profile photo selected successfully!');
    } catch (e: any) {
      console.warn('Backend photo upload fallback to local preview:', e);
      if (this.avatarPreview()) {
        this.avatarCloudinaryUrl.set(this.avatarPreview());
      }
      this.toastService.showSuccess('Profile photo selected!');
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  async saveProfile() {
    if (!this.displayName().trim()) {
      this.toastService.showError('Please enter your display name');
      return;
    }

    this.loading.set(true);
    try {
      const avatarUrl = this.avatarCloudinaryUrl() || this.avatarPreview() || undefined;
      const success = await this.authService.setupProfile(
        this.displayName().trim(),
        this.about().trim(),
        avatarUrl,
      );

      this.loading.set(false);
      if (success) {
        this.navCtrl.navigateRoot('/home');
      }
    } catch (e) {
      this.loading.set(false);
    }
  }
}
