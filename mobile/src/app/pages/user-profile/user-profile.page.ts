import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonAvatar,
  IonButton,
  IonIcon,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chatbubbleEllipsesOutline, callOutline, videocamOutline, shieldCheckmarkOutline, personOutline } from 'ionicons/icons';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { firstValueFrom } from 'rxjs';

export interface UserDetail {
  _id: string;
  phoneNumber: string;
  countryCode?: string;
  isOnline?: boolean;
  lastSeen?: string;
  profile?: {
    displayName: string;
    about: string;
    avatarUrl?: string | null;
  };
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonAvatar,
    IonButton,
    IonIcon,
    IonSpinner,
    IonCard,
    IonCardContent,
    IonItem,
    IonLabel,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Contact Info</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="profile-content">
      <div *ngIf="loading()" class="loading-container">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
      </div>

      <div *ngIf="!loading() && user()" class="profile-container">
        <div class="avatar-card">
          <div class="avatar-wrapper">
            <img [src]="user()?.profile?.avatarUrl || 'assets/default-avatar.svg'" [alt]="user()?.profile?.displayName || 'User'" />
          </div>
          <h2 class="display-name">{{ user()?.profile?.displayName || user()?.phoneNumber }}</h2>
          <p class="phone-number">{{ user()?.phoneNumber }}</p>
          <div class="status-badge" [class.online]="user()?.isOnline">
            <span class="dot"></span>
            {{ user()?.isOnline ? 'Online' : 'Offline' }}
          </div>
        </div>

        <div class="action-buttons">
          <ion-button expand="block" color="primary" class="message-btn" (click)="startChat()">
            <ion-icon name="chatbubble-ellipses-outline" slot="start"></ion-icon>
            Message
          </ion-button>
        </div>

        <ion-card class="info-card">
          <ion-card-content>
            <div class="info-section">
              <span class="info-label">About</span>
              <p class="info-value">{{ user()?.profile?.about || 'Hey there! I am using IChat.' }}</p>
            </div>
            <div class="info-divider"></div>
            <div class="info-section">
              <span class="info-label">Phone</span>
              <p class="info-value">{{ user()?.phoneNumber }}</p>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .profile-content {
      --background: var(--ichat-bg-primary, #111b21);
    }
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }
    .profile-container {
      padding: 16px;
      max-width: 500px;
      margin: 0 auto;
    }
    .avatar-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
      background: var(--ichat-bg-secondary, #1f2c34);
      border-radius: 16px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .avatar-wrapper {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      overflow: hidden;
      margin-bottom: 16px;
      border: 3px solid var(--ion-color-primary, #00a884);
    }
    .avatar-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .display-name {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ichat-text-primary, #e9edef);
      margin: 0 0 4px 0;
    }
    .phone-number {
      font-size: 1rem;
      color: var(--ichat-text-secondary, #8696a0);
      margin: 0 0 12px 0;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      background: rgba(134, 150, 160, 0.15);
      color: var(--ichat-text-secondary, #8696a0);
    }
    .status-badge.online {
      background: rgba(0, 168, 132, 0.15);
      color: #00a884;
    }
    .status-badge .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }
    .action-buttons {
      margin-bottom: 16px;
    }
    .message-btn {
      --border-radius: 12px;
      font-weight: 600;
      height: 48px;
    }
    .info-card {
      background: var(--ichat-bg-secondary, #1f2c34);
      border-radius: 16px;
      margin: 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .info-section {
      padding: 8px 0;
    }
    .info-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--ichat-text-secondary, #8696a0);
      display: block;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 1.05rem;
      color: var(--ichat-text-primary, #e9edef);
      margin: 0;
    }
    .info-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 12px 0;
    }
  `],
})
export class UserProfilePage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);

  user = signal<UserDetail | null>(null);
  loading = signal<boolean>(true);
  creatingChat = signal<boolean>(false);

  constructor() {
    addIcons({
      chatbubbleEllipsesOutline,
      callOutline,
      videocamOutline,
      shieldCheckmarkOutline,
      personOutline,
    });
  }

  async ngOnInit() {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) {
      this.toastService.showError('User ID not provided');
      this.router.navigate(['/home']);
      return;
    }

    try {
      const res = await firstValueFrom(this.apiService.get<UserDetail>(`users/${userId}`));
      if (res.success && res.data) {
        this.user.set(res.data);
      } else {
        this.toastService.showError('User not found');
        this.router.navigate(['/home']);
      }
    } catch (e) {
      this.toastService.showError('Failed to load user profile');
      this.router.navigate(['/home']);
    } finally {
      this.loading.set(false);
    }
  }

  async startChat() {
    const targetUser = this.user();
    if (!targetUser || this.creatingChat()) return;

    this.creatingChat.set(true);
    try {
      const res = await firstValueFrom(
        this.apiService.post<{ _id: string }>('conversations/direct', {
          targetUserId: targetUser._id,
        }),
      );

      if (res.success && res.data) {
        this.router.navigate(['/chat', res.data._id]);
      } else {
        this.toastService.showError('Could not start conversation');
      }
    } catch (e: any) {
      this.toastService.showError(e?.error?.message || 'Failed to start conversation');
    } finally {
      this.creatingChat.set(false);
    }
  }
}
