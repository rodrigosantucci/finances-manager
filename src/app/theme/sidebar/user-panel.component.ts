import { Component, OnInit, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { AuthService, User } from '@core';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { environment } from '@env/environment';

@Component({
  selector: 'app-user-panel',
  template: `
    <div class="matero-user-panel" routerLink="/profile/overview">
      <img
        class="matero-user-panel-avatar"
        [src]="avatarUrl"
        alt="avatar"
        width="64"
        (error)="onImageError($event)"
      />
      <div class="matero-user-panel-info">
        <h4>{{ user.username }}</h4>
        <h5>{{ user.email }}</h5>
      </div>
    </div>
  `,
  styleUrl: './user-panel.component.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, TranslateModule],
})
export class UserPanelComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  user!: User;
  defaultAvatarPlaceholder: string = 'images/avatar.jpg';
  avatarUrl: SafeUrl = this.defaultAvatarPlaceholder;
  private avatarObjectUrl: string | null = null;

  ngOnInit(): void {
    this.auth.user().subscribe(user => {
      this.user = user;
      this.loadAvatar(user.id);
    });
  }

  private loadAvatar(userId: number | undefined): void {
    if (!userId) {
      console.warn('No user ID provided for avatar loading');
      this.avatarUrl = this.defaultAvatarPlaceholder;
      return;
    }

    this.http.get(`${environment.baseUrl}/api/avatars/${userId}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.avatarObjectUrl = URL.createObjectURL(blob);
        this.avatarUrl = this.sanitizer.bypassSecurityTrustUrl(this.avatarObjectUrl);
    //    console.log('Avatar loaded for user ID:', userId);
      },
      error: (error) => {
        console.warn('Failed to load avatar:', error);
        this.avatarUrl = this.defaultAvatarPlaceholder;
      }
    });
  }

  onImageError(event: Event): void {
    console.warn('Image failed to load:', (event.target as HTMLImageElement).src);
    (event.target as HTMLImageElement).src = this.defaultAvatarPlaceholder;
    this.avatarUrl = this.defaultAvatarPlaceholder;
  }

  ngOnDestroy(): void {
    if (this.avatarObjectUrl) {
      URL.revokeObjectURL(this.avatarObjectUrl);
      this.avatarObjectUrl = null;
    }
  }
}
