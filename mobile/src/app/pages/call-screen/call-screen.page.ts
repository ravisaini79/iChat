import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { micOff, mic, videocamOff, videocam, callSharp, closeCircle, chevronBack } from 'ionicons/icons';
import { CallsService } from '../../services/calls.service';

type CallStatus = 'connecting' | 'ringing' | 'active' | 'ended';

@Component({
  selector: 'app-call-screen',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="call-toolbar">
        <ion-buttons slot="start">
          <ion-button fill="clear" (click)="endCall()">
            <ion-icon slot="icon-only" name="chevron-back"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="call-screen-content">
      <!-- Remote video -->
      <div class="remote-video-container" [class.audio-call]="callType !== 'VIDEO'">
        @if (callType === 'VIDEO') {
          <video #remoteVideo autoplay playsinline class="remote-video"></video>
        }
        @if (callType !== 'VIDEO' || callStatus !== 'active') {
          <div class="caller-info-overlay">
            <div class="avatar-large">
              @if (participantAvatar) {
                <img [src]="participantAvatar" [alt]="participantName" />
              } @else {
                <div class="avatar-initial">{{ participantName?.charAt(0)?.toUpperCase() }}</div>
              }
            </div>
            <h1 class="participant-name">{{ participantName }}</h1>
            <p class="call-status-label">{{ statusLabel }}</p>
          </div>
        }
      </div>

      <!-- Local video preview -->
      @if (callType === 'VIDEO' && callStatus === 'active') {
        <div class="local-video-container">
          <video #localVideo autoplay muted playsinline class="local-video"></video>
        </div>
      }

      <!-- Controls -->
      <div class="call-controls">
        <button class="ctrl-btn" [class.active]="isMuted" (click)="toggleMute()">
          <ion-icon [name]="isMuted ? 'mic-off' : 'mic'"></ion-icon>
          <span>{{ isMuted ? 'Unmute' : 'Mute' }}</span>
        </button>

        @if (callType === 'VIDEO') {
          <button class="ctrl-btn" [class.active]="isVideoOff" (click)="toggleVideo()">
            <ion-icon [name]="isVideoOff ? 'videocam-off' : 'videocam'"></ion-icon>
            <span>{{ isVideoOff ? 'Show' : 'Hide' }}</span>
          </button>
        }

        <button class="ctrl-btn end-btn" (click)="endCall()">
          <ion-icon name="call-sharp"></ion-icon>
          <span>End</span>
        </button>
      </div>
    </ion-content>
  `,
  styles: [`
    .call-toolbar { --background: transparent; }
    .call-screen-content { --background: linear-gradient(180deg, #0a1620 0%, #111B21 100%); }

    .remote-video-container {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(180deg, #0a1620 0%, #111B21 100%);
    }
    .remote-video { width: 100%; height: 100%; object-fit: cover; }

    .caller-info-overlay {
      display: flex; flex-direction: column; align-items: center; gap: 16px; z-index: 5;
    }
    .avatar-large {
      width: 120px; height: 120px; border-radius: 50%; overflow: hidden;
      border: 3px solid rgba(255,255,255,0.2); box-shadow: 0 0 0 16px rgba(0,168,132,0.08);
    }
    .avatar-large img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-initial {
      width: 100%; height: 100%; background: var(--ion-color-primary); display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 3.5rem; font-weight: 700;
    }
    .participant-name { color: #fff; font-size: 2rem; font-weight: 700; text-align: center; margin: 0; }
    .call-status-label { color: rgba(255,255,255,0.65); font-size: 1rem; text-align: center; margin: 0; }

    .local-video-container {
      position: absolute; top: 80px; right: 16px; width: 110px; height: 165px; border-radius: 12px; overflow: hidden;
      border: 2px solid rgba(255,255,255,0.2); z-index: 10; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    }
    .local-video { width: 100%; height: 100%; object-fit: cover; }

    .call-controls {
      position: absolute; bottom: 0; left: 0; right: 0;
      display: flex; justify-content: center; align-items: center; gap: 28px;
      padding: 24px 24px 40px;
      background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%);
    }
    .ctrl-btn {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.1); border: none; border-radius: 50%;
      width: 64px; height: 64px; cursor: pointer; transition: all 0.2s ease;
      ion-icon { font-size: 1.6rem; color: #fff; }
      span { font-size: 0.7rem; color: rgba(255,255,255,0.8); position: absolute; bottom: -20px; white-space: nowrap; }
      position: relative;
    }
    .ctrl-btn.active { background: rgba(255,255,255,0.25); }
    .ctrl-btn.end-btn { background: #EF4444; }
    .ctrl-btn:active { transform: scale(0.92); }
  `],
})
export class CallScreenPage implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef?: ElementRef<HTMLVideoElement>;

  callId = '';
  callType: 'AUDIO' | 'VIDEO' = 'AUDIO';
  participantName = 'Connecting...';
  participantAvatar: string | null = null;
  callStatus: CallStatus = 'connecting';
  isMuted = false;
  isVideoOff = false;

  private peerConnection?: RTCPeerConnection;
  private localStream?: MediaStream;

  get statusLabel(): string {
    switch (this.callStatus) {
      case 'connecting': return 'Connecting...';
      case 'ringing': return 'Ringing...';
      case 'active': return 'Connected';
      case 'ended': return 'Call Ended';
    }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private callsService: CallsService,
  ) {
    addIcons({ micOff, mic, videocamOff, videocam, callSharp, closeCircle, chevronBack });
  }

  async ngOnInit() {
    this.callId = this.route.snapshot.paramMap.get('id') ?? '';
    this.callType = (this.route.snapshot.queryParamMap.get('type') as 'AUDIO' | 'VIDEO') ?? 'AUDIO';
    this.participantName = this.route.snapshot.queryParamMap.get('name') ?? 'Unknown';
    this.participantAvatar = this.route.snapshot.queryParamMap.get('avatar');
    this.callStatus = 'ringing';
    await this.setupMedia();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  async setupMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.callType === 'VIDEO',
      });
      if (this.callType === 'VIDEO' && this.localVideoRef?.nativeElement) {
        this.localVideoRef.nativeElement.srcObject = this.localStream;
      }
      this.callStatus = 'active';
    } catch (e) {
      console.warn('Media access failed, continuing without:', e);
      this.callStatus = 'active';
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.localStream?.getAudioTracks().forEach(t => (t.enabled = !this.isMuted));
  }

  toggleVideo() {
    this.isVideoOff = !this.isVideoOff;
    this.localStream?.getVideoTracks().forEach(t => (t.enabled = !this.isVideoOff));
  }

  endCall() {
    this.callsService.endCall(this.callId).subscribe();
    this.cleanup();
    this.router.navigateByUrl('/tabs/chats', { replaceUrl: true });
  }

  private cleanup() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.peerConnection?.close();
  }
}
