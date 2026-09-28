import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  public baseUrl = environment.apiUrl;

  get serverBaseUrl(): string {
    return this.baseUrl.replace(/\/api\/?$/, '');
  }

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private toastService: ToastService,
  ) {}

  private async getAuthHeaders(): Promise<HttpHeaders> {
    const token = await this.storageService.get<string>('accessToken');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private normalizeResponse<T>(res: any): ApiResponse<T> {
    if (res && typeof res === 'object') {
      return {
        success: res.success !== undefined ? !!res.success : true,
        message: res.message,
        data: res.data !== undefined ? res.data : res,
        code: res.code,
      };
    }
    return { success: true, data: res };
  }

  get<T>(endpoint: string): Observable<ApiResponse<T>> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) => this.http.get<any>(`${this.baseUrl}/${endpoint}`, { headers })),
      map((res) => this.normalizeResponse<T>(res)),
      catchError((err) => this.handleError(err)),
    );
  }

  post<T>(endpoint: string, body: any): Observable<ApiResponse<T>> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) => this.http.post<any>(`${this.baseUrl}/${endpoint}`, body, { headers })),
      map((res) => this.normalizeResponse<T>(res)),
      catchError((err) => this.handleError(err)),
    );
  }

  patch<T>(endpoint: string, body: any): Observable<ApiResponse<T>> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) => this.http.patch<any>(`${this.baseUrl}/${endpoint}`, body, { headers })),
      map((res) => this.normalizeResponse<T>(res)),
      catchError((err) => this.handleError(err)),
    );
  }

  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    return from(this.getAuthHeaders()).pipe(
      switchMap((headers) => this.http.delete<any>(`${this.baseUrl}/${endpoint}`, { headers })),
      map((res) => this.normalizeResponse<T>(res)),
      catchError((err) => this.handleError(err)),
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let msg = 'An unexpected error occurred.';
    if (error.error && error.error.message) {
      msg = error.error.message;
    } else if (error.status === 0) {
      msg = 'Unable to connect to IChat server. Please check your internet connection.';
    }
    this.toastService.showError(msg);
    return throwError(() => new Error(msg));
  }
}
