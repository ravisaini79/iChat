import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  IonBadge,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonToggle,
  ActionSheetController,
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-group-details',
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
    IonBadge,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonToggle,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Group Info</ion-title>
      </ion-toolbar>

      <ion-toolbar color="primary">
        <ion-segment [value]="activeSegment()" (ionChange)="activeSegment.set($any($event).detail.value)">
          <ion-segment-button value="members">MEMBERS</ion-segment-button>
          <ion-segment-button value="media">MEDIA</ion-segment-button>
          <ion-segment-button value="settings">SETTINGS</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="group-details-content">
      @if (loading()) {
        <div class="spinner-center">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
      } @else {
        <!-- Header Card -->
        <div class="group-card ion-padding">
          <div class="avatar-circle">
            @if (group()?.avatarUrl) {
              <img [src]="group()?.avatarUrl" [alt]="group()?.name" class="avatar-img" />
            } @else {
              <div class="avatar-initial">
                {{ group()?.name?.charAt(0)?.toUpperCase() }}
              </div>
            }
          </div>
          <h2 class="group-title">{{ group()?.name }}</h2>
          <p class="group-subtitle">{{ group()?.members?.length }} members</p>

          @if (group()?.description) {
            <div class="description-box">
              <span class="desc-label">Description:</span>
              <p class="desc-text">{{ group()?.description }}</p>
            </div>
          }
        </div>

        <!-- TAB 1: MEMBERS LIST -->
        @if (activeSegment() === 'members') {
          <ion-list lines="full" class="members-list">
            <div class="list-section-header">
              Group Members ({{ group()?.members?.length }})
            </div>

            @for (m of group()?.members; track m.userId) {
              <ion-item button (click)="onMemberClick(m)" class="member-item">
                <ion-avatar slot="start" class="member-avatar">
                  @if (m.avatarUrl) {
                    <img [src]="m.avatarUrl" [alt]="m.displayName" />
                  } @else {
                    <div class="avatar-initial">
                      {{ m.displayName.charAt(0).toUpperCase() }}
                    </div>
                  }
                </ion-avatar>

                <ion-label>
                  <div class="name-row">
                    <h3 class="member-name">{{ m.displayName }}</h3>
                    @if (m.isAdmin) {
                      <span class="admin-badge">Group Admin</span>
                    }
                  </div>
                  <p class="member-about">{{ m.about || m.phoneNumber }}</p>
                </ion-label>
              </ion-item>
            }
          </ion-list>

          <div class="action-footer ion-padding">
            <ion-button expand="block" color="danger" fill="outline" (click)="leaveGroup()">
              Leave Group
            </ion-button>
          </div>
        }

        <!-- TAB 2: MEDIA GALLERY -->
        @if (activeSegment() === 'media') {
          <div class="media-gallery ion-padding">
            @if (mediaList().length > 0) {
              <div class="media-grid">
                @for (item of mediaList(); track item._id) {
                  <div class="media-grid-item">
                    @if (item.type === 'IMAGE') {
                      <img [src]="item.media?.secureUrl" alt="Shared media" class="grid-img" />
                    } @else {
                      <div class="doc-file-badge">📄 {{ item.text || 'File' }}</div>
                    }
                  </div>
                }
              </div>
            } @else {
              <div class="empty-media">
                <p>No photos or media shared in this group yet.</p>
              </div>
            }
          </div>
        }

        <!-- TAB 3: SETTINGS & PERMISSIONS -->
        @if (activeSegment() === 'settings') {
          <ion-list lines="full" class="settings-list">
            <ion-item>
              <ion-label>
                <h3>Edit Group Info</h3>
                <p>Only admins can edit group name & picture</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [checked]="group()?.settings?.editGroupInfo === 'ADMINS'"
                [disabled]="!group()?.isAdmin"
                (ionChange)="toggleSetting('editGroupInfo', $event)"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>
                <h3>Send Messages</h3>
                <p>Only admins can send messages</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [checked]="group()?.settings?.sendMessages === 'ADMINS'"
                [disabled]="!group()?.isAdmin"
                (ionChange)="toggleSetting('sendMessages', $event)"
              ></ion-toggle>
            </ion-item>
          </ion-list>
        }
      }
    </ion-content>
  `,
  styles: [`
    .group-details-content { --background: var(--ichat-bg-primary); }
    .spinner-center { display: flex; justify-content: center; padding: 48px; }
    .group-card {
      background: var(--ichat-bg-card); display: flex; flex-direction: column; align-items: center;
      text-align: center; border-bottom: 1px solid var(--ichat-border-color);
    }
    .avatar-circle {
      width: 90px; height: 90px; border-radius: 50%; background: var(--ion-color-primary);
      overflow: hidden; margin-bottom: 12px; display: flex; align-items: center; justify-content: center;
    }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-initial { color: #ffffff; font-size: 2rem; font-weight: 700; }
    .group-title { font-size: 1.4rem; font-weight: 700; margin: 0 0 4px 0; color: var(--ichat-text-primary); }
    .group-subtitle { font-size: 0.85rem; color: var(--ichat-text-secondary); margin: 0 0 12px 0; }
    .description-box { background: var(--ichat-bg-primary); border-radius: 12px; padding: 10px 14px; text-align: left; width: 100%; }
    .desc-label { font-size: 0.75rem; font-weight: 700; color: var(--ion-color-primary); }
    .desc-text { font-size: 0.9rem; margin: 2px 0 0 0; color: var(--ichat-text-primary); }

    .list-section-header { padding: 14px 16px 6px 16px; font-size: 0.8rem; font-weight: 700; color: var(--ichat-text-secondary); text-transform: uppercase; }
    .member-avatar { width: 44px; height: 44px; }
    .name-row { display: flex; justify-content: space-between; align-items: center; }
    .member-name { font-size: 1rem; font-weight: 600; margin: 0; color: var(--ichat-text-primary); }
    .admin-badge { font-size: 0.7rem; font-weight: 700; color: var(--ion-color-primary); border: 1px solid var(--ion-color-primary); padding: 2px 6px; border-radius: 8px; }
    .member-about { font-size: 0.85rem; color: var(--ichat-text-secondary); margin: 2px 0 0 0; }

    .media-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .media-grid-item { aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: var(--ichat-bg-card); display: flex; align-items: center; justify-content: center; }
    .grid-img { width: 100%; height: 100%; object-fit: cover; }
    .doc-file-badge { font-size: 0.75rem; text-align: center; padding: 4px; }
    .empty-media { text-align: center; padding: 48px; color: var(--ichat-text-secondary); }
  `],
})
export class GroupDetailsPage implements OnInit {
  groupId = signal<string>('');
  group = signal<any>(null);
  mediaList = signal<any[]>([]);
  activeSegment = signal<'members' | 'media' | 'settings'>('members');
  loading = signal<boolean>(true);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);
  private actionSheetCtrl = inject(ActionSheetController);

  async ngOnInit() {
    this.route.params.subscribe(async (params) => {
      if (params['id']) {
        this.groupId.set(params['id']);
        await this.loadGroupData();
      }
    });
  }

  async loadGroupData() {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.apiService.get<any>(`groups/${this.groupId()}`));
      if (res.success && res.data) {
        this.group.set(res.data);
      }

      const mediaRes = await firstValueFrom(this.apiService.get<any[]>(`groups/${this.groupId()}/media`));
      if (mediaRes.success && mediaRes.data) {
        this.mediaList.set(mediaRes.data);
      }
    } catch (e) {
      // Handled
    }
    this.loading.set(false);
  }

  async onMemberClick(member: any) {
    if (!this.group()?.isAdmin) return;

    const actionSheet = await this.actionSheetCtrl.create({
      header: member.displayName,
      buttons: [
        {
          text: member.isAdmin ? 'Dismiss as Admin' : 'Make Group Admin',
          icon: 'shield',
          handler: () => this.toggleAdmin(member.userId),
        },
        {
          text: 'Remove from Group',
          role: 'destructive',
          icon: 'trash',
          handler: () => this.removeMember(member.userId),
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  async toggleAdmin(targetUserId: string) {
    try {
      const res = await firstValueFrom(
        this.apiService.post(`groups/${this.groupId()}/admins`, { targetUserId }),
      );
      if (res.success) {
        this.toastService.showSuccess('Admin role updated');
        await this.loadGroupData();
      }
    } catch (e) {
      // Handled
    }
  }

  async removeMember(targetUserId: string) {
    try {
      const res = await firstValueFrom(
        this.apiService.delete(`groups/${this.groupId()}/members/${targetUserId}`),
      );
      if (res.success) {
        this.toastService.showSuccess('Member removed');
        await this.loadGroupData();
      }
    } catch (e) {
      // Handled
    }
  }

  async toggleSetting(key: string, event: any) {
    const isChecked = event.detail.checked;
    const value = isChecked ? 'ADMINS' : 'ALL';

    try {
      await firstValueFrom(
        this.apiService.patch(`groups/${this.groupId()}`, {
          settings: { [key]: value },
        }),
      );
      this.toastService.showSuccess('Permission updated');
    } catch (e) {
      // Handled
    }
  }

  async leaveGroup() {
    try {
      const res = await firstValueFrom(
        this.apiService.post(`groups/${this.groupId()}/leave`, {}),
      );
      if (res.success) {
        this.toastService.showSuccess('Left group');
        this.router.navigate(['/home'], { replaceUrl: true });
      }
    } catch (e) {
      // Handled
    }
  }
}
