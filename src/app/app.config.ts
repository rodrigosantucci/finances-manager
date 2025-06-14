
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  LOCALE_ID,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import localeEn from '@angular/common/locales/en';

import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { MAT_CARD_CONFIG } from '@angular/material/card';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideDateFnsDatetimeAdapter } from '@ng-matero/extensions-date-fns-adapter';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { NgxPermissionsModule } from 'ngx-permissions';
import { provideToastr } from 'ngx-toastr';

import {
  apiInterceptor,
  BASE_URL,
  AUTH_URL,
  baseUrlInterceptor,
  errorInterceptor,
  loggingInterceptor,
  noopInterceptor,
  settingsInterceptor,
  SettingsService,
  StartupService,
  tokenInterceptor,
  TranslateLangService,
} from '@core';
import { environment } from '@env/environment';
import { PaginatorI18nService } from '@shared';
import { routes } from './app.routes';
import { FormlyConfigModule } from './formly-config';

// Register Angular locales
registerLocaleData(localePt, 'pt-BR');
registerLocaleData(localeEn, 'en-US');

// Required for AOT compilation
function TranslateHttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './i18n/', '.json');
}

// Factory for LOCALE_ID
function localeIdFactory(settingsService: SettingsService) {
  return settingsService.getTranslateLang();
}

// Http interceptor providers in outside-in order
const interceptors = [
  noopInterceptor,
  baseUrlInterceptor,
  settingsInterceptor,
  tokenInterceptor,
  apiInterceptor,
  errorInterceptor,
  loggingInterceptor,
];

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: BASE_URL, useValue: environment.baseUrl },
    { provide: AUTH_URL, useValue: environment.authUrl },
    {
      provide: LOCALE_ID,
      useFactory: localeIdFactory,
      deps: [SettingsService],
    },
    provideAppInitializer(() => inject(TranslateLangService).load()),
    provideAppInitializer(() => inject(StartupService).load()),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors(interceptors)),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withComponentInputBinding()
    ),
    provideToastr(),
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: TranslateHttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    importProvidersFrom(
      NgxPermissionsModule.forRoot(),
      FormlyConfigModule.forRoot()
    ),
    {
      provide: MatPaginatorIntl,
      useFactory: (paginatorI18nSrv: PaginatorI18nService) => paginatorI18nSrv.getPaginatorIntl(),
      deps: [PaginatorI18nService],
    },
    {
      provide: MAT_DATE_LOCALE,
      useFactory: () => inject(SettingsService).getLocale(),
    },
    {
      provide: MAT_CARD_CONFIG,
      useValue: {
        appearance: 'outlined',
      },
    },
    provideDateFnsAdapter({
      parse: {
        dateInput: 'dd/MM/yyyy',
      },
      display: {
        dateInput: 'dd/MM/yyyy',
        monthYearLabel: 'yyyy MMM',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'yyyy MMM',
      },
    }),
    provideDateFnsDatetimeAdapter({
      parse: {
        dateInput: 'dd/MM/yyyy',
        yearInput: 'yyyy',
        monthInput: 'MMMM',
        datetimeInput: 'dd/MM/yyyy HH:mm',
        timeInput: 'HH:mm',
      },
      display: {
        dateInput: 'dd/MM/yyyy',
        yearInput: 'yyyy',
        monthInput: 'MMMM',
        datetimeInput: 'dd/MM/yyyy HH:mm',
        timeInput: 'HH:mm',
        monthYearLabel: 'yyyy MMMM',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM yyyy',
        popupHeaderDateLabel: 'MMM dd, E',
      },
    }),
  ],
};
