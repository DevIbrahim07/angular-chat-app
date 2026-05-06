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
  authMode = signal<'phone' | 'email'>('phone');
  email = '';
  password = '';
  phoneNumber = '';
  otpCode = '';
  errorMessage = signal('');
  infoMessage = signal('');
  isSubmitting = signal(false);
  otpSent = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  setAuthMode(mode: 'phone' | 'email'): void {
    this.authMode.set(mode);
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.otpSent.set(false);
    this.otpCode = '';
  }

  onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set('');
    this.infoMessage.set('');
    this.isSubmitting.set(true);

    if (this.authMode() === 'email') {
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

      return;
    }

    if (!this.otpSent()) {
      this.authService
        .sendOtp({
          phoneNumber: this.phoneNumber,
          purpose: 'login',
        })
        .subscribe({
          next: (response) => {
            this.isSubmitting.set(false);
            this.otpSent.set(true);
            this.infoMessage.set(
              response.message || 'Verification code sent to your phone number.',
            );
          },
          error: (error) => {
            this.isSubmitting.set(false);
            this.errorMessage.set(error.error?.message || 'Unable to send OTP. Please try again.');
          },
        });

      return;
    }

    this.authService
      .verifyLoginOtp({
        phoneNumber: this.phoneNumber,
        code: this.otpCode,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigateByUrl('/chat');
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.error?.message || 'Unable to verify OTP. Please try again.');
        },
      });
  }
}
