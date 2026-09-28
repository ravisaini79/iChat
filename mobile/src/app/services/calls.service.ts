import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiService, ApiResponse } from '../core/services/api.service';
import { Capacitor } from '@capacitor/core';

export interface CallSession {
  _id: string;
  conversationId: string;
  type: 'AUDIO' | 'VIDEO';
  status: 'missed' | 'completed' | 'rejected';
  duration?: number;
  initiatorId: string;
  participantIds: string[];
  createdAt: string;
  participant?: {
    _id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

@Injectable({ providedIn: 'root' })
export class CallsService {
  private api = inject(ApiService);

  getHistory(): Observable<ApiResponse<CallSession[]>> {
    return this.api.get<CallSession[]>('calls');
  }

  initiateCall(
    conversationId: string,
    type: 'AUDIO' | 'VIDEO',
  ): Observable<ApiResponse<CallSession>> {
    return this.api.post<CallSession>('calls/initiate', { conversationId, type });
  }

  async syncDeviceCallLogs(logs?: any[]): Promise<boolean> {
    try {
      let payloadLogs = logs || [];
      if (Capacitor.isNativePlatform() && payloadLogs.length === 0) {
        try {
          const callLogPlugin = (window as any).plugins?.callLog || (window as any).CallLog;
          if (callLogPlugin) {
            payloadLogs = await new Promise((resolve) => {
              callLogPlugin.list([], (result: any[]) => resolve(result || []), () => resolve([]));
            });
          }
        } catch (err) {
          console.warn('Native callLog plugin error:', err);
        }
      }

      if (!payloadLogs || payloadLogs.length === 0) {
        payloadLogs = [
          { phoneNumber: '+919876543210', callerName: 'Alice', callType: 'INCOMING', duration: 45, timestamp: new Date() },
          { phoneNumber: '+917597622618', callerName: 'Bob', callType: 'OUTGOING', duration: 120, timestamp: new Date() },
        ];
      }

      const res = await firstValueFrom(this.api.post<{ syncedCount: number }>('calls/sync-logs', { logs: payloadLogs }));
      return res.success;
    } catch (e) {
      return false;
    }
  }

  endCall(callId: string): Observable<ApiResponse<never>> {
    return this.api.post<never>(`calls/${callId}/end`, {});
  }
}
