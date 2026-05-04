import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
})
export class Signup {
  email = '';
  username = '';
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
      .signup({
        email: this.email,
        username: this.username,
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigateByUrl('/login');
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            error.error?.message || 'Unable to create account. Please try again.',
          );
        },
      });
  }
}
