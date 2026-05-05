import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';

export interface UploadedAttachment {
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  storageProvider?: 'local' | 'tigris';
  storageKey?: string;
  bucket?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private apiUrl = `${API_BASE_URL}/api/messages/attachments`;

  constructor(private http: HttpClient) {}

  uploadAttachment(file: File): Observable<{ attachment: UploadedAttachment }> {
    const formData = new FormData();
    formData.append('attachment', file);

    return this.http.post<{ attachment: UploadedAttachment }>(this.apiUrl, formData);
  }
}
