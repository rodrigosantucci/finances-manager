import { Routes } from '@angular/router';

import { ProfileLayoutComponent } from './layout/layout.component';
import { ProfileOverviewComponent } from './overview/overview.component';

export const routes: Routes = [
  {
    path: '',
    component: ProfileLayoutComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: ProfileOverviewComponent },
    ],
  },
];
