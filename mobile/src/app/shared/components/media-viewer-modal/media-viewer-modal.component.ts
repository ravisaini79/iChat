import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-media-viewer-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="viewer-container">
      <button class="close-btn" (click)="close()">✕</button>

      <div class="media-body">
        @if (mediaType === 'video') {
          <video [src]="mediaUrl" controls autoplay class="viewer-video"></video>
        } @else {
          <img [src]="mediaUrl" alt="Media view" class="viewer-image" />
        }
      </div>
    </div>
  `,
  styles: [`
    .viewer-container {
      width: 100%;
      height: 100%;
      background: #000000;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .close-btn {
      position: absolute;
      top: 24px;
      right: 24px;
      z-index: 10;
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      border: none;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      font-size: 1.4rem;
      cursor: pointer;
    }
    .media-body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .viewer-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .viewer-video {
      width: 100%;
      max-height: 80vh;
    }
  `],
})
export class MediaViewerModalComponent {
  @Input() mediaUrl!: string;
  @Input() mediaType: 'image' | 'video' = 'image';

  constructor(private modalCtrl: ModalController) {}

  close() {
    this.modalCtrl.dismiss();
  }
}
