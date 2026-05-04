import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  email = '';
  password = '';
  errorMessage = signal('');
  isSubmitting = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.authService
      .login({
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigateByUrl('/chat');
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.error?.message || 'Unable to log in. Please try again.');
        },
      });
  }
}
