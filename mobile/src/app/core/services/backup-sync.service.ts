import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, from, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

export interface QueueItem {
  localId: string;
  accountId: string;
  mediaUri: string;
  file?: File;
  mediaType: 'image' | 'video' | 'file';
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  status: 'queued' | 'uploading' | 'completed' | 'failed' | 'partial';
  filesystemStatus: string;
  cloudinaryStatus: string;
  retryCount: number;
  serverMediaId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BackupSettingsPayload {
  isEnabled: boolean;
  wifiOnly: boolean;
  includePhotos: boolean;
  includeVideos: boolean;
  includeFiles: boolean;
  maxFileSizeMB: number;
  autoSyncContacts: boolean;
  lastBackupAt?: string;
  storageStats?: {
    totalFiles: number;
    totalBytes: number;
    filesystemCount: number;
    cloudinaryCount: number;
    partialCount: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class BackupSyncService {
  private baseUrl = environment.apiUrl;

  public isSyncing$ = new BehaviorSubject<boolean>(false);
  public queue$ = new BehaviorSubject<QueueItem[]>([]);
  public settings$ = new BehaviorSubject<BackupSettingsPayload | null>(null);

  private isPaused = false;
  private isProcessing = false;

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private toastService: ToastService,
    private authService: AuthService,
  ) {
    this.init();
  }

  private async init() {
    const user = this.authService.currentUser();
    if (user) {
      await this.loadQueue();
      this.loadSettings().subscribe();
    }
  }

  private async getAuthHeaders(): Promise<HttpHeaders> {
    const token = await this.storageService.get<string>('accessToken');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private getQueueKey(): string {
    const userId = this.authService.currentUser()?._id || 'guest';
    return `backup_queue_${userId}`;
  }

  async loadQueue(): Promise<QueueItem[]> {
    const items = (await this.storageService.get<QueueItem[]>(this.getQueueKey())) || [];
    this.queue$.next(items);
    return items;
  }

  async saveQueue(items: QueueItem[]): Promise<void> {
    await this.storageService.set(this.getQueueKey(), items);
    this.queue$.next(items);
  }

  loadSettings(): Observable<BackupSettingsPayload> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.get<BackupSettingsPayload>(`${this.baseUrl}/backup/settings`, { headers }),
      ),
      switchMap((res) => {
        const payload = (res as any)?.data || res;
        this.settings$.next(payload);
        return of(payload);
      }),
      catchError((err) => {
        console.warn('Failed to load backup settings:', err);
        return of({
          isEnabled: false,
          wifiOnly: true,
          includePhotos: true,
          includeVideos: true,
          includeFiles: true,
          maxFileSizeMB: 50,
          autoSyncContacts: true,
        });
      }),
    );
  }

  updateSettings(dto: Partial<BackupSettingsPayload>): Observable<BackupSettingsPayload> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.patch<BackupSettingsPayload>(`${this.baseUrl}/backup/settings`, dto, { headers }),
      ),
      switchMap((res) => {
        const payload = (res as any)?.data || res;
        this.settings$.next(payload);
        return of(payload);
      }),
    );
  }

  getStatus(): Observable<any> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.get<any>(`${this.baseUrl}/backup/status`, { headers }),
      ),
    );
  }

  async enqueueFilesForBackup(files: File[], source: string = 'automatic-backup'): Promise<number> {
    const userId = this.authService.currentUser()?._id;
    if (!userId) return 0;

    const currentQueue = await this.loadQueue();
    let addedCount = 0;

    for (const file of files) {
      const checksum = `${file.name}_${file.size}_${file.lastModified}`;
      const exists = currentQueue.some((item) => item.checksum === checksum);

      if (!exists) {
        const type: 'image' | 'video' | 'file' = file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
          ? 'video'
          : 'file';

        const newItem: QueueItem = {
          localId: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          accountId: userId,
          mediaUri: file.name,
          file,
          mediaType: type,
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          checksum,
          status: 'queued',
          filesystemStatus: 'pending',
          cloudinaryStatus: 'pending',
          retryCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        currentQueue.push(newItem);
        addedCount++;
      }
    }

    await this.saveQueue(currentQueue);

    if (addedCount > 0 && !this.isProcessing) {
      this.processQueueBatch();
    }

    return addedCount;
  }

  async reconcileQueueWithServer(): Promise<void> {
    const currentQueue = await this.loadQueue();
    if (currentQueue.length === 0) return;

    const checksums = currentQueue.map((item) => item.checksum);
    const mediaIds = currentQueue.map((item) => item.serverMediaId).filter(Boolean) as string[];

    from(this.getAuthHeaders())
      .pipe(
        switchMap((headers) =>
          this.http.post<any>(
            `${this.baseUrl}/backup/media/reconcile`,
            { checksums, mediaIds },
            { headers },
          ),
        ),
      )
      .subscribe({
        next: async (res) => {
          const payload = res?.data || res;
          const completedChecksums: string[] = payload?.completedChecksums || [];

          const updatedQueue = currentQueue.map((item) => {
            if (completedChecksums.includes(item.checksum)) {
              return {
                ...item,
                status: 'completed' as const,
                filesystemStatus: 'completed',
                cloudinaryStatus: 'completed',
              };
            }
            return item;
          });

          await this.saveQueue(updatedQueue);
        },
        error: (err) => console.warn('Queue reconciliation error:', err),
      });
  }

  async processQueueBatch(): Promise<void> {
    if (this.isPaused || this.isProcessing) return;

    const currentQueue = await this.loadQueue();
    const pendingItems = currentQueue.filter(
      (item) => item.status === 'queued' || item.status === 'partial' || item.status === 'failed',
    );

    if (pendingItems.length === 0) {
      this.isSyncing$.next(false);
      return;
    }

    this.isProcessing = true;
    this.isSyncing$.next(true);

    for (const item of pendingItems) {
      if (this.isPaused) break;

      if (!item.file) continue;

      item.status = 'uploading';
      await this.saveQueue(currentQueue);

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('checksum', item.checksum);
        formData.append('mediaId', item.localId);
        formData.append('source', 'automatic-backup');

        const headers = await this.getAuthHeaders();
        const uploadRes: any = await this.http
          .post(`${this.baseUrl}/backup/media/upload`, formData, { headers })
          .toPromise();

        const data = uploadRes?.data || uploadRes;
        item.serverMediaId = data?._id || data?.id;
        item.status = data?.overallStatus || 'completed';
        item.filesystemStatus = data?.filesystem?.status || 'completed';
        item.cloudinaryStatus = data?.cloudinary?.status || 'completed';
        item.updatedAt = Date.now();
      } catch (err: any) {
        console.warn('Backup item upload failed:', item.originalName, err?.message);
        item.retryCount++;
        item.status = item.retryCount > 3 ? 'failed' : 'queued';
      }

      await this.saveQueue(currentQueue);
    }

    this.isProcessing = false;
    this.isSyncing$.next(false);
  }

  pauseSync() {
    this.isPaused = true;
    this.isSyncing$.next(false);
  }

  resumeSync() {
    this.isPaused = false;
    this.processQueueBatch();
  }

  retryFailedUploads(): Observable<any> {
    return from(this.loadQueue()).pipe(
      switchMap(async (currentQueue) => {
        const resetQueue = currentQueue.map((item) => {
          if (item.status === 'failed' || item.status === 'partial') {
            return { ...item, status: 'queued' as const, retryCount: 0 };
          }
          return item;
        });
        await this.saveQueue(resetQueue);
        this.processQueueBatch();
        return { success: true };
      }),
    );
  }

  getBackedUpMedia(mediaType?: string, status?: string): Observable<any[]> {
    let params: any = {};
    if (mediaType && mediaType !== 'all') params.mediaType = mediaType;
    if (status && status !== 'all') params.status = status;

    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.get<any[]>(`${this.baseUrl}/backup/media`, { headers, params }),
      ),
      switchMap((res) => of((res as any)?.data || res)),
    );
  }

  deleteBackedUpMedia(mediaId: string): Observable<any> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.delete<any>(`${this.baseUrl}/backup/media/${mediaId}`, { headers }),
      ),
    );
  }
}
