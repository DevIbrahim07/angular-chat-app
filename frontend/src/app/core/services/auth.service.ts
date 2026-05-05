import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { AuthResponse, User } from '../../models/user.model';

const TOKEN_KEY = 'chat_token';
const REFRESH_TOKEN_KEY = 'chat_refresh_token';
const USER_KEY = 'chat_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${API_BASE_URL}/api/auth`;
  private tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private currentUserSignal = signal<User | null>(this.readStoredUser());

  currentUser = computed(() => this.currentUserSignal());
  isAuthenticated = computed(() => !!this.tokenSignal() && !!this.currentUserSignal());

  constructor(private http: HttpClient) {}

  signup(payload: { email: string; username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, payload);
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, payload)
      .pipe(tap((response) => this.storeSession(response)));
  }

  refreshToken(): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/refresh`, {
      refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
    });
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
  }

  updateCurrentUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private storeSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.tokenSignal.set(response.token);
    this.currentUserSignal.set(response.user);
  }

  private readStoredUser(): User | null {
    const storedUser = localStorage.getItem(USER_KEY);

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
