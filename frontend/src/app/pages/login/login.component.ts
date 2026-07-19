import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);

  email = signal('');
  password = signal('');
  error = signal<string | null>(null);
  submitting = signal(false);

  submit(): void {
    this.error.set(null);
    if (!this.email().trim() || !this.password().trim()) {
      this.error.set('Enter your email and password to continue.');
      return;
    }
    this.submitting.set(true);
    this.auth.login(this.email().trim(), this.password()).subscribe({
      error: (err) => {
        this.submitting.set(false);
        this.error.set(this.messageFor(err, 'Invalid email or password.'));
      },
    });
  }

  demo(): void {
    this.error.set(null);
    this.submitting.set(true);
    this.auth.demoLogin().subscribe({
      error: (err) => {
        this.submitting.set(false);
        this.error.set(this.messageFor(err, 'Could not start demo mode.'));
      },
    });
  }

  private messageFor(err: unknown, fallback: string): string {
    const message = (err as { error?: { message?: string } })?.error?.message;
    return typeof message === 'string' ? message : fallback;
  }
}
