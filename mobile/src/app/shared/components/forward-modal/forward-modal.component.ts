import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-forward-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonAvatar,
    IonLabel,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-title>Forward to...</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">Cancel</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="forward-content">
      @if (loading()) {
        <div class="spinner-center">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
      } @else {
        <ion-list lines="full">
          @for (conv of conversations(); track conv._id) {
            <ion-item button (click)="selectConversation(conv)">
              <ion-avatar slot="start" class="chat-avatar">
                @if (conv.opponent?.avatarUrl) {
                  <img [src]="conv.opponent?.avatarUrl" [alt]="getName(conv)" />
                } @else {
                  <div class="avatar-initial">
                    {{ getName(conv).charAt(0).toUpperCase() }}
                  </div>
                }
              </ion-avatar>
              <ion-label>
                <h2>{{ getName(conv) }}</h2>
                <p>{{ conv.opponent?.phoneNumber || 'IChat User' }}</p>
              </ion-label>
            </ion-item>
          } @empty {
            <div class="empty-state">
              <p>No active conversations found</p>
            </div>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: [`
    .spinner-center {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
    .chat-avatar {
      width: 44px;
      height: 44px;
    }
    .avatar-initial {
      width: 100%;
      height: 100%;
      background: var(--ion-color-primary);
      color: #ffffff;
      font-weight: 700;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--ichat-text-secondary);
    }
  `],
})
export class ForwardModalComponent implements OnInit {
  conversations = signal<any[]>([]);
  loading = signal<boolean>(true);

  private apiService = inject(ApiService);
  private modalCtrl = inject(ModalController);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.apiService.get<any[]>('conversations'));
      if (res.success && res.data) {
        this.conversations.set(res.data);
      }
    } catch (e) {
      // Handled
    }
    this.loading.set(false);
  }

  getName(conv: any): string {
    return conv.opponent?.displayName || 'Chat';
  }

  selectConversation(conv: any) {
    this.modalCtrl.dismiss(conv);
  }

  close() {
    this.modalCtrl.dismiss(null);
  }
}
