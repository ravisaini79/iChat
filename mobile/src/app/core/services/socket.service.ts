import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';
import { StorageService } from './storage.service';

import { environment } from '../../../environments/environment';

export interface MessageItem {
  _id: string;
  conversationId: string;
  senderId: string | { _id: string; phoneNumber?: string };
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'LOCATION' | 'CONTACT' | 'SYSTEM';
  text: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  media?: any;
  location?: any;
  replyTo?: any;
  reactions?: Array<{ userId: string; emoji: string }>;
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  deletedForEveryone?: boolean;
  isPinned?: boolean;
  starredBy?: string[];
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket | null = null;
  readonly isConnected = signal<boolean>(false);

  private newMessageSubject = new Subject<MessageItem>();
  readonly newMessage$: Observable<MessageItem> = this.newMessageSubject.asObservable();

  private editedMessageSubject = new Subject<MessageItem>();
  readonly editedMessage$ = this.editedMessageSubject.asObservable();

  private deletedMessageSubject = new Subject<MessageItem>();
  readonly deletedMessage$ = this.deletedMessageSubject.asObservable();

  private reactionUpdatedSubject = new Subject<MessageItem>();
  readonly reactionUpdated$ = this.reactionUpdatedSubject.asObservable();

  private pinnedMessageSubject = new Subject<MessageItem>();
  readonly pinnedMessage$ = this.pinnedMessageSubject.asObservable();

  private conversationUpdatedSubject = new Subject<any>();
  readonly conversationUpdated$: Observable<any> = this.conversationUpdatedSubject.asObservable();

  private typingStartSubject = new Subject<{ conversationId: string; userId: string }>();
  readonly typingStart$ = this.typingStartSubject.asObservable();

  private typingStopSubject = new Subject<{ conversationId: string; userId: string }>();
  readonly typingStop$ = this.typingStopSubject.asObservable();

  private messageReadSubject = new Subject<{ conversationId: string; readByUserId: string }>();
  readonly messageRead$ = this.messageReadSubject.asObservable();

  private userOnlineSubject = new Subject<{ userId: string }>();
  readonly userOnline$ = this.userOnlineSubject.asObservable();

  private userOfflineSubject = new Subject<{ userId: string; lastSeen: string }>();
  readonly userOffline$ = this.userOfflineSubject.asObservable();

  // ── WebRTC Call Signaling ──────────────────────────────────────────────────
  private incomingCallSubject = new Subject<{ callId: string; callType: 'AUDIO' | 'VIDEO'; caller: { _id: string; displayName: string; avatarUrl?: string | null } }>();
  readonly incomingCall$ = this.incomingCallSubject.asObservable();

  private callEndedSubject = new Subject<{ callId: string }>();
  readonly callEnded$ = this.callEndedSubject.asObservable();

  private callAnsweredSubject = new Subject<{ callId: string; accepted: boolean }>();
  readonly callAnswered$ = this.callAnsweredSubject.asObservable();

  private rtcOfferSubject = new Subject<{ callId: string; offer: RTCSessionDescriptionInit }>();
  readonly rtcOffer$ = this.rtcOfferSubject.asObservable();

  private rtcAnswerSubject = new Subject<{ callId: string; answer: RTCSessionDescriptionInit }>();
  readonly rtcAnswer$ = this.rtcAnswerSubject.asObservable();

  private rtcIceSubject = new Subject<{ callId: string; candidate: RTCIceCandidateInit }>();
  readonly rtcIce$ = this.rtcIceSubject.asObservable();

  constructor(private storageService: StorageService) {}

  async connect() {
    if (this.socket && this.socket.connected) return;

    const token = await this.storageService.get<string>('accessToken');
    if (!token) return;

    this.socket = io(environment.socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.isConnected.set(true);
    });

    this.socket.on('disconnect', () => {
      this.isConnected.set(false);
    });

    this.socket.on('message:new', (msg: MessageItem) => {
      this.newMessageSubject.next(msg);
    });

    this.socket.on('message:edited', (msg: MessageItem) => {
      this.editedMessageSubject.next(msg);
    });

    this.socket.on('message:deleted', (msg: MessageItem) => {
      this.deletedMessageSubject.next(msg);
    });

    this.socket.on('message:reaction', (msg: MessageItem) => {
      this.reactionUpdatedSubject.next(msg);
    });

    this.socket.on('message:pinned', (msg: MessageItem) => {
      this.pinnedMessageSubject.next(msg);
    });

    this.socket.on('conversation:updated', (conv: any) => {
      this.conversationUpdatedSubject.next(conv);
    });

    this.socket.on('typing:start', (data: { conversationId: string; userId: string }) => {
      this.typingStartSubject.next(data);
    });

    this.socket.on('typing:stop', (data: { conversationId: string; userId: string }) => {
      this.typingStopSubject.next(data);
    });

    this.socket.on('message:read', (data: { conversationId: string; readByUserId: string }) => {
      this.messageReadSubject.next(data);
    });

    this.socket.on('user:online', (data: { userId: string }) => {
      this.userOnlineSubject.next(data);
    });

    this.socket.on('user:offline', (data: { userId: string; lastSeen: string }) => {
      this.userOfflineSubject.next(data);
    });

    // ── WebRTC Call Events ─────────────────────────────────────────────────
    this.socket.on('call:incoming', (data: any) => {
      this.incomingCallSubject.next(data);
    });

    this.socket.on('call:ended', (data: { callId: string }) => {
      this.callEndedSubject.next(data);
    });

    this.socket.on('call:answered', (data: { callId: string; accepted: boolean }) => {
      this.callAnsweredSubject.next(data);
    });

    this.socket.on('rtc:offer', (data: { callId: string; offer: RTCSessionDescriptionInit }) => {
      this.rtcOfferSubject.next(data);
    });

    this.socket.on('rtc:answer', (data: { callId: string; answer: RTCSessionDescriptionInit }) => {
      this.rtcAnswerSubject.next(data);
    });

    this.socket.on('rtc:ice-candidate', (data: { callId: string; candidate: RTCIceCandidateInit }) => {
      this.rtcIceSubject.next(data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected.set(false);
    }
  }

  joinConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit('conversation:join', { conversationId });
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit('conversation:leave', { conversationId });
    }
  }

  sendMessage(conversationId: string, text: string, type = 'TEXT', media = null, replyTo = null) {
    if (this.socket) {
      this.socket.emit('message:send', {
        conversationId,
        text,
        type,
        media,
        replyTo,
      });
    }
  }

  editMessage(messageId: string, conversationId: string, newText: string) {
    if (this.socket) {
      this.socket.emit('message:edit', { messageId, conversationId, newText });
    }
  }

  deleteMessage(messageId: string, conversationId: string, forEveryone = false) {
    if (this.socket) {
      this.socket.emit('message:delete', { messageId, conversationId, forEveryone });
    }
  }

  reactMessage(messageId: string, conversationId: string, emoji: string) {
    if (this.socket) {
      this.socket.emit('message:react', { messageId, conversationId, emoji });
    }
  }

  pinMessage(messageId: string, conversationId: string) {
    if (this.socket) {
      this.socket.emit('message:pin', { messageId, conversationId });
    }
  }

  sendTypingStart(conversationId: string) {
    if (this.socket) {
      this.socket.emit('typing:start', { conversationId });
    }
  }

  sendTypingStop(conversationId: string) {
    if (this.socket) {
      this.socket.emit('typing:stop', { conversationId });
    }
  }

  sendReadReceipt(conversationId: string) {
    if (this.socket) {
      this.socket.emit('message:read', { conversationId });
    }
  }

  // ── WebRTC Call Signaling Emitters ────────────────────────────────────────
  emitCallAnswer(callId: string, accepted: boolean) {
    if (this.socket) this.socket.emit('call:answer', { callId, accepted });
  }

  emitRtcOffer(callId: string, offer: RTCSessionDescriptionInit) {
    if (this.socket) this.socket.emit('rtc:offer', { callId, offer });
  }

  emitRtcAnswer(callId: string, answer: RTCSessionDescriptionInit) {
    if (this.socket) this.socket.emit('rtc:answer', { callId, answer });
  }

  emitRtcIceCandidate(callId: string, candidate: RTCIceCandidateInit) {
    if (this.socket) this.socket.emit('rtc:ice-candidate', { callId, candidate });
  }
}
