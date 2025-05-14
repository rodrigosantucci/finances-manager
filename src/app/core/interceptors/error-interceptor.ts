import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, throwError } from 'rxjs';

export enum STATUS {
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

export function errorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const router = inject(Router);
  const toast = inject(ToastrService);
  const errorPages = [STATUS.FORBIDDEN, STATUS.NOT_FOUND, STATUS.INTERNAL_SERVER_ERROR];

  const getMessage = (error: HttpErrorResponse) => {
    if (error.message.includes('SyntaxError: Unexpected token')) {
      return `Failed to fetch data from ${error.url}. The server returned an invalid response. Please check the backend or proxy configuration.`;
    }
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.error?.msg) {
      return error.error.msg;
    }
    return `${error.status} ${error.statusText}`;
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Log detailed error for debugging
      console.error(`HTTP Error: ${error.status} ${error.statusText}`, {
        url: error.url,
        error: typeof error.error === 'string' ? error.error.substring(0, 200) : error.error,
        message: error.message,
        headers: req.headers,
      });

      // Handle specific HTTP error statuses
      if (errorPages.includes(error.status)) {
        router.navigateByUrl(`/${error.status}`, {
          skipLocationChange: true,
        });
      } else if (error.status === STATUS.UNAUTHORIZED) {
        toast.error(getMessage(error), 'Unauthorized');
        router.navigateByUrl('/auth/login');
      } else {
        toast.error(getMessage(error), 'Error');
      }

      return throwError(() => error);
    })
  );
}
