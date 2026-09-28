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
  IonProgressBar,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  cloudUploadOutline,
  trashOutline,
  imageOutline,
  videocamOutline,
  documentOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { MediaService } from '../../core/services/media.service';
import { ToastService } from '../../core/services/toast.service';

interface SelectedMediaItem {
  file: File;
  previewUrl: string;
  name: string;
  sizeFormatted: string;
  type: 'image' | 'video' | 'file';
}

@Component({
  selector: 'app-import-media-modal',
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
    IonProgressBar,
    IonItem,
    IonLabel,
    IonThumbnail,
    IonBadge,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-title>Import Photos & Videos</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cancel()" [disabled]="isUploading">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="import-container">
        <div class="instructions-box" *ngIf="selectedItems.length === 0">
          <ion-icon name="cloud-upload-outline" class="hero-icon"></ion-icon>
          <h2>Select Media to Import</h2>
          <p>Choose photos, videos, or documents to store securely in your personal server folder.</p>

          <input
            #fileInput
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            style="display: none"
            (change)="onFilesSelected($event)"
          />

          <ion-button expand="block" shape="round" color="secondary" (click)="fileInput.click()">
            Select Files from Device
          </ion-button>
        </div>

        <div *ngIf="selectedItems.length > 0">
          <div class="summary-header">
            <h3>Selected {{ selectedItems.length }} Item(s)</h3>
            <ion-badge color="tertiary">Total: {{ totalSizeFormatted }}</ion-badge>
          </div>

          <ion-progress-bar *ngIf="isUploading" type="indeterminate" color="success"></ion-progress-bar>

          <div class="selected-list">
            <ion-item *ngFor="let item of selectedItems; let i = index">
              <ion-thumbnail slot="start">
                <img *ngIf="item.type === 'image'" [src]="item.previewUrl" alt="preview" />
                <div *ngIf="item.type === 'video'" class="placeholder-icon">
                  <ion-icon name="videocam-outline"></ion-icon>
                </div>
                <div *ngIf="item.type === 'file'" class="placeholder-icon">
                  <ion-icon name="document-outline"></ion-icon>
                </div>
              </ion-thumbnail>
              <ion-label>
                <h2>{{ item.name }}</h2>
                <p>{{ item.sizeFormatted }}</p>
              </ion-label>
              <ion-button
                slot="end"
                fill="clear"
                color="danger"
                (click)="removeItem(i)"
                [disabled]="isUploading"
              >
                <ion-icon name="trash-outline"></ion-icon>
              </ion-button>
            </ion-item>
          </div>

          <div class="action-buttons ion-margin-top">
            <input
              #addMoreInput
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx"
              style="display: none"
              (change)="onFilesSelected($event)"
            />
            <ion-button fill="outline" expand="block" (click)="addMoreInput.click()" [disabled]="isUploading">
              Add More Items
            </ion-button>

            <ion-button
              expand="block"
              color="success"
              shape="round"
              (click)="confirmImport()"
              [disabled]="isUploading"
              class="ion-margin-top"
            >
              <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
              Import Selected Media
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .import-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .instructions-box {
        text-align: center;
        padding: 40px 20px;
        .hero-icon {
          font-size: 72px;
          color: var(--ion-color-primary);
        }
        h2 {
          font-size: 20px;
          font-weight: 600;
          margin-top: 16px;
        }
        p {
          color: var(--ion-color-medium);
          font-size: 14px;
          margin-bottom: 24px;
        }
      }
      .summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
      }
      .placeholder-icon {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0f0f0;
        border-radius: 8px;
        font-size: 24px;
        color: #666;
      }
      .selected-list {
        max-height: 50vh;
        overflow-y: auto;
      }
    `,
  ],
})
export class ImportMediaModal {
  @ViewChild('fileInput') fileInput!: ElementRef;
  selectedItems: SelectedMediaItem[] = [];
  isUploading = false;

  constructor(
    private modalCtrl: ModalController,
    private mediaService: MediaService,
    private toastService: ToastService,
  ) {
    addIcons({
      closeOutline,
      cloudUploadOutline,
      trashOutline,
      imageOutline,
      videocamOutline,
      documentOutline,
      checkmarkCircleOutline,
    });
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    Array.from(input.files).forEach((file) => {
      const type: 'image' | 'video' | 'file' = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
        ? 'video'
        : 'file';

      const previewUrl = type === 'image' ? URL.createObjectURL(file) : '';
      const sizeFormatted = this.formatBytes(file.size);

      this.selectedItems.push({
        file,
        previewUrl,
        name: file.name,
        sizeFormatted,
        type,
      });
    });
  }

  removeItem(index: number) {
    this.selectedItems.splice(index, 1);
  }

  get totalSizeBytes(): number {
    return this.selectedItems.reduce((acc, item) => acc + item.file.size, 0);
  }

  get totalSizeFormatted(): string {
    return this.formatBytes(this.totalSizeBytes);
  }

  confirmImport() {
    if (this.selectedItems.length === 0) return;

    this.isUploading = true;
    const filesToUpload = this.selectedItems.map((item) => item.file);

    this.mediaService.importMediaBulk(filesToUpload, 'imported').subscribe({
      next: (res) => {
        this.isUploading = false;
        this.toastService.showSuccess(`Successfully imported ${res.importedCount} item(s)`);
        this.modalCtrl.dismiss({ importedCount: res.importedCount, items: res.items }, 'confirm');
      },
      error: (err) => {
        this.isUploading = false;
        console.error('Import failed:', err);
        this.toastService.showError('Failed to import media files');
      },
    });
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
