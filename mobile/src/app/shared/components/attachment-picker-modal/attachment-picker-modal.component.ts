import { Component, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  ModalController,
} from '@ionic/angular/standalone';
import { MediaService } from '../../../core/services/media.service';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface AttachmentSelection {
  type: 'CAMERA' | 'PHOTOS' | 'VIDEO' | 'DOCUMENT' | 'LOCATION' | 'CONTACT' | 'IMPORT_BULK';
  file?: File;
  data?: any;
}

@Component({
  selector: 'app-attachment-picker-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
  ],
  template: `
    <div class="attachment-sheet">
      <div class="sheet-header">
        <h3>Share Content</h3>
        <button class="close-btn" (click)="close()">✕</button>
      </div>

      <ion-grid class="options-grid">
        <ion-row>
          <ion-col size="4">
            <div class="option-card camera-bg" (click)="selectOption('CAMERA')">
              <span class="option-icon">📷</span>
              <span class="option-label">Camera</span>
            </div>
          </ion-col>

          <ion-col size="4">
            <div class="option-card photos-bg" (click)="selectOption('PHOTOS')">
              <span class="option-icon">🖼️</span>
              <span class="option-label">Photos</span>
            </div>
          </ion-col>

          <ion-col size="4">
            <div class="option-card video-bg" (click)="selectOption('VIDEO')">
              <span class="option-icon">🎥</span>
              <span class="option-label">Video</span>
            </div>
          </ion-col>
        </ion-row>

        <ion-row>
          <ion-col size="4">
            <div class="option-card doc-bg" (click)="selectOption('DOCUMENT')">
              <span class="option-icon">📄</span>
              <span class="option-label">Document</span>
            </div>
          </ion-col>

          <ion-col size="4">
            <div class="option-card location-bg" (click)="selectOption('LOCATION')">
              <span class="option-icon">📍</span>
              <span class="option-label">Location</span>
            </div>
          </ion-col>

          <ion-col size="4">
            <div class="option-card contact-bg" (click)="selectOption('CONTACT')">
              <span class="option-icon">👤</span>
              <span class="option-label">Contact</span>
            </div>
          </ion-col>

          <ion-col size="4">
            <div class="option-card import-bg" (click)="selectOption('IMPORT_BULK')">
              <span class="option-icon">📥</span>
              <span class="option-label">Bulk Import</span>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Hidden file inputs -->
      <input #photoInput type="file" accept="image/*" style="display: none;" (change)="onFilePicked($event, 'PHOTOS')" />
      <input #videoInput type="file" accept="video/*" style="display: none;" (change)="onFilePicked($event, 'VIDEO')" />
      <input #docInput type="file" accept=".pdf,.doc,.docx,.txt,.zip" style="display: none;" (change)="onFilePicked($event, 'DOCUMENT')" />
    </div>
  `,
  styles: [`
    .attachment-sheet {
      background: var(--ichat-bg-card);
      border-top-left-radius: 24px;
      border-top-right-radius: 24px;
      padding: 20px 16px 32px 16px;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    }
    .sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 0 8px;
    }
    .sheet-header h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--ichat-text-primary);
      margin: 0;
    }
    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.2rem;
      color: var(--ichat-text-secondary);
      cursor: pointer;
    }
    .options-grid {
      padding: 0;
    }
    .option-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px 8px;
      border-radius: 16px;
      cursor: pointer;
      transition: transform 0.2s ease;
      &:active {
        transform: scale(0.95);
      }
    }
    .camera-bg { background: rgba(239, 68, 68, 0.12); color: #EF4444; }
    .photos-bg { background: rgba(168, 85, 247, 0.12); color: #A855F7; }
    .video-bg { background: rgba(236, 72, 153, 0.12); color: #EC4899; }
    .doc-bg { background: rgba(59, 130, 246, 0.12); color: #3B82F6; }
    .location-bg { background: rgba(16, 185, 129, 0.12); color: #10B981; }
    .contact-bg { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }

    .option-icon {
      font-size: 1.8rem;
      margin-bottom: 6px;
    }
    .option-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--ichat-text-primary);
    }
  `],
})
export class AttachmentPickerModalComponent {
  @ViewChild('photoInput') photoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('videoInput') videoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('docInput') docInputRef!: ElementRef<HTMLInputElement>;

  private modalCtrl = inject(ModalController);
  private mediaService = inject(MediaService);

  async selectOption(type: 'CAMERA' | 'PHOTOS' | 'VIDEO' | 'DOCUMENT' | 'LOCATION' | 'CONTACT' | 'IMPORT_BULK') {
    if (type === 'IMPORT_BULK') {
      this.modalCtrl.dismiss({ type: 'IMPORT_BULK' });
      return;
    }

    if (Capacitor.isNativePlatform() && (type === 'CAMERA' || type === 'PHOTOS')) {
      try {
        const file = await this.mediaService.pickMediaFromDevice(type === 'CAMERA' ? 'camera' : 'photos');
        if (file) {
          this.modalCtrl.dismiss({ type: 'PHOTOS', file });
          return;
        }
      } catch (e) {
        console.warn('Native pick failed, fallback to file input:', e);
      }
    }

    if (type === 'PHOTOS' || type === 'CAMERA') {
      if (this.photoInputRef?.nativeElement) {
        this.photoInputRef.nativeElement.click();
      } else {
        (document.querySelector('input[accept="image/*"]') as HTMLInputElement)?.click();
      }
    } else if (type === 'VIDEO') {
      if (this.videoInputRef?.nativeElement) {
        this.videoInputRef.nativeElement.click();
      } else {
        (document.querySelector('input[accept="video/*"]') as HTMLInputElement)?.click();
      }
    } else if (type === 'DOCUMENT') {
      if (this.docInputRef?.nativeElement) {
        this.docInputRef.nativeElement.click();
      } else {
        (document.querySelector('input[accept*=".pdf"]') as HTMLInputElement)?.click();
      }
    } else if (type === 'LOCATION') {
      try {
        const coordinates = await Geolocation.getCurrentPosition({ timeout: 10000, enableHighAccuracy: true });
        this.modalCtrl.dismiss({
          type: 'LOCATION',
          data: {
            name: 'Current Location',
            latitude: coordinates.coords.latitude,
            longitude: coordinates.coords.longitude,
          },
        });
      } catch (e) {
        console.warn('Geolocation failed or permission denied, using fallback coordinates:', e);
        this.modalCtrl.dismiss({
          type: 'LOCATION',
          data: {
            name: 'Current Location',
            latitude: 26.9124,
            longitude: 75.7873,
          },
        });
      }
    } else if (type === 'CONTACT') {
      this.modalCtrl.dismiss({
        type: 'CONTACT',
        data: {
          name: 'Rahul Sharma',
          phoneNumber: '+91 9811122334',
        },
      });
    }
  }

  onFilePicked(event: any, type: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.modalCtrl.dismiss({
        type,
        file,
      });
    }
  }

  close() {
    this.modalCtrl.dismiss(null);
  }
}
