import { Component, EventEmitter, Input, Output, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import screenfull from 'screenfull';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { BrandingComponent } from '../widgets/branding.component';
import { NotificationComponent } from '../widgets/notification.component';
import { TranslateComponent } from '../widgets/translate.component';
import { UserComponent } from '../widgets/user.component';
import { SearchDialogComponent } from '../widgets/search-dialog.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  host: {
    class: 'matero-header',
  },
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    BrandingComponent,
    NotificationComponent,
    UserComponent,
    SearchDialogComponent,
    TranslateModule,
  ],
})
export class HeaderComponent {
  @Input() showToggle = true;
  @Input() showBranding = false;

  @Output() toggleSidenav = new EventEmitter<void>();
  @Output() toggleSidenavNotice = new EventEmitter<void>();

  private readonly dialog = inject(MatDialog);
  showSearch = false;

  toggleFullscreen() {
    if (screenfull.isEnabled) {
      screenfull.toggle();
    }
  }

  openSearch() {
    this.showSearch = true;
  }

  closeSearch() {
    this.showSearch = false;
  }
}
