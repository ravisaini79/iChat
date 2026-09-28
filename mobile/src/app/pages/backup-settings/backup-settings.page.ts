import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonRange,
  IonCard,
  IonCardContent,
  IonBadge,
  IonSpinner,
  IonProgressBar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
  pauseOutline,
  playOutline,
  refreshOutline,
  trashOutline,
  shieldCheckmarkOutline,
  wifiOutline,
  folderOutline,
  peopleOutline,
  optionsOutline,
  serverOutline,
} from 'ionicons/icons';
import { BackupSyncService, BackupSettingsPayload } from '../../core/services/backup-sync.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-backup-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonRange,
    IonCard,
    IonCardContent,
    IonBadge,
    IonSpinner,
    IonProgressBar,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Backup & Sync Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Hidden Folder/File Authorization Picker -->
      <input
        #folderInput
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx"
        style="display: none"
        (change)="onFilesSelected($event)"
      />

      <div *ngIf="isLoading" class="loading-center">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Loading backup status & settings...</p>
      </div>

      <div *ngIf="!isLoading">
        <!-- Master Backup Control Card -->
        <ion-card class="settings-card primary-card">
          <ion-card-content>
            <div class="card-header">
              <ion-icon name="cloud-upload-outline" class="card-icon"></ion-icon>
              <div>
                <h3>Automatic Backup & Sync</h3>
                <p>Status: <strong>{{ isSyncing ? 'Syncing in background...' : settings.isEnabled ? 'Active' : 'Disabled' }}</strong></p>
              </div>
              <ion-toggle [(ngModel)]="settings.isEnabled" (ionChange)="toggleBackupEnabled()"></ion-toggle>
            </div>

            <ion-progress-bar *ngIf="isSyncing" type="indeterminate" color="success" class="ion-margin-top"></ion-progress-bar>

            <div class="control-buttons ion-margin-top" *ngIf="settings.isEnabled">
              <ion-button fill="solid" color="success" size="small" (click)="backupNow()">
                <ion-icon name="play-outline" slot="start"></ion-icon>
                Backup Now
              </ion-button>

              <ion-button fill="outline" color="warning" size="small" (click)="pauseSync()" *ngIf="!isPaused">
                <ion-icon name="pause-outline" slot="start"></ion-icon>
                Pause
              </ion-button>

              <ion-button fill="outline" color="success" size="small" (click)="resumeSync()" *ngIf="isPaused">
                <ion-icon name="play-outline" slot="start"></ion-icon>
                Resume
              </ion-button>
            </div>

            <p class="last-backup-text" *ngIf="settings.lastBackupAt">
              Last successful backup: {{ settings.lastBackupAt | date:'medium' }}
            </p>
          </ion-card-content>
        </ion-card>

        <!-- Dual Storage Usage Stats Card -->
        <ion-card class="settings-card">
          <ion-card-content>
            <div class="section-title">
              <ion-icon name="server-outline"></ion-icon>
              <h4>Dual Storage Verification Stats</h4>
            </div>

            <div class="stats-grid ion-margin-top">
              <div class="stat-box">
                <span class="stat-num">{{ stats.totalFiles }}</span>
                <span class="stat-label">Total Files</span>
              </div>
              <div class="stat-box">
                <span class="stat-num">{{ formatBytes(stats.totalBytes) }}</span>
                <span class="stat-label">Total Storage</span>
              </div>
              <div class="stat-box">
                <span class="stat-num text-success">{{ stats.filesystemCount }}</span>
                <span class="stat-label">Server Disk</span>
              </div>
              <div class="stat-box">
                <span class="stat-num text-primary">{{ stats.cloudinaryCount }}</span>
                <span class="stat-label">Cloudinary</span>
              </div>
            </div>

            <div class="partial-notice ion-margin-top" *ngIf="stats.partialCount > 0">
              <ion-badge color="warning">{{ stats.partialCount }} Partial Failures</ion-badge>
              <ion-button fill="clear" size="small" color="secondary" (click)="retryFailed()">
                <ion-icon name="refresh-outline" slot="start"></ion-icon>
                Retry Failed Uploads
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Settings List -->
        <ion-list class="settings-list">
          <!-- Network Settings -->
          <ion-item lines="full">
            <ion-icon name="wifi-outline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <h2>Wi-Fi Only Mode</h2>
              <p>Back up over Wi-Fi only to conserve mobile data</p>
            </ion-label>
            <ion-toggle [(ngModel)]="settings.wifiOnly" (ionChange)="updateSettings()"></ion-toggle>
          </ion-item>

          <!-- Photos & Videos -->
          <ion-item lines="full">
            <ion-icon name="cloud-upload-outline" slot="start" color="success"></ion-icon>
            <ion-label>
              <h2>Photos & Videos Backup</h2>
              <p>Automatically discover & enqueue accessible media</p>
            </ion-label>
            <ion-toggle [(ngModel)]="settings.includePhotos" (ionChange)="updateSettings()"></ion-toggle>
          </ion-item>

          <!-- Files & Folder Authorization -->
          <ion-item lines="full" button (click)="folderInput.click()">
            <ion-icon name="folder-outline" slot="start" color="warning"></ion-icon>
            <ion-label>
              <h2>Authorize Folders for Backup</h2>
              <p>Select device folders to back up documents & files</p>
            </ion-label>
            <ion-badge slot="end" color="tertiary">Select</ion-badge>
          </ion-item>

          <!-- Max File Size -->
          <ion-item lines="full">
            <ion-icon name="options-outline" slot="start" color="secondary"></ion-icon>
            <ion-label>
              <h2>Max File Size Limit</h2>
              <p>Currently: {{ settings.maxFileSizeMB }} MB</p>
            </ion-label>
            <ion-range
              min="5"
              max="100"
              step="5"
              snaps="true"
              [(ngModel)]="settings.maxFileSizeMB"
              (ionChange)="updateSettings()"
            >
              <ion-label slot="start">5MB</ion-label>
              <ion-label slot="end">100MB</ion-label>
            </ion-range>
          </ion-item>

          <!-- Contacts Sync -->
          <ion-item lines="full">
            <ion-icon name="people-outline" slot="start" color="medium"></ion-icon>
            <ion-label>
              <h2>Automatic Contact Sync</h2>
              <p>Keep IChat registered contacts in sync with consent</p>
            </ion-label>
            <ion-toggle [(ngModel)]="settings.autoSyncContacts" (ionChange)="updateSettings()"></ion-toggle>
          </ion-item>
        </ion-list>

        <!-- Danger Zone Actions -->
        <div class="danger-zone ion-margin-top">
          <ion-button expand="block" color="danger" fill="outline" shape="round" (click)="confirmDeleteBackup()">
            <ion-icon name="trash-outline" slot="start"></ion-icon>
            Delete My Backup Data
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .loading-center {
        text-align: center;
        padding: 60px 20px;
        p {
          color: var(--ion-color-medium);
          margin-top: 12px;
        }
      }
      .settings-card {
        border-radius: 16px;
        margin: 0 0 16px 0;
      }
      .primary-card {
        background: linear-gradient(135deg, rgba(0, 168, 132, 0.08) 0%, rgba(2, 132, 199, 0.08) 100%);
        border: 1px solid rgba(0, 168, 132, 0.2);
      }
      .card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        .card-icon {
          font-size: 36px;
          color: var(--ion-color-primary);
        }
        h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
        p {
          font-size: 12px;
          color: var(--ion-color-medium);
          margin: 2px 0 0 0;
        }
        ion-toggle {
          margin-left: auto;
        }
      }
      .control-buttons {
        display: flex;
        gap: 8px;
      }
      .last-backup-text {
        font-size: 11px;
        color: var(--ion-color-medium);
        margin-top: 10px;
      }
      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        h4 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
        }
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .stat-box {
        background: var(--ichat-bg-primary);
        border-radius: 10px;
        padding: 10px;
        text-align: center;
        display: flex;
        flex-direction: column;
        .stat-num {
          font-size: 18px;
          font-weight: 700;
        }
        .stat-label {
          font-size: 11px;
          color: var(--ion-color-medium);
          margin-top: 2px;
        }
      }
      .text-success { color: var(--ion-color-success); }
      .text-primary { color: var(--ion-color-primary); }
      .partial-notice {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .settings-list {
        border-radius: 16px;
        overflow: hidden;
      }
      .danger-zone {
        padding: 10px 0 20px 0;
      }
    `,
  ],
})
export class BackupSettingsPage implements OnInit {
  @ViewChild('folderInput') folderInput!: ElementRef;

  isLoading = true;
  isSyncing = false;
  isPaused = false;

  settings: BackupSettingsPayload = {
    isEnabled: false,
    wifiOnly: true,
    includePhotos: true,
    includeVideos: true,
    includeFiles: true,
    maxFileSizeMB: 50,
    autoSyncContacts: true,
  };

  stats = {
    totalFiles: 0,
    totalBytes: 0,
    filesystemCount: 0,
    cloudinaryCount: 0,
    partialCount: 0,
  };

  constructor(
    private backupSyncService: BackupSyncService,
    private toastService: ToastService,
    private alertCtrl: AlertController,
  ) {
    addIcons({
      cloudUploadOutline,
      pauseOutline,
      playOutline,
      refreshOutline,
      trashOutline,
      shieldCheckmarkOutline,
      wifiOutline,
      folderOutline,
      peopleOutline,
      optionsOutline,
      serverOutline,
    });
  }

  ngOnInit() {
    this.loadData();
    this.backupSyncService.isSyncing$.subscribe((syncing) => {
      this.isSyncing = syncing;
    });
  }

  loadData() {
    this.isLoading = true;
    this.backupSyncService.loadSettings().subscribe({
      next: (s) => {
        this.settings = { ...this.settings, ...s };
        this.loadStatus();
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  loadStatus() {
    this.backupSyncService.getStatus().subscribe({
      next: (res) => {
        this.isLoading = false;
        const payload = res?.data || res;
        if (payload?.stats) {
          this.stats = payload.stats;
        }
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  toggleBackupEnabled() {
    this.updateSettings();
  }

  updateSettings() {
    this.backupSyncService.updateSettings(this.settings).subscribe({
      next: () => {
        this.toastService.showSuccess('Backup settings saved');
      },
    });
  }

  backupNow() {
    this.isPaused = false;
    this.backupSyncService.processQueueBatch();
    this.toastService.showInfo('Background backup initiated');
  }

  pauseSync() {
    this.isPaused = true;
    this.backupSyncService.pauseSync();
    this.toastService.showInfo('Backup paused');
  }

  resumeSync() {
    this.isPaused = false;
    this.backupSyncService.resumeSync();
    this.toastService.showSuccess('Backup resumed');
  }

  retryFailed() {
    this.backupSyncService.retryFailedUploads().subscribe({
      next: () => {
        this.toastService.showSuccess('Retrying failed uploads');
        this.loadStatus();
      },
    });
  }

  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      const enqueued = await this.backupSyncService.enqueueFilesForBackup(files);
      if (enqueued > 0) {
        this.toastService.showSuccess(`Enqueued ${enqueued} file(s) from authorized folder`);
        this.loadStatus();
      }
    }
  }

  async confirmDeleteBackup() {
    const alert = await this.alertCtrl.create({
      header: 'Delete Backup Data',
      message: 'Are you sure you want to delete all backed-up files from your account? This will clean up files on both server disk and Cloudinary.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete All',
          role: 'destructive',
          handler: () => {
            this.toastService.showInfo('Backup deletion requested');
          },
        },
      ],
    });
    await alert.present();
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
