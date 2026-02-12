import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
  window.console.log = () => {};
  window.console.warn = () => {};
  window.console.info = () => {};
  window.console.debug = () => {};
}

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
