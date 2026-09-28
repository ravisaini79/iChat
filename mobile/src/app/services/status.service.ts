import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from '../core/services/api.service';

export interface StatusItem {
  _id: string;
  userId: {
    _id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  caption?: string;
  viewedBy: string[];
  createdAt: string;
  expiresAt: string;
}

export interface StatusFeedUser {
  userId: {
    _id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  statuses: StatusItem[];
  hasUnviewed: boolean;
}

@Injectable({ providedIn: 'root' })
export class StatusService {
  private api = inject(ApiService);

  getFeed(): Observable<ApiResponse<StatusFeedUser[]>> {
    return this.api.get<StatusFeedUser[]>('status/feed');
  }

  getMyStatuses(): Observable<ApiResponse<StatusItem[]>> {
    return this.api.get<StatusItem[]>('status/my');
  }

  markViewed(statusId: string): Observable<ApiResponse<never>> {
    return this.api.post<never>(`status/${statusId}/view`, {});
  }

  createStatus(data: { type: string; media?: any; text?: string; backgroundColor?: string }): Observable<ApiResponse<any>> {
    return this.api.post<any>('status', data);
  }

  deleteStatus(statusId: string): Observable<ApiResponse<never>> {
    return this.api.delete<never>(`status/${statusId}`);
  }
}
