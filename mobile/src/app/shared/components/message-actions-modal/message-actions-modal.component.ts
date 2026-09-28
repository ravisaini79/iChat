import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';

export interface ActionResponse {
  action: 'REACT' | 'REPLY' | 'COPY' | 'FORWARD' | 'PIN' | 'STAR' | 'EDIT' | 'DELETE';
  emoji?: string;
  forEveryone?: boolean;
}

@Component({
  selector: 'app-message-actions-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="actions-sheet">
      <!-- Quick Emoji Bar -->
      <div class="emoji-bar">
        @for (emoji of quickEmojis; track emoji) {
          <button class="emoji-btn" (click)="selectAction('REACT', emoji)">
            {{ emoji }}
          </button>
        }
      </div>

      <div class="actions-list">
        <div class="action-row" (click)="selectAction('REPLY')">
          <span class="action-icon">↩️</span>
          <span class="action-text">Reply</span>
        </div>

        <div class="action-row" (click)="selectAction('COPY')">
          <span class="action-icon">📋</span>
          <span class="action-text">Copy Text</span>
        </div>

        <div class="action-row" (click)="selectAction('FORWARD')">
          <span class="action-icon">➡️</span>
          <span class="action-text">Forward</span>
        </div>

        <div class="action-row" (click)="selectAction('PIN')">
          <span class="action-icon">📌</span>
          <span class="action-text">{{ isPinned ? 'Unpin Message' : 'Pin Message' }}</span>
        </div>

        <div class="action-row" (click)="selectAction('STAR')">
          <span class="action-icon">⭐</span>
          <span class="action-text">{{ isStarred ? 'Unstar Message' : 'Star Message' }}</span>
        </div>

        @if (isMyMessage && !isDeleted) {
          <div class="action-row" (click)="selectAction('EDIT')">
            <span class="action-icon">✏️</span>
            <span class="action-text">Edit Message</span>
          </div>

          <div class="action-row danger-text" (click)="selectAction('DELETE', undefined, true)">
            <span class="action-icon">🗑️</span>
            <span class="action-text">Delete for Everyone</span>
          </div>
        }

        <div class="action-row danger-text" (click)="selectAction('DELETE', undefined, false)">
          <span class="action-icon">🗑️</span>
          <span class="action-text">Delete for Me</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .actions-sheet {
      background: var(--ichat-bg-card);
      border-top-left-radius: 24px;
      border-top-right-radius: 24px;
      padding: 16px 16px 28px 16px;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
    }
    .emoji-bar {
      display: flex;
      justify-content: space-around;
      background: var(--ichat-bg-primary);
      padding: 10px 12px;
      border-radius: 20px;
      margin-bottom: 16px;
    }
    .emoji-btn {
      background: transparent;
      border: none;
      font-size: 1.6rem;
      cursor: pointer;
      transition: transform 0.15s ease;
      &:active {
        transform: scale(1.3);
      }
    }
    .actions-list {
      display: flex;
      flex-direction: column;
    }
    .action-row {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.15s ease;
      &:active {
        background: rgba(0, 0, 0, 0.05);
      }
    }
    .action-icon {
      font-size: 1.2rem;
      margin-right: 16px;
      width: 24px;
      text-align: center;
    }
    .action-text {
      font-size: 1rem;
      font-weight: 500;
      color: var(--ichat-text-primary);
    }
    .danger-text {
      .action-text {
        color: #EF4444;
      }
    }
  `],
})
export class MessageActionsModalComponent {
  @Input() isMyMessage = false;
  @Input() isDeleted = false;
  @Input() isPinned = false;
  @Input() isStarred = false;

  quickEmojis = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

  constructor(private modalCtrl: ModalController) {}

  selectAction(action: any, emoji?: string, forEveryone?: boolean) {
    this.modalCtrl.dismiss({ action, emoji, forEveryone } as ActionResponse);
  }
}
