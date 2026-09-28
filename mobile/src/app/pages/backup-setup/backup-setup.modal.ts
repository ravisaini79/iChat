import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonLabel,
  IonItem,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
  shieldCheckmarkOutline,
  imageOutline,
  documentTextOutline,
  closeOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { BackupSyncService } from '../../core/services/backup-sync.service';
import { ToastService } from '../../core/services/toast.service';
import { StorageService } from '../../core/services/storage.service';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-backup-setup-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonCheckbox,
    IonLabel,
    IonItem,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-title>IChat Backup & Sync</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss('not_now')">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="setup-container">
        <div class="hero-box">
          <ion-icon name="cloud-upload-outline" class="hero-icon"></ion-icon>
          <h2>Welcome to IChat Backup & Sync</h2>
          <p class="subtitle">
            Back up your accessible photos, videos, and authorized files to your IChat account. Your backup runs securely in the background while you chat.
          </p>
        </div>

        <ion-card class="feature-card">
          <ion-card-content>
            <div class="feature-item">
              <ion-icon name="shield-checkmark-outline" class="feature-icon text-success"></ion-icon>
              <div>
                <h4>Dual Storage Protection</h4>
                <p>Every backed-up file is verified and stored in both server filesystem storage and Cloudinary.</p>
              </div>
            </div>

            <div class="feature-item ion-margin-top">
              <ion-icon name="image-outline" class="feature-icon text-primary"></ion-icon>
              <div>
                <h4>Automatic Photo & Video Discovery</h4>
                <p>Discovers accessible media so you don't need to select items one by one.</p>
              </div>
            </div>

            <div class="feature-item ion-margin-top">
              <ion-icon name="document-text-outline" class="feature-icon text-warning"></ion-icon>
              <div>
                <h4>Authorized File Folders</h4>
                <p>Optionally back up documents from authorized folders with file size controls.</p>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <div class="options-box">
          <ion-item lines="none">
            <ion-checkbox slot="start" [(ngModel)]="wifiOnly"></ion-checkbox>
            <ion-label>Back up over Wi-Fi only (saves mobile data)</ion-label>
          </ion-item>
        </div>

        <div class="action-buttons ion-margin-top">
          <input
            #folderPickerInput
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            style="display: none"
            (change)="onInitialFolderSelected($event)"
          />

          <ion-button
            expand="block"
            color="success"
            shape="round"
            size="large"
            (click)="enableBackup()"
            [disabled]="isProcessing"
          >
            <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
            Enable Backup & Sync
          </ion-button>

          <ion-button
            fill="clear"
            expand="block"
            color="medium"
            (click)="dismiss('not_now')"
            [disabled]="isProcessing"
            class="ion-margin-top"
          >
            Not Now
          </ion-button>

          <p class="privacy-note">
            🔒 You can pause, disable, or delete your backup at any time in Backup & Sync Settings.
          </p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .setup-container {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .hero-box {
        text-align: center;
        padding: 20px 10px;
        .hero-icon {
          font-size: 64px;
          color: var(--ion-color-primary);
        }
        h2 {
          font-size: 20px;
          font-weight: 700;
          margin-top: 12px;
        }
        .subtitle {
          color: var(--ion-color-medium);
          font-size: 14px;
          line-height: 1.5;
          margin-top: 8px;
        }
      }
      .feature-card {
        margin: 12px 0;
        border-radius: 16px;
      }
      .feature-item {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        .feature-icon {
          font-size: 28px;
          margin-top: 2px;
        }
        h4 {
          font-size: 15px;
          font-weight: 600;
          margin: 0;
        }
        p {
          font-size: 12px;
          color: var(--ion-color-medium);
          margin: 2px 0 0 0;
        }
      }
      .text-success { color: var(--ion-color-success); }
      .text-primary { color: var(--ion-color-primary); }
      .text-warning { color: var(--ion-color-warning); }
      .privacy-note {
        text-align: center;
        font-size: 12px;
        color: var(--ion-color-medium);
        margin-top: 16px;
      }
    `,
  ],
})
export class BackupSetupModal {
  @ViewChild('folderPickerInput') folderPickerInput!: ElementRef;
  wifiOnly = true;
  isProcessing = false;

  constructor(
    private modalCtrl: ModalController,
    private backupSyncService: BackupSyncService,
    private toastService: ToastService,
    private storageService: StorageService,
  ) {
    addIcons({
      cloudUploadOutline,
      shieldCheckmarkOutline,
      imageOutline,
      documentTextOutline,
      closeOutline,
      checkmarkCircleOutline,
    });
  }

  async enableBackup() {
    this.isProcessing = true;

    if (Capacitor.isNativePlatform()) {
      try {
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      } catch (e) {
        console.warn('Permission request note:', e);
      }
    }

    if (this.folderPickerInput?.nativeElement) {
      this.folderPickerInput.nativeElement.click();
    } else {
      this.finishEnable();
    }
  }

  async onInitialFolderSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      const enqueued = await this.backupSyncService.enqueueFilesForBackup(files);
      if (enqueued > 0) {
        this.toastService.showSuccess(`Enqueued ${enqueued} accessible gallery item(s) for background backup`);
      }
    }
    this.finishEnable();
  }

  private finishEnable() {
    this.backupSyncService
      .updateSettings({
        isEnabled: true,
        wifiOnly: this.wifiOnly,
      })
      .subscribe({
        next: async () => {
          this.isProcessing = false;
          await this.storageService.set('backupSetupCompleted', true);
          this.toastService.showSuccess('Automatic Backup & Sync enabled!');
          this.modalCtrl.dismiss({ enabled: true }, 'confirm');
        },
        error: async (err) => {
          this.isProcessing = false;
          await this.storageService.set('backupSetupCompleted', true);
          this.modalCtrl.dismiss({ enabled: true }, 'confirm');
        },
      });
  }

  async dismiss(reason = 'not_now') {
    await this.storageService.set('backupSetupCompleted', true);
    this.modalCtrl.dismiss({ enabled: false, reason }, 'cancel');
  }
}
