import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, tap } from 'rxjs';
import { User } from '../models';
import { API_BASE, TOKEN_KEY } from './api';

const STORAGE_KEY = 'issuetracker_user';

interface AuthResult {
  token: string;
  user: User;
}

/**
 * Real auth against the NestJS backend (`/api/auth/*`). Persists the JWT +
 * current user in localStorage so guarded routes survive reloads; the HTTP
 * interceptor attaches the token to every API request.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<User | null>(this.restore());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');

  private restore(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private persist(result: AuthResult): void {
    try {
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem('token', result.token);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
      localStorage.setItem('user', JSON.stringify(result.user));
    } catch {
      /* ignore storage errors */
    }
    this.currentUser.set(result.user);
  }

  login(email: string, password: string): Observable<AuthResult> {
    return this.http
      .post<AuthResult>(`${API_BASE}/auth/login`, { email, password })
      .pipe(
        tap((result) => {
          this.persist(result);
          void this.router.navigate(['/dashboard']);
        }),
      );
  }

  signup(name: string, email: string, password: string): Observable<AuthResult> {
    return this.http
      .post<AuthResult>(`${API_BASE}/auth/signup`, { name, email, password })
      .pipe(
        tap((result) => {
          this.persist(result);
          void this.router.navigate(['/dashboard']);
        }),
      );
  }

  /**
   * Demo entry point: sign in with a shared demo account, creating it on first
   * use. Backed by the real API — no fabricated session.
   */
  demoLogin(): Observable<AuthResult> {
    const email = 'demo@issuetracker.local';
    const password = 'demo1234';
    return this.login(email, password).pipe(
      catchError(() => this.signup('Demo User', email, password)),
    );
  }

  /** Re-validate the stored token and refresh the cached user. */
  refreshMe(): Observable<User> {
    return this.http
      .get<User>(`${API_BASE}/auth/me`)
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('user');
    } catch {
      /* ignore storage errors */
    }
  }

  /** Clears the session without navigating (used by the 401 interceptor path). */
  clearSession(): void {
    this.clearStorage();
    this.currentUser.set(null);
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }
}
