import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  IonSpinner,
  IonSearchbar,
  IonIcon,
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { ContactsService } from '../../core/services/contacts.service';
import { ToastService } from '../../core/services/toast.service';
import { firstValueFrom } from 'rxjs';

export interface IChatContact {
  userId: string;
  phoneNumber: string;
  displayName: string;
  about?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
}

@Component({
  selector: 'app-new-chat',
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
    IonSpinner,
    IonSearchbar,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Select contact</ion-title>
      </ion-toolbar>

      <ion-toolbar color="primary">
        <ion-searchbar
          [value]="searchQuery()"
          (ionInput)="onSearch($event)"
          placeholder="Search name or type phone number..."
          class="custom-search"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="contacts-content">
      <ion-list lines="full" class="contact-list">
        <!-- Direct Phone Number Chat Action (when user types a phone number) -->
        @if (isPhoneNumberSearch()) {
          <ion-item button class="phone-search-action" (click)="startChatByPhoneNumber(searchQuery())">
            <div class="action-icon phone-bg">💬</div>
            <ion-label>
              <h2 class="action-title">Start Chat with {{ searchQuery() }}</h2>
              <p class="action-sub">Click to message this mobile number on IChat</p>
            </ion-label>
            @if (startingChat()) {
              <ion-spinner slot="end" name="crescent" color="primary"></ion-spinner>
            }
          </ion-item>
        }

        <!-- Action Group -->
        <ion-item button class="action-item" (click)="router.navigate(['/create-group'])">
          <div class="action-icon group-bg">👥</div>
          <ion-label>
            <h2 class="action-title">New group</h2>
          </ion-label>
        </ion-item>

        <ion-item button class="action-item" (click)="syncContactsNow()">
          <div class="action-icon contact-bg">🔄</div>
          <ion-label>
            <h2 class="action-title">Sync Phone Contacts</h2>
            <p class="action-sub">Refresh registered contacts from device</p>
          </ion-label>
          @if (contactsService.syncing()) {
            <ion-spinner slot="end" name="crescent" color="primary"></ion-spinner>
          }
        </ion-item>

        <!-- Section Header -->
        <div class="list-section-header">
          Registered IChat Contacts ({{ filteredContacts().length }})
        </div>

        @for (contact of filteredContacts(); track contact.userId) {
          <ion-item button class="contact-item" (click)="startChat(contact.userId)">
            <ion-avatar slot="start" class="contact-avatar" (click)="$event.stopPropagation(); openUserProfile(contact.userId)">
              @if (contact.avatarUrl) {
                <img [src]="contact.avatarUrl" [alt]="contact.displayName" />
              } @else {
                <div class="avatar-initials">
                  {{ (contact.displayName || 'U').charAt(0).toUpperCase() }}
                </div>
              }
            </ion-avatar>

            <ion-label>
              <div class="name-row">
                <h2 class="contact-name">{{ contact.displayName }}</h2>
                @if (contact.isOnline) {
                  <span class="online-indicator">online</span>
                }
              </div>
              <p class="contact-about">{{ contact.about || contact.phoneNumber }}</p>
            </ion-label>
          </ion-item>
        } @empty {
          <div class="empty-state">
            @if (searchQuery().length > 0) {
              <p>No registered contact matching "{{ searchQuery() }}"</p>
              <p class="sub-text">Click "Start Chat with {{ searchQuery() }}" above or tap "Sync Phone Contacts".</p>
            } @else {
              <p>No registered IChat contacts found.</p>
              <p class="sub-text">Use "Sync Phone Contacts" or type a phone number to chat.</p>
            }
          </div>
        }
      </ion-list>
    </ion-content>
  `,
  styles: [`
    .contacts-content {
      --background: var(--ichat-bg-primary);
    }
    .contact-list {
      background: transparent;
      padding: 0;
    }
    .action-item, .phone-search-action {
      --background: var(--ichat-bg-card);
      --padding-start: 16px;
      margin-bottom: 1px;
    }
    .phone-search-action {
      --background: rgba(0, 168, 132, 0.08);
      border-left: 4px solid var(--ion-color-primary);
    }
    .action-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      margin-right: 16px;
    }
    .group-bg {
      background: rgba(0, 168, 132, 0.15);
    }
    .contact-bg {
      background: rgba(2, 132, 199, 0.15);
    }
    .phone-bg {
      background: rgba(16, 185, 129, 0.2);
    }
    .action-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--ichat-text-primary);
    }
    .action-sub {
      font-size: 0.8rem;
      color: var(--ichat-text-secondary);
      margin: 2px 0 0 0;
    }
    .list-section-header {
      padding: 16px 16px 8px 16px;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--ichat-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .contact-item {
      --background: var(--ichat-bg-card);
      --padding-start: 16px;
      margin-bottom: 1px;
    }
    .contact-avatar {
      width: 48px;
      height: 48px;
    }
    .avatar-initials {
      width: 100%;
      height: 100%;
      background: var(--ion-color-primary);
      color: #ffffff;
      font-weight: 700;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    .name-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .contact-name {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--ichat-text-primary);
      margin: 0;
    }
    .online-indicator {
      font-size: 0.75rem;
      color: var(--ion-color-primary);
      font-weight: 600;
      background: rgba(0, 168, 132, 0.1);
      padding: 2px 8px;
      border-radius: 10px;
    }
    .contact-about {
      font-size: 0.85rem;
      color: var(--ichat-text-secondary);
      margin: 2px 0 0 0;
    }
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--ichat-text-secondary);
    }
    .sub-text {
      font-size: 0.85rem;
      margin-top: 6px;
    }
  `],
})
export class NewChatPage implements OnInit {
  contacts = signal<IChatContact[]>([]);
  filteredContacts = signal<IChatContact[]>([]);
  searchQuery = signal<string>('');
  isPhoneNumberSearch = signal<boolean>(false);
  startingChat = signal<boolean>(false);

  private searchSeq = 0;
  private apiService = inject(ApiService);
  public contactsService = inject(ContactsService);
  public toastService = inject(ToastService);
  public router = inject(Router);

  async ngOnInit() {
    this.loadContacts();
  }

  async loadContacts() {
    try {
      // 1. Fetch registered IChat users fallback
      const usersRes = await firstValueFrom(this.apiService.get<any[]>('contacts/ichat-users'));
      const registeredUsers = (usersRes.success && Array.isArray(usersRes.data)) ? usersRes.data : [];

      // 2. Load device synced contacts from ContactsService
      const syncedRes = await this.contactsService.syncDeviceContacts();
      const mappedSynced: IChatContact[] = [];

      if (syncedRes && syncedRes.ichatContacts) {
        for (const c of syncedRes.ichatContacts) {
          const uId = String(c.targetUserId || c.contactId || '');
          if (uId) {
            mappedSynced.push({
              userId: uId,
              phoneNumber: c.phoneNumber,
              displayName: c.profile?.displayName || c.name || c.phoneNumber,
              about: c.profile?.about,
              avatarUrl: c.profile?.avatarUrl,
              isOnline: c.isOnline,
            });
          }
        }
      }

      // Combine unique by userId
      const contactMap = new Map<string, IChatContact>();
      for (const u of mappedSynced) {
        const id = String(u.userId || '');
        if (id) contactMap.set(id, { ...u, userId: id });
      }
      for (const u of registeredUsers) {
        const id = String(u.userId || u._id || '');
        if (id && !contactMap.has(id)) {
          contactMap.set(id, {
            userId: id,
            phoneNumber: u.phoneNumber,
            displayName: u.displayName || u.phoneNumber,
            about: u.about,
            avatarUrl: u.avatarUrl,
            isOnline: u.isOnline,
          });
        }
      }

      const allList = Array.from(contactMap.values());
      this.contacts.set(allList);
      this.filteredContacts.set(allList);
    } catch (e) {
      console.warn('Error loading contacts:', e);
    }
  }

  async syncContactsNow() {
    this.toastService.showInfo('Syncing contacts...');
    await this.loadContacts();
    this.toastService.showSuccess('Contacts updated!');
  }

  async onSearch(event: any) {
    const query = (event.target.value || '').trim();
    this.searchQuery.set(query);

    const isPhone = /^[\+]?[0-9]{5,15}$/.test(query.replace(/[\s\-]/g, ''));
    this.isPhoneNumberSearch.set(isPhone);

    if (!query) {
      this.filteredContacts.set(this.contacts());
      return;
    }

    const currentSeq = ++this.searchSeq;

    try {
      const searchRes = await firstValueFrom(
        this.apiService.get<any[]>(`users/search?q=${encodeURIComponent(query)}`),
      );

      if (currentSeq !== this.searchSeq) return;

      if (searchRes.success && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
        const mappedResults: IChatContact[] = searchRes.data.map((u) => ({
          userId: String(u.userId || u._id || ''),
          phoneNumber: u.phoneNumber,
          displayName: u.displayName || u.phoneNumber,
          about: u.about,
          avatarUrl: u.avatarUrl,
          isOnline: u.isOnline,
        }));
        this.filteredContacts.set(mappedResults);
      } else {
        this.applyLocalFilter(query, currentSeq);
      }
    } catch (e) {
      if (currentSeq === this.searchSeq) {
        this.applyLocalFilter(query, currentSeq);
      }
    }
  }

  private applyLocalFilter(query: string, seq: number) {
    if (seq !== this.searchSeq) return;
    const lowerQ = query.toLowerCase();
    const cleanQ = query.replace(/[\s\-\(\)\+]/g, '').toLowerCase();
    const filtered = this.contacts().filter((c) => {
      const cleanPhone = (c.phoneNumber || '').replace(/[\s\-\(\)\+]/g, '').toLowerCase();
      return (
        (c.displayName && c.displayName.toLowerCase().includes(lowerQ)) ||
        (c.phoneNumber && c.phoneNumber.includes(lowerQ)) ||
        (cleanPhone && cleanQ && cleanPhone.includes(cleanQ)) ||
        (c.about && c.about.toLowerCase().includes(lowerQ))
      );
    });
    this.filteredContacts.set(filtered);
  }

  openUserProfile(userId: string) {
    this.router.navigate(['/user', userId]);
  }

  async startChat(targetUserId: string) {
    try {
      const res = await firstValueFrom(
        this.apiService.post<any>('conversations/direct', { targetUserId }),
      );
      if (res.success && res.data) {
        this.router.navigate(['/chat', res.data._id]);
      }
    } catch (e) {
      // Handled in ApiService
    }
  }

  async startChatByPhoneNumber(phoneNumber: string) {
    this.startingChat.set(true);
    try {
      const res = await firstValueFrom(
        this.apiService.post<any>('conversations/by-phone', { phoneNumber }),
      );
      if (res.success && res.data) {
        this.router.navigate(['/chat', res.data._id]);
      }
    } catch (e) {
      // Error handled in ApiService
    }
    this.startingChat.set(false);
  }
}
