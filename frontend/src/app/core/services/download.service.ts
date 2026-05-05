import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';

export interface DownloadAttachmentRequest {
  originalName: string;
  storageProvider?: 'local' | 'tigris';
  storageKey?: string;
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class DownloadService {
  private apiUrl = `${API_BASE_URL}/api/messages/attachments/download`;

  constructor(private http: HttpClient) {}

  downloadAttachment(request: DownloadAttachmentRequest): Observable<Blob> {
    const params = new HttpParams()
      .set('originalName', request.originalName)
      .set('storageProvider', request.storageProvider || 'local')
      .set('storageKey', request.storageKey || '')
      .set('url', request.url || '');

    return this.http.get(this.apiUrl, {
      params,
      responseType: 'blob',
    });
  }
}
