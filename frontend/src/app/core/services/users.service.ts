import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProfileUpdateResponse, User } from '../../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private apiUrl = 'http://localhost:3000/api/users';

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
