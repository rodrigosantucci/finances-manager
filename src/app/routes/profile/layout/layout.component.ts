import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService, User } from '@core';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent } from '@shared';
import { environment } from '@env/environment'; // For API base URL
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-profile-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: true,
  imports: [
    RouterLink,
    RouterOutlet,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatListModule,
    MatIconModule,
    PageHeaderComponent,
    TranslateModule,
  ],
})
export class ProfileLayoutComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  defaultAvatarPlaceholder: string = 'images/avatar.jpg'; // Updated path
  private readonly apiUrl: string = environment.baseUrl;
  private avatarObjectUrl: string | null = null;

user!: User;
  avatarUrl: SafeUrl = this.defaultAvatarPlaceholder;
  isLoadingUser = true;

  ngOnInit(): void {
this.auth.user().subscribe(user => {
      console.log('User data:', user);
      this.user = user;
      this.loadAvatar(user.id);
      this.isLoadingUser = false;
  });
}

logout() {
    this.auth.logout().subscribe(() => {
      this.router.navigateByUrl('/auth/login');
    });
  }

private loadAvatar(userId: number | undefined): void {
    this.http.get(`${this.apiUrl}avatars/${userId}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.avatarObjectUrl = URL.createObjectURL(blob);
        this.avatarUrl = this.sanitizer.bypassSecurityTrustUrl(this.avatarObjectUrl);
        console.log('Avatar loaded for user ID:', userId);
      },
      error: (error) => {
        console.warn('Failed to load avatar:', error);
        this.avatarUrl = this.defaultAvatarPlaceholder;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.avatarObjectUrl) {
      URL.revokeObjectURL(this.avatarObjectUrl);
      this.avatarObjectUrl = null;
    }
  }

  // Handle image load errors by falling back to placeholder
onImageError(event: Event): void {
    console.warn('Image failed to load:', (event.target as HTMLImageElement).src);
    (event.target as HTMLImageElement).src = this.defaultAvatarPlaceholder;
  }
}
