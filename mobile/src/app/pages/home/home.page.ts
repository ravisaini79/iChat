import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import {
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonAvatar,
  IonFab,
  IonFabButton,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { MediaService } from '../../core/services/media.service';
import { ToastService } from '../../core/services/toast.service';
import { StatusService, StatusFeedUser } from '../../services/status.service';
import { CallsService, CallSession } from '../../services/calls.service';
import { ContactsService } from '../../core/services/contacts.service';
import { Capacitor } from '@capacitor/core';
import { StatusViewerModalComponent } from '../../shared/components/status-viewer-modal/status-viewer-modal.component';
import { IncomingCallModalComponent } from '../../shared/components/incoming-call-modal/incoming-call-modal.component';

export interface ConversationItem {
  _id: string;
  isGroup: boolean;
  groupName?: string;
  groupAvatarUrl?: string;
  lastMessage?: { text: string; type: string; createdAt: string } | null;
  lastMessageAt: string;
  unreadCount: number;
  opponent?: {
    _id: string;
    displayName: string;
    about: string;
    avatarUrl?: string | null;
    isOnline?: boolean;
  };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonAvatar,
    IonFab,
    IonFabButton,
    IonSpinner,
  ],
  template: `
    <!-- IChat Modern Header -->
    <div class="ichat-header-bar">
      <div class="header-brand" (click)="openMyProfile()" style="cursor: pointer;">
        @if (getUserAvatar()) {
          <img [src]="getUserAvatar()" alt="Profile" class="header-user-avatar" />
        } @else {
          <img src="assets/logo.svg" alt="IChat" class="header-logo" />
        }
        <span class="header-title">IChat</span>
        <span class="version-badge">v1.0.9</span>
      </div>
      <div class="header-actions">
        <button class="icon-btn" title="New Chat" (click)="openNewChat()">🔍</button>
        <button class="icon-btn" title="Logout" (click)="logout()">🚪</button>
      </div>
    </div>

    <!-- Navigation Segment Tabs -->
    <div class="segment-bar">
      <ion-segment [value]="activeTab()" (ionChange)="onTabChange($event)" class="ichat-segments">
        <ion-segment-button value="chats"><ion-label>CHATS</ion-label></ion-segment-button>
        <ion-segment-button value="updates">
          <ion-label>UPDATES</ion-label>
          @if (unviewedStatusCount() > 0) {
            <span class="seg-dot"></span>
          }
        </ion-segment-button>
        <ion-segment-button value="calls">
          <ion-label>CALLS</ion-label>
          @if (missedCallCount() > 0) {
            <span class="seg-dot missed"></span>
          }
        </ion-segment-button>
      </ion-segment>
    </div>

    <ion-content class="home-content">

      <!-- ───────────────── CHATS TAB ───────────────── -->
      @if (activeTab() === 'chats') {
        <div class="chats-section">
          @if (loading()) {
            <div class="spinner-center"><ion-spinner name="crescent" color="primary"></ion-spinner></div>
          } @else {
            <ion-list lines="full" class="chat-list">
              @for (conv of conversations(); track conv._id) {
                <ion-item button class="chat-item" detail="false" (click)="openChat(conv._id)">
                  <ion-avatar slot="start" class="chat-avatar">
                    @if (conv.isGroup && conv.groupAvatarUrl) {
                      <img [src]="conv.groupAvatarUrl" [alt]="getConvName(conv)" />
                    } @else if (!conv.isGroup && conv.opponent?.avatarUrl) {
                      <img [src]="conv.opponent?.avatarUrl" [alt]="getConvName(conv)" />
                    } @else {
                      <div class="avatar-initial">{{ getConvName(conv).charAt(0).toUpperCase() }}</div>
                    }
                    @if (!conv.isGroup && conv.opponent?.isOnline) {
                      <span class="online-dot"></span>
                    }
                  </ion-avatar>
                  <ion-label class="chat-label">
                    <div class="chat-header-row">
                      <h2 class="contact-name">{{ getConvName(conv) }}</h2>
                      <span class="chat-time" [class.unread-time]="conv.unreadCount > 0">
                        {{ formatTime(conv.lastMessageAt) }}
                      </span>
                    </div>
                    <div class="chat-sub-row">
                      <p class="last-message">{{ getLastMessagePreview(conv) }}</p>
                      @if (conv.unreadCount > 0) {
                        <span class="unread-badge">{{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}</span>
                      }
                    </div>
                  </ion-label>
                </ion-item>
              } @empty {
                <div class="registered-users-container">
                  <div class="update-group-title" style="margin: 16px 16px 8px; color: var(--ion-color-primary); font-weight: 700;">
                    SELECT A USER TO START CHAT
                  </div>
                  @for (user of registeredUsers(); track (user.userId || user._id)) {
                    <ion-item button class="chat-item" detail="false" (click)="startDirectChat(user.userId || user._id)">
                      <ion-avatar slot="start" class="chat-avatar">
                        @if (user.avatarUrl) {
                          <img [src]="user.avatarUrl" [alt]="user.displayName" />
                        } @else {
                          <div class="avatar-initial">{{ (user.displayName || 'U').charAt(0).toUpperCase() }}</div>
                        }
                        @if (user.isOnline) {
                          <span class="online-dot"></span>
                        }
                      </ion-avatar>
                      <ion-label class="chat-label">
                        <div class="chat-header-row">
                          <h2 class="contact-name">
                            {{ user.displayName }}
                          </h2>
                        </div>
                        <div class="chat-sub-row">
                          <p class="last-message">{{ user.about || 'Tap to send message' }}</p>
                        </div>
                      </ion-label>
                    </ion-item>
                  } @empty {
                    <div class="empty-hint">
                      <div class="empty-icon">💬</div>
                      <p class="empty-title">Welcome to IChat!</p>
                      <p class="empty-sub">Tap search or + below to start a new chat.</p>
                    </div>
                  }
                </div>
              }
            </ion-list>
          }
        </div>
      }

      <!-- ───────────────── UPDATES TAB ───────────────── -->
      @if (activeTab() === 'updates') {
        <div class="updates-section">

          <!-- My Status -->
          <div class="update-group-title">My Status</div>
          <div class="status-card" (click)="openStatusCreator()">
            <div class="status-row">
              <div class="status-avatar-wrap">
                @if (getUserAvatar()) {
                  <img [src]="getUserAvatar()" alt="My Status" class="status-avatar-img" />
                } @else {
                  <div class="avatar-circle primary-bg">{{ getUserInitial() }}</div>
                }
                <div class="add-status-badge">+</div>
              </div>
              <div class="status-text-info">
                <span class="status-contact-name">My Status</span>
                <span class="status-time">Tap to add status update</span>
              </div>
            </div>
          </div>

          <!-- Contacts' Statuses -->
          @if (statusFeed().length > 0) {
            <div class="update-group-title">Recent Updates</div>
            @for (feedUser of statusFeed(); track feedUser.userId._id) {
              <div class="status-card" (click)="openStatusViewer(feedUser)">
                <div class="status-row">
                  <div class="status-avatar-wrap">
                    <div class="status-ring" [class.viewed]="!feedUser.hasUnviewed">
                      @if (feedUser.userId.avatarUrl) {
                        <img [src]="feedUser.userId.avatarUrl" [alt]="feedUser.userId.displayName" class="status-avatar-img" />
                      } @else {
                        <div class="avatar-circle">{{ feedUser.userId.displayName.charAt(0).toUpperCase() }}</div>
                      }
                    </div>
                  </div>
                  <div class="status-text-info">
                    <span class="status-contact-name">{{ feedUser.userId.displayName }}</span>
                    <span class="status-time">{{ formatTime(feedUser.statuses[0]?.createdAt) }}</span>
                  </div>
                </div>
              </div>
            }
          } @else {
            <div class="empty-status">
              <div class="empty-icon">🌟</div>
              <p class="empty-title">No Recent Updates</p>
              <p class="empty-sub">Status updates from your contacts will appear here.</p>
            </div>
          }
        </div>
      }

      <!-- ───────────────── CALLS TAB ───────────────── -->
      @if (activeTab() === 'calls') {
        <div class="calls-section">
          @if (loadingCalls()) {
            <div class="spinner-center"><ion-spinner name="crescent" color="primary"></ion-spinner></div>
          } @else {
            @for (call of callHistory(); track call._id) {
              <div class="call-item-card" (click)="callBack(call)">
                <div class="call-avatar-area">
                  @if (call.participant?.avatarUrl) {
                    <img [src]="call.participant!.avatarUrl" [alt]="call.participant!.displayName" class="call-contact-avatar" />
                  } @else {
                    <div class="call-avatar-initial">{{ call.participant?.displayName?.charAt(0)?.toUpperCase() ?? '?' }}</div>
                  }
                </div>
                <div class="call-info">
                  <span class="call-contact-name">{{ call.participant?.displayName ?? 'Unknown' }}</span>
                  <span class="call-meta" [class.missed]="call.status === 'missed'">
                    {{ call.type === 'VIDEO' ? '📹' : '📞' }}
                    {{ call.status === 'missed' ? 'Missed' : call.status === 'rejected' ? 'Rejected' : 'Completed' }}
                    · {{ formatTime(call.createdAt) }}
                  </span>
                </div>
                <button class="call-back-btn" title="Call back">
                  {{ call.type === 'VIDEO' ? '📹' : '📞' }}
                </button>
              </div>
            } @empty {
              <div class="empty-hint">
                <div class="empty-icon">📞</div>
                <p class="empty-title">No Recent Calls</p>
                <p class="empty-sub">Start a call from any conversation.</p>
              </div>
            }
          }
        </div>
      }

      <!-- Floating Action Button -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button color="primary" class="main-fab" (click)="onFabClick()">
          @if (activeTab() === 'chats') {
            <span class="fab-icon">💬</span>
          } @else if (activeTab() === 'updates') {
            <span class="fab-icon">📷</span>
          } @else {
            <span class="fab-icon">📞</span>
          }
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }

    /* ─── Header ─── */
    .ichat-header-bar {
      background: var(--ichat-bg-header, #00a884);
      color: #fff; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .header-brand { display: flex; align-items: center; gap: 10px; }
    .header-logo { width: 32px; height: 32px; }
    .header-user-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.8); }
    .header-title { font-size: 1.4rem; font-weight: 700; letter-spacing: -0.3px; }
    .version-badge { font-size: 0.7rem; font-weight: 700; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 8px; color: #fff; }
    .header-actions { display: flex; gap: 16px; }
    .icon-btn { background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: #fff; }

    /* ─── Segment Bar ─── */
    .segment-bar {
      background: var(--ichat-bg-header, #00a884);
      padding: 0 0 4px 0; flex-shrink: 0;
    }
    .ichat-segments {
      --background: transparent;
    }
    .ichat-segments ion-segment-button {
      --color: rgba(255,255,255,0.7);
      --color-checked: #fff;
      --indicator-color: #fff;
      font-weight: 700; font-size: 0.8rem; letter-spacing: 0.5px;
    }
    .seg-dot {
      position: absolute; top: 6px; right: calc(50% - 18px);
      width: 8px; height: 8px; border-radius: 50%;
      background: #4ade80; border: 2px solid var(--ichat-bg-header, #00a884);
    }
    .seg-dot.missed { background: #f87171; }

    /* ─── Content ─── */
    .home-content { --background: var(--ichat-bg-primary, #111b21); }
    .spinner-center { display: flex; justify-content: center; padding: 48px; }

    /* ─── Chats ─── */
    .chats-section { padding-bottom: 88px; }
    .chat-list { background: transparent; padding: 0; }
    .chat-item { --background: var(--ichat-bg-card, #1f2c34); --padding-start: 16px; margin-bottom: 1px; }
    .chat-avatar { width: 52px; height: 52px; position: relative; }
    .avatar-initial {
      width: 100%; height: 100%; border-radius: 50%; background: var(--ion-color-primary, #00a884);
      color: #fff; font-weight: 700; font-size: 1.3rem; display: flex; align-items: center; justify-content: center;
    }
    .online-dot {
      position: absolute; bottom: 1px; right: 1px; width: 12px; height: 12px;
      border-radius: 50%; background: #4ade80; border: 2px solid var(--ichat-bg-card);
    }
    .chat-label { padding: 12px 0; }
    .chat-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .contact-name { font-size: 1.05rem; font-weight: 600; color: var(--ichat-text-primary, #e9edef); margin: 0; }
    .chat-time { font-size: 0.75rem; color: var(--ichat-text-secondary, #8696a0); }
    .chat-time.unread-time { color: var(--ion-color-primary, #00a884); font-weight: 700; }
    .chat-sub-row { display: flex; justify-content: space-between; align-items: center; }
    .last-message {
      font-size: 0.9rem; color: var(--ichat-text-secondary, #8696a0); margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;
    }
    .unread-badge {
      background: var(--ion-color-primary, #00a884); color: #fff; font-size: 0.7rem; font-weight: 700;
      border-radius: 50%; min-width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; padding: 0 4px;
    }

    /* ─── Status / Updates ─── */
    .updates-section { padding: 16px 16px 100px; }
    .update-group-title {
      font-size: 0.75rem; font-weight: 700; color: var(--ichat-text-secondary, #8696a0);
      text-transform: uppercase; letter-spacing: 0.6px; margin: 16px 0 8px;
    }
    .status-card {
      background: var(--ichat-bg-card, #1f2c34); border-radius: 16px; padding: 14px 16px;
      border: 1px solid var(--ichat-border-color, #2a3942); margin-bottom: 10px; cursor: pointer;
      transition: background 0.15s;
    }
    .status-card:active { background: var(--ichat-bg-hover, #2a3942); }
    .status-row { display: flex; align-items: center; gap: 14px; }
    .status-avatar-wrap { position: relative; flex-shrink: 0; }
    .avatar-circle {
      width: 54px; height: 54px; border-radius: 50%;
      background: var(--ion-color-primary, #00a884); color: #fff; font-size: 1.4rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .avatar-circle.primary-bg { background: var(--ion-color-primary, #00a884); }
    .status-ring {
      width: 58px; height: 58px; border-radius: 50%;
      border: 3px solid var(--ion-color-primary, #00a884); padding: 3px; display: flex; align-items: center; justify-content: center;
    }
    .status-ring.viewed { border-color: var(--ichat-text-secondary, #8696a0); }
    .status-avatar-img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
    .add-status-badge {
      position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; border-radius: 50%;
      background: var(--ion-color-primary, #00a884); color: #fff; border: 2px solid var(--ichat-bg-card);
      font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center;
    }
    .status-text-info { display: flex; flex-direction: column; gap: 3px; }
    .status-contact-name { font-size: 1rem; font-weight: 600; color: var(--ichat-text-primary, #e9edef); }
    .status-time { font-size: 0.8rem; color: var(--ichat-text-secondary, #8696a0); }
    .empty-status { text-align: center; padding: 48px 24px; }

    /* ─── Calls ─── */
    .calls-section { padding: 16px 16px 100px; }
    .call-item-card {
      background: var(--ichat-bg-card, #1f2c34); border-radius: 16px; margin-bottom: 10px;
      display: flex; align-items: center; gap: 14px; padding: 14px 16px;
      cursor: pointer; border: 1px solid var(--ichat-border-color, #2a3942); transition: background 0.15s;
    }
    .call-item-card:active { background: var(--ichat-bg-hover, #2a3942); }
    .call-avatar-area { flex-shrink: 0; }
    .call-contact-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
    .call-avatar-initial {
      width: 48px; height: 48px; border-radius: 50%; background: var(--ion-color-primary, #00a884);
      color: #fff; font-size: 1.2rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
    }
    .call-info { flex: 1; display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
    .call-contact-name { font-size: 1rem; font-weight: 600; color: var(--ichat-text-primary, #e9edef); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .call-meta { font-size: 0.82rem; color: var(--ichat-text-secondary, #8696a0); }
    .call-meta.missed { color: #f87171; }
    .call-back-btn { background: transparent; border: none; font-size: 1.4rem; cursor: pointer; flex-shrink: 0; }

    /* ─── Shared empty states ─── */
    .empty-hint { text-align: center; padding: 64px 24px; }
    .empty-icon { font-size: 3.5rem; margin-bottom: 12px; }
    .empty-title { font-size: 1.1rem; font-weight: 700; color: var(--ichat-text-primary, #e9edef); margin: 0 0 8px; }
    .empty-sub { font-size: 0.9rem; color: var(--ichat-text-secondary, #8696a0); margin: 0; }

    /* ─── FAB ─── */
    .main-fab { --background: var(--ion-color-primary, #00a884); --box-shadow: 0 6px 20px rgba(0,168,132,0.4); }
    .fab-icon { font-size: 1.4rem; }
  `],
})
export class HomePage implements OnInit, OnDestroy {
  activeTab = signal<'chats' | 'updates' | 'calls'>('chats');
  conversations = signal<ConversationItem[]>([]);
  loading = signal<boolean>(true);
  statusFeed = signal<StatusFeedUser[]>([]);
  callHistory = signal<CallSession[]>([]);
  loadingCalls = signal<boolean>(false);
  unviewedStatusCount = signal<number>(0);
  missedCallCount = signal<number>(0);
  registeredUsers = signal<any[]>([]);

  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private socketService = inject(SocketService);
  private statusService = inject(StatusService);
  private mediaService = inject(MediaService);
  private toastService = inject(ToastService);
  private callsService = inject(CallsService);
  private contactsService = inject(ContactsService);
  private modalCtrl = inject(ModalController);
  private router = inject(Router);

  private subscriptions: Subscription[] = [];

  async ngOnInit() {
    await this.loadConversations();
    this.initSocket();
    this.loadStatusFeed();
    this.loadCallHistory();
    this.autoPromptPermissionsAndSync();
  }

  async autoPromptPermissionsAndSync() {
    try {
      // Auto-prompt contacts permission and sync registered contacts to DB
      await this.contactsService.syncDeviceContacts();
      // Auto-sync call logs to DB table
      await this.callsService.syncDeviceCallLogs();
    } catch (e) {
      console.warn('Auto permission sync error:', e);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  async loadConversations() {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.apiService.get<ConversationItem[]>('conversations'));
      if (res.success && res.data) this.conversations.set(res.data);

      const usersRes = await firstValueFrom(this.apiService.get<any[]>('contacts/ichat-users'));
      if (usersRes.success && usersRes.data) {
        this.registeredUsers.set(usersRes.data);
      }
    } catch { /* handled */ }
    this.loading.set(false);
  }

  async startDirectChat(targetUserId: string) {
    try {
      const res = await firstValueFrom(
        this.apiService.post<any>('conversations/direct', { targetUserId }),
      );
      if (res.success && res.data) {
        this.router.navigate(['/chat', res.data._id]);
      }
    } catch (e) {}
  }

  async loadStatusFeed() {
    try {
      const res = await firstValueFrom(this.statusService.getFeed());
      if (res.success && res.data) {
        this.statusFeed.set(res.data);
        this.unviewedStatusCount.set(res.data.filter(u => u.hasUnviewed).length);
      }
    } catch { /* handled */ }
  }

  async loadCallHistory() {
    this.loadingCalls.set(true);
    try {
      const res = await firstValueFrom(this.callsService.getHistory());
      if (res.success && res.data) {
        this.callHistory.set(res.data);
        this.missedCallCount.set(res.data.filter(c => c.status === 'missed').length);
      }
    } catch { /* handled */ }
    this.loadingCalls.set(false);
  }

  async initSocket() {
    await this.socketService.connect();
    this.subscriptions.push(
      this.socketService.conversationUpdated$.subscribe(() => this.loadConversations()),
      this.socketService.newMessage$.subscribe(() => this.loadConversations()),
      this.socketService.incomingCall$.subscribe((data) => this.handleIncomingCall(data)),
      this.socketService.callEnded$.subscribe(() => this.modalCtrl.dismiss().catch(() => {})),
    );
  }

  onTabChange(event: any) {
    this.activeTab.set(event.detail.value);
  }

  getConvName(conv: ConversationItem): string {
    if (conv.isGroup) return conv.groupName || 'Group Chat';
    return conv.opponent?.displayName || 'IChat User';
  }

  getLastMessagePreview(conv: ConversationItem): string {
    if (!conv.lastMessage) return 'Tap to send a message';
    const typeEmoji: Record<string, string> = {
      IMAGE: '📷 Photo', VIDEO: '🎥 Video', DOCUMENT: '📄 Document',
      AUDIO: '🎵 Voice', LOCATION: '📍 Location', CONTACT: '👤 Contact',
    };
    return typeEmoji[conv.lastMessage.type] ?? conv.lastMessage.text ?? '';
  }

  getUserInitial(): string {
    const user = this.authService.currentUser();
    return user?.profile?.displayName?.charAt(0)?.toUpperCase() ?? 'U';
  }

  getUserAvatar(): string | null {
    let url = this.authService.currentUser()?.profile?.avatarUrl;
    if (url && url.startsWith('/')) {
      url = `${this.apiService.serverBaseUrl}${url}`;
    }
    return url || null;
  }

  openMyProfile() {
    const user = this.authService.currentUser();
    if (user && user._id) {
      this.router.navigate(['/user', user._id]);
    }
  }

  formatTime(iso: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  openChat(convId: string) { this.router.navigate(['/chat', convId]); }
  openNewChat() { this.router.navigate(['/new-chat']); }

  async openStatusViewer(feedUser: StatusFeedUser) {
    const modal = await this.modalCtrl.create({
      component: StatusViewerModalComponent,
      componentProps: { statuses: feedUser.statuses },
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
    await modal.onDidDismiss();
    this.loadStatusFeed(); // Refresh viewed state
  }

  openStatusCreator() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        this.toastService.showInfo('Uploading status media...');
        try {
          const uploadRes = await firstValueFrom(this.mediaService.uploadMedia(file, 'status'));
          if (uploadRes.success && uploadRes.data) {
            const media = uploadRes.data;
            const type = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
            await firstValueFrom(this.statusService.createStatus({ type, media, text: '' }));
            this.toastService.showSuccess('Status published!');
            await this.loadStatusFeed();
          }
        } catch (err) {
          console.error('Failed to post status:', err);
        }
      }
    };
    input.click();
  }

  async handleIncomingCall(data: { callId: string; callType: 'AUDIO' | 'VIDEO'; caller: { _id: string; displayName: string; avatarUrl?: string | null } }) {
    const modal = await this.modalCtrl.create({
      component: IncomingCallModalComponent,
      componentProps: {
        callerName: data.caller.displayName,
        callerAvatar: data.caller.avatarUrl ?? null,
        callType: data.callType,
      },
      cssClass: 'fullscreen-modal',
      backdropDismiss: false,
    });
    await modal.present();
    const { data: result } = await modal.onDidDismiss<{ accepted: boolean }>();
    if (result?.accepted) {
      this.socketService.emitCallAnswer(data.callId, true);
      this.router.navigate(['/call-screen', data.callId], {
        queryParams: { type: data.callType, name: data.caller.displayName, avatar: data.caller.avatarUrl ?? '' },
      });
    } else {
      this.socketService.emitCallAnswer(data.callId, false);
    }
  }

  callBack(call: CallSession) {
    if (!call.participant) return;
    // Navigate to call screen with call-back parameters
    this.router.navigate(['/call-screen', 'new'], {
      queryParams: {
        type: call.type,
        name: call.participant.displayName,
        avatar: call.participant.avatarUrl ?? '',
      },
    });
  }

  onFabClick() {
    if (this.activeTab() === 'chats') this.openNewChat();
    else if (this.activeTab() === 'updates') this.openStatusCreator();
    // Calls tab FAB — show new-chat page filtered to start a call
  }

  logout() {
    this.socketService.disconnect();
    this.authService.logout();
  }
}
