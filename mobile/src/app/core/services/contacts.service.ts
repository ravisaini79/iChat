import { Injectable, signal, inject } from '@angular/core';
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';
import { firstValueFrom } from 'rxjs';

export interface SyncedContact {
  contactId?: string;
  name: string;
  phoneNumber: string;
  targetUserId?: string;
  isIChatUser: boolean;
  profile?: {
    displayName: string;
    about: string;
    avatarUrl?: string | null;
  } | null;
  isOnline?: boolean;
  lastSeen?: string | null;
}

export interface SyncResponseData {
  ichatContacts: SyncedContact[];
  inviteContacts: SyncedContact[];
}

@Injectable({
  providedIn: 'root',
})
export class ContactsService {
  readonly registeredIChatContacts = signal<SyncedContact[]>([]);
  readonly inviteContacts = signal<SyncedContact[]>([]);
  readonly syncing = signal<boolean>(false);
  readonly hasPermission = signal<boolean>(false);

  private apiService = inject(ApiService);
  private toastService = inject(ToastService);

  async requestContactsPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      this.hasPermission.set(true);
      return true;
    }

    try {
      const permission = await Contacts.requestPermissions();
      const granted = permission.contacts === 'granted';
      this.hasPermission.set(granted);
      return granted;
    } catch (e) {
      console.warn('Error requesting contacts permission:', e);
      return false;
    }
  }

  async syncDeviceContacts(): Promise<SyncResponseData | null> {
    this.syncing.set(true);
    try {
      let rawContactsList: Array<{ name: string; phoneNumber: string }> = [];

      if (Capacitor.isNativePlatform()) {
        const permGranted = await this.requestContactsPermission();
        if (permGranted) {
          const res = await Contacts.getContacts({
            projection: {
              name: true,
              phones: true,
            },
          });

          if (res && res.contacts) {
            for (const c of res.contacts) {
              const displayName = c.name?.display || c.name?.given || 'Unknown Contact';
              if (c.phones && c.phones.length > 0) {
                for (const p of c.phones) {
                  if (p.number) {
                    rawContactsList.push({
                      name: displayName,
                      phoneNumber: p.number,
                    });
                  }
                }
              }
            }
          }
        }
      }

      // If no native contacts found or on web/emulator, send an initial check call to backend
      if (rawContactsList.length === 0) {
        console.log('No native contacts found on device, performing fallback sync.');
      }

      const res = await firstValueFrom(
        this.apiService.post<SyncResponseData>('contacts/sync', {
          contacts: rawContactsList,
        }),
      );

      if (res && res.success && res.data) {
        this.registeredIChatContacts.set(res.data.ichatContacts || []);
        this.inviteContacts.set(res.data.inviteContacts || []);
        this.syncing.set(false);
        return res.data;
      }
    } catch (e) {
      console.error('Failed to sync contacts:', e);
    }

    this.syncing.set(false);
    return null;
  }

  async purgeContacts(): Promise<boolean> {
    try {
      const res = await firstValueFrom(this.apiService.delete('contacts/sync'));
      if (res && res.success) {
        this.registeredIChatContacts.set([]);
        this.inviteContacts.set([]);
        return true;
      }
    } catch (e) {
      console.error('Failed to purge contacts:', e);
    }
    return false;
  }
}
