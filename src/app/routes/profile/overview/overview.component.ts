import { Component, inject } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { AuthService, User } from '@core/authentication'; // Importe AuthService e User

@Component({
  selector: 'app-profile-overview',
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
  imports: [MatCardModule, MatTabsModule],

})
export class ProfileOverviewComponent {

  private readonly authService = inject(AuthService); // Injete AuthService

  readonly user = this.authService.user().getValue();
}
