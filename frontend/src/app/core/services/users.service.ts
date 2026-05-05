import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { ProfileUpdateResponse, User } from '../../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private apiUrl = `${API_BASE_URL}/api/users`;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  updateProfile(
    id: string,
    profile: {
      bio?: string;
      displayName?: string;
    },
  ): Observable<ProfileUpdateResponse> {
    return this.http.put<ProfileUpdateResponse>(`${this.apiUrl}/${id}`, {
      profile,
    });
  }

  uploadAvatar(id: string, avatar: File): Observable<ProfileUpdateResponse> {
    const formData = new FormData();
    formData.append('avatar', avatar);

    return this.http.post<ProfileUpdateResponse>(`${this.apiUrl}/${id}/avatar`, formData);
  }
}
