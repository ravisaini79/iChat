import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-incoming-call-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="incoming-call-overlay">
      <div class="call-card">
        <div class="caller-avatar">
          @if (callerAvatar) {
            <img [src]="callerAvatar" [alt]="callerName" />
          } @else {
            <div class="avatar-initial">{{ callerName.charAt(0).toUpperCase() }}</div>
          }
        </div>
        <h2 class="caller-name">{{ callerName }}</h2>
        <p class="call-type-label">{{ callType === 'VIDEO' ? '📹 Incoming Video Call' : '📞 Incoming Voice Call' }}</p>

        <div class="call-actions">
          <button class="reject-btn" (click)="reject()">
            <span class="btn-icon">📵</span>
            <span class="btn-label">Decline</span>
          </button>
          <button class="accept-btn" (click)="accept()">
            <span class="btn-icon">📞</span>
            <span class="btn-label">Accept</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .incoming-call-overlay {
      width: 100%; height: 100%; background: linear-gradient(145deg, #111B21 0%, #1F2C34 100%);
      display: flex; align-items: center; justify-content: center;
    }
    .call-card {
      display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 32px; gap: 16px;
    }
    .caller-avatar {
      width: 110px; height: 110px; border-radius: 50%; overflow: hidden; border: 4px solid rgba(255,255,255,0.2);
      box-shadow: 0 0 0 12px rgba(0, 168, 132, 0.1);
    }
    .caller-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-initial { width: 100%; height: 100%; background: var(--ion-color-primary); color: #fff; font-size: 3rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .caller-name { font-size: 2rem; font-weight: 700; color: #ffffff; margin: 0; }
    .call-type-label { font-size: 1rem; color: rgba(255,255,255,0.7); margin: 0; }
    .call-actions { display: flex; gap: 48px; margin-top: 48px; }
    .reject-btn, .accept-btn {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      width: 72px; height: 72px; border-radius: 50%; border: none; cursor: pointer; font-size: 1.8rem;
    }
    .reject-btn { background: #EF4444; }
    .accept-btn { background: var(--ion-color-primary); }
    .btn-label { font-size: 0.75rem; color: #ffffff; font-weight: 600; }
  `],
})
export class IncomingCallModalComponent {
  @Input() callerName = 'Caller';
  @Input() callerAvatar: string | null = null;
  @Input() callType: 'AUDIO' | 'VIDEO' = 'AUDIO';

  constructor(private modalCtrl: ModalController) {}

  accept() {
    this.modalCtrl.dismiss({ accepted: true });
  }

  reject() {
    this.modalCtrl.dismiss({ accepted: false });
  }
}
