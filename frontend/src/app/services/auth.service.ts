import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models';

const STORAGE_KEY = 'issuetracker_user';

/**
 * Mockup auth service. Persists a fake session in localStorage so guarded
 * routes are reachable and reloads keep you signed in. No real network calls —
 * `service_agent` will replace these method bodies with API client calls.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
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

  private persist(user: User): void {
    localStorage.setItem('token', 'mock-jwt-token');
    localStorage.setItem('access_token', 'mock-jwt-token');
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  login(email: string): void {
    const name = email.split('@')[0].replace(/\b\w/g, (c) => c.toUpperCase());
    this.persist({
      id: 'u1',
      email,
      name: name || 'Ada Lovelace',
      role: 'ADMIN',
      createdAt: new Date(0).toISOString(),
    });
    this.router.navigate(['/dashboard']);
  }

  signup(name: string, email: string): void {
    this.persist({
      id: 'u1',
      email,
      name,
      role: 'ADMIN',
      createdAt: new Date(0).toISOString(),
    });
    this.router.navigate(['/dashboard']);
  }

  /** Skip login — seeds a mock admin session and jumps straight to the app. */
  demoLogin(): void {
    this.persist({
      id: 'u1',
      email: 'ada@acme.io',
      name: 'Ada Lovelace',
      role: 'ADMIN',
      createdAt: new Date(0).toISOString(),
    });
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
