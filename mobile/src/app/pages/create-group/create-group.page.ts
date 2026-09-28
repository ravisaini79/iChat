import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonCheckbox,
  IonSpinner,
  IonSearchbar,
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { MediaService } from '../../core/services/media.service';
import { ToastService } from '../../core/services/toast.service';

export interface ContactItem {
  userId: string;
  displayName: string;
  phoneNumber: string;
  avatarUrl?: string | null;
}

@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonCheckbox,
    IonSpinner,
    IonSearchbar,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/new-chat"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ step() === 1 ? 'Add group members' : 'New group' }}</ion-title>
        <ion-buttons slot="end">
          @if (step() === 1) {
            <ion-button [disabled]="selectedUserIds().length === 0" (click)="step.set(2)">
              NEXT
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>

      @if (step() === 1) {
        <ion-toolbar color="primary">
          <ion-searchbar
            [value]="searchQuery()"
            (ionInput)="onSearch($event)"
            placeholder="Search contacts..."
            class="custom-search"
          ></ion-searchbar>
        </ion-toolbar>
      }
    </ion-header>

    <ion-content class="create-group-content">
      <!-- STEP 1: MEMBER SELECTION -->
      @if (step() === 1) {
        <!-- Selected Pills -->
        @if (selectedUsers().length > 0) {
          <div class="pills-container">
            @for (u of selectedUsers(); track u.userId) {
              <div class="user-pill" (click)="toggleUser(u)">
                <span class="pill-name">{{ u.displayName }}</span>
                <span class="remove-pill">✕</span>
              </div>
            }
          </div>
        }

        @if (loading()) {
          <div class="spinner-center">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
          </div>
        } @else {
          <ion-list lines="full">
            @for (contact of filteredContacts(); track contact.userId) {
              <ion-item button (click)="toggleUser(contact)">
                <ion-avatar slot="start" class="contact-avatar">
                  @if (contact.avatarUrl) {
                    <img [src]="contact.avatarUrl" [alt]="contact.displayName" />
                  } @else {
                    <div class="avatar-initial">
                      {{ contact.displayName.charAt(0).toUpperCase() }}
                    </div>
                  }
                </ion-avatar>
                <ion-label>
                  <h2>{{ contact.displayName }}</h2>
                  <p>{{ contact.phoneNumber }}</p>
                </ion-label>
                <ion-checkbox
                  slot="end"
                  [checked]="isUserSelected(contact.userId)"
                  (click)="$event.stopPropagation(); toggleUser(contact)"
                ></ion-checkbox>
              </ion-item>
            } @empty {
              <div class="empty-state">
                <p>No contacts found</p>
              </div>
            }
          </ion-list>
        }
      }

      <!-- STEP 2: GROUP NAME & AVATAR -->
      @if (step() === 2) {
        <div class="group-info-container ion-padding">
          <!-- Group Picture Picker -->
          <div class="avatar-section" (click)="triggerAvatarSelect()">
            <div class="avatar-circle">
              @if (uploadingAvatar()) {
                <ion-spinner name="crescent" color="primary"></ion-spinner>
              } @else if (groupAvatarUrl()) {
                <img [src]="groupAvatarUrl()" alt="Group Avatar" class="avatar-img" />
              } @else {
                <div class="avatar-placeholder">
                  <span class="camera-icon">📷</span>
                </div>
              }
            </div>
            <input type="file" accept="image/*" style="display: none;" (change)="onAvatarSelected($event)" />
          </div>

          <div class="form-card">
            <div class="input-group">
              <label class="input-label">Group Name *</label>
              <input
                type="text"
                class="custom-input"
                placeholder="Type group name here..."
                [value]="groupName()"
                (input)="groupName.set($any($event.target).value)"
                maxlength="50"
              />
            </div>

            <div class="input-group" style="margin-top: 16px;">
              <label class="input-label">Group Description</label>
              <input
                type="text"
                class="custom-input"
                placeholder="Optional group description..."
                [value]="groupDescription()"
                (input)="groupDescription.set($any($event.target).value)"
                maxlength="200"
              />
            </div>
          </div>

          <div class="members-preview-note">
            Members: {{ selectedUsers().length }} contacts selected
          </div>

          <ion-button
            expand="block"
            class="btn-primary create-btn"
            [disabled]="creating() || !groupName().trim()"
            (click)="createGroup()"
          >
            @if (creating()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              CREATE GROUP
            }
          </ion-button>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .create-group-content { --background: var(--ichat-bg-primary); }
    .spinner-center { display: flex; justify-content: center; padding: 48px; }
    .pills-container {
      display: flex; gap: 8px; overflow-x: auto; padding: 12px 16px; background: var(--ichat-bg-card);
      border-bottom: 1px solid var(--ichat-border-color);
    }
    .user-pill {
      background: rgba(0, 168, 132, 0.15); color: var(--ion-color-primary); border-radius: 16px;
      padding: 6px 12px; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 6px; cursor: pointer;
    }
    .remove-pill { font-size: 0.75rem; color: var(--ichat-text-secondary); }
    .contact-avatar { width: 44px; height: 44px; }
    .avatar-initial {
      width: 100%; height: 100%; background: var(--ion-color-primary); color: #ffffff;
      font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; border-radius: 50%;
    }
    .empty-state { text-align: center; padding: 48px; color: var(--ichat-text-secondary); }

    /* Step 2 Styles */
    .group-info-container { max-width: 480px; margin: 0 auto; }
    .avatar-section { display: flex; justify-content: center; margin-bottom: 24px; cursor: pointer; }
    .avatar-circle {
      width: 100px; height: 100px; border-radius: 50%; background: var(--ichat-bg-card);
      border: 3px solid var(--ion-color-primary); display: flex; align-items: center; justify-content: center; overflow: hidden;
    }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .camera-icon { font-size: 2rem; color: var(--ion-color-primary); }
    .form-card { background: var(--ichat-bg-card); border-radius: 16px; padding: 20px; border: 1px solid var(--ichat-border-color); margin-bottom: 24px; }
    .input-label { font-size: 0.85rem; font-weight: 600; color: var(--ichat-text-secondary); margin-bottom: 8px; display: block; }
    .custom-input { width: 100%; border: 1.5px solid var(--ichat-border-color); border-radius: 10px; padding: 12px 14px; font-size: 1rem; outline: none; background: transparent; color: var(--ichat-text-primary); }
    .members-preview-note { font-size: 0.85rem; color: var(--ichat-text-secondary); margin-bottom: 24px; text-align: center; }
    .create-btn { --padding-top: 16px; --padding-bottom: 16px; font-size: 1rem; }
  `],
})
export class CreateGroupPage implements OnInit {
  step = signal<number>(1);
  contacts = signal<ContactItem[]>([]);
  filteredContacts = signal<ContactItem[]>([]);
  selectedUserIds = signal<string[]>([]);
  selectedUsers = signal<ContactItem[]>([]);

  groupName = signal<string>('');
  groupDescription = signal<string>('');
  groupAvatarUrl = signal<string | null>(null);

  searchQuery = signal<string>('');
  loading = signal<boolean>(true);
  uploadingAvatar = signal<boolean>(false);
  creating = signal<boolean>(false);

  private apiService = inject(ApiService);
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.apiService.get<any[]>('contacts/ichat-users'));
      if (res.success && res.data) {
        this.contacts.set(res.data);
        this.filteredContacts.set(res.data);
      }
    } catch (e) {
      // Handled
    }
    this.loading.set(false);
  }

  onSearch(event: any) {
    const query = (event.target.value || '').toLowerCase().trim();
    this.searchQuery.set(query);
    if (!query) {
      this.filteredContacts.set(this.contacts());
    } else {
      this.filteredContacts.set(
        this.contacts().filter((c) => c.displayName.toLowerCase().includes(query)),
      );
    }
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUserIds().includes(userId);
  }

  toggleUser(contact: ContactItem) {
    const current = this.selectedUserIds();
    if (current.includes(contact.userId)) {
      this.selectedUserIds.set(current.filter((id) => id !== contact.userId));
      this.selectedUsers.set(this.selectedUsers().filter((u) => u.userId !== contact.userId));
    } else {
      this.selectedUserIds.set([...current, contact.userId]);
      this.selectedUsers.set([...this.selectedUsers(), contact]);
    }
  }

  triggerAvatarSelect() {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) input.click();
  }

  async onAvatarSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.uploadingAvatar.set(true);
      try {
        const res = await firstValueFrom(this.mediaService.uploadMedia(file, 'chat-media'));
        if (res.success && res.data) {
          this.groupAvatarUrl.set(res.data.secureUrl);
          this.toastService.showSuccess('Group photo uploaded!');
        }
      } catch (e) {
        // Handled
      }
      this.uploadingAvatar.set(false);
    }
  }

  async createGroup() {
    if (!this.groupName().trim()) {
      this.toastService.showError('Please enter a group name');
      return;
    }

    this.creating.set(true);
    try {
      const res = await firstValueFrom(
        this.apiService.post<any>('groups', {
          name: this.groupName().trim(),
          description: this.groupDescription().trim(),
          avatarUrl: this.groupAvatarUrl() || undefined,
          memberIds: this.selectedUserIds(),
        }),
      );

      if (res.success && res.data) {
        this.toastService.showSuccess(`Group "${this.groupName()}" created!`);
        this.router.navigate(['/chat', res.data.conversationId], { replaceUrl: true });
      }
    } catch (e) {
      // Handled
    }
    this.creating.set(false);
  }
}
