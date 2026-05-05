import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { resolveBackendUrl } from '../../core/config/app-config';
import { UsersService } from '../../core/services/users.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  displayName = '';
  bio = '';
  avatarPreview = '';
  selectedAvatarFile: File | null = null;
  errorMessage = signal('');
  successMessage = signal('');
  isSubmitting = signal(false);
  currentUser: AuthService['currentUser'];

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private router: Router,
  ) {
    this.currentUser = this.authService.currentUser;
  }

  ngOnInit(): void {
    const user = this.currentUser();

    if (!user) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.displayName = user.profile?.displayName || '';
    this.bio = user.profile?.bio || '';
    this.avatarPreview = this.avatarUrl(user.profile?.avatar);
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    this.errorMessage.set('');
    this.selectedAvatarFile = file;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.selectedAvatarFile = null;
      this.errorMessage.set('Please choose an image file.');
      return;
    }

    this.avatarPreview = URL.createObjectURL(file);
  }

  onSubmit(): void {
    const user = this.currentUser();

    if (!user || this.isSubmitting()) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isSubmitting.set(true);

    this.usersService
      .updateProfile(user._id, {
        displayName: this.displayName,
        bio: this.bio,
      })
      .pipe(
        switchMap((response) => {
          this.authService.updateCurrentUser(response.user);

          if (!this.selectedAvatarFile) {
            return [response];
          }

          return this.usersService.uploadAvatar(user._id, this.selectedAvatarFile);
        }),
      )
      .subscribe({
        next: (response) => {
          this.authService.updateCurrentUser(response.user);
          this.avatarPreview = this.avatarUrl(response.user.profile?.avatar);
          this.selectedAvatarFile = null;
          this.isSubmitting.set(false);
          this.successMessage.set('Profile updated.');
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.error?.message || 'Unable to update profile.');
        },
      });
  }

  avatarUrl(avatar?: string): string {
    const fallback = '/uploads/default-avatar.svg';
    const value = avatar || fallback;
    return resolveBackendUrl(value);
  }
}
