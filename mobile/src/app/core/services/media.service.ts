import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

export interface MediaPayload {
  success?: boolean;
  data?: any;
  _id?: string;
  id?: string;
  userId?: string;
  originalName?: string;
  storedName?: string;
  mimeType?: string;
  mediaType?: 'image' | 'video' | 'file' | 'audio' | 'status';
  size?: number;
  category?: string;
  storageProvider?: string;
  storagePath?: string;
  url?: string;
  secureUrl?: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  width?: number;
  height?: number;
  conversationId?: string;
  messageId?: string;
  createdAt?: string | Date;
}

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private toastService: ToastService,
  ) {}

  public async getAuthHeaders(): Promise<HttpHeaders> {
    const token = await this.storageService.get<string>('accessToken');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  public async buildAuthenticatedMediaUrl(rawUrl: string | undefined | null): Promise<string> {
    if (!rawUrl) return '';

    const token = await this.storageService.get<string>('accessToken');

    let fullUrl = rawUrl;
    if (rawUrl.startsWith('/')) {
      const serverRoot = environment.apiUrl.replace(/\/api\/?$/, '');
      fullUrl = `${serverRoot}${rawUrl}`;
    }

    if (token && (fullUrl.includes('/api/media/file') || fullUrl.includes('/media/file'))) {
      const separator = fullUrl.includes('?') ? '&' : '?';
      return `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
    }

    return fullUrl;
  }

  async requestMediaPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }
    try {
      const res = await Camera.requestPermissions({
        permissions: ['camera', 'photos'],
      });
      return res.camera === 'granted' || res.photos === 'granted';
    } catch (e) {
      console.warn('Media permission error:', e);
      return false;
    }
  }

  async pickMediaFromDevice(source: 'photos' | 'camera' = 'photos'): Promise<File | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      });

      if (photo.base64String) {
        const format = photo.format || 'jpg';
        const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;
        const byteCharacters = atob(photo.base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const fileName = `media_${Date.now()}.${format}`;
        return new File([blob], fileName, { type: mimeType });
      }
    } catch (e) {
      console.warn('Camera/Gallery pick cancelled or failed:', e);
    }
    return null;
  }

  uploadMedia(file: File, category = 'chat-media', conversationId?: string, messageId?: string): Observable<MediaPayload> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (conversationId) formData.append('conversationId', conversationId);
    if (messageId) formData.append('messageId', messageId);

    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.post<MediaPayload>(`${this.baseUrl}/media/upload`, formData, { headers }),
      ),
    );
  }

  importMediaBulk(files: File[], category = 'imported'): Observable<{ importedCount: number; items: MediaPayload[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('category', category);

    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.post<{ importedCount: number; items: MediaPayload[] }>(
          `${this.baseUrl}/media/import`,
          formData,
          { headers },
        ),
      ),
    );
  }

  getMyMedia(category?: string, mediaType?: string): Observable<MediaPayload[]> {
    let params: any = {};
    if (category) params.category = category;
    if (mediaType && mediaType !== 'all') params.mediaType = mediaType;

    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.get<MediaPayload[]>(`${this.baseUrl}/media/mine`, { headers, params }),
      ),
    );
  }

  deleteMedia(mediaId: string): Observable<any> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.delete<any>(`${this.baseUrl}/media/${mediaId}`, { headers }),
      ),
    );
  }

  uploadProfilePicture(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) =>
        this.http.post<any>(`${this.baseUrl}/users/profile-picture`, formData, { headers }),
      ),
    );
  }
}
