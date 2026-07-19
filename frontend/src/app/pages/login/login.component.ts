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
    this.auth.login(this.email().trim());
  }

  demo(): void {
    this.auth.demoLogin();
  }
}
