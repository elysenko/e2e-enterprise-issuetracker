import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  private readonly auth = inject(AuthService);

  name = signal('');
  email = signal('');
  password = signal('');
  confirm = signal('');
  error = signal<string | null>(null);
  submitting = signal(false);

  submit(): void {
    this.error.set(null);
    if (!this.name().trim() || !this.email().trim() || !this.password().trim()) {
      this.error.set('Please fill in every field.');
      return;
    }
    if (this.password() !== this.confirm()) {
      this.error.set('Passwords do not match.');
      return;
    }
    if (this.password().length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }
    this.submitting.set(true);
    this.auth
      .signup(this.name().trim(), this.email().trim(), this.password())
      .subscribe({
        error: (err) => {
          this.submitting.set(false);
          const message = (err as { error?: { message?: string } })?.error
            ?.message;
          this.error.set(
            typeof message === 'string'
              ? message
              : 'Could not create your account.',
          );
        },
      });
  }
}
