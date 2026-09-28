import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ModalController,
  AlertController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
  trashOutline,
  downloadOutline,
  imageOutline,
  videocamOutline,
  documentOutline,
  eyeOutline,
  folderOpenOutline,
} from 'ionicons/icons';
import { MediaService, MediaPayload } from '../../core/services/media.service';
import { ToastService } from '../../core/services/toast.service';
import { ImportMediaModal } from '../import-media/import-media.modal';

@Component({
  selector: 'app-my-media',
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
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardContent,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>My Media</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openImportModal()">
            <ion-icon name="cloud-upload-outline" slot="start"></ion-icon>
            Import
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <ion-toolbar color="light">
        <ion-segment [(ngModel)]="selectedFilter" (ionChange)="loadMedia()">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="image">
            <ion-label>Images</ion-label>
          </ion-segment-button>
          <ion-segment-button value="video">
            <ion-label>Videos</ion-label>
          </ion-segment-button>
          <ion-segment-button value="file">
            <ion-label>Files</ion-label>
          </ion-segment-button>
          <ion-segment-button value="status">
            <ion-label>Statuses</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div *ngIf="isLoading" class="loading-box">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Loading your media library...</p>
      </div>

      <div *ngIf="!isLoading && mediaItems.length === 0" class="empty-box">
        <ion-icon name="folder-open-outline" class="empty-icon"></ion-icon>
        <h3>No media files found</h3>
        <p>Import photos, videos, or documents to store them in your server space.</p>
        <ion-button color="primary" shape="round" (click)="openImportModal()">
          <ion-icon name="cloud-upload-outline" slot="start"></ion-icon>
          Import Media
        </ion-button>
      </div>

      <ion-grid *ngIf="!isLoading && mediaItems.length > 0">
        <ion-row>
          <ion-col size="6" size-md="4" size-lg="3" *ngFor="let item of mediaItems">
            <ion-card class="media-card">
              <div class="thumbnail-wrapper" (click)="viewMediaItem(item)">
                <img
                  *ngIf="item.mediaType === 'image'"
                  [src]="item.authenticatedUrl"
                  alt="thumbnail"
                  class="media-thumb"
                />
                <div *ngIf="item.mediaType === 'video'" class="placeholder-thumb">
                  <ion-icon name="videocam-outline"></ion-icon>
                </div>
                <div *ngIf="item.mediaType === 'file' || item.mediaType === 'audio'" class="placeholder-thumb">
                  <ion-icon name="document-outline"></ion-icon>
                </div>
                <ion-badge color="dark" class="type-badge">{{ item.mediaType | uppercase }}</ion-badge>
              </div>

              <ion-card-content class="card-info">
                <h4 class="file-name" [title]="item.originalName">{{ item.originalName }}</h4>
                <div class="meta-row">
                  <span class="file-size">{{ formatBytes(item.size || 0) }}</span>
                  <span class="file-date">{{ item.createdAt | date:'shortDate' }}</span>
                </div>

                <div class="card-actions">
                  <ion-button fill="clear" size="small" (click)="downloadMediaItem(item)">
                    <ion-icon name="download-outline"></ion-icon>
                  </ion-button>
                  <ion-button fill="clear" size="small" color="danger" (click)="confirmDelete(item)">
                    <ion-icon name="trash-outline"></ion-icon>
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  `,
  styles: [
    `
      .loading-box,
      .empty-box {
        text-align: center;
        padding: 60px 20px;
        p {
          color: var(--ion-color-medium);
          margin-top: 12px;
        }
      }
      .empty-icon {
        font-size: 64px;
        color: var(--ion-color-medium-tint);
      }
      .media-card {
        margin: 4px;
        border-radius: 12px;
        overflow: hidden;
      }
      .thumbnail-wrapper {
        position: relative;
        width: 100%;
        height: 120px;
        background: #1e1e1e;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .media-thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .placeholder-thumb {
        font-size: 36px;
        color: #fff;
      }
      .type-badge {
        position: absolute;
        top: 6px;
        right: 6px;
        font-size: 10px;
      }
      .card-info {
        padding: 8px 12px;
      }
      .file-name {
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin: 0 0 4px 0;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: var(--ion-color-medium);
      }
      .card-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 4px;
        ion-button {
          --padding-start: 4px;
          --padding-end: 4px;
          height: 28px;
        }
      }
    `,
  ],
})
export class MyMediaPage implements OnInit {
  selectedFilter: string = 'all';
  mediaItems: (MediaPayload & { authenticatedUrl?: string })[] = [];
  isLoading: boolean = false;

  constructor(
    private mediaService: MediaService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastService: ToastService,
  ) {
    addIcons({
      cloudUploadOutline,
      trashOutline,
      downloadOutline,
      imageOutline,
      videocamOutline,
      documentOutline,
      eyeOutline,
      folderOpenOutline,
    });
  }

  ngOnInit() {
    this.loadMedia();
  }

  loadMedia() {
    this.isLoading = true;
    const category = this.selectedFilter === 'status' ? 'status' : undefined;
    const mediaType = this.selectedFilter !== 'status' ? this.selectedFilter : undefined;

    this.mediaService.getMyMedia(category, mediaType).subscribe({
      next: async (items) => {
        this.isLoading = false;
        const processed = [];
        for (const item of items) {
          const authenticatedUrl = await this.mediaService.buildAuthenticatedMediaUrl(item.url || item.secureUrl);
          processed.push({ ...item, authenticatedUrl });
        }
        this.mediaItems = processed;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load user media:', err);
        this.toastService.showError('Failed to load media library');
      },
    });
  }

  handleRefresh(event: any) {
    this.loadMedia();
    setTimeout(() => event.target.complete(), 800);
  }

  async openImportModal() {
    const modal = await this.modalCtrl.create({
      component: ImportMediaModal,
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      this.loadMedia();
    }
  }

  async viewMediaItem(item: MediaPayload & { authenticatedUrl?: string }) {
    if (item.authenticatedUrl) {
      window.open(item.authenticatedUrl, '_blank');
    }
  }

  async downloadMediaItem(item: MediaPayload) {
    if (item.id || item._id) {
      const mediaId = item.id || item._id;
      const downloadUrl = await this.mediaService.buildAuthenticatedMediaUrl(`/api/media/${mediaId}/download`);
      window.open(downloadUrl, '_blank');
    }
  }

  async confirmDelete(item: MediaPayload) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Media',
      message: `Are you sure you want to delete "${item.originalName}"? This will permanently remove it from your server folder.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            const id = item.id || item._id;
            if (id) {
              this.deleteItem(id);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  deleteItem(mediaId: string) {
    this.mediaService.deleteMedia(mediaId).subscribe({
      next: () => {
        this.toastService.showSuccess('Media deleted successfully');
        this.loadMedia();
      },
      error: (err) => {
        console.error('Failed to delete media:', err);
        this.toastService.showError('Failed to delete media item');
      },
    });
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
