import { Routes } from '@angular/router';
import { authGuard } from '@core'; // Ajuste o caminho se necessário
import { AdminLayoutComponent } from '@theme/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from '@theme/auth-layout/auth-layout.component';
import { DashboardComponent } from './routes/dashboard/dashboard.component';
import { Error403Component } from './routes/sessions/403.component';
import { Error404Component } from './routes/sessions/404.component';
import { Error500Component } from './routes/sessions/500.component';
import { LoginComponent } from './routes/sessions/login/login.component';
import { RegisterComponent } from './routes/sessions/register/register.component';

export const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: '403', component: Error403Component },
      { path: '404', component: Error404Component },
      { path: '500', component: Error500Component },
      {
        path: 'historico',
        loadChildren: () => import('./routes/historico/historico.routes').then(m => m.routes),
      },
      {
        path: 'assets',
        loadChildren: () => import('./routes/assets/assets.routes').then(m => m.routes),
      },
      {
        path: 'forms',
        loadChildren: () => import('./routes/forms/forms.routes').then(m => m.routes),
      },
      {
        path: 'profile',
        loadChildren: () => import('./routes/profile/profile.routes').then(m => m.routes),
      },
      {
        path: 'ia',
        loadChildren: () => import('./routes/ia/ia.routes').then(m => m.routes),
      },
      {
        path: 'utilities',
        loadChildren: () => import('./routes/utilities/utilities.routes').then(m => m.routes),
      },
    ],
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
