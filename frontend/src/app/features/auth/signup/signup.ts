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

  onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.errorMessage.set('');
    this.infoMessage.set('');
    this.isSubmitting.set(true);

    if (!this.otpSent()) {
      this.authService
        .sendOtp({
          phoneNumber: this.phoneNumber,
          purpose: 'signup',
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
            this.errorMessage.set(
              error.error?.message || 'Unable to send OTP. Please try again.',
            );
          },
        });

      return;
    }

    this.authService
      .verifySignupOtp({
        email: this.email,
        username: this.username,
        password: this.password,
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
          this.errorMessage.set(
            error.error?.message || 'Unable to verify OTP. Please try again.',
          );
        },
      });
  }
}
