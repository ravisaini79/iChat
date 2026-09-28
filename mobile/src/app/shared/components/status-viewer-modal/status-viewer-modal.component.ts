import { Component, Input, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-status-viewer-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="status-player-container" [style.background]="currentStatus()?.backgroundColor || '#00A884'">
      <!-- Progress Bar Top -->
      <div class="progress-bar-container">
        @for (st of statusList; track st._id; let i = $index) {
          <div class="progress-track">
            <div
              class="progress-fill"
              [style.width.%]="i < currentIndex() ? 100 : (i === currentIndex() ? progressPercentage() : 0)"
            ></div>
          </div>
        }
      </div>

      <!-- Story Header -->
      <div class="player-header">
        <div class="author-info">
          <div class="avatar-circle">
            @if (userAvatar) {
              <img [src]="userAvatar" [alt]="userName" />
            } @else {
              <span>{{ userName.charAt(0).toUpperCase() }}</span>
            }
          </div>
          <div class="header-text">
            <span class="user-name">{{ userName }}</span>
            <span class="time-ago">Status Update</span>
          </div>
        </div>
        <button class="close-btn" (click)="close()">✕</button>
      </div>

      <!-- Story Content Body -->
      <div class="player-body" (click)="nextStatus()">
        @if (currentStatus()?.type === 'IMAGE') {
          <img [src]="currentStatus()?.media?.secureUrl || currentStatus()?.text" alt="Status photo" class="status-media" />
          @if (currentStatus()?.text) {
            <p class="media-caption">{{ currentStatus()?.text }}</p>
          }
        } @else if (currentStatus()?.type === 'VIDEO') {
          <video [src]="currentStatus()?.media?.secureUrl" autoplay class="status-media"></video>
        } @else {
          <div class="text-status-display">
            <p class="status-main-text">{{ currentStatus()?.text }}</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .status-player-container {
      width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; color: #ffffff;
    }
    .progress-bar-container {
      display: flex; gap: 4px; padding: 16px 12px 8px 12px; z-index: 10;
    }
    .progress-track {
      flex: 1; height: 3px; background: rgba(255, 255, 255, 0.3); border-radius: 2px; overflow: hidden;
    }
    .progress-fill { height: 100%; background: #ffffff; transition: width 0.1s linear; }
    .player-header {
      display: flex; justify-content: space-between; align-items: center; padding: 4px 16px 12px 16px; z-index: 10;
    }
    .author-info { display: flex; align-items: center; gap: 10px; }
    .avatar-circle {
      width: 40px; height: 40px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); overflow: hidden;
      display: flex; align-items: center; justify-content: center; font-weight: 700;
    }
    .avatar-circle img { width: 100%; height: 100%; object-fit: cover; }
    .header-text { display: flex; flex-direction: column; }
    .user-name { font-size: 1rem; font-weight: 700; }
    .time-ago { font-size: 0.75rem; opacity: 0.8; }
    .close-btn { background: transparent; border: none; color: #ffffff; font-size: 1.4rem; cursor: pointer; }
    .player-body { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; padding: 20px; cursor: pointer; }
    .status-media { max-width: 100%; max-height: 80vh; object-fit: contain; }
    .media-caption { position: absolute; bottom: 40px; background: rgba(0, 0, 0, 0.6); padding: 12px 20px; border-radius: 12px; font-size: 1.1rem; text-align: center; }
    .text-status-display { text-align: center; padding: 24px; }
    .status-main-text { font-size: 2.2rem; font-weight: 700; line-height: 1.3; }
  `],
})
export class StatusViewerModalComponent implements OnInit, OnDestroy {
  @Input() statusList: any[] = [];
  @Input() userName = 'User';
  @Input() userAvatar: string | null = null;

  currentIndex = signal<number>(0);
  currentStatus = signal<any>(null);
  progressPercentage = signal<number>(0);

  private timer: any;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    if (this.statusList.length > 0) {
      this.currentStatus.set(this.statusList[0]);
      this.startTimer();
    }
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  startTimer() {
    clearInterval(this.timer);
    this.progressPercentage.set(0);
    this.timer = setInterval(() => {
      if (this.progressPercentage() < 100) {
        this.progressPercentage.update((p) => p + 2);
      } else {
        this.nextStatus();
      }
    }, 100);
  }

  nextStatus() {
    if (this.currentIndex() < this.statusList.length - 1) {
      this.currentIndex.update((i) => i + 1);
      this.currentStatus.set(this.statusList[this.currentIndex()]);
      this.startTimer();
    } else {
      this.close();
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
