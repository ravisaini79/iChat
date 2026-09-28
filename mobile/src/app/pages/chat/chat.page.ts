import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonAvatar,
  IonSpinner,
  IonFooter,
  ModalController,
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { SocketService, MessageItem } from '../../core/services/socket.service';
import { MediaService } from '../../core/services/media.service';
import { StorageService } from '../../core/services/storage.service';
import { ToastService } from '../../core/services/toast.service';
import { BackupSyncService } from '../../core/services/backup-sync.service';
import { BackupSetupModal } from '../backup-setup/backup-setup.modal';
import {
  AttachmentPickerModalComponent,
  AttachmentSelection,
} from '../../shared/components/attachment-picker-modal/attachment-picker-modal.component';
import { MediaViewerModalComponent } from '../../shared/components/media-viewer-modal/media-viewer-modal.component';
import { ImportMediaModal } from '../import-media/import-media.modal';
import {
  MessageActionsModalComponent,
  ActionResponse,
} from '../../shared/components/message-actions-modal/message-actions-modal.component';
import { ForwardModalComponent } from '../../shared/components/forward-modal/forward-modal.component';
import { CallsService } from '../../services/calls.service';

@Component({
  selector: 'app-chat',
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
    IonAvatar,
    IonSpinner,
    IonFooter,
  ],
  template: `
    <ion-header class="ion-no-border">
      <div class="chat-header-bar">
        <div class="header-left" (click)="openOpponentProfile()" style="cursor: pointer;">
          <ion-buttons slot="start" (click)="$event.stopPropagation()">
            <ion-back-button defaultHref="/home" color="light"></ion-back-button>
          </ion-buttons>

          <ion-avatar class="header-avatar">
            @if (conversation()?.opponent?.avatarUrl) {
              <img [src]="conversation()?.opponent?.avatarUrl" [alt]="getOpponentName()" />
            } @else {
              <div class="avatar-initial">
                {{ getOpponentName().charAt(0).toUpperCase() }}
              </div>
            }
          </ion-avatar>

          <div class="header-meta">
            <h2 class="contact-name">{{ getOpponentName() }}</h2>
            <span class="status-subtitle">
              @if (isOpponentTyping()) {
                <span class="typing-text">typing...</span>
              } @else if (conversation()?.opponent?.isOnline || isOpponentOnline()) {
                <span class="online-text">online</span>
              } @else {
                <span>IChat Contact</span>
              }
            </span>
          </div>
        </div>

        <div class="header-right">
          <button class="header-action-btn" title="Search" (click)="toggleSearch()">🔍</button>
          <button class="header-action-btn" title="Voice Call" (click)="startCall('AUDIO')">📞</button>
          <button class="header-action-btn" title="Video Call" (click)="startCall('VIDEO')">📹</button>
        </div>
      </div>

      <!-- In-Chat Search Bar Toggle -->
      @if (showSearch()) {
        <div class="in-chat-search-bar">
          <input
            type="text"
            placeholder="Search messages in chat..."
            class="search-input"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
          />
          <button class="close-search-btn" (click)="toggleSearch()">✕</button>
        </div>
      }

      <!-- Pinned Message Banner -->
      @if (pinnedMessage()) {
        <div class="pinned-banner">
          <span class="pin-icon">📌</span>
          <div class="pinned-info">
            <span class="pinned-label">Pinned Message</span>
            <p class="pinned-text">{{ pinnedMessage()?.text }}</p>
          </div>
          <button class="unpin-btn" (click)="unpinMessage(pinnedMessage()!._id)">✕</button>
        </div>
      }
    </ion-header>

    <ion-content class="chat-content ion-padding" #contentArea>
      @if (loading()) {
        <div class="spinner-center">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
      } @else {
        <div class="messages-container">
          <div class="date-badge">
            <span>TODAY</span>
          </div>

          @for (msg of filteredMessages(); track msg._id) {
            <div
              class="message-wrapper"
              [class.sent-wrapper]="isMyMessage(msg)"
              [class.received-wrapper]="!isMyMessage(msg)"
              (contextmenu)="$event.preventDefault(); openMessageActions(msg)"
              (click)="openMessageActions(msg)"
            >
              <div
                class="message-bubble"
                [class.sent-bubble]="isMyMessage(msg)"
                [class.received-bubble]="!isMyMessage(msg)"
                [class.deleted-bubble]="msg.isDeleted"
              >
                <!-- QUOTED REPLY PREVIEW INSIDE BUBBLE -->
                @if (msg.replyTo) {
                  <div class="quoted-reply-box">
                    <span class="quoted-sender">Replying to message</span>
                    <p class="quoted-text">{{ getQuotedText(msg.replyTo) }}</p>
                  </div>
                }

                <!-- DELETED MESSAGE PLACEHOLDER -->
                @if (msg.isDeleted) {
                  <p class="deleted-text">🚫 <em>This message was deleted</em></p>
                } @else {
                  <!-- IMAGE MESSAGE -->
                  @if (msg.type === 'IMAGE') {
                    <div class="media-preview-card" (click)="$event.stopPropagation(); openMediaViewer(getMediaUrl(msg), 'image')">
                      <img [src]="getMediaUrl(msg)" alt="Shared photo" class="bubble-image" />
                      @if (msg.text) {
                        <p class="caption-text">{{ msg.text }}</p>
                      }
                    </div>
                  }

                  <!-- VIDEO MESSAGE -->
                  @else if (msg.type === 'VIDEO') {
                    <div class="media-preview-card" (click)="$event.stopPropagation(); openMediaViewer(getMediaUrl(msg), 'video')">
                      <div class="video-thumbnail-container">
                        <video [src]="getMediaUrl(msg)" class="bubble-video"></video>
                        <div class="play-overlay">▶</div>
                      </div>
                      @if (msg.text) {
                        <p class="caption-text">{{ msg.text }}</p>
                      }
                    </div>
                  }

                  <!-- DOCUMENT MESSAGE -->
                  @else if (msg.type === 'DOCUMENT') {
                    <div class="document-card" (click)="$event.stopPropagation(); downloadFile(getMediaUrl(msg))">
                      <div class="doc-icon">📄</div>
                      <div class="doc-info">
                        <h4 class="doc-name">{{ msg.media?.fileName || 'Document.pdf' }}</h4>
                        <span class="doc-size">{{ formatFileSize(msg.media?.size) }}</span>
                      </div>
                    </div>
                  }

                  <!-- LOCATION MESSAGE -->
                  @else if (msg.type === 'LOCATION') {
                    <div class="location-card" (click)="$event.stopPropagation(); openLocationInMaps(msg)">
                      <div class="location-icon">📍</div>
                      <div class="location-info">
                        <h4>{{ getLocationTitle(msg) }}</h4>
                        <p>Lat: {{ getLocationLat(msg) }}, Lng: {{ getLocationLng(msg) }}</p>
                        <button class="open-maps-btn" (click)="$event.stopPropagation(); openLocationInMaps(msg)">📍 Open in Maps</button>
                      </div>
                    </div>
                  }

                  <!-- CONTACT MESSAGE -->
                  @else if (msg.type === 'CONTACT') {
                    <div class="contact-card">
                      <div class="contact-icon">👤</div>
                      <div class="contact-info">
                        <h4>{{ msg.media?.contact?.name || 'Contact' }}</h4>
                        <p>{{ msg.media?.contact?.phoneNumber }}</p>
                      </div>
                    </div>
                  }

                  <!-- TEXT MESSAGE -->
                  @else {
                    <p class="message-text">
                      {{ msg.text }}
                      @if (msg.isEdited) {
                        <span class="edited-tag">(edited)</span>
                      }
                    </p>
                  }
                }

                <!-- EMOJI REACTIONS BADGES -->
                @if (msg.reactions && msg.reactions.length > 0) {
                  <div class="reactions-badge-container">
                    @for (r of msg.reactions; track r.userId) {
                      <span class="reaction-emoji">{{ r.emoji }}</span>
                    }
                  </div>
                }

                <!-- MESSAGE META & TICKS -->
                <div class="message-meta">
                  @if (msg.isPinned) {
                    <span class="pinned-indicator">📌</span>
                  }
                  <span class="message-time">{{ formatTime(msg.createdAt) }}</span>
                  @if (isMyMessage(msg) && !msg.isDeleted) {
                    <span class="status-ticks">
                      @if (msg.status === 'READ') {
                        <span class="tick double-tick read-tick">✓✓</span>
                      } @else if (msg.status === 'DELIVERED') {
                        <span class="tick double-tick">✓✓</span>
                      } @else {
                        <span class="tick single-tick">✓</span>
                      }
                    </span>
                  }
                </div>
              </div>
            </div>
          } @empty {
            <div class="encryption-notice">
              🔒 Messages in this chat are secured with IChat end-to-end encryption.
            </div>
          }
        </div>
      }
    </ion-content>

    <ion-footer class="ion-no-border">
      <!-- QUOTED REPLY BAR ABOVE COMPOSER -->
      @if (replyingToMessage()) {
        <div class="reply-preview-bar">
          <div class="reply-border"></div>
          <div class="reply-content">
            <span class="reply-title">Replying to message</span>
            <p class="reply-text">{{ replyingToMessage()?.text }}</p>
          </div>
          <button class="clear-reply-btn" (click)="cancelReply()">✕</button>
        </div>
      }

      <!-- EDIT MESSAGE BAR ABOVE COMPOSER -->
      @if (editingMessage()) {
        <div class="edit-preview-bar">
          <span class="edit-title">Editing message</span>
          <button class="clear-reply-btn" (click)="cancelEdit()">✕</button>
        </div>
      }

      <div class="composer-bar">
        <button class="composer-btn" (click)="toastService.showInfo('Emoji picker ready!')">😊</button>

        <input
          #messageInput
          type="text"
          class="message-input"
          [placeholder]="editingMessage() ? 'Update message...' : 'Type a message...'"
          [value]="inputText()"
          (input)="onTextInput($event)"
          (keydown.enter)="sendMessage()"
        />

        <button class="composer-btn" (click)="openAttachmentPicker()">📎</button>

        <button
          class="send-fab-btn"
          [disabled]="!inputText().trim()"
          (click)="sendMessage()"
        >
          ➤
        </button>
      </div>
    </ion-footer>
  `,
  styles: [`
    .chat-header-bar {
      background: var(--ichat-bg-header);
      color: #ffffff;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-avatar { width: 40px; height: 40px; }
    .avatar-initial {
      width: 100%; height: 100%; background: var(--ion-color-primary); color: #ffffff;
      font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; border-radius: 50%;
    }
    .header-meta { display: flex; flex-direction: column; }
    .contact-name { font-size: 1.05rem; font-weight: 600; margin: 0; color: #ffffff; }
    .status-subtitle { font-size: 0.75rem; color: rgba(255, 255, 255, 0.8); }
    .typing-text { color: #25D366; font-weight: 600; }
    .online-text { color: #ffffff; }
    .header-right { display: flex; gap: 12px; }
    .header-action-btn { background: transparent; border: none; font-size: 1.2rem; cursor: pointer; }

    /* In-Chat Search Bar */
    .in-chat-search-bar {
      background: var(--ichat-bg-header);
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .search-input {
      flex: 1; border: none; outline: none; border-radius: 16px; padding: 8px 14px;
      font-size: 0.9rem; background: rgba(255, 255, 255, 0.9); color: #111B21;
    }
    .close-search-btn { background: transparent; border: none; color: #ffffff; font-size: 1.1rem; cursor: pointer; }

    /* Pinned Banner */
    .pinned-banner {
      background: var(--ichat-bg-card);
      border-bottom: 1px solid var(--ichat-border-color);
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .pin-icon { font-size: 1.1rem; }
    .pinned-info { flex: 1; display: flex; flex-direction: column; }
    .pinned-label { font-size: 0.75rem; font-weight: 700; color: var(--ion-color-primary); }
    .pinned-text { font-size: 0.85rem; margin: 0; color: var(--ichat-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .unpin-btn { background: transparent; border: none; font-size: 1rem; color: var(--ichat-text-secondary); cursor: pointer; }

    .chat-content { --background: var(--ichat-bg-primary); }
    .spinner-center { display: flex; justify-content: center; padding: 48px; }
    .messages-container { display: flex; flex-direction: column; gap: 8px; padding-bottom: 12px; }
    .date-badge { text-align: center; margin: 12px 0; span { background: rgba(0, 0, 0, 0.1); color: var(--ichat-text-secondary); font-size: 0.7rem; font-weight: 700; padding: 4px 12px; border-radius: 12px; } }
    .message-wrapper { display: flex; width: 100%; }
    .sent-wrapper { justify-content: flex-end; }
    .received-wrapper { justify-content: flex-start; }
    .message-bubble {
      max-width: 78%; padding: 8px 10px; border-radius: 14px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08); position: relative; cursor: pointer;
    }
    .sent-bubble { background: var(--ichat-bubble-sent); color: var(--ichat-text-primary); border-top-right-radius: 2px; }
    .received-bubble { background: var(--ichat-bubble-received); color: var(--ichat-text-primary); border-top-left-radius: 2px; }
    .deleted-bubble { opacity: 0.7; }
    .message-text { font-size: 0.95rem; line-height: 1.4; margin: 0 0 4px 0; word-break: break-word; }
    .edited-tag { font-size: 0.75rem; color: var(--ichat-text-secondary); font-style: italic; margin-left: 4px; }
    .deleted-text { font-size: 0.9rem; color: var(--ichat-text-secondary); margin: 0 0 4px 0; }

    /* Quoted Reply Box */
    .quoted-reply-box {
      background: rgba(0, 0, 0, 0.05);
      border-left: 3px solid var(--ion-color-primary);
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 6px;
    }
    .quoted-sender { font-size: 0.75rem; font-weight: 700; color: var(--ion-color-primary); display: block; }
    .quoted-text { font-size: 0.85rem; margin: 2px 0 0 0; color: var(--ichat-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Reaction Badges */
    .reactions-badge-container {
      position: absolute;
      bottom: -10px;
      right: 12px;
      background: var(--ichat-bg-card);
      border-radius: 12px;
      padding: 2px 6px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      display: flex;
      gap: 2px;
      font-size: 0.8rem;
    }

    /* Media Cards */
    .media-preview-card { cursor: pointer; border-radius: 10px; overflow: hidden; margin-bottom: 4px; }
    .bubble-image { width: 100%; max-height: 250px; object-fit: cover; border-radius: 10px; }
    .video-thumbnail-container { position: relative; width: 100%; max-height: 200px; overflow: hidden; border-radius: 10px; }
    .bubble-video { width: 100%; height: 100%; object-fit: cover; }
    .play-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0, 0, 0, 0.6); color: #ffffff; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .caption-text { font-size: 0.9rem; margin: 6px 0 2px 0; }

    /* Document Card */
    .document-card { display: flex; align-items: center; gap: 12px; background: rgba(0, 0, 0, 0.05); border-radius: 10px; padding: 10px; cursor: pointer; }
    .doc-icon { font-size: 1.8rem; }
    .doc-info { display: flex; flex-direction: column; }
    .doc-name { font-size: 0.9rem; font-weight: 600; margin: 0; }
    .doc-size { font-size: 0.75rem; color: var(--ichat-text-secondary); }

    /* Location / Contact Card */
    .location-card, .contact-card { display: flex; align-items: center; gap: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 10px; padding: 10px; h4 { font-size: 0.9rem; margin: 0; font-weight: 600; } p { font-size: 0.75rem; margin: 2px 0 0 0; color: var(--ichat-text-secondary); } }
    .open-maps-btn { margin-top: 6px; padding: 4px 10px; background: var(--ion-color-primary); color: #ffffff; border: none; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
    .location-icon, .contact-icon { font-size: 1.6rem; }

    .message-meta { display: flex; align-items: center; justify-content: flex-end; gap: 4px; font-size: 0.7rem; color: var(--ichat-text-secondary); }
    .pinned-indicator { font-size: 0.7rem; }
    .status-ticks { display: flex; align-items: center; }
    .tick { font-weight: 700; font-size: 0.8rem; }
    .read-tick { color: #0284C7; }
    .encryption-notice { text-align: center; background: rgba(255, 235, 131, 0.2); border: 1px solid rgba(255, 200, 0, 0.2); border-radius: 12px; padding: 10px 16px; font-size: 0.78rem; color: var(--ichat-text-secondary); margin: 16px 0; }

    /* Reply / Edit Preview Bar */
    .reply-preview-bar, .edit-preview-bar {
      background: var(--ichat-bg-card); border-top: 1px solid var(--ichat-border-color); padding: 8px 14px; display: flex; align-items: center; justify-content: space-between;
    }
    .reply-border { width: 4px; height: 36px; background: var(--ion-color-primary); border-radius: 2px; margin-right: 10px; }
    .reply-content { flex: 1; display: flex; flex-direction: column; }
    .reply-title, .edit-title { font-size: 0.75rem; font-weight: 700; color: var(--ion-color-primary); }
    .reply-text { font-size: 0.85rem; margin: 2px 0 0 0; color: var(--ichat-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .clear-reply-btn { background: transparent; border: none; font-size: 1.1rem; color: var(--ichat-text-secondary); cursor: pointer; }

    /* Composer Bar */
    .composer-bar { background: var(--ichat-bg-card); padding: 8px 12px; display: flex; align-items: center; gap: 8px; border-top: 1px solid var(--ichat-border-color); }
    .composer-btn { background: transparent; border: none; font-size: 1.3rem; cursor: pointer; color: var(--ichat-text-secondary); }
    .message-input { flex: 1; border: 1px solid var(--ichat-border-color); border-radius: 20px; padding: 10px 16px; font-size: 0.95rem; background: var(--ichat-bg-primary); color: var(--ichat-text-primary); outline: none; }
    .send-fab-btn { width: 42px; height: 42px; border-radius: 50%; background: var(--ion-color-primary); color: #ffffff; border: none; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 168, 132, 0.3); &:disabled { opacity: 0.5; cursor: not-allowed; } }
  `],
})
export class ChatPage implements OnInit, OnDestroy {
  conversationId = signal<string>('');
  conversation = signal<any>(null);
  messages = signal<MessageItem[]>([]);
  filteredMessages = signal<MessageItem[]>([]);
  inputText = signal<string>('');
  loading = signal<boolean>(true);
  isOpponentTyping = signal<boolean>(false);
  isOpponentOnline = signal<boolean>(false);

  showSearch = signal<boolean>(false);
  searchQuery = signal<string>('');

  replyingToMessage = signal<MessageItem | null>(null);
  editingMessage = signal<MessageItem | null>(null);
  pinnedMessage = signal<MessageItem | null>(null);

  @ViewChild('contentArea', { static: false }) contentArea!: IonContent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storageService = inject(StorageService);
  private backupSyncService = inject(BackupSyncService);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private mediaService = inject(MediaService);
  private modalCtrl = inject(ModalController);
  private callsService = inject(CallsService);
  public toastService = inject(ToastService);

  private subscriptions: Subscription[] = [];
  private typingTimeout: any;

  async ngOnInit() {
    this.checkFirstOpenBackupSetup();

    this.route.params.subscribe(async (params) => {
      if (params['id']) {
        this.conversationId.set(params['id']);
        await this.loadChatData();
        this.initSocketListeners();
      }
    });
  }

  async checkFirstOpenBackupSetup() {
    const setupCompleted = await this.storageService.get<boolean>('backupSetupCompleted');
    if (!setupCompleted) {
      setTimeout(async () => {
        const modal = await this.modalCtrl.create({
          component: BackupSetupModal,
        });
        await modal.present();
      }, 1000);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
    if (this.conversationId()) {
      this.socketService.leaveConversation(this.conversationId());
    }
  }

  async loadChatData() {
    this.loading.set(true);
    try {
      const convRes = await firstValueFrom(
        this.apiService.get<any>(`conversations/${this.conversationId()}`),
      );
      if (convRes.success && convRes.data) {
        this.conversation.set(convRes.data);
        if (convRes.data.opponent?.isOnline) {
          this.isOpponentOnline.set(true);
        }
      }

      const msgRes = await firstValueFrom(
        this.apiService.get<MessageItem[]>(`messages/${this.conversationId()}`),
      );
      if (msgRes.success && msgRes.data) {
        this.messages.set(msgRes.data);
        this.filteredMessages.set(msgRes.data);

        // Check for pinned message
        const pinned = msgRes.data.find((m) => m.isPinned && !m.isDeleted);
        if (pinned) this.pinnedMessage.set(pinned);
      }

      await firstValueFrom(
        this.apiService.patch(`messages/${this.conversationId()}/read`, {}),
      );
    } catch (e) {
      // Handled
    }
    this.loading.set(false);
    this.scrollToBottom();
  }

  async initSocketListeners() {
    await this.socketService.connect();
    this.socketService.joinConversation(this.conversationId());
    this.socketService.sendReadReceipt(this.conversationId());

    this.subscriptions.push(
      this.socketService.newMessage$.subscribe((msg) => {
        if (msg.conversationId === this.conversationId()) {
          this.messages.update((list) => [...list, msg]);
          this.filterMessages();
          this.scrollToBottom();
          this.socketService.sendReadReceipt(this.conversationId());
        }
      }),
    );

    this.subscriptions.push(
      this.socketService.editedMessage$.subscribe((updatedMsg) => {
        this.updateMessageInList(updatedMsg);
      }),
    );

    this.subscriptions.push(
      this.socketService.deletedMessage$.subscribe((updatedMsg) => {
        this.updateMessageInList(updatedMsg);
      }),
    );

    this.subscriptions.push(
      this.socketService.reactionUpdated$.subscribe((updatedMsg) => {
        this.updateMessageInList(updatedMsg);
      }),
    );

    this.subscriptions.push(
      this.socketService.pinnedMessage$.subscribe((updatedMsg) => {
        this.updateMessageInList(updatedMsg);
        if (updatedMsg.isPinned) {
          this.pinnedMessage.set(updatedMsg);
        } else if (this.pinnedMessage()?._id === updatedMsg._id) {
          this.pinnedMessage.set(null);
        }
      }),
    );

    this.subscriptions.push(
      this.socketService.messageRead$.subscribe((data) => {
        if (data.conversationId === this.conversationId()) {
          this.messages.update((list) =>
            list.map((m) => {
              if (this.isMyMessage(m)) {
                return { ...m, status: 'READ' };
              }
              return m;
            }),
          );
          this.filterMessages();
        }
      }),
    );

    this.subscriptions.push(
      this.socketService.typingStart$.subscribe((data) => {
        if (data.conversationId === this.conversationId() && !this.isMyUserId(data.userId)) {
          this.isOpponentTyping.set(true);
        }
      }),
    );

    this.subscriptions.push(
      this.socketService.typingStop$.subscribe((data) => {
        if (data.conversationId === this.conversationId() && !this.isMyUserId(data.userId)) {
          this.isOpponentTyping.set(false);
        }
      }),
    );

    this.subscriptions.push(
      this.socketService.userOnline$.subscribe((data) => {
        if (this.conversation()?.opponent?._id === data.userId) {
          this.isOpponentOnline.set(true);
        }
      }),
    );

    this.subscriptions.push(
      this.socketService.userOffline$.subscribe((data) => {
        if (this.conversation()?.opponent?._id === data.userId) {
          this.isOpponentOnline.set(false);
        }
      }),
    );
  }

  updateMessageInList(updatedMsg: MessageItem) {
    this.messages.update((list) =>
      list.map((m) => (m._id === updatedMsg._id ? updatedMsg : m)),
    );
    this.filterMessages();
  }

  toggleSearch() {
    this.showSearch.update((v) => !v);
    if (!this.showSearch()) {
      this.searchQuery.set('');
      this.filterMessages();
    }
  }

  onSearchInput(event: any) {
    const query = (event.target.value || '').toLowerCase().trim();
    this.searchQuery.set(query);
    this.filterMessages();
  }

  filterMessages() {
    const q = this.searchQuery();
    if (!q) {
      this.filteredMessages.set(this.messages());
    } else {
      this.filteredMessages.set(
        this.messages().filter((m) => m.text && m.text.toLowerCase().includes(q)),
      );
    }
  }

  onTextInput(event: any) {
    const text = event.target.value || '';
    this.inputText.set(text);

    if (this.conversationId()) {
      this.socketService.sendTypingStart(this.conversationId());
      clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => {
        this.socketService.sendTypingStop(this.conversationId());
      }, 1500);
    }
  }

  sendMessage() {
    const text = this.inputText().trim();
    if (!text || !this.conversationId()) return;

    if (this.editingMessage()) {
      const msgId = this.editingMessage()!._id;
      this.socketService.editMessage(msgId, this.conversationId(), text);
      this.editingMessage.set(null);
    } else {
      const replyToId = this.replyingToMessage()?._id || null;
      this.socketService.sendMessage(this.conversationId(), text, 'TEXT', null, replyToId);
      this.replyingToMessage.set(null);
    }

    this.inputText.set('');
    this.socketService.sendTypingStop(this.conversationId());
  }

  async openMessageActions(msg: MessageItem) {
    const isMine = this.isMyMessage(msg);
    const modal = await this.modalCtrl.create({
      component: MessageActionsModalComponent,
      componentProps: {
        isMyMessage: isMine,
        isDeleted: msg.isDeleted,
        isPinned: msg.isPinned,
        isStarred: msg.starredBy?.includes(this.authService.currentUser()?._id || ''),
      },
      breakpoints: [0, 0.45],
      initialBreakpoint: 0.45,
    });
    await modal.present();

    const { data } = (await modal.onWillDismiss()) as { data: ActionResponse };
    if (!data) return;

    if (data.action === 'REACT' && data.emoji) {
      this.socketService.reactMessage(msg._id, this.conversationId(), data.emoji);
    } else if (data.action === 'REPLY') {
      this.replyingToMessage.set(msg);
    } else if (data.action === 'COPY') {
      navigator.clipboard.writeText(msg.text);
      this.toastService.showSuccess('Message copied to clipboard');
    } else if (data.action === 'PIN') {
      this.socketService.pinMessage(msg._id, this.conversationId());
    } else if (data.action === 'EDIT') {
      this.editingMessage.set(msg);
      this.inputText.set(msg.text);
    } else if (data.action === 'DELETE') {
      this.socketService.deleteMessage(
        msg._id,
        this.conversationId(),
        !!data.forEveryone,
      );
    } else if (data.action === 'FORWARD') {
      this.openForwardModal(msg);
    }
  }

  async openForwardModal(msg: MessageItem) {
    const modal = await this.modalCtrl.create({
      component: ForwardModalComponent,
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data._id) {
      this.socketService.sendMessage(data._id, msg.text, msg.type, msg.media);
      this.toastService.showSuccess('Message forwarded!');
    }
  }

  unpinMessage(msgId: string) {
    this.socketService.pinMessage(msgId, this.conversationId());
    this.pinnedMessage.set(null);
  }

  cancelReply() { this.replyingToMessage.set(null); }
  cancelEdit() { this.editingMessage.set(null); this.inputText.set(''); }

  getQuotedText(replyTo: any): string {
    if (!replyTo) return '';
    return typeof replyTo === 'object' ? replyTo.text || 'Media' : 'Quoted Message';
  }

  async openAttachmentPicker() {
    const modal = await this.modalCtrl.create({
      component: AttachmentPickerModalComponent,
      breakpoints: [0, 0.45],
      initialBreakpoint: 0.45,
    });
    await modal.present();

    const { data } = (await modal.onWillDismiss()) as { data: AttachmentSelection };
    if (!data) return;

    if (data.type === 'IMPORT_BULK') {
      const importModal = await this.modalCtrl.create({
        component: ImportMediaModal,
      });
      await importModal.present();
      return;
    }

    if (data.file) {
      this.toastService.showInfo('Uploading media to Cloudinary...');
      try {
        const uploadRes = await firstValueFrom(this.mediaService.uploadMedia(data.file));
        if (uploadRes.success && uploadRes.data) {
          const media = uploadRes.data;
          let msgType = 'IMAGE';
          if (data.type === 'VIDEO') msgType = 'VIDEO';
          if (data.type === 'DOCUMENT') msgType = 'DOCUMENT';

          this.socketService.sendMessage(
            this.conversationId(),
            data.file.name,
            msgType,
            media,
          );
          this.toastService.showSuccess('Media sent!');
        }
      } catch (e) {
        // Handled
      }
    } else if (data.type === 'LOCATION' && data.data) {
      this.socketService.sendMessage(
        this.conversationId(),
        '📍 Shared Location',
        'LOCATION',
        { location: data.data },
      );
    } else if (data.type === 'CONTACT' && data.data) {
      this.socketService.sendMessage(
        this.conversationId(),
        '👤 Shared Contact',
        'CONTACT',
        { contact: data.data },
      );
    }
  }

  async openMediaViewer(mediaUrl: string, mediaType: 'image' | 'video') {
    if (!mediaUrl) return;
    const modal = await this.modalCtrl.create({
      component: MediaViewerModalComponent,
      componentProps: { mediaUrl, mediaType },
    });
    await modal.present();
  }

  getMediaUrl(msg: MessageItem): string {
    let url = msg.media?.cloudinaryUrl || msg.media?.secureUrl || msg.media?.url || (typeof msg.text === 'string' && msg.text.startsWith('http') ? msg.text : '');
    if (url && url.startsWith('/')) {
      const serverRoot = this.apiService.serverBaseUrl;
      url = `${serverRoot}${url}`;
    }
    return url;
  }
  getLocationTitle(msg: MessageItem): string { return msg.location?.title || msg.location?.name || msg.media?.location?.name || 'Shared Location'; }
  getLocationLat(msg: MessageItem): number | string { return msg.location?.latitude ?? msg.media?.location?.latitude ?? '26.9124'; }
  getLocationLng(msg: MessageItem): number | string { return msg.location?.longitude ?? msg.media?.location?.longitude ?? '75.7873'; }
  openLocationInMaps(msg: MessageItem) {
    const lat = this.getLocationLat(msg);
    const lng = this.getLocationLng(msg);
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }
  formatFileSize(bytes?: number): string {
    if (!bytes) return 'File';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  downloadFile(url: string) { if (url) window.open(url, '_blank'); }
  openOpponentProfile() {
    const opponentId = this.conversation()?.opponent?._id;
    if (opponentId) {
      this.router.navigate(['/user', opponentId]);
    }
  }

  getOpponentName(): string { return this.conversation()?.opponent?.displayName || 'Chat'; }
  isMyMessage(msg: MessageItem): boolean {
    const myId = this.authService.currentUser()?._id;
    const sender = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
    return sender === myId;
  }
  isMyUserId(userId: string): boolean { return this.authService.currentUser()?._id === userId; }
  formatTime(isoDateString: string): string {
    if (!isoDateString) return '';
    const date = new Date(isoDateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  scrollToBottom() {
    setTimeout(() => {
      if (this.contentArea) this.contentArea.scrollToBottom(300);
    }, 100);
  }

  async startCall(type: 'AUDIO' | 'VIDEO') {
    if (!this.conversationId()) return;
    try {
      const res = await firstValueFrom(this.callsService.initiateCall(this.conversationId(), type));
      if (res.success && res.data) {
        const call = res.data;
        const name = this.getOpponentName();
        const avatar = this.conversation()?.opponent?.avatarUrl ?? '';
        this.router.navigate(['/call-screen', call._id], {
          queryParams: { type, name, avatar },
        });
      }
    } catch {
      this.toastService.showError('Could not start call. Please try again.');
    }
  }
}
